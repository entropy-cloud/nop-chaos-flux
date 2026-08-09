# {2243-1} HMI — Lifecycle, Destruction & Binding-Pipeline Hardening

> Plan Status: completed
> Mission: industrial-hmi
> Work Item: Follow-up Backlog §2026-08-04-2242 post-remediation audit (State & lifecycle dim 04/07 + Wiring state-style double-write)
> Last Reviewed: 2026-08-05
> Source: `docs/audits/2026-08-04-2242-multi-audit-industrial-hmi.md` (dim 04/07: 6 P2 lifecycle/destruction findings) + `docs/audits/2026-08-04-2242-open-audit-industrial-hmi.md` (1 P2 state-style double-write)
> Related: `docs/plans/2026-08-04-2242-1-hmi-diagnostic-channel-wiring-plan.md` (wired onError/onHandlerError channel that makes L5 observable), `docs/plans/2026-08-04-1235-2-hmi-lifecycle-wiring-plan.md` (installed change-basis ready guard + destroy cleanup), `docs/plans/2026-08-04-1558-2-hmi-lifecycle-degradation-hardening-plan.md` (installed destroyed status + subscriber-isolation), `docs/components/roadmap-industrial-hmi.md`

## Purpose

把 SCADA 运行时**生命周期 / 销毁 / 配置重载**路径上的 7 项确认 P2 finding 收口到一个可信状态：销毁后流水线不可被陈旧闭包重激活、`DirtyCollector` 销毁门控对称无 footgun、双销毁有单一 owner、配置重载期计数器/Map 不泄漏、handle 注册不每渲染抖动、状态样式写入有单一合帧 owner。这些是同一结果面（销毁/重载正确性）的不同侧面，统一由本 owner plan 收口，避免分散改动 `dirty-collector.ts` 产生冲突编辑。

## Current Baseline

> 已对照 live repo 核对（`packages/flux-renderers-industrial/src/`，2026-08-05）。行号随实现可能漂移，执行时以函数/符号名为准。

- **L1 RefreshPipeline 无 destroyed 守卫**：`src/binding/dirty-collector.ts` `RefreshPipeline` 类（:139+）`requestRender`(:213)/`flushFrame`(:190)/`destroy`(:223，内部 `collector.destroy()` :227) 无自身 `destroyed` 字段；destroy 后 `requestRender`/`flushFrame` 仍可被陈旧 runtime 闭包（`use-scada-points-bridge.ts` eval effect）重激活。`DirtyCollector` 有 `destroyed` 门，`RefreshPipeline` 没有镜像。
- **L2 `DirtyCollector.destroyed` 不对称**：`dirty-collector.ts:42` flag 仅守 `requestRender`(:67)；`collect`(:48)/`flush`(:78)/`flushFrame`(:90) bypass → 半门控 footgun。
- **L3 双销毁 collector**：`src/renderer/hooks/use-scada-engine.ts` `releaseRuntime` `:118` `current.pipeline.destroy()`（→ `dirty-collector.ts:227` collector.destroy）+ `:120` `current.collector.destroy()`，依赖幂等。
- **L4 `pendingSkipRef` 计数器泄漏**：`src/renderer/hooks/use-scada-config-sync.ts:176` `pendingSkipRef = useRef(0)` 计数器 + `:180` 与 `lastImportBaselineRef` 身份比对；host 表达式重算产新 config 对象身份时 skip 机制失配，错误跳过 sync 使画布滞留 imported 场景而 `prevRef` 静默前进。
- **L5 `lastReportedErrors` 跨 config reload 不清**：`src/renderer/hooks/use-scada-points-bridge.ts:212` Map；`:220` effect 仅 `compiledCache.current.clear()`，无对称 `lastReportedErrors.current.clear()`。**plan `{2242-1}` 接通 onError 后该缺陷变可观测**（旧 config 去重记录抑制新 config 同表达式上报）。
- **L6 handle effect 每 render 重跑**：`src/renderer/scada-canvas.tsx:227` 内联 `reloadConfig: (config) => {...}` 新身份传入 `useScadaHandles`(:220) → `use-scada-handles.ts` deps 重登/反注 handle。
- **W3 状态样式双写**：`dirty-collector.ts:323-347` `collectStates` 经脏收集 batched 写 state-style 字段；`src/symbols/visual-state.ts`（:62-64 immediate `applyAttrs`）同时直接写同字段，绕过 A5 合帧契约 → alarm-storm 下 N+1 `applyAttrs`/frame。两模块无单一 owner。

上一轮已落地基线（不重复）：`{1235-2}` change-basis ready 守卫 + destroy cleanup；`{1558-2}` `destroyed` status + 订阅者 try/catch 隔离；`{2242-1}` onError/onHandlerError 诊断通道。本 plan 在其上补齐销毁门控对称性、重载期状态泄漏、合帧 owner 收敛。

## Goals

- `RefreshPipeline` 与 `DirtyCollector` 销毁门控对称：destroy 后 `collect`/`flush`/`flushFrame`/`requestRender` 全部 no-op 且可被 focused 单测证明。
- `releaseRuntime` collector 销毁单一 owner（消除双销毁依赖幂等）。
- 配置重载期状态不跨 config 泄漏：`pendingSkipRef` 改 per-import nonce 语义；`lastReportedErrors` 与 `compiledCache` 对称清空。
- `reloadConfig` 稳定身份，`useScadaHandles` effect 不每渲染重登。
- 状态样式写入单一合帧 owner（`collectStates` 脏收集），`visual-state` 不再 immediate `applyAttrs` 同字段。

## Non-Goals

- 不改 leafer mock 建模（T1/T2 归 plan `{2243-3}`）。
- 不改 geometry/viewport 数学（D1-D4 归 plan `{2243-2}`）。
- 不实现复杂表达式订阅 `flux-deps-empty` 诊断（W1，deferred successor，见 Deferred）。
- 不改公共导出面（A1/W2 归 plan `{2243-3}`）。
- 不重构绑定域整体架构；仅在现有 pipeline/collector/hook 边界内收敛销毁与重载语义。

## Scope

### In Scope

- `src/binding/dirty-collector.ts`（`DirtyCollector` 门控对称 + `RefreshPipeline` destroyed 守卫 + `collectStates` 合帧 owner）
- `src/renderer/hooks/use-scada-engine.ts`（`releaseRuntime` 单一销毁 owner）
- `src/renderer/hooks/use-scada-config-sync.ts`（`pendingSkipRef` → nonce）
- `src/renderer/hooks/use-scada-points-bridge.ts`（`lastReportedErrors` 对称清空）
- `src/renderer/scada-canvas.tsx` + `src/renderer/hooks/use-scada-handles.ts`（`reloadConfig` 稳定身份）
- `src/symbols/visual-state.ts`（移除 immediate state-style `applyAttrs`，改为脏收集 owner）
- 受影响 focused 回归测试 + `design-engine.md`/`design-data-binding.md` owner-doc 同步

### Out Of Scope

- W1 表达式订阅诊断、T1/T2 mock 建模、D1-D4 geometry、A1/W2 公共面、Doc1-3 文档漂移（各有归属 plan）
- 编辑器时代资源面诊断（I16 后继）

## Failure Paths

| 场景                                | 触发                                               | 行为                                                           | 可重试                   | 用户可见表现                                   |
| ----------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- | ------------------------ | ---------------------------------------------- |
| destroy 后陈旧 scope 更新           | config reload 期间旧 runtime 闭包 eval effect 触发 | pipeline/collector destroyed 守卫拦截，no-op，不写已销毁树     | 否（scope 修复自动回流） | 无静默写已销毁画布；无 console error 风暴      |
| 双销毁                              | `releaseRuntime` + unmount cleanup 同时触发        | 单一 owner 销毁一次，二次 no-op                                | 否                       | 无重复 destroy 异常                            |
| host 传新 config 身份（表达式重算） | 每 render 新对象身份                               | nonce 匹配走 skip，身份不匹配走正常 diff，不滞留 imported 场景 | 否                       | 画布与最新 config 一致                         |
| config reload 后同表达式再报错      | 新 config 同表达式触发编译/求值错误                | `lastReportedErrors` 已清空 → 正常上报                         | 否                       | onError 收到新 config 的错误（不被旧记录抑制） |

## Test Strategy

档位选择：**建议有测**。本组为运行时正确性 hardening（销毁门控/重载泄漏/合帧 owner），无对外契约变更，但每项 finding 均有可构造的可观测负向行为，需 focused 单测证明「修复前会发生的错误行为不再发生」。

本档选择：建议有测。

## Execution Plan

