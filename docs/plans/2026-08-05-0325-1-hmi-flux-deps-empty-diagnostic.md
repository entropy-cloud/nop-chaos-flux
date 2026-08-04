# 01 复杂 flux 表达式订阅路径 `flux-deps-empty` 诊断收口（W1 successor）

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-04-2242 post-remediation audit P2」Wiring (dim 22) 未收口项（W1，roadmap:459）；源审计 `docs/audits/2026-08-04-2242-multi-audit-industrial-hmi.md` §Wiring「[P2] Complex-expression subscription path silently disables on platform collector failure」（:342-359）
> Related: `docs/plans/2026-08-04-2243-1-hmi-lifecycle-destruction-pipeline-hardening.md`（W1 Deferred adjudication，Successor Required: yes）、`docs/plans/2026-08-04-2243-2-hmi-geometry-viewport-data-path-correctness.md`、`docs/plans/2026-08-04-2243-3-hmi-verification-fidelity-public-surface-doc-drift.md`（两者 Non-Goals 均指向本 successor）、`docs/plans/2026-08-04-2242-1-hmi-diagnostic-channel-wiring-plan.md`（诊断通道已落地）
> Mission: industrial-hmi
> Work Item: W1 successor（复杂表达式订阅 `flux-deps-empty` 诊断）

## Purpose

收口 industrial-hmi Follow-up Backlog 唯一未收口的 P2 finding（W1）：复杂 flux 表达式（`${analog.temp + 1}` 类）在平台依赖收集 probe 失败时 `extractExpressionDepsViaProbe` 静默返回 `[]`，导致 `useScopeSelector` 被禁用、表达式永不随 scope 数据更新，且对 author 完全不透明。本 plan 经既有**非升级**诊断通道（plan `{2242-1}` 已落地）一次性上报 `flux-deps-empty` 诊断码，使该静默 disable 路径对 author 可感知。

## Current Baseline

- **roadmap 状态**：I0–I16 全部 `done`。Follow-up Backlog（roadmap:367-482）逐项核对：W1（roadmap:459）是唯一**底层缺陷尚未被任何 plan 处理**的项（deferred successor，从未创建）；其余 P2 的底层缺陷均已由 plan `2026-08-04-1558-{1,2,3}` / `2026-08-04-2242-{1,2}` / `2026-08-04-2243-{1,2,3}` 落地（见各 plan Closure Audit Evidence）。**roadmap-hygiene residual（不在本 plan 收口范围，见 Non-Blocking Follow-ups）**：roadmap:443-448（L1-L6）与 :461（W3）的 per-line backlog 条目底层缺陷已由 plan `2026-08-04-2243-1` 收口，但条目本身缺「已由 plan ... 收口」marker——属 roadmap 标注漂移。
- **W1 漂移点（live 确认）**：`packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:57-86` `extractExpressionDepsViaProbe` 在多条失败路径（compile/createState/evaluateWithState 任一 catch、`compiled.kind !== 'dynamic'`、`state.root.kind !== 'leaf-state'`、无 deps、wildcard）均 `return []`。
- **路径聚合（live 确认）**：`extractFluxScopePaths`（:100-131）对 flux 声明先 `extractFluxRefs`（`$xxx` 简写）→ 纯路径正则 → 复杂表达式分支（:121-128）调 probe。聚合 `paths` 为 `[]` 时 `useScopeSelector` `enabled: enabled && paths.length > 0`（:211）禁用，inner effect 不再随 scope 重跑。
- **诊断通道已就绪（live 确认，plan `{2242-1}` 产物）**：
  - `useScadaPointsBridge` 有 `onError` 入参（:184）+ `reportOnce(expression, code, error)` 去重上报（:232-236，按 `(expression, code)` 去重）。
  - `scada-canvas.tsx:120-136` `reportDiagnostic` 非升级出口：`console.warn('[scada-canvas]', code, message)` 保底 + flux 码（`flux-compile-failed`/`flux-evaluate-failed`，:124）额外经 `rendererRuntime.env.monitor.onError({phase:'expression', ...})`；整体 try/catch 自保护（`channel-outlet-throws`）。
  - **不违反 §8.1**：诊断不动 `setStatus`/`setErrorInfo`/`eventsApi.notifyError`，画布保持 ready，不派发 `scada:error`（P1-8 降级契约）。
