# 693 审计修复 R2·MA5.4：功能交互审计—form/data/basic 功能走查（AMIS 对标）

> Plan Status: completed
> Last Reviewed: 2026-10-22
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA5.4；`missions/audit-remediation-r2.json`；方法论 `docs/skills/interaction-state-audit-prompt.md` + `docs/skills/complex-component-display-operability-audit-prompt.md`；AMIS 对标参考 `~/sources/amis`（本机，机制参照，实现为本仓自有代码）；owner doc `docs/architecture/form-validation.md`（roadmap Owner Doc 列）
> Related: matrix MA5 节（报告名模式 `*arm2-MA5.4-form-data-basic-walkthrough.md`）、`docs/audits/arm2-index.md`、MA4.2 线索（**非预载**：basic 簇契约覆盖结论）、MA4.5 B-04（crud-query e2e 名实不符——Round B 已认定的 host-005 等同类面在 report 侧，本轮为 crud 侧核对）、MA5.1–5.3 方法先例（plan 690/691/692）
> 方法先例沿用：`_tmp/arm2-ma54/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

对 form/data/basic 功能面（表单校验/提交/联动、CRUD 查询与分页、树表、弹层）做 browser-use 实操走查，以 AMIS（`~/sources/amis`）作机制对标，程序化读数定罪（V1–V7）+ 六态核对，产出 arm2 报告并登记 arm2-index；零入库代码变更。**本项同时承接 MA4.5 遗留的 P1-MA4.4-005 加重面（公式错误值）不在范围**——范围限 form/data/basic 交互面。

## Current Baseline（2026-10-22 live，HEAD `4ee16c45d`）

- **走查面**：`dialog`（basic :33）、`condition-builder`（:120）、`condition-builder-formula`（:127）、`form-input-enhancements`（:197）、`tree-display-ux`（:211）、`table-popover`（:218）、`table-column-width`（:225）、`w4c-composite-form-family`（:309）+ component-lab 实验页面 `#/lab/form`（form-lab-page）、`#/lab/crud`（crud-lab-page）、`#/lab/tree`（tree-lab-page）、`#/lab/dialog`（dialog-lab-page）——lab 页为表单/CRUD 主承载面。
- **既有 e2e（对照）**：crud|form 子串 12 spec（`ls tests/e2e | grep -icE`）。
- **待消费线索（非预载）**：MA4.2 basic 簇审计结论；MA4.5 Round B E7（crud-query e2e 名实不符 ×3——本轮 live 核对 crud query 工作流真实行为）；MA4.5 Round D antdpro bulk-delete（已立案 P1-MA4.5-004——crud 修复归 MR，本轮独立验证其他 crud 面）。
- **AMIS 对标**：`~/sources/amis`（local repo）——表单校验/提交/CRUD 分页/树表/弹层的交互语义对照（仅机制参照）。
- **执行状态**：roadmap MA5.4 `todo`；arm2-index MA5.4 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-22-HHmm-arm2-MA5.4-form-data-basic-walkthrough.md`：双风格，finding A–G + V1–V7 + P0–P3（P1 ID `P1-MA5.4-<nnn>`）+ AMIS 对标列 + 归属归族。
- 覆盖面（IS 台账）：
  - ① **表单**（`#/lab/form` + form-input-enhancements + w4c-composite-form-family）：校验触发（required/格式/自定义规则）→ 提交链（V3 真实反馈 + 失败路径 §2.7）/联动（visibleOn/requiredOn 联动读数）/重置语义/键盘（Enter 提交、Tab 序——**focus-loss family 复验：MA5.1–5.3 三面立案后 form 面是否第四面**）/六态
  - ② **CRUD**（`#/lab/crud`）：查询/重置工作流（B-04 live 核对）/分页（页码切换 V3 + 页大小）/排序/行选择批量操作/行内编辑/六态（loading/empty/error）
  - ③ **树表 + 表格交互**（`#/lab/tree` + tree-display-ux + table-popover + table-column-width）：树展开收起（V5 无痕）/懒加载（若配置）/列宽拖拽（V4 几何）/popover 触发与关闭三路径/六态
  - ④ **弹层**（`#/lab/dialog` + dialog）：drawer/dialog 打开-确认-取消-Esc 三路径（V5）/嵌套弹层/overlay 关闭点击/焦点陷阱（§4.9 Tab 圈）/六态
  - ⑤ **AMIS 对标列**：上述各序列的交互语义与 AMIS 对应行为对照（一致/偏差/本仓自定义三分辨，偏差记 design-debt candidate）
  - ⑥ **F/G 专项**：toast 全量映射 + `env.notify`/`console.(log|debug)` 静态扫描
