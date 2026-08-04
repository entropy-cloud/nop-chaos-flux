# 2 First-Frame, Lifecycle And Config-JSON Wiring — `flux-renderers-industrial`

> Plan Status: active
> Last Reviewed: 2026-08-04
> Source: `docs/audits/2026-08-03-1506-multi-audit-industrial-hmi.md` (P1-2, P1-3, P1-8), `docs/audits/2026-08-03-1506-open-audit-industrial-hmi.md` (P1 background/viewport dead fields, P1 StateVisualApplier unwired)
> Related: `docs/components/roadmap-industrial-hmi.md`; `docs/plans/2026-08-04-1235-1-hmi-diff-path-convergence-plan.md`; `docs/plans/2026-08-04-1235-3-hmi-display-math-manifest-plan.md`

## Purpose

修复 `scada-canvas` 运行时"初始状态/生命周期"类 wiring 缺陷：首帧绑定不生效（P1-2）、ready 双发（P1-3）、运行时数据错误升级为画布级 error 且无恢复（P1-8）、组态 JSON 内 `background`/`viewport` 字段 validated-but-dead（open P1-A）、状态退出不恢复样式（StateVisualApplier 从未接线，open P1-B）——共 5 个 P1。目标是"第一帧正确、ready 恰一次、数据错误按声明降级、config JSON 字段真实生效、状态样式可恢复"。

## Current Baseline

- 首帧无刷新：`point-store.ts:100` 声明加载 `dirty: false`；全包 `requestRender` 调用点仅 3 处（points-bridge 有值时、`setPointValue`、engine 测试句柄）——纯静态/表达式点配置挂载后永不触发 `flushFrame`，绑定/状态色/`when:'always'` 动画首帧不应用、无自愈（multi-audit P1-2，live 确认）。`flushFrame` 的 `synced=false` 全量首同步（dirty-collector.ts:187-193）在没有渲染请求时不可达。
- ready 双发：`use-scada-config-sync.ts:113-114` `prevRef.current = config; latest.current.onBuilt?.();` 无条件执行——full 与空 diff 两路径都触发；`reloadBindings → setRuntime(新对象)` → effect 重跑 → 空 diff → 第二次 `onBuilt` → `scada:ready` 双发（P1-3，live 确认；open-audit 补充：宿主每渲染传新 config 对象身份时，identity 守卫无效，守卫必须 change/diff 基准）。
- 错误升级：`use-scada-points-bridge.ts:136-138,145-147` 任一 flux 编译/求值失败 → `onError('flux-compile-failed'/'flux-evaluate-failed')` → `scada-canvas.tsx:151` `handleError` → `setStatus('error')` 整画布替换为错误区；无恢复路径（`handleReady` 仅经 config build 触发），且无 lastError 式去重（P1-8，live 确认）。
- `config.background`/`config.viewport` 只被 `validate.ts` 消费：engine 有 `background` option（`scada-engine.ts:124-125` 构造期 ground fill，`engine.reset` 不复用），renderer 从不传入；`config.viewport {x,y,scale}` 从不喂 `setViewport`（open P1-A，live 确认；`design-renderer.md §4.2` 声明为"视图配置（三件套之「视图配置」）"）。
- 状态恢复缺失：`dirty-collector.ts:291-315` `collectStates` 只 apply `declaration.states[state]?.style`，退出状态时目标状态无 style（或部分声明只有 fault 有 style）→ 不收集任何恢复 patch → 故障色永远残留；`StateVisualApplier`（`symbols/visual-state.ts:27-65`，带 `lastApplied` 恢复语义）已导出（`index.ts:70`）、有 `attachTo(pipeline)`（`pipeline.on('state:change')` 事件真实存在，dirty-collector.ts:303 发射）但 `use-scada-engine.ts` 从未实例化/接线（open P1-B，live 确认；462 绿测试全部用全三态声明，部分声明场景被掩蔽）。
- 机械门：typecheck/lint/build/test 全 PASS（462/462）；`pnpm check` 的 manifest 门 FAIL（归 plan `{3}`）。

## Goals

- 静态/表达式点配置挂载首帧即应用绑定值（无任何外部写入），状态色/`when:'always'` 动画首帧生效。
- `scada:ready` 每次 config 构建（mount / full reset / 非空 diff）恰 dispatch 一次；宿主每渲染传新 config 对象身份时不触发 onBuilt。
- flux 求值失败降级为"该声明跳过 + 单次上报"，不再改变画布 status；数据恢复后画面自动恢复 ready。
- `config.background` 在 reset/build 时应用到 ground 层；`config.viewport {x,y,scale}` 存在时作为初始视口应用（首选接线；`background.grid` 字段裁定见 Deferred But Adjudicated）。
- 状态退出恢复 base 样式（部分声明场景：style 只在 fault 上时，fault→run 恢复 base fill）；StateVisualApplier 接线进运行时。

## Non-Goals

- 不处理 diff 路径树/索引/基线收敛（P1-4/P1-5/type-drop）——归 plan `{1}`。
- 不处理视口 fill/center 公式、overlay 坐标、zoomLayer 锚点、manifest 门（P1-1/P1-6/P1-7/P1-9）——归 plan `{3}`。
- 不新增组件级 error 通道/公共契约字段；不引入 i18n 错误码注册（P2，backlog）。
- 不实现 onError 去重风暴的完整 lastError 语义（P2 级别，backlog）；P1-8 只收口"降级 + 恢复"契约。

## Scope

### In Scope

- `use-scada-config-sync.ts`（onBuilt 守卫、config.viewport 初始应用）、`use-scada-engine.ts`（初始刷新触发、StateVisualApplier 接线）、`use-scada-points-bridge.ts`（错误降级/去重）、`scada-canvas.tsx`（error/ready 状态流转）、`scada-engine.ts`（reset 时 background 应用）、`dirty-collector.ts`（状态恢复语义，若采用 collectStates 方案）。
- 回归测试：首帧静态/表达式点应用、ready 恰一次（mount/full reset/非空 diff 计数）、error→ready 恢复、background/viewport JSON 生效、部分状态声明恢复 base 样式。

### Out Of Scope

- `component:destroy` 后 status/挂载语义（P2）→ backlog。
- 状态动画 `when:'always'` 在无 states 图元上 no-op（P2）→ backlog。
- point 值合并（reloadBindings wipe，P2）→ backlog。

## Failure Paths

| 可测场景编号             | 触发                                                | 行为（含状态码/错误码）                                | 可重试 | 用户可见表现                       |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------ | ------ | ---------------------------------- |
| static-point-first-frame | 纯静态/表达式点配置挂载，无外部写入                 | 首帧 flushFrame 收集绑定 → 状态色/动画应用             | 是     | 首帧即显示绑定后的样式             |
| ready-once               | mount / full reset / 非空 diff / 宿主重传同值新对象 | onReady 恰 dispatch 1 次（按构建数计）                 | 是     | 用户 onReady 副作用不重复执行      |
| flux-degrade-recover     | 单个 flux 表达式求值失败后 scope 数据恢复           | 画布保持 ready；失败声明跳过、单次上报；恢复后自动更新 | 是     | 画面不整体变错误区，恢复后数据回流 |
| config-bg-viewport       | config JSON 含 background / viewport                | ground 填充色应用；初始视口按 {x,y,scale} 定位         | 是     | 画面背景/初始取景符合组态          |
| partial-state-restore    | 图元只有 fault 状态有 style，值从故障区间回正常区间 | 退出 fault 恢复 base 样式（fill 回 base）              | 是     | 设备不复为常红                     |

## Test Strategy

本档选择：**必须自动化**（核心回归路径：首帧语义、ready 生命周期、数据错误降级——审计明确指出现有 462 测试系统性掩蔽这些场景）。Proof 项在 Fix 项之前（TDD 序）。

