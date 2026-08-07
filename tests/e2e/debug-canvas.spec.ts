import { test, expect } from './fixtures.js';

test('debug canvas element', async ({ page }) => {
  await page.goto('/#/scada-editor-demo', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const cc = document.querySelector('[data-slot="scada-editor-canvas-canvas"]') as HTMLElement;
    const cont = document.querySelector('[data-slot="scada-editor-canvas"]') as HTMLElement;
    const insp = document.querySelector('[data-slot="scada-editor-inspector"]') as HTMLElement;
    const box = (el: HTMLElement | null) => el ? {
      rect: JSON.parse(JSON.stringify(el.getBoundingClientRect())),
      pos: getComputedStyle(el).position,
      w: getComputedStyle(el).width,
      h: getComputedStyle(el).height,
      inlineW: el.style.width,
      attrW: el.getAttribute('width'),
    } : null;
    return { canvasEl: box(cc), container: box(cont), inspector: box(insp) };
  });
  console.log('CANVAS_DEBUG:', JSON.stringify(info, null, 2));
  expect(true).toBe(true);
});
