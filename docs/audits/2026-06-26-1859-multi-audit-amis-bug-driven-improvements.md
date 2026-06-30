> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: amis-bug-driven-improvements

# Multi-Dimensional Audit — `amis-bug-driven-improvements`

- **Audit date**: 2026-06-26
- **Scope**: `packages/` — code, config, tests, public contracts (exports / API surface)
- **Baseline**: v1 / no compatibility burden / no transitional main-path allowances
- **Method**: `docs/skills/deep-audit-prompts.md` — Phase 1 iterative deep-dive (one round per dimension) + Phase 2 independent review (mandatory, not skipped)
- **Dimensions executed**: 01, 02, 03, 04, 06, 08, 09, 13, 14, 16 (10 dimensions — directly mapped to the requested focus)
- **Tooling baselines consumed**: `pnpm check:oversized-code-files` (exit 1), `pnpm check:audit-suspects` (327 matches / 11 buckets), `pnpm check:workspace-manifest-deps` (PASS), `pnpm check:active-doc-code-anchors` (PASS), plus `check:audit-missing-renderer-markers`, `check:audit-runtime-raw-schema-reads` etc.

## Headline Result

**Issues found.** After independent review: **22 retained findings** (1×P0, 2×P1, 6×P2, 13×P3), **3 downgraded**, **3 rejected**.

Final verdict tag for this mission: `<AI_STEP_RESULT>issues</AI_STEP_RESULT>`

## Review Statistics

- Deep-dive findings (deduped across dimensions): 25
- Independent re-review against live code: 25/25
- Retained: 19 as-filed + 3 reclassified = **22**
- Downgraded: 3 (02-F1 split, 06-F1 P2→P3, 14-F2 P2→P3)
- Rejected: 3 (08-F4, 09-F3, 09-F5) — see "Rejected candidates" below
- Cross-dimension duplicates merged: crud compile-once (03/09), crud cast chain (03/09/13), flux-bundle name (03/16)

---

## P0 — Must fix (CI red line)

### [AUDIT-01] `pnpm check:oversized-code-files` gate is RED — 7 files exceed the >700 hard rule

- **Files**:
  - `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx` (797)
  - `packages/flux-renderers-data/src/__tests__/chart-renderer.unit.test.tsx` (767)
  - `packages/flux-runtime/src/form-store.ts` (744)
  - `packages/flux-runtime/src/__tests__/runtime-sources-refresh.test.ts` (741)
  - `packages/flux-runtime/src/form-runtime-owner.ts` (728)
  - `packages/flux-renderers-mobile/src/infinite-scroll.test.tsx` (704)
  - `packages/flux-compiler/src/schema-compiler/node-compiler.ts` (701)
- **Severity**: P0 (CI hard gate `check:oversized-code-files` exits 1; this is an architectural red line per AGENTS.md)
- **Evidence**: `pnpm check:oversized-code-files` → `[check-oversized-code-files] ERROR: 7 files exceed 700 lines (MUST split)` + `process.exit(1)`.
- **Status / Risk**: The gate is currently failing. `form-runtime-owner.ts` and `node-compiler.ts` carry documented justification (single orchestrator builder `buildFormOwnerRuntime`; explicit `Plan 444 / 02-N1` decision comment at `node-compiler.ts:57-65`) — but the hard gate does not exempt justified files, so they keep CI red until either split or an explicit gate exemption mechanism is added. The 4 test files and `form-store.ts` have no such justification.
- **Recommendation**: Split the 4 test files along existing `describe` boundaries (no logic change). Split `form-store.ts` (see P2 [AUDIT-04]). For `form-runtime-owner.ts` / `node-compiler.ts`: either extract or introduce a documented, opt-in gate exemption referencing the decision.
- **False-positive exclusion**: Verified exit code is 1, not a passing-gate duplicate. Calibration pattern #1 explicitly keeps findings that "cross the repo's hard >700 line rule."
- **Review status**: retained (P0) — independent review corrected the initial undercount (4 → 7 files).

---

## P1 — Should fix soon (core contract drift)

### [AUDIT-02] CRUD renderer reads raw `props.schema.item` / `props.schema.card` at runtime and recompiles the carrier (compile-once violation)

- **File**: `packages/flux-renderers-data/src/crud-renderer.tsx:449-476`
- **Evidence**:
  ```ts
  449: const rawSchema = props.schema;
  ...
  460: item: rawSchema.item,        // runtime read of raw schema region fragment
  ...
  469: card: rawSchema.card,        // runtime read of raw schema region fragment
  476: ? props.helpers.render(carrierSchema, { scope: crudScope, pathSuffix: listMode })  // triggers recompile
  ```
