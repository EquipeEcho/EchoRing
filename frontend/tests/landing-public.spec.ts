import { test, expect } from '@playwright/test';

test('landing is public, responsive and respects reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Conectam/ })).toBeVisible();
  await expect(page.getByTestId('landing-hero-globe')).toBeVisible();

  const viewports = testInfo.project.name === 'mobile'
    ? [{ width: 320, height: 740 }, { width: 390, height: 844 }]
    : [{ width: 768, height: 900 }, { width: 1024, height: 768 }, { width: 1440, height: 1000 }];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(async () => {
      const heroBounds = await page.getByTestId('landing-hero-globe').boundingBox();
      return heroBounds ? Math.ceil(heroBounds.y + heroBounds.height) : -1;
    }).toBeLessThanOrEqual(viewport.height);
    await expect.poll(async () => {
      const heroBounds = await page.getByTestId('landing-hero-globe').boundingBox();
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      return heroBounds ? Math.max(heroBounds.x, clientWidth - heroBounds.x - heroBounds.width) : 1;
    }).toBeLessThanOrEqual(0);

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
