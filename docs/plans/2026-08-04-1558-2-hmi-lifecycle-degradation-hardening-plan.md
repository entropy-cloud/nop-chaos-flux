# 2 Lifecycle & Degradation Hardening

> Plan Status: active
> Mission: industrial-hmi
> Work Item: P2 backlog — lifecycle & degradation
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md` `## Follow-up Backlog`（State & lifecycle / Wiring & degradation 分组 + open-audit 关联 P2 项），源审计 `docs/audits/2026-08-03-1506-multi-audit-industrial-hmi.md`（dim 04/06/22）、`docs/audits/2026-08-03-1506-open-audit-industrial-hmi.md`
> Related: `docs/plans/2026-08-04-1558-1-hmi-public-api-surface-convergence-plan.md`（错误码注册表依赖 scada-errors 归属）、`docs/plans/2026-08-04-1558-3-hmi-display-geometry-test-effectiveness-plan.md`（e2e 覆盖缺口）

## Purpose

把 `scada-canvas` 运行时生命周期与降级路径收口：destroy/reset 生命周期清理与基线完整性、事件与动画健壮性（try/catch、hover 去重、always 动画启动）、flux 桥接数据面（复杂表达式订阅、cache 生命周期）、错误面与命令契约（错误码注册表 + i18n、空态文档化、not-visible 失败路径、props 变化反应）。全部为 audit 登记的非阻断 P2 + 对应 doc drift，无遗留已确认 live defect 需要升级处理。

## Current Baseline

- `src/renderer/hooks/use-scada-engine.ts:130-145`：ResizeObserver + resize rAF 定义于 mount effect 内；`destroy`（:195-204）只销毁 pipeline/animator/collector/engine，**不断开 observer、不取消 rAF**（unmount cleanup :147-156 才做）——`component:destroy` 后容器仍被观察（SL-2）。
- `use-scada-engine.ts:118-128`：dev/test `setPointValues` 注入闭包捕获 mount 期 `pointStore`+`pipeline`；`reloadBindings`（:170-192）重建 pipeline 后注入写向已销毁 pipeline，静默 no-op（SL-3）。
- `use-scada-config-sync.ts:156-161`：full/reset 路径 `engine.reset` 抛错（`config-build-failed`）后 `prevRef` 未重置——树半构建 + 绑定旧，下次 diff 基于损坏基线（SL-4）。
- `use-scada-engine.ts:170-192` `reloadBindings`：`pointStore.reset()` + `loadDeclarations` 清空全部 live 点值，任何 symbol/variable 变更都触发——静态/表达式运行期值静默丢失（OP-1）；`design-renderer.md:163`（§4.3 序列化表）点表 diff 文档化为 `setPointValues` 增量路径、实现为整域重建（doc drift）。
- `src/engine/event-bridge.ts:92-131`：leafer 事件处理器无顶层 try/catch，用户侧 throw（如坏 ActionSchema）窜入 leafer 交互管线（SL-5）；`handleHover`（:119-131）每次 pointer.move 都 `emit('symbol:hover')`，悬停同一符号期间 hover action 风暴、无同符号去重（WD-4）。
- `src/binding/dirty-collector.ts:291-315`：`animator.start` 唯一路径在 `collectStates`（`applyAnimationLinkage` :326-333）内——`when:'always'` 动画只在同时声明 `states` 的图元上启动；无 states 的 always 动画静默 no-op 而 validate 接受（SL-1）。
- `src/binding/point-store.ts:187-203`：`point:change` 订阅者在 `applyValue` 内无 try/catch 运行，订阅者 throw 中断剩余写入循环（OP-3，今日零生产订阅者、latent）。
- `use-scada-points-bridge.ts:112` `compiledCache` 无清理，config 重载后无界增长（WD-3）；:9-41 `extractFluxScopePaths` 只识别 `$xxx` 简写与裸路径——复杂表达式（`${analog.temp + 1}`）无订阅路径 → `useScopeSelector` 禁用 → 点永不更新，对 author 静默（WD-2）。
- `use-scada-config-sync.ts:20-37` + `use-scada-engine.ts:159-167`：`width`/`height`/`viewport` props 变更后不生效（setSize effect deps `[runtime, containerRef]` 缺 width/height；viewport policy 仅 full 路径应用）；design-renderer.md §8.3 声称「width/height/viewport 变化 → 引擎命令式 API」（WD-1，doc↔impl 张力）。
- `use-scada-handles.ts:62-71`：`component:fit/center` 无 bounds 时返回 `'scada canvas has no config'`，未实现 design-renderer.md §8.5 表（fit/center 行 :242）声明的 `not-visible` 失败路径（WD-5 + doc drift）。
- `src/renderer/scada-errors.ts`：仅 `errorMessage`/`toError` 工具，无错误码注册表/i18n 映射；validate 消息原始英文上屏（WD-6）。`scada-canvas.tsx:180-191`：absent config 永久 loading（WD-7——行为修复归 plan `{1}` renderer 空场景兜底，本 Plan 仅 doc 注记 + 不回归断言）。
- `src/renderer/scada-canvas.tsx` + `use-scada-handles.ts:54-57`：`component:destroy` 后 `data-status="ready"`、wrapper 仍挂载——销毁状态无处反映，e2e/tooling 会把已销毁画布报为健康（OP-4）。
- `src/symbols/base-shapes/image.ts:43-47` `loadFailed` 写入但无消费者，注释声称的 I10 桥接层消费不存在（OP-2）。
- 已收口不重复：flux 编译/求值错误去重（P1-8，plan `{2}` Phase 5）、onReady change 守卫（P1-3，plan `{2}` Phase 2）、`background.grid` watch-only（plan `{2}` Deferred）。
- 基线质量：包级 483 tests / 35 files 全绿、workspace typecheck/build/lint/test 全绿（plan `{3}` 收口 2026-08-04 实测）。

