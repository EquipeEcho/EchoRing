import { expect, test } from '@playwright/test';

test('assigned translator starts a task and uploads a translation for evaluation', async ({ page }, testInfo) => {
  const calls: { method: string; path: string; authorization: string | null; contentType: string | null }[] = [];
  const service = {
    id: 'OS-TEST-001', requestId: 'SOL-TEST', title: 'Manual técnico', status: 'Tradutor atribuído',
    deadline: '30/09/2026', createdAt: '2026-09-20T12:00:00Z', updatedAt: '2026-09-20T12:00:00Z', lastVersion: 0,
    observations: 'Use o glossário aprovado.', source: 'Português', target: 'Inglês', attachments: [], history: [],
  };
  await page.route('**/tasks**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    calls.push({
      method: request.method(), path: url.pathname, authorization: request.headers().authorization ?? null,
      contentType: request.headers()['content-type'] ?? null,
    });
    if (request.method() === 'GET' && url.pathname === '/tasks') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([service]) });
      return;
    }
    if (request.method() === 'POST' && url.pathname === `/tasks/${service.id}/start`) {
      service.status = 'Em andamento';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(service) });
      return;
    }
    if (request.method() === 'POST' && url.pathname === `/tasks/${service.id}/deliveries`) {
      service.status = 'Aguardando avaliação'; service.lastVersion = 1;
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        id: 'ENT-TEST-001', serviceId: service.id, serviceTitle: service.title, version: 1,
        translatorName: 'Marina Costa', name: 'sample.txt', mediaType: 'text/plain; charset=utf-8',
        size: 21, status: 'Aguardando avaliação', submittedAt: '2026-09-20T13:00:00Z',
      }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Rota não simulada.' }) });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Marina Costa', email: 'marina@example.test', role: 'translator', demo: false,
      token: 'test-translator-token', expires: Date.now() / 1000 + 3600,
    }));
  });

  await page.goto('/dashboard');
  await page.getByRole('button', { name: testInfo.project.name === 'mobile' ? 'Traduções' : 'Entregas', exact: true }).click();
  await expect(page).toHaveURL(/entregas/);
  await expect(page.getByRole('heading', { name: 'Minhas traduções', exact: true })).toBeVisible();
  await expect(page.getByText('Manual técnico', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar tradução', exact: true }).click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Selecionar tradução', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles('tests/fixtures/sample.txt');
  await expect(page.getByText('sample.txt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar para avaliação', exact: true }).click();
  await expect(page.getByTestId('delivery-notice')).toContainText('versão 1');
  await expect(page.getByText('Aguardando avaliação', { exact: true }).first()).toBeVisible();

  const upload = calls.find(call => call.path.endsWith('/deliveries'));
  expect(upload?.authorization).toBe('Bearer test-translator-token');
  expect(upload?.contentType).toContain('multipart/form-data; boundary=');
  expect(calls.every(call => call.authorization === 'Bearer test-translator-token')).toBe(true);
});

test('employee approves the latest version and sends the final document', async ({ page }) => {
  const calls: string[] = [];
  const task = {
    id: 'TRD-TEST-002', requestId: 'SOL-TEST-002', title: 'Contrato comercial', status: 'Aguardando avaliação',
    deadline: '2026-10-01', createdAt: '2026-09-20T12:00:00Z', updatedAt: '2026-09-21T12:00:00Z',
    lastVersion: 1, observations: '', source: 'Português', target: 'Inglês', attachments: [], history: [],
    clientName: 'Cliente Teste', clientEmail: 'client@example.test',
    translator: { id: 'translator-1', name: 'Marina Costa', email: 'marina@example.test' },
    lastDelivery: { id: 'ENT-TEST-002', name: 'contrato-traduzido.txt', size: 128, status: 'Aguardando avaliação', version: 1, submittedAt: '2026-09-21T12:00:00Z', feedback: '' },
  };
  await page.route('**/tasks**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    calls.push(`${request.method()} ${url.pathname}`);
    if (request.method() === 'GET' && url.pathname === '/tasks') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([task]) }); return;
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/send-final')) {
      task.status = 'Entregue';
      Object.assign(task, { deliveredAt: '2026-09-21T13:00:00Z' });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(task) }); return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Rota não simulada.' }) });
  });
  await page.route('**/deliveries/ENT-TEST-002/review', async route => {
    calls.push(`${route.request().method()} /deliveries/ENT-TEST-002/review`);
    task.status = 'Pronta'; task.lastDelivery.status = 'Pronta';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: 'ENT-TEST-002', serviceId: task.id, serviceTitle: task.title, version: 1,
      translatorName: 'Marina Costa', name: task.lastDelivery.name, mediaType: 'text/plain', size: 128,
      status: 'Pronta', submittedAt: task.lastDelivery.submittedAt,
    }) });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Funcionária Teste', email: 'staff@example.test', role: 'employee', demo: false,
      token: 'test-employee-token', expires: Date.now() / 1000 + 3600,
    }));
  });

  await page.goto('/entregas');
  await expect(page.getByRole('heading', { name: 'Avaliações e entregas' })).toBeVisible();
  await page.getByRole('button', { name: 'Aprovar tradução' }).click();
  await expect(page.getByTestId('delivery-notice')).toContainText('pronta para envio');
  await page.getByRole('button', { name: 'Enviar documento final ao cliente' }).click();
  await expect(page.getByTestId('delivery-notice')).toContainText('envio ao cliente');
  expect(calls).toContain('POST /deliveries/ENT-TEST-002/review');
  expect(calls).toContain('POST /tasks/TRD-TEST-002/send-final');
});
