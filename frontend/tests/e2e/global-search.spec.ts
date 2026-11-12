import { expect, test, type Page } from '@playwright/test';
import { requestPage } from './support/request-page';

import { type TranslationRequest } from '../../src/features/requests/types';

const request: TranslationRequest = {
  id: 'SOL-MANUAL', title: 'Manual do equipamento', name: 'Bruno Lima', email: 'bruno@example.test', company: '',
  service: 'Tradução técnica', source: 'Inglês', target: 'Português', deadline: '', message: '', consent: true,
  attachments: [], status: 'Recebido', createdAt: new Date().toISOString(),
};

async function staff(page: Page, searches: string[]) {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Equipe', email: 'staff@example.test', role: 'employee', demo: false, token: 'search-token', expires: Date.now() / 1000 + 3600,
  })));
  await page.route('**/tasks**', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
  await page.route('**/requests**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === `/requests/${request.id}`) return route.fulfill({ json: request });
    if (url.searchParams.get('search')) searches.push(url.searchParams.get('search')!);
    return route.fulfill({ json: requestPage([request], url.href) });
  });
}

async function openSearch(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole('button', { name: 'Buscar no portal', exact: true }).click();
  return page.getByRole('textbox', { name: 'Buscar no portal' });
}

test('the header search finds requests by protocol and opens them', async ({ page }, testInfo) => {
  const searches: string[] = [];
  await staff(page, searches);
  await page.goto('/dashboard');
  const field = await openSearch(page, testInfo.project.name === 'mobile');
  await field.fill('sol-manual');
  const requests = page.getByRole('list', { name: 'Solicitações' });
  await expect(requests.getByRole('button', { name: 'Manual do equipamento. SOL-MANUAL · Bruno Lima', exact: true })).toBeVisible();
  expect(searches).toContain('sol-manual');
  await requests.getByRole('button', { name: /^Manual do equipamento\./ }).click();
  await expect(page).toHaveURL(/\/solicitacoes\/SOL-MANUAL$/);
  await expect(page.getByLabel('Resultados da busca por sol-manual')).toHaveCount(0);
});

test('results are grouped, can be dismissed and say when nothing matches', async ({ page }, testInfo) => {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Ana Martins', email: 'demo@echoring.local', role: 'employee', demo: true,
  })));
  await page.goto('/dashboard');
  const field = await openSearch(page, testInfo.project.name === 'mobile');
  await field.fill('manual');
  const results = page.getByLabel('Resultados da busca por manual');
  await expect(results.getByRole('list', { name: 'Projetos' })).toBeVisible();
  await field.press('Escape');
  await expect(results).toHaveCount(0);
  await field.fill('xyz-sem-resultado');
  await expect(page.getByText('Nada encontrado para “xyz-sem-resultado”.', { exact: true })).toBeVisible();
  await field.fill('manual');
  await page.getByLabel('Resultados da busca por manual').getByRole('list', { name: 'Projetos' }).getByRole('button').first().click();
  await expect(page).toHaveURL(/\/operacao\/|\/entregas/);
});