- **Severity**: P1
- **Status**: `crud-renderer-definition.ts` already declares `card`/`item` as `kind: 'region'`, so compiled handles (`props.regions.card` / `props.regions.item`) exist. The renderer ignores them, falls back to the raw schema fragments, assembles a synthetic `list`/`cards` schema, and `helpers.render()` recompiles on every render. A `key={listMode:...:selectedRowKeys.length}` remount workaround masks the cost. Sibling `dynamic-renderer.tsx` already shows the correct path (`props.props.loadAction`).
- **Risk**: Core contract drift (compile-once, `docs/architecture/renderer-runtime.md` "Compile once, execute many times"). Re-compilation per page/selection change; masked only by React Compiler memoization. Regression-prone. `runtime-raw-schema-read` suspect is rated `high`.
- **Recommendation**: Consume `item`/`card` as precompiled regions (`props.regions.item.render(...)`); delete the synthetic-carrier recompile + keyed-remount workaround. (Tracked as residual C-03; v1 baseline does not exempt residuals that are already on the main path.)
- **Cross-ref**: dimensions 03-F01, 09-F01 (same defect).
- **Review status**: retained (P1).

### [AUDIT-03] CRUD→TableRenderer synthesizes full `RendererComponentProps<TableSchema>` with `as unknown as` casts

- **File**: `packages/flux-renderers-data/src/crud-renderer.tsx:363, 376-381, 389`
- **Evidence**:
  ```ts
  363: const tableEvents = props.events as unknown as RendererComponentProps<TableSchema>['events'];
  376: templateNode: props.templateNode as unknown as RendererComponentProps<TableSchema>['templateNode'],
  378: node: { ...props.node, scope: crudScope } as unknown as RendererComponentProps<TableSchema>['node'],
  389: regions: props.regions as RendererComponentProps<TableSchema>['regions'],   // plain `as` (compatible)
  ```
- **Severity**: P1
- **Status**: CRUD impersonates TableRenderer's upstream, hand-assembling a `RendererComponentProps<TableSchema>` and force-casting `events` / `templateNode` / `node` across two concrete, strongly-typed schema shapes. The plain `as` on `regions` proves the author could distinguish compatible vs incompatible fields yet applied the strongest assertion to the 3 incompatible ones.
- **Risk**: Any future TableRenderer reliance on a `TableSchema`-specific field of `templateNode` / event payload / node will compile silently and fail at runtime under the CRUD path. **Correction from review**: this is **not** the only `as unknown as` in renderer src (there are ~16 across steps/wizard/grid/collapse/tree/etc.); what is genuinely unique is _synthesizing a full `RendererComponentProps` to invoke a sibling renderer_. The earlier "唯一处" wording was inaccurate.
- **Recommendation**: Introduce a typed delegation helper (`delegateRendererProps<Src,Dst>`) that whitelists structurally-compatible fields, or extract a loose-props internal function on TableRenderer; centralize the cast in a named, documented seam.
- **Cross-ref**: dimensions 03-F02, 09-F02, 13-F1 (same defect).
- **Review status**: retained (P1) with the count-claim correction.

---

## P2 — Schedule (real maintenance cost / local defect)

### [AUDIT-04] `form-store.ts` co-locates three independent stores; `createPageStore` / `createSurfaceStore` are zero-coupled and extractable

- **File**: `packages/flux-runtime/src/form-store.ts:636-743` (page store 636-661, surface store 663-743)
- **Severity**: P2 (downgraded from the combined P2+gate framing; the gate-red part is folded into P0 [AUDIT-01])
- **Status**: `createPageStore` and `createSurfaceStore` use only `createStore` / `setIn` and their own state types — no reference to any form-store internal helper (`diffAndNotify*`, `pathListeners`, `captureCommit`, `computeSummary*`, `mergeFieldState`). Verified zero coupling by grep. Co-location is historical accumulation, not real cohesion.
- **Risk**: Maintenance friction in a 744-line file; keeps the gate red.
- **Recommendation**: Move the two stores to `page-store.ts` / `surface-store.ts`; optionally extract pure counter/diagnostics helpers (`countFieldStateErrors`, `diffSummaryCounters`, `buildChangedPaths`, …) to `form-store-helpers.ts`. Update `docs/architecture/flux-runtime-module-boundaries.md` ownership map accordingly.
- **Review status**: downgraded — gate-violation basis merged into P0; extraction observation retained as P2.

