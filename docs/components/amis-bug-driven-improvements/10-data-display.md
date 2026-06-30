# 10 Data Display (chart / image / rich-text / dynamic-renderer / timeline) — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/chart/design.md`, `image/design.md`, `markdown/design.md`, `markdown-editor/`, `dynamic-renderer/design.md`, `timeline/design.md`
> amis cluster: `renderers/chart` (27), `renderers/image` (20), `renderers/rich-text` (50), `renderers/custom` (91)
> Priority summary: Flux chart uses recharts (not echarts), dynamic-renderer has a clean contract, markdown via a library. The residual gaps are chart empty-state/flash/min-size, markdown XSS/escape boundary, image object-coercion, and the custom/dynamic-renderer scope-read contract.
> Triage: ~250 titles scanned + ~25 deep-reads → 14 entries.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis data-display designs Flux rejects)

| amis feature                                                    | Reason rejected                                                        | AMIS-REF              |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------- |
| echarts config pass-through / echarts extensions / geo map      | Flux chart uses recharts; echarts too large                            | (whole chart cluster) |
| amis `markdown` static `value` only                             | Flux content is scope-reactive (see DD5)                               | #2536                 |
| amis `custom` ad-hoc onChange signature / `props.data` snapshot | Flux dynamic-renderer reads scope via runtime scope selector (see DD8) | #4693, #2377, #2665   |

---

## A. Chart

| #   | Property                                                                                                                                       | Signal     | Severity | AMIS-REF                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| DD1 | Chart defines an explicit empty state (`[]`/`null`/`undefined` data) — renders an empty placeholder region, never an error or "Invalid Value". | DESIGN-GAP | P1       | #1657                                                                                                                                     |
| DD2 | Chart data updates update in place (no remount/flash); recharts `ResponsiveContainer` data prop mutation is the default path.                  | DESIGN-GAP | P1       | #5183                                                                                                                                     |
| DD3 | Chart `height`/`width` from schema takes effect; renderer does NOT emit a hardcoded `min-height`/`min-width` that overrides author dimensions. | DESIGN-GAP | P1       | #4365, #6167                                                                                                                              |
| DD4 | Chart polling (via data-source `interval`) aborts/clears timers on unmount (no leaked requests after navigation).                              | TEST-GAP   | P2       | #4037 — **RESOLVED (B7)**: covered-by B5.1 L1 surface-teardown-GC + B2.2 data-source interval lifecycle (timers cleared on owner dispose) |

**Recommended actions:**

- DD1: Add design note to `chart/design.md`: chart defines explicit empty state (empty/null/`[]` → placeholder), align with data-source empty contract.
- DD2: Add design note: chart data updates update in place (no remount/flash).
- DD3: Add design note: chart height/width is author-controlled; renderer must not emit hardcoded min-size.

**Recommended tests:**

- DD1: chart bound to `[]`/`null`/`undefined` → empty placeholder, no error toast.
- DD2: chart with polling/auto-refresh source → container element identity stable between updates (only data series change).
- DD3: chart `height:"100px"` → computed height 100px, not 300px.
- DD4: chart with interval/polling source; unmount → no further network requests (fetcher spy); timer cleared.

---

## B. Image

| #   | Property                                                                                                                                                    | Signal     | Severity | AMIS-REF                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DD5 | When an image `src`/`url` expression resolves to a non-string (object), the renderer coerces or skips gracefully — never renders literal "[object Object]". | TEST-GAP   | P2       | #1700 — **RESOLVED (B7)**: watch-only (image src object→graceful coerce/skip construct-true defensive; P2 low-risk)                                            |
| DD6 | An images gallery bound to a multi-value field (array or delimited string) splits/normalizes deterministically; the accepted source shape is documented.    | TEST-GAP   | P2       | #2057 — **RESOLVED (B7)**: watch-only (images gallery multi-value split deterministic construct-true; P2 niche)                                                |
| DD7 | Image loading (esp. auth-protected) supports a fetcher-backed mode (resolve via data-source → data URI), not always raw `<img src>`.                        | DESIGN-GAP | P2       | #3588 — **RESOLVED (B7)**: out-of-scope-feature (image fetcher-backed mode for auth-protected sources is a distinct feature; image renders URL directly today) |

**Recommended tests:**

- DD5: image `src` resolving to object `{url:...}` vs string → preview uses resolved string/accessor, never "[object Object]".
- DD6: images `name`/source bound to (a) array of URLs, (b) comma-delimited string → correct N thumbnails.

**Recommended action DD7:** Add design note to `image/design.md`: "image/images support a fetcher-backed mode for auth-protected sources; raw URL remains default." (Verify flux already has this; if so, just a doc/test gap.)

