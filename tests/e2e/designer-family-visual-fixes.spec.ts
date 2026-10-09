import { expect, test } from './fixtures.js';

// plan 558 Phase 2 P2 fixes from the reference-alignment walk (design-debt
// candidates → verified):
//   1. word-editor preview bar: the preview span carried `truncate` as an
//      INLINE element (inert) inside a non-overflow-hidden flex child, so long
//      preview text overflowed the bar and collided with the save-status at
//      1280×720. The bar must never overflow horizontally.
//   2. dashboard-demo stat tiles: the value span had no shrink handling, so
//      narrow panels clipped the KPI mid-glyph at the card boundary. The value
//      must degrade to an ellipsis inside its own box instead.

test('word-editor preview bar does not overflow horizontally at 1280×720', async ({ page }) => {
  await page.goto('/#/word-editor', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const readout = await page.evaluate(() => {
    const status = document.querySelector('[data-testid="word-editor-save-status"]');
    const bar = status?.parentElement;
    if (!bar) return { bar: false };
    return {
      bar: true,
      overflowPx: bar.scrollWidth - bar.clientWidth,
      statusLeft: Math.round(status.getBoundingClientRect().left),
      barRight: Math.round(bar.getBoundingClientRect().right),
    };
  });

  expect(readout.bar).toBe(true);
  // The bar must contain its content: no hidden overflow past its own box.
  expect(readout.overflowPx).toBeLessThanOrEqual(1);
  // The save-status must sit inside the bar, not pushed past its right edge.
  expect(readout.statusLeft!).toBeLessThanOrEqual(readout.barRight!);
});

test('dashboard stat tile value degrades with ellipsis instead of mid-glyph clipping', async ({ page }) => {
  await page.goto('/#/dashboard-demo', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const readout = await page.evaluate(() => {
    const value = document.querySelector('[data-slot="stat-tile-value"]');
    if (!value) return { value: false };
    const cs = getComputedStyle(value);
    const card = value.closest('[data-slot="stat-tile-root"]')?.parentElement;
    return {
      value: true,
      overflowX: cs.overflowX,
      textOverflow: cs.textOverflow,
      valueRight: Math.round(value.getBoundingClientRect().right),
      cardRight: card ? Math.round(card.getBoundingClientRect().right) : null,
    };
  });

  expect(readout.value).toBe(true);
  // The value box must clip its own overflow with an ellipsis affordance
  // rather than letting the glyph run past its box into the card boundary.
  expect(readout.overflowX).toBe('hidden');
  expect(readout.textOverflow).toBe('ellipsis');
  expect(readout.valueRight!).toBeLessThanOrEqual(readout.cardRight! + 1);
});
