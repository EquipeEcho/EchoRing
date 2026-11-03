import { expect, test, type Page } from '@playwright/test';

import { type TranslationRequest } from '../../src/features/requests/types';

const targets = ['Inglês (EUA)', 'Espanhol (Espanha)', 'Francês (França)'];
const deadline = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const base: TranslationRequest = {
  id: 'SOL-MULTI', title: 'Manual em três idiomas', name: 'Cliente', email: 'client@example.test', company: '',
  source: 'Português (Brasil)', target: targets[0], targets, service: 'Tradução técnica', deadline,
  message: 'Traduzir o mesmo manual para três idiomas.', consent: true, attachments: [],
  status: 'Em análise', createdAt: new Date().toISOString(),
};

async function staff(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Equipe', email: 'staff@example.test', role: 'employee', demo: false,
    token: 'multilingual-test-token', expires: Date.now() / 1000 + 3600,
  })));
  await page.route('**/tasks', route => route.fulfill({ json: [] }));
  await page.route('**/offer-notifications', route => route.fulfill({ json: [] }));
}

test('landing submits multiple destinations with the same originals and preserves choices between steps', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Nome do projeto *', exact: true }).fill('Manual multilíngue');
  await page.getByRole('textbox', { name: 'Sobre o projeto *', exact: true }).fill('Traduzir o manual para inglês e espanhol.');
  await page.getByRole('button', { name: 'Adicionar idioma de destino', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Inverter idiomas', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Selecione idiomas de destino diferentes');
  await page.getByRole('button', { name: 'Idioma de destino 2 *', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar em Idioma de destino 2', exact: true }).fill('es-ES');
  await page.getByRole('radio', { name: `Idioma de destino 2: ${targets[1]}`, exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Anexar documentos', exact: true }).click();
  await (await chooser).setFiles('tests/fixtures/sample.txt');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Idioma de destino 2 *', exact: true })).toContainText(targets[1]);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('textbox', { name: 'Seu nome *', exact: true }).fill('Cliente multilíngue');
  await page.getByRole('textbox', { name: 'E-mail *', exact: true }).fill('client@example.test');
  await page.getByRole('checkbox', { name: 'Autorizar contato para orçamento' }).click();
  await page.getByRole('button', { name: 'Testar solicitação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido salvo na prévia.' })).toBeVisible();
  const requests = await page.evaluate(() => JSON.parse(localStorage.getItem('echoring.translation-requests.v1')!));
  expect(requests[0].targets).toEqual(targets.slice(0, 2));
  expect(requests[0].attachments).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('staff prices every language and the client approves a subset with a recalculated total', async ({ page }) => {
  await staff(page);
  let record = { ...base };
  let decision: Record<string, unknown> | undefined;
  await page.route('**/requests**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/compatible-translators') || path.endsWith('/offers')) return route.fulfill({ json: [] });
    if (route.request().method() === 'PATCH') record = { ...record, ...route.request().postDataJSON() };
    if (path.endsWith('/send-quote')) record = { ...record, status: 'Orçamento enviado' };
    return route.fulfill({ json: path === '/requests' ? [record] : record });
  });
  await page.route('**/quotes/ORC-MULTI/preview', route => route.fulfill({ json: record }));
  await page.route('**/quotes/ORC-MULTI/decision', route => {
    decision = route.request().postDataJSON();
    record = { ...record, status: 'Orçamento aprovado', approvedTargets: [targets[0]], approvedAmount: '100.10' };
    return route.fulfill({ json: { status: record.status, approvedTargets: record.approvedTargets, approvedAmount: record.approvedAmount } });
  });
  await page.goto('/solicitacoes/SOL-MULTI');
  for (const [index, amount] of ['100,10', '200,20', '300,00'].entries()) {
    await page.getByRole('textbox', { name: `Valor para ${targets[index]} (R$)`, exact: true }).fill(amount);
    await page.getByRole('button', { name: `Prazo para ${targets[index]}`, exact: true }).click();
    await page.getByRole('button', { name: 'Selecionar hoje', exact: true }).click();
    await expect(page.getByTestId('dialog-surface')).toHaveCount(0);
  }
  await expect(page.getByRole('textbox', { name: 'Valor do orçamento (R$)', exact: true })).toHaveValue('600,30');
  await page.getByRole('button', { name: 'Revisar e enviar por e-mail', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar envio', exact: true }).click();
  expect(record.quote?.items?.map(item => item.amount)).toEqual(['100.10', '200.20', '300.00']);
  await page.goto('/orcamento/ORC-MULTI#personal-token-longer-than-thirty-two-characters');
  await expect(page.getByText('Total selecionado: R$ 600,30', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: `Aprovar ${targets[1]}`, exact: true }).click();
  await page.getByRole('checkbox', { name: `Aprovar ${targets[2]}`, exact: true }).click();
  await expect(page.getByText('Total selecionado: R$ 100,10', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar aprovação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Orçamento aprovado', exact: true })).toBeVisible();
  expect(decision).toMatchObject({ decision: 'approve', targets: [targets[0]] });
  await page.goto('/solicitacoes/SOL-MULTI');
  await expect(page.getByText('0 de 1 idiomas aprovados entregues', { exact: true })).toBeVisible();
  await expect(page.getByText('Não aprovado pelo cliente', { exact: true })).toHaveCount(2);
});

test('an assigned language does not prevent distributing another approved language', async ({ page }) => {
  await staff(page);
  const task = { id: 'TRD-EN', target: targets[0], status: 'Em andamento', deadline,
    translator: { id: 'translator-en', name: 'Tradutora de inglês', email: 'english@example.test' } };
  const record: TranslationRequest = { ...base, status: 'Em andamento', approvedTargets: targets.slice(0, 2),
    approvedAmount: '300.30', tasks: [task], quote: { amount: '600.30', delivery: deadline, message: '',
      items: targets.map((target, index) => ({ target, amount: ['100.10', '200.20', '300.00'][index], delivery: deadline })) } };
  let sent: Record<string, unknown> | undefined;
  const candidateTargets: string[] = [];
  await page.route('**/requests**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/compatible-translators')) {
      candidateTargets.push(url.searchParams.get('target')!);
      return route.fulfill({ json: [{ id: 'translator-es', name: 'Tradutor de espanhol', email: 'spanish@example.test' }] });
    }
    if (url.pathname.endsWith('/offers')) {
      if (route.request().method() === 'POST') sent = route.request().postDataJSON();
      return route.fulfill({ json: [] });
    }
    return route.fulfill({ json: url.pathname === '/requests' ? [record] : record });
  });
  await page.goto('/solicitacoes/SOL-MULTI');
  await expect(page.getByText('Responsável: Tradutora de inglês', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Idioma do trabalho', exact: true }).click();
  await expect(page.getByRole('radio', { name: `Idioma do trabalho: ${targets[2]}`, exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Buscar em Idioma do trabalho', exact: true }).fill('espanhol');
  await page.getByRole('radio', { name: `Idioma do trabalho: ${targets[1]}`, exact: true }).click();
  await page.getByRole('checkbox', { name: 'Oferecer para Tradutor de espanhol', exact: true }).click();
  await page.getByRole('textbox', { name: 'Remuneração do tradutor (R$)', exact: true }).fill('75,50');
  await page.getByRole('textbox', { name: 'Volume do trabalho', exact: true }).fill('10 páginas');
  await page.getByRole('button', { name: 'Revisar ofertas', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar envio das ofertas', exact: true }).click();
  await expect.poll(() => sent).toMatchObject({ target: targets[1], translatorIds: ['translator-es'], compensation: '75.50' });
  expect(candidateTargets).toContain(targets[1]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
