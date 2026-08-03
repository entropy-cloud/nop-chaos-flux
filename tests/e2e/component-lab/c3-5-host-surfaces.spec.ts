import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C3.5 Phase 3 media & rich-text family host scenarios (real browser,
 * programmatic DOM asserts):
 *
 * 1. host-mr-editor (bug 73 pattern): form editor edit → store → submit; the
 *    echo publishes the committed HTML value.
 * 2. host-mr-sanitize: stored HTML carrying <script> / javascript: link —
 *    the rendered editor and the committed value stay sanitized (XSS red line).
 * 3. host-mr-editor-link (P1-1/P1-2 real-browser proof): link toolbar button
 *    opens the URL prompt; a safe URL becomes an <a href> in the committed
 *    value; a javascript: URL is rejected and never lands in the value.
 * 4. host-mr-upload-ok/fail (bug 73 pattern): input-file upload succeeds
 *    (value writeback) and fails (error state, clean value); submit echoes.
 * 5. host-mr-image-ok/fail (bug 73 pattern): input-image thumbnail + failure.
 * 6. host-mr-tree-lazy (bug 73 pattern): input-tree + tree-select remote
 *    childrenSource lazy load, failure + retry, submit echoes committed values.
 *
 * The lab runs zh-CN by default, so i18n chrome labels are matched with
 * locale-agnostic patterns.
 */

const SUBMIT = /Submit|提交/;

test('media-rich-host: editor edit + submit echo (bug 73 pattern)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('editor');

  const slug = scenarioSlug('Host form editor edit + submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const content = stage.locator('[data-testid="editor-content"]');
  await expect(content).toBeVisible({ timeout: 10_000 });
  await expect(content.locator('strong')).toHaveText('rich');

  // Append text through the real editing surface.
  await content.click();
  await page.keyboard.type(' appended');

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('mr-editor-echo');
  await expect(echo).toContainText('MR-EDITOR:', { timeout: 5_000 });
  await expect(echo).toContainText('appended');
  await expect(echo).toContainText('<strong>rich</strong>');

  await assertTrackedPageErrors(page);
});

test('media-rich-host: editor sanitize boundary (XSS red line)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('editor');

  const slug = scenarioSlug('Host editor sanitize boundary');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const content = stage.locator('[data-testid="editor-content"]');
  await expect(content).toBeVisible({ timeout: 10_000 });

  // The stored <script> / javascript: payload never reaches the editable DOM.
  expect(await stage.locator('.ProseMirror script').count()).toBe(0);
  expect(await content.getByText('alert(1)').count()).toBe(0);

  // Force a commit by typing; the committed value must stay sanitized.
  await content.click();
  await page.keyboard.type('x');

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('mr-sanitize-echo');
  await expect(echo).toContainText('MR-SANITIZE:', { timeout: 5_000 });
  await expect(echo).not.toContainText('<script');
  await expect(echo).not.toContainText('javascript:');
  await expect(echo).not.toContainText('alert(1)');

  await assertTrackedPageErrors(page);
});

test('media-rich-host: link button applies safe URL and rejects javascript: (P1-1/P1-2)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('editor');

  const slug = scenarioSlug('Host form editor link + submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const content = stage.locator('[data-testid="editor-content"]');
  await expect(content).toBeVisible({ timeout: 10_000 });
  await expect(content).toContainText('link me');

  // Safe URL → the committed value contains the anchor.
  await content.click();
  await page.keyboard.press('ControlOrMeta+a');
  page.once('dialog', (dialog) => dialog.accept('https://example.com/doc'));
  await stage.getByTestId('editor-toolbar-link').click();

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('mr-link-echo');
  await expect(echo).toContainText('MR-LINK:', { timeout: 5_000 });
  await expect(echo).toContainText('https://example.com/doc');

  // javascript: URL → rejected; nothing lands in the value. Then dismiss the
  // prompt (null) to unset the link, so the final committed value has no
  // anchor at all.
  await content.click();
  await page.keyboard.press('ControlOrMeta+a');
  page.once('dialog', (dialog) => dialog.accept('javascript:alert(1)'));
  await stage.getByTestId('editor-toolbar-link').click();

  await content.click();
  await page.keyboard.press('ControlOrMeta+a');
  page.once('dialog', (dialog) => dialog.dismiss());
  await stage.getByTestId('editor-toolbar-link').click();

  await stage.getByRole('button', { name: SUBMIT }).click();
  await expect(echo).toContainText('MR-LINK:', { timeout: 5_000 });
  await expect(echo).not.toContainText('javascript:');
  await expect(echo).not.toContainText('<a');

  await assertTrackedPageErrors(page);
});

test('media-rich-host: input-file upload success + failure + submit echo (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-file');

  const slug = scenarioSlug('Host form upload success + failure (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const okInput = stage.locator('input[data-testid="nop-input-file-input"]').nth(0);
  await okInput.setInputFiles({
    name: 'contract.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('fake-pdf'),
  });
  await expect(
    stage.locator('[data-testid="nop-input-file-item"][data-item-status="done"]').first(),
  ).toBeVisible({ timeout: 10_000 });

  const failInput = stage.locator('input[data-testid="nop-input-file-input"]').nth(1);
  await failInput.setInputFiles({
    name: 'bad.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('bad'),
  });
  await expect(
    stage.locator('[data-testid="nop-input-file-item"][data-item-status="error"]').first(),
  ).toBeVisible({ timeout: 10_000 });
  await expect(stage.locator('[data-testid="nop-input-file-missing-action"]')).toHaveCount(0);

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('mr-upload-echo');
  await expect(echo).toContainText('MR-UPLOAD:', { timeout: 5_000 });
  await expect(echo).toContainText('"ok":"https://cdn.example.com/contract.pdf"');
  // Failed upload never polluted the field value.
  await expect(echo).not.toContainText('bad.txt');

  await assertTrackedPageErrors(page);
});

test('media-rich-host: input-image upload + thumbnail + failure (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-image');

  const slug = scenarioSlug('Host form image upload success + failure (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const okInput = stage.locator('input[data-testid="nop-input-image-input"]').nth(0);
  await okInput.setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-png'),
  });
  const thumb = stage.locator('[data-testid="nop-input-image-thumbnail"]').first();
  await expect(thumb).toBeVisible({ timeout: 10_000 });
  await expect(thumb).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');

  const failInput = stage.locator('input[data-testid="nop-input-image-input"]').nth(1);
  await failInput.setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('bad'),
  });
  await expect(
    stage.locator('[data-testid="nop-input-image-item"][data-item-status="error"]').first(),
  ).toBeVisible({ timeout: 10_000 });

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('mr-image-echo');
  await expect(echo).toContainText('MR-IMAGE:', { timeout: 5_000 });
  await expect(echo).toContainText('"ok":"https://cdn.example.com/avatar.png"');
  await expect(echo).not.toContainText('broken.png');

  await assertTrackedPageErrors(page);
});

test('media-rich-host: tree lazy children load + failure retry + submit echo (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('input-tree');

  const slug = scenarioSlug('Host form remote lazy children + retry (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  // Success tree: expand Dept A (ArrowRight on the treeitem) → children arrive.
  // Note: the treeitem accessible name includes the chevron aria-label
  // ("展开 Dept A"), so match with a regex.
  const deptA = stage.getByRole('treeitem', { name: /Dept A/ });
  await expect(deptA).toBeVisible({ timeout: 10_000 });
  await deptA.focus();
  await page.keyboard.press('ArrowRight');
  const subA = stage.getByRole('treeitem', { name: /Sub A of a/ });
  await expect(subA).toBeVisible({ timeout: 10_000 });
  await subA.click();

  // Failure tree: expand Dept C → inline error + retry → retry succeeds.
  const deptC = stage.getByRole('treeitem', { name: /Dept C/ });
  await expect(deptC).toBeVisible({ timeout: 10_000 });
  await deptC.focus();
  await page.keyboard.press('ArrowRight');
  await expect(stage.locator('[data-slot="tree-option-lazy-error"]')).toBeVisible({
    timeout: 10_000,
  });
  await stage.locator('[data-slot="tree-option-lazy-retry"]').click();
  const retried = stage.getByRole('treeitem', { name: /Retried child of c/ });
  await expect(retried).toBeVisible({ timeout: 10_000 });
  await retried.click();

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('mr-tree-echo');
  await expect(echo).toContainText('MR-TREE:', { timeout: 5_000 });
  await expect(echo).toContainText('"node":"a-a"');
  await expect(echo).toContainText('"nodeFail":"c-r"');

  await assertTrackedPageErrors(page);
});

test('media-rich-host: tree-select lazy children load + failure retry + submit echo (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('tree-select');

  const slug = scenarioSlug('Host form remote lazy children + retry (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const okTrigger = stage.getByRole('button', { name: /Remote lazy tree select/ });

  // Success tree-select: open trigger, expand Dept A, select a lazy child.
  // Popover content renders in a portal → query via page-level locators.
  await okTrigger.click();
  const deptA = page.getByRole('treeitem', { name: /Dept A/ });
  await expect(deptA).toBeVisible({ timeout: 10_000 });
  await deptA.focus();
  await page.keyboard.press('ArrowRight');
  const subA = page.getByRole('treeitem', { name: /Sub A of a/ });
  await expect(subA).toBeVisible({ timeout: 10_000 });
  await subA.click();
  await expect(okTrigger).toContainText('Sub A of a');

  // Failure tree-select: open its trigger, expand Dept D → inline error + retry → success.
  const failTrigger = stage.getByRole('button', { name: /Lazy tree select with failure/ });
  await failTrigger.click();
  const deptD = page.getByRole('treeitem', { name: /Dept D/ });
  await expect(deptD).toBeVisible({ timeout: 10_000 });
  await deptD.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-slot="tree-option-lazy-error"]')).toBeVisible({
    timeout: 10_000,
  });
  await page.locator('[data-slot="tree-option-lazy-retry"]').click();
  const retried = page.getByRole('treeitem', { name: /Retried child of d/ });
  await expect(retried).toBeVisible({ timeout: 10_000 });
  await retried.click();

  await stage.getByRole('button', { name: SUBMIT }).click();
  const echo = stage.getByTestId('mr-tree-select-echo');
  await expect(echo).toContainText('MR-TREESELECT:', { timeout: 5_000 });
  await expect(echo).toContainText('"node":"a-a"');
  await expect(echo).toContainText('"nodeFail":"d-r"');

  await assertTrackedPageErrors(page);
});
