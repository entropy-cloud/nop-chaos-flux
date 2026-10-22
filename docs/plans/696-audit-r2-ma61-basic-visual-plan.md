# 696 审计修复 R2·MA6.1：UX 视觉审计—basic+form+data 页面视觉走查（light+dark）

> Plan Status: completed
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA6.1；`docs/audits/arm2-scope-and-dimension-matrix.md` MA6.1 行（报告名注册 `*arm2-MA6.1-basic-visual.md`）；方法论 `docs/skills/visual-page-quality-inspection-prompt.md`（A–H 维度 + 迭代式多模态评审 + WCAG 2.2 程序化判据）；截图矩阵机制复用 `docs/audits/visual-quality-r2/`（`pnpm visual:capture`，重新取证）；owner doc `docs/architecture/styling-system.md`
> Related: matrix MA6 节、`docs/audits/arm2-index.md`、`docs/audits/visual-quality-r2/inventory/pages.json`（页面清单源）、MA5.1–5.6 方法先例（plan 690–695）
> 方法先例沿用：`_tmp/arm2-ma61/` 中间件（收口清理；截图永不入库）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

对 basic+form+data 面 40 条 playground 页面做 light+dark 双主题视觉走查：`pnpm visual:capture` 截图矩阵（落 `_tmp/`，永不入库）+ 迭代式多模态评审（自由 critique → A–H 维度 grounding → 程序化取证）+ 六态核对，产出 arm2 报告并登记 arm2-index；零入库代码变更。

## Current Baseline（2026-10-23 live，HEAD `eb71b86ec`）

- **走查面**（40 页，`docs/audits/visual-quality-r2/inventory/pages.json` 全实存已核）：
  - **basic/data demo（10）**：flux-basic、standard-crud、tree-crud、crud-views-export、inline-edit-table、detail-subtables、performance-table、table-popover、table-column-width、data-verify
  - **form + w 族 + antdpro form/list（15）**：complex-form、form-wizard、condition-builder-formula、form-input-enhancements、w2a-data-composition、w3c-value-mapping、w3d-advanced-input-family、w4c-composite-form-family、m4-data（eyebrow 为 Mobile Data Display，但主 content 为 data-display 渲染器〔crud toolbar/chart〕——本轮按 data 面走查，移动端框架面归 MA6.2）、antdpro-form-basic、antdpro-form-grouped、antdpro-form-dialog、antdpro-form-step、antdpro-list、antdpro-detail-basic
  - **lab carrier（15）**：lab-badge、lab-card、lab-cards、lab-status、lab-tag-list、lab-json-view、lab-dialog、lab-drawer、lab-form、lab-input-table、lab-crud、lab-table、lab-list、lab-data-source、lab-dropdown-button
- **既有机制**：`pnpm visual:capture --routes <id,...>` → `_tmp/visual-inspection-<date>/<route>-<state>-<viewport>-<theme>.png` + `capture-report.json`（home-fallback suspect 检测）；主题经 `data-mode` 显式设置（emulateMedia 不可靠——plan 496 wave1 R2-2a-B5-34 在案）；交互态经 `scripts/visual-quality/interactions.mjs` 注册表。
- **执行状态**：roadmap MA6.1 `todo`；arm2-index MA6.1 行 `—`。
- **环境**：dev server 4175 共享在跑（capture 复用 live server）。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA6.1-basic-visual.md`（矩阵注册名 basic-visual）：finding P0–P3（P1 ID `P1-MA6.1-<nnn>`）+ A–H 维度归类 + light/dark 平价核对 + 归属归族。
- 覆盖面（三轮；字母批拆分预授权见 Failure Paths）：
  - ① **Round A · basic/data demo 10 页**：截图矩阵（light+dark ×1280x800）+ A–H 走查 + 24px 目标尺寸/对比度程序化批扫 + dark 平价复检
  - ② **Round B · form + w 族 + antdpro 15 页**：同口径；表单族附加 error/disabled/readonly 态视觉完备性（六态）
  - ③ **Round C · lab carrier 15 页**：同口径；控件级 carrier 的 token 追溯抽查（B4 走令牌不走字面）
  - ④ **响应式抽查**：每轮抽 3–5 代表页加 800x900 viewport（窄视口排布，维度 C4/H9）
  - ⑤ **执行者对账**：交叉去重 + 分级归属归族 + P1 live 复核 + capture-report suspects 核销
- 登记 arm2-index（MA6.1 行 + P1 行 + P0 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`（Closure Gates 预声明）。

