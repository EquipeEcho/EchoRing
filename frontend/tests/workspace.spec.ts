import { test, expect, type Page } from '@playwright/test';

async function enterDemo(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Acessar demonstração', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
}

test('login validates input and password visibility; recovery is explicitly simulated', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible();
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveJSProperty('type', 'text');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Conta não disponível neste ambiente.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@example.com');
  await page.getByRole('button', { name: 'Simular recuperação' }).click();
  await expect(page.getByText('Neste ambiente demonstrativo, nenhum e-mail é enviado e nenhuma senha é alterada.')).toBeVisible();
});

test('demo session survives reload and sign out protects private routes', async ({ page }) => {
  await page.goto('/operacao');
  await expect(page).toHaveURL(/login/);
  await enterDemo(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir meu perfil' }).click();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login/);
});

test('project details, new request and status filters work', async ({ page }) => {
  await enterDemo(page);
  await page.getByRole('button', { name: /Abrir OS-2026-084:/ }).click();
  await expect(page.getByText('Português → Inglês', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Fechar detalhes' }).click();
  await page.getByRole('button', { name: 'Nova requisição', exact: true }).click();
  await page.getByRole('button', { name: 'Criar requisição de demonstração' }).click();
  await expect(page.getByText('Preencha o título, o cliente e os idiomas.')).toBeVisible();
  await page.getByLabel('Título do projeto', { exact: true }).fill('Contrato de teste');
  await page.getByLabel('Cliente', { exact: true }).fill('Cliente de teste');
  await page.getByLabel('Idiomas', { exact: true }).fill('Português → Inglês');
  await page.getByRole('button', { name: 'Criar requisição de demonstração' }).click();
  await expect(page.getByRole('button', { name: /Abrir REQ-007: Contrato de teste/ })).toBeVisible();
  await page.getByRole('button', { name: 'Ver toda a operação' }).click();
  await page.getByRole('tab', { name: 'Nova requisição', exact: true }).click();
  await expect(page.getByRole('button', { name: /Abrir REQ-007:/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir OS-2026-084:/ })).toHaveCount(0);
});

test('tasks, search, mobile navigation and notifications are usable', async ({ page }, testInfo) => {
  await enterDemo(page);
  const task = page.getByRole('checkbox', { name: 'Revisar contrato traduzido' });
  await task.click();
  await expect(task).toHaveAttribute('aria-checked', 'true');
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Buscar projetos', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar projetos' }).fill('nada-encontrado');
  await expect(page.getByText('Nenhum projeto encontrado')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca', exact: true }).last().click();
  await page.getByRole('button', { name: 'Notificações', exact: true }).click();
  await page.getByRole('button', { name: 'Marcar todas como lidas' }).click();
  await expect(page.getByRole('button', { name: 'Todas as notificações lidas' })).toBeDisabled();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Mais', exact: true }).click();
  await page.getByRole('button', { name: 'Cadastros', exact: testInfo.project.name !== 'mobile' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastros', exact: true })).toBeVisible();
});

test('login and workspace fit the viewport without horizontal overflow', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
  await expect.poll(() => page.locator('img').evaluateAll(images => images.length > 0 && images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('login-small.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await enterDemo(page);
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 740 });
    await expect(page.getByRole('button', { name: 'Início', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('dashboard-small.png'), fullPage: true });
    await page.getByRole('button', { name: 'Nova requisição', exact: true }).click();
    const create = page.getByRole('button', { name: 'Criar requisição de demonstração' });
    await expect(create).toBeVisible();
    expect(await create.evaluate(element => {
      const parent = element.getBoundingClientRect();
      return [...element.children].every(child => {
        const bounds = child.getBoundingClientRect();
        return bounds.left >= parent.left && bounds.right <= parent.right;
      });
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('request-small.png'), fullPage: true });
  }
  expect(errors).toEqual([]);
});
