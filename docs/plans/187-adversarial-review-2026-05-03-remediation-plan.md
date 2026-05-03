# 187 Adversarial Review 2026-05-03 Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-03
> Source: `docs/analysis/2026-05-03-adversarial-review.md`, `docs/architecture/form-validation.md`, `docs/architecture/object-field.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/tree-mode.md`
> Related: `docs/plans/157-validation-owner-and-submitform-implementation-alignment-plan.md`, `docs/plans/168-validation-and-built-in-form-targeting-semantics-convergence-plan.md`, `docs/plans/178-validation-owner-bootstrap-and-hidden-participation-plan.md`, `docs/plans/175-review-4-findings-remediation-plan.md`

## Purpose

收口 `docs/analysis/2026-05-03-adversarial-review.md` 中确认成立的 6 个跨包语义问题，避免 repo 再次停留在“旧 plan 已关闭，但核心 owner/action/designer contract 又重新分裂”的状态。

本计划只负责这 6 个已确认问题的 live semantic convergence，不把更大的 owner-family 扩展、designer tree constraint 全面重构、或新的 UI/DX 审查项混入同一个 owner plan。

## Current Baseline

- `Plan 157`、`Plan 168`、`Plan 178` 已分别关闭 validation owner、built-in form targeting、bootstrap lifecycle 的前一轮收口，但 2026-05-03 审查重新确认仍有 residual contract drift：projected child editor 的 validation metadata 没有和相对路径 authoring 一起投影；validation transitional state 仍可能被执行路径当成“无错误”；cross-form `submitForm` 与 timeout cancellation 也仍存在跨层语义裂缝。
- `Plan 168` 已冻结 built-in `formId` baseline：`submitForm` 的 cross-form targeting 是真实 supported contract，而不是可选 future surface；本计划不重新决定这件事，只负责修复 `flux-action-core` 仍在 dispatcher 层提前拦截、导致 live behavior 偏离已关闭 baseline 的 residual bug，并同步任何仍会引用该 baseline 的 docs/tests/reference docs。
- `Plan 175` 已关闭 Flow Designer/Report/Word 的 review-4 问题，但本次审查确认的 Flow Designer 问题属于另一层：tree mode 当前仍通过 `tree -> graph projection -> recreate core` 工作，且 live editing 仍未把文档宣称的 port-first semantics 兑现到命令、校验、持久化、回渲染链路。
- 当前 active docs 在 Flow Designer 主题上并不完全一致：`docs/architecture/flow-designer/design.md` 仍记录了 `TreeDocument -> GraphDocument -> createDesignerCore()` 的现状，而 `docs/architecture/flow-designer/tree-mode.md` 又把 `TreeDesignerCore`、shared `selection/history/clipboard/snapshot` 写成 baseline；因此 Phase 3 同时 owning **doc/doc drift** 与 **doc/code drift**，closure 时必须把文档和 live behavior 一起收敛到单一事实。
- 现有 active docs 已把 projected child authoring、shared action cancellation semantics 写成当前 baseline；本计划默认目标是**让代码追上文档**。对于 Flow Designer，则是让 docs 与代码一起收敛到同一个最终 baseline。其中本计划在 proposal 阶段已冻结三个执行基线，避免把关键语义留到实现时再临时决定：
  - Phase 1 基线：`bootstrapping` / `refreshing` 期间的 validation request 必须等待 owner 进入 `active` 后再执行，不能立即返回与“验证通过”无法区分的 clean result。
  - Phase 2 基线：沿用 `Plan 168` 已关闭的 `formId` baseline，修复 dispatcher/runtime split；`timeout` 必须与父级 abort 组合，而不是替换父级 signal。
  - Phase 3 基线：tree mode 必须保留 tree edit 前后的 shared `selection`、`history (undo/redo)`、`snapshot` 连续性；`clipboard` 不作为本计划 closure 前提，`docs/architecture/flow-designer/tree-mode.md` 中若仍声明 tree path 已共享 clipboard，则需在本计划内基于 live behavior 明确收敛或降级。
- 这 6 个问题横跨 `flux-renderers-form-advanced`、`flux-react`、`flux-runtime`、`flux-action-core`、`flow-designer-core`、`flow-designer-renderers`。它们分属三个 execution slices，但都指向同一个 repo-level failure mode：contract surface 已出现，live semantics 仍不完整。

