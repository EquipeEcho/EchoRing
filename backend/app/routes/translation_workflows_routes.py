"""Authenticated assignment and stage updates for existing translation services."""

from fastapi import APIRouter, Depends

from app.core.portal_auth import ensure_task_access, staff, workspace_user
from app.database_pg import database
from app.models.translation_workflow import StageUpdate, WorkflowAssignment
from app.repositories.translation_store import read_service
from app.services.translation_workflows_service import assign_workflow, update_stage, workflow_record

router = APIRouter()


@router.get('/workflow-reviewers')
def reviewers(user: dict = Depends(staff)):
    with database() as connection:
        return connection.execute("SELECT id, name, email FROM users WHERE active = TRUE AND role IN ('employee', 'admin') ORDER BY LOWER(name), id").fetchall()


@router.get('/tasks/{task_id}/workflow')
def detail(task_id: str, user: dict = Depends(workspace_user)):
    with database() as connection:
        service = read_service(connection, task_id)
        ensure_task_access(service, user)
        return workflow_record(connection, task_id)


@router.put('/tasks/{task_id}/workflow', status_code=201)
def assign(task_id: str, data: WorkflowAssignment, user: dict = Depends(staff)):
    with database() as connection:
        service = read_service(connection, task_id, for_update=True)
        return assign_workflow(connection, service, data.templateId, user, data.reviewerId)


@router.patch('/tasks/{task_id}/workflow/stages/{stage_id}')
def advance(task_id: str, stage_id: str, data: StageUpdate, user: dict = Depends(workspace_user)):
    with database() as connection:
        service = read_service(connection, task_id, for_update=True)
        ensure_task_access(service, user)
        return update_stage(connection, service, stage_id, data, user)
