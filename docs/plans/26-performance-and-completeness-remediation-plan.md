# Performance and Completeness Remediation Plan (#26)

> Plan Status: completed
> Last Reviewed: 2026-04-04


> Source: repository-wide design and implementation audit completed on 2026-04-02.
> Focus: performance risks, incomplete implementations, stability defects, engineering consistency issues, and architecture-conformance gaps.

---

## Goal

Build a concrete, execution-ready remediation plan that:

- closes high-risk stability and security-like defects first,
- removes major performance bottlenecks in hot paths,
- completes currently placeholder features,
- aligns implementation with repository engineering rules,
- and strictly enforces architecture boundaries defined in articles.

---

## Architecture Baseline (Article-Conformance)

Reference document:

- `docs/articles/flux-design-introduction.md`

Normative constraints extracted from the article:

1. 权限不属于渲染运行时职责，必须在平台层通过结构裁剪处理。
2. 运行时不应接收或执行权限表达式。
3. 渲染层不应依赖动态代码执行（`new Function`/`eval`）实现业务语义。

Therefore, this plan upgrades two constraints to hard requirements:

- Remove runtime permission handling from Flow Designer runtime contracts and execution paths.
- Ban dynamic code execution (`new Function`/`eval`) in workspace source code (excluding third-party build artifacts).

---

## Scope

In scope:

- `packages/flow-designer-core/`
- `packages/flow-designer-renderers/`
- `packages/flux-runtime/`
- `packages/flux-react/`
- `packages/spreadsheet-core/`
- `apps/playground/src/flow-designer/`

Out of scope for this plan:

- cross-product UX redesign,
- new feature expansion unrelated to audited defects,
- large architecture rewrites not needed for risk reduction.

---

## Priority Matrix

- P0: Must fix immediately (correctness/stability/security boundary)
- P1: High-value near-term fix (major performance or reliability)
- P2: Important follow-up (quality/maintainability)
- P3: Technical debt backlog candidate

---

## Remediation Items

## P0-1 Remove Runtime Permission System From Flow Designer (Architecture Violation)

Status: completed on 2026-04-02.

Problem description:

- Current design includes runtime permission fields and checks in Flow Designer core.
- This violates article-defined layering: permissions must be solved by upstream platform-side schema pruning.
- Existing implementation further amplifies risk by evaluating string expressions at runtime.

Code reference:

- `packages/flow-designer-core/src/core.ts`
- `packages/flow-designer-core/src/types.ts`
- `apps/playground/src/schemas/workflow-designer-schema.json`

Fix方案:

1. Remove permission runtime model from designer contracts:
   - remove `DesignerPermissions` and `NodePermissionConfig` from `types.ts` public contract,
   - remove `permissions` fields from normalized config surface.
2. Remove runtime permission checks from core command paths (`add/update/delete/connect/move/...`).
3. Keep only non-permission constraints that are truly editor-runtime concerns (e.g. graph topology constraints).
4. Update playground schemas and tests to stop relying on runtime `permissions` blocks.
5. Document migration path: permission gating must happen before schema reaches renderer.

Acceptance:

- No runtime permission branch remains in Flow Designer core.
- No `permissions` semantic is interpreted by renderer/core at runtime.
- Upstream-pruned schema remains the only permission mechanism.

---

## P0-2 Ban Dynamic Code Execution in Source (`new Function` / `eval`)

Status: completed on 2026-04-02.

Problem description:

- Multiple source modules use `new Function` for expression probing/evaluation.
- This violates the architecture boundary and introduces security, auditability, and consistency risk.

Code reference:

- `packages/flow-designer-core/src/core.ts`
- `packages/flux-code-editor/src/extensions/expression/linter.ts`
- `packages/nop-debugger/src/panel.tsx`

Fix方案:

1. Replace all `new Function` usage with approved alternatives:
   - Flow Designer: remove runtime permission path entirely (covered by P0-1).
   - Expression linter: parse with a dedicated parser/grammar or compiler syntax-check API, not JS constructor.
   - Debugger eval: use existing formula compiler in sandboxed scope, or disable free-form JS eval feature.
2. Add repository rule:
   - ESLint rule / static check to fail CI on `new Function` and `eval` in `packages/**/src` and `apps/**/src`.
3. Add explicit exception policy for generated/dist files (non-source, non-authoritative).

Acceptance:

- Zero `new Function` / `eval` usage in first-party source directories.
- CI prevents reintroduction.

---

## P0-3 Designer Page Uses `core!` Before Null Guard

Status: completed on 2026-04-02.

Problem description:

- `core` can be null when `document/config` is missing.
- Hooks and values currently dereference `core!` before the `if (!core)` fallback return.
- This may throw at render time before safe fallback UI is reached.

Code reference:

- `packages/flow-designer-renderers/src/designer-page.tsx`

Fix方案:

1. Move null guard to the earliest safe point before any `core`-dependent hook/logic.
2. Split into wrapper + inner component if needed:
   - wrapper validates inputs and returns fallback,
   - inner component assumes non-null `core`.
3. Add tests for missing `document`, missing `config`, and both missing.

Acceptance:

- No non-null assertion on `core` in pre-guard path.
- Renderer always degrades to fallback without crash when required props are absent.

---

## P0-4 Debounce Promise Handling Is Incomplete

Status: completed on 2026-04-02.

Problem description:

- Debounce scheduler resolves with `await factory()` but has no explicit reject branch.
- Thrown/rejected factory can cause unresolved or improperly surfaced failures.

Code reference:

- `packages/flux-runtime/src/utils/debounce.ts`

Fix方案:

1. Extend pending entry to carry both `resolve` and `reject`.
2. Wrap factory execution in try/catch and settle promise in all branches.
3. Ensure cancellation path settles predictably (explicit cancellation value or cancellation error type).
4. Add tests for:
   - success
   - factory throw
   - factory rejection
   - superseded debounce cancellation

Acceptance:

- All debounce promises settle deterministically.
- No unhandled rejection from debounce internal path.

---

## P0-5 Request Dedup Key Is Too Coarse

Status: completed on 2026-04-04.

Implementation note:

- Semantic dedup keys now include params/body/headers.
- `cancel-previous` and `parallel` behaviors are covered by tests.
- `ignore-new` is now validated as a closed item, including distinct semantic requests and identical-key in-flight reuse behavior.

Problem description:

- Active-request dedup currently keys by owner/action/method/url.
- Different params/body under same URL are treated as same request and previous is aborted.
- Can cause incorrect data race behavior.

Code reference:

- `packages/flux-runtime/src/request-runtime.ts`

Fix方案:

1. Introduce normalized dedup key including:
   - method/url
   - normalized params
   - normalized request body
   - optional dedup strategy override.
2. Support per-request dedup mode:
   - `cancel-previous` (default for same semantic request)
   - `parallel`
   - `ignore-new` (optional).
3. Add tests covering same URL with different params/body running concurrently.

Acceptance:

- Different semantic requests do not cancel each other unexpectedly.
- Existing expected dedup behavior remains for identical requests.

---

## P1-1 Dirty Check Uses Full JSON Stringify in Hot Paths

Status: completed on 2026-04-02.

Problem description:

- Dirty-state checks rely on `JSON.stringify` deep comparisons.
- This is O(n) over full graph/document and can degrade interactivity at scale.

Code reference:

- `packages/flow-designer-core/src/core.ts`
- `apps/playground/src/flow-designer/useFlowCanvasStore.ts`

Fix方案:

1. Replace stringify-based dirty checks with revision counters:
   - `docRevision` increments on mutation
   - `savedRevision` captured on save.
2. For playground store, derive dirty from revision/history index rather than deep serialization.
3. Keep optional deep compare utility only for debugging mode.

Acceptance:

- No per-render full-document stringify for dirty checks.
- Dirty status remains correct through add/update/delete/undo/redo/save/restore.

---

## P1-2 Flow Core Node Update Path Has O(n^2) and Mutable Updates

Status: completed on 2026-04-02.

Problem description:

- Multi-node updates repeatedly use `findIndex` and mutate `doc.nodes[idx]` in place.
- This hurts performance and can break immutable change assumptions.

Code reference:

- `packages/flow-designer-core/src/core.ts`

Fix方案:

1. Build a map of updates by nodeId.
2. Perform single-pass immutable node array rebuild (`map`).
3. Replace in-place assignments with immutable `doc = { ...doc, nodes: newNodes }`.
4. Add tests ensuring reference updates occur only when values changed.

Acceptance:

- No direct `doc.nodes[idx] = ...` mutation in bulk update path.
- Bulk move/update complexity reduced and behavior preserved.

---

## P1-3 XYFlow Sync Has O(n^2) Merge and Viewport Control Drift

Status: completed on 2026-04-02.

Problem description:

- Snapshot/local node merge uses nested lookups (`find` in `map`).
- Component keeps `controlledViewport` state but passes it as `defaultViewport`, which is initial-only semantics.

Code reference:

- `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`

Fix方案:

1. Pre-index current nodes by id (`Map`) before merge.
2. Align viewport ownership model:
   - either true controlled viewport integration,
   - or remove misleading controlled state and keep uncontrolled with explicit sync API.
3. Add test coverage for viewport updates after mount.

Acceptance:

- Node merge no longer scales quadratically.
- Viewport state and rendered viewport remain consistent after interactive moves.

---

## P1-4 Import Namespace Errors Are Silently Swallowed

Status: completed on 2026-04-04.

Current note:

- Import setup failures now emit structured `monitor.onError` payloads with import-spec context from `packages/flux-runtime/src/imports.ts`.
- `flux-react` keeps non-blocking rendering and development-time warning output in `packages/flux-react/src/node-renderer.tsx`.

Problem description:

- Namespace import setup failures are caught and ignored.
- This can leave actions partially unavailable without observability.

Code reference:

- `packages/flux-react/src/node-renderer.tsx`

Fix方案:

1. Replace silent catch with monitor event + notify in dev mode.
2. Include node path/import spec in error payload.
3. Keep non-blocking rendering but visible diagnostics.

Acceptance:

- Import failures are observable and traceable.
- Rendering does not hard-crash on import failure.

---

## P1-5 Remove Permission Fields From Schemas and Test Fixtures

Status: completed on 2026-04-02.

Problem description:

- Runtime permission config still appears in playground schema and renderer tests.
- Keeping these fields after P0-1 creates false affordance and future regression risk.

Code reference:

- `apps/playground/src/schemas/workflow-designer-schema.json`
- `packages/flow-designer-renderers/src/index.test.tsx`

Fix方案:

1. Remove `permissions` blocks from example schema and replace with platform-pruned examples.
2. Update tests to validate behavior without runtime permission inputs.
3. Add one conformance test that asserts renderer ignores/strips unexpected permission fields.

Acceptance:

- No official example/test relies on runtime permission fields.
- Developer guidance no longer suggests runtime permission handling.

---

## P2-1 Playground History Snapshots Can Capture Stale Sibling State

Status: completed on 2026-04-02.

Problem description:

- History writes in node and edge handlers reference closure-captured sibling state.
- Interleaved updates can produce inconsistent history snapshots.

Code reference:

- `apps/playground/src/flow-designer/useFlowCanvasStore.ts`

Fix方案:

1. Consolidate state transitions using a reducer or transactional updater.
2. Record history from a single coherent next-state object.
3. Add stress tests for rapid mixed node/edge operations.

Acceptance:

- Undo/redo always restores coherent node-edge pairs.

---

## P2-2 Spreadsheet Auto-Fit Commands Are Placeholder Implementations

Status: completed on 2026-04-02.

Problem description:

- `autoFitRow/autoFitColumn` currently return success-like responses without actual layout computation.

Code reference:

- `packages/spreadsheet-core/src/core.ts`

Fix方案:

1. Define explicit unsupported contract temporarily (typed error/result code), or
2. Complete implementation with host measurement callback integration.
3. Ensure command result semantics distinguish real success from unimplemented behavior.

