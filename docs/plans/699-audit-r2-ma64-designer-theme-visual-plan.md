# 699 审计修复 R2·MA6.4：UX 视觉审计—designer/office 界面视觉 + 全局主题一致性 + ui 原语易用性

> Plan Status: completed
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA6.4；`docs/audits/arm2-scope-and-dimension-matrix.md` MA6.4 行（报告名注册 `*arm2-MA6.4-designer-theme-visual.md`；叠加 `docs/skills/ux-design-pattern-audit-prompt.md` + 全局主题一致性〔CSS 变量覆盖、`check:audit-ui-consistency-gaps`、`check:ui-family-nesting`、对比度抽查、焦点陷阱/键盘可达〕）；方法论 `docs/skills/visual-page-quality-inspection-prompt.md`；owner doc `docs/architecture/theme-compatibility.md`
> Related: matrix MA6 节、`docs/audits/arm2-index.md`、MA6.1–6.3 先例（capture T 族在案未修——dark/default 疑点 fresh-load 探针复证；页头壳族 P2-MA6.3-003 实见面清单待本批增补 designer 面）、MA5.1/5.3 交互走查先例（页面域重叠、镜头不同）
> 共管引用（**引用不重开，非重走查**）：MA6.2 P2-MA6.2-006（print-designer dark 画布内容色吃主题前景——本批全局一致性/语义色镜头核销其 MA6.4 侧义务）；MA6.1 P2-005 族面（scada-editor-demo @800 溢出 298px——本批 Round A chrome 面响应式抽查核销）
> 方法先例沿用：`_tmp/arm2-ma64/` 中间件（收口清理；截图永不入库）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

对 designer/office 界面 8 页做 light+dark 双主题视觉走查 + 全局主题一致性核查（CSS 变量覆盖 / 一致性扫描器 / 对比度抽查 / 焦点陷阱与键盘可达）+ ui 原语经宿主面易用性抽查（ux-design-pattern skill 口径，记录级），产出 arm2 报告并登记 arm2-index；零入库代码变更。

## Current Baseline（2026-10-23 live，HEAD `9e09a07c5`）

