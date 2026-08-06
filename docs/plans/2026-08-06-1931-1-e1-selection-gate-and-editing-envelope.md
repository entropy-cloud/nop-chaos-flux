# 2 Editor Mission E1 选型 gate + 编辑态包络确认

> Plan Status: completed
> Last Reviewed: 2026-08-06
> Source: `docs/components/roadmap-industrial-hmi-editor.md`（E1 work items E1.1/E1.2/E1.3、Phase Status、Cross-Cutting review gate/人工确认阈值/文档共识审查）、`docs/components/industrial-hmi/editor-initiation.md`（§4 选型考量 / §4.3 否决条件两项 / §5.2 编辑态包络 / §6 R1+R7 人工确认项）、`docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（E0 三项 spike 实测结论 + 编辑态包络数字候选 + 选型路径建议）
> Related: `docs/plans/2026-08-05-1645-1-editor-spike-three-verifications.md`（E0 上游 plan，已 completed）、`docs/plans/2026-08-04-0902-2-i16-editor-initiation-entry.md`（I16.1 立项入口）
> Mission: industrial-hmi-editor
> Work Item: E1

## Purpose

执行 industrial-hmi-editor mission 的 E1 work item（第一个固定 review gate）：由独立子 agent（fresh session）对照 spike 报告 + `editor-initiation.md §4` 裁定选型主路径（E1.1），基于 E0.3 性能数字确立编辑态 benchmark 包络并提交 R7 人工确认（E1.2），将选型与包络结论回写 roadmap 并完成共识审查 Round 1（E1.3）。

E1 是 spike（E0）与设计文档（E2）之间的决策 gate：把 spike 的"主路径建议（不裁定）"和"包络数字候选（不确立）"分别**裁定**为 mission 级结论，作为 E2 六份设计文档（尤其 E2.1 编辑器架构、E2.4 undo-redo、E2.6 renderer 契约）的权威输入。

## Current Baseline

- **E0 spike 已 done**（`docs/plans/2026-08-05-1645-1-*.md` closure-audit PASS，2026-08-05）：三项 spike 全绿，spike 报告 `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md` 经独立子 agent 文档共识审查 3 轮 AGREE。
- **选型路径建议（spike 产出，不裁定）**：路径 A（leafer-editor 插件底座 + 自研组态语义适配层）成立——主路径否决条件（手势仲裁不成立 / 事件族漂移成本 ≥ 自研成本）均不触发；E0.3 性能不影响选型主路径（仅触发 R7）。spike 报告「选型路径建议」给出 9 条关键设计约束（editable:true 双态开关 / 真实点击选中 / editor.move 经适配层抽纯 payload+nodeId / editor.cancel() 替代 list=[] / scale 改 width-height / rotateGap 吸附 / 框选 selectKeep / group 结构 diff / InnerEditor 依赖 inner-editor 插件）作为 E2.1 输入。
- **R1（选型变更）当前状态**：spike 三项均不触发 → **R1 不触发**（主路径 A 维持）。E1.1 的独立 review 若维持路径 A，R1 仍不触发；若 review 反转裁定（极低概率，需基于 spike 报告事实性错误），则触发 R1 人工确认 + 暂停 mission。
- **编辑态包络数字候选（spike E0.3 §3.5，不确立）**：三档位均有实测依据（headless+swiftshader 下界）——保守 ≥30fps@选区≤10k（方案 A 10k=32.2fps）/ 中性 ≥30fps@选区≤1k（1k≈50fps，1.6× 余量）/ 激进 ≥45fps@选区≤1k（逼近运行态 45fps 红线）。补充：10 万图元实例化 buildMs 239ms / final 内存 102.8MB（远低于 320MB 红线）/ editor.move per-call 同步 8–10ms(n≤1k)·20.7ms(n=10k) / 复合场景 drag 49.9fps+pan 41.4fps。
- **R7（编辑态包络数字确立）当前状态**：spike 不触发（候选实测达标），**留待 E1.2 确立 + R7 人工确认**。
- **spike 局限性（E1.2 必须处理的 caveat）**：spike 在 scratch 单层 App 测得；runtime 为 3 层 App（registry/样式解析/组态构建/React 桥接），实例化基线 scratch 239ms vs runtime 373ms（`benchmark-report.md §3.1`，约 1.56× 开销）。spike 报告明示"E1.2 编辑态包络确立时需在 runtime 3 层 App 下复测对照"。
- **覆盖物挂载形态建议（spike E0.3 §3.6，不裁定）**：推荐方案 A（leafer Editor 内置覆盖物），方案 B（自研挂 sky）作 fallback 路径 B（性能可行）。
- **runtime 复用点 10 项全部 live 核对**（`editor-initiation.md §3` + roadmap Cross-Cutting 复用表）：引擎层 / ConfigAdapter / 图元注册表 / 序列化 / 句柄面 / sky 覆盖物 / 测试句柄 / 绑定动画 / 事件派发 / benchmark 基座，其中 2 类需新造面 + 3 处衔接语义扩展（E2 设计裁定）。
- **roadmap Phase Status**：E0 `done`，E1 `todo`（本 plan 激活时 → `planned`）。
- **真实剩余 gap**：① 选型主路径尚未经独立 review gate 裁定为 mission 级结论；② 编辑态包络数字尚未从"候选"确立为"mission 级阈值"+ R7 人工确认未提交；③ 选型/包络结论尚未回写 roadmap 头部/总览（Rule 4）；④ E1 结论尚未作为 E2 输入正式交接。

## Goals

- **E1.1**：由独立子 agent（fresh session，不复用本 plan 执行上下文）完成 spike 结论 review，输出选型裁定（路径 A 确认 or 反转）；若维持路径 A，R1 不触发；若反转，标记 R1 人工确认并暂停 mission。
- **E1.2**：基于 E0.3 性能数字确立编辑态 benchmark 包络（从三档候选裁定一档为 mission 级阈值：拖拽响应 fps / 编辑操作响应延迟 / 覆盖物密集场景上限 / 内存），处理 spike 单层 App vs runtime 3 层 App 的 calibration caveat，正式提交 R7 人工确认项。
- **E1.3**：选型 + 包络结论回写 roadmap（头部记录 + 总览 + Rule 4 review gate 修正项回写），并完成 E1 阶段产物的文档共识审查 Round 1（独立子 agent，fresh session）。
- roadmap Phase Status 回写（E1: `todo` → `planned` 本 plan 激活时；→ `done` 留待 closure-audit 通过）。
- E1 结论作为 E2（编辑器设计文档）的权威输入正式交接（输入清单）。

## Non-Goals

- 不产出任何编辑器设计文档（E2 职责：6 份 design-\*.md）。
- 不创建 `flux-renderers-industrial-editor` 包 or 修改 `flux-renderers-industrial`（E4 职责）。
- 不实现任何引擎代码 / 编辑器代码 / renderer（E5+ 职责）。
- 不在 runtime 3 层 App 下对**编辑器本体**做最终性能验证——编辑器 renderer 尚未实现（E5）；E1.2 只做基于 spike 数据 + 已有 runtime benchmark 的 calibration 估计，编辑器本体在 runtime 下的最终包络验证留 E6（M1 gate）+ E9.2（M3 benchmark 复测），两者均已在 roadmap。
- 不重新跑 E0 spike（E0 已 done 且 closure-audit PASS；E1 消费 spike 产出，不重做）。
- 不执行 E3/E6/E8/E10 后续 gate。
- 不变更选型主路径（路径 A）——除非 E1.1 独立 review 基于 spike 报告事实性错误反转裁定（触发 R1 人工确认）；结构性调整仍由人审裁决（Rule 3）。
- 不修改 runtime mission 的 roadmap / 设计文档（本 plan 仅消费 runtime 已落地能力，不反向影响）。

## Scope

### In Scope

- **E1.1 选型 gate（独立 review）**：启动独立子 agent（fresh session），输入 = spike 报告全文 + `editor-initiation.md §4`（选型考量/§4.3 否决条件两项）+ roadmap Cross-Cutting「spike 先行纪律」+ 本 plan；输出 = 选型裁定文档（路径 A 确认 / 反转 + 依据 + R1 标记）。审查核对项：① spike 三项否决条件判定是否事实成立（手势仲裁 / 事件族漂移成本）；② 9 条关键设计约束是否可作为 E2 输入；③ 覆盖物挂载形态建议（方案 A）是否采纳；④ 是否存在 spike 报告未发现的事实性错误足以反转选型。
- **E1.2 编辑态包络确立**：基于 E0.3 三档候选裁定 mission 级编辑态包络阈值；处理 calibration caveat——用已有 runtime benchmark（`benchmark-report.md §3.1`：runtime 373ms vs scratch 239ms 实例化开销 + 运行态 ≥45fps 红线）估计 runtime 3 层 App 对编辑态 fps 的边际影响，给出保守裁定理由；产出编辑态包络规格（fps 阈值 / 编辑操作响应延迟上限 / 覆盖物密集上限 / 内存上限）；正式标记 R7 人工确认项（包络数字属 benchmark 验收阈值类，roadmap「人工确认阈值」）。
- **E1.3 回写 + 共识审查 Round 1**：选型裁定 + 编辑态包络规格回写 roadmap（头部「文档共识审查记录」+ 总览编辑态包络数字 + Phase Status E1 → `planned`/`done` + Rule 4 review gate 修正项若触发）；启动 E1 产物（选型裁定文档 + 包络规格）的文档共识审查 Round 1（独立子 agent，fresh session，≤3 轮）。
- roadmap Phase Status 回写 + daily log 追加 E1 条目。

### Out Of Scope

- 编辑器设计文档（E2）。
- 包基建 / 依赖引入（E4）。
- 编辑器实现（E5+）。
- 编辑器本体在 runtime 3 层 App 下的最终性能验证（E6/E9.2）。
- 重跑 E0 spike。
- runtime mission 任何代码或文档变更。

## Failure Paths

| 可测场景编号             | 触发                                                                               | 行为（含状态码/错误码）                                                                                             | 可重试 | 用户可见表现                                           |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| selection-reversal (R1)  | E1.1 独立 review 基于 spike 报告事实性错误反转选型裁定（路径 A → 路径 B）          | 标记 R1 人工确认（`editor-initiation.md §6 R1` + roadmap「人工确认阈值」）；mission 暂停至人工裁决；不自行改选型    | 否     | roadmap 出现 R1 人工确认标记；E1.2/E1.3 暂停；等待人工 |
| envelope-below-candidate | E1.2 calibration 估计显示 runtime 3 层 App 开销使候选包络不达标                    | 降档裁定（如激进 → 中性 / 中性 → 保守）+ 记录 calibration 依据；若三档均不达标，标记 R7 人工确认 + 提出包络调整建议 | 是     | 编辑态包络规格降档 + 理由记录；R7 人工确认项含调整建议 |
| consensus-round-limit    | E1.3 文档共识审查循环超 3 轮                                                       | 停止循环并升级人工裁决（roadmap Cross-Cutting）                                                                     | 否     | roadmap 头部记录超限事实，等待人工                     |
| spike-fact-dispute       | E1.1 review 发现 spike 报告事实性疑点但不足以反转（如 API 锚点 #4 漂移未充分评估） | 记录疑点为 watch-only residual（非阻断）；不触发 R1；疑点登记 editor mission Follow-up Backlog 供 E2 设计规避       | 否     | 选型裁定文档附 watch-only 疑点清单                     |

## Test Strategy

本档选择：`不适用：理由` —— E1 是决策 + 文档类 gate（选型裁定 / 包络确立 / roadmap 回写），不涉及任何仓库代码变更（仅修改 `docs/` 下文件）。E1 的"证据"是已完成的 E0 spike 实测数据（spike 报告）+ 已有 runtime benchmark（`benchmark-report.md`），不产出新的自动化测试；E1 的"验证"由独立子 agent review gate（E1.1）+ 文档共识审查（E1.3）承担。calibration 估计基于已有 benchmark 数字对比，不新建测试基座。

## Execution Plan

### Phase 1 - E1.1 选型 gate（独立 review）

Status: completed
Targets: `docs/analysis/industrial-hmi-editor/selection-gate-2026-08-06.md`（选型裁定文档，新建）、`docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（review 输入，只读）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Decision`：roadmap Phase Status 回写 E1: `todo` → `planned`（本 plan 激活为 active 时同步执行）。
- [x] `Proof`：启动独立子 agent（fresh session，不复用本 plan 执行上下文）执行选型 gate review——输入 = spike 报告全文 + `editor-initiation.md §4/§4.3`（否决条件仅两项：手势仲裁不成立 / 事件族漂移成本 ≥ 自研成本）+ roadmap Cross-Cutting「spike 先行纪律」+ 本 plan；审查核对项：① E0.1 手势仲裁成立性事实判定（深探针 P1 editable:true + 真实点击，非 mock 推断）；② E0.2 事件族 0 漂移 + 适配层 cost（小～中）事实判定；③ E0.3 性能候选达标（最低 32.2fps ≥ 30）且不影响选型主路径；④ 9 条关键设计约束可否作为 E2 输入；⑤ 覆盖物挂载形态方案 A 采纳是否合理；⑥ 是否存在未发现的事实性错误足以反转选型。
- [x] `Decision`：独立子 agent 输出选型裁定文档 `selection-gate-2026-08-06.md`——verdict（路径 A 确认 / 反转）+ 逐项依据 + 9 条设计约束确认/修正 + 覆盖物形态采纳 + R1 标记（维持路径 A → 不触发；反转 → 触发 R1 人工确认 + mission 暂停）。
- [x] `Fix`：若 verdict = 反转，标记 R1 人工确认（roadmap 头部 + 总览）+ 暂停 E1.2/E1.3 + 等待人工裁决；若 verdict = 维持路径 A，进入 Phase 2。

Exit Criteria:

> Phase 1 交付选型裁定 mission 级结论。纯文档/决策 Phase，无全量验证（plan guide Rule 18）。

- [x] 选型裁定文档 `selection-gate-2026-08-06.md` 落地（verdict + 逐项依据 + 设计约束确认 + 覆盖物形态 + R1 标记）。
- [x] 选型裁定基于 spike 报告事实（非 mock 推断、非臆断）；若 R1 触发，标记完整 + 人工确认路径清晰 + mission 暂停。

> Phase 1 执行证据：独立 fresh-session sub-agent `ses_0291d6101ffeZ40pbkdt3CFZH8` 完成 6 项核对审查，verdict = **维持路径 A**（两条否决条件均不触发 + E0.3 性能 main-path-neutral R7-only），R1 **不触发**，9 条设计约束全部确认 as-is，覆盖物方案 A 采纳，1 项 watch-only residual（rAF 驱动 fps 测量口径 nuance，非阻断，登记 editor mission Follow-up Backlog 供 E2 设计规避）。R1 不触发 → 进入 Phase 2。

### Phase 2 - E1.2 编辑态包络确立 + R7 人工确认

Status: completed
Targets: `docs/analysis/industrial-hmi-editor/editing-envelope-2026-08-06.md`（编辑态包络规格文档，新建）、`docs/analysis/industrial-hmi/benchmark-report.md`（runtime benchmark，calibration 输入，只读）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Proof`：calibration 估计（**定性类比，不对 fps 候选乘数值化系数**）——基于已有 runtime benchmark：实例化基线 runtime 3 层 App 373ms（`benchmark-report.md §3.1`）vs spike scratch 单层 239ms ≈ 1.56× 实例化开销（开销主要影响首屏，非 per-frame fps）；运行态 ≥45fps 红线（`benchmark-report.md §3.2` + 总览包络 line 16/183）；spike E0.3 editor.move per-call 同步成本 8–10ms(n≤1k) / 20.7ms(n=10k)（per-frame 路径，spike 已测）。估计：runtime 开销对编辑态拖拽 fps 的边际影响有限（fps 受 per-frame 同步 + 覆盖物渲染主导，两者 spike 已覆盖；实例化开销不进 per-frame 热路径），候选数字偏保守（headless+swiftshader 下界）。数值化 envelope 确认显式留 E6/E9.2（Exit Criteria 已含），不在 E1.2 闭环。
- [x] `Decision`：基于 calibration 估计，从 E0.3 三档候选裁定 mission 级编辑态包络阈值——产出 `editing-envelope-2026-08-06.md` 包络规格：① 拖拽响应 fps 阈值（建议采纳中性档 ≥30fps@选区≤1k，1.6× 余量；或保守档 ≥30fps@选区≤10k 视 calibration）；② 编辑操作响应延迟上限（<100ms，per-call 同步 8–20ms 远低于）；③ 覆盖物密集场景上限（选区规模上限）；④ 内存上限（≤320MB 运行态红线不变，编辑态 final 102.8MB 远低于）；⑤ 明确编辑器本体在 runtime 3 层 App 下的最终验证留 E6（M1 gate）+ E9.2（M3 benchmark 复测）。
- [x] `Decision`：正式标记 R7 人工确认项——包络数字属 benchmark 验收阈值类（roadmap「人工确认阈值」+ `editor-initiation.md §6 R7`），AI 产出裁定建议但不自行最终确认；R7 人工确认项含裁定建议 + calibration 依据 + 三档候选对比。
- [x] `Fix`：编辑态包络规格回写 roadmap 总览（编辑态 benchmark 包络数字从"待 E1 spike 后裁定"更新为裁定建议值 + R7 待人工确认标记）。

