import { expect, test, type Page } from '@playwright/test';

import { emptyTranslatorProfile } from '../../src/features/translators/constants';
import { type TranslatorProfile } from '../../src/features/translators/types';

async function mockTranslator(page: Page, options: { failFirstLoad?: boolean; failFirstCompletion?: boolean } = {}) {
  let profile = emptyTranslatorProfile('Marina Costa');
  let completed = false;
  let draftSaves = 0;
  let completeAttempts = 0;
  let loads = 0;
  const account = () => ({ name: profile.fullName || 'Marina Costa', email: 'marina@example.test', role: 'translator', onboardingRequired: !completed });
  await page.route('**/auth/login', async route => {
    await route.fulfill({ json: { ...account(), token: 'invited-translator-token', expires: Date.now() / 1000 + 3600 } });
  });
  await page.route('**/auth/logout', async route => { await route.fulfill({ json: { ok: true } }); });
  await page.route('**/translator-profile/me', async route => {
    expect(route.request().headers().authorization).toBe('Bearer invited-translator-token');
    const method = route.request().method();
    if (method === 'GET') {
      loads++;
      if (options.failFirstLoad && loads === 1) {
        await route.fulfill({ status: 503, json: { detail: 'Não foi possível consultar seu rascunho.' } });
        return;
      }
    }
    if (method === 'PUT') {
      completeAttempts++;
      if (options.failFirstCompletion && completeAttempts === 1) {
        await route.fulfill({ status: 503, json: { detail: 'Não foi possível salvar agora. Tente novamente.' } });
        return;
      }
      profile = route.request().postDataJSON() as TranslatorProfile;
      completed = true;
    }
    if (method === 'PATCH') {
      draftSaves++;
      profile = { ...profile, ...route.request().postDataJSON() };
    }
    await route.fulfill({ json: { profile, account: account(), completedAt: completed ? '2026-10-13T12:00:00Z' : null, updatedAt: '2026-10-13T12:00:00Z' } });
  });
  return { profile: () => profile, completed: () => completed, saves: () => draftSaves, attempts: () => completeAttempts };
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('marina@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('initial-password-long-enough');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/completar-cadastro/);
  await expect(page.getByRole('heading', { name: 'Contato e localização', exact: true })).toBeVisible();
}

async function contact(page: Page) {
  await page.getByRole('textbox', { name: 'Telefone *', exact: true }).fill('+55 11 99999-0000');
  await page.getByRole('textbox', { name: 'País *', exact: true }).fill('Brasil');
  await page.getByRole('textbox', { name: 'Cidade *', exact: true }).fill('São Paulo');
  await page.getByRole('button', { name: 'Salvar e continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Idiomas e pares de tradução', exact: true })).toBeVisible();
}

async function select(page: Page, label: string, value: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('radio', { name: `${label}: ${value}`, exact: true }).click();
}

async function expectFormLayout(page: Page, final = false) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(async () => {
    const [card, action] = await Promise.all([
      page.getByTestId('translator-onboarding-form').boundingBox(),
      page.getByRole('button', { name: final ? 'Concluir cadastro' : 'Salvar e continuar', exact: true }).boundingBox(),
    ]);
    return card && action ? card.y + card.height - action.y - action.height : -1;
  }).toBeGreaterThanOrEqual(0);
}

