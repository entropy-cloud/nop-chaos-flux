import { chromium } from '@playwright/test';
import { createServer } from 'node:http';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(m.text()));
await page.goto('http://127.0.0.1:4175/#/complex-pages/standard-crud', { waitUntil: 'commit' });
await page.waitForTimeout(4000);
const input = page.getByPlaceholder('姓名 / 邮箱');
console.log('input count:', await input.count());
await input.fill('青禾');
await input.press('Enter');
await page.waitForTimeout(3000);
console.log('hash:', await page.evaluate(() => window.location.hash));
console.log('logs:', JSON.stringify(logs.filter(l => l.includes('url-sync') || l.includes('error')), null, 0).slice(0, 500));
await browser.close();
