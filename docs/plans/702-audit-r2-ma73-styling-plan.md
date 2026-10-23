# 702 审计修复 R2·MA7.3：样式审计—契约合规、BEM 漂移、marker 完整性、暗色模式变量覆盖缺口

> Plan Status: completed
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA7.3；`docs/audits/arm2-scope-and-dimension-matrix.md` MA7.3 行（报告名注册 `*arm2-MA7.3-styling.md`；`check:audit-styling-suspects`；BEM 漂移（`--` 修饰符）；marker 完整性；暗色模式变量覆盖缺口）；owner doc `docs/architecture/renderer-markers-and-selectors.md`
> Related: matrix MA7 节、`docs/audits/arm2-index.md`、MA6.1–6.4 视觉走查族面线索（语义色亮度族 P2-MA6.1-004、页头壳族 P2-MA6.3-003、json-viewer P1-MA6.1-001 等的样式侧收口归本批交叉）；MA1.4 样式 marker 结构契约线索（引用不重开）
> 方法先例沿用：`_tmp/arm2-ma73/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

全仓样式审计：styling-suspects 扫描器全量+人工复核；BEM `--` 修饰符漂移盘点；design.md marker 契约完整性抽查；暗色模式 CSS 变量覆盖缺口（token 四块对称性 + MA6 族面的样式侧收口归并）；产出 arm2 报告并登记 arm2-index；零入库代码变更。

## Current Baseline（2026-10-23 live，HEAD `4cf8137cb`）

- **扫描器**：`check:audit-styling-suspects`（M0 基线在册则对比）。
- **token 面**：`packages/theme-tokens/src/styles.css`（classic/glass × light/dark 四块对称——MA6.x 已验证 token 溯源率高）。
- **待消费线索（样式侧收口归并，引用不重开）**：P1-MA6.1-001（ui json-viewer dark 字面色——`.nop-json-viewer` 作用域覆写修复面）、P2-MA6.1-004（语义色亮度体系——`--warning-*`/`--success-*`/badge secondary 令牌收口）、P2-MA6.3-003（页头壳 `bg-white` 族——bg-card 令牌替换）、MA6.2 P2-MA6.2-003（主色蓝小字令牌变体）、flux-basic 字面块。
- **执行状态**：roadmap MA7.3 `todo`；arm2-index MA7.3 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA7.3-styling.md`（矩阵注册名 styling）：finding P0–P3（P1 ID `P1-MA7.3-<nnn>`）。
- 覆盖面（单轮子代理 + 执行者扫描；字母批拆分预授权）：
  - ① **styling-suspects 全量+人工复核**（子代理）：复跑对比基线；新增/存量命中抽检（真嫌疑 vs 豁免正当性）
  - ② **BEM 漂移盘点**（子代理）：`--` 修饰符类名全仓 grep → 对照 renderer-markers 契约（marker/data-slot 非 BEM）逐个定罪/豁免
  - ③ **marker 完整性抽查**（子代理）：design.md §10 marker/data-slot 清单 × 渲染实现 × CSS 规则三点对照（抽样 ≥6 复杂组件族）
  - ④ **暗色模式变量覆盖缺口**（子代理+执行者）：token 四块对称性核对；字面色/硬编码暗色缺口盘点（MA6 族面收口归并落字）
- 登记 arm2-index（MA7.3 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修复样式缺陷（P0 即时通道除外）；MA6 已立案视觉缺陷不重开（样式侧收口归并引用）；MA6.4 一致性扫描器复跑不重复（引用其当轮 0 新增结论）；`check:ui-consistency` 族已在 pnpm check 日常门禁（不另跑）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA7.3 报告 + arm2-index 登记回填；`_tmp/arm2-ma73/` 实跑；daily log 追加；roadmap MA7.3 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 样式修复实现；MA7.1/7.2 / MA8+ / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号   | 触发            | 行为                                                 | 可重试 |
| -------------- | --------------- | ---------------------------------------------------- | ------ |
| tool-failure   | 扫描器失效      | 归因后重跑或手动等价 grep 留痕                       | 是     |
| audit-p0-found | Rule 2 六类之一 | 即时通道                                             | 否     |
| subagent-quota | 限流/模型失败   | fresh 重启一次；再败执行者亲跑                       | 是     |
| round-overflow | 单轮超上限      | **字母批拆分（MA7.3-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - single：扫描器 + 三专项盘点

Status: completed
Targets: `_tmp/arm2-ma73/round-A.md`、`_tmp/arm2-ma73/tool-styling.log`

- Item Types: `Proof | Decision`

