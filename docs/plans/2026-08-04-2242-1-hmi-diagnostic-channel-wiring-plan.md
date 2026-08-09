# {1} HMI — Wire Flux/Handler Diagnostic Channels From React Renderer

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/audits/2026-08-04-2242-multi-audit-industrial-hmi.md` (P1-1, P1-2)
> Related: `docs/plans/2026-08-04-1235-2-hmi-lifecycle-wiring-plan.md` (P1-8 degradation contract installed the engine/hook dedup layer), `docs/plans/2026-08-04-1558-2-hmi-lifecycle-degradation-hardening-plan.md` (SL-5/m3 installed `onHandlerError` dedup), `docs/components/roadmap-industrial-hmi.md`

## Purpose

把 P1-8 降级契约残留的「去重上报通道在 engine/hook 层已建好、React renderer 层从未订阅」缺口收口：flux 表达式编译/求值失败（`flux-compile-failed`/`flux-evaluate-failed`）和用户侧图元事件处理器 throw（`handler-error`）两类运行期数据/交互错误，目前在生产 renderer 中被静默吞掉（去重 machinery 计算出的值无人消费），作者/宿主零可见信号。本计划从 React renderer 接通一条**不升级画布 status** 的诊断通道，并补**不直注 callback** 的生产级回归测试。

## Current Baseline

live repo 核对（2026-08-04）：

- **去重上报基础设施已完整落地（engine + hook 层）**：
  - `use-scada-points-bridge.ts:179` `UseScadaPointsBridgeArgs.onError?` 已声明；`:212` `lastReportedErrors` Map + `:223-227` `reportOnce` 同表达式同错误码去重（求值成功后清空记录，允许下次失败再报）。
  - `scada-engine.ts:71` `ScadaEngineOptions.onHandlerError?` 已声明；`event-bridge.ts:153-166` `safeRun` 顶层 try/catch + `reportHandlerError` 经 `reportedHandlerErrors` Set 去重；throw 不冒泡进 leafer 交互管线（隔离半契约成立）。
  - `scada-errors.ts:23-36` `SCADA_ERROR_CODES` 注册表已登记 `flux-compile-failed`/`flux-evaluate-failed`/`handler-error`，含 `scadaErrorI18nKey` → `industrial.scada.error.*` i18n 映射。
- **React renderer 从未订阅任一通道（缺口）**：
  - `scada-canvas.tsx:175-184` 调 `useScadaPointsBridge({...})` **无 `onError:` 属性**（已核对：注释解释了「不直通 handleError」，但未接任何替代消费者）。
  - `use-scada-engine.ts:27-37` `UseScadaEngineArgs` **无 `onHandlerError` 字段**（仅有 `onEngineError`）；`:130-140` `ScadaCanvasEngine.create({...})` 未传 `onHandlerError`。
- **测试为何没抓住**：hook/engine 级测试直接注入 `onError`/`onHandlerError` callback（`scada-points-bridge.test.tsx:437,500,551` 等），因此去重逻辑本身被覆盖，但**生产 renderer 装配路径**（`scada-canvas.tsx` → `useScadaEngine` → `useScadaPointsBridge`）从不订阅，被测的是错误的层。
- **设计契约（design-renderer.md §8.1）**：`onError`（`scada:error`）明确「仅 config 校验/构建失败」，flux 数据错误「不升级画布 error、不派发 `scada:error`」，但同句写明「桥接层单次去重上报」——证明设计意图是「上报到某个消费者」，只是消费者未在 renderer 层接通。
- **机械门**：包级 typecheck/lint/build/test 全绿（562/562）。

## Goals

- 从 `scada-canvas.tsx` 为 `useScadaPointsBridge` 接通 `onError` 通道（flux 编译/求值失败的去重上报有消费者）。
- 从 `scada-canvas.tsx` → `useScadaEngine` → `ScadaCanvasEngine.create` 接通 `onHandlerError` 通道（用户侧 throw 的去重上报有消费者）。
- 选定一条**不升级画布 status、不派发 `scada:error`** 的诊断出口（dev console.warn / host telemetry / `props.events` 诊断事件，见 Phase 1 Decision），与 §8.1 降级契约一致。
- 补**生产 renderer 级**回归测试（经 `scada-canvas` 组件装配路径触发，非 hook/engine 直注 callback），断言两类错误经选定通道可见。

## Non-Goals

- 不改 §8.1 降级契约本身（flux/handler 错误仍不升级画布 error、不派发 `scada:error`）。
- 不改 engine/hook 层去重 machinery（`reportOnce`/`reportHandlerError`/i18n 注册表已正确）。
- 不处理 open-audit 的 `x/y` bounds 契约漂移（独立 plan `{2}` 收口）。
- 不处理 P2 级 `lastReportedErrors` 跨 config 不清 / `pendingSkipRef` leak 等残留（已登记 Follow-up Backlog）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`（订阅两个通道）。
- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts`（`UseScadaEngineArgs` 加 `onHandlerError` 字段 + 转发给 `ScadaCanvasEngine.create`）。
- 选定诊断出口的 Decision（见 Phase 1）。
- 生产 renderer 级回归测试（flux 编译错误可见 + 用户 action throw 可见）。
- `design-renderer.md §8.1` 措辞同步（明确诊断出口）。

### Out Of Scope

- engine/hook/binding 层去重逻辑改动。
- 新增 host telemetry 基础设施（若选定出口需要新 RendererEnv 能力，降级为 dev console.warn + Decision 记录后续）。
- 任何 bounds/viewport/config 契约改动。

## Failure Paths

| 场景                   | 触发                            | 行为                                                              | 可重试                     | 用户可见表现                                                        |
| ---------------------- | ------------------------------- | ----------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `flux-compile-failed`  | `${typo.expr}` 编译失败         | 跳过该声明（点值不更新）+ 去重上报到诊断通道；画布保持 `ready`    | 否（scope 修复后自动回流） | dev: console.warn；prod: 经选定通道（telemetry/event）一次          |
| `flux-evaluate-failed` | 表达式求值抛错                  | 同上                                                              | 否                         | 同上                                                                |
| `handler-error`        | `onSymbolClick` 内 action throw | 异常隔离（不冒泡进 leafer）+ 去重上报到诊断通道；画布保持 `ready` | 否                         | dev: console.warn；prod: 经选定通道一次；点击「看似无反应」但有诊断 |
| 通道出口自身 throw     | 诊断 callback 内 throw          | 不得回流进 engine/hook（renderer 层 callback 包裹）               | 否                         | 不影响画布                                                          |

## Test Strategy

本档选择：**必须自动化**

理由：这是错误传播/可观测性契约的收尾——P1-8 降级契约明确要求「上报有消费者」，当前消费者缺失是契约 drift（非降级 hardening）。对应 Proof 必须先于/同 Fix 落地，且必须**经生产 renderer 装配路径**触发（非 hook 直注），否则会再次被「测错层」掩盖。

## Execution Plan

### Phase 1 - 选定诊断出口 + 接通 onError（flux 数据错误）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`, `docs/components/industrial-hmi/design-renderer.md`

