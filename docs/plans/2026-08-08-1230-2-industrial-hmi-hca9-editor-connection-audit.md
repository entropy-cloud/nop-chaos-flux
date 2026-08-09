# 01 Industrial HMI Component Audit — HCA9 Editor Connection（连线子系统 23 维包级深审 + 自动修复）

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Mission: industrial-hmi-component-audit
> Work Item: HCA9. Editor connection 审计
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` §HCA9；包级深审 `docs/skills/deep-audit-prompts.md`（23 维；connection 为复杂交互层，维度 21 显示与定位 / 22 集成接线 / 23 测试有效性 必选触发）；先验修复基线 `docs/plans/2026-08-08-0900-1-industrial-hmi-editor-p2-correctness-robustness-remediation.md`（completed，#1 connection pointermove vs viewport-pan watch-only residual 在本 plan 复核范围内）
> Related: HCA7（planned，editor renderer 层基线，本 plan 前置依赖）、HCA0（done，编排基线）、HCA-BL（successor，bug 归档）、HCA-CR（successor，跨层集中修复）

## Purpose

对 `@nop-chaos/flux-renderers-industrial` 的 **editor connection 层**（`connection/` 子目录 6 源文件，~829 行）做一次完整的 23 维包级深审（复杂交互层，维度 21/22/23 必选触发），把发现的 P0/P1 live defect 立即 test-first 修复，P2 低成本当场修复 / 否则入审计卡 backlog，复核前序 plan 0900-1 转交的 `#1 connection pointermove vs viewport-pan` watch-only residual（确认仍为 residual 或升级修复），产出审计记录文件。editor connection 是 SCADA 编辑器的连线子系统——端点吸附状态机（pick/drag/release）、吸附阈值、联动重算、覆盖物 sky 渲染直接决定连线的交互正确性、拓扑一致性与画布卫生（无残留覆盖物）。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-08，`packages/flux-renderers-industrial/src/editor/connection/`，行号/`wc -l` 实测对齐 HEAD，与 roadmap §审计对象总览一致）。

### 审计对象：6 源文件（`wc -l` 实测）

- `connection/connection-adapter.ts`（291）— 连线适配器核心：connection CRUD（声明写入 workingConfig）、dangling 检测（`collectIds` 递归含 group 子树，plan 0900-1 #8 已 live 确认修复）、端点解析、与 editor session 桥接。本层最大文件。
- `connection/connection-drag-controller.ts`（151）— 拖拽状态机：pick（pointerdown 命中端点/junction）→ drag（pointermove 实时重算路径 + 吸附）→ release（pointerup 提交/取消）；手势仲裁入口。
- `connection/anchor-snap.ts`（162）— 端点吸附：基于 snap threshold 计算最近锚点/吸附候选；坐标变换（屏幕↔画布）；候选排序与去重。
- `connection/connection-link.ts`（97）— 连线几何：path 点序列 → 渲染路径计算（贝塞尔/折线/直角，依路由策略）；包围盒/中点派生。
- `connection/connection-overlay.ts`（70）— 覆盖物生命周期：临时连线/吸附提示覆盖物的创建/更新/销毁；与 editor overlay 栈协调。死字段 `tooltip` 已移除（plan 0900-2 #3）。
- `connection/connection-overlay-renderer.ts`（58）— sky 渲染：覆盖物投影到 leafer sky 层的 draw/clear。

### 6 colocated 测试文件（喂入 Phase 1/2 回归，不纳入审计对象 / ~973 行）

`connection/anchor-snap.test.ts`（149）/ `connection/connection-adapter.test.ts`（341）/ `connection/connection-drag-controller.test.ts`（215）/ `connection/connection-link.test.ts`（151）/ `connection/connection-overlay-renderer.test.ts`（71）/ `connection/connection-overlay.test.ts`（46）。

### 已收口的先验修复（构成基线，本 plan 不重做，仅 Phase 3 抽查回归）

- **plan 0900-1 #8**：`connection-adapter.ts:263-269` dangling 检测递归 `collectIds`（含 group 子树），group child 作为 connection target 不再被误报 dangling——Proof residual，复核仍成立。
- **plan 0900-2 #3**：`connection-overlay.ts` 死字段 `tooltip` 已移除（rg `tooltip` = 0 命中）——复核仍成立。

### 前序 plan 转交项（#1 watch-only residual，本 plan 必须复核）

