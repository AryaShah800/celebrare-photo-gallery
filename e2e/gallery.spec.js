import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// These tests use the real Picsum service, so they need a network connection.

const firstThumb = page => page.locator('[data-photo-id]').first();

/** True when the first `count` photographs have decoded images. */
async function firstImagesDecoded(page, count) {
  return page.evaluate(n => {
    const images = [...document.querySelectorAll('[data-photo-id] img[alt^="Photograph"]')].slice(0, n);
    return images.length === n && images.every(img => img.complete && img.naturalWidth > 0);
  }, count);
}

test('layout does not shift while images load and extra pages arrive', async ({ page }) => {
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('./');
  await expect(firstThumb(page)).toBeVisible();
  // Scrolling down triggers the infinite scroll; keep going until three pages (90 photographs) are in.
  await expect.poll(async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    return page.locator('[data-photo-id]').count();
  }, { timeout: 60_000 }).toBeGreaterThanOrEqual(90);
  await scrollThrough(page);
  await expect.poll(() => firstImagesDecoded(page, 90), { timeout: 60_000 }).toBe(true);
  const cls = await page.evaluate(() => window.__cls);
  console.log(`CLS over 3 pages (90 photos), desktop: ${cls.toFixed(4)}`);
  expect(cls).toBeLessThan(0.01);
});

test('arrow keys move between photographs, Enter opens the lightbox and Escape returns focus', async ({ page }) => {
  await page.goto('./');
  const first = firstThumb(page);
  await expect(first).toBeVisible();
  await first.focus();
  // Page coordinates, so scrolling to keep the focused photo in view does not matter.
  const where = () => page.evaluate(() => {
    const r = document.activeElement.getBoundingClientRect();
    return { id: document.activeElement.dataset.photoId, x: r.x + window.scrollX, y: r.y + window.scrollY };
  });
  const start = await where();
  await page.keyboard.press('ArrowDown');
  const down = await where();
  expect(down.id).not.toBe(start.id);
  expect(down.y).toBeGreaterThan(start.y);
  expect(Math.abs(down.x - start.x)).toBeLessThan(2); // same column
  await page.keyboard.press('ArrowRight');
  const right = await where();
  expect(right.x).toBeGreaterThan(start.x + 50);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-photo-id]:focus')).toHaveCount(1);
});

test('search and view are in the URL, survive a reload and work from a shared link', async ({ page }) => {
  await page.goto('./');
  await expect(firstThumb(page)).toBeVisible();
  const author = (await page.locator('article h2').first().innerText()).split(' ')[0];
  await page.getByRole('searchbox').fill(author);
  await expect(page).toHaveURL(new RegExp(`\\?q=${encodeURIComponent(author)}`));
  await page.reload();
  await expect(page.getByRole('searchbox')).toHaveValue(author);
  await page.goto(`./?view=favourites`);
  await expect(page.getByRole('button', { name: /^Favourites/ })).toHaveAttribute('aria-pressed', 'true');
});

test('favourites can be exported and imported as JSON, and the import shows them in a fresh profile', async ({ page, browser }) => {
  await page.goto('./');
  await expect(firstThumb(page)).toBeVisible();
  await firstThumb(page).focus();
  await page.keyboard.press('f');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('f');
  await page.getByRole('button', { name: /^Favourites \(2\)/ }).click();
  await expect(page.locator('article')).toHaveCount(2);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON' }).click()]);
  const path = await download.path();
  const exported = JSON.parse(await readFile(path, 'utf8'));
  expect(exported.favourites).toHaveLength(2);

  // A different browser profile (no saved favourites) imports the file and sees the same two photographs.
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto('./?view=favourites');
  await expect(other.getByText('No favourites yet')).toBeVisible();
  await other.getByLabel('Import favourites file').setInputFiles(path);
  await expect(other.getByText('Imported 2 photographs, 2 new.')).toBeVisible();
  await expect(other.locator('article')).toHaveCount(2);
  await fresh.close();
});

test('photographs already viewed are still shown after going offline and reloading', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('article').nth(29)).toBeVisible();
  const firstPage = await page.locator('[data-photo-id]').evaluateAll(nodes => nodes.slice(0, 30).map(node => node.dataset.photoId));
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Reload once so the page is controlled by the worker and its images are stored through it.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.locator('article').nth(29)).toBeVisible();
  await scrollThrough(page);
  await expect.poll(() => decoded(page, firstPage), { timeout: 30_000 }).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/You are offline/)).toBeVisible();
  await expect(page.locator('article').nth(29)).toBeVisible();
  await scrollThrough(page);
  await expect.poll(() => decoded(page, firstPage), { timeout: 30_000 }).toBe(true);
  await context.setOffline(false);
});

/** True when every photograph in `ids` is in the page and its full-size image has decoded. */
async function decoded(page, ids) {
  return page.evaluate(wanted => wanted.every(id => {
    const img = document.querySelector(`[data-photo-id="${id}"] img[alt^="Photograph"]`);
    return img && img.complete && img.naturalWidth > 0;
  }), ids);
}

// Lazy images only load near the viewport, so walk down the page in screen-sized steps.
async function scrollThrough(page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  const step = page.viewportSize().height * 0.8;
  for (let y = 0; y < height; y += step) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await page.waitForTimeout(150);
  }
  await page.evaluate(top => window.scrollTo(0, top), height);
}
