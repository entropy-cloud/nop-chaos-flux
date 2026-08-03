# 2 I1 设计回顾与修正 #1（调研 gate + 选型可行性 spike）

> Plan Status: active
> Last Reviewed: 2026-08-03
> Source: `docs/components/roadmap-industrial-hmi.md`（I1、Cross-Cutting review gate 纪律/人工确认阈值/文档共识审查）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§八任务范围）
> Related: `docs/plans/2026-08-03-1508-1-i0-research-and-source-downloads.md`（上游）、`docs/plans/2026-08-03-1508-3-i2-engine-design-docs.md`（下游，依赖 I1.2 结论）
> Mission: industrial-hmi
> Work Item: I1

## Purpose

执行 roadmap 第一个固定 review gate：① 由独立 agent（fresh session）对照任务范围（讨论文件 §八）+ 上游调研报告（I0.1–I0.5）+ 与 roadmap 的差异清单，审查 5 份调研报告的结论与选型（LeaferJS 底座），输出修正项并落地回写（I1.1），同时充当 I0 调研文档「文档共识审查」的终轮复核（不叠加额外审查）；② 用 leafer-ui 编写最小可行性 demo（10 万矩形创建/拖动/命中检测 + 组态 JSON 加载），实测验证性能与 API 契合度（I1.2），结论不成立时提出替代方案并标记人工确认。gate 通过后 I1 才能标 `done`，其结论作为 I2 设计文档的事实依据。

## Current Baseline

- I0 调研完成（若本 plan 激活时 I0 尚未完成，则本 plan 自动保持等待，不提前启动 gate 审查）。
- 5 份调研报告位于 `docs/analysis/industrial-hmi/research-*.md`（download/render-engines/scada-apps/supplement/summary），性能数字已逐项标注来源（官方自报 vs 第三方转述）并校准（I0.1）——**该事实以 I0 plan closure 为前提**（I0 尚未完成时上述产物不存在，本 plan 的 gate 审查不得提前启动）。
- 选型基线：LeaferJS（leafer-ui）为候选底座（讨论 §八 决策 2），**尚未经过实测验证**；讨论文件明确「引擎选型变更 / benchmark 不达标」触发人工确认（roadmap Cross-Cutting「人工确认阈值」）。
- spike 环境约束（roadmap Cross-Cutting「测试纪律」）：不引 node-canvas——leafer 的 Node 端渲染依赖 canvas 实现，因此 spike 必须跑在 headless Chromium（Playwright）中，经 `page.evaluate` 读场景树/性能计时做程序化断言，**禁止截图判定**。
- 真实 gap：① 调研结论未经独立 gate 审查；② 官方性能数字（百万图形 1.28s/320MB/60fps）无实测对照；③ leafer-ui API 与「组态 JSON 加载 + 自研语义层」的契合度未验证。

## Goals

- I1.1：独立 agent（fresh session）完成 5 份调研报告的 gate 审查，输出 review 结论 + 修正项清单；修正项全部落地（报告回写），涉及范围/顺序/选型变化的修正项回写 roadmap（roadmap Rule 4）并标记人工确认项。
- I1.2：完成 leafer-ui 最小可行性 demo（10 万矩形创建/拖动/命中检测 + 组态 JSON 加载），产出实测数据（创建耗时/fps/内存/JSON 加载行为），与官方自报数字对照；结论成立则确认选型，不成立则产出替代方案（含对比依据）并标记人工确认。
- gate 审查记录与修正项摘要回写 roadmap 头部（review gate 执行纪律）；I1 相关产物（gate 结论文档）经文档共识审查定稿。

## Non-Goals

- 不产出任何设计文档（I2 的职责）。
- 不创建 `flux-renderers-industrial` 包、不向仓库引入 leafer-ui 依赖（I4 的职责）——spike 依赖仅存在于 scratch 目录。
- 不实现任何引擎代码（I5）。
- 不执行 I3/I7/I12 后续 gate。
- 不因 gate 发现的问题直接修改 roadmap 结构——只标记人工确认项，结构性调整仍由人审裁决。

