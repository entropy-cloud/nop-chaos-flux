# 707 审计修复 R2·MA9.2：开放式对抗审计—渲染器族跨簇（同族不一致、定义字段漂移）

> Plan Status: active
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA9.2；`docs/audits/arm2-scope-and-dimension-matrix.md` MA9.2 行（报告名注册 `*arm2-MA9.2-renderers-adversarial.md`；共享方法 = roadmap/matrix MA9 节探针设计〔五信号源；skill 基础方法不含探针机制——MA9.1 draft review R1 M1 勘正在案〕；探针面 = 渲染器族跨簇〔同族不一致、定义字段漂移〕）；owner doc `docs/architecture/renderer-markers-and-selectors.md`
> Related: matrix MA9 节、`docs/audits/arm2-index.md`、MA3.5-3.7 渲染器族代码质量线（S 级簇——交叉引用）、MA9.1 方法先例（五信号源收集 + 探针清单→执行两轮制）
> 中间件：`_tmp/arm2-ma92/`（本批创建，收口清理；沿 ma91/ma83 工作流先例）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

渲染器族跨簇对抗审计：同族不一致（同类组件不同行为/样式/语义）、定义字段漂移（definitions 声明 vs 实现消费）；live 信号驱动探针设计 + 执行判别；产出探针清单 + 判别证据；MG 候选；零入库变更。

## Current Baseline（2026-10-23 live，HEAD `c1fc0f44c`）

- **渲染器包族**：basic/form/form-advanced/data/content/layout/mobile/scheduling/ai/dashboard/pivot/industrial/3d/word-editor/spreadsheet/flow-designer-renderers 等（19 definitions 数组在册——visual-quality-r2 台账源）。
- **live 信号面**：同 MA9.1 五信号源 + `check:schema-prop-coverage`/`check:renderer-definition-fields-only` 扫描器（定义字段漂移的现成信号）。
- **执行状态**：roadmap MA9.2 `todo`；arm2-index MA9.2 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA9.2-renderers-adversarial.md`（矩阵注册名 renderers-adversarial）：探针清单（≥10）+ 判别证据 + finding P0–P3（P1 ID `P1-MA9.2-<nnn>`）+ MG 候选。
- 覆盖面（两轮对抗 + 执行者对账；字母批拆分预授权）：
  - ① **Round A · 信号收集 + 探针设计**（子代理）：五信号源 + 定义字段漂移扫描器信号 + **族比对既有锚点**（`apps/playground/src/component-lab/renderer-lab-registry.ts` 活注册表、`docs/audits/visual-quality-r2/` ledger 139 控件 + watch-pool 15 行、`check:audit-ui-consistency-gaps`/`check:ui-family-nesting` 双扫描器、MA7.3 族 P3 线索〔dashboard §10 缺表/gantt drop-indicator 漂移〕）→ ≥10 探针（同族不一致 ≥4 / 定义字段漂移 ≥3 / 跨簇语义 ≥3）
  - ② **Round B · 探针执行**（子代理）：逐探针判别（红/绿/不可判别）；清单外允许
  - ③ **执行者对账**：判别复核；P1 live 复核；MG 候选归并
- 登记 arm2-index（MA9.2 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修复；单渲染器内部缺陷归 MA3/MA5 已走查面（跨簇不一致才为本批镜头）；MA9.1 核心链路面不重开。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA9.2 报告 + arm2-index 登记回填；`_tmp/arm2-ma92/` 实跑；daily log 追加；roadmap MA9.2 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 修复实现；MA9.1/9.3/9.4 / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号    | 触发            | 行为                                                 | 可重试 |
| --------------- | --------------- | ---------------------------------------------------- | ------ |
| probe-undecided | 探针不可判别    | 记录原因 + MA9.4 转入候选                            | 是     |
| audit-p0-found  | Rule 2 六类之一 | 即时通道                                             | 否     |
| subagent-quota  | 限流/模型失败   | fresh 重启一次；再败执行者亲跑                       | 是     |
| round-overflow  | 单轮超上限      | **字母批拆分（MA9.2-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：信号收集 + 探针设计 → 执行

Status: completed
Targets: `_tmp/arm2-ma92/round-{A,B}.md`、`_tmp/arm2-ma92/probes/`

- Item Types: `Proof | Decision`

- [x] **Round A · 信号收集 + 探针设计**（子代理）：五信号源 + 定义字段漂移扫描 → ≥10 探针清单
- [x] **Round B · 探针执行**（子代理）：**15/15 全判别 + 2 清单外**（红 8/绿 4/不可判别 2/拆分 1）；P1 族 vitest 编译语义钉死；探针脚本/输出存档
- [x] **执行者对账**：P1 族 signature/barcode 两成员亲读坐实；Round A 勘正采信（kanban 7/gantt 双通道）；MG 候选 2

Exit Criteria:

- [x] 15 探针清单 + 17 判别证据（含清单外）落字
- [x] 分类/分级/归族 + MG 候选 2 + P1 族升格复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed
Targets: `_tmp/arm2-ma92/`（open 轮记录）、报告 deferred 节

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 族升格裁决 5 成员+语义钉死；R2 令牌倒置定级+MA7.3 判读修正），末轮显式停止
- [x] MR3 / MG 交叉线索分栏（MR3 +P1-MA9.2-001+P2-002；MG +2 候选；MA7.3 +P2-003 判读修正勘误；MA9.4 +不可判别 2）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred/watch 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: planned

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-1404-arm2-MA9.2-renderers-adversarial.md`：P1 ×1 族升格 + P2 ×2 + P3 族 + 绿 4 + 扫描器口径盲区 + watch 4 + open 两轮 + 收口补记）
- [x] arm2-index：MA9.2 行 + P1-MA9.2-001 行 + Last Updated 滚动（累计 70），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [ ] 清理 `_tmp/arm2-ma92/`（closure audit 通过后、提交前执行）