- **错误码注册表（live 确认）**：`scada-errors.ts:23-36` `SCADA_ERROR_CODES` 集中登记 + `scadaErrorI18nKey`（:43-47）自动 `industrial.scada.error.<code>` 前缀映射；新增码必须在此登记并经 `scada-errors.test.ts` 固化（防散落字符串）。
- **i18n（live 确认）**：`packages/flux-i18n/src/locales/en-US.ts:936-950` 与 `zh-CN.ts`（:940 邻近）`industrial.scada.error.*` 维护各码文案，结构对称。
- **W1 deferred 链路**：plan `2026-08-04-2243-1` `Deferred But Adjudicated` 标 W1 = `out-of-scope improvement`、`Successor Required: yes`、Successor Path 指向同数据路径 family；plan `2026-08-04-2243-2`/`2026-08-04-2243-3` 各自 Non-Goals 显式「不实现 W1 表达式订阅诊断（successor，见 plan `{2243-1}` Deferred）」——但 **successor 从未创建**，本 plan 即该 successor。
- **平台支持面（live 确认，已固化）**：平台 collector 对代表性复杂表达式的支持面**已有 integration 回归**——`scada-points-bridge.test.tsx:94-106` 经**真实** `expressionCompiler`+`env` 调 `extractFluxScopePaths` 断言算术（`${analog.temp + 1}`）/成员链（`${plant.pump.speed * 100}`）产出根级 paths；`:108-117` 另覆盖 `extractExpressionDepsViaProbe` 的算术/成员链/混合（`${analog.temp + plant.pump.speed}`）/编译失败/静态表达式。故本 plan **无需新增 happy-path 回归**，Phase 1 仅补 flux-deps-empty 诊断的 failing-first 断言。

## Goals

- 复杂 flux 表达式「读取 scope 但 probe 返 `[]`」时，经既有非升级诊断通道一次性上报 `flux-deps-empty`，使 author 可感知（per-expression 可定位）。
- `flux-deps-empty` 登记进 `SCADA_ERROR_CODES` + i18n 文案（en-US/zh-CN），经既有 `scadaErrorI18nKey`/`useScadaErrorText` 上屏链路可本地化。
- `design-data-binding.md §9.1` 同步 `flux-deps-empty` 诊断语义（含 `expressionReadsScope` 启发式限制注记）。

## Non-Goals

- **不扩展平台 collector 能力**（`flux-formula`/`flux-compiler`）——不扩大 probe 覆盖的表达式集合，仅 surface 失败。
- **不升级画布 status**（遵守 P1-8 降级契约：诊断 ≠ status 升级，不派发 `scada:error`）。
- 不诊断纯路径/`$xxx` 简写表达式（它们不走 probe，由既有 `extractFluxRefs`/纯路径分支直接产出 paths）。
- 不实现组态编辑器（I16 后继 mission，不在本 mission 范围）。
- 不改 `useScopeSelector` 订阅机制本身。

## Scope

### In Scope

- `expressionReadsScope(candidate)` 谓词：复杂表达式候选含标识符（排除纯字面量/纯运算符 `${1 + 2}`），用于判定「demonstrably reads scope」。
- 订阅分析返回 deps-empty 嫌疑表达式集（`analyzeFluxSubscriptions(config, options) → { paths, depsEmptyExpressions }`；`extractFluxScopePaths` 降为薄包装返 `.paths` 以保留既有签名/导出/测试）。
- `useScadaPointsBridge` 经 `reportOnce` 一次性上报 `flux-deps-empty`（不升级 status，与 `flux-compile-failed`/`flux-evaluate-failed` 同通道）。
- `reportDiagnostic`（`scada-canvas.tsx:124`）把 `flux-deps-empty` 纳入 `monitor.onError` expression-phase 分支。
- `SCADA_ERROR_CODES` 登记 `flux-deps-empty` + `scada-errors.test.ts` 固化 + i18n（en-US/zh-CN）文案。
- `design-data-binding.md §9.1` 诊断语义同步 + roadmap W1 收口回写（roadmap:459 标注「已由 plan 2026-08-05-0325-1 收口」）。

### Out Of Scope

- 平台 collector（flux-formula/flux-compiler）能力扩展。
- 画布 status 升级 / `scada:error` 派发 / `setStatus`/`setErrorInfo` 改动。
- 非复杂表达式（纯路径、`$xxx` 简写）的诊断。
- 组态编辑器、资源加载诊断（I16 后置）。

