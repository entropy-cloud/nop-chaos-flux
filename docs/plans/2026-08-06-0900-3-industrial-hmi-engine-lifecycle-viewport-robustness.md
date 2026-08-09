# 03 Industrial HMI Engine Lifecycle & Viewport Robustness（视口数学兜底 + 生命周期清理 + 动画/binding 优先级裁定）

> Plan Status: completed
> Mission: industrial-hmi
> Work Item: 2026-08-05-2129 post-remediation audit P2（engine/lifecycle/视口 子集）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-2129-multi-audit-industrial-hmi.md` `[P2-7]`（dim 21）/ `[P2-8]`（dim 21）/ `[P2-10]`（dim 07）/ `[P2-11]`（dim 22）+ `docs/audits/2026-08-05-2129-open-audit-industrial-hmi.md` `[P2-1]`（dim 22），登记于 `docs/components/roadmap-industrial-hmi.md` Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节
> Related: `docs/plans/2026-08-06-0746-3-industrial-hmi-diagnostic-channel-residual.md`（已确认 multi P2-4 = evaluateFlux cause-chain **已由 plan 2026-08-05-0653-4 C3 + 2026-08-05-2129-3 Phase 3 收口**——本 plan 不重复 P2-4，仅回写 roadmap 缺失的 ✅ marker）、`docs/plans/2026-08-05-1253-1-*.md`（P2-5 fill 分支 clampScale 已修，本 plan P2-7 是同 fill 分支的 1e-6 floor 兜底）、`docs/plans/2026-08-06-0900-1`/`0900-2`（validator / symbol 层，与本 plan 不重叠）

## Purpose

把 2026-08-05-2129 审计登记的 **5 条 engine/生命周期/视口/管线语义** P2 收口 + 回写 1 条 doc-hygiene marker。六条共享同一结果面：**引擎与 renderer hook 层的视口数学兜底正确性、config reload 生命周期清理对称性、flushFrame 管线 {binding,state,animation} 同属性优先级语义的确定性与文档化**——fill 分支零尺寸方向反转、wheel-zoom 除零致矩阵不可恢复、`engine.reset` 不清 hover 覆盖物、`useScadaHandles` 冗余重注册、动画增量与 binding 同属性非确定性闪烁且 precedence 未文档化。

**P2-4 归属澄清（重要）**：2129 multi-audit `[P2-4]`（evaluateFlux cause-chain 丢失原始 Error）的 roadmap backlog 条目（roadmap:564）**未带 ✅ marker**，但 live 证据证实其**已收口**——`dirty-collector.ts:382-406` `syncExpressionPoint` 把 `outcome.error`（原始 Error）透传给 `reportError`，`reportError:656-659` 经 4 参签名 `onError?.(code, message, error)` 转发（plan 2026-08-05-0653-4 C3 接通签名 + 2026-08-05-2129-3 Phase 3 接通 discriminated outcome + 错误码对称）。本 plan 不把 P2-4 当 live defect 修，仅回写 roadmap ✅ marker（doc-hygiene，Closure Gate 一项）。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-06），下列事实均经源码实测确认（行号对齐 HEAD）。

- **multi P2-7 已确认 live（`renderer/hooks/use-scada-config-sync.ts:113-127` fill 分支）**：`:121` `const scale = clampScale(Math.max(size.width / bounds.width, size.height / bounds.height));`——**无 `1e-6` width/height floor**。`bounds.width === 0` 时 `size.width/0 = Infinity` → `clampScale(Infinity)` 与 `fit`/contain 分支（`engine/viewport.ts:65-67` 有 floor → MAX_SCALE zoom IN）方向相反（fill 零尺寸应同样收敛到 MAX_SCALE，与 contain 一致）。clamp-before-center（plan 2026-08-05-1253-1 Phase 1）已修未钳 scale 问题，但 floor 缺口仍在。
- **multi P2-8 已确认 live（`engine/scada-engine.ts:425-445` `handlePluginZoom`）**：`:440` `this.app.tree.zoomLayer.scaleOfWorld(readZoomAnchor(event), clamped / rawScale);`——**无 `rawScale === 0` / 非有限早退守卫**。`rawScale === 0` 时 `clamped / rawScale = Infinity`（clamped = clampScale(0)）传 `scaleOfWorld` → zoomLayer 矩阵 corrupt 不可恢复（后续 zoom/move 都基于 corrupt 矩阵）。
- **multi P2-10 已确认 live（`engine/scada-engine.ts:191-199` `reset` + `renderer/hooks/use-scada-events.ts:77`）**：`reset(config)` 仅 `background.color` 接线 + `this.adapter.build(config)`，**不清 `this.interaction`**（InteractionOverlay）→ importConfig/version-change 全量重建后旧 hover 高亮残留；`use-scada-events.ts:77` `lastHoverSymbolRef = useRef(undefined)` 无 config-change effect 重置 → 重建后 hover 状态机基线过期。
- **multi P2-11 已确认 live（`renderer/hooks/use-scada-handles.ts:45-156`）**：effect 注册 handle 的 `invoke`（`:55-99+`）经 `latest.current.runtime`（`:62`）读最新 runtime（ref），但 effect deps 含 `runtime` → 每次 config reload（`setRuntime`）冗余反注/重注册全部 handle（无正确性影响，纯冗余；与 plan 2026-08-04-2243-1 Phase 3 L6 `reloadConfig` 包 useCallback 稳定身份同类卫生）。
- **open P2-1 已确认 live（`renderer/hooks/use-scada-engine.ts:62-65,85` animator wiring + `binding/dirty-collector.ts:267+` flushFrame）**：animator 经 `collect:(entry)=>collector.collect(entry)`（`use-scada-engine.ts:71` + `dirty-collector.ts:55-62`）把增量**写入同一个 pending Map**（last-write-wins per `(symbolId, property)`），`flushFrame`（dirty-collector.ts:267 起，`:299 collectBindings` → `:300 collector.flush`）先收集 binding 后 flush → **脏帧 binding 条目覆盖同属性的 animator 条目**（同属性时 binding 胜出）。该 precedence 实际成立且**确定**（last-write-wins Map + 固定 collect 顺序，非 RNG 非确定性），但**未文档化、未测试**；审计的「非确定性闪烁」指 inter-frame 视觉跳变（animation 中间增量在合帧时被 binding 覆盖），而非随机性；animation 在无 binding 的属性上仍永久推进（无短路径，CPU 空耗属性能优化项，见 Non-Goals）。
- **multi P2-4 归属（重要，非本 plan live defect）**：`dirty-collector.ts:382-406` `syncExpressionPoint` 已透传 `outcome.error` 给 `reportError(pointId, code, message, outcome.error)`；`:656-659` `reportError(key, code, message, error?)` 经 `this.options.onError?.(code, message, error)` 转发原始 Error。即 evaluateFlux cause-chain **已端到端保留**（0653-4 C3 + 2129-3 Phase 3）。roadmap:564 未带 ✅ 是 doc-hygiene 缺口（0746-3 plan line 25 已记录该缺口，本 plan 回写）。
- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（2129-3 + 0746-1/2/3 收口后基线 ~696 tests / 54 files）。

## Goals

- **P2-7（fill 零尺寸方向）**：fill 分支补 `Math.max(1e-6, bounds.width/height)` floor，零尺寸内容收敛到 MAX_SCALE（与 contain 分支方向一致），断言 `bounds={0,0}` 时 fill scale === MAX_SCALE（非 MIN_SCALE）。
- **P2-8（wheel-zoom 除零）**：`handlePluginZoom` 增 `rawScale === 0 || !Number.isFinite(rawScale)` 早退守卫（syncViewportFromZoomLayer 后 return），`scaleOfWorld` 不收 Infinity，断言 rawScale=0 时 zoomLayer 矩阵不 corrupt。
- **P2-10（reset 清覆盖物）**：`engine.reset` 末尾 `this.interaction?.clear()` + `use-scada-events` config-change effect 重置 `lastHoverSymbolRef`，重建后无残留 hover 高亮，断言 reset 后 interactionOverlay 清空 + lastHoverSymbolRef=undefined。
- **P2-11（handles deps 卫生）**：`use-scada-handles` effect deps 移除 `runtime`（invoke 经 ref 读），config reload 不冗余重注册 handle，断言 reload 后 handle 注册计数不递增。
- **P2-1（动画/binding 优先级 Decision + 文档化）**：裁定并文档化 flushFrame 的 {binding,state,animation} 同属性优先级（binding/state 合帧 > animation 增量；animation 仅在无 binding 的属性上生效），design-data-binding.md 记录该契约 + 加 focused 测试锁定 precedence，断言同属性时脏帧 binding 覆盖 animation 增量、无 binding 属性 animation 正常增量。
- **P2-4 doc-hygiene**：roadmap Follow-up Backlog「2026-08-05-2129」子节 P2-4 条目回写 ✅ marker（标注已由 plan 2026-08-05-0653-4 C3 + 2026-08-05-2129-3 Phase 3 收口，live 证据 dirty-collector.ts:382-406/656-659）。
- **owner doc 同步**：`design-engine.md`（§4.4 视口 fill floor + wheel-zoom 除零守卫）、`design-renderer.md`（reset/destroy 行为）、`design-data-binding.md`（动画/binding 优先级契约）。

## Non-Goals

- 不重做 P2-4（evaluateFlux cause-chain——已收口，见 Current Baseline；本 plan 仅回写 roadmap marker）。
- 不改 `clampScale` 的 MIN/MAX_SCALE 阈值（仅补 fill 分支 floor + zoom 除零守卫）。
- 不引入 animation "decorative override" 语义改写（P2-1 Decision 维持现状 precedence = binding/state > animation，仅文档化 + 测试锁定 + 加无 binding 属性的短路径考量；若裁定需新增 warn 由 Decision 在 Phase 内决定，倾向不新增 warn 以免 noisy）。
- 不处理 validator / symbol 层（归 0900-1 / 0900-2 plan）。
- 不改 `use-scada-events` hover 去重主体（plan 2026-08-04-1558-2 Phase 2 已修；本 plan 仅 config-change 重置 lastHoverSymbolRef）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts`（P2-7：fill 分支 1e-6 floor）。
- `packages/flux-renderers-industrial/src/engine/scada-engine.ts`（P2-8：`handlePluginZoom` 除零守卫；P2-10：`reset` 清 interaction）。
- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-events.ts`（P2-10：config-change effect 重置 `lastHoverSymbolRef`）。
- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-handles.ts`（P2-11：effect deps 移除 `runtime`）。
- `packages/flux-renderers-industrial/src/binding/dirty-collector.ts` + `animator.ts`（P2-1：precedence 文档化 + focused 测试；若 Decision 裁定加无 binding 属性短路径则在此）。
- `docs/components/roadmap-industrial-hmi.md`（P2-4 ✅ marker 回写，doc-hygiene 1 行）。
- 回归 proof：5 项各带 failing-first / 行为锁定单测。
- owner doc：`design-engine.md`、`design-renderer.md`、`design-data-binding.md`。

