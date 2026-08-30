# D1-1 G-F option-row 通用原语产品化（含 G-F2 终态裁决）

> Plan Status: active
> Mission: ui-review
> Work Item: D1. 能力缺口产品化 plans —— G-F option-row 原语（C2 §2 预清单第 1 位，D1 首个产品化 plan）
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（D1 条目 + Phase Details D1 + Cross-Cutting 4/5）；C2 裁决文档 `docs/analysis/ui-review/C2-capability-gaps.md`（初版裁决表 G-F/G-F2 行 + §2 D1 产品化输入预清单 1/6 + 回写 ①②④⑦ 素材）；sundial 分析 `docs/analysis/sundial-ui-reproduction-analysis.md` §5 G5 行（option-row 建议原文）；`docs/context/ai-autonomy-policy.md` Protected Areas（renderer 定义字段 plan-first / `ui/src/index.ts` ask-first / 样式契约 plan-first）
> Related: `docs/plans/2026-08-30-1333-1-p7b-stripe-interaction-wiring-and-tests.md`（同批起草，执行顺序在本计划之前）；`docs/plans/456-flux-renderer-improvements-plan.md`（语义字段先例：collapse tone/count/leading、checkbox shape、chart `colorRegionKey`、`resolveSurfaceMeta` 共享工具）；`docs/plans/460-sundial-replica-full-interactions-reimplementation-plan.md`（settings rail 双渲染实测成本来源）
> 执行顺序约束：D1 触发条件已满足（C2 `done` + P4b `done` + P6b `done`）；roadmap Phase Status 顺序 P7b 在前——本计划在 P7b plan `done` 前不得开始执行；两计划无内容冲突（P7b 零 `packages/` 改动，本计划零 playground 复刻页改动）

## Purpose

把 C2 裁决为 **G-F（hover/选中态 schema 表达，L3，已裁定 D1 候选首项）** 的缺口产品化：为行类渲染提供统一的「交互态状态源 + 样式消费通道」原语（working name `option-row`，终名与契约形态 Phase 1 Decision 裁定），使「行 = 图标 + 文本 + 值 + 选中态」成为 schema 可表达、渲染器语义字段 + marker 输出承载的能力，消解 R2 族2「状态已发射、样式零消费」的 schema 层缺口；同 plan 完成 G-F2（className 表达式绑定）在回写 ⑦ 精化后的终态裁决并回写 C2。

## Current Baseline

- **C2 裁决与证据链（live 文档核对 2026-08-30）**：
  - 初版裁决表 G-F 行：**L3**，状态「已裁决，D1 候选首项」，证据 = sundial G5 预登记 + plan460 双渲染实践（settings rail 5 行 ×2 份实测成本）+ C1 §2 五页命中。
  - 回写 ①（R2）：族2「状态已发射、样式零消费」（button-group 选中态、TableRow 选中、calendar 拖拽悬停、notice-bar 变体等）为 276 条发现中的高频族，与 G-F 同源——schema 层无选中/hover 态表达通道、渲染器层有状态无样式，双向佐证。
  - 回写 ②（R3）：批次⑨已修 button-group 选中态（`data-selected:` 消费类补齐）——修复面在渲染器层；族2 其余成员（TableRow 选中、gantt 任务条选中、ai-feedback 投票态、notice-bar 变体、calendar drop-target）按 R3 裁决登记 successor 候选（台账 `r2-audit/r3-p2-adjudication.md`）。结论：凡 schema 无法表达的状态，最终都要在渲染器层逐个补丁；option-row 原语可一次性消解该族。
  - 回写 ④（P3b）：cal 槽位三态形态 L1 可解，但三态/hover 靠 CSS 类 + visible 表达式模拟，双渲染成本随状态数线性增长——option-row 语义缺口维持。
  - 回写 ⑦（P6b，关键精化）：**表达式 className 状态驱动成立**（A9 行高切换实测）——「schema 层无选中/hover 态表达通道」的口径精化为「**表达式机制本身可用，缺口在交互态状态源**（选中集/键盘焦点/hover 等状态无 schema 承载）」；G-F 首项依据不变，G-F2 缺口面收窄。
