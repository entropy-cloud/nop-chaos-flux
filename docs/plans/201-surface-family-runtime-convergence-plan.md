# 201 Surface Family Runtime Convergence Plan

> Plan Status: planned
> Last Reviewed: 2026-05-04
> Source: `docs/architecture/surface-owner.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`, `docs/architecture/flux-core.md`, `docs/references/action-payload-matrix.md`, `docs/logs/2026/05-01.md`, `docs/logs/2026/05-04.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-renderers-basic/src/dialog.tsx`, `packages/flux-renderers-basic/src/drawer.tsx`, `packages/flux-renderers-basic/src/use-surface-renderer.ts`, `packages/flux-renderers-basic/src/declarative-surface-stack.ts`
> Related: `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md`, `docs/plans/194-form-submit-validation-timing-and-lifecycle-safety-plan.md`

## Purpose

把当前仍然分裂的 surface 实现收口到一个真实的 surface-family runtime：对外继续保留 declarative `type: 'dialog' | 'drawer'` 与 built-in `openDialog` / `openDrawer`，但对内统一进入 `SurfaceRuntime`、共享 `SurfaceEntry` 栈、共享 close 语义、共享 status publication、共享 scope/lifecycle/validation owner 规则。

这份计划只 owner surface family 本身的 runtime convergence，不扩散成 CRUD quick-edit、designer/report/word 自定义弹层、或更宽泛的 action DSL 重写计划。

## Current Baseline

- `docs/architecture/surface-owner.md` 已把长期基线写清楚：declarative `dialog` / `drawer` 与 action-opened `openDialog` / `openDrawer` 不应长期保留两套 runtime，而应共享同一个 `SurfaceRuntime + root host + SurfaceEntry` 模型。
- `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md` 已显式把 declarative `dialog` / `drawer` renderer path 与 managed `SurfaceRuntime` path 的统一排除在 scope 外，因此当前残留 gap 有明确 successor-owner 空位。
- live code 仍然存在双轨：
  - managed path 走 `packages/flux-runtime/src/surface-runtime.ts` + `packages/flux-react/src/dialog-host.tsx`
  - declarative path 走 `packages/flux-renderers-basic/src/use-surface-renderer.ts` + `packages/flux-renderers-basic/src/declarative-surface-stack.ts`
- declarative path 当前自己维护 `open`/`active` stack snapshot，并在 renderer 内直接发布 `statusPath`，没有注册成 `SurfaceEntry`，也没有进入 shared `DialogHost` surface stack。
- managed path 当前已经具备 `SurfaceRuntime.open/close/closeTop()`、`SurfaceEntry`、surface-root validation owner、shared host rendering 等基础设施，但仍是 only-for-managed path，而不是整个 surface family 的唯一 runtime substrate。
- managed open 也仍有内部 drift：`openDialog` 通过 `createDialogScope(ctx)` 创建 child scope，而 `openDrawer` 在 `packages/flux-runtime/src/action-adapter.ts` 中手写了另一套 scope init / pending id 逻辑。
- `docs/architecture/surface-owner.md` 当前已把 close/status publication baseline 冻结为 close 时发布 closed summary `{ open: false, active: false, opening: false, closing: false }`；`packages/flux-runtime/src/surface-runtime.ts` 已符合该基线，但 declarative path 在 `packages/flux-renderers-basic/src/use-surface-renderer.ts` unmount cleanup 里仍写 `undefined`，形成明确 doc/code drift。
- `closeSurface` 当前 live 行为仍偏向“优先关闭当前 action context 上的 `ctx.dialogId`，若缺失则退回 surface store top entry”这一默认 targeting 规则；这与 owner docs 中“关闭当前 surface / top-most active surface”的统一说法还没有形成完全显式且经 parity-proof 的单一实现基线。
- `packages/flux-react/src/dialog-host.tsx` 当前只有在 root render tree 同时提供 `page` 与 `surfaceRuntime` 时才渲染 shared host stack；若 declarative surface convergence 需要覆盖非 page-root render 场景，必须在本计划内显式裁定 root plumbing，而不能默认假设现有 host 已覆盖所有 declarative path。
- 现有 focused tests 主要覆盖 managed action-opened path（例如 `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.test.ts`、`packages/flux-react/src/__tests__/dialog-host.test.tsx`），而 declarative path 的 convergence-proof 仍明显不足。

## Goals

- 让 declarative `type: 'dialog' | 'drawer'` 与 built-in `openDialog` / `openDrawer` 共用一个真实的 `SurfaceRuntime` / `SurfaceEntry` / root host stack。
- 把 surface-family 的 close baseline 收口到 `closeSurface` 语义，同时保留 `closeDialog` / `closeDrawer` 仅作为 compatibility alias。
- 统一 dialog/drawer 的 child scope 创建、surface status publication、active-stack 规则、dismiss/close lifecycle、validation owner、以及 host rendering boundary。
- 用 focused tests 证明 surface family 不再依赖 renderer-local declarative stack sidecar 才能成立。
- 完成后让 owner docs 只描述一个 live supported surface runtime baseline，而不是“文档统一但代码双轨”的过渡状态。

## Non-Goals

- 不在本计划内重写整个 action algebra，也不改变 public authoring DSL 中 `type: 'dialog' | 'drawer'` 与 `openDialog` / `openDrawer` 的存在。
- 不在本计划内处理 CRUD `quickEdit.mode: 'dialog'` 这类局部 UI shell 与 table 私有编辑器收口；若后续需要接入 shared surface runtime，另开 successor plan。
- 不在本计划内扩展 future `sheet` 的完整产品能力；只允许保留类型位与 surface-family extensibility，不要求交付 `sheet` renderer。
- 不在本计划内重做 shadcn/ui dialog/drawer primitives 或其视觉样式。
- 不在本计划内把所有 workbench/app 私有 modal manager 一次性改造成 shared surface runtime consumer。

## Scope

### In Scope

- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-runtime/src/surface-runtime.ts`
- `packages/flux-runtime/src/action-adapter.ts`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-react/src/dialog-host.tsx`
- `packages/flux-react/src/dialog-host-surface.tsx`
- `packages/flux-react/src/schema-renderer.tsx` and related root surface-runtime plumbing as needed
- `packages/flux-renderers-basic/src/dialog.tsx`
- `packages/flux-renderers-basic/src/drawer.tsx`
- `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- `packages/flux-renderers-basic/src/declarative-surface-stack.ts`
- focused tests covering declarative and action-opened surface parity
- `docs/architecture/surface-owner.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/flux-core.md`
- relevant `docs/components/dialog/design.md`, `docs/components/drawer/design.md`, and `docs/logs/`

### Out Of Scope

- CRUD quick-edit local dialog shell and table-owned editor flows
- Flow Designer / Report Designer / Word Editor private modal implementations
- broad action DSL redesign beyond the surface built-in actions directly touched here
- unrelated validation timing / async governance / request-runtime work already owned by other plans
- introducing a second host runtime beyond the current React host

## Execution Plan

### Phase 1 - Freeze One Live Surface-Family Baseline

Status: planned
Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-runtime/src/action-adapter.ts`, `docs/architecture/surface-owner.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-core.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] Re-audit the live declarative path and managed path entrypoints, then record one explicit implementation baseline for `SurfaceRuntime.open/close`, `SurfaceEntry`, status publication, and child-scope creation that the remaining phases must converge to.
- [ ] Fix the current declarative-vs-managed status-publication drift against the already-frozen owner baseline: surface-family close/unmount should publish the same closed summary instead of clearing declarative status to `undefined`.
- [ ] Narrow compatibility explicitly: `closeDialog` / `closeDrawer` remain selector aliases only, while all owner docs and new tests assert `closeSurface` semantics.
- [ ] Normalize managed dialog/drawer scope creation into one shared runtime-owned helper or seam so `openDialog` and `openDrawer` do not keep separate child-scope semantics.
- [ ] Record the exact live `closeSurface` default-target rule that closure will preserve or intentionally change, so later phases cannot close on naming alignment while still leaving context-target vs top-of-stack ambiguity.

Exit Criteria:

- [ ] One explicit live baseline for surface-family open/close/status/scope semantics is written into the owner docs named in this phase.
- [ ] `packages/flux-runtime/src/action-adapter.ts` no longer carries materially different dialog-vs-drawer scope-init behavior without a recorded design reason.
- [ ] The plan and owner docs no longer treat surface close-status publication as an open design choice; the declarative implementation drift is classified as an in-scope fix.
- [ ] Active docs describe only one supported surface-family close/status baseline.
- [ ] `docs/logs/2026/05-04.md` or the execution-day log is updated.

### Phase 2 - Converge Declarative Surfaces Onto Shared SurfaceRuntime

Status: planned
Targets: `packages/flux-renderers-basic/src/dialog.tsx`, `packages/flux-renderers-basic/src/drawer.tsx`, `packages/flux-renderers-basic/src/use-surface-renderer.ts`, `packages/flux-renderers-basic/src/declarative-surface-stack.ts`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/dialog-host-surface.tsx`, `packages/flux-runtime/src/surface-runtime.ts`, root surface-runtime plumbing as needed

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] Make declarative `dialog` / `drawer` register into the shared `SurfaceRuntime` / `SurfaceEntry` model instead of maintaining a renderer-local stack in `declarative-surface-stack.ts`.
- [ ] Remove or reduce `declarative-surface-stack.ts` so declarative active-surface semantics no longer depend on a separate sidecar stack.
- [ ] Ensure declarative surfaces render through the same root host stack as action-opened surfaces, rather than directly owning an isolated renderer-local lifecycle path.
- [ ] Keep public renderer contracts stable where possible (`open`, `defaultOpen`, `statusPath`, `container`, `onOpen`, `onClose`), but re-route their implementation through shared surface-runtime ownership.
- [ ] Preserve or deliberately re-home surface-root validation owner behavior so declarative surfaces do not regress relative to the owner baseline established in Phase 1.