test('invited translator completes required steps and optional profile, then future logins skip onboarding', async ({ page }, testInfo) => {
  const server = await mockTranslator(page, { failFirstCompletion: true });
  await login(page);
  await page.screenshot({ path: testInfo.outputPath('onboarding-contact.png') });
  await expectFormLayout(page);
  await page.getByRole('button', { name: 'Salvar e continuar', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'telefone válido' })).toBeVisible();
  expect(server.saves()).toBe(0);
  await expect(page.getByRole('textbox', { name: 'E-mail da conta', exact: true })).not.toBeEditable();
  await contact(page);
  for (const [index, language] of ['Português', 'Inglês', 'Latim'].entries()) {
    await page.getByRole('button', { name: 'Adicionar idioma', exact: true }).click();
    await page.getByRole('textbox', { name: `Idioma ${index + 1}`, exact: true }).fill(language);
  }
  await select(page, 'Nível do idioma 3', 'Avançado');
  await page.getByRole('button', { name: 'Adicionar par de tradução', exact: true }).click();
  await select(page, 'Origem do par 1', 'Inglês');
  await select(page, 'Destino do par 1', 'Português');
  await page.getByRole('button', { name: 'Adicionar par de tradução', exact: true }).click();
  await select(page, 'Origem do par 2', 'Latim');
  await select(page, 'Destino do par 2', 'Português');
  await page.screenshot({ path: testInfo.outputPath('onboarding-languages.png') });
  await expectFormLayout(page);
  await page.getByRole('button', { name: 'Salvar e continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar e continuar', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Descreva sua formação' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Formação *', exact: true }).fill('Graduação em Letras, com cursos de tradução e revisão.');
  await page.getByRole('textbox', { name: 'Anos de experiência *', exact: true }).fill('0');
  await page.getByRole('textbox', { name: 'Experiência e trajetória *', exact: true }).fill('Projetos acadêmicos de tradução e revisão de textos técnicos.');
  await page.getByRole('checkbox', { name: 'Técnica', exact: true }).click();
  await page.getByRole('textbox', { name: 'Adicionar em especializações', exact: true }).fill('Filologia');
  await page.getByRole('button', { name: 'Adicionar em especializações', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar e continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu perfil profissional', exact: true })).toBeVisible();
  await expectFormLayout(page, true);
  await page.getByRole('textbox', { name: 'Título profissional (opcional)', exact: true }).fill('Tradutora técnica e literária');
  await page.getByRole('textbox', { name: 'Sobre você (opcional)', exact: true }).fill('Trabalho com linguagem clara e atenção aos detalhes.');
  await page.getByRole('checkbox', { name: 'Revisão', exact: true }).click();
  await page.getByRole('textbox', { name: 'Adicionar em ferramentas', exact: true }).fill('Editor de textos');
  await page.getByRole('button', { name: 'Adicionar em ferramentas', exact: true }).click();
  await page.getByRole('textbox', { name: 'Link do portfólio', exact: true }).fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Adicionar em portfólio', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'link completo' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Link do portfólio', exact: true }).fill('https://example.test/portfolio');
  await page.getByRole('button', { name: 'Adicionar em portfólio', exact: true }).click();
  await page.getByRole('textbox', { name: 'Disponibilidade semanal (opcional)', exact: true }).fill('81');
  await page.getByRole('button', { name: 'Concluir cadastro', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '0 a 80 horas' })).toBeVisible();
  expect(server.attempts()).toBe(0);
  await page.getByRole('textbox', { name: 'Disponibilidade semanal (opcional)', exact: true }).fill('20');
  await page.getByRole('button', { name: 'Concluir cadastro', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível salvar agora' })).toBeVisible();
  expect(server.completed()).toBe(false);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('echoring.auth-session.v2')!).onboardingRequired)).toBe(true);
  await page.getByRole('button', { name: 'Concluir cadastro', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
  expect(server.profile().languages).toHaveLength(3);
  expect(server.profile().translationPairs).toHaveLength(2);
  expect(server.profile().specializations).toEqual(['Técnica', 'Filologia']);
  expect(server.profile().portfolioLinks).toEqual(['https://example.test/portfolio']);
  expect(server.profile().experienceYears).toBe(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir meu perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('marina@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('initial-password-long-enough');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  if (testInfo.project.name === 'mobile') {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('draft survives reload and another login; direct workspace routes require completion', async ({ page }, testInfo) => {
  const server = await mockTranslator(page);
  await login(page);
  await page.getByRole('textbox', { name: 'Telefone *', exact: true }).fill('+55 11 99999-0000');
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByText('Rascunho salvo.', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Telefone *', exact: true })).toHaveValue('+55 11 99999-0000');
  await page.getByTestId('theme-toggle').click();
  await expect(page.getByRole('textbox', { name: 'Telefone *', exact: true })).toHaveValue('+55 11 99999-0000');
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });
  await expectFormLayout(page);
  for (const route of ['/dashboard', '/entregas', '/operacao', '/usuarios']) {
    await page.goto(route);
    await expect(page).toHaveURL(/completar-cadastro/);
    await expect(page.getByRole('textbox', { name: 'Telefone *', exact: true })).toHaveValue('+55 11 99999-0000');
  }
  await page.getByRole('button', { name: 'Salvar e sair', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await login(page);
  await expect(page.getByRole('textbox', { name: 'Telefone *', exact: true })).toHaveValue('+55 11 99999-0000');
  expect(server.completed()).toBe(false);
});

test('failed draft loading allows retry and does not expose an empty replacement form', async ({ page }) => {
  await mockTranslator(page, { failFirstLoad: true });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('marina@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('initial-password-long-enough');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Não foi possível carregar seu cadastro', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nome completo *', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Contato e localização', exact: true })).toBeVisible();
});

test('administrator sees that a newly invited translator still needs to complete registration', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Admin', email: 'admin@example.test', role: 'admin', demo: false,
    token: 'admin-token', expires: Date.now() / 1000 + 3600,
  })));
  const users: object[] = [];
  await page.route('**/users', async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      users.push({ id: 'new-translator', name: body.name, email: body.email, role: body.role, active: true, onboardingRequired: true });
      await route.fulfill({ status: 201, json: users[0] });
    } else await route.fulfill({ json: users });
  });
  await page.goto('/usuarios');
  await page.getByRole('button', { name: 'Adicionar usuário', exact: true }).first().click();
  await page.getByLabel('Nome completo', { exact: true }).fill('Marina Costa');
  await page.getByLabel('E-mail', { exact: true }).fill('marina@example.test');
  await page.getByLabel('Senha inicial', { exact: true }).fill('initial-password-long-enough');
  await page.getByRole('button', { name: 'Criar acesso', exact: true }).click();
  await expect(page.getByText('Cadastro pendente', { exact: true })).toBeVisible();
  await expect(page.getByText('O tradutor concluirá o cadastro no primeiro acesso.', { exact: false })).toBeVisible();
});
