# 3 Display Geometry & Test Effectiveness

> Plan Status: active
> Mission: industrial-hmi
> Work Item: P2 backlog — display geometry & test effectiveness
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md` `## Follow-up Backlog`（Display & positioning / Test effectiveness & coverage / open-audit e2e 条目），源审计 `docs/audits/2026-08-03-1506-multi-audit-industrial-hmi.md`（dim 21/23/14）、`docs/audits/2026-08-03-1506-open-audit-industrial-hmi.md`
> Related: `docs/plans/2026-08-04-1558-1-hmi-public-api-surface-convergence-plan.md`、`docs/plans/2026-08-04-1558-2-hmi-lifecycle-degradation-hardening-plan.md`、`docs/plans/2026-08-04-1235-3-hmi-display-math-manifest-plan.md`（已收口 P1-9，mock↔真实漂移先例）

## Purpose

把 `scada-canvas` 的显示几何缺陷与测试有效性收口：fit/center 包围盒对 `custom.points` 几何（polygon/line/arrow）的支持、状态判定链 scale 转发、自动宽 Text 居中、canvas data-slot 落点；e2e 断言有效性（pan fps 恒真、canvas 存在性断言、console-error allowance 移除）；覆盖缺口闭合（batch-add-probe 与列明的分支/通道）。全部为 audit 登记的非阻断 P2。

## Current Baseline

- `src/renderer/hooks/use-scada-config-sync.ts:20-37` `computeSymbolBounds`：只用 `node.x/y/width/height`，忽略 `custom.points`（`config-types.ts:77` `custom?: Record<string, unknown>`）——polygon-only 场景 fit/center 冲到 MAX_SCALE（20×）、图元钉在画布外（line/polygon bounds 退化为 0 尺寸 + `viewport.ts:58-59` 1e-6 兜底）。消费点：`applyInitialViewport`（:45）与 `use-scada-handles.ts:63,68`（fit/center 句柄）。
- `src/binding/dirty-collector.ts:298` `collectStates` 调 `resolveState(declaration, raw)` 无 options；`src/binding/value-to-state.ts:11-16` `resolveState(declaration, raw, options?)` 支持 scale 但无调用方传——主绑定带 `scale` 时判定值偏离写入值（point-store `convert` :205-210 已按 scale 换算写入值，判定链未换算）。
- `src/symbols/base-shapes/text.ts:29`：`props.align` → `attrs.textAlign`；leafer-ui@2.2.9 `Text.prototype.autoSizeAlign` **符号存在（默认 true）但自动宽下无 `layoutWidth`**（`createRows`/`layoutText` 仅在显式 width 时应用 textAlign 偏移）→ 自动宽 Text `textAlign:'center'` 仍偏移 0（左对齐）；`src/symbols/instrument/{gauge,level,thermometer}.ts` 仪表数值标签同路径。显式 width 为居中主路径（ground truth：已安装 `node_modules/.pnpm/leafer-ui@2.2.9` dist）。
- `src/renderer/scada-canvas.tsx:188-190`：`data-slot="scada-canvas-canvas"` 在空 wrapper div（**leafer canvas 的 sibling**，leafer `<canvas>` 挂到外层 containerRef 容器 :174）上而非 canvas 元素；`design-renderer.md §10` 表 canvas 行（:264-265）marker 记为「—」而代码发 `nop-scada-canvas-canvas`（含 CSS `styles.css:9` `.nop-scada-canvas .nop-scada-canvas-canvas { position:absolute; inset:0 }`）、`:185/:265` `scada-canvas-overlay` slot 声明但从未渲染（hover 覆盖物在 leafer sky 层）。
- `tests/e2e/scada-perf.spec.ts:158-184`："drag pan fps" 指标只数 rAF 帧（~60fps 恒发，与是否真平移无关）→ pan 半恒真断言（TE-1）；`:134,148,237,273,346` `allowConsoleErrors(100)` + `playground-entry-pages.spec.ts:450` `ROUTES_WITH_KNOWN_ERRORS` 为 calendar 先例拷贝而非证据驱动（open-audit live probe 该路由 0 console.error/pageerror）。
- e2e 断言主要为 `window.__flux_scada_<cid>` 场景树属性读取（design 授权通道）；整画布黑屏仍可能全过——每个 spec 家族（demo/edge/perf/pressure，`tests/e2e/scada-{demo,edge-cases,perf,pressure-demo}.spec.ts`）缺 canvas 存在性/像素断言（TE-3）。
- `src/engine/batch-add-probe.ts`：0% 覆盖（I14.1 探针，timing 不可断言但 shape/count/ratio 可）——TE-2。
- 覆盖缺口（TE-4）：`scada-engine.ts:322-324,378`（cacheImage/measureAddStrategies 投影）、`use-scada-engine.ts` `setPointValues` 注入通道、`use-scada-config-sync.ts` `onBuildError` catch、`use-scada-handles.ts` center-no-config、`validate.ts` 17 错误分支、`expression-evaluator.ts` 14 错误分支、switch OFF 位 applyProps。
- `src/scada-canvas-smoke.test.tsx` 未调 `resetLeaferMock()`（`src/test-support/leafer-ui-mock.ts:10` 导出；唯一漏调消费者文件，未来 innerId 断言隐患）——TE-5。
- 已收口不重复：`MockZoomLayer` x/y 锚定副作用（P1-9，plan `2026-08-04-1235-3`）已建模；`scada-canvas` 测试句柄读取通道（`window.__flux_scada_<cid>`）为 design 授权面（design-renderer.md §8.4）。
- 基线质量：包级 483 tests / 35 files 全绿（coverage 阈值 90 达标）、scada e2e 25/25 全绿、workspace typecheck/build/lint/test 全绿（plan `2026-08-04-1235-3` 收口 2026-08-04 实测）。

## Goals

- fit/center（含句柄路径）对 polygon/line/arrow 几何正确取包围盒，不再退化为 MAX_SCALE/画布外。
- 状态判定链与写入值共用同一 scale 换算口径（绑定带 scale 时判定一致）。
- 自动宽 Text `textAlign:'center'` 真实居中（仪表数值标签修复）。
- `scada-canvas-canvas` slot 指向真实 canvas 元素（或文档化容器 slot 语义）；§10 表与 live DOM 一致。
- e2e：pan 断言有视口变化证据；每个 spec 家族有 canvas 存在性断言；perf 路由无 blanket console-error allowance（证据驱动）。
- 包级覆盖缺口闭合，coverage 阈值维持 90+。

## Non-Goals

- 不做 mock↔真实漂移面扩展（Text/Image/Group 之外的 candidate 面仅在本计划触及项内核实，其余维持 gate-3/gate-4 既有基线）。
- 不引入 node-canvas、不把截图作为判定手段（测试纪律不变）。
- 不改 `window.__flux_scada_<cid>` 测试句柄契约（仅补断言）。
- 不重排/新增 e2e spec 家族（仅补断言与 allowance 清理）。

## Scope

### In Scope

- `computeSymbolBounds`/`collectStates`/`resolveState` 调用链 + `text.ts`/instrument 标签 + slot 落点 + 对应 focused 单测。
- `tests/e2e/scada-*.spec.ts` + `playground-entry-pages.spec.ts` 断言补强与 allowance 清理。
- 覆盖缺口清单逐项 + `batch-add-probe` 单测 + smoke `resetLeaferMock`。
- `design-renderer.md §10` 表同步。

### Out Of Scope

- 公共面/注册语义（plan `{1}`）、生命周期与错误面（plan `{2}`）。
- 性能数字复测（I14 已收口；batch-add 探针测试不测时序）。

## Failure Paths

| 场景                    | 触发                              | 行为                                                   | 可重试         | 用户可见表现          |
| ----------------------- | --------------------------------- | ------------------------------------------------------ | -------------- | --------------------- |
| polygon-fit-degenerate  | polygon-only 场景 fit/center      | bounds 由 `custom.points` 计算，scale 有界、图元入画布 | 是（命令重发） | 画面正确取景          |
| scale-mismatch-judgment | 绑定带 scale 且值进入不同判定区间 | 判定值与写入值同口径                                   | 否             | 状态色/动画与数值一致 |
| canvas-slot-mismatch    | DOM 断言取 canvas 元素            | slot 在真实 canvas 或文档化容器语义                    | 否             | 无（测试/工具面）     |
| black-canvas            | 渲染器整体黑屏                    | canvas 存在性断言失败（e2e 兜底）                      | 否             | 测试失败信号          |

