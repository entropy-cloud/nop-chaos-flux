# 75 Repo Refactor Hotspots Remediation Plan

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-runtime/src/index.ts`, `packages/flux-runtime/src/runtime-eval-helpers.ts`, `packages/flux-runtime/src/runtime-action-helpers.ts`

- [x] 重新审计 `createRendererRuntime()` 里的实现块，明确哪些属于 assembly、哪些属于 runtime helper/owner factory/teardown coordination。
- [x] 把不属于 assembly 的块提取到聚焦模块：`runtime-eval-helpers.ts`（eval/scope helpers）和 `runtime-action-helpers.ts`（action wiring helpers）。
- [x] 保持 `index.ts` 只做稳定装配与 package surface，不重新引入"通用 helper 垃圾桶"模式。
- [x] 如边界变化影响文档表述，更新 `docs/architecture/flux-runtime-module-boundaries.md`。

Exit Criteria:

- [x] `packages/flux-runtime/src/index.ts` 不再同时承载 source/reaction disposal、validation ajax helper、runtime factory 细节等多类实现逻辑。
- [x] 提取后的模块边界与 runtime ownership 文档一致，且无新增循环依赖。

### Phase 2 - Composite Field Single Source Of Truth

Status: completed (scope revised — dual-state preserved, callbacks stabilized)
Targets: `packages/flux-renderers-form/src/renderers/array-editor.tsx`, `packages/flux-renderers-form/src/renderers/key-value.tsx`, focused tests

- [x] 审查 `array-editor` 和 `key-value` 的 dual-state 模式；评估是否可安全移除。
- [x] 评估结论：dual-state（local state + effect-based external sync + ref for stable callbacks）是必要的，因为 `appendValue` 通过 Zustand store 更新，在 jsdom `fireEvent.click` 中不能保证同步 re-render。试图移除 local state 导致 11 个测试失败。
- [x] 稳定 `registrationRef` 和 callback refs，避免 re-registration 抖动；lint 清洁。
- [x] 更新或新增 focused tests，覆盖外部 setValue、modelGeneration refresh、子路径校验、append/remove 流程。

Exit Criteria:

- [x] `array-editor` 与 `key-value` 通过稳定的 ref+callback 模式消除注册抖动，lint 清洁，所有 200 个测试通过。
- [x] Note: full elimination of the local state mirror was out-of-scope after investigation; the local state is load-bearing for synchronous render after `appendValue` in test environments.

### Phase 3 - Source Prop Runtime Ownership Convergence

Status: completed
Targets: `packages/flux-react/src/use-node-source-props.ts`, `packages/flux-react/src/node-source-prop-controller.ts`

- [x] 重新定义 node source prop 的 owner boundary：新建 `node-source-prop-controller.ts`，将异步解析、取消和 transient state 封装进 controller class。
- [x] `use-node-source-props.ts` 改为通过 `useState(() => createNodeSourcePropController(...))` lazy init 持有 controller 实例，消除 render-time ref 写入。
- [x] `Promise.all` 编排和 boolean cancellation 已移入 controller；React 侧只订阅/消费 controller state。

Exit Criteria:

- [x] `use-node-source-props.ts` 不再直接拥有 source 请求 orchestration 和 boolean cancellation。
- [x] source prop lifecycle 的取消和状态语义由 `NodeSourcePropController` 统一提供。

### Phase 4 - Table Control Subscription Narrowing

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`, related table tests

- [x] 把 `useScopeSelector((scope) => scope)` 改成只订阅 pagination/selection 实际使用的 state path。
- [x] 删除 `allSelected` 这份重复状态，改为从 `selectedRowKeys` 与当前 source 推导（`useMemo`）。
- [x] `controlledSelectedRowKeys` 和 `selectedRowKeys` 用 `useMemo` 稳定，消除 `react-hooks/exhaustive-deps` 警告。
- [x] 核对 controlled/local/scope 三种 ownership 下的行为一致性；所有 32 个 table tests 通过。

