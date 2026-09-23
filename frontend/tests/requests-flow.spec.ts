import { test, expect } from '@playwright/test';

test('intake with documents persists, reaches staff inbox and quote simulation is honest', async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes(':8000/requests')) requests.push(request.url()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Preencha os campos obrigatórios');
  await page.getByLabel('Nome do projeto *', { exact: true }).fill('Manual enviado pelo site');
  await page.getByLabel('Sobre o projeto *', { exact: true }).fill('Traduzir um manual técnico com 20 páginas.');
  await page.getByRole('button', { name: 'Prazo desejado', exact: true }).click();
  await page.getByRole('button', { name: 'Selecionar hoje', exact: true }).click();
  await page.getByRole('button', { name: 'Idioma de origem *', exact: true }).click();
  await page.getByRole('radio', { name: 'Idioma de origem: Espanhol', exact: true }).click();
  await page.getByRole('button', { name: 'Idioma de destino *', exact: true }).click();
  await page.getByRole('radio', { name: 'Idioma de destino: Francês', exact: true }).click();
  await page.getByRole('button', { name: 'Inverter idiomas', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Idioma de origem *', exact: true })).toContainText('Francês');
  await expect(page.getByRole('button', { name: 'Idioma de destino *', exact: true })).toContainText('Espanhol');
  await page.getByRole('button', { name: 'Inverter idiomas', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'O material faz a diferença.' })).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Anexar documentos', exact: true }).click();
  await (await chooser).setFiles('tests/fixtures/sample.txt');
  await expect(page.getByText('sample.txt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByLabel('Nome do projeto *', { exact: true })).toHaveValue('Manual enviado pelo site');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('sample.txt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Testar solicitação', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Preencha os campos obrigatórios');
  await page.getByLabel('Seu nome *', { exact: true }).fill('Cliente de teste');
  await page.getByLabel('E-mail *', { exact: true }).fill('client@example.test');
  await page.getByRole('checkbox', { name: 'Autorizar contato para orçamento' }).click();
  await page.getByRole('button', { name: 'Testar solicitação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pedido salvo na prévia.' })).toBeVisible();
  expect(requests).toEqual([]);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Acessar demonstração', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole('button', { name: 'Ver solicitações do site', exact: true }).click();
  await page.getByRole('button', { name: /Abrir solicitação.*Manual enviado pelo site/ }).click();
  await expect(page.getByText('client@example.test', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'sample.txt', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('sample.txt');
  await page.getByRole('button', { name: 'Iniciar análise', exact: true }).click();
  await page.getByLabel('Valor do orçamento (R$)', { exact: true }).fill('350,50');
  await page.getByRole('button', { name: 'Prazo de entrega', exact: true }).click();
  await page.getByRole('button', { name: 'Selecionar hoje', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByTestId('quote-notice')).toContainText('Rascunho salvo');
  await page.getByRole('button', { name: 'Fechar solicitação', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /Abrir solicitação.*Manual enviado pelo site/ }).click();
  await expect(page.getByLabel('Valor do orçamento (R$)', { exact: true })).toHaveValue('350,50');
  await page.getByRole('button', { name: 'Revisar envio simulado', exact: true }).click();
  await expect(page.getByText('Prévia local · nenhum e-mail será enviado')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar simulação', exact: true }).click();
  await expect(page.getByTestId('quote-notice')).toContainText('Nenhum e-mail foi enviado');
  await page.getByRole('button', { name: 'Fechar solicitação', exact: true }).click();
  await expect(page.getByText('Orçamento simulado', { exact: true }).last()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Solicita\u00e7\u00e3o', exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('requests-inbox.png') });
});

test('authenticated employee analyzes a request and sends its quote through the API', async ({ page }) => {
  type QuotePayload = { amount: string; delivery: string; message: string };
  const calls: { method: string; path: string; authorization: string | null }[] = [];
  let record: {
    id: string; createdAt: string; status: string; name: string; email: string; company: string;
    title: string; service: string; source: string; target: string; deadline: string;
    message: string; consent: boolean; attachments: { name: string; size: number; content: string }[];
    quote?: QuotePayload; emailSentAt?: string;
  } = {
    id: 'SOL-API-001', createdAt: '2026-09-20T12:00:00Z', status: 'Recebido',
    name: 'Cliente API', email: 'cliente@example.test', company: 'Empresa Teste',
    title: 'Contrato internacional', service: 'Tradução de documentos', source: 'Português', target: 'Inglês',
    deadline: '30 de setembro', message: 'Contrato comercial com 12 páginas.', consent: true,
    attachments: [{ name: 'contrato.txt', size: 18, content: 'Q29udHJhdG8gZGUgdGVzdGU=' }],
  };

  await page.route('**/requests**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    calls.push({ method: request.method(), path: url.pathname, authorization: request.headers().authorization ?? null });
    if (request.method() === 'GET' && url.pathname === '/requests') {
      const summary = { ...record, attachments: record.attachments.map(file => ({ ...file, content: '' })) };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([summary]) });
      return;
    }
    if (request.method() === 'GET' && url.pathname === `/requests/${record.id}`) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) });
      return;
    }
    if (request.method() === 'PATCH' && url.pathname === `/requests/${record.id}`) {
      const changes = request.postDataJSON() as { status?: string; quote?: QuotePayload };
      record = { ...record, ...(changes.status ? { status: changes.status } : {}), ...(changes.quote ? { quote: changes.quote, status: 'Em análise' } : {}) };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) });
      return;
    }
    if (request.method() === 'POST' && url.pathname === `/requests/${record.id}/send-quote`) {
      record = { ...record, status: 'Orçamento enviado', emailSentAt: '2026-09-20T12:30:00Z' };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'Rota não simulada.' }) });
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Funcionária Teste', email: 'staff@example.test', role: 'employee', demo: false,
      token: 'test-employee-token', expires: Date.now() / 1000 + 3600,
    }));
  });

  await page.goto('/solicitacoes');
  await expect(page.getByRole('heading', { name: 'Solicitações', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Abrir solicitação SOL-API-001/ }).click();
  await expect(page.getByText('cliente@example.test', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar análise', exact: true }).click();
  await page.getByLabel('Valor do orçamento (R$)', { exact: true }).fill('480,00');
  await page.getByRole('button', { name: 'Prazo de entrega', exact: true }).click();
  await page.getByRole('button', { name: 'Selecionar hoje', exact: true }).click();
  await page.getByLabel('Mensagem ao cliente', { exact: true }).fill('Tradução e revisão incluídas na proposta.');
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByTestId('quote-notice')).toContainText('Rascunho salvo');
  await page.getByRole('button', { name: 'Revisar e enviar por e-mail', exact: true }).click();
  await expect(page.getByText('Confira antes de enviar')).toBeVisible();
  await expect(page.getByText('R$ 480,00')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar envio', exact: true }).click();
  await expect(page.getByTestId('quote-notice')).toContainText('Orçamento aceito pelo provedor');
  await expect(page.getByText('Orçamento enviado', { exact: true }).first()).toBeVisible();

  expect(calls.every(call => call.authorization === 'Bearer test-employee-token')).toBe(true);
  expect(calls.some(call => call.method === 'PATCH' && call.path === '/requests/SOL-API-001')).toBe(true);
  expect(calls.some(call => call.method === 'POST' && call.path.endsWith('/send-quote'))).toBe(true);
});

test('client confirms a quote decision through the personal link', async ({ page }) => {
  let payload: { token: string; decision: string } | null = null;
  await page.route('**/quotes/ORC-TEST-001/decision', async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      requestId: 'SOL-TEST-001', quoteId: 'ORC-TEST-001', title: 'Manual técnico',
      status: 'Orçamento aprovado', respondedAt: '2026-09-21T12:00:00Z',
    }) });
  });
  const token = 'secure-personal-token-with-more-than-thirty-two-characters';
  await page.goto(`/orcamento/ORC-TEST-001?decision=approve#${token}`);
  await expect(page.getByRole('heading', { name: 'Confirme sua decisão' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar aprovação' }).click();
  await expect(page.getByRole('heading', { name: 'Orçamento aprovado' })).toBeVisible();
  expect(payload).toEqual({ token, decision: 'approve' });
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('');
});