- Item Types: `Decision` / `Proof` / `Fix`

- [x] **Decision（出口裁定）**：选定 flux/handler 诊断的非升级出口。优先序：(a) 复用 `props.events` 上一个 `onDiagnostic`（或类似）schema 级事件，若 renderer 事件契约不支持自定义诊断事件则 (b) dev 构建下 `console.warn('[scada-canvas]', code, message)`、prod 经 `RendererEnv` 已有 host telemetry 钩子（若存在）；二者皆不可得则降级 (c) dev/prod 统一 `console.warn` + 在 `design-renderer.md` 记「host telemetry 接通后置」Decision。裁定需写明为什么该出口不违反 §8.1「不升级画布 error」（关键：诊断 ≠ error status）。
- [x] **Proof（先于 Fix，失败用例）**：新增生产 renderer 级回归测试——mount `scada-canvas`（经组件装配，非 `renderHook(useScadaPointsBridge)`），config 含一个故意 typo 的 flux 表达式声明，断言选定诊断出口被调用一次（如 console.warn 被 spy 到、或 `onDiagnostic` event 派发），且画布 `data-status === 'ready'`（不升级）。此测试在本 Phase Fix 前应失败（通道未接）。
- [x] **Fix**：在 `scada-canvas.tsx:175-184` 的 `useScadaPointsBridge({...})` 调用上加 `onError: (code, message) => { ...选定出口... }`。出口实现包裹 try/catch（通道自身 throw 不得回流 engine/hook）。
- [x] **Proof** 验证去重仍生效：同一表达式同错误码仅上报一次（测试可断言 spy 调用计数随多次 scope 更新不增长）。

Exit Criteria:

- [x] `scada-canvas.tsx` 的 `useScadaPointsBridge` 调用含 `onError` 属性，出口实现含 try/catch 自保护。
- [x] 生产 renderer 级回归测试（非 hook 直注）断言 typo flux 表达式 → 诊断出口被调用 ≥1 次 + 画布保持 `ready`，Fix 前失败、Fix 后通过。
- [x] 去重行为被断言（同表达式多次触发仅一次上报）。
- [x] Decision 记录写明选定出口 + 不违反 §8.1 的理由。

