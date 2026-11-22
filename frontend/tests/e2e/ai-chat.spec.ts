import { expect, test, type Page, type Route } from '@playwright/test';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type',
  'access-control-allow-methods': 'POST,OPTIONS',
};

async function signIn(page: Page, demo = false) {
  await page.addInitScript(isDemo => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Administrador', email: 'admin@example.test', role: 'admin', demo: isDemo,
      token: isDemo ? undefined : 'chat-test-token', expires: Date.now() / 1000 + 3600,
    }));
  }, demo);
}

async function mockAgent(page: Page, handle: (route: Route) => Promise<void>) {
  await page.route('**/agent', route => route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers: cors }) : handle(route));
}

function reply(route: Route, status: number, body: object) {
  return route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
}

test('admin sends an authenticated question, waits for the agent and keeps the answer across navigation', async ({ page }, testInfo) => {
  let calls = 0;
  let release: () => void = () => {};
  const responseReady = new Promise<void>(resolve => { release = resolve; });
  await mockAgent(page, async route => {
    calls += 1;
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBe('Bearer chat-test-token');
    expect(route.request().postDataJSON()).toEqual({ pergunta: 'Primeira linha\nSegunda linha' });
    await responseReady;
    await reply(route, 200, { resposta: '**Consulte as tarefas** para acompanhar os projetos.' });
  });
  await signIn(page);
  await page.goto('/dashboard');
  const launcher = page.getByRole('button', { name: 'Assistente de IA', exact: true });
  await launcher.click();
  await expect(page.getByText('Pronto para conversar', { exact: true })).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Mensagem para o assistente' });
  const send = page.getByRole('button', { name: 'Enviar mensagem' });
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('maxlength', '500');
  for (const value of ['   ', 'oi']) {
    await input.fill(value);
    await expect(send).toBeDisabled();
  }
  await page.getByRole('button', { name: 'Como posso organizar as solicitações?' }).click();
  await expect(input).toHaveValue('Como posso organizar as solicitações?');
  await input.fill('  Primeira linha');
  await input.press('Shift+Enter');
  await input.pressSequentially('Segunda linha  ');
  await input.press('Enter');
  const messages = page.getByLabel('Mensagens do assistente');
  await expect(messages.getByText('Primeira linha Segunda linha')).toBeVisible();
  await expect(page.getByText('Respondendo...', { exact: true })).toBeVisible();
  await expect(send).toBeDisabled();
  await expect(input).not.toBeEditable();
  await expect.poll(() => calls).toBe(1);
  // O cliente comum expira em 20s; o chat precisa respeitar os 30s do backend.
  await new Promise(resolve => setTimeout(resolve, 21000));
  await expect(page.getByText('Respondendo...', { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  release();
  await expect(messages.getByText('Consulte as tarefas', { exact: true })).toBeVisible();
  await expect(messages.getByRole('alert')).toHaveCount(0);
  await expect(input).toBeEditable();
  await expect(input).toHaveValue('');
  await page.getByRole('button', { name: 'Minimizar assistente' }).click();
  await page.getByRole('button', { name: testInfo.project.name === 'mobile' ? 'Tarefas' : 'Minhas tarefas', exact: true }).first().click();
  await expect(page).toHaveURL(/tarefas/);
  await launcher.click();
  await expect(input).toBeFocused();
  await expect(messages.getByText('Consulte as tarefas', { exact: true })).toBeVisible();
  const bounds = await messages.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  await page.keyboard.press('Escape');
  await expect(launcher).toBeFocused();
});

test('server failures are shown and a later successful message clears the error', async ({ page }) => {
  let calls = 0;
  await mockAgent(page, route => {
    calls += 1;
    if (calls === 1) return reply(route, 503, { detail: 'O assistente não foi configurado.' });
    if (calls === 2) return reply(route, 401, { detail: 'Sessão expirada. Entre novamente no portal.' });
    return reply(route, 200, { resposta: 'Olá! Como posso ajudar?' });
  });
  await signIn(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Assistente de IA', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Mensagem para o assistente' });
  const send = page.getByRole('button', { name: 'Enviar mensagem' });
  const messages = page.getByLabel('Mensagens do assistente');
  for (const error of ['O assistente não foi configurado.', 'Sessão expirada. Entre novamente no portal.']) {
    await input.fill('Olá!');
    await send.click();
    await expect(messages.getByRole('alert')).toContainText(error);
    await expect(page.getByText('Falha no envio', { exact: true })).toBeVisible();
    await expect(input).toBeEditable();
  }
  await input.fill('Olá!');
  await send.click();
  await expect(messages.getByText('Olá! Como posso ajudar?', { exact: true })).toBeVisible();
  await expect(messages.getByRole('alert')).toHaveCount(0);
  expect(calls).toBe(3);
});

test('invalid responses are reported instead of showing an empty assistant message', async ({ page }) => {
  await mockAgent(page, route => reply(route, 200, {}));
  await signIn(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Assistente de IA', exact: true }).click();
  await page.getByRole('textbox', { name: 'Mensagem para o assistente' }).fill('Olá!');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByLabel('Mensagens do assistente').getByRole('alert')).toContainText('O assistente retornou uma resposta vazia.');
});

test('demo mode explains that a real account is required and does not call the agent', async ({ page }) => {
  let calls = 0;
  await mockAgent(page, route => { calls += 1; return reply(route, 200, { resposta: 'Não deveria executar.' }); });
  await signIn(page, true);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Assistente de IA', exact: true }).click();
  await expect(page.getByText('Modo demonstração', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Mensagens do assistente').getByRole('alert')).toContainText('Entre com uma conta da empresa');
  await expect(page.getByRole('textbox', { name: 'Mensagem para o assistente' })).not.toBeEditable();
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
  expect(calls).toBe(0);
});

for (const role of ['translator', 'employee', 'hr']) {
  test(`${role} does not see the assistant`, async ({ page }) => {
    await page.addInitScript(userRole => {
      sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
        name: 'Usuário', email: 'user@example.test', role: userRole, demo: true,
      }));
    }, role);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assistente de IA' })).toHaveCount(0);
  });
}