### Phase 1 - Destruction guard symmetry（L1 + L2 + L3）

Status: completed
Targets: `src/binding/dirty-collector.ts`, `src/renderer/hooks/use-scada-engine.ts`

- Item Types: `Fix | Decision | Proof`（L1/L2/L3 为已确认 live defect/footgun；L3 含 single-owner 裁定 Decision；各含 Proof）

- [x] L2：`DirtyCollector` 的 `destroyed` 守卫扩展到 `collect`/`flush`/`flushFrame`（destroyed 时 no-op / flush 返 false），与 `requestRender` 对称
- [x] L1：`RefreshPipeline` 增自身 `destroyed` flag，`destroy()` 置位，`requestRender`/`flushFrame` 入口守卫（`RefreshPipeline` 公共入口仅这两个，无 `collect` 方法）；destroy 后陈旧 runtime 闭包重激活为 no-op
- [x] L3：`releaseRuntime` collector 销毁择一 owner（保留 `pipeline.destroy()` 内部销毁 collector 为唯一路径，移除 `use-scada-engine.ts:120` 冗余 `collector.destroy()`；或反之显式选 caller-owned 并移除 pipeline 内销毁——Decision 项，Phase 内裁定并写注释）
- [x] Proof：`dirty-collector` focused 单测补三组——(a) `DirtyCollector` destroyed 后 collect/flush/flushFrame/requestRender 全 no-op；(b) `RefreshPipeline` destroy 后 requestRender/flushFrame no-op；(c) releaseRuntime 路径 collector 仅销毁一次（spy 计数断言）

Exit Criteria:

- [x] `DirtyCollector`（collect/flush/flushFrame/requestRender）与 `RefreshPipeline`（requestRender/flushFrame）销毁门控对称，destroyed 后入口均 no-op，focused 单测三组入库
- [x] collector 销毁单一 owner，releaseRuntime 路径销毁计数 = 1 断言成立
- [x] 本 Phase focused 单测入库（包级全量回归归 Closure Gates，不在 Phase 内重复）

### Phase 2 - Config-reload state leakage（L4 + L5）

Status: completed
Targets: `src/renderer/hooks/use-scada-config-sync.ts`, `src/renderer/hooks/use-scada-points-bridge.ts`

- Item Types: `Fix | Proof`（L4/L5 重载期状态泄漏）

- [x] L4：`pendingSkipRef` 计数器改为 per-import nonce（import 时生成 nonce，skip 判定比对 nonce 而非计数器递减），消除 host 新身份泄漏路径
- [x] L5：`use-scada-points-bridge.ts:220` 既有 `compiledCache.current.clear()` effect 补 `lastReportedErrors.current.clear()`，与 compiledCache 对称
- [x] Proof：(a) config 身份变更 + 重算场景断言 skip 正确触发且画布不滞留 imported 场景（host 模拟新对象身份）；(b) config reload 后同表达式错误重新上报（不被旧 `lastReportedErrors` 抑制）断言

Exit Criteria:

- [x] pendingSkip 改 nonce 语义，host 新身份泄漏路径 focused 单测入库
- [x] `lastReportedErrors` 与 `compiledCache` 对称清空，reload 后同表达式重报 focused 单测入库
- [x] 本 Phase focused 单测入库（包级全量回归归 Closure Gates）

### Phase 3 - Handle registration stability + state-style coalesce owner（L6 + W3）

Status: completed
Targets: `src/renderer/scada-canvas.tsx`, `src/renderer/hooks/use-scada-handles.ts`, `src/symbols/visual-state.ts`, `src/binding/dirty-collector.ts`

- Item Types: `Fix | Decision | Proof`（L6 handle 抖动；W3 合帧契约违背 + owner 裁定 Decision）

