# 2 I7 设计回顾与修正 #3（实现对照 gate）

> Plan Status: completed
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md`（I7、Cross-Cutting review gate 纪律/文档共识审查/人工确认阈值/Rule 4）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§八任务范围）、`docs/analysis/industrial-hmi/gate-2-review.md`（§6 I7 注意项 8 条）
> Related: 上游 `docs/plans/2026-08-03-2113-3-i5-engine-core-wave1.md`（completed）、`docs/plans/2026-08-03-2307-1-i6-data-binding-and-animation-wave2.md`（前置等待）；下游 `docs/plans/2026-08-03-2307-3-i8-basic-symbol-library-wave3.md`
> Mission: industrial-hmi
> Work Item: I7

## Purpose

执行第三个固定 review gate（I7，实现对照 gate）：由独立 agent（fresh session，不复用 I5/I6 执行上下文）对照 `design-*.md` + I0.5 调研结论审查 I5/I6 实现（契约一致性、序列化完整性、性能路径、测试覆盖），输出修正项并落地（I7.2），同时吸收 I5 plan 遗留事项（leafer 真实 API 抽查项、`design-renderer.md` diff 类型笔误）。收口状态：I7.1/I7.2 全部完成、修正项落地、回归测试补齐、roadmap I7 回写 `done`。

## Current Baseline

- I5（引擎 Wave 1）与 I6（数据绑定与动画 Wave 2）执行完成后：`src/engine/`（引擎/视口/序列化/config-adapter/test-handle）、`src/serialization/`（四模块）、`src/symbols/`（注册表/8 形状/样式解析）、`src/binding/`（点表/绑定/动画/事件）均已落地并有 focused 单测；roadmap I5 = `done`，I6 待本 plan 前置时点回写 `done`。
- `gate-2-review.md` §6 保留 **I7 gate 注意项 8 条**（I3 gate 输出，供 I7 复用同一套输入结构）：A1 固化落实（tree viewport 类型）/测试句柄契约（含 tree 引用）/applyAttrs 唯一写入口/lazySpeard 键名（leafer 实际拼写）/序列化 perf 基线/（I10.2 五边界审计——不属 I7 输入，转 I10）/注册机制对齐/e2e 测试锚点。
- I5 plan 遗留事项（Non-Blocking Follow-ups + closure Minor）：① **leafer 真实 API 抽查项**——因 I5/I6 真实浏览器断言延后至 I13.1/I15.1，I7 gate 需对照 spike 工程（`~/sources/industrial-hmi-research/spike-leafer/`）抽查引擎实现的真实 API 用法，防 mock↔真实漂移累积；② **`design-renderer.md:155` diff 类型笔误**（`ScadaConfigDiff.added` 应为节点数组，I5 closure 记录实现语义正确，建议 I7 gate 或 I15.2 修正）。
- I5/I6 测试以 `vi.mock('leafer-ui')` 覆盖引擎 wiring（`src/test-support/leafer-ui-mock.ts`），mock 面锚定 spike demo.js 真实 API——mock↔真实 API 漂移是本 gate 的核查重点（I5 Failure Paths `leafer-api-drift` 记录修正的复核点）。
- 真正剩余的 gap：I5/I6 实现未经独立 gate 审查——契约一致性（design-\*.md ↔ live 代码）、序列化完整性、性能路径（合帧/批量写/脏区）、测试覆盖（focused 断言非空洞）均未在 gate 层面复核；I5 遗留事项未落地。

## Goals

- I7.1：独立 agent（fresh session）产出 gate 审查结论（`docs/analysis/industrial-hmi/gate-3-review.md`），判定 `pass` / `pass-with-minors` / `revise`，附分级修正项清单（Blocker/Major/Minor）与「任务范围 ↔ 设计文档 ↔ I5/I6 实现」差异清单裁定；含 leafer 真实 API 抽查结论（对照 spike 工程）。
- I7.2：修正项全部落地（回写代码/测试/设计文档；涉及范围/顺序/选型变化时回写 roadmap 并标记人工确认项）；补充回归测试。
- I5 遗留事项落地：`design-renderer.md:155` diff 类型笔误修正；leafer 真实 API 抽查项结论记录。
- roadmap Phase Status I7 回写 `done`；roadmap 头部 I7 gate 记录条目（对齐 I1.1/I3.1 回写先例，Rule 4）；每日日志记录收口摘要。

## Non-Goals

- 不评审 I0 调研报告（I1.1 已终轮复核）或设计文档（I3 gate 已复核）。
- 不实现 I8 及之后的图元库/设备库功能（roadmap 顺序约束；gate 发现的 I8+ 域问题只记录归属，不落地）。
- 不裁定设计决策本身的对错——gate 只检查实现与设计的契约一致性/完整性/测试覆盖。
- 不执行 I10.2 五边界审计（roadmap I10 强制原则审计，结论作 I12 gate 输入）。

## Scope

### In Scope

- 起草 gate 审查输入（任务范围摘要 = 讨论文件 §八 + 与 roadmap 差异清单 + I7 注意项 8 条 + I5/I6 closure 证据集，供独立 agent 使用）。
- I7.1：独立 agent（fresh session）审查 I5/I6 实现，输出 `gate-3-review.md`（判定 + 修正项清单 + 差异清单裁定 + leafer 真实 API 抽查结论）。
- `gate-3-review.md` 自身经独立文档共识审查（≤3 轮，0 新增修正项即共识，超限升级人工）。
- I7.2：按修正项逐条落地（代码修复 + 补充回归测试 + 必要时回写 `design-*.md` 与 roadmap，Rule 4）；I5 遗留事项（design-renderer.md:155 笔误、leafer API 抽查结论）。
- `docs/logs/2026/08-03.md` 记录本 plan 产出摘要。

### Out Of Scope

- I8+ 图元库实现与 I10 桥接实现（roadmap 顺序）；gate 发现的相关域问题记录归属（如 I8.2/I9/I10.2/I15.2），不落地。
- 架构文档（`docs/architecture/`）同步（属 roadmap I15.2 收尾，与 I2/I3 deferred 裁定一致）。
- 性能基准固化（I14）与 e2e 程序化断言补强（I15.1）。

## Failure Paths

| 可测场景编号            | 触发                                                                                    | 行为                                                                                                           | 可重试 | 用户可见表现                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| upstream-not-ready      | 前置未就绪——具体判定：roadmap I6 = `done` 且 I6 plan closure-audit 通过、无待人工裁决项 | 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                                                  | 是     | plan 保持 `planned`/`in progress`，roadmap I7 保持 `todo`                                   |
| gate-revise-overrun     | 独立 agent 判定 `revise` 且修正项无法在文档共识审查轮次上限（≤3 轮）内收敛              | 超限升级人工裁决（roadmap Cross-Cutting 轮次上限条款）                                                         | 否     | gate 保持 `planned` + 人工确认标记，不进入 I8（下游 plan 含 `upstream-not-ready` 等待语义） |
| human-confirm-triggered | 修正项涉及范围/顺序/选型变化（如引擎选型变更、`scada-canvas` 公共契约重大变更）         | 在 roadmap 标记人工确认项并暂停推进（roadmap「人工确认阈值」），不自动推进                                     | 否     | 人工裁决后由 mission-driver 决定后续                                                        |
| fix-scope-expansion     | gate 输出超出 I5/I6 契约面修正范畴的实现债（如 I8+ 域缺陷、性能优化候选）               | 显式记录归属（successor 或 optimization candidate），不在本 plan 落地；已确认 live defect 不得降级为 follow-up | 是     | 归属项在 roadmap/plan Deferred 区可追溯                                                     |
| leafer-api-drift-found  | 抽查发现实现与 spike 真实 API 存在偏差（事件名/属性名/构造参数）                        | 按修正项落地（回写实现或设计文档风险节）；偏差记录供 I14 复测参考                                              | 是     | 修正后契约一致，I8+ 实现按修正后契约推进                                                    |

## Test Strategy

档位选择：`建议有测`——gate 修正项内容由独立审查产出，起草时不可预写失败测试；本 plan 固化纪律：**每个 Fix 项必须携带 focused 回归测试**（AGENTS.md Bug Fix Test Coverage Rule：验证正确行为而非仅无错误；非平凡 bug 记录 `docs/bugs/`）；修正项的测试断言以 gate-3-review.md 修正项清单为输入逐条落地；全量验证（typecheck/build/lint/test）归 Closure Gates。

## Execution Plan

### Phase 1 - I7.1 实现对照 review 执行

Status: completed
Targets: `docs/analysis/industrial-hmi/gate-3-review.md`、独立子 agent 审查过程

- Item Types: `Proof | Decision`

- [x] `Proof`：前置验证——具体判定：roadmap I6 = `done` 且 I6 plan（`docs/plans/2026-08-03-2307-1-i6-data-binding-and-animation-wave2.md`）closure-audit 通过、无待人工裁决项；I5/I6 实现与 focused 测试已落盘；未就绪则等待（Failure Paths `upstream-not-ready`）。
- [x] `Decision`：roadmap Phase Status 回写 I7: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 I0/I1/I2/I3 plan 先例）。
- [x] `Proof`：起草 gate 审查输入——任务范围摘要（讨论文件 §八）+ 与 roadmap 的差异清单 + I7 注意项 8 条（gate-2-review.md §6）+ I5/I6 plan closure 证据集（live 实现路径/测试覆盖/coverage 数字/deferred 裁定），供独立 agent 使用。
- [x] `Decision`：指定/确认 gate 输入证据集：4 份 `design-*.md`、`research-summary.md`（I0.5）、I5/I6 实现源码与测试（`src/engine/`/`src/serialization/`/`src/symbols/`/`src/binding/`）、spike 工程（`~/sources/industrial-hmi-research/spike-leafer/`，leafer 真实 API 抽查锚点）、I5/I6 plan 文件；`new-renderer-introduction-audit.md` 不作审查输入依据（I10.2 五边界审计属 I10）。
- [x] `Proof`：启动独立 agent（fresh session，不复用 I5/I6 执行上下文），对照输入审查实现，产出 `gate-3-review.md`：判定 + 修正项清单（分级）+ 差异清单裁定 + **leafer 真实 API 抽查结论**（对照 spike demo.js：App/tree 构造参数、事件名、zoomLayer/selector 用法、lazySpeard 键名）+ I5 遗留事项复核（design-renderer.md:155 diff 类型）。记录 task id。
- [x] `Proof`：`gate-3-review.md` 自身经独立子 agent（fresh session）文档共识审查（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工），共识记录写入文件头部。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。
>
> **写法原则**：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。全量验证属 Closure Gates。

- [x] `docs/analysis/industrial-hmi/gate-3-review.md` 存在，含：审查判定、分级修正项清单、差异清单逐项裁定、leafer 真实 API 抽查结论（逐项对照 spike 工程）、I5 遗留事项复核结论。
- [x] 文件头部文档共识审查记录闭环至达成共识（≤3 轮），审查 task id 可查。
- [x] 若触发「人工确认阈值」，触发事实已记录于 `gate-3-review.md`（roadmap 标记动作在 Phase 2 完成）。——未触发（gate-3-review.md §9 声明：无范围/顺序/选型变化）。

### Phase 2 - I7.2 修正落地与回归测试

Status: completed
Targets: `packages/flux-renderers-industrial/src/**`、`docs/components/industrial-hmi/design-*.md`、`docs/components/roadmap-industrial-hmi.md`

- Item Types: `Fix | Decision | Proof`

- [x] `Fix`：按 `gate-3-review.md` 修正项逐条落地代码修正（每条落地同步 focused 回归测试——验证正确行为；测试断言以修正项清单为输入）。
- [x] `Fix`：I5 遗留事项——`design-renderer.md:155` diff 类型笔误修正（`ScadaConfigDiff.added` 类型对齐实现语义：节点数组）；leafer 真实 API 抽查发现（如有）回写实现或 `design-*.md` 风险节。
- [x] `Decision`：若修正涉及范围/顺序/选型变化——更新 roadmap（Rule 4 回写）并标记人工确认项，暂停推进，人工裁决前 I8 不执行；未触发则 I8 按序推进。——未触发（gate-3-review.md §9 声明：修正项均为实现缺陷/文档笔误类，无范围/顺序/选型变化；人工确认阈值条款逐一核对通过）。
- [x] `Proof`：补充回归测试——按 gate 修正项逐条验证（每个 Fix 项的 focused 测试断言行为正确；I5/I6 既有测试保持绿，不弱化既有覆盖）。
- [x] `Fix`：roadmap 头部「文档共识审查记录」块新增 I7 gate 记录条目（判定、修正项摘要、审查 task id）——对齐 I1.1/I3.1 gate 回写先例，保持 gate 轨迹连续。
- [x] `Fix`：roadmap Phase Status I7 回写 `done`（前置：本 plan Closure Gates 全通过 + 独立 closure-audit 通过——由独立 closure-audit session 核验后执行）；`docs/logs/2026/08-04.md` 记录本 plan 产出摘要。——Closure Gates 全部通过、daily log 已记录；独立 closure-audit（Round 2 确认轮）`approved` 后执行：roadmap I7 `planned → done` 已回写（roadmap Phase Status）。

Exit Criteria:

- [x] `gate-3-review.md` 全部修正项已落地（逐条可追溯：代码/测试/文档回写位置）；新增/调整的 focused 回归测试断言正确行为且全绿。
- [x] I5 遗留事项落地（design-renderer.md:155 笔误已修正；leafer API 抽查结论已记录）。
- [x] 触发人工确认阈值时 roadmap 已标记并暂停推进；未触发时 roadmap I7 状态与本文一致（`planned` → `done` 由独立 closure-audit session 核验后回写）。——未触发；I7 已由独立 closure-audit 核验后回写 `done`。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，rounds 1-2，task `ses_037d1212bffekKyZ1T0H8kgyht`）
- Verdict: `pass`（round 2；round 1 `pass-with-minors`，1 Minor 落地；round 2 零 Blocker/Major/新增项）
- Rounds: 2
- Findings addressed: m-1「Deferred 节自引用不存在的 Failure Path `design-contract-conflict`」→ 改为「I5/I6 plan Failure Paths `design-contract-conflict` 同口径」并说明记录位置（gate-3-review.md）。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [x] `gate-3-review.md` 存在且达成文档共识（0 未裁定修正项）；I7.1 独立审查完成（task id 可查）。
- [x] 全部修正项已落地（无未落地修正项、无被静默降级项）；I5 遗留事项（design-renderer.md:155 笔误、leafer API 抽查）已落地。
- [x] 补充回归测试已落地且全绿（每个 Fix 项有 focused 断言；既有 I5/I6 测试未被弱化）。
- [x] 触发「人工确认阈值」的修正项已在 roadmap 显式标记并暂停推进（若有）；未触发时 roadmap I7 已回写 `done`（前置：`todo → planned` 流转已在激活期完成，状态机未跳序）。——未触发；roadmap I7 `planned → done` 已由独立 closure-audit 核验后回写（roadmap Phase Status）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（gate 输出中超出 I5/I6 契约面的事项已显式归属 successor/optimization candidate，无静默降级）。
- [x] `docs/logs/2026/08-04.md` 已记录收口摘要。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。——Round 1（task `ses_03749cd64ffePXYyo2oVPkjaYr`）判定 `issues`（Issue 1 Minor 记录缺口 + Issue 2 Nit 计数），编写者修复后 Round 2 确认轮（task `ses_03745beacffehdgq6AfDYQ6P0I`）判定 `approved`；证据记录于 `## Closure` 节。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 架构文档冲突项同步

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本 gate 只记录实现与 `docs/architecture/`（renderer-runtime/模块边界）的冲突点与取舍理由（I5/I6 plan Failure Paths `design-contract-conflict` 同口径——gate 发现的架构冲突按差异清单裁定记录于 `gate-3-review.md`，不在本 plan 落地）；架构文档同步属 roadmap I15.2 收尾职责，与 I2/I3 deferred 裁定一致，不阻塞 gate 关闭与 I8 推进。
- Successor Required: `yes`
- Successor Path: roadmap I15.2（文档收尾）

### I10.2 五边界审计

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap I10 强制原则审计（new-renderer-introduction-audit INV-1/INV-2 五边界）执行时点在 I10.2，结论作 I12 gate 输入；I7 只做 I5/I6 实现契约一致性审查，不重叠审计面。
- Successor Required: `yes`
- Successor Path: roadmap I10.2（renderer-definitions 完整注册 + 五边界审计）

### gate 输出中发现的 I8+ 域问题（如有）

- Classification: `watch-only residual` 或 `out-of-scope improvement`（按 gate 产出归类）
- Why Not Blocking Closure: roadmap 顺序约束（I7 → I8 → I9 → I10 → I11），I7 gate 只落地 I5/I6 契约面修正；涉及后续域的发现显式记录归属与 successor，不在本 plan 落地（已确认 live defect 不降级，按 Anti-Slacking Rule 落状态裁定）。
- Successor Required: `yes`（视 gate 产出）
- Successor Path: 按归属指向 roadmap I8.x/I9.x/I10.x/I15.1

## Non-Blocking Follow-ups

- `gate-3-review.md` 中供 I12（整体 gate）复核的注意项（若有）以清单形式保留，I12 复用同一套输入结构。
- leafer 真实 API 抽查结论记录作为 I14 复测口径参考（mock↔真实漂移历史基线）。

## Closure

Status Note: 2026-08-04 关闭。I7.1 独立审查产出 `docs/analysis/industrial-hmi/gate-3-review.md`（判定 `revise`：0 Blocker / 3 Major / 8 Minor，3 项 Major 均为 mock 面错误建模掩蔽的真实 leafer live defect），文件自身经 3 轮文档共识审查达成 AGREE。I7.2 修正项全部落地（M-1 event 载荷读取面 / M-2 getByPoint target 解包 / M-3 zoomLayer move 符号 + mock 面修塑 + 回归测试；m-4 validate 内部结构校验补齐；文档 m-1/m-2/m-3/m-5/m-6/m-7 回写；m-8 归属 I14），I5 遗留事项（design-renderer.md:155 笔误、leafer API 抽查结论）落地。包级 273 tests 全绿、workspace typecheck/build/lint/test 全绿。无人工确认触发（无范围/顺序/选型变化）；roadmap I7 `planned → done` 由独立 closure-audit 核验后回写。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）——Round 1（task `ses_03749cd64ffePXYyo2oVPkjaYr`）判定 `issues`：Issue 1（Minor）gate-3-review.md 头部缺 R3 AGREE 确认轮条目；Issue 2（Nit）daily log/roadmap 回归测试计数表述不精确（live 为新增 6 个 it、m-4 3 组 18 个非法形态断言）。修复后 Round 2 确认轮（task `ses_03745beacffehdgq6AfDYQ6P0I`）判定 `approved`——六项检查全部核验通过（live repo 证据：M-1/M-2/M-3/m-1..m-8 逐条落地；273 passed / 20 files 复现 + coverage 90 达标；workspace typecheck/build/lint 32/32、test 59/59；plan 文本一致性无孤儿 `[ ]`；deferred 分类诚实；gate-3-review 引注与 §9 判定自洽）。
- Evidence: 见 `docs/logs/2026/08-04.md` I7 收口条目与 roadmap 头部 I7 gate 记录条目。

Follow-up:

- no remaining plan-owned work（in-scope 全 landed；deferred 项按 Successor Path 归属：架构文档同步 → I15.2、I10.2 五边界审计 → I10.2、gate 输出 I8+ 域问题 → I8.x/I9.x/I10.x/I15.1，见 Deferred But Adjudicated 与 gate-3-review.md §10）。
- leafer 真实 API 抽查结论记录作 I14 复测口径基线（mock↔真实漂移历史基线）。

## Optional Sections

## Risks And Rollback

- **gate 范围膨胀风险**：实现对照审查易滑向全量代码 review——Non-Goals 与 Scope Out Of Scope 已收紧（只查契约一致性/序列化完整性/性能路径/测试覆盖四个面 + leafer 抽查）；发现超出面的问题按 `fix-scope-expansion` Failure Path 显式归属。
- **修正引入回归风险**：I7.2 修正均携带 focused 回归测试（Bug Fix Test Coverage Rule），既有测试保持绿为硬约束；全量验证归 Closure Gates 兜底。