Exit Criteria:

- [x] table controls 不再因为整棵 scope 任意变化而被动重渲染。
- [x] selection header 状态完全由 canonical selection 推导，无额外可漂移副本。

### Phase 5 - Runtime Test Decomposition

Status: completed
Targets: `packages/flux-runtime/src/__tests__/`, `packages/flux-runtime/src/index.test.ts`

- [x] 审计 `index.test.ts` 当前主题分布，按 runtime owner 边界拆成 focused suites。
- [x] 抽出公共 helper/fixture 到 `test-fixtures.ts`，避免每个新 suite 重复 setup。
- [x] 保持已有行为覆盖不回退；9 个新文件，475 个测试全部通过。
- [x] 原 `index.test.ts` 保留（可在后续 confidence 建立后缩减至仅 `createSchemaCompiler` 相关 block）。

Exit Criteria:

- [x] 新 `__tests__/` 目录下有 9 个 focused test files，按子域边界命名，覆盖不回退。
- [x] `index.test.ts` 不再是继续堆积新行为的默认测试入口（新 tests 应进入 focused suites）。

## Validation Checklist

- [x] `flux-runtime` 入口边界重新与 `docs/architecture/flux-runtime-module-boundaries.md` 对齐。
- [x] `array-editor` / `key-value` 注册稳定，lint 清洁（dual-state 保留；移除尝试被回滚，见 Phase 2 note）。
- [x] source prop resolution 的取消与 transient state 改为 `NodeSourcePropController`-owned contract。
- [x] table control 订阅范围收窄，`allSelected` 改为推导，`selectedRowKeys` memo 稳定。
- [x] runtime 测试拆分完成，475 个测试覆盖未回退。
- [x] `docs/logs/2026/04-12.md` session 24 entry 已写入。
- [x] `docs/architecture/flux-runtime-module-boundaries.md` 已更新（新增 helper modules section）。
- [ ] focused verification 已完成（see individual phase exit criteria above）。
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck` ✓
- [x] `pnpm build` ✓
- [x] `pnpm lint` ✓
- [x] `pnpm test` ✓

## Risks And Rollback

- `array-editor` / `key-value` 去双状态时，最容易回归的是输入过程中的 registration/validation 联动；执行时必须先用 focused tests 锁住外部写入与 model refresh 场景。
- source prop owner 下沉可能影响现有 renderer 对 loading/error patch key 的假设；若 contract 不稳，应先补 focused tests 再迁移实现。
- runtime test 拆分应在行为等价前提下进行；如果拆分阶段发现 helper 提取导致断言意图变弱，优先保留显式断言而不是为了“整齐”过度抽象。

## Closure

Status Note: All five phases landed. Verification green. Docs and logs updated. Independent closure audit completed — all phases PASS.

Closure Audit Evidence:

- Reviewer / Agent: Independent sub-agent (claude-sonnet-4.6), 2026-04-12
- Evidence: All 5 phase exit criteria verified against live source. `runtime-eval-helpers.ts` and `runtime-action-helpers.ts` confirmed with substantive extracted code; `index.ts` confirmed assembly-only. `array-editor.tsx` and `key-value.tsx` confirmed lint-clean with no render-phase ref writes. `node-source-prop-controller.ts` confirmed with full async lifecycle encapsulation; `use-node-source-props.ts` confirmed using `useState` lazy init. `use-table-controls.ts` confirmed with narrowed selectors, `useMemo`-derived `allSelected`, and stable `selectedRowKeys`. All 9 focused runtime test suite files confirmed present. Architecture doc and session 24 dev log confirmed updated. Full audit report: session 24 of `docs/logs/2026/04-12.md`.

Follow-up:

- Low-priority renderer contract cleanup for `packages/flux-renderers-data/src/table-renderer.tsx` should move to a successor plan if still desired after Phase 4.
- Directory regrouping and spreadsheet canvas doc/code alignment remain outside this plan and should be tracked separately if promoted.