- **列表类原语已部分具备（live 实测 2026-08-30）**：
  - `packages/flux-renderers-data/src/list-renderer.tsx`（477 行）已有 `selectionMode`（single/multiple/none）、行级 `data-selected`/`aria-current`、`onSelect`、`list:selection-change` 事件与失效键驱逐（G12）——list 的选中**状态源**在库，缺 hover/pressed 等瞬态源与统一的样式消费通道。
  - `packages/flux-renderers-data/src/table-renderer/` 已有 `rowSelection`（`table-body-row-rendering.tsx`）与 `selectedRowKeys`/`selectionOwnership`/`selectionStatePath`（`use-table-handle.ts`/`table-data.ts` 等 hooks，P4b 实测 scope 契约）；行 keydown 中继在库（声明 `onRowClick` 后 tabIndex=0 + Enter/Space 中继，P6b 实测）——table 与 list 为**两套平行选中 API**（回写 ⑤：crud `$crud.*` 与 table scope 契约不可平移）。
  - container 裸行（sundial settings rail 场景）零选中语义，只能 visible 双渲染或 CSS `.group:hover` 模拟（plan460/回写 ④ 口径）。
- **先例模式**：plan 456 语义字段族（collapse tone/count/leading、checkbox `shape`、chart `colorRegionKey`、`responsive` 容器）+ `resolveSurfaceMeta` 共享工具——「语义字段 + marker 输出 + 共享 helper」为本项目扩展 renderer 能力的既定模式（roadmap Cross-Cutting 4）。
- **门禁与保护区域（live 实测）**：`scripts/check-renderer-definition-fields-only.mjs` 在库（renderer 定义字段门禁）；`check:audit-event-dispatch-ctx` 覆盖 14 个 renderer 包；Protected Areas——renderer 定义字段 **plan-first**（owner evidence = `docs/references/renderer-interfaces.md` 对齐）、`packages/ui/src/index.ts` **ask-first**（若契约需新增 ui 公共导出，Phase 1 必须显式标注 ask-first 门禁并给出理由）、样式契约 **plan-first**（`docs/architecture/styling-system.md` 对齐）。
- **基线命令现状**：master 合流前 ui-review 分支 full-green 基线（P7a closure 记录：typecheck/build/lint 37/37、test 68/68 任务、check exit 0 零新增红）——本计划启动时按惯例 live 复核。

## Goals

- **契约落地**：option-row 语义契约定形并落字（承载形态、状态源机制、字段族、marker/属性输出约定——候选集 Phase 1 Decision 裁定），沿「语义字段 + marker 输出」契约（styling-system Renderer Styling Contract），不改既有布局/样式分层。
- **核心消费者实现**：list renderer（状态源最全的主消费者）+ table 行（族2 代表）按裁定契约接入，先红后绿单测锁定（选中/hover/disabled 态的属性与类输出、选中值绑定、向后兼容）。
- **族2 复用验证**：≥1 个 R2 族2 成员（候选：notice-bar 变体 / ai-feedback 投票态 / calendar drop-target，终集 Phase 1 按修复成本裁定）经原语消解验证——证明「一次性消解该族」的裁决成立。
- **G-F2 终态裁决**：基于回写 ⑦ 精化口径裁定 G-F2 终态（候选：关闭（被 G-F 吸收 + 表达式机制已证）/ 收窄为文档项），回写 C2。
- **owner docs 对齐**：`docs/references/renderer-interfaces.md`（Protected Areas 要求的对齐证据）+ flux-guide schema 作者条目；`docs/architecture/styling-system.md` 核查（若 marker 约定需补充则同步）。
- 全量验证 full-green + `pnpm check` 零新增红。

## Non-Goals

