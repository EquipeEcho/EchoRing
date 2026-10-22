import { test, expect, type Page } from '@playwright/test';

// This suite uses a dedicated API/schema with AUTO_APPROVE_QUOTES=true; no request interception.
const apiURL = process.env.E2E_OFFERS_API_URL;
test.skip(!apiURL, 'Set E2E_OFFERS_API_URL to a dedicated running test API.');

test('employee sends offers; translator declines, receives a resend and accepts into existing tasks', async ({ page, request }, testInfo) => {
  test.setTimeout(180000);
  const adminResponse = await request.post(`${apiURL}/auth/login`, { data: {
    email: process.env.E2E_OFFERS_ADMIN_EMAIL || 'offers-admin@example.test',
    password: process.env.E2E_OFFERS_ADMIN_PASSWORD || 'offers-admin-password-2026',
  } });
  expect(adminResponse.ok()).toBeTruthy();
  const admin = { ...await adminResponse.json(), demo: false };
  const headers = { Authorization: `Bearer ${admin.token}` };
  const unique = `${testInfo.project.name}-${Date.now()}`;
  const translatorName = `Tradutor ${unique}`;
  const email = `offers-${unique}@example.test`;
  const title = `Manual de tradução ${unique}`;
  const translator = await request.post(`${apiURL}/users`, { headers, data: {
    name: translatorName, email, password: 'offers-translator-2026', role: 'translator',
  } });
  expect(translator.status()).toBe(201);
  const login = await request.post(`${apiURL}/auth/login`, { data: { email, password: 'offers-translator-2026' } });
  expect(login.ok(), await login.text()).toBeTruthy();
  const session = { ...await login.json(), demo: false, onboardingRequired: false };
  const translatorHeaders = { Authorization: `Bearer ${session.token}` };
  const profile = await request.put(`${apiURL}/translator-profile/me`, { headers: translatorHeaders, data: {
    fullName: translatorName, phone: '+55 11 99999-0000', country: 'Brasil', city: 'São Paulo', timezone: 'UTC-3',
    professionalTitle: 'Tradutor técnico', languages: [{ name: 'Português', level: 'Nativo' }, { name: 'Inglês', level: 'Fluente' }],
    education: 'Graduação em Letras',
    experienceYears: 2, experienceSummary: 'Tradução de manuais técnicos.', specializations: ['Técnica'], services: ['Tradução'], availabilityHours: 20,
  } });
  expect(profile.ok()).toBeTruthy();
  const deadline = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const intake = await request.post(`${apiURL}/requests`, { data: {
    name: 'Cliente de teste', email: 'client@example.test', title, service: 'Tradução técnica', source: 'Inglês', target: 'Português',
    deadline, message: 'Traduzir o manual preservando a formatação.', consent: true,
    attachments: [{ name: 'manual.txt', size: 6, content: 'bWFudWFs' }],
  } });
  expect(intake.status()).toBe(201);
  const id = (await intake.json()).id;
  expect((await request.patch(`${apiURL}/requests/${id}`, { headers, data: { quote: { amount: '950.00', delivery: deadline, message: '' } } })).ok()).toBeTruthy();
  const approval = await request.post(`${apiURL}/requests/${id}/send-quote`, { headers });
  expect((await approval.json()).status).toBe('Orçamento aprovado');
  async function enter(target: Page, account: unknown, path: string) {
    await target.goto('/login');
    await target.evaluate(value => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify(value)), account);
    await target.goto(path);
  }
  await enter(page, admin, '/solicitacoes');
  await page.getByRole('button', { name: new RegExp(`Abrir solicitação.*${title}`) }).click();
  await page.getByRole('checkbox', { name: `Oferecer para ${translatorName}` }).last().check();
  await expect(page.getByText('Idiomas: Português (Nativo) · Inglês (Fluente)', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Workflow do trabalho', exact: true }).click();
  await page.getByRole('radio', { name: 'Workflow do trabalho: Pós-edição de tradução automática (MTPE)', exact: true }).click();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByLabel('Remuneração do tradutor (R$)', { exact: true }).fill('125,50');
  await page.getByLabel('Volume do trabalho', { exact: true }).fill('20 páginas');
  await page.getByLabel('Requisitos do trabalho', { exact: true }).fill('Preservar o glossário.');
  await page.getByRole('button', { name: 'Revisar ofertas', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar envio das ofertas', exact: true }).click();
  await expect(page.getByText('Ofertas enviadas. Os tradutores foram notificados no portal.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('staff-offers.png') });
  const translatorPage = await page.context().newPage();
  await enter(translatorPage, session, '/oportunidades');
  await expect(translatorPage.getByText(title, { exact: true })).toBeVisible();
  await expect(translatorPage.getByText(/125,50/)).toBeVisible();
  await expect(translatorPage.getByText(/950[,.]00/)).toHaveCount(0);
  await translatorPage.getByRole('button', { name: 'Ver oportunidade', exact: true }).click();
  const download = translatorPage.waitForEvent('download');
  await translatorPage.getByRole('button', { name: 'Baixar', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('manual.txt');
  await translatorPage.getByRole('button', { name: 'Recusar oportunidade', exact: true }).click();
  await translatorPage.getByRole('button', { name: 'Confirmar recusa', exact: true }).click();
  await expect(translatorPage.getByText('Oportunidade recusada. Sua decisão foi registrada.')).toBeVisible();
  await page.getByRole('button', { name: 'Atualizar ofertas', exact: true }).click();
  await page.getByRole('button', { name: `Preparar reenvio para ${translatorName}`, exact: true }).click();
  await page.getByRole('button', { name: 'Revisar ofertas', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar envio das ofertas', exact: true }).click();
  await translatorPage.getByRole('button', { name: 'Voltar às oportunidades', exact: true }).click();
  await translatorPage.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await translatorPage.getByRole('button', { name: 'Ver oportunidade', exact: true }).click();
  await translatorPage.getByRole('button', { name: 'Aceitar oportunidade', exact: true }).click();
  await translatorPage.getByRole('button', { name: 'Confirmar aceite', exact: true }).click();
  await expect(translatorPage.getByText('Oportunidade aceita. O trabalho já está em Minhas tarefas.')).toBeVisible();
  await translatorPage.screenshot({ path: testInfo.outputPath('opportunity-accepted.png') });
  await translatorPage.getByRole('button', { name: 'Ir para minhas tarefas', exact: true }).click();
  await expect(translatorPage.getByText('Remuneração: R$ 125,50', { exact: true })).toBeVisible();
  await expect(translatorPage.getByText(title, { exact: true })).toBeVisible();
  await translatorPage.getByRole('button', { name: 'Iniciar tradução', exact: true }).click();
  await expect(translatorPage.getByText('Tarefa iniciada. Agora você pode enviar a tradução.')).toBeVisible();
  await page.getByRole('button', { name: 'Atualizar ofertas', exact: true }).click();
  await expect(page.getByText(new RegExp(`Responsável: ${translatorName}`))).toBeVisible();
  expect(await translatorPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await translatorPage.goto('/oportunidades');
  await translatorPage.getByRole('tab', { name: 'Aceita', exact: true }).click();
  await expect(translatorPage.getByText(title, { exact: true })).toBeVisible();
  await translatorPage.getByLabel('Buscar oportunidades', { exact: true }).fill('sem-correspondencia');
  await expect(translatorPage.getByText('Nenhuma oportunidade por aqui', { exact: true })).toBeVisible();
  await translatorPage.getByLabel('Buscar oportunidades', { exact: true }).fill('');
  await translatorPage.getByRole('tab', { name: 'Histórico completo', exact: true }).click();
  await expect(translatorPage.getByRole('button', { name: 'Ver oportunidade', exact: true })).toHaveCount(2);
  await translatorPage.screenshot({ path: testInfo.outputPath('opportunities-history.png') });
  const accepted = (await (await request.get(`${apiURL}/opportunities`, { headers: translatorHeaders })).json()).find((offer: { status: string }) => offer.status === 'accepted');
  await page.goto(`/workflows?task=${accepted.serviceId}`);
  const staffDialog = page.getByTestId('record-page');
  await expect(staffDialog.getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '0');
  await staffDialog.getByRole('button', { name: 'Concluir etapa', exact: true }).click();
  await expect(staffDialog.getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '20');
  await expect(staffDialog.getByRole('button', { name: 'Concluir etapa', exact: true })).toHaveCount(0);
  await translatorPage.goto(`/entregas?task=${accepted.serviceId}`);
  const translatorTask = translatorPage.getByTestId(`task-${accepted.serviceId}`);
  await expect(translatorTask.getByTestId('workflow-map-stage-post-editing')).toHaveAttribute('aria-current', 'step');
  const chooser = translatorPage.waitForEvent('filechooser');
  await translatorTask.getByRole('button', { name: 'Selecionar arquivos', exact: true }).click();
  await (await chooser).setFiles('tests/fixtures/sample.txt');
  await translatorTask.getByRole('button', { name: 'Enviar arquivo para avaliação', exact: true }).click();
  await expect(translatorTask.getByTestId('workflow-map-stage-revision')).toHaveAttribute('aria-current', 'step');
  await page.reload();
  await expect(page.getByTestId('record-page').getByRole('progressbar', { name: /^Progresso de/ })).toHaveAttribute('aria-valuenow', '40');
  const persisted = await request.get(`${apiURL}/tasks/${accepted.serviceId}/workflow`, { headers });
  expect((await persisted.json()).templateId).toBe('mtpe');
  await page.screenshot({ path: testInfo.outputPath('workflow-persisted.png') });
  await page.goto(`/entregas?task=${accepted.serviceId}`);
  const staffTask = page.getByTestId(`task-${accepted.serviceId}`);
  await expect(staffTask.getByText(/Ao aprovar esta versão, você confirma:/)).toBeVisible();
  await staffTask.getByRole('button', { name: 'Aprovar tradução', exact: true }).click();
  await expect(staffTask.getByTestId('workflow-map-mtpe').getByText('5/5 etapas', { exact: true })).toBeVisible();
  await translatorPage.reload();
  await expect(translatorPage.getByTestId(`task-${accepted.serviceId}`).getByTestId('workflow-map-mtpe').getByText('5/5 etapas', { exact: true })).toBeVisible();
  const finished = await request.get(`${apiURL}/tasks/${accepted.serviceId}/workflow`, { headers });
  expect((await finished.json()).progress).toBe(100);
  await translatorPage.close();
});
