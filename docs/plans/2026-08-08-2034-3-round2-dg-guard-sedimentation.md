# DG Guard 沉淀（round2-index + lessons 09+ + bug-note 缺口终验 + 门禁升级 + checklist 修订 + 基线回写）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: DG
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（DG 行 + Phase Details + Dependency Graph + Cross-Cutting）、`docs/audits/host-surface/`（37 卡 + README + surface-inventory）、`docs/audits/round2-dr-adjudication.md`、D3.1–D3.4 各 plan 的 Non-Blocking Follow-ups（门禁盲区四连登记）、D2 裁决表 §7（0150-1 stagedDirs 路由）
> Related: `docs/plans/2026-08-08-2034-1-round2-dr-cross-surface-centralized-remediation.md`（前置）、`docs/plans/2026-08-08-2034-2-round2-dv-full-verification.md`（前置，DV full-green 终态为本 plan 回写依据）、`docs/plans/2026-08-08-0900-3-round2-dl-lessons-distillation.md`（completed，lessons 06–08 先例）、`docs/plans/2026-08-08-0900-2-round2-db-bug-note-backfill.md`（completed，bug-note 缺口盘点先例）、`docs/plans/2026-08-06-0343-1-cg-guard-sedimentation.md`（completed，第一轮 Guard 沉淀先例）

## Purpose

第二轮收口 Guard 沉淀：① 建 `docs/audits/round2-index.md`（37 张 host 面审计卡汇总索引 + P0/P1 全量索引 + CX-n 模式索引）；② **门禁升级**——D3.1–D3.4 四连登记的盲区 `check:audit-event-dispatch-ctx` 不覆盖 4 个 host renderer 包（正则仅 10 个 flux-renderers-\* 包）扩展覆盖 + committed 回归测试（门禁纪律：规则变更必须带 committed 回归测试先红后绿）；承接 D2 路由的 0150-1 stagedDirs 工具治理（裁决后执行）；③ lessons **09 起**续写（第二轮方法论：host 面审计模板 / 模式族回扫方法）；④ bug note 缺口终验（README ↔ live 零缺口复核，D3.x 行内 + DB 回补后终态）；⑤ checklist v2 修订回写（host 模板节执行后回写 + 本轮教训）；⑥ project-context 基线回写 DV full-green 终态 + docs/index.md 登记；⑦ we-1 P3-4 双文档并存治理裁决（`docs/components/word-editor-page/design.md` vs `docs/architecture/word-editor/design.md`）。收口后 roadmap DG 行 `todo`→`done`，closure-audit 由独立 fresh session 执行，mission round-2 全部 work item 收口。

## Current Baseline

（live repo 核对事实，2026-08-08；执行时以 DV full-green 终态复核对）

