# D1-3 G-A 页面模板层语义件族产品化（PageHeader / QueryFilter / Result）

> Plan Status: completed（2026-08-30 五 Phase 全 completed + Closure Gates 全勾 + fresh session 独立子 agent closure audit APPROVED）
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

Status: completed
Targets: 本计划 Decision 注记、`docs/references/renderer-interfaces.md`（草案条目）

- Item Types: `Decision | Proof`

- [x] Proof——消费面 inventory 实测落字：三语义件的既有载体现状逐项登记（`page` regions/props 全集、`crud.queryForm`+`filterTogglable` 消费链、`empty` 字段族、P2a/P2b 手搭形态清单——以本计划 Current Baseline 为底稿 live 复核）——见下方「Phase 1 裁定记录 §Proof」
- [x] Decision——PageHeader 载体裁定（候选 ①`page` renderer 语义增强：新增 breadcrumb/extra/内容 tab 语义字段族（L2，零新 type）；②新 `page-header` renderer type 可组合进 page header region（L3））——见「Phase 1 裁定记录 §Decision 1」
- [x] Decision——QueryFilter 载体裁定（候选 ①新独立 `query-filter` renderer type（查询/重置内建 + 展开/收起 + 网格布局，非 crud 场景可用）；②crud `queryForm` 能力补齐 + dead config 接线（不新 type）；③①+②：独立 type + crud 内嵌复用同一实现）——见「Phase 1 裁定记录 §Decision 2」
- [x] Decision——Result 载体裁定（候选 ①新 `result` renderer type 落 `flux-renderers-content`（`empty` 兄弟：status 四语义 + title/description/extra/actions）；②`empty` 语义扩展）——见「Phase 1 裁定记录 §Decision 3」
- [x] Decision——dead config 处置裁定：`queryForm.defaultCollapsed/collapsedLabel/expandedLabel` 声明未消费（crud-schema.ts:51 族）——见「Phase 1 裁定记录 §Decision 4」
- [x] Decision——保护区域核查：是否触及 `packages/ui` 导出或 flux-core——见「Phase 1 裁定记录 §Decision 5」

#### Phase 1 裁定记录（执行时落字，2026-08-30）

**Proof——消费面 inventory 实测（live 复核 2026-08-30，以 Current Baseline 为底稿）**：

| 消费面                                                                | live 实测现状（HEAD）                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 本计划取用                                                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `page` renderer（`basic-renderer-definitions.ts:26-63` + `page.tsx`） | regions title/body/header/footer/aside；props subTitle/remark/aside\*/statusPath + className 族。页头机械（page.tsx:178-212）：title（h2）+ subTitle span + remark Tooltip + 移动端 aside 切换；`header` region 渲染到独立 `page-toolbar` slot（:213-217）。**无 breadcrumb、无 extra 动作区、无内容 tab 语义**——与 Current Baseline 记载一致                                                                                                                                                       | PageHeader 载体（Decision 1）                                                                                   |
| `crud.queryForm` 消费链                                               | `CrudQueryFormConfig`（crud-schema.ts:10-54）；authoring transform `createCrudQueryFormRegion`（data-schema-validation.ts:57-114）把 queryForm 降为嵌套 `{type:'form'}`（mode/columnCount/gap/labelWidth/labelAlign 转发 + 默认 Search/Reset 按钮接 `component:querySubmit`/`component:queryReset` crud 句柄）；crud-renderer.tsx:552-597 渲染 region + toggle 包络；`filterTogglable` 消费链：use-crud-filter-toggle.ts enabled（:19-21）/ defaultCollapsed（:23-27）/ activeFilterCount（:31-40） | QueryFilter 载体先例（Decision 2）——嵌套 form 组合 + toggle 包络形态                                            |
| dead config 面（**live 复核较底稿扩大**）                             | 底稿登记的 `queryForm.defaultCollapsed/collapsedLabel/expandedLabel`（crud-schema.ts:51-53）零消费点确认（全包 grep）。**新增实测**：`CrudFilterToggleConfig.collapsedLabel/expandedLabel`（crud-schema.ts:73-74）**同样声明未消费**——crud-renderer.tsx:567-578 硬用 i18n 常量（`t('flux.crud.collapseQuery')`/`t('flux.crud.expandQuery')`/`t('flux.crud.activeFilters')`），不读配置字段；`filterTogglable` 族仅 `defaultCollapsed`（use-crud-filter-toggle.ts:27）真正消费                       | dead config 处置（Decision 4）——两组字段分轨裁定                                                                |
| `empty` 字段族（content-renderer-definitions.ts:98-110 + empty.tsx）  | title/description（value-or-region）+ image（prop，lucide 图标名）+ actions（region）；组件经 ui Empty 原语组合（EmptyHeader/EmptyMedia/EmptyTitle/EmptyDescription + EmptyContent）                                                                                                                                                                                                                                                                                                                | Result 兄弟先例（Decision 3）；同包 `alert`（alert-renderer.tsx）为 level→色/图标映射 + 兜底 resolve 的更近先例 |
| P2a/P2b 手搭形态                                                      | `antdpro-list.json` `antdpro-page-header`（container）= 面包屑 flex × 5 text 节点 + 标题 text + extra flex；查询区由 crud queryForm 承载（标准列表页），非 crud 场景查询区手搭（R1 保真度表「中保真」裁定）                                                                                                                                                                                                                                                                                         | 消解映射（Purpose）；PageHeader 面包屑字段族面向该形态                                                          |