## Scope

### In Scope

- I1.1 独立 gate 审查（fresh session 独立 agent）：输入 = 讨论文件 §八任务范围 + 5 份调研报告 + 与 roadmap 差异清单；输出 = review 结论 + 修正项清单。
- 修正项落地：回写 5 份调研报告；涉及范围/顺序/选型变化的回写 roadmap 并标记人工确认（roadmap Rule 4）。
- I1.2 选型可行性 spike：scratch 目录（`~/sources/industrial-hmi-research/spike-leafer/`）中基于 leafer-ui 的最小 demo + Playwright headless 实测脚本。
- spike 实测数据记录与选型结论（确认 or 替代方案 + 人工确认标记）。
- roadmap Phase Status 回写（I1: `todo` → `planned` 激活时；→ `done` closure 通过时）。
- gate 结论文档（`docs/analysis/industrial-hmi/gate-1-review.md` 或对应调研报告头部记录）的文档共识审查。

### Out Of Scope

- 设计文档与设计决策（I2）。
- 包基建与依赖引入（I4）。
- 任何编辑器能力（I16）。
- Benchmark 正式化（I14，I1.2 只是可行性实测，不固化基准方法）。

## Failure Paths

| 可测场景编号          | 触发                                                                                                            | 行为（含状态码/错误码）                                                                                                          | 可重试 | 用户可见表现                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| gate-review-blocker   | 独立审查发现选型/范围级 blocker                                                                                 | 修正项落地回写；范围/顺序/选型变化 → 回写 roadmap + 人工确认标记                                                                 | 否     | roadmap 出现人工确认标记，mission 暂停至人工裁决   |
| spike-perf-fail       | 实测 10 万矩形性能未达 mission 验收包络（可交互 <45fps 或首屏 ≥2s 或内存 >320MB，roadmap I14.3 阈值；不设容差） | 记录实测数字对照；产出替代方案（Konva/Fabric/自研）+ 对比依据；判定基准见 Phase 2 Decision                                       | 是     | 人工确认项：选型变更需人审，不自动改选             |
| spike-json-fail       | 组态 JSON 批量加载/更新在 leafer 上出现 API 契合度问题                                                          | 记录具体 API 障碍（如缺层级结构、批量更新接口不满足）                                                                            | 是     | gate 结论中列出 API 契合度风险清单，供 I2 设计规避 |
| spike-env-fail        | Playwright headless 无法跑 canvas 渲染（字体/GPU/头less 差异）                                                  | 加 `--enable-precise-memory-info`（内存测量）/ 必要时 `--use-gl=swiftshader` 重试（Canvas 2D 通常无需 GPU flag，实测后按需启用） | 是     | 实测数据注明 headless 环境与真实浏览器的差异边界   |
| consensus-round-limit | 文档共识审查循环超 3 轮                                                                                         | 停止循环并升级人工裁决（roadmap Cross-Cutting）                                                                                  | 否     | gate 结论文档头部记录超限事实，等待人工            |

## Test Strategy

本档选择：`建议有测` —— spike 实测脚本（Playwright headless + `page.evaluate` 计时/读场景树）即本 plan 的核心验证手段，但 spike 目录位于 scratch（`~/sources/industrial-hmi-research/spike-leafer/`），**不落入仓库、不产出仓库级测试**；实测数字与结论写入 gate 结论文档供 I2 引用。gate 审查本身是独立 agent 人工核对，不属于自动化测试范畴。

## Execution Plan

### Phase 1 - I1.1 调研结论 review（gate #1 审查）

