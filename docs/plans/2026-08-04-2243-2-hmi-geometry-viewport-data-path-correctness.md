# {2243-2} HMI — Geometry, Viewport & Data-Path Correctness

> Plan Status: active
> Mission: industrial-hmi
> Work Item: Follow-up Backlog §2026-08-04-2242 post-remediation audit (Display & positioning dim 21 + Wiring data-path guards)
> Last Reviewed: 2026-08-05
> Source: `docs/audits/2026-08-04-2242-multi-audit-industrial-hmi.md` (dim 21 Display & positioning: 4 P2 findings D1-D4) + `docs/audits/2026-08-04-2242-open-audit-industrial-hmi.md` (dim 22 Wiring: W4 `setPointValue` guard + W5 `diffScadaConfig` deep-equal)
> Related: `docs/plans/2026-08-04-1235-3-hmi-display-math-manifest-plan.md` (P1-6 viewport 公式 / P1-7 覆盖物 screen 坐标), `docs/plans/2026-08-04-2242-2-hmi-config-xy-bounds-contract-plan.md` (x/y 契约收敛，本 plan D1 在其上补 default-points 包围盒), `docs/plans/2026-08-04-2243-1-hmi-lifecycle-destruction-pipeline-hardening.md` (先固化销毁路径，本 plan 不触碰 dirty-collector), `docs/components/roadmap-industrial-hmi.md`

## Purpose

把 SCADA 运行时**显示几何 / 视口数学 / 数据路径守卫**上的 6 项确认 P2 finding 收口：默认多边形/零高线段的 fit 包围盒不再退化为 0 尺寸冲到 MAX_SCALE、`scada-text` 居中在 base 路径生效、wheel-zoom 钳制用光标锚而非屏幕原点、`viewport` prop 反应性与 `width/height` 对称（或显式文档化不对称）、`component:setPointValue` handle 对 host 输入做 `isScadaPrimitive` 校验、`diffScadaConfig` 深相等改 key-order-stable。这些共享同一结果面（数据→显示路径的运行时数学/守卫正确性），统一由本 plan 收口。

## Current Baseline

> 已对照 live repo 核对（`packages/flux-renderers-industrial/src/`，2026-08-05）。行号随实现可能漂移，以函数/符号名为准。

- **D1 `computeSymbolBounds` 仅认显式 `custom.points`**：`src/renderer/hooks/use-scada-config-sync.ts:20` `computeSymbolBounds` + `:58` `boundsFromCustomPoints` 仅在节点显式带 `custom.points` 时算包围盒；default-triangle polygon（`src/symbols/basic-shapes/polygon.ts` 默认 points）与零高 line（`src/symbols/basic-shapes/line.ts`）无 `custom.points` 时 fit/center 退化为 0 尺寸 → 冲到 `MAX_SCALE`(20×)，图元钉在画布外（`viewport.ts` 1e-6 兜底）。`{2242-2}` 已收敛 x/y 可选契约，本项补 default-points 几何源。
- **D2 `scada-text` 居中 base 路径失效**：`src/symbols/instrument/{gauge,level,thermometer}.ts` + `src/symbols/base-shapes/text.ts:27-37` 自动宽 Text 上 `textAlign:'center'` 无效（leafer 无 `layoutWidth` 时 `autoSizeAlign` 偏移不生效，已核实 leafer-ui@2.2.9 dist）。`{1558-3}` Phase 1 仅修了 instrument 路径（显式 width），base `text.ts` 仍依赖 `autoSizeAlign`。
- **D3 wheel-zoom clamp 锚点错位**：`src/engine/scada-engine.ts` wheel 钳制兜底（约 :425-441，`clampViewport` 路径）用 screen 原点 `{0,0}` 而非光标锚；超界 scale 时内容视觉偏移。注：`{1235-3}` P1-9 已修 `applyViewportState`/`handlePluginZoom` 的 `scaleOfWorld` 锚点空间（screen 锚点 `{0,0}` 是该路径正确语义），但 wheel clamp 兜底的「光标 screen 坐标」是不同锚点需求。
- **D4 `viewport` prop 反应性不对称**：`use-scada-config-sync.ts:165-217` mount 后 `viewport` prop 变更被静默忽略（diff 路径故意跳过），与 `width`/`height` 可反应不对称。`{1558-2}` Phase 4 已接 width/height effect，viewport 裁定为「仅 full/reset 路径应用」现状契约并同步 `design-renderer.md §8.3`。本项复核 §8.3 是否已显式标注此不对称；若未标注则补注记（Decision：维持现状契约 + 文档化，**不**新接 viewport 变更 effect，避免重置用户平移/缩放）。
- **W4 `component:setPointValue` 无校验**：`src/renderer/hooks/use-scada-handles.ts:97-106` `current.pointStore.setPointValue(pointId, value as ScadaPrimitive)` 用 `as` 强转，与 flux bridge（`use-scada-points-bridge.ts` 经 `isScadaPrimitive` 校验）不对称；host action 传非原始值静默 corrupt 点表。
- **W5 `diffScadaConfig` 深相等 key-order 敏感**：`src/serialization/diff.ts:50` `return JSON.stringify(a) === JSON.stringify(b)`，在增量热路径上；prev/next 来自异源（`exportConfig` vs host 表达式重算）key 序不同 → 假阳性 diff → 全 `reloadBindings` 重建。

