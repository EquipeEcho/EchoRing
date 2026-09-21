import { test, expect } from '@playwright/test';

test('landing is public, responsive and respects reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Conectam/ })).toBeVisible();
  await expect(page.getByTestId('landing-hero-globe')).toBeVisible();

  for (const width of testInfo.project.name === 'mobile' ? [320, 390] : [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const submit = page.getByRole('button', { name: 'Continuar', exact: true });
    await expect.poll(async () => {
      const [buttonBounds, formBounds, faqBounds] = await Promise.all([
        submit.boundingBox(),
        page.getByTestId('landing-quote-form').boundingBox(),
        page.getByTestId('landing-faq').boundingBox(),
      ]);
      if (!buttonBounds || !formBounds || !faqBounds) return -1;
      const buttonBottom = buttonBounds.y + buttonBounds.height;
      return Math.min(formBounds.y + formBounds.height - buttonBottom, faqBounds.y - buttonBottom);
    }).toBeGreaterThanOrEqual(0);
  }

  await page.getByRole('button', { name: 'Como é calculado o orçamento?' }).click();
  await expect(page.getByText('A proposta considera os idiomas', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar orçamento', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vamos traduzir', exact: false })).toBeVisible();
});
