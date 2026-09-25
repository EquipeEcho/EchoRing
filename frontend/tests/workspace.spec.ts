import { test, expect, type Page } from '@playwright/test';

async function enterDemo(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Acessar demonstração', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
}

test('bundled font weights render consistently and fields show keyboard focus', async ({ page }) => {
  await page.goto('/login');
  const heading = page.getByRole('heading', { name: 'Acesse sua conta' });
  await expect(heading).toBeVisible();
  const families = ['InterRegular', 'InterMedium', 'InterSemibold', 'InterBold'];
  const loaded = await page.evaluate(() => [...document.fonts].filter(face => face.status === 'loaded').map(face => face.family.replaceAll('"', '')));
  for (const family of families) expect(loaded).toContain(family);
  expect(await heading.evaluate(element => getComputedStyle(element).fontFamily)).toContain('InterBold');
  const email = page.getByRole('textbox', { name: 'E-mail', exact: true });
  expect(await email.evaluate(element => getComputedStyle(element).fontFamily)).toContain('InterRegular');
  await email.focus();
  await expect(page.getByTestId('auth-input').first()).toHaveCSS('border-color', 'rgb(255, 55, 95)');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Esqueci minha senha' })).toBeFocused();
});

test('login validates input and password visibility; recovery is explicitly simulated', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible();
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveJSProperty('type', 'text');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/Não foi possível conectar à empresa|E-mail ou senha incorretos/);
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

test('translator session only exposes translator workspace areas', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Marina Costa', email: 'marina@example.test', role: 'translator', demo: false,
      token: 'test-translator-token', expires: Date.now() / 1000 + 3600,
    }));
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
  await expect(page.getByText('Meus projetos', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nova requisição', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cadastros', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pedidos', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Abrir meu perfil' }).click();
  await expect(page.getByText('Tradutor · Conta autenticada')).toBeVisible();
  await page.goto('/solicitacoes');
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/usuarios');
  await expect(page).toHaveURL(/dashboard/);
});

test('general administrator can create a platform user', async ({ page }) => {
  const users = [{ id: 'admin-1', name: 'Administrador Geral', email: 'admin@example.test', role: 'admin', active: true }];
  await page.route('**/users', async route => {
    if (route.request().method() === 'POST') {
      const data = route.request().postDataJSON();
      const created = { id: 'user-2', name: data.name, email: data.email, role: data.role, active: true };
      users.push(created);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(users) });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Administrador Geral', email: 'admin@example.test', role: 'admin', demo: false,
      token: 'test-admin-token', expires: Date.now() / 1000 + 3600,
    }));
  });
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible();
  await expect(page.getByText('Administrador Geral', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar usuário', exact: true }).first().click();
  await page.getByLabel('Nome completo').fill('Fernanda Lima');
  await page.getByLabel('E-mail', { exact: true }).fill('fernanda@example.test');
  await page.getByRole('radio', { name: /Recursos Humanos/ }).click();
  await page.getByLabel('Senha inicial', { exact: true }).fill('curta');
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await expect(page.getByRole('alert')).toContainText('pelo menos 12 caracteres');
  await page.getByLabel('Senha inicial', { exact: true }).fill('SenhaTemporaria2026!');
  await page.getByRole('button', { name: 'Criar acesso' }).click();
  await expect(page.getByText('Fernanda Lima já pode acessar a plataforma como Recursos Humanos.')).toBeVisible();
  await expect(page.getByText('fernanda@example.test')).toBeVisible();
});

test('project details, new request and status filters work', async ({ page }) => {
  await enterDemo(page);
  await page.getByRole('button', { name: /Abrir OS-2026-084:/ }).click();
  await expect(page.getByText('Português → Inglês', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Fechar detalhes' }).click();
  await page.getByRole('button', { name: 'Nova requisição', exact: true }).click();
  await page.getByRole('button', { name: 'Criar requisição', exact: true }).click();
  await expect(page.getByText('Preencha o título, o cliente e os idiomas.')).toBeVisible();
  await page.getByLabel('Título do projeto', { exact: true }).fill('Contrato de teste');
  await page.getByLabel('Cliente', { exact: true }).fill('Cliente de teste');
  await page.getByRole('button', { name: 'Idioma de origem', exact: true }).click();
  await page.getByRole('radio', { name: 'Idioma de origem: Português', exact: true }).click();
  await page.getByRole('button', { name: 'Idioma de destino', exact: true }).click();
  await page.getByRole('radio', { name: 'Idioma de destino: Inglês', exact: true }).click();
  await page.getByRole('button', { name: 'Criar requisição', exact: true }).click();
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
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible();
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
  if (testInfo.project.name === 'desktop') {
    for (const width of [768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const currentNav = page.getByRole('button', { name: width < 1000 ? 'Início' : 'Visão geral', exact: true });
      await expect(currentNav).toHaveAttribute('aria-current', 'page');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const projects = page.getByRole('button', { name: /^Abrir OS-/ });
      expect(await projects.evaluateAll(elements => elements.every(element => {
        const row = element.getBoundingClientRect();
        return [...element.children].every(child => {
          const bounds = child.getBoundingClientRect();
          return bounds.left >= row.left - 1 && bounds.right <= row.right + 1;
        });
      }))).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true });
    }
  }
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 740 });
    await expect(page.getByRole('button', { name: 'Início', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('dashboard-small.png'), fullPage: true });
    await page.getByRole('button', { name: 'Nova requisição', exact: true }).click();
    const create = page.getByRole('button', { name: 'Criar requisição', exact: true });
    await expect(create).toBeVisible();
    expect(await create.evaluate(element => {
      const parent = element.getBoundingClientRect();
      return [...element.children].every(child => {
        const bounds = child.getBoundingClientRect();
        return bounds.left >= parent.left && bounds.right <= parent.right;
      });
    })).toBe(true);
    await expect.poll(() => create.evaluate(element => {
      let current: Element | null = element;
      while (current) {
        if (Number(getComputedStyle(current).opacity) < 1) return false;
        current = current.parentElement;
      }
      return true;
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('request-small.png'), fullPage: true });
  }
  expect(errors).toEqual([]);
});