- 登记 arm2-index（MA5.4 行 + P1 行 + P0 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`（Closure Gates 预声明）。

## Non-Goals

- 不修改入库代码（P0 除外）；不预载 MA4.2/MA4.5 定级；性能归 MA7.1；视觉归 MA6.1；antdpro bulk-delete（已立案）不复验。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA5.4 报告 + arm2-index 登记回填；`_tmp/arm2-ma54/` 探针实跑；daily log 追加；roadmap MA5.4 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 任何入库代码/测试/配置变更（P0 除外）；MA5.5+ / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号     | 触发                    | 行为                              | 可重试 |
| ---------------- | ----------------------- | --------------------------------- | ------ |
| e2e-env-failure  | dev server/端口问题     | 归因修复后重跑                    | 是     |
| probe-flaky      | 读数漂移                | 重跑 ≥2；仍不稳 → watch-only      | 是     |
| amis-ref-missing | `~/sources/amis` 不可读 | 对标列改纯本仓语义记录 + 披露     | 是     |
| audit-p0-found   | Rule 2 六类之一         | 即时通道                          | 否     |
| subagent-quota   | 限流/模型失败           | fresh 重启一次；再败执行者亲跑    | 是     |
| round-overflow   | 单轮超上限              | 字母批拆分或移交 Phase 2 台账留痕 | 否     |

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：form/data/basic 实操走查

Status: completed
Targets: `_tmp/arm2-ma54/round-{A,B}.md`、`_tmp/arm2-ma54/probes/`

- Item Types: `Proof | Decision`

- [x] **Round A · 表单 + 弹层**（子代理，终版 28 用例全绿）：**focus-loss 第四面裁决=机制 live 成立**（form.tsx:409-464 三路径全验）；新案定级 11 条（1×P2+10×P3；另 dialog-06 观察不立案）
- [x] **Round B · CRUD + 树表 + 表格交互**（子代理）：**P1-MA5.4-001**（query 工作流 UI 不可达，E7 live 反证升级）+ P2×5 + P3×2；分页/排序/选择/树折叠/popover/列宽读数定罪全过
- [x] **执行者对账**：E7 命中引用（升级不重复开案）；静态 G（2 处立案）；交叉去重 + 分级归属归族

Exit Criteria:

- [x] 两轮台账 + 六态表 + toast 映射 + AMIS 对标列落字
- [x] 分类/分级/归属/归族 + P1 复核实录（live 读数）

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1：E7 hollow 背后=工作流未接通；R2：G 类污染再三出现的结构性解释——notify level 语义与宿主路由无统一契约），末轮显式停止
- [x] MR3 / MG / MA6.1 交叉线索分栏（notify 通道分级契约、AMIS 语义偏差族集中裁决）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入 deferred 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（MA5.1–5.3 同构：两轮 + focus-loss 第四面裁决 + E7 升级 + AMIS 对标节 + open 两轮 + 收口补记）
- [x] arm2-index：MA5.4 行 + P1-MA5.4-001 行 + Last Updated 滚动（累计 57），grep 复核
- [x] daily log 追加（计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint 44/44
- [x] 清理 `_tmp/arm2-ma54/`（closure audit 通过后、提交前执行；自启 dev server 已终止〔4175 清零〕；`git status --porcelain -- packages/` 仅并发线 staged 残留）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：P1-MA5.4-001 两侧命中；报告行实存）
- [x] BUILD_VERIFY exit 0 登记

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA5.4 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_51b7a881`）R1 issues（1M/3m）→ R2 approved 通过后：roadmap `planned`→`done`，plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + `git status` 无 packages/ 泄漏（packages/ 下仅并发线 staged 残留）
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_53028e92`（五项检查：路由/lab 注册键 form:158 crud:197 tree:201 dialog:144 可达性、e2e 计数、HEAD 与 roadmap/arm2-index 状态、amis 可读性、focus-loss 复验 framing 结构性核验〔form.tsx:417-455 post-submit focus 机制 + form-sync-validation-focus.spec 在案〕）
- Verdict: R1 `revised`（1M）→ 回修共识
- Rounds: 1
- Findings addressed: M1 三处线索误归属勘正（B-04→E7；host-005 归 MA5.3 Round B；bulk-delete 归 MA4.5 Round D）——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（exit 0，82/82）
- [x] 不存在被静默降级的 in-scope 项（watch-only 7 条附理由入台账）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma54/` 清理；`git status --porcelain -- packages/` 仅并发线 staged 残留）
- [x] roadmap Work Item Status MA5.4 行已流转 `done`（closure audit R2 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据（R1 issues → R2 approved，见 Closure 节）
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 十一面全走查收官（P1 ×1 新案〔E7 live 反证升级为工作流断裂〕+ focus-loss 第四面正例裁决 + P2×6 + P3×12 + AMIS 对标列 + watch-only 7 条全列）；F/G 静态扫描闭环；零入库代码变更核验通过；G 类 notify 路由族 systemic 升级候选入 MG。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_51b7a881`（R1/R2；worksheet `_tmp/arm2-ma54/closure-audit-R1.md`，随 `_tmp` 清理，结论录此）
- Evidence: R1 `issues`（1M/3m：M1 分轮计数漂移、m2 AMIS 引用不精确、m3 收口声称先于事实、m4 watch-only 只覆盖 Round B）→ 回修 → R2 **`approved`**（0B/0M/2 non-blocking minor）。审计员独立复跑：Round A 全 28 passed、Round B spot 3 passed（query/v1-scroll/pagination-sort 读数逐项吻合）、根因源码核实（form.tsx:409-464 机制真实、refresh-nearest.ts:90 silent vs :103-109 info 矛盾、action-adapter.ts 零 reset、本仓 crud-renderer.tsx ~:588 原始 queryFormRegion、AMIS 合成机制在案）、57 行计数核验、roadmap :74 planned 未越权。

Follow-up:

- no remaining plan-owned work；P1-MA5.4-001 修复行在 MR 队列；MG 候选：notify 通道分级契约、AMIS 语义偏差族集中裁决、E7 e2e 补齐。
