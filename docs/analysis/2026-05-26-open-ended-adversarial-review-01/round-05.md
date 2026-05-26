# Open-Ended Adversarial Review — 2026-05-26 — Round 05

**Execution date**: 2026-05-26  
**Result directory**: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/`  
**Exploration areas**: maintenance scripts, package CSS export gates  
**Discovery source**: tooling trust audit after checking whether hard gates cover the package export shapes currently used in the repo

---

## Finding 1: `check-package-css-exports` reports green while skipping object-form CSS exports that current packages already use

- **Where**:
- `scripts/check-package-css-exports.mjs:9-17,37-62`
- `packages/flux-renderers-form/package.json:20-22`
- `packages/spreadsheet-renderers/package.json:16-18`
- `packages/flux-code-editor/package.json:16-18`
- `packages/report-designer-renderers/package.json:16-18`
- `packages/flow-designer-renderers/package.json:20-22`
- root `package.json:8,30,52`
- **What**: the CSS export checker only collects entries where the subpath ends with `.css` and the export target itself is a string. Several packages publish CSS subpaths using the common conditional/object export form, e.g. `"./form-renderers.css": { "default": "./dist/form-renderers.css" }`. Those entries are silently ignored. Running `pnpm check:package-css-exports` in this workspace prints `Verified 6 CSS export targets`, while repo search shows more CSS export subpaths than that because the object-form ones are not counted or validated.
- **Why it matters**: this script is part of both `pnpm check` and `pnpm lint`, so maintainers can reasonably treat a green result as proof that public CSS subpaths point at `dist` and not `src`. Today it does not validate about half of the active CSS export surface. A future package can regress to `{ "default": "./src/foo.css" }` or a missing/non-`dist` object target and the hard gate remains green, despite the exact historical problem this check is meant to prevent.
- **Confidence**: Certain
- **Non-duplication note**: this is related to CSS export hygiene, but not the already-fixed defect where a specific export pointed to `src`. The live issue is a checker blind spot: current object-form exports are excluded from the validation set.

## Round Assessment

This round found a tooling trust issue rather than a runtime bug. It is high ROI because the script already exists and is already wired into hard gates; broadening it to walk conditional export objects would immediately improve the reliability of those gates.

Immediate improvement direction: teach `collectCssExports()` to recursively collect string leaves from object export targets, preferably preserving the condition path in diagnostics. The success message should count CSS subpaths and resolved targets separately so a sudden drop in coverage is visible.

## Blind-Spot Self-Assessment

I sampled other tooling candidates but did not retain them here because some had already been fixed in live code or were lower confidence policy mismatches. A broader next pass should review all hard-gate scripts for “green but skipped current shape” behavior, especially scripts that parse package exports, Playwright test suites, or non-literal i18n keys.
