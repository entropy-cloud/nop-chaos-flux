import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Gantt — editor dialog field contract (double-click the task-2 bar → dialog:
 * title/name/start/end/duration/progress fields, Save/Cancel/Escape commits).
 *
 * gantt-demo 任务日期自 ux-r8 起相对"今天"动态生成（iso(0)=今天, iso(9)=今天+9）；
 * 期望值在运行时同构推导，禁止写死日历日期（日期腐烂）。
 *
 * Migrated from tests/e2e/gantt-editor-fields.spec.ts (E3 batch 2, engine swap +
 * per-case isolation via the resetRoute hash bounce — Playwright ran each test
 * on a fresh page and ft.reload() destroys the CDP context mid-spec; upgrade:
 * every case now carries an explicit expectNoPageErrors kernel check with a
 * per-case marker, matching the old assertTrackedPageErrors per-test calls).
 */

function demoIso(offsetDays: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const ROUTE = '/#/gantt';

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByRole('heading', { name: /Gantt Chart Demo/i })).not.toBeVisible();
}

async function openEditorForTask2(ft: FtGlobal): Promise<ReturnType<FtGlobal['locator']>> {
  await resetRoute(ft);
  await ft.goto(ROUTE);
  await ft.expectWeb(ft.getByRole('heading', { name: /Gantt Chart Demo/i })).toBeVisible({
    timeoutMs: 25_000,
  });
  const bar = ft.locator('[data-slot="gantt-bar"][data-task-id="2"]');
  await ft.expectWeb(bar).toBeVisible({ timeoutMs: 15_000 });
  await bar.dblclick();
  const dialog = ft.locator('[role="dialog"]');
  await ft.expectWeb(dialog).toBeVisible({ timeoutMs: 5_000 });
  return dialog;
}

export default async function ganttEditorFields(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: dialog title reads Edit Task
  {
    const dialog = await openEditorForTask2(ft);
    await ft.expectWeb(dialog.locator('[data-slot="dialog-title"]')).toHaveText('编辑任务');
    await expectNoPageErrors(ft, 'gantt-editor:dialog-title');
  }

  // Case 2: name field has id suffix -edit-text with task name default
  {
    const dialog = await openEditorForTask2(ft);
    const name = dialog.locator('input[id$="-edit-text"]');
    await ft.expectWeb(name).toBeVisible();
    await ft.expectWeb(name).toHaveValue('Requirements');
    await expectNoPageErrors(ft, 'gantt-editor:name-field');
  }

  // Case 3: start field is a date input with the task start date
  {
    const dialog = await openEditorForTask2(ft);
    const start = dialog.locator('input[id$="-edit-start"]');
    await ft.expectWeb(start).toBeVisible();
    await ft.expectWeb(start).toHaveAttribute('type', 'date');
    await ft.expectWeb(start).toHaveValue(demoIso(0));
    await expectNoPageErrors(ft, 'gantt-editor:start-field');
  }

  // Case 4: end field is a date input with the task end date
  {
    const dialog = await openEditorForTask2(ft);
    const end = dialog.locator('input[id$="-edit-end"]');
    await ft.expectWeb(end).toBeVisible();
    await ft.expectWeb(end).toHaveAttribute('type', 'date');
    await ft.expectWeb(end).toHaveValue(demoIso(9));
    await expectNoPageErrors(ft, 'gantt-editor:end-field');
  }

  // Case 5: duration field is a number input with the task duration
  {
    const dialog = await openEditorForTask2(ft);
    const duration = dialog.locator('input[id$="-edit-duration"]');
    await ft.expectWeb(duration).toBeVisible();
    await ft.expectWeb(duration).toHaveAttribute('type', 'number');
    const value = await duration.inputValue();
    if (!/^\d+$/.test(value)) {
      throw new Error(`duration value "${value}" is not a numeric string`);
    }
    await expectNoPageErrors(ft, 'gantt-editor:duration-field');
  }

  // Case 6: progress field is a number input clamped 0..100 with initial value
  {
    const dialog = await openEditorForTask2(ft);
    const progress = dialog.locator('input[id$="-edit-progress"]');
    await ft.expectWeb(progress).toBeVisible();
    await ft.expectWeb(progress).toHaveAttribute('type', 'number');
    await ft.expectWeb(progress).toHaveAttribute('min', '0');
    await ft.expectWeb(progress).toHaveAttribute('max', '100');
    await ft.expectWeb(progress).toHaveValue('100');
    await expectNoPageErrors(ft, 'gantt-editor:progress-field');
  }

  // Case 7: Save commits the edited name into the grid row
  {
    const dialog = await openEditorForTask2(ft);
    await dialog.locator('input[id$="-edit-text"]').fill('Edited Via Dialog');
    await ft.getByRole('button', { name: '保存' }).click();
    await ft.expectWeb(dialog).not.toBeVisible({ timeoutMs: 5_000 });
    await ft
      .expectWeb(ft.locator('[data-slot="gantt-grid-row"][data-task-id="2"]'))
      .toContainText('Edited Via Dialog', { timeoutMs: 5_000 });
    await expectNoPageErrors(ft, 'gantt-editor:save');
  }

  // Case 8: Cancel keeps the original name
  {
    const dialog = await openEditorForTask2(ft);
    await dialog.locator('input[id$="-edit-text"]').fill('Should Not Persist');
    await ft.getByRole('button', { name: '取消' }).click();
    await ft.expectWeb(dialog).not.toBeVisible({ timeoutMs: 5_000 });
    const row = ft.locator('[data-slot="gantt-grid-row"][data-task-id="2"]');
    await ft.expectWeb(row).toContainText('Requirements');
    await ft.expectWeb(row).not.toContainText('Should Not Persist');
    await expectNoPageErrors(ft, 'gantt-editor:cancel');
  }

  // Case 9: Escape closes the editor without saving
  {
    const dialog = await openEditorForTask2(ft);
    await dialog.locator('input[id$="-edit-text"]').fill('Escaped Edit');
    await ft.keyboard.press('Escape');
    await ft.expectWeb(dialog).not.toBeVisible({ timeoutMs: 5_000 });
    await ft
      .expectWeb(ft.locator('[data-slot="gantt-grid-row"][data-task-id="2"]'))
      .not.toContainText('Escaped Edit');
    await expectNoPageErrors(ft, 'gantt-editor:escape');
  }

  return { cases: 9 };
}