- **前置依赖**：DR（`2026-08-08-2034-1`）+ DV（`2026-08-08-2034-2`）完成后本 plan 方可执行（roadmap Dependency Graph：DV → DG；DL/DB → DG 已完成）。DV full-green 记录与 watch-only 终态为本 plan project-context 回写依据。
- **门禁盲区登记（D3.1–D3.4 四连，live 核对）**：`scripts/audit/find-event-dispatch-without-ctx.mjs` 扫描正则限定 `/^packages\/flux-renderers-/`（约 :343 处），**不覆盖 flow-designer-renderers / spreadsheet-renderers / report-designer-renderers / word-editor-renderers**——四个 D3.x plan 均人工核零 schema 事件派发点（含 `{event, evaluationBindings, scope}` 形态）并登记「供 DG 门禁升级承接」。参照先例：`check:audit-renderer-browser-io` 已覆盖 14 包（`^packages\/(?:flux-renderers-[^/]+|flow-designer-renderers|spreadsheet-renderers|report-designer-renderers|word-editor-renderers)\//`，0150-1 修复后形态）。
- **0150-1 stagedDirs 工具治理（D2 §7 终态）**：`find-event-dispatch-without-ctx.test.ts:14-32` stagedDirs + 真实包目录夹具模式，D2 路由裁定 = 「工具治理轮次」（D1 未承接）——本 plan 承接裁决（对齐 0150-1 browser-io 夹具治理先例：stagedDirs 局部化 / `FLUX_AUDIT_SCAN_ROOT` env 判别 / 临时目录镜像夹具）。
- **we-1 P3-4 双文档并存（D3.4 登记待 DG）**：`docs/components/word-editor-page/design.md`（组件设计文档）vs `docs/architecture/word-editor/design.md`（架构 owner doc）并存——文档治理项，本 plan 裁决（合并/去重/指针互引后收敛为单一权威）。
- **Guard 素材基线**：37 张 host 面审计卡（fd-1..13 / ss-1..10 / rd-1..7 / we-1..7，全部 closed 或 fixed-pending-closure + 显式路由）；`round2-dr-adjudication.md` 16 条 P2 终态（DR 完成后勾销终态）；`round2-p3-adjudication.md` 零悬挂；bug note 90–116（DB 回补 92–106 + D3.x 行内 90/91 + 107–116）README 索引零缺口（DB 终验 113 = 113 为历史快照；当前 live 122 编号 + 00 指南共 123 索引行，零缺口维持，Phase 1 重跑 diff 终验）；lessons 06–08（`docs/lessons/06-*.md`/`07-*.md`/`08-*.md` + README 索引）——**DG 从 09 起续写**。
- **project-context 基线**：`docs/context/project-context.md` freshness `fresh`（2026-08-06 CV full-green 实测段）——DG 回写 DV full-green 终态后仍维持 fresh。
- **门禁纪律**（roadmap Cross-Cutting）：规则变更必须带 committed 回归测试（`scripts/__tests__/`）且在本 plan 内留痕；不得以「临时改门禁规则」消化新增命中。
- **保护区域地图**：4 host 面包默认 `implement`；`packages/ui/src/index.ts` 公共导出 `ask-first`；结构性重构人工确认。本 plan 门禁升级不触碰包公共导出。

## Goals

- `check:audit-event-dispatch-ctx` 覆盖 4 个 host renderer 包（正则扩展 + committed 回归测试先红后绿 + 全仓零命中验证），D3.1–D3.4 四连登记的盲区闭合。
- 0150-1 stagedDirs 工具治理裁决并落地（对齐 browser-io 夹具治理先例）。
- `docs/audits/round2-index.md`：37 卡索引 + P0/P1 全量索引 + CX-n 模式索引（CX-13+ 未插入时显式声明）。
- lessons 09 起续写（host 面审计模板方法论 + 模式族回扫方法等第二轮沉淀）+ README 索引同步。
- bug note 缺口终验：`docs/bugs/README.md` ↔ live 文件零缺口复核（D3.x 行内 + DB 回补后终态）。
- checklist v2 修订回写（host 模板节执行后回写 + 本轮教训）;we-1 P3-4 双文档并存治理裁决落地。
- project-context 基线回写 DV full-green 终态 + docs/index.md 登记；roadmap DG 行 `todo`→`done` + closure-audit（独立 fresh session）。

## Non-Goals

- 不执行新审计/新修复（DR 已收口；验证已由 DV 完成）。
- 不重跑全量验证（DV 完成；本 plan 只跑门禁升级受影响项）。
- 不插入 CX-13+ 路线图新行（roadmap Rule：人工确认）。
- 不改 `packages/*/src/index.ts` 公共导出（`ask-first` 不在本 plan 授权触发）。
- 不回写已完成历史计划文本（Rule 21）。

## Scope

### In Scope

- 门禁升级：event-dispatch-ctx host 包覆盖（正则扩展 + 夹具/回归测试先红后绿 + 全仓复扫零命中）+ 0150-1 stagedDirs 治理裁决与落地。
- round2-index.md 汇总索引（37 卡 + P0/P1 + CX-n 模式索引）。
- lessons 09 起续写（第二轮方法论沉淀）。
- bug note 缺口终验（README ↔ live 零缺口）。
- checklist v2 修订回写 + we-1 P3-4 双文档治理裁决。
- project-context 回写（DV full-green 终态）+ docs/index.md 登记 + roadmap DG 行收口 + daily log + closure-audit。