## Goals

- destroy/reset/unmount 后无残留观察器与动画时钟（含 reload 后重建的绑定域）、注入通道写向最新 pipeline、失败构建不污染 diff 基线、live 点值不因重载丢失、销毁状态可见。
- 用户侧事件处理器 throw 不破坏 leafer 管线；hover action 去重；`when:'always'` 动画在无 states 图元上照常启动；点表订阅者异常不中断批量写入。
- 复杂 flux 表达式可订阅求值（复用平台能力，不自研表达式解析）；compiledCache 有界。
- 错误码注册表 + i18n 文案映射；absent config 有文档化空态；fit/center 对齐 `not-visible` 失败路径；width/height/viewport props 变更按文档契约反应（或文档同步实际契约）。
- 相关 owner docs（design-renderer.md/design-engine.md/design-symbols.md）与 live baseline 一致。

## Non-Goals

- 不改变 `scada:ready`/`scada:error` 触发语义（已收口）。
- 不做 image 加载失败的画布级错误升级（P1-8 降级契约保持：数据/资源错误不升级 status）。
- 不做组态编辑器交互（I16）。
- 不重写 `useScopeSelector`/flux-formula（平台复用）。

## Scope

### In Scope

- `use-scada-engine.ts`/`use-scada-config-sync.ts`/`use-scada-points-bridge.ts`/`use-scada-handles.ts` 对应修复 + focused 回归测试（use-scada-events.ts 不涉及——错误码/事件归属仅 doc 同步）。
- `event-bridge.ts`/`dirty-collector.ts`/`point-store.ts` 对应修复 + focused 回归测试。
- `scada-errors.ts` 错误码注册表 + `scada-canvas.tsx` 空态/文案 + flux-i18n locale 文案（如无既有 key 则新增）。
- design-renderer.md/design-engine.md 对应 doc drift 同步。

### Out Of Scope

- 公共面收敛与注册语义（plan `{1}`）。
- 显示几何修正与 e2e 有效性（plan `{3}`）。
- 复杂表达式订阅的平台侧能力建设（如平台无 API，回退方案见 Phase 3 Proof）。

## Failure Paths