## Test Strategy

本档选择：**必须自动化**。显示数学断言与 e2e 有效性是核心回归路径（gate-3 教训：mock 掩蔽面靠 focused 单测 + e2e 双层兜底）；每条 Fix 先写 failing 测试（Proof 前置），e2e 变更以 `pnpm test:e2e` scada 家族全绿为验证。

## Execution Plan

### Phase 1 — 显示几何修正（Display Geometry Fixes）

Status: planned
Targets: `src/renderer/hooks/use-scada-config-sync.ts`、`src/binding/dirty-collector.ts`、`src/symbols/base-shapes/text.ts`、`src/symbols/instrument/*`、`src/engine/scada-engine.ts`、`src/renderer/scada-canvas.tsx`、`design-renderer.md §10`

- Item Types: `Proof | Fix`

- [ ] `Proof` — 前置回归测试（TDD）：① polygon-only config（`custom.points` 几何）fit/center 后 scale 有界（< MAX_SCALE）且包围盒含图元（非 0 尺寸）；② 绑定带 `scale` 时状态判定与写入值一致（判定区间边界精确断言）——**语义钉死：判定作用于 point-store 存储值（声明级 scale 已在 `convert` 施加）**，`binding.scale` 仅在声明级无 scale（或为同一 scale 对象）时转发，避免双重换算（F4）；③ 自动宽 Text `textAlign:'center'` 产生有效居中（leafer Text attrs 断言，mock 面）；④ `data-slot="scada-canvas-canvas"` 可经 DOM 断言命中 leafer canvas 元素（或按裁定为容器 slot 后断言 container 语义）。
- [ ] `Fix` — `computeSymbolBounds`：对含 `custom.points` 的节点（line/arrow/polygon 等 points 几何族）从 points 数组计算 min/max 包围盒；无 width/height 但有 points 时不再退化为 0 尺寸。消费链（`applyInitialViewport` + 句柄 fit/center）自动收敛。
- [ ] `Fix` — `dirty-collector.ts` `collectStates`：主绑定 scale 转发——经 reverse-index 取 primary binding，`resolveState(declaration, raw, { scale: binding.scale })`，且按 F4 语义只在声明级无 scale 时生效（或以同一 scale 对象为准）。
- [ ] `Fix` — `text.ts` + instrument 数值标签：**以显式 width 为主路径**（自动宽下 autoSizeAlign/无 layoutWidth 使 textAlign 偏移不生效，已核实 installed leafer-ui@2.2.9 dist）——居中 Text 按内容测量设置 width（measureText 或标签固定宽度，取可验证者）；`~/sources/industrial-hmi-research/` leafer 源码核对仅作确认轮（ground truth 以已安装 dist 为准），不作为前置依赖。
- [ ] `Fix` — canvas slot 落点：`ScadaCanvasEngine` 创建后把 `data-slot="scada-canvas-canvas"`（及 marker 语义）落到真实 canvas DOM 元素（Proof：leafer App 结构定位 canvas 元素——`app.canvas.view` 面已确认可用），wrapper div 保留 marker class 且 **`styles.css:9` 规则目标复核**（slot/marker 移动后 CSS 选择器命中面需一致，F8）；`design-renderer.md §10` 表同步（canvas 行 marker `nop-scada-canvas-canvas`、删除或注记永不渲染的 `scada-canvas-overlay` 行——覆盖物在 leafer sky 层）。

Exit Criteria:

- [ ] ④ 组前置回归测试全绿入库；polygon fit 精确断言、scale 判定一致性断言、Text 居中断言、slot DOM 断言均为 repo-observable。
- [ ] `design-renderer.md §10` 表与 live DOM marker/slot 一致（canvas marker 与 slot 落点相符、overlay 行移除或注记）。
- [ ] 包级既有单测无回退（Phase 局部 typecheck + 相关 spec 复跑）。

