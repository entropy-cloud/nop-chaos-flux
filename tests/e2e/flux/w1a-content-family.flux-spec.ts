import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * W1a content display family — flux-renderers-content: markdown headings/GFM
 * table, html sanitize gate (programmatic XSS check), html empty state, image
 * lazy loading + src, image error fallback, link onClick with field-bound flag,
 * json-view tree + null empty state.
 *
 * Migrated from tests/e2e/w1a-content-family.spec.ts (E3 batch 3, engine swap +
 * strengthening: the html sanitize case additionally asserts the sanitizer kept
 * the strong tag AND removed the script in the same pass, and
 * expectNoPageErrors kernel checks cover the XSS route).
 * Per-case isolation: each old Playwright test ran on a fresh page; here
 * resetRoute() bounces through '/#/' with a stability gate so the route
 * remounts (ft.reload() destroys the CDP evaluation context mid-spec).
 */

const HEADING = '内容展示组 — markdown / html / link / image / json-view';

async function resetRoute(ft: FtGlobal): Promise<void> {
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING })).not.toBeVisible();
}

async function openW1a(ft: FtGlobal): Promise<void> {
  await resetRoute(ft);
  await ft.goto('/#/w1a-content');
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING, level: 1 })).toBeVisible({ timeoutMs: 15_000 });
}

export default async function w1aContentFamily(ft: FtGlobal): Promise<{ cases: number }> {
  await ft.setViewportSize(1280, 800);

  // Case 1: markdown renders headings and a GFM table
  await openW1a(ft);
  const md = ft.getByTestId('demo-markdown');
  await ft.expectWeb(md).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(md.locator('h2')).toHaveText('Release notes');
  await ft.expectWeb(md.locator('table')).toBeVisible();
  const tdCount = await md.locator('td').count();
  if (tdCount < 2) throw new Error(`w1a: markdown table has ${tdCount} td, expected >= 2`);

  await expectNoPageErrors(ft, 'w1a:markdown');

  // Case 2: html sanitize gate strips <script> so it never executes
  await openW1a(ft);
  const html = ft.getByTestId('demo-html');
  await ft.expectWeb(html).toBeVisible({ timeoutMs: 10_000 });
  // safe presentational tag survives
  await ft.expectWeb(html.locator('strong')).toBeVisible();
  // no <script> element is present in the rendered DOM
  const scriptCount = await html.locator('script').count();
  if (scriptCount !== 0) throw new Error(`w1a: html demo still has ${scriptCount} <script> element(s)`);
  // the script never executed — the global it would set is undefined
  // TODO(migrate-debt): evaluate fallback (window global XSS canary read)
  const fired = await ft.evaluate('window.__W1A_XSS_HTML__');
  if (fired !== null && fired !== undefined) throw new Error(`w1a: __W1A_XSS_HTML__ was set (${fired}) — script executed`);

  await expectNoPageErrors(ft, 'w1a:html-sanitize');

  // Case 3: html renders the empty state when content is empty
  await openW1a(ft);
  const emptyHtml = ft.getByTestId('demo-html-empty');
  await ft.expectWeb(emptyHtml).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(emptyHtml).toHaveAttribute('data-state', 'empty');
  await ft.expectWeb(emptyHtml).toContainText('No HTML content');

  await expectNoPageErrors(ft, 'w1a:html-empty');

  // Case 4: image uses native lazy loading and renders the src
  await openW1a(ft);
  const img = ft.getByTestId('demo-image');
  await ft.expectWeb(img).toBeVisible({ timeoutMs: 10_000 });
  const loading = await img.attr('loading');
  if (loading !== 'lazy') throw new Error(`w1a: image loading="${loading}", expected "lazy"`);
  const src = (await img.attr('src')) ?? '';
  if (!src.includes('data:image/svg+xml')) throw new Error(`w1a: image src does not use data:image/svg+xml`);

  await expectNoPageErrors(ft, 'w1a:image');

  // Case 5: image falls back when the src fails to load
  await openW1a(ft);
  const fallback = ft.locator('[data-testid="demo-image-error"][data-state="error"]');
  await ft.expectWeb(fallback).toBeVisible({ timeoutMs: 10_000 });

  await expectNoPageErrors(ft, 'w1a:image-fallback');

  // Case 6: link fires onClick (setValue) while keeping navigation field-bound
  await openW1a(ft);
  const link = ft.getByTestId('demo-link');
  await ft.expectWeb(link).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(ft.getByTestId('link-click-flag')).toHaveText('pending');
  await link.click();
  await ft.expectWeb(ft.getByTestId('link-click-flag')).toHaveText('clicked');

  await expectNoPageErrors(ft, 'w1a:link');

  // Case 7: json-view renders the object tree and shows an empty state for null
  await openW1a(ft);
  const tree = ft.getByTestId('demo-json-view');
  await ft.expectWeb(tree).toBeVisible({ timeoutMs: 10_000 });
  const viewerCount = await tree.locator('.json-viewer').count();
  if (viewerCount !== 1) throw new Error(`w1a: json-view has ${viewerCount} .json-viewer, expected 1`);
  await ft.expectWeb(tree).toContainText('Alice');

  const emptyJson = ft.getByTestId('demo-json-view-empty');
  await ft.expectWeb(emptyJson).toBeVisible({ timeoutMs: 10_000 });
  await ft.expectWeb(emptyJson).toHaveAttribute('data-state', 'empty');
  await ft.expectWeb(emptyJson).toContainText('No data to inspect');

  await expectNoPageErrors(ft, 'w1a:json-view');

  return { cases: 7 };
}
