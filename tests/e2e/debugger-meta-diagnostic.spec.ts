import { test, expect } from '@playwright/test';

test('diagnose admin code meta explanation on live flux-basic page', async ({ page }) => {
  await page.goto('/#/flux-basic');
  await page.getByRole('heading', { name: 'Renderer Playground', level: 1 }).waitFor({
    state: 'visible',
    timeout: 15000,
  });

  await page.getByLabel('Username').fill('alice');
  await page.getByLabel('Username').blur();
  await page.getByLabel('Search Users').fill('alice');
  await page.getByLabel('Role').click();
  await page.getByRole('option', { name: 'Admin' }).click();
  await page.waitForTimeout(1200);

  const result = await page.evaluate(() => {
    const api = (
      window as unknown as {
        __NOP_DEBUGGER_API__?: {
          explainNodeMeta(query: { cid: number; field: string }): any;
          inspectByCid(cid: number): any;
        };
      }
    ).__NOP_DEBUGGER_API__;

    const input = document.querySelector('[aria-label="Admin Code"]') as HTMLElement | null;
    const field = input?.closest('.nop-field') as HTMLElement | null;
    const fieldCid = Number(field?.getAttribute('data-cid'));
    const inputClosestCid = Number(input?.closest('[data-cid]')?.getAttribute('data-cid'));

    return {
      fieldCid,
      inputClosestCid,
      inspect: api?.inspectByCid(fieldCid),
      inputInspect: api?.inspectByCid(inputClosestCid),
      meta: api?.explainNodeMeta({ cid: fieldCid, field: 'visible' }),
      inputMeta: api?.explainNodeMeta({ cid: inputClosestCid, field: 'visible' }),
      nearby: Array.from({ length: 8 }, (_, index) => fieldCid - 3 + index).map((cid) => ({
        cid,
        inspect: api?.inspectByCid(cid),
        meta: api?.explainNodeMeta({ cid, field: 'visible' }),
      })),
    };
  });

  console.log(JSON.stringify(result, null, 2));
  expect(result.fieldCid).toBeGreaterThan(0);
});
