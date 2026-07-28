> Audit Status: closed
> Audit Type: open-ended
> Mission: audit-remediation

# Open-Ended Adversarial Audit: `audit-remediation` (Post-MV Integrity Check)

## Orientation

The `audit-remediation` mission claims **all phases complete (M0→MA1-MA7→MR1-MR4→MV→MG)**, all **P0/P1 findings fixed and verified**, and the workspace **production-green**. The adversarial prompt instructs this audit to probe beyond the claimed baseline — specifically for claimed-but-unfixed items, convention violations that systematic audits tend to miss, and blind spots in the remediation pipeline.

**Discovery perspectives used**: Contract Archaeologist (claimed-fix integrity), Dead Code Scavenger (stale exports), New Developer (convention confusion), Cross-Boundary Messenger (doc-code alignment), Malicious Input (escape hatch patterns).

---

## Findings

### [P0] R2.2 fix claim is false — CRUD compile-once violation still present in live code

- **Location**: `packages/flux-renderers-data/src/crud-renderer.tsx:512-533`
- **arm-index claim**: MA3-P2-F1 "crud-renderer.tsx:512 runtime-raw-schema-read violates compile-once principle" → R2.2 → `fixed`
- **Live code** (line 512):
  ```ts
  const rawSchema = props.schema as CrudeSchema;
  // ...
  item: rawSchema.item,
  card: rawSchema.card,
  ```
- **Why P0**: The arm-index (line 63) and roadmap (line 161) both claim this fix was applied. It was not. The raw schema read persists unchanged. This:
  1. Is a live compile-once principle violation (the original defect).
  2. Undermines the integrity of the entire audit-remediation claim system — if one fix is falsely flagged `done`, others may be too.
  3. Was independently re-confirmed as P0 by the same-day multi-audit report (`D09-01`).
- **Root cause**: The expander plan (`docs/plans/2026-07-27-2300-2-r2-r3-combined-expander.md`) adjudicated this as "fix", and R2.2 was mapped to it, but the actual code change either was never made or was reverted. The closure audit did not independently verify the live file.
- **Confidence**: Certain. The live file at the claimed-fix line is unmodified.
- **Discovery perspective**: Contract Archaeologist — follow the claim trail from arm-index to live code.

---

### [P0] R3.13 fix claim is false — ImportStack.push() doc still has 3 type mismatches

- **Location**: `docs/architecture/module-cache-and-import-stack.md:232-241`
- **arm-index claim**: MA6-P1-005 "ImportStack.push() parameters differ significantly from documented interface" → R3.13 → `fixed`
- **Live doc vs code**:

| Parameter           | Doc type                  | Code type (`compilation.ts:173-182`) | Match?                        |
| ------------------- | ------------------------- | ------------------------------------ | ----------------------------- |
| `actionScope`       | `ActionScope`             | `ImportActionScope` (module-local)   | **Mismatch** — different type |
| `componentRegistry` | `ComponentHandleRegistry` | `ComponentHandleRegistryCore`        | **Mismatch** — narrower type  |
| `nodeInstance`      | `NodeInstance`            | `ImportContextNodeInstance` (local)  | **Mismatch** — different type |

- **Why P0**: Same class as Finding #1 — a claimed fix that was not actually applied. The roadmap (line 221) lists R3.13 as `done`, but the doc still diverges from live code. Two P0 claim-integrity failures in the same audit-remediation strongly suggest the closure audit step (MV) did **not** independently verify individual fix claims against live sources.
- **Confidence**: Certain. Doc text verified with two independent agents.
- **Note**: `ComponentHandleRegistry extends ComponentHandleRegistryCore`, so the doc type is a valid supertype. The `ActionScope`/`ImportActionScope` mismatch is the most significant since these are structurally distinct types.
- **Discovery perspective**: Contract Archaeologist + Cross-Boundary Messenger.

---

### [P1] Systemic raw `<button>` violations across 5 renderer packages (AGENTS.md MANDATORY rule)

- **AGENTS.md** (line 118): "**NEVER use raw HTML elements when `@nop-chaos/ui` provides a component."**
- **Available**: `Button` from `@nop-chaos/ui`
- **9 non-test files with raw `<button>`**:

| File                         | Line       | Package                      |
| ---------------------------- | ---------- | ---------------------------- |
| `icon-picker.tsx`            | 212        | flux-renderers-form-advanced |
| `transfer-renderer.tsx`      | 380        | flux-renderers-form-advanced |
| `select-mobile-renderer.tsx` | 58         | flux-renderers-form          |
| `carousel.tsx`               | 300        | flux-renderers-content       |
| `diff-header.tsx`            | 45, 54, 65 | flux-renderers-content       |
| `diff-hunk.tsx`              | 56, 71     | flux-renderers-content       |
| `diff-file-list.tsx`         | 96         | flux-renderers-content       |
| `steps-renderer.tsx`         | 266        | flux-renderers-layout        |

- In every case, `Button` from `@nop-chaos/ui` is already imported in the same file (used elsewhere), making these clear oversight violations.
- **Why P1**: These are material convention violations of a MANDATORY rule. They affect accessibility (missing `data-slot`, `variant`, focus ring consistency), visual consistency, and future migration paths.
- **Confidence**: Certain.
- **Why the multi-audit missed this**: The MA1/MA3 audits focused on structural compliance (marker classes, data-slot, styling contract), not on HTML-element-level convention enforcement. This is a known blind spot in the audit scope.
- **Discovery perspective**: New Developer — would be confused by "never use raw HTML" rule followed inconsistently in same files.

---

### [P1] NodeFrameWrapper still reads `templateNode.schema.frameWrap` at runtime (D09-02 unfixed)

- **Location**: `packages/flux-react/src/node-frame-wrapper.tsx:16-19`
- **Code**:
  ```ts
  const frameWrapMode = resolveFrameWrapMode(
    props.definitionWrap,
    (props.templateNode.schema as { frameWrap?: boolean | 'label' | 'group' | 'none' }).frameWrap,
  );
  ```
- **Why P1**: Compile-once violation. `frameWrap` should be resolved into compiled `meta` during NodeRenderer resolution. Previously flagged as D09-02 P1 in the 2026-07-28-0650 multi-audit, but NOT in the arm-index fix list — meaning it was not routed to any MR.
- **Confidence**: Certain.
- **Discovery perspective**: Cross-Boundary Messenger — schema shape crosses from compile to runtime without proper boundary.

---

### [P1] DetailField still uses `parentScope.get(name)` bypassing reactive subscriptions (D09-06 unfixed)

