# 2 Industrial SCADA P2 Polish — Runtime Lifecycle & Symbols Author Safety

> Plan Status: active
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` Follow-up Backlog（来自 `docs/audits/2026-08-08-1712-open-audit-*.md` + `docs/audits/2026-08-08-1712-multi-audit-*.md` 的 P2 findings）
> Related: `docs/plans/2026-08-09-0121-1-industrial-scada-e2e-residual-healing.md`（plan {1}，独立于本 plan）；`docs/plans/2026-08-08-1809-*` / `2026-08-08-1910-*`（P0/P1 已收口的前序波次）
> Mission: industrial-hmi-component-audit
> Work Item: p2-polish-runtime-symbols（roadmap Follow-up Backlog 的 runtime + symbols 层 P2 收口轮）
> Execution Order: {2} — 与 plan {1}（e2e healing）独立可并行。本 plan 是 roadmap Follow-up Backlog 显式预期的「后续 polish 轮」，收口 engine/binding/renderer-hooks/symbols 层的 14 个 P2 findings。剩余 editor/serialization/export/docs 层 P2（~16 个）留待后续 mission-driver 轮。

## Purpose

收口 roadmap Follow-up Backlog 中 **runtime 层（engine + binding + renderer hooks）+ symbols 层** 的 14 个 P2 findings。这些 findings 来自 2026-08-08-1712 两份 deep-audit（open-ended adversarial + multi-dimensional），全部裁定为 **P2（非阻塞 polish）**——非 confirmed live defect，但涉及生命周期安全、资源管理、React 19 纪律对齐、符号作者陷阱四类质量改进。

roadmap Follow-up Backlog 头部显式声明：「此处只登记 P2（非阻塞 polish）……不驱动独立 plan，由后续 polish 轮或 CR-类 work item 收口。」本 plan = 该 polish 轮（runtime + symbols 切片）。

## Current Baseline

- **全量 P0/P1 已收口**：HCA0–HCA-CG 全 `done`；1712 audit 的 P0（A1）/ P1（A2–A12, P1-1～P1-5）经 1809-1/2/3 + 1910-1/2/3 两波全部 completed。
- **P2 findings 状态**（1712 audit 去重表核对 + roadmap Follow-up Backlog）：
  - 本轮-1（renderer hooks 手写 memo）：**仍 live**（1809/1910 未触及 renderer hooks memo 清理）。
  - 本轮-2（interactionOverlay getter 无 destroyed 检查）：**仍 live**。
  - 本轮-3（engineRef/runtimeRef effect 无 cleanup）：**仍 live**（使本轮-2 可达）。
  - 本轮-4/F9（错误去重 Set 无界增长）：**仍 live**（1712 audit 去重表确认）。
  - 本轮-5（visual-state revert 读 raw getConfigNode）：**仍 live**。
  - 本轮-6（round-rect 固定 cornerRadius:8）：**仍 live**。
  - 本轮-7（pipe-junction bidirectional 缺 startArrow）：**仍 live**。
  - 本轮-8（composite 空 children 崩溃）：**仍 live**。
  - 本轮-9（toShapeAttrs 写 width/height 到 Group）：**仍 live**（A1 P0 修复已 landed，但 Group attr 泄漏未随修）。
  - 本轮-10（config-sync effect 双跑）：**仍 live**。
  - 本轮-13（points-bridge cache cleanup deps 缺 expressionCompiler）：**仍 live**。
  - F7（Animator.pause 不停 rAF）：**仍 live**（1712 去重表确认）。
  - F8（recomputeExpressionPoints O(n²)）：**仍 live**。
  - F10（binding.scale 仅 isPlainObject）：**仍 live**（F10 与 A10 同根因 finite 校验，A10 已修 assertShape finite，但 binding.scale 的 k/b 校验未对齐 declaration scale）。
- **行号说明**：下方行号为 1712 audit 时快照；1809/1910 波次修复可能移位，执行时需 grep 重新定位。
- **workspace 基线**（project-context.md C0 + HCA-CG closure）：typecheck 32/32 · build 32/32 · lint 32/32 · test 59/59（industrial ~100 files / ~1394+ tests）。

## Goals

- 14 个 P2 findings 逐条收口：fix landed / 或诚实裁定为 watch-only residual / out-of-scope（每条带证据）。
- 本轮-2 + 本轮-3 闭合「引擎销毁后 overlay 惰性重建 + ref 悬挂」生命周期安全对。
- 本轮-1 对齐 AGENTS.md「React Compiler 基线下默认不加 memo」纪律（renderer hooks 移除冗余 useCallback/useMemo）。
- F7/F8/F9 收口 binding 层资源管理（rAF 停止 / O(n²) 反向索引 / Set 无界增长）。
- 本轮-8/本轮-9 闭合 symbols 作者陷阱（空 children 崩溃守卫 + Group attr 泄漏）。
- F10 对齐 binding.scale 与 declaration scale 的 finite 校验（复用 1809-1 产出的 `isFiniteNumber` helper）。

## Non-Goals

- 不收口 editor/serialization/export/docs 层 P2（本轮-11/12, F5/F6/F11, P2-1～P2-11）——留待后续 mission-driver 轮的 editor+contract polish plan。（例外：F10 `binding.scale` 校验虽落 `serialization/validators/binding.ts`，但与 binding 契约同根因且复用 1809-1 的 `isFiniteNumber` helper，纳入本 plan Workstream A。）
- 不改 P1-5 视口 fit 数学（归 plan {1} e2e healing scope）。
- 不改 diffScadaConfig 递归（1809-3 Non-Blocking Follow-up）。
- 不重写 leafer-ui-mock（A1 真实渲染回归网归 1910-1 scope，已 landed）。
- 不改公共导出面签名（index.ts 导出面 parity 归 P2-1/2/3，后续 editor+contract plan）。

## Scope

### In Scope

**Workstream A — Engine 生命周期 + Renderer Hooks + Binding 资源安全**：

- `packages/flux-renderers-industrial/src/engine/scada-engine.ts`（本轮-2 interactionOverlay getter destroyed guard）。
- `packages/flux-renderers-industrial/src/engine/event-bridge.ts`（本轮-4/F9 错误去重 Set 无界增长）。
- `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`（本轮-1 memo 清理 + 本轮-3 engineRef/runtimeRef effect cleanup）。
- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-events.ts`（本轮-1 memo 清理）。
- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts`（本轮-1 memo 清理 + 本轮-13 cache cleanup deps 加 expressionCompiler）。
- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts`（本轮-10 effect 双跑 identity 抖动）。
- `packages/flux-renderers-industrial/src/binding/animator.ts`（F7 pause 不停 rAF）。
- `packages/flux-renderers-industrial/src/binding/refresh-pipeline.ts`（F8 recomputeExpressionPoints O(n²)）。
- `packages/flux-renderers-industrial/src/binding/point-store.ts`（本轮-4/F9 错误去重 Set 无界增长）。
- `packages/flux-renderers-industrial/src/serialization/validators/binding.ts`（F10 binding.scale k/b finite 校验，复用 `isFiniteNumber` helper）。

