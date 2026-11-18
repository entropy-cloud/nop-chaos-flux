import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * L4.11a table column drag reorder (plan 513 Phase 6): columnSettings with
 * `draggable: true` renders drag handles; dropping one row's handle onto
 * another reorders the columns through the ordered-columns state channel.
 * Selectors are structural (data-slot) so the spec is locale-independent.
 *
 * Migrated from tests/e2e/table-column-drag.spec.ts (E3 batch 4, engine swap +
 * dragTo replaced by a synthetic HTML5 DragEvent dispatch carrying the same
 * text/nop-table-column payload as the real onDragStart/onDrop handlers).
 *
 * TODO(migrate-debt): evaluate fallback (the handles are HTML5 draggable
 * elements; raw CDP mouse move/down/up sequences do not initiate native drag
 * interception in the flux driver, so the dragstart/drop pair is synthesized
 * with DataTransfer payloads matching the component's channel).
 */

async function readHeaderLabels(ft: FtGlobal): Promise<string[]> {
  const raw = await ft.evaluate(
    'Array.from(document.querySelector(\'[data-testid="column-drag-table"]\').querySelectorAll("thead th")).map((th)=>th.textContent.trim())',
  );
  return String(raw)
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((label) => label.trim());
}

export default async function tableColumnDrag(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await ft.goto('/#/lab/table');
  const table = ft.locator('[data-testid="column-drag-table"]');
  await ft.expectWeb(table).toBeVisible({ timeoutMs: 15_000 });

  const settingsPanel = ft.locator('[data-slot="table-column-settings"]').last();
  await settingsPanel.locator('button').first().click();
  const inlinePanel = settingsPanel.locator('[data-slot="table-column-settings-inline"]');
  await ft.expectWeb(inlinePanel).toBeVisible();

  const handles = inlinePanel.locator('[data-slot="table-column-settings-drag-handle"]');
  const items = inlinePanel.locator('[data-slot="table-column-settings-item"]');
  await ft.expectWeb(handles).toHaveCount(3);
  await ft.expectWeb(items).toHaveCount(3);

  // Drag the first row's handle (Name) onto the last row (Role).
  const sourceIndex = await handles.nth(0).attr('aria-label');
  if (sourceIndex === null) throw new Error('first drag handle missing aria-label');
  await ft.evaluate(
    `(()=>{
      const panel = Array.from(document.querySelectorAll('[data-slot="table-column-settings"]')).pop();
      const handles = panel.querySelectorAll('[data-slot="table-column-settings-drag-handle"]');
      const items = panel.querySelectorAll('[data-slot="table-column-settings-item"]');
      const dt = new DataTransfer();
      handles[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      items[2].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      items[2].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      handles[0].dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer: dt }));
    })()`,
  );

  // Verify the reorder result with an explicit retry loop carrying the last
  // actual header order into the failure.
  const deadline = Date.now() + 10_000;
  let labels: string[] = [];
  for (;;) {
    labels = await readHeaderLabels(ft);
    if (JSON.stringify(labels) === JSON.stringify(['Email', 'Role', 'Name'])) break;
    if (Date.now() > deadline) {
      throw new Error(`header order never became Email/Role/Name; last actual: ${JSON.stringify(labels)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await expectNoPageErrors(ft, 'table-column-drag');

  return { cases: 1 };
}