Exit Criteria:

- [ ] Declarative `dialog` / `drawer` no longer require a separate renderer-local active-stack source of truth to compute `active`/close/status behavior.
- [ ] Shared host rendering is the only supported root surface stack for both declarative and action-opened surfaces in this plan's scope.
- [ ] Focused tests prove declarative surfaces create/read the same surface-family runtime structures expected by the host stack.
- [ ] Relevant owner docs and component docs are updated to the landed baseline.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Prove Surface Parity And Close Residual Drift

Status: planned
Targets: `packages/flux-runtime/src/__tests__/*surface*`, `packages/flux-react/src/__tests__/*dialog*`, `packages/flux-renderers-basic/src/__tests__/*`, scoped docs, this plan

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] Add focused tests that prove declarative and action-opened surfaces share the same close semantics (`closeSurface` default target, explicit `surfaceId`, alias compatibility only where still supported).
- [ ] Add focused tests that prove dialog and drawer share the same child-scope initialization baseline, including `data` patch semantics and lifecycle cleanup.
- [ ] Add focused tests that prove active/top-surface behavior, status publication, and validation-owner wiring no longer diverge by entry path.
- [ ] Add focused tests that prove declarative user-visible contracts still behave correctly after convergence, including `open`, `defaultOpen`, `container`, `onOpen`, `onClose`, and `statusPath`.
- [ ] Re-audit for leftover dual-path code or docs that still describe declarative surfaces as a separate runtime family.
- [ ] Run required verification for code changes and record any unrelated failures separately from this plan's closure evidence.

Exit Criteria:

- [ ] Focused tests cover both declarative and action-opened dialog/drawer paths for open/close/status/scope behavior.
- [ ] Focused tests cover the preserved declarative renderer contract surface (`open`, `defaultOpen`, `container`, `onOpen`, `onClose`, `statusPath`).
- [ ] No in-scope live code path still depends on the old declarative surface sidecar as a second source of truth.
- [ ] `pnpm typecheck`, `pnpm build`, and `pnpm lint` pass after in-scope code changes; `pnpm test` is run and any unrelated failures are explicitly adjudicated.
- [ ] Scoped owner docs describe only the final landed surface-family baseline.
- [ ] `docs/logs/` corresponding date entry is updated.

## Risks And Notes

- The biggest risk is accidentally keeping two sources of truth under a thinner wrapper: e.g. declarative renderers appear to call shared helpers but still privately own `active` stack or status publication. Closure must require deletion or clear de-ownership of the second source, not just indirection.
- The second biggest risk is behavior drift during convergence: declarative `open/defaultOpen/onOpen/onClose/container` props are already user-visible and cannot silently regress.
- The most likely proof gap is tests that only cover `openDialog` / `openDrawer` while declarative `type: 'dialog' | 'drawer'` still bypasses the shared lifecycle. This plan must close that gap explicitly.
- If future work wants to onboard CRUD quick-edit or workbench-private shells onto the shared surface runtime, that should be a narrow successor after this plan lands the core family baseline.

## Closure Gates

- [ ] All in-scope confirmed live surface-family defects are fixed.
- [ ] All in-scope confirmed contract drifts between owner docs and live surface behavior are resolved.
- [ ] Declarative and action-opened surfaces share one live runtime family in the in-scope code paths.
- [ ] `closeSurface` is the only active baseline in owner docs and tests; `closeDialog` / `closeDrawer` remain compatibility-only if still retained in code.
- [ ] Dialog and drawer no longer diverge on runtime-owned scope initialization without an explicit documented reason.
- [ ] Surface status publication has one landed baseline across both entry paths.
- [ ] Required focused verification is complete for entry-path parity, close semantics, scope semantics, active-stack semantics, and preserved declarative renderer contracts.
- [ ] No in-scope live defect or contract drift is silently downgraded to deferred or follow-up.
- [ ] Affected owner docs and component docs are synchronized to the landed live baseline, or explicitly adjudicated as not requiring updates.
- [ ] `docs/logs/` updated with the implementation and closure context.
- [ ] Independent closure audit completed before marking this plan `completed`.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