**Workstream B — Symbols 作者安全 + 几何 Polish**：

- `packages/flux-renderers-industrial/src/symbols/visual-state.ts`（本轮-5 revert 仲裁合并 defaults）。
- `packages/flux-renderers-industrial/src/symbols/base-shapes/round-rect.ts`（本轮-6 cornerRadius 可配置/按尺寸缩放）。
- `packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts`（本轮-7 bidirectional 补 startArrow）。
- `packages/flux-renderers-industrial/src/symbols/composite.ts`（本轮-8 空 children 守卫 + 本轮-9 Group attr 泄漏）。
- `packages/flux-renderers-industrial/src/symbols/base-shapes/common.ts`（本轮-9 toShapeAttrs Group attr 过滤，如选在此收口）。

### Out Of Scope

- `src/editor/**` 非视口域（editor P2 归后续 plan）。
- `src/serialization/parse.ts`（F5，归后续 plan）。
- `src/editor/editor-session.ts` + `editor/editor-working-helpers.ts`（F6 clone 统一，归后续 plan）。
- `index.ts` 导出面（P2-1/2/3，归后续 plan）。
- `docs/components/industrial-hmi-editor/`（P2-9/10/11 doc rot，归后续 plan）。

## Failure Paths

| 场景编号 | 触发                                                   | 行为                                                                                | 可重试                            | 用户可见表现                                              |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| FP-1     | 本轮-1 移除 memo 后 React Compiler 未稳定 hoist 等价物 | render 频率增加（无 correctness 影响，仅 perf）                                     | 否                                | 无用户可感知变化（Compiler 覆盖）；perf 包络 I14 复测确认 |
| FP-2     | 本轮-8 空 children 守卫改变现有 composite 创建行为     | 现有有 children 的 composite 不受影响；空 children 从崩溃改为 fallback/early-return | 否                                | 自定义复合作者收到结构化 error 而非 crash                 |
| FP-3     | F8 反向索引在 expression 点动态增删时未同步            | 索引陈旧导致漏触发或重复求值                                                        | 是（下一帧 dirty-collector 修正） | 数据绑定短暂延迟（毫秒级）                                |

## Test Strategy

本档选择：**建议有测**。

