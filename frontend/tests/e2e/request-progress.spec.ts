import { expect, test, type Page } from '@playwright/test';
import { requestPage } from './support/request-page';

import { type TranslationRequest } from '../../src/features/requests/types';

const event = (status: string, day: number) =>
  ({ status, note: '', actorName: 'Equipe', createdAt: `2026-11-0${day}T14:00:00Z` });

const inTranslation: TranslationRequest = {
  id: 'SOL-PROG', title: 'Manual em tradução', name: 'Ana Souza', email: 'ana@example.test', company: '',
  source: 'Inglês', target: 'Português', service: 'Tradução técnica', deadline: '', message: 'Projeto de teste.',
  consent: true, attachments: [{ name: 'manual-original.txt', size: 4, content: '' }],
  status: 'Em andamento', createdAt: '2026-11-01T12:00:00Z', approvedTargets: ['Português'], approvedAmount: '1250.00',
  quote: { amount: '1250.00', delivery: '2026-11-20', message: 'Inclui revisão.' },
  history: [event('Recebido', 1), event('Orçamento enviado', 2), event('Orçamento aprovado', 3), event('Tradutor atribuído', 4)],
  tasks: [{ id: 'SRV-PROG', status: 'Em andamento', deadline: '2026-11-18', target: 'Português',
    translator: { id: 'USR-1', name: 'Marina Costa', email: 'marina@example.test' } }],
};

async function staffWith(page: Page, record: TranslationRequest) {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Equipe', email: 'staff@example.test', role: 'employee', demo: false,
    token: 'progress-test-token', expires: Date.now() / 1000 + 3600,
  })));
  await page.route('**/tasks**', route => route.fulfill({ json: [] }));
  await page.route('**/deliveries**', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
  await page.route('**/requests**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/requests') return route.fulfill({ json: requestPage([record], url.href) });
    if (url.pathname === `/requests/${record.id}`) return route.fulfill({ json: record });
    return route.fulfill({ json: [] });
  });
}

test('request details track the workflow steps, summarize the quote and link the delivery', async ({ page }) => {
  await staffWith(page, inTranslation);
  await page.goto('/solicitacoes/SOL-PROG');
  const steps = page.getByRole('list', { name: 'Andamento da solicitação' }).getByRole('listitem');
  await expect(steps).toHaveCount(5);
  await expect(steps.nth(0)).toHaveAccessibleName(/^Etapa 1 de 5: Solicitado, concluída em/);
  await expect(steps.nth(2)).toHaveAccessibleName(/^Etapa 3 de 5: Aprovado, concluída em/);
  await expect(steps.nth(3)).toHaveAccessibleName('Etapa 4 de 5: Em tradução, etapa atual');
  await expect(steps.nth(3)).toHaveAttribute('aria-current', 'step');
  await expect(steps.nth(4)).toHaveAccessibleName('Etapa 5 de 5: Entregue, pendente');
  await expect(page.getByText('R$ 1.250,00', { exact: true })).toBeVisible();
  await expect(page.getByText('20 de novembro de 2026', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Marina Costa', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'manual-original.txt', exact: true })).toBeVisible();
  await expect(page.getByText('O tradutor ainda não enviou a versão final.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir entrega', exact: true }).click();
  await expect(page).toHaveURL(/\/entregas\?task=SRV-PROG$/);
});

test('a refused quote shows the stopped step without a translator', async ({ page }) => {
  await staffWith(page, {
    ...inTranslation, id: 'SOL-RECUSA', status: 'Orçamento recusado', approvedTargets: undefined, approvedAmount: undefined,
    tasks: [], history: [event('Recebido', 1), event('Orçamento enviado', 2), event('Orçamento recusado', 4)],
  });
  await page.goto('/solicitacoes/SOL-RECUSA');
  const steps = page.getByRole('list', { name: 'Andamento da solicitação' }).getByRole('listitem');
  await expect(steps.nth(2)).toHaveAccessibleName(/^Etapa 3 de 5: Aprovado, recusada em/);
  await expect(steps.nth(3)).toHaveAccessibleName('Etapa 4 de 5: Em tradução, pendente');
  await expect(page.getByText('Não se aplica', { exact: true })).toBeVisible();
  await expect(page.getByText('TRADUÇÃO FINAL', { exact: true })).toHaveCount(0);
});
