# 02 Industrial HMI Component Audit — HCA2 Engine Layer（canvas 场景图引擎 23 维包级深审 + 自动修复）

> Plan Status: active
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA2. Engine 层审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA2；包级深审 `docs/skills/deep-audit-prompts.md`（23 维，**复杂交互层 → 维度 21 显示与定位正确性 / 22 集成接线与可操作性 / 23 测试有效性与假绿 必选**）
> Related: HCA0（done，编排基线）、HCA1（planned，renderer 层审计；renderer hook 层的 engine 接线经 HCA1 已审，本 plan 只审 `src/engine/` 内部）、`docs/plans/2026-08-06-0900-3-industrial-hmi-engine-lifecycle-viewport-robustness.md`（completed，engine/视口/生命周期 P2 已收口，构成本 plan Current Baseline）

## Purpose

对 `@nop-chaos/flux-renderers-industrial` 的 **engine 层**（9 文件，~1,350 行）做一次完整的 23 维包级深审（复杂交互层，维度 21-23 必选），把发现的 P0/P1 live defect 立即 test-first 修复，P2 低成本当场修复 / 否则入审计卡 backlog，产出审计记录文件。engine 是 industrial 包的 canvas 场景图核心（LeaferJS 适配 / 视口数学 / 命中测试 / 事件桥 / 覆盖物生命周期 / diff 构建），其正确性是 binding、symbols、editor 全部上层的基础。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，`packages/flux-renderers-industrial/src/engine/`，行号对齐 HEAD）。

- **engine 9 文件 + 行数（`wc -l` 实测，与 roadmap §审计对象总览 一致）**：
  - `scada-engine.ts`（499）— `ScadaEngine` 主体（LeaferJS app/layer 生命周期、reset/destroy、`handlePluginZoom`、`build` 经 config-adapter、plugin 接线）。
  - `config-adapter.ts`（180）— config → 场景树 diff 构建（`build(config)`、节点增删改 diff）。
  - `event-bridge.ts`（190）— LeaferJS 事件 → scada 语义事件桥（点击/hover/zoom/pan 等）。
  - `hit.ts`（29）— 命中测试 helper（hit test 数学）。
  - `interaction-overlay.ts`（176）— hover/select 覆盖物生命周期 + 绘制。
  - `tree-registry.ts`（108）— 节点注册表（id↔node 映射、增删查）。
  - `viewport.ts`（96）— 视口数学（`clampScale` MIN/MAX、`applyInitialViewport` fit/contain/fill 分支）。
  - `batch-add-probe.ts`（44）— 批量添加探针（性能测量辅助）。
  - `test-handle.ts`（29）— 测试句柄（测试基础设施辅助）。
- **已收口的先验修复（构成基线，本 plan 不重做，仅 Phase 3 抽查回归）**：
  - P2-7 fill 零尺寸方向兜底（`use-scada-config-sync.ts:126` `Math.max(1e-6, bounds.width/height)` floor）。
  - P2-8 wheel-zoom 除零守卫（`scada-engine.ts:442` `if (rawScale === 0 || !Number.isFinite(rawScale))` 早退）。
  - P2-10 reset 清覆盖物（`scada-engine.ts:201` `this.interaction?.clear()` + `use-scada-events.ts:83` config-change 重置 lastHoverSymbolRef）。
  - P2-11 handles deps 卫生（`use-scada-handles.ts` effect deps 移除 runtime）。
  - viewport clampScale clamp-before-center（plan 2026-08-05-1253-1）。
- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（HEAD 基线 ~1302 tests / 97 test files）。

## Goals

- 对 engine 9 文件逐文件完成 23 维包级深审（维度 21-23 必选），产出带 `文件:行` 证据的 finding 清单（P0/P1/P2/P3 triage）。
- 所有确认的 P0/P1 live defect test-first 修复（failing-first proof 先于 fix，断言结果值而非 not.toThrow）。
- P2 低成本当场修复并带回归测试；P2 高成本 / P3 入审计卡 backlog（归 HCA-CR）。
- 重点核验复杂交互正确性：视口数学边界（clampScale 各分支、scaleOfWorld 矩阵可恢复性）、命中测试边界（空/重叠/变换后）、覆盖物生命周期（create/update/dispose 对称 + reset 清理）、diff 构建路径（增删改幂等、大场景）、引擎 reset/destroy 清理对称（监听器/定时器/LeaferJS app dispose）。
- owner doc `docs/components/industrial-hmi/design-engine.md` 与 live baseline 一致性核对 + 必要同步。
- 产出审计记录文件 `docs/audits/2026-08-08-*-hca2-engine-layer.md`。

## Non-Goals

- 不审计 renderer hook 层（`src/renderer/hooks/`，HCA1 已 planned）——本 plan 只审 `src/engine/` 内部；hook 层对 engine 的接线经 HCA1 审。
- 不审计 binding（HCA3）/ serialization（HCA4）/ symbols（HCA5/HCA6）。
- 不重做已收口的 P2-7/P2-8/P2-10/P2-11（仅 Phase 3 抽查回归）。
- 不改 `clampScale` 的 MIN/MAX_SCALE 阈值（除非审计发现 contract drift）。
- 不做 HCA-BL / HCA-LL 全量汇总——本 plan 仅产出本层 finding 喂入。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/engine/` 9 文件（见 Current Baseline 清单）。
- 审计记录 `docs/audits/2026-08-08-*-hca2-engine-layer.md`。
- owner doc `docs/components/industrial-hmi/design-engine.md`（仅当审计发现 drift 时同步）。
- 任一 P0/P1 fix 的 focused regression test。

### Out Of Scope

- `src/renderer/`（HCA1）、`src/binding/`（HCA3）、`src/serialization/`（HCA4）、`src/symbols/`（HCA5/HCA6）、`src/editor/`（HCA7-HCA11）。
- HCA-BL bug 卡片正式归档（本 plan finding 喂入，归档动作在 HCA-BL）。

## Test Strategy

本档选择：**必须自动化**

engine 是 canvas 场景图核心 + 复杂交互层（视口数学 / 命中测试 / 覆盖物 / diff 构建 / 生命周期清理），属核心回归路径。任何审计中确认的 P0/P1 live defect 按 roadmap 自动修复契约 **test-first**（failing-first Proof 项必须先于 Fix 项）。关键路径（视口边界、命中测试、reset/destroy 对称、diff 幂等）必须有断言正确结果值的 focused test，不能只验 not.toThrow / call-count。

## Execution Plan

### Phase 1 - 逐文件 23 维包级深审（维度 21-23 必选）+ finding triage

Status: planned
Targets: `packages/flux-renderers-industrial/src/engine/`（9 文件）、`docs/audits/2026-08-08-*-hca2-engine-layer.md`

- Item Types: `Proof | Decision`

- [ ] 逐文件过 `docs/skills/deep-audit-prompts.md` 23 维（**维度 21 显示与定位 / 22 集成接线 / 23 测试有效性 必选**），重点：视口数学正确性（clampScale fit/contain/fill 三分支方向一致 + scaleOfWorld 矩阵可恢复）、命中测试边界（空 bounds / 重叠图元 / 旋转缩放变换后）、覆盖物生命周期（interaction-overlay create/update/dispose 对称 + reset 清空）、event-bridge 事件映射完备 + 监听器清理、tree-registry 增删查边界（重复 id / 不存在 id / clear 后查）、config-adapter diff 构建（增删改幂等 / 大场景）、引擎 reset/destroy 清理对称（LeaferJS app dispose / 监听器 / 定时器 / 覆盖物）。
  - **维度 22 边界说明**：本 plan 的 dim 22 = engine 内部子模块接线（event-bridge↔scada-engine、config-adapter→tree-registry、reset/destroy 对称）+ engine 公共 API 可操作性；完整 schema→store→DOM→event 链路可操作性在 HCA1（renderer hook 层）审，本 plan 不重复。
- [ ] 重点抽查边界值：scale=0 / NaN / Infinity / 负数 / 空 config / 单图元 / 超大场景（10k+）/ 重复 reset / destroy 后再调用。
- [ ] 产出 `docs/audits/2026-08-08-*-hca2-engine-layer.md`：逐文件 finding 表（维度 / 结论 / `文件:行` 证据 / P0-P3 triage）+ 维度 21-23 专项节。

Exit Criteria:

> 只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查。

- [ ] 审计记录文件存在，含 9 文件逐文件 finding 表 + 维度 21-23 专项节 + 每条 `文件:行` 证据经 live 核对。
- [ ] 所有 finding 已 triage 为 P0/P1/P2/P3 之一（无未分类项）。

### Phase 2 - P0/P1 自动修复（test-first，Proof 先于 Fix）+ P2 低成本修复

Status: planned
Targets: Phase 1 finding 中标 P0/P1 的源文件 + 对应 `*.test.ts`

- Item Types: `Proof | Fix`

- [ ] 对每条 P0/P1 finding：**先写 failing-first focused test**（断言正确结果值 / 行为，非 not.toThrow / call-count），确认红，再修代码使转绿。
- [ ] P2 低成本（<~30 行 / 单文件 / 无公共面变更）当场修复并带回归测试；P2 高成本入审计卡 backlog（归 HCA-CR）。
- [ ] 每条 fix 在审计记录文件回写状态（fixed / recorded）+ fix 落点 `文件:行`。

Exit Criteria:

- [ ] 所有 P0/P1 finding 的 failing-first test 存在、确认过红、转绿（断言结果值）。
- [ ] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。
- [ ] 审计记录 finding 状态已回写。

### Phase 3 - owner doc 一致性核对 + 回归抽查 + bug 喂入

Status: planned
Targets: `docs/components/industrial-hmi/design-engine.md`、审计记录、HCA-BL 引用

- Item Types: `Proof | Fix | Follow-up`

- [ ] 核对 `design-engine.md` 与 live engine 一致（视口数学契约 §4.4、reset/destroy 行为、event-bridge 事件清单、tree-registry 模型）；仅当发现 drift 时同步（无 drift 不写）。
- [ ] 抽查先验修复回归（P2-7/P2-8/P2-10/P2-11 行为仍成立）。
- [ ] 把本层复杂 / 跨层 bug 候选汇总到审计记录「喂入 HCA-BL」节（正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片）。

Exit Criteria:

- [ ] `design-engine.md` 经 rg/读核对待无 drift（或有同步 commit）。
- [ ] 先验修复回归抽查通过。
- [ ] HCA-BL 喂入节存在（含 bug 候选清单 + `文件:行`）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_02156762bffekf4Q80tnF51tUS`（R1）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。3 Minor（非阻塞，已处理 M-1/M-2）：M-1 Phase 3 Item Types 由 `Fix | Follow-up` 改为 `Proof | Fix | Follow-up`（回归抽查属 Proof）；M-2 Phase 1 补维度 22 边界说明（engine 内部子模块接线，完整链路可操作性在 HCA1）；M-3 无 Failure Paths 节（审计型计划可省，保留）。live repo 全量复核通过（9 engine 文件行数、P2-7/8/10/11 先验修复落点、owner doc、dims 21-23 mandatory、Test Strategy 必须自动化 均确认）。

## Closure Gates

> 全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（见 guide Minimum Rule 18）。

- [ ] engine 9 文件逐文件深审完成（维度 21-23 必选），审计记录文件存在且 finding 全 triage。
- [ ] 所有 in-scope 确认的 P0/P1 live defect 已 test-first 修复（failing-first proof 存在）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] owner doc `design-engine.md` 与 live baseline 一致（或明确无 drift）。
- [ ] 必要 focused verification 已完成。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

> 本 plan 起草时无已知可延期项。Phase 1 若发现 P2 高成本项，入审计卡 backlog 并在此记录 Classification + Why Not Blocking Closure。

## Non-Blocking Follow-ups

- 本层 P2 高成本项归 HCA-CR 跨层集中修复。
- engine 层与 binding（HCA3）的接合面（订阅 / flushFrame 触发）由 HCA3 审计时交叉核验。

## Closure

Status Note: <<收口时填写：为什么这个 plan 可以关闭>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里；或明确写 no remaining plan-owned work>>