Status: planned
Targets: `docs/analysis/industrial-hmi/research-*.md`（5 份）、roadmap、gate 结论文档

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Decision`：roadmap Phase Status 回写 I1: `todo` → `planned`（本 plan 激活为 active 时同步执行）。
- [ ] `Proof`：确认 I0 的 5 份调研报告已就绪（若 I0 未完成，本 Phase 等待，不提前审查）。
- [ ] `Decision`：启动独立子 agent（fresh session，不复用 I0 执行上下文）执行 gate 审查——输入 = 讨论文件 §八任务范围 + 5 份调研报告 + 与 roadmap 的差异清单；输出 = review 结论 + 修正项清单（Blocker/Major/Minor 分级）。
- [ ] `Fix`：修正项全部落地——按清单回写对应调研报告；涉及范围/顺序/选型变化的修正项回写 roadmap（Rule 4）并标记人工确认项，暂停推进至人工裁决。
- [ ] `Proof`：gate 审查同时作为 I0 调研文档「文档共识审查」的终轮复核——gate 修正项全部落地且无遗留修正项即达成共识，记录到各报告头部「文档共识审查记录」；不额外叠加独立审查轮。
- [ ] `Proof`：gate 结论与修正项摘要回写 roadmap 头部（review gate 执行纪律要求）。

Exit Criteria:

- [ ] 独立 agent 完成 5 份报告的 gate 审查，审查结论（含轮次、判定、修正项清单）有据可查（报告头部记录或 gate 结论文档）。
- [ ] 修正项全部落地：报告回写可见（git diff 可证），涉及范围/顺序/选型变化的已回写 roadmap 并标记人工确认（若有）。
- [ ] I1.1 的修正项落地后，I0 调研文档共识审查达成共识（终轮复核 0 新增修正项）。

### Phase 2 - I1.2 选型可行性 spike

Status: planned
Targets: `~/sources/industrial-hmi-research/spike-leafer/`（scratch，不入仓库）、gate 结论文档

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Proof`：在 scratch 目录创建 spike 工程（Vite + leafer-ui），编写最小 demo：① 10 万矩形创建与渲染；② 视口拖动（wheel/pinch 平移缩放）fps 测量；③ 命中检测（点击坐标→图元解析）；④ 组态 JSON 批量加载与增量属性更新（模拟点表刷新）。
- [ ] `Proof`：Playwright headless Chromium 程序化实测（`page.evaluate` 计时 + 读场景树，禁用截图判定；必要时 `--use-gl=swiftshader` 处理无 GPU 环境），记录：创建耗时、拖动 fps、内存占用（`performance.memory` 或 CDP）、JSON 加载/更新延迟。
- [ ] `Decision`：实测数据以 **mission 验收包络为判定基准**（10 万图元可交互 ≥45fps / 首屏 <2s / 内存 ≤320MB，roadmap 总览与 I14.3 阈值；1 万点端到端刷新 <200ms 由 I14 正式固化，spike 仅记录 JSON 增量更新延迟作参考）——**包络任何一项未达标即判定不达标**（不设容差，如 42fps < 45fps 即不达标）→ 产出替代方案（Konva/Fabric/自研）对比依据并标记人工确认（roadmap「人工确认阈值」）；官方自报数字（100 万图形首屏 1.28s/320MB/60fps）仅作上下文对照，需按图元量级换算（10 万 ≈ 1/10 量级）后引用。
- [ ] `Fix`：按 I1.1 修正项与 spike 发现修正选型可行性结论，写入 gate 结论文档（或对应报告章节），结论区分「确认」/「有条件确认（列出 API 风险清单）」/「不成立（替代方案）」。
- [ ] `Proof`：gate 结论文档经独立子 agent 文档共识审查（≥1 轮，0 新增修正项即共识；≤3 轮，超限升级人工），记录到文档头部。
- [ ] `Follow-up`：把 spike 验证点与 API 契合度风险清单映射为 I2 设计文档必须回应的约束（供 `docs/plans/2026-08-03-1508-3-i2-engine-design-docs.md` 引用）。

Exit Criteria:

- [ ] spike 工程与实测脚本存在于 `~/sources/industrial-hmi-research/spike-leafer/`（scratch，仓库内无对应文件）。
- [ ] 实测数据（创建耗时/拖动 fps/内存/JSON 加载与更新延迟）已记录并与官方自报数字逐项对照。
- [ ] 选型结论明确：确认 / 有条件确认（带 API 风险清单）/ 不成立（带替代方案 + 人工确认标记）。
- [ ] 若出现范围/顺序/选型变化，roadmap 已回写并标记人工确认项（若有）。
- [ ] 每日日志（`docs/logs/2026/08-03.md`）已记录本 plan 产出摘要。

## Draft Review Record

- Reviewer / Agent: fresh sub-agent（general，rounds 1-3）
- Verdict: `pass`（round 3；round 1 `revised`，round 2 `pass-with-minors`）
- Rounds: 3
- Findings addressed: R1 Major「性能判定基准混用 10 万实测/100 万官方/验收包络」→ 判定锚定 mission 验收包络（≥45fps/<2s/≤320MB，不设容差），官方数字仅上下文对照并按量级换算；R2 Minors「>30% 条款残留」「包络引用缺 1 万点阈值」→ 移除容差表述、补充 I14 固化说明；选型裁决等待语义与 I2 计划 `upstream-not-ready` 对齐（Deferred 条目回写）。

## Closure Gates

> 纯文档 + scratch 实验计划：不修改任何仓库代码/依赖（spike 在 `~/sources/` 外部目录，报告与 roadmap 为 `docs/` 下文件），按 plan 指南从 Closure Gates 中删除 `pnpm typecheck`/`build`/`lint`/`test`。

- [ ] I1.1 独立 gate 审查完成，修正项全部落地，roadmap 已回写（含人工确认标记，若有）。
- [ ] I1.2 spike 实测完成，实测数据与官方数字对照记录在案；选型结论明确（确认/有条件确认/不成立+替代方案）。
- [ ] I0 调研文档文档共识审查经终轮复核达成共识（0 新增修正项）。
- [ ] gate 结论文档经文档共识审查定稿（≥1 轮，无未裁定修正项）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺项（spike 失败/环境失败均有记录与裁定；>30% 差异或选型变化均有人工确认标记）。
- [ ] roadmap Phase Status I1 已回写 `done`；`docs/logs/2026/08-03.md` 已记录收口摘要。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

### 选型变更（spike 不成立场景）的人工确认等待

- Classification: `watch-only residual`
- Why Not Blocking Closure: spike 结论若为「不成立」，本 plan 的职责是产出替代方案与对比依据并**标记**人工确认，而非替人决策改选型；标记后 I1 可正常关闭（gate 职责完成）。后续选型裁决期间，I2 计划保持等待（roadmap「人工确认阈值」：必须停下标记人工决策，不自动推进），**不并行起草设计文档**，避免按未定选型设计造成返工——此语义与 `docs/plans/2026-08-03-1508-3-i2-engine-design-docs.md` 的 `upstream-not-ready` 等待条款一致。
- Successor Required: `yes`
- Successor Path: 人工裁决后由 mission-driver 决定（可能产生替代选型的 I2 修订或新 plan）

### API 契合度风险清单（有条件确认时）

- Classification: `optimization candidate`
- Why Not Blocking Closure: spike 发现的 leafer API 障碍（如有）以风险清单形式写入 gate 结论，作为 I2 设计的规避约束；不阻塞 gate 关闭，因为契约规避策略属于设计阶段（I2）的交付。
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-03-1508-3-i2-engine-design-docs.md`

## Non-Blocking Follow-ups

- spike 工程目录保留在 scratch（不清理），供 I14 benchmark 阶段参考测量方法；若 I14 需要可再次运行。
- 若 spike 使用 `--use-gl=swiftshader` 等环境变通，记录在 gate 结论文档中，供 I14 测量方法固化时对比 headless 差异。

## Closure

Status Note: <<完成或关闭时填写：为什么这个 plan 可以关闭>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
- <<或者明确写 no remaining plan-owned work>>