- **不一次性改造全部族2 成员**：未纳入终集的族2 成员（gantt 任务条、calendar drop-target 等余量）登记 Non-Blocking Follow-ups，按价值逐个采纳，不阻塞本计划 closure。
- **不做 G-B2 键盘导航框架**：focus 态的框架级管理（roving/chord/焦点环漫游）归 G-B2（L4，flux-core 保护区域流程）；本原语只**暴露/消费**行级 focus 状态源，不实现焦点管理框架——边界 Phase 1 落字。
- **不改 crud 选择集 scope 契约**（`$crud.*`）：两套平行选中 API 的统一属后续契约治理，Phase 1 只落字共存边界，不在本计划合并。
- **不动 playground 复刻页**：sundial settings rail 等复刻页的 option-row 化改造（消解双渲染）登记 Follow-up，不回写历史 plan 产物。
- **不做 D1 其余候选**：G-B1 command-palette、G-A 页面模板、G-B2 键盘框架、G-B3/G-C/G-D 语义件族按 C2 §2 排序由后续独立 plan 承载（D1 为逐项转 plan 的持续过程）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/list-renderer.tsx` 及其 schema/定义文件（主消费者）
- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` 及相关 hooks（族2 代表消费者）
- 族2 终集成员所在 renderer 包（Phase 1 裁定；候选成员→包映射以 Phase 1 inventory 实测为准：notice-bar → `flux-renderers-mobile`、ai-feedback → `flux-renderers-ai`、calendar/gantt → `flux-renderers-scheduling`）
- 共享语义 helper 落点（Phase 1 裁定，沿 plan 456 共享工具先例；若需新增 `packages/ui` 公共导出则走 ask-first 门禁）
- 各落点 `__tests__/` 先红后绿单测；`docs/references/renderer-interfaces.md`、`docs/architecture/styling-system.md`（核查制）、`flux-guide/`（schema 作者条目）、`docs/analysis/ui-review/C2-capability-gaps.md`（回写）

### Out Of Scope

- `packages/flux-core/src/`（编译器/scope 求值内核——表达式机制已被 P6b A9 证实可用，无需内核改动；若 Phase 1 实测撞内核边界，按 Protected Areas 停止并重开 plan）
- G-B2 焦点管理框架、crud/table 选中 API 合并、复刻页 retrofit、D1 其余候选

## Failure Paths

| 可测场景编号            | 触发                                                                   | 行为（含契约语义）                                                                 | 可重试 | 用户可见表现                        |
| ----------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ | ----------------------------------- |
| opt-row-compat          | 既有 schema 未声明 option-row 字段                                     | 渲染输出与现行为等价（渲染快照对比断言）                                           | 否     | 零变化                              |
| opt-row-value-invalid   | 选中值绑定表达式求值失败/空                                            | 兜底为无选中态，不抛错中断渲染（错误通道走既有 renderer 错误约定）                 | 否     | 行无选中标记                        |
| opt-row-hover-touch     | 触摸设备无 hover 语义                                                  | hover 态通道 no-op（`@media (hover:)` 或等价机制，Phase 1 落字）                   | 否     | 触摸端无 hover 视觉，选中态不受影响 |
| opt-row-selection-clash | option-row 选中值绑定与 list selectionMode/table rowSelection 同时声明 | 优先级与共存语义 Phase 1 裁定并落字（预期：显式 optionRow 优先，定义字段校验告警） | 否     | 按裁定行为渲染                      |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（公共契约面 + 核心回归路径；AGENTS.md Test Strategy Tiers「Must automate」——renderer 定义字段是 schema 公共契约，且 Protected Areas 要求 owner-doc 对齐）。对应 Proof 项先于 Fix：Phase 1 产出契约断言清单（属性/类输出矩阵 + 兼容矩阵），Phase 2/3 按「先红后绿」实现。消费面断言含：`data-selected`/语义 marker 类 computed 输出、选中值绑定驱动、hover 态类输出、无字段时渲染快照等价（兼容矩阵）。

## Execution Plan

> 顺序 Phase。Phase 1 契约裁定先行（Phase 2/3 全部依赖其断言清单）；Phase 4 文档与回写收口。

### Phase 1 - 契约设计与采纳面裁定

Status: planned
Targets: 本计划 Decision 注记、`docs/references/renderer-interfaces.md`（草案条目）

- Item Types: `Decision | Proof`

