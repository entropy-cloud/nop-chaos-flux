# 62 Core Runtime Orchestration Refactor Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-10
> Source: `docs/architecture/flux-core.md`, `docs/architecture/frontend-baseline.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/articles/flux-design-introduction.md`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flow-designer-core/src/core.ts`
> Related: `docs/plans/36-node-renderer-refactor-plan.md`, `docs/plans/37-flux-core-runtime-architecture-convergence-plan.md`, `docs/plans/43-react-18-to-19-best-practices-migration-plan.md`, `docs/plans/45-react19-compiler-and-high-frequency-interaction-refactor-plan.md`

## Purpose

在不改变 Flux 当前运行语义的前提下，继续收口核心运行时编排层，把已经演化成“大型总控文件”的实现拆回更清晰的职责边界，为未来 10 年的运行时演进保留足够稳定的骨架。

## Current Baseline

- Flux 已明确把自己定义为最终 DSL VM，而不是运行时装配平台；结构扩展应尽量前移到 loader/装配期，runtime 负责执行、局部状态和宿主边界：`docs/architecture/flux-dsl-vm-extensibility.md`, `docs/articles/flux-design-introduction.md`。
- 仓库已完成多轮第一阶段重构：`NodeRenderer` 已从 2026-04-04 的计划中抽出部分 effect/helper；table renderer、spreadsheet interactions、async abortable effect 等也在 2026-04-10 完成了一轮 focused split。
- 但几个核心 orchestrator 仍明显偏重，并且不是单纯“文件长”问题，而是同一文件同时承载多个可独立演化的责任簇：
- `packages/flux-runtime/src/action-runtime.ts` 仍同时负责 action payload 评估、monitor payload、built-in dispatch、component targeting、namespace resolution、parallel/then/onError control flow、retry/timeout/debounce、plugin beforeAction/onError 接线。
- `packages/flux-runtime/src/schema-compiler.ts` 仍同时负责 schema diagnostics、field inspection、shape validation、node compilation、linkage compilation、lifecycle extraction、compiled target rewrite、cid/template identity enrichment。
- `packages/flux-runtime/src/form-runtime.ts` 已拆出 validation/array/registration/subtree/state 子模块，但主文件仍承载 form scope 建立、status binding、field patching、submit orchestration、dependent revalidation、store mutation 编排。
- `packages/flux-react/src/node-renderer.tsx` 仍同时承担 external-store selective subscription、node resolution、imports overlay scope、debug/form/component registration side effects、event/region assembly、render monitor、lifecycle dispatch、provider composition。
- `packages/flux-react/src/dialog-host.tsx` 仍存在较明显的 dialog/drawer 对称重复，且 title/body/provider 组合逻辑重复出现。
- `packages/flow-designer-core/src/core.ts` 虽然其子域 helper 已拆入 `core/*`，但主入口仍同时维护 document mutation API、history、selection、clipboard、viewport、layout、palette/inspector UI shell state、transaction orchestration。
- React 19 基线和高频交互面的第一轮收口已经完成，但 live repo audit 仍显示：`useEffectEvent` 在代码中尚无实际采用；`startTransition` / `useDeferredValue` 已在少数高 ROI 场景落地，但并未成为核心 orchestration 层的边界设计原则。

## Goals

- 继续把 runtime 核心中的“实现细节簇”从主 orchestrator 中拆出，保留薄而清晰的 orchestration entry。
- 让 `action-runtime.ts`、`schema-compiler.ts`、`form-runtime.ts`、`node-renderer.tsx`、`flow-designer-core/src/core.ts` 的职责边界与 Flux 当前文档中的 compile/runtime/react/designer 分层更一致。
- 为后续命名调整、执行模型增强、designer host 扩展保留更稳定的模块边界，而不是继续在单文件里横向堆功能。
- 把 React 19 的使用从“局部 API adoption”提升到“边界设计约束”：只在真正合适的 effect/event/非紧急更新路径采用新能力，不做形式主义语法翻新。

## Non-Goals

- 不重写 Flux 的运行时语义，不引入新的 DSL 模型或新的 action algebra。
- 不把本计划扩大成全仓统一拆分、全量重命名或大规模 package boundary 调整。
- 不把现有 form runtime 机械迁移到 `useActionState` / `useFormStatus` / optimistic UI。
- 不因为 React 19 而批量替换所有 `forwardRef`、provider 写法或 hook 风格。
- 不重新打开已经完成且 live repo 已落地的计划范围，除非本计划实施时发现其残留问题直接阻塞当前目标。

## Scope

### In Scope

- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- 为上述文件新增的最小必要内部模块
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/dialog-host.tsx`
- `packages/flux-react/src/hooks.ts`
- 为上述文件新增的最小必要内部模块
- `packages/flow-designer-core/src/core.ts`
- 相关 focused tests
- `docs/skills/code-refactor-prompt.md`
- `docs/logs/2026/04-10.md`

### Out Of Scope

- `flux-formula` 执行引擎替换
- designer/report/word/spreadsheet 领域能力扩张
- 新 package 创建
- 视觉样式调整
- 业务组件层的广泛 React 19 语法迁移

## Problem

当前仓库最值得继续重构的区域，已经从“显眼的大文件”收缩为“核心 orchestrator 中仍未抽出的实现簇”。这些文件的问题不是简单行数，而是：

- 同一文件同时拥有稳定边界职责与高变化实现细节，导致未来继续迭代时只能顺手往主入口里堆逻辑。
- 文档已经清楚定义 compile/runtime/react/designer 边界，但 live code 中仍有部分边界靠主文件内约定维持，而不是靠模块结构体现。
- 一些 React 集成层文件仍混合了订阅、scope overlay、副作用注册、provider 组织、UI 渲染，未来继续引入 React 19 能力时容易变成局部打补丁。

## Root Cause

- 第一轮重构优先解决 correctness、性能和计划闭环，很多文件只完成了“最小可读性提升”，没有进入第二阶段边界收敛。
- Flux 是 compile-first、runtime-owned 的低代码内核，核心 orchestrator 天然需要知道很多概念，因此很容易在增量开发中演化成总控文件。
- React 19 adoption 已经有 guardrails，但“哪些代码应保持 orchestrator、哪些代码应下沉为 effect/control/normalization helper”还没有形成新的统一重构目标。

## Refactor Candidates

1. `packages/flux-runtime/src/action-runtime.ts`
2. `packages/flux-runtime/src/schema-compiler.ts`
3. `packages/flux-runtime/src/form-runtime.ts`
4. `packages/flux-react/src/node-renderer.tsx`
5. `packages/flux-react/src/dialog-host.tsx`
6. `packages/flow-designer-core/src/core.ts`

## Execution Plan

### Phase 1 - Freeze Boundaries And Refactor Rules

Status: planned
Targets: `docs/architecture/flux-core.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `packages/flux-runtime/src/*`, `packages/flux-react/src/*`, `packages/flow-designer-core/src/core.ts`

- [ ] Re-audit each target file and mark which logic is true orchestration versus extractable implementation detail.
- [ ] Define explicit extraction rules for this plan: what stays inline, what must move, and what is intentionally deferred.
- [ ] Record which React 19 APIs are relevant for these targets and which are explicitly not ROI-positive here.

Exit Criteria:

- [ ] Each target file has a boundary note that can explain why it stays an orchestrator after the refactor.
- [ ] The plan no longer risks turning into a broad style cleanup.

### Phase 2 - Split Runtime Action And Schema Compiler Helpers

Status: planned
Targets: `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/schema-compiler.ts`

- [ ] Extract action helper clusters into internal modules such as payload evaluation, built-in dispatchers, component/namespace dispatch, and action control-flow helpers where that split reduces total complexity.
- [ ] Extract schema compiler helper clusters into internal modules such as schema shape validation, node field inspection, target rewrite/enrichment, and compile pipeline helpers.
- [ ] Keep the public runtime/compiler contract unchanged while making the top-level files read as orchestration entry points.

Exit Criteria:

- [ ] `action-runtime.ts` no longer mixes all dispatch modes and all control-flow helpers inline.
- [ ] `schema-compiler.ts` no longer mixes diagnostics, validation, compilation, and target enrichment in one monolithic file.

### Phase 3 - Split Form And React Orchestration Edges

Status: planned
Targets: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/hooks.ts`

- [ ] Further split `form-runtime.ts` around scope/status binding, value patch/update orchestration, submit orchestration, and dependent revalidation if those boundaries are stable.
- [ ] Further split `node-renderer.tsx` only where the extracted piece is genuinely an implementation detail rather than core orchestration.
- [ ] Deduplicate dialog/drawer host rendering paths in `dialog-host.tsx` without introducing a leaky mega abstraction.
- [ ] Audit for real `useEffectEvent` opportunities in React integration code; adopt it only where it clearly simplifies stable subscriptions or event-like effects.

Exit Criteria:

- [ ] `form-runtime.ts` is closer to a composition root than a mixed implementation file.
- [ ] `node-renderer.tsx` remains an orchestrator, but with fewer embedded effect/control details.
- [ ] `dialog-host.tsx` no longer duplicates the same provider/title/body assembly flow for dialog and drawer.

### Phase 4 - Split Flow Designer Core Shell State

Status: planned
Targets: `packages/flow-designer-core/src/core.ts`

- [ ] Separate document mutation orchestration from shell-state concerns such as palette/inspector collapse, viewport persistence, clipboard helpers, and transaction/history glue where the split is stable.
- [ ] Keep `createDesignerCore()` as the single public construction entry while reducing the number of unrelated concerns it carries inline.

Exit Criteria:

- [ ] `core.ts` reads as a composition root over smaller document/history/selection/shell helpers.
- [ ] Public `DesignerCore` behavior remains unchanged.

### Phase 5 - Verification And Documentation Closure

Status: planned
Targets: touched code paths, `docs/logs/2026/04-10.md`, relevant architecture docs if boundary semantics change

- [ ] Run focused package verification after each slice.
- [ ] Run full workspace verification before closure.
- [ ] Update docs only where the refactor changes how boundaries should be understood by future contributors.

Exit Criteria:

- [ ] The new module boundaries are reflected in docs or explicitly confirmed to be implementation-only.
- [ ] Full repo verification passes.

## Validation Checklist

- [ ] Runtime/React/designer public behavior remains unchanged
- [ ] New modules follow existing dependency direction and package boundaries
- [ ] No new circular dependency is introduced
- [ ] `docs/skills/code-refactor-prompt.md` reflects the reusable review criteria from this audit
- [ ] Focused tests added or updated where extraction risk is non-trivial
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: not started

Follow-up:

- Possible successor plan if needed: a narrower naming-convergence plan for internal runtime terminology after module boundaries are stabilized.