| 场景                            | 触发                                            | 行为（含错误码）                                                                                                            | 可重试                | 用户可见表现                          |
| ------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------- |
| handler-throw                   | 用户 action 处理器 throw（坏 ActionSchema）     | event-bridge try/catch 包裹，异常不上抛 leafer；经 `handler-error` 去重数据通道上报，**不升级画布 status**（P1-8 降级契约） | 否                    | 该次事件无副作用，画布交互继续        |
| always-animation-missing-states | 图元仅声明 `when:'always'` 动画无 states/无绑定 | 动画照常启动（首次同步遍历全部动画承载图元）                                                                                | 否                    | 流动/闪烁动画生效                     |
| reset-build-failure             | full reset 构建抛错                             | `config-build-failed` → onBuildError + `prevRef=undefined`，下次同步强制 full reset                                         | 是（下次 props 变化） | error 状态 + 空态；修复 config 后恢复 |
| destroy-while-observed          | `component:destroy` 后容器仍挂载                | observer 断开、rAF 取消、`data-status="destroyed"`                                                                          | 否                    | 画布显示销毁状态，句柄 not-mounted    |
| absent-config                   | schema 无 config                                | 最小合法空场景渲染、状态 ready（plan `{1}` renderer 兜底收口，非永久 loading）+ 本 Phase doc 注记                           | 是                    | 空画布而非 loading 占位               |

## Test Strategy

本档选择：**必须自动化**。生命周期清理、降级路径、数据面错误处理属核心回归路径——每个 Fix 项先写 focused 回归测试（Proof 先行于 Fix 的 TDD 序），其中 `not-visible` 失败路径、复杂表达式订阅、destroy 状态为可精确断言的单元面；e2e 层仅补必要存在性断言（全量 e2e 在 Closure Gates 跑）。

## Execution Plan

### Phase 1 — 生命周期清理与基线完整性（Lifecycle Cleanup & Baseline Integrity）

Status: planned
Targets: `src/renderer/hooks/use-scada-engine.ts`、`src/renderer/hooks/use-scada-config-sync.ts`、`src/binding/point-store.ts`、`src/renderer/scada-canvas.tsx`、`design-renderer.md`

- Item Types: `Fix | Decision | Proof`

- [ ] `Proof` — 前置回归测试（TDD）：① `component:destroy` 后 ResizeObserver.disconnect 被调用、resize rAF 被取消（spy/mock 断言）；② config reload（reloadBindings）后 `window.__flux_scada_<cid>.setPointValues` 写入对新 pipeline 生效（注入值到达渲染/点表）；③ full reset 抛错后 `prevRef` 置空、下一次同 config 身份变更走 full 路径；④ `setPointValue` 后 config 变更（reloadBindings）live 值保留（非 init 回退）；⑤ destroy 后 `data-status="destroyed"`；⑥ **reload 后 unmount**（含 `when:'always'` 动画播放中）→ 最新绑定域的 animator 时钟停止（`isPlaying` false / 无后续调度 tick），mount 期域对象被幂等释放（M1：mount cleanup 闭包持 mount 期 pipeline/animator，reload 后 unmount 只释放旧域，最新 animator 时钟永久空转）。
- [ ] `Fix` — `use-scada-engine.ts`：observer/rafId 提为 ref；`destroy` 复用 mount cleanup 的断开逻辑（observer.disconnect + cancelAnimationFrame）；**绑定域（pipeline/animator/collector）最新实例存 ref，mount cleanup 与 `destroy` 统一释放当前域**（reload 后 unmount 不再泄漏最新 animator 时钟，M1）。
- [ ] `Fix` — `use-scada-engine.ts`：`setPointValues` 注入闭包改经 `runtimeRef.current` 取最新 pipeline 写入（含 applyAttrs）。
- [ ] `Fix` — `use-scada-config-sync.ts` catch 内 `prevRef.current = undefined`（full/reset 构建失败后强制下次 full 重建）。
- [ ] `Fix` — `use-scada-engine.ts` `reloadBindings`：reset 前快照现存点值，`loadDeclarations` 后**经 PointStore 新增值恢复方法（如 `restoreValues(snapshot: Map<pointId, value>`），按 pointId 直接回填 entry（`entry.value = snapshot; dirty = true`，禁止经 applyValue/setPointValue 回填——`convert` 会再次施加线性 scale 造成双重换算，m2）**；`point-store.ts` 加入 Phase 1 Targets；声明不存在者丢弃，新声明用 init。
- [ ] `Decision` — `syncImported`（importConfig 全量替换）语义：与 props 同步共用 `reloadBindings`——裁定 import 路径**重置为 init**（显式全量替换契约，author 意图是换画面）而 props full/diff 路径**按 id 保留**（运行期值不静默丢失）；裁定结果写进 Proof ②/④ 断言与 `design-renderer.md:163` 文档。
- [ ] `Fix` — `scada-canvas.tsx`：destroy 状态面——`ScadaCanvasStatus` 增 `destroyed`（或等效 data-status），`component:destroy` 句柄路径（use-scada-handles destroy 回调）置状态；wrapper `data-status` 反映销毁。