- [ ] Proof——消费面 inventory 实测落字：list/table/container 三类行载体的现状状态源与样式消费通道逐项登记（含 `use-table-selection.ts`/`list-renderer.tsx` 选中事件链、R2 族2 成员的「已发射状态」清单——以 r3-p2-adjudication 台账为底稿 live 复核）
- [ ] Decision——契约形态裁定（候选 ①行类 renderer 新增 `optionRow` 语义字段族（list 先行，逐 renderer 采纳）；②共享语义 helper + 属性/类输出约定（`resolveSurfaceMeta` 先例模式）+ 最小字段面；③新 renderer type `option-row`（sundial G5 原文建议之一））——含字段命名、与 `check-renderer-definition-fields-only` 门禁的登记、是否触及 `ui/src/index.ts`（ask-first 则显式标注理由并停在门禁）
- [ ] Decision——状态源机制裁定（候选 ①renderer 本地瞬态（hover/pressed）→ 语义 marker 类 + `data-*` 属性输出（CSS 可解，scope 零写入）；②选中态复用既有 scope 契约（list selection/table selectionStatePath）+ 行级表达式上下文补齐；③键盘 focus 态仅暴露状态源（消费归 G-B2 边界））——三项可组合，逐项断言口径落字
- [ ] Decision——采纳面终集裁定：list（必选）+ table 行 + 族2 成员 ≥1（候选按「状态已发射、样式零消费」修复成本排序）+ container 裸行载体是否纳入（sundial 双渲染场景的代表消解，可延后至 Follow-up）——落字
- [ ] Decision——共存与兼容语义裁定：与 list `selectionMode`/table `rowSelection` 的优先级、选中值绑定失败兜底、触摸 hover 降级（Failure Paths 表终态化）——落字
- [ ] Decision——G-F2 终态裁决：基于回写 ⑦「表达式机制可用、缺口在状态源」精化口径，裁定 G-F2 关闭（被 G-F 吸收）或收窄为 flux-guide 文档项——落字（Phase 4 回写 C2 执行）

Exit Criteria:

- [ ] 五项 Decision 与一项 Proof（消费面 inventory）全部落字本计划（契约断言清单可清单化：属性/类输出矩阵 + 兼容矩阵）
- [ ] `docs/references/renderer-interfaces.md` 契约草案条目成形（Protected Areas owner evidence 就位）
- [ ] 若触及 `ui/src/index.ts`：ask-first 理由已落字且未在门禁前改码

### Phase 2 - 核心原语实现（list 先行，先红后绿）

Status: planned
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`、共享 helper（Phase 1 裁定落点）、`__tests__/`

- Item Types: `Fix | Proof`

- [ ] Proof——契约断言清单测试先行（红）：无字段兼容矩阵 + list 接入后的属性/类输出矩阵 + 选中值绑定用例
- [ ] Fix——list renderer 按裁定契约实现 option-row 语义（状态源接线 + marker/属性输出 + 失败兜底），共享 helper 同步落位
- [ ] Fix——定义字段登记（`*-definitions.ts`/schema 校验同步，`check-renderer-definition-fields-only` 门禁零红）

Exit Criteria:

- [ ] 先红后绿单测全绿（list 消费面全矩阵 + 兼容矩阵）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-data typecheck` + `pnpm --filter @nop-chaos/flux-renderers-data test` 通过（保证 Phase 3 可继续的局部验证）
- [ ] `check-renderer-definition-fields-only` 门禁零新增红

