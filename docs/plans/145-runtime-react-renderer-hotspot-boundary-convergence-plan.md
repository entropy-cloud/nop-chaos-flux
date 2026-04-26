# 145 Runtime React Renderer Hotspot Boundary Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-04-26
> Source: `docs/skills/code-refactor-discovery-prompt.md`, `docs/references/refactoring-guidelines.md`, `docs/analysis/2026-04-26-flux-architecture-improvement-opportunities.md`, live repo audit of `packages/flux-react`, `packages/flux-runtime`, `packages/flux-renderers-form-advanced`, `packages/flux-renderers-data`, `packages/flow-designer-renderers`, `packages/word-editor-renderers`, `packages/report-designer-renderers`, and `apps/playground`
> Related: `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/125-flux-runtime-async-data-internal-reorganization-plan.md`, `docs/plans/133-node-renderer-runtime-stack-and-import-boundary-refactor-plan.md`, `docs/plans/138-crud-editing-and-request-owned-runtime-successor-plan.md`, `docs/plans/45-react19-compiler-and-high-frequency-interaction-refactor-plan.md`

## Purpose

这份计划收敛当前最值得继续处理的结构性重构热点，在不改变业务逻辑、对外接口、运行结果和用户可见行为的前提下，进一步稳定 `runtime -> react -> renderer/designer` 的职责边界，减少重复实现、跨层污染和历史堆积点。

## Current Baseline

