import { expect, test, assertTrackedPageErrors } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

/**
 * C6.1 Phase 3 host scenarios (real browser, programmatic DOM asserts).
 *
 * 1. host-md-sanitize (bug 73 pattern): markdown content prop is scope-bound;
 *    switching it to a <script> payload must be stripped on the UPDATE path
 *    (allowHtml on) — the global flag the script would set stays undefined.
 *    Plus the env.fetcher remote-src path (INV-1) renders + error state.
 * 2. host-html-sanitize (bug 73 pattern): same dynamic-update sanitize
 *    re-verification for the html renderer.
 * 3. host-img-lifecycle: missing src shows the error fallback; switching the
 *    scope-bound src to a valid data URI clears the error and renders (no
 *    stuck fallback — regression for the sticky-errored-state fix).
 * 4. host-link-click: navigable link fires onClick (setValue) while keeping
 *    href; a javascript: href renders WITHOUT an href attribute and never
 *    executes script.
 * 5. host-json-empty: null shows the empty state; scope buttons switch the
 *    value to an object (tree appears) and back to null (empty returns).
 */

test('markdown-host: dynamic content sanitize re-verification + env.fetcher src (host-md-sanitize, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('markdown');

  // --- Dynamic content update path (sanitize gate re-verified on UPDATE) ---
  const slug = scenarioSlug(
    'Host dynamic markdown content + sanitize re-verification (C6.1 bug 73 pattern)',
  );
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const md = stage.locator('[data-testid="c6c1-md"]');
  await expect(md).toBeVisible({ timeout: 10_000 });
  await expect(md).toHaveAttribute('data-allow-html', 'true');
  await expect(md.locator('h2')).toHaveText('Safe', { timeout: 10_000 });

  await stage.getByRole('button', { name: 'Set malicious content' }).click();
  await expect(md.locator('h2')).toHaveText('Evil', { timeout: 10_000 });
  // <b> survived the sanitize gate on the update path
  await expect(md.locator('b')).toHaveText('still bold');
  // <script> is stripped on the update path — no script element
  expect(await md.locator('script').count()).toBe(0);
  // and the script never executed
  const mdFired = await page.evaluate(
    () => (window as unknown as { __C6C1_MD_XSS__?: boolean }).__C6C1_MD_XSS__,
  );
  expect(mdFired).toBeUndefined();

  // switch back to safe content — still renders, still clean
  await stage.getByRole('button', { name: 'Set safe content' }).click();
  await expect(md.locator('h2')).toHaveText('Safe', { timeout: 10_000 });

  // --- Remote src via env.fetcher (INV-1): renders fetched content; failing source shows error ---
  const srcSlug = scenarioSlug('Host remote src markdown via env.fetcher (C6.1)');
  const srcStage = lab.scenarioStage(srcSlug);
  await expect(srcStage).toBeVisible({ timeout: 10_000 });

  const srcMd = srcStage.locator('[data-testid="c6c1-md-src"]');
  await expect(srcMd).toBeVisible({ timeout: 10_000 });
  await expect(srcMd.locator('h1')).toHaveText('Fetched from env.fetcher', { timeout: 10_000 });
  await expect(srcMd).toHaveAttribute('data-src-loaded', 'true');

  const srcErr = srcStage.locator('[data-testid="c6c1-md-src-err"]');
  await expect(srcErr).toBeVisible({ timeout: 10_000 });
  await expect(srcErr).toHaveAttribute('data-state', 'error', { timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('html-host: dynamic content sanitize re-verification (host-html-sanitize, bug 73 pattern)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('html');

  const slug = scenarioSlug(
    'Host dynamic html content + sanitize re-verification (C6.1 bug 73 pattern)',
  );
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const html = stage.locator('[data-testid="c6c1-html"]');
  await expect(html).toBeVisible({ timeout: 10_000 });
  await expect(html.locator('p')).toHaveText('Safe html', { timeout: 10_000 });

  await stage.getByRole('button', { name: 'Set malicious content' }).click();
  await expect(html.locator('p')).toHaveText('Evil html', { timeout: 10_000 });
  await expect(html.locator('strong')).toHaveText('html');
  // <script> stripped on the update path
  expect(await html.locator('script').count()).toBe(0);
  const htmlFired = await page.evaluate(
    () => (window as unknown as { __C6C1_HTML_XSS__?: boolean }).__C6C1_HTML_XSS__,
  );
  expect(htmlFired).toBeUndefined();

  await stage.getByRole('button', { name: 'Set safe content' }).click();
  await expect(html.locator('p')).toHaveText('Safe html', { timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('image-host: fail fallback + retry on src update (host-img-lifecycle)', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('image');

  const slug = scenarioSlug('Host image fail + retry on src update (C6.1 host-img-lifecycle)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  // initial scope value is a missing src → error fallback (root div, data-state=error)
  const errorRoot = stage.locator('[data-testid="c6c1-image"][data-state="error"]');
  await expect(errorRoot).toBeVisible({ timeout: 10_000 });
  await expect(errorRoot.locator('[data-slot="image-fallback"]')).toContainText('lifecycle image');

  // switch the scope-bound src to a valid data URI → error clears, image renders
  // (the img element itself carries the testid — root role flips from fallback div to img)
  await stage.getByRole('button', { name: 'Set valid src' }).click();
  await expect(stage.locator('img[data-testid="c6c1-image"]')).toBeVisible({ timeout: 10_000 });
  await expect(stage.locator('img[data-testid="c6c1-image"]')).toHaveAttribute(
    'src',
    /data:image\/svg\+xml/,
    { timeout: 10_000 },
  );

  // back to a missing src → error fallback returns (state toggles both ways)
  await stage.getByRole('button', { name: 'Set missing src' }).click();
  await expect(errorRoot).toBeVisible({ timeout: 10_000 });

  await assertTrackedPageErrors(page);
});

test('link-host: onClick + href coexist, javascript: href stripped (host-link-click)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('link');

  const slug = scenarioSlug(
    'Host link onClick + href coexist + javascript: href stripped (C6.1)',
  );
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const link = stage.locator('[data-testid="c6c1-link"]');
  await expect(link).toBeVisible({ timeout: 10_000 });
  expect((await link.getAttribute('href')) || '').toContain('/#/lab/link');
  await expect(stage.locator('[data-testid="c6c1-link-report"]')).toHaveText(
    'link-clicked:pending',
  );
  await link.click();
  await expect(stage.locator('[data-testid="c6c1-link-report"]')).toHaveText(
    'link-clicked:true',
    { timeout: 10_000 },
  );

  // javascript: href → no href attribute at all, label still renders
  const evil = stage.locator('[data-testid="c6c1-link-evil"]');
  await expect(evil).toBeVisible({ timeout: 10_000 });
  expect(await evil.getAttribute('href')).toBeNull();
  await expect(evil).toHaveText('Unsafe javascript href');
  await evil.click();
  const linkFired = await page.evaluate(
    () => (window as unknown as { __C6C1_LINK_XSS__?: boolean }).__C6C1_LINK_XSS__,
  );
  expect(linkFired).toBeUndefined();

  await assertTrackedPageErrors(page);
});

test('json-view-host: null empty state + dynamic value update (host-json-empty)', async ({
  page,
}) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('json-view');

  const slug = scenarioSlug('Host json-view null empty + dynamic value update (C6.1)');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible({ timeout: 10_000 });

  const tree = stage.locator('[data-testid="c6c1-json"]');
  await expect(tree).toBeVisible({ timeout: 10_000 });
  // null → empty state
  await expect(tree).toHaveAttribute('data-state', 'empty', { timeout: 10_000 });
  await expect(tree).toContainText('No data to inspect');

  // scope button pushes an object → tree renders (no errors)
  await stage.getByRole('button', { name: 'Set object value' }).click();
  await expect(tree.locator('.json-viewer')).toBeVisible({ timeout: 10_000 });
  await expect(tree).toContainText('Alice');
  await expect(tree).not.toHaveAttribute('data-state', 'empty');

  // back to null → empty state returns
  await stage.getByRole('button', { name: 'Set null' }).click();
  await expect(tree).toHaveAttribute('data-state', 'empty', { timeout: 10_000 });

  await assertTrackedPageErrors(page);
});