Exit Criteria:

- [ ] 报告与 arm2-index 逐条一致（grep 双侧命中）
- [ ] BUILD_VERIFY exit 0 登记

### Phase 4 - 收口与状态流转

Status: planned

- Item Types: `Proof`

- [x] draft review 通过后：**roadmap MA9.2 `todo`→`planned` 翻转必须入激活提交**（MA9.1 closure M1 勘误纪律——三例在案；激活提交 2f25d8e26 已含翻转，closure auditor 核实），plan→`active`
- [ ] closure audit（fresh subagent）approved 后：roadmap MA9.2 `planned`→`done`（**行号 surgery + sed 回读核验**），plan→`completed`
- [ ] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [ ] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [ ] roadmap 与 plan 状态流转一致（sed 回读核验）
- [ ] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_5cab00e3`（roadmap :89 / 矩阵 :150 / arm2-index :99、HEAD `c1fc0f44c`、双漂移扫描器 package.json 在册、skill 探针机制零命中核实（归因正确）、翻转纪律条款在案、MA3.5-3.7 行实存、guide 合规、43 包/18 渲染器族/19 definitions 数组台账核实）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 勘误出处勘正（skill 归因=MA9.1 draft review R1 M1 非 closure M1——勘误账本门别须精确）；M2 Round A 信号清单补族比对锚点（lab-registry/visual-quality-r2 ledger+watch-pool/双一致性扫描器/MA7.3 族 P3）；m1 Last Reviewed 落日期；m2 Phase 2 补 Targets；m3 方法先例行去自指——均已落字

## Closure Gates

- [ ] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [ ] arm2-index 登记与报告逐条一致
- [ ] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [ ] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [ ] 探针与临时配置已全部删除（`_tmp/arm2-ma92/` 清理）
- [ ] roadmap Work Item Status MA9.2 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [ ] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` 登记

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:
