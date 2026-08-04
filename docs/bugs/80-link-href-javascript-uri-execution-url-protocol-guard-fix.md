# 80 Link Href javascript: URI Execution — URL Protocol Guard Fix

## Problem

- `link` renderer passed `href` straight into `<a href>` with no protocol validation.
- A schema-driven `href: "${item.link}"` bound to untrusted data could be `javascript:alert(...)` — clicking executes script in the page origin (stored XSS via data-bound link).
- The html/markdown sanitize gate strips `javascript:` URIs (DOMPurify), so the content family's security posture was inconsistent: rich HTML content was sanitized, plain navigation links were not.

## Diagnostic Method

- C6.1 component audit, dimension 18 (URL 协议校验) — checklist explicitly names "URL 协议校验（link href/javascript: 协议）" as a red-line focus.
- Inspected `link.tsx:24-26`: href resolved from `slotProps.href` and forwarded verbatim to the anchor (`link.tsx:52`).
- Confirmed no scheme filter existed anywhere in the renderer path (grep for `javascript:` in renderer sources only hit the sanitize gate).
- Decisive evidence: `isSafeNavigationUrl` test-first — `javascript:alert(1)` rendered a live `href="javascript:alert(1)"` attribute in the DOM (failing assertion), and no e2e/unit test covered the scheme boundary.

## Root Cause

- `link.tsx` treated `href` as a plain string prop with no URL-scheme contract; unlike `html`/`markdown` (which route content through the DOMPurify gate), there was no analogous guard for the anchor's navigation URL.
- `href` is a `kind:'prop'` — it can be an expression binding (`${item.link}`), so renderer-side validation is the only reliable enforcement point (the runtime cannot know which scheme is "intended").

## Fix

- Added `isSafeNavigationUrl(url)` to `packages/flux-renderers-content/src/sanitize.ts`: allowlist of `http:`/`https:`/`mailto:`/`tel:`/`data:` plus scheme-less relative URLs (`/x`, `#a`, `./y`, `plain`); any other explicit scheme (`javascript:`, `vbscript:`, `blob:`, `file:`, case-insensitive) is rejected.
- `data:` is deliberately allowed: it is the framework's established download-link mechanism (CRUD export flow `crud-views-export.json` writes a `data:text/csv` URL into a link href, e2e-tested), and data: navigation opens an opaque-origin document that cannot access the opener — the red line is script execution in the _page's own_ context (`javascript:`).
- `link.tsx` now resolves `href` to `undefined` when `isSafeNavigationUrl` fails — the label still renders, the anchor is not navigable (fail-safe), consistent with the disabled path which also drops `href`.
- Documented the contract in `docs/components/link/design.md` §12.

## Tests

- `packages/flux-renderers-content/src/link.test.tsx` — "drops javascript: hrefs entirely (URL protocol guard)" (href attribute null, label intact); "keeps safe schemes and relative URLs, drops javascript:/vbscript:" (8-case table: https/relative/#anchor/./mailto/data: preserved; javascript:/vbscript: dropped).
- `packages/flux-renderers-content/src/sanitize.test.ts` — `isSafeNavigationUrl` allowlist/reject matrix incl. case-insensitive `JaVaScRiPt:`.
- Test-first: both link tests failed before the guard (href passed through), passed after.

## Affected Files

- `packages/flux-renderers-content/src/link.tsx`
- `packages/flux-renderers-content/src/sanitize.ts`
- `packages/flux-renderers-content/src/link.test.tsx`
- `packages/flux-renderers-content/src/sanitize.test.ts`
- `docs/components/link/design.md`

## Notes For Future Refactors

- Any new navigation-capable renderer (anchor/button-as-link/iframe-src) must run href/src through `isSafeNavigationUrl` — do not assume schema authors only write safe URLs.
- The allowlist lives in `sanitize.ts` next to the DOMPurify gate so the whole content-family URL security contract stays in one module; keep it in sync with the sanitize gate's `javascript:` stripping. Note the two gates differ on `data:` deliberately (link guard allows data: download hrefs; DOMPurify's stricter default blocks data: in rich HTML content) — do not "unify" them without re-adjudicating the export flow.
- Fail-safe semantics: unsafe href → no `href` attribute (not a warning, not a replaced URL) — label remains visible; tests lock this in.
