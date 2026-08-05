import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C9 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-gantt-dialog (bug 73 pattern): gantt inside an openDialog surface —
 *    task bars render and a bar click dispatches onTaskClick with `${_taskId}`
 *    resolved through the dispatch ctx.
 * 2. host-kanban-drag (bug 73 pattern): kanban inside an openDialog surface —
 *    card click dispatches onCardClick with `${cardId}|${index}`, and a
 *    cross-column drag dispatches onCardMove with `${cardId}|${toColumnId}|${toIndex}`.
 * 3. host-cal-load (bug 73 pattern): calendar inside an openDialog surface —
 *    loadAction fires on mount (probe) and an event block click dispatches
 *    onEventClick with `${event.id}|${event.title}` resolved via ctx.
 * 4. host-barcode-form: barcode-input in a form — manual input writes back,
 *    required validation blocks an empty submit, submit echoes the value.
 */

async function readProbe(page: import('@playwright/test').Page, key: string): Promise<string | undefined> {
  return page.evaluate((k) => (window as unknown as Record<string, string | undefined>)[k], `__c9${key}`);
}

async function readProbeCount(page: import('@playwright/test').Page, key: string): Promise<number> {
  return page.evaluate(
    (k) => ((window as unknown as Record<string, number | undefined>)[k] ?? 0) as number,
    `__c9${key}Count`,
  );
}

test('scheduling-host: gantt in a dialog dispatches onTaskClick with ctx-resolved args (host-gantt-dialog, bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('gantt');

  const slug = scenarioSlug('Host gantt in dialog + onTaskClick payload (C9 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c9-gantt-open"]').click();
  const gantt = page.locator('[data-testid="c9-gantt-in-dialog"]');
  await expect(gantt).toBeVisible({ timeout: 10_000 });
  await expect(gantt).toHaveAttribute('data-slot', 'gantt');

  const bars = gantt.locator('[data-slot="gantt-bar"]');
  await expect(bars.first()).toBeVisible({ timeout: 10_000 });
  const taskId = await bars.first().getAttribute('data-task-id');
  expect(taskId).toBeTruthy();

  await bars.first().click();
  await expect.poll(async () => readProbe(page, 'GanttClick'), { timeout: 10_000 }).toBe(taskId!);
  await expect.poll(async () => readProbeCount(page, 'GanttClick'), { timeout: 10_000 }).toBe(1);

  await assertTrackedPageErrors(page);
});

test('scheduling-host: kanban in a dialog dispatches onCardClick and onCardMove with ctx-resolved args (host-kanban-drag, bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('kanban');

  const slug = scenarioSlug('Host kanban in dialog + onCardClick/onCardMove payload (C9 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c9-kanban-open"]').click();
  const kanban = page.locator('[data-testid="c9-kanban-in-dialog"]');
  await expect(kanban).toBeVisible({ timeout: 10_000 });
  await expect(kanban).toHaveAttribute('data-slot', 'kanban');

  const cards = kanban.locator('[data-slot="kanban-card"]');
  await expect(cards).toHaveCount(2);

  // Click the first card: `${cardId}|${index}` resolves via ctx.
  await cards.first().click();
  await expect.poll(async () => readProbe(page, 'KanbanCard'), { timeout: 10_000 }).toBe('kc1|0');
  await expect.poll(async () => readProbeCount(page, 'KanbanCard'), { timeout: 10_000 }).toBe(1);

  // Cross-column move via the keyboard-drag path (Space pickup + ArrowRight):
  // deterministic in real browsers (mouse HTML5 DnD in headless component-lab
  // stages is native-drag flaky — mouse drag is covered by kanban-demo.spec.ts).
  // Let the dialog entrance animation settle first.
  await page.waitForTimeout(500);
  await cards.first().focus();
  await page.keyboard.press('Space');
  await expect(cards.first()).toHaveAttribute('data-keyboard-dragging', 'true');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => readProbe(page, 'KanbanMove'), { timeout: 10_000 }).toBe('kc1|k2|0');
  await expect.poll(async () => readProbeCount(page, 'KanbanMove'), { timeout: 10_000 }).toBe(1);

  const doneCol = kanban.locator('[data-slot="kanban-column"][data-column-id="k2"]');
  await expect(doneCol).toHaveAttribute('data-card-count', '1');

  await assertTrackedPageErrors(page);
});

test('scheduling-host: calendar in a dialog fires loadAction and dispatches onEventClick with ctx-resolved args (host-cal-load, bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('calendar');

  const slug = scenarioSlug('Host calendar in dialog + loadAction + onEventClick payload (C9 bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  await stage.locator('[data-testid="c9-cal-open"]').click();
  const calendar = page.locator('[data-testid="c9-cal-in-dialog"]');
  await expect(calendar).toBeVisible({ timeout: 10_000 });
  await expect(calendar).toHaveAttribute('data-view', 'month');

  // loadAction fired on mount inside the dialog.
  await expect.poll(async () => readProbe(page, 'CalLoad'), { timeout: 10_000 }).toBe('loaded');
  // Mount-effect probe: dev StrictMode double-mount may fire loadAction twice.
  await expect.poll(async () => readProbeCount(page, 'CalLoad'), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);

  const eventBlock = calendar.locator('[data-slot="calendar-event"]').first();
  await expect(eventBlock).toBeVisible({ timeout: 10_000 });
  const eventId = await eventBlock.getAttribute('data-event-id');
  expect(eventId).toBeTruthy();

  await eventBlock.click();
  await expect.poll(async () => readProbe(page, 'CalEvent'), { timeout: 10_000 }).toBe(`${eventId!}|Morning shift`);
  await expect.poll(async () => readProbeCount(page, 'CalEvent'), { timeout: 10_000 }).toBe(1);

  await assertTrackedPageErrors(page);
});

test('scheduling-host: barcode-input in a form writes back, validates and submits (host-barcode-form)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('barcode-input');

  const slug = scenarioSlug('Host barcode-input in form + validation + submit echo (C9)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const barcode = stage.locator('[data-testid="c9-barcode"]');
  await expect(barcode).toBeVisible({ timeout: 10_000 });
  await expect(barcode).toHaveAttribute('data-slot', 'barcode-input');

  // Empty submit → form-model required validation blocks the submit.
  await stage.locator('[data-testid="c9-barcode-submit"]').click();
  await expect(stage.locator('[data-slot="barcode-validation-error"]')).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => readProbeCount(page, 'BarcodeSubmit'), { timeout: 10_000 }).toBe(0);

  // Manual input writes back to the form value; submit echoes it via probe.
  const input = barcode.locator('input');
  await input.fill('SN-2026-0001');
  await stage.locator('[data-testid="c9-barcode-submit"]').click();
  await expect.poll(async () => readProbe(page, 'BarcodeSubmit'), { timeout: 10_000 }).toBe('SN-2026-0001');
  await expect.poll(async () => readProbeCount(page, 'BarcodeSubmit'), { timeout: 10_000 }).toBe(1);
  await expect(stage.locator('[data-slot="barcode-validation-error"]')).toHaveCount(0);

  await assertTrackedPageErrors(page);
});
