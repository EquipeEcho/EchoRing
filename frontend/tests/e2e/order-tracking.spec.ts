import { expect, test, type Page } from '@playwright/test';
import { requestPage } from './support/request-page';

import { type PublicTracking, type TranslationRequest } from '../../src/features/requests/types';

const tracking: PublicTracking = {
  id: 'SOL-ACOMP', title: 'Manual de operação', service: 'Tradução técnica', source: 'Português',
  targets: ['Inglês', 'Espanhol'], status: 'Em andamento', createdAt: '2026-11-01T12:00:00Z',
  emailSentAt: '2026-11-02T12:00:00Z', quoteRespondedAt: '2026-11-03T12:00:00Z', approvedAmount: '1800.00',
  delivery: '2026-11-25',
  languages: [
    { target: 'Inglês', status: 'Entregue', delivery: '2026-11-20', deliveredAt: '2026-11-10T15:00:00Z' },
    { target: 'Espanhol', status: 'Em revisão', delivery: '2026-11-25', deliveredAt: null },
  ],
  history: [
    { status: 'Recebido', createdAt: '2026-11-01T12:00:00Z' },
    { status: 'Orçamento enviado', createdAt: '2026-11-02T12:00:00Z' },
    { status: 'Orçamento aprovado', createdAt: '2026-11-03T12:00:00Z' },
    { status: 'Tradutor atribuído', createdAt: '2026-11-04T12:00:00Z' },
  ],
};

async function mockTracking(page: Page, received: string[]) {
  await page.route('**/tracking/**', async route => {
    const { token } = route.request().postDataJSON() as { token: string };
    received.push(token);
    if (token !== 'token-de-acompanhamento-com-tamanho-suficiente') {
      return route.fulfill({ status: 403, json: { detail: 'Este link de acompanhamento é inválido. Use o link mais recente recebido por e-mail.' } });
    }
    return route.fulfill({ json: tracking });
  });
}

test('the client follows the order through the personal link without signing in', async ({ page }) => {
  const received: string[] = [];
  await mockTracking(page, received);
  await page.goto('/acompanhar/SOL-ACOMP#token-de-acompanhamento-com-tamanho-suficiente');
  await expect(page.getByRole('heading', { name: 'Manual de operação' })).toBeVisible();
  await expect(page.getByText('Entrega em andamento', { exact: true })).toBeVisible();
  await expect(page.getByText('1 de 2 idiomas já foram entregues por e-mail.', { exact: true })).toBeVisible();
  const steps = page.getByRole('list', { name: 'Andamento da solicitação' }).getByRole('listitem');
  await expect(steps.nth(3)).toHaveAccessibleName('Etapa 4 de 5: Em tradução, etapa atual');
  await expect(page.getByText('R$ 1.800,00', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Entregue em 10 de novembro de 2026\. O arquivo foi enviado/)).toBeVisible();
  await expect(page.getByText('Em revisão', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('');
  expect(received).toEqual(['token-de-acompanhamento-com-tamanho-suficiente']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('an invalid or missing link explains how to get access', async ({ page }) => {
  await mockTracking(page, []);
  await page.goto('/acompanhar/SOL-ACOMP#token-antigo-que-ja-foi-substituido-por-outro');
  await expect(page.getByRole('alert')).toHaveText('Este link de acompanhamento é inválido. Use o link mais recente recebido por e-mail.');
  await page.goto('/acompanhar/SOL-ACOMP');
  await expect(page.getByRole('alert')).toHaveText('Este link não contém a autorização necessária. Use o link recebido por e-mail.');
});

test('staff resend the tracking link after confirming', async ({ page }) => {
  const record = {
    id: 'SOL-ACOMP', title: 'Manual de operação', name: 'Ana Souza', email: 'ana@example.test', company: '',
    service: 'Tradução técnica', source: 'Português', target: 'Inglês', deadline: '', message: '', consent: true,
    attachments: [], status: 'Orçamento aprovado', createdAt: '2026-11-01T12:00:00Z', trackingSentAt: '2026-11-03T12:00:00Z',
    quote: { amount: '1800.00', delivery: '2026-11-25', message: '' }, approvedTargets: ['Inglês'], approvedAmount: '1800.00',
  } as TranslationRequest;
  let sent = 0;
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Equipe', email: 'staff@example.test', role: 'employee', demo: false, token: 'tracking-staff-token', expires: Date.now() / 1000 + 3600,
  })));
  await page.route('**/tasks**', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
  await page.route('**/requests**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/requests') return route.fulfill({ json: requestPage([record], url.href) });
    if (url.pathname === '/requests/SOL-ACOMP/send-tracking') {
      sent += 1;
      record.trackingSentAt = new Date().toISOString();
      return route.fulfill({ json: record });
    }
    if (url.pathname === '/requests/SOL-ACOMP') return route.fulfill({ json: record });
    return route.fulfill({ json: [] });
  });
  await page.goto('/solicitacoes/SOL-ACOMP');
  await expect(page.getByText('Acompanhamento do cliente', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reenviar link', exact: true }).click();
  await expect(page.getByText('Enviar um novo link para ana@example.test? O anterior deixará de valer.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar envio', exact: true }).click();
  await expect(page.getByTestId('quote-notice')).toHaveText('Link de acompanhamento enviado. O link anterior deixou de valer.');
  expect(sent).toBe(1);
});
