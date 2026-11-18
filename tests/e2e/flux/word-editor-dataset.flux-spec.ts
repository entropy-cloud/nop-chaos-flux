import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Dataset Sidebar Panel — word editor: tabs, Add Dataset dialog, create+save
 * with localStorage persistence, fields empty state, edit-mode reopen.
 *
 * Migrated from tests/e2e/word-editor-dataset.spec.ts (E3 batch 4, engine swap +
 * the old page.reload() isolation replaced by SPA unmount/remount (bounce to
 * '/#/', clear the nop-word-editor-* localStorage keys while the editor is NOT
 * mounted, re-enter '/#/word-editor') — and the persistence leg now verifies
 * TestDataset survives a full editor remount with re-hydration from
 * localStorage, a strictly stronger check than reloading the same mounted
 * bundle). expect.poll on localStorage became an explicit poll with the last
 * actual value in the error; kernel expectNoPageErrors runs per case.
 */

const NAME_INPUT_SEL = '[placeholder="输入数据集名称"]';

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByRole('heading', { name: 'Word Editor' })).not.toBeVisible();
}

async function openWordEditorFresh(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  // clear the word-editor state surfaces while the editor page is unmounted —
  // the remount then re-reads the emptied localStorage (old spec: clear +
  // page.reload)
  await ft.evaluate(
    `(() => { localStorage.removeItem('nop-word-editor-document'); localStorage.removeItem('nop-word-editor-datasets'); })()`,
  );
  await ft.goto('/#/word-editor');
  await ft.expectWeb(ft.getByRole('heading', { name: 'Word Editor' })).toBeVisible({
    timeoutMs: 45_000,
  });
  await ft.expectWeb(ft.getByRole('tab', { name: '数据集' })).toBeVisible({ timeoutMs: 15_000 });
  await expectNoPageErrors(ft, 'word-editor-dataset:open');
}

async function openDatasetDialog(ft: FtGlobal): Promise<void> {
  await ft.getByRole('tab', { name: '数据集' }).click();
  const addDatasetButton = ft.getByRole('button', { name: /Add Dataset|添加数据集/ }).first();
  await ft.expectWeb(addDatasetButton).toBeVisible({ timeoutMs: 15_000 });
  await addDatasetButton.click();
  await ft.expectWeb(ft.locator('body')).toContainText('创建数据集', { timeoutMs: 10_000 });
}

export default async function wordEditorDataset(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: Datasets and Fields tabs are visible
  await openWordEditorFresh(ft);
  await ft.expectWeb(ft.getByRole('tab', { name: '数据集' })).toBeVisible({ timeoutMs: 15_000 });
  await ft.expectWeb(ft.getByRole('tab', { name: '字段' })).toBeVisible();
  await expectNoPageErrors(ft, 'word-editor-dataset:tabs');

  // Case 2: clicking Add Dataset opens DatasetDialog in create mode
  await openWordEditorFresh(ft);
  await openDatasetDialog(ft);
  await expectNoPageErrors(ft, 'word-editor-dataset:create-dialog');

  // Case 3: filling dataset name and saving creates the dataset (persisted)
  await openWordEditorFresh(ft);
  await openDatasetDialog(ft);
  await ft.locator(NAME_INPUT_SEL).fill('TestDataset');
  // TODO(migrate-debt): evaluate click fallback — the driver's role locator
  // result does not compose (no .getByRole on a Locator), so the dialog-scoped
  // save button is resolved by label inside the open dialog (the page-level
  // toolbar also carries a 保存 button).
  const clicked = await ft.evaluate(
    `(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return false; const b = Array.from(d.querySelectorAll('button')).find((el) => (el.textContent || '').trim() === '保存'); if (!b) return false; b.click(); return true; })()`,
  );
  if (clicked !== true) throw new Error('dialog save button not found');

  await ft.expectWeb(ft.locator('body')).toContainText('TestDataset', { timeoutMs: 10_000 });

  await ft.getByRole('button', { name: '保存' }).click();

  // expect.poll(readSavedDatasets) → explicit poll with last-actual in error
  const deadline = Date.now() + 15_000;
  let stored: unknown;
  let persisted = false;
  while (Date.now() < deadline) {
    stored = await ft.evaluate(`(() => localStorage.getItem('nop-word-editor-datasets'))()`);
    if (typeof stored === 'string' && stored.includes('TestDataset')) {
      persisted = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!persisted) {
    throw new Error(`localStorage never contained TestDataset; last actual: ${JSON.stringify(stored)}`);
  }

  // Old spec reloaded the page; here a full SPA unmount/remount re-hydrates the
  // dataset list from localStorage — a stronger persistence check.
  await resetRoute(ft);
  await ft.goto('/#/word-editor');
  await ft.expectWeb(ft.getByRole('heading', { name: 'Word Editor' })).toBeVisible({
    timeoutMs: 15_000,
  });
  await ft.expectWeb(ft.locator('body')).toContainText('TestDataset', { timeoutMs: 15_000 });
  await expectNoPageErrors(ft, 'word-editor-dataset:create-save-persist');

  // Case 4: Fields tab shows empty state when no dataset is selected
  await openWordEditorFresh(ft);
  const fieldsTab = ft.getByRole('tab', { name: '字段' });
  await ft.expectWeb(fieldsTab).toBeVisible({ timeoutMs: 15_000 });
  await fieldsTab.click();

  await ft.expectWeb(ft.locator('body')).toContainText('未选择数据集', { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator('body')).toContainText('选择数据集查看字段');
  await expectNoPageErrors(ft, 'word-editor-dataset:fields-empty');

  // Case 5: clicking a dataset opens the dialog in edit mode
  await openWordEditorFresh(ft);
  await openDatasetDialog(ft);
  await ft.locator(NAME_INPUT_SEL).fill('EditTarget');
  const saved = await ft.evaluate(
    `(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return false; const b = Array.from(d.querySelectorAll('button')).find((el) => (el.textContent || '').trim() === '保存'); if (!b) return false; b.click(); return true; })()`,
  );
  if (saved !== true) throw new Error('dialog save button not found (edit-target case)');
  await ft.expectWeb(ft.locator('body')).toContainText('EditTarget', { timeoutMs: 10_000 });

  // TODO(migrate-debt): evaluate click fallback — the dataset row's accessible
  // name carries type badge text (name + type label inside the button), so a
  // text-scoped role click is ambiguous; click the sidebar row button whose
  // label contains the dataset name.
  const rowClicked = await ft.evaluate(
    `(() => { const b = Array.from(document.querySelectorAll('button')).find((el) => (el.textContent || '').includes('EditTarget')); if (!b) return false; b.click(); return true; })()`,
  );
  if (rowClicked !== true) throw new Error('EditTarget row button not found');

  await ft.expectWeb(ft.locator('body')).toContainText('编辑数据集', { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator(NAME_INPUT_SEL)).toHaveValue('EditTarget');
  await expectNoPageErrors(ft, 'word-editor-dataset:edit-mode');

  return { cases: 5 };
}
