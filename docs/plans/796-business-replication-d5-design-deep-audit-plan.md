# 796 D5 设计阶段深度审计（business-page-replication roadmap M2-D5）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M2-D5（依赖 D2-D4 done，已满足）
> Related: D1-D4 交付（`docs/analysis/business-replication/d{1..4}-*.md`、plan 792-795）；R5 深审先例（`docs/audits/business-replication/r5-research-deep-audit.md`）；`docs/backlog/missing-components-and-designer-roadmap.md`、`docs/components/existing-components-improvement-analysis.md`
> 重建注：本文件曾因执行会话脚本缺陷（truncate-then-read）被清空为 0 字节（收口审计 B-1 发现），2026-10-30 按原稿+已应用修订重建；重建内容与 daily log 及评审/审计证据链一致。

## Purpose

对 M2 设计阶段四份交付（D1 总体设计 + D2/D3/D4 分域设计）执行深度审计：由独立 fresh 子 agent 对照 live repo 做 **schema 片段属性级契约核对**（D2-D4 各自收口审计已抽查，本审计做系统全量覆盖）、缺口登记项与 missing-components/improvement-analysis 无重复立项冲突核对、计划间移交项核查（794 移交的 button countDown 张力）。收口为 roadmap §2 D5 状态 `todo → planned → done`。

## Current Baseline

- D1-D4 交付在案，plan 792-795 均 completed（各自经独立评审与 closure audit，其中 793 三轮/795 三轮收敛）。
- 已知风险面：三份分域设计的 schema 片段在收口审计中累计被查出 14+ 处属性级 drift（已修复并勘误注）——D5 需对**未被抽查覆盖的其余片段**做系统核对。
- 移交项：plan 794 closure 移交"improvement-analysis L186 button countDown 不采纳登记 vs live `flux-renderers-basic/src/schemas.ts` L324-327 已实现同名 prop"的既有张力——D5 须核查并登记处置建议。
- 深审纪律同 R5：fresh 子 agent、三件套输入、Pass = 零 Blocker 零 Major（`docs/audits/00-audit-execution-guide.md`）。

## Goals

- 新建 `docs/audits/business-replication/d5-design-deep-audit.md`：独立 fresh 子 agent 的审计报告，含：
  1. **schema 片段全量属性级核对**：D2-D4 全部关键 schema 片段（非已勘误行）逐属性对照对应包 Schema 定义；报告按页面分组给核对矩阵。
  2. **缺口登记冲突核对**：四份设计的 R4 §2↔§4 双向核对表引用与两份登记文档实际内容对账（无重复立项/无登记去向漂移）。
  3. **移交项处置**：button countDown 张力核查与处置建议（登记勘误/实现下线/保留双轨，仅建议不裁决）。
  4. **跨文档一致性**：D1 决策与 D2-D4 执行的一致性（pageId/mock 模块名/e2e 命名/axe 分支归属逐项对账）。
- Blocker/Major issue 修复→复审循环（≤2 轮）直至 Pass；Minor 当场修复或登记 residual（写明 Why Not Blocking）。
- roadmap §2 D5 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）。

## Non-Goals

- 不重写 D1-D4 交付（修复以勘误/定点修订落）；不审计上游仓库；不实现页面（M3）。

## Scope

### In Scope

- 审计任务书撰写与 fresh 子 agent 派遣；issue 处置与报告归档；roadmap §2 D5 回写。

### Out Of Scope

- D6 开放审计；M3 实现；retention 裁决。

## Failure Paths

| 编号                   | 触发                   | 行为                                                                               | 可重试 | 用户可见表现                     |
| ---------------------- | ---------------------- | ---------------------------------------------------------------------------------- | ------ | -------------------------------- |
| audit-major-found      | 发现 Blocker/Major     | 修复→复审循环（≤2 轮）直至 Pass                                                    | 是     | 报告 verdict 终态 Pass           |
| audit-rounds-exhausted | 2 轮后仍未 Pass        | plan 保持 `active`（不得标 completed），剩余 findings 登记 residual 或升级人工裁决 | 否     | plan 停留 active + residual 清单 |
| audit-unresolvable     | 发现结论性错误不可修复 | 对应交付加 Outdated/勘误标注，roadmap 相应行加注，本 plan 不得标 completed         | 是     | 勘误标注 + 报告记载              |

## Test Strategy

不适用：纯文档审计组织，无行为变更。

## Execution Plan

### Phase 1 - 审计组织与归档

Status: completed
Targets: `docs/audits/business-replication/d5-design-deep-audit.md`

- Item Types: `Fix | Decision | Proof`