### Out Of Scope

- `serialization/` validator/equality（归 0900-1 plan）。
- `symbols/**` 几何/属性（归 0900-2 plan）。
- `evaluateFlux` / `reportError` 主体（P2-4 已收口）。
- `clampScale` 阈值、`InteractionOverlay` 主体绘制逻辑。

## Failure Paths

| 可测场景编号            | 触发                                          | 行为                                                             | 可重试 | 用户可见表现                            |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------- | ------ | --------------------------------------- |
| fill-zero-size-zoom-out | `applyInitialViewport` fill + bounds={0,0}    | scale === MAX_SCALE（与 contain 方向一致，非 MIN_SCALE）         | 否     | 零尺寸内容不反向 zoom out               |
| wheel-zoom-divide-zero  | `handlePluginZoom` rawScale=0（corrupt 矩阵） | 早退 syncViewportFromZoomLayer + return，zoomLayer 不收 Infinity | 否     | wheel 不致矩阵不可恢复                  |
| reset-hover-residual    | hover symbol → `engine.reset`（importConfig） | interactionOverlay 清空 + lastHoverSymbolRef=undefined           | 否     | 重建后无残留 hover 高亮                 |
| handles-rereregister    | config reload（setRuntime）                   | handle 注册计数不递增                                            | 否     | reload 无冗余反注/重注册                |
| anim-binding-flicker    | binding 与 animation 同属性（rotation）       | 脏帧 binding 覆盖 animation 增量（precedence 确定且测试锁定）    | 否     | 同属性无非确定性闪烁；precedence 文档化 |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**——视口数学兜底（零尺寸/除零）是渲染正确性硬门，生命周期清理对称性是 config reload 契约，动画/binding precedence 是组态可观测性公共契约。P2-7/P2-8/P2-10/P2-11 failing-first（退化场景红 → 修复绿）；P2-1 为行为锁定测试（现状 precedence 文档化 + 锁定，先写测试刻画现状再文档化）。P2-4 doc-hygiene 不需测试（纯 roadmap 1 行回写）。