## Non-Goals

- 不修改入库代码（P0 除外）；截图永不入库（`_tmp/` 政策）；**走查面为 40 页代表抽选**——库存 134 条 lab-renderer 路由中余约 110 条 basic/form/data 族 carrier 不在本轮（其控件级覆盖已由此前 visual-quality-r2 R2-2 控件卡 + watch-pool 台账承载，本报告 deferred 区留痕该归属，`done` 翻转以此为文本基础）；MA6.2/6.3/6.4 的页面域不重开（content/mobile/ai/scheduling/domain/designer）；组件级交互品质深度排查归 complex-component skill（MA5 已走查）；MA7.3 样式契约静态扫描不重开（B4 仅页面级抽查）；对比度全量批扫仅抽样（每轮 ≥5 页全元素扫描，非全仓）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA6.1 报告 + arm2-index 登记回填；`_tmp/arm2-ma61/` + `_tmp/visual-inspection-<date>/` 探针与截图实跑；daily log 追加；roadmap MA6.1 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 任何入库代码/测试/配置变更（P0 除外）；MA6.2+ / MA7+ / MR / MV / MG；并发线未提交变更；截图/证据卡入库。

## Failure Paths

| 可测场景编号    | 触发                                  | 行为                                                                                            | 可重试 |
| --------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| e2e-env-failure | dev server/capture 工具失效           | 归因修复后重跑（capture 复用 4175；home-fallback suspect 页须单页归因——dead route vs 路由错拍） | 是     |
| probe-flaky     | 截图评审结论漂移                      | 双评（两次独立初评冲突 → 强制第三评，skill 迭代式评审口径）；仍不稳 → watch-only                | 是     |
| audit-p0-found  | Rule 2 六类之一（如 dark 全页不可读） | 即时通道                                                                                        | 否     |
| subagent-quota  | 限流/模型失败                         | fresh 重启一次；再败执行者亲跑                                                                  | 是     |
| round-overflow  | 单轮超上限                            | **字母批拆分（MA6.1-a/-b/-c，Cross-Cutting 5 预授权）或移交 Phase 2 台账留痕**                  | 否     |

（"用户可见表现"列不适用——本表各行为流程性失败路径，非产品行为场景。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更；截图为临时诊断素材非测试证明，pass/fail 全部程序化）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：三域视觉走查

Status: completed
Targets: `_tmp/arm2-ma61/round-{A,B,C}.md`、`_tmp/visual-inspection-<date>/`

- Item Types: `Proof | Decision`

- [x] **Round A · basic/data demo 10 页**（子代理）：capture 22 张 + 响应式 10 页 + 自证据 40 张；0 P0/P1 + 4 P2（F1 白岛/F2 溢出/F3 分页裁切/F4 徽章字面色）+ 工具缺陷 T-1 定性
- [x] **Round B · form + w 族 + antdpro 15 页**（子代理）：capture 54 张 + 六态强制态；0 P0/P1 + 3 新 P2（RB-F1 校验族不一致/RB-F2 窄视口塌缩/RB-F3 语义色低对比）+ T-2 定性 + readonly 15 页零演示缺口
- [x] **Round C · lab carrier 15 页**（子代理）：capture 70 张 + 自研复核 154 张；P1 ×1（json-viewer dark 白块）+ P2 ×3 + P3 ×8 + T-C2 新增；B4 令牌溯源率极高、dark 15 页仅 1 违规
- [x] **执行者对账**：suspects 全 0 核销；族归并（P2-004 语义色三面 / P2-005 响应三面 / P2-006 目标尺寸族）；P1-001 源码亲读 + 零覆盖 grep；T-1/T-2/T-C2 工具债定性

Exit Criteria:

- [x] 三轮台账 + A–H 维度归类 + light/dark 平价表落字（§5 总表 37/40 零违规）
- [x] 分类/分级/归属/归族 + P1 复核实录；suspects 全核销

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 族归并根因核验〔P2-004 令牌单点收口可行〕；R2 P1 升级面 grep 全仓 + T 族工具债归属），末轮显式停止
- [x] MR3 / MG / MA7.3 交叉线索分栏（MR3 +P1-001/P2-002；MA7.3 +P2-004 令牌收口 + flux-basic 字面块；component-lab fixture 线索 +readonly 零演示 + drawer footer 主位序；工具修复批 +T-1/T-2/T-C2）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred/watch-only 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-0226-arm2-MA6.1-basic-visual.md`：三轮 + 覆盖裁决 + 工具缺陷表 + P1 ×1 + P2 ×5 + P3 ×18（closure R1 补全 8 条） + watch-only 6 + open 两轮 + 收口补记）
- [x] arm2-index：MA6.1 行 + P1-MA6.1-001 行 + Last Updated 滚动（累计 61），grep 复核
- [x] daily log 追加（`docs/logs/2026/10-23.md` 新建；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0）
- [x] 清理 `_tmp/arm2-ma61/` 与 `_tmp/visual-inspection-2026-10-23/`（closure audit R2 通过后执行；4175 共享 server 保留）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：P1-MA6.1-001 双侧命中；MA6.1 行路径实存）
- [x] BUILD_VERIFY exit 0 登记；截图零入库核验（`git status` 无 png；`git diff HEAD --name-only -- apps/ tests/` = 0）

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA6.1 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_b7f841ad`）R1 `issues`（0B/3M/2m）→ 回修 → R2 有条件 `approved`（残留 3 处一行修复 + grep 证明清零——审计员预声明标准）后：roadmap MA6.1 `planned`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep（`36/40|P3 ×10|:3/:23` 四文件清零）+ prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_cb728ea0`（40 页 id 全实存 + 10+15+15=40 零重复、路由实体 7 处抽查均 basic/form/data 面、roadmap :78 / 矩阵 :122 / arm2-index :88 状态、capture 工具 :4-17/:32/:133/:142-147 机制、方法论 skill A–H + WCAG 判据、HEAD `eb71b86ec`、guide 合规全绿、`--viewports` 默认双 viewport 须显式收窄提示）
- Verdict: R1 pass-with-minors（0B/0M/3m）
- Rounds: 1
- Findings addressed: m1 m4-data 族归属注记（按 data 面走查、移动端框架面归 MA6.2）；m2 走查面代表抽选声明 + 余量归属（R2-2 控件卡 + watch-pool 承载，deferred 留痕）；m3 响应式抽查维度标签 C4/H9——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 截图与探针已全部删除（`_tmp/arm2-ma61/` + `_tmp/visual-inspection-<date>/` 清理；`git status` 无 png 入库）
- [x] roadmap Work Item Status MA6.1 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 40 页 basic+form+data 视觉走查收官（P1 ×1 新案〔ui JsonViewer dark 第三方字面色白块〕+ P2 ×5 + P3 ×18〔closure R1 补全 8 条轮内 P3 后定稿〕+ capture 工具缺陷 ×3〔T-1/T-2/T-C2，工具债〕+ watch-only 6；dark 平价 37/40 零违规；B4 令牌溯源率极高）；字母批裁定：未拆分——三轮全覆面（A 10 + B 15 + C 15 = 40）；零入库代码变更核验通过（apps/tests diff 0）；截图 156+ 张全 `_tmp/` 零入库。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_b7f841ad`（R1 → R2）
- Evidence: R1 **`issues`**（0B/3M/2m——M1 报告静默丢失 8 条轮内 P3〔RB-F5/F6/F7/F8 + F9/F15/F16/F17〕、M2 dark 平价 36/40 应为 37/40〔表内 8+15+14〕、M3 两处页面归属错误〔行操作列与步进器均属 inline-edit-table〕；m1 行号引注 :3/:23 应为 :2/:25、m2 Phase 4 项 1 已执行未勾）→ 全部回修（断言守卫编辑）→ R2 复核 M1/M3/m2 FIXED，余 3 处一行残留 → 回修 → **grep 证明清零**（`36/40|P3 ×10|:3/:23` 四文件 0 命中，审计员预声明充分标准）→ **approved**。审计员独立复核：P1-001 证据链确凿（react-json-view-lite@2.5.0 dist/index.css `background: #eee` 字面 + style 直传 + 全仓零覆盖 grep + dark 探针文件）；T-1 行号引注 :135-167 与脚本实符；40 页 inventory 全实存 10+15+15 零重复；156 PNG（78+78 双主题）实存；suspects=0；61 open 逐行清点；guide 合规（Phase 4 无预勾选、roadmap `planned` 未越权）。

Follow-up:

- no remaining plan-owned work；P1-MA6.1-001 + P2-MA6.1-002 修复行在 MR3 队列；MA7.3 线索 +P2-MA6.1-004 语义色令牌收口 + flux-basic 字面块；component-lab fixture 线索 +readonly 全站零演示 + drawer footer 主位序契约；visual-quality 工具修复批 +T-1/T-2/T-C2（capture-visual-matrix.mjs）。

Follow-up:
