import { expect, test } from '@playwright/test';

test('admin can use the disconnected chat across workspace navigation', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Administrador', email: 'admin@example.test', role: 'admin', demo: true,
    }));
  });
  await page.goto('/dashboard');
  const launcher = page.getByRole('button', { name: 'Assistente de IA', exact: true });
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByText('Não conectado', { exact: true })).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Mensagem para o assistente' });
  const send = page.getByRole('button', { name: 'Enviar mensagem' });
  await expect(input).toBeFocused();
  await expect(send).toBeDisabled();
  await input.fill('   ');
  await expect(send).toBeDisabled();
  await page.getByRole('button', { name: 'Como posso organizar as solicitações?' }).click();
  await expect(input).toHaveValue('Como posso organizar as solicitações?');
  await input.fill('Primeira linha');
  await input.press('Shift+Enter');
  await input.pressSequentially('Segunda linha');
  await expect(input).toHaveValue('Primeira linha\nSegunda linha');
  await input.press('Enter');
  await expect(page.getByText('Primeira linha Segunda linha')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('O assistente ainda não está conectado');
  await expect(input).toHaveValue('');
  await page.getByRole('button', { name: 'Minimizar assistente' }).click();
  await expect(launcher).toBeVisible();
  await page.getByRole('button', { name: testInfo.project.name === 'mobile' ? 'Tarefas' : 'Minhas tarefas', exact: true }).first().click();
  await expect(page).toHaveURL(/tarefas/);
  await launcher.click();
  await expect(input).toBeFocused();
  await expect(page.getByText('Primeira linha Segunda linha')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('não foi enviada');
  const chat = page.getByLabel('Mensagens do assistente');
  const bounds = await chat.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  await page.keyboard.press('Escape');
  await expect(launcher).toBeVisible();
  await expect(launcher).toBeFocused();
});

for (const role of ['translator', 'employee', 'hr']) {
  test(`${role} does not see the assistant`, async ({ page }) => {
    await page.addInitScript(userRole => {
      sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
        name: 'Usuário', email: 'user@example.test', role: userRole, demo: true,
      }));
    }, role);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assistente de IA' })).toHaveCount(0);
  });
}