> Phase 1 Decision 落地证据：裁定 **option (b)**——`scada-canvas.tsx:120-136` 统一 `reportDiagnostic(code, message)` 出口：(1) `console.warn('[scada-canvas]', code, message)` 保底可见（dev+prod，去重已在上游 hook/engine 层完成故每唯一错误仅 fire 一次）；(2) flux 编译/求值错误额外复用既有 host telemetry 钩子 `RendererEnv.monitor.onError`（`ExpressionExecutionEnv.monitor`，phase:'expression'）。option (a) 不采纳（`ScadaCanvasEvents` 无 `onDiagnostic` 字段，新增即 schema 契约变更，违背 draft-review minor「以不引入 schema 契约变更为前提」）。handler-error 的 host telemetry 后置（monitor 类型限定 phase:'expression'，扩展属 Non-Blocking Follow-up）。不违反 §8.1：出口不动 `setStatus`/`setErrorInfo`/`notifyError`，画布保持 `ready`，不派发 `scada:error`——诊断 ≠ status 升级。出口 try/catch 自保护经 `scada-canvas-diagnostic-channels.test.tsx`「self-isolates when the diagnostic outlet itself throws」用例固化。`design-renderer.md §8.1` 已增「运行期诊断出口（非升级）」段落同步。

### Phase 2 - 接通 onHandlerError（用户侧 action throw）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts`, `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`

- Item Types: `Proof` / `Fix`

- [x] **Proof（先于 Fix，失败用例）**：新增生产 renderer 级回归测试——mount `scada-canvas`，注册一个 `onSymbolClick`（或图元事件声明的 action）在处理器内故意 throw，经测试句柄/事件模拟触发点击，断言选定诊断出口被调用一次（`handler-error` 语义），画布保持 `ready`，且后续点击仍可触发（异常隔离不杀死交互管线）。Fix 前应失败。
- [x] **Fix（a）**：`use-scada-engine.ts:27-37` `UseScadaEngineArgs` 加 `onHandlerError?: (error: unknown) => void`。
- [x] **Fix（b）**：`use-scada-engine.ts:130-140` `ScadaCanvasEngine.create({...})` 加 `onHandlerError: (error) => latest.current.onHandlerError?.(error)`（经 `latest` ref 转发，对齐既有 `onSymbolEvent`/`getPointValuesFor` 转发模式）。
- [x] **Fix（c）**：`scada-canvas.tsx:122` 的 `useScadaEngine({...})` 调用加 `onHandlerError: (error) => { ...与 Phase 1 同一出口... }`（出口实现含 try/catch 自保护）。

Exit Criteria:

- [x] `UseScadaEngineArgs` 含 `onHandlerError` 字段；`ScadaCanvasEngine.create` 转发该字段；`scada-canvas.tsx` 订阅与 Phase 1 同一出口。
- [x] 生产 renderer 级回归测试断言用户 action throw → 诊断出口被调用 + 画布 `ready` + 后续交互仍生效，Fix 前失败、Fix 后通过。
- [x] `event-bridge.ts` 的 `safeRun`/`reportHandlerError` 去重行为未被改动（仅消费者接通）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent（fresh session）填写，详见 plan guide `Plan Review Rule`。

- Reviewer / Agent: fresh session `ses_0328a2f56ffe2saoA14UtPE3Ii`（独立 general sub-agent，不复用起草上下文）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。4 项 Minor（Phase 1 第 4 个执行项缺 Item Type 标签→补 `Proof`；Phase 2 Fix-c `useScadaEngine` 调用点补行号 `scada-canvas.tsx:122`；Phase 1 Decision option(a) `onDiagnostic` 显式标注「以不引入 schema 契约变更为前提」；Non-Goals 跨审计 cross-ref 措辞）。Minor 不阻塞，按 guide「Minor 不触发返工」未逐项强制落地，执行时可顺带采纳。引用准确性：11 项引用全数 confirmed-accurate（含 `scada-canvas.tsx:175-184` 缺 onError、`UseScadaEngineArgs` 缺 onHandlerError、`ScadaCanvasEngine.create` 未转发、`scada-errors.ts` 注册表、`design-renderer.md §8.1` 降级契约、`scada-points-bridge.test.tsx:437,500,551` 直注 callback）。P1-1+P1-2 合并为单 owner plan 经核符合 Rules 22/25/26（同组件族/同 closure surface/同 owner-doc/同 Decision/同 Test Strategy tier）。

## Closure Gates

