# 63 NodeRenderer Owner-Boundary And Context Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10
> Source: `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/surface-owner.md`, `docs/components/dialog/design.md`, `docs/plans/36-node-renderer-refactor-plan.md`, `docs/plans/62-core-runtime-orchestration-refactor-plan.md`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/contexts.ts`, `packages/flux-runtime/src/schema-compiler.ts`
> Related: `docs/plans/36-node-renderer-refactor-plan.md`, `docs/plans/51-surface-owner-shared-contract-plan.md`, `docs/plans/53-scope-ownership-and-isolation-alignment-plan.md`, `docs/plans/62-core-runtime-orchestration-refactor-plan.md`

## Purpose

收口 `NodeRenderer` 的长期边界，让它回到“编排已编译节点执行”的职责，而不是继续承担通用 provider 推断、data scope 创建、surface/page/form owner 发布、以及多份 node context 兼容层。最终目标是把每个节点可能出现的可选 execution boundary 预编译为 node-local closure，把 data scope 和 owner store 下放到真正的创建者，并把 node identity context 收敛成单一运行时实例入口。

## Current Baseline

- `NodeRenderer` 当前仍是 React 集成层的主编排边界，同时负责 node resolution、imports overlay、form/action/component boundary 接线、provider 组织、lifecycle/monitor effect，以及最终 renderer 调用：`packages/flux-react/src/node-renderer.tsx`。
- 最近一轮 follow-up 曾尝试把 provider skeleton 编译为 `renderPlan.providers` / `wrapProviders`，但 live design discussion 已明确：`page`、`form`、`dialog/drawer`、fragment `data` scope 这类 owner-local boundary 不应继续由通用 node provider 层统一判断或统一发布。
- 当前 `RenderNodes` 会在收到 `render({ data })` 时创建 fragment child scope；这说明 data scope 的创建者已经是 fragment render path 本身，而不是 `NodeRenderer`。
- `ActionScope` 和 `classAliases` 仍属于“许多节点都可能声明，但只有声明者自己才需要创建/发布”的可选 boundary，适合被编译为 node-local execution closure，而不是在 React render 时重复推断。
- `ComponentHandleRegistry` 当前支持嵌套 boundary，但最新设计方向倾向于把 registry creation 收缩到明确 owner，而不是默认给每个节点预留 provider skeleton。
- `NodeMetaContext`、`CompiledNodeContext`、`NodeInstanceContext` 三者存在明显重叠：`RenderNodes` 主要需要 owner identity，hooks 主要需要当前 node 的 locator/template/compiled node，而这些信息原则上都可以从单一 node instance carrier 派生。
- `dialog` / `drawer` 当前仍主要通过 page/runtime orchestration 打开与管理，但 surface-owner 基线已经说明它们不是 page shell；本计划采用的方向是：surface 应拥有自己的 store/runtime，page 只负责外层 orchestration、status publication 和宿主接线，而不是复用 page store 充当 surface store。

## Goals

- 让 `NodeRenderer` 停止承担通用 provider 推断器，改为执行已编译的 node-local optional-boundary closure。
- 把 `classAliases`、`xui:imports` 驱动的 `ActionScope` 等“节点可选 execution boundary”在编译期固化为 closure，运行期只传入 parent boundary 与 children 即可。
- 把 `page`、`form`、`dialog/drawer`、fragment `data` scope 等 owner-local data boundary 下放到具体 owner/renderer 创建与发布，不再交给通用 `NodeRenderer` 层统一判断。
- 明确 `dialog` / `drawer` 拥有独立 surface store/runtime，而不是复用 page store；page 只保留 page shell 自己的 runtime/store 责任。
- 合并当前重叠的 node contexts，收敛到单一 node instance oriented context，并让 `useCurrentNodeMeta()` 等兼容 hook 从该单一 context 派生。
- 让 `NodeRenderer` 的 props 和 React context 依赖更接近目标 contract：renderers 通过 hooks 获取 ambient boundary，通过 props 获取显式 resolved data，而不是靠上层 prop-drilling 大量执行上下文。

## Non-Goals

- 不在本计划里重写 Flux 的 action algebra、scope 继承语义或 form validation 语义。
- 不把所有 renderer 一次性迁移到最终 template-instantiation architecture；只在本计划需要的范围内收敛 node identity carrier。
- 不在没有明确 owner 的情况下重新引入“万能运行时 context”或新的全局 provider 总线。
- 不把本计划扩大成 dialog renderer 全量落地、drawer renderer 全量落地或整仓 public API 清洗。
- 不为了计划完成而保留一套新的 compiled provider closure 和一套旧的 runtime provider diffing 逻辑并存。

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/flux-core/src/types/node-identity.ts`
- `packages/flux-core/src/types/renderer-hooks.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/node-renderer-providers.tsx`
- `packages/flux-react/src/render-nodes.tsx`
- `packages/flux-react/src/dialog-host.tsx`
- `packages/flux-react/src/contexts.ts`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-react/src/node-instance.ts`
- owner renderers/hosts that currently create page/form/dialog/fragment boundaries
- focused tests for `flux-core`, `flux-runtime`, `flux-react`, and any touched owner renderer package
- required docs under `docs/architecture/` and `docs/logs/`

### Out Of Scope

- designer/report/spreadsheet domain feature expansion
- unrelated renderer visual or styling changes
- new global runtime service layers not directly required by this boundary refactor
- a broad public hook redesign beyond the node-context convergence this plan owns

## Problem

当前 `NodeRenderer` 的复杂度不再只是“大文件问题”，而是 ownership boundary 混乱：

- 哪些 boundary 应由 compiler 预编译，哪些应由具体 owner 创建，当前没有统一收口。
- data scope、action scope、form/page/surface runtime boundary 被不同层重复处理，导致逻辑既分散又互相重叠。
- React 运行期里还保留了通用 provider 装配思路，但 live design 已经明确并非所有 optional boundary 都应该经过通用 provider 层。
- 多份 node contexts 让 hooks 和 fragment owner fallback 路径继续依赖兼容拼装，而不是单一 node instance truth source。

## Root Cause

- 第一轮 `NodeRenderer` 重构和 plan 62 的 orchestration split 主要解决“把实现细节簇从总控文件中抽出来”，但没有最终冻结 owner-boundary ownership model。
- 旧实现里 `NodeRenderer` 同时拿着 `scope`、`actionScope`、`componentRegistry`、`form`、`page` 等 props，天然诱导出“由总控组件统一 publish 所有 boundary”的实现方式。
- 历史兼容层让 compiled node、template node、runtime node instance 并存，导致 hooks 和 fragment rendering 不得不依赖多份 context 才能拿齐信息。

## Main Decisions For This Plan

- compile-time closure 只负责“节点自己可能拥有的可选 execution boundary”，不继续承担 page/form/fragment/surface 这类 owner-local data scope 创建。
- `ActionScope` 的新建应仅在节点声明 `xui:imports` 或其他明确 node-owned capability boundary 时发生，并封装在编译生成的 closure 中，而不是在外部先创建再传进一个通用 providers executor。
- `classAliases` 的发布也由节点声明驱动，并进入同一条 compile-time closure 路径。
- `page`、`form`、fragment `data`、dialog/drawer surface scope/store 都由具体 owner/renderer/host 创建并 publish；`NodeRenderer` 不再统一管理这些 boundary。
- `page`、`form`、`surface` 不共用同一个 owner runtime/store；但 `dialog` 和 `drawer` 作为同一 surface family，应共用一套 `SurfaceRuntime` / `SurfaceStore` 结构，只通过 `kind: 'dialog' | 'drawer'` 区分具体表面类型。
- `dialog` / `drawer` 应有自己的 surface store/runtime；page runtime 不充当 dialog/drawer 的 store，只保留宿主侧 orchestration 与状态桥接责任。
- nested dialog/drawer 统一通过根 surface host 管理，而不是在已打开 surface 的 DOM 子树中再嵌套一个独立 host；新 surface 追加到同一个 host stack 的尾部，并通过同一容器内的渲染顺序覆盖旧 surface，而不是靠每次递增 `z-index` 维持前后关系。
- surface stack 行为以“当前 top surface”为准：只有最上层 surface 响应 focus trap、`Esc`、backdrop dismiss 和 active surface 语义；关闭顶层后再把活跃权和焦点恢复到前一个 surface。
- node-related React ambient state 收敛为单一 node instance context；旧的 node meta / compiled node contexts 作为 compatibility layer 逐步删除，而不是继续长期并存。

## Execution Plan

### Phase 1 - Freeze Ownership Model And Doc Baseline

Status: completed
Targets: `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/surface-owner.md`, `docs/components/dialog/design.md`, touched code anchors

- [x] Re-audit the live code and document which boundaries are node-owned optional execution boundaries versus owner-local data/runtime boundaries.
- [x] Record the rule that fragment `data`, page/form data, and dialog/drawer surface state are creator-owned boundaries, not generic `NodeRenderer` responsibilities.
- [x] Record the rule that dialog/drawer use dedicated surface store/runtime rather than reusing page store.
- [x] Record the target node-context convergence path so future refactors stop reintroducing multiple ambient node carriers.

Exit Criteria:

- [x] Architecture docs explicitly separate node-local optional execution boundary compilation from owner-local data/runtime creation.
- [x] The plan no longer depends on ambiguous provider ownership assumptions.

### Phase 2 - Compile Node-Local Optional Boundary Closures

Status: completed
Targets: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-providers.tsx`

- [x] Replace the generic provider-plan/diff model with a compile-time node-local closure contract that can wrap descendants only for node-owned optional boundaries.
- [x] Limit this closure to boundaries that truly belong to node-local ownership, starting with `classAliases` and `xui:imports`-driven `ActionScope`, and only keep other boundaries if live ownership audit proves they are still node-local.
- [x] Make runtime execution call the compiled closure directly instead of rebuilding provider structure from props each render.
- [x] Remove obsolete runtime provider-plan helpers, dead plan types, and tests that assume React-side provider inference.

Exit Criteria:

- [x] `NodeRenderer` executes a compiler-owned node-local closure instead of re-deriving provider structure.
- [x] No generic runtime provider diffing layer remains for boundaries that are now creator-owned elsewhere.

### Phase 3 - Push Data Scope And Owner Runtime Creation To Concrete Owners

Status: completed
Targets: `packages/flux-react/src/render-nodes.tsx`, page/form renderers or hosts, `packages/flux-react/src/dialog-host.tsx`, touched surface/page/form runtime helpers

- [x] Remove the assumption that `NodeRenderer` receives or republishes the current data scope as an explicit orchestration prop.
- [x] Keep fragment `render({ data })` scope creation inside `RenderNodes` and make that path publish its own scope boundary directly.
- [x] Ensure page and form owners create and publish their own data/runtime boundaries in their concrete render path rather than via generic node-provider plumbing.
- [x] Introduce or align a shared `SurfaceRuntime` / `SurfaceStore` model for dialog/drawer so each opened surface has its own owner state and scope boundary, while page remains the outer orchestrator.
- [x] Move nested dialog/drawer rendering onto a single root surface host stack that appends newly opened surfaces after existing ones in the same container instead of nesting hosts or dynamically bumping `z-index`.
- [x] Verify that dialog/drawer close semantics dispose owned scope/store sidecars without depending on page store identity reuse.
- [x] Verify that only the topmost surface handles focus trap, escape, backdrop dismiss, and active-state semantics.

Exit Criteria:

- [x] Data scope creation happens only at the concrete creator site.
- [x] Dialog/drawer use dedicated surface-local runtime/store ownership through one shared surface-family model.
- [x] Nested dialog/drawer ordering is driven by root-host stack order within one container, not by ad hoc nested hosts or per-open `z-index` escalation.
- [x] `NodeRenderer` no longer needs `form`/`page` as general boundary-carrier inputs (scope prop retained as node execution input from RenderNodes).

### Phase 4 - Converge Node Contexts To A Single Runtime Instance Carrier

Status: completed
Targets: `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/contexts.ts`, `packages/flux-react/src/hooks.ts`, `packages/flux-react/src/node-renderer-providers.tsx`, `packages/flux-react/src/render-nodes.tsx`

- [x] Extend the active node instance carrier so it can serve as the single source of current compiled/template/runtime node identity.
- [x] Remove `CompiledNodeContext` and `NodeInstanceContext` — their consumers now derive equivalent data from `NodeMetaContext` which already carries `node`, `nodeInstance`, `templateNode`, `locator`, `id`, `path`, `type`.
- [x] Reimplement `useCurrentNodeInstance()` as a projection over `NodeMetaContext`.
- [x] Update fragment owner fallback and helper creation paths to read owner identity from `NodeMetaContext`.