Exit Criteria:

> Phase 2 交付编辑态包络 mission 级裁定建议 + R7 人工确认项。纯文档/决策 Phase。

- [x] `editing-envelope-2026-08-06.md` 落地（包络规格四项 + calibration 估计 + 三档候选对比 + 裁定建议 + R7 标记）。
- [x] calibration 估计基于已有 benchmark 数字（非新建测试基座；非臆断），runtime 3 层 App caveat 显式记录。
- [x] R7 人工确认项标记完整（裁定建议 + 依据 + 人工确认路径清晰）；编辑器本体 runtime 最终验证归属（E6/E9.2）显式记录。
- [x] roadmap 总览编辑态包络数字更新为裁定建议值。

> Phase 2 执行证据：calibration §2 路径分析（runtime 1.56× 实例化开销不进 per-frame 热路径：注册表/样式/组态构建一次性 + React 桥接经适配层节流非每帧）；裁定中性档 ≥30fps@选区≤1k 为 primary 包络（1.6× 余量吸收 runtime 边际影响），保守档 ≤10k 降级 extended（7% 余量风险，留 E6/E9.2 确认），激进档 ≥45fps@≤1k 不采纳（10% 余量 + headless 帧钟波动不可靠）；R7 标记完整（裁定建议 + calibration 依据 + 三档对比 + 人工确认路径，AI 不自确认）；roadmap 总览 line 89 回写裁定建议值。`envelope-below-candidate` Failure Path 不触发（中性档达标，无需降档至保守以下）。