**Decision 1——PageHeader 载体**：候选 ① 采纳——`page` renderer 语义增强（L2，零新 type，与 C2 G-A 行 L2 裁决对齐）。

- 新字段族：`breadcrumb?: SchemaValue`（表达式能力 prop；条目形态 `{ label: string; href?: string }`，数组或求值为数组的表达式；条目非对象/缺 label 降级跳过，不中断渲染）；`extra` region（标题行动作区，`{ key:'extra', kind:'region', regionKey:'extra' }`）。
- 区域结构：`page-header` slot 内、标题行上方渲染 `<nav data-slot="page-breadcrumb" aria-label>`（`<ol>` + `<li>`，条目含 href 渲染 `<a>`、否则文本 span，条目间 chevron-right 分隔图标）；标题行右端渲染 `<div data-slot="page-extra">`（extra region 内容）。header 渲染条件从「title/subTitle/remark 任一」扩展为「title/subTitle/remark/breadcrumb/extra 任一」。与 `header` region 的关系：**正交不合并**——breadcrumb/extra 是页头语义字段（schema 数据驱动、渲染进 page-header slot），`header` region 维持渲染进 `page-toolbar` slot（page.tsx:213-217 自由内容区），两者可并存。
- 溢出语义（`pageheader-overflow` 终态）：**截断 + title 提示**——面包屑条目 `min-w-0 max-w-* truncate`（ellipsis）+ `title` 属性原生提示，容器 flex-wrap 允许换行；不做折叠交互（引入状态复杂度，截断已保证不溢出布局）。
- 内容 tab：**不纳入**——P2a I15 内容 tab 由既有 `tabs` renderer 在 page body 组合承载（零增量语义，不重复造 tabs），登记 Non-Goals。
- 登记：`PageSchema` 增 `breadcrumb?/extra?`；definition `fields` 追加 breadcrumb（prop）/extra（region）+ breadcrumb propContract 双侧登记；`packages/ui` 零改动（原生 nav/ol/li + 既有 `cn`/lucide 解析）。

**Decision 2——QueryFilter 载体**：候选 ③（限定版）采纳——新独立 `query-filter` renderer type 落 `packages/flux-renderers-data`，实现层复用 crud 的嵌套 form 组合与 toggle 包络先例（**crud `queryForm` 主语义零改动**，非运行时共享实例）。

- 落点包裁定：`flux-renderers-data`——嵌套 form 构建（`createCrudQueryFormRegion` 先例）、toggle 包络（crud-renderer.tsx:552-597）、Search/Reset 查询语义的领域知识全在本包；`flux-renderers-form` 是字段控件族（无查询区组合语义）；`flux-renderers-basic` 是结构件族。`category: 'data'`、`rendererClass: 'instance-renderer'` 无需（普通 renderer）、`sourcePackage: '@nop-chaos/flux-renderers-data'`。
- 字段族：`body?: SchemaInput`（查询字段，transform 消费）、`actions?: SchemaInput`（自定义动作按钮区，替换默认 Search/Reset）、`mode?/layout?/columnCount?/gap?`（form 转发，`resolveFormMode` 同款解析）、`submitLabel?/resetLabel?`（默认按钮文案，缺省 i18n `flux.common.search`/`flux.common.reset`）、`togglable?: boolean | { defaultCollapsed?; collapsedLabel?; expandedLabel? }`（展开/收起语义）、`onSubmit?/onReset?`（ActionSchema|ActionSchema[]，transform 消费——**不声明为 eventContracts**，组件不读 `props.events`，沿 data-source `onSuccess/onError` 的 lying-contract 防范先例登记为 prop + actionValue propContract）。
- authoring transform `transformQueryFilterAuthoringSchema`：`body` 存在时产出嵌套 `{ type:'form', id, body, mode, columnCount, gap, actionsClassName:'flex justify-end gap-2', actions: schema.actions ?? [默认 Search, 默认 Reset] }` 挂 `filterForm` region（定义登记 `{ key:'filterForm', kind:'region', regionKey:'filterForm' }`——crud `queryFormRegion` 同款先例）。默认 Search 按钮 onClick = `[{ action:'component:submit', componentId: formId }]`，`onSubmit` 降为嵌套 form 的 `submitAction`（form 校验→提交管线）；默认 Reset 按钮 onClick = `[{ action:'component:reset', componentId: formId }, ...onReset 链]`。
- 查询/重置内建语义（`queryfilter-no-form-ctx` 终态）：无 `onSubmit`/`onReset` 声明时，Search 提交空管线（零动作、不抛错、无隐式取数），Reset 仅经 form reset 句柄重置字段值——按钮按声明链工作，无数据变化。
- 展开/收起：组件级 toggle 包络（crud 形态），`togglable` truthy 启用；collapsed 态隐藏 form 并显示 `collapsedLabel ?? t('flux.crud.expandQuery')`（复用既有 i18n 键，零新键），展开态收起按钮 aria-label = `expandedLabel ?? t('flux.crud.collapseQuery')`；`defaultCollapsed` 初值（移动端不强制收起——crud isMobile 门禁为 crud 场景特有，query-filter 无该隐式行为）。
- 网格布局：经 transform 转发给嵌套 form 的 `columnCount`/`gap`（form 内建网格），不另造网格。
- `queryfilter-clash` 终态：**无隐式 host 检测、无 dev warn**。crud 内查询区主通道是 `crud.queryForm`+`filterTogglable`（文档级约定，写入 owner docs）；query-filter 嵌入 crud（如置于 toolbar）不被特殊处理——两机制各自操作作者声明的 scope 通道，无运行时冲突面。预期口径「以 crud.queryForm 为准并 dev warn」的 warn 分支**裁定不采纳**：host crud 检测无可靠锚点（crud 子树与 query-filter 无编译期关系；scope 链检测会误伤「query-filter 查询 crud 数据源」类合法用法），误报面大于收益。
- 登记：`QueryFilterSchema` 入 schemas.ts；`queryFilterRendererDefinition` 入 dataRendererDefinitions + index 导出；fields/propContracts 双侧登记。

**Decision 3——Result 载体**：候选 ① 采纳——新 `result` renderer type 落 `packages/flux-renderers-content`（`empty` 兄弟）。

- 落点与字段族：`ResultSchema { type:'result'; status?: ResultStatus; icon?: string; title?: SchemaInput; description?: SchemaInput; actions?: SchemaInput }`，`ResultStatus = 'success' | 'error' | 'warning' | 'info'`（默认 'info'）。
- 操作区命名裁定：**`actions` region 单通道**（否决 AntD `extra` 命名）——包内三个先例（empty/card/alert）均用 `actions`，同包命名一致性优先；plan Goal 中「extra/actions」取 actions 侧。
- 状态映射（alert-renderer.tsx 先例）：success→CheckCircle2 + `text-success`；error→XCircle + `text-destructive`；warning→TriangleAlert + `text-warning`；info→Info + `text-info`。`icon` 字段 lucide 覆盖 status 默认图标（empty/alert 同款 `resolveLucideIconStrict` 通道）。
- 兜底（`result-status-invalid` 终态）：status 非法值 → info 语义渲染 + dev warn（console.warn 一次），不中断渲染。
- 无事件契约（终态页无交互事件面；actions region 内按钮自带事件）。marker：root `nop-result` + `data-slot="result"` + `data-status` + `data-testid`/`data-cid`；widget 自样式（content 类，self-styled 契约面）。

**Decision 4——dead config 处置**（Phase 3 执行）：live 复核发现的两组字段**分轨裁定**——

- `queryForm.defaultCollapsed/collapsedLabel/expandedLabel`（crud-schema.ts:51-53）→ **废弃标注 + dev 告警**：JSDoc `@deprecated` 指向 `filterTogglable` + authoring transform emit 诊断（code `deprecated-field`，路径指向具体字段，说明 live 通道）。不接线：接线会隐式改变既有 schema 行为（静默展开→收起/凭空新增 toggle UI），且字段语义位置错置（toggle 是 crud 级语义非 queryForm 级）。零静默失效 = 迁移告警可见。
- `filterTogglable.collapsedLabel/expandedLabel`（crud-schema.ts:73-74，本次 live 复核新增登记的同族 dead config）→ **接线消费**：crud-renderer.tsx toggle 包络消费——collapsed 态文案 = `collapsedLabel ??` 既有逻辑（activeFilters 计数 / i18n），expanded 态收起按钮 aria-label = `expandedLabel ??` 既有 i18n。纯增量（字段此前无效果），无回归面，且作者声明位置本就正确——比废弃更符合意图。

**Decision 5——保护区域核查**：三语义件**均不触及** `packages/ui` 公共导出（page 用原生 nav/ol/li + 既有 cn/lucide 解析；query-filter 用既有 Button/form 组合；result 用 lucide-react 直引 + 原生元素——alert/empty 同款，无 ui 原语需求）与 `packages/flux-core`（零内核改动；query-filter 的 authoring transform 走 `RendererAuthoringTransformContext` 既有扩展点）。**ask-first 门禁不触发**。门禁核查：`check-renderer-definition-fields-only` 沿 fields 双侧登记（无 legacy `regions:[...]` 模式）预期零红；`check-schema-prop-coverage` Layer 2 要求新 prop 逐字段测试覆盖（契约断言清单已含）；`check:audit-event-dispatch-ctx` 无新增事件派发通道（onSubmit/onReset 非 eventContracts）。i18n 仅 `flux.page.breadcrumb` aria-label 一个新键（zh-CN/en-US 两 locale），flux-i18n 非保护区。

**契约断言清单（Phase 2/3/4 先红后绿依据）**：

1. PageHeader 输出矩阵 + 兼容矩阵：`pageheader-compat`（无 breadcrumb/extra 的 page schema 渲染结构与现行为等价——header 无 nav/extra slot）/ breadcrumb 静态数组渲染（nav[data-slot=page-breadcrumb] + ol>li × N，href 条目 `<a>`、无 href 文本、chevron 分隔）/ breadcrumb 表达式求值（scope 驱动）/ 条目缺 label 降级跳过不中断 / extra region 渲染于标题行右端 data-slot=page-extra / title+breadcrumb+extra 组合结构次序（breadcrumb 上、标题行中、extra 右）/ 仅 breadcrumb 无 title → header 仍渲染 / `pageheader-overflow`（条目 truncate 类 + title 属性存在）。
2. QueryFilter 输出矩阵 + 行为清单：定义契约（type/category/fields/propContracts 双侧）/ `body` → 嵌套 form 渲染（filterForm region）且 columnCount/gap 转发（form 网格列数断言）/ 默认 Search+Reset 按钮渲染（primary/outline 变体 + submitLabel/resetLabel 覆盖）/ Search 点击 → `onSubmit` 链派发（spy 断言，form submit 管线承载）/ Reset 点击 → 字段值重置 + `onReset` 链派发 / `queryfilter-no-form-ctx`（无声明链 → 点击零动作不抛错）/ 自定义 `actions` 替换默认按钮 / `togglable` 启用 toggle 头（chevron 按钮 + aria-expanded）/ collapsed 态隐藏 form + collapsedLabel 文案 / `defaultCollapsed` 初值 / 展开恢复 / mode 转发（inline → form mode）/ `queryfilter-clash`（query-filter 独立使用零 dev warn）/ `dead-config-adopt`（queryForm.defaultCollapsed → deprecated-field 诊断 + 行为零变化；filterTogglable.collapsedLabel → collapsed 文案消费）/ crud 零回归（既有 crud 测试全绿 + filterTogglable 默认行为抽查）。
3. Result 输出矩阵 + 兜底：定义契约（type/fields）/ status 四语义矩阵（success/error/warning/info → data-status + 图标 + 语义色类）/ `result-status-invalid`（非法 status → info 渲染 + dev warn）/ `icon` 覆盖 status 默认图标 / title/description value-or-region（缺 title 不渲染 title 元素）/ actions region 渲染 / marker 输出（nop-result + data-slot + data-testid/cid）。

Exit Criteria:

- [x] 五项 Decision 与一项 Proof（消费面 inventory）全部落字本计划（契约断言清单已清单化：三语义件字段/区域输出矩阵 + 兼容矩阵——见上「契约断言清单」）
- [x] `docs/references/renderer-interfaces.md` 契约草案条目成形（Protected Areas owner evidence 就位——§Page Header Semantic Fields / §Query Filter Semantic Component / §Result Semantic Component 草案）
- [x] 门禁核查结论落字（Decision 5：fields 双侧登记路径零红预期；ask-first 不触发——ui/flux-core 零改动）

### Phase 2 - PageHeader 落地（先红后绿）

Status: completed
Targets: Phase 1 裁定落点（`flux-renderers-basic` page 族或新 type 文件）、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——PageHeader 契约断言清单测试先行（红）：区域/字段输出矩阵 + `pageheader-compat` 兼容矩阵（2026-08-30 实测：`page-header-semantics.test.tsx` 9 用例，实现前 8 红——1 条为 compat 既有行为的平凡通过，实现后全绿）
- [x] Fix——按裁定载体实现（面包屑 + 标题 + extra 动作区（+ 内容 tab 若裁定纳入），溢出语义按裁定），定义登记双侧同步
- [x] Fix——`pageheader-overflow` Failure Path 行为断言

#### Phase 2 实现记录（执行时落字，2026-08-30）

落点与登记：`page.tsx`（`normalizeBreadcrumbItems` 纯函数 + `PageBreadcrumbNav` + header 两分支结构）+ `schemas.ts`（`PageBreadcrumbItem` + `PageSchema.breadcrumb/extra`）+ `basic-renderer-definitions.ts`（page 定义追加 `fields: breadcrumb(prop)/extra(region)` + `propContracts.breadcrumb` 双侧登记）。面包屑实现**修订 Decision 1 一处**：不手写 nav/ol/li，改组合 `@nop-chaos/ui` 既有 Breadcrumb 七件（`ui/src/components/ui/breadcrumb.tsx`，`ui/src/index.ts:7` 既有导出面——ui 包零改动，`Breadcrumb` 根以 props spread 覆写 `data-slot="page-breadcrumb"`，条目保留 ui `breadcrumb-item/link/page/separator` 标记）；条目溢出 = `max-w-40 truncate` + `title` 原生提示，分隔 = ui chevron separator。header 结构：无语义字段时走 legacy 分支（DOM 与现行为逐字节等价——`<h2>`/subtitle/remark/toggle 直挂 header）；声明 breadcrumb/extra 任一时走语义分支（`page-breadcrumb` nav + `page-heading` flex 行包住标题/副标题/remark/extra/移动端 toggle），两分支同构于单一 header 元素（首个实现稿用「legacy 条件优先的三元链」导致 title 存在时语义分支永不可达——红测暴露后合并为单 header 双 fragment）。extra 渲染 `ml-auto` 靠右于 heading 行。执行期门禁：`check-renderer-definition-fields-only` + `check-schema-prop-coverage`（Layer 2 全覆盖）双绿。closure audit Trivial 修正（2026-08-30）：header 元素 className 改 `slotProps.headerClassName || undefined`（消除移动端 aside-toggle-only 边缘下的空 `className=""` 属性，legacy 分支 DOM 等价声明恢复逐字节成立）。Decision 5 的「i18n 新键 `flux.page.breadcrumb`」随组合 ui Breadcrumb 裁定失效——ui 组件自带 `aria-label="breadcrumb"`，零新 i18n 键（较计划更小侵入面，特此注销）。

Exit Criteria:

- [x] 先红后绿单测全绿（输出矩阵 + 兼容矩阵——9 条用例：compat 2 + breadcrumb 输出矩阵 4 + extra/结构 3）
- [x] `flux-renderers-basic` 局部 typecheck/test 通过（typecheck 零错；包内 56 文件 546 用例全绿；全仓 `pnpm test` 68/68 tasks successful、exit 0）

### Phase 3 - QueryFilter 落地与 dead config 消解（先红后绿）

Status: completed
Targets: Phase 1 裁定落点包、`packages/flux-renderers-data/src/crud-query-region.tsx`（dead config 处置若裁定涉 crud）、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——QueryFilter 契约断言清单测试先行（红）：查询/重置动作链、展开/收起、网格布局输出矩阵（2026-08-30 实测：`query-filter.test.tsx` 19 用例；实现前首轮 8 红，红态含三项执行期发现——见实现记录）
- [x] Fix——按裁定载体实现（查询/重置内建动作语义 + 展开收起 + 布局字段），定义登记双侧同步
- [x] Fix——dead config 按 Phase 1 裁定处置（接线/废弃标注/迁移），`queryfilter-clash`、`queryfilter-no-form-ctx`、`dead-config-adopt` 行为断言
- [x] Proof——crud 既有 queryForm/filterTogglable 零回归断言（既有测试全绿 + 兼容抽查）

#### Phase 3 实现记录（执行时落字，2026-08-30）

落点与登记：`query-filter.tsx`（renderer 组件）+ `query-filter-definition.ts`（`queryFilterRendererDefinition` + `transformQueryFilterAuthoringSchema`，复用 `resolveFormMode`）+ `schemas.ts`（`QueryFilterSchema`/`QueryFilterToggleConfig`）+ `data-renderer-definitions.ts` 数组登记（crud 之前）+ `index.tsx` 导出。transform 按 Decision 2 落地：`body` → 嵌套 form（`filterForm` region，crud `queryFormRegion` 同款先例；id = `${nodeId}-filter-form` 或路径派生），`onSubmit` 降为 form `submitAction`，默认 Search（`component:submit`）+ Reset（`component:reset` + onReset 链）按钮，`submitLabel/resetLabel/mode/layout/columnCount/gap/actions` 全按裁定。toggle 包络镜像 crud 形态（collapsedLabel/expandedLabel 消费，缺省 i18n `flux.crud.expandQuery`/`collapseQuery`，零新 i18n 键）。

执行期三项契约级发现（均已修复并有测试锁定，非 deferred）：