### Phase 3 - 采纳面扩展与族2 复用验证

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`、族2 终集成员所在包、`__tests__/`

- Item Types: `Fix | Proof`

- [ ] Fix——table 行按裁定契约接入（与 `rowSelection` 共存语义按 Phase 1 裁定），先红后绿单测
- [ ] Fix——族2 终集成员（≥1，Phase 1 裁定）经原语消解改造，先红后绿单测（「状态已发射、样式零消费」样本的 schema 级表达验证）
- [ ] Proof——消解验证结论落字：族2 成员经原语表达后渲染器层补丁是否可避免（回写 ② 裁决的实证闭环）

Exit Criteria:

- [ ] table + 族2 终集成员先红后绿单测全绿
- [ ] 族2 消解验证结论落字本计划
- [ ] 受影响包局部 typecheck/test 通过

### Phase 4 - 文档对齐与 C2 回写

Status: planned
Targets: `docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/architecture/styling-system.md`（核查制）、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [ ] `docs/references/renderer-interfaces.md` 契约条目终稿（与 live 行为逐项核对，区分「字段存在」与「语义落地」）
- [ ] flux-guide schema 作者条目（option-row 用法样例，含选中值绑定与状态类消费示例）
- [ ] `docs/architecture/styling-system.md` 核查：marker 输出约定若需补充则同步（无改动不写凑条目）
- [ ] C2 回写（追加式）：G-F 行落「已产品化（本 plan）」终态证据 + G-F2 终态裁决 + 族2 消解结论 + 未纳入终集成员的 successor 登记
- [ ] daily dev log 记录（`docs/logs/2026/08-30.md` 或实际执行日）

Exit Criteria:

- [ ] 三份 owner 文档落字/核查完成且与 live 行为一致
- [ ] C2 回写完成（初版裁决表零改动，追加式）
- [ ] daily log 已记录

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session 独立子 agent `ses_faeceb4d3ffeaPGsrBvwm81ga3`（R1 全量四查 review + R2 scoped re-check，同 session 两轮）
- Verdict: `pass`（R1 `revised`——1 Major + 4 Minor；全部修复后 R2 scoped re-check `pass`，另登记 1 条 cosmetic residual（Test Strategy 措辞回声）已随手修整）
- Rounds: 2
- Findings addressed: R1 Major ①In-Scope 族2 候选包错置（`flux-renderers-content` 无 notice-bar/ai-feedback——改为 `flux-renderers-mobile`/`flux-renderers-ai`/`flux-renderers-scheduling` 并交 Phase 1 inventory 执掌映射）；Minor ②Phase 1 Exit「六项 Decision」计数不实（改「五项 Decision 与一项 Proof」）；③Source 预清单引用 1/5 → 1/6；④table 契约字段归位文件收紧（rowSelection → table-body-row-rendering.tsx，selectedRowKeys/selectionOwnership/selectionStatePath → use-table-handle.ts/table-data.ts hooks）；⑤Failure Path「逐字节等价」改渲染快照对比口径——零残留 Blocker/Major

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处，Phase 内只做保证后续 Phase 能继续的局部验证。

- [ ] option-row 契约已落地且 Phase 1 断言清单全项有先红后绿证明（属性/类输出矩阵 + 兼容矩阵）
- [ ] 采纳面终集（list + table + 族2 终集成员）全部接入且单测全绿
- [ ] 族2 消解验证结论落字（回写 ② 裁决的实证闭环）
- [ ] G-F2 终态裁决已回写 C2（追加式）
- [ ] `docs/references/renderer-interfaces.md` 对齐完成（Protected Areas owner evidence）；styling-system 核查完成
- [ ] 无 in-scope live defect 或 contract drift 被静默降级（未纳入终集的族2 成员已显式登记 Follow-up）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增命中，红项仅限既有登记）

## Deferred But Adjudicated

### container 裸行载体（sundial settings rail 双渲染场景）option-row 化

- Classification: `optimization candidate`
- Why Not Blocking Closure: 原语契约的价值证明已由 list/table/族2 终集承载；复刻页 retrofit 属历史 plan 产物的改造，收益为维护成本优化而非契约缺口
- Successor Required: `no`
- Successor Path: Non-Blocking Follow-ups（复刻页迭代时采纳）

### 族2 未纳入终集成员（gantt 任务条选中、calendar drop-target 等余量）

- Classification: `optimization candidate`
- Why Not Blocking Closure: Phase 1 终集裁定 ≥1 个族2 成员完成消解验证即满足「一次性消解该族」的机制证明；余量成员为同机制的机械重复采纳
- Successor Required: `no`
- Successor Path: 按价值逐个采纳，随 C2 回写登记

## Non-Blocking Follow-ups

- crud `$crud.*` 与 table selection scope 两套平行选中 API 的统一契约治理（Phase 1 只落字共存边界）
- G-B1 command-palette、G-A 页面模板、G-B2 键盘框架、G-B3/G-C/G-D 语义件族——D1 后续独立 plan（C2 §2 排序）

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