### Phase 3 - E1.3 回写 roadmap + 共识审查 Round 1

Status: completed
Targets: `docs/components/roadmap-industrial-hmi-editor.md`（头部记录 + 总览 + Phase Status）、`docs/analysis/industrial-hmi-editor/selection-gate-2026-08-06.md` + `editing-envelope-2026-08-06.md`（共识审查对象）、`docs/logs/2026/08-06.md`（daily log）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Fix`：选型 + 包络结论回写 roadmap——① 头部「文档共识审查记录」追加 E1 条目（选型 gate verdict + 包络裁定建议 + R7 标记 + 共识审查轮次）；② 总览编辑态包络数字更新（Phase 2 已部分回写，此处核对一致）；③ Rule 4 review gate 修正项回写（若 E1.1 review 或 E1.3 共识审查产生范围/顺序/选型相关修正）。
- [x] `Decision`：启动 E1 产物（选型裁定文档 + 编辑态包络规格文档，**即两份新建 E1 文档自身**——区别于 roadmap 头部已完成的 3 轮共识审查）的文档共识审查 Round 1——独立子 agent（fresh session，不复用本 plan 执行上下文），输入 = 本 plan + spike 报告 + `editor-initiation.md §4/§5.2/§6` + 两份 E1 产物文档；输出 = review 结论 + 修正项清单（Blocker/Major/Minor 分级）。轮次 ≤3，超限升级人工（Rule 5 + Cross-Cutting）。
- [x] `Fix`：修正项全部落地——回写两份 E1 产物文档 + roadmap；涉及选型/包络 reversal 的修正项回写 roadmap + 标记人工确认项（R1/R7）。
- [x] `Proof`：roadmap 头部记录共识审查轮次与判定（AGREE / REVISE 各轮次事实）。
- [x] `Fix`：daily log 追加 E1 条目（按 industrial-hmi runtime mission 先例格式：plan path + Phase 摘要 + workspace 验证状态 + closure-audit 状态 + Follow-up）。
- [x] `Fix`：E1 结论作为 E2 输入正式交接——在 roadmap 或 E1 产物文档中列 E2 输入清单（选型裁定 + 9 条设计约束 + 编辑态包络规格 + 覆盖物形态方案 A + 复用点 2 类新造面/3 处扩展衔接）。

Exit Criteria:

> Phase 3 交付 roadmap 回写 + 共识审查达成。纯文档 Phase。

- [x] roadmap 头部记录追加 E1 选型 gate + 包络裁定 + R7 + 共识审查摘要；总览编辑态包络数字一致；Phase Status 待 closure-audit 后回写 `done`。
- [x] 独立子 agent 文档共识审查完成（轮次 ≤3，AGREE 判定），修正项全部落地，证据记录在 roadmap 头部。
- [x] daily log 追加 E1 条目。
- [x] E2 输入清单就绪（选型 + 设计约束 + 包络 + 复用点）。

> Phase 3 执行证据：① 共识审查 Round 1 由独立 fresh-session sub-agent `ses_0291740fbffeAbZiLlKe5S9KA0` 执行，verdict = **AGREE**（0 Blocker / 0 Major / 0 Minor / 0 Nit），**Round 1 即达成共识**（连续一轮 0 新增修正项，未超 3 轮上限），无修正项需落地（Item 3 vacuously 满足）；② roadmap 头部追加 E1.1/E1.2/E1.3 三条记录（选型 verdict + 包络裁定建议 + R7 标记 + 共识审查 AGREE 摘要）；③ 总览编辑态包络数字（line 89）Phase 2 已回写，Phase 3 核对一致；④ **Rule 4 review gate 修正项：无触发**（E1.1 review 维持路径 A = 无选型变更；E1.3 共识审查 0 修正项 = 无范围/顺序/选型修正），无需回写；⑤ Phase Details E1 段增「E2 输入交接清单」（6 项）；⑥ Follow-up Backlog 增 `[E1.1-sg]` watch-only residual；⑦ 两份 E1 产物「文档共识审查记录」块回填 Round 1 AGREE；⑧ daily log `08-06.md` 顶部追加 E1 条目。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent `ses_02922bfa5ffe5DjYm79W8Qgjrp`（fresh session，不复用起草上下文）
- Verdict: `pass-with-minors`
- Rounds: 1（首轮即达成共识：0 Blocker / 0 Major / 3 Minor）
- Findings addressed:
  - **m-1（Minor，已落地）**：Phase 2 `Proof` citation 把「运行态 ≥45fps 红线」归到 `benchmark-report.md §3.1`（§3.1 实为首屏创建），≥45fps 实际在 §3.2 + 总览包络 → 拆分引用为 §3.1（实例化 373ms）+ §3.2/总览（≥45fps 红线）。
  - **m-2（Minor，已落地）**：calibration 表述偏自信 → 显式补「定性类比，不对 fps 候选乘数值化系数」+ 「数值化 envelope 确认显式留 E6/E9.2，不在 E1.2 闭环」防过度解读。
  - **m-3（Minor，已落地）**：Phase 3「共识审查 Round 1」可能与 roadmap 头部已完成的 3 轮混淆 → 补「即两份新建 E1 文档自身——区别于 roadmap 头部已完成的 3 轮共识审查」。
  - 引用全项经 live 核对（spike 报告/§3.5 三档/9 约束/spike 局限性/benchmark-report.md §3.1 373ms/renderer-helpers.ts:98 createNormalizedActionEvent/roadmap E1.1–E1.3）✅ 真实。E1.1 独立 review gate 机制 / E1.2 calibration 可行性（编辑器 renderer 未实现，无法在 runtime 下直测，定性类比 + E6/E9.2 数值化确认诚实）/ R7 framing（AI 产出建议 + 标记，人工最终确认，非 deferred defect）/ Closure Gates「纯文档计划」条款调用 均确认无误。

## Closure Gates

> **关闭条件**：所有条目 + 每个 Phase Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。
>
> **纯文档/决策 plan**：本 plan 不涉及任何仓库代码变更（仅修改 `docs/` 下文件），`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm build` 这些条目可从 Closure Gates 删除（plan guide「纯文档计划」条款）。但 E1 产物（选型裁定 + 包络规格）定稿前须经独立子 agent review gate（Phase 1）+ 文档共识审查（Phase 3）。

- [x] E1.1/E1.2/E1.3 三 Phase 全部 Exit Criteria 勾选。
- [x] 选型裁定 mission 级结论落地（路径 A 确认 or R1 反转人工确认标记完整）。
- [x] 编辑态包络规格落地 + R7 人工确认项标记完整（裁定建议 + 依据 + 人工确认路径清晰）。
- [x] calibration caveat（scratch 单层 vs runtime 3 层）显式记录；编辑器本体 runtime 最终验证归属（E6/E9.2）显式记录。
- [x] roadmap 头部 + 总览回写一致；Rule 4 review gate 修正项（若有）回写。
- [x] 独立子 agent 文档共识审查达成共识（AGREE 判定，≤3 轮）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 决策项（选型 + 包络必须落事实结论；R1/R7 人工确认项标记完整）。
- [x] daily log 追加 E1 条目。
- [x] E2 输入清单就绪。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

_（无——E1 的选型裁定与包络确立必须在 Exit Criteria 收口；R1/R7 为人工确认 gate（AI 产出建议 + 标记，不自行最终确认），不属于 deferred 项。）_

## Non-Blocking Follow-ups

- **InnerEditorEvent 文档列举遗漏**（来源：roadmap Follow-up Backlog `[E0-spike]` + spike 报告 §2.4）：`research-render-engines.md §5:122` 未枚举 InnerEditorEvent（无害漂移，由 `@leafer-in/editor` 导出）。建议补 §5:122 列名。**Why Not Blocking Closure**：该文档属 runtime mission 调研产物，遗漏不影响编辑器选型/包络/设计契约（spike 已真实抽取 InnerEditor 载荷）。E1.3 共识审查或后续 mission 节奏择期处理，非 E1 收口必需。
- spike 局限性中的 watch-only 疑点（若 E1.1 review 产生 `spike-fact-dispute` 类疑点）登记 editor mission Follow-up Backlog 供 E2 设计规避。

## Closure

Status Note: E1 选型 gate + 编辑态包络确认收口。选型维持路径 A（leafer-editor 插件底座 + 自研组态语义适配层），R1 不触发；编辑态包络采纳中性档 ≥30fps@选区≤1k（R7 待人工确认），保守档 ≤10k 降级 extended（留 E6/E9.2 确认），激进档不采纳；两份 E1 产物经独立子 agent 文档共识审查 Round 1 达成 AGREE（0 修正项）。E2 输入清单就绪。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session sub-agent `ses_02911fceeffelf4njkjwnh2e9g`（general subagent，非执行 session，2026-08-06）
- Verdict: **pass**
- Evidence: 8 项 checklist（A 计划完整性 / B E1.1 选型 gate 产物 / C E1.2 编辑态包络产物 / D roadmap 回写 / E daily log / F Non-Goals 合规 / G workspace 纯文档验证 / H deferred/follow-up 诚实）逐项 live repo 核对通过——3 Phase 全 Status `completed` + 全 items/Exit Criteria `[x]`；选型 gate verdict 维持路径 A + R1 不触发 + 9 约束确认 + veto-condition 精确两项 framing；编辑态包络 calibration 定性类比（不乘数值化系数）+ m-1 citation 修正正确（373ms→§3.1 / ≥45fps→§3.2）+ R7 裁定建议 framing；roadmap 头部 E1.1/E1.2/E1.3 三条 + 总览 line 89 + Phase Details E2 输入清单 + Follow-up `[E1.1-sg]`；daily log 顶部 E1 条目；`git diff --stat` 仅 `docs/` 文件变更（roadmap + daily log modified / 两份 E1 产物 + E1 plan untracked），零 `packages/`/`apps/`/`scripts/` 改动（纯文档 plan，workspace 验证按「纯文档计划」条款豁免）；Deferred But Adjudicated 显式空 + R1/R7 为人工确认 gate 非 deferred defect。2 项 Non-Blocking 观察：① `docs/plans/2026-08-06-1931-2-e2-editor-design-documents.md` 为并行 E2 plan 草稿（separate session 产出，非本 plan E1 Non-Goal 违规——plan 文档非 editor design content / 非代码，归独立 changeset）；② daily log 前瞻性表述（closure 后即准确）。verdict 许可 Plan Status → `completed`、Phase Status E1 → `done`、closure-audit gate `[x]`。
- 共识审查：两份 E1 产物文档共识审查 Round 1（独立 fresh-session sub-agent `ses_0291740fbffeAbZiLlKe5S9KA0`）判定 AGREE（0 Blocker / 0 Major / 0 Minor / 0 Nit），连续一轮 0 新增修正项，未超 3 轮上限。

Follow-up:

- R7 编辑态包络数字最终确认（待人工；AI 已产裁裁定建议 + 标记，`editing-envelope-2026-08-06.md §4`）。
- `[E1.1-sg]` rAF 驱动 fps 测量口径 nuance（watch-only residual，E2.1/E6/E9.2 复核；roadmap Follow-up Backlog）。
- 编辑器本体 runtime 3 层 App 下最终包络验证（E6 M1 gate / E9.2 M3 benchmark 复测，roadmap 已立）。
- `[E0-spike]` InnerEditorEvent §5:122 列举遗漏（无害漂移，未收口，按 mission 节奏择期处理）。
- 无 plan-owned remaining work（E1 选型裁定 + 包络确立 + 共识审查 + roadmap 回写 + E2 输入交接全部收口）。
