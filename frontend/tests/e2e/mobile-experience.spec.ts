import { expect, test, type Locator } from '@playwright/test';

async function expectInsideViewport(locator: Locator, width: number) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
}

test('the public header keeps the portal and theme controls reachable on phones and tablets', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 390, 600, 768, 820, 999, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    const header = page.getByTestId('landing-header');
    const portal = header.getByRole('button', { name: /^(Portal|Área da equipe|Entrar no portal)$/ });
    await expect(portal).toBeVisible();
    await expect.poll(async () => {
      const bounds = await portal.boundingBox();
      return bounds ? bounds.x + bounds.width : Infinity;
    }).toBeLessThanOrEqual(width);
    const controls = await header.getByRole('button').all();
    let previousRight = 0;
    for (const control of controls) {
      await expectInsideViewport(control, width);
      const bounds = (await control.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(previousRight);
      previousRight = bounds.x + bounds.width;
    }
  }
  await page.getByTestId('landing-header').getByRole('button', { name: 'Entrar no portal' }).click();
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible();
});

test('quote steps scroll directly to the form and keep the project when going back', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Nome do projeto *', exact: true }).fill('Projeto no celular');
  await page.getByRole('textbox', { name: 'Sobre o projeto *', exact: true }).fill('Tradução de um manual de instalação.');
  const form = page.getByTestId('landing-quote-form');
  async function expectFormAtTop() {
    await expect.poll(async () => Math.abs((await form.boundingBox())?.y ?? Infinity)).toBeLessThan(3);
  }
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'O material faz a diferença.' })).toBeVisible();
  await expectFormAtTop();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Para onde vai a proposta?' })).toBeVisible();
  await expectFormAtTop();
  const consent = page.getByRole('checkbox', { name: 'Autorizar contato para orçamento' });
  const consentBounds = (await consent.boundingBox())!;
  expect(consentBounds.width).toBeGreaterThanOrEqual(44);
  expect(consentBounds.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Editar projeto', exact: true }).click();
  await expectFormAtTop();
  await expect(page.getByRole('textbox', { name: 'Nome do projeto *', exact: true })).toHaveValue('Projeto no celular');
});

test('language selection stays usable when the mobile keyboard reduces the visible viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: Object.assign(new EventTarget(), { height: 740, width: 320, offsetTop: 0, scale: 1 }),
    });
  });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Idioma de origem *', exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const dialog = page.getByTestId('dialog-surface');
  const firstOption = dialog.getByRole('radio').first();
  const optionBounds = (await firstOption.boundingBox())!;
  expect(optionBounds.width).toBeGreaterThan(270);
  await dialog.getByRole('textbox').fill('Inglês');
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 360, offsetTop: 45 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => {
    const bounds = await dialog.boundingBox();
    return bounds ? bounds.y + bounds.height : Infinity;
  }).toBeLessThanOrEqual(405);
  expect((await dialog.boundingBox())!.y).toBeGreaterThanOrEqual(45);
  await dialog.getByRole('radio', { name: 'Idioma de origem: Inglês (EUA)', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toContainText('Inglês (EUA)');
});

test('mobile navigation identifies project details and the compact header has no overlapping controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Ana Martins', email: 'demo@echoring.local', role: 'employee', demo: true,
  })));
  await page.goto('/dashboard');
  const brand = page.getByLabel('Echo Ring, traduções que conectam', { exact: true });
  const theme = page.getByRole('button', { name: 'Ativar modo claro', exact: true });
  await expect(theme).toBeVisible();
  const brandBounds = (await brand.boundingBox())!;
  expect(brandBounds.x + brandBounds.width).toBeLessThan((await theme.boundingBox())!.x);
  for (const control of [theme, page.getByRole('button', { name: 'Notificações', exact: true }), page.getByRole('button', { name: 'Abrir meu perfil', exact: true })]) {
    await expectInsideViewport(control, 320);
    const bounds = (await control.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('textbox', { name: 'Buscar projetos', exact: true }).fill('Manual');
  await expectInsideViewport(page.getByRole('button', { name: 'Limpar busca', exact: true }), 320);
  await page.getByRole('button', { name: 'Limpar busca', exact: true }).click();
  await page.getByTestId('workspace-bottom-nav').getByRole('button', { name: 'Operação', exact: true }).click();
  await page.getByRole('button', { name: /^Abrir OS-/ }).first().click();
  await expect(page).toHaveURL(/\/operacao\//);
  await expect(page.getByTestId('workspace-bottom-nav').getByRole('button', { name: 'Operação', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('a client can read and confirm a quote at 320px in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const decisions: unknown[] = [];
  await page.route('**/quotes/SOL-MOBILE/decision', route => {
    decisions.push(route.request().postDataJSON());
    return route.fulfill({ json: { status: 'Orçamento aprovado' } });
  });
  for (const theme of ['dark', 'light']) {
    await page.goto('/');
    await page.goto('/orcamento/SOL-MOBILE#mobile-token');
    if (theme === 'light') await page.getByRole('button', { name: 'Ativar modo claro' }).click();
    const heading = page.getByRole('heading', { name: 'Confirme sua decisão' });
    await expect(heading).toBeVisible();
    expect((await heading.boundingBox())!.height).toBeLessThanOrEqual(74);
    const confirm = page.getByRole('button', { name: 'Confirmar aprovação', exact: true });
    await expectInsideViewport(confirm, 320);
    await confirm.click();
    await expect(page.getByRole('heading', { name: 'Orçamento aprovado', exact: true })).toBeVisible();
  }
  expect(decisions).toEqual([
    { token: 'mobile-token', decision: 'approve' },
    { token: 'mobile-token', decision: 'approve' },
  ]);
});
