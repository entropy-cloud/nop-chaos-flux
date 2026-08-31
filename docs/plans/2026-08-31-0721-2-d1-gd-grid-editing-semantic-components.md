# D1-8 G-D 网格编辑深度语义件族产品化（table 分组聚合 + 单元格原位编辑 + 三维度终态裁定）

> Plan Status: completed（2026-08-31 执行收口：Phase 1–4 全 completed；closure audit fresh session `ses_fa966e834ffeeZjCcRDxuXl0o7` 1 轮 APPROVED 零 Blocker/零 Major，1 Minor 随共识修复；full-green verification——typecheck/build/lint 37/37、test 68/68、check 零新增红。起草期 2026-08-31 draft review：R1 fresh session `ses_faaff4024ffeo6Bbf4ER06la5v` `fail` 1 Major（quickEdit 通道未盘点）+ 5 Minor → 全部修复 → R2 scoped re-audit fresh session `ses_faaf4bb6efferwcH2ENPxuMoLK` `pass-with-minors` 零 Blocker/零 Major，1 Minor 计数勘误 + 1 typo 随共识修复）
> Mission: ui-review
> Work Item: D1. 能力缺口产品化 plans —— G-D 网格编辑深度语义件族（C2 §2 预清单第 6 位「G-B3/G-C/G-D 语义件族」第三成员；依赖 G-B2+G-B3 双前置已 `done` 故就位条件满足；P6 回写（回写 ⑦）已完成故定形条件满足）
> Last Reviewed: 2026-08-31
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（D1 条目 + Phase Details D1 + Cross-Cutting 4/5）；C2 裁决文档 `docs/analysis/ui-review/C2-capability-gaps.md`（初版裁决表 G-D 行 + §2 预清单 6/6 + 回写 ⑦ P6b 终态实测 + 回写 ⑤⑥ 关联素材）；`docs/context/ai-autonomy-policy.md` Protected Areas（renderer 定义字段 plan-first / flux-core plan-first / 样式契约 plan-first / `ui/src/index.ts` ask-first）
> Related: `docs/plans/2026-08-30-2312-1-d1-gb2-keyboard-navigation-framework.md`（Decision 4 fill-handle successor 义务 + Decision 5① roving helper「G-D 立项时再抽取」边界登记——两项重评义务由本计划承载）；`docs/plans/2026-08-30-2312-2-d1-gb3-batch-bar-semantic-component.md`（回写 ⑦ 候选 2「范围选区 + fill handle」归本计划的移交源头；`rowSelection`/`selectAllMode` 既有契约面）；`docs/plans/2026-08-31-0721-1-d1-gc-multiview-database-semantic-components.md`（同批起草；本计划（N=2）后于 G-C plan（N=1）执行）
> 执行顺序约束：本计划（N=2）在 G-C plan（N=1）之后执行。两计划代码面不相交（本计划 `flux-renderers-data`；G-C `flux-renderers-basic`/`flux-renderers-scheduling`），共写面为 `docs/references/renderer-interfaces.md`、flux-guide 条目与 C2 回写追加区——顺序执行消除文档冲突；C2 回写编号按实际执行顺序落字。

## Purpose

把 C2 裁决为 **G-D（网格编辑深度：单元格编辑器矩阵/列菜单/分组/行高，L2）** 的缺口产品化：为 data 域 `table` renderer 补齐**分组/聚合渲染语义**与**单元格原位编辑语义**（同格双态 + 型别分派编辑器矩阵），消解回写 ⑦ 终判维持的零承载面；并同 plan 显式裁定「fill-handle 编辑器选区模型」（G-B2 Decision 4 successor 重评义务）、「roving helper 抽取」（G-B2 Decision 5① 边界登记的 G-D 立项触发条件）、「动态列模型」三维度的终态（立项或 deferred，不得静默）。

## Current Baseline