## Execution Plan

### Phase 1 - 视口数学兜底（P2-7 fill floor + P2-8 wheel-zoom 除零）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts` + `engine/scada-engine.ts`

- Item Types: `Proof | Fix`

- [x] **Proof（failing-first，先于 Fix）**：(a) `use-scada-config-sync` 单测：构造 `applyInitialViewport` fill policy + `bounds={x:0,y:0,width:0,height:0}`（或 computeSymbolBounds 返零尺寸），断言 `engine.setViewport` 收到 `scale === MAX_SCALE`（修复前红：scale === MIN_SCALE 或 Infinity）；(b) `scada-engine` 单测：构造 `handlePluginZoom` 入参使 `rawScale === 0`（zoomLayer.scaleX=0），断言 `zoomLayer.scaleOfWorld` **未**被调用（或调用时 ratio 有限），zoomLayer 矩阵不 corrupt（修复前红：scaleOfWorld 收 Infinity）。修复前红。
- [x] **Fix-a（fill floor，P2-7）**：`use-scada-config-sync.ts:121` 改 `clampScale(Math.max(size.width / Math.max(1e-6, bounds.width), size.height / Math.max(1e-6, bounds.height)))`，零尺寸收敛到 Infinity→MAX_SCALE（与 contain `viewport.ts:65-67` floor 方向一致）。
- [x] **Fix-b（wheel-zoom 除零守卫，P2-8）**：`scada-engine.ts handlePluginZoom` 在 `readZoomLayerScale` 后增早退守卫：`if (rawScale === 0 || !Number.isFinite(rawScale)) { this.syncViewportFromZoomLayer(); this.interaction?.refresh(); return; }`，`scaleOfWorld` 不收 Infinity。落地后上述 failing-first Proof 转绿。