**plan 0900-1 #1**（`connection-wiring.ts:47` + `connection-drag-controller.ts`）：connection drag `pointermove` 是否与 viewport-pan 冲突。classified watch-only residual——e2e `scada-editor-interaction-correctness.spec.ts` #1 test 证伪（junction 上 pointerdown + 拖拽期间 viewport 不平移，`vpAfter === vpBefore`，依据 `connection-wiring.ts:47` `onConnectionPointerDown` 在命中 junction 时 `e.preventDefault()` + `connectionDragActiveRef.current = true`）。**本 plan 在维度 22 集成接线深审中复核**：确认手势仲裁（preventDefault + connectionDragActiveRef）仍接线、e2e 仍覆盖、且无新冲突；若发现新缺陷则升级 test-first 修复，否则维持 watch-only residual。

> 注：`connection-wiring.ts` 属 HCA11 infra 范围，本 plan 仅复核其与 connection drag 的接线（#1 跨界点），不审计 `connection-wiring.ts` 本体。

### owner doc 现状

- `docs/components/industrial-hmi-editor/design-connection.md`（连线子系统设计：状态机/吸附/覆盖物）。
- `docs/components/industrial-hmi/design-engine.md`（sky 交互覆盖物 / overlay 栈）。
- `docs/components/industrial-hmi/editor-initiation.md` §2.1（M2 连线功能域）。
  Phase 3 核对这些章节与 live connection 一致性。

### 包级机械健康

`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（HEAD 基线 ~1,300+ tests / 97 test files）。

## Goals

- 对 6 源文件逐文件完成 23 维包级深审（维度 21/22/23 必选触发），产出带 `文件:行` 证据的 finding 清单（P0/P1/P2/P3 triage）。
- 所有确认的 P0/P1 live defect test-first 修复（failing-first proof 先于 fix，断言结果值而非 not.toThrow）。
- P2 低成本当场修复并带回归测试；P2 高成本 / P3 入审计卡 backlog（归 HCA-CR）。
- 复核 plan 0900-1 #1 转交项：确认 connection drag vs viewport-pan 手势仲裁仍为 watch-only residual 或升级修复，给出裁定。
- owner doc（design-connection.md、design-engine.md overlay 节）与 live connection 一致性核对 + 必要同步。
- 产出审计记录文件 `docs/audits/2026-08-08-*-hca9-editor-connection.md`。

## Non-Goals

- 不审计 editor renderer（HCA7）/ panels（HCA8）/ undo-redo（HCA10）/ infra（HCA11，含 `connection-wiring.ts` 本体）。
- 不重做已收口的 #8/#3 修复（仅 Phase 3 抽查回归）。
- 不做 HCA-BL（bug 归档）/ HCA-LL（lesson 沉淀）的全量汇总——本 plan 仅产出本层 finding 喂入 HCA-BL/LL。
- 不改 connection 公共面或 workingConfig connections 契约（除非审计发现 contract drift）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/connection/connection-adapter.ts`。
- `packages/flux-renderers-industrial/src/editor/connection/connection-drag-controller.ts`。
- `packages/flux-renderers-industrial/src/editor/connection/anchor-snap.ts`。
- `packages/flux-renderers-industrial/src/editor/connection/connection-link.ts`。
- `packages/flux-renderers-industrial/src/editor/connection/connection-overlay.ts`。
- `packages/flux-renderers-industrial/src/editor/connection/connection-overlay-renderer.ts`。
- 审计记录 `docs/audits/2026-08-08-*-hca9-editor-connection.md`。
- owner doc `docs/components/industrial-hmi-editor/design-connection.md` + `docs/components/industrial-hmi/design-engine.md`（overlay 节，仅当审计发现 drift 时同步）。
- 任一 P0/P1 fix 的 focused regression test。

### Out Of Scope

- `src/editor/connection-wiring.ts`（HCA11 infra；本 plan 仅复核其与 drag 的 #1 接线点，不审计本体）。
- `src/editor/renderer/`（HCA7）、`src/editor/{palette,inspector,toolbox}/`（HCA8）、`src/editor/undo-redo/`（HCA10）、`src/editor/` 顶层 infra（HCA11）。
- `*.test.ts` / `*-fixtures.ts` / `index.ts` barrel（测试基础设施 / 聚合导出，不纳入审计对象，仅作回归喂入）。
- `src/renderer/`（HCA1）、`src/engine/`（HCA2）、`src/binding/`（HCA3）、`src/serialization/`（HCA4）、`src/symbols/`（HCA5/HCA6）。
- HCA-BL/LL/CR/CV/CG 全量汇总（本 plan 仅喂入 finding）。

## Failure Paths

> editor connection 是连线交互 + 覆盖物渲染层，无外部 IO / 鉴权 / API 契约。失败路径关注点是状态机边界、吸附退化与覆盖物残留。

| 可测场景编号            | 触发                                         | 行为                                                       | 可重试 | 用户可见表现                      |
| ----------------------- | -------------------------------------------- | ---------------------------------------------------------- | ------ | --------------------------------- |
| conn-drag-cancel        | drag 中途 pointerup 于空白（未吸附任何端点） | 取消提交，覆盖物销毁，workingConfig connections 不变       | 否     | 临时连线消失，无残留，无 dangling |
| conn-snap-no-candidate  | pointermove 时 snap 范围内无锚点             | 跟随光标（free endpoint），不 throw                        | 否     | 连线端点跟随光标                  |
| conn-overlay-leak       | 连线提交/取消后 overlay 未 clear             | overlay sky 层清空（无残留临时线/吸附提示）                | 否     | 画布无幽灵连线                    |
| conn-dangling-target    | connection 引用已删除图元 id                 | dangling 检测标记，不 crash 列举（#8 基线，含 group 子树） | 否     | 连线标红或不渲染断开端            |
| conn-group-child-target | connection 端点为 group 子节点 id            | 识别为有效 target（不误报 dangling）                       | 否     | 连线正常连接 group 子节点         |

## Test Strategy

本档选择：**建议有测**

editor connection 是复杂交互层（状态机 + 吸附 + 覆盖物），非注册 renderer。审计前无已知 P0/P1 live defect（先验 #1/#8 watch-only residual、#3 已收口）。任何审计中确认的 P0/P1 live defect 按 roadmap 自动修复契约 test-first（failing-first proof 先于 fix）；P2 修复 same-PR 带回归。验证以 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` + 关键行为抽查（pick/drag/release 状态机 / 吸附阈值 / 联动重算 / overlay 清理 / group child target）为主。交互闭环变更追加 e2e（`scada-editor-interaction-correctness.spec.ts`）。

## Execution Plan

### Phase 1 - 逐文件 23 维包级深审 + finding triage + #1 复核

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/connection/`（6 源文件）、`docs/audits/2026-08-08-1230-hca9-editor-connection.md`

- Item Types: `Proof | Decision`

- [x] 逐文件过 `docs/skills/deep-audit-prompts.md` 23 维（**维度 21 显示与定位 / 22 集成接线 / 23 测试有效性 必选触发**）。重点维度：
  - **状态机正确性**（connection-drag-controller.ts）：pick/drag/release 状态转移穷尽性；非法转移守卫（如未 pick 即 drag）；pointerup 于空白（取消）/ 于有效端点（提交）分支；重入/竞态（pointermove 在已 release 后到达）。
  - **吸附正确性**（anchor-snap.ts，**维度 21**）：snap threshold 边界（恰等于阈值）；屏幕↔画布坐标变换；候选排序稳定性（等距候选去重）；空候选集降级（free endpoint）。
  - **连线几何正确性**（connection-link.ts，**维度 21**）：path 点序列→渲染路径（路由策略）；空点序列/单点边界；包围盒/中点派生的 NaN 守卫。
  - **dangling 检测 + connection CRUD**（connection-adapter.ts）：声明写入 workingConfig 的幂等性；`collectIds` 递归 group 子树（#8 基线复核）；端点解析；删除图元时关联 connection 清理。
  - **覆盖物生命周期**（connection-overlay.ts + connection-overlay-renderer.ts）：临时覆盖物创建/更新/销毁配对（无 leak）；sky 层 draw/clear 配对；与 editor overlay 栈协调；`tooltip` 死字段不回归（#3 复核）。
  - **错误处理**：null/undefined 端点、NaN 坐标、超大坐标的降级（不 throw 到 leafer）。
  - **类型安全**：endpoint/symbol id cast、leafer 内部方法访问、未知 connection 类型。
- [x] 重点抽查边界值：空 selection drag / snap 范围无候选 / 单点 path / pointerup 空白 / pointerup 有效端点 / group 子节点 target / 连续快速 drag-release / 删除图元后列举 connections。
- [x] **#1 复核（必须）**：对 connection drag vs viewport-pan 手势仲裁核查：`connection-wiring.ts:47` preventDefault + connectionDragActiveRef 仍接线？e2e `scada-editor-interaction-correctness.spec.ts` #1 test 仍覆盖且通过？是否存在新冲突？给出裁定（维持 watch-only residual / 升级 test-first 修复）。
- [x] 产出 `docs/audits/2026-08-08-1230-hca9-editor-connection.md`：逐文件 finding 表（维度 / 结论 / `文件:行` 证据 / P0-P3 triage）+ #1 复核裁定行。

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续的局部检查；全量验证归 Closure Gates。

- [x] 审计记录文件存在，含 6 文件逐文件 finding 表 + 每条 `文件:行` 证据经 live 核对。
- [x] 所有 finding 已 triage 为 P0/P1/P2/P3 之一（无未分类项）。
- [x] #1 复核裁定行存在（维持 residual 或升级修复，附证据）。

### Phase 2 - P0/P1 自动修复 + P2 低成本修复（test-first）

Status: completed
Targets: Phase 1 finding 中标 P0/P1 的源文件 + 对应 `*.test.ts`

- Item Types: `Fix | Proof`

- [x] 对每条 P0/P1 finding：先写 failing-first focused test（断言正确结果值 / 行为，非 not.toThrow），再修代码使转绿。→ **vacuously satisfied**（Phase 1 零 P0/P1 finding）。
- [x] P2 低成本（<~30 行 / 单文件 / 无公共面变更）当场修复并带回归测试；P2 高成本入审计卡 backlog（归 HCA-CR）。→ HCA9-P2-1（dim 23 sky-missing 测试 not.toThrow 唯一断言加强）test-strengthen 落地；HCA9-P3-1..4 入审计记录 §5.2（→ HCA-CR）。
- [x] 若 #1 复核发现升级为 P2/P1（手势冲突致 live 交互缺陷），test-first 修复（手势仲裁强化）。→ **N/A**（#1 维持 watch-only residual，Phase 1 §2 裁定）。
- [x] 每条 fix 在审计记录文件回写状态（fixed / recorded）+ fix 落点 `文件:行`。→ 审计记录 §7 Phase 2 修复记录。

Exit Criteria:

- [x] 所有 P0/P1 finding 的 failing-first test 存在且转绿（断言结果值）。→ vacuously satisfied（零 P0/P1）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 全绿（包级局部验证）。→ 97 文件 / 1311 测试全绿 + typecheck clean。
- [x] 审计记录 finding 状态已回写（含 #1 复核裁定结果）。→ 审计记录 §2 + §7。

### Phase 3 - owner doc 一致性核对 + 回归抽查 + bug 喂入

Status: completed
Targets: `docs/components/industrial-hmi-editor/design-connection.md`、`docs/components/industrial-hmi/design-engine.md`（overlay 节）、审计记录、HCA-BL 引用

- Item Types: `Fix | Follow-up`

- [x] 核对 `design-connection.md`（状态机/吸附/覆盖物）+ `design-engine.md` overlay 节与 live connection 一致；仅当发现 drift 时同步（无 drift 不写）。→ 审计记录 §4：§4.1/§4.2/§4.3/§4.5/§6 + design-engine §6 逐节核对 PASS，**无 drift**（§4.4 row1 vs §4.5 正交，非 drift）。
- [x] 抽查先验修复回归（#8 dangling 递归 collectIds / #3 tooltip 死字段不回归 行为仍成立）。→ 审计记录 §3：#8（`connection-adapter.ts:269-276` + proof test:232-258）/ #3（rg tooltip=0）/ #2（safeDiv + proof test:71-101）均成立。
- [x] 把本层复杂 / 跨层 bug 候选汇总到审计记录「喂入 HCA-BL」节（正式归档动作在 HCA-BL，本 plan 不产出 `docs/bugs/` 卡片）。→ 审计记录 §5：无复杂/跨层 bug 候选需归 `docs/bugs/`；P3-1..4 → HCA-CR；§4.4 row1 vs recomputeLinkagesForMovedNode 跨层观察 → HCA11 复核。

Exit Criteria:

- [x] design-connection.md + design-engine.md overlay 节经 rg/读核对待无 drift（或有同步 commit）。→ 无 drift。
- [x] 先验修复回归抽查通过。→ §3 #8/#3/#2 成立。
- [x] HCA-BL 喂入节存在（含 bug 候选清单 + `文件:行`，或明确「无复杂/跨层 bug 候选」+ 理由）。→ §5 明确「无复杂/跨层 bug 候选」+ 理由（零 P0/P1、先验修复复核成立、#1 维持 residual）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立子 agent（fresh session）反复 review 直到共识后填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_0207895eaffeoRywdO7AmX34ma`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major / 零 Minor。`connection-wiring.ts`（HCA11 infra）边界处理干净：明确仅复核 #1 接线点（`connection-wiring.ts:47` preventDefault + `:45` connectionDragActiveRef），不审计本体。Live repo 全量复核通过：6 源文件行数精确（291/151/162/97/70/58，Σ=829）、6 测试文件行数精确（Σ~973）、owner-doc 路径存在（design-connection + design-engine overlay 节）、plan 0900-1 #1/#8 + 0900-2 #3 转交项描述准确、roadmap HCA9=todo、23-dim + dim 21-23 适用性匹配、与 HCA7/HCA8/HCA10/HCA11 无 scope 重叠。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量 `pnpm typecheck/build/lint/test` 是 plan 收口时跑一次的仓库级检查（见 guide Minimum Rule 18）。

- [x] 6 源文件逐文件深审完成，审计记录文件存在且 finding 全 triage。
- [x] 所有 in-scope 确认的 P0/P1 live defect 已 test-first 修复（failing-first proof 存在）。→ vacuously satisfied（审计零 P0/P1）。
- [x] plan 0900-1 #1 转交项已复核并裁定（维持 watch-only residual / 升级修复，证据入审计记录）。→ 维持 watch-only residual（审计记录 §2）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner doc 与 live baseline 一致（或明确无 drift）。→ 审计记录 §4 无 drift。
- [x] 必要 focused verification 已完成。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。→ `ses_02053c2e7ffelppC3F1v7m3OzL` CLOSURE AUDIT VERDICT: PASS（7 点逐项 live code 复核）。
- [x] `pnpm typecheck` → 32/32 successful。
- [x] `pnpm build` → 32/32 successful。
- [x] `pnpm lint` → 32/32 successful。
- [x] `pnpm test` → 59/59 tasks successful；industrial 97 文件 / 1311 测试全绿。

## Deferred But Adjudicated

> plan 0900-1 #1（connection drag pointermove vs viewport-pan）经 Phase 1 复核裁定为 **watch-only residual**（非 live defect）：
>
> - **Classification**：watch-only residual（手势仲裁 preventDefault + connectionDragActiveRef 接线完整 + e2e #1 覆盖通过 + 无新冲突）。
> - **Why Not Blocking Closure**：不是 in-scope live defect——是已证伪的交互冲突假设，e2e 持续守护；connection-wiring.ts 本体归 HCA11，本 plan 仅复核 #1 接线点。证据见审计记录 §2。

## Non-Blocking Follow-ups

- HCA9-P3-1..4（moveDrag O(n) bounds 重建 / 等距候选 tie-break / 源码注释「12 锚点」措辞 / sky overlay 颜色硬编码）归 HCA-CR 跨层集中修复（审计记录 §5.2）。
- §4.4 row1 vs recomputeLinkagesForMovedNode 跨层观察归 HCA11 复核调用时机语义（审计记录 §5.3，非 HCA9 defect）。
- 本层无复杂/跨层 bug 候选需归 `docs/bugs/`（审计记录 §5.1）。

## Closure

Status Note: HCA9 editor connection 层 23 维包级深审完成（dim 21/22/23 必选触发）。零 P0/P1 live defect；#1（connection drag vs viewport-pan）维持 watch-only residual；#8/#3/#2 先验修复复核成立；1 项 P2 低成本（dim 23 sky-missing 测试 not.toThrow 唯一断言加强）test-strengthen 落地；4 项 P3 归 HCA-CR。全量 typecheck/build/lint/test 全绿。独立子 agent closure audit PASS。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_02053c2e7ffelppC3F1v7m3OzL`
- Evidence: CLOSURE AUDIT VERDICT: PASS。7 点逐项 live code 复核——①审计完整性（6 文件 file:line + 全 triage）②零 P0/P1 抽查（状态机 `connection-drag-controller.ts:85,106` / 吸附阈值 `anchor-snap.ts:130` / safeDiv `connection-link.ts:55-57` / overlay 生命周期 `connection-overlay-renderer.ts:20,53-56`）③#1 仲裁（`connection-wiring.ts:45,47,50,55-56` + e2e `:105`）④#8/#3（`connection-adapter.ts:271-276` + rg tooltip=0）⑤P2-1 fix 质量（`connection-overlay-renderer.test.ts:36-44` 断言有意义且保留 prior）⑥owner-doc §4.5 公式一致 ⑦scope 纪律（仅 connection/ 6 文件 + #1 接线点）。审计记录 `docs/audits/2026-08-08-1230-hca9-editor-connection.md`。

Follow-up:

- HCA9-P3-1..4 → HCA-CR（non-blocking，见 Non-Blocking Follow-ups）。
- §4.4 row1 跨层观察 → HCA11（non-blocking）。
- no remaining plan-owned work（本 plan 范围内无未决 live defect）。