1. **propContract shape 门禁静默丢弃 boolean 字面量**：`togglable: true` 经编译后 `props.props.togglable === undefined`——根因：propContracts 声明 `shape: {kind:'object'}` 时，`validateKnownPropValue`（flux-compiler `shape-validation-node-fields.ts:39-66`）对 shape 不匹配的值加入 `skippedPropKeys`，node-compiler 跳过该键（静默、与 diagnostics 无关）。修复：propContract 改精确 union `{kind:'union', anyOf:[{kind:'boolean'},{kind:'object'}]}`（crud `selection` 先例）。
2. **同源在库 bug：`crud.filterTogglable: true` 被同一门禁静默丢弃**（boolean 形态从不生效，`use-crud-filter-toggle.ts:19-21` 的 `=== true` 分支为死代码；无任何测试覆盖 boolean 形态故零报警）。属本计划 in-scope 消费链（Phase 1 Proof 清单内 filterTogglable 消费链），同修：crud propContract 同款 union + 回归测试锁定（`filterTogglable: true` 渲染 toggle 包络）。
3. **`onSubmit`/`onReset` 的 lying-contract 防范**：二者由 transform 消费（降为 form submitAction / Reset 按钮 onClick），组件不读 `props.events`——定义**不声明 eventContracts**（data-source `onSuccess/onError` 先例），登记为 prop + `actionValue` propContract，测试锁定 `eventContracts === undefined`。

dead config 处置落地（Decision 4）：`queryForm.defaultCollapsed/collapsedLabel/expandedLabel` 加 `@deprecated` JSDoc + `transformCrudAuthoringSchema` emit `unknown-property` warning 诊断（指向 `filterTogglable` 同名字段；`SchemaDiagnosticCode` 为 flux-core 闭合联合、新增 code 属保护区，故用既有 code + severity:'warning'）；`filterTogglable.collapsedLabel/expandedLabel` 在 crud-renderer.tsx toggle 包络接线消费（collapsed 态文案 / expanded 态收起按钮 aria-label）。测试：deprecated 三字段 emit 三条 warning 零行为变化 + 干净 schema 零 emit + crud 自定义 label 渲染断言。

playground 登记面（route-matrix 门禁）：新 renderer type 须有 playground route——`data-route-entries.ts` 增 `query-filter` 条目 + `query-filter-lab-page.tsx`（三 scenario：基础查询区/inline 自定义标签/可折叠）+ lab registry/index 登记。

Exit Criteria:

- [x] 先红后绿单测全绿（含 dead config 裁定行为与 crud 零回归断言——19 条：定义契约 1 + transform 6 + 渲染行为 8 + dead config/crud 回归 4）
- [x] 落点包局部 typecheck/test 通过（typecheck 零错；flux-renderers-data 931/931 全绿；全仓 `pnpm test` 68/68 tasks exit 0；route-matrix 36/36）

### Phase 4 - Result 落地（先红后绿）

Status: completed
Targets: Phase 1 裁定落点（`flux-renderers-content` 或裁定包）、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——Result 契约断言清单测试先行（红）：status 四语义映射矩阵 + extra/actions 区域 + 兜底（`result-renderer.test.tsx` 10 用例覆盖契约断言清单全项：定义契约/status 四语义矩阵/缺省 info/`result-status-invalid`/缺 title 不渲染 title 元素/value-or-region 表达式/actions region/icon 覆盖/marker 输出——恢复执行 session 对补强断言「缺 title 不渲染 title 元素」做变异校验 witnessed 红（title 恒渲染变异 → 该用例失败）后复绿，锁定非平凡通过）
- [x] Fix——按裁定载体实现（status 四语义 + 图标 + title/description/extra/actions），定义登记双侧同步
- [x] Fix——`result-status-invalid` 兜底行为断言

#### Phase 4 实现记录（执行时落字，2026-08-30）

落点与登记：`result.tsx`（`ResultRenderer`：status→图标/语义色映射 + `resolveLucideIconStrict` 覆盖通道 + title/description/actions 三 slot value-or-region 解析）+ `schemas.ts`（`ResultStatus` 四语义 union + `ResultSchema`）+ `content-renderer-definitions.ts`（`result` 定义：category 'content'、propContracts status/icon 双侧登记、fields status/icon/title/description/actions、零 eventContracts——Decision 3 全项）。marker 面：root `nop-result` + `data-slot="result"` + `data-status` + `data-testid`/`data-cid`。兜底：非法 status → info 渲染 + per-value 去重 console.warn（`warnedStatuses` Set），不中断渲染。playground 登记面：`content-renderer-routes.ts` 增 `result` 条目 + `result-lab-page.tsx`（三 scenario：success+actions/status gallery/自定义 icon 覆盖）+ lab registry/index 登记。

