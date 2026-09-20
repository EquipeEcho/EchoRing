import { test, expect } from '@playwright/test';

test('landing is public, responsive and respects reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Sua mensagem/ })).toBeVisible();
  await expect(page.getByTestId('language-globe')).toHaveCSS('animation-name', 'none');

  for (const width of testInfo.project.name === 'mobile' ? [320, 390] : [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const submit = page.getByRole('button', { name: 'Continuar', exact: true });
    const buttonBounds = await submit.boundingBox();
    const formBounds = await page.getByTestId('landing-quote-form').boundingBox();
    const faqBounds = await page.getByTestId('landing-faq').boundingBox();

    expect(buttonBounds!.y + buttonBounds!.height).toBeLessThanOrEqual(formBounds!.y + formBounds!.height);
    expect(faqBounds!.y).toBeGreaterThanOrEqual(buttonBounds!.y + buttonBounds!.height);
  }

  await page.getByRole('button', { name: 'Como é calculado o orçamento?' }).click();
  await expect(page.getByText('A proposta considera os idiomas', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar orçamento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'O próximo idioma', exact: false })).toBeVisible();
});
