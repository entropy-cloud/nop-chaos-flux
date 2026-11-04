# 857 参考文档与 live 代码同步（quick-reference / AGENTS.md / flux-core.md）

> Plan Status: active（draft review 通过，见 Draft Review Record）
> Last Reviewed: 2026-11-05
> Source: `docs/analysis/2026-11-05-full-repo-deep-audit.md` §F-C（C1–C5）
> Related: plan 823（上一轮 quick-reference regeneration）、`docs/references/quick-reference.md`、`docs/architecture/flux-core.md`

## Purpose

把三份参考文档对齐 live code 的当前事实：quick-reference.md 的幽灵成员/缺失成员/过期签名全部修正，AGENTS.md 组件清单补齐，flux-core.md 的一处错误归位声称就地更正；并显式裁决 quick-reference.md 的文档体量债务（65.9 KB > 50 KB 拆分阈值）。修完后文档头部的 freshness 声称必须经得起独立复检。

## Current Baseline

- `docs/references/quick-reference.md`（65.9 KB）经 2026-11-05 深审抽查（约 40 项声称逐一对 live source 核验）确认以下漂移，全部已定位到双侧 file:line：
  - `:752` ScopeRef 块声称 `dispose(): void`——`packages/flux-core/src/types/scope.ts:33-54` 无此成员；live 有 doc 缺的 `source?` lineage 字段（scope.ts:45）。
  - `:307`（自称 complete 的行文）/`:309-376`（清单体）RendererRuntime 清单自称 complete，缺 ~14 个 live 成员（`prepareSchema?` `allocateMountedCid` `createHostProjectionScope` `releaseActionScope` `createComponentHandleRegistry` `resolvePreparedImports` `ensureImportedNamespaces` `getImportedExpressionBindings` `releaseImportedNamespaces` `createSourceObserver` `disposeOwnedPage` `findFirstInScope` `registerRendererReaction` `setEnv`）vs `flux-core/src/types/renderer-core.ts:242-404`。
  - `:163-168` `helpers.dispatch` 缺 `CompiledActionProgram` 参数面、`executeSource` 缺 `options?: { signal?: AbortSignal }`（renderer-core.ts:81-88）。
  - `:83` `events` 值类型应为 `RendererEventHandler | undefined`（renderer-core.ts:204）。
  - `:383-418` FormRuntime 缺 `subscribeToModelGeneration?` / `setRefreshHandler` / `refresh(): Promise<void>`，`validateField`/`validateForm` 缺第三参 `options?: { signal? }`（flux-core/src/types/runtime.ts:543-577）。
  - `:425-455` ValidationScopeRuntime 缺 `subscribeToModelGeneration?`(:487) / `getScopeRootErrors`(:515) / `registerChildContract`/`unregisterChildContract`(:530-531)。
  - `:524-539` SurfaceRuntime 缺 `triggerHook?` / `setSurfaceForm?` / `getSurfaceForm?`（flux-core/src/types/runtime.ts:392-411）。
  - `:485-494` `FormStatusSummary` 缺 `id?` / `name?` / `visited`（flux-core/src/types/runtime.ts:164-176）。
  - `:761-762` `createScopeStore`/`createScopeRef` 被放在 flux-core ScopeRef 节下——实际定义在 `packages/flux-runtime/src/scope.ts:22`（createScopeStore）与 `:432`（createScopeRef），消费侧从 flux-runtime 导入。
  - `:3` 头部 "4/4 API spot-checks pass"（2026-10-31, plan 823）被上述证伪。
- `AGENTS.md:147` 组件清单缺 `DropdownMenu`、`Toolbar`——两者均在 `packages/ui/src/index.ts` barrel（dropdown-menu.js :23、components/toolbar/index.js :61）；清单自称 regenerated 2026-10-31。
- `docs/architecture/flux-core.md:126` 声称"Formula scope proxies（`flux-formula/src/scope.ts`）拦截 `__proto__`/`constructor`/`prototype` 读"——live 的 scope.ts 是 EvalContext/依赖收集工厂、无拦截；危险键守卫实际在 `packages/flux-formula/src/evaluator.ts` 与 `builtins.ts`。
- 其余抽查面（docs/index.md 路由 ~120 行、codebase-map.md、renderer-runtime.md、styling-system.md）核实干净，不在本 plan 内。

## Goals

- quick-reference.md 全部 C4 漂移项修正至与 live source 一致，且修正后逐项可指认 file:line。
- ScopeRef 节重组：dispose 移除、`source?` 补入、createScopeStore/createScopeRef 归位 flux-runtime 并注明导入面。
- RendererRuntime 清单补齐 14 个成员（保留 optional `?` 标记与一行语义），"complete"声称成立。
- AGENTS.md 组件清单补 `DropdownMenu`、`Toolbar`，regeneration 日期注记更新。
- flux-core.md:126 改写为指向真实守卫位置（evaluator.ts / builtins.ts），scope.ts 描述改为其真实职责。
- 头部 freshness 声称改为可核验表述（本轮复核日期 + 抽查口径），不再携带与实况矛盾的"spot-checks pass"数字。
- C5 体量债务显式裁决（见 Deferred But Adjudicated）。

## Non-Goals

- 不重写文档结构、不拆分 quick-reference.md（见 Deferred 裁决）。
- 不修改任何 live source 类型/成员（文档跟随代码，不反向）。
- 不触碰 renderer-runtime.md / styling-system.md 等已核验干净文档。
- 不改变 docs/index.md 路由表（quick-reference.md 路径不变）。

## Scope

### In Scope

- `docs/references/quick-reference.md`（C1 + C4 全部漂移项）
- `AGENTS.md`（组件清单两行）
- `docs/architecture/flux-core.md`（:126 一处改写）
- `docs/logs/2026/11-05.md`（收口记录）

### Out Of Scope

- quick-reference 拆分/重排（Deferred 裁决）
- `packages/` 任何改动
- 其余 architecture docs

## Failure Paths

不适用：纯文档计划，无错误处理/API/鉴权/外部集成面。

## Test Strategy

档位选择：`不适用：纯文档、无行为变更`。验证手段为 Proof 项：每处修正附 live source file:line 对照；头部 freshness 声称由独立 closure audit 抽查复检。

## Execution Plan

### Phase 1 - quick-reference.md 漂移修正

Status: planned
Targets: `docs/references/quick-reference.md`

- Item Types: `Fix | Proof`

- [ ] ScopeRef 块：删除 `dispose(): void` 幽灵成员，补 `source?` lineage 字段（对照 `flux-core/src/types/scope.ts:33-54`）
- [ ] `createScopeStore`/`createScopeRef` 移出 flux-core 归属，标注定义于 `flux-runtime/src/scope.ts` 及消费侧导入面
- [ ] RendererRuntime 清单补齐 14 成员（对照 `renderer-core.ts:242-404`，optional 性保持）
- [ ] `helpers.dispatch` 参数面 + `executeSource` signal 选项（对照 renderer-core.ts:81-88）
- [ ] `events` 值类型 `RendererEventHandler | undefined`（renderer-core.ts:204）
- [ ] FormRuntime / ValidationScopeRuntime / SurfaceRuntime / FormStatusSummary 四块缺失成员与签名补齐（对照 `flux-core/src/types/runtime.ts` 相应行）
- [ ] 头部 freshness 声称改为"2026-11-05 复核（深审轮 §F-C 修正；抽查口径见 audit 报告）"
- [ ] Proof：修正清单逐项附 file:line 对照表（写入本 plan Closure Evidence 或当日 log）

Exit Criteria:

- [ ] 上述修正全部落地，quick-reference.md 中不再存在本 plan Current Baseline 所列任何一条旧声称（grep 可核）
- [ ] 每条修正可指认 live source file:line；独立 audit 抽查任抽 5 项均成立
- [ ] 文档经 `check:docs-garbled`（pnpm check 链内）无新增命中

### Phase 2 - AGENTS.md 组件清单与 flux-core.md 归位

Status: planned
Targets: `AGENTS.md`、`docs/architecture/flux-core.md`

- Item Types: `Fix`

- [ ] AGENTS.md:147 清单按字母序插入 `DropdownMenu`、`Toolbar`，regeneration 注记更新为执行日（并保留"non-exhaustive, check the barrel"引导句）
- [ ] flux-core.md:126 改写：危险键守卫归位 `flux-formula/src/evaluator.ts`/`builtins.ts`；`flux-formula/src/scope.ts` 描述改为 EvalContext/依赖收集工厂职责

Exit Criteria:

- [ ] AGENTS.md 清单与 `packages/ui/src/index.ts` barrel 一致：新增的 `DropdownMenu`、`Toolbar` 两个家族名均能解析到真实 barrel 导出（脚本核验），清单其余项抽查零缺失
- [ ] flux-core.md:126 与 live 守卫位置一致（grep `__proto__` 落点可核）

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_06e266d4（fresh session）
- Verdict: `pass`（round 1 **fail**：一处 Major——FormRuntime/ValidationScopeRuntime/SurfaceRuntime/FormStatusSummary 的 live 路径误写为 `flux-runtime/src/runtime.ts`，实为 `packages/flux-core/src/types/runtime.ts`〔行号逐字节正确〕；修订后 round 2 复核 VERDICT pass，零 Blocker/Major 零残留 finding）
- Rounds: 2
- Findings addressed: Major-1 路径修正（:19/:21/:22/:79 四处）；Minor 全消化——Failure Paths 补"不适用"注记、Phase 2 exit 收紧为"新增两家族名可解析到真实 barrel 导出 + 其余项抽查"、createScopeRef 锚点补 `:432`、complete 声称锚点补 `:307`（round 2 逐项确认）

## Closure Gates

- [ ] C1–C4 全部漂移项修正且逐项可核
- [ ] quick-reference.md 头部 freshness 声称与实况一致
- [ ] AGENTS.md 清单与 ui barrel 脚本化核验一致
- [ ] flux-core.md:126 与 live 一致
- [ ] 不存在被静默降级的 in-scope 项
- [ ] owner-doc 一致性核对通过（本 plan 修改的即 reference docs 本体，无其他 owner 文档需同步）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm check` exit 0（纯文档计划：typecheck/build/lint/test 按 guide 纯文档条款豁免，check 链含 docs-garbled 必跑）

## Deferred But Adjudicated

### quick-reference.md 体量债务（65.9 KB > 50 KB 拆分阈值）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本 plan 交付内容正确性（对齐 live）；体量债务在本轮修改前即存在（未登记过），且拆分是结构性变更——需按主题拆为目录 + 保持 `quick-reference.md` 路径引用兼容（AGENTS.md/docs/index.md 多处路由指向该路径），独立成 plan 才能诚实收口，与本轮漂移修正无依赖关系。
- Successor Required: `yes`
- Successor Path: improvement-analysis 登记后由后续 docs 治理轮立项（拆分方案：按 quick-reference 现有分节拆 `docs/references/quick-reference/` 目录，原路径留索引页）

## Non-Blocking Follow-ups

- 参考文档 freshness 声称目前依赖手改日期，评估给 quick-reference 建一个"清单 vs live source"机械核对脚本（类似 docs-anchor gate 思路），属工具治理轮。

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<收口时填写>>