- **table 分组/聚合渲染语义零实现**（本计划起草期 live 实测）：`packages/flux-renderers-data/src/table-renderer.tsx`（668 行）grep `group`/`aggregate` 仅命中 `colgroup`（列宽 col 元素），无分组头行/组内聚合渲染语义（回写 ⑦ 候选 1 并入项确认）。Airtable 复刻页的分组/聚合以「mock 服务端预聚合（`groupAirtableRecords`）+ schema loop 分支」模拟（P6a/P6b 降级姿势，e2e 03/06/08 锁定）——产品化后该姿势可退役为 retrofit 候选。
- **单元格原位编辑：`quickEdit` 通道已在库，深度缺口在其上**（本计划起草期 live 实测修正回写 ⑦ 口径）：data 域 table 已有列声明式就地编辑通道——`TableColumnSchema.quickEdit?: boolean | { mode: 'dialog'|'inline'; body?: SchemaInput; saveImmediately }`（`packages/flux-renderers-data/src/schemas.ts:89` + `TableColumnQuickEditConfig` `:16-20`，region 接线 `:73`），table 级 `quickSaveAction`/`quickSaveItemAction`（`schemas.ts:230-231`），实现于 `src/table-renderer/table-quick-edit-cell.tsx` + `table-quick-edit-controller.ts` + `use-row-quick-edit-draft.tsx`（行草稿 scope/dirty 跟踪/保存/blur 保存/保存失败 notify/行保存条列 `__row_save_bar__`），作者文档 `flux-guide/design-patterns/crud.md` §6。**真实剩余缺口（本计划对象）**：①同格双态缺失——单元格级「导航态↔编辑态」原地翻转状态机（quickEdit 现状为常驻编辑控件或 dialog，无按格进入/提交/取消的格级状态机）；②型别分派编辑器矩阵缺失——`quickEdit.body` 须逐列手写编辑控件，无按列型别自动分派的编辑器矩阵；③键盘进入编辑通道缺失（方向键漫游 + Enter/F2 进入，P6b 十五键位终态表锁定零通道）。Phase 1 载体裁定的候选空间必须含「演进 quickEdit / 与 quickEdit 共存分层 / 替换」三向，不得无视既有通道另起平行契约。
- **table 选区域已产品化**（本计划的直接前置）：G-F optionRow（行选中态）+ G-B2 `rowSelection.modifierSelect`（⇧click 范围/meta 切换/⌘A）+ G-B3 `selectAllMode`（'page'/'all'）+ `batch-bar` 语义件均已落地并有全矩阵单测——本计划在其上加**编辑与分组**维度，选区契约零重构。
- **键盘导航层先例在库**（回写 ⑦ G-B2 正面素材）：table 行 keydown 中继已有 renderer 层先例（`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:193-209` 行 keydown 中继，`:224-225` `onKeyDown`/`tabIndex`，声明 `onRowClick` 后行 `tabIndex=0` + Enter/Space 内建中继）；P6b 十五键位终态表锁定方向键漫游/编辑器进入等键位零通道——缺口收敛在格级键盘状态机与编辑态的接线（keyboard 绑定通道 G-B2 已落地），非事件通道缺失。
- **G-B2 Decision 4 successor 义务（本计划必须处置）**：「范围选区 + fill handle 编辑器选区模型」deferred 时登记 successor 为「D1 输入池 / G-D 语义件族 plan（依赖就位后重评）」——G-B2+G-B3 双前置已 `done`，重评义务触发。
- **G-B2 Decision 5① 边界登记（本计划立项即触发）**：共享 roving helper「≥2 renderer 需要网格键盘导航时（如 G-D 立项）再抽取，届时 kanban ad-hoc 实现（`kanban-column.tsx:270,296` roving tabindex）回归采纳一并评估」。
- **G-B3 观察面移交（回写 ⑦ 候选 2）**：「范围选区 + fill handle」是编辑器坐标选区模型（选区锚点 + 等差填充拖拽原语 + 键盘选区扩展），与 G-B2 行级修饰键选区分列——归本计划裁定。
- **动态列模型零承载**（回写 ⑦）：运行时隐藏/换型别/插删列零通道；既有 `columnSettings:{enabled}` 为勾选显隐（回写 ③ 实测原生可达），非运行时列集合变更。
- **`@nop-chaos/ui` 预期零改动**：单元格编辑器矩阵映射既有 input 族 renderer（text/select/date/checkbox 等），不新增 `ui/src/index.ts` 导出（ask-first 门不触发）。

## Goals

- table **分组/聚合渲染语义**落地（Phase 1 裁定字段族与数据口径）：分组头行 + 组内聚合函数族（Sum/Avg/Min/Max/Count）+ 分组切换的表达通道（client 全量分组 vs server 透传边界）。
- table **单元格原位编辑深度语义**落地（Phase 1 裁定）：同格双态（导航态/编辑态原地翻转）+ 型别分派编辑器矩阵 + 键盘进入编辑通道——在既有 `quickEdit` 通道之上演进（载体候选含「演进 quickEdit / 共存分层 / 替换」三向，Phase 1 裁定），复用其行草稿/保存通道（`quickSaveItemAction`），不另起平行契约。
- 「fill-handle 编辑器选区模型」「roving helper 抽取」「动态列模型」三维度显式终态裁定落字（立项实现或 `Deferred But Adjudicated`，不得静默跳过；G-B2/G-B3 的 successor 义务就此闭环）。
- C2 回写（追加式）+ owner docs 对齐（renderer-interfaces.md / flux-guide）。

## Non-Goals

