import { expect, test, type Locator, type Page } from '@playwright/test';

const storageKey = 'echoring.theme.v1';

async function expectTheme(page: Page, theme: 'light' | 'dark') {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('html')).toHaveCSS('color-scheme', theme);
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    theme === 'light' ? 'rgb(244, 246, 248)' : 'rgb(16, 19, 24)',
  );
  await expect(page.getByRole('button', {
    name: theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro', exact: true,
  })).toBeVisible();
}

async function expectReadable(locator: Locator) {
  const contrast = await locator.evaluate(element => {
    function channels(value: string) {
      return (value.match(/[\d.]+/g) || []).map(Number);
    }
    function luminance(rgb: number[]) {
      const linear = rgb.slice(0, 3).map(channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    }
    const foreground = channels(getComputedStyle(element).color);
    let parent: Element | null = element;
    let background = [255, 255, 255];
    while (parent) {
      const candidate = channels(getComputedStyle(parent).backgroundColor);
      if (candidate.length === 3 || candidate[3] === 1) {
        background = candidate;
        break;
      }
      parent = parent.parentElement;
    }
    const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
    return (values[1] + 0.05) / (values[0] + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
}

test('dark is the default; keyboard toggle persists through reload, routes and sign out', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/login');
  await expectTheme(page, 'dark');
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana@example.test');
  await page.getByRole('button', { name: 'Ativar modo claro', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expectTheme(page, 'light');
  await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue('ana@example.test');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), storageKey)).toBe('light');
  await page.reload();
  await expectTheme(page, 'light');
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click();
  await expectTheme(page, 'light');
  await page.goto('/login');
  await page.getByRole('button', { name: 'Acessar demonstração', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
  await expectTheme(page, 'light');
  await page.getByRole('button', { name: 'Abrir meu perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await expectTheme(page, 'light');
  await page.getByRole('button', { name: 'Ativar modo escuro', exact: true }).click();
  await page.reload();
  await expectTheme(page, 'dark');
});

for (const theme of ['dark', 'light'] as const) {
  test(`${theme} covers every route, fields, buttons and modal text with readable contrast`, async ({ page }, testInfo) => {
    test.slow(); // This scenario visits every public and workspace route, including narrow layouts.
    await page.addInitScript(({ key, theme }) => {
      localStorage.setItem(key, theme);
    }, { key: storageKey, theme });
    await page.goto('/');
    await expectTheme(page, theme);
    await expect(page.getByRole('heading', { name: /Conectam/ })).toBeVisible();
    await page.getByRole('button', { name: 'Solicitar orçamento', exact: true }).click();
    await expectReadable(page.getByRole('heading', { name: /Vamos traduzir/ }));
    await expectReadable(page.getByRole('button', { name: 'Continuar', exact: true }).getByText('Continuar', { exact: true }));
    await expectReadable(page.getByRole('textbox', { name: 'Nome do projeto *', exact: true }));

    await page.goto('/login');
    await expectTheme(page, theme);
    await expectReadable(page.getByRole('heading', { name: 'Acesse sua conta' }));
    await expectReadable(page.getByRole('textbox', { name: 'E-mail', exact: true }));
    await expectReadable(page.getByRole('button', { name: 'Entrar', exact: true }).getByText('Entrar', { exact: true }));
    await page.getByRole('button', { name: 'Entrar', exact: true }).focus();
    await expectReadable(page.getByRole('button', { name: 'Entrar', exact: true }).getByText('Entrar', { exact: true }));
    if (testInfo.project.name === 'desktop') {
      await page.getByRole('button', { name: 'Entrar', exact: true }).hover();
      await expectReadable(page.getByRole('button', { name: 'Entrar', exact: true }).getByText('Entrar', { exact: true }));
    }
    await page.getByRole('button', { name: 'Acessar demonstração', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
    await page.evaluate(() => {
      const session = JSON.parse(sessionStorage.getItem('echoring.auth-session.v2')!);
      sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({ ...session, role: 'admin' }));
    });

    const routes = [
      ['/dashboard', 'Visão geral'], ['/operacao', 'Operação'], ['/entregas', 'Avaliações e entregas'],
      ['/solicitacoes', 'Solicitações'], ['/tarefas', 'Minhas tarefas'], ['/usuarios', 'Usuários'],
      ['/mais', 'Mais'], ['/area/cadastros', 'Cadastros'], ['/area/financeiro', 'Financeiro'],
      ['/area/relatorios', 'Relatórios'], ['/area/administracao', 'Administração'],
    ];
    for (const [route, title] of routes) {
      await page.goto(route);
      const heading = page.getByRole('heading', { name: title, exact: true });
      await expect(heading).toBeVisible();
      await expectTheme(page, theme);
      await expectReadable(heading);
      if (route === '/dashboard') {
        for (const label of ['Em tradução', 'Em revisão', 'Aguardando aprovação']) {
          await expectReadable(page.getByText(label, { exact: true }).first());
        }
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Nova requisição', exact: true }).click();
    await expectReadable(page.getByRole('heading', { name: 'Nova requisição', exact: true }));
    await expectReadable(page.getByRole('textbox', { name: 'Título do projeto', exact: true }));
    await page.getByRole('button', { name: 'Idioma de origem', exact: true }).click();
    await page.getByRole('textbox', { name: 'Buscar em Idioma de origem', exact: true }).fill('pt-BR');
    await expectReadable(page.getByRole('radio', { name: 'Idioma de origem: Português (Brasil)', exact: true }).getByText('Português (Brasil)', { exact: true }));
    await page.getByRole('radio', { name: 'Idioma de origem: Português (Brasil)', exact: true }).click();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();

    await page.goto('/orcamento/teste');
    await expectTheme(page, theme);
    await expectReadable(page.getByRole('heading', { name: 'Confirme sua decisão', exact: true }));
    await page.goto('/recuperar-senha');
    await expectTheme(page, theme);

    if (testInfo.project.name === 'mobile') {
      await page.setViewportSize({ width: 320, height: 740 });
      await page.goto('/dashboard');
      await expectTheme(page, theme);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => sessionStorage.removeItem('echoring.auth-session.v2'));
      for (const route of ['/', '/login', '/recuperar-senha', '/orcamento/teste', '/dashboard']) {
        await page.goto(route);
        await expectTheme(page, theme);
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const bounds = await page.getByTestId('theme-toggle').boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
      }
    }
  });
}

test('tabs synchronize theme while an open form keeps its values and modal updates', async ({ page, context }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Acessar demonstração', exact: true }).click();
  await page.getByRole('button', { name: 'Nova requisição', exact: true }).click();
  const title = page.getByRole('textbox', { name: 'Título do projeto', exact: true });
  await title.fill('Contrato preservado');
  const otherTab = await context.newPage();
  await otherTab.goto('/');
  await otherTab.getByRole('button', { name: 'Ativar modo claro', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(title).toHaveValue('Contrato preservado');
  await expect(title).toHaveCSS('color', 'rgb(32, 41, 54)');
  await expectReadable(title);
  await otherTab.getByRole('button', { name: 'Ativar modo escuro', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(title).toHaveValue('Contrato preservado');
  await otherTab.close();
});

test('invalid or unavailable storage falls back to dark and still allows switching', async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, 'invalid-theme');
  }, storageKey);
  await page.goto('/login');
  await expectTheme(page, 'dark');
  await page.addInitScript(key => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (name) {
      if (name === key) throw new DOMException('Storage unavailable', 'SecurityError');
      return getItem.call(this, name);
    };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Storage unavailable', 'QuotaExceededError');
      return setItem.call(this, name, value);
    };
  }, storageKey);
  await page.reload();
  await expectTheme(page, 'dark');
  await page.getByRole('button', { name: 'Ativar modo claro', exact: true }).click();
  await expectTheme(page, 'light');
});