## Goals

- 让 projected child editor 的 relative-path authoring、validation metadata lookup、owner lifecycle gating 在 supported paths 内重新形成一致语义。
- 让 built-in `submitForm` targeting 和 `timeout`/abort propagation 回到单一执行语义，避免 dispatcher/runtime 之间继续各说各话。
- 让 Flow Designer 的 tree mode 和 port-first contract 至少在当前公开 baseline 内形成真实 live behavior，而不是文档/UI 先承诺、命令层仍停留在 node-to-node graph shell。

## Non-Goals

- 不在本计划内推广新的 validation owner families，或重做完整 multi-owner architecture。
- 不在本计划内重开 hidden-field policy、`summary-gate`、`submitWhenHidden` 等已由 `Plan 168` / `Plan 178` 关闭的主题，除非执行中证明它们是本计划 6 个问题的直接根因。
- 不在本计划内做 Flow Designer tree constraint 全面治理，例如 `minBranches` / `maxBranches` / `allowChild` / `isTerminal` 的完整 enforcement；这些若仍成立，应进入单独 successor plan。
- 不在本计划内处理本次审查之外的新 UI、a11y、i18n、性能或 test-quality 审查项。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/detail-view/*`
- `packages/flux-renderers-form-advanced/src/composite-field/*`
- `packages/flux-renderers-form-advanced/src/variant-field/*`
- `packages/flux-react/src/field-frame.tsx`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-renderers-form/src/field-utils/*`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `packages/flux-action-core/src/operation-control.ts`
- `packages/flux-runtime/src/action-adapter.ts`
- `docs/references/action-payload-matrix.md`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-page-helpers.tsx`
- `packages/flow-designer-renderers/src/designer-canvas.tsx`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts`
- `packages/flow-designer-renderers/src/designer-command-adapter-graph.ts`
- `packages/flow-designer-renderers/src/designer-command-adapter-helpers.ts`
- `packages/flow-designer-renderers/src/designer-command-types.ts`
- `packages/flow-designer-renderers/src/designer-action-provider.ts`
- `packages/flow-designer-renderers/src/designer-manifest.ts`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/*`
- `packages/flow-designer-renderers/src/tree-commands.ts`
- `packages/flow-designer-core/src/core.ts`
- `packages/flow-designer-core/src/designer-core-types.ts`
- `packages/flow-designer-core/src/core/constraints.ts`
- `packages/flow-designer-core/src/core-edge-commands.ts`
- focused regression tests proving each semantic fix
- `docs/architecture/form-validation.md`
- `docs/architecture/object-field.md`
- `docs/architecture/variant-field.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/references/action-payload-matrix.md`
- `docs/architecture/flow-designer/canvas-adapters.md`
- `docs/architecture/flow-designer/collaboration.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/tree-mode.md`
- corresponding execution-date `docs/logs/` entries

### Out Of Scope

- generalized validation-owner family rollout beyond the currently supported projected child paths
- report designer / word editor work
- Flow Designer tree mutation constraint enforcement beyond what is strictly needed to keep this plan's tree/runtime baseline coherent
- implementing new built-in `setValue` / `setValues` component-registry targeting beyond preserving the already-closed `Plan 168` baseline and correcting any docs that accidentally overstate it
- unrelated docs cleanup or old completed-plan archival

## Execution Plan

### Phase 1 - Projected Validation Metadata And Lifecycle Convergence

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/*`, `packages/flux-renderers-form-advanced/src/composite-field/*`, `packages/flux-renderers-form-advanced/src/variant-field/*`, `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-renderers-form/src/field-utils/*`, `packages/flux-runtime/src/form-runtime-validation.ts`, focused tests, `docs/architecture/form-validation.md`, `docs/architecture/object-field.md`, `docs/architecture/variant-field.md`, `docs/architecture/value-adaptation-and-detail-field.md`

- [x] Re-audit the live projected child-editor paths (`object-field`, `variant-field`, `detail-view`, and any shared projected runtime helpers) and freeze the minimal supported baseline for relative-name validation metadata lookup.
- [x] Implement a real projected validation metadata path so child fields using relative names resolve field-level validation behavior against the correct owner-local subtree instead of falling back to parent defaults.
- [x] Make validation requests respect the frozen transitional lifecycle baseline: `bootstrapping` / `refreshing` requests wait until the owner becomes `active`, and must not resolve immediately as ordinary clean success.
- [x] Add focused regression tests that prove projected child editors preserve field-level required/behavior semantics and that transitional validation requests are deferred until activation rather than silently returning clean success.

Exit Criteria:

- [x] Projected child editors resolve field-level validation metadata using the same relative-path baseline that value reads/writes already use.
- [x] `bootstrapping` / `refreshing` owners no longer execute ordinary validation as an implicit “no errors” path; live behavior shows deferred execution until activation.
- [x] Focused tests cover both projected validation metadata lookup and transitional lifecycle gating in live code.
- [x] `docs/architecture/form-validation.md`, `docs/architecture/object-field.md`, `docs/architecture/variant-field.md`, and `docs/architecture/value-adaptation-and-detail-field.md` describe the final supported baseline only.
- [x] `docs/logs/` corresponding execution-date entry is updated.

### Phase 2 - Built-In Submit Targeting And Timeout Cancellation Semantics

Status: completed
Targets: `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/flux-action-core/src/operation-control.ts`, `packages/flux-runtime/src/action-adapter.ts`, focused tests, `docs/architecture/action-scope-and-imports.md`, `docs/references/action-payload-matrix.md`

- [x] Re-audit the already-frozen `Plan 168` baseline for `submit` / `submitForm` and treat this phase as a residual implementation-alignment pass, not a contract re-decision.
- [x] Keep `setValue` / `setValues` out of implementation scope for this phase; if `docs/architecture/action-scope-and-imports.md` or `docs/references/action-payload-matrix.md` still overstate broader component-registry targeting while this phase edits adjacent text, narrow that wording back to the already-closed `Plan 168` baseline instead of silently widening runtime scope.
- [x] Remove the current dispatcher/runtime split so cross-form `submitForm` targeting reaches the runtime target-resolution path instead of being rejected for lacking local `ctx.form`.
- [x] Rework timeout control so adding `timeout` does not sever parent abort propagation; timeout and upstream cancellation must compose by preserving parent cancellation while still producing structured timeout results.
- [x] Add focused regression tests for cross-form submit targeting, timeout + parent abort interplay, and structured cancellation/timed-out result classification.

Exit Criteria:

- [x] Built-in `submit` / `submitForm` once again match the already-closed `Plan 168` baseline: supported cross-form targeting works end to end through dispatcher and runtime adapter.
- [x] Parent abort still reaches timed actions after `timeout` is enabled.
- [x] Focused tests prove both cross-form submit targeting and timeout/cancellation composition.
- [x] `docs/architecture/action-scope-and-imports.md` and `docs/references/action-payload-matrix.md` describe the final supported baseline only.
- [x] `docs/logs/` corresponding execution-date entry is updated.

### Phase 3 - Flow Designer Tree Runtime And Port Semantics Convergence

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/designer-page-helpers.tsx`, `packages/flow-designer-renderers/src/designer-canvas.tsx`, `packages/flow-designer-renderers/src/designer-command-adapter.ts`, `packages/flow-designer-renderers/src/designer-command-adapter-graph.ts`, `packages/flow-designer-renderers/src/designer-command-adapter-helpers.ts`, `packages/flow-designer-renderers/src/designer-command-types.ts`, `packages/flow-designer-renderers/src/designer-action-provider.ts`, `packages/flow-designer-renderers/src/designer-manifest.ts`, `packages/flow-designer-renderers/src/designer-xyflow-canvas/*`, `packages/flow-designer-renderers/src/tree-commands.ts`, `packages/flow-designer-core/src/core.ts`, `packages/flow-designer-core/src/designer-core-types.ts`, `packages/flow-designer-core/src/core/constraints.ts`, `packages/flow-designer-core/src/core-edge-commands.ts`, focused tests, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/tree-mode.md`, `docs/architecture/flow-designer/canvas-adapters.md`, `docs/architecture/flow-designer/collaboration.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/flow-designer/api.md`

- [x] Land the frozen tree-mode baseline: tree edits preserve shared `selection`, `history (undo/redo)`, and `snapshot` continuity instead of recreating those core-owned states on each tree mutation.
- [x] Make that tree-mode baseline observable in live code and regression tests, rather than relying on `tree -> graph -> recreate core` behavior hidden behind stable React props.
- [x] Carry port identity through the live editing chain: command payloads, connect/reconnect handlers, edge creation, validation hooks, persistence in `GraphEdge`, and Xyflow render-back must all preserve the selected source/target ports for the supported baseline.
- [x] Carry the same port identity through the public `designer:*` action and manifest surface so namespaced action callers and documented API payloads no longer lose information that the canvas path preserves.
- [x] Explicitly reconcile the current `clipboard` doc claim in `docs/architecture/flow-designer/tree-mode.md`: prove it in live tree mode and keep it, or narrow the doc in the same phase so no unsupported shared-state promise remains.
- [x] Add focused regression tests proving tree edits do not reset `selection`/`history`/`snapshot` for the supported tree baseline, and that multi-port connections preserve and re-render port identity.

Exit Criteria:

- [x] Tree-mode live behavior preserves `selection` / `history (undo/redo)` / `snapshot` continuity across tree edits.
- [x] Live editing preserves supported port identity end to end for connect/reconnect/render-back paths.
- [x] `designer:*` action payloads, manifest-declared contracts, and canvas/bridge callbacks agree on the same supported port-aware payload shape.
- [x] `docs/architecture/flow-designer/tree-mode.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/canvas-adapters.md`, `docs/architecture/flow-designer/collaboration.md`, `docs/architecture/flow-designer/config-schema.md`, and `docs/architecture/flow-designer/api.md` all describe the same final tree/port baseline with no remaining bridge-contract drift.
- [x] Focused tests cover tree-mode state stability and port-aware edge round-tripping.
- [x] `docs/architecture/flow-designer/design.md` and `docs/architecture/flow-designer/tree-mode.md` match the final supported baseline only.
- [x] `docs/logs/` corresponding execution-date entry is updated.

## Validation Checklist

> **关闭条件**：只有本 section 所有条目及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。本计划涉及代码变更，因此关闭前仍需完成 focused verification、repo-wide verification 和独立 closure audit。

- [x] projected child editors no longer lose field-level validation metadata when using relative names
- [x] transitional validation-owner lifecycle no longer masquerades as successful ordinary validation
- [x] built-in `submitForm` targeting is a single live fact across dispatcher, runtime adapter, docs, and tests
- [x] timeout and parent cancellation compose without severing abort propagation
- [x] Flow Designer tree-mode baseline is truthful in both docs and live runtime behavior
- [x] Flow Designer supported port semantics survive connect/reconnect/persist/render-back paths
- [x] focused regression coverage exists for each plan-owned semantic fix
- [x] independent subagent or independent reviewer closure audit is completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

- The biggest scope risk is silently reopening older completed plans without explicitly recording what this plan newly owns. Execution should treat this plan as a successor for the six confirmed residuals only.
- The biggest semantic risk is “fixing” the projected validation gap by layering another renderer-local workaround instead of landing a reusable owner-local projection contract.
- The biggest migration risk in Phase 2 is breaking schemas that accidentally depend on current `submitForm` rejection or timeout behavior; tests must distinguish intentional narrowing from accidental regression.
- The biggest architectural risk in Phase 3 is claiming tree runtime stability while still recreating the underlying core on each tree edit. Closure must check live behavior, not just renamed helpers or new types.

## Closure

Status Note: All three plan phases are landed, focused and repo-wide verification are green, and the independent closure audit confirmed the remaining work was limited to doc wording and closure bookkeeping now recorded here.

Closure Audit Evidence:

- Reviewer / Agent: independent subagent audit `ses_2147b8296ffevWBlyq7B3066eL`
- Evidence: initial audit found remaining doc/test/closure gaps; follow-up audit cleared runtime/test concerns and final spot-check reduced the remaining blockers to doc wording plus checklist bookkeeping. Those final doc edits landed in `docs/architecture/flow-designer/design.md` and `docs/architecture/flow-designer/api.md`, while repo-wide verification completed green via `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.

Follow-up:

- If tree constraint enforcement or broader owner-family work remains after this plan, move it into explicit successor plans rather than silently extending this scope.
