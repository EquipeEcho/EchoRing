import { expect, test, type Page } from '@playwright/test';
import { requestPage } from './support/request-page';

import { type TranslationRequest } from '../../src/features/requests/types';

const day = 86400000;
const iso = (days: number) => new Date(Date.now() + days * day).toISOString();
const base = {
  email: 'cliente@example.test', company: '', source: 'Inglês', target: 'Português', service: 'Tradução técnica',
  deadline: '', message: 'Projeto de teste.', consent: true, attachments: [],
};
const unanswered: TranslationRequest = {
  ...base, id: 'SOL-SEMRESP', title: 'Orçamento sem resposta', name: 'Bruno Lima', status: 'Orçamento enviado',
  createdAt: iso(-8), emailSentAt: iso(-5), quoteExpiresAt: iso(2),
  quote: { id: 'ORC-1', amount: '900.00', delivery: '2026-12-20', message: 'Inclui revisão.' },
  history: [{ status: 'Orçamento enviado', note: '', actorName: 'Equipe', createdAt: iso(-5) }],
};
const onTime: TranslationRequest = { ...base, id: 'SOL-OK', title: 'Pedido em dia', name: 'Diego Reis', status: 'Recebido', createdAt: iso(0) };

async function staffWith(page: Page, records: TranslationRequest[], resent: string[]) {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Equipe', email: 'staff@example.test', role: 'employee', demo: false,
    token: 'alerts-test-token', expires: Date.now() / 1000 + 3600,
  })));
  await page.route('**/tasks**', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
  await page.route('**/requests**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/requests') return route.fulfill({ json: requestPage(records, url.href) });
    const record = records.find(item => url.pathname.startsWith(`/requests/${item.id}`));
    if (record && url.pathname.endsWith('/resend-quote') && route.request().method() === 'POST') {
      resent.push(record.id);
      Object.assign(record, { emailSentAt: new Date().toISOString(), quoteResentAt: new Date().toISOString(), quoteExpiresAt: iso(30) });
      record.history = [...record.history ?? [], { status: 'Orçamento reenviado', note: 'Novo link enviado ao cliente; o anterior deixou de valer.', actorName: 'Equipe', createdAt: new Date().toISOString() }];
      return route.fulfill({ json: record });
    }
    return route.fulfill({ json: record ?? [] });
  });
}

test('the attention filter lists only requests with alerts and explains each one', async ({ page }) => {
  await staffWith(page, [unanswered, onTime], []);
  await page.goto('/solicitacoes');
  await expect(page.getByRole('button', { name: 'Status das solicitações: Todos (2)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Status das solicitações: Todos (2)', exact: true }).click();
  await page.getByRole('radio', { name: 'Status das solicitações: Precisa de atenção (1)', exact: true }).click();
  await expect(page).toHaveURL(/status=atencao/);
  await expect(page.getByText('1 resultado', { exact: true })).toBeVisible();
  await expect(page.getByText('Pedido em dia', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Precisa de atenção: Sem resposta há 5 dias; Link expira em 2 dias', { exact: true })).toBeVisible();
});

test('an unanswered quote is resent with a new link after confirmation', async ({ page }) => {
  const resent: string[] = [];
  await staffWith(page, [{ ...unanswered, history: [...unanswered.history!] }], resent);
  await page.goto('/solicitacoes/SOL-SEMRESP');
  await expect(page.getByText('Aguardando a resposta do cliente', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reenviar orçamento', exact: true }).click();
  await expect(page.getByText('Enviar novamente para cliente@example.test?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(resent).toEqual([]);
  await page.getByRole('button', { name: 'Reenviar orçamento', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar reenvio', exact: true }).click();
  await expect(page.getByTestId('quote-notice')).toHaveText('Orçamento reenviado com um novo link. O link anterior deixou de valer.');
  expect(resent).toEqual(['SOL-SEMRESP']);
  await expect(page.getByText(/^Reenviado em /)).toBeVisible();
  await expect(page.getByText('Orçamento reenviado', { exact: true })).toBeVisible();
  await expect(page.getByText('Sem resposta há 5 dias', { exact: true })).toHaveCount(0);
});