## Execution Plan

### Phase 1 - 首帧绑定刷新（P1-2）

Status: planned
Targets: `src/renderer/hooks/use-scada-engine.ts`（`reloadBindings`）、`src/renderer/hooks/use-scada-config-sync.ts`、`src/renderer/scada-canvas-lifecycle.test.tsx`

- Item Types: `Fix | Decision | Proof`
- [ ] `Proof` — 先写失败用例：静态点 + 表达式点配置零写入挂载 → 断言图元 fill/状态色按绑定值应用、`when:'always'` 动画已启动（当前首帧无刷新失败）。
- [ ] `Decision` — 首帧触发机制：**在 `reloadBindings` 内部、绑定域重建之后**（`use-scada-engine.ts:165-181` 末尾 `setRuntime(next)` 前）对新建 pipeline 调一次 `pipeline.requestRender(applyAttrsOf(engine))`。理由：config-sync full 路径闭包持有的 `runtime` 是旧对象（`reloadBindings` 同步销毁旧 pipeline），外部触发会打到已销毁 pipeline；触发点内置可保证"重建后即首同步"。scope-data 变化路径（points-bridge 有值写入）不受影响。
- [ ] `Fix` — 按 Decision 落地：`reloadBindings` 重建绑定域后**无条件**立即首帧 `requestRender`（不对 full/diff 做策略门控——`reloadBindings` 在 full 与非空 diff 两条路径都会被调用（use-scada-config-sync.ts:97,110），diff 新增的静态绑定图元同样需要首同步，门控会漏掉该场景）。

Exit Criteria:

- [ ] 静态点 + 表达式点首帧应用测试通过（挂载后引擎 attrs 断言，`synced=false` 全量首同步路径被实际执行），全包测试无回归。

### Phase 2 - ready 生命周期恰一次（P1-3）

Status: planned
Targets: `src/renderer/hooks/use-scada-config-sync.ts`, `src/renderer/scada-canvas-lifecycle.test.tsx`

- Item Types: `Fix | Proof`
- [ ] `Proof` — 先写失败用例（dispatch 计数）：mount 恰 1 次、full reset 恰 1 次、非空 diff 恰 1 次、宿主每渲染传新对象身份（同内容）0 额外触发（当前无条件 onBuilt 下计数失败）。
- [ ] `Fix` — `onBuilt` 改为 **change 基准**守卫：仅当本次 effect 运行实际执行了非空构建（full reset 或非空 diff）时触发 `onBuilt`；空 diff 重跑（含宿主重传同值新对象身份、`reloadBindings → setRuntime` 引起的 effect 重跑）不触发。实现上在 full 路径与"diff 非空"路径各自设置已构建标记，空 diff 直接 return（同时仍维护 `prevRef`）。importConfig 场景的 onBuilt 由 plan `{1}` Phase 3 的 `syncImported` 出口（含本守卫语义）交付，不在本守卫单测范围。

Exit Criteria:

- [ ] 计数测试通过（4 场景），覆盖 open-audit 的 identity-vs-change 触发点；plan `{1}` Phase 3 的 importConfig onBuilt 触发依赖本守卫。

### Phase 3 - 组态 JSON background/viewport 接线（open P1-A）

Status: planned
Targets: `src/renderer/hooks/use-scada-engine.ts`（`createBindingDomain`；background 接线点在 reset/同步期，非 options 透传）、`src/renderer/hooks/use-scada-config-sync.ts`、`src/engine/scada-engine.ts`（reset 期 background）、`src/renderer/scada-canvas-lifecycle.test.tsx`、`docs/components/industrial-hmi/design-renderer.md`（§4.2 同步）