## Failure Paths

| 场景编号                | 触发                                                              | 行为（含通道/错误码）                                                                                                                                                                            | 可重试 | 用户可见表现                                              |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------- |
| `flux-deps-empty`       | 复杂 `${...}` 表达式 probe 返 `[]` 且 `expressionReadsScope` 为真 | 一次性 `console.warn('[scada-canvas]', 'flux-deps-empty', msg)` + `env.monitor.onError({phase:'expression', code:'flux-deps-empty'})`；画布保持 ready，**不**派发 `scada:error`、**不**升 status | 否     | dev console 警告 + host telemetry 钩子（i18n 本地化文案） |
| `channel-outlet-throws` | `reportDiagnostic` 自身 throw                                     | catch 吞掉，不回流 engine/hook（既有自保护，:131-133）                                                                                                                                           | 否     | 无可见（通道自保护）                                      |
| 误报（literal-only）    | 纯字面量复杂表达式 `${1 + 2}`（无标识符）                         | `expressionReadsScope` 为假 → 不上报                                                                                                                                                             | —      | 无                                                        |

## Test Strategy

档位选择：**必须自动化**。

理由：本 plan 处理核心数据流（flux 表达式 → scope 订阅 → 点表刷新）的正确性回归路径，且审计（`2026-08-04-2242-multi-audit-industrial-hmi.md` §Wiring :359）**显式要求**「integration test exercising the live `expressionCompiler` against representative complex expressions and asserting non-empty paths」。诊断正确性（一次性、非升级、不误报纯字面量）需 focused proof 锁定。按本档位，Proof 项须先于 Fix 项（见 Phase 1）。

## Execution Plan

### Phase 1 - Proof 先行（failing-first 诊断断言）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/scada-points-bridge.test.tsx`

- Item Types: `Proof`

> 平台支持面 happy-path 已由 `scada-points-bridge.test.tsx:94-106` / `:108-117` 固化（见 Current Baseline），本 Phase 仅补 flux-deps-empty 诊断的 failing-first 断言。

- [x] failing-first 测试（实现前红）：构造「读取 scope 但 probe 返 `[]`」的桥接场景——注入 collector 返空 deps 的 `ExpressionCompiler` stub（`createState(...).root.dependencies` 为空/undefined 或 root 非 leaf-state），渲染 `useScadaPointsBridge`，断言 `onError` 收到**一次性** `flux-deps-empty`（含表达式片段），重复 effect 不重报；并断言画布 status 不升级（`setStatus`/`scada:error` 不触发）。
- [x] failing-first 负向断言（实现前红）：纯字面量复杂表达式 `${1 + 2}`（无标识符）**不**触发 `flux-deps-empty`（`expressionReadsScope` 为假）。

Exit Criteria:

> 本 Phase 只交付 failing-first 测试落库（实现前红），实现见 Phase 2。Phase 2 完成后回看本 Phase 两例转绿。

- [x] flux-deps-empty failing-first 测试落库（断言一次性 + 不升 status）。
- [x] 纯字面量不触发的负向断言落库。
- [x] 包级 `typecheck` 通过，不破坏既有 612 tests / 43 files 基线。

