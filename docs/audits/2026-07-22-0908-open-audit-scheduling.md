> Audit Status: planned
> Audit Type: open-ended
> Mission: scheduling

# Open-Ended Adversarial Audit — Scheduling Package

**Date**: 2026-07-22, starting 09:08
**Method**: Code reading + cross-referencing prior audits (2026-07-22-0908 rounds 1-3, 2026-07-22-deep-audit dimensions 1-23, 2026-07-20/21 historical reviews) + parallel content search
**Pre-read**: AGENTS.md, react19-best-practices-review.md, reopened-design-decisions.md, docs/index.md

## Duplication strategy

All reported findings below have been cross-checked against the following prior reports to ensure novelty:

- `docs/analysis/2026-07-22-0908/` rounds 01-03 (convention violations, contract drift, dead code, error handling, test quality)
- `docs/analysis/2026-07-22-deep-audit-scheduling/` dimensions 01-23 (dependency graph, module boundaries, API surface, state ownership, reactive precision, async safety, lifecycle, validation, renderer contract, security/performance, display/positioning, integration/wiring, test effectiveness)
- `docs/analysis/2026-07-21-1920-open-audit-scheduling/` and earlier scheduling audits
- Relevant entries in `docs/references/reopened-design-decisions-and-audit-adjudications.md`

---

## Finding 1 — `dataFingerprintRef`: Dead Ref Across Two Components

**Where**:

- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:76,83`
- `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:150,157`

**What**: Both `Gantt` and `KanbanBoard` create a `useRef<number>(0)` called `dataFingerprintRef`, increment it (`dataFingerprintRef.current++`) when their primary data props change, but **never read the value** anywhere in the codebase. No dependency, no subscription, no conditional — pure write-only side effect.

Gantt (lines 76-86):

```typescript
const dataFingerprintRef = useRef<number>(0);
const prevDataRef = useRef<...>({});
useEffect(() => {
  const newData = { tasks: resolved.tasks, ... };
  const prev = prevDataRef.current;
  if (newData.tasks === prev.tasks && ...) return;
  prevDataRef.current = newData;
  dataFingerprintRef.current++;   // ← written but never read
  store.parse(...);
}, [store, resolved.tasks, ...]);
```

Kanban (lines 150-161):

```typescript
const dataFingerprintRef = useRef<number>(0);
const prevDataRef = useRef<BoardData | undefined>(undefined);
useEffect(() => {
  if (kanbanOwnership !== 'local') return;
  const newData = resolved.data as BoardData | undefined;
  if (newData === prevDataRef.current) return;
  prevDataRef.current = newData;
  dataFingerprintRef.current++; // ← written but never read
  if (newData) setLocalBoardData(newData);
}, [resolved.data, kanbanOwnership, setLocalBoardData]);
```

**Why this is worth caring about**:

1. **Pattern, not isolated instance**: The deep audit's D01-03 flagged dead variable assignments for deprecated Gantt props (`_progressBarHeight`, `_childrenField`, etc.), and Round 3 Finding 3.2 flagged the `_dirty` flag in `gantt-store.ts`. But neither report caught the `dataFingerprintRef` in both components. This is the same class of problem (write-only state) spread across two components — a pattern, not a one-off.

2. **Prior audit blind spot**: Deep audit dimension 04 (`04-state-ownership.md`) explicitly reviewed `dataFingerprintRef` and described it as "Correct". This is incorrect — the ref is dead code. The reviewer likely conflated `dataFingerprintRef` with the `prevDataRef` guard that does the actual comparison, assuming the fingerprint was consumed elsewhere.

3. **Maintenance signal**: The ref was clearly intended to be used (name suggests a fingerprint for change detection, similar to how Gantt's `_dirty` flag was meant to track dirtiness). The fact that both components independently introduced and left this incomplete pattern suggests a recurring blind spot: authors add a dirty-tracking ref but forget to wire the consumption side.

**Confidence**: Determinate — code analysis confirms zero reads of `dataFingerprintRef.current` across the entire package.

---

## Finding 2 — i18n Gap: Untranslated ARIA Labels in BarcodeInput

**Where**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:209,219`

**What**: Two ARIA labels are hardcoded English strings:

```typescript
aria-label="Clear"           // line 209
aria-label="Scan barcode"    // line 219
```

The same package (`@nop-chaos/flux-renderers-scheduling`) already depends on `@nop-chaos/flux-i18n` and uses it extensively:

- `calendar.tsx` — `t('scheduling.calendar.morningShift')`, `t('scheduling.noScheduleData')`, etc.
- `kanban-board.tsx` — `t('scheduling.kanban.searchCards')`, `t('scheduling.kanban.undo')`, etc.
- `barcode-scanner-overlay.tsx` — `t('flux.barcode.recognizing')`, `t('flux.cameraUnavailable')`, etc.

