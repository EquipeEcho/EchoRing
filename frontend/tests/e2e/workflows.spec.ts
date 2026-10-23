import { expect, test, type Page } from '@playwright/test';

import { type TranslationService } from '../../src/features/deliveries/types';
import { workflowTemplates } from '../../src/features/workflows/data/workflow-templates';
import { type ServiceWorkflow } from '../../src/features/workflows/types';

const cards = (page: Page) => page.locator('[data-testid^="workflow-job-"]');

async function session(page: Page, role = 'employee', demo = true, services: TranslationService[] = []) {
  let fail = false;
  let reads = 0;
  let mutations = 0;
  await page.addInitScript(({ role, demo }) => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({ name: role === 'translator' ? 'Marina Costa' : 'Equipe EchoRing', email: `${role}@example.test`, role, demo,
      ...(!demo && { token: 'workflows-test-token', expires: Date.now() / 1000 + 3600 }) }));
  }, { role, demo });
  await page.route('**/tasks', async route => {
    reads++;
    expect(route.request().headers().authorization).toBe('Bearer workflows-test-token');
    await route.fulfill({ status: fail ? 503 : 200, json: fail ? { detail: 'Serviços temporariamente indisponíveis.' } : services });
  });
  await page.route('**/requests', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
  page.on('request', request => { if (!['GET', 'OPTIONS'].includes(request.method()) && /\/tasks|\/workflows/.test(request.url())) mutations++; });
  return { fail: (value: boolean) => { fail = value; }, reads: () => reads, mutations: () => mutations };
}

async function select(page: Page, label: string, value: string) {
  const openDialogs = await page.getByTestId('dialog-surface').count();
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('radio', { name: `${label}: ${value}`, exact: true }).click();
  await expect(page.getByTestId('dialog-surface')).toHaveCount(openDialogs);
}