### Phase 2 - 检测 + 上报 + 注册表 + i18n + 文档同步

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/scada-errors.ts`、`packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts`、`packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`、`packages/flux-renderers-industrial/src/renderer/scada-errors.test.ts`、`packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`、`docs/components/industrial-hmi/design-data-binding.md`、`docs/components/roadmap-industrial-hmi.md`

- Item Types: `Fix`、`Decision`

- [x] `SCADA_ERROR_CODES`（`scada-errors.ts:23-36`）增 `'flux-deps-empty'`；`scada-errors.ts:18` 注释块把 `flux-deps-empty` 归入「不升级画布 status，经去重数据通道上报」组（与 `flux-compile-failed`/`flux-evaluate-failed` 同组）。
- [x] i18n：`industrial.scada.error.flux-deps-empty` 文案——en-US「Complex flux expression subscription paths could not be collected; the expression may not reactively update」、zh-CN「复杂 flux 表达式订阅路径收集失败，该表达式可能不随数据更新」（en-US.ts:936-950 / zh-CN.ts 对称位置）。
- [x] 新增 `expressionReadsScope(candidate: string): boolean` 谓词（含标识符 `[a-zA-Z_][a-zA-Z0-9_]*` 即为真，排除纯字面量/纯运算符 `${1 + 2}`）。
- [x] 引入 `analyzeFluxSubscriptions(config, options): { paths: string[]; depsEmptyExpressions: string[] }`（复杂表达式分支复用 `extractExpressionDepsViaProbe`，probe 返 `[]` 且 `expressionReadsScope(candidate)` 为真时把表达式片段入 `depsEmptyExpressions`）；`extractFluxScopePaths` 改为薄包装 `return analyzeFluxSubscriptions(...).paths`（**保留既有导出/签名/既有测试不破坏**）。
- [x] `useScadaPointsBridge`：`useMemo` 改调 `analyzeFluxSubscriptions` 取 `paths`（订阅用）+ `depsEmptyExpressions`（诊断用）；新增 effect 对 `depsEmptyExpressions` 每项经 `reportOnce(expression, 'flux-deps-empty', <合成 Error>)` 一次性上报（message 含表达式片段），不升级 status。
- [x] `reportDiagnostic`（`scada-canvas.tsx:124`）：把 `flux-deps-empty` 加入 `monitor.onError` expression-phase 分支条件（`code === 'flux-compile-failed' || code === 'flux-evaluate-failed' || code === 'flux-deps-empty'`）。
- [x] `scada-errors.test.ts` 增断言：`SCADA_ERROR_CODES` 含 `flux-deps-empty`、`scadaErrorI18nKey('flux-deps-empty') === 'industrial.scada.error.flux-deps-empty'`。
- [x] `design-data-binding.md §9.1`：补 `flux-deps-empty` 诊断语义（触发条件/一次性/非升级/不派发 `scada:error`）+ 「静默 disable 残留已 surfaced」注记 + `expressionReadsScope` 启发式限制注记（仅判标识符存在，含全局名如 `Math.PI` 的复杂表达式可能误报为「reads scope」，属可接受的一次性 best-effort 诊断）。
- [x] roadmap W1 收口回写：`docs/components/roadmap-industrial-hmi.md:459` 该条末尾标注「**已由 plan 2026-08-05-0325-1 收口**」（roadmap Rule 4 状态写回）。

Exit Criteria:

- [x] Phase 1 failing-first flux-deps-empty 测试转绿（`onError` 收一次性 `flux-deps-empty`，重复不重报，status 不升级）。
- [x] `reportDiagnostic` 对 `flux-deps-empty` 经 `monitor.onError`（phase `expression`）上报，分支用例覆盖（focused 单测）。
- [x] 纯字面量复杂表达式 `${1 + 2}` 不触发 `flux-deps-empty`（`expressionReadsScope` 为假，focused 用例）。
- [x] 包级 `test` 全绿（含 scada-errors.test.ts 新断言 + bridge 新诊断用例 + reportDiagnostic 分支用例），既有测试无回归。
- [x] `design-data-binding.md §9.1` 描述 `flux-deps-empty` 最终语义（触发/一次性/非升级）。
- [x] 局部 `typecheck`（flux-renderers-industrial + flux-i18n）通过。

## Draft Review Record

> 起草后、执行前的独立审查证据（见 `docs/plans/00-plan-authoring-and-execution-guide.md` Plan Review Rule）。由独立 fresh-session 子 agent 填写。

- Reviewer / Agent: 独立 fresh-session 子 agent（round 1: `ses_031c1b132ffegqoxezPxnNokw5`；round 2: `ses_031bd2157ffeRZyfHmypfJ4iRo`）
- Verdict: `pass`
- Rounds: 2
- Findings addressed:
  - R1 Major A（Current Baseline「仅 W1 未收口」totalization 误述——漏看 roadmap:443-448/461 标注漂移）：改写为「W1 是唯一底层缺陷未被处理的项」+ 显式登记 roadmap-hygiene residual 为 out-of-scope Non-Blocking Follow-up。
  - R1 Major B（「无 integration 回归」误述——漏看 `scada-points-bridge.test.tsx:94-106/:108-117` 已覆盖）：Current Baseline 改述已固化；删除冗余 Goal #3 + Phase 1 happy-path bullet/exit，Phase 1 收窄为 failing-first flux-deps-empty 断言。
  - R1 Minor（`expressionReadsScope` 对 `${Math.PI*2}` 类全局名误报）：Phase 2 design-doc item 补启发式限制注记。
  - R2 Minor（Closure Gates「平台支持面 integration 回归 3 例」措辞歧义）：改为「既有…无回归」。
  - R2 结论：零 Blocker / 零 Major，引用准确性逐项复核确认，设计稳健（单 probe analyzeFluxSubscriptions / reportOnce 一次性去重 / 非升级扩展 reportDiagnostic flux 分支 / 错误码+i18n 集成），单 finding 边界符合 Rule 22/26。

## Closure Gates

> 关闭条件：本 section 全部 `[x]` + 各 Phase Exit Criteria 全部 `[x]` 后，方可将 `Plan Status` 改为 `completed`（closure-audit 须由独立 fresh-session 子 agent 执行，执行 session 不得自审）。

- [x] W1 in-scope finding（复杂表达式 probe 返 `[]` 静默 disable useScopeSelector）已 surfaced 为 `flux-deps-empty` 一次性诊断。
- [x] 必要 focused verification 已完成（**既有**平台支持面 integration 回归无回归 + flux-deps-empty 一次性上报 + 不升 status + 不误报纯字面量 + reportDiagnostic 分支）。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner docs（`design-data-binding.md §9.1`）已同步 live baseline；roadmap W1（roadmap:459）已回写收口标注。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 为单 finding owner plan，in-scope 仅 W1，预计无 deferred 项。若执行中发现独立子问题，按 `watch-only residual`/`optimization candidate`/`out-of-scope improvement` 分类并附 `Why Not Blocking Closure`。

## Non-Blocking Follow-ups

- **roadmap 标注漂移（out-of-scope improvement）**：roadmap:443-448（L1-L6）与 :461（W3）的 per-line backlog 条目底层缺陷已由 plan `2026-08-04-2243-1` 收口，但条目缺「已由 plan ... 收口」marker。属 roadmap 标注卫生，与本 plan 数据路径无关，留待 roadmap hygiene 轮统一回写（不阻塞本 plan）。
- 平台 collector（flux-formula/flux-compiler）扩大复杂表达式支持面属独立包演进，非本 plan 收口范围（`out-of-scope improvement`）。
- `mock bounds API 升级为确定性建模`（继承自 plan `2026-08-04-2243-3` 的 optimization candidate，与本 plan 数据路径无关）。

## Closure

Status Note: W1 in-scope finding（复杂表达式 probe 返 `[]` 静默 disable useScopeSelector）已 surfaced 为一次性 `flux-deps-empty` 非升级诊断（经既有 plan 2026-08-04-2242-1 诊断通道）。两 Phase 全部落地，全量验证全绿，独立 closure-audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（`ses_031ab60a1ffe2237OQfRFMkRdE`）
- Evidence: verdict `approved`（零 Blocker / 零 Major）。interface↔semantics trace 通过——`analyzeFluxSubscriptions` 填 `depsEmptyExpressions`（probe 返空 deps 且 `expressionReadsScope` 真）、`extractFluxScopePaths` 为薄包装；`useScadaPointsBridge` useMemo + 新 effect 经 `reportOnce('flux-deps-empty')` 上报；`reportDiagnostic` 把 `flux-deps-empty` 纳入 `monitor.onError` expression-phase 分支；`SCADA_ERROR_CODES` + i18n key（en-US/zh-CN）登记；非升级契约成立（无 setStatus/setErrorInfo/notifyError/scada:error）；一次性保证（depsEmptyExpressions 经 useMemo 稳定 + reportOnce 去重 + config reload 对称清空）；3 组 focused 测试断言正确行为（一次性/不升 status/不误报纯字面量/monitor phase=expression/code=flux-deps-empty），独立复跑 615/615 全绿；deferred 诚实（三项 Non-Blocking Follow-ups 均非 in-scope live defect）；owner-doc 一致（design-data-binding.md §9.1 + design-renderer.md + roadmap W1 回写）；无 src 下散落 build artifact。Minor：`expressionReadsScope` 全局名误报（已在 plan + 文档显式注记为可接受 best-effort）。

Follow-up:

- 平台 collector（flux-formula/flux-compiler）扩大复杂表达式支持面（out-of-scope improvement，独立包演进）。
- roadmap 标注漂移（L1-L6/W3 缺收口 marker，roadmap hygiene 轮统一回写）。
- mock bounds API 升级为确定性建模（继承自 plan 2026-08-04-2243-3 的 optimization candidate）。