## Goals

- D1：default 几何族（polygon/line/arrow 无 `custom.points`）fit/center 包围盒从符号定义默认 points 计算，不再退化为 0 尺寸冲到 MAX_SCALE。
- D2：base `scada-text` 居中在自动宽下生效（显式 width 或 measureText 契约）。
- D3：wheel-zoom 钳制用光标 screen 锚，超界 scale 无视觉偏移。
- D4：`viewport` prop 不对称契约在 `design-renderer.md §8.3` 显式标注（维持现状，不接 effect）。
- W4：`component:setPointValue` handle 复用 `isScadaPrimitive` 校验，非原始值返 `{ ok:false }`。
- W5：`diffScadaConfig` 深相等改 own-keys-sorted 递归比较，key 序不再影响 diff 结果。

## Non-Goals

- 不改销毁/合帧/lifecycle（L1-L6/W3 归 plan `{2243-1}`）。
- 不改 mock 建模（T1/T2 归 plan `{2243-3}`）；D2 的浏览器级像素验证列 watch-only residual。
- 不改公共导出面 / 文档 marker 漂移（A1/W2/Doc1-3 归 plan `{2243-3}`）。
- 不实现 W1 表达式订阅 `flux-deps-empty` 诊断（successor，见 plan `{2243-1}` Deferred）。
- 不重写 viewport 反应性策略（D4 仅文档化现状不对称，不新接 effect）。

## Scope

### In Scope

- `src/renderer/hooks/use-scada-config-sync.ts`（D1 default-points 包围盒 + D4 §8.3 注记核对）
- `src/symbols/base-shapes/{polygon,line,text}.ts`（D1 默认 points 暴露 / D2 base text 居中）
- `src/engine/scada-engine.ts`（D3 wheel clamp 光标锚）
- `src/renderer/hooks/use-scada-handles.ts`（W4 setPointValue 校验）
- `src/serialization/diff.ts`（W5 stable deep-equal）
- 受影响 focused 回归测试 + `design-renderer.md §8.3` / `design-engine.md §4.4` owner-doc 同步

### Out Of Scope

- lifecycle/销毁（plan `{2243-1}`）、mock/公共面/文档 marker（plan `{2243-3}`）、W1 表达式诊断（successor）
- 编辑器时代属性面板/连线（I16 后继）

## Failure Paths

