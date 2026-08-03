# 1 I3 设计回顾与修正 #2（设计 gate）

> Plan Status: completed
> Last Reviewed: 2026-08-03
> Source: `docs/components/roadmap-industrial-hmi.md`（I3、Cross-Cutting review gate 纪律/文档共识审查/人工确认阈值/Rule 4）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§八任务范围）
> Related: `docs/plans/2026-08-03-1508-3-i2-engine-design-docs.md`（上游，completed）；下游 `docs/plans/2026-08-03-2113-2-i4-package-infra-and-leafer-dependency.md`、`docs/plans/2026-08-03-2113-3-i5-engine-core-wave1.md`
> Mission: industrial-hmi
> Work Item: I3

## Purpose

执行第二个固定 review gate（I3）：由独立 agent（fresh session，不复用 I2 执行上下文）对照调研结论（I0.5）+ 项目架构文档（`docs/architecture/renderer-runtime.md`/`flux-core.md`/模块边界）+ 本 roadmap，审核 4 份设计文档（`docs/components/industrial-hmi/design-*.md`），输出修正项并落地；该 gate 同时作为 I2 设计文档「文档共识审查」的终轮复核（不叠加额外审查）。收口状态：I3.1/I3.2 全部完成、修正项落地、roadmap I3 回写 `done`。

## Current Baseline

- I0（调研 5 报告 + 下载清单）、I1（gate #1 + spike 实测，选型确认）、I2（4 份 design-\*.md 均达成文档共识）均已 `completed`，roadmap 已回写 `done`。
- 4 份设计文档头部共识记录均已声明「I3.1 gate 将作为终轮复核，不叠加」；四文档交叉一致性核对已由 I2.4 完成（`design-renderer.md` 头部 5 行全 ✅）。
- 真正剩余的 gap：设计文档尚未经独立 gate 审查——与调研结论（I0.5）/项目架构文档/roadmap 的一致性、平台能力复用表符合性、设计文档与 live repo 架构模式的符合性均未在 gate 层面复核；I2 设计文档的「文档共识审查」缺终轮复核判定（0 新增修正项）。

## Goals

- I3.1：独立 agent 产出 gate 审查结论（`docs/analysis/industrial-hmi/gate-2-review.md`），判定 `pass` / `pass-with-minors` / `revise`，附修正项清单（Blocker/Major/Minor 分级）与「任务范围 ↔ 设计文档 ↔ roadmap」差异清单裁定。
- I3.2：修正项全部落地（回写设计文档；涉及范围/顺序/选型变化时回写 roadmap 并标记人工确认项），I2 设计文档共识达成（终轮复核 0 新增修正项）。
- roadmap Phase Status I3 回写 `done`；每日日志记录收口摘要。

## Non-Goals

- 不重新起草或重写设计文档（只做修正）。
- 不评审 I0 调研报告（I1.1 已终轮复核）或后续实现（I5/I6 属 I7 gate）。
- 不实现任何代码（引擎/包基建属 I4/I5）。
- 不裁定设计决策本身的对错——gate 只检查一致性/完整性/符合性，设计决策已在 I2 共识中确立。

## Scope

### In Scope

- 起草 gate 审查输入（任务范围摘要 = 讨论文件 §八 8 条 + 与 roadmap 差异清单，供独立 agent 使用）。
- I3.1：独立 agent（fresh session）审查 4 份设计文档，输出 `gate-2-review.md`（含修正项清单 + 差异清单裁定 + 终轮复核结论）。
- `gate-2-review.md` 自身经独立文档共识审查（≤3 轮，0 新增修正项即共识，超限升级人工）。
- I3.2：按修正项逐条回写 4 份设计文档与 roadmap（Rule 4）；触发「人工确认阈值」（范围/顺序/选型变更）的项显式标记并暂停推进。
- `docs/logs/2026/08-03.md` 记录本 plan 产出摘要。

### Out Of Scope

- 设计文档架构冲突项的最终同步（属 roadmap I15.2 收尾，与 I2 deferred 裁定一致）。
- `scada-symbol` 图元级 type 注册契约评估（属 I8/I9 后）。
- 任何代码改动与验证命令运行（纯文档计划）。

## Failure Paths

| 可测场景编号             | 触发                                                                       | 行为                                                                       | 可重试 | 用户可见表现                                                                                 |
| ------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| gate-revise-overrun      | 独立 agent 判定 `revise` 且修正项无法在文档共识审查轮次上限（≤3 轮）内收敛 | 超限升级人工裁决（roadmap Cross-Cutting 轮次上限条款）                     | 否     | gate 保持 `planned` + 人工确认标记，不进入 I4/I5（下游计划含 `upstream-not-ready` 等待语义） |
| human-confirm-triggered  | 修正项涉及范围/顺序/选型变化，或文档共识循环超 3 轮                        | 在 roadmap 标记人工确认项并暂停推进（roadmap「人工确认阈值」），不自动推进 | 否     | 人工裁决后由 mission-driver 决定后续（可能修订 roadmap 或下游计划）                          |
| design-contract-conflict | 设计文档与 `docs/architecture/`（renderer-runtime/模块边界等）暴露冲突     | gate-2-review.md 记录冲突点与取舍理由，不改架构文档（同步属 I15.2）        | 否     | I4/I5 按设计文档当前契约执行                                                                 |

## Test Strategy

档位选择：`不适用：纯文档审查计划`——本 plan 不修改任何代码/依赖，仅产出并修订 `docs/` 下文件（gate 结论 + 设计文档修正 + roadmap 回写）；按 plan 指南纯文档计划从 Closure Gates 删除 `pnpm typecheck`/`build`/`lint`/`test`。

## Execution Plan

### Phase 1 - I3.1 设计 gate 审查执行

Status: completed
Targets: `docs/analysis/industrial-hmi/gate-2-review.md`、独立子 agent 审查过程

- Item Types: `Proof | Decision`

- [x] `Decision`：roadmap Phase Status 回写 I3: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机 `todo → planned → done`，对齐 I0/I1/I2 plan 先例，保证下游 I4/I5 前置检查可满足）。
- [x] `Proof`：起草 gate 审查输入——任务范围摘要（讨论文件 §八 8 条最终决策）+ 与 roadmap 的差异清单（设计文档 vs roadmap 范围/顺序/选型逐项对照），供独立 agent 使用。
- [x] `Decision`：指定/确认 gate 输入证据集：4 份设计文档、I0.5 调研总结（`research-summary.md`）、项目架构文档（`docs/architecture/renderer-runtime.md`、`flux-core.md`、`flux-runtime-module-boundaries.md`）、roadmap 全文；`docs/references/new-renderer-introduction-audit.md` 仅作**设计期预审补充对照**（roadmap 平台能力复用表消费方），不属于 gate 审查输入依据。
- [x] `Proof`：启动独立 agent（fresh session，不复用 I2 执行上下文），对照输入审查 4 份设计文档，产出 `gate-2-review.md`：判定 + 修正项清单（分级）+ 差异清单裁定 + 终轮复核结论（I2 设计文档共识达成 / 0 新增修正项）。记录 task id（`ses_0382c18a7ffeF3m1lsPmGffiG7`）。
- [x] `Proof`：`gate-2-review.md` 自身经独立子 agent（fresh session）文档共识审查（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工），共识记录写入文件头部（R1 `ses_038269c7affe73Ay2yKtzDrR60` 2 Minor → R2 `ses_03822cb92ffe1INyj2TcmY8gUL` N1 → R3 `ses_0381d3a60ffeqv6j2yEfh071yS` AGREE）。

Exit Criteria:

- [x] `docs/analysis/industrial-hmi/gate-2-review.md` 存在，含：审查判定（`pass-with-minors`）、分级修正项清单（0 Blocker / 0 Major / 2 Minor）、差异清单逐项裁定（差异 1 需修正 m-1、差异 2-4 一致、差异 5 含 m-2）、终轮复核结论（0 未裁定修正项）。
- [x] 文件头部文档共识审查记录闭环至达成共识（R1-R2 修正 2 轮 + R3 确认轮，≤3 轮），审查 task id 可查。
- [x] 若触发「人工确认阈值」，触发事实已记录于 `gate-2-review.md`（roadmap 标记动作在 Phase 2 完成）——gate 显式声明**未触发**（m-1/m-2 均为措辞/数字精度类，无范围/顺序/选型变化），无需记录触发事实。

### Phase 2 - I3.2 修正落地与 roadmap 回写