function realService(): TranslationService {
  return { id: 'REAL-001', title: 'Manual de integração real', status: 'Em andamento', source: 'Inglês', target: 'Português', clientName: 'Cliente de teste', deadline: '2099-10-23', translator: { id: 'tr-real', name: 'Marina Costa', email: 'translator@example.test' },
    createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-19T12:00:00Z', lastVersion: 0, observations: '', attachments: [], history: [] };
}

test('staff reaches a clean workflow overview and selects translators directly', async ({ page }, info) => {
  await session(page);
  await page.goto('/dashboard');
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Mais', exact: true }).click();
  await page.getByRole('button', { name: 'Workflows', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acompanhamento de Workflows', exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(8);
  await expect(page.getByRole('heading', { name: 'Filtrar trabalhos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Buscar trabalhos nos workflows' })).toHaveCount(0);
  for (const label of ['Tradutor', 'Serviço', 'Tipo de workflow', 'Status do acompanhamento']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole('button', { name: /^Filtrar trabalhos de/ })).toHaveCount(4);
  await page.getByRole('button', { name: 'Filtrar trabalhos de Marina Costa' }).click();
  await expect(cards(page)).toHaveCount(3);
  await page.getByTestId('workflow-job-DEMO-001').getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await expect(page.getByTestId('record-page')).toBeVisible();
  await page.goBack();
  await expect(cards(page)).toHaveCount(3);
  await page.getByRole('button', { name: 'Filtrar trabalhos de Marina Costa' }).click();
  await expect(cards(page)).toHaveCount(8);
});

test('all five models expose requirements, deliverables and responsibilities on dedicated detail pages', async ({ page }, info) => {
  await session(page, 'translator');
  await page.goto('/workflows');
  await page.getByRole('tab', { name: 'Modelos de workflow' }).click();
  for (const name of ['TEP', 'MTPE', 'Localização', 'Documental', 'Legendagem']) {
    const trigger = page.getByRole('button', { name: `Explorar ${name}`, exact: true });
    await trigger.click();
    const dialog = page.getByTestId('record-page');
    await expect(dialog.getByTestId('workflow-timeline').locator('[data-testid^="workflow-stage-"]')).toHaveCount(5);
    await expect(dialog.getByText('Requisitos', { exact: true })).toHaveCount(5);
    await expect(dialog.getByText('Entregáveis esperados', { exact: true })).toHaveCount(5);
    await expect(dialog.getByText('Quem faz cada etapa', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Voltar aos modelos', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Explorar / })).toHaveCount(5);
  }
  await page.screenshot({ path: info.outputPath('workflow-library-dark.png') });
});

test('translator sees own examples and a timeline distinguishing completed, current and pending work', async ({ page }) => {
  await session(page, 'translator');
  await page.goto('/workflows');
  await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Filtrar trabalhos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Buscar trabalhos nos workflows' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Filtrar trabalhos de/ })).toHaveCount(0);
  await expect(page.getByText('Rafael Lima', { exact: true })).toHaveCount(0);
  const card = page.getByTestId('workflow-job-DEMO-001');
  await expect(card.getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '40');
  await card.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  const dialog = page.getByTestId('record-page');
  await expect(dialog.getByTestId('workflow-map-stage-revision')).toHaveAttribute('aria-current', 'step');
  await dialog.getByRole('button', { name: 'Ver todas as etapas e responsáveis', exact: true }).click();
  const timeline = dialog.getByTestId('workflow-timeline');
  await expect(timeline.getByText('Concluída', { exact: true })).toHaveCount(2);
  await expect(timeline.getByText('Em andamento', { exact: true })).toHaveCount(1);
  await expect(timeline.getByText('Pendente', { exact: true })).toHaveCount(2);
  await expect(dialog.getByTestId('workflow-stage-revision')).toContainText('Camila Rocha');
  await expect(dialog.getByTestId('workflow-stage-translation')).toContainText('Tradutor');
  await expect(page).toHaveURL(/\/workflows\/DEMO-001/);
  await expect(page.getByTestId('dialog-surface')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('record-page').getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '40');
  await page.goBack();
  await expect(cards(page)).toHaveCount(3);
  await page.goForward();
  await expect(page.getByTestId('record-page')).toBeVisible();
});

test('staff discovers blocked and attention jobs and inspects the blocker and stage owner', async ({ page }) => {
  await session(page, 'admin');
  await page.goto('/workflows');
  await expect(cards(page)).toHaveCount(8);
  await expect(page.getByTestId('workflow-job-DEMO-003')).toContainText('Bloqueado');
  await expect(page.getByTestId('workflow-job-DEMO-008')).toContainText('Bloqueado');
  await page.getByTestId('workflow-job-DEMO-003').getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  const dialog = page.getByTestId('record-page');
  await expect(dialog.getByText(/Acesso à versão de testes indisponível/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Ver todas as etapas e responsáveis', exact: true }).click();
  await expect(dialog.getByTestId('workflow-stage-testing')).toContainText('Bloqueada');
  await expect(dialog.getByTestId('workflow-stage-testing')).toContainText('Camila Rocha');
});

test('real services reuse one API read, do not invent progress and keep model consultation separate', async ({ page }) => {
  const server = await session(page, 'employee', false, [realService()]);
  await page.goto('/workflows');
  await expect(cards(page)).toHaveCount(1);
  expect(server.reads()).toBe(1);
  await expect(page.getByTestId('workflow-source-notice')).toContainText('Serviços reais');
  await expect(page.getByRole('progressbar', { name: /^Progresso de/ })).toHaveCount(0);
  const card = page.getByTestId('workflow-job-REAL-001');
  await expect(card).toContainText('Status do serviço: Em andamento');
  await expect(card).toContainText('Progresso por etapas indisponível');
  await card.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await select(page, 'Modelo para consulta', 'Tradução tradicional (TEP)');
  const dialog = page.getByTestId('record-page');
  await expect(dialog.getByText('Modelo de referência · sem registros do serviço')).toBeVisible();
  await expect(dialog.getByRole('progressbar', { name: /^Progresso de/ })).toHaveCount(0);
  await expect(dialog.getByText('Concluída', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar aos workflows', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver exemplos demonstrativos' }).click();
  await expect(cards(page)).toHaveCount(8);
  await expect(page.getByTestId('workflow-job-REAL-001')).toHaveCount(0);
  await expect(page.getByTestId('workflow-source-notice')).toContainText('fictícios');
  await page.getByRole('button', { name: 'Voltar aos serviços reais' }).click();
  await expect(cards(page)).toHaveCount(1);
  expect(server.mutations()).toBe(0);
  expect(server.reads()).toBe(1);
});

test('API failures offer retry and never silently substitute examples; empty accounts can use the library', async ({ page }) => {
  const server = await session(page, 'translator', false, [realService()]);
  server.fail(true);
  await page.goto('/workflows');
  await expect(page.getByRole('alert')).toContainText('Serviços temporariamente indisponíveis.');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByTestId('workflow-source-notice')).toContainText('Serviços reais');
  await page.getByRole('tab', { name: 'Modelos de workflow' }).click();
  await expect(page.getByRole('button', { name: /^Explorar / })).toHaveCount(5);
  server.fail(false);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Meus trabalhos' }).click();
  await expect(cards(page)).toHaveCount(1);
});

test('workflow lists and detail pages fit both themes including 320px screens', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await session(page);
  await page.goto('/workflows');
  await expect(cards(page)).toHaveCount(8);
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await page.getByTestId('theme-toggle').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`workflow-tracking-${theme}.png`) });
    await page.getByTestId('workflow-job-DEMO-001').getByRole('button', { name: 'Ver detalhes', exact: true }).click();
    const dialog = page.getByTestId('record-page');
    await expect(dialog.getByTestId('workflow-map-tep')).toBeVisible();
    expect(await dialog.evaluate(element => element.getBoundingClientRect().width <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Voltar aos workflows', exact: true }).click();
    await page.getByRole('tab', { name: 'Modelos de workflow' }).click();
    await expect(page.getByRole('button', { name: /^Explorar / })).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('tab', { name: 'Acompanhamento', exact: true }).click();
  }
  expect(errors).toEqual([]);
});

test('HR cannot access the workflow route or navigation', async ({ page }, info) => {
  await session(page, 'hr');
  await page.goto('/workflows');
  await expect(page).toHaveURL(/\/dashboard$/);
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Mais', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Workflows', exact: true })).toHaveCount(0);
});

test('an empty real account shows no sample jobs and opens the process library', async ({ page }) => {
  await session(page, 'translator', false);
  await page.goto('/workflows');
  await expect(page.getByText('Nenhum serviço disponível', { exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultar modelos', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Explorar / })).toHaveCount(5);
});

test('employee assigns a persistent process and advances only team stages', async ({ page }) => {
  const service = realService();
  await session(page, 'employee', false, [service]);
  await page.route('**/workflow-reviewers', route => route.fulfill({ json: [{ id: 'reviewer-1', name: 'Revisora da equipe', email: 'reviewer@example.test' }] }));
  await page.route('**/tasks/REAL-001/workflow', async route => {
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toEqual({ templateId: 'tep', reviewerId: 'reviewer-1' });
    service.workflow = { templateId: 'tep', definition: workflowTemplates[0], revision: 1, progress: 0, blocker: '', assignedAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z',
      stages: workflowTemplates[0].stages.map((stage, index) => ({ stageId: stage.id, status: index ? 'pending' : 'current', assignee: stage.role === 'translator' ? 'Marina Costa' : 'Revisora da equipe' })) };
    await route.fulfill({ status: 201, json: service.workflow });
  });
  await page.route('**/tasks/REAL-001/workflow/stages/preparation', async route => {
    expect(route.request().postDataJSON()).toMatchObject({ action: 'complete', expectedRevision: 1 });
    service.workflow = { ...service.workflow!, revision: 2, progress: 20, stages: service.workflow!.stages.map((stage, index) => ({ ...stage, status: index === 0 ? 'completed' : index === 1 ? 'current' : 'pending' })) };
    await route.fulfill({ json: service.workflow });
  });
  await page.goto('/workflows/REAL-001');
  const dialog = page.getByTestId('record-page');
  await expect(dialog.getByRole('button', { name: 'Alocar workflow', exact: true })).toBeVisible();
  await select(page, 'Responsável pela revisão e QA', 'Revisora da equipe · reviewer@example.test');
  await dialog.getByRole('button', { name: 'Alocar workflow', exact: true }).click();
  await expect(dialog.getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '0');
  await dialog.getByRole('button', { name: 'Concluir etapa', exact: true }).click();
  await expect(dialog.getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '20');
  await expect(dialog.getByText('Etapa atual: Tradução', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Concluir etapa', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Bloquear etapa', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('record-page').getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '20');
});

test('translator records own progress, blocks with a reason, and hands review to the team', async ({ page }) => {
  const service = realService();
  service.workflow = { templateId: 'tep', definition: workflowTemplates[0], revision: 2, progress: 20, blocker: '', assignedAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z',
    stages: workflowTemplates[0].stages.map((stage, index) => ({ stageId: stage.id, status: index === 0 ? 'completed' : index === 1 ? 'current' : 'pending', assignee: stage.role === 'translator' ? 'Marina Costa' : 'Revisora da equipe' })) };
  await session(page, 'translator', false, [service]);
  const commands: string[] = [];
  await page.route('**/tasks/REAL-001/workflow/stages/translation', async route => {
    const command = route.request().postDataJSON();
    commands.push(command.action);
    expect(command.expectedRevision).toBe(service.workflow!.revision);
    const workflow = structuredClone(service.workflow) as ServiceWorkflow;
    workflow.revision++;
    workflow.stages[1].status = command.action === 'block' ? 'blocked' : command.action === 'resume' ? 'current' : 'completed';
    workflow.stages[1].note = command.note;
    workflow.blocker = command.action === 'block' ? command.note : '';
    if (command.action === 'complete') { workflow.stages[2].status = 'current'; workflow.progress = 40; }
    service.workflow = workflow;
    await route.fulfill({ json: workflow });
  });
  await page.goto('/workflows/REAL-001');
  const dialog = page.getByTestId('record-page');
  await dialog.getByRole('button', { name: 'Bloquear etapa', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Descreva o motivo');
  expect(commands).toEqual([]);
  await dialog.getByRole('textbox', { name: 'Observação da etapa' }).fill('Aguardando glossário aprovado.');
  await dialog.getByRole('button', { name: 'Bloquear etapa', exact: true }).click();
  await expect(dialog.getByText('Bloqueio: Aguardando glossário aprovado.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Retomar etapa', exact: true }).click();
  await dialog.getByRole('button', { name: 'Concluir etapa', exact: true }).click();
  await expect(dialog.getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '40');
  await expect(dialog.getByText('Etapa atual: Revisão', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Concluir etapa', exact: true })).toHaveCount(0);
  expect(commands).toEqual(['block', 'resume', 'complete']);
});

test('assigned models display distinct connected stages and highlight the actual current step', async ({ page }, info) => {
  const services = workflowTemplates.map(template => {
    const active = template.id === 'documentary' ? 3 : template.id === 'subtitling' ? 2 : 1;
    return { ...realService(), id: `FLOW-${template.id}`, title: `Trabalho ${template.shortTitle}`,
      workflow: { templateId: template.id, definition: template, revision: 2, progress: active * 20, blocker: '', assignedAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-20T12:00:00Z',
        stages: template.stages.map((stage, index) => ({ stageId: stage.id, status: (index < active ? 'completed' : index === active ? 'current' : 'pending') as 'completed' | 'current' | 'pending',
          assignee: stage.role === 'translator' ? 'Marina Costa' : 'Equipe de revisão' })) } };
  });
  await session(page, 'translator', false, services);
  for (const service of services) {
    await page.goto(`/workflows/${service.id}`);
    const diagram = page.getByTestId('record-page').getByTestId(`workflow-map-${service.workflow.templateId}`);
    await expect(diagram.locator('[data-testid^="workflow-map-stage-"]')).toHaveCount(5);
    const current = service.workflow.stages.find(stage => stage.status === 'current')!;
    await expect(diagram.getByTestId(`workflow-map-stage-${current.stageId}`)).toHaveAttribute('aria-current', 'step');
    await expect(diagram.locator('[aria-current="step"]')).toHaveCount(1);
    await expect(diagram.getByText('Início', { exact: true })).toBeVisible();
    await expect(diagram.getByText('Resultado', { exact: true })).toBeVisible();
    await expect(diagram.getByTestId('workflow-map-detail')).toContainText('Responsável: Marina Costa');
    const last = service.workflow.definition.stages[4];
    await diagram.getByTestId(`workflow-map-stage-${last.id}`).click();
    await expect(diagram.getByTestId('workflow-map-detail')).toContainText(last.title);
    await expect(diagram.getByTestId(`workflow-map-stage-${current.stageId}`)).toHaveAttribute('aria-current', 'step');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`workflow-map-${service.workflow.templateId}.png`) });
  }
});
