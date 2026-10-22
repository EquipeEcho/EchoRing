import { api } from '@/lib/api/client';

import { type ServiceWorkflow, type WorkflowType } from '../types';

export const listWorkflowReviewers = (token: string) => api<{ id: string; name: string; email: string }[]>('/workflow-reviewers', {}, token);
export const assignWorkflow = (id: string, templateId: WorkflowType, reviewerId: string | undefined, token: string) =>
  api<ServiceWorkflow>(`/tasks/${id}/workflow`, { method: 'PUT', body: JSON.stringify({ templateId, reviewerId }) }, token);
export const updateWorkflowStage = (id: string, stage: string, action: 'complete' | 'block' | 'resume', expectedRevision: number, note: string, token: string) =>
  api<ServiceWorkflow>(`/tasks/${id}/workflow/stages/${stage}`, { method: 'PATCH', body: JSON.stringify({ action, expectedRevision, note }) }, token);