Status: completed
Targets: `docs/components/industrial-hmi/design-*.md`、`docs/components/roadmap-industrial-hmi.md`

- Item Types: `Fix | Decision`

- [x] `Fix`：按 `gate-2-review.md` 修正项逐条回写 4 份设计文档（每条修正落地后同步该文档头部共识记录；Minor 逐条处理，无未落地修正项）——m-2 落地 design-engine.md §4.6（组态 JSON 加载分解补全「渲染 ~67」，口径 gate-1-review §3.2 #8）+ 头部共识记录新增 I3.1 gate 修正条目；m-1 属 roadmap 回写项（见 roadmap 总览），设计文档侧仅 m-2 一项。
- [x] `Decision`：若修正涉及范围/顺序/选型变化——更新 roadmap（Rule 4 回写）并标记人工确认项，暂停推进，人工裁决前 I4/I5 不执行——**未触发**：m-1/m-2 均为措辞/数字精度类，无范围/顺序/选型变化（gate-2-review.md §5 显式声明），无需标记人工确认项，I4/I5 按序推进。
- [x] `Fix`：四文档交叉一致性复核——修正后 schema/fields/Symbol 属性映射/点表绑定仍一致（沿用 I2.4 交叉核对清单 5 行全 ✅；本次仅动 §4.6 数字分解与头部记录，不触及 schema/fields/属性映射/点表绑定契约锚点，5 行核对项全部保持）。
- [x] `Fix`：roadmap 头部「文档共识审查记录」块新增 I3.1 gate 记录条目（判定 `pass-with-minors`、修正项摘要 m-1/m-2、审查 task id `ses_0382c18a7ffeF3m1lsPmGffiG7`）——对齐 I1.1 gate 回写先例（roadmap 头部记录块），保持 gate 轨迹连续。
- [x] `Fix`：roadmap Phase Status I3 回写 `done`（前置：本 plan Closure Gates 全通过 + 独立 closure-audit 通过——由独立 closure-audit session 核验后执行）；`docs/logs/2026/08-03.md` 记录本 plan 产出摘要。

Exit Criteria:

- [x] `gate-2-review.md` 全部修正项已落地（逐条可追溯：m-2 → design-engine.md §4.6 + 头部记录；m-1 → roadmap 总览依赖措辞；gate-2-review.md 头部 3 轮共识记录闭环）。
- [x] 四份设计文档修正后交叉一致性核对通过（无新冲突；I2.4 交叉核对清单 5 行保持全 ✅）。
- [x] 触发人工确认阈值时 roadmap 已标记并暂停推进；未触发时 roadmap I3 状态与本文一致——**未触发**，roadmap I3 `planned` → `done` 由独立 closure-audit session 核验后回写。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，rounds 1-2，task `ses_038399eb2ffeOClW7rl9th8Q7F`）
- Verdict: `pass`（round 2；round 1 `revised`，1 Major + 5 Minor 全部落地）
- Rounds: 2
- Findings addressed: M-1「roadmap `todo → planned` 状态流转缺失」→ Phase 1 增 roadmap 回写项（激活期同步执行）+ Closure Gates 状态机断言；m-1「Phase 1 Exit 引用 Phase 2 动作」→ 改为仅记录触发事实；m-2「≤2 轮无依据」→ 统一为文档共识审查轮次上限 ≤3；m-3「deferred 分类与 I2 不一致」→ 统一为 `optimization candidate`；m-4「new-renderer-introduction-audit.md 角色不清」→ 降为设计期预审补充对照；m-5「roadmap 头部 gate 记录缺位」→ Phase 2 增 roadmap 头部 I3.1 gate 记录项；R2 Minor（gate-revise-overrun 用户可见表现 `todo`→`planned` + 人工确认标记）已修正。

## Closure Gates

> 纯文档计划：不涉及任何代码变更（仅修改 `docs/` 下文件），按 plan 指南从 Closure Gates 中删除 `pnpm typecheck`/`build`/`lint`/`test`。

