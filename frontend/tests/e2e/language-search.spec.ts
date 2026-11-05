import { expect, test, type Page } from '@playwright/test';

async function selectLanguage(page: Page, label: string, title: string, query: string, language: string) {
  const trigger = page.getByRole('button', { name: label, exact: true });
  await trigger.click();
  const dialog = page.getByTestId('dialog-surface');
  const search = dialog.getByRole('textbox', { name: `Buscar em ${title}`, exact: true });
  await expect(search).toBeVisible();
  await expect(search).toHaveValue('');
  const initialBounds = (await search.boundingBox())!;
  await dialog.getByRole('radio').last().scrollIntoViewIfNeeded();
  await expect(search).toBeInViewport();
  expect(Math.abs((await search.boundingBox())!.y - initialBounds.y)).toBeLessThan(1);

  await search.fill('Idioma inexistente');
  await expect(dialog.getByRole('radio')).toHaveCount(0);
  await expect(dialog.getByText('Nenhuma opção encontrada. Tente outro nome ou código.', { exact: true })).toBeVisible();
  await search.fill(query);
  const option = dialog.getByRole('radio', { name: `${title}: ${language}`, exact: true });
  await expect(option).toBeVisible();
  await option.click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toContainText(language);

  await trigger.click();
  await expect(search).toHaveValue('');
  await search.fill(query);
  await expect(dialog.getByRole('radio', { name: `${title}: ${language}`, exact: true })).toHaveAttribute('aria-checked', 'true');
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
}

test('public language fields keep search visible while scrolling and accept names and regional codes', async ({ page }) => {
  await page.goto('/');
  await selectLanguage(page, 'Idioma de origem *', 'Idioma de origem', 'ingles', 'Inglês (EUA)');
  await selectLanguage(page, 'Idioma de destino *', 'Idioma de destino', 'pt-BR', 'Português (Brasil)');
});

test('internal language fields keep search visible and accept aliases', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('echoring.auth-session.v2', JSON.stringify({
    name: 'Ana Martins', email: 'demo@echoring.local', role: 'employee', demo: true,
  })));
  await page.goto('/operacao/nova');
  await selectLanguage(page, 'Idioma de origem', 'Idioma de origem', 'english', 'Inglês (EUA)');
  await selectLanguage(page, 'Idioma de destino', 'Idioma de destino', 'bzs', 'LIBRAS');
});
