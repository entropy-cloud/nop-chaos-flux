# 474 视觉质量 V4：SCADA/工业视觉修复 Plan

> Plan Status: draft
> Last Reviewed: 2026-09-20
> Source: `docs/analysis/visual-quality/V4-scada-visuals.md`（已独立核实，1 Major + 3 Minor 修订后零 Blocker/Major）、`docs/backlog/visual-quality-roadmap.md` V4、`docs/components/industrial-hmi/design-*.md`
> Related: `docs/plans/470-visual-quality-v0-baseline-infra-plan.md`（V0 工具链）

## Purpose

把路线图 V4 收口：`background.grid` 死配置 runtime 消费（leafer ground 层静态网格）、报警/趋势组件补齐的显式裁决（否决 + 理由在案）、画布尺寸声明 vs 渲染一致性 e2e L2 守护、I17 后残余视觉问题 13 项候选三态裁定落证据卡（含 R5 决策锁定 ⑤ 重开候选登记）。

## Current Baseline

- master @ 03add8bc4 + plan 473（V3）工作区改动收口中；industrial 包不受 V3 改动影响。
- `background.grid`：`src/serialization/validate.ts:59-73` 校验子形状、`config-types.ts:107` 类型声明、demo `scada-demo.tsx:96` 正在传参、`scada-engine.ts:211` 显式 watch-only 注释——validate/类型/demo/视觉规格（demo-visual-design.md §三）四处承诺、runtime 零消费。
- engine ground 层：`scada-engine.ts:130` 显式建 `ground:{}`，:139-141（构造期）/:212-214（reset 期）仅消费 `background.color`；视口变换仅作用 `app.tree.zoomLayer`（:393-400），ground 恒视口固定；sky 覆盖层有 hover 先例。
- 报警/趋势：24 图元（`register-builtin.ts:35-60`）零趋势/报警表组件；报警=状态三色+fault blink（`device/common.ts:26-28`）；`design-data-binding.md:410` 既往显式裁决「本期不内置」。
- 尺寸守护：P1-5 修复「声明 960/渲染 302」（`scada-engine.ts:96-108` 容器优先/schema fallback，happy-dom 单测 :44-97），e2e 层 `scada-canvas-assert.ts:54-57` 仅断言 boundingBox 非零，无「声明 vs 渲染」对比。
- e2e 基线：scada 族 37 test（demo 15 + edge-cases 6 + perf 5 + pressure 3 + editor-interaction 2 + editor-perf 3 + pointer 1 + leafer-examples 2）。
- industrial 包为 `hardcoded-literal-color` 整包前缀豁免（`scripts/audit/find-ui-consistency-gaps.mjs:80-90`）。

## Goals

- grid 死配置收敛：`background.grid` 在 ground 层真实绘制（构造期 + reset 期同口径），无 grid 零绘制向后兼容。
- 报警/趋势组件显式裁决落卡（否决 + 三条理由 + 去向指引），证据卡不再 pending。
- e2e 新增「canvas 填满容器」L2 几何守护（防 960/302 类缺陷换形态复发）+ grid 像素断言（L4）。
- I17 后残余 13 项候选逐项三态裁定（landed / adjudicated-with-reason / 登记重开候选），全部落证据卡。

## Non-Goals

