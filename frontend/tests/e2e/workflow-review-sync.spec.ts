import { expect, test } from '@playwright/test';

import { type TranslationService } from '../../src/features/deliveries/types';
import { workflowTemplates } from '../../src/features/workflows/data/workflow-templates';

test('documentary approval returns to formalization without showing the service as finished', async ({ page }) => {
  const template = workflowTemplates.find(item => item.id === 'documentary')!;
  const task: TranslationService = { id: 'FLOW-DOCUMENT', title: 'Certidão documental', source: 'Português', target: 'Inglês', status: 'Aguardando avaliação', lastVersion: 1, observations: '', attachments: [], history: [],
    createdAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z', translator: { id: 'translator', name: 'Marina Costa', email: 'translator@example.test' },
    lastDelivery: { id: 'DEL-DOCUMENT', name: 'documento.txt', size: 10, status: 'Aguardando avaliação', version: 1, submittedAt: '2026-10-20T12:00:00Z', feedback: '' },
    workflow: { templateId: 'documentary', definition: template, revision: 3, progress: 40, blocker: '', assignedAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z',
      stages: template.stages.map((stage, index) => ({ stageId: stage.id, status: index < 2 ? 'completed' : index === 2 ? 'current' : 'pending', assignee: stage.role === 'translator' ? 'Marina Costa' : 'Equipe de revisão' })) } };
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({ role: 'employee', name: 'Equipe', email: 'employee@example.test', token: 'workflow-review-token', demo: false, expires: Date.now() / 1000 + 3600 })));
  await page.route('**/tasks', route => route.fulfill({ json: [task] }));
  await page.route('**/requests', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
  await page.route('**/deliveries/DEL-DOCUMENT/review', async route => {
    expect(route.request().postDataJSON()).toMatchObject({ decision: 'approve' });
    task.status = 'Em andamento'; task.lastDelivery!.status = 'Pronta';
    task.workflow = { ...task.workflow!, revision: 4, progress: 60, stages: task.workflow!.stages.map((stage, index) => ({ ...stage, status: index < 3 ? 'completed' : index === 3 ? 'current' : 'pending' })) };
    await route.fulfill({ json: { id: 'DEL-DOCUMENT', status: 'Pronta', version: 1 } });
  });
  await page.goto('/entregas?task=FLOW-DOCUMENT');
  await page.getByRole('button', { name: 'Aprovar tradução', exact: true }).click();
  await expect(page.getByTestId('delivery-notice')).toContainText('O trabalho voltou ao tradutor');
  await expect(page.getByRole('tab', { name: /Em andamento/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('task-FLOW-DOCUMENT').getByTestId('workflow-map-stage-formalization')).toHaveAttribute('aria-current', 'step');
  await expect(page.getByTestId('task-FLOW-DOCUMENT').getByText('Entregue', { exact: true })).toHaveCount(0);
});