- **走查面**（8 页，inventory 实存）：flow-designer、taskflow-designer、report-designer、report-designer-host、spreadsheet、word-editor、debugger-lab、scada-editor-demo（编辑器 chrome 面——画布/预览面已在 MA6.3 走查；print-designer 已在 MA6.2 走查，均不重开）。
- **全局主题一致性面**（非页面）：`check:audit-ui-consistency-gaps`、`check:ui-family-nesting` 扫描器 live 复跑 + 对比度抽查（跨页语义色采样）+ 焦点陷阱/键盘可达抽查（弹层族 Tab/Esc 行为）。
- **余量声明**：dingtalk-flow-demo homeVisible=false 无 live 路由（存量条目清理归 QA.7 残余债登记册，不占本轮）；lab designer carrier 归 R2-2 台账。
- **既有机制**：`pnpm visual:capture`（复用 4175）；capture T-1/T-2/T-C2 已立案未修（T-1 已 4 轮复发）。
- **执行状态**：roadmap MA6.4 `todo`；arm2-index MA6.4 行 `—`。
- **环境**：dev server 4175 共享在跑。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA6.4-designer-theme-visual.md`（矩阵注册名 designer-theme-visual）：finding P0–P3（P1 ID `P1-MA6.4-<nnn>`）+ A–H 维度归类 + light/dark 平价 + 全局主题一致性结论 + ui 原语易用性记录级。
- 覆盖面（两轮 + 执行者对账；字母批拆分预授权）：
  - ① **Round A · designer 族 4 页**（flow-designer/taskflow-designer/scada-editor-demo chrome/debugger-lab）：capture light+dark → 迭代式评审 → A3/B1 批扫双态 → 面板/工具栏/属性页签 dark 适配 + 焦点环可达抽查
  - ② **Round B · office 族 4 页**（report-designer/report-designer-host/spreadsheet/word-editor）：同口径；编辑器 chrome（工具栏/检查器/标尺/页签）dark 适配 + 响应式抽查 2 页
  - ③ **全局主题一致性（执行者）**：两扫描器复跑对比 M0 基线；跨页语义色对比度抽查；弹层焦点陷阱抽查（沿 MA5 已走查面引用不重开，仅视觉/可达镜头）
  - ④ **ui 原语易用性（记录级）**：ux-design-pattern skill 口径抽查宿主面按钮/表单/弹层原语的行业惯例符合度
- 登记 arm2-index（MA6.4 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修改入库代码（P0 除外）；截图永不入库；perf 归 MA7.1/7.3 静态扫描不重开（一致性扫描器仅复跑对比基线）；MA5.1/5.3 已立案交互缺陷不重开（引用）；MA6.1–6.3 已走查页面不重开；ui 原语易用性为记录级（不改写不阻断）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA6.4 报告 + arm2-index 登记回填；`_tmp/arm2-ma64/` + `_tmp/visual-inspection-<date>/` 实跑；daily log 追加；roadmap MA6.4 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 任何入库代码/测试/配置变更（P0 除外）；MA7+ / MR / MV / MG；并发线未提交变更；截图入库。

## Failure Paths

| 可测场景编号    | 触发                    | 行为                                                 | 可重试 |
| --------------- | ----------------------- | ---------------------------------------------------- | ------ |
| e2e-env-failure | dev server/capture 失效 | 归因修复后重跑                                       | 是     |
| probe-flaky     | 评审结论漂移            | 双评（冲突 → 第三评）；仍不稳 → watch-only           | 是     |
| audit-p0-found  | Rule 2 六类之一         | 即时通道                                             | 否     |
| subagent-quota  | 限流/模型失败           | fresh 重启一次；再败执行者亲跑                       | 是     |
| round-overflow  | 单轮超上限              | **字母批拆分（MA6.4-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：两域视觉走查 + 全局一致性

Status: completed
Targets: `_tmp/arm2-ma64/round-{A,B}.md`、`_tmp/visual-inspection-<date>/`

- Item Types: `Proof | Decision`

- [x] **Round A · designer 族 4 页**（子代理三连 API 失败 → **执行者亲跑**〔偏差落账〕）：capture 12+4 全健康 + 扫描双态 + 6 张评审；RA-F1 归 P1-MA6.1-001 族面（DataViewer 源码定罪 :539）+ scada-editor 298 精确复现 + fd-edge-label 族面 ×5
- [x] **Round B · office 族 4 页**（子代理）：capture 16 + 探针 rb1-rb4；P2 ×1（host 预览按钮死亡）+ P3 ×2 + 族面 +2 型；dark 4/4 零违规；T-1 第 5 轮复发归档
- [x] **执行者对账 + 全局一致性**：双扫描器 exit 0 零新增；P2-MA6.3-003 designer/office 零命中（收敛证据）；共管两条核销落字；suspects 全 0；族面归属裁决（RA-F1→P1-MA6.1-001）

Exit Criteria:

- [x] 两轮台账 + 平价表（7/8）+ 全局一致性结论落字
- [x] 分类/分级/归属/归族 + 族面归属复核实录；suspects 全核销

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 RA-F1 DataViewer 源码定罪归族；R2 页头壳族收敛验证 designer/office 零命中），末轮显式停止
- [x] MR3 / MG / MA7.3 交叉线索分栏（MR3 +P2-MA6.4-001；MA7.3 +族面增量；工具修复批 T-1 5 轮；文案治理 +记录级 3）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-0706-arm2-MA6.4-designer-theme-visual.md`：两轮 + T-1 第 5 轮裁决 + 共管核销 + P2 ×1 + 族面增量 + ui 原语记录级 + watch-only 4 + open 两轮 + 收口补记）
- [x] arm2-index：MA6.4 行 + Last Updated 滚动（P1 零新案、累计 63 不变；P2 留报告 deferred——索引纪律核验 0 P2 行），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [x] 清理 `_tmp/arm2-ma64/` 与 `_tmp/visual-inspection-2026-10-23/`（closure audit R1 通过后执行）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：MA6.4 行路径实存；索引 0 P2 行纪律核验）
- [x] BUILD_VERIFY exit 0 登记（closure R1 m4：清理后 fresh 重跑四门禁并登记）；截图零入库核验（`git diff HEAD --name-only -- apps/ tests/` = 0）

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA6.4 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_84480608`）R1 **`approved`**（0B/0M/5m——审计员独立 md5 复现 P2-MA6.4-001 字节级证据 + DataViewer 源码链核实；5m 均随本 commit 落地：m1 watch #1 归属修正+去重、m2 capture 计数勘误、m3 族面 +6 勘误+handle 排除记录、m4 清理后 fresh 四门禁重跑登记、m5 本节勾选流转）后：roadmap MA6.4 `planned`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_c175115e`（8 页 id 全实存 R2-1b、roadmap :81 / 矩阵 :125 / arm2-index :91、HEAD `9e09a07c5`、skill/owner doc、两扫描器 package.json 在册、print-designer/scada-editor 排除先例、dingtalk homeVisible=false :533、T 族 4 轮在案、guide 合规全绿、无 home-fallback 风险）
- Verdict: R1 `revised`（0B/1M/1m）→ 回修共识
- Rounds: 1
- Findings addressed: M 两条 MA6.4 共管交接引用落字（P2-MA6.2-006 print 画布内容色 / scada-editor @800 溢出——Related + Phase 1 ③ + Round A 镜头 + Phase 3 报告结构四处）；m 既有族面增量引用折入 Phase 1 ③——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 截图与探针已全部删除（`_tmp/arm2-ma64/` + `_tmp/visual-inspection-<date>/` 清理；`git status` 无 png 入库）
- [x] roadmap Work Item Status MA6.4 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4；closure m4 fresh 重跑）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 8 页 designer/office 视觉走查 + 全局主题一致性收官——**MA6 批次（6.1–6.4）全部 done**（P1 零新案；P2 ×1 新案〔host 预览按钮死亡〕+ P3 ×2 + 族面增量〔P1-MA6.1-001 +1 designer 宿主实证 / P2-006 +6 勘误 / P2-005 +1 面 / scada-editor 298 复现〕+ 页头壳族 designer/office 零命中 + 双扫描器 0 新增 + ui 原语记录级通过 + T-1 第 5 轮复发归档）；字母批裁定：未拆分——两轮全覆面（A 4 + B 4 = 8）；Round A 执行者亲跑偏差如实落账；dark 平价 7/8；零入库代码变更核验通过。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_84480608`（R1）
- Evidence: R1 **`approved`**（0B/0M/5m，5m 均随本 commit 落地）。审计员独立复核：**P2-MA6.4-001 md5 复现**（preview click 前后双主题 PNG 字节相同对 + rb3-interactions.json disabled:false/dialog:null）；**RA-F1 源码链核实**（designer-page-body.tsx:539 DataViewer → json-viewer.tsx:65 → :25 defaultStyles——P1-MA6.1-001 机制同链）；63 open 逐行清点（4 P0 closed + 59 P1 open + 注记文本）；共管两条核销（scada-editor @800 ovf=298 精确复现 ra-scan.json）；双扫描器日志在案匹配 §3；Round A 降级 COMPLIES（四处落账 + 证据在案）；zero-code-change 双跑核实。

Follow-up:

- no remaining plan-owned work；P2-MA6.4-001 修复行在 MR3 队列；P1-MA6.1-001 单点修复将同清 lab-json-view + flow-designer 两宿主面；MA7.3 +族面增量；visual-quality 工具修复批 T-1（5 轮复发，最高优先）。

Follow-up:
