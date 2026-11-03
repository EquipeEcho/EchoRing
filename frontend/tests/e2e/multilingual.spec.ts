import { expect, test, type Page } from '@playwright/test';

import { type TranslationRequest } from '../../src/features/requests/types';

const targets = ['Inglês (EUA)', 'Espanhol (Espanha)', 'Francês (França)'];
const deadline = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const base: TranslationRequest = {
  id: 'SOL-MULTI', title: 'Manual em três idiomas', name: 'Cliente', email: 'client@example.test', company: '',
  source: 'Português (Brasil)', target: targets[0], targets, service: 'Tradução técnica', deadline,
  message: 'Traduzir o mesmo manual para três idiomas.', consent: true, attachments: [],
  status: 'Em análise', createdAt: new Date().toISOString(),
};

async function staff(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Equipe', email: 'staff@example.test', role: 'employee', demo: false,
    token: 'multilingual-test-token', expires: Date.now() / 1000 + 3600,
  })));
  await page.route('**/tasks', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
}

test('landing submits multiple destinations with the same originals and preserves choices between steps', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Nome do projeto *', exact: true }).fill('Manual multilíngue');
  await page.getByRole('textbox', { name: 'Sobre o projeto *', exact: true }).fill('Traduzir o manual para inglês e espanhol.');
  await page.getByRole('button', { name: 'Adicionar idioma de destino', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Inverter idiomas', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Selecione idiomas de destino diferentes');
  await page.getByRole('button', { name: 'Idioma de destino 2 *', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar em Idioma de destino 2', exact: true }).fill('es-ES');
  await page.getByRole('radio', { name: `Idioma de destino 2: ${targets[1]}`, exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Anexar documentos', exact: true }).click();
  await (await chooser).setFiles('tests/fixtures/sample.txt');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Idioma de destino 2 *', exact: true })).toContainText(targets[1]);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('textbox', { name: 'Seu nome *', exact: true }).fill('Cliente multilíngue');
  await page.getByRole('textbox', { name: 'E-mail *', exact: true }).fill('client@example.test');
  await page.getByRole('checkbox', { name: 'Autorizar contato para orçamento' }).click();
  await page.getByRole('button', { name: 'Testar solicitação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido salvo na prévia.' })).toBeVisible();
  const requests = await page.evaluate(() => JSON.parse(localStorage.getItem('echoring.translation-requests.v1')!));
  expect(requests[0].targets).toEqual(targets.slice(0, 2));
  expect(requests[0].attachments).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