Exit Criteria:

> 本 Phase 交付 = fill 零尺寸方向正确 + wheel-zoom 除零不 corrupt 矩阵。

- [x] fill 零尺寸 bounds → scale === MAX_SCALE（proof 断言 setViewport scale）。
- [x] rawScale=0 时 zoomLayer 矩阵不 corrupt（proof 断言 scaleOfWorld 未收 Infinity）。
- [x] 既有视口/zoom 单测不回归（既有 use-scada-config-sync / scada-engine 单测全绿）。

### Phase 2 - 生命周期清理对称（P2-10 reset 清覆盖物 + P2-11 handles deps）

Status: completed
Targets: `packages/flux-renderers-industrial/src/engine/scada-engine.ts` + `renderer/hooks/use-scada-events.ts` + `renderer/hooks/use-scada-handles.ts`

- Item Types: `Proof | Fix`

- [x] **Proof（failing-first，先于 Fix）**：(a) `scada-engine` / lifecycle 单测：hover 一 symbol 产生 interactionOverlay 高亮，调 `engine.reset(newConfig)`，断言 interactionOverlay 清空（无高亮）+ （经 hook）`lastHoverSymbolRef.current === undefined`（修复前红：高亮残留）；(b) `use-scada-handles` 单测：模拟 config reload（setRuntime 触发），断言 componentRegistry register/unregister 计数不随 reload 递增（修复前红：每 reload 重注册）。修复前红。
- [x] **Fix-a（reset 清 interaction，P2-10）**：`scada-engine.ts:191-199` `reset` 末尾增 `this.interaction?.clear();`（`InteractionOverlay.clear(symbolId?)` 已存在于 `engine/interaction-overlay.ts:159`，无参调用清空全部覆盖物）。
- [x] **Fix-b（events hook 重置 lastHoverSymbolRef，P2-10）**：`use-scada-events.ts` 增 config-change effect（deps `[args.config]`）重置 `lastHoverSymbolRef.current = undefined`（与 engine.reset 同口径，覆盖 hook 侧 stale 基线）。
- [x] **Fix-c（handles deps 卫生，P2-11）**：`use-scada-handles.ts` handle 注册 effect deps 移除 `runtime`（invoke 已经 `latest.current.runtime` ref 读最新，无需 closure 捕获），保留 `componentRegistry`/`id` 等 identity 稳定 deps。落地后上述 failing-first Proof 转绿。

