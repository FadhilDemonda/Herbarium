import { readFileSync } from 'node:fs';

export const fixtures = Object.fromEntries(['queries', 'categories', 'types', 'installations'].map((name) => [
  name, JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8')),
]));

export async function openLibrary(page, { editor = false, theme = 'light' } = {}) {
  await page.route('https://script.google.com/**', (route) => {
    const action = new URL(route.request().url()).searchParams.get('action');
    const data = action === 'list' ? fixtures.queries : {
      categories: fixtures.categories, types: fixtures.types, installations: fixtures.installations,
    };
    return route.fulfill({ json: route.request().method() === 'GET'
      ? { ok: true, data }
      : { ok: false, error: { code: 'SERVER_ERROR', message: 'Simulasi gagal menyimpan. Coba lagi.' } },
    });
  });
  await page.addInitScript(({ editor, theme }) => {
    localStorage.setItem('herbarium-theme', theme);
    if (editor) {
      sessionStorage.setItem('herbarium_session_token', 'test-placeholder-not-a-real-token');
      sessionStorage.setItem('herbarium_session_username', 'audit-ui');
      sessionStorage.setItem('herbarium_session_expires', new Date(Date.now() + 3600000).toISOString());
    }
  }, { editor, theme });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('action=masters')),
    page.goto('/'),
  ]);
  await page.evaluate(() => document.fonts.ready);
}

export async function openFirstDetail(page) {
  await page.getByRole('button', { name: 'Buka Detail', exact: true }).first().click();
  return page.getByRole('dialog').last();
}

export async function expectFocusInside(dialog) {
  return dialog.evaluate((element) => element.contains(document.activeElement));
}
