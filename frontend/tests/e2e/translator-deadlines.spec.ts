import { expect, test, type Page } from '@playwright/test';

const hour = 3600000;
const spDay = (offset: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(Date.now() + offset * 86400000);
const service = (id: string, title: string, status: string, deadline?: string) => ({
  id, requestId: 'SOL-' + id, title, status, deadline, createdAt: '2026-11-01T12:00:00Z', updatedAt: '2026-11-01T12:00:00Z',
  lastVersion: 0, observations: '', source: 'Inglês', target: 'Português', attachments: [], history: [],
});

async function translator(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Marina Costa', email: 'marina@example.test', role: 'translator', demo: false, token: 'deadline-token', expires: Date.now() / 1000 + 3600,
  })));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
  await page.route('**/tasks**', route => route.fulfill({ json: [
    service('OS-SEM-DATA', 'Glossário sem prazo', 'Em andamento'),
    service('OS-DEPOIS', 'Contrato do mês que vem', 'Em andamento', spDay(30)),
    service('OS-ATRASO', 'Manual atrasado', 'Revisão solicitada', spDay(-2)),
    service('OS-AMANHA', 'Catálogo para amanhã', 'Tradutor atribuído', spDay(1)),
    service('OS-ENVIADA', 'Relatório já enviado', 'Aguardando avaliação', spDay(-5)),
  ] }));
}

test('translators see the most urgent tasks first with their deadline warnings', async ({ page }) => {
  await translator(page);
  await page.goto('/entregas');
  await expect(page.getByRole('alert').filter({ hasText: 'tarefas precisam de prioridade' }))
    .toHaveText('2 tarefas precisam de prioridade: há prazo vencido. A lista começa pelas mais urgentes.');
  const titles = page.locator('[data-testid^="task-OS-"]');
  await expect(titles).toHaveCount(5);
  expect(await titles.evaluateAll(cards => cards.map(card => card.getAttribute('data-testid'))))
    .toEqual(['task-OS-ATRASO', 'task-OS-AMANHA', 'task-OS-DEPOIS', 'task-OS-SEM-DATA', 'task-OS-ENVIADA']);
  await expect(page.getByTestId('task-OS-ATRASO').getByText('Atrasado há 2 dias', { exact: true })).toBeVisible();
  await expect(page.getByTestId('task-OS-AMANHA').getByText('Prazo vence amanhã', { exact: true })).toBeVisible();
  await expect(page.getByTestId('task-OS-ENVIADA').getByText(/^Atrasado/)).toHaveCount(0);
});

test('pending offers that close soon come first and show how long is left', async ({ page }) => {
  const offer = (id: string, title: string, expiresIn: number, deadline: string) => ({
    id, requestId: 'SOL-' + id, title, source: 'Inglês', target: 'Português', service: 'Tradução técnica', compensation: '300.00',
    currency: 'BRL', deadline, expiresAt: new Date(Date.now() + expiresIn * hour).toISOString(), description: 'Escopo.',
    requirements: '', volume: '10 páginas', status: 'pending', createdAt: '2026-11-01T12:00:00Z', decidedAt: null,
    serviceId: null, attachments: [], history: [],
  });
  await translator(page);
  await page.route('**/opportunities**', route => route.fulfill({ json: [
    offer('OF-CALMA', 'Oferta sem pressa', 72, spDay(20)),
    offer('OF-URGENTE', 'Oferta que fecha logo', 2.5, spDay(1)),
  ] }));
  await page.goto('/oportunidades');
  const headings = page.getByRole('heading', { name: /^Oferta/ });
  await expect(headings).toHaveText(['Oferta que fecha logo', 'Oferta sem pressa']);
  await expect(page.getByText('Responda em até 3 h', { exact: true })).toBeVisible();
  await expect(page.getByText('Prazo vence amanhã', { exact: true })).toBeVisible();
});