Exit Criteria:

- [ ] ⑥ 组前置回归测试全绿入库（①-⑥ 对应六条 Fix/Decision）；destroy 后 observer 断开、reload 后 unmount 无动画时钟空转、状态可见均可 repo-observable 断言。
- [ ] `component:destroy` 后再调 handle 命令返回 not-mounted（既有语义不回归）；e2e/tooling 不再把已销毁画布报为 healthy（status 断言）。
- [ ] `design-renderer.md:163` 同步 live baseline（含 import reset / props 保留合并语义）。

### Phase 2 — 事件与动画健壮性（Event & Animation Robustness）

Status: planned
Targets: `src/engine/event-bridge.ts`、`src/binding/dirty-collector.ts`、`src/binding/point-store.ts`

- Item Types: `Fix | Proof`

- [ ] `Proof` — 前置回归测试（TDD）：① 用户侧 onSymbolEvent throw 不冒泡（handler 包裹后错误被捕获、经去重数据通道上报且 **status 不变**、后续 move/tap 仍工作）；② 悬停同一符号多次 pointer.move 只发射一次 `symbol:hover`、hover-miss 后重入同符号再发射；③ 无 states 图元声明 `when:'always'` 动画在初始同步后 `animator` 处于启动态，**含「无 states 且无任何绑定」的图元**（m1：`collectStates` 只访问 reverse-index 命中图元，无绑定图元从不进入收集路径）；④ `point:change` 订阅者 throw 不中断后续订阅者与写入循环。
- [ ] `Fix` — `event-bridge.ts`：各 handler（handleTap/handleDoubleTap/handlePointerMove/handlePointerLeave/handleHover）顶层 try/catch，异常经去重上报（沿用 reportOnce 式数据通道或新增可选 `onHandlerError` 选项，错误码 `handler-error`），**明确不升级画布 status**（P1-8 降级契约，m3）；`handleHover` 同符号去重（`lastHovered === symbolId` 时不重复 emit hover；hover-miss 后重置）。
- [ ] `Fix` — `dirty-collector.ts`：`when:'always'` 动画启动移出 `collectStates` 独占路径——首次全量同步（`synced=false`）遍历**全部动画承载图元**（经 `engine.getSymbols()` 或 pipeline 新增 `getSymbolIds` 选项，覆盖无 states 且无绑定图元）统一 `animator.start`（幂等 start）；diff 新增的无绑定动画图元在同机制内随下次同步启动（m1）。
- [ ] `Fix` — `point-store.ts` `applyValue` 订阅者循环 try/catch（单订阅者异常隔离，继续剩余循环；异常经去重上报）。

Exit Criteria:

- [ ] ④ 组前置回归测试全绿入库；handler throw 后 leafer 管线无污染（后续事件可达）、status 不升级；无绑定图元 always 动画启动有断言。
- [ ] hover 同符号去重有精确发射计数断言；always 动画无 states 场景有启动断言。
- [ ] 包级既有 483 单测无回退（Phase 局部 typecheck + 相关 spec 复跑）。

### Phase 3 — flux 桥接与数据面（Flux Bridge & Data Plane）

Status: planned
Targets: `src/renderer/hooks/use-scada-points-bridge.ts`、`@nop-chaos/flux-formula`/`@nop-chaos/flux-core`（只读调研）

- Item Types: `Proof | Fix`

