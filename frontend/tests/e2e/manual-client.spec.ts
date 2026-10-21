import { expect, test } from '@playwright/test';

test('employee can open client registration from the clients section', async ({ page }) => {
  const unexpectedTextWarnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Unexpected text node:')) {
      unexpectedTextWarnings.push(message.text());
    }
  });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Acessar demonstração' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/area/cadastros');

  await page.getByRole('button', { name: 'Clientes' }).click();
  await expect(page).toHaveURL(/clientes\/cadastrar/);
  await expect(page.getByRole('heading', { name: 'Cadastrar cliente' })).toBeVisible();
  expect(unexpectedTextWarnings).toEqual([]);
});

test('employee registers only client details without creating a translation request', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Acessar demonstração' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/area/cadastros');
  await page.getByRole('button', { name: 'Clientes' }).click();

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
  const stored = await page.evaluate(() => ({
    clients: JSON.parse(window.localStorage.getItem('echoring.clients.v1') ?? '[]'),
    requests: JSON.parse(window.localStorage.getItem('echoring.translation-requests.v1') ?? '[]'),
  }));
  expect(stored.clients).toHaveLength(1);
  expect(stored.clients[0]).toMatchObject({
    name: 'Cliente presencial',
    email: 'presencial@example.test',
    company: 'Empresa presencial',
  });
  expect(stored.requests).toEqual([]);
});