| 场景                     | 触发                                              | 行为                                                      | 可重试 | 用户可见表现                      |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------------- | ------ | --------------------------------- |
| default polygon/line fit | 无 custom.points 的默认三角形/零高线段 fit/center | 从符号定义默认 points 算包围盒，scale 合理                | 否     | 图元不钉在画布外、不冲到 20×      |
| wheel 超界缩放           | wheel 滚到 scale 上/下界                          | 以光标 screen 锚钳制，内容不视觉偏移                      | 否     | 缩放锚跟随光标                    |
| host 传非原始点值        | `component:setPointValue` value 为对象/数组       | `isScadaPrimitive` 拒绝，返 `{ok:false}`，不 corrupt 点表 | 否     | handle 返回失败，点表不变         |
| 异源 config diff         | prev(exportConfig) vs next(host 重算) key 序不同  | stable deep-equal 判等，不假阳性触发全重建                | 否     | 仅真实语义变更触发 reloadBindings |

## Test Strategy

档位选择：**建议有测**。本组为运行时显示/数据路径正确性，每项 finding 有可构造的可观测几何/行为结果，需 focused 单测证明（D3/W4/W5 必测；D1 附 e2e 几何断言；D2 mock 级 attrs 断言 + 浏览器像素列 watch-only）。

## Execution Plan

### Phase 1 - Symbol geometry & fit bounds（D1 + D2）

Status: planned
Targets: `src/renderer/hooks/use-scada-config-sync.ts`, `src/symbols/base-shapes/{polygon,line,text}.ts`

- Item Types: `Fix`（D1/D2 几何缺陷）

- [ ] D1：`boundsFromCustomPoints` 在节点无显式 `custom.points` 时 consult `getScadaSymbolDefinition(node.type)` 取默认 points（polygon/line/arrow），算 min/max 包围盒；无 width/height 但有默认 points 时不退化为 0 尺寸。注：`polygon.ts` `DEFAULT_TRIANGLE` 当前为模块私有（仅 `create()` 内消费，:7/:36），`line.ts` points 由 width/height 运行时派生——Phase 内需先把默认 points 经 `ScadaSymbolDefinition` 暴露（或经 definition 的静态几何元数据），使 bounds 路径可读
- [ ] D2：base `text.ts` 居中路径改为显式 width（按内容测量设置 width）或 measureText 契约，使 `textAlign:'center'` 在自动宽下生效（与 instrument 路径对齐）
- [ ] Proof：(a) D1 focused 单测——default-triangle polygon / 零高 line fit 包围盒非零、scale < MAX_SCALE；(b) D1 e2e 几何断言（polygon fit 后视口 scale 合理）；(c) D2 attrs 级单测（mock 面）——居中 Text width 按内容测量设置

Exit Criteria:

- [ ] D1 default-points 包围盒 focused 单测 + e2e 几何断言入库，fit 不冲到 MAX_SCALE
- [ ] D2 base text 居中 attrs 级单测入库（浏览器级像素验证列 watch-only residual，记入 Deferred）
- [ ] 包级 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 全绿

### Phase 2 - Viewport wheel anchor & prop contract（D3 + D4）

Status: planned
Targets: `src/engine/scada-engine.ts`, `docs/components/industrial-hmi/design-renderer.md`

- Item Types: `Fix`（D3 锚点）；`Decision`（D4 维持现状 + 文档化）

- [ ] D3：wheel-zoom 钳制捕获 wheel 事件 screen 坐标作 clamp 锚（替代原点 `{0,0}` 兜底），超界 scale 无视觉偏移；与 P1-9 `scaleOfWorld` screen 锚语义区分（P1-9 是命令路径锚空间，D3 是 wheel 光标位置）。注：Phase 内先核实 leafer viewport 插件的 wheel/zoom 事件载荷是否携带光标 screen 坐标（audit 判定可行但未预验证）；若事件不携带，则在上层 wheel handler 显式捕获 `event` screen 坐标后传入 clamp 路径
- [ ] D4：Decision——维持「`viewport` prop 仅 full/reset 路径应用」现状契约（不新接 effect，避免重置用户平移/缩放）；核对并补全 `design-renderer.md §8.3` 显式标注此不对称（若 `{1558-2}` 已标注则仅复核）
- [ ] Proof：(a) D3 focused 单测——wheel 超界 scale 时光标锚钳制、内容不偏移（矩阵级断言）；(b) D4 文档核对——§8.3 显式标注 viewport 不对称

