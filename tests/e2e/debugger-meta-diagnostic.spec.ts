import { test, expect, assertTrackedPageErrors } from './fixtures.js';

async function selectRoleOption(
  page: import('@playwright/test').Page,
  labelText: string,
  optionText: string,
): Promise<void> {
  const trigger = page.getByRole('combobox', { name: labelText });
  await trigger.selectOption({ label: optionText });
  await expect(trigger).toContainText(optionText, { timeout: 5_000 });
}

test('diagnose admin code meta explanation on live flux-basic page', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/#/flux-basic');
  await page.getByRole('heading', { name: 'Renderer Playground', level: 1 }).waitFor({
    state: 'visible',
    timeout: 15000,
  });
  await assertTrackedPageErrors(page);

  await page.getByLabel('Username').fill('alice');
  await page.getByLabel('Username').blur();
  await page.getByLabel('Search Users').fill('alice');
  await selectRoleOption(page, 'Role', 'Admin');

  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          const input = document.querySelector('[aria-label="Admin Code"]') as HTMLElement | null;
          const field = input?.closest('.nop-field') as HTMLElement | null;
          return Number(field?.getAttribute('data-cid')) || 0;
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0);

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

    return {
      fieldCid,
      inspect: api?.inspectByCid(fieldCid),
      meta: api?.explainNodeMeta({ cid: fieldCid, field: 'visible' }),
    };
  });

  expect(result.fieldCid).toBeGreaterThan(0);
  expect(result.inspect).toMatchObject({
    cid: result.fieldCid,
    metaSummary: {
      visible: true,
    },
  });
  expect(result.meta).toMatchObject({
    kind: 'meta',
    confidence: 'high',
    truncated: false,
    subject: {
      cid: result.fieldCid,
      field: 'visible',
    },
    data: {
      field: 'visible',
      source: 'resolved-meta',
      value: true,
      dependencyPaths: ['role'],
    },
  });
  expect(result.meta.answer).toContain('${role === "admin"}');
  expect(result.meta.limitations).toEqual([]);
  expect(Array.isArray(result.meta.evidenceRefs)).toBe(true);
  expect(result.meta.evidenceRefs.length).toBeGreaterThan(0);
});
