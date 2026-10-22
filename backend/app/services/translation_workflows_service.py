"""Workflow snapshots and transitions, independent from document delivery status."""

import json
from pathlib import Path

from fastapi import HTTPException
from psycopg.types.json import Jsonb

from app.database_pg import now
from app.repositories.translation_store import add_event

TEMPLATES = {item['id']: item for item in json.loads(
    (Path(__file__).resolve().parents[1] / 'data' / 'workflow-templates.json').read_text(encoding='utf-8'))}


def workflow_record(connection, service_id):
    row = connection.execute('SELECT * FROM service_workflows WHERE service_id = ?', (service_id,)).fetchone()
    if not row:
        return None
    stages = row['stages']
    return {
        'templateId': row['template_id'], 'definition': row['definition'], 'stages': stages,
        'revision': row['revision'], 'assignedAt': row['assigned_at'], 'updatedAt': row['updated_at'],
        'progress': round(sum(stage['status'] == 'completed' for stage in stages) / len(stages) * 100),
        'blocker': next((stage.get('note', '') for stage in stages if stage['status'] == 'blocked'), ''),
    }


def assign_workflow(connection, service, template_id, actor, reviewer_id=None):
    # Caller holds the service lock (or has just inserted it inside this transaction).
    if service['status'] == 'Entregue':
        raise HTTPException(409, 'Não é possível iniciar um workflow em um serviço já entregue.')
    if connection.execute('SELECT 1 FROM service_workflows WHERE service_id = ?', (service['id'],)).fetchone():
        raise HTTPException(409, 'Este serviço já possui um workflow. Atualize a lista para acompanhar as etapas.')
    reviewer = connection.execute("SELECT id, name FROM users WHERE id = ? AND active = TRUE AND role IN ('employee', 'admin')",
                                  (reviewer_id or actor['id'],)).fetchone()
    if not reviewer:
        raise HTTPException(422, 'Selecione um funcionário ativo para a revisão e o QA.')
    translator = connection.execute('SELECT id, name FROM users WHERE id = ?', (service['translator_id'],)).fetchone()
    if not translator:
        raise HTTPException(422, 'O serviço precisa de um tradutor cadastrado antes da alocação do workflow.')
    template = TEMPLATES[template_id]
    stages = []
    for index, definition in enumerate(template['stages']):
        responsible = translator if definition['role'] == 'translator' else reviewer if definition['role'] == 'reviewer' else actor
        stages.append({'stageId': definition['id'], 'status': 'current' if index == 0 else 'pending',
                       'assigneeId': responsible['id'], 'assignee': responsible['name']})
    connection.execute('''INSERT INTO service_workflows (service_id, template_id, definition, stages, assigned_by)
        VALUES (?, ?, ?, ?, ?)''', (service['id'], template_id, Jsonb(template), Jsonb(stages), actor['id']))
    add_event(connection, 'Workflow atribuído', service_id=service['id'], actor=actor, note=template['title'])
    return workflow_record(connection, service['id'])


def update_stage(connection, service, stage_id, command, actor):
    row = connection.execute('SELECT * FROM service_workflows WHERE service_id = ? FOR UPDATE', (service['id'],)).fetchone()
    if not row:
        raise HTTPException(404, 'Este serviço ainda não possui um workflow.')
    if row['revision'] != command.expectedRevision:
        raise HTTPException(409, 'As etapas foram atualizadas por outra pessoa. Atualize o trabalho antes de continuar.')
    stages = row['stages']
    index = next((i for i, stage in enumerate(stages) if stage['stageId'] == stage_id), None)
    if index is None:
        raise HTTPException(404, 'Etapa não encontrada.')
    stage, definition = stages[index], row['definition']['stages'][index]
    is_staff = actor['role'] in ('employee', 'admin')
    if not is_staff and (definition['role'] != 'translator' or stage['assigneeId'] != actor['id']):
        raise HTTPException(403, 'Somente o responsável pode atualizar esta etapa. Revisão e QA pertencem à equipe.')
    if is_staff and definition['role'] == 'translator' and command.action == 'complete':
        raise HTTPException(403, 'A conclusão desta etapa deve ser registrada pelo tradutor responsável.')
    if stage['status'] not in ('current', 'blocked') or any(item['status'] != 'completed' for item in stages[:index]):
        raise HTTPException(409, 'Conclua as etapas anteriores antes de atualizar esta etapa.')
    if (command.action == 'resume' and stage['status'] != 'blocked') or (command.action != 'resume' and stage['status'] != 'current'):
        raise HTTPException(409, 'A ação não está disponível no estado atual da etapa.')
    timestamp = now()
    stage.update(note=command.note, updatedAt=timestamp, updatedBy=actor['name'])
    if command.action == 'complete':
        stage.update(status='completed', completedAt=timestamp, completedBy=actor['name'])
        if index + 1 < len(stages):
            stages[index + 1]['status'] = 'current'
    else:
        stage['status'] = 'blocked' if command.action == 'block' else 'current'
    connection.execute('UPDATE service_workflows SET stages = ?, revision = revision + 1, updated_at = ? WHERE service_id = ?',
                       (Jsonb(stages), timestamp, service['id']))
    labels = {'complete': 'Etapa concluída', 'block': 'Etapa bloqueada', 'resume': 'Etapa retomada'}
    add_event(connection, labels[command.action], service_id=service['id'], actor=actor,
                     note=definition['title'] + (': ' + command.note if command.note else ''))
    return workflow_record(connection, service['id'])