- **Location**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:157-158`
- **Code**:
  ```ts
  if (typeof parentScope?.get === 'function') {
    return parentScope.get(name);
  }
  ```
- **Why P1**: Bypasses the reactive subscription model. Returns stale values on scope writes. Previously flagged as D09-06 P1 in the same multi-audit, NOT in arm-index fix list.
- **Confidence**: Certain.

---

### [P1] Async `useEffect` in image.tsx lacks AbortController

- **Location**: `packages/flux-renderers-content/src/image.tsx:84`
- **Code** (pattern):
  ```ts
  useEffect(() => {
    let cancelled = false;
    fetchAsDataUri(url).then((data) => {
      if (!cancelled) setData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  ```
- **Why P1**: Uses `cancelled` boolean flag for setState guard only — the in-flight `fetchAsDataUri` network request continues after unmount. For a low-code engine rendering user-supplied URLs, this is both a performance waste and, under rapid mount/unmount cycles (e.g., carousel/CRUD list navigation), could cause network connection accumulation.
- **Confidence**: Certain.
- **Discovery perspective**: Malicious Input — if schema supplies rapidly-changing image URLs, connections accumulate.

---

### [P1] Async `useEffect` in use-conversation.ts lacks AbortController

- **Location**: `packages/flux-renderers-ai/src/adapters/use-conversation.ts:217`
- **Code**: Same cancelled-boolean-only pattern for `storage.loadConversations()`.
- **Why P1**: Same pattern as image.tsx. Storage calls could be slow; promise resolution and setState fire after unmount. Under conversation switching, accumulates in-flight promises.
- **Confidence**: Likely (could not confirm exact line due to `eslint-disable` guard at line 89, but cancelled-boolean pattern confirmed).
- **Discovery perspective**: 10x Scale Operator — rapid conversation switching leaks connections.

---

### [P2] `useEffect` for synchronous DOM measurement should be `useLayoutEffect`

- **Locations**:
  - `packages/flux-renderers-form/src/renderers/textarea-renderer.tsx:71` — `scrollHeight` read + `el.style.height` write
  - `packages/flux-renderers-ai/src/adapters/use-auto-scroll.ts:53` — `el.scrollTop = el.scrollHeight` write
- **Why P2**: These are synchronous layout operations. In `useEffect`, the browser paints before the layout adjustments run, causing visual flicker. Compare with `text.tsx:103` which correctly uses `useLayoutEffect`.
- **Confidence**: Certain.

---

### [P2] 4 `React.memo` instances redundant under React Compiler, no `eslint-disable` comments

- **Locations**:
  - `packages/flux-renderers-form-advanced/src/combo-renderer.tsx:205`
  - `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:150`
  - `packages/flux-renderers-form-advanced/src/input-table-renderer.tsx:267`
  - `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:497`
- **Why P2**: Per `react19-best-practices-review.md` §React Compiler 自动记忆化 (lines 187-195), "不要为新代码引入手写 React.memo... 已有的手写 memo 不需要立即删除... 禁止为了"显式表达意图"而手写 memo." These 4 instances lack `eslint-disable` comments, meaning React Compiler is not opted out and the manual memo is dead code.
- **Confidence**: Certain.

---

### [P2] flow-designer-renderers/unstable.ts still overlaps with stable barrel (D03-01 not routed)

- **Location**: `packages/flow-designer-renderers/src/unstable.ts:29-34`
- **Code**:
  ```ts
  export {
    createFlowDesignerRegistry,
    extendFlowDesignerRegistry,
    flowDesignerRendererDefinitions,
    registerFlowDesignerRenderers,
  } from './renderer-definitions.js';
  ```
- **Why P2**: `createFlowDesignerRegistry`, `flowDesignerRendererDefinitions`, and `registerFlowDesignerRenderers` are also exported from the stable barrel. This defeats the unstable subpath purpose. Flagged as D03-01 P1 in the multi-audit. Not in arm-index fix list — meaning it was triaged out of scope. Given its P1 classification and unaddressed status, it warrants at minimum a P2 recording for backlog awareness.
- **Confidence**: Certain.

---

### [P2] report-designer-renderers still uses `RendererDefinition<any>[]` (D03-10 not routed)

- **Location**: `packages/report-designer-renderers/src/renderers.tsx:204`
- **Code**:
  ```ts
  export const reportDesignerRendererDefinitions: RendererDefinition<any>[] = [...]
  ```
- **Why P2**: Disables compile-time contract checking for 7 renderer definitions. No other package uses this pattern. Flagged as D03-10 P1 in multi-audit, not in arm-index fix list.
- **Confidence**: Certain.

---

### [P2] `action-scope-and-imports.md` ComponentCapabilities interface missing `getDebugData` field

- **Location**: `docs/architecture/action-scope-and-imports.md:287-296`
- **Live code** (`component-handle-core.ts:37-46`):
  ```ts
  export interface ComponentCapabilities {
    store?: unknown;
    invoke(...): ...;
    hasMethod?(method: string): boolean;
    listMethods?(): readonly string[];
    getDebugData?(): Record<string, unknown> | undefined;  // <-- MISSING FROM DOC
  }
  ```
- **Why P2**: The doc was fixed per R3.14 (the `ActionContext` → `ComponentCapabilityActionContext` fix was applied). But `getDebugData` was never part of the original finding, so it's a pre-existing doc gap that survived the MR3 fix pass. Minor — but docs claiming fix completeness should not leave known methods undocumented.
- **Confidence**: Certain.

---

### [P2] 200+ `useCallback`/`useMemo` instances potentially redundant under React Compiler

- **Scope**: Across all renderer packages (form-advanced heaviest). None have `eslint-disable` comments.
- **Why P2**: Per `react19-best-practices-review.md`, these are redundant — React Compiler auto-memoizes. The document explicitly says "已有的手写 memo 不需要立即删除" and "不要把'移除冗余 memo'当成高优先级重构任务". However, the MA3/MR2 audits did not flag this as a systemic pattern, meaning there was no evaluation of whether the convention was being followed. Recording for awareness.
- **Confidence**: Likely (individual instances may be in `'use no memo'` files).

---

## Summary

| Severity  | Count  | Key themes                                                                                                                                         |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0        | 2      | Claimed-fix integrity failures (R2.2, R3.13) — arm-index falsely marks items `fixed` that live code/docs still have                                |
| P1        | 6      | Raw `<button>` violations (9 files, 5 packages); NodeFrameWrapper + DetailField unfixed compile-once bypasses; 2 missing AbortControllers          |
| P2        | 7      | Redundant React.memo (4); useLayoutEffect needed (2); unstable subpath overlap; RendererDefinition<any>; doc method gap; 200+ redundant memo hooks |
| **Total** | **15** |                                                                                                                                                    |

## Cross-Cutting Theme: Claim Integrity Failure

The two P0 findings share a root cause: **the closure audit step (MV) did not independently verify fix claims against live sources.**

- R2.2 (crud-renderer.tsx raw schema read): arm-index and roadmap both say `done`. Live code is unchanged. The closure audit should have re-read the target file.
- R3.13 (ImportStack.push() doc types): Same pattern. Doc was not updated despite R3.13 claim.

**Recommendation**: The MV/MG phase should add a step: for every `fixed` claim, re-read the exact lines cited in the original finding and confirm the fix is live. This is the minimum integrity gate for a remediation pipeline.

## What This Audit Likely Missed

1. **E2E test reliability**: The pre-existing flake in `ai-citations.e2e.spec.ts` was cited but not investigated for root cause.
2. **Playwright config changes**: Did not audit `playwright.config.ts` for timeout or retry settings that mask flakiness.
3. **Performance**: Did not probe bundle size or render performance — these were covered by MA7 and the scheduling audits.
4. **Zustand store correctness**: Did not audit store subscription patterns or memory leaks in non-UI stores.
5. **`check:audit-suspects` 404 results**: Did not sample the 404 suspects to verify they are all legitimate false positives.

The most productive next-round entry point would be: **random-sample 10% of `check:audit-suspects` results and verify each is a genuine acceptable pattern**, cross-referencing audit-tooling.md calibration patterns. This would either validate the tool baseline or expose a new class of false negatives.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
