import { expect, test, type Page } from '@playwright/test';
import { requestPage } from './support/request-page';

import { type TranslationRequest } from '../../src/features/requests/types';

const day = 86400000;
const stalled: TranslationRequest = {
  id: 'SOL-PARADA', title: 'Pedido sem análise', name: 'Ana Souza', email: 'ana@example.test', company: '',
  service: 'Tradução técnica', source: 'Inglês', target: 'Português', deadline: '', message: '', consent: true,
  attachments: [], status: 'Recebido', createdAt: new Date(Date.now() - 4 * day).toISOString(),
};

async function staffWithNotifications(page: Page, read: number[]) {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Equipe', email: 'staff@example.test', role: 'employee', demo: false, token: 'notifications-token', expires: Date.now() / 1000 + 3600,
  })));
  await page.route('**/tasks**', route => route.fulfill({ json: [] }));
  await page.route('**/requests**', route => route.fulfill({ json: requestPage([stalled], route.request().url()) }));
  await page.route('**/offer-notifications**', route => {
    const url = new URL(route.request().url());
    const match = /\/offer-notifications\/(\d+)\/read$/.exec(url.pathname);
    if (match) {
      read.push(Number(match[1]));
      return route.fulfill({ json: {} });
    }
    return route.fulfill({ json: [{ id: 9, message: 'Marina aceitou a oferta de SOL-PARADA', href: '/solicitacoes/SOL-PARADA', createdAt: new Date().toISOString(), readAt: null }] });
  });
}

test('each notification opens the screen that resolves it', async ({ page }) => {
  const read: number[] = [];
  await staffWithNotifications(page, read);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Notificações', exact: true }).click();
  const list = page.getByRole('list', { name: 'Notificações' });
  await expect(list.getByRole('button')).toHaveCount(3);
  await list.getByRole('button', { name: /^1 solicitação precisa de atenção\./ }).click();
  await expect(page).toHaveURL(/\/solicitacoes\?status=atencao$/);
  await expect(page.getByRole('button', { name: 'Status das solicitações: Precisa de atenção (1)', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Notificações', exact: true }).click();
  await page.getByRole('list', { name: 'Notificações' }).getByRole('button', { name: /^Marina aceitou a oferta/ }).click();
  await expect(page).toHaveURL(/\/solicitacoes\/SOL-PARADA$/);
  expect(read).toEqual([9]);
});