Exit Criteria:

- [x] `engine.reset` 后 interactionOverlay 清空 + lastHoverSymbolRef 重置（proof 断言无残留高亮）。
- [x] config reload 后 handle 注册计数不递增（proof 断言计数稳定）。
- [x] 既有 lifecycle / handles / events 单测不回归。

### Phase 3 - 动画/binding 优先级 Decision + 文档化 + 测试锁定（P2-1）

Status: completed
Targets: `packages/flux-renderers-industrial/src/binding/dirty-collector.ts`（flushFrame precedence 注释）+ `docs/components/industrial-hmi/design-data-binding.md`

- Item Types: `Decision | Proof`

- [x] **Decision（precedence 裁定）**：裁定并记录 flushFrame 的同属性 precedence：**{binding（collectBindings）, state（collectStates）} 合帧 applyAttrs > animation 增量**（脏帧 binding/state 覆盖 animation 当帧增量；animation 在**无 binding 的属性**上正常生效）。维持现状语义（不改 flushFrame 顺序），仅文档化 + 测试锁定，消除「未文档化未测试」的不确定性。**不新增** validate/registration warn（避免 noisy；precedence 是确定性的，author 按契约可预期）。Decision 写入 `design-data-binding.md`（§4.3 动画/binding 优先级契约）。
- [x] **Proof（行为锁定，刻画现状）**：`binding/refresh-pipeline-animation-lifecycle.test.ts`（或同族测试文件）新增三组锁定用例：(a) 同属性（rotation）—— symbol 同时声明 rotation binding 与 rotate animation，flushFrame 后断言节点 rotation === binding 求值（binding 覆盖 animation 当帧增量）；(b) 无 binding 属性（如 dashOffset 仅 animation）—— animation 增量正常推进，binding 不干扰；(c) **多帧稳定性**——连续多帧 flushFrame（binding 值不变 + animation 持续推进），断言同属性每帧终值始终 === binding 求值（precedence 跨帧稳定、无 inter-frame 跳变，刻画审计关注的「闪烁」实为确定性的 binding 覆盖）。三组均刻画现状（绿），作为 precedence 契约的回归守护。
- [x] **Doc（owner doc 同步）**：`design-data-binding.md` 新增「动画/binding 同属性优先级」段：binding/state 合帧 > animation 增量；animation 仅在无 binding 属性生效；flushFrame collectBindings/collectStates → collector.flush 顺序是 precedence 的事实源。`dirty-collector.ts flushFrame`（:267+）补一行注释指向该 doc 段。

