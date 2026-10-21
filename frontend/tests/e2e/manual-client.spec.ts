import { expect, test, type Page } from '@playwright/test';

async function openCadastrosAsEmployee(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      'echoring.auth-session.v2',
      JSON.stringify({
        name: 'Funcionário de teste',
        email: 'employee@example.test',
        role: 'employee',
        demo: false,
        token: 'e2e-session-token',
        expires: Date.now() / 1000 + 3600,
      }),
    );
  });
  await page.route('**/requests', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/area/cadastros');
}

test('employee can open client registration from the clients section', async ({ page }) => {
  const unexpectedTextWarnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Unexpected text node:')) {
      unexpectedTextWarnings.push(message.text());
    }
  });

  await openCadastrosAsEmployee(page);

  await page.getByRole('button', { name: 'Clientes', exact: true }).click();
  await expect(page).toHaveURL(/clientes\/cadastrar/);
  await expect(page.getByRole('heading', { name: 'Cadastrar cliente' })).toBeVisible();
  expect(unexpectedTextWarnings).toEqual([]);
});

test('employee registers only client details without creating a translation request', async ({ page }) => {
  let submittedClient: Record<string, string> | undefined;
  await page.route('**/clients', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    submittedClient = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'CLI-E2E',
        ...submittedClient,
        createdAt: '2026-10-21T12:00:00+00:00',
      }),
    });
  });
  await openCadastrosAsEmployee(page);
  await page.getByRole('button', { name: 'Clientes', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Cadastrar cliente' })).toBeVisible();
  await expect(page.getByText('Dados do cliente', { exact: true })).toBeVisible();
  await expect(page.getByText('Dados do projeto')).toHaveCount(0);
  await expect(page.getByText('Documentos', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Cadastrar cliente', exact: true }).last().click();
  await expect(page.getByText('Informe o nome do cliente.')).toBeVisible();
  await expect(page.getByText('Informe o e-mail do cliente.')).toBeVisible();

  await page.getByLabel('Nome do cliente *', { exact: true }).fill('Cliente presencial');
  await page.getByLabel('E-mail *', { exact: true }).fill('presencial@example.test');
  await page.getByLabel('Empresa', { exact: true }).fill('Empresa presencial');
  await page.getByRole('button', { name: 'Cadastrar cliente', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Cliente cadastrado com sucesso' })).toBeVisible();
  await expect(page.getByText('Cliente presencial foi salvo com o e-mail presencial@example.test.')).toBeVisible();
  await expect(page.getByText('Empresa: Empresa presencial')).toBeVisible();
  expect(submittedClient).toEqual({
    name: 'Cliente presencial',
    email: 'presencial@example.test',
    company: 'Empresa presencial',
  });
  const browserStorage = await page.evaluate(() => ({
    clients: window.localStorage.getItem('echoring.clients.v1'),
    requests: window.localStorage.getItem('echoring.translation-requests.v1'),
  }));
  expect(browserStorage).toEqual({ clients: null, requests: null });
});

test('demo mode does not claim that a client was saved to MongoDB', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Acessar demonstração' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/clientes/cadastrar');

  await page.getByLabel('Nome do cliente *', { exact: true }).fill('Cliente de demonstração');
  await page.getByLabel('E-mail *', { exact: true }).fill('demo-client@example.test');
  await page.getByRole('button', { name: 'Cadastrar cliente', exact: true }).last().click();

  await expect(
    page.getByText('Para salvar clientes no MongoDB, entre com uma conta da equipe fora da demonstração.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cliente cadastrado com sucesso' })).toHaveCount(0);
});

test('employee sees landing-page projects and their current statuses in the client list', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      'echoring.auth-session.v2',
      JSON.stringify({
        name: 'Funcionário de teste',
        email: 'employee@example.test',
        role: 'employee',
        demo: false,
        token: 'e2e-session-token',
        expires: Date.now() / 1000 + 3600,
      }),
    );
  });
  await page.route('**/clients', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'CLI-E2E',
          name: 'Cliente da landing',
          email: 'landing@example.test',
          company: 'Empresa teste',
          createdAt: '2026-10-21T12:00:00+00:00',
          projects: [
            {
              id: 'SOL-E2E',
              title: 'Tradução do contrato',
              service: 'Tradução técnica',
              status: 'Em andamento',
              requestStatus: 'Orçamento aprovado',
              createdAt: '2026-10-21T12:00:00+00:00',
            },
          ],
        },
      ]),
    });
  });

  await page.goto('/clientes');

  await expect(page.getByText('Cliente da landing')).toBeVisible();
  await expect(page.getByText('Projetos (1)')).toBeVisible();
  await expect(page.getByText('Tradução do contrato')).toBeVisible();
  await expect(page.getByText('Em andamento', { exact: true })).toBeVisible();
});
