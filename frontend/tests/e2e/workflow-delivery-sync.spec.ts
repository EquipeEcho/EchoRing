import { expect, test } from '@playwright/test';

import { type TranslationService } from '../../src/features/deliveries/types';
import { workflowTemplates } from '../../src/features/workflows/data/workflow-templates';

test('translator file submission updates the diagram and the shared workflow immediately', async ({ page }, info) => {
  const template = workflowTemplates[0];
  const task: TranslationService = { id: 'FLOW-FILES', title: 'Manual com workflow', source: 'Inglês', target: 'Português', status: 'Em andamento', lastVersion: 0, observations: '', attachments: [], history: [],
    createdAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z', translator: { id: 'translator', name: 'Marina Costa', email: 'translator@example.test' },
    workflow: { templateId: 'tep', definition: template, revision: 2, progress: 20, blocker: '', assignedAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z',
      stages: template.stages.map((stage, index) => ({ stageId: stage.id, status: index === 0 ? 'completed' : index === 1 ? 'current' : 'pending', assignee: stage.role === 'translator' ? 'Marina Costa' : 'Equipe de revisão' })) } };
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({ role: 'translator', name: 'Marina Costa', email: 'translator@example.test', token: 'workflow-files-token', demo: false, expires: Date.now() / 1000 + 3600 })));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
  await page.route('**/tasks', route => route.fulfill({ json: [task] }));
  await page.route('**/tasks/FLOW-FILES/deliveries', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['content-type']).toContain('multipart/form-data');
    task.status = 'Aguardando avaliação'; task.lastVersion = 1;
    task.workflow = { ...task.workflow!, revision: 3, progress: 40, stages: task.workflow!.stages.map((stage, index) => ({ ...stage, status: index < 2 ? 'completed' : index === 2 ? 'current' : 'pending' })) };
    await route.fulfill({ status: 201, json: { id: 'DEL-FLOW', serviceId: task.id, version: 1, status: task.status, files: [{ index: 0, name: 'sample.txt', size: 21 }], name: 'sample.txt', size: 21 } });
  });
  await page.goto('/entregas');
  const diagram = page.getByTestId('task-FLOW-FILES').getByTestId('workflow-map-tep');
  await expect(diagram.getByTestId('workflow-map-stage-translation')).toHaveAttribute('aria-current', 'step');
  await diagram.getByTestId('workflow-map-stage-translation').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Selecionar arquivos', exact: true }).click();
  await (await chooser).setFiles('tests/fixtures/sample.txt');
  await page.getByRole('button', { name: 'Enviar arquivo para avaliação', exact: true }).click();
  await expect(diagram.getByTestId('workflow-map-stage-revision')).toHaveAttribute('aria-current', 'step');
  await expect(diagram.getByTestId('workflow-map-stage-translation')).not.toHaveAttribute('aria-current');
  await expect(diagram.getByTestId('workflow-map-detail')).toContainText('Etapa atual: Revisão');
  await expect(page.getByRole('button', { name: 'Selecionar arquivos', exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('translator-workflow-after-upload.png') });
  await page.getByRole('button', { name: 'Acompanhar workflow', exact: true }).click();
  await expect(page.getByTestId('record-page').getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '40');
  await expect(page.getByTestId('record-page').getByTestId('workflow-map-stage-revision')).toHaveAttribute('aria-current', 'step');
});