- **form 域 `input-table`/array-field 改动**：form 域整行编辑契约维持（两域分界见 Baseline）。
- **G-C 多视图语义件**（tabs/kanban 域）——独立 plan（N=1），本计划 Non-Goal 引用。
- **既有复刻页 retrofit**：airtable-grid 等复刻页维持历史 plan 产物（mock 预聚合姿势退役为 retrofit 候选，登记 Follow-up）。
- **spreadsheet-renderers 报表域**：电子表格编辑器（`packages/spreadsheet-renderers/`）为报表设计器域独立实现，与 schema 驱动 table 的原位编辑语义分轨。
- **C2 初版 G-D 行的「列菜单」「行高」两子能力**：live 复核显示两者 schema 层近似可达（列设置/排序/固定经 `columnSettings` 与列头菜单形态已有承载先例——回写 ③⑦；行高四档经 className 表达式状态驱动实测可达——P6b A9/回写 ⑦），本计划不立项，归 D1 输入池按 C2 后续轮次评估（显式登记，不留隐含 debt）。
- **全量 WCAG 合规**（归 deep-audit 维度 20）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer.tsx`、`table-renderer/`、`data-renderer-definitions.ts`、schema 校验：分组/聚合 + 原位编辑字段族。
- 相应 schema 校验（`check:renderer-definition-fields-only` 门禁同步）+ 先红后绿单测。
- roving helper 抽取评估（若裁定抽取：落 `@nop-chaos/flux-react` 共享 helper，沿 G-F option-row / G-B2 keyboard helper 先例；kanban ad-hoc 实现回归采纳评估）。
- `docs/references/renderer-interfaces.md`、flux-guide 对应条目、C2 回写追加。

### Out Of Scope

- `packages/flux-core/src/`——单元格编辑的写入语义若裁定需 scope/编译器级改动，先落字保护区域流程与理由，再进入实现。
- `packages/ui/src/index.ts`（零新导出为默认预期，触发 ask-first 须先落字理由）。
- `packages/flux-renderers-form-advanced/src/`（form 域 Non-Goal）。
- playground 复刻页改造（Non-Goal 引用）。

## Failure Paths

| 可测场景编号                   | 触发                                                           | 行为（含错误表现）                                                                        | 可重试 | 用户可见表现          |
| ------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ | --------------------- |
| gd-cell-edit-invalid           | 编辑值未过校验时提交                                           | 提交拦截 + 校验态显示，编辑态保持，不丢焦丢值                                             | 是     | 字段校验错误提示      |
| gd-cell-edit-cancel            | 编辑态 Esc/点击外部                                            | 值回滚到编辑前，零写入零事件派发                                                          | 是     | 原值恢复              |
| gd-cell-edit-save-fail         | 编辑提交后保存动作派发失败（`quickSaveItemAction`/新写入通道） | 保存失败 notify + 草稿保持（沿 `table-quick-edit-cell.tsx` onSaveError 先例），行不伪成功 | 是     | 失败提示 + 编辑值保留 |
| gd-cell-edit-quickedit-coexist | 同列同时声明新编辑语义与 `quickEdit`                           | 按 Phase 1 裁定的优先级/互斥语义收敛（dev warn 一次性），不双控件叠渲染                   | 否     | 单一编辑控件生效      |
| gd-cell-edit-no-editor         | 列型别无匹配编辑器                                             | 列回退只读态 + 一次性 dev warn，不白屏                                                    | 否     | 单元格维持导航态      |
| gd-group-missing-field         | 分组字段路径缺失/值 null                                       | 该行归入可裁定兜底组（如「-」组）或行保持未分组，一次性 dev warn                          | 否     | 兜底组头或平铺        |
| gd-group-collapse-persist      | 分组折叠后数据刷新                                             | 折叠态按分组键保持或按裁定重置，不串组                                                    | 是     | 折叠态稳定            |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——renderer 定义字段为保护区域（plan-first），契约变更须先红后绿单测锁定（沿 G-F/G-B2/G-B3 先例）；单元格编辑与分组聚合为 P6b 处置表锁定的交互契约（A 系列），Proof 项先于 Fix 项。

## Execution Plan

> 顺序 Phase。Phase 1 契约裁定先行（Phase 2/3 全部依赖其断言清单）；Phase 4 文档与回写收口。

### Phase 1 - 契约设计与维度终态裁定

Status: completed
Targets: 本计划 Decision 注记、`docs/references/renderer-interfaces.md`（草案条目）

- Item Types: `Decision | Proof`

- [x] Proof——网格编辑面 inventory 实测落字：`table-renderer.tsx` + `table-renderer/` 全量现状（列模型/行渲染/单元格渲染链/事件面）+ **`quickEdit` 通道全量盘点**（`TableColumnQuickEditConfig` 契约/`table-quick-edit-cell.tsx`/`table-quick-edit-controller.ts`/`use-row-quick-edit-draft.tsx` 行草稿与保存链/flux-guide crud.md §6 作者面）+ 回写 ⑦ 缺口面 live 复核（按本计划修正后口径）+ P6b 十五键位终态表 live 复核 + `input-table`（form 域）契约边界对照 + AMIS table 行内编辑（`editable`）语义对照（amis-baseline-matrix 口径）——见下方「Phase 1 裁定记录 §Inventory」
- [x] Decision——分组/聚合载体裁定——见「Phase 1 裁定记录 §Decision 1」
- [x] Decision——单元格原位编辑载体裁定——见「Phase 1 裁定记录 §Decision 2」
- [x] Decision——「fill-handle 编辑器选区模型」终态裁定——见「Phase 1 裁定记录 §Decision 3」（`Deferred But Adjudicated`，新理由落字）
- [x] Decision——roving helper 抽取终态裁定——见「Phase 1 裁定记录 §Decision 4」（维持不抽取）
- [x] Decision——「动态列模型」终态裁定——见「Phase 1 裁定记录 §Decision 5」（`Deferred But Adjudicated`）
- [x] Decision——单元格键盘漫游面裁定——见「Phase 1 裁定记录 §Decision 6」（Enter/F2 最小闭环立项；方向键漫游 deferred）

Exit Criteria:

- [x] 六项 Decision 与一项 Proof 全部落字本计划（契约断言清单可清单化：分组矩阵 + 编辑器矩阵 + 双态状态机矩阵 + 键位矩阵 + 兼容矩阵——已清单化于 Phase 2/3 Proof 项与 Phase 1 裁定记录）
- [x] `docs/references/renderer-interfaces.md` 契约草案条目成形（Protected Areas owner evidence 就位——§Table Group And Aggregate Contract + §Table Cell In-Place Edit Contract 两节 Phase 4 终稿，草案断言面即本裁定记录字段族）
- [x] 若触 `ui/src/index.ts`、`packages/flux-core/src/` 或 `flux-renderers-form-advanced`：ask-first/plan-first 理由已落字且未在门禁前改码（默认裁定均不触——已核实：编辑器矩阵映射 ui 既有导出面 `Input`/`NativeSelect`/`NativeSelectOption`/`Checkbox`/`Button`（`ui/src/index.ts:14,26,34,42`），零新增导出；flux-core 零改动；form 域零触碰）

#### Phase 1 裁定记录（2026-08-31 执行 session 落字）

##### Inventory（live 实测，基点 = 起草期口径的复核确认）

- **列/行/单元格渲染链**：`table-renderer.tsx`（668 行）管线 = `source` → `processTableData`（`table-data.ts`：rowKey 归一 + 排序 + 过滤）→ `useTableTree`（tree 展平；非 tree 模式恒等）→ `paginateTableData`（客户端分页切片 + viewIndex）→ `displayData`（drag-sort 覆写位）→ `TableBodyRows`（`table-body-rows.tsx` NonVirtual/Virtual 双路径，Virtual 经 `buildFlattenedItems` data/expanded 两型交错）→ `DataRowView`（`table-body-row-rendering.tsx`，React.memo 行级 bailout + comparator 内容等价）。单元格分派序：`type:'index'` → `type:'operation'`(buttonsRegion) → `cellRegion` → `quickEdit`（`resolveTableQuickEditConfig`）→ 默认 `CellContentWithPopOver`（`String(getIn(record, name) ?? '')` 纯文本）。grep `group`/`aggregate` 仅命中 `colgroup`——分组/聚合渲染语义零承载（起草期口径 live 复核一致）。
- **`quickEdit` 通道全量**：`TableColumnQuickEditConfig`（`schemas.ts:16-20`，`mode:'dialog'|'inline'` + `body` + `saveImmediately`）；格级常驻编辑控件（inline）或 dialog 按钮 + 弹层（`table-quick-edit-cell.tsx`，dialog 态「打开按钮 + Dialog + 保存/关闭钮」、inline 态「常驻 Input + blur saveImmediately 保存」）；保存链 `useTableQuickEditController`（`table-quick-edit-controller.ts`：字段级 draftRowScope 覆写（`field`/`$slot.record.*` 通道）、dirty 跟踪、`helpers.dispatch(saveAction, { scope: draftRowScope })` CX-10 ctx、显式 `ok:false` 失败检查、成功后 `rowScope.merge` 提交 + `$slot.record` 同步、`onSaveError` notify、H20 save-generation 守卫 + record 快照防中途换行污染）；行级草稿 `useRowQuickEditDraftContext`（`use-row-quick-edit-draft.tsx`：多列共享行草稿 + `__row_save_bar__` 保存条，`isRowDraftColumnEnabled` 门控）——**现状为「常驻编辑控件」单态，无格级导航态↔编辑态翻转**；作者文档 `flux-guide/design-patterns/crud.md` §6 在位。
- **键盘通道现状（P6b 十五键位终态表 live 复核一致）**：行级 keydown 中继在库（`table-body-row-rendering.tsx:193-207` 行 `handleRowKeyDown` Enter/Space，`:223-225` `onKeyDown`/`tabIndex` 绑 `isRowClickable`）；格级零 tabIndex 零键盘通道；G-B2 `keyboard` renderer（页面级 chord/绑定）与 `rowSelection.modifierSelect`（⇧click/meta/⌘A）已落地但均为行级/页面级——格级「进入编辑」键位零通道。
- **`input-table`（form 域）边界对照**：form 域整行编辑契约独立成轨（`flux-renderers-form` 族），本计划 Non-Goal 维持，两域分界不动。
- **AMIS table 行内编辑（`editable`）对照（amis-baseline-matrix 口径）**：AMIS 以 table 级 `editable`/`quickSaveApi` + 列级修饰承载行内编辑；本库既有契约以列级 `quickEdit` + 表级 `quickSaveItemAction`/`quickSaveAction` 为对应物——新语义沿用本库列级声明面（不引入 AMIS 表级布尔 `editable` 词元，避免与既有 quickEdit 通道语义漂移）。

##### Decision 1——分组/聚合载体 = 候选 ① schema 声明式 client 全量分组

- **载体**：`table` 级新字段族 `group?: TableGroupConfig`（`field`（分组字段路径，声明即启用）+ `aggregates?: Array<{ fn: 'sum'|'avg'|'min'|'max'|'count'; field?: string; label?: string }>` + `missingLabel?`）。候选 ② server 透传分组契约**不立项**：预聚合/预分组属数据端点职责（复刻页 mock 预聚合姿势为现行等价物），renderer 侧不为它发明第二套数据契约——落字为「数据端点边界」，与 kanban 聚合契约同轨（client 表达语义，server 预计算可达）。
- **语义管线**：分组作用于**排序/过滤后的全量行集**（client 全量分组；serverPaged 表作用于流入行集）；折叠后分页对「组头 + 组员交错显示序列」切片（totalPages 按显示序列长度计，分页条 totalRows 维持行数口径）；聚合按组内成员行全量求值（非页内）。
- **组头行渲染形态**：整行 `colSpan=columnCount` 单元格（`data-slot="table-group-header"` + `data-group-key` + `data-collapsed`），内容 = 折叠 chevron 按钮（`aria-expanded`）+ 组标签 + 成员计数 + 聚合值文本（`{label ?? fn}: {value}` 多聚合 `·` 连接，kanban 列头聚合同构）。组顺序 = 数据首现序（稳定，不重排）。
- **折叠语义（gd-group-collapse-persist 终态）**：折叠集 = renderer 本地 state 按**分组键**记忆；数据刷新（source 换引用/保存回流）后同键组保持折叠态，组消失自然蒸发；v1 无 schema 状态持久化通道（`groupCollapsedStatePath` 不立项——无消费证据，Follow-up 池）。
- **缺字段兜底（gd-group-missing-field 终态）**：字段路径缺失/`null`/`undefined`/`''` → 归入 `missingLabel ?? '-'` 兜底组（一次性 dev warn），行不丢。
- **兼容矩阵**：无 `group` 声明 → 渲染快照逐字节等价（零回归）；`group` × treeMode → **tree 优先**，group 惰性 + 一次性 dev warn（`gd-group-tree-clash`）；`group` × draggable → **group 优先**（显示序随分组，drag 排序不施加）+ 一次性 dev warn（`gd-group-drag-clash`）；`group` × `rowSelection` → 组头行不可选不渲染 checkbox，组员行选中态照常；`group` × `selectAllMode:'page'` → 页全选作用于**当页组员行集**（组头不计入，Phase 2 第三项 Proof 锁定）；`group` × client 分页 → 交错序列切片（组可跨页，页首组头缺组员时仍渲染组头行）。

##### Decision 2——单元格原位编辑载体 = 候选 ② 与 `quickEdit` 共存分层

- **载体**：列级新字段族 `editable?: boolean | TableCellEditableConfig`（`editor?: 'text'|'number'|'select'|'date'|'checkbox'`（缺省 `'text'`）+ `options?`（select 选项）+ `required?`），承载**格级双态状态机**；`quickEdit` 通道零改动零回归（常驻控件/dialog 语义原样）。候选 ①（演进 quickEdit 本体）否决理由：quickEdit 现有「常驻控件」语义与双态语义互斥，原地改写会翻转既有 schema 的可见行为（回归面 = 全部 quickEdit 单测/复刻页），分层后两语义并存由作者显式选择。候选 ③（替换 + 废弃告警）否决理由：quickEdit 非死配置（在库活性契约 + 作者文档 §6），无废弃依据。
- **双态状态机**：导航态（渲染与普通格一致的显示文本 + `tabIndex=0`）→ 进入手势 = click / Enter / F2 → 编辑态（编辑器控件挂载 + 自动聚焦）→ 提交 = Enter / blur（值变化时）→ 回导航态；取消 = Esc → 值回滚零写入零派发（gd-cell-edit-cancel）；校验失败（`required` 空值 / number 非法）→ 提交拦截 + 错误提示 + 编辑态保持不丢焦丢值（gd-cell-edit-invalid）；保存派发失败 → notify + 草稿保持编辑态（gd-cell-edit-save-fail，沿 `table-quick-edit-cell.tsx` onSaveError 先例）；无匹配编辑器（editor 非法值）→ 列回退只读 + 一次性 dev warn（gd-cell-edit-no-editor）。checkbox 编辑器语义特化：toggle 即提交（点击即编辑+提交的两态折叠，矩阵落字）。
- **写入通道（CX-10 合规）**：表级 `quickSaveItemAction ?? quickSaveAction` 在场 → 提交即 `helpers.dispatch(saveAction, { scope: 字段覆写 draftRowScope })`（成功后 `rowScope.merge` 提交 + 显式 `ok:false` 失败检查——quickEdit 控制器保存语义同构复用，含 save-generation 守卫与 record 快照防换行污染）；不在场 → 提交走 **scope 写入通道** `rowScope.update(field, value)`（纯客户端就地编辑，零 action 派发零事件）。
- **与 `onRowClick` 行 keydown 中继共存**：可编辑格的 click/keydown `stopPropagation`（编辑意图不触发行点击/行选中 toggle/行展开）；格级 Enter/F2 与行级 Enter/Space 中继按目标分派（焦点在格 → 格语义优先）。行草稿通道（`__row_save_bar__`）不与 editable 格交互——editable 格按格保存，不入行草稿（落字边界）。
- **共存矩阵**：无 `editable` 声明 → 渲染快照逐字节等价（零回归）；同列 `editable` + `quickEdit` 同时声明 → **editable 优先**，quickEdit 控件不渲染，一次性 dev warn（gd-cell-edit-quickedit-coexist，不双控件叠渲染）；`editable: true` 无列 `name` → 只读 + 一次性 dev warn。

##### Decision 3——「fill-handle 编辑器选区模型」= Deferred But Adjudicated（新理由）

- 分类 `optimization candidate`（本计划重评终态）。**新理由（「依赖未就位」旧理由已失效——G-B2+G-B3 双前置均已 `done`）**：其消费面经 P6b 处置表显式裁决为零接线（Airtable 复刻页 A 系列 fill-handle 零覆盖维持，回写 ⑦），当前无任何 consuming 复刻页/页面在等该原语；其依赖的双态编辑状态机本计划才落地——在零消费证据时点实现「选区锚点 + 等差填充拖拽原语 + 键盘选区扩展」属无消费者的投机基础设施（G-B2 Decision 4 当时的否决逻辑在依赖就位后依然成立，只是否决理由从「依赖未就位」换为「无消费证据」）。Successor Required: yes——D1 输入池（出现 consuming 复刻页/页面诉求时重评，届时可在本计划双态状态机与编辑器矩阵之上叠加）。已同步本计划 `Deferred But Adjudicated` 区。

##### Decision 4——共享 roving helper 抽取 = 维持不抽取（not adopted）

- 本计划键盘面裁定（Decision 6）为「Enter/F2 最小闭环立项、方向键漫游 deferred」→ 落入 G-B2 Decision 5① 预登记的条件分支「若键盘漫游 deferred，则落字维持不抽取」。网格键盘导航采纳方计数仍 <2（仅 table 单方，且只到格级进入编辑、未到漫游环），抽取条件不满足；kanban ad-hoc roving（`kanban-column.tsx:270,296`）回归采纳评估顺延至漫游环立项时一并评估。已同步 Non-Blocking Follow-ups 区顺延条目。

##### Decision 5——「动态列模型」= Deferred But Adjudicated

- 分类 `optimization candidate`。Why Not Blocking Closure：既有替代面完整可达——`columnSettings:{enabled}` 勾选显隐（回写 ③⑦ 实测原生可达）+ `columns` 表达式动态求值（T28 动态列 + T29 last-good 降级，`table-t28-dynamic-columns.test.tsx`/`table-t29-dynamic-columns-last-good.test.tsx` 锁定）+ 复刻页会话排序端点姿势（P6b A5）——运行时列集合变更（插删列/换型别）的真实诉求场景是「用户自定义列」形态，当前无 consuming 复刻页；其本体是 columns 集合管理轴（G-C tabs `itemsOwnership`/`itemsStatePath` 命名与语义先例可平移）+ 列型别注册表，为独立 plan 体量。Successor Required: yes——D1 输入池 / 独立 plan 候选（沿 tabs 集合管理先例做 columns 轴）。已同步 `Deferred But Adjudicated` 区。

##### Decision 6——单元格键盘漫游面 = Enter/F2 最小闭环立项 + 方向键漫游 deferred

- **立项（Phase 3 实现）**：格级键位 = 导航态 `Enter`/`F2` 进入编辑、编辑态 `Enter` 提交 / `Esc` 取消、blur 提交——沿行级 keydown 中继先例在格层实现，零依赖 G-B2 `keyboard` renderer（格级焦点自带事件通道，页面级绑定通道不适用于格内语义）。
- **deferred：方向键漫游**（↑↓←→ 格间移动焦点环 + 滚动跟随）：需要格级坐标模型（全网格 roving tabindex 环 + 虚拟滚动同步 + 与行级 `tabIndex`/selection 手势/树切换钮的焦点冲突仲裁），为独立体量；无 consuming 复刻页（P6b 十五键位终态表登记的零通道是缺口证据而非消费证据）。该 deferred 同时锚定 Decision 4（roving helper 不抽取的条件分支）。落字为显式裁定（非静默降级）：successor = D1 输入池 / 本语义件族后续轮次。

### Phase 2 - table 分组/聚合渲染语义实现（先红后绿）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`、`table-renderer/`、`data-renderer-definitions.ts`、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——分组契约断言清单测试先行（红）：分组矩阵（单字段分组/缺字段兜底/空数据）+ 聚合函数矩阵（sum/avg/min/max/count + 非数值兜底）+ 折叠态矩阵 + 无分组声明零回归快照等价 + 与既有选区/optionRow/排序契约的共存矩阵（`__tests__/table-grouping.test.ts` 单元矩阵 + `__tests__/table-group-render.test.tsx` 渲染矩阵；红→绿证据：11 red failures 先行，见 2026-08-31 daily log）
- [x] Fix——按 Phase 1 裁定载体实现分组/聚合（定义字段登记 + schema 校验同步，`check:renderer-definition-fields-only` 门禁零新增红）：`table-grouping.ts`（分组模型/聚合/兜底）+ `table-group-header-row.tsx`（组头行）+ `table-renderer.tsx` 交错显示序列分页切片 + `table-body-rows.tsx` NonVirtual/Virtual 双路径组头渲染 + `data-schema-validation.ts` group 校验 + `data-renderer-definitions.ts` 字段登记 + 成员行 `data-row-group` 标记
- [x] Proof——与 G-B3 `selectAllMode: 'page'` 的分组态共存语义测试锁定（页作用域勾选 × 分组行的交互边界，P6b 分组态键位归 A7/A8/A15 先例口径）——锁定语义：分页对「组头 + 组员」交错显示序列切片（组头计入页槽位），页全选作用于当页组员行集（`SEL:1` 断言锁定 pageSize=2 页 1 = [组头 A, 组员 1]）

