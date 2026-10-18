import { expect, test, type Page } from '@playwright/test';

async function demo(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Ana Martins', email: 'demo@echoring.local', role: 'employee', demo: true,
    }));
  });
  await page.goto('/dashboard');
  await expect(page.getByText('Olá, Ana. Vamos organizar seu dia?')).toBeVisible();
}

test('search shortcut, task search and clearing project filters keep navigation predictable', async ({ page }) => {
  await demo(page);
  await page.keyboard.press('Control+k');
  const search = page.getByRole('textbox', { name: 'Buscar projetos' });
  await expect(search).toBeFocused();
  await search.fill('Vértice');
  await search.press('Enter');
  await expect(page).toHaveURL(/operacao/);
  await page.getByRole('tab', { name: 'Em tradução', exact: true }).click();
  await expect(page.getByText('2 resultados para “Vértice” · Em tradução')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('button', { name: /^Abrir (OS|OR|REQ)-/ })).toHaveCount(6);
  await page.goto('/tarefas');
  await search.fill('contrato');
  await search.press('Enter');
  await expect(page).toHaveURL(/tarefas/);
  await expect(page.getByRole('checkbox', { name: 'Revisar contrato traduzido' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await search.fill('não existe');
  await expect(page.getByText('Nenhuma tarefa encontrada')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca', exact: true }).last().click();
  await expect(page.getByRole('checkbox')).toHaveCount(3);
});

test('account dialog traps keyboard focus, closes with Escape and returns focus to its trigger', async ({ page }) => {
  await demo(page);
  const trigger = page.getByRole('button', { name: 'Abrir meu perfil' });
  await trigger.click();
  const dialog = page.getByTestId('dialog-surface');
  await expect(dialog).toHaveAttribute('role', 'dialog');
  const close = dialog.getByRole('button', { name: 'Fechar', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Sair da conta' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('project loading errors offer a retry that restores the workspace', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
      name: 'Marina Costa', email: 'marina@example.test', role: 'translator', demo: false,
      token: 'test-experience-token', expires: Date.now() / 1000 + 3600,
    }));
  });
  let failed = true;
  await page.route('**/tasks', route => route.fulfill({
    status: failed ? 503 : 200,
    contentType: 'application/json',
    body: JSON.stringify(failed ? { detail: 'Serviço temporariamente indisponível.' } : [{
      id: 'OS-UX-001', title: 'Manual de integração', source: 'Inglês', target: 'Português',
      status: 'Em andamento', deadline: '2026-12-10', clientName: 'Cliente teste',
    }]),
  }));
  await page.goto('/dashboard');
  await expect(page.getByRole('alert')).toContainText('Serviço temporariamente indisponível.');
  failed = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir OS-UX-001: Manual de integração' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('workspace pages keep their layout in both themes and the help center leads to a working area', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await demo(page);
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') await page.getByRole('button', { name: 'Ativar modo claro' }).click();
    for (const route of ['/dashboard', '/operacao', '/tarefas', '/entregas', '/solicitacoes']) {
      await page.goto(route);
      await expect(page.getByRole('heading').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.goto('/dashboard');
  if (testInfo.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Central de ajuda', exact: true }).click();
    await page.getByRole('button', { name: /Organizar minhas tarefas/ }).click();
    await expect(page).toHaveURL(/tarefas/);
  }
  expect(errors).toEqual([]);
});
