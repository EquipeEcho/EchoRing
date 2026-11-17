import { expect, test, type Page } from '@playwright/test';

const overview = {
  revenue: 1850.5,
  cost: 620,
  balance: 1230.5,
  approvedProjects: 2,
  averageProfit: 615.25,
  projects: [
    { id: 'REQ-2', title: 'Contrato social', client: 'Lumen Ltda', revenue: 1500, cost: 450, profit: 1050 },
    { id: 'REQ-1', title: 'Manual técnico', client: 'Atlas SA', revenue: 350.5, cost: 170, profit: 180.5 },
  ],
  translators: [
    { id: 't-2', name: 'Bruna Alves', total: 450, tasks: 1 },
    { id: 't-1', name: 'Carlos Souza', total: 170, tasks: 2 },
  ],
  topTranslator: { id: 't-2', name: 'Bruna Alves', total: 450, tasks: 1 },
};

async function signIn(page: Page, role: 'admin' | 'employee') {
  await page.addInitScript((sessionRole) => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Equipe', email: 'equipe@example.test', role: sessionRole, demo: false,
      token: 'test-token', expires: Date.now() / 1000 + 3600,
    }));
  }, role);
}

test('administrator sees company balance, profitable projects and translator costs', async ({ page }) => {
  await page.route('**/finance/overview', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview) }));
  await signIn(page, 'admin');
  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible();
  await expect(page.getByText('R$\u00a01.230,50', { exact: true })).toBeVisible();
  await expect(page.getByText('R$\u00a0615,25', { exact: true })).toBeVisible();
  await expect(page.getByText('1º', { exact: true })).toBeVisible();
  await expect(page.getByText('Contrato social', { exact: true })).toBeVisible();
  await expect(page.getByText('Tradutor mais caro', { exact: true })).toBeVisible();
  await expect(page.getByText('2 tarefas', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('finance errors can be retried and employees are redirected', async ({ page }) => {
  let calls = 0;
  await page.route('**/finance/overview', route => {
    calls += 1;
    return calls === 1
      ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Falha temporária.' }) })
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview) });
  });
  await signIn(page, 'admin');
  await page.goto('/financeiro');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Contrato social', { exact: true })).toBeVisible();

  const employee = await page.context().newPage();
  await signIn(employee, 'employee');
  await employee.goto('/financeiro');
  await expect(employee).toHaveURL(/dashboard/);
});