### Out Of Scope

- 新审计面/新修复/全量验证（DR/DV 已完成）。
- 路线图新行插入（CX-13+ 人工门）。
- 公共导出变更（ask-first）。

## Failure Paths

| 可测场景编号 | 触发                               | 行为                                                                               | 可重试 | 用户可见表现             |
| ------------ | ---------------------------------- | ---------------------------------------------------------------------------------- | ------ | ------------------------ |
| dg-gate-red  | 门禁扩展后全仓复扫新增命中         | 按门禁语义裁决：先修代码或登记豁免（禁止临时改门禁规则消化）；命中证据带 `文件:行` | 是     | 零命中 exit 0 或显式归因 |
| dg-fixture   | 门禁回归测试夹具与真实仓库竞态     | 对齐 0150-1 先例（temp 目录镜像 / env 判别 / fileParallelism 考量）                | 是     | test:scripts 全绿        |
| dg-doc       | we-1 双文档合并触发 owner-doc 漂移 | 合并后 design.md 与 live baseline 一致（Rule 14：只写最终设计状态）                | 否     | 文档一致性核对           |
| dg-index     | round2-index 与 live 卡状态漂移    | 索引条目 ↔ 卡文件 live 核对（文件:行），零悬挂声明                                 | 是     | 索引可验证               |

## Test Strategy

本档选择：**必须自动化**——门禁升级（event-dispatch-ctx 正则扩展 + 0150-1 stagedDirs 治理）必须带 committed 回归测试（`scripts/__tests__/` 先红后绿，`pnpm test:scripts` 验证；对齐 0150-1 browser-io 夹具先例）；索引/lessons/bug-note 终验/checklist/回写为纯文档交付（`pnpm check` 的 `check:active-doc-code-anchors`/`check:docs-garbled` 覆盖），不新增产品测试。

## Execution Plan

### Phase 1 - 输入盘点与终验

Status: completed
Targets: `docs/audits/host-surface/`（37 卡）、`docs/audits/round2-dr-adjudication.md`、`docs/audits/round2-p3-adjudication.md`、`docs/bugs/README.md` + `docs/bugs/*.md`、`docs/lessons/`、`scripts/audit/find-event-dispatch-without-ctx.mjs` + `scripts/__tests__/`、`docs/architecture/word-editor/design.md` vs `docs/components/word-editor-page/design.md`

- Item Types: `Proof | Decision`

- [x] 37 卡终态核对（Proof）：全部 closed / fixed-pending-closure + 显式路由；DR 表 16 条 P2 终态（DR 完成后勾销状态）；P3 裁决表零悬挂复核——索引素材基线。
- [x] bug note 缺口终验（Proof）：`diff <(ls docs/bugs/*.md) <(README Current Entries 条目)` 零缺口复核（DB 终验先例 113 = 113，D3.x 行内 90/91 + 107–116 后终态）+ 盘点表去向全覆盖复核。
- [x] 门禁盲区清单核对（Proof）：event-dispatch-ctx 正则 live 复核（`find-event-dispatch-without-ctx.mjs` 范围限定）+ 0150-1 stagedDirs 现状核对（`find-event-dispatch-without-ctx.test.ts:14-32`）+ browser-io 覆盖先例（14 包正则）对照。
- [x] we-1 P3-4 双文档并存裁决（Decision）：`docs/components/word-editor-page/design.md` vs `docs/architecture/word-editor/design.md`——内容核对后裁决（合并到 owner doc + 组件文档指针互引 / 或去重收敛为单一权威），结论落 daily log + 卡内注记。

Exit Criteria:

- [x] 索引素材（37 卡 + DR 表 + P3 表）终态核对结论在案；bug note 零缺口终验在案。
- [x] 门禁盲区清单 + we-1 双文档裁决结论在案（Decision 有明确结论，不留空）。

