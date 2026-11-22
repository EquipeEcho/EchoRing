"""Status groups used by the request listing filters and counters."""
from fastapi import HTTPException

REQUEST_GROUPS = {
    'pendente': ('Recebido',),
    'orcamento': ('Em análise', 'Orçamento enviado', 'Orçamento simulado', 'Orçamento aprovado'),
    'traducao': ('Tradutor atribuído', 'Em andamento', 'Aguardando avaliação', 'Revisão solicitada'),
    'concluido': ('Pronta', 'Entregue'),
    'cancelado': ('Orçamento recusado',),
}
REQUEST_STATUSES = tuple(status for statuses in REQUEST_GROUPS.values() for status in statuses)


def resolve_statuses(value):
    """Converte grupos ou status separados por vírgula na lista de status da consulta."""
    if not value:
        return None
    statuses = []
    for token in (item.strip() for item in value.split(',')):
        if token in REQUEST_GROUPS:
            statuses.extend(REQUEST_GROUPS[token])
        elif token in REQUEST_STATUSES:
            statuses.append(token)
        elif token:
            raise HTTPException(422, f'Status inválido: {token}.')
    return list(dict.fromkeys(statuses)) or None


def group_counts(status_counts):
    """Soma a quantidade de cada status dentro do seu grupo."""
    return {group: sum(status_counts.get(status, 0) for status in statuses) for group, statuses in REQUEST_GROUPS.items()}
