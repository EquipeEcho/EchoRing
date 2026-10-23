import { expect, test } from '@playwright/test';

test('employee sees translator languages and broadcasts an offer with a workflow and canonical money', async ({ page }) => {
  const deadline = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const request = { id: 'SOL-BROADCAST', title: 'Manual para todos', name: 'Cliente de teste', email: 'client@example.test', company: '', service: 'Tradução técnica', source: 'Inglês', target: 'Português', deadline,
    createdAt: new Date().toISOString(), status: 'Orçamento aprovado', message: 'Traduzir o manual técnico.', consent: true, attachments: [], quote: { amount: '2500.00', delivery: deadline, message: '' } };
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({ name: 'Equipe', email: 'employee@example.test', role: 'employee', demo: false, token: 'staff-test-token', expires: Date.now() / 1000 + 3600 })));
  await page.route('**/tasks', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
  await page.route('**/requests', route => route.fulfill({ json: [request] }));
  await page.route('**/requests/SOL-BROADCAST', route => route.fulfill({ json: request }));
  await page.route('**/requests/SOL-BROADCAST/compatible-translators', route => route.fulfill({ json: [{ id: 'translator-1', name: 'Marina Costa', email: 'translator@example.test',
    languages: [{ name: 'Português', level: 'Nativo' }, { name: 'Inglês', level: 'Fluente' }] }] }));
  let sent: Record<string, unknown> | undefined;
  await page.route('**/requests/SOL-BROADCAST/offers', async route => {
    if (route.request().method() === 'POST') sent = route.request().postDataJSON();
    await route.fulfill({ status: route.request().method() === 'POST' ? 201 : 200, json: [] });
  });
  await page.goto('/solicitacoes');
  await page.getByRole('button', { name: /Abrir solicitação.*Manual para todos/ }).click();
  await expect(page.getByText('Idiomas: Português (Nativo) · Inglês (Fluente)', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Pares:/)).toHaveCount(0);
  const dialogs = await page.getByTestId('dialog-surface').count();
  await page.getByRole('button', { name: 'Visibilidade da oportunidade', exact: true }).click();
  await page.getByRole('radio', { name: 'Visibilidade da oportunidade: Todos os tradutores', exact: true }).click();
  await expect(page.getByTestId('dialog-surface')).toHaveCount(dialogs);
  await expect(page.getByRole('checkbox', { name: 'Oferecer para Marina Costa' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Workflow do trabalho', exact: true }).click();
  await page.getByRole('radio', { name: 'Workflow do trabalho: Legendagem', exact: true }).click();
  await expect(page.getByTestId('dialog-surface')).toHaveCount(dialogs);
  await page.getByRole('textbox', { name: 'Remuneração do tradutor (R$)', exact: true }).fill('1234,56');
  await expect(page.getByRole('textbox', { name: 'Remuneração do tradutor (R$)', exact: true })).toHaveValue('1.234,56');
  const family = await page.getByRole('textbox', { name: 'Remuneração do tradutor (R$)', exact: true }).evaluate(element => getComputedStyle(element).fontFamily);
  expect(family).toMatch(/Inter/);
  await page.getByRole('textbox', { name: 'Volume do trabalho', exact: true }).fill('20 páginas');
  await page.getByRole('button', { name: 'Revisar ofertas', exact: true }).click();
  await expect(page.getByText('Todos os tradutores ativos · R$ 1.234,56 por trabalho', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar envio das ofertas', exact: true }).click();
  await expect.poll(() => sent).toMatchObject({ audience: 'all', translatorIds: [], workflowTemplateId: 'subtitling', compensation: '1234.56', volume: '20 páginas' });
});