- [x] **Round A · 扫描器复核 + 三专项**（子代理）：基线抽检 10 样本 + BEM 盘点（收敛 2 包 ~18 处）+ marker 6 族三点对照 + 暗色对称/字面 602 全清单；P2 ×2 + P3 ×6；基线校准 255
- [x] **执行者 · 扫描器实跑**：255 = 注册基线（exit 0）——与子代理镜像重算三方吻合
- [x] **执行者对账**：MA6 四条收口归并全部实证仍在（本报告为样式侧权威底稿）；P1 零新案核验

Exit Criteria:

- [x] 扫描器复核 + BEM 台账 + marker 抽查表 + 暗色缺口清单落字
- [x] MA6 族面收口归并 + P1 零新案核验

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 基线校准 240→255 三方吻合；R2 MA6 收口完整性 + 4 未入册族 dark 处理核对），末轮显式停止
- [x] MR3 / MG 交叉线索分栏（MR3 +P2-001/P2-002；BEM 迁移批候选；MV 修正输入 255；文档同步批；MG 零新增）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-0924-arm2-MA7.3-styling.md`：基线校准裁决 + P2 ×2 + P3 ×6 + marker 6 族 + 暗色覆盖 + MA6 收口归并 + watch 3 + open 两轮 + 收口补记）
- [x] arm2-index：MA7.3 行 + Last Updated 滚动（P0/P1 零立案、累计 64 不变），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [x] 清理 `_tmp/arm2-ma73/`（closure audit R1 通过后执行）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：MA7.3 行路径实存；P0/P1 零立案核验）
- [x] BUILD_VERIFY exit 0 登记（gate-\*.exit 全 0）

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA7.3 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_237931c7`）R1 **`approved`**（0B/0M/3m——审计员 live 复跑扫描器 255/exit 0 三方吻合 + 棘轮链 240→255 逐点核实 + spreadsheet §10 禁令 verbatim :134 + P2-002 use-gantt-drag.ts:37 零 CSS 核实；3m 均为 advisory 随收口处置：m1 「57 处」计数口径在 MR3 执行时重推导并勘正（已入 Non-Blocking Follow-ups）、m2 随本 commit 自解、m3 P3/P4 标注已按建议改写）后：roadmap MA7.3 `planned`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_e11470c1`（roadmap :84 / 矩阵 :133 / arm2-index :94、HEAD `4cf8137cb`、扫描器 + M0 基线 240、token 四块对称结构 ：137/:201/:270/:334、BEM 契约定义对照 renderer-markers :32、MA6 四条收口归并线索逐一实存且 MA6 报告自身即声明路由 MA7.3、MA6.4 一致性复跑结论引用核实、guide 合规全绿、行行为笔误确认 0 残留）
- Verdict: R1 `approved`（0B/0M/2m）
- Rounds: 1
- Findings addressed: m1 Last Reviewed 随本激活落日期；m2 plan 文件随收口显式路径提交（不悬挂）——均已落字/预声明

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma73/` 清理）
- [x] roadmap Work Item Status MA7.3 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 全仓样式审计收官——**MA7 批次（7.1–7.3）全部 done**（P0/P1 零立案；P2 ×2 新案〔spreadsheet 自违反 §10 / gantt drop-indicator〕+ P3 ×5 + P4 备注 ×1（closure m3 重标注）+ **基线校准 255** 三方吻合 + BEM 收敛 2 包 + token 四块对称 + MA6 四条收口归并全部实证仍在 + 4 未入册族 dark 处理 watch）；字母批裁定：未拆分；零业务代码变更核验通过。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_237931c7`（R1）
- Evidence: R1 **`approved`**（0B/0M/3m——3m 均 advisory：m1 「57 处」计数口径 MR3 执行时重推导（实质不受影响：127 扫描命中精确、§10 禁令 verbatim design.md:134、toolbar ×11 精确）；m2 「7.1–7.3 全部 done」随本 commit 自解；m3 P4 备注重标注已落）。审计员独立复核：**live 复跑扫描器 255/exit 0** 与执行者实跑 + 子代理镜像重算三方吻合；棘轮链 240→244→247→249→252→255 在 scanner-baselines.json 逐点核实（plans 665-669 移动批 M7-M11）；P2-002 `use-gantt-drag.ts:37` 无命名空间 + 全仓零 CSS 规则核实；token 四块 :137/:201/:270/:334 + --popover deliberate 不对称（plan 500 R2-4 注记）核实；MA6 四条收口线索源位置逐一仍 live（含 P2-MA6.3-003 bg-white **精确 13 文件**）；zero-code-change 双跑核实。

Follow-up:

- no remaining plan-owned work；P2-MA7.3-001/002 修复行在 MR3 队列（P2-001 根作用域化时按声明口径重推导计数并勘正报告）；BEM 迁移批候选（2 包 ~18 处）；MV 终验对比输入修正（styling 基线 255）；文档同步批（dashboard §10 表、gantt §10 同步）；MA8.1（文档契约）为下一工作项。

Follow-up:
