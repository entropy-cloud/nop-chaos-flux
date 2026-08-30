# D1-3 G-A 页面模板层语义件族产品化（PageHeader / QueryFilter / Result）

> Plan Status: active
> Mission: ui-review
> Work Item: D1. 能力缺口产品化 plans —— G-A 页面模板层（C2 §2 预清单第 3 位，D1 第三个产品化 plan）
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（D1 条目 + Phase Details D1 + Cross-Cutting 4/5）；C2 裁决文档 `docs/analysis/ui-review/C2-capability-gaps.md`（初版裁决表 G-A 行 + §2 D1 产品化输入预清单 3/6 + 回写 ⑤ G-A 关联实测）；R1 对标 `docs/analysis/ui-review/R1-framework-benchmark.md`（§2.2 页面模板层 2 分 + §差距直译 G-A 行）；P2 分析篇 `docs/analysis/ui-review/P1-reference-apps/ant-design-pro.md`（I1/I15 + 保真度表 G-A 行）；`docs/context/ai-autonomy-policy.md` Protected Areas（renderer 定义字段 plan-first / 样式契约 plan-first）
> Related: `docs/plans/2026-08-30-1737-1-d1-gb1-command-palette-renderer-primitive.md`（同批起草，本计划在其后执行——两计划先后触碰 `flux-renderers-basic` 定义登记文件）；`docs/plans/2026-08-29-1240-1-p2a-antdpro-template-static-replica.md`、`docs/plans/2026-08-29-1413-1-p2b-antdpro-interaction-wiring-and-tests.md`（G-A 组装成本证据来源）
> 执行顺序约束：同批 plan 1（G-B1）`done` 前本计划不得开始执行（文件冲突面：`flux-renderers-basic` 定义登记；两计划无内容依赖）

## Purpose

把 C2 裁决为 **G-A（页面模板层缺口，L2，C2 §2 预清单第 3 位）** 的缺口产品化：R1 实测「flux 122 renderer 中无 PageHeader/QueryFilter/ResultPage 语义件，企业页全部手写组合」（页面模板层对标 2 分）。本计划把三个页面级语义件（PageHeader 页头 / QueryFilter 查询区 / Result 终态页）按 Phase 1 裁定的载体（既有 renderer 语义增强或新 renderer type）落地，使 AntD Pro `ProComponents` 式「页面级语义组件化」成为 schema 可表达的能力，消解 P2a/P2b 复刻实测的手工拼装成本（`antdpro-list.json` 页头 5 个 text 节点拼面包屑；R1 保真度表裁定 QueryFilter 查询区为 form 族 + container + collapse 手工组合（中保真，非 crud 场景查询区需手搭））。

## Current Baseline

- **C2 裁决与证据链（live 文档核对 2026-08-30）**：
  - 初版裁决表 G-A 行：**L2**，证据 = R1§2.2/§3、C1-10；裁决理由「语义件而非运行时能力；AMIS CRUD wrapper 同级对标」。
  - R1（live 复核）：`R1-framework-benchmark.md` §2.2「页面模板层」flux 评分 **2**——「无 PageHeader/QueryFilter/Result/页面预设语义件；19 页全部手写组合」；差距直译行「flux 122 renderer 中无 PageHeader/QueryFilter/ResultPage 语义件 ⚡（R0 §1/§4：企业页全部手写组合）」；对标正面参照「ProComponents 把页面级语义组件化（PageContainer/PageHeader/QueryFilter/ProTable/ProForm/ProDescriptions）」。
  - P2 复刻证据（live 复核 `ant-design-pro.md`）：保真度表「PageContainer（面包屑+标题+extra）→ page + text + button 组合，**低（缺页头预设）→ G-A**」「QueryFilter 查询区 → form 族 + container + collapse，中（G-A、G-F 注）」；I1 查询区展开/收起以 collapse 承载；I15 PageContainer = 面包屑+标题+extra 按钮区+内容 tab。
  - 回写 ⑤（P4b）：G-A 观察面三项 renderer 级 finding（kanban `cardTemplate` region 无 params 绑定、kanban 拖拽源注册滞后、`container-body` wrapper 布局类不透传）——属骨架/区域绑定语义，**不在本计划范围**（登记 C2 观察面维持，处置归后续 renderer 修复流程/D1 输入池）。
- **page renderer 现状（live 实测 2026-08-30）**：`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:27-63` `type: 'page'`——regions：title/body/header/footer/aside；props：subTitle/remark/asidePosition/asideResizable/asideMinWidth/asideMaxWidth/asideSticky/statusPath + className 族。**无 breadcrumb、无 extra/actions 区、无内容 tab 语义**。
- **查询区现状（live 实测 2026-08-30）**：`packages/flux-renderers-data/src/crud-schema.ts`——`crud.queryForm`（`CrudQueryFormConfig`：layout/mode/columnCount/gap/defaultParams/parsePrimitiveQuery 等，:10-54）；crud 级 `filterTogglable`（展开/收起语义**在库且已消费**：`use-crud-filter-toggle.ts:16-40`——isMobile :16、defaultCollapsed 消费 :27、activeFilterCount :31-40）。**`queryForm.defaultCollapsed/collapsedLabel/expandedLabel`（crud-schema.ts:51 等）声明未消费**——唯一消费点 `use-crud-filter-toggle.ts:27` 读的是 `filterTogglable` 分支；`crud-query-region.tsx` 零 collapsed 命中。contract surface ≠ semantics 的在库样本，Phase 1 inventory 义务。
- **Result 现状（live 实测 2026-08-30）**：`result` renderer type 零命中；`flux-renderers-content` 有 `empty` 兄弟先例（`content-renderer-definitions.ts:98-110`：title/description/image/actions 字段族 + `actions` region）。
- **P2a/P2b 组装成本样本（live 实测 2026-08-30）**：`apps/playground/src/complex-pages/page-schemas/antdpro-list.json` 顶节点 `antdpro-page-header`（container）= `antdpro-breadcrumb` flex × 5 text 节点 + 标题 text + extra flex；查询区由 `crud` 内建 queryForm 承载（标准列表页），非 crud 场景（如 P3/P4 复刻页）查询区需手搭。
- **门禁与保护区域（live 实测）**：`scripts/check-renderer-definition-fields-only.mjs` 在库（`fields`+`propContracts` 双侧登记先例）；`check:audit-event-dispatch-ctx` 覆盖 14 个 renderer 包；Protected Areas——renderer 定义字段 **plan-first**（owner evidence = `docs/references/renderer-interfaces.md` 对齐）、样式契约 **plan-first**（布局类渲染器 emit marker class 语义须与 `docs/architecture/styling-system.md` 对齐）。预期不新增 `packages/ui` 导出（三语义件全部由既有 ui 组件组合），若 Phase 1 裁定需要则显式标注 ask-first 门禁。
- **基线命令现状**：ui-review 分支 full-green 基线（2026-08-30 P7b/D1-GF closure 记录：typecheck/build/lint 37/37、test 68/68、check exit 0 零新增红）——本计划启动时按惯例 live 复核。

## Goals

- **载体裁定**：三个语义件逐项裁定承载形态并落字（候选：既有 renderer 语义增强 L2 / 新 renderer type L3），含与既有 `page`/`crud.queryForm`/`empty` 的关系边界与 dead config（`queryForm.defaultCollapsed` 族）处置。
- **PageHeader 落地**：面包屑 + 标题 + extra 动作区（+ 内容 tab 候选）的语义承载，消解 5-text 手拼面包屑形态，先红后绿单测。
- **QueryFilter 落地**：独立可用的查询区语义件（查询/重置动作内建 + 展开/收起语义 + 网格布局），覆盖非 crud 场景（plain table/data-source 载体），先红后绿单测。
- **Result 落地**：status（success/error/warning/info）+ 图标 + 标题 + 描述 + extra/actions 的终态页语义件（`empty` 兄弟），先红后绿单测。
- **owner docs 对齐**：`docs/references/renderer-interfaces.md` + flux-guide schema 作者条目；`docs/architecture/styling-system.md` 核查；C2 回写（追加式，回写 ⑪）。
- 全量验证 full-green + `pnpm check` 零新增红。

## Non-Goals