### Phase 2 - 门禁升级（event-dispatch-ctx host 覆盖 + 0150-1 stagedDirs 治理）

Status: completed
Targets: `scripts/audit/find-event-dispatch-without-ctx.mjs`、`scripts/__tests__/find-event-dispatch-without-ctx.test.ts`、`scripts/audit/shared.mjs`（如需要）、`pnpm test:scripts` 验证

- Item Types: `Fix | Proof | Decision`

- [x] event-dispatch-ctx 正则扩展（Fix）：扫描范围从 10 个 `flux-renderers-*` 包扩展至含 4 个 host renderer 包（`^packages\/(?:flux-renderers-[^/]+|flow-designer-renderers|spreadsheet-renderers|report-designer-renderers|word-editor-renderers)\//`，对齐 browser-io 覆盖形态）；**committed 回归测试先红后绿**（`find-event-dispatch-without-ctx.test.ts` 补 host 包正例/负例夹具——对齐 0150-1 browser-io 夹具模式：临时目录镜像 / env 判别，若沿用 stagedDirs 则与 0150-1 治理同步）。
- [x] 0150-1 stagedDirs 治理裁决并落地（Decision + Fix）：`find-event-dispatch-without-ctx.test.ts` stagedDirs 局部化 / `FLUX_AUDIT_SCAN_ROOT` env 判别 / 临时目录镜像夹具（对齐 browser-io 先例），committed 回归测试先红后绿。
- [x] 全仓复扫验证（Proof）：扩展后门禁对真实仓库零命中（或按门禁语义显式归因，禁止临时改规则消化）；D3.x 人工核零命中结论与门禁输出对照。
- [x] `pnpm test:scripts` 全绿（含新增门禁回归用例）；受影响门禁 exit 0 复核。

Exit Criteria:

- [x] 门禁扩展 + stagedDirs 治理落地（先红后绿证据在案）；全仓复扫零命中（或显式归因）。
- [x] `pnpm test:scripts` 全绿 + 受影响门禁 exit 0；D3.1–D3.4 四连登记盲区闭合回写（daily log）。

### Phase 3 - round2-index 汇总索引

Status: completed
Targets: 新建 `docs/audits/round2-index.md`（先例：`docs/audits/per-component/pc-index.md`）、`docs/audits/host-surface/README.md`（索引互引登记）、`docs/index.md`（导航登记）

- Item Types: `Fix | Proof`

- [x] 37 卡索引（fd/ss/rd/we 分面，每卡：面身份 + 卡状态终态 + P0/P1 发现清单 + 路由终态引用）。
- [x] P0/P1 全量索引（**live 核对终态：本轮 P0 零、14 条 P1 + 7 条低成本 P2 当场修复 + 16 条 DR 路由**，per-D3.x 分解：D3.1 = 2 P1 + 0 低成本 P2 + DR-1/2；D3.2 = 4 P1 + 2 低成本 P2 + DR-3..6；D3.3 = 3 P1 + 1 低成本 P2 + DR-7..11；D3.4 = 5 P1 + 4 低成本 P2 + DR-12..16；另 DR plan（2034-1）可能再增——执行时以各 plan Status Note + daily log 复核为准）——对齐 pc-index 先例结构。
- [x] CX-n 模式索引（CX-13+ 未插入 → 显式声明「本轮无共性插入」，并索引 D1/D3.x 的零共性声明证据）。
- [x] README / docs/index.md 登记（导航行 live 核对有效）。

Exit Criteria:

- [x] `round2-index.md` 在案且与 live 卡状态零漂移（逐卡核对）；README/docs/index.md 登记完成。

### Phase 4 - lessons 09+ 续写 + checklist 修订 + 基线回写 + 收口

Status: completed
Targets: `docs/lessons/09-*.md`（+ README 索引）、`docs/audits/component-audit-checklist.md` v2（host 模板节回写）、`docs/context/project-context.md`（DV full-green 回写）、`docs/logs/2026/08-08.md`、`docs/backlog/component-audit-round2-roadmap.md`（DG 行）

