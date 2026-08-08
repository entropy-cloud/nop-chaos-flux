# 3 Industrial SCADA Engine Viewport Zero-Scale Guard & Runtime Meta Contract

> Plan Status: active
> Last Reviewed: 2026-08-08
> Source: `docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md` (A3, A4)
> Related: `docs/backlog/industrial-hmi-component-audit-roadmap.md`; first-wave sibling plans `2026-08-08-1809-{1,2,3}-*`（validation / editor state / canvas correctness）；本 plan 收口 engine 视口防御代码自毁 + runtime renderer 契约缺口，与 first-wave 1809-3（P1-5 viewport fit resize）互补——后者管 fit policy 重应用，本 plan 管零缩放守卫与 meta 契约。
> Execution Order: {3} — 独立于 plan {1}/{2}；A3 与 first-wave 1809-3 的 P1-5 同在 `engine/scada-engine.ts` 视口域但触及不同函数（readZoomLayerScale/handlePluginMove vs constructor/setSize refit），可并行。

## Purpose

收口「引擎视口防御代码反而放大故障」+「runtime renderer 对 meta 契约非对称实现」2 个 P1：

- **A3**：零缩放守卫自毁。`readZoomLayerScale(scaleX, fallback)`（`scada-engine.ts:494-496`）对 `scaleX===0` 返回 `0`（`Number.isFinite(0)` 为 `true` → 不走 fallback）。`handlePluginZoom`（`:455-459`）的零守卫检测到 0，却随即调 `syncViewportFromZoomLayer()`，后者再次用 `readZoomLayerScale` 读回 `0` 并写入 `this.viewport.scale=0`（`:487-490`）——守卫注释（L453-454）声称「早退前用 fallback 读回有限视口态」，**与实现矛盾**。一旦 `viewport.scale=0`：`viewportToWorld`（viewport.ts 除以 scale）返 `Infinity/NaN`，经 `EventBridge`（scada-engine.ts:422）进 `symbol:click/hover` 的 world 坐标；`applyViewportState`（L378）算 `scale=Infinity` 再 `zoomLayer.scaleOfWorld(anchor, Infinity)` → zoomLayer 矩阵不可逆 corrupt。更甚：`handlePluginMove`（`:475-479`）**根本无零守卫**，move 事件带 `scaleX===0` 时直接同步落地。
- **A4**：runtime `scada-canvas.tsx` 忽略 `props.meta.disabled`/`visible` 契约。AGENTS.md「Renderer Component Contract」明确 `props.meta` 提供 disabled/visible/className/testid。编辑器画布 `scada-editor-canvas.tsx:217` 遵守 `disabled`（→ `aria-disabled`/`inert`、事件早退），runtime 画布 `scada-canvas.tsx:291-300` 只读 `meta.testid`/`cid`/`className`，**不读** `disabled`/`visible`——同一包内对同一契约非对称实现。host 在只读监控画面上设 `disabled:true`，scada-canvas 仍全量派发 pan/zoom/click（EventBridge 触发、`helpers.dispatch` 执行），`visible:false` 仍渲染。

## Current Baseline

- `engine/scada-engine.ts:494-496` `readZoomLayerScale(scaleX, fallback)`：`typeof scaleX === 'number' && Number.isFinite(scaleX) ? scaleX : fallback`——`Number.isFinite(0)===true` → `scaleX===0` 返回 `0`（**不**走 fallback）。
- `engine/scada-engine.ts:444-473` `handlePluginZoom`：`:450` `rawScale = readZoomLayerScale(zoomLayer.scaleX, this.viewport.scale)`；`:455-459` 零守卫 `if (rawScale===0 || !Number.isFinite(rawScale))` → 调 `syncViewportFromZoomLayer()`（**再次读回 0**）+ `interaction?.refresh()` + return；`:470` 正常路径也调 `syncViewportFromZoomLayer()`。
- `engine/scada-engine.ts:475-479` `handlePluginMove`：**无零守卫**，直接 `syncViewportFromZoomLayer()` + refresh。
- `engine/scada-engine.ts:481-491` `syncViewportFromZoomLayer`：`scale = readZoomLayerScale(zoomLayer.scaleX, this.viewport.scale)` → `this.viewport = { x: -zoomX/scale || 0, y: -zoomY/scale || 0, scale }`——scale=0 时 x/y 的 `/scale` 产 Infinity（`|| 0` 仅救 NaN，不救 Infinity）。
- 下游 `engine/viewport.ts` `worldToViewport`/`viewportToWorld`（audit 标注 :43-52 乘/除 scale）；`EventBridge`（scada-engine.ts:422）消费 `viewportToWorld` 派发 world 坐标。
- `renderer/scada-canvas.tsx:291-300` wrapper：读 `props.meta.testid`/`cid`/`className`，**不读** `disabled`/`visible`；`:193` `onSymbolEvent` 经 `eventsApi` 无条件挂接；`useScadaEngine` 接 `interactionLayer:true` 无条件启用交互。对照 `editor/scada-editor-canvas.tsx:217` `const disabled = props.meta.disabled === true` → 272-273 `aria-disabled`/`inert`、275/305 事件早退。
- 机械门禁全绿（~1340 tests）。first-wave 1809-3 覆盖 P1-5（viewport fit resize 重应用），未触及零缩放守卫与 meta 契约。

