import { expect, test, type Page } from '@playwright/test';

import { type Offer } from '../../src/features/offers/types';

async function account(page: Page, role: 'translator' | 'employee') {
  await page.addInitScript(role => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    role, name: 'Conta de teste', email: `${role}@example.test`, demo: false,
    token: 'record-test-token', expires: Date.now() / 1000 + 3600,
  })), role);
  await page.route('**/tasks', route => route.fulfill({ json: [] }));
  await page.route('**/requests', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
}

test('a legacy request without contact or attachments opens, reloads and starts analysis without crashing', async ({ page }) => {
  await account(page, 'employee');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let status = 'Recebido';
  await page.route('**/requests/SOL-OLD', route => {
    if (route.request().method() === 'PATCH') status = 'Em análise';
    return route.fulfill({ json: { id: 'SOL-OLD', title: 'Pedido antigo', status, attachments: null } });
  });
  await page.goto('/solicitacoes/SOL-OLD');
  await expect(page.getByTestId('record-page')).toContainText('Cliente não informado');
  await expect(page.getByTestId('record-page')).toContainText('0 arquivos recebidos');
  await page.reload();
  await page.getByRole('button', { name: 'Iniciar análise', exact: true }).click();
  await expect(page.getByTestId('record-page')).toContainText('Em análise');
  await expect(page.getByTestId('record-page')).toContainText('0 arquivos recebidos');
  expect(errors).toEqual([]);
});

test('opportunity opens on its own page, survives reload and confirms a decision before returning to the filtered list', async ({ page }, info) => {
  await account(page, 'translator');
  let offer: Offer = {
    id: 'OFFER-PAGE', requestId: 'SOL-PAGE', title: 'Guia para tradução', source: 'Inglês', target: 'Português',
    service: 'Tradução técnica', compensation: '350.50', currency: 'BRL', deadline: '2099-10-30',
    expiresAt: '2099-10-25T12:00:00Z', createdAt: '2026-10-20T12:00:00Z', decidedAt: null,
    description: 'Traduzir o guia mantendo a terminologia.', requirements: 'Usar o glossário.', volume: '2.000 palavras',
    status: 'pending', serviceId: null, attachments: [], history: [],
  };
  let decisions = 0;
  await page.route('**/opportunities', route => route.fulfill({ json: [offer] }));
  await page.route('**/opportunities/OFFER-PAGE', route => {
    expect(route.request().headers().authorization).toBe('Bearer record-test-token');
    return route.fulfill({ json: offer });
  });
  await page.route('**/opportunities/OFFER-PAGE/decline', route => {
    decisions++;
    offer = { ...offer, status: 'declined', decidedAt: new Date().toISOString() };
    return route.fulfill({ json: offer });
  });
  await page.goto('/oportunidades');
  await page.getByRole('textbox', { name: 'Buscar oportunidades', exact: true }).fill('Guia');
  await page.getByRole('button', { name: 'Ver oportunidade', exact: true }).click();
  await expect(page).toHaveURL(/\/oportunidades\/OFFER-PAGE/);
  await expect(page.getByTestId('record-page')).toContainText('Usar o glossário.');
  await expect(page.getByTestId('dialog-surface')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('record-page')).toContainText('Guia para tradução');
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Buscar oportunidades', exact: true })).toHaveValue('Guia');
  await page.goForward();
  await expect(page.getByTestId('record-page')).toContainText('Guia para tradução');
  await page.screenshot({ path: info.outputPath('opportunity-detail-page.png') });
  await page.getByRole('button', { name: 'Recusar oportunidade', exact: true }).click();
  expect(decisions).toBe(0);
  await page.getByRole('button', { name: 'Confirmar recusa', exact: true }).click();
  await expect(page.getByText('Oportunidade recusada. Sua decisão foi registrada.', { exact: true })).toBeVisible();
  expect(decisions).toBe(1);
  await page.getByRole('button', { name: 'Voltar às oportunidades', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Buscar oportunidades', exact: true })).toHaveValue('Guia');
  await expect(page.getByRole('tab', { name: 'Pendente', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Histórico completo', exact: true }).click();
  await expect(page.getByText('Guia para tradução', { exact: true })).toBeVisible();
});

test('an unavailable request deep link shows a retryable error and recovers without opening a modal', async ({ page }) => {
  await account(page, 'employee');
  let missing = true;
  await page.route('**/requests/SOL-DIRECT', route => route.fulfill({
    status: missing ? 404 : 200,
    json: missing ? { detail: 'Solicitação não encontrada.' } : {
      id: 'SOL-DIRECT', title: 'Pedido recuperado', name: 'Cliente de teste', email: 'client@example.test', company: '',
      status: 'Recebido', service: 'Tradução', source: 'Inglês', target: 'Português', deadline: '',
      message: 'Traduzir o documento.', attachments: [], history: [], createdAt: '2026-10-20T12:00:00Z', consent: true,
    },
  }));
  await page.goto('/solicitacoes/SOL-DIRECT');
  await expect(page.getByTestId('record-page')).toContainText('Solicitação não encontrada.');
  await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toHaveCount(0);
  missing = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByTestId('record-page')).toContainText('Pedido recuperado');
  await expect(page.getByRole('button', { name: 'Iniciar análise', exact: true })).toBeVisible();
  await expect(page.getByTestId('dialog-surface')).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar às solicitações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Solicitações', exact: true })).toBeVisible();
});