Acceptance:

- No misleading success response for unimplemented auto-fit.
- Feature behavior and API contract are explicit.

---

## P2-3 Scope Proxy Key Cache Can Become Stale

Status: completed on 2026-04-02.

Problem description:

- Adaptor scope proxy caches `ownKeys` once and does not invalidate when scope changes.

Code reference:

- `packages/flux-runtime/src/request-runtime.ts`

Fix方案:

1. Remove key caching or
2. Invalidate by scope revision/version tracking.
3. Add tests for key enumeration after dynamic scope updates.

Acceptance:

- Key enumeration reflects current scope state.

---

## P2-4 Source Artifact Governance Drift (TS/JS Coexistence in src)

Status: completed on 2026-04-04.

Current note:

- The guard script and repository verification path are in place, and the rule applies to all `packages/*/src/` directories with no package-level exception.
- The repository baseline now explicitly documents strict source-only `src/` directories and `dist/`-only generated output in `docs/architecture/frontend-baseline.md`.

Problem description:

- Multiple non-UI packages currently contain `.js` files under `src` while repository guidance states build artifacts should go to `dist`.
- This introduces implementation drift risk between TS and JS tracks.

Code reference:

- `AGENTS.md`
- Representative packages under `packages/*/src/*.js`

Fix方案:

1. Clarify policy in one place:
   - intentional dual-source strategy, or
   - strict TS-source + dist output only.
2. If strict mode selected:
   - remove non-intentional JS from `src`,
   - enforce with CI script (`verify-no-src-artifacts`).
3. If dual-source selected:
   - document ownership/build pipeline and add drift checks.

Acceptance:

- Policy and repository state become consistent.
- CI can prevent future accidental drift.

---

## Generalized Similar-Issue Audit Results (举一反三)

This section records additional similar-pattern findings discovered after applying the new architecture constraints.

### A. Dynamic code execution pattern inventory

Confirmed in source:

1. `packages/flow-designer-core/src/core.ts`
2. `packages/flux-code-editor/src/extensions/expression/linter.ts`
3. `packages/nop-debugger/src/panel.tsx`

Action:

- Covered by P0-1 and P0-2.

### B. Runtime permission semantic inventory

Confirmed in source/contracts/examples:

1. `packages/flow-designer-core/src/types.ts` (designer/node permission model)
2. `packages/flow-designer-core/src/core.ts` (permission evaluation and gating)
3. `apps/playground/src/schemas/workflow-designer-schema.json` (permission schema input)
4. `packages/flow-designer-renderers/src/index.test.tsx` (permission test fixture)

Action:

- Covered by P0-1 and P1-5.

### C. Guardrail gap

Problem:

- No project-level automated check currently blocks reintroduction of forbidden patterns.

Action:

- Add CI/static guards in P0-2.

---

## Execution Phases

Phase A (Week 1): P0 items

- P0-1, P0-2, P0-3, P0-4, P0-5

Phase B (Week 2): High-impact performance and observability

- P1-1, P1-2, P1-3, P1-4, P1-5

Phase C (Week 3): Completeness and engineering governance

- P2-1, P2-2, P2-3, P2-4

---

## Verification Checklist

- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] Targeted package tests for each fixed module
- [x] Add/refresh regression tests for all completed P0 and P1 defects in this plan scope
- [x] Documentation updated for behavior changes
- [x] Source scan shows zero `new Function`/`eval` in `packages/**/src` and `apps/**/src`
- [x] Flow Designer no longer interprets permission semantics at runtime

Open follow-up items retained from this plan:

- P1-4 import namespace failure observability
- Full closure/validation of optional `ignore-new` dedup behavior from P0-5
- Governance clarification portion of P2-4

---

## Deliverables

1. Fix PR set for P0 items with tests.
2. Fix PR set for P1 items with measurable performance baseline notes.
3. Fix PR set for P2 items with contract clarifications.
4. Architecture-conformance closure note referencing `docs/articles/flux-design-introduction.md`.
5. Audit closure report mapping each remediation item to commit/PR and test evidence.