Exit Criteria:

- [x] 先红后绿单测全绿（分组/聚合/兜底/共存全矩阵）——`@nop-chaos/flux-renderers-data` 全包 134 files / 1004 tests 全绿（2026-08-31）
- [x] 受影响包局部 typecheck/test 通过（保证 Phase 3 可继续）——包级 `tsc -p tsconfig.json` 零错误
- [x] `check:renderer-definition-fields-only` 与 `check:audit-event-dispatch-ctx` 门禁零新增红——双门禁 + `check:schema-prop-coverage` 全部 passed

### Phase 3 - 单元格原位编辑实现 + 三维度裁定执行（先红后绿）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/`、`data-renderer-definitions.ts`、（若裁定抽取）`packages/flux-react/src/`、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——编辑契约断言清单测试先行（红）：编辑器型别矩阵（text/select/date/checkbox 最小集，映射既有 input 族或 `quickEdit.body` 承载）+ 双态状态机矩阵（进入/提交/取消/校验失败 gd-cell-edit-invalid/Esc 回滚 gd-cell-edit-cancel/保存派发失败 gd-cell-edit-save-fail/无编辑器兜底 gd-cell-edit-no-editor）+ 事件派发矩阵（提交事件载荷/CX-10 ctx 合规）+ **`quickEdit` 共存矩阵**（无新声明零回归快照等价/两通道同行不冲突/分层裁定语义）——`__tests__/table-editable-cell.unit.test.tsx`（15 tests：resolve 矩阵 + 全编辑器矩阵 + 双态状态机 + CX-10 派发载荷断言 + save-fail）+ `__tests__/table-cell-edit-render.test.tsx`（8 tests：零回归/共存/fallback/行手势隔离/schema 校验）
- [x] Fix——按 Phase 1 裁定载体实现单元格原位编辑（定义字段登记 + schema 校验同步 + 定义门禁零新增红）：`table-editable-cell.tsx`（editable 解析/双态状态机/字段覆写 draft scope 复用 `createDraftScopeStore`/save-generation 守卫/record 快照/`ok:false` 显式失败/checkbox toggle 即提交）+ `schemas.ts` `editable?: boolean | TableCellEditableConfig` + `data-schema-validation.ts` 列级 editable 校验 + DataRowView 分派序 editable 先于 quickEdit（coexist warn）+ i18n 键位登记
- [x] Proof——单元格键盘漫游按裁定执行（立项则先红后绿键位矩阵 + roving helper 抽取裁定执行；deferred 则登记落字）——Decision 6 立项键位全数落地（导航态 Enter/F2 进入、编辑态 Enter 提交/Esc 取消/blur 提交；checkbox Space/Enter/F2 toggle），方向键漫游 deferred 已锚定 Decision 4/Decision 6 落字（无漫游环 → roving helper 维持不抽取）
- [x] Proof——fill-handle / 动态列两维度按 Phase 1 裁定执行落字（立项项实现先红后绿；deferred 项登记 `Deferred But Adjudicated` 含分类与不沿旧理由的新理由）——两维度均 deferred，占位符已按 Phase 1 Decision 3/Decision 5 终态化（见「Deferred But Adjudicated」区）