- Item Types: `Fix | Decision | Proof`
- [ ] `Proof` — 先写失败用例：带 `background.color`/`viewport {x,y,scale}` 的 config reset 后 ground fill 与初始 viewport 正确（当前两字段均 dead，失败）。
- [ ] `Fix` — `engine.reset(config)` 时应用 `config.background.color`（ground 层 fill；与构造期 `ScadaEngineOptions.background` 同口径，reset 覆盖构造值。注意 `config.background` 经 props 到达，mount 期不可用，接线点在 reset/同步期而非 options 透传）。
- [ ] `Fix` — `config.viewport {x,y,scale}` 存在时作为初始视口状态应用（full/reset 路径，`engine.setViewport`；与 props `viewport` policy 的优先级裁定：props policy 为显式首选项，config.viewport 为组态默认——两者都无时保持现状；plan `{3}` Phase 2 修正 `applyInitialViewport` 公式后本路径共用）。
- [ ] `Decision` — `background.grid`（config-types.ts:88）本 Plan 不接线，保留 watch-only（见 Deferred But Adjudicated）；`design-renderer.md §4.2` 同步实际契约（color 生效、grid 未接线）。

Exit Criteria:

- [ ] background/viewport 生效测试通过；`design-renderer.md §4.2` 与实际契约一致（接线语义 + grid watch-only 已记录）。

### Phase 4 - 状态样式恢复接线（open P1-B）

Status: planned
Targets: `src/renderer/hooks/use-scada-engine.ts`（`createBindingDomain`）、`src/binding/dirty-collector.ts`、`src/symbols/visual-state.ts`、`src/symbols/state-visual.test.ts`、`src/symbols/device/device-symbols.test.ts`、`src/symbols/sensor-control/sensor-control-symbols.test.ts`

- Item Types: `Fix | Decision | Proof`
- [ ] `Proof` — 先写失败用例：部分状态声明（style 只在 `fault`）——值入故障区间 → fault 样式应用；值回正常区间 → base 样式恢复（当前 collectStates 无恢复收集，失败）。
- [ ] `Decision` — 接线方案：(a) 在 `createBindingDomain`（`use-scada-engine.ts:38-59`）内实例化 `StateVisualApplier` 并 `attachTo(pipeline)`——**注意每次 `reloadBindings` 都会重建 pipeline，必须随 `createBindingDomain` 调用重新 attach**，不能只在 mount effect 挂一次；或 (b) 在 `collectStates` 内实现 base 样式恢复收集（退出状态补 base 差值 patch）。优先 (a)（组件已就绪、`state:change` 事件真实存在（dirty-collector.ts:303）、`getConfigNode` 依赖已存在（scada-engine.ts:207），仅缺接线）；若选 (b) 需保证与既有 state:change 事件消费不冲突。
- [ ] `Fix` — 按 Decision 落地：StateVisualApplier 实例化 + attach（方案 (a) 时随 pipeline 重建重新 attach；`engine.applyAttrs` 复用现有 `applyAttrsOf`）。

Exit Criteria:

- [ ] 部分声明恢复测试通过；`state-visual.test.ts`/device/sensor-control 既有全三态用例全绿（无回退）。

### Phase 5 - 数据错误降级与恢复（P1-8）

Status: planned
Targets: `src/renderer/hooks/use-scada-points-bridge.ts`, `src/renderer/scada-canvas.tsx`, `src/renderer/scada-canvas-lifecycle.test.tsx`

- Item Types: `Fix | Decision | Proof`
- [ ] `Proof` — 先写失败用例：坏表达式配置 → 画布保持 ready/非 error、该点不更新；scope 数据修复 → 点值更新恢复；上报 ≤1 次（当前 setStatus('error') 且重复上报，失败）。
- [ ] `Decision` — 上报通道：flux 编译/求值失败 → 跳过该声明（continue），经本 hook 内 `lastError` 式去重后走 `onError` 单次上报（同表达式同错误码仅在变化时上报一次，**该声明求值成功后清空去重记录**，允许下次失败再报），**不**经 `handleError` 改 canvas status（`scada-canvas.tsx:151` 移除 points-bridge 的 onError 直通，或改接非 status 通道）。
- [ ] `Fix` — 按 Decision 落地：points-bridge 错误降级 + 去重；`scada-canvas.tsx` 切断 points-bridge onError → status 链路。
- [ ] `Fix` — 恢复路径：数据恢复后（scopeData 更新、求值成功）点值经既有注入路径回流，画面语义即恢复 ready；若此前 status 曾被数据错误污染，首次成功求值时 `handleReady` 复位（如需）。

