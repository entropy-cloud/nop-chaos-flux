import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * Template Expression Insertion — word editor.
 *
 * Migrated from tests/e2e/word-editor-template-expr.spec.ts (E3 batch 2, engine swap +
 * assertTrackedPageErrors upgraded to kernel white-box expectNoPageErrors after
 * the editor mount and at suite end — stricter than the old console-only tracking).
 * The old per-test fresh-page opens collapsed into one editor session: the
 * sign-in handshake is re-implemented with driver isVisible polling + real CDP
 * input, and each dialog case gates on explicit open/close state (the dialog
 * component stays mounted across cancel/reopen, so its tab state persists —
 * case 7 restores the EL tab; Base UI's lingering exit-state popup requires
 * waiting for full popup unmount before toolbar clicks).
 */

const DIALOG_TITLE = '插入模板表达式';

async function waitForVisible(ft: FtGlobal, isVisible: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isVisible()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

async function openWordEditor(ft: FtGlobal): Promise<void> {
  // '/#/' (never '/' — a non-hash goto navigates the document and destroys the
  // runner's CDP evaluation context)
  await ft.goto('/#/');

  const signInButton = ft.getByRole('button', { name: 'Sign in' });
  if (await waitForVisible(ft, () => signInButton.isVisible(), 2000)) {
    await signInButton.click();

    if (await waitForVisible(ft, () => signInButton.isVisible(), 1500)) {
      await ft.getByRole('textbox', { name: 'Username' }).fill('admin');
      await ft.getByRole('textbox', { name: 'Password' }).fill('123456');
      await signInButton.click();
    }

    if (await waitForVisible(ft, () => signInButton.isVisible(), 1500)) {
      await ft.getByRole('textbox', { name: 'Username' }).fill('nop');
      await ft.getByRole('textbox', { name: 'Password' }).fill('123');
      await signInButton.click();
    }
  }

  await ft.expectWeb(signInButton).toHaveCount(0, { timeoutMs: 10_000 });

  // the home card's accessible name includes eyebrow+description; RegExp = partial
  await ft.getByRole('button', { name: /Word Editor/ }).click();
  await ft.expectWeb(ft.getByRole('heading', { name: 'Word Editor' })).toBeVisible({ timeoutMs: 15_000 });
  await expectNoPageErrors(ft, 'word-editor:open');
}

// visible-dialog probe: the popup is position:fixed (offsetParent always null).
// CLOSED must mean the popup node is fully unmounted — a lingering exit-state
// popup (animating or zero-rect) still intercepts pointer events and blocks
// toolbar clicks, so treat any in-DOM popup as "open".
async function isDialogOpen(ft: FtGlobal): Promise<boolean> {
  const inDom = await ft.evaluate(
    `(() => !!document.querySelector('[data-slot="dialog-content"]'))()`,
  );
  return inDom === true;
}

// wait until the dialog popup node is fully unmounted (a lingering exit-state
// popup still intercepts pointer events and blocks toolbar clicks)
async function waitForDialogGone(ft: FtGlobal): Promise<void> {
  for (let i = 0; i < 30; i++) {
    if (!(await isDialogOpen(ft))) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('dialog popup never unmounted');
}

async function openDialog(ft: FtGlobal): Promise<void> {
  await ft.getByTestId('insert-expression').click();
  await ft.expectWeb(ft.locator('body')).toContainText(DIALOG_TITLE, { timeoutMs: 5_000 });
}

export default async function wordEditorTemplateExpr(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);
  await openWordEditor(ft);

  // Case 1: Insert Expression button is visible in toolbar
  const insertExprButton = ft.getByTestId('insert-expression');
  await ft.expectWeb(insertExprButton).toBeVisible({ timeoutMs: 15_000 });

  // Case 2: clicking Insert Expression opens ExprInsertDialog
  await openDialog(ft);

  // Case 3: EL Expression type is selected by default (dialog already open)
  const elTab = ft.getByRole('tab', { name: 'EL 表达式' });
  await ft.expectWeb(elTab).toBeVisible();
  // driver has no getByPlaceholder; attribute selector is equivalent
  await ft.expectWeb(ft.locator('[placeholder="${entity.fieldName}"]')).toBeVisible();

  // Case 4: XPL Tag type can be selected
  const xplTab = ft.getByRole('tab', { name: 'XPL 标签' });
  await xplTab.click();
  await ft.expectWeb(ft.locator('body')).toContainText('标签名称');
  // old spec used page-level combobox.last(), but the editor toolbar's font
  // select also matches — scope to the dialog element instead (same target)
  const dialogEl = ft.getByRole('dialog');
  const tagSelect = dialogEl.locator('select').last();
  await ft.expectWeb(tagSelect).toBeVisible();

  // Case 5: tag name dropdown shows available tags
  await ft.expectWeb(tagSelect).toHaveValue('c:if');
  const tags = ['c:if', 'c:for', 'c:forEach', 'c:choose', 'c:when', 'c:otherwise', 'c:set', 'c:out'];
  for (const tag of tags) {
    await ft.expectWeb(tagSelect.locator(`option[value="${tag}"]`)).toHaveCount(1);
  }

  // Case 6: Cancel closes the dialog
  await ft.getByRole('button', { name: '取消' }).click();
  await waitForDialogGone(ft);

  // Case 7: confirming an EL expression closes the dialog after input is provided.
  // NOTE: the old spec opened a fresh page per test, so the dialog always came
  // back on the EL tab; here the dialog component stays mounted across
  // cancel/reopen and its tab state survives, so restore the EL tab explicitly.
  // place the caret via a real CDP click at the canvas center (locator click
  // is unreliable on the <canvas> surface) — BEFORE opening the dialog: a
  // canvas click while the dialog is open registers as an outside-click and
  // closes it
  const canvasBox = await ft.locator('canvas').first().boundingBox();
  if (!canvasBox) throw new Error('editor canvas bounding box missing');
  await ft.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await new Promise((resolve) => setTimeout(resolve, 300));
  await openDialog(ft);
  await new Promise((resolve) => setTimeout(resolve, 600));
  // NOTE: the dialog component stays mounted across cancel/reopen, so its tab
  // state (XPL after case 4) survives — the old fresh-page spec always got the
  // EL default here. Restore the EL tab, then gate on the EL textarea.
  // TODO(migrate-debt): evaluate fallback (tab trigger re-activation via
  // synthetic click — role-selector clicks are ambiguous against the stale
  // popup's duplicated triggers)
  await ft.evaluate(
    `(() => { const popups = Array.from(document.querySelectorAll('[data-slot="dialog-content"]')).filter((p) => p.getBoundingClientRect().width > 0); const scope = popups.length ? popups[popups.length - 1] : document; const t = Array.from(scope.querySelectorAll('[role="tab"]')).find((el) => el.textContent === 'EL 表达式'); if (t) t.click(); })()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  const elReady = await ft.evaluate(
    `(() => { const ta = document.querySelector('[placeholder="\${entity.fieldName}"]'); if (!ta) return false; const r = ta.getBoundingClientRect(); const cs = getComputedStyle(ta); return r.width > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; })()`,
  );
  if (!elReady) throw new Error('EL expression textarea never became visible after reopen');
  const marker = `customer.name_${Date.now()}`;
  await ft.locator('[placeholder="${entity.fieldName}"]').fill(marker);
  // TODO(migrate-debt): evaluate fallback (the confirm button's regex role
  // selector is ambiguous against other app buttons; click the one inside the
  // visible dialog)
  await ft.evaluate(
    `(() => { const popups = Array.from(document.querySelectorAll('[data-slot="dialog-content"]')).filter((p) => p.getBoundingClientRect().width > 0); const scope = popups.length ? popups[popups.length - 1] : document; const b = Array.from(scope.querySelectorAll('button')).find((el) => /确定|确认|Insert/i.test(el.textContent || '')); if (b) b.click(); })()`,
  );
  await waitForDialogGone(ft);

  await expectNoPageErrors(ft, 'word-editor:dialog-lifecycle');

  return { cases: 7 };
}