def synchronize_delivery(connection, service, actor, decision, note):
    """Advance only the contiguous work declared by a file submission or its review.

    The service row is locked by the caller. A submission confirms the translator's
    current work package; approval confirms the following team stages, stopping at
    another translator stage (e.g. documentary formalization). Rework reopens the
    latest translator package while retaining the audit trail.
    """
    row = connection.execute('SELECT * FROM service_workflows WHERE service_id = ? FOR UPDATE', (service['id'],)).fetchone()
    if not row:
        return None
    stages, definitions = row['stages'], row['definition']['stages']
    active = next((index for index, stage in enumerate(stages) if stage['status'] in ('current', 'blocked')), len(stages))
    if any(stage['status'] == 'blocked' for stage in stages) and decision != 'request_revision':
        raise HTTPException(409, 'Retome a etapa bloqueada no workflow antes de enviar ou aprovar arquivos.')
    timestamp = now()

    def complete(index):
        stages[index].update(status='completed', completedAt=timestamp, completedBy=actor['name'],
                             updatedAt=timestamp, updatedBy=actor['name'], note=note, completionSource='delivery' if decision == 'submit' else 'review')
        add_event(connection, 'Etapa concluída', service_id=service['id'], actor=actor,
                         note=definitions[index]['title'] + ': ' + note)

    if decision == 'request_revision':
        previous = next((index for index in range(active - 1, -1, -1) if definitions[index]['role'] == 'translator'), None)
        if previous is None or (active < len(stages) and definitions[active]['role'] == 'translator'):
            raise HTTPException(409, 'Aguarde a conclusão do trabalho atual do tradutor antes de avaliar esta versão.')
        while previous > 0 and definitions[previous - 1]['role'] == 'translator':
            previous -= 1
        for index in range(previous, len(stages)):
            stages[index] = {key: value for key, value in stages[index].items()
                             if key in ('stageId', 'assigneeId', 'assignee', 'deadline')}
            stages[index]['status'] = 'current' if index == previous else 'pending'
        stages[previous].update(note=note, updatedAt=timestamp, updatedBy=actor['name'])
        add_event(connection, 'Etapas reabertas', service_id=service['id'], actor=actor,
                         note=definitions[previous]['title'] + ': ' + note)
    elif decision == 'submit':
        if active == len(stages):
            raise HTTPException(409, 'Este workflow já foi concluído. Consulte a equipe antes de enviar outra versão.')
        if definitions[active]['role'] != 'translator':
            # Manual completion may already have handed the package to the team.
            if not any(definitions[index]['role'] == 'translator' and stages[index]['status'] == 'completed' for index in range(active)):
                raise HTTPException(409, 'A equipe precisa concluir a preparação do workflow antes do envio.')
            return workflow_record(connection, service['id'])
        while active < len(stages) and definitions[active]['role'] == 'translator':
            if stages[active].get('assigneeId') != actor['id']:
                raise HTTPException(403, 'Esta etapa pertence a outro tradutor.')
            complete(active)
            active += 1
        if active < len(stages):
            stages[active]['status'] = 'current'
    else:
        if active < len(stages) and definitions[active]['role'] == 'translator':
            raise HTTPException(409, 'O tradutor precisa concluir a etapa atual antes da aprovação.')
        if active == len(stages):
            return workflow_record(connection, service['id'])
        while active < len(stages) and definitions[active]['role'] != 'translator':
            complete(active)
            active += 1
        if active < len(stages):
            stages[active]['status'] = 'current'
    connection.execute('UPDATE service_workflows SET stages = ?, revision = revision + 1, updated_at = ? WHERE service_id = ?',
                       (Jsonb(stages), timestamp, service['id']))
    return workflow_record(connection, service['id'])