Exit Criteria:

- [ ] 降级 + 恢复测试通过；config 错误（`config-build-failed`/`config-invalid`）仍走画布级 error 通道（契约不回退）。
- [ ] 包内全量测试 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 通过（Phase 1-5 focused 验证收口）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh-session 子 agent ×2（R1 `ses_034ef8e1bffeQmu5Kv7mNcy7TY`、R2 确认轮 `ses_034dccd4dffeoZsgan8AXiFg0m`）
- Verdict: `pass`（R2 确认轮；R1 `fail` 2 Major + 5 Minor，均已修正）
- Rounds: 2
- Findings addressed: R1-M1 首帧 requestRender 机制缺口（config-sync 闭包持旧 pipeline）→ Phase 1 `Decision` 明确触发点内置在 `reloadBindings` 重建之后 + Fix 无条件触发（不做 full/diff 门控，diff 路径新增静态绑定同样需要）；R1-M2 错误测试路径（`__tests__/` 不存在）→ 全部改为平铺同位文件；R1-m1 Proof 补表达式点断言；R1-m2 Phase 5 上报通道明确为 `Decision`（lastError 去重 + 求值成功清空 + 不改 status）；R1-m3 background.grid watch-only 裁定入 Deferred But Adjudicated；R1-m4 StateVisualApplier 随 createBindingDomain 每次重建重新 attach；R1-m5 Proof 前置（TDD 序）。R2 确认轮 4 Minor 全部采纳（无条件触发表述、importConfig onBuilt 归属 plan `{1}`、dedup 清空时机、Phase 3 targets 对齐 reset 期接线）。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复：P1-2（首帧绑定）、P1-3（ready 双发）、P1-8（数据错误升级/无恢复）、open P1-A（background/viewport dead）、open P1-B（状态恢复未接线）——按 Phase 1-5 行为语义在 live repo 验证
- [ ] `scada:ready`/`scada:error` 事件契约与 `design-renderer.md §8.1` 一致（ready 按构建触发、数据错误不升级 error）
- [ ] 5 组回归测试（首帧静态/表达式点 / ready 计数 / error→ready 恢复 / JSON background+viewport / 部分声明样式恢复）全绿入库
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步：`design-renderer.md`（§4.2 viewport/background 语义含 grid watch-only、§8.1 ready/error 触发语义）与 live baseline 一致；`docs/logs/` 收口记录
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### `background.grid` 字段不接线（watch-only residual）

- Classification: `watch-only residual`
- Why Not Blocking Closure: `config.background.grid`（config-types.ts:88）当前 validate 接受但无任何 runtime 消费面；本 Plan 只收口 `background.color`（设计文档"视图配置"主语义）。grid 底纹属视觉增强，无契约损坏（v1 无兼容负担），`design-renderer.md §4.2` 显式注明"grid 未接线"即可，避免 author 误用。
- Successor Required: `no`（随后续图元样式轮或 author 需求触发时再接线，登记在 roadmap Follow-up Backlog）

## Non-Blocking Follow-ups

- open-audit P2「onBuilt 守卫必须 change 基准」由本 Plan Phase 2 直接收口（P1-3 fix 覆盖两个触发点），backlog 中对应条目标注已收口。
- 其余关联 P2 见 roadmap-industrial-hmi.md `## Follow-up Backlog`。

## Closure

Status Note: 待执行。

Closure Audit Evidence:

- Auditor / Agent: （待独立子 agent 填写）
- Evidence: （待填）

Follow-up:

- 待关闭时填写；no remaining plan-owned work 或指向 `{1}`/`{3}` 的衔接。