P2 findings 非核心回归路径，但涉及生命周期安全（本轮-2/3）、资源管理（F7/F9）、作者陷阱（本轮-8）。每条 Fix 配 focused unit 测（断言正确行为，非 not-throw）。本轮-1 memo 移除属纯 perf 对齐，不需新增测（现有测覆盖行为不变即可）。全量 `pnpm typecheck/build/lint/test` 在 Closure Gates 跑一次。

## Execution Plan

### Workstream A - Engine 生命周期 + Renderer Hooks + Binding 资源安全

Status: planned
Targets: `engine/scada-engine.ts`、`engine/event-bridge.ts`、`renderer/scada-canvas.tsx`、`renderer/hooks/use-scada-*.ts`、`binding/animator.ts`、`binding/refresh-pipeline.ts`、`binding/point-store.ts`、`serialization/validators/binding.ts`（F10）

- Item Types: `Fix | Proof`

- [ ] **本轮-2**：`scada-engine.ts` `interactionOverlay` getter 加 `if (this.destroyed) return` 早退（grep 定位 `get interactionOverlay`），防止销毁后惰性重建 overlay 到已销毁 app。
- [ ] **本轮-3**：`scada-canvas.tsx` engineRef/runtimeRef 同步 effect 加 cleanup（`return () => { engineRef.current = null; runtimeRef.current = null; }`），防止 unmount 后 ref 悬挂（闭合本轮-2 可达链）。
- [ ] **本轮-1**：逐 hook 审查 `useCallback`/`useMemo` 使用，移除 React Compiler 基线下冗余的 memo（scada-canvas.tsx 7 处、use-scada-events.ts 8 处、use-scada-points-bridge.ts 4 处——grep 逐处裁定保留/移除；仅移除 Compiler 已自动覆盖的纯优化 memo，保留有正确性语义的 ref-stable 回调）。
- [ ] **本轮-10**：`use-scada-config-sync.ts` config 变更 effect 消除 identity 抖动（reloadBindings→setRuntime→identity 变→effect 再跑空 diff）——裁定是收紧 setRuntime identity 还是改 effect deps。
- [ ] **本轮-13**：`use-scada-points-bridge.ts` compiledCache/lastReportedErrors 清理 effect deps 加 `expressionCompiler`（旧编译产物喂新 evaluator）。
- [ ] **F7**：`animator.ts` tick 跳过 paused 项 collect，或全 paused 时 `stopClock`（pause 后不停 rAF 时钟致每帧重算并 flush 相同增量）。
- [ ] **F8**：`refresh-pipeline.ts` `recomputeExpressionPoints` 建反向索引 `Map<depPointId, Set<exprPointId>>`，改 O(扇出) 查找替代 `lastDeps` 线性扫描；加深链表达式点基准用例。
- [ ] **本轮-4/F9**：`event-bridge.ts` + `point-store.ts` 错误去重键加 call site/symbolId/pointId 维度（或改频次去重），Set 加 LRU 上限或生命周期清理（防止无界增长）。
- [ ] **F10**：`serialization/validators/binding.ts` `binding.scale` 校验从 `isPlainObject` 升级为与 declaration scale 同形 finite k/b 校验（复用 1809-1 产出的 `isFiniteNumber` helper，已确认存在于 `serialization/validators/helpers.ts:18`）。

Exit Criteria:

- [ ] 本轮-2/3：引擎销毁后 interactionOverlay getter 早退 + ref cleanup landed；focused 测断言 destroyed 后 get interactionOverlay 不重建。
- [ ] 本轮-1：renderer hooks 冗余 memo 移除 landed，现有 unit 测零回归（行为不变）。
- [ ] 本轮-10/13：focused 测断言 effect 单跑 / cache 在 expressionCompiler 换身份后清理。
- [ ] F7：focused 测断言全 paused 后 rAF clock 停止（或 tick 跳过 paused）。
- [ ] F8：focused 测断言深链表达式点（≥3 级依赖）触发只重算受影响子集（非全量 O(n²) 扫描）。
- [ ] 本轮-4/F9：focused 测断言错误去重 Set 有上限 + 同文案异因错误不被互吞。
- [ ] F10：focused 测断言 `binding.scale` 带 NaN/Infinity/缺 k/b 的 k→Error（与 declaration scale 同形）。

### Workstream B - Symbols 作者安全 + 几何 Polish

Status: planned
Targets: `symbols/visual-state.ts`、`symbols/base-shapes/round-rect.ts`、`symbols/pipe/pipe-junction.ts`、`symbols/composite.ts`、`symbols/base-shapes/common.ts`、`serialization/validators/binding.ts`

- Item Types: `Fix | Proof`