## Goals

- A3：`scaleX===0`（空画布 zoom-to-fit、程序化 setScale(0)、矩阵瞬时 corrupt）不再固化成永久 `viewport.scale=0` 的不可恢复态；`handlePluginMove` 补同形零守卫；`viewport.scale` 在任意 zoom/move 事件后保持非零有限。
- A4：runtime `scada-canvas` 遵守 `props.meta.disabled`（disabled 时不派发 pan/zoom/click 交互）与 `props.meta.visible`（false 时不渲染），与编辑器画布同契约纪律。
- 每条 Fix 配 failing-first 回归测试断言**可观测结果**（`viewport.scale` 非零有限 / disabled 时不触发 EventBridge dispatch）。

## Non-Goals

- 不改 viewport fit policy 的 resize 重应用（P1-5，归属 first-wave 1809-3）。
- 不改 `interactionOverlay` getter 无 destroyed 检查 / `engineRef`/`runtimeRef` effect 无 cleanup（P2 簇，归 backlog）。
- 不改错误去重 Set 无界增长（P2，归 backlog）。
- 不改公共导出面（`ScadaCanvas` renderer 注册契约、`viewport` schema 契约不变；meta.disabled/visible 是既有契约的字段，本计划只是落地遵守）。
- 不改编辑器画布（已遵守 disabled；编辑器无 visible:false 监控用例）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/engine/scada-engine.ts`（`readZoomLayerScale` 拒 0；`handlePluginMove` 补零守卫；`syncViewportFromZoomLayer` 在读到 0/非有限时回退 `this.viewport.scale`）。
- `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`（读 `props.meta.disabled` 门控交互、`props.meta.visible` 门控渲染）。
- 对应 viewport 零缩放回归测试 + runtime meta 契约回归测试。

### Out Of Scope

- `engine/viewport.ts`（仅下游消费，readZoomLayerScale 修复后自然受益，无需改）。
- `editor/scada-editor-canvas.tsx`（已遵守 disabled，不改）。
- symbols / serialization / editor mutator/connection（归属本批 plan {1}/{2} 与 first-wave plans）。

## Failure Paths

| 场景编号       | 触发                                   | 行为                                                                                                 | 可重试 | 用户可见表现                  |
| -------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| VP-zero-zoom   | 注入 `zoomLayer.scaleX=0` 的 zoom 事件 | `viewport.scale` 保持非零有限（回退既有 viewport.scale），不产 Infinity/NaN                          | 否     | 画布不 corrupt，交互坐标正常  |
| VP-zero-move   | 注入 `scaleX===0` 的 move 事件         | 同上（handlePluginMove 守卫）                                                                        | 否     | 同上                          |
| META-disabled  | host 设 `meta.disabled:true`           | runtime scada-canvas 不派发 pan/zoom/click（EventBridge 不触发 / 事件早退），wrapper `aria-disabled` | 否     | 只读监控大屏不可误触改动/导航 |
| META-invisible | host 设 `meta.visible:false`           | runtime scada-canvas 不渲染画布（null / 占位）                                                       | 否     | 隐藏画布不占交互              |

## Test Strategy

档位：**必须自动化**。

理由：A3 是「防御代码反而放大故障」——守卫存在让审阅者以为零缩放已处理，实际把瞬时态固化成永久不可恢复态（核心交互坐标 corrupt）；A4 是 renderer 契约违背使 SCADA 一等用例（只读监控）的安全语义落空。Proof 项在 Fix 前（failing-first）。A4 的 Proof 需断言 disabled 时 EventBridge/handlers.dispatch **不触发**（非仅 DOM 属性）。

## Execution Plan

### Phase 1 - A3 零缩放守卫修复（readZoomLayerScale 拒 0 + handlePluginMove 守卫）

Status: planned
Targets: `packages/flux-renderers-industrial/src/engine/scada-engine.ts`（`readZoomLayerScale`、`handlePluginZoom`、`handlePluginMove`、`syncViewportFromZoomLayer`）；相关测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / failing-first) 增用例：构造 engine → 注入 `zoomLayer.scaleX=0` 的 zoom 事件（`handlePluginZoom`）→ 断言 `engine.getViewport().scale` 保持非零有限（>0 且 `Number.isFinite`）。当前会失败（readZoomLayerScale 返回 0 → viewport.scale=0）。再加一条注入 `scaleX===0` 的 move 事件（`handlePluginMove`）同型断言。当前会失败（move 无守卫 → viewport.scale=0）。
- [ ] (Fix) `readZoomLayerScale`：`typeof scaleX === 'number' && Number.isFinite(scaleX) && scaleX !== 0 ? scaleX : fallback`（拒 0）；或抽共享 `isFiniteNonZero` helper 供 scale/position 复用。
- [ ] (Fix) `handlePluginMove`：补与 `handlePluginZoom` 同形零守卫（rawScale===0 / 非有限 → syncViewportFromZoomLayer（现读 0 走 fallback）+ refresh + return）。
- [ ] (Fix — 验证) `syncViewportFromZoomLayer`：readZoomLayerScale 修复后读到 0/非有限时回退 `this.viewport.scale`，`x/y` 的 `/scale` 不再产 Infinity；必要时显式 `scale = isFiniteNonZero(scale) ? scale : this.viewport.scale`。
- [ ] (Proof / failing-first) 两条用例转 pass；既有 viewport zoom/move/clamp/NaN 防御测试（P2-5/P2-7/P2-8 已修）零回归。

Exit Criteria:

- [ ] `readZoomLayerScale` 在 live 代码中显式拒 0（`grep -n "scaleX !== 0" scada-engine.ts` 命中）。
- [ ] `handlePluginMove` 补零守卫（live 代码可见，与 handlePluginZoom 同形）。
- [ ] failing-first 用例（zoom + move 注入 scaleX=0 → viewport.scale 非零有限）pass。
- [ ] 既有 viewport 防御测试零回归。

### Phase 2 - A4 runtime scada-canvas 遵守 meta.disabled/visible 契约

Status: planned
Targets: `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`；相关测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / failing-first) 增用例：渲染 scada-canvas，host 设 `meta.disabled:true` → 触发 pan/zoom/click → 断言 EventBridge **不派发** `symbol:click/hover`、`helpers.dispatch` 不执行（或引擎层门控 leafer move/tap 早退）。当前会失败（runtime 忽略 disabled，全量派发）。再加 `meta.visible:false` → 断言画布不渲染（null/占位）。当前会失败（仍渲染）。
- [ ] (Fix) `scada-canvas.tsx`：读 `props.meta.disabled`，disabled 时不下挂 EventBridge 交互监听（或引擎层门控），wrapper 加 `aria-disabled`/`inert`（与编辑器画布同形）；读 `props.meta.visible`，`visible===false` 时不渲染画布（return null 或占位）。
- [ ] (Proof / failing-first) 两条用例转 pass；既有 scada-canvas 渲染/交互/lifecycle 测试零回归。

Exit Criteria:

- [ ] `scada-canvas.tsx` 在 live 代码中读 `props.meta.disabled` 门控交互 + `props.meta.visible` 门控渲染（与 `scada-editor-canvas.tsx:217` 同契约纪律）。
- [ ] failing-first 用例（disabled → 不派发；visible:false → 不渲染）pass。
- [ ] 既有 scada-canvas 渲染/交互/lifecycle 测试零回归。

## Draft Review Record

> 起草后、执行前的独立审查证据（见 guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_01ee9f069ffeOAguYbTx9K547e`（general）
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major → 共识达成（连续一轮零 Blocker/Major）。reviewer 独立核对 11 处引用 vs live repo 全 PASS（含 A3 自毁环路闭环证明：`readZoomLayerScale` 修复后返 fallback=`this.viewport.scale`，初始 scale=1 健康种子，命令路径全经 `clampScale` MIN_SCALE=0.1 → 归纳不变式成立，无残留 scale=0 路径；`handlePluginMove` 守卫为 defense-in-depth；A4 grep `props.meta.(disabled|visible)` 在 scada-canvas.tsx 零命中确认）。与 1809-3 P1-5 无双重认领（不同函数：readZoomLayerScale/handlePluginMove/syncViewportFromZoomLayer vs constructor/setSize/ResizeObserver/applyInitialViewport）。Minor（cosmetic，非阻塞）：Purpose 引 `applyViewportState（L378）` 为方法体行，签名在 L369。

