import { test, expect } from '@playwright/test';
import { openLibrary, openFirstDetail, expectFocusInside, fixtures } from './helpers/browser';

for (const theme of ['light', 'dark']) {
  test(`mobile search opens the existing palette (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await openLibrary(page, { theme });
    await page.getByRole('button', { name: /Cari query/ }).click();
    await expect(page.getByRole('dialog', { name: 'Pencarian query cepat' })).toBeVisible();
  });

  for (const width of [320, 360, 768, 1280]) {
    test(`toolbar fits the viewport ${width} (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openLibrary(page, { theme, editor: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const box = await page.getByRole('button', { name: 'Ekspor', exact: true }).boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    });
  }

  test(`master actions remain reachable through local table scrolling (${theme})`, async ({ page }) => {
    await openLibrary(page, { editor: true, theme });
    await page.getByRole('button', { name: 'Master Data', exact: true }).click();
    await page.setViewportSize({ width: 360, height: 900 });
    const region = page.getByRole('region', { name: /Daftar master/ });
    await expect(region).toBeVisible();
    await region.evaluate((e) => { e.scrollLeft = e.scrollWidth; });
    await page.getByRole('button', { name: `Edit ${fixtures.categories[0].name}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });

  test(`mobile controls provide 44px hit areas (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await openLibrary(page, { theme });
    const small = await page.locator('button, select').evaluateAll((elements) => elements.filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
    }).map((e) => e.getAttribute('aria-label') || e.textContent));
    expect(small).toEqual([]);
  });
}

test('modal traps and restores focus', async ({ page }) => {
  await openLibrary(page);
  const trigger = page.getByRole('button', { name: 'Masuk sebagai editor', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Masuk', exact: true });
  await expect.poll(() => expectFocusInside(dialog)).toBe(true);
  await dialog.getByRole('button', { name: 'Masuk', exact: true }).focus();
  await page.keyboard.press('Tab');
  expect(await expectFocusInside(dialog)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('nested delete Escape preserves the drawer', async ({ page }) => {
  await openLibrary(page, { editor: true });
  await openFirstDetail(page);
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Hapus', exact: true })).toBeFocused();
  await expect(page.locator('body')).toHaveClass(/modal-open/);
});

test('login password visibility is keyboard reachable', async ({ page }) => {
  await openLibrary(page);
  await page.getByRole('button', { name: 'Masuk sebagai editor' }).click();
  await page.locator('#login-password').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Lihat password' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'text');
});

test('nested palette Escape preserves the drawer and focus', async ({ page }) => {
  await openLibrary(page);
  const drawer = await openFirstDetail(page);
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  expect(await expectFocusInside(drawer)).toBe(true);
});

test('modal copy feedback stays visible in the active modal', async ({ page }) => {
  await openLibrary(page);
  await openFirstDetail(page);
  await page.getByRole('button', { name: 'Salin SQL Lengkap', exact: true }).click();
  const notice = page.getByRole('alert').filter({ hasText: 'SQL Lengkap Tersalin' });
  await expect(notice).toBeVisible();
  await expect.poll(() => notice.evaluate((element) => {
    const r = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);
});

test('modal clipboard fallback copies real SQL and restores focus', async ({ page }) => {
  await openLibrary(page);
  const query = fixtures.queries[0];
  await page.locator('article').filter({ has: page.getByRole('heading', { name: query.title, exact: true }) }).getByRole('button', { name: 'Buka Detail', exact: true }).click();
  await page.evaluate(async () => {
    await navigator.clipboard.writeText('');
    Object.defineProperty(navigator.clipboard, 'writeText', { value: async () => { throw new Error('Simulated Clipboard API failure'); } });
  });
  const copy = page.getByRole('button', { name: /^(Salin SQL Lengkap|Tersalin!)$/ });
  await copy.focus();
  await page.keyboard.press('Enter');
  // Windows' legacy copy path exposes CRLF even when the textarea contains LF.
  await expect.poll(async () => (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(query.sql_query.replace(/\r\n/g, '\n'));
  await expect(copy).toBeFocused();
});

test('nested unauthorized login restores focus to the surviving delete dialog', async ({ page }) => {
  await openLibrary(page, { editor: true });
  await page.route('https://script.google.com/**', (route) => route.request().method() === 'POST'
    ? route.fulfill({ json: { ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesi berakhir' } } })
    : route.fallback());
  await openFirstDetail(page);
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Hapus Query', exact: true });
  await confirmation.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Masuk', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(2);
  await expect.poll(() => expectFocusInside(confirmation)).toBe(true);
});

for (const theme of ['light', 'dark']) {
  test(`rendered form placeholder and boundary contrast (${theme})`, async ({ page }) => {
    await openLibrary(page, { theme, editor: true });
    await page.getByRole('button', { name: 'Master Data', exact: true }).click();
    await page.getByRole('button', { name: 'Tambah Kategori', exact: true }).click();
    await page.getByRole('button', { name: 'Tutup form', exact: true }).focus();
    const ratios = await page.locator('#master-name').evaluate((element) => {
      const normal = getComputedStyle(element);
      const placeholder = getComputedStyle(element, '::placeholder');
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const luminance = (channels) => channels.slice(0, 3).map((c) => c / 255).map((c) => c <= 0.04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
      const bg = rgb(normal.backgroundColor);
      const contrast = (value, opacity = 1) => {
        const fg = rgb(value), alpha = (fg[3] ?? 1) * opacity;
        const mixed = fg.slice(0, 3).map((c, i) => c * alpha + bg[i] * (1 - alpha));
        const [a, b] = [luminance(mixed), luminance(bg)].sort((a, b) => b - a);
        return (a + .05) / (b + .05);
      };
      return { text: contrast(placeholder.color, Number(placeholder.opacity)), boundary: contrast(normal.borderTopColor) };
    });
    expect.soft(ratios.text).toBeGreaterThanOrEqual(4.5);
    expect.soft(ratios.boundary).toBeGreaterThanOrEqual(3);
  });
}

test('modal form preserves typed values when unauthorized login opens', async ({ page }) => {
  await openLibrary(page, { editor: true });
  await page.route('https://script.google.com/**', async (route) => {
    if (route.request().method() === 'POST') return route.fulfill({ json: { ok: false, error: { code: 'UNAUTHORIZED', message: 'Sesi berakhir' } } });
    return route.fallback();
  });
  await page.getByRole('button', { name: 'Tambah query baru' }).first().click();
  await page.locator('#query-title').fill(fixtures.queries[0].title);
  await page.locator('#query-sql').fill(fixtures.queries[0].sql_query);
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  const login = page.getByRole('dialog', { name: 'Masuk', exact: true });
  await expect(login).toBeVisible();
  expect(await expectFocusInside(login)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#query-title')).toHaveValue(fixtures.queries[0].title);
  await expect(page.locator('#query-sql')).toHaveValue(fixtures.queries[0].sql_query);
});

test('master dialogs close with Escape', async ({ page }) => {
  await openLibrary(page, { editor: true });
  await page.getByRole('button', { name: 'Master Data', exact: true }).click();
  await page.getByRole('button', { name: 'Tambah Kategori', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('menus support keyboard navigation and Escape', async ({ page }) => {
  await openLibrary(page, { editor: true });
  const trigger = page.getByRole('button', { name: 'Ekspor', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Unduh CSV' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Unduh JSON' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('card copy Enter copies without opening details', async ({ page }) => {
  await openLibrary(page);
  await page.getByRole('button', { name: 'Salin query SQL', exact: true }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tersalin', exact: true })).toHaveCount(1);
  expect(fixtures.queries.map((q) => q.sql_query)).toContain(await page.evaluate(() => navigator.clipboard.readText()));
});

test('favorite Space toggles without opening details', async ({ page }) => {
  await openLibrary(page);
  await page.getByRole('button', { name: 'Tambah ke bookmark', exact: true }).first().focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hapus dari favorit', exact: true })).toHaveCount(1);
});

test('table copy Enter preserves table semantics', async ({ page }) => {
  await openLibrary(page);
  await page.getByRole('button', { name: 'Tampilan Tabel Ringkas' }).click();
  await page.getByRole('button', { name: 'Salin SQL', exact: true }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main table tbody tr[role="button"]')).toHaveCount(0);
});

test('new master fields have visible associated labels', async ({ page }) => {
  await openLibrary(page, { editor: true });
  await page.getByRole('button', { name: 'Tambah query baru' }).first().click();
  for (const [select, label] of [['query-category', 'Nama kategori baru'], ['query-type', 'Nama jenis baru'], ['query-installation', 'Nama instalasi baru']]) {
    await page.locator(`#${select}`).selectOption('__new__');
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
});

test('palette exposes active option through combobox semantics', async ({ page }) => {
  await openLibrary(page);
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Cari query' });
  await expect(input).toBeVisible();
  const activeId = await input.getAttribute('aria-activedescendant');
  await expect(page.locator(`[id="${activeId}"]`)).toHaveAttribute('role', 'option');
  await input.fill('zzzz_no_matching_query_zzzz');
  await page.keyboard.press('ArrowUp');
  await expect(input).not.toHaveAttribute('aria-activedescendant', /.+/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('master tabs support arrow navigation', async ({ page }) => {
  await openLibrary(page, { editor: true });
  await page.getByRole('button', { name: 'Master Data', exact: true }).click();
  await page.getByRole('tab', { name: /Master Kategori/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Master Instalasi/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toBeVisible();
});

test('view mode exposes its selected state', async ({ page }) => {
  await openLibrary(page);
  await page.getByRole('button', { name: 'Tampilan Tabel Ringkas' }).click();
  await expect(page.getByRole('button', { name: 'Tampilan Tabel Ringkas' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Tampilan Kartu (Grid)' })).toHaveAttribute('aria-pressed', 'false');
});

for (const theme of ['light', 'dark']) {
  test(`contrast text and badge presets meet AA (${theme})`, async ({ page }) => {
    await openLibrary(page, { theme });
    await openFirstDetail(page);
    const ratios = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      const pairs = ['terracotta', 'forest', 'teal', 'amber', 'berry', 'slate', 'neutral'].map((name) => [`--badge-${name}-text`, `--badge-${name}-bg`]);
      pairs.push(['--sql-comment', '--sql-bg'], ['--sql-number', '--sql-bg'], ['--danger-text', '--danger']);
      const luminance = (hex) => hex.trim().replace('#', '').match(/../g).map((c) => parseInt(c, 16) / 255).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4).reduce((v, c, i) => v + c * [0.2126, 0.7152, 0.0722][i], 0);
      return pairs.map(([a, b]) => {
        const fg = s.getPropertyValue(a), bg = s.getPropertyValue(b);
        if (!fg.trim() || !bg.trim()) return { name: a, ratio: 0 };
        const values = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
        return { name: a, ratio: (values[0] + 0.05) / (values[1] + 0.05) };
      });
    });
    expect(ratios.filter((r) => r.ratio < 4.5)).toEqual([]);
  });
}

test('static surfaces remain flat while overlays stay elevated', async ({ page }) => {
  await openLibrary(page);
  expect(await page.locator('article').first().evaluate((e) => getComputedStyle(e).boxShadow)).toBe('none');
  await openFirstDetail(page);
  expect(await page.locator('aside').last().evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe('none');
});

test('failed delete displays error without unhandled rejection', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openLibrary(page, { editor: true });
  await openFirstDetail(page);
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Hapus Query', exact: true });
  await dialog.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Simulasi gagal menyimpan');
  expect(errors).toEqual([]);
  await expect(dialog.getByRole('button', { name: 'Hapus', exact: true })).toBeEnabled();
});

test('retry preserves the same query target', async ({ page }) => {
  await openLibrary(page, { editor: true });
  let attempts = 0;
  const query = fixtures.queries[0];
  await page.route('https://script.google.com/**', async (route) => {
    if (attempts >= 2 && new URL(route.request().url()).searchParams.get('action') === 'list') {
      return route.fulfill({ json: { ok: true, data: fixtures.queries.filter((item) => item.id !== query.id) } });
    }
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    if (body.action !== 'delete') return route.fallback();
    expect(body.id).toBe(query.id);
    attempts++;
    return route.fulfill({ json: attempts === 1
      ? { ok: false, error: { code: 'SERVER_ERROR', message: 'Simulasi gagal hapus. Coba lagi.' } }
      : { ok: true, data: { id: query.id } },
    });
  });
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: query.title, exact: true }) });
  await card.getByRole('button', { name: 'Buka Detail', exact: true }).click();
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Hapus Query', exact: true });
  await dialog.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Coba lagi');
  await expect(card).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(card).toHaveCount(0);
});

test('delayed delete prevents duplicate submission and accidental dismissal', async ({ page }) => {
  await openLibrary(page, { editor: true });
  let release;
  const ready = new Promise((resolve) => { release = resolve; });
  let requests = 0;
  await page.route('https://script.google.com/**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    requests++;
    await ready;
    return route.fulfill({ json: { ok: false, error: { code: 'SERVER_ERROR', message: 'Simulasi tertunda. Coba lagi.' } } });
  });
  await openFirstDetail(page);
  await page.getByRole('button', { name: 'Hapus', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Hapus Query', exact: true });
  await dialog.getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Menghapus...' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  expect(requests).toBe(1);
  release();
  await expect(dialog.getByRole('alert')).toContainText('Coba lagi');
});