- **不做 schema 模板预设库**：blocks 式「页面级即取即用」JSON 预设（整页模板分发）为独立候选（roadmap C2 预登记「页面模板 schema 预设」的另一半），本计划只做语义件原语；预设库登记 Follow-up。
- **不做框架 chrome**：ProLayout 式框架壳（顶栏/mix/side/top 布局）维持 P2b 回写 ③ 裁定（不新增 C2 行）。
- **不动 crud 既有 queryForm 主语义**：`crud.queryForm`/`filterTogglable` 行为零回归；dead config 处置（`queryForm.defaultCollapsed` 族）仅按 Phase 1 裁定做登记/接线/废弃标注之一，不改查询提交链路。
- **不处理回写 ⑤ G-A 观察面三项**：kanban cardTemplate params 绑定、拖拽源注册滞后、container-body wrapper 透传——维持 C2 观察面登记，不并入本计划。
- **不做 G-B3 批量栏 / G-C 多视图 / G-D 网格编辑**（C2 §2 第 6 位语义件族，独立 plan）。
- **不 retrofit 既有复刻页**：antdpro/cal/linear/notion/airtable/stripe 复刻页维持历史 plan 产物；语义件化改造登记 Follow-up。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/`（`page` renderer 及其 definitions/schema 文件——PageHeader 主候选落点之一）
- QueryFilter 落点包（Phase 1 裁定；候选：`flux-renderers-form`（表单语义件）/`flux-renderers-data`（与 crud 查询区同域）/`flux-renderers-basic`）
- `packages/flux-renderers-content/src/`（`result` 主候选落点——`empty` 兄弟先例）
- 各落点 `__tests__/` 先红后绿单测；`docs/references/renderer-interfaces.md`、`docs/architecture/styling-system.md`（核查制）、`flux-guide/`（schema 作者条目）、`docs/analysis/ui-review/C2-capability-gaps.md`（回写 ⑪）

### Out Of Scope

- `packages/ui/src/`（预期零改动；若裁定需要新 ui 导出则 Phase 1 显式标注 ask-first 并停门）
- `packages/flux-core/src/`（编译器/scope 求值内核）
- schema 模板预设库、框架 chrome、G-B3/G-C/G-D、复刻页 retrofit、crud 查询提交链路改动

## Failure Paths

| 可测场景编号            | 触发                                                           | 行为（含契约语义）                                                                       | 可重试 | 用户可见表现                 |
| ----------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ---------------------------- |
| pageheader-compat       | 既有 page schema 未使用新语义字段                              | 渲染输出与现行为等价（渲染快照对比断言）                                                 | 否     | 零变化                       |
| pageheader-overflow     | 面包屑层级过深/标题过长                                        | 溢出语义 Phase 1 裁定并落字（候选：截断 + title 提示 / 折叠），不溢出布局                | 否     | 按裁定行为显示               |
| queryfilter-no-form-ctx | QueryFilter 脱离 crud 单独使用、未接 data-source               | 查询/重置动作仅派发 schema 声明链（submitAction/reset 语义），无隐式取数，不抛错         | 否     | 按钮按声明链工作，无数据变化 |
| queryfilter-clash       | 与宿主 crud 同时声明查询语义（若裁定 QueryFilter 可嵌入 crud） | 共存/互斥语义 Phase 1 裁定并落字（预期：crud 内嵌场景以 crud.queryForm 为准并 dev warn） | 否     | 按裁定行为渲染               |
| result-status-invalid   | status 值不在四语义枚举                                        | 兜底 info 语义 + dev warn，不中断渲染                                                    | 否     | 按 info 样式显示             |
| dead-config-adopt       | 既有 schema 使用了 `queryForm.defaultCollapsed` 族字段         | 按 Phase 1 裁定行为执行（接线消费 / 废弃标注 + dev warn），零静默失效                    | 否     | 按裁定行为或显式告警         |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（公共契约面 + 核心回归路径；AGENTS.md Test Strategy Tiers「Must automate」——renderer 定义字段与语义件字段族是 schema 公共契约，且 Protected Areas 要求 owner-doc 对齐）。对应 Proof 项先于 Fix：Phase 1 产出契约断言清单（三语义件的字段/区域输出矩阵 + 兼容矩阵），实现 Phase 按「先红后绿」落地。消费面断言含：PageHeader 区域渲染与兼容矩阵、QueryFilter 查询/重置链路与展开收起、Result 四态映射与兜底、dead config 裁定行为。

## Execution Plan

> 顺序 Phase。Phase 1 载体裁定先行（Phase 2–4 全部依赖其断言清单）；Phase 2–4 逐语义件落地；Phase 5 文档与回写收口。

### Phase 1 - 消费面 inventory 与载体裁定

Status: planned
Targets: 本计划 Decision 注记、`docs/references/renderer-interfaces.md`（草案条目）

- Item Types: `Decision | Proof`

- [ ] Proof——消费面 inventory 实测落字：三语义件的既有载体现状逐项登记（`page` regions/props 全集、`crud.queryForm`+`filterTogglable` 消费链、`empty` 字段族、P2a/P2b 手搭形态清单——以本计划 Current Baseline 为底稿 live 复核）
- [ ] Decision——PageHeader 载体裁定（候选 ①`page` renderer 语义增强：新增 breadcrumb/extra/内容 tab 语义字段族（L2，零新 type）；②新 `page-header` renderer type 可组合进 page header region（L3））——含字段命名、区域结构、与 `header` region 的关系落字
- [ ] Decision——QueryFilter 载体裁定（候选 ①新独立 `query-filter` renderer type（查询/重置内建 + 展开/收起 + 网格布局，非 crud 场景可用）；②crud `queryForm` 能力补齐 + dead config 接线（不新 type）；③①+②：独立 type + crud 内嵌复用同一实现）——含落点包裁定（form/data/basic 候选）与 Failure Path 终态化落字
- [ ] Decision——Result 载体裁定（候选 ①新 `result` renderer type 落 `flux-renderers-content`（`empty` 兄弟：status 四语义 + title/description/extra/actions）；②`empty` 语义扩展）——含落点与字段族落字
- [ ] Decision——dead config 处置裁定：`queryForm.defaultCollapsed/collapsedLabel/expandedLabel` 声明未消费（crud-schema.ts:51 族）——候选：接线消费 / 废弃标注 + dev warn / 迁移至 filterTogglable——落字（Phase 3 执行）
- [ ] Decision——保护区域核查：是否触及 `packages/ui` 导出或 flux-core（预期均不触及；若触及则显式标注 ask-first 理由并停门）

Exit Criteria:

- [ ] 五项 Decision 与一项 Proof（消费面 inventory）全部落字本计划（契约断言清单可清单化：三语义件字段/区域输出矩阵 + 兼容矩阵）
- [ ] `docs/references/renderer-interfaces.md` 契约草案条目成形（Protected Areas owner evidence 就位）
- [ ] 门禁核查结论落字（`check-renderer-definition-fields-only` 登记路径 + ask-first 触发与否）

### Phase 2 - PageHeader 落地（先红后绿）

Status: planned
Targets: Phase 1 裁定落点（`flux-renderers-basic` page 族或新 type 文件）、`__tests__/`

- Item Types: `Fix | Proof`

- [ ] Proof——PageHeader 契约断言清单测试先行（红）：区域/字段输出矩阵 + `pageheader-compat` 兼容矩阵
- [ ] Fix——按裁定载体实现（面包屑 + 标题 + extra 动作区（+ 内容 tab 若裁定纳入），溢出语义按裁定），定义登记双侧同步
- [ ] Fix——`pageheader-overflow` Failure Path 行为断言

Exit Criteria:

- [ ] 先红后绿单测全绿（输出矩阵 + 兼容矩阵）
- [ ] `flux-renderers-basic` 局部 typecheck/test 通过

### Phase 3 - QueryFilter 落地与 dead config 消解（先红后绿）

Status: planned
Targets: Phase 1 裁定落点包、`packages/flux-renderers-data/src/crud-query-region.tsx`（dead config 处置若裁定涉 crud）、`__tests__/`

- Item Types: `Fix | Proof`

- [ ] Proof——QueryFilter 契约断言清单测试先行（红）：查询/重置动作链、展开/收起、网格布局输出矩阵
- [ ] Fix——按裁定载体实现（查询/重置内建动作语义 + 展开收起 + 布局字段），定义登记双侧同步
- [ ] Fix——dead config 按 Phase 1 裁定处置（接线/废弃标注/迁移），`queryfilter-clash`、`queryfilter-no-form-ctx`、`dead-config-adopt` 行为断言
- [ ] Proof——crud 既有 queryForm/filterTogglable 零回归断言（既有测试全绿 + 兼容抽查）

Exit Criteria:

- [ ] 先红后绿单测全绿（含 dead config 裁定行为与 crud 零回归断言）
- [ ] 落点包局部 typecheck/test 通过

### Phase 4 - Result 落地（先红后绿）

Status: planned
Targets: Phase 1 裁定落点（`flux-renderers-content` 或裁定包）、`__tests__/`

- Item Types: `Fix | Proof`

- [ ] Proof——Result 契约断言清单测试先行（红）：status 四语义映射矩阵 + extra/actions 区域 + 兜底
- [ ] Fix——按裁定载体实现（status 四语义 + 图标 + title/description/extra/actions），定义登记双侧同步
- [ ] Fix——`result-status-invalid` 兜底行为断言

Exit Criteria:

- [ ] 先红后绿单测全绿（四语义矩阵 + 兜底）
- [ ] 落点包局部 typecheck/test 通过

### Phase 5 - 文档对齐与 C2 回写

Status: planned
Targets: `docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/architecture/styling-system.md`（核查制）、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [ ] `docs/references/renderer-interfaces.md` 契约条目终稿（三语义件与 live 行为逐项核对，区分「字段存在」与「语义落地」）
- [ ] flux-guide schema 作者条目（三语义件用法样例：PageHeader 页头组装 / QueryFilter 非 crud 查询区 / Result 终态页）
- [ ] `docs/architecture/styling-system.md` 核查：语义件 marker/class 约定若需补充则同步（无改动不写凑条目）
- [ ] C2 回写（追加式，回写 ⑪）：G-A 行落「已产品化（本 plan）」终态证据 + 载体裁定 + dead config 处置 + 未纳入项（schema 预设库等）successor 登记
- [ ] daily dev log 记录（`docs/logs/{执行年}/{执行月}-{执行日}.md`，如 `docs/logs/2026/08-31.md`）

Exit Criteria:

- [ ] 三份 owner 文档落字/核查完成且与 live 行为一致
- [ ] C2 回写完成（初版裁决表零改动，追加式）
- [ ] daily log 已记录

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session 独立子 agent `ses_fadf0fd5cffeL2obcn1CNHz50o`（1 轮全量四查）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major，5 Minor）
- Rounds: 1
- Findings addressed: 5 Minor 全部随共识修复——①Purpose 查询区手拼归属错置（antdpro-list.json 实为 crud queryForm 承载；改为面包屑绑 antdpro-list.json、查询区手拼绑 R1 保真度表/非 crud 场景）；②`CrudQueryFormConfig` 行距 `:10-77` → `:10-54`；③`use-crud-filter-toggle.ts` 行距 `:17-29` → `:16-40`（isMobile/activeFilterCount 符号覆盖）；④R1 差距直译引文补回「R0 §1/§4：」前缀；⑤daily log 路径模板改 `{执行年}/{执行月}-{执行日}.md`

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处，Phase 内只做保证后续 Phase 能继续的局部验证。

- [ ] 三语义件按裁定载体全部落地且 Phase 1 断言清单全项有先红后绿证明（字段/区域输出矩阵 + 兼容矩阵）
- [ ] dead config（`queryForm.defaultCollapsed` 族）按裁定处置完成，零静默失效
- [ ] crud 既有 queryForm/filterTogglable 零回归
- [ ] `docs/references/renderer-interfaces.md` 对齐完成（Protected Areas owner evidence）；styling-system 核查完成
- [ ] 无 in-scope live defect 或 contract drift 被静默降级到 deferred / follow-up
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增命中，红项仅限既有登记）

## Non-Blocking Follow-ups

- schema 模板预设库（blocks 式整页模板分发，基于本计划语义件组装）——roadmap C2 预登记候选的另一半，独立后续 plan 候选
- 既有复刻页（antdpro 等）页头/查询区/终态页的语义件化 retrofit（复刻页迭代时采纳）
- 回写 ⑤ G-A 观察面三项（kanban cardTemplate params 绑定 / 拖拽源注册滞后 / container-body wrapper 透传）——维持 C2 观察面登记，归 renderer 修复流程/D1 输入池
- G-B3/G-C/G-D 语义件族（C2 §2 第 6 位）——独立 plan

## Closure

Status Note: <<完成或关闭时填写：为什么这个 plan 可以关闭>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
- <<或者明确写 no remaining plan-owned work>>