恢复执行补完项（2026-08-30 本 session）：前序中断 run 已产出 result.tsx/测试/playground 三件主体，本 session 补齐登记尾巴并验证——①`index.ts` 补 `ResultRenderer`/`ResultSchema`/`ResultStatus` 导出（包内逐 renderer 导出惯例对齐）；②`content-renderer-definitions.test.tsx` TYPES 清单补 `result` + 计数 18→19；③测试补强：原「skips the title element when absent」用例名实不副（缺 title 场景零断言）——拆分为「缺 title/description 不渲染对应元素」+「存在时渲染」两用例，补齐契约断言清单第 5 条，变异校验非平凡。

Exit Criteria:

- [x] 先红后绿单测全绿（四语义矩阵 + 兜底）
- [x] 落点包局部 typecheck/test 通过（flux-renderers-content 37 文件 307 用例全绿；全仓 `pnpm test` 68/68 tasks successful、`pnpm typecheck` 37/37）

### Phase 5 - 文档对齐与 C2 回写

Status: completed
Targets: `docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/architecture/styling-system.md`（核查制）、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] `docs/references/renderer-interfaces.md` 契约条目终稿（三语义件与 live 行为逐项核对，区分「字段存在」与「语义落地」——2026-08-30 恢复执行 session 对 page.tsx/query-filter.tsx/query-filter-definition.ts/result.tsx live 复核后终稿：各节加 Status: landed 标注；PageHeader 节精化 ui Breadcrumb 组合形态 + 语义/legacy 双分支 header 渲染条件（含移动端 aside toggle 触发面）+ truncate 类实值；QueryFilter 节补 crud 侧 dead config 分轨处置口径）
- [x] flux-guide schema 作者条目（三语义件用法样例：PageHeader 页头组装 / QueryFilter 非 crud 查询区 / Result 终态页——`design-patterns/page-templates.md` 新增 + README 索引 41 行；样例经 live 核对改 button `variant` 字段名）
- [x] `docs/architecture/styling-system.md` 核查：语义件 marker/class 约定若需补充则同步（无改动不写凑条目）——核查结论：root marker（`nop-query-filter`/`nop-result`）+ data-slot 内部区域 + `data-status`/`data-collapsed` 状态属性与既有规则完全兼容，零改动
- [x] C2 回写（追加式，回写 ⑪）：G-A 行落「已产品化（本 plan）」终态证据 + 载体裁定 + dead config 处置 + 未纳入项（schema 预设库等）successor 登记
- [x] daily dev log 记录（`docs/logs/{执行年}/{执行月}-{执行日}.md`，如 `docs/logs/2026/08-31.md`——本 plan 落 `docs/logs/2026/08-30.md`「D1 G-A 页面模板层语义件执行」节）

Exit Criteria:

- [x] 三份 owner 文档落字/核查完成且与 live 行为一致
- [x] C2 回写完成（初版裁决表零改动，追加式）
- [x] daily log 已记录

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session 独立子 agent `ses_fadf0fd5cffeL2obcn1CNHz50o`（1 轮全量四查）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major，5 Minor）
- Rounds: 1
- Findings addressed: 5 Minor 全部随共识修复——①Purpose 查询区手拼归属错置（antdpro-list.json 实为 crud queryForm 承载；改为面包屑绑 antdpro-list.json、查询区手拼绑 R1 保真度表/非 crud 场景）；②`CrudQueryFormConfig` 行距 `:10-77` → `:10-54`；③`use-crud-filter-toggle.ts` 行距 `:17-29` → `:16-40`（isMobile/activeFilterCount 符号覆盖）；④R1 差距直译引文补回「R0 §1/§4：」前缀；⑤daily log 路径模板改 `{执行年}/{执行月}-{执行日}.md`

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处，Phase 内只做保证后续 Phase 能继续的局部验证。

- [x] 三语义件按裁定载体全部落地且 Phase 1 断言清单全项有先红后绿证明（字段/区域输出矩阵 + 兼容矩阵——page-header-semantics 9 + query-filter 19 + result-renderer 10；恢复执行 session 对补强用例做变异校验 witnessed 红）
- [x] dead config（`queryForm.defaultCollapsed` 族）按裁定处置完成，零静默失效（@deprecated + warning 诊断 + filterTogglable label 族接线消费，测试锁定）
- [x] crud 既有 queryForm/filterTogglable 零回归（既有测试全绿 + `filterTogglable: true` boolean 形态回归新增——同源在库 bug 修复）
- [x] `docs/references/renderer-interfaces.md` 对齐完成（Protected Areas owner evidence——三语义件 Status: landed 终稿）；styling-system 核查完成（零改动结论）
- [x] 无 in-scope live defect 或 contract drift 被静默降级到 deferred / follow-up（三项执行期发现含同源在库 bug 均已修复并有测试锁定；closure audit checklist 6/6 Pass）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（见 Closure Audit Evidence）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（37/37——closure 前修复三处：page.tsx 面包屑 index key → 内容派生 key；result.tsx React Compiler「Cannot create components during render」→ `React.createElement`（alert 先例）；result-renderer.test.tsx 未用 `waitFor` 移除）
- [x] `pnpm test`（68/68 tasks successful——flux-renderers-content 307、playground route-matrix 含 query-filter/result 条目）
- [x] `pnpm check`（exit 0 零新增命中——oversized ERROR 仅既有 2 个注册豁免 i18n 文件，新文件零命中）