Exit Criteria:

- [ ] D3 wheel clamp 光标锚 focused 单测入库，超界无偏移
- [ ] D4 §8.3 显式标注 viewport prop 不对称契约（或复核已存在）
- [ ] 包级单测全绿

### Phase 3 - Data-path guards（W4 + W5）

Status: planned
Targets: `src/renderer/hooks/use-scada-handles.ts`, `src/serialization/diff.ts`

- Item Types: `Fix`（W4/W5 守卫缺陷）

- [ ] W4：`use-scada-handles.ts` `setPointValue` case 复用 `isScadaPrimitive` 校验 value，非原始值返 `{ ok:false }`（与 flux bridge 对称）
- [ ] W5：`diff.ts:50` 深相等由 `JSON.stringify` 改为 own-keys-sorted 递归比较（stable deep-equal），key 序不影响结果
- [ ] Proof：(a) W4 focused 单测——host 传对象/数组返 `{ok:false}`、点表不变；(b) W5 focused 单测——异源 key 序不同但语义相同的 config 判等（不假阳性触发 reloadBindings）、真实字段变更仍检出

Exit Criteria:

- [ ] W4 setPointValue 校验 focused 单测入库，非原始值被拒
- [ ] W5 stable deep-equal focused 单测入库，key-order-stable
- [ ] 包级单测全绿

## Draft Review Record

- Reviewer / Agent: `ses_0322120a5ffeX5UvaGx9aR7BzZ`（fresh session）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；5 项 Minor 全部落地——(1) 路径笔误 `basic-shapes` → `base-shapes`（Current Baseline + Phase 1 Targets，3 处）；(2) Header Source 归属修正（W4/W5 源自 open-audit dim 22，非 multi-audit dim 22）；(3) D1 补注：`DEFAULT_TRIANGLE`（polygon.ts:7）模块私有 + line points 运行时派生，Phase 内需经 `ScadaSymbolDefinition` 暴露默认 points；(4) D3 补注：先核实 leafer wheel/zoom 事件是否携带光标 screen 坐标，否则上层 handler 显式捕获；(5) 移除重复「本档选择」行。D4 经核对 `design-renderer.md §8.3` 已文档化 viewport 不对称 → 维持 Decision/verify 框架。非重复性核对（{2242-2}/{1558-3}/{1235-3} 均未覆盖本组）经独立确认。

## Closure Gates

- [ ] D1-D4 + W4 + W5 六项 in-scope finding 全部 landed
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect
- [ ] `design-renderer.md §8.3`（viewport 不对称）+ `design-engine.md §4.4`（wheel clamp 光标锚，若改了 owner 行为）同步 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### D2-browser-pixel — base `scada-text` 居中浏览器级像素验证

- Classification: `watch-only residual`
- Why Not Blocking Closure: mock 级 attrs 断言（width 按内容测量）已证明契约面成立；leafer `autoSizeAlign` 在真实浏览器的像素级居中受字体度量/渲染时机影响，属渲染观察项，不阻塞 data-path 契约 closure。
- Successor Required: no

## Non-Blocking Follow-ups

- W1 表达式订阅 `flux-deps-empty` 诊断（successor，见 plan `{2243-1}` Deferred）
- D3 wheel clamp 锚点固化后，可考虑 pinch 钳制锚点对齐复核（optimization candidate）

## Closure

Status Note: <<关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立 fresh-session 子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- W1 表达式订阅诊断 → successor
- <<或明确写 no remaining plan-owned work>>