## Closure Gates

- [ ] A3：readZoomLayerScale 拒 0 + handlePluginMove 补零守卫；任意 zoom/move 事件后 viewport.scale 非零有限（failing-first 用例 pass）。
- [ ] A4：runtime scada-canvas 遵守 meta.disabled（不派发交互）+ meta.visible（false 不渲染）（failing-first 用例 pass）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（A3/A4 均为 Fix）。
- [ ] 受影响 owner doc（`design-engine.md` viewport 零缩放守卫、`design-renderer.md` meta.disabled/visible 契约）已同步到 live baseline，或明确写明 No owner-doc update required。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

_无（A3/A4 均为 in-scope Fix，不延期）。_

## Non-Blocking Follow-ups

- `interactionOverlay` getter 无 destroyed 检查（销毁后惰性重建 overlay 到已销毁 app）—— P2，归 backlog（source: open-audit P2 簇）。
- `engineRef`/`runtimeRef` 同步 effect 无 cleanup（unmount 后仍指已销毁 engine）—— P2，归 backlog（source: open-audit P2 簇）。
- 错误去重 Set 无界增长（event-bridge + point-store）—— P2，归 backlog（source: open-audit P2 簇，上一轮 F9 仍 live）。
- `visual-state` revert 读 raw 实例不合并 defaults —— P2，归 backlog（source: open-audit P2 簇）。

## Closure

Status Note: _关闭时填写_

Closure Audit Evidence:

- Auditor / Agent: _独立子 agent fresh session_
- Evidence: _task id / daily log link / findings 摘要_

Follow-up:

- _仅 non-blocking follow-up_