## Non-Blocking Follow-ups

- schema 模板预设库（blocks 式整页模板分发，基于本计划语义件组装）——roadmap C2 预登记候选的另一半，独立后续 plan 候选
- 既有复刻页（antdpro 等）页头/查询区/终态页的语义件化 retrofit（复刻页迭代时采纳）
- 回写 ⑤ G-A 观察面三项（kanban cardTemplate params 绑定 / 拖拽源注册滞后 / container-body wrapper 透传）——维持 C2 观察面登记，归 renderer 修复流程/D1 输入池
- G-B3/G-C/G-D 语义件族（C2 §2 第 6 位）——独立 plan

## Closure

Status Note: 2026-08-30 关闭。G-A 页面模板层语义件族按 Phase 1 裁定载体全部落地：PageHeader（`page` 语义增强——`breadcrumb` 字段组合 ui Breadcrumb 七件 + `extra` region，语义/legacy 双分支 header，compat DOM 等价锁定，零新 type）、QueryFilter（新 `query-filter` type 落 flux-renderers-data——body 降嵌套 form + 查询/重置内建 + togglable 包络 + 网格转发，crud 主通道零改动）、Result（新 `result` type 落 flux-renderers-content——status 四语义 + icon 覆盖 + actions 单通道 + info 兜底）。dead config 分轨处置（queryForm.defaultCollapsed 族废弃告警 / filterTogglable label 族接线）+ 同源在库 bug（`filterTogglable: true` boolean 被 propContract 门禁静默丢弃）修复并有回归锁定。owner docs 三份对齐（renderer-interfaces 三节 Status: landed 终稿 / flux-guide page-templates.md 新增 / styling-system 核查零改动）+ C2 回写 ⑪（append-only 13+/0−）。执行中断恢复完成（前序 session 产出 Phase 1–3 与 Phase 4 代码主体，恢复 session 补完 Phase 4 登记尾巴 + Phase 5 收口 + 补强断言变异校验）。全量验证 full-green：typecheck/build/lint 37/37、test 68/68 tasks、check exit 0 零新增红。本 plan 关闭后 D1 其余候选（G-B2 键盘框架、G-B3/G-C/G-D 语义件族、schema 预设库 successor）按 C2 §2 排序继续。

Closure Audit Evidence:

- Auditor / Agent: fresh session 独立子 agent `ses_facd8a02effehnkTZqD2p7Smo6`（1 轮）
- Evidence: verdict **APPROVED** 零 Blocker/零 Major/零 Minor；3 Trivial + 1 Informational 随收口处置——①Trivial：diff summary 漏记 `data-package-units.test.tsx` registry 清单一行（in-scope 且登记必需，记录性）；②Trivial：page.tsx 移动端 aside-toggle-only 边缘 `className=""` 空属性——已修复（`slotProps.headerClassName || undefined`），legacy 分支 DOM 等价声明恢复成立，修复后 page-header-semantics 9/9 复绿 + lint/typecheck 绿；③Trivial：Decision 5「i18n 新键 flux.page.breadcrumb」随组合 ui Breadcrumb 裁定失效（ui 自带 aria-label，零新 i18n 键）——已在 Phase 2 实现记录注销；④Informational：审计输入与 live plan 的 Closure Gates 勾选态差异——审计时点 gates 尚未勾选为流程正确态，非缺陷。审计 6 项 checklist 全 Pass（plan 一致性零 `[ ]` / 契约抽查 7 项 file:line 逐点核对 / 先红后绿真实性 + 恢复补强项在档 / owner docs 逐字段比对 + C2 append-only numstat 13+/0− / scope 纪律 ui/flux-core clean / 中断恢复叙事与文件一致）+ 独立 scoped 复跑 flux-renderers-content 37 files/307 全绿。

Follow-up:

- 全部为 non-blocking（与 Non-Blocking Follow-ups 区一致）：schema 模板预设库；既有复刻页语义件化 retrofit；回写 ⑤ G-A 观察面三项（归 renderer 修复流程/D1 输入池）；G-B3/G-C/G-D 语义件族（独立 plan）。无 confirmed live defect 遗留（同源在库 bug 已在本 plan 修复）。