- [x] `gate-2-review.md` 存在且达成文档共识（0 未裁定修正项），I2 设计文档「文档共识审查」终轮复核达成共识（0 新增修正项）。
- [x] 全部修正项已落地（无未落地修正项、无被静默降级项）；roadmap 头部 I3.1 gate 记录条目已回写。
- [x] 触发「人工确认阈值」的修正项已在 roadmap 显式标记并暂停推进（若有）；未触发时 roadmap I3 已回写 `done`（前置：roadmap `todo → planned` 流转已在激活期完成，状态机未跳序）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺项。
- [x] `docs/logs/2026/08-03.md` 已记录收口摘要。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

### 架构文档冲突项同步

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本 gate 只记录设计文档与 `docs/architecture/` 的冲突点与取舍理由（Failure Paths `design-contract-conflict`）；架构文档同步属 roadmap I15.2 收尾职责，与 I2 plan deferred 条目（同分类 `optimization candidate`）归属一致，不阻塞 gate 关闭与 I4/I5 推进。
- Successor Required: `yes`
- Successor Path: roadmap I15.2（文档收尾）

### 设计文档共识审查的历史轮次

- Classification: `watch-only residual`
- Why Not Blocking Closure: I2 各文档共识轮次（R1–R4）已在文档头部完整记录，本 gate 只承担终轮复核（0 新增修正项即达成共识）；历史轮次不重审、不回写。
- Successor Required: `no`

## Non-Blocking Follow-ups

- `gate-2-review.md` 中供 I7（实现对照 gate）复核的注意项（若有）以清单形式保留，I7 gate 复用同一套输入结构。
- 若 gate 发现设计文档与 live repo 架构模式（registry/schema/renderer-definitions）存在表述偏差但不影响契约，记录为注意项供 I10.2 落地时复核。

## Closure

Status Note: 本 plan 关闭——I3 设计 gate（gate #2）已按 roadmap Cross-Cutting review gate 纪律完成：独立 agent（fresh session）产出 `gate-2-review.md`，判定 `pass-with-minors`（0 Blocker / 0 Major / 2 Minor）；2 项 Minor 修正全部落地（m-1 roadmap 总览依赖措辞回写 `leafer-ui@2.2.9` + `@leafer-in/viewport@2.2.9`；m-2 design-engine.md §4.6 组态 JSON 加载分解补全「渲染 ~67」）；`gate-2-review.md` 自身经 3 轮独立共识审查达成 AGREE；I2 设计文档「文档共识审查」终轮复核达成共识（0 新增修正项）；「人工确认阈值」未触发（m-1/m-2 均为措辞/数字精度类，无范围/顺序/选型变化）；下游 I4/I5 已解锁，roadmap Phase Status I3 回写 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit session（fresh，不复用执行上下文，audit 本 plan）
- Evidence: 独立核对 10 项验证点全部通过——plan 两 Phase 全 `completed`、执行项与 Exit Criteria 全 `[x]`、Closure Gates 外无孤儿 `[ ]`；`gate-2-review.md` 头部共识记录闭环（R1 `ses_038269c7affe73Ay2yKtzDrR60` 2 Minor → R2 `ses_03822cb92ffe1INyj2TcmY8gUL` N1 → R3 `ses_0381d3a60ffeqv6j2yEfh071yS` AGREE，≤3 轮）；m-1/m-2 落地经 git diff 与 live 文件逐字核对（roadmap:82 总览、design-engine.md:131 §4.6、两处头部记录条目）；引注抽查全部 resolve（research-summary V5@:53/V7@:55、design-symbols.md:41/:233、gate-1-review §3.2 #8@:55、I4 plan :16/:27/:45/:79/:81/:121）；四文档交叉核对表 5 行全 ✅；人工确认未触发声明一致（gate-2-review §5 + plan Phase 2）；日志已置顶记录；`git status` 仅 docs/ 变更（纯文档计划，typecheck/build/lint/test 删除正确）。

Follow-up:

- 无剩余 plan 归属工作项：Closure Gates 全通过，plan 关闭；roadmap I3 `planned` → `done` 已随本 closure 回写。
- `gate-2-review.md` §6 的 8 条 I7 注意项（A1 固化落实/测试句柄契约/applyAttrs 唯一写入口/lazySpeard 键名/序列化 perf 基线/I10.2 五边界审计/注册机制对齐/e2e 测试锚点）保留为 I7 gate 输入，I7 复用同一套输入结构。
- 架构文档冲突项同步（optimization candidate）维持 roadmap I15.2 收尾职责，不阻塞本 plan。
