import { expect, test } from '@playwright/test';

test('assigned translator uploads a translation and sends it to review', async ({ page }) => {
  const calls: { method: string; authorization: string | null; contentType: string | null }[] = [];
  const service = {
    id: 'OS-TEST-001', requestId: 'SOL-TEST', title: 'Manual técnico', status: 'Em tradução',
    deadline: '30/09/2026', createdAt: '2026-09-20T12:00:00Z', lastVersion: 0,
  };
  await page.route('**/services**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    calls.push({
      method: request.method(), authorization: request.headers().authorization ?? null,
      contentType: request.headers()['content-type'] ?? null,
    });
    if (request.method() === 'GET' && url.pathname === '/services') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([service]) });
      return;
    }
    if (request.method() === 'POST' && url.pathname === `/services/${service.id}/deliveries`) {
      service.status = 'Em revisão'; service.lastVersion = 1;
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
        id: 'ENT-TEST-001', serviceId: service.id, serviceTitle: service.title, version: 1,
        translatorName: 'Marina Costa', name: 'sample.txt', mediaType: 'text/plain; charset=utf-8',
        size: 21, status: 'Em revisão', submittedAt: '2026-09-20T13:00:00Z',
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
  await page.getByRole('button', { name: 'Entregas', exact: true }).click();
  await expect(page).toHaveURL(/entregas/);
  await expect(page.getByRole('heading', { name: 'Entregas', exact: true })).toBeVisible();
  await expect(page.getByText('Manual técnico', { exact: true })).toBeVisible();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Selecionar documento', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles('tests/fixtures/sample.txt');
  await expect(page.getByText('sample.txt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar para revisão', exact: true }).click();
  await expect(page.getByTestId('delivery-notice')).toContainText('versão 1');
  await expect(page.getByText('Em revisão', { exact: true }).first()).toBeVisible();

  const upload = calls.find(call => call.method === 'POST');
  expect(upload?.authorization).toBe('Bearer test-translator-token');
  expect(upload?.contentType).toContain('multipart/form-data; boundary=');
  expect(calls.every(call => call.authorization === 'Bearer test-translator-token')).toBe(true);
});