### Phase 2 — e2e 有效性（E2E Effectiveness）

Status: planned
Targets: `tests/e2e/scada-{demo,edge-cases,perf,pressure-demo}.spec.ts`、`tests/e2e/playground-entry-pages.spec.ts`

- Item Types: `Fix | Proof`

- [ ] `Proof` — 前置 failing e2e：① perf drag pan 断言改为「视口变化」——采样 `__flux_scada_<cid>` 视口状态（**兜底：直接读 `tree.zoomLayer.x/y`**，真实平移下必变、不依赖引擎 sync 路径送达性，F3），断言平移期间视口 x/y 变化 → 现断言对恒真场景先红后绿；② 各 spec 家族补 canvas 存在性断言：DOM canvas 元素存在 + 尺寸非 0 + **帧计数保证后**的程序化像素探测（`toDataURL` 非全空——**触发面明确：`SecurityError`（跨源图片污染）与全零像素（合法空场景 `symbols: []`）为 fallback 触发条件，不视为失败**，F2；无法像素探测的家族以「元素存在 + render 帧计数 > 0」为验收断言并注明）；③ 移除 `allowConsoleErrors(100)`（perf spec ×5）与 `ROUTES_WITH_KNOWN_ERRORS` **scada-perf-scale 条目**（playground-entry-pages.spec.ts:450，open-audit live probe 已证该路由 0 console.error/pageerror）后全量 scada e2e 复跑无 console.error/pageerror 失败（移除后若真实错误浮现则以证据补 `KNOWN_ERRORS` 条目或修错误；**其余 8 条 KNOWN_ERRORS（gantt/kanban/scheduling/calendar/barcode 等）属其他家族、无本计划探针证据——不盲删，归各自 owner 或凭逐路由探针证据移除**，m3-r2）。
- [ ] `Fix` — 按 Proof 结果落地断言改写 + allowance 清理。
- [ ] `Proof` — `pnpm test:e2e` scada 家族全绿（demo/edge/perf/pressure）+ `playground-entry-pages.spec.ts` 相关路由不回归。

Exit Criteria:

- [ ] perf drag pan 断言在「未平移」场景失败、真平移场景通过（有效性证明，非恒真）；3 组断言变更落地。
- [ ] 全量 scada e2e + playground-entry-pages 无 allowance 全绿（或有证据驱动的新 KNOWN_ERRORS 条目）；无新增 console allowance。

### Phase 3 — 覆盖缺口闭合（Coverage Closure）

Status: planned
Targets: `src/engine/batch-add-probe.ts`、`src/engine/scada-engine.ts`、`src/renderer/hooks/use-scada-engine.ts`、`src/renderer/hooks/use-scada-config-sync.ts`、`src/renderer/hooks/use-scada-handles.ts`、`src/serialization/validate.ts`、`src/binding/expression-evaluator.ts`、`src/scada-canvas-smoke.test.tsx`

- Item Types: `Fix | Proof`

- [ ] `Proof` — 前置覆盖用例（对缺口清单逐项写断言）：`cacheImage`/`measureAddStrategies` 投影（scada-engine.ts:322-324,378）、`setPointValues` 注入通道（dev/test handle，**限于 mount 路径注入**——reload 后注入命中既有 stale-closure P2（plan `{2}` Phase 1 修复面），若覆盖用例先红于 stale-closure，该 finding 路由 plan `{2}` 而非本计划扩 scope，F5）、`onBuildError` catch（config 构建失败路径）、`center`-no-config（句柄无 bounds）、`validate.ts` 17 错误分支逐分支、`expression-evaluator.ts` 14 错误分支逐分支、switch OFF 位 applyProps。
- [ ] `Fix` — `batch-add-probe` 单测：断言 probe 产物 **count + 返回 shape**（mock 下 `add()` 零耗时使 perNodeMs 舍入为 0、ratio 退化——**timing>0 断言保留在既有 e2e probe 真实计时处（scada-perf.spec.ts:367-369 断言 count/perNodeMs>0/batchMs>0）；ratio 维持观察项（e2e 不作 pass/fail 门禁）**，F6）。
- [ ] `Fix` — `scada-canvas-smoke.test.tsx` 补 `resetLeaferMock()`（对齐唯一漏调消费者文件）。
- [ ] `Proof` — 覆盖率验证：包级 `pnpm --filter @nop-chaos/flux-renderers-industrial test` coverage 阈值 90+ 维持（或缺口闭合后不低于基线），缺口清单逐项在 coverage 报告中映射。

Exit Criteria:

- [ ] 缺口清单全部有断言覆盖（逐项可在 coverage 报告/测试文件中定位）；batch-add-probe 不再 0% 覆盖。
- [ ] smoke 测试文件含 `resetLeaferMock()`；包级测试全绿、coverage ≥ 90 达标。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh-session 子 agent ×3（R1 `ses_03433361fffeRANp3mYeWBDkIC`、R2 确认轮 `ses_0341e3585ffeLVepGPmh9H4279`、R3 终验 `ses_03416b345ffeAKy77zKf21tHFV`）
- Verdict: `pass`（R1 起 0 Blocker/0 Major；R2 4 Minor 落地后 R3 终验 0 新增）
- Rounds: 2
- Findings addressed: R1 F1-F8 全部落地（F1 显式 width 主路径、F2 像素探测 fallback 触发面、F3 pan 断言兜底 `tree.zoomLayer.x/y`、F4 判定作用于存储值语义钉死、F5 注入覆盖限于 mount 路径 + stale-closure 路由 plan `{2}`、F6 probe 单测只断 count/shape、F7 行号 :264-265/:322-324/:378、F8 wrapper 为 sibling + styles.css 目标复核）。R2 4 Minor 全部落地（autoSizeAlign 事实修正——符号存在但自动宽下 layoutWidth 不定、ratio 观察项措辞、KNOWN_ERRORS 移除钉死 scada-perf-scale 单条、`{3}` 简写消歧为 2026-08-04-1235-3）。R3 终验 0 新增。

## Closure Gates

> 关闭条件：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选后，才能将 `Plan Status` 改为 `completed`。

- [ ] 显示几何收口：polygon bounds、scale 判定一致性、Text 居中、slot 落点（Phase 1 回归全绿 + §10 表一致）。
- [ ] e2e 有效性收口：pan 断言非恒真、canvas 存在性断言、无 blanket console allowance（Phase 2 e2e 全绿）。
- [ ] 覆盖缺口闭合：清单逐项有断言、batch-add-probe 覆盖、smoke 补 reset（Phase 3 全绿 + coverage ≥ 90）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] 必要 focused verification 已完成；受影响的 owner docs 已同步（design-renderer.md §10）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### leafer 自动宽 Text 居中的浏览器级像素验证

- Classification: `watch-only residual`
- Why Not Blocking Closure: 居中修正以 leafer 源码语义 + attrs 级单测（mock 面）验证；真实浏览器像素级复核属 mock↔真实漂移候选面（audit 自评盲区），其影响仅视觉对齐、无契约损坏，且 `docs/plans/2026-08-04-1235-3`（P1-9 先例）已证明 mock 漂移风险面，故浏览器级验证列为 watch-only。
- Successor Required: `no`
- Successor Path: 随 e2e 断言升级（未来像素级断言通道）或 I16 编辑器轮

## Non-Blocking Follow-ups

- Text/Image/Group 相对坐标等其余 mock↔真实漂移候选面（audit 盲区自评 (a)）→ 保持 watch-only，不扩大本计划范围。
- 1 万 flux 点 O(N) 求值成本实测（audit 盲区自评 (c)）→ 性能优化候选，非本计划契约缺口。

## Closure

Status Note: （完成时填写）

Closure Audit Evidence:

- Auditor / Agent: （待独立 closure-audit 填写）
- Evidence: （task id / daily log / findings 摘要）

Follow-up:

- （待填；不得出现 confirmed live defect）