### [AUDIT-05] `flux-react` `/unstable` subpath re-exports stable barrel symbols, breaking unstable isolation semantics

- **File**: `packages/flux-react/src/unstable.ts:1-28` vs `src/index.tsx`
- **Severity**: P2
- **Status**: `unstable.ts` re-exports `RenderNodes`, all 11 React contexts (`RuntimeContext`/`ScopeContext`/`FormContext`/…), `FormLayoutContextValue`, `createFormComponentHandle`, `createReadonlyScopeBinding` — all already in the stable barrel. 7+ test files import stable contexts via `@nop-chaos/flux-react/unstable`. Compare `flow-designer-renderers/src/unstable.ts` which is correctly disjoint from its stable barrel — the project knows the right slicing, `flux-react` doesn't apply it.
- **Risk**: Unstable promise is void (removing an unstable symbol that also exists stable gives no breakage signal); consumers can't tell the canonical path; future unstable convergence amplifies churn.
- **Recommendation**: Restrict `/unstable` to symbols absent from the stable barrel; migrate test imports back to `.`.
- **Review status**: retained (P2).

### [AUDIT-06] `flux-renderers-form-advanced` production source consumes `flux-runtime` via `/unstable` while declaring it only as devDependency

- **Files**: `packages/flux-renderers-form-advanced/src/detail-view/projected-scope.ts:1` (re-export) + `src/projected-owner-scope.ts:57` (runtime use); `package.json` (`@nop-chaos/flux-runtime` is devDep-only)
- **Severity**: P2
- **Status**: Canonical owner of `createProjectedScopeStore` is `@nop-chaos/flux-runtime`. The stable renderer package reaches it through the `flux-react/unstable` passthrough. `check:workspace-manifest-deps` passes because `flux-react` is a legitimate production dep, masking the hidden production dependency on `flux-runtime`. **Path correction from review**: the runtime consumer is `src/projected-owner-scope.ts`, not `detail-view/projected-owner-scope.ts`.
- **Risk**: A stable package depending on "unstable" as a production channel is a semantic contradiction; the real `flux-runtime` production dep is invisible in the manifest; converging `/unstable` would break the build.
- **Recommendation**: Promote `@nop-chaos/flux-runtime` to a production dependency and import `createProjectedScopeStore` from its canonical path.
- **Review status**: retained (P2) with corrected path.

### [AUDIT-07] Array structural mutations skip self-revalidation of aggregate (array-root) rules

- **File**: `packages/flux-runtime/src/form-runtime-array.ts:245-264` + `packages/flux-runtime/src/form-runtime-owner.ts:143-146`
- **Evidence**:
  ```ts
  // form-runtime-owner.ts:144-146
  for (const dependentPath of dependentPaths) {
    if (dependentPath === path) { continue; }   // skips arrayPath itself
  ```
- **Severity**: P2
- **Status**: All array mutations (`appendValueOp`/`removeValueOp`/`moveValueOp`/`swapValueOp`/`replaceValueOp`) call only `revalidateDependents(arrayPath, 'change')`, which explicitly skips `path === arrayPath`. Array-root aggregate rules (e.g. `uniqueBy(email)`, `atLeastOneFilled`) are therefore not re-validated by the runtime API itself; current renderers (`combo-renderer.tsx:373`, `array-editor.tsx:339`) compensate with a manual `validateField`/`validateSubtree`.
- **Risk**: Any programmatic caller (host/action code) invoking `form.appendValue`/`removeValue` without a follow-up validation call will show stale aggregate errors or miss new violations. Docs recommend `applyChangesAndRevalidate(..., 'system')` for structural changes, which does validate the path itself — but the array ops don't use it.
- **Recommendation**: Trigger `validateField(arrayPath, 'system')` after `revalidateDependents` in `executeArrayMutation`, or document the "array mutation API does not self-validate the aggregate root" contract and ensure all callers honor it.
- **Review status**: retained (P2, borderline P2/P3 — kept at P2 because the logical gap is real and the mitigation is renderer-side).

### [AUDIT-08] `quick-reference.md` Package Directory Map omits 3 active renderer packages

