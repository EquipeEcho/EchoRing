import { expect, test, type Page } from '@playwright/test';

import { emptyTranslatorProfile } from '../../src/features/translators/constants';
import { type TranslatorProfile } from '../../src/features/translators/types';

function completeProfile(): TranslatorProfile {
  return { ...emptyTranslatorProfile('Marina Costa'), phone: '+55 11 99999-0000', whatsapp: true, country: 'Brasil', city: 'São Paulo', timezone: 'UTC-3',
    professionalTitle: 'Tradutora técnica e literária', bio: 'Tradução com atenção à terminologia e ao contexto.\nAtuação em projetos editoriais e materiais técnicos.',
    languages: [{ name: 'Português', level: 'Nativo' }, { name: 'Inglês', level: 'Fluente' }], translationPairs: [{ source: 'Inglês', target: 'Português' }],
    education: 'Graduação em Letras e cursos de tradução.', experienceYears: 4, experienceSummary: 'Tradução e revisão de manuais, artigos e textos institucionais.',
    specializations: ['Técnica', 'Tecnologia'], services: ['Tradução', 'Revisão'], tools: ['Editor de textos', 'Ferramentas CAT'],
    certifications: 'Curso de terminologia e revisão, 2025.', portfolioLinks: ['https://example.test/portfolio'], availabilityHours: 20, availabilityNotes: 'Dias úteis, das 9h às 18h.', otherInformation: 'Experiência com glossários.' };
}

async function mockProfile(page: Page, options: { role?: 'translator' | 'admin' | 'employee'; empty?: boolean; failLoad?: boolean; pending?: boolean } = {}) {
  const role = options.role || 'translator';
  let profile = options.empty ? emptyTranslatorProfile('Marina Costa') : completeProfile();
  let failSave = false;
  let loads = 0;
  let saves = 0;
  await page.addInitScript(({ role, pending }) => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: role === 'translator' ? 'Marina Costa' : 'Equipe EchoRing', email: `${role}@example.test`, role, demo: false,
    onboardingRequired: pending, token: 'profile-test-token', expires: Date.now() / 1000 + 3600,
  })), { role, pending: !!options.pending });
  await page.route('**/tasks', route => route.fulfill({ json: [] }));
  await page.route('**/requests**', route => route.fulfill({ json: [] }));
  await page.route('**/users', route => route.fulfill({ json: [{ id: 'translator-1', name: 'Marina Costa', email: 'translator@example.test', role: 'translator', active: true }] }));
  await page.route('**/translator-profile/*', async route => {
    expect(route.request().headers().authorization).toBe('Bearer profile-test-token');
    const method = route.request().method();
    if (method === 'GET' && options.failLoad && ++loads === 1) { await route.fulfill({ status: 503, json: { detail: 'Perfil temporariamente indisponível.' } }); return; }
    if (method === 'PUT') {
      saves++;
      if (failSave) { await route.fulfill({ status: 503, json: { detail: 'Não foi possível salvar agora.' } }); return; }
      profile = route.request().postDataJSON();
    }
    await route.fulfill({ json: { profile, account: { name: profile.fullName, email: 'translator@example.test', role: 'translator', onboardingRequired: false },
      completedAt: options.empty ? null : '2026-10-13T12:00:00Z', updatedAt: options.empty ? null : '2026-10-13T12:00:00Z',
      activity: { totalProjects: 7, activeProjects: 3, awaitingReview: 1, completedProjects: 3 } } });
  });
  return { profile: () => profile, saves: () => saves, failSave: (value: boolean) => { failSave = value; } };
}

test('translator opens a complete profile from the account menu, with both themes and mobile navigation', async ({ page }, testInfo) => {
  await mockProfile(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Abrir meu perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Ver perfil profissional', exact: true }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading', { name: 'Marina Costa', exact: true })).toBeVisible();
  for (const title of ['Sobre o profissional', 'Idiomas e pares de tradução', 'Especializações e serviços', 'Formação e trajetória', 'Ferramentas e recursos', 'Portfólio e links profissionais', 'Contato', 'Disponibilidade', 'Atividade no EchoRing']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeAttached();
  }
  await expect(page.getByRole('link', { name: 'Abrir portfólio 1: example.test' })).toBeAttached();
  await page.screenshot({ path: testInfo.outputPath('profile-dark.png') });
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: testInfo.outputPath('profile-light.png') });
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Mais', exact: true }).click();
    await page.getByRole('button', { name: 'Meu perfil', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Meu perfil profissional', exact: true })).toBeVisible();
  }
});

test('profile edits validate required fields, preserve failed saves and persist successful changes', async ({ page }) => {
  const server = await mockProfile(page);
  await page.goto('/perfil/editar');
  await page.getByRole('textbox', { name: 'Nome completo *', exact: true }).fill('Marina Costa Silva');
  await page.getByRole('textbox', { name: 'Telefone *', exact: true }).fill('');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'telefone válido' })).toBeVisible();
  expect(server.saves()).toBe(0);
  await page.getByRole('textbox', { name: 'Telefone *', exact: true }).fill('+55 11 99999-0000');
  await expect(page.getByRole('textbox', { name: 'E-mail da conta', exact: true })).not.toBeEditable();
  await page.getByRole('tab', { name: 'Perfil profissional', exact: true }).click();
  await page.getByRole('textbox', { name: 'Sobre você (opcional)', exact: true }).fill('Nova apresentação profissional, com atuação em textos técnicos.');
  server.failSave(true);
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível salvar agora' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Sobre você (opcional)', exact: true })).toHaveValue('Nova apresentação profissional, com atuação em textos técnicos.');
  server.failSave(false);
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page).toHaveURL(/perfil\?atualizado=1/);
  await expect(page.getByRole('heading', { name: 'Marina Costa Silva', exact: true })).toBeVisible();
  await expect(page.getByText('Perfil atualizado com sucesso.', { exact: true })).toBeVisible();
  expect(server.profile().bio).toContain('Nova apresentação');
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('echoring.auth-session.v2')!).name)).toBe('Marina Costa Silva');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Marina Costa Silva', exact: true })).toBeVisible();
});

test('unsaved changes can be kept or discarded without saving the profile', async ({ page }) => {
  const server = await mockProfile(page);
  await page.goto('/perfil/editar');
  await page.getByRole('textbox', { name: 'Cidade *', exact: true }).fill('Curitiba');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Descartar alterações?', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Cidade *', exact: true })).toHaveValue('Curitiba');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar alterações', exact: true }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  expect(server.saves()).toBe(0);
  expect(server.profile().city).toBe('São Paulo');
});

test('load failures offer retry and legacy profiles display missing information clearly', async ({ page }) => {
  await mockProfile(page, { empty: true, failLoad: true });
  await page.goto('/perfil');
  await expect(page.getByText('Não foi possível carregar o perfil', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Marina Costa', exact: true })).toBeVisible();
  await expect(page.getByText('Perfil em construção', { exact: true })).toBeVisible();
  await expect(page.getByText('Nenhum idioma informado.', { exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: 'Editar perfil', exact: true })).toBeVisible();
});