- 硬编码色令牌化与 industrial 豁免收紧（V12a）。
- 运行时 dark 切换、多画面导航、视口持久化、编辑器覆盖物（既往裁决维持）。
- scada-image loadFailed 画布诊断（industrial-hmi roadmap 决策锁定 ⑤ 在案，重开待人工确认；证据卡登记候选即可）。
- 报警状态机/趋势数据通道实现（A2 否决，能力型缺失归 industrial-hmi roadmap 新 item）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/engine/scada-engine.ts`：ground 层网格绘制（构造期/reset 期），watch-only 注释清除。
- `packages/flux-renderers-industrial/src/engine/__tests__`（或既有 engine 测试落点）：grid 接线单测。
- `tests/e2e/helpers/scada-canvas-assert.ts`：尺寸一致性 L2 helper；`tests/e2e/scada-demo.spec.ts`：消费新 helper + grid 像素断言。
- Owner docs：`docs/components/industrial-hmi/design-renderer.md` §4.2（grid 消费语义改写）、`design-data-binding.md` §9.3（A2 裁决确认注记）、证据卡 `docs/audits/visual-quality/industrial-scada.md`（F1-F4 裁决回写 + R1-R13 三态表 + R5 重开候选）、roadmap V4 行、daily log。

### Out Of Scope

- V12a 豁免治理域；editor mission 域；报警/趋势组件实现；leafer-ui 升级类上游变更。

## Failure Paths

| 场景             | 触发                                    | 行为                                             | 可重试 | 用户可见表现 |
| ---------------- | --------------------------------------- | ------------------------------------------------ | ------ | ------------ |
| grid-absent      | 配置无 `background.grid`                | 不绘制任何网格线（ground 仅 fill），与现行为一致 | —      | 无网格       |
| grid-reset-clear | reset 后新配置无 grid                   | 清除旧网格节点（全量替换语义）                   | —      | 网格消失     |
| grid-degenerate  | `grid.size <= 0` 或容器 0 尺寸（jsdom） | 跳过绘制（防御性 no-op，不抛错）                 | —      | 无网格       |
| grid-hit         | 指针落在网格线上                        | 网格 Group `hittable:false`，不拦截图元命中      | —      | 正常交互     |
| size-mismatch    | 容器 CSS 挤压 canvas                    | 新 L2 断言失败（红线生效）                       | —      | e2e 红       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——死配置收敛是行为变更且 demo 正在消费；守护断言是本项交付物本体。Proof 先行。

## Execution Plan

### Phase 1 - 引擎层：grid runtime 消费

Status: planned
Targets: `packages/flux-renderers-industrial/src/engine/scada-engine.ts`、engine 测试落点

- Item Types: `Proof | Fix`

- [ ] Proof：单测先红——①reset 带 `background.grid` 后 ground 出现网格绘制节点（颜色/间距按配置）；②无 grid 配置时 ground 无网格节点（向后兼容）；③先带 grid reset、再无 grid reset，网格节点被清除；④`grid.size<=0` 防御性 no-op 不抛错
- [ ] Fix：`scada-engine.ts` 增 ground 层网格绘制私有方法（Group 容器、`hittable:false`、按 `this.size` 与 `grid.size` 生成正交线、颜色取 `grid.color`）；构造期（`options.background?.grid`）与 reset 期（`config.background?.grid`）同口径接线；reset 先清旧网格；:211 watch-only 注释改写为消费语义
- [ ] Fix：`docs/components/industrial-hmi/design-renderer.md` §4.2 grid 段改写（watch-only → runtime 消费语义：ground 层静态网格、视口固定、不随 pan/zoom、无 grid 零绘制）

Exit Criteria:

- [ ] 单测先红后绿有记录（本日志）；既有 industrial 包单测零回归
- [ ] demo 页既有 grid 传参即时可见（scada-demo e2e 像素断言承载于 Phase 2）

### Phase 2 - e2e：尺寸一致性守护 + grid 像素断言

Status: planned
Targets: `tests/e2e/helpers/scada-canvas-assert.ts`、`tests/e2e/scada-demo.spec.ts`

- Item Types: `Proof | Fix`

- [ ] Proof：先红——尺寸 helper 在「容器被挤压」场景下失败（可用 CSS 强制收窄容器构造红态），grid 像素断言在 grid 实现合入前失败
- [ ] Fix：`scada-canvas-assert.ts` 增「canvas 填满容器」L2 断言 helper（canvas boundingBox 与 `[data-slot="scada-canvas"]` 容器 box 对比，容差 ≤1px）
- [ ] Fix：`scada-demo.spec.ts` 消费：①默认页 canvas 填满容器；②ground 层像素断言（grid 配置 → ground canvas 非纯色，沿 `assertScadaCanvasRendered` 三层扫描语义或独立采样）
- [ ] Fix：scada 族既有 37 test 零回归复跑（重点 perf 5 test 阈值不退化——网格绘制为 O(cols+rows) 静态线，无逐图元成本）

Exit Criteria:

- [ ] 新增 e2e 全绿且先红有记录；scada 族 37 test 零回归
- [ ] V0 helper 通道复用成立（L2 几何 + L4 像素，无新造门禁）

### Phase 3 - 裁决落卡 + docs 收口

Status: planned
Targets: `docs/audits/visual-quality/industrial-scada.md`、`docs/components/industrial-hmi/design-data-binding.md`、roadmap、daily log

- Item Types: `Decision | Fix`

- [ ] Decision：A2 报警/趋势否决裁决落 `design-data-binding.md` §9.3（确认注记：三条理由 + 能力型缺失归 industrial-hmi roadmap 新 item）；证据卡 F2 回写
- [ ] Fix：证据卡 industrial-scada.md 全量回写：F1→A1 fixed、F2→A2 adjudicated（否决理由在案）、F3→A3 fixed（L2 守护落地）、F4→R1-R13 三态裁定表 + R5 决策锁定 ⑤ 重开候选登记（注明须人工确认）
- [ ] Fix：roadmap V4 行、`Last Updated`、daily log 收口记录

Exit Criteria:

- [ ] 证据卡无 pending 裁决残留；R5 重开候选与锁定条款引用一致
- [ ] owner docs 与 live 行为一致（grid 段、§9.3 段抽查）

## Draft Review Record

- Reviewer / Agent: （独立子 agent fresh session 填写）
- Verdict:
- Rounds:
- Findings addressed:

## Closure Gates

- [ ] 全部 in-scope 交付落地（Phase 1–3 Exit Criteria 全勾）
- [ ] in-scope 死配置已收敛：`background.grid` runtime 消费（watch-only 注释清除）
- [ ] A2 否决裁决显式落卡（非静默 deferred）；R1-R13 无 in-scope live defect 被划走
- [ ] 行为/契约结果已达成：grid 像素可见 + 尺寸守护断言在 e2e 成立
- [ ] 必要 focused verification 已完成（单测先红后绿 + scada 族 37 test 零回归）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（R5 重开候选为锁定条款在案的人工确认项，非静默降级）
- [ ] 受影响 owner docs 已同步：design-renderer.md、design-data-binding.md、证据卡、roadmap、daily log
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（industrial 豁免基数不变：零新硬编码色）

## Deferred But Adjudicated

### 报警/趋势组件（趋势图/历史曲线/报警表格/摘要）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 既往显式裁决在案（design-data-binding.md:410「FUXA 式报警状态机超范围」）；报警视觉原语（状态三色+fault blink+value-to-state 链）已存在；属新组件族立项而非视觉修复，去向=industrial-hmi roadmap 新 item
- Successor Required: `no`（归 industrial-hmi roadmap，非本路线图 successor）

### scada-image loadFailed 画布诊断

- Classification: `watch-only residual`
- Why Not Blocking Closure: industrial-hmi roadmap 决策锁定 ⑤「维持现状」在案（`roadmap-industrial-hmi.md:31`），重开须 Rule 3 人工确认；编辑器 mission E0-E10 已 done 且未交付——重开触发部分成立，作为重开候选登记证据卡，待人工确认
- Successor Required: `yes`
- Successor Path: industrial-hmi roadmap 新 item（经人工确认后立项）

## Non-Blocking Follow-ups

- editor styles.css 浅色 fallback 的 dark 适配（R3 残留半边）：随 V12a/编辑器域后续工作。
- binding×animation 同属性混用 warn（R8）：文档化契约维持，如后续有作者投诉再裁。

## Closure

Status Note: （closure audit 通过后填写）

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent fresh session 填写）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- （closure 时填写，或写 no remaining plan-owned work）
