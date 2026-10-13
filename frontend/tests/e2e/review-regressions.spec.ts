import { expect, test, type Page } from '@playwright/test';

import { dateFromValue, dateKey, formatSelectedDate } from '../../src/components/ui/fields/date-utils';
import { type ServiceStatus, type TranslationService } from '../../src/features/deliveries/types';

function task(id: string, title: string, status: ServiceStatus): TranslationService {
  const hasDelivery = !['Tradutor atribuído', 'Em andamento'].includes(status);
  return {
    id, title, status, requestId: `SOL-${id}`, deadline: '2026-10-30',
    createdAt: '2026-10-13T12:00:00Z', updatedAt: '2026-10-13T12:00:00Z',
    observations: 'Use o glossário aprovado.', source: 'Português', target: 'Inglês',
    clientName: 'Cliente Teste', clientEmail: 'client@example.test', history: [],
    translator: { id: 'translator-1', name: 'Marina Costa', email: 'marina@example.test' },
    attachments: [{ name: 'original.txt', size: 18, content: '' }], lastVersion: hasDelivery ? 1 : 0,
    ...(hasDelivery && { lastDelivery: {
      id: `ENT-${id}`, name: 'traducao.txt', size: 18, status, version: 1,
      submittedAt: '2026-10-13T12:00:00Z', feedback: '',
    } }),
  };
}

async function mockAccount(page: Page, role: 'employee' | 'admin' | 'translator', tasks: TranslationService[]) {
  await page.addInitScript(role => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Pessoa de Teste', email: `${role}@example.test`, role, demo: false,
      token: `test-${role}-token`, expires: Date.now() / 1000 + 3600,
    }));
  }, role);
  await page.route('**/tasks', async route => { await route.fulfill({ json: tasks }); });
  await page.route('**/requests**', async route => { await route.fulfill({ json: [] }); });
}

test('impossible dates and malformed date values are rejected without changing their display', () => {
  for (const value of ['', '2026-02-31', '2026-02-29', '1900-02-29', '2100-02-29',
    '2026-13-01', '2026-00-10', '2026-01-00', '2026-01-32', '2026-2-01', '31/02/2026', '2026-02-28T12:00:00Z']) {
    expect(dateFromValue(value), value).toBeNull();
    expect(formatSelectedDate(value), value).toBe(value);
  }
});

test('valid dates preserve their calendar components, including leap years and years below 100', () => {
  for (const value of ['2026-02-28', '2024-02-29', '2000-02-29', '0099-01-31', '0000-02-29']) {
    const parsed = dateFromValue(value);
    expect(parsed, value).not.toBeNull();
    expect(dateKey(parsed!)).toBe(value);
    expect(parsed!.getHours()).toBe(12);
  }
  expect(formatSelectedDate('2026-02-28')).toContain('28 de fevereiro de 2026');
});

for (const role of ['employee', 'admin'] as const) {
  test(`${role} project and task links open the selected task in its status tab`, async ({ page }, testInfo) => {
    const tasks = [
      task('TRD-ASSIGNED', 'Contrato atribuído', 'Tradutor atribuído'),
      task('TRD-PROGRESS', 'Manual em tradução', 'Em andamento'),
      task('TRD-REVIEW', 'Revisão pendente', 'Aguardando avaliação'),
      task('TRD-READY', 'Tradução aprovada', 'Pronta'),
    ];
    await mockAccount(page, role, tasks);
    if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });

    await page.goto('/operacao');
    await page.getByRole('button', { name: `Abrir ${tasks[0].id}: ${tasks[0].title}`, exact: true }).click();
    await expect(page).toHaveURL(/entregas\?task=TRD-ASSIGNED/);
    await expect(page.getByTestId('task-TRD-ASSIGNED')).toContainText('Aguardando o tradutor iniciar');
    await expect(page.getByRole('tab', { name: /Em andamento/ })).toHaveAttribute('aria-selected', 'true');

    await page.goto('/tarefas');
    await page.getByRole('button', { name: tasks[1].title, exact: true }).click();
    await expect(page).toHaveURL(/entregas\?task=TRD-PROGRESS/);
    await expect(page.getByTestId('task-TRD-PROGRESS')).toContainText('Tradução em andamento.');
    await expect(page.locator('[data-testid^="task-"]').first()).toHaveAttribute('data-testid', 'task-TRD-PROGRESS');
    await expect(page.getByRole('button', { name: 'Aprovar tradução', exact: true })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    for (const [id, tab] of [['TRD-REVIEW', 'Para avaliar'], ['TRD-READY', 'Finalizadas']]) {
      await page.goto(`/entregas?task=${id}`);
      await expect(page.getByTestId(`task-${id}`)).toBeVisible();
      await expect(page.getByRole('tab', { name: new RegExp(tab) })).toHaveAttribute('aria-selected', 'true');
    }
    await page.goto('/entregas');
    await expect(page.getByRole('tab', { name: /Para avaliar/ })).toHaveAttribute('aria-selected', 'true');
  });
}

for (const role of ['translator', 'employee'] as const) {
  test(`${role} downloads handle 401, 404 and network failures, then allow a successful retry`, async ({ page }) => {
    const record = task('TRD-DOWNLOAD', 'Arquivo de teste', role === 'translator' ? 'Em andamento' : 'Aguardando avaliação');
    await mockAccount(page, role, [record]);
    const messages: string[] = [];
    const errors: string[] = [];
    const downloads: string[] = [];
    page.on('dialog', async dialog => { messages.push(dialog.message()); await dialog.accept(); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('download', download => downloads.push(download.suggestedFilename()));
    let outcome: number | 'network' = 401;
    const path = role === 'translator' ? '**/tasks/TRD-DOWNLOAD/attachments/0' : '**/deliveries/ENT-TRD-DOWNLOAD/files/0';
    await page.route(path, async route => {
      expect(route.request().headers().authorization).toBe(`Bearer test-${role}-token`);
      if (outcome === 'network') await route.abort('failed');
      else if (outcome === 200) await route.fulfill({ contentType: 'text/plain', body: 'Documento de teste' });
      else await route.fulfill({ status: outcome, json: { detail: outcome === 401 ? 'Sessão expirada.' : 'Documento não encontrado.' } });
    });
    await page.goto('/entregas');
    const download = page.getByRole('button', { name: role === 'translator' ? 'Baixar' : 'Baixar arquivo', exact: true });
    for (const [index, failure] of [401, 404, 'network' as const].entries()) {
      outcome = failure;
      await download.click();
      await expect.poll(() => messages.length).toBe(index + 1);
      expect(messages[index]).toContain('Não foi possível baixar');
    }
    expect(messages[0]).toContain('Sessão expirada.');
    expect(messages[1]).toContain('Documento não encontrado.');
    expect(messages[2]).toContain('Verifique sua conexão');
    expect(downloads).toEqual([]);
    outcome = 200;
    const success = page.waitForEvent('download');
    await download.click();
    expect((await success).suggestedFilename()).toBe(role === 'translator' ? 'original.txt' : 'traducao.txt');
    expect(errors).toEqual([]);
    expect(messages).toHaveLength(3);
  });
}

test('a malformed attachment shows a download error without an unhandled rejection', async ({ page }) => {
  await mockAccount(page, 'employee', []);
  const request = {
    id: 'SOL-CORRUPT', createdAt: '2026-10-13T12:00:00Z', status: 'Recebido',
    name: 'Cliente de Teste', email: 'client@example.test', company: '', title: 'Anexo inválido',
    service: 'Tradução de documentos', source: 'Português', target: 'Inglês', deadline: '',
    message: '', consent: true, attachments: [{ name: 'corrompido.txt', size: 3, content: '%%%' }],
  };
  await page.route('**/requests**', async route => {
    await route.fulfill({ json: new URL(route.request().url()).pathname === '/requests' ? [request] : request });
  });
  const errors: string[] = [];
  const messages: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', async dialog => { messages.push(dialog.message()); await dialog.accept(); });
  await page.goto('/solicitacoes');
  await page.getByRole('button', { name: /Abrir solicitação SOL-CORRUPT/ }).click();
  await page.getByRole('button', { name: 'corrompido.txt', exact: true }).click();
  await expect.poll(() => messages.length).toBe(1);
  expect(messages[0]).toContain('Não foi possível baixar');
  expect(errors).toEqual([]);
});
