import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Calendar Demo — scheduling calendar month view smoke: page loads with month
 * view visible, header view-switch labels, navigation buttons, event blocks,
 * day cells, resource rows.
 *
 * Migrated from tests/e2e/calendar-demo.spec.ts (E3 batch 1, engine swap +
 * raw count()/toBeTruthy assertions kept as explicit checks; per-test
 * assertTrackedPageErrors replaced by kernel expectNoPageErrors; navigation
 * text-change waits upgraded from expect polling to expectWeb retry-polling).
 */

async function caseLoadsMonthView(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/scheduling-calendar');
  await ft.expectWeb(ft.locator('[data-view="month"]')).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(ft.locator('[data-slot="calendar-matrix"]')).toBeVisible({ timeoutMs: 15_000 });

  const resourceRows = ft.locator('[data-slot="calendar-resource-row"]');
  await ft.expectWeb(resourceRows.first()).toBeVisible({ timeoutMs: 5_000 });
  const rowCount = await resourceRows.count();
  if (rowCount <= 0) throw new Error('expected resource rows > 0');
  await expectNoPageErrors(ft, 'calendar-demo: month view loads');
}

async function caseViewSwitchLabels(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/scheduling-calendar');
  await ft.expectWeb(ft.locator('[data-view="month"]')).toBeVisible({ timeoutMs: 15_000 });

  const headerButtons = ft.locator('[data-slot="calendar-header"] button');
  const count = await headerButtons.count();
  const allTexts: string[] = [];
  for (let i = 0; i < count; i++) {
    allTexts.push(await headerButtons.nth(i).text());
  }

  const hasLabel = (label: string) => allTexts.some((t) => t.trim() === label);
  if (!hasLabel('月')) throw new Error(`missing view button 月; buttons: ${JSON.stringify(allTexts)}`);
  if (!hasLabel('周')) throw new Error(`missing view button 周; buttons: ${JSON.stringify(allTexts)}`);
  if (!hasLabel('日')) throw new Error(`missing view button 日; buttons: ${JSON.stringify(allTexts)}`);
  await expectNoPageErrors(ft, 'calendar-demo: view switch labels');
}

async function caseNavigationButtons(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/scheduling-calendar');
  await ft.expectWeb(ft.locator('[data-view="month"]')).toBeVisible({ timeoutMs: 15_000 });

  const dateDisplay = ft.locator('[data-slot="calendar-header"] h2');
  await dateDisplay.waitFor('attached');
  const initialDateText = await dateDisplay.text();

  // Locale-agnostic: the app defaults to zh-CN but honors en-US builds.
  const nextBtn = ft.locator('button[aria-label="Next"], button[aria-label="下一个"]');
  const prevBtn = ft.locator('button[aria-label="Previous"], button[aria-label="上一个"]');

  await nextBtn.click();
  await ft.expectWeb(dateDisplay).not.toHaveText(initialDateText, { timeoutMs: 3_000 });

  await prevBtn.click();
  await ft.expectWeb(dateDisplay).toHaveText(initialDateText, { timeoutMs: 3_000 });
  await expectNoPageErrors(ft, 'calendar-demo: navigation buttons');
}

async function caseEventsRendered(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/scheduling-calendar');
  await ft.expectWeb(ft.locator('[data-view="month"]')).toBeVisible({ timeoutMs: 15_000 });

  const eventBlocks = ft.locator('[data-slot="calendar-event"]');
  await ft.expectWeb(eventBlocks.first()).toBeVisible({ timeoutMs: 10_000 });
  const eventCount = await eventBlocks.count();
  if (eventCount <= 0) throw new Error('expected calendar events > 0');

  await ft.expectWeb(eventBlocks.first()).toHaveAttribute('data-event-id');
  await ft.expectWeb(eventBlocks.first()).toHaveAttribute('data-event-type');
  await expectNoPageErrors(ft, 'calendar-demo: events rendered');
}

async function caseDayCellsClickable(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/scheduling-calendar');
  await ft.expectWeb(ft.locator('[data-view="month"]')).toBeVisible({ timeoutMs: 15_000 });

  const cells = ft.locator('[data-slot="calendar-cell"][data-date]');
  const cellCount = await cells.count();
  if (cellCount <= 0) throw new Error('expected day cells > 0');

  const firstCell = cells.first();
  await ft.expectWeb(firstCell).toBeVisible({ timeoutMs: 5_000 });
  await expectNoPageErrors(ft, 'calendar-demo: day cells');
}

async function caseResourceRows(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/scheduling-calendar');
  await ft.expectWeb(ft.locator('[data-view="month"]')).toBeVisible({ timeoutMs: 15_000 });

  const resourceRows = ft.locator('[data-slot="calendar-resource-row"]');
  const rowCount = await resourceRows.count();
  if (rowCount < 1) throw new Error('expected resource rows >= 1');
  await expectNoPageErrors(ft, 'calendar-demo: resource rows');
}

export default async function calendarDemoSpec(ft: FtGlobal): Promise<{ cases: number }> {
  await caseLoadsMonthView(ft);
  await caseViewSwitchLabels(ft);
  await caseNavigationButtons(ft);
  await caseEventsRendered(ft);
  await caseDayCellsClickable(ft);
  await caseResourceRows(ft);
  return { cases: 6 };
}