- [ ] **本轮-5**：`visual-state.ts` revert 仲裁从读 `getConfigNode`（raw 实例）改为合并 defaults（防止自定义符号 defaults 级 binding 被 revert 覆盖）。
- [ ] **本轮-6**：`round-rect.ts` cornerRadius 从固定 `8` 改为按尺寸缩放（`Math.min(width, height) * ratio`）或 per-instance 可配置；裁定方向后 landed。
- [ ] **本轮-7**：`pipe-junction.ts` bidirectional 连线补 `startArrow`（当前只给 `endArrow`，语义误导）。
- [ ] **本轮-8**：`composite.ts` `createCompositeGroup` 空 children 守卫（`body = children[0]?.node` 从 undefined 崩溃改为结构化 fallback或 early-return + onError）。
- [ ] **本轮-9**：`composite.ts`/`common.ts` `toShapeAttrs` 把 width/height/fill/stroke 不写到 `Group`（无渲染意义，改变 leafer bounds 语义）；裁定在 toShapeAttrs 源头过滤还是在 createCompositeGroup 调用点不透传。（执行时 re-grep 确认 A1 P0 的 `around:'center'` 修复未 incidental 触碰 toShapeAttrs。）

Exit Criteria:

- [ ] 本轮-5：focused 测断言自定义符号带 defaults 级 binding 经 revert 后 defaults 保留。
- [ ] 本轮-6：focused 测断言不同 width/height 下 cornerRadius 合理缩放（不固定 8）。
- [ ] 本轮-7：focused 测断言 bidirectional 连线两端都有 arrow（非仅 endArrow）。
- [ ] 本轮-8：focused 测断言空 children composite 不崩溃（fallback/early-return/onError）。
- [ ] 本轮-9：focused 测断言 Group 节点不含 width/height/fill/stroke attrs（grep `Group` 节点属性）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session `ses_01d984bf3ffe4YD3k4zKgJ4AJH`（general）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major → 共识达成（round 1）。Minor（已全部落地）：m-1 F10 Non-Goals 措辞张力——Non-Goals 增 F10 serialization 例外说明（与 binding 契约同根因 + 复用 1809-1 isFiniteNumber）；m-2 F10 workstream 归属——从 Workstream B 移至 Workstream A（binding 资源安全主题更匹配），Scope/Targets/checklist/Exit Criteria 同步移位；m-3 本轮-9 与 A1 P0 重叠——增注「执行时 re-grep 确认 A1 around:'center' 修复未 incidental 触碰 toShapeAttrs」。live 核对全通过：15 目标文件全存在；本轮-2（scada-engine.ts:166 interactionOverlay getter 无 destroyed guard）、F7（animator.ts:121 pause 不 stopClock + tick 不跳 paused）、本轮-8（composite.ts:95-112 无空 children 守卫）、本轮-9（common.ts:3-31 toShapeAttrs 透传 width/height/fill/stroke）全部 confirmed still live；isFiniteNumber helper 确认存在于 serialization/validators/helpers.ts:18；14 items 全属 P2 无 P0/P1 泄漏；over-split 评估——合并 14 findings 为 1 plan + 2 workstreams 符合 Rules 22/25/26。

## Closure Gates

- [ ] 14 个 P2 findings 逐条收口（fix landed / watch-only residual with Why Not Blocking / out-of-scope with 证据）。
- [ ] 不存在被静默降级到 deferred 的 confirmed live defect（P2 findings 本身非 confirmed live defect，但若有在修复中发现的新 live defect 不得降级）。
- [ ] 受影响 owner doc（`design-symbols.md`、`design-engine.md`、`design-renderer.md`）：若 P2 fix 改变了 documented behavior 则同步更新；否则 No owner-doc update required。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`。
- [ ] `pnpm build`。
- [ ] `pnpm lint`。
- [ ] `pnpm test`。

## Deferred But Adjudicated

> 执行中若发现某 P2 finding 的修复成本远超 polish 级别（如 F8 反向索引需重构 refresh-pipeline 数据结构），在此记录降级裁定。

_起草时无已知可延期项。_

## Non-Blocking Follow-ups

- editor/serialization/export/docs 层 P2（本轮-11/12, F5/F6/F11, P2-1～P2-11）：留待后续 mission-driver 轮的 editor+contract polish plan。
- 递归 diff 优化（1809-3 Non-Blocking Follow-up）。
- 本轮-12 align-distribute world 坐标统一（roadmap 标注 M3 docstring 接受，维持 watch-only residual unless editor polish plan 收口）。

## Closure

Status Note: _（完成时填写）_

Closure Audit Evidence:

- Auditor / Agent: _（独立子 agent fresh session）_
- Evidence: _（task id / daily log / focused 测结果摘要）_

Follow-up:

- _（完成时填写）_
