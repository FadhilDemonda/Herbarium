import { test, expect } from '@playwright/test';
import { openLibrary, openFirstDetail } from './helpers/browser';

for (const theme of ['light', 'dark']) {
  for (const width of [320, 360, 768, 1280]) {
    test(`render and click-through ${width} ${theme}`, async ({ page }, testInfo) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.setViewportSize({ width, height: 900 });
      await openLibrary(page, { theme, editor: true });
      await page.screenshot({ path: testInfo.outputPath('library.png') });
      await page.getByRole('button', { name: /Cari query/ }).click();
      await expect(page.getByRole('combobox', { name: 'Cari query' })).toBeFocused();
      await page.keyboard.press('Escape');
      const drawer = await openFirstDetail(page);
      await page.screenshot({ path: testInfo.outputPath('detail.png') });
      const offscreenButtons = await drawer.locator('button').evaluateAll((buttons) => buttons.filter((button) => {
        const r = button.getBoundingClientRect();
        return r.x < -1 || r.right > innerWidth + 1;
      }).map((button) => button.textContent || button.getAttribute('aria-label')));
      expect(offscreenButtons).toEqual([]);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /Menu pengguna/ }).click();
      await page.getByRole('menuitem', { name: 'Master Data', exact: true }).click();
      await page.screenshot({ path: testInfo.outputPath('masters.png') });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.getByRole('button', { name: 'Tambah Kategori', exact: true }).click();
      await page.screenshot({ path: testInfo.outputPath('master-form.png') });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
}
