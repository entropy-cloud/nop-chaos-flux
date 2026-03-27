import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button', { name: 'Flow Designer' }).click();
await page.waitForSelector('.react-flow__node', { timeout: 15000 });

const firstNodeHtml = await page.locator('.react-flow__node').first().evaluate((el) => el.outerHTML);
const allNodeTexts = await page.locator('.react-flow__node').allTextContents();
const toolbarHtml = await page.locator('.fd-page__header').first().evaluate((el) => el.outerHTML);
const paletteHtml = await page.locator('.fd-page__palette').first().evaluate((el) => el.outerHTML);

await page.locator('.react-flow__node').first().hover();
const quickActionHtml = await page.locator('.fd-xyflow-node-toolbar').first().evaluate((el) => el.outerHTML).catch(() => 'NO_TOOLBAR');

console.log('FIRST_NODE_HTML_START');
console.log(firstNodeHtml);
console.log('FIRST_NODE_HTML_END');
console.log('NODE_TEXTS_START');
console.log(JSON.stringify(allNodeTexts, null, 2));
console.log('NODE_TEXTS_END');
console.log('HEADER_HTML_START');
console.log(toolbarHtml);
console.log('HEADER_HTML_END');
console.log('PALETTE_HTML_START');
console.log(paletteHtml.slice(0, 2000));
console.log('PALETTE_HTML_END');
console.log('QUICK_ACTION_HTML_START');
console.log(quickActionHtml);
console.log('QUICK_ACTION_HTML_END');

await browser.close();