Exit Criteria:

- [x] flushFrame {binding,state}>animation precedence 经三组测试锁定（同属性 binding 覆盖 + 无 binding 属性 animation 正常 + 多帧跨帧稳定性）。
- [x] `design-data-binding.md` 记录 precedence 契约 + `dirty-collector.ts flushFrame` 注释指向。
- [x] 既有 animation-lifecycle / refresh-pipeline 单测不回归。

### Phase 4 - roadmap P2-4 ✅ marker 回写（doc-hygiene）

Status: completed
Targets: `docs/components/roadmap-industrial-hmi.md`（Follow-up Backlog「2026-08-05-2129」子节 multi P2-4 行）

- Item Types: `Follow-up`

- [x] **回写 marker**：roadmap Follow-up Backlog「2026-08-05-2129 post-remediation audit P2」子节 multi-audit `[P2-4]` 条目（roadmap:568）末尾追加「**已由 plan `2026-08-05-0653-4` C3（onError 签名 + reportDiagnostic cause 包装）+ plan `2026-08-05-2129-3` Phase 3（FluxEvalOutcome discriminated result + 错误码对称）收口（2026-08-06，✅）**」，与同节兄弟条目格式对齐。live 证据：`dirty-collector.ts:382-406` syncExpressionPoint 透传 outcome.error + `:656-659` reportError 4 参转发。

Exit Criteria:

- [x] roadmap:568 P2-4 条目带 ✅ marker + 收口 plan 引用 + 一句话落地摘要，格式与同节兄弟一致。

## Draft Review Record

> 起草后、执行前的独立审查证据（plan guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent fresh-session sub-agents（R1 `ses_02b699c53ffeXoG3D4KsuWgTls`、R2 复核 `ses_02b64a676ffeP6lD3A62YJ5ltQ`）
- Verdict: `pass-with-minors`（R1 零 Blocker / 零 Major；R2 复核 minor-edits 未引入新 Blocker/Major）
- Rounds: 1（R1 `pass-with-minors` 即达共识门槛「零 Blocker 且零 Major」；R2 复核确认）
- Findings addressed: **关键裁定经 R1 live 核实确认**——multi P2-4（evaluateFlux cause-chain）**已收口**（`dirty-collector.ts:384/388/399-404` syncExpressionPoint 透传 `outcome.error` + `:656-659` reportError 4 参签名转发 + `use-scada-engine.ts:57` onPipelineError 接 `(code, message, error?)`，原始 Error 端到端保留），本 plan 不当 live defect 修、仅回写 roadmap ✅ marker 的 scoping **成立**（非 Anti-Slacking 违规）。R1 minor（全部采纳落地）——① P2-10 Fix-a 「若无 clear 则补」对冲移除（`InteractionOverlay.clear` 已存于 `interaction-overlay.ts:159`）；② P2-1 机制措辞精化为「animator 经 collect 写入同一 pending Map、last-write-wins、collectBindings 先于 flush → binding 覆盖同属性 animator 条目」（消除「animator 直写节点 / binding 覆盖」的不精确心智）；③ Phase 3 Proof 增 (c) 多帧稳定性锁定（跨帧每帧终值始终 === binding 求值，刻画审计关注的 inter-frame「闪烁」实为确定性的 binding 覆盖）+ Exit Criteria 三组对齐。引用准确性：R1 全部引用簇（use-scada-config-sync.ts:113-127 无 1e-6 floor vs viewport.ts:65-67 有 floor；scada-engine.ts:425-445 无 rawScale=0 守卫 + :191-199 reset 无 interaction.clear；use-scada-events.ts:77 无 config-change 重置；use-scada-handles.ts deps 含 runtime 但 invoke 经 ref :62；P2-1 flushFrame collectBindings→flush last-write-wins）均经 live 核对零漂移；roadmap P2-7/8/10/11 + open P2-1 均无 ✅，P2-4 无 ✅ 但已修（doc-hygiene 缺口）。