- 当前仓库总体架构方向正确，不需要推翻式重构；真正的问题集中在少数热点文件和重复模式，而不是全局边界失效。
- `packages/flux-runtime`、`packages/flux-react`、`packages/flow-designer-core` 已具备清晰主链，但 `form-runtime`、React hooks 订阅样板、designer mode adapter、高级表单 projection/proxy substrate 仍有未完全收口的重复实现。
- `packages/flux-renderers-form-advanced` 中 `object-field`、`array-field`、`variant-field`、`detail-field`、`key-value` 反复实现 projected scope / projected form / dual-read / child-path 管理逻辑，说明共享基础设施还没有稳定落位。
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` 当前仍维护 renderer-local `resolvedValue` working copy，并在本地 state 与 parent owner 之间做异步 `transformOutAction` 写回；这与 `docs/architecture/object-field.md` 中 inline live-edit、parent-owned projected editor 的 target baseline 不一致。Plan 145 以 live repo behavior 为执行基线，只负责先收敛 shared substrate 和 boundary debt，不在本计划内把 `object-field` 语义直接改成文档 target baseline。
- `packages/flux-renderers-data/src/crud-renderer.tsx` 当前 live baseline 已通过 query-form component handle 和 owner query state 读写收口，不再依赖 DOM 抓取；本计划在 CRUD 方向上的剩余工作主要是避免 query/form/runtime ownership 桥接重新散回 renderer 主体。
- `packages/flow-designer-renderers` 的 tree mode 与 graph mode 分支仍分散在 `designer-page.tsx`、`designer-command-adapter.ts`、`designer-canvas.tsx` 等文件中，容易继续复制路径而不是收敛。
- `packages/flux-react/src/hooks.ts` 已成为外部 store 订阅模板汇聚点；虽然 `hook-subscriptions.ts` 已抽出部分 helper，但 `hooks.ts` 本身仍是混合实现入口，不是只做 re-export 的薄 orchestrator。
- 当前 React 19 的高 ROI 采用主要集中在 `startTransition` 和 `useDeferredValue`；`useEffectEvent` 仍有值得考虑的监听器场景，但不应机械迁移。
- `node scripts/check-oversized-code-files.mjs` 当前没有超过 700 行的错误文件，但存在多个 500+ 行告警文件，其中大多数为测试文件；本计划不以“单纯压行数”为目标，而以职责收敛为目标。
- `packages/flow-designer-renderers/src/index.test.tsx` 已经演化成跨子域的大型集成测试拼盘；它开始把 provider、manifest、statusPath、basic rendering 等多个 owner surface 混在同一文件里。
- 本轮 live audit 同时确认 `packages/flux-renderers-data/src/table-renderer.tsx` 仍是合理 orchestrator，`packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` 的 `legacy-index` 兼容退化仍符合当前文档允许的 object-array identity baseline；这两类文件不应仅因行数或兼容字样被机械纳入本计划。
- 本轮 live audit 还确认了两个真实但独立的后续热点：`packages/word-editor-renderers/src/word-editor-page.tsx` 的 host projection 混合实时 runtime 与 autosave snapshot，`packages/report-designer-renderers/src/host-data.ts` 继续暴露重复 host vocabulary。它们更接近 domain-host projection/contract 收敛面，不属于本计划当前 owner result surface，应在 successor plan 中单独处理。

## Goals

- 收敛高级表单控件共享的 projection/proxy substrate，避免同一模式在多个 renderer 中平行生长。
- 让 inline `object-field`、相关 advanced field projection 先收敛到更稳定的 shared substrate，为后续单独的语义对齐计划创造边界清晰的实施面。
- 收敛 table/crud 的 ownership 适配逻辑，并避免 CRUD query/form/runtime ownership 桥接重新散回 renderer 主体。
- 收敛 flow-designer tree/graph 双模式的 adapter 边界，让 page shell 保持 composition root 角色。
- 收敛 `flux-react` hooks 内部的 external-store 订阅样板，降低后续 hook 扩展成本。
- 收敛直接阻塞这些热点边界整理的少量测试拼盘，让测试 owner 边界与实现 owner 边界重新一致。
- 在不改变现有语义的前提下，把 runtime/react/renderer 的高频重构热点整理成更稳定的工程化结构，并补齐 focused verification 和文档同步。

## Non-Goals

- 不修改任何 schema contract、公开 API、事件语义、状态语义、数据结构语义。
- 不把本计划扩大成“全仓库美化”或“所有大文件拆分”运动。
- 不为了 React 19 采用率去机械迁移 `useActionState`、`useFormStatus`、`useOptimistic`、`forwardRef`。
- 不在本计划内重新设计 Flux primitive、loader 语义或 host contract 基线。
- 不把 playground 历史 demo 全量清理为本计划前置条件；只处理与当前热点边界直接冲突的部分。
- 不把 `word-editor`、`report-designer` 的 host projection / contract 收敛并入本计划；这些热点需要独立 successor plan，而不是塞进 runtime/react/form-advanced owner plan。
- 不在本计划内把 `object-field` 当前 live behavior 直接改写为 `docs/architecture/object-field.md` 的 target semantic baseline；若内部收敛后该语义 gap 仍然存在，应进入独立 successor plan。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/composite-field/*`
- `packages/flux-renderers-form-advanced/src/detail-view/*`
- `packages/flux-renderers-form-advanced/src/variant-field/*`
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- `packages/flux-renderers-data/src/crud-renderer.tsx`
- `packages/flux-renderers-data/src/table-renderer/*`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-command-adapter*.ts`
- `packages/flow-designer-renderers/src/designer-canvas.tsx`
- `packages/flow-designer-renderers/src/tree-commands.ts`
- `packages/flow-designer-renderers/src/index.test.tsx`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- 与上述实现直接相关的 focused tests、architecture docs、component docs、daily logs

### Out Of Scope

- `flux-core`、`flux-compiler`、`flux-formula` 的全局边界重构
- 与本计划热点无关的 renderer 样式或视觉改造
- `spreadsheet`、`word-editor`、`report-designer` 的独立功能重构、host projection 收敛、host-contract vocabulary 收敛
- `word-editor` / `report-designer` host projection or host-contract vocabulary convergence
- 以“压缩所有 500+ 行文件”为目标的机械拆分
- 任何改变 CRUD/query/form/designer 现有用户可见行为的重写

补充约束：若执行本计划时需要修改测试，只允许修改直接验证 in-scope 行为边界的 focused tests；不得把 `spreadsheet`、`word-editor`、`report-designer` 扩大成新的隐含 owner surface。

## Problem

当前代码库最主要的重构收益不在“再发明架构”，而在把已经反复出现的共享模式和跨层污染真正收口。

- 高级表单控件重复实现 projection/proxy substrate，导致同一类逻辑散落在多个 feature 目录下。
- `object-field` 把 inline projected editor 做成了 renderer-local working copy + async writeback 组合，开始偏离 owner 文档与 parent-owned validation/writeback 主链。
- CRUD/query 的主要风险已从 DOM 抓取转为 ownership 桥接再次散回 renderer 主体，而不是继续固定在统一 helper / owner 主链中。
- flow-designer tree/graph 双模式路径跨 page shell、adapter、canvas 分散，page 入口继续承受实现细节堆积风险。
- `flux-react/src/hooks.ts` 的订阅模板重复，让 React integration 层的维护成本持续增长。
- flow-designer 的大型集成测试已经把多个 owner surface 混装在一起，导致测试文件本身也开始制造错误边界。
- `form-runtime` 与 `form-runtime-owner` 虽已拆分，但 owner orchestration 与 validation/public API 收口仍不彻底。

## Root Cause

- 多数热点来自增量开发：新能力优先在现有入口内叠加，而不是先下沉到共享 substrate。
- 某些包已经完成第一轮大拆分，但拆分后的“第二轮收口”没有继续做，导致文件数量变多而基础模式仍重复。
- 低代码 runtime/react/renderer 的边界本身比普通应用更容易出现“看似只是 UI helper，实际在代理 runtime 语义”的混层实现。
- 测试文件长期承担补洞职责后，容易从“单域回归”演化成“多域契约汇总”，反过来冻结错误 owner 边界。
- React 19 已升级，但实际高 ROI 收益更多落在部分交互面；剩余问题更偏结构整理，而不是 API 迁移。

## Execution Plan

### Phase 1 - Freeze Execution Baseline And Verification Map

Status: completed
Targets: this plan, hotspot owner docs, focused verification map

- [x] 把已完成的 live repo audit 结论固化到本计划的 `Current Baseline`、`Scope`、`Out Of Scope`，不再把“重新审 baseline”当成执行阶段主体。
- [x] 为每个热点明确“共享基础设施应该落在哪一层”，避免后续实施时再次把 runtime 语义塞回 feature renderer。
- [x] 明确哪些文件属于合理 orchestrator，哪些文件属于需要继续拆分或下沉 helper 的历史堆积点。
- [x] 明确每个热点的 focused verification 入口和回退路径。

Exit Criteria:

- [x] 每个热点都有 repo-observable baseline 和 owner boundary 说明
- [x] 每个热点都有明确的实施顺序、依赖关系和 focused verification 方案
- [x] `word-editor` / `report-designer` host projection 热点已明确记录为 follow-up surface，而非继续留在本计划的隐含范围内
- [x] `docs/architecture/renderer-runtime.md`、`docs/architecture/form-validation.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`docs/architecture/flow-designer/collaboration.md` 中需要同步的最终设计点已列清
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Converge Form-Advanced Projection And Proxy Substrate

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/composite-field/*`, `packages/flux-renderers-form-advanced/src/detail-view/*`, `packages/flux-renderers-form-advanced/src/variant-field/*`, `packages/flux-renderers-form-advanced/src/key-value.tsx`, `packages/flux-renderers-form-advanced/src/array-editor.tsx`

- [x] 抽出 object/array/variant/detail/key-value 共用的 projected scope / projected form / child-path / dual-read substrate。
- [x] 让 `object-field` 的 shared projection/proxy implementation 收敛到更小的 substrate surface，同时保持当前 live behavior 与 focused tests 不变。
- [x] 清理 feature 目录内重复的 ScopeRef proxy 和 path 映射实现，统一到最小必要共享模块。
- [x] 保留现有 schema contract、事件语义、写回路径和字段可见行为，不引入新的 owner 模型。
- [x] 为 composite/detail/variant/key-value 关键行为补 focused tests，证明重构前后语义不变。

Exit Criteria:

- [x] 高级表单 projection/proxy 基础设施不再由多个 renderer 各自平行实现
- [x] `object-field`、`array-field`、`variant-field`、`detail-field`、`key-value` 的现有行为与测试期望保持一致
- [x] `object-field` 当前 live behavior 与文档 target baseline 的 gap 已被明确记录；若 internal convergence 后仍存在语义差异，已明确移交 successor plan，而不是在本计划中隐式消化
- [x] 相关 `docs/architecture/field-binding-and-renderer-contract.md`、`docs/architecture/value-adaptation-and-detail-field.md`、`docs/architecture/object-field.md`、`docs/architecture/array-field.md`、`docs/architecture/variant-field.md` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Converge Table And CRUD Ownership Boundaries

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/*`, `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-data/src/crud-renderer-ownership.ts`

- [x] 收敛 table pagination/sort/filter/selection/visible-columns 的 local/scope/controlled ownership adapter。
- [x] 保持 CRUD query owner 继续通过 form handle / owner state 主链收口，不让 renderer 主体重新长回 DOM 抓取或散落桥接逻辑。
- [x] 保持 CRUD query submit/reset/refresh 的现有语义、事件顺序和用户可见行为。
- [x] 为 CRUD query、table controls、ownership sync 补 focused tests，防止 query/form/runtime 边界回退。

Exit Criteria:

- [x] CRUD query owner 语义继续通过 form handle / owner state 主链承载，且未重新引入 DOM 抓取
- [x] table ownership sync 只通过明确的 adapter/helper 模块承载，不再把 query/form/runtime ownership 桥接散落回 `crud-renderer.tsx` 与多个 table control call sites
- [x] 相关 `docs/components/crud/design.md`、`docs/components/table/design.md`、`docs/architecture/action-interaction-state.md`、`docs/architecture/data-domain-owner.md` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Converge Flow Designer Tree Graph Adapters

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/use-designer-auto-layout.ts`, `packages/flow-designer-renderers/src/use-designer-shortcuts.ts`, `packages/flow-designer-renderers/src/designer-command-adapter.ts`, `packages/flow-designer-renderers/src/designer-command-adapter-graph.ts`, `packages/flow-designer-renderers/src/designer-command-adapter-helpers.ts`, `packages/flow-designer-renderers/src/designer-canvas.tsx`, `packages/flow-designer-renderers/src/tree-commands.ts`, `packages/flow-designer-renderers/src/test-support.tsx`, `packages/flow-designer-renderers/src/index-test-support.tsx`, `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`, `packages/flow-designer-renderers/src/designer-provider-and-manifest.test.tsx`

- [x] 把 tree mode 与 graph mode 的主要分支下沉到 adapter/helper 边界，让 `designer-page.tsx` 保持 page shell / provider / dialog composition root 职责。
- [x] 清理 page、canvas、command adapter 之间重复的 mode 分支和并列路径。
- [x] 把原 `index.test.tsx` 中跨 provider / manifest / status / rendering 的大拼盘测试按 owner boundary 拆开，避免测试继续冻结错误 page-shell 边界。
- [x] 保持 tree mode、graph mode、plus-button、create dialog、auto-layout、dispatch 语义不变。
- [x] 为 tree/graph 关键路径补 focused tests，并复核既有 designer tests 是否仍覆盖核心语义。

Exit Criteria:

- [x] `designer-page.tsx` 收敛为 page shell / provider registration / dialog composition root，不再保留 tree/graph mode 的主要 command/layout branching implementation
- [x] tree/graph mode 的 command/layout branching 由明确的 adapter/helper 模块承载，且 `designer-page.tsx`、`designer-canvas.tsx` 不再各自维护并列 mode 路径
- [x] flow-designer 关键测试不再把 provider contract、manifest contract、statusPath、basic rendering 长期混装在同一 owner file 中
- [x] 相关 `docs/architecture/flow-designer/design.md`、`docs/architecture/flow-designer/collaboration.md`、`docs/architecture/flow-designer/canvas-adapters.md` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 - Converge Flux React And Form Runtime Internal Substrate

Status: completed
Targets: `packages/flux-react/src/hooks.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`

- [x] 收敛 `hooks.ts` 内 subscribe/getSnapshot/selector 模板，减少重复样板并保持 external-store 订阅行为不变。
- [x] 收敛 `form-runtime.ts` 与 `form-runtime-owner.ts` 的 public API、owner orchestration、validation side effects 边界。
- [x] 只在明确有 ROI 的监听器场景评估 `useEffectEvent`，不做机械 React 19 迁移。
- [x] 为 runtime/react hooks 关键订阅语义补 focused tests，并运行相关 package verification。

Exit Criteria:

- [x] `packages/flux-react/src/hooks.ts` 的 external-store subscribe/getSnapshot/selector 样板由命名良好的共享 helper 承载，或 `hooks.ts` 本身退化为薄 orchestrator / re-export 入口，而 hooks contract 保持不变
- [x] `form-runtime.ts` 与 `form-runtime-owner.ts` 的 owner orchestration、validation side-effect、public API bridging 由明确模块边界承载，不再让两侧继续平行生长同类 orchestration logic
- [x] 相关 `docs/architecture/renderer-runtime.md`、`docs/architecture/form-validation.md`、`docs/architecture/flux-runtime-module-boundaries.md` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

### Phase 6 - Workspace Verification And Closure Audit

Status: completed
Targets: workspace verification, focused tests, affected architecture docs, daily log, this plan

- [x] 运行所有受影响包和工作区验证，确认重构未改变行为。
- [x] 进行完整 plan re-audit，确认没有剩余 plan-owned hotspot 仍停留在“半收口”状态。
- [x] 启动独立 closure audit，区分“接口已存在”与“语义已落地”。

Exit Criteria:

- [x] 所有 execution phases 均已完成并有可追溯验证证据
- [x] 相关 `docs/architecture/`、`docs/components/`、`docs/references/`、`docs/examples/` 中受影响条目已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新
- [x] 独立 closure audit 明确无剩余 plan-owned work

## Validation Checklist

- [x] 高级表单 projection/proxy substrate 已有 focused behavior tests
- [x] CRUD query/table ownership 收敛已有 focused behavior tests
- [x] flow-designer tree/graph adapter 收敛已有 focused behavior tests
- [x] `flux-react` hooks 与 form runtime 收敛已有 focused behavior tests
- [x] flow-designer 大型跨域测试已按 owner boundary 重新分组，或已明确最小保留理由
- [x] 相关 docs/components/examples 已同步
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

- projection/proxy substrate 收敛若误伤 path 映射或 child registration，容易引发 composite field 写回回归；必须先以 focused tests 锁住现有语义。
- CRUD 去 DOM 读值若处理不当，可能改变 query submit/reset 的时序；只能通过现有 owner 主链做等价替换，不能顺手改交互流程。
- flow-designer tree/graph adapter 收敛若把 page shell 与 command dispatch 顺序拆散，容易引发 designer 事件链退化；必须保留 composition root 职责稳定。
- 测试拆分若没有先识别当前文件中的真实 owner grouping，容易把仍然共享 setup 的回归场景拆散成更脆弱的重复 harness；应先按 contract surface 而不是纯行数拆。
- `hooks.ts` 与 `form-runtime` 属于高影响面基础设施，必须放在后期，在前面几个热点完成并稳定后再动。
- 回退策略以 phase 为单位：每个 phase 都先建立 focused verification，再最小化切换调用方；若出现问题，优先回退新抽出的 substrate 或 adapter，不回退已验证的独立前置 phase。

## Closure

Status Note: Plan 145 can close because the live repo now shows all six phases landed and re-audited within the intended `runtime -> react -> form-advanced / CRUD / flow-designer` result surface: advanced-form projected-owner substrate was converged without changing public semantics, CRUD/table ownership now stays on the owner-state / form-handle path, flow-designer page-shell and adapter boundaries were split and re-tested by owner surface, and the remaining `flux-react` / `flux-runtime` subscription-orchestration hotspot was reduced to shared helpers plus focused runtime field-state merge infrastructure. Full workspace verification now passes again (`pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`), and the only remaining adjacent semantic debt (`object-field` inline semantic alignment) has been explicitly moved to `docs/plans/147-object-field-inline-semantics-alignment-successor-plan.md` instead of staying as unnamed plan-owned residue.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: `task_id ses_235f82372ffeNrcYm8Fd1AFzcc` re-audited the live repo against `docs/plans/00-plan-authoring-and-execution-guide.md`, confirmed Phases 1-4 were already closed, flagged the missing Phase 5 doc sync and unnamed `object-field` successor-plan reference, and those closure blockers were resolved before final plan closure.

Follow-up:

- `word-editor` / `report-designer` host projection and host-contract vocabulary convergence now move to `docs/plans/146-domain-host-projection-and-vocabulary-convergence-plan.md`; they are intentionally kept out of Plan 145 after the 2026-04-26 live audit narrowed this plan back to the `runtime -> react -> form-advanced / CRUD / flow-designer` result surface.
- `object-field`'s remaining inline semantic alignment work now moves to `docs/plans/147-object-field-inline-semantics-alignment-successor-plan.md`.
