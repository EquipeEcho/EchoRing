import { expect, test } from '@playwright/test';

import { type TranslationService } from '../../src/features/deliveries/types';
import { createDemoWorkflows } from '../../src/features/workflows/data/demo-workflows';
import { workflowTemplates } from '../../src/features/workflows/data/workflow-templates';
import { activeTranslators, deadlineTime, emptyFilters, filterJobs, isOverdue, jobFromService, needsAttention, progressFor, trackingStatus } from '../../src/features/workflows/utils/workflow-utils';

const now = Date.parse('2026-10-20T15:00:00Z');

test('all five process models define ordered stages, responsibilities, requirements and outputs', () => {
  expect(workflowTemplates.map(template => template.id)).toEqual(['tep', 'mtpe', 'localization', 'documentary', 'subtitling']);
  for (const template of workflowTemplates) {
    expect(template.stages).toHaveLength(5);
    expect(new Set(template.stages.map(stage => stage.id)).size).toBe(5);
    expect(template.useWhen.length).toBeGreaterThan(0);
    for (const stage of template.stages) {
      expect(stage.requirements.length).toBeGreaterThan(0);
      expect(stage.deliverables.length).toBeGreaterThan(0);
      expect(['translator', 'reviewer', 'employee']).toContain(stage.role);
    }
  }
  expect(workflowTemplates[0].stages[2].role).toBe('reviewer');
  expect(workflowTemplates[3].stages[3].role).toBe('translator');
});

test('progress counts completed model stages and never estimates missing API records', () => {
  const jobs = createDemoWorkflows(new Date(now));
  expect(progressFor(jobs[0])).toBe(40);
  expect(progressFor(jobs[5])).toBe(100);
  expect(progressFor(jobs[6])).toBe(0);
  expect(progressFor({ ...jobs[0], stages: [] })).toBeNull();
  expect(progressFor({ ...jobs[0], templateId: null })).toBeNull();
  expect(progressFor({ ...jobs[0], stages: [...jobs[0].stages, jobs[0].stages[0]] })).toBe(40);
});

test('deadlines use the end of the São Paulo day and ignore missing, invalid or ambiguous dates', () => {
  expect(deadlineTime('2026-10-20')).toBe(Date.parse('2026-10-21T02:59:59.999Z'));
  expect(deadlineTime('20/10/2026')).toBe(deadlineTime('2026-10-20'));
  expect(deadlineTime('30/02/2026')).toBeNull();
  expect(deadlineTime('2026-10-20T14:00:00-03:00')).toBe(Date.parse('2026-10-20T17:00:00Z'));
  for (const value of [undefined, 'A definir', '20/10', '2026-02-30', '2026-13-01', '2026-02-30T14:00:00Z', '2026-10-20T14:00:00']) expect(deadlineTime(value)).toBeNull();
  const jobs = createDemoWorkflows(new Date(now));
  expect(isOverdue({ ...jobs[0], deadline: '2026-10-20' }, now)).toBe(false);
  expect(isOverdue(jobs[1], now)).toBe(true);
  expect(isOverdue(jobs[5], now)).toBe(false);
});

test('combined filters, accent-insensitive search and attention keep blocked overdue jobs discoverable', () => {
  const jobs = createDemoWorkflows(new Date(now));
  expect(filterJobs(jobs, { ...emptyFilters, translator: 'demo-marina', service: 'DEMO-001', workflow: 'tep', status: 'Em andamento', search: 'TECNICO' }, now).map(job => job.id)).toEqual(['DEMO-001']);
  expect(trackingStatus(jobs[7], now)).toBe('Bloqueado');
  expect(filterJobs(jobs, { ...emptyFilters, status: 'Atrasado' }, now).map(job => job.id)).toEqual(['DEMO-002', 'DEMO-008']);
  expect(filterJobs(jobs, { ...emptyFilters, status: 'attention' }, now)).toHaveLength(4);
  expect(activeTranslators(jobs, now)).toHaveLength(4);
  expect(createDemoWorkflows(new Date(now), 'Tradutor da sessão')).toHaveLength(3);
});

test('real service mapping retains facts and leaves workflow assignment and responsibility unknown', () => {
  const job = jobFromService({ id: 'REAL-1', title: 'Tradução técnica', source: 'Inglês', target: 'Português', status: 'Revisão solicitada', deadline: '2026-10-23', lastFeedback: 'Corrigir a terminologia.' } as TranslationService);
  expect(job.source).toBe('api');
  expect(job.serviceStatus).toBe('Revisão solicitada');
  expect(job.templateId).toBeNull();
  expect(job.translator).toBeNull();
  expect(job.stages).toEqual([]);
  expect(progressFor(job)).toBeNull();
  expect(needsAttention(job, now)).toBe(true);
  expect(filterJobs([job], { ...emptyFilters, workflow: 'unassigned' }, now)).toHaveLength(1);
});