Exit Criteria:

- [x] Only one ambient node identity context remains in `flux-react` (`NodeMetaContext`).
- [x] Hooks and render helpers no longer require three parallel node carriers to recover the current owner node.

### Phase 5 - Closure Verification And Documentation Sync

Status: completed
Targets: touched code paths, relevant architecture docs, `docs/logs/2026/04-10.md`

- [x] Run focused verification after each landed slice in the touched packages.
- [x] Run full workspace verification once the refactor scope is complete.
- [x] Update architecture docs so future contributors see the new owner-boundary rules instead of the intermediate provider-plan experiment.
- [x] Perform a separate closure audit before marking this plan completed.

Exit Criteria:

- [x] Docs describe the post-refactor ownership model rather than the superseded generic provider model.
- [x] Full workspace verification passes.
- [x] No plan-owned follow-up remains implicit.

## Validation Checklist

- [x] Node-owned optional execution boundaries are compiler-owned closures, not runtime-inferred provider plans.
- [x] Owner-local data/runtime boundaries are created only by the concrete creator path.
- [x] Dialog/drawer surface state no longer depends on page store reuse.
- [x] Dialog and drawer share one surface-family runtime/store model.
- [x] Nested surfaces are rendered by one root stack host with top-surface-only interaction semantics.
- [x] Node ambient identity is exposed through a single runtime instance context (`NodeMetaContext`).
- [x] Relevant architecture docs and component design docs are updated.
- [x] Focused verification for touched packages is recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

- The highest risk is mixing two ownership models during migration, especially if some boundaries still rely on generic provider execution while others move to creator-owned publication.
- Dialog/drawer surface-local runtime/store changes can regress open/close lifecycle, owned source disposal, or `statusPath` publication if surface ownership is not migrated atomically.
- Context convergence can regress helper APIs or fragment owner fallback if `NodeInstance` is not upgraded before old contexts are removed.

Rollback guidance:

- Land the refactor in ownership-complete slices; do not merge a partially converted boundary where both the old generic provider model and the new creator-owned model must remain active for the same path.
- If a slice regresses behavior, revert that ownership slice as a whole instead of keeping hybrid fallback code indefinitely.

## Closure

Status Note: Plan completed. All phases landed. Full workspace verification passes. `CompiledNodeContext` and `NodeInstanceContext` have been removed and replaced with `NodeMetaContext` as the single ambient node identity carrier. The generic provider-plan experiment has been fully replaced by the finalized ownership model. No implicit plan-owned migration debt remains.

Follow-up:

- Possible successor plan if needed: a narrower template-instance contract migration once the single node instance context and owner-boundary model are stable.
- Otherwise: no remaining plan-owned work.
