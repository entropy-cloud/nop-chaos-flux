import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

/**
 * W3d markdown-editor — split edit + preview composition, plus plan 480
 * (visual quality V10, A3/A5/A7): autoGrow geometry + toolbar spec + preview
 * typography. Pass/fail is fully programmatic.
 *
 * Migrated from tests/e2e/w3d-markdown-editor.spec.ts (E3 batch 2, engine swap +
 * locator.evaluate → ft.evaluate(document.querySelector), expectComputedStyle →
 * ft.evaluate getComputedStyle helper with the same exact-string comparisons).
 * Upgrade: per-case isolation via resetRoute bounce gated on the target page's
 * heading (Playwright relied on fresh pages), and the toolbar svg "visible"
 * check is strengthened into an exact toHaveCount(1) + computed 16px size probe
 * (driver isVisible only accepts HTMLElement, not SVGElement).
 */

const EDITOR = '[data-testid="demo-markdown-editor"]';
const TEXTAREA = `${EDITOR} textarea[data-testid="markdown-editor-textarea"]`;
const PREVIEW = `${EDITOR} [data-testid="markdown-editor-preview"]`;
const HEADING_NAME = '高级输入族 — period / markdown-editor / upload / editor';

async function openW3d(ft: FtGlobal): Promise<void> {
  // goto to the same URL is a no-op (and ft.reload() destroys the CDP context),
  // so per-case isolation bounces through '/#/' and gates on the target page's h1.
  await ft.goto('/#/');
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 10_000 });
  await ft.expectWeb(ft.locator(TEXTAREA)).not.toBeVisible();
  await ft.goto('/#/w3d-advanced-input-family');
  await ft.expectWeb(ft.getByRole('heading', { name: HEADING_NAME, level: 1 })).toBeVisible({
    timeoutMs: 20_000,
  });
}

// TODO(migrate-debt): evaluate fallback (no locator.evaluate in the driver —
// computed style / geometry probes go through document.querySelector).
async function computedStyle(ft: FtGlobal, selector: string, prop: string): Promise<string> {
  const value = await ft.evaluate(
    `(function(){
      var el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      return getComputedStyle(el).getPropertyValue(${JSON.stringify(prop)});
    })()`,
  );
  return String(value ?? '');
}

async function expectComputedStyle(ft: FtGlobal, selector: string, prop: string, expected: string): Promise<void> {
  const actual = await computedStyle(ft, selector, prop);
  if (actual !== expected) {
    throw new Error(`computed ${prop} of ${selector}: expected "${expected}", got "${actual}"`);
  }
}

async function heightOf(ft: FtGlobal): Promise<number> {
  const h = await ft.evaluate(
    `(function(){
      var el = document.querySelector(${JSON.stringify(TEXTAREA)});
      return el ? el.getBoundingClientRect().height : null;
    })()`,
  );
  if (h === null || h === undefined) throw new Error('markdown textarea missing');
  return Math.round(Number(h));
}

export default async function w3dMarkdownEditor(ft: FtGlobal): Promise<{ cases: number }> {
  // Case 1: typing markdown updates the live preview and writes back to scope
  await openW3d(ft);

  const report = ft.locator('[data-testid="md-report"]');
  await ft.expectWeb(report).toContainText('md:# Hello');

  const textarea = ft.locator(TEXTAREA);
  await textarea.waitFor('visible', { timeoutMs: 10_000 });

  // Replace contents: the preview area should render a level-1 heading.
  await textarea.fill('# Title from editor');
  await ft.expectWeb(report).toHaveText('md:# Title from editor', { timeoutMs: 10_000 });

  const preview = ft.locator(PREVIEW);
  await ft.expectWeb(preview.locator('h1')).toHaveText('Title from editor');

  await expectNoPageErrors(ft, 'w3d-markdown:typing');

  // Case 2: viewMode preview renders the markdown without an editor textarea.
  // The split editor is present by default; the preview area renders the
  // initial markdown (heading + bold + code span).
  await openW3d(ft);

  const defaultPreview = ft.locator(PREVIEW);
  await ft.expectWeb(defaultPreview.locator('h1')).toHaveText('Hello');
  await ft.expectWeb(defaultPreview.locator('strong')).toHaveText('markdown');
  await ft.expectWeb(defaultPreview.locator('code')).toHaveText('code');

  await expectNoPageErrors(ft, 'w3d-markdown:viewmode');

  // Case 3: autoGrow — rows=8 baseline grows with content and clamps at the max
  await openW3d(ft);

  const ta = ft.locator(TEXTAREA);
  await ta.waitFor('visible', { timeoutMs: 10_000 });

  // rows={8} initial/min height (text-sm → well above 100px, far below max).
  const baseline = await heightOf(ft);
  if (!(baseline > 100)) throw new Error(`baseline height ${baseline} not > 100`);

  // Content beyond the baseline grows the textarea (monotonic increase).
  const grownContent =
    '# Title\n\n' + Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join('\n');
  await ta.fill(grownContent);
  const grown = await heightOf(ft);
  if (!(grown > baseline)) throw new Error(`grown height ${grown} not > baseline ${baseline}`);

  // Very long content clamps at 480px (internal scroll, no layout stretch).
  const clampedContent = Array.from({ length: 120 }, (_, i) => `Very long content line ${i + 1}`).join('\n');
  await ta.fill(clampedContent);
  const clamped = await heightOf(ft);
  if (clamped !== 480) throw new Error(`clamped height ${clamped} !== 480`);
  const scrollsInternally = await ft.evaluate(
    `(function(){
      var el = document.querySelector(${JSON.stringify(TEXTAREA)});
      return el ? el.scrollHeight > el.clientHeight : null;
    })()`,
  );
  if (scrollsInternally !== true) {
    throw new Error(`textarea does not scroll internally (probe=${String(scrollsInternally)})`);
  }

  // Shrinking back re-clamps at the baseline, never below the rows=8 height.
  await ta.fill('# small');
  const shrunk = await heightOf(ft);
  if (shrunk !== baseline) throw new Error(`shrunk height ${shrunk} !== baseline ${baseline}`);

  await expectNoPageErrors(ft, 'w3d-markdown:autogrow');

  // Case 4: toolbar buttons carry the unified ghost geometry (h-7 min-w-7)
  await openW3d(ft);

  const toolbarSel = `${EDITOR} button[data-testid="md-toolbar-bold"]`;
  const toolbarButton = ft.locator(toolbarSel).first();
  await ft.expectWeb(toolbarButton).toBeVisible();
  await expectComputedStyle(ft, toolbarSel, 'height', '28px');
  await expectComputedStyle(ft, toolbarSel, 'min-width', '28px');
  // driver isVisible rejects SVGElement → exact count + computed size instead of toBeVisible
  await ft.expectWeb(ft.locator(`${toolbarSel} svg`)).toHaveCount(1);
  await expectComputedStyle(ft, `${toolbarSel} svg`, 'width', '16px'); // size-4

  await expectNoPageErrors(ft, 'w3d-markdown:toolbar');

  // Case 5: preview typography resolves the scoped .nop-markdown h1 size
  await openW3d(ft);

  const previewH1 = ft.locator(`${PREVIEW} h1`).first();
  await ft.expectWeb(previewH1).toHaveText('Hello');
  // `.nop-markdown h1 { font-size: 1.5rem }` → 24px (UA default would be 32px).
  await expectComputedStyle(ft, `${PREVIEW} h1`, 'font-size', '24px');

  await expectNoPageErrors(ft, 'w3d-markdown:typography');

  return { cases: 5 };
}