Exit Criteria:

- [x] 编辑先红后绿单测全绿（编辑器/双态/事件/兼容全矩阵）——`@nop-chaos/flux-renderers-data` 全包 136 files / 1027 tests 全绿（2026-08-31）
- [x] 三维度裁定执行落字本计划（Deferred 区或实现落地，无静默跳过）——fill-handle/动态列 Deferred 区终态化；roving helper 不抽取经 Decision 4 落字并顺延 Follow-up
- [x] 受影响包局部 typecheck/test 通过——包级 `tsc -p tsconfig.json` 零错误 + 包级 eslint 零错误

### Phase 4 - owner docs 对齐 + C2 回写 + 收口

Status: completed
Targets: `docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] `docs/references/renderer-interfaces.md` 契约条目终稿（Status: landed 口径，沿 G-A/G-B2/G-B3 先例）——§Table Group And Aggregate Contract + §Table Cell In-Place Edit Contract 双节 landed 落字
- [x] flux-guide 对应条目（table 分组聚合 / 单元格编辑 作者条目）——`flux-guide/design-patterns/table.md` §13 + §14
- [x] C2 回写（追加式，初版裁决表零改动）：G-D 行落「已产品化」终态证据 + 三维度裁定结论 + G-B2/G-B3 successor 义务闭环落字 + styling-system 核查结论落字——回写 ⑮
- [x] styling-system 核查（marker/样式契约对齐核查，零改动则落字确认）——组头行/editable 格均为 widget 内部 `data-slot`/`data-*` marker + ui 组件消费，零布局 marker 违约，styling-system.md 零改动（核查结论落字回写 ⑮）

Exit Criteria:

- [x] owner docs 全部对齐 live baseline（文档内容与 live 行为一致）
- [x] C2 回写追加落字（append-only，初版零删改）
- [x] daily log 收口记录落字（`docs/logs/2026/08-31.md` G-D 执行段 + full-green verification）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: R1 fresh session 独立子 agent `ses_faaff4024ffeo6Bbf4ER06la5v`；R2 scoped re-audit fresh session 独立子 agent `ses_faaf4bb6efferwcH2ENPxuMoLK`
- Verdict: R1 `fail`（1 Major：baseline「单元格原位编辑零承载」未盘点在库 `quickEdit` 通道 + 5 Minor）→ 全部修复 → R2 `pass-with-minors` 零 Blocker/零 Major
- Rounds: 2
- Findings addressed: Major——baseline 修正为「quickEdit 通道在库 + 三项深度缺口」（同格双态/型别分派编辑器矩阵/键盘进入编辑），Phase 1 载体候选扩为「演进 quickEdit/共存分层/替换」三向，Failure Paths 增 gd-cell-edit-save-fail 与 gd-cell-edit-quickedit-coexist；Minor 五条随共识修复（citation 路径修正 `table-renderer/table-body-row-rendering.tsx:193-209`/`:224-225`、列菜单/行高 Non-Goal+Follow-up 显式登记、Closure Gates 增 `pnpm check`、表头顺序句改写、「框架层接线」措辞张力消除）；R2 residual 1 Minor（Exit Criteria 计数勘误 七→六）+ 1 typo 随共识修复。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛（回写 ⑦ 缺口面逐条按本计划修正后口径落终态，含 `quickEdit` 既有通道与新语义的分层结论）
- [x] 行为/契约结果已达成（分组聚合 + 原位编辑语义件可用且有测试锁定）
- [x] 必要 focused verification 已完成（先红后绿全矩阵）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（三维度 deferred 均为 optimization candidate/条件分支登记，非 in-scope defect）
- [x] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——fresh session 独立子 agent `ses_fa966e834ffeeZjCcRDxuXl0o7` 1 轮 **APPROVED** 零 Blocker/零 Major（1 Minor：export 改写引入的 prettier 连行 artifact——随共识修复 prettier --write 归位 + 全包 1027 tests 复绿；2 Informational：editable 定义登记口径沿既有 column 纯值字段惯例、renderer-interfaces group×combineNum 为实现诚实超集——均已核实在案无需返工）；审计独立重跑四测试文件 51/51 + 全包 136 files/1027 tests + oversized/i18n-keys/schema-prop-coverage/renderer-definition-fields-only/event-dispatch-ctx 全 exit 0 + typecheck 37/37 + 保护区（ui/flux-core/form-advanced）零触碰 + C2 回写 ⑮ 纯追加核验。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增命中，超出既有登记基线即 red——195W/2E-exempt 与登记基线一致）

## Deferred But Adjudicated

> Phase 1 裁定后终态化；以下为起草时预登记槽位（Phase 1 可修订）。

### fill-handle 编辑器选区模型

- Classification: `optimization candidate`（Phase 1 Decision 3 终态：Deferred But Adjudicated）
- Why Not Blocking Closure: 消费面经 P6b 处置表显式裁决为零接线（Airtable 复刻页 A 系列 fill-handle 零覆盖维持，回写 ⑦），当前无任何 consuming 复刻页/页面在等该原语；其依赖的双态编辑状态机本计划已落地——零消费证据时点实现「选区锚点 + 等差填充拖拽原语 + 键盘选区扩展」属无消费者的投机基础设施（「依赖未就位」旧理由已失效，本条为新理由）。
- Successor Required: yes
- Successor Path: D1 输入池——出现 consuming 复刻页/页面诉求时重评，届时可在本计划双态状态机与编辑器矩阵之上叠加。

### 动态列模型（运行时列集合变更）

- Classification: `optimization candidate`（Phase 1 Decision 5 终态：Deferred But Adjudicated）
- Why Not Blocking Closure: 既有替代面完整可达——`columnSettings:{enabled}` 勾选显隐（回写 ③⑦ 实测原生可达）+ `columns` 表达式动态求值（T28 动态列 + T29 last-good 降级，单测锁定）+ 复刻页会话排序端点姿势（P6b A5）；运行时列集合变更（插删列/换型别）的真实诉求场景是「用户自定义列」形态，当前无 consuming 复刻页。
- Successor Required: yes
- Successor Path: D1 输入池 / 独立 plan 候选——沿 tabs 集合管理先例（`itemsOwnership`/`itemsStatePath` 命名与语义）做 columns 轴 + 列型别注册表。

## Non-Blocking Follow-ups

- airtable-grid 复刻页分组/聚合姿势语义件化 retrofit（mock 预聚合 + loop 分支退役候选——复刻页迭代时采纳）
- 共享 roving helper 若本计划裁定不抽取：边界登记顺延（≥2 renderer 条件的下一次触发评估）
- C2 初版 G-D 行「列菜单」「行高」两子能力（Non-Goal 显式登记，D1 输入池，按 C2 后续轮次评估）
- G-B3 输入池候选（语法搜索解析器 / formatCurrency registry 函数等，回写 ⑧ 登记，未分级，按 C2 后续轮次评估）
- schema 模板预设库（G-A Follow-up 登记，C2 预登记候选的另一半，独立后续 plan 候选）

## Closure

Status Note: 2026-08-31 完成。G-D 网格编辑深度语义件族产品化收口：①table 分组/聚合渲染语义（`group` 字段族 + 交错序列分页切片 + 组头行 marker + 折叠键记忆 + 兜底组）与 ②单元格原位编辑双态（列级 `editable` 编辑器矩阵 + 双态状态机 + 双写入通道 + quickEdit 共存分层）双双落地并有 51 条先红后绿单测锁定（全包 136 files/1027 tests）；③三维度终态裁定全部显式落字（fill-handle/动态列 `Deferred But Adjudicated`、roving helper 不抽取、方向键漫游 deferred，G-B2 回写 ⑫ 两项 successor 义务经 C2 回写 ⑮ 闭环）；④owner docs 对齐（renderer-interfaces.md 双节 landed + flux-guide §13/§14 + C2 回写 ⑮ append-only + daily log）；⑤全量验证 full-green（typecheck/build/lint 37/37、test 68/68、check 零新增红 195W/2E-exempt 基线一致）；⑥closure audit 独立通过（`ses_fa966e834ffeeZjCcRDxuXl0o7` APPROVED 零 Blocker/零 Major）。非目标余量：列菜单/行高（D1 输入池）、复刻页分组姿势 retrofit、schema 折叠态持久化（Follow-up 池）。

Closure Audit Evidence:

- Auditor / Agent: fresh session 独立子 agent `ses_fa966e834ffeeZjCcRDxuXl0o7`（1 轮 APPROVED，零 Blocker/零 Major；1 Minor 随共识修复——table-quick-edit-controller.ts prettier 连行归位；2 Informational 核实在案无需返工）
- Evidence: 审计独立重跑——分组/编辑四测试文件 51/51 + flux-renderers-data 全包 136 files/1027 tests + `check-oversized-code-files`（195W/2E-exempt 基线一致）/`check-i18n-keys`/`check-schema-prop-coverage`/`check-renderer-definition-fields-only`/`check:audit-event-dispatch-ctx` 全 exit 0 + `pnpm typecheck` 37/37 + `git diff --stat` 保护区（`packages/ui/`、`packages/flux-core/`、`packages/flux-renderers-form-advanced/`）零触碰 + C2 回写 ⑮ 单一纯追加 hunk（初版裁决表零删改）；执行记录见 `docs/logs/2026/08-31.md` G-D 段。

Follow-up:

- airtable-grid 复刻页分组/聚合姿势语义件化 retrofit（mock 预聚合 + loop 分支退役候选——复刻页迭代时采纳）
- 共享 roving helper 维持不抽取：边界登记顺延（≥2 renderer 条件的下一次触发评估；kanban ad-hoc roving 届时一并回归采纳）
- C2 初版 G-D 行「列菜单」「行高」两子能力（Non-Goal 显式登记，D1 输入池，按 C2 后续轮次评估）
- G-B3 输入池候选（语法搜索解析器 / formatCurrency registry 函数等，回写 ⑧ 登记，未分级，按 C2 后续轮次评估）
- schema 模板预设库（G-A Follow-up 登记，C2 预登记候选的另一半，独立后续 plan 候选）
- `groupCollapsedStatePath` schema 折叠态持久化通道（Decision 1 v1 不立项——无消费证据，Follow-up 池）