The barcode-input main component is the only UI in the scheduling package with zero `t()` calls.

**Why care**: ARIA labels are exposed to assistive technology. Screen reader users experience the UI in English regardless of the application's locale. For a low-code platform with a Chinese-first positioning (evidenced by `locale: 'zh-CN'` default in `calendar.tsx:78`), this creates an inconsistent accessibility experience.

**Root cause**: The barcode-input renderer was likely developed before the i18n conventions were applied to Calendar and Kanban, and was never retrofitted.

**Confidence**: Determinate — code shows no `t()` usage in `barcode-input.tsx`, only in the sibling `barcode-scanner-overlay.tsx`.

---

## Finding 3 — `@apply` Directives in Copy-Assembled CSS (Tailwind v4 Build Risk)

**Where**: `packages/flux-renderers-scheduling/src/calendar/calendar.css:2,6,10,14,18` (and other lines)

**What**: Calendar's CSS uses Tailwind v4 `@apply` directives:

```css
.nop-calendar {
  @apply flex flex-col h-full min-h-0;
}
.nop-calendar [data-event-type='shift'] {
  @apply bg-green-400;
}
```

These files are **copy-assembled** to `dist/` by the build script without Tailwind processing:

```
# package.json build script (line 58):
"build": "tsc -p tsconfig.build.json && node ../../scripts/copy-build-assets.mjs src/styles.css dist/styles.css src/calendar/calendar.css dist/calendar/calendar.css ..."
```

The `copy-build-assets.mjs` script copies CSS files as-is. `postcss`/`lightningcss` processing happens in the consumer's Vite pipeline, not during `pnpm build` for this package.

**Why care**: If a consumer imports the pre-built CSS (`@nop-chaos/flux-renderers-scheduling/styles.css` → `dist/styles.css`), the `@apply` directives reach the browser if the consumer's build tool does not process Tailwind directives in `node_modules`. In Tailwind v4 specifically:

- `@apply` is processed by the Tailwind CSS plugin during Vite compilation
- CSS files under `node_modules/` or workspace `dist/` are typically excluded from Tailwind's content scanning
- The `@source` directive in the playground's `styles.css` sources the `packages/` **source tree**, not the `dist/` output — the `@apply` directives in built output would not be processed

**Evidence of the issue**: The playground `apps/playground/src/styles.css` uses `@source "../../../packages"` which tells Tailwind to scan the source packages. But consumers importing from `dist/styles.css` would load files that have `@apply` already baked in but unresolved.

**Confidence**: Likely — depends on how the CSS is consumed. For the playground and Vite-based consumers in the monorepo, CSS goes through the Tailwind pipeline and `@apply` is resolved. But for direct CSS import consumers or non-Vite setups, the `@apply` directives will be left as invalid CSS.

---

## Overall Assessment

### Most interesting direction

The three findings share a common theme: **partial implementation left behind after a conscious design choice changed**:

- `dataFingerprintRef` suggests a planned fingerprint-based change detection that was replaced by direct reference comparison + `prevDataRef`. The ref stub was left as a write-only artifact.
- Barcode-input's i18n gap suggests the i18n convention was applied to Calendar and Kanban (the more complex renderers) but missed BarcodeInput (the simpler, earlier, or less-visited renderer).
- The `@apply` + copy-assembly pattern suggests the build pipeline was designed for a workflow where CSS processing happens at the consumer level, but `@apply` directives were introduced into files that are also published independently.

These aren't isolated bugs — they're **completeness gaps** at the boundary between a design decision and its execution sweep.

### Blind spot self-assessment

This review likely missed:

1. **Runtime behavior verification** — I didn't run the tests or the application. There could be runtime failures, flaky tests, or memory leaks that are invisible from code reading alone.
2. **The `gantt-grid.tsx` raw `<table>`/`<button>` elements** — Round 1 Finding 1.3 already covered these comprehensively. I verified the list but didn't look for additional instances.
3. **Cross-package contract drift** — I focused entirely on the scheduling package. The interface between scheduling definitions and the `RendererRegistry`/compiler layer could have type-level mismatches I didn't probe.
4. **Accessibility beyond i18n** — Keyboard navigation patterns, focus management, and screen reader announcements need manual testing.

If a next round is done, the highest-value entry point would be: **run `pnpm build` for the scheduling package and inspect the built CSS output** to confirm whether `@apply` directives survive to production, then verify the playground renders correctly with the built scheduling styles.
