import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C2.5 Phase 3 composite host scenarios (real browser, programmatic DOM asserts):
 *
 * 1. host-md-submit (bug 73 pattern): markdown-editor inside a form — real typing,
 *    live preview follows, submit, valuesPath publishes the committed source into
 *    the page scope where an outer text echoes it. This is the explicit
 *    "unit-green but real-browser-broken" (bug 73) check for this component.
 * 2. host-md-xss (sanitize gate, dimension 18): the source contains a script tag,
 *    a javascript: markdown link and an img onerror payload. The preview must
 *    escape the raw HTML (no script/img elements, no link href) and must not
 *    execute any of it (window flag stays undefined).
 * 3. host-md-echo: an external setValue action updates the scope value; both the
 *    textarea and the preview echo the new value (no stale value, no loop).
 * 4. host-md-disabled: disabled/readOnly editors block the textarea and hide the
 *    toolbar while the preview still renders.
 */

test('markdown-editor-host: composite submit publishes the typed source (bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('markdown-editor');

  const slug = scenarioSlug('Markdown editor composite submit (bug 73 pattern)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const textarea = stage.locator('[data-testid="markdown-editor-textarea"]');
  await textarea.fill('# Host markdown\n\nTyped in the **browser**.');

  // Live preview follows the keystrokes.
  await expect(stage.locator('[data-testid="markdown-editor-preview"] h1')).toHaveText(
    'Host markdown',
  );

  await stage.getByRole('button', { name: 'Submit' }).click();
  await expect(stage.getByTestId('md-submit-report')).toContainText(
    'MD-SUBMIT:# Host markdown',
    { timeout: 5_000 },
  );
});

test('markdown-editor-host: XSS payload is sanitized in the preview (no script/img/href, no execution)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('markdown-editor');

  const slug = scenarioSlug('XSS payload preview sanitize');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const preview = stage.locator('[data-testid="markdown-editor-preview"]');
  await expect(preview).toBeVisible({ timeout: 10_000 });

  // The payload never becomes executable HTML in the preview. react-markdown
  // escapes raw HTML (no script/img elements) and strips the javascript: scheme
  // (the link renders with an empty href — no dangerous URL lands in the DOM).
  await expect(preview.locator('script')).toHaveCount(0);
  await expect(preview.locator('img')).toHaveCount(0);
  await expect(preview.locator('a[href^="javascript:"]')).toHaveCount(0);

  // The raw HTML survives only as escaped literal text.
  await expect(preview).toContainText('<script>window.__mdXssExecuted = 1</script>');
  await expect(preview).toContainText('<img src=x onerror');

  // Nothing executed in the page context.
  const executed = await page.evaluate(() => (window as { __mdXssExecuted?: unknown }).__mdXssExecuted);
  expect(executed).toBeUndefined();
});

test('markdown-editor-host: controlled value echoes an external scope update', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('markdown-editor');

  const slug = scenarioSlug('Controlled markdown value echo');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const textarea = stage.locator('[data-testid="markdown-editor-textarea"]');
  await expect(textarea).toHaveValue('# Initial value');

  await stage.getByRole('button', { name: 'Set value from outside' }).click();

  await expect(textarea).toHaveValue('# Echoed externally', { timeout: 5_000 });
  await expect(stage.locator('[data-testid="markdown-editor-preview"] h1')).toHaveText(
    'Echoed externally',
  );
  await expect(stage.getByTestId('md-echo')).toHaveText('# Echoed externally');
});

test('markdown-editor-host: disabled and readOnly editors block input but keep the preview', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('markdown-editor');

  const slug = scenarioSlug('Disabled and read-only markdown editor');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();

  const disabledHost = stage.locator('[data-testid="md-disabled"]');
  await expect(disabledHost.locator('[data-testid="markdown-editor-textarea"]')).toBeDisabled();
  await expect(disabledHost.locator('[data-testid="md-toolbar-bold"]')).toHaveCount(0);
  await expect(disabledHost.locator('[data-testid="markdown-editor-preview"]')).toBeVisible();

  const readOnlyHost = stage.locator('[data-testid="md-readonly"]');
  await expect(readOnlyHost.locator('[data-testid="markdown-editor-textarea"]')).toHaveAttribute(
    'readonly',
    '',
  );
  await expect(readOnlyHost.locator('[data-testid="md-toolbar-bold"]')).toHaveCount(0);
  await expect(readOnlyHost.locator('[data-testid="markdown-editor-preview"]')).toBeVisible();
});