- [ ] `Proof` — 平台能力调研：`ExpressionCompiler.compileValue` 产物（`CompiledRuntimeValue.node`）+ 求值依赖收集（`packages/flux-formula/src/evaluate.ts:104-117` `stateNode.dependencies`，经 `createState` + `evaluateNode` 的 tracking scope 记录）——确认「复杂表达式 → 依赖路径集」的平台提取方式（probe 求值一次收集依赖 → 以依赖路径订阅 → 变更重求值）；**必须验证 probe 边界：依赖收集仅在 `exec` 成功后执行（`finalize()` 在 try/finally 之后，抛错跳过收集）——纯复杂表达式 config 无种子路径、probe scope 为空时求值抛错会走 P1-8 跳过路径**；Fix 需指定容错机制（宽容 probe scope（提供 `undefined` 兜底）或最小种子订阅）使依赖收集可达（m2-r2）；禁自研表达式解析（Cross-Cutting 复用表）。
- [ ] `Proof` — 前置回归测试（TDD）：复杂表达式（`${analog.temp + 1}` 类）config 的 flux 点随 scope 数据变化而更新（useScopeSelector paths 由平台依赖收集产出），失败时按声明跳过 + 去重上报（P1-8 语义保持）。
- [ ] `Fix` — `use-scada-points-bridge.ts`：`extractFluxScopePaths` 扩展——复杂表达式经平台依赖收集产出订阅路径（Probe 求值一次 + 缓存；**按 Proof 调研结论提供宽容 probe scope 或最小种子订阅使空 scope 下依赖收集可达**），`useScopeSelector` 订阅生效；求值仍走既有 `compiledCache` 单次编译路径。
- [ ] `Fix` — `compiledCache`（:112）生命周期：config 变更（或绑定域重载）时清空，杜绝无界增长。

Exit Criteria:

- [ ] 复杂表达式点更新回归测试全绿（focused 单测，注明订阅路径产出来源为平台依赖收集）；无表达式解析自研实现。
- [ ] compiledCache 随 config 重载清空（测试断言 cache 大小归零）；长会话无界增长消除。

### Phase 4 — 错误面与命令契约（Error Surface & Command Contract）

Status: planned
Targets: `src/renderer/scada-errors.ts`、`src/renderer/scada-canvas.tsx`、`src/renderer/hooks/use-scada-config-sync.ts`、`src/renderer/hooks/use-scada-handles.ts`、`src/symbols/base-shapes/image.ts`、design 文档

- Item Types: `Fix | Decision | Proof`

- [ ] `Decision` — width/height/viewport props 变更反应：**width/height 为确定 Fix**（`use-scada-engine.ts:159-167` setSize effect deps 缺 width/height，补 deps 即生效，m10）；**viewport policy 为二选一**——(a) change 基准 effect 重应用初始视口策略（不改 diff 路径语义）或 (b) 文档化「仅初始应用」实际契约；recommend (a)（design-renderer.md §8.3 声称「width/height/viewport 变化 → 引擎命令式 API」）；裁定后 `§8.3` 同步真实语义。
- [ ] `Decision` — `scada-image` `loadFailed` 消费者：保持占位渲染（视觉契约）+ 修正 `image.ts:43-47` 误导注释 + `design-symbols.md` 注记「资源加载失败渲染占位、画布级诊断后置 I16」；不新增画布级错误升级（P1-8 契约）。
- [ ] `Proof` — 前置回归测试（TDD，在两项 Decision 裁定后编写）：① `component:fit`/`component:center` 在空场景（无 bounds）返回文档化 `not-visible` 失败；② absent config 不滞留 loading（**行为收口在 plan `{1}`（renderer 最小空场景兜底），本 Phase 仅断言既有兜底不回归 + 文档注记**）；③ width/height props 变更触发 `engine.setSize`；④ viewport policy 变更按 Decision 裁定行为反应（(a) 重应用或 (b) 保持现状 + 文档断言）；⑤ 错误码经注册表 + i18n 映射后上屏为本地化文案（fallback 原文）。
- [ ] `Fix` — `scada-errors.ts` 错误码注册表：集中定义 `ScadaErrorCode`（config-parse/config-invalid/config-build-failed/engine-create-failed/flux-compile-failed/flux-evaluate-failed/handler-error/not-visible/... 现行码整理）+ code→i18n key 映射；`scada-canvas.tsx` 错误区经 `useFluxTranslation` 渲染本地化文案，未知码 fallback 原始 message（`flux-i18n` locale 文件补 key，Cross-Cutting i18n 复用）。
- [ ] `Fix` — doc 注记：`design-renderer.md` 补「缺 config 渲染最小空场景（ready）而非 loading」实际契约（行为由 plan `{1}` 收口，本项仅文档同步，不重复实现）。
- [ ] `Fix` — `use-scada-handles.ts` fit/center 无 bounds 失败路径对齐 §8.5 表 `not-visible`（错误码/文案，表行在 `design-renderer.md:242`）；`design-renderer.md:242` 措辞与实际实现一致（原 :235 引用系 audit 行号漂移，m4）。
- [ ] `Fix` — doc drift 同步：`design-engine.md:213-214`（引擎事件表 ready/error 行）归属回写（引擎事件表只列 symbol 事件 + render；`scada:ready`/`scada:error` 为 renderer 层 action 派发）。

