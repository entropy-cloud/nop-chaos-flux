# E2E Test Diagnostic Guide (Project-Specific)

> **Read first**: `templates/age-app-template/docs/references/playwright-e2e-guide.md` for the generic Playwright diagnostic methodology, decision tree, layered verification strategy, and anti-patterns.
>
> This document adds nop-chaos-flux-specific patterns on top of the generic guide.

## Project Configuration

- **Playwright config**: `playwright.config.ts` (root)
- **Test directory**: `tests/e2e/`
- **Default port**: 4175 (via `PLAYWRIGHT_PORT` env var)
- **Dev server**: `pnpm --filter @nop-chaos/flux-playground dev --host 127.0.0.1 --port ${port} --strictPort`

## Project-Specific Inline Diagnostic Script

```bash
pnpm exec node -e "const { chromium } = require('@playwright/test'); (async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('http://127.0.0.1:4175/#/<PATH>', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  const text = await page.textContent('body');
  const debuggerState = await page.evaluate(() => window.__NOP_DEBUGGER_API__?.getState?.() ?? null);
  console.log(JSON.stringify({ errors, text: text?.substring(0, 500), debuggerState }, null, 2));
  await browser.close();
})();"
```

The `__NOP_DEBUGGER_API__` is the nop-chaos-flux runtime debugger. It exposes:

- `getState()` — full runtime state including nodes, scope data, errors
- `getNodes()` — rendered node tree
- `getRecentEvents(N)` — last N runtime events
- `getFailures()` — accumulated failure records

## Project-Specific Failure Patterns

### Tailwind v4 Class Not Generated

**Signature**: `toBeVisible` fails, element exists in DOM, `getComputedStyle` shows no styles.

**Cause**: Tailwind v4 in a pnpm monorepo doesn't scan all packages by default.

**Fix**: Check `apps/playground/src/styles.css` — the `@source` directive must cover the changed package.

**Reference**: `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md`

### Schema Compilation / Registration Error

**Signature**: Node shows `<!-- unregistered: xxx -->` in HTML, or "Loading..." state that never resolves. No console error.

**Fix**: Check `packages/flux-renderers-*/src/*-renderer-definitions.ts` for missing renderer registration.

### Dynamic Renderer / LoadAction Timeout

**Signature**: `loadAction-loaded schema renders the returned fragment` times out at 45s. The renderer stays in "Loading..." state.

**Root cause pattern**: The `loadAction` returns a schema fragment, but the schema-compiler's compilation key changes on re-render, causing a mismatch between the expected and actual compiled schema.

**Diagnostic**: Check `page.evaluate(() => window.__NOP_DEBUGGER_API__?.getNodes?.())` — if nodes show `text: "Loading..."` with no failures, the loadAction is not resolving. If events show loadAction completed but nodes still loading, it's a schema compilation key mismatch.

### Async Data Race in Table / CRUD Renderers

**Signature**: Table-based tests (`performance-table`, `crud-*`) timeout. First run fails, retry passes.

**Fix**: Replace `page.waitForTimeout(N)` with `page.waitForResponse(url => url.includes('api/'))` or `await expect(locator).toBeVisible({ timeout: 10000 })`.

## Most Failure-Prone Tests

Based on analysis of 997 test runs across 118 sessions:

| Test File                              | Runs | Fail Rate | Typical Issue                               |
| -------------------------------------- | ---- | --------- | ------------------------------------------- |
| `tailwind-css-scan.spec.ts`            | 24   | 91.7%     | CSS not generated; `@source` directive      |
| `playground-entry-pages.spec.ts`       | 25   | 84.0%     | Page routing; dev server not ready          |
| `performance-table-deep-state.spec.ts` | 13   | 76.9%     | Async data race; pagination state           |
| `debugger.spec.ts`                     | 79   | 69.6%     | Debugger API timing; automation explanation |
| `action-logic.spec.ts`                 | 53   | 62.3%     | Dynamic renderer; reaction timing           |
| `layout-content.spec.ts`               | 53   | 60.4%     | Fragment/tabs/recurse rendering race        |
| `performance-table.spec.ts`            | 62   | 59.7%     | Scenario mode switching; timeout            |

## Project-Specific Verification Levels

In addition to the generic layered strategy:

| Change scope                                                      | What to run                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------- |
| Single renderer widget                                            | The one `.spec.ts` for that renderer                 |
| Shared infrastructure (`flux-react`, `flux-runtime`, `flux-core`) | All `component-lab/*.spec.ts`                        |
| CSS / Tailwind / styling                                          | `tailwind-css-scan.spec.ts` + relevant renderer spec |
| Renderer registration or schema compilation                       | `action-logic.spec.ts` + `layout-content.spec.ts`    |
| Before commit / PR                                                | Full `pnpm test:e2e`                                 |
