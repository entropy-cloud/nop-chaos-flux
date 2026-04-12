# 75 Repo Refactor Hotspots Remediation Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-12
> Source: `docs/skills/code-refactor-discovery-prompt.md`, `docs/references/refactoring-guidelines.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/renderer-runtime.md`, `docs/logs/2026/04-12.md`
> Related: `docs/plans/62-core-runtime-orchestration-refactor-plan.md`, `docs/plans/68-owner-based-validation-runtime-alignment-plan.md`, `docs/plans/69-dynamic-schema-validation-owner-lifecycle-implementation-plan.md`, `docs/plans/70-composite-value-fields-and-validation-integration-plan.md`, `docs/plans/71-large-inline-table-aggregate-validation-performance-plan.md`, `docs/plans/74-form-runtime-validation-owner-extraction-plan.md`, `docs/plans/74-reaction-and-renderer-perf-fix-plan.md`

## Purpose

收口本仓库当前 live code 中 ROI 最高、且仍未收敛的重构热点，优先解决会持续制造结构性维护成本的 P1 问题，而不是做一次宽泛的“代码变优雅”清扫。

## Current Baseline

- `packages/flux-runtime/src/index.ts` 已重新增长到 500+ 行，除了 runtime assembly 之外，还承载 validation ajax 执行、page/form runtime 工厂、source/reaction wiring、runtime disposal 等实现细节，与 `docs/architecture/flux-runtime-module-boundaries.md` 中“entry file is assembly layer”的边界不再完全一致。
- `packages/flux-renderers-form/src/renderers/array-editor.tsx` 与 `key-value.tsx` 仍同时维护本地副本、ref、副作用同步和 form/scope canonical value，属于仓库历史上已多次致 bug 的 dual state 模式。
- `packages/flux-react/src/use-node-source-props.ts` 仍在 React hook 内执行 source 请求编排、loading/error patch 维护和 stale-run 抑制，运行时生命周期尚未完全下沉到 runtime owner。
- `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts` 仍通过 `useScopeSelector((scope) => scope)` 订阅整棵 scope，再读取分页/选择状态；selection 还维护 `allSelected` 这份重复状态。
- `packages/flux-runtime/src/index.test.ts` 已是 6405 行跨域巨型测试文件，会反向抬高 runtime 子域重构成本。
- 本计划不以历史日志里的旧热点为依据，而以当前仓库 live code 为准；像 `flow-designer-core/src/core.ts`、`report-designer-core/src/core.ts` 这类虽大但仍保持 core/orchestrator 边界的文件，不纳入当前 owner plan。

## Goals

- 让 `flux-runtime` 入口重新回到 assembly-first 边界，避免继续成为默认实现落点。
- 消除 `array-editor` / `key-value` 的持久 dual state，让 composite field 读取与注册统一基于 canonical form/scope value。
- 把 node source prop 的异步解析生命周期从 React 层继续下沉到 runtime-owned contract，至少移除 React 侧的持久请求编排和 boolean cancellation。
- 收窄 table control 的响应式订阅范围，并消除重复选择状态，降低无关 scope 更新造成的重渲染。
- 把 runtime 主测试文件拆成更贴近 owner 边界的 focused suites，降低后续结构重构阻力。

## Non-Goals

- 不做 repo-wide “所有 300+ 行文件都拆掉”的机械化拆分。
- 不把当前仍合理的 domain core orchestrator 也纳入同一波重构，例如 `flow-designer-core/src/core.ts`、`report-designer-core/src/core.ts`。
- 不在本计划中顺带完成 `table-renderer.tsx` 的全部 UI contract 清理、目录结构归组、或 spreadsheet canvas doc/code 对齐；这些属于后续低优先级 owner plan。
- 不引入新的兼容层来同时保留双状态和单状态两套主路径。

## Scope

### In Scope

- `packages/flux-runtime/src/index.ts` 及其新提取模块
- `packages/flux-renderers-form/src/renderers/array-editor.tsx`
- `packages/flux-renderers-form/src/renderers/key-value.tsx`
- `packages/flux-react/src/use-node-source-props.ts` 与其对应 runtime owner surface
- `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`
- `packages/flux-runtime/src/index.test.ts` 与相关 runtime test helpers
- 为以上重构必须更新的 architecture/docs/logs

### Out Of Scope

- `packages/flux-renderers-data/src/table-renderer.tsx` 的隐式布局和原生按钮替换
- `packages/flux-renderers-basic/src/dynamic-renderer.tsx` 的 runtime ownership 收敛
- `docs/architecture/report-designer/spreadsheet-canvas-css.md` 与 `spreadsheet-grid.tsx` 的对齐
- `packages/flux-runtime/src/`、`packages/flux-react/src/` 等目录树的批量归组
- 与本计划无直接关系的 playground/demo/refactor

## Execution Plan

### Phase 1 - Runtime Entry Boundary Re-Extraction

Status: planned
Targets: `packages/flux-runtime/src/index.ts`, `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/*`

- [ ] 重新审计 `createRendererRuntime()` 里的实现块，明确哪些属于 assembly、哪些属于 runtime helper/owner factory/teardown coordination。
- [ ] 把不属于 assembly 的块提取到聚焦模块，例如 runtime-owned factory helper、teardown coordinator、source/reaction/runtime bootstrap helper。
- [ ] 保持 `index.ts` 只做稳定装配与 package surface，不重新引入“通用 helper 垃圾桶”模式。
- [ ] 如边界变化影响文档表述，更新 `docs/architecture/flux-runtime-module-boundaries.md`。

Exit Criteria:

- [ ] `packages/flux-runtime/src/index.ts` 不再同时承载 source/reaction disposal、validation ajax helper、runtime factory 细节等多类实现逻辑。
- [ ] 提取后的模块边界与 runtime ownership 文档一致，且无新增循环依赖。

### Phase 2 - Composite Field Single Source Of Truth

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/array-editor.tsx`, `packages/flux-renderers-form/src/renderers/key-value.tsx`, focused tests

- [ ] 让 `array-editor` 渲染和 registration 直接读取 canonical form/scope value，而不是维护持久 `items` 镜像状态。
- [ ] 让 `key-value` 渲染和 registration 直接读取 canonical form/scope value，而不是维护持久 `pairs` 镜像状态。
- [ ] 只保留真正短生命周期的 UI state；删除 purely-sync ref/effect glue。
- [ ] 更新或新增 focused tests，覆盖外部 setValue、modelGeneration refresh、子路径校验、append/remove 流程。

Exit Criteria:

- [ ] `array-editor` 与 `key-value` 不再通过本地 state/ref 长期维护与 form store 等价的值副本。
- [ ] 外部写入、registration refresh、child validation 在 focused tests 中都基于 canonical value 正常工作。

### Phase 3 - Source Prop Runtime Ownership Convergence

Status: planned
Targets: `packages/flux-react/src/use-node-source-props.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `docs/architecture/renderer-runtime.md`

- [ ] 重新定义 node source prop 的 owner boundary：React 负责订阅/消费，runtime 负责异步解析、取消和 transient state。
- [ ] 从 `use-node-source-props.ts` 中移除 `Promise.all(...executeSource)` 编排和 `cancelled` boolean cancellation 模式。
- [ ] 让 source prop resolution 暴露 subscription-first snapshot 或等价 runtime-owned contract，避免每次 React effect 自管请求生命周期。
- [ ] 为 source prop resolution 增加 focused runtime/React integration coverage，验证 stale-run、error、loading 和 prop 变更行为。

Exit Criteria:

- [ ] `use-node-source-props.ts` 不再直接拥有 source 请求 orchestration 和 boolean cancellation。
- [ ] source prop lifecycle 的取消和状态语义由 runtime owner surface 统一提供。

### Phase 4 - Table Control Subscription Narrowing

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`, related table tests

- [ ] 把 `useScopeSelector((scope) => scope)` 改成只订阅 pagination/selection 实际使用的 state path。
- [ ] 删除 `allSelected` 这份重复状态，改为从 `selectedRowKeys` 与当前 source 推导。
- [ ] 核对 controlled/local/scope 三种 ownership 下的行为一致性。
- [ ] 增加 focused tests 或更新现有 tests，覆盖无关 scope 更新不触发控制状态漂移、逐行选择后 header checked 正确、external selection sync 正确。

Exit Criteria:

- [ ] table controls 不再因为整棵 scope 任意变化而被动重渲染。
- [ ] selection header 状态完全由 canonical selection 推导，无额外可漂移副本。

### Phase 5 - Runtime Test Decomposition

Status: planned
Targets: `packages/flux-runtime/src/index.test.ts`, runtime test helpers, split test files

- [ ] 审计 `index.test.ts` 当前主题分布，按 runtime owner 边界拆成 focused suites。
- [ ] 抽出公共 helper/fixture，避免每个新 suite 重复 setup 50+ 行。
- [ ] 保持已有行为覆盖不回退，迁移后按子域维持可读命名与清晰 owner 对应。
- [ ] 关闭后确认 `index.test.ts` 不再是继续堆积新行为的默认测试入口。

Exit Criteria:

- [ ] `packages/flux-runtime/src/index.test.ts` 不再作为跨 compiler/actions/validation/sources/imports 的总装测试文件存在。
- [ ] 新测试文件结构能直接映射 runtime owner 边界，后续重构不再被单文件 setup 拖住。

## Validation Checklist

- [ ] `flux-runtime` 入口边界重新与 `docs/architecture/flux-runtime-module-boundaries.md` 对齐。
- [ ] `array-editor` / `key-value` 不再维护持久 dual state。
- [ ] source prop resolution 的取消与 transient state 改为 runtime-owned contract。
- [ ] table control 订阅范围收窄，重复选择状态移除。
- [ ] runtime 测试拆分完成且覆盖未回退。
- [ ] `docs/logs/2026/04-12.md` 或后续执行日 dev log 记录本计划执行与关键边界决策。
- [ ] 相关 architecture/docs 已更新。
- [ ] focused verification 已完成。
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- `array-editor` / `key-value` 去双状态时，最容易回归的是输入过程中的 registration/validation 联动；执行时必须先用 focused tests 锁住外部写入与 model refresh 场景。
- source prop owner 下沉可能影响现有 renderer 对 loading/error patch key 的假设；若 contract 不稳，应先补 focused tests 再迁移实现。
- runtime test 拆分应在行为等价前提下进行；如果拆分阶段发现 helper 提取导致断言意图变弱，优先保留显式断言而不是为了“整齐”过度抽象。

## Closure

Status Note: Not started. This plan can close only after all five phases land, verification is green, related docs/logs are updated, and an independent closure audit confirms no remaining plan-owned P1 refactor work in this scope.

Closure Audit Evidence:

- Reviewer / Agent: TBD
- Evidence: TBD

Follow-up:

- Low-priority renderer contract cleanup for `packages/flux-renderers-data/src/table-renderer.tsx` should move to a successor plan if still desired after Phase 4.
- Directory regrouping and spreadsheet canvas doc/code alignment remain outside this plan and should be tracked separately if promoted.