- [x] L6：`scada-canvas.tsx:227` `reloadConfig` 内联箭头包 `useCallback`（依赖仅 config 相关），消除每渲染新身份 → `useScadaHandles` effect 不重登
- [x] W3：裁定状态样式写入单一合帧 owner。**预选方案 (a)**：以 `collectStates` 脏收集为唯一 owner，`visual-state.ts` 移除 immediate `applyAttrs`、改为经 `collector.collect` 汇入帧尾单次写。**方案 (a) 已知迁移成本**：`collectStates`（`dirty-collector.ts:338-344`）当前只写 active-state 样式，无 base-style 回退/`lastApplied` revert 逻辑（退出状态时需恢复 base 样式），而 `visual-state.ts` 现承担该 revert；Phase 内需把 revert 逻辑迁入脏收集路径或由 collector 在 flush 时合并 base+state。若迁移成本超 Phase 范围，回退 **方案 (b)**：保留 `visual-state.ts` 为 owner、改 `collectStates` 不再写同字段——Phase 内裁定并记录所选方案
- [x] Proof：(a) `reloadConfig` 身份跨渲染稳定断言 + handle 注册计数不随渲染递增；(b) alarm-storm 场景（多图元同时状态切换）`applyAttrs` 调用次数 ≤ 帧数（合帧）断言，而非 N+1

Exit Criteria:

- [x] `reloadConfig` 稳定身份，handle 注册不每渲染抖动，focused 单测入库
- [x] 状态样式写入单一合帧 owner（方案 a 或 b 裁定记录），alarm-storm 下 `applyAttrs` 合帧断言入库
- [x] 本 Phase focused 单测入库（包级全量回归归 Closure Gates）

> Phase 3 W3 Decision（裁定记录）：选定**方案 (a)**——单一合帧 owner，经脏收集（`collector.collect`）汇入帧尾单次写。具体落地为「active/revert 按 owner 职责拆分但共用同一 collector flush」：
>
> - **active-state 样式 owner = `RefreshPipeline.collectStates`**（保持不变，每帧批量写，与 binding 同帧合并、状态色胜出 binding）。`dirty-collector.ts` 未改，既有 `refresh-pipeline.test.ts` 状态样式断言无需变更。
> - **revert（退出恢复 base）owner = `StateVisualApplier`**，但写路径从 `engine.applyAttrs`（immediate）改为 `collector.collect`（合帧），与 active 同一帧尾 flush。
> - `visual-state.ts` 不再写 active 键（消除与 collectStates 的并发重复写），仅追踪 `lastApplied` 以便退出时 revert；`StateVisualApplier` 构造增可选 `collector` 参数，生产装配（`createBindingDomain`）恒传 collector，既有单测省略时 revert 退回 immediate（向后兼容回退路径）。
> - 结果：alarm-storm（N 图元同帧状态切换）engine.applyAttrs 收敛为 1 次/帧（active + revert 同一 flush），消除 N+1。未选方案 (b)：保留 visual-state immediate owner 无法满足 Proof「applyAttrs ≤ 帧数」（退出恢复仍 N 次 immediate/帧）。未把 revert 整体迁入 collectStates：需向 pipeline 注入 base-style 解析器（definition+instance），成本超出 Phase 范围且损害 refresh-pipeline 纯 pipeline 测试；现拆分让两模块各司 active/revert 不并发写字段，等效单一合帧 owner。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查，verdict 与轮数如下。

- Reviewer / Agent: `ses_032214dc1ffe3Ov1iSny0ATOSf`（fresh session）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；5 项 Minor 全部落地——(1) Phase 1 删除 `RefreshPipeline` 不存在的 `collect` 入口（仅 requestRender/flushFrame）；(2) Phase 1 Item Types 补全 `Fix | Decision | Proof`（L3 含 single-owner Decision）；(3) W3 预选方案 (a) + 显式标注 base-style revert 迁移成本与回退方案 (b)；(4) 各 Phase Exit 移除包级全量测试重复（归 Closure Gates，对齐 Rule 18）；(5) 销毁门控 Exit Criteria 按 DirtyCollector（4 方法）/ RefreshPipeline（2 方法）分列。引用与 finding 真实性经独立核对（L1-L6 + W3 全部 live）。

## Closure Gates

- [x] L1-L6 + W3 七项 in-scope finding 全部 landed（销毁门控对称 / 单一销毁 owner / 重载无泄漏 / handle 稳定 / 合帧 owner）
- [x] 不存在被静默降级到 deferred 的 in-scope live defect
- [x] `design-engine.md` 生命周期/销毁语义 + `design-data-binding.md` 合帧 owner 描述同步 live baseline（仅当 Phase 真改了 owner 行为）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### W1 — 复杂表达式订阅路径失败静默 disable

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 该项是「平台 collector 失败时发 `flux-deps-empty` 诊断」的增强，依赖 `{2242-1}` 诊断通道（已落地）但属独立表达式订阅路径，与本 plan 的销毁/重载结果面不同；不修复不影响当前 supported 销毁/合帧基线成立。
- Successor Required: yes
- Successor Path: `docs/plans/2026-08-04-2243-2-hmi-geometry-viewport-data-path-correctness.md`（同数据路径 family，可在其内或单列 successor 收口）