- **File**: `docs/references/quick-reference.md:14-40`
- **Severity**: P2
- **Status**: The map lists only `flux-renderers-basic/form/form-advanced/data`. `flux-renderers-content`, `flux-renderers-layout`, `flux-renderers-mobile` are absent — yet `AGENTS.md` lists all 7 as active. `quick-reference.md` is the doc AGENTS.md directs agents to read FIRST for package/types lookup.
- **Risk**: Misdirects downstream agents/host integration; misses an entire renderer family.
- **Recommendation**: Add the three rows (directory / npm name / layer).
- **Review status**: retained (P2).

### [AUDIT-09] `quick-reference.md` documents `useCurrentFormError` / `useFieldError` return type as array — source returns single value

- **Files**: `docs/references/quick-reference.md:481,483` vs `packages/flux-react/src/hooks/use-form-hooks.ts:233,272`
- **Evidence**: doc says `ValidationError[] | undefined`; source returns `ValidationError | undefined` (singular, via `[0]`). `useCurrentFormErrors` (plural) correctly stays an array.
- **Severity**: P2
- **Risk**: Renderer authors copying this table may `.map` / `.length` a single value → runtime TypeError.
- **Recommendation**: Change both rows to `ValidationError | undefined`.
- **Review status**: retained (P2).

---

## P3 — Low priority, real

### [AUDIT-10] `flux-code-editor` declares runtime value dependency only in `devDependencies`

- **File**: `packages/flux-code-editor/src/code-editor-renderer.tsx:6,54`; `package.json` (devDeps)
- **Status**: `import { formFieldChromeRules } from '@nop-chaos/flux-renderers-form'` (value import, spread at runtime into `codeEditorFieldRules`), but the dep is in devDeps only. `private:true` + workspace resolution masks it. Also exposes a `check-workspace-manifest-deps` blind spot (it unions deps+devDeps+peer).
- **Recommendation**: Move `@nop-chaos/flux-renderers-form` to `dependencies`. Optionally strengthen the gate to require value imports land in deps/peer.

### [AUDIT-11] `input-choice-renderers.tsx` bundles 4 independent exported renderers (675 lines, >500 WARN)

