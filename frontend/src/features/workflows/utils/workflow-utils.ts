import { type TranslationService } from '@/features/deliveries/types';

import { workflowTemplates } from '../data/workflow-templates';
import { type TrackingStatus, type WorkflowFilters, type WorkflowJob, type WorkflowRole } from '../types';

export const roleLabels: Record<WorkflowRole, string> = {
  translator: 'Tradutor', reviewer: 'Revisor / QA', employee: 'Funcionário',
};
export const emptyFilters: WorkflowFilters = { search: '', translator: '', service: '', workflow: '', status: '' };

export function templateFor(job: WorkflowJob) {
  return job.workflow?.definition || workflowTemplates.find(template => template.id === job.templateId);
}

export function progressFor(job: WorkflowJob): number | null {
  const template = templateFor(job);
  if (!template || !job.stages.length) return null;
  const completed = template.stages.filter(stage => job.stages.some(record => record.stageId === stage.id && record.status === 'completed')).length;
  return Math.round(completed / template.stages.length * 100);
}

// Date-only deadlines expire at the end of the business day in São Paulo.
// Do not guess ambiguous strings such as "20/10" or "A definir".
export function deadlineTime(value?: string): number | null {
  if (!value) return null;
  const brazilianDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (brazilianDate) return deadlineTime(`${brazilianDate[3]}-${brazilianDate[2]}-${brazilianDate[1]}`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
    return Date.parse(value + 'T23:59:59.999-03:00');
  }
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  if (deadlineTime(value.slice(0, 10)) === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isFinished(job: WorkflowJob) {
  return job.workflow ? progressFor(job) === 100 : job.source === 'api' ? job.serviceStatus === 'Entregue' : progressFor(job) === 100;
}

export function isOverdue(job: WorkflowJob, now: number) {
  const deadline = deadlineTime(job.deadline);
  return !isFinished(job) && deadline !== null && deadline < now;
}

export function needsAttention(job: WorkflowJob, now: number) {
  return !isFinished(job) && (!!job.blocker || !!job.attention || isOverdue(job, now));
}

export function trackingStatus(job: WorkflowJob, now: number): TrackingStatus {
  if (isFinished(job)) return 'Concluído';
  if (job.blocker) return 'Bloqueado';
  if (isOverdue(job, now)) return 'Atrasado';
  if (job.attention) return 'Requer atenção';
  return job.templateId ? 'Em andamento' : 'Sem workflow';
}

export function formatDeadline(value?: string) {
  const timestamp = deadlineTime(value);
  if (timestamp === null) return value ? `${value} · sem data verificável` : 'A definir';
  const dateOnly = value?.length === 10;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    ...(!dateOnly && { hour: '2-digit', minute: '2-digit' }),
  }).format(new Date(timestamp));
}

export function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function filterJobs(jobs: WorkflowJob[], filters: WorkflowFilters, now: number) {
  return jobs.filter(job => {
    const template = templateFor(job);
    return (!filters.translator || job.translator?.id === filters.translator)
      && (!filters.service || job.id === filters.service)
      && (!filters.workflow || (filters.workflow === 'unassigned' ? !job.templateId : job.templateId === filters.workflow))
      && (!filters.status || (filters.status === 'attention' ? needsAttention(job, now) : filters.status === 'Atrasado' ? isOverdue(job, now) : trackingStatus(job, now) === filters.status))
      && normalize(`${job.id} ${job.title} ${job.client} ${job.translator?.name ?? ''} ${template?.title ?? ''}`).includes(normalize(filters.search));
  });
}

export function activeTranslators(jobs: WorkflowJob[], now: number) {
  const groups = new Map<string, { id: string; name: string; jobs: WorkflowJob[]; attention: number }>();
  for (const job of jobs) {
    if (!job.translator || isFinished(job)) continue;
    const group = groups.get(job.translator.id) ?? { ...job.translator, jobs: [], attention: 0 };
    group.jobs.push(job);
    if (needsAttention(job, now)) group.attention++;
    groups.set(group.id, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

// Legacy services without an assignment retain unknown progress.
export function jobFromService(service: TranslationService): WorkflowJob {
  return {
    id: service.id, title: service.title, client: service.clientName || service.company || 'Cliente não informado',
    languages: `${service.source} → ${service.target}`, translator: service.translator ? { id: service.translator.id, name: service.translator.name } : null,
    source: 'api', templateId: service.workflow?.templateId ?? null, stages: service.workflow?.stages ?? [],
    workflow: service.workflow ?? undefined, blocker: service.workflow?.blocker,
    deadline: service.deadline, serviceStatus: service.status,
    ...(service.status === 'Revisão solicitada' && { attention: service.lastFeedback || 'Há uma revisão solicitada para este serviço. Consulte a área de Entregas.' }),
  };
}
