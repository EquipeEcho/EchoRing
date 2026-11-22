import { expect, test } from '@playwright/test';

test('admin can exchange messages with the orchestrator across workspace navigation', async ({ page }, testInfo) => {
  const requests: { body: unknown; authorization: string | undefined }[] = [];
  await page.route('**/agent', async route => {
    const request = route.request();
    const origin = request.headers().origin;
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin ?? '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization,content-type',
        },
      });
      return;
    }
    requests.push({
      body: request.postDataJSON(),
      authorization: request.headers()['authorization'],
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const question = (request.postDataJSON() as { pergunta: string }).pergunta;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': origin ?? '*' },
      body: JSON.stringify({ resposta: `**Resposta:** ${question}` }),
    });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Administrador', email: 'admin@example.test', role: 'admin', demo: true,
      token: 'admin-session-token',
    }));
  });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const launcher = page.getByRole('button', { name: 'Assistente de IA', exact: true });
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByText('Aguardando mensagem', { exact: true })).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Mensagem para o assistente' });
  const send = page.getByRole('button', { name: 'Enviar mensagem' });
  await expect(input).toBeFocused();
  await expect(send).toBeDisabled();
  await input.fill('oi');
  await expect(send).toBeDisabled();
  await page.getByRole('button', { name: 'Como posso organizar as solicitações?' }).click();
  await expect(input).toHaveValue('Como posso organizar as solicitações?');
  await input.fill('Primeira linha');
  await input.press('Shift+Enter');
  await input.pressSequentially('Segunda linha');
  await expect(input).toHaveValue('Primeira linha\nSegunda linha');
  await input.press('Enter');
  await expect(page.getByText('Primeira linha Segunda linha')).toBeVisible();
  await expect(page.getByText('O assistente está processando sua solicitação...')).toBeVisible();
  await expect(page.getByText('Resposta: Primeira linha Segunda linha')).toBeVisible();
  await expect(page.getByText('Resposta recebida', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('');
  await input.fill('Mais uma pergunta');
  await send.click();
  await expect(page.getByText('Resposta: Mais uma pergunta')).toBeVisible();
  expect(requests).toEqual([
    { body: { pergunta: 'Primeira linha\nSegunda linha' }, authorization: 'Bearer admin-session-token' },
    { body: { pergunta: 'Mais uma pergunta' }, authorization: 'Bearer admin-session-token' },
  ]);
  await expect(page.getByText('Resposta: Primeira linha Segunda linha')).toBeVisible();
  await page.getByRole('button', { name: 'Minimizar assistente' }).click();
  await expect(launcher).toBeVisible();
  await page.getByRole('button', { name: testInfo.project.name === 'mobile' ? 'Tarefas' : 'Minhas tarefas', exact: true }).first().click();
  await expect(page).toHaveURL(/tarefas/);
  await launcher.click();
  await expect(input).toBeFocused();
  await expect(page.getByText('Resposta: Primeira linha Segunda linha')).toBeVisible();
  await expect(page.getByText('Resposta: Mais uma pergunta')).toBeVisible();
  const chat = page.getByLabel('Mensagens do assistente');
  const bounds = await chat.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  await page.keyboard.press('Escape');
  await expect(launcher).toBeVisible();
  await expect(launcher).toBeFocused();
});

test('admin without a backend session cannot send messages', async ({ page }) => {
  let requestSent = false;
  await page.route('**/agent', route => {
    requestSent = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"resposta":"unexpected"}' });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Administrador', email: 'admin@example.test', role: 'admin', demo: true,
    }));
  });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Assistente de IA', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mensagem para o assistente' }).fill('Ajuda com projetos');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByLabel('Mensagens do assistente').getByRole('alert'))
    .toContainText('conta de administrador autenticada');
  expect(requestSent).toBe(false);
});

test('chat reports orchestrator unavailability', async ({ page }) => {
  await page.route('**/agent', async route => {
    const request = route.request();
    const origin = request.headers().origin ?? '*';
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization,content-type',
        },
      });
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': origin },
      body: JSON.stringify({ detail: 'O assistente está indisponível. Tente novamente em instantes.' }),
    });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Administrador', email: 'admin@example.test', role: 'admin', demo: true,
      token: 'admin-session-token',
    }));
  });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Assistente de IA', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mensagem para o assistente' }).fill('Ajuda com projetos');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByText('Serviço indisponível', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Mensagens do assistente').getByRole('alert'))
    .toContainText('O assistente está indisponível');
});

for (const role of ['translator', 'employee', 'hr']) {
  test(`${role} does not see the assistant`, async ({ page }) => {
    await page.addInitScript(userRole => {
      sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
        name: 'Usuário', email: 'user@example.test', role: userRole, demo: true,
      }));
    }, role);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assistente de IA' })).toHaveCount(0);
  });
}