- **File**: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:1-675`
- **Status**: `SelectRenderer`/`CheckboxRenderer`/`SwitchRenderer`/`RadioGroupRenderer` + shared choice-option utils. WARN tier only (not gate-red). File-name plurality signals intentional topical bundle.
- **Recommendation**: If `SelectRenderer` grows past ~450 lines, reorganize into a `choice/` subdirectory. Not urgent.

### [AUDIT-12] Tree remote search uses bare `cancelled` boolean, no AbortController in-flight cancel

- **File**: `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:106-148` (+ `executeTreeSource:41`, `useTreeLazyChildren.runLoad:194-240`)
- **Status**: `useTreeRemoteSearch` uses `let cancelled = false` and doesn't forward a signal; `executeTreeSource` doesn't accept one. `cancelled` correctly shields all `setState` on cleanup (so no stale data), but the in-flight network request is not aborted. `helpers.dispatch` supports a `signal` elsewhere.
- **Recommendation**: Add `signal` plumbing + AbortController cleanup; keep a stale-response guard. **Downgraded from P2** (real impact is low — React 18+ no-ops post-unmount setState; only wasted bandwidth).
- **Review status**: downgraded P2→P3.

### [AUDIT-13] `qrcode.tsx` and `condition-builder/value-input.tsx` use bare `cancelled` boolean in async effect

- **Files**: `packages/flux-renderers-content/src/qrcode.tsx:48-67`; `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:174-192`
- **Status**: Both use `let cancelled = false` in `useEffect`. Neither underlying API (`QRCode.toCanvas` / `evaluateFormula`) exposes a signal, so AbortController wouldn't add runtime benefit. Decorative/preview paths only; no user-visible impact.
- **Recommendation**: Optional P5-style consistency, or document the exemption. Not urgent.

### [AUDIT-14] `validateForm` / `validateSubtree` lifecycle gating diverges from `validatePath`

- **File**: `packages/flux-runtime/src/form-runtime-owner.ts:378-400` (validateForm), `608-625` (validateSubtree)
- **Status**: They call `waitForActiveLifecycle` only when `!currentValidation`; `validatePath` checks `isLifecycleTransitional` regardless. Internal `validatePath` calls currently mask the inconsistency. Low impact.
- **Recommendation**: Add the `isLifecycleTransitional` check at both entry points for consistency.

### [AUDIT-15] `revalidateDependents` clears `validating` before re-running, risking transient flicker on async fields

- **File**: `packages/flux-runtime/src/form-runtime-owner.ts:158-190`
- **Status**: `delete nextFieldState.validating` → `batchUpdate` (notifies subscribers) → then `await validateField` re-sets `validating=true` only for async-rule fields, leaving a microtask window.
- **Recommendation**: Let `validateField` own the `validating` lifecycle; don't pre-clear it in `revalidateDependents`.

### [AUDIT-16] API dedup map stores `Promise<ApiResponse<any>>`, read back with a cast

- **File**: `packages/flux-runtime/src/async-data/request-runtime.ts:472,505`
- **Status**: Dedup `Map<string, Promise<ApiResponse<any>>>`; read back `as Promise<ApiResponse<T>>`. Triggering requires same request key + different `T` + `dedupStrategy:'ignore-new'` — narrow.
- **Recommendation**: Use `Promise<ApiResponse<unknown>>` to avoid the silent `any`→arbitrary-`T` path; narrow on `data` only.

### [AUDIT-17] `taskflow-designer-lib` casts `ctx.scope as any` unnecessarily

- **File**: `apps/playground/src/taskflow-designer-lib/index.ts:41`
- **Status**: `(ctx.scope as any)?.get?.('$designer')` — `ScopeRef.get(path): unknown` already exists on the type. Playground demo code; wrapped in try/catch.
- **Recommendation**: `ctx.scope.get('$designer') as DesignerProjection | undefined`.

### [AUDIT-18] 4 vitest configs lack coverage thresholds (incl. 2 config-only packages)

- **Files**: `packages/flow-designer-core/vitest.config.ts`, `packages/spreadsheet-core/vitest.config.ts`, `packages/tailwind-preset/...`, `packages/theme-tokens/...`
- **Status**: 24 packages have thresholds; these 4 don't. `flow-designer-core` + `spreadsheet-core` are non-trivial core packages; `tailwind-preset` + `theme-tokens` are config-only. **Correction from review**: initial finding undercounted (named only 2; actually 4 — though only the 2 core packages are worth thresholds).
- **Recommendation**: Add ≥70% thresholds to `flow-designer-core` and `spreadsheet-core`. Config packages can stay exempt.
- **Review status**: downgraded P2→P3; count corrected.

### [AUDIT-19] 18 test files redundantly declare `@vitest-environment happy-dom` already set at package level

- **Files**: `packages/flow-designer-renderers/src/*.test.tsx`, `packages/flux-bundle/src/index.test.tsx`
- **Status**: Package `vitest.config.ts` already sets `environment:'happy-dom'`; the per-file pragma is duplicate. **Correction from review**: 18 files (initial finding said 17).
- **Recommendation**: Remove the redundant pragmas.

### [AUDIT-20] `apps/playground` lacks a coverage threshold

- **File**: `apps/playground/vitest.config.ts`
- **Status**: Demo/integration layer with 19 test files; new demo pages with zero tests slip through.
- **Recommendation**: Optional low threshold (e.g. 50%) as a backstop.

### [AUDIT-21] `quick-reference.md` documents `useRenderInstancePath` return as `string`

- **Files**: `docs/references/quick-reference.md:501` vs `packages/flux-react/src/context-hooks.ts:36` (`readonly InstanceFrame[] | undefined`)
- **Recommendation**: Fix to `readonly InstanceFrame[] | undefined` (matches source and `renderer-runtime.md`).

### [AUDIT-22] `quick-reference.md` records the bundle npm name as `@nop-chaos/flux-bundle`

- **Files**: `docs/references/quick-reference.md:30` vs `packages/flux-bundle/package.json:2` (`@nop-chaos/flux`)
- **Status**: Contradicts sibling `audit-tooling.md` which correctly says `@nop-chaos/flux`. Would mislead host integration (`@nop-chaos/flux-bundle` resolves to nothing).
- **Recommendation**: Change to `@nop-chaos/flux`; annotate "dir `flux-bundle`, published name `@nop-chaos/flux`".

---

## Rejected candidates (review overturned the deep-dive)

These were reported in first-round deep-dive but **rejected** by independent review against live code:

1. **[08-F4] `validateCompiledField` commits partial sync results on external abort** — **REJECTED**. Code at `form-runtime-validation.ts:426-428` gates the early sync commit behind `!hasAsyncRules` and runs after the run-mismatch early-return (410-422); those are fully-evaluated sync rules, not "partial". For `hasAsyncRules` fields the commit is in `finally` (480) conditioned on `validationRuns===runId && modelGeneration===capturedGeneration`; supersede/abort triggers the early return with `finalErrors=[]`. No partial-publish path exists.
2. **[09-F3] Internal region `nop-*` + `data-slot` dual = marker drift** — **REJECTED**. Cites a non-existent file (`markdown-editor-renderer.tsx`) and misreads the documented dual convention — AGENTS.md explicitly sanctions **both** `nop-*` flux semantic markers **and** shadcn `data-slot`. Their coexistence is the intended design.
3. **[09-F5] `button-group` `value` non-reactive** — **REJECTED**. `button-group-renderer.tsx:40-41` carries an explicit comment documenting that `value`/`defaultValue` are seed-only and non-reactive. The finding describes documented intentional behavior as a latent defect.

---

## Areas verified clean (no findings)

- **Dependency graph (dim 01)**: clean DAG, no cycles, no illegal internal-path imports, all boundary rules a–i satisfied. The `flux-renderers-mobile` (no `flux-react` dep) and `nop-debugger` baselines were verified as legitimate (pure presentational renderer / test-only usage).
- **State ownership (dim 04)**: zero new dual-state defects. Historical ArrayEditor/CheckboxGroup sync bugs are eliminated in live code; complex fields converge on "read from store + ref bridge". Adjudicated tradeoffs (object-field working value, table-quick-edit draft) re-confirmed as still-valid, no new supported-baseline violation.
- **Async safety (dim 06)**: submit concurrency guard, AbortController two-layer cancellation (dynamic/variant/sql/word/upload), `ApiDataSourceController` out-of-order handling all verified correct. All `void-promise-no-catch` suspects dismissed as internal fail-safe or pure command forwarding.
- **Validation (dim 08)**: owner-based model, single flat `fieldStates` map, generation-aware async cancellation, per-path subscription all correct.
- **Renderer contract (dim 09)**: all standard hooks used correctly, zero ad-hoc React contexts, zero BEM, `cn()` everywhere, zero `templateNode.schema` runtime reads (except the CRUD defect), root markers complete (`check:audit-missing-renderer-markers` clean).
- **Type safety (dim 13)**: ~188 `any` in src; ~150 are the controlled `Record<string,any>` scope baseline, ~30 host/formula/dispatch boundaries — all within AGENTS exceptions. No triple-assertion chains, zero `@ts-ignore`/`@ts-nocheck`.
- **Tests (dim 14)**: 100% Vitest, `vi.fn`/`vi.mock` consistent, `pool:'forks'` file isolation, all 21 `test-module-top-let`/`test-global-patch` suspects verified to clean up correctly, E2E proof-fidelity spot-checked clean.

---

## High-frequency files (appear across multiple dimensions)

| File                                                 | Dimensions                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `packages/flux-renderers-data/src/crud-renderer.tsx` | 03, 09, 13 (compile-once + cast synthesis — single root cause) |
| `docs/references/quick-reference.md`                 | 03, 16 (4 separate doc drifts — single doc fell behind source) |
| `packages/flux-runtime/src/form-runtime-owner.ts`    | 02, 08, 14 (size + validation gating + gate-red)               |

## Cross-dimension pattern

- **CRUD as a contract-pressure hotspot**: the same file carries the only P1×2 (compile-once + cast). Recommend a single remediation that makes CRUD delegate to TableRenderer through typed, precompiled regions rather than runtime synthesis.
- **`quick-reference.md` staleness**: 4 independent P2/P3 drifts concentrated in one high-traffic reference doc — worth a one-pass resync against source + `renderer-runtime.md`.
- **Gate-red oversized files**: 7 files keep `check:oversized-code-files` failing; 2 of them have documented justification but no exemption mechanism exists.

## Suggested new automation

- A `check:*` rule requiring source **value imports** (non `import type`, non test-support) to be declared in `dependencies`/`peerDependencies` — closes the `flux-code-editor` devDep blind spot in `check-workspace-manifest-deps` (which unions deps+devDeps+peer).
- A lint/docs check that stable barrel symbols are not re-exported from a package's own `/unstable` entry (would catch `flux-react` [AUDIT-05] and prevent regression).

## Final verdict

`<AI_STEP_RESULT>issues</AI_STEP_RESULT>`

Detailed per-dimension artifacts are archived under `docs/analysis/2026-06-26-deep-audit-amis-bug-driven-improvements/`.