- Item Types: `Fix | Proof | Follow-up`

- [x] lessons 09 起续写（Fix，纯文档）：第二轮方法论沉淀——09 host 面审计模板方法（18 维降维 + H1–H7 应用、每面 ≥1 真实浏览器宿主场景纪律）、10 模式族回扫方法（事件 ctx / reaction 三件套 / scope 配对 / i18n 硬编码 + 门禁盲区教训：扫描器正则覆盖范围必须含 host 包）；证据全部来自本轮执行（live 核对）；README 索引同步。
- [x] checklist v2 修订回写（Fix，纯文档）：host 模板节（§6）执行后回写（模板有效性结论 + 本轮教训），不重写历史 18 维组件级清单。
- [x] project-context 基线回写（Fix，纯文档）：DV full-green 终态（typecheck/build/lint/test/e2e 计数 + watch-only 终态清单 + `pnpm check` 终态）回写 freshness `fresh` 段 + component-audit-round2 mission 状态行（全部 work item done）。
- [x] bug note 缺口终验复核（Proof）：README ↔ live 零缺口终态（Phase 1 后如有新增补写则复核）。
- [x] 收口登记（Follow-up）：roadmap DG 行 `todo`→`done`（附执行证据）、daily log 收口节、docs/index.md 登记终验。

Exit Criteria:

- [x] lessons 09+ 与 checklist 修订落地（live 核对一致性）；project-context 回写完成（DV 终态在案）。
- [x] roadmap DG 行 `done` + daily log 收口节 + 索引零漂移（closable 状态交独立 closure-audit 裁决）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session）——轮 1 `ses_01e9e8726ffei6BRUiqcPWSWMN`（fail，1 Major）；轮 2 `ses_01e9224b9ffebxjrzIwHe2FrZ6`（pass，零 Blocker/Major）
- Verdict: `pass`（轮 2 共识达成；2 Minor 已当场修正）
- Rounds: 2
- Findings addressed:
  - Major-1（轮 1）：Phase 3 P0/P1 索引计数错误（11 P1 + 8 P2 → live 14 P1 + 7 低成本 P2 + 16 DR 路由）→ 全量更正并补 per-D3.x 分解（D3.1 2/0、D3.2 4/2、D3.3 3/1、D3.4 5/4）+「DR 可能再增，执行时复核」注记。
  - Minor（轮 2）：P0/P1 索引补「P0 零」显式声明；bug note 基线「113 = 113」改历史快照 + 当前 live 122 + 00 指南共 123 索引行注记（Phase 1 重跑 diff 终验）。

## Closure Gates

> **关闭条件**：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证由 DV 完成；本 plan 跑门禁升级受影响项验证。closure-audit 由独立 fresh session 执行，执行 session 不得自审勾选。

- [x] 门禁升级落地（event-dispatch-ctx host 覆盖 + 0150-1 stagedDirs 治理，committed 回归测试先红后绿在案）
- [x] round2-index.md 37 卡 + P0/P1 + CX-n 索引零漂移
- [x] lessons 09+ 续写 + checklist v2 修订回写（live 一致性）
- [x] bug note 缺口终验零缺口（README ↔ live）
- [x] we-1 P3-4 双文档治理裁决落地
- [x] project-context 基线回写（DV full-green 终态）+ docs/index.md 登记
- [x] roadmap DG 行 `done` + daily log 收口；不存在被静默降级项
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### CX-13+ 共性缺陷行插入

- Classification: `watch-only residual`
- Why Not Blocking Closure: D1 已显式声明无共性缺陷、D3.x 未发现需插入的机制级共性模式（有发现仅登记待裁）；roadmap Rule 规定新 work item 由人工确认后插入，AI 不自行增删。
- Successor Required: `yes`（人工确认后）
- Successor Path: roadmap 表/依赖图/Cross-Cutting（人工确认后）

### 60Hz 环境 e2e 复测（gantt-perf/kanban-perf）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本机 50Hz 主屏物理不可达 60Hz 阈值；D2/DV 均已归因记录。
- Successor Required: `no`
- Successor Path: 无

