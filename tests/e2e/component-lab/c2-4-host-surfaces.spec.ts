import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C2.4 Phase 3 composite host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-family-submit (bug 73 pattern): the whole date family
 *    (input-date/input-datetime/input-time/date-range/input-month/input-quarter/
 *    input-year) in one form — real picker/input into every control (calendar
 *    day picks, native time/month fills, quarter year+select, range shortcut),
 *    submit, valuesPath publishes the committed value shapes into the page
 *    scope where an outer text echoes all seven values. This is the explicit
 *    "unit-green but real-browser-broken" (bug 73) check for the date family.
 * 2. host-family-markers: each family control emits its type root marker
 *    (nop-input-date/nop-input-datetime/nop-input-time/nop-date-range/
 *    nop-input-month/nop-input-quarter/nop-input-year) in a real browser.
 * 3. host-range-calendar: date-range calendar day selection writes the range
 *    back in a real browser (immediate-commit D7: display equals committed).
 * 4. host-period-range: period range mode composite submit (month range +
 *    quarter range + year) publishes delimiter-joined range shapes.
 */

async function clickDay(popover: import('@playwright/test').Locator, day: number) {
  // Day buttons re-render on focus/hover; Playwright's full pointer sequence can
  // race that re-render, so dispatch the click event directly — this fires
  // react-day-picker's real onSelect handler (the same path fireEvent.click
  // exercises in the unit tests).
  await popover
    .locator('button')
    .filter({ hasText: new RegExp(`^${day}$`) })
    .first()
    .dispatchEvent('click');
}

test('date-family-host: composite submit publishes all seven date-family values (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-date');

  const slug = scenarioSlug('Date family composite submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // 1. input-date: open its popover (two date triggers exist in this stage —
  //    input-date and input-datetime share the testid, so scope by marker) and
  //    pick day 15.
  await stage.locator('.nop-input-date [data-testid="date-trigger"]').click();
  const datePopover = page.locator('[data-testid="date-popover"]');
  await expect(datePopover).toBeVisible({ timeout: 10_000 });
  await clickDay(datePopover, 15);
  await expect(datePopover).toBeHidden({ timeout: 5_000 });

  // 2. input-datetime: pick day 20 (existing time 14:30 must be preserved).
  await stage.locator('.nop-input-datetime [data-testid="date-trigger"]').click();
  await expect(datePopover).toBeVisible({ timeout: 10_000 });
  await clickDay(datePopover, 20);

  // 3. input-time: real native time input (closes the datetime popover).
  await stage.locator('.nop-input-time input[type="time"]').fill('09:15');

  // 4. date-range: apply the Last 7 days shortcut inside the popover.
  await stage.locator('[data-testid="range-trigger"]').click();
  const rangePopover = page.locator('[data-testid="range-popover"]');
  await expect(rangePopover).toBeVisible({ timeout: 10_000 });
  await rangePopover.getByRole('button', { name: 'Last 7 days' }).click();

  // 5. period family: native month fill + quarter year edit + year fill.
  await stage.locator('[data-testid="period-input-month"]').fill('2024-11');
  await stage.locator('[data-testid="period-input-quarter"] input[type="text"]').fill('2025');
  await stage.locator('[data-testid="period-input-year"]').fill('2031');

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(
    stage.getByText(
      'Date: 2024-06-15 | 2024-06-20 14:30 | 09:15 | 2024-06-03,2024-06-10 | 2024-11 | 2025-Q3 | 2031',
    ),
  ).toBeVisible({ timeout: 5_000 });
});

test('date-family-host: every family control emits its type root marker', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-date');

  const slug = scenarioSlug('Date family composite submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await expect(stage.locator('.nop-input-date')).toBeVisible();
  await expect(stage.locator('.nop-input-datetime')).toBeVisible();
  await expect(stage.locator('.nop-input-time')).toBeVisible();
  await expect(stage.locator('.nop-date-range')).toBeVisible();
  await expect(stage.locator('.nop-input-month')).toBeVisible();
  await expect(stage.locator('.nop-input-quarter')).toBeVisible();
  await expect(stage.locator('.nop-input-year')).toBeVisible();
});

test('range-host: calendar selection writes the range back in a real browser (immediate-commit)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('date-range');

  const slug = scenarioSlug('rangeKind=date + shortcuts');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  await stage.locator('[data-testid="range-trigger"]').click();
  const rangePopover = page.locator('[data-testid="range-popover"]');
  await expect(rangePopover).toBeVisible({ timeout: 10_000 });

  // Clicking a day after the current end extends the range end (react-day-picker
  // range-mode in-range direction). D7 immediate-commit: the trigger display
  // always equals the committed value.
  await clickDay(rangePopover, 18);

  await expect(stage.locator('[data-testid="range-display"]')).toHaveText(
    '2024-06-01 , 2024-06-18',
    { timeout: 5_000 },
  );
});

test('period-host: range-mode composite submit publishes period range shapes', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-month');

  const slug = scenarioSlug('Period family composite submit (range mode)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Month range: fill both native month inputs.
  const monthInputs = stage.locator('[data-testid="period-input-month"]');
  await monthInputs.nth(0).fill('2024-02');
  await monthInputs.nth(1).fill('2024-05');

  // Quarter range: edit the END picker's year (select keeps Q4) → 2025-Q4.
  const quarterHosts = stage.locator('[data-testid="period-input-quarter"]');
  await quarterHosts.nth(1).locator('input[type="text"]').fill('2025');

  // Year: fill the numeric year input.
  await stage.locator('[data-testid="period-input-year"]').fill('2031');

  await stage.getByRole('button', { name: 'Submit' }).click();

  await expect(
    stage.getByText('Period: 2024-02,2024-05 | 2024-Q1,2025-Q4 | 2031'),
  ).toBeVisible({ timeout: 5_000 });
});