## Closure Gates

> 全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（Minimum Rule 18）。

- [x] P2-7：fill 分支零尺寸 bounds → scale === MAX_SCALE（与 contain 方向一致）。
- [x] P2-8：`handlePluginZoom` rawScale=0/非有限早退，zoomLayer 矩阵不 corrupt。
- [x] P2-10：`engine.reset` 清 interactionOverlay + `use-scada-events` config-change 重置 lastHoverSymbolRef。
- [x] P2-11：`use-scada-handles` effect deps 移除 runtime，reload 不冗余重注册。
- [x] P2-1：flushFrame {binding,state}>animation precedence 文档化 + 两组行为锁定测试。
- [x] P2-4 doc-hygiene：roadmap:568 ✅ marker 回写（P2-4 已由 0653-4 C3 + 2129-3 Phase 3 收口，非本 plan live defect）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项（P2-4 为已收口的 doc-hygiene Non-Goal，明确非 live defect）。
- [x] owner doc 同步：`design-engine.md`（§4.4 fill floor + wheel-zoom 守卫）、`design-renderer.md`（reset 清覆盖物）、`design-data-binding.md`（动画/binding precedence）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Non-Blocking Follow-ups

- 其余 2026-08-05-2129 P2（归 sibling plan `2026-08-06-0900-1` validator / `2026-08-06-0900-2` symbol 或后续 mission 节奏）。
- P2-1 Decision 维持现状 precedence；未来若需引入 animation "decorative override only when no binding" 语义改写（性能：无 binding 属性短路径），重开 Decision 经人工确认（Rule 3）。

## Closure

Status Note: 四 Phase 全部落地（每 Phase failing-first Proof 红→绿，Phase 3 行为锁定刻画现状绿），5 条 in-scope P2（P2-7/8/10/11 + open P2-1）+ 1 条 doc-hygiene marker 回写（P2-4）收口。owner doc 三处同步（design-engine.md §4.4 / design-renderer.md §8.3 / design-data-binding.md §4.3 + dirty-collector.ts 注释）。workspace 全量验证全绿（typecheck/build/lint 32/32 + test 59/59；industrial 746 tests / 55 files，较 736 baseline +10 tests）。2129 audit P2 至此全部收口或归 sibling plan。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session sub-agent `ses_02b0a89e1ffe3g4PH72YEnDDLd`（general subagent，非执行 session）
- Verdict: `pass`（零 Blocker / 零 Major / 零 Minor）
- Evidence: 逐条 live 核对四 Phase fix 落地 + 红→绿对应（`use-scada-config-sync.ts:126` fill floor / `scada-engine.ts:442-446` 除零守卫 + `:201` reset clear / `use-scada-events.ts:82-84` config-change effect / `use-scada-handles.ts:39,159` deps 移除 runtime / `dirty-collector.ts:270-273` precedence 注释 / `design-data-binding.md:130` precedence 契约 / roadmap:568+571+572+574+575+583 ✅ markers）；断言均验结果值（scale===MAX_SCALE、activeCount===0、registerCount===1、rotation===45）；零 build artifact；P2-4 doc-hygiene Non-Goal 非 live defect 无静默降级；re-run 5 受影响测试文件 55 tests 全绿 + industrial typecheck/lint 0 error。daily log `docs/logs/2026/08-06.md`（2129 0900-3 收口条目）。

Follow-up:

- no remaining plan-owned work（2129 P2 全部收口或归 sibling plan）。
- P2-1 animation "decorative override" 语义改写 + 无 binding 属性短路径性能优化为 Non-Goal，未来需重开 Decision 经人工确认（Rule 3）。