## Non-Blocking Follow-ups

- 销毁路径幂等性收敛后，可考虑给 `DirtyCollector.destroy` 加 `Object.freeze`/sealed 防御性二次调用告警（optimization candidate，非缺陷）

## Closure

Status Note: 七项 in-scope P2 finding（L1-L6 + W3）全部 landed 且经 focused 单测证明。独立 fresh-session 子 agent 复核 live repo（`packages/flux-renderers-industrial/src/`）逐条核对 Phase Exit Criteria、anti-hollow（每处实现均被运行时装配/调用）、deferred honesty（W1 真属 out-of-scope 表达式订阅诊断、successor 已记录）、owner-doc 同步（design-engine.md / design-data-binding.md）后批准关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（MISSION_DRIVER:2026-08-04-224234-mission-driver，不复用执行 session 上下文）
- Phase 1 live landing：`dirty-collector.ts` `DirtyCollector` collect(:51)/flush(:83)/flushFrame(:97)/requestRender(:70) 四入口均 `if (this.destroyed) return` 对称；`RefreshPipeline` `destroyed` flag(:160) 守 flushFrame(:202)/requestRender(:227)，`destroy()`(:236) 内部销毁 collector 为单一 owner（幂等守卫 :239）；`use-scada-engine.ts:122` `releaseRuntime` 仅 `pipeline.destroy()`、无冗余 `collector.destroy()`。Proof：`dirty-collector.test.ts:145`（L2 三组 no-op）、`refresh-pipeline.test.ts:606`（L1 no-op + L3 single-owner spy 计数 = 1）
- Phase 2 live landing：`use-scada-config-sync.ts:181` `pendingSkipNonceRef`（single-use，effect 首次运行 :188-193 即消费不论 identity 是否匹配）；`use-scada-points-bridge.ts:224` `lastReportedErrors.current.clear()` 与 :223 `compiledCache.current.clear()` 对称。Proof：`use-scada-config-sync.test.ts:148`（nonce 不残留两条）、`scada-points-bridge.test.tsx:593`（reload 后同表达式重报）
- Phase 3 live landing：`scada-canvas.tsx:229` `reloadConfig` 包 `useCallback([syncImported])` 稳定身份；`visual-state.ts` `StateVisualApplier` 增可选 `collector`(:38)，active 仅追踪(:60)、revert 经 `collector.collect`(:68)、无 collector 才回退 immediate(:70-81)；生产装配 `use-scada-engine.ts:72` `new StateVisualApplier(engine, collector)` 恒传 collector；`collectStates`（dirty-collector.ts:340）保持 active-state 写 owner。Proof：`scada-handles.test.tsx:286`（同 props re-render 不重登）、`state-visual.test.ts:246`（alarm-storm N 图元 → 1 次 applyAttrs/帧）
- Anti-hollow：所有新代码均被运行时装配/调用——`StateVisualApplier` collector 经 `createBindingDomain` 接入 pipeline `state:change`；nonce/对称清空经 effect/handler 实际触发；销毁门控无空函数体或 swallowed exception
- Closure Gates 复跑（包级）：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 绿、`build` 绿、`lint` 绿、`test` 绿（41 files / 580 tests passed）
- Deferred honesty：W1（复杂表达式订阅 `flux-deps-empty` 诊断）真属 out-of-scope improvement（依赖 {2242-1} 通道但属独立表达式订阅路径，不影响销毁/合帧基线），successor path `2026-08-04-2243-2` 已记录；Non-Blocking Follow-up 仅 `DirtyCollector.destroy` 加 freeze/sealed 防御告警（明确 optimization candidate，非缺陷）
- Owner-doc 同步：`design-engine.md:98`（销毁门控对称 + 单一 owner）、`design-data-binding.md:126`（状态样式合帧 owner active/revert 职责拆分）均已描述最终设计状态

Follow-up:

- W1 表达式订阅诊断 → successor（见 Deferred，归属 `2026-08-04-2243-2` 同数据路径 family）
- 无其他剩余 plan-owned work（七项 in-scope finding 全部 landed 且经 focused proof）