---

## C. Rich-Text / Markdown

| #   | Property                                                                                                                  | Signal   | Severity | AMIS-REF |
| --- | ------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------- |
| DD8 | Markdown/rich-text content is reactive to scope (`value`/expression bound), not snapshot-at-mount.                        | TEST-GAP | P1       | #2536    |
| DD9 | A markdown `src`/external-content fetch runs exactly once per distinct src (re-fires only when src changes), never loops. | TEST-GAP | P0       | #3814    |

> **Severity note:** DD9 is rated P0 because an infinite-request loop is catastrophic (page/app exhaustion) when it occurs, not because it is known to recur across many amis versions — it is anchored to the single #3814 report. The same "fetch once per distinct dep, never per render" property is the generic fix.
> | DD10 | Explicit markdown sanitization policy: (a) rendered HTML is sanitized (allowlist, XSS-safe); (b) code-block content is preserved verbatim (no entity-escaping of quotes inside ```). These are distinct concerns. | DESIGN-GAP | P1 | #6317 |
| DD11 | When a third-party rich-text editor is mounted inside a dialog/drawer, its internal aux popups stack above the surface; flux exposes `useGlobalZIndex()`/a z-index-floor context for editor integrators. | DESIGN-GAP | P2 | #1052, #1205, #1384 — **RESOLVED (B7)**: watch-only (rich-text editor aux-popup z-index depends on editor aux; surface stacking construct-true; P2 low-risk) |

**Recommended actions:**

- DD8: Add design note to `markdown/design.md`: content is scope-reactive via `value`/expression, not static-only.
- DD10: Add design note to `markdown/design.md`: define (a) HTML sanitization policy (allowlist, XSS-safe), (b) code-block verbatim preservation (no double-escaping). Distinct concerns.
- DD11: Add design note to `markdown-editor`/rich-text design: editor-in-surface requires popup z-index coordination; flux exposes `useGlobalZIndex()`/z-index-floor context.

**Recommended tests:**

- DD8: markdown `value:"${md}"`; mutate scope → rendered HTML updates.
- DD9: markdown with `src` to remote .md → fetch fires exactly once per distinct src (fetcher spy).
- DD10: markdown with code block containing `'` and `"` → literal preservation; markdown with `<script>` → sanitized/neutralized.
- DD11: rich-text editor in a dialog → open editor dropdown/picker → renders above dialog backdrop (not occluded).

---

## D. Custom / Dynamic-Renderer

| #    | Property                                                                                                                                                                                                                                                 | Signal     | Severity | AMIS-REF                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| DD12 | A dynamic/custom renderer reads scope via the runtime scope selector (live, not stale snapshot); value writeback uses the standard owner value channel with a documented stable signature; reading data-source/loader results is reactive, not one-time. | DESIGN-GAP | P1       | #4693, #2377, #2665                                                                                                                            |
| DD13 | A dynamic/custom renderer's scope is its lexical parent scope (live); `componentId`/name resolution is scoped to the correct owner subtree, not a global singleton; two same-named instances don't collide.                                              | TEST-GAP   | P1       | #1183, #2169                                                                                                                                   |
| DD14 | Value binding is explicit and symmetric: set AND clear both propagate to the renderer.                                                                                                                                                                   | TEST-GAP   | P2       | #2801, #1568 — **RESOLVED (B7)**: covered-by B5.2 DD8 markdown reactivity + DD13 dynamic-renderer live-scope (symmetric set+clear propagation) |

**Recommended actions:**

- DD12: Add design note to `dynamic-renderer/design.md`: "custom/dynamic renderers read scope via the runtime scope selector (live, not stale snapshot); value writeback uses the standard owner value channel with a documented stable signature; loader results are reactive."
- DD13: Add design note: "dynamic-renderer scope is lexical and per-instance; componentId resolution is isolated per owner subtree."

**Recommended tests:**

- DD12: dynamic-renderer reading a scope value that a data-source updates later → renderer sees updated value (no stale snapshot).
- DD13: (a) dynamic-renderer nested in row/surface scope → reads row scope, not page root; (b) two instances same internal componentId/name → targeting one doesn't affect the other.
- DD14: dynamic-renderer bound to a value; externally clear to undefined/'' → renderer receives cleared update, renders accordingly.

---

## Highest-Leverage Items

1. **DD9** — markdown `src` infinite-request loop (catastrophic when it fails).
2. **DD10** — markdown XSS/escape policy (security + correctness).
3. **DD12/DD13** — dynamic-renderer live-scope read + lexical scope isolation (amis's most-confused custom contract).
4. **DD2/DD3** — chart in-place update + no hardcoded geometry (styling-system violations).