- [x] 撰写审计任务书（三件套输入 + 四类核对范围 + Pass 判定 + 已修复勘误行豁免清单）
- [x] 派独立 fresh 子 agent 执行审计，修复→复审循环直至 Pass（≤2 轮）：首轮 Fail（0 Blocker、14 Major、9 Minor）→ 修复轮 1 全清 → 复审轮 1 Fail（2 新 Major+2 Minor，batch-bar↔crud selection 绑定语义层）→ 修复 → 复审轮 2 **Pass**（0/0/0，最终轮）
- [x] issue 处置记录与报告归档（含 button countDown 移交项处置建议；复审轨迹已由独立复审员会话补记入报告附录）

Exit Criteria:

- [x] `docs/audits/business-replication/d5-design-deep-audit.md` 存在，含四类核对结果、issue 清单、最终 verdict（首轮 Fail + 两轮复审轨迹见报告附录 A，终态 Pass）
- [x] 全部 Blocker/Major 有修复闭环记录（14 Major + 复审轮 1 新增 2 Major 全部修复并经独立复审核验）；Minor 有处置口径（9+2 条全处置）
- [x] button countDown 移交项有核查结论与处置建议（报告 §三：定性 improvement-analysis 台账滞后——button/design.md L31 决策表 2026-08-03 已推翻不采纳、live 实现真实消费；建议登记勘误移出不采纳清单、保留实现；§3 L148 汇总行与 §5 L186 两处均已就地勘误）
- [x] roadmap §2 D5 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker/Major，3 Minor 处理：Failure Paths 词表改 active、countDown successor 预记账、planned 回写按操作纪律随本步落）
- Rounds: 1
- Findings addressed:
  - Minor 1：Failure Paths 状态词 in progress → active（plan 级词表）
  - Minor 2：Non-Blocking Follow-ups 预记 countDown 裁决 successor 归属
  - Minor 3：roadmap D5 planned 回写随升 active 一并落（操作纪律）
  - 重建附注：本文件 0 字节事件后重建，重建稿包含上述全部已应用修订；收口审计 B-1 即针对该事件（已补救）

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用。

- [x] in-scope 工作全部落地（审计报告 + issue 闭环 + roadmap 回写）
- [x] 审计报告事实声称与 live repo 对照无 drift（收口审计 7 处修复抽验全部落地且 live 契约准确；独立重跑 9 类残留扫描零命中两轮）
- [x] 不存在被静默降级的 in-scope 缺口（50KB 拆分 53488/ 52037/ 58776B 实测登记 Non-Blocking Follow-ups 含 successor；countDown 裁决 successor 预记账）
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——设计文档体积越 50KB 拆分线登记于 Non-Blocking Follow-ups，非 in-scope 降级）

## Non-Blocking Follow-ups

- countDown 最终裁决落地（improvement-analysis 登记勘误已落 §5+§3 两处；"移出不采纳清单"的正式改写）由 improvement-analysis owner / 后续 plan 承接；本计划仅交处置建议（审计员 Minor-2 successor 预记账）
- **设计文档拆分**：d2（ 53488B）/d3（ 52037B）/d4（ 58776B，收口时实测）均越 docs 50KB 拆分线——拆分会破坏 R1-R4/D5 审计的节号引用链，登记于 M3 启动前单独处理（successor：M3 首个执行 plan 附带拆分 phase 或独立小 plan）
- plan 796 本体 0 字节事件教训：执行会话批量脚本须避免 truncate-then-read 写法（已重建，无数据丢失——内容可由评审/审计证据链完整复原）

## Closure

Status Note: 深审首轮 Fail（14 Major+9 Minor）→ 修复轮 1 全清 → 复审轮 1 Fail（2 新 Major 绑定语义层+2 Minor）→ 修复 → 复审轮 2 **Pass**（0/0/0 最终轮，独立 fresh 复审员）。执行期发现并补救 plan 本体 0 字节事件（重建+披露）。countDown 张力定性台账滞后并双处就地勘误。四类核对全过：属性矩阵 33 组片段、登记对账 12 条、跨文档一致性 8 项。D5 可关，M2 设计阶段仅剩 D6 开放审计。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；深审员与复审员各为独立 fresh 会话，收口审计员含一轮补救复核）
- Evidence: 深审首轮 verdict `Fail`（14M+9m）→ 修复 → 复审轮 1 `Fail`（2M+2m 新发现）→ 修复 → 复审轮 2 **`Pass`**（0/0/0）——轨迹记入报告附录 A；收口审计首轮 `issues`（2 Blocker：plan 本体 0 字节、复审轨迹未落仓 + 3 Minor）→ 补救（重建 7,832B 含诚实披露注、报告附录 A 落仓、improvement-analysis §3+§5 双处勘误、字节数实测刷新）→ 复核 `approved`（B-1 重建诚实性/一致性五处对账核验、B-2 附录与 git diff 交叉印证非孤证）；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- 见 Non-Blocking Follow-ups（countDown 裁决落地 successor、设计文档 50KB 拆分 M3 前处理）