### industrial-hmi 审计

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: mission description 明确排除（分支未合并，另立 successor mission）。
- Successor Required: `yes`
- Successor Path: 另立 mission（人工决定）

## Non-Blocking Follow-ups

- 门禁升级后如发现新盲区（如 test-global-leaks 对 host 包作用域有限——D3.1 登记）：登记 daily log，后续工具治理轮次承接。
- 其余不阻塞治理项登记 daily log。
- 无剩余 plan-owned work（收口后 mission round-2 全部 work item done）。

## Closure

Status Note: Phase 1-4 全 completed（2026-08-09）；37 卡终态 + bug note 126=126 零缺口 + 门禁盲区核对 + we-1 双文档裁决（分工并存收敛）在案；门禁升级落地（`check:audit-event-dispatch-ctx` 正则扩展 14 包 + 0150-1 stagedDirs 治理（temp 镜像 + `FLUX_AUDIT_SCAN_ROOT` env），committed 回归测试先红后绿（RED 2 失败 → GREEN 6/6），`pnpm test:scripts` 6/18 全绿 + 全仓复扫零命中 exit 0）；round2-index 建成（37 卡 + P0 零/P1×14/低成本 P2×7/DR-1..17 终态 + CX-n 零插入声明）；lessons 09/10 + checklist v2 §6 回写 + project-context 回写 DV full-green 终态（fresh 维持）+ docs/index.md 登记；roadmap DG 行 `todo → done`（附执行证据）；`pnpm check` exit 0 复核 + `pnpm typecheck`/`build`/`lint` 32/32 + `pnpm test` 59/59（DV full-green 承接基线）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_01cef4562ffe2Tm71c37S4zldA`，2026-08-09
- Evidence: verdict `approved`——零 Blocker/Major，2 项 informational（Minor-1：plan Phase 1 item 文本「DR 表 16 条」为历史措辞，live 17 条（DR-17 执行中发现）已正确记录于 daily log/Status Note/round2-index，按 guide Rule 21 不回写历史计划文本；Minor-2：project-context DV 基线块内 `test:scripts 6/15` 为 DV 时点快照引用，DG 后 6/18 已补注）。逐项核对：A. plan 文本——Phase 1-4 全 `Status: completed` + 全部 item/Exit Criteria `[x]`，Plan Status 保持 active 待本收口；B. 37 张 host 面卡 live `grep 状态: closed` = 37/37（README/surface-inventory 非卡）；C. DR 表 17 条全部 terminal（FIXED ×14 + ADJUDICATED ×3，:29/:40/:41）；D. bug note `comm` 仅 README.md 自引用差异，126 = 126 零缺口；E. 门禁升级——14 包正则（mjs:366）+ `FLUX_AUDIT_SCAN_ROOT` env（:55-57）+ 测试 temp 镜像夹具（test.ts:26-51，无仓库包目录残留）+ 6 用例含 3 host 夹具；实测 `pnpm test:scripts` 6/18 全绿 + `pnpm check:audit-event-dispatch-ctx` 零命中 exit 0；F. round2-index 在案（37 卡 + 14 P1 + P0 零显式 + CX-n 零插入证据链），README/docs/index 登记；G. lessons 09/10 + README 索引 + checklist §6 回写 + project-context DV full-green 终态（fresh 维持）+ roadmap DG 行 `done`（7 列规范）+ daily log 08-09 DG 节；H. deferred 诚实性——watch-only/out-of-scope 均带非阻断理由，无确认 live defect 降级。收口动作由执行 session 依本证据勾选 Closure Gates（按既有 executor-backfill 机制，DV/D3.2 同款）。

Follow-up:

- 门禁升级后新盲区登记（test-global-leaks 对 host 包作用域有限——D3.1 登记）：维持 daily log 登记，后续工具治理轮次承接（与 D3.1 结论一致，无本 plan-owned work）。
- no remaining plan-owned work（mission round-2 全部 work item done）。