Exit Criteria:

- [ ] ⑤ 组前置回归测试全绿入库（①-⑤ 对应 Decision/Fix）；错误码注册表 + i18n 文案落地（locale key 在 `flux-i18n` 文件可查）。
- [ ] absent config 兜底不回归（ready 空画布，非 loading，断言见 Proof ②）；fit/center `not-visible` 失败路径可断言；width/height 变更生效断言。
- [ ] `design-renderer.md §8.3`（viewport 反应实际语义）/`:242`（not-visible）/`design-engine.md:213-214`/`design-symbols.md`（image 注记）与 live baseline 一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh-session 子 agent ×3（R1 `ses_034334d72ffeYW4ESowwHNm8VS`、R2 确认轮 `ses_034233880ffe8CQkAGZc3MJvDq`、R3 终验 `ses_03416b345ffeAKy77zKf21tHFV`）
- Verdict: `pass`（R2 起 0 Blocker/0 Major；R3 终验仅 2 处引用漂移已修）
- Rounds: 2
- Findings addressed: R1-M1（reload 后 unmount 绑定域泄漏——mount cleanup 闭包持旧域 → Phase 1 最新域存 ref + 统一释放 + Proof ⑥ 动画时钟停止断言）；R1-m1 无绑定 always 动画（首次同步遍历 `engine.getSymbols()` 全部动画承载图元）；R1-m2 回填经 PointStore 新方法 `restoreValues` 直接改 entry（禁 applyValue 防双 scale）+ import reset Decision；R1-m3 handler 错误不升级 status（`handler-error` 去重数据通道）；R1-m4/m9 行号与 483 计数；R1-m5 In Scope 修正（use-scada-events 移除）；R1-m6 Decision 前置 Proof；R1-m7 错误码入 Failure Paths 表；R1-m8 平台依赖收集 + probe 空 scope 边界（finalize 在 try/finally 后）；R1-m10 width/height=确定 Fix、viewport=Decision。R2 4 Minor 全部落地（point-store 入 Phase 1 Targets、probe 容错机制、design-engine:213-214、Review Record 回填）。R3 终验 2 Minor（Closure Gates :235→:242、:157→:163）已修。

## Closure Gates

> 关闭条件：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选后，才能将 `Plan Status` 改为 `completed`。

- [ ] 生命周期收口：destroy 无残留观察器、注入通道写最新 pipeline、失败构建不污染基线、live 值合并保留、销毁状态可见（Phase 1 回归全绿）。
- [ ] 健壮性收口：handler throw 隔离、hover 去重、always 动画无 states 可启动、订阅者异常隔离（Phase 2 回归全绿）。
- [ ] 数据面收口：复杂表达式订阅生效、compiledCache 有界（Phase 3 回归全绿）。
- [ ] 错误面收口：错误码注册表 + i18n、空态、not-visible、props 反应契约收敛（Phase 4 回归全绿）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（唯一 Decision 类 deferred 见 Deferred But Adjudicated）。
- [ ] 必要 focused verification 已完成；受影响的 owner docs 已同步到 live baseline（design-renderer.md §8.3/§4.3/:242、design-engine.md §8.1、design-symbols.md）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### scada-image 资源加载画布级诊断（loadFailed 消费）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 图片 404 已有视觉占位渲染（既有行为），画布级诊断通道与 P1-8「数据/资源错误不升级画布 status」契约冲突，需编辑器时代（I16）统一资源面诊断；本 Phase 4 修正误导注释并 doc 注记，author 不误信「已接线」。
- Successor Required: `yes`
- Successor Path: I16 编辑器后继 mission（roadmap 预留立项入口）

## Non-Blocking Follow-ups

- `point:change` 触发/action 联动（design-data-binding §8.1 未来数据事件面）未实现——out-of-scope improvement，非本计划契约缺口。
- 复杂表达式依赖收集的 probe 求值开销（每次 config 一次、可缓存）→ 性能观察项，随点表规模实测（audit 盲区自评 (c)）统一评估。

## Closure

Status Note: （完成时填写）

Closure Audit Evidence:

- Auditor / Agent: （待独立 closure-audit 填写）
- Evidence: （task id / daily log / findings 摘要）

Follow-up:

- （待填；不得出现 confirmed live defect）