> 关闭条件：本 section 全部 `[x]` + 每 Phase Exit Criteria 全部 `[x]` 后，方可 `Plan Status: completed`。closure-audit 必须由独立子 agent（fresh session）执行，执行 session 不得自审勾选本项。

- [x] multi-audit P1-1（`onError` 未接）confirmed fixed in live code（`scada-canvas.tsx` 含 `onError` 属性）。
- [x] multi-audit P1-2（`onHandlerError` 未接）confirmed fixed in live code（`UseScadaEngineArgs` 含字段 + `ScadaCanvasEngine.create` 转发 + `scada-canvas.tsx` 订阅）。
- [x] 两个生产 renderer 级回归测试（非 hook/engine 直注）落地并通过。
- [x] 选定诊断出口不升级画布 status、不派发 `scada:error`（§8.1 降级契约未被破坏）——测试断言画布 `data-status === 'ready'`。
- [x] `design-renderer.md §8.1` 措辞同步诊断出口（若出口裁定改变了文档语义）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（起草时无；执行中如出现按 anti-slacking rule 裁定的 deferred 项，于此登记。）

## Non-Blocking Follow-ups

- `use-scada-points-bridge.ts` `lastReportedErrors` Map 跨 config reload 不清（P2，源 `2026-08-04-2242-multi-audit-industrial-hmi.md`）——本 plan 接通 onError 后该缺陷变得可观测（旧 config 的去重记录抑制新 config 同表达式上报），登记 Follow-up Backlog 独立收口。
- host telemetry / `RendererEnv` 诊断钩子基础设施（若 Phase 1 Decision 降级为 console.warn）。

## Closure

Status Note: P1-1（`onError` 未接）与 P1-2（`onHandlerError` 未接）两项 confirmed live defect 已修复——React renderer 层从 `scada-canvas.tsx` 接通两条去重上报通道的消费者，选定 `reportDiagnostic` 非升级出口（console.warn + `env.monitor.onError`），与 §8.1 降级契约一致（不升级画布 status、不派发 `scada:error`）。两 Phase 全部 items/Exit Criteria 落地，4 例生产 renderer 级回归测试覆盖（非 hook/engine 直注）。deferred 项均经 anti-slacking 裁定为 non-blocking residual。plan 可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session 子 agent（closure-audit，不复用执行 session 上下文，2026-08-05）
- Evidence:
  - live code 逐项核对：`scada-canvas.tsx:120-136` `reportDiagnostic` 出口（含 try/catch 自保护）；`:217` `useScadaPointsBridge({ onError: reportDiagnostic })`；`:163-164` `useScadaEngine({ onHandlerError: (error) => reportDiagnostic('handler-error', ...) })`；`use-scada-engine.ts:42` `UseScadaEngineArgs.onHandlerError` 字段 + `:147` `ScadaCanvasEngine.create` 经 `latest` ref 转发。
  - anti-hollow 抽查：`reportDiagnostic` 运行期经 `useScadaPointsBridge` onError + `useScadaEngine` onHandlerError 两条订阅链路可达，实现非空（console.warn + env.monitor.onError），非注册即弃/return null 占位。
  - 去重 machinery 未改：`event-bridge.ts:153-165` `safeRun`/`reportHandlerError`/`reportedHandlerErrors` Set 去重保持原样；`use-scada-points-bridge.ts:223-226` `reportOnce`/`lastReportedErrors` Map 去重保持原样。
  - 测试 4 例实跑（`scada-canvas-diagnostic-channels.test.tsx`）：flux evaluate 失败出口可见 + 画布 ready、去重不增长、handler throw 出口可见 + 后续点击仍可达 + 去重仅一次、出口自身 throw 自隔离。
  - owner-doc 同步：`design-renderer.md §8.1`（line 207）「运行期诊断出口（非升级）」段落已落地，描述与 live `reportDiagnostic` 实现一致。
  - 全量验证：包级 + workspace typecheck/build/lint/test 全绿（plan Closure Gates 已勾选）。
  - 日志收口记录：`docs/logs/2026/08-05.md`。

Follow-up:

- `lastReportedErrors` Map 跨 config reload 不清（P2，源 `2026-08-04-2242-multi-audit-industrial-hmi.md`）——Non-Blocking Follow-up，已登记 roadmap Follow-up Backlog（plan 接通 onError 后该缺陷变可观测）。
- host telemetry / `RendererEnv` 诊断钩子基础设施（handler-error 的 `env.monitor` 扩展为 'action' phase）——Non-Blocking Follow-up，当前 `env.monitor` 类型限定 phase:'expression'。
