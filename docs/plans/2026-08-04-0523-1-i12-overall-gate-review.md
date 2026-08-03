# 1 I12 设计回顾与修正 #4（整体 gate）

> Plan Status: completed
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md`（I12、Cross-Cutting review gate 纪律/文档共识审查/人工确认阈值/Rule 4）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§八任务范围）、`docs/analysis/industrial-hmi/gate-3-review.md`（§10 I8+ 域问题归属记录、§11 收口动作清单、leafer 真实 API 抽查基线）、`docs/analysis/industrial-hmi/renderer-boundary-audit.md`（I10.2 五边界审计结论，I12 gate 输入）
> Related: 上游 `docs/plans/2026-08-04-0225-1-i9-device-symbol-library-wave4.md`、`docs/plans/2026-08-04-0225-2-i10-renderer-and-flux-integration.md`、`docs/plans/2026-08-04-0225-3-i11-event-linkage-and-canvas-interaction.md`（均 completed）；下游 roadmap I13（Playground 演示页）、I14（Benchmark）
> Mission: industrial-hmi
> Work Item: I12

## Purpose

执行第四个固定 review gate（I12，整体 gate）：由独立 agent（fresh session，不复用 I8–I11 执行上下文）对照需求（讨论文件 §八）+ 全部设计文档（4 份 `design-*.md`）+ I0.5 调研结论 + **I10 五边界审计结论**审查 I8–I11 实现（**功能完整性 / 性能 / 测试 / 文档**四个面，roadmap I12.1 定义），输出修正项并落地（I12.2），同时核对 gate-3-review §10 归属项是否全部按 successor 兑现。收口状态：I12.1/I12.2 全部完成、修正项落地、回归验证通过、roadmap I12 回写 `done`。

## Current Baseline

- I8（基础图元库 Wave 3，24 内置符号成型）、I9（工业设备图元库 Wave 4）、I10（React 渲染器与 flux 集成，含五边界审计落盘）、I11（事件联动与画布交互）均已完成，plan 全部 `completed` 且各自 closure-audit 通过；roadmap I8–I11 = `done`。
- I10.2 五边界审计已落盘 `docs/analysis/industrial-hmi/renderer-boundary-audit.md`（INV-1–INV-5 全通过 + Checklist A–F + 1 项契约裁定 D-1「`events.*` 事件通道，I15.2 同步路径」），文件明示「**本审计结论可作为 I12 整体 gate 输入**」。
- gate-3-review §10 记录了 I8+ 域问题归属（I8 产出时的显式记录）：I10.2 五边界审计 ✓、onReady/onError 桥接 ✓（I10.1/I10.3）、component:\* 句柄 ✓（I10.2）、wheel/pinch 钳制 ✓（I11.2）、hover 覆盖物 ✓（I8.2/I11.2）、flow 消费 ✓（I9.4）、**1 万点全量批量合并断言 + 组态 JSON 加载 batch.add 对照 → I14**（未兑现，I14 计划消费）、**e2e 程序化断言补强 → I15.1**（未兑现，I15.1 计划消费）——I12 gate 需核对前 6 项已兑现、后 2 项归属记录仍在。
- I5/I6 的 3 项 Major（M-1 事件载荷读取面 / M-2 getByPoint 返回值解包 / M-3 zoomLayer move 符号）已在 I7.2 修复并带回归测试；leafer 真实 API 抽查结论（gate-3-review §3）已记录为 I14 复测口径基线（mock↔真实漂移历史基线）。I12 gate 应复核这些修复未在 I8–I11 演化中被回退。
- I11 plan Non-Blocking Follow-ups：viewport 插件 wheel/pinch 与引擎钳制不一致的修正记录「供 I12 gate 复核输入」（I11.2 已落地引擎订阅 tree zoom/move 事件兜底 + 越界钳制 + 回归测试，记录于 daily log 08-04）。
- 真正剩余的 gap：I8–I11 实现未经整体 gate 审查——功能完整性（design-\*.md ↔ live 代码全链对照，含 I9 deferred 裁定「scada-symbol 不注册」回写核对）、性能路径（批量入树/合帧/脏区收集是否按设计落地）、测试覆盖（focused 断言非空洞、mock↔真实漂移面）、文档一致性（design-\*.md 与实现演进后的最终状态）；gate-3-review §10 归属核对未执行；I12 gate 注意项清单未产出（供 I13/I14/I15 复用）。

## Goals

- I12.1：独立 agent（fresh session）产出整体 gate 审查结论（`docs/analysis/industrial-hmi/gate-4-review.md`），判定 `pass` / `pass-with-minors` / `revise`，附分级修正项清单（Blocker/Major/Minor）与「任务范围 ↔ 设计文档 ↔ I8–I11 实现」差异清单逐项裁定；审查面覆盖功能完整性 / 性能 / 测试 / 文档。
- I12.2：修正项全部落地（回写代码/测试/设计文档；涉及范围/顺序/选型变化时回写 roadmap 并标记人工确认项）；补充回归验证。
- gate-3-review §10 归属核对：前 6 项（I10.2/I10.1/I10.2/I11.2/I8.2+I11.2/I9.4）已兑现确认、后 2 项（1 万点批量合并断言 + batch.add 对照 → I14、e2e 补强 → I15.1）归属记录核对无误。
- 产出 I12 gate 注意项清单（供 I13/I14/I15 复用同一套输入结构，对齐 I3 gate → I7 注意项 8 条先例）。
- roadmap Phase Status I12 回写 `done`；roadmap 头部 I12 gate 记录条目（对齐 I1.1/I3.1/I7 gate 回写先例，Rule 4）；每日日志记录收口摘要。

## Non-Goals

- 不评审 I0 调研报告（I1.1 已终轮复核）、设计文档（I3 gate 已复核）、I5/I6 实现（I7 gate 已复核）——本 gate 只整体审查 I8–I11 实现与文档最终状态。
- 不实现 I13（Playground 演示页）、I14（Benchmark）、I15（测试补强/文档收尾）——gate 发现的这些域的问题只记录归属（注意项清单），不落地。
- 不执行性能基准测量本身（I14 计划固化测量方法与基线；I12 只核对性能路径实现面与 design 的一致性）。
- 不重新裁定已落地的设计决策（如 scada-symbol 不注册、触发器体系不扩展、viewport 钳制兜底）——gate 只核对决策是否已回写设计文档与 roadmap、是否按裁定落地。

## Scope

### In Scope

- 起草 gate 审查输入（任务范围摘要 = 讨论文件 §八 + 与 roadmap 差异清单 + I12 注意项源清单（gate-3-review §10/§11 + I11 plan Non-Blocking Follow-ups）+ I8–I11 closure 证据集，供独立 agent 使用）。
- I12.1：独立 agent（fresh session）审查 I8–I11 实现，输出 `gate-4-review.md`（判定 + 修正项清单 + 差异清单裁定 + gate-3-review §10 归属核对 + I12 注意项清单）。
- `gate-4-review.md` 自身经独立文档共识审查（≤3 轮，0 新增修正项即共识，超限升级人工）。
- I12.2：按修正项逐条落地（代码修复 + 补充回归测试 + 必要时回写 `design-*.md` 与 roadmap，Rule 4）。
- `docs/logs/2026/08-04.md`（或当日日志）记录本 plan 产出摘要。

### Out Of Scope

- I13/I14/I15 实现（roadmap 顺序）；gate 发现的相关域问题记录于注意项清单（供下游计划消费），不落地。
- 架构文档（`docs/architecture/`）同步（属 roadmap I15.2 收尾，与 I2/I3/I7 deferred 裁定一致）。
- 性能基准测量与固化（I14）、e2e 程序化断言补强（I15.1）。

## Failure Paths

| 可测场景编号            | 触发                                                                                                                               | 行为                                                                                         | 可重试 | 用户可见表现                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| upstream-not-ready      | 前置未就绪——具体判定：roadmap I8–I11 全部 = `done` 且各 plan closure-audit 通过、`renderer-boundary-audit.md` 落盘、无待人工裁决项 | 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                                | 是     | plan 保持 `planned`/`in progress`，roadmap I12 保持 `todo`                                   |
| gate-revise-overrun     | 独立 agent 判定 `revise` 且修正项无法在文档共识审查轮次上限（≤3 轮）内收敛                                                         | 超限升级人工裁决（roadmap Cross-Cutting 轮次上限条款）                                       | 否     | gate 保持 `planned` + 人工确认标记，不进入 I13（下游 plan 含 `upstream-not-ready` 等待语义） |
| human-confirm-triggered | 修正项涉及范围/顺序/选型变化（如引擎选型变更、`scada-canvas` 公共契约重大变更）                                                    | 在 roadmap 标记人工确认项并暂停推进（roadmap「人工确认阈值」），不自动推进                   | 否     | 人工裁决后由 mission-driver 决定后续                                                         |
| fix-scope-expansion     | gate 输出超出 I8–I11 契约面修正范畴的实现债（如 I13+ 域缺陷、性能优化候选）                                                        | 显式记录归属（I12 注意项清单，供 I13/I14/I15 消费；已确认 live defect 不得降级为 follow-up） | 是     | 归属项在 roadmap/plan 注意项清单可追溯                                                       |
| regression-revealed     | 复核发现 I7.2 修复（M-1/M-2/M-3）在 I8–I11 演化中被回退或 mock↔真实漂移复发                                                        | 按修正项落地（回写实现 + 回归测试），判定 `revise`；修正后再复核                             | 是     | 修复后契约一致，I13+ 按修正后契约推进                                                        |

## Test Strategy

档位选择：`建议有测`——gate 修正项内容由独立审查产出，起草时不可预写失败测试；本 plan 固化纪律：**每个 Fix 项必须携带 focused 回归测试**（AGENTS.md Bug Fix Test Coverage Rule：验证正确行为而非仅无错误；非平凡 bug 记录 `docs/bugs/`）；修正项的测试断言以 gate-4-review.md 修正项清单为输入逐条落地；全量验证（typecheck/build/lint/test）归 Closure Gates。

## Execution Plan

### Phase 1 - I12.1 整体 review 执行

Status: completed
Targets: `docs/analysis/industrial-hmi/gate-4-review.md`、独立子 agent 审查过程

- Item Types: `Proof | Decision`

- [x] `Proof`：前置验证——具体判定：roadmap I8/I9/I10/I11 = `done` 且对应 plan（`docs/plans/2026-08-03-2307-3-i8-basic-symbol-library-wave3.md`、`docs/plans/2026-08-04-0225-1-i9-device-symbol-library-wave4.md`、`docs/plans/2026-08-04-0225-2-i10-renderer-and-flux-integration.md`、`docs/plans/2026-08-04-0225-3-i11-event-linkage-and-canvas-interaction.md`）closure-audit 通过、`renderer-boundary-audit.md` 落盘、无待人工裁决项；未就绪则等待（Failure Paths `upstream-not-ready`）。
- [x] `Decision`：roadmap Phase Status 回写 I12: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 I7 plan 先例）。
- [x] `Proof`：起草 gate 审查输入——任务范围摘要（讨论文件 §八）+ 与 roadmap 的差异清单 + I12 注意项源清单（gate-3-review §10 归属表/§11 收口动作清单 + I11 plan Non-Blocking Follow-ups 的 viewport 钳制修正记录 + I5/I6 M-1/M-2/M-3 修复与回归测试证据）+ I8–I11 plan closure 证据集（live 实现路径/测试覆盖/coverage 数字/deferred 裁定），供独立 agent 使用。
- [x] `Decision`：指定/确认 gate 输入证据集：4 份 `design-*.md`、`research-summary.md`（I0.5）、`renderer-boundary-audit.md`（I10 五边界审计结论）、I8–I11 实现源码与测试（`src/symbols/`/`src/renderer/`/`src/engine/`/`src/binding/`/`src/serialization/`）、`gate-3-review.md`（§10/§11）、I8–I11 plan 文件。
- [x] `Proof`：启动独立 agent（fresh session，不复用 I8–I11 执行上下文），对照输入整体审查实现，产出 `gate-4-review.md`：审查判定 + 修正项清单（分级）+ 差异清单逐项裁定 + **gate-3-review §10 归属核对结论**（前 6 项兑现确认、后 2 项归属记录核对）+ **I12 注意项清单**（供 I13/I14/I15 消费）。记录 task id。
- [x] `Proof`：`gate-4-review.md` 自身经独立子 agent（fresh session）文档共识审查（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工），共识记录写入文件头部。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。
>
> **写法原则**：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。全量验证属 Closure Gates。

- [x] `docs/analysis/industrial-hmi/gate-4-review.md` 存在，含：审查判定（`pass-with-minors`）、分级修正项清单（0 Blocker/0 Major/3 Minor）、差异清单逐项裁定（10 项）、gate-3-review §10 归属核对结论（8 项：前 6 兑现 + 后 2 归属）、I12 注意项清单（14 行）。
- [x] 文件头部文档共识审查记录闭环至达成共识（R1 `REVISE` 2 Nit 落地 + 3 Nit 反向落地驳回 → R2 `AGREE` 0 新增，2 轮 ≤3 轮上限），审查 task id 可查（R1 `ses_03667e126ffeRLYRYlA1Xd7PxL`、R2 `ses_0365de9afffeEij1ODWQe9refo`）。
- [x] 若触发「人工确认阈值」，触发事实已记录于 `gate-4-review.md`（roadmap 标记动作在 Phase 2 完成）——未触发（§9 声明：无引擎选型变更/无公共契约重大变更/无 benchmark 判定/无共识超限/无编辑器提前启动）。

### Phase 2 - I12.2 修正落地与回归验证

Status: completed
Targets: `packages/flux-renderers-industrial/src/**`、`docs/components/industrial-hmi/design-*.md`、`docs/components/roadmap-industrial-hmi.md`

- Item Types: `Fix | Decision | Proof`

- [x] `Fix`：按 `gate-4-review.md` 修正项逐条落地代码修正（每条落地同步 focused 回归测试——验证正确行为；测试断言以修正项清单为输入）。
- [x] `Fix`：修正涉及设计文档时回写 `design-*.md`（只写最终设计状态，`docs/architecture/` 文档同步属 I15.2 不在此列）。
- [x] `Decision`：若修正涉及范围/顺序/选型变化——更新 roadmap（Rule 4 回写）并标记人工确认项，暂停推进，人工裁决前 I13 不执行；未触发则 I13 按序推进。
- [x] `Proof`：补充回归验证——按 gate 修正项逐条验证（每个 Fix 项的 focused 测试断言行为正确；I8–I11 既有测试保持绿，不弱化既有覆盖）。
- [x] `Fix`：roadmap 头部「文档共识审查记录」块新增 I12 gate 记录条目（判定、修正项摘要、审查 task id）——对齐 I1.1/I3.1/I7 gate 回写先例，保持 gate 轨迹连续。
- [x] `Fix`：roadmap Phase Status I12 回写 `done`（前置：本 plan Closure Gates 全通过 + 独立 closure-audit 通过——由独立 closure-audit session 核验后执行）；`docs/logs/2026/08-04.md`（或当日日志）记录本 plan 产出摘要。

Exit Criteria:

- [x] `gate-4-review.md` 全部修正项已落地（逐条可追溯：代码/测试/文档回写位置）；新增/调整的 focused 回归测试断言正确行为且全绿。
- [x] gate-3-review §10 归属核对结论已记录（前 6 项兑现、后 2 项归属正确）。
- [x] I12 注意项清单已产出并可供 I13/I14/I15 复用。
- [x] 触发人工确认阈值时 roadmap 已标记并暂停推进；未触发时 roadmap I12 状态与本文一致（`planned` → `done` 由独立 closure-audit session 核验后回写）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，round 1，task `ses_0367ac1d1ffel2WIllEgsTCwhF`）
- Verdict: `pass`（round 1；零 Blocker/Major，3 Minor 全部落地）
- Rounds: 1
- Findings addressed: m-1 Phase 1 Exit Criteria 补「（roadmap 标记动作在 Phase 2 完成）」说明（对齐 I7 先例）；m-2 上游 plan 引用改全路径（`2026-08-03-2307-3-i8-*.md`/`2026-08-04-0225-1/2/3-i9/i10/i11-*.md` → 4 个完整路径）；nit-3 空 `## Optional Sections` 标题移除。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [x] `gate-4-review.md` 存在且达成文档共识（0 未裁定修正项）；I12.1 独立审查完成（task id 可查）。
- [x] 全部修正项已落地（无未落地修正项、无被静默降级项）；gate-3-review §10 归属核对结论已记录。
- [x] 补充回归验证已落地且全绿（每个 Fix 项有 focused 断言；既有 I8–I11 测试未被弱化）。
- [x] 触发「人工确认阈值」的修正项已在 roadmap 显式标记并暂停推进（若有）；未触发时 roadmap I12 已回写 `done`（前置：`todo → planned` 流转已在激活期完成，状态机未跳序）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（gate 输出中超出 I8–I11 契约面的事项已显式记录于 I12 注意项清单，无静默降级）。
- [x] `docs/logs/2026/08-04.md`（或当日日志）已记录收口摘要。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 架构文档冲突项同步

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本 gate 只记录实现与 `docs/architecture/`（renderer-runtime/模块边界）的冲突点与取舍理由（I2/I3/I7 deferred 同口径）；架构文档同步属 roadmap I15.2 收尾职责，不阻塞 gate 关闭与 I13 推进。
- Successor Required: `yes`
- Successor Path: roadmap I15.2（文档收尾）

### 性能基准测量与固化

- Classification: `watch-only residual`
- Why Not Blocking Closure: I12 只核对性能路径实现面与 design 的一致性（实例化/裁剪/脏区/合帧/批量入树路径），实际测量与基线固化属 roadmap I14（I14.1 固化测量方法、I14.3 复测结论）；gate-3-review §10 已把「1 万点批量合并断言 + batch.add 对照」归属 I14，本 gate 只复核归属记录正确，不提前测量。
- Successor Required: `yes`
- Successor Path: roadmap I14

### e2e 程序化断言补强

- Classification: `watch-only residual`
- Why Not Blocking Closure: 真实浏览器 e2e 程序化断言补强（场景树/点表刷新/事件联动）属 roadmap I15.1；首块可挂载页面为 I13.1 scada-demo（roadmap 既定顺序），I12 不写 e2e（gate 只核对实现契约面）。
- Successor Required: `yes`
- Successor Path: roadmap I13.1（挂载点）与 I15.1（断言补强）

## Non-Blocking Follow-ups

- I12 注意项清单（gate-4-review.md 产出）供 I13/I14/I15 复用同一套输入结构（对齐 gate-3-review §10 → I8+ 域问题归属先例）。
- leafer 真实 API 抽查结论（gate-3-review §3）继续作 I14 复测口径基线（mock↔真实漂移历史基线）。

## Closure

Status Note: 关闭完成（2026-08-04）——I12.1 独立整体 review 产出 `docs/analysis/industrial-hmi/gate-4-review.md`（判定 `pass-with-minors`，0 Blocker/0 Major/3 Minor m-A/m-B/m-C），经 2 轮独立文档共识审查达成 AGREE；gate-3-review §10 归属 8 项核对（前 6 兑现 + 后 2 归属正确）；I12 注意项清单 14 行产出供 I13/I14/I15 复用；I12.2 修正全部落地（m-A design-engine.md §4.4 锚点措辞；m-B use-scada-config-sync 初始视口策略收窄 full 路径；m-C interaction-overlay points 包围盒兜底）+ 2 个 focused 回归测试；包级 452 tests / 34 files 全绿（基线 450 未弱化）、coverage 阈值 90 达标；workspace typecheck/build/lint/test 32/32 全绿；roadmap I12 `planned → done` 由独立 closure-audit 核验后回写。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general，fresh session），task `ses_0364f80e4ffeTiPLSv31oKSJqk`
- Evidence: 首轮核验 `issues`（2 Minor：F1 gate-4 §10 注意项清单行数 13→14 三处同步；F2 Phase 2 已落地项补勾 [x]）——执行侧落地后复验 `approved`：① plan/Phase/checklist 状态一致（Phase 1 completed、Phase 2 completed、Closure Gates 全 [x]，closure-audit 项由审计者确认勾选）；② m-A/m-B/m-C 三修正 live 逐项核验（design-engine.md:123 原点锚措辞 / use-scada-config-sync.ts:95-100 full 分支收窄 / interaction-overlay.ts:38-71 resolveOverlayGeometry points 包围盒 + MIN_OVERLAY_SIZE=8）且各带非空洞回归断言（lifecycle.test.tsx:255 diff 保持帧定 + 版本变更重帧；hover-overlay.test.tsx:169 line/polygon 覆盖物尺寸>0）；③ 包级 452/34 亲自复现；④ roadmap I12 审计时保持 `planned` 未跳序、I7 记录完好（git diff 仅 +1 行 I12 记录 + Phase Status 行）、I8–I11 done；⑤ deferred 分类诚实（3 项 watch-only/optimization + §10 归属一致，无静默降级）；⑥ M-1/M-2/M-3 未回退 spot check（event-bridge.ts:118-124 / hit.ts:25 / scada-engine.ts:314-320）。

Follow-up:

- 无 remaining plan-owned work；I12 注意项清单（gate-4-review.md §10，14 行）供 I13/I14/I15 消费；leafer 真实 API 抽查结论（gate-3-review §3）继续作 I14 复测口径基线。

## Risks And Rollback

- **gate 范围膨胀风险**：整体审查易滑向全量代码 review——Non-Goals 与 Scope Out Of Scope 已收紧（只查功能完整性/性能/测试/文档四个面 + §10 归属核对）；发现超出面的问题按 `fix-scope-expansion` Failure Path 显式归属（I12 注意项清单）。
- **修正引入回归风险**：I12.2 修正均携带 focused 回归测试（Bug Fix Test Coverage Rule），既有测试保持绿为硬约束；全量验证归 Closure Gates 兜底。
