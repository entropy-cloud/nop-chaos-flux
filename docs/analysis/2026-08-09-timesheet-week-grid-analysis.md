# Timesheet 周网格实现方案与 Flux 表格能力评估

> 日期：2026-08-09（v3，经三轮独立子代理审查达成共识）
> 来源：nop-app-erp 需求驱动的前端组件可行性调研（hr/projects 域工时表周网格录入）
> 方法：源码为准（非文档为准）+ AMIS 对标 + 需求×能力匹配分析
> 状态：final（共识）

## TL;DR

nop-app-erp 的 hr/projects 两域工时表（Timesheet）周网格录入需求经调研后结论如下：

1. **需求是"矩阵数字录入"范式**（行=项目/任务，列=周一到周日，单元格输入 0.5h 步进工时），对标 Axelor `TimesheetLine.js`——**不是**拖拽时间块范式（Toggl/Clockify），也不是事件排程范式（calendar/gantt）。
2. **Flux `table` 组件是完整表格实现，可原生承载 Timesheet 全部形态**：树形行（`rowChildrenField`/`childrenSource`）、表头分组（`columns[].children`）、**quickEdit 单元格直编**（inline 模式单元格内直接编辑，支持自定义 body region 如 input-number，**与树形行同格共存**）、合计行（`affixRow`/`prefixRow`，value 支持表达式）、footer 均**已实现**；但 `flux-guide/design-patterns/table.md` 文档未覆盖这些能力（**文档缺口，非能力缺口**）。
3. **Flux `input-table`（录入型）**：单元格常驻输入框直接编辑，但**无树形/表头分组/合计**；其列渲染机制（`item` region 内每列一个完整控件节点）使**派生列/只读列/联动**均可用表达式直接实现——**不需要专门的 compute 机制**。
4. **真实缺口收敛为 0（组件层）**：Timesheet 两域需求（含 projects 项目→任务树形 + 项目级合计 + 单元格直编）由 `table`（树形 + quickEdit + affixRow）**原生覆盖**，无需新增组件、无需动态列；`input-table` 的 footer 缺口仅相对 AMIS InputTable 对齐意义（table 已有 affixRow/prefixRow/footer）。
5. **落地路径**：`table` 优先（树形/扁平行 + quickEdit inline + affixRow 合计），pivot/unpivot 在后端（GraphQL 聚合查询 + 批量保存 mutation）。**quickEdit inline 已实现为常驻输入**（每格 Input 常驻、多格可同时编辑；行级 draft+保存条 / saveImmediately 失焦提交），PoC 验证该交互在 Timesheet 连续多格录入场景的体验（tab 移动/失焦提交/行级保存/0.5h 步进 input-number 常驻宽度），不达标时再评估组件扩展（ask-first）或退回 input-table 扁平方案；两域共享"网格录入 + 后端 pivot"模式，保存/审批由各域既有 BizModel 承担。
6. **AMIS 对标**：AMIS Table（展示型）同样具备 `columnGroup`/树形/`SummaryRow`/**quickEdit**（inline 同格直编 + saveImmediately，renderers/QuickEdit.tsx + TableBody 接线）——两平台表格能力**对齐**；AMIS InputTable（录入型）**只有 footer 插槽**，同样无树形/分组表头——Flux 与 AMIS 在录入型表格上对齐。

## 1. 背景

nop-app-erp（基于 Nop Platform 的 ERP 参考应用）的 hr 与 projects 两域都有"工时表周网格录入"需求（各自独立的设计文档），此前被归为"Timesheet 周网格共享组件"并标记为 `deferred`（前端路线图 frontend-ui-roadmap F12 遗留项）。本次调研评估：

- 需求形态是什么（决定用哪种控件范式）
- Flux 现有控件（`table`/`input-table`/`calendar`/`gantt`）能否直接覆盖
- 是否存在需要新增组件或扩展既有组件的能力缺口
- 若需扩展，扩展点在哪、成本多高、是否与 AMIS 能力对齐

调研过程中经历了数次判断修正（详见 §5），最终以**源码为准**核实。

## 2. 需求分析（owner doc 为准）

### 2.1 hr 域（human-resource/ui-patterns.md §5.1 周工时网格）

```
项目: [下拉选择] ▼   任务: [自动补全]   周: 2026 W27 (6/29-7/5)

┌──────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ 项目     │ 周一 │ 周二 │ 周三 │ 周四 │ 周五 │ 周六 │ 周日 │
│          │ 6/29 │ 6/30 │ 7/1  │ 7/2  │ 7/3  │ 7/4  │ 7/5  │
├──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ ERP-销售 │ 8h   │ 4h   │      │      │      │      │      │
├──────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 合计     │ 8h   │ 8h   │ 8h   │ 8h   │ 8h   │ 0h   │ 0h   │  ← 40h
└──────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘

[+ 添加行]  [保存草稿]  [提交审批]
```

设计要点：项目下拉、任务自动补全、每日合计校验（≤24h）、每周合计显示、**行内编辑（直接点击单元格输入数字）**、复制上周模板、对标 Axelor `TimesheetLine.js`。

### 2.2 projects 域（projects/ui-patterns.md §工时录入）

```
期间: [本周] [上周] [自定义]  项目: [选择/全部]    成员: 张三

│ 项目/任务│ 周一  │ 周二  │ ... │ 合计 │
│ 项目A   │      │      │     │     │
│ ├ 开发  │ 8h   │ 8h   │ ... │ 38h │
│ ├ 测试  │  -   │  -   │ ... │ 2h  │
│ │ 合计  │ 8h   │ 8h   │ ... │ 40h │
│ 项目B   │  -   │  -   │ ... │  -  │
[提交] [保存草稿]
```

要点：单元格直接编辑（0.5h 步进）、提交后自动计算人工成本、周合计超 40h 提示（非强制）。projects 域图示含**项目→任务树形层级**（项目行 + 子任务缩进 + 项目级合计）。

### 2.3 数据模型差异（影响 pivot 设计）

| 维度           | hr 域                                                                                                                                 | projects 域                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 实体           | `ErpHrTimesheet`（周头）+ `ErpHrTimesheetLine`（明细行）                                                                              | `ErpPrjTimesheet`（扁平记录）                                                            |
| 结构           | 头行结构（一周一条头单：periodFrom/periodTo/totalHours/status + lines to-many）                                                       | 每行一条（projectId+taskId+userId+workDate+hours+costRate+costAmount+status+posted）     |
| 关键字段       | Line: workDate + projectId + taskId + activityType + hours                                                                            | projectId + taskId + userId + workDate + hours + costRate + costAmount + status + posted |
| 已落地后端约束 | hr 工时表四态状态机（submit/approve/reject）+ totalHours `afterEntityChange` 重算 + 提交时 24h 日工时终检（state-machine.md RC-R1.8） | projects 侧 status（wf/approve-status）+ posted 过账已落地（cost-collection.md）         |

两域都需要**扁平明细 ↔ 7 天矩阵的 pivot/unpivot 转换**；hr 域保存必须联动头单生命周期（periodFrom/periodTo/totalHours/status），不能绕过既有状态机与校验。

### 2.4 范式判定

需求明确是 **矩阵数字录入**（Axelor/ERPNext/Odoo 传统范式），不是：

- 拖拽时间块录入（Toggl/Clockify 范式）——owner doc 无拖拽语义
- 事件排程（calendar/gantt 范式）——工时无起止时间语义

## 3. Flux 控件能力盘点（源码为准）

> 本节全部结论以 `packages/` 源码核实为准；`flux-guide/` 文档存在未覆盖项，已单独标注。

### 3.1 `table`（展示型+可编辑，`flux-renderers-data`）——完整表格实现

源码：`packages/flux-renderers-data/src/table-renderer.tsx` + `table-renderer/`（table-header-tree.ts / use-table-tree.ts / table-quick-edit-cell.tsx / table-quick-edit-controller.ts / use-row-quick-edit-draft.tsx / table-summary-row.tsx / table-body-row-rendering.tsx）+ `schemas.ts`

| 能力                        | 支持 | 证据（源码）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 树形行                      | ✅   | `TableSchema.rowChildrenField`（树模式开关，use-table-tree.ts:129-131）+ `childrenSource`（懒加载子节点）+ `flattenTreeRows`（扁平化/循环检测/level/parentRowKey/treePath）+ `handleToggleTreeExpand`（展开折叠）。注：`defaultExpanded`/`maxDepth` 仅存在于 `flattenTreeRows` options 接口（use-table-tree.ts:33-34），**渲染路径未接线、TableSchema 未暴露**，属纯函数选项                                                                                                                                                                                                                                         |
| **单元格直编（quickEdit）** | ✅   | `TableColumnSchema.quickEdit?: boolean \| { mode: 'inline'\|'dialog', body?: SchemaInput, saveImmediately?: boolean \| SchemaValue }`（schemas.ts:16-20 定义、:89 声明）；**inline 模式无条件渲染常驻 Input 或自定义 body region**（table-quick-edit-cell.tsx:113-129，每格独立 Input、多格可同时编辑），**与树形行同格共存**（table-body-row-rendering.tsx:483-515，quickEdit 分支 + treeToggle 同 cell）；非 saveImmediately + quickSave action 走**行级 draft + 保存条**（use-row-quick-edit-draft.tsx），saveImmediately 失焦提交（table-quick-edit-cell.tsx:187-198）；支持 quickSaveItemAction/quickSaveAction |
| **合计行**                  | ✅   | `TableSummaryRow { cells: TableSummaryCell[] }`（schemas.ts:106-108），`TableSummaryCell { column, value: SchemaInput\|string, align }`（value 支持表达式求值，table-summary-row.tsx:40-42）；`prefixRow`（表头下）/`affixRow`（表尾）渲染于 table-renderer.tsx:614-617/662-665                                                                                                                                                                                                                                                                                                                                      |
| footer                      | ✅   | `TableSchema.footer?: SchemaInput \| string`（schemas.ts:144；渲染 table-renderer.tsx:692-693）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 表头分组                    | ✅   | `TableColumnSchema.children` 嵌套列 + `computeHeaderRows`（table-header-tree.ts:52，colSpan/rowSpan 多行表头）+ `extractLeafColumns` + `hasNestedColumns`                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 排序/筛选                   | ✅   | `sortable`/`filterable`/`filterOptions`/`sortOwnership`/`filterOwnership`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 行选择                      | ✅   | `rowSelection`（checkbox/radio）+ `keepOnPageChange`/`maxSelectionLength`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 虚拟滚动                    | ✅   | `virtualThreshold`/`scrollHeight`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 操作列                      | ✅   | `type: "operation"` + `$slot.record` 行上下文                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 列类型                      | ✅   | text/index/mapping/operation/image/date                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 事件                        | ✅   | onRowClick/onRowDoubleClick/onSort/onFilter/onSelectionChange                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

**文档缺口**：`flux-guide/design-patterns/table.md` 仅覆盖基础用法（列类型/排序/选择/虚拟滚动/操作列），**未记录树形（rowChildrenField/childrenSource）、表头分组（columns[].children）、footer、quickEdit、affixRow/prefixRow 合计**。quickEdit 在 `crud.md §6` 与 `examples/inline-quick-edit.md` 有文档（crud 侧），但 table.md 本身未覆盖。这是文档不全，不是能力缺失。

### 3.2 `input-table`（录入型，`flux-renderers-form-advanced`）——行编辑矩阵

源码：`packages/flux-renderers-form-advanced/src/input-table-renderer.tsx` + `input-table-row.tsx` + `composite-field/composite-schemas.ts`

| 能力                          | 支持       | 证据（源码）                                                                                                                         |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 单元格编辑（常驻输入框）      | ✅         | `item` region 每列一个完整控件节点（input-number/select/text 等），绑定行 scope                                                      |
| 行操作                        | ✅         | `addable`/`removable`/`reorderable`/`minItems`/`maxItems`/`rowKey`                                                                   |
| 条件删除                      | ✅         | `removeWhen`（remove-when-gating.ts）                                                                                                |
| 校验                          | ✅         | minItems/maxItems 行级 + 列内控件自身校验                                                                                            |
| 事件                          | ✅         | onAdd/onRemove/onReorder                                                                                                             |
| 派生列/只读列/联动            | ✅（隐式） | item region 内控件字段可用表达式绑定行数据（如 `{type:"text", text:"${qty}*${price}"}`、`readOnly:true`）——**无需专门 compute 机制** |
| 树形行                        | ❌         | 无 rowChildrenField 等价物                                                                                                           |
| 表头分组                      | ❌         | columns 为静态数组（`InputTableColumn {label?, width?}`，composite-schemas.ts:109-112）                                              |
| footer/合计                   | ❌         | 无 footer region（相对 AMIS InputTable 的差距，见 §4.2；合计行可由 table 的 affixRow 或页面级卡片承担）                              |
| 动态列（运行时生成列 schema） | ❌         | 列渲染依赖 `item` region 的 templateNode（编译期静态，input-table-row.tsx:152-185），动态列需动编译器 + item region 机制，成本最高   |

### 3.3 `calendar` / `gantt`（排程型，`flux-renderers-scheduling`）

| 能力 | calendar                                          | gantt                                   |
| ---- | ------------------------------------------------- | --------------------------------------- |
| 视图 | month/week/day + 资源分组（resources/resourceId） | 任务条 + 依赖链接 + 里程碑 + 多刻度缩放 |
| 拖拽 | ✅ 创建/编辑事件（onEventCreate/onEventChange）   | ✅ draggable/editable/linkable          |
| 适用 | 事件排程、休假矩阵（事件型）                      | 项目排程、资源分配                      |

与 Timesheet 矩阵录入需求**模型不匹配**（事件模型 vs 数字矩阵），仅当需求升级为拖拽时间块范式时才相关。

### 3.4 表达式系统（`flux-formula`）

`packages/flux-formula/src/`：`parseFormula`/`evaluateAst`/`createExpressionCompiler`/`createFormulaCompiler` 完整表达式系统（index.ts:1-4）。任何 schema 字段（包括 item region 内控件字段、quickEdit body、affixRow value、label、visibleOn、action args）均可表达式绑定——**派生列/合计不需要 compute 字段机制**（§3.1 affixRow value 即表达式，§3.2 已覆盖派生列）。

## 4. AMIS 对标（`~/app/amis-react19`）

### 4.1 展示型 Table（`packages/amis/src/renderers/Table/index.tsx` + `amis-core/src/store/table.ts`）

| 能力       | AMIS                                                                                                                                                                                                                                   | Flux table                             | 结论                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------- |
| 表头分组   | ✅ `columnGroup`（Table/index.tsx:2404, 2481）                                                                                                                                                                                         | ✅ `columns[].children`                | 对齐                  |
| 树形行     | ✅ `expandable`/`expandedRows`/`--Table-tree-indent`（table.ts:111,224,394）                                                                                                                                                           | ✅ `rowChildrenField`/`childrenSource` | 对齐（Flux 多懒加载） |
| 合计行     | ✅ `SummaryRow`（`amis-ui/src/components/table/SummaryRow.tsx`）                                                                                                                                                                       | ✅ `affixRow`/`prefixRow`              | 对齐                  |
| 单元格直编 | ✅ 亦支持——`renderers/QuickEdit.tsx`（mode: 'inline'\|'dialog'\|'popOver'\|'append'，:47；renderInlineForm :581）+ Table 列级 `quickEdit` 接线（TableBody.tsx:143 onQuickChange；TableBody.tsx:142 `quickEditEnabled` 门控当前被注释） | ✅ `quickEdit` inline 常驻输入         | **对齐**              |

### 4.2 录入型 InputTable（`packages/amis-ui/src/components/InputTable.tsx`）

| 能力          | AMIS InputTable                                              | Flux input-table | 结论                                                        |
| ------------- | ------------------------------------------------------------ | ---------------- | ----------------------------------------------------------- |
| footer 插槽   | ✅ `footer?: () => React.ReactNode`（InputTable.tsx:81,303） | ❌ 无            | 差距（但合计承载可由 table affixRow/页面卡片替代，见 §6.3） |
| 表头分组/树形 | ❌                                                           | ❌               | 对齐（录入型表格两平台均无）                                |
| 行操作/校验   | ✅ addable/removable/maxLength                               | ✅ 对齐          | 对齐                                                        |

**结论**：Flux `input-table` 相对 AMIS InputTable 只差一个 `footer` 插槽；Flux `table` 与 AMIS Table 的能力组合（树形+quickEdit+合计+分组表头）**对齐**，且 Flux 侧 quickEdit/树形/合计均有源码级实现与（部分）文档，AMIS 侧 quickEdit 门控当前被注释（TableBody.tsx:142）。

## 5. 调研过程中的判断修正（防再犯）

| #   | 阶段结论                                                             | 修正                                                                                                                                                                          | 根因                                                   |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | "Flux 无 calendar 对应 Timesheet 能力，input-table 不匹配"           | 需求是矩阵数字录入（owner doc 为准），calendar 是事件模型，本就该不匹配                                                                                                       | 未先读 owner doc 就判定范式                            |
| 2   | "Flux 无表头分组/树形（grep groupHeader 零命中）"                    | **错**。Flux 命名为 `columns[].children` + `rowChildrenField`，源码完整实现                                                                                                   | grep 用了 AMIS 术语命名；未读源码 table-renderer/ 目录 |
| 3   | "需要列级 compute 机制"                                              | **不需要**。item region 内控件字段表达式直接计算                                                                                                                              | 未核实 input-table 的 item region 渲染机制             |
| 4   | "input-table 缺 footer 是缺口"                                       | 部分正确——确缺 footer，但仅为相对 AMIS InputTable 的一处插槽；且 table 已有 affixRow/prefixRow/footer                                                                         | —                                                      |
| 5   | "table 有树形/合计但单元格不可直接编辑，真实缺口=树形+直编+合计组合" | **错**。`quickEdit` inline 模式单元格内直接编辑（自定义 body region），**与树形行同格共存**（table-body-row-rendering.tsx:483-503）——组合原生支持，真实缺口收敛为 0（组件层） | 第 1 轮独立审查发现（快照未覆盖 quickEdit 源码）       |

**方法论教训**：①组件能力核实必须以**源码为准**（`packages/.../src/`），不能以文档为准（`flux-guide/` 有未覆盖项），也不能以对方平台的术语 grep 命名；②**同一能力可能在"组件能力表"与"交互形态"两个层面**——quickEdit 存在与否需分别核实"能力有无"与"连续录入体验"。

## 6. 需求 × 能力匹配

### 6.1 Timesheet 三范式 × 控件

| 范式                      | 需求出处                                                   | 匹配控件                                                                                     | 结论                    |
| ------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------- |
| 矩阵数字录入（Axelor 式） | hr/ui-patterns §5.1 + projects §工时录入（owner doc 现状） | `table`（树形/扁平行 + quickEdit inline + affixRow 合计）或 `input-table`（扁平 + 常驻输入） | ✅ 匹配（见 §6.2 取舍） |
| 拖拽时间块（Toggl 式）    | 无（owner doc 未要求）                                     | `calendar`（week+resources+drag）                                                            | 可行但非当前需求        |
| 资源排程（gantt 式）      | 无                                                         | `gantt`                                                                                      | 非工时录入场景          |

### 6.2 树形行需求（projects 域）的承载

`table` 原生支持"树形行 + quickEdit 单元格直编 + affixRow 合计"三组合（§3.1），projects 图示（项目→任务缩进 + 项目级合计 + 格子直编）**table 直接承载，无降级**。备选：

| 方案                                                   | 实现                                                                                                             | 评估                                                                                                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a. table 树形 + quickEdit inline（推荐）**           | `rowChildrenField` 树形 + 每天列 `quickEdit: {mode:'inline', body: input-number(0.5h 步进)}` + `affixRow` 合计行 | ✅ 原生能力全覆盖，与 owner doc 图示最贴合；quickEdit inline 为**常驻输入**（每格独立 Input、多格同时可编），连续多格录入体验（tab 移动/失焦提交/行级保存）需 PoC 实测 |
| b. input-table 扁平 + 层级列                           | 后端聚合返回"项目合计行+任务明细行"混合数组，层级列（缩进/前缀）                                                 | 无折叠/展开；相对 owner doc 树形为降级，需 owner 裁决或 retrospectives 记录                                                                                            |
| c. 两组件组合（table 树形总览 + input-table 明细编辑） | 上：table 树形汇总；下：input-table 编辑明细                                                                     | 页面复杂，两表联动                                                                                                                                                     |

### 6.3 合计行

- **table**：`affixRow`（表尾合计，value 表达式）+ `prefixRow`（表头下）+ `footer` ✅ 原生
- **input-table**：无 → 页面级 summary 卡片（现成组件拼）或评估补 footer 插槽（§7）
- hr 需求"按周汇总"= affixRow 列合计；projects 需求"项目级合计"= 树形父行聚合（后端计算返回）+ affixRow 周合计

### 6.4 校验指派（R4/R5）

| 校验                      | 语义                                                                                                                                              | 承载                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 每日 ≤24h 硬校验          | hr 侧**跨工时表全量**按 employeeId+workDate 汇总（state-machine.md）——与网格内日合计**不同源**（网格日合计为 39h 仍可能因其他已批准工时表超 24h） | **既有后端提交终检**（submit 时），前端仅提示 |
| 周合计 ≤40h 软提示        | 单网格内求和                                                                                                                                      | 前端 affixRow/卡片表达式（非强制）            |
| 每日 ≤ 标准工时（可配置） | hr §5.2                                                                                                                                           | 同 24h，后端校验（可配置项）；前端提示        |

## 7. 扩展评估（若选择给 input-table 补能力）

按"业务简化价值 × 实现成本"分档：

| 档位 | 扩展                                   | 价值                                                                       | 成本                                      | 评估                                                  |
| ---- | -------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| A    | **footer 插槽**（合计行/统计区挂载点） | 中-高（头行单据合计；但 table 已有 affixRow/footer，input-table 场景收窄） | 低（加 region，镜像 `table` footer 范式） | 可选，主要为与 AMIS InputTable 对齐                   |
| A    | 列级派生列/只读                        | 高                                                                         | —                                         | ❌ 不需要——item region 表达式已覆盖                   |
| B    | Excel 粘贴批量录入                     | 高（录入提速）                                                             | 中（clipboard + 行解析）                  | 可选，独立于本需求                                    |
| B    | 列 fixed 固定                          | 中（宽表格滚动）                                                           | 低                                        | 可选（table 已支持 fixed）                            |
| C    | 表头分组/树形（录入型）                | —                                                                          | 高                                        | ❌ 不做——AMIS 录入型也没有；业务用展示型 table 或变通 |
| D    | 动态列（运行时列 schema）              | —                                                                          | 最高（动编译器+item region）              | ❌ 不做——"固定列 + 后端 pivot"可替代                  |

## 8. 方案建议（nop-app-erp Timesheet 落地路径）

1. **范式**：矩阵数字录入（owner doc 现状，方案 A）。
2. **控件**：`table` 优先——树形（projects 域）/扁平行（hr 域）+ 每天列 `quickEdit: {mode:'inline', body: input-number}` + `affixRow` 合计；顶部 form 承载周选择 + 日期带（"2026 W27 (6/29-7/5)"）弥补列标题静态限制，及 hr 项目下拉/任务自动补全（常规 form 控件，item region/顶部 form 承载）。**先 PoC 实测 quickEdit inline 常驻输入在连续多格录入场景的体验**（多格同时编辑、tab 移动、行级 draft 保存/取消、saveImmediately 失焦提交、0.5h 步进 input-number 常驻宽度），若体验不达预期再评估组件扩展（点击进入编辑态，ask-first）或退回 input-table 扁平方案。
3. **pivot 位置**：后端。GraphQL 聚合查询返回矩阵行（含派生合计值）+ 批量保存 mutation 接受矩阵行拆解扁平记录。
4. **保存语义（必须对齐既有后端，防旁路）**：
   - hr 域：批量保存须联动头单（periodFrom/periodTo/totalHours/status 重算）+ **走既有四态状态机与提交终检**（submit 时 24h 跨表全量校验）；SUBMITTED/APPROVED 后网格只读门禁
   - 矩阵↔扁平身份键：`projectId+taskId+workDate`（hr，**在网格约束单活动类型前提下**——`ErpHrTimesheetLine.activityType` 字段存在，多活动类型时键需含 activityType）/`projectId+taskId+userId+workDate`（projects）；删格 = 逻辑删行（`useLogicalDelete`）；并发 version 冲突防护
   - 幂等：保存 mutation 按 (headId, 周区间) 幂等键
5. **校验**：24h 硬校验 = 既有后端提交终检（前端仅提示，口径不同源需注明）；40h 软提示 = 前端 affixRow/卡片表达式。
6. **复制上周模板**：属**后端 action**（按上周行模板复制到本周行，含幂等语义），组件层面无缺口。
7. **自定义期间（projects）**：**显式冲突披露**——固定 7 天列仅覆盖"周一开局的标准周"；"自定义期间"（非周一开局/非 7 天窗口）与静态列冲突，需 owner doc 裁决：限制为完整周（周选择器仅允许标准周）或后续走动态列扩展（成本最高）。
8. **成员维度（projects）**：网格查询按成员过滤；costRate/costAmount 作为只读列（quickEdit 不启用）展示。
9. **共享裁决**：共享的是"网格录入 + 后端 pivot"模式与范式文档；保存/审批由各域既有 BizModel 承担（hr 头级四态 vs projects 记录级 wf/approve-status + posted），组件不感知域差异。
10. **周切换**：切换刷新重查矩阵；未保存编辑需脏数据确认（页面级行为）。

## 9. 后续动作（归 nop-chaos-flux 侧）

- **文档补齐（低风险、高价值）**：`flux-guide/design-patterns/table.md` 补树形（rowChildrenField/childrenSource/expandable）、表头分组（columns[].children）、footer、**quickEdit（inline/dialog/body/saveImmediately）**、affixRow/prefixRow 合计五节；`combo-input-table.md` 补"派生列/只读列经 item region 表达式实现"范例。此为本次调研发现的**真实文档缺口**（quickEdit 仅 crud.md 有文档）。
- **input-table footer 插槽**：是否新增由组件 owner 评估（与 AMIS InputTable 对齐；价值因 table affixRow 存在而收窄，属行为变更需走组件准入流程）。
- **Excel 粘贴**：独立候选，不随本需求启动。
- **治理约束**：以上均落在 nop-chaos-flux（外部仓库），执行受 nop-app-erp `ai-autonomy-policy.md` 保护区域「外部仓库代码」约束（ask-first + 组件 owner 审查），不得由 nop-app-erp 侧单方推进。

## 附录 A：关键证据文件

| 证据                                                                  | 位置                                                                                                                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Flux table 树形                                                       | `packages/flux-renderers-data/src/table-renderer/use-table-tree.ts`                                                                                                                                          |
| Flux table 表头分组                                                   | `packages/flux-renderers-data/src/table-renderer/table-header-tree.ts`                                                                                                                                       |
| Flux table quickEdit                                                  | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx` + `table-quick-edit-controller.ts` + `use-row-quick-edit-draft.tsx`；树形+quickEdit 同格：`table-body-row-rendering.tsx:483-503` |
| Flux table 合计行                                                     | `packages/flux-renderers-data/src/table-renderer/table-summary-row.tsx` + `schemas.ts:106-108,166-167`（affixRow/prefixRow）                                                                                 |
| Flux table schema（footer/rowChildrenField/childrenSource/quickEdit） | `packages/flux-renderers-data/src/schemas.ts`                                                                                                                                                                |
| Flux input-table                                                      | `packages/flux-renderers-form-advanced/src/input-table-renderer.tsx` + `input-table-row.tsx`                                                                                                                 |
| Flux input-table column schema                                        | `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`                                                                                                                             |
| Flux 表达式系统                                                       | `packages/flux-formula/src/`（parseFormula/evaluateAst）                                                                                                                                                     |
| AMIS Table 分组/树形/合计                                             | `packages/amis/src/renderers/Table/index.tsx`（columnGroup）+ `amis-core/src/store/table.ts`（expandable）+ `packages/amis-ui/src/components/table/SummaryRow.tsx`                                           |
| AMIS InputTable footer                                                | `packages/amis-ui/src/components/InputTable.tsx:81,303`                                                                                                                                                      |
| nop-app-erp hr 需求                                                   | `~/app/nop-app-erp/docs/design/human-resource/ui-patterns.md §5.1`                                                                                                                                           |
| nop-app-erp projects 需求                                             | `~/app/nop-app-erp/docs/design/projects/ui-patterns.md §工时录入`                                                                                                                                            |
| nop-app-erp ORM                                                       | `~/app/nop-app-erp/module-hr/model/app-erp-hr.orm.xml`（ErpHrTimesheet/Line）+ `~/app/nop-app-erp/module-projects/model/app-erp-projects.orm.xml`（ErpPrjTimesheet）                                         |
| nop-app-erp hr 状态机/校验（已落地）                                  | `~/app/nop-app-erp/docs/design/human-resource/state-machine.md`（RC-R1.8 工时表四态 + 24h 终检）                                                                                                             |

## 附录 B：Review Record

> 由独立子代理逐轮审查，意见与采纳记录。

### 第 1 轮（2026-08-09）

**路 A：事实核验审查**（独立子代理，源码逐条核验）

| #   | 审查意见                                                                                                                                                                              | 采纳                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A1  | **table 有 quickEdit 行内编辑（inline 单元格直编 + 自定义 body + saveImmediately），且与树形行同格共存——"table 单元格不可直接编辑"断言不实，"真实缺口=树形+直编+合计"结论被显著削弱** | ✅ 采纳（核心修订）：§3.1 补 quickEdit 行、§4.1 补"Flux 超出"、§5 修正 #5、§6.2 方案 a 重写、TL;DR #2/#4 重写 |
| A2  | `defaultExpanded`/`maxDepth` 仅存在于 flattenTreeRows options 接口，渲染路径未接线、TableSchema 未暴露                                                                                | ✅ 采纳：§3.1 标注"纯函数选项未接线"                                                                          |
| A3  | AMIS SummaryRow 实际路径 `amis-ui/src/components/table/SummaryRow.tsx`（报告原文路径错误）                                                                                            | ✅ 采纳：§4.1 + 附录 A 修正                                                                                   |
| A4  | `computeHeaderRows` 定义行号 :75 → :52                                                                                                                                                | ✅ 采纳：§3.1 修正                                                                                            |
| A5  | quickEdit 在 crud.md §6 与 examples/inline-quick-edit.md 有文档——文档缺口论述应限定范围                                                                                               | ✅ 采纳：§3.1 文档缺口段修正                                                                                  |
| A6  | **table 内建合计行 affixRow/prefixRow（TableSummaryRow/TableSummaryCell，value 表达式）**——报告只提 footer 未提此机制                                                                 | ✅ 采纳：§3.1 补合计行行、§6.3 重写、§7 footer 档位再评估                                                     |
| A7  | flux-guide 工作树路径问题                                                                                                                                                             | ⚠️ 部分采纳：附录 A 已用绝对路径标注 nop-app-erp 侧文件                                                       |

**路 B：完整性/逻辑审查**（独立子代理，需求覆盖×方案闭合）

| #   | 审查意见                                                                                    | 采纳                                                                                |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| B1  | **projects"自定义期间"与固定 7 天列直接冲突未披露（blocker）**                              | ✅ 采纳：§8.7 显式披露 + owner doc 裁决要求                                         |
| B2  | **矩阵↔扁平批量保存语义未设计，且忽略已落地后端（hr 四态状态机/totalHours 重算/24h 终检）** | ✅ 采纳：§8.4 保存语义节（身份键/逻辑删/并发/幂等 + 既有状态机约束）                |
| B3  | 校验需求（≤24h/≤40h）未指派实现位置                                                         | ✅ 采纳：§6.4 校验指派表（24h=后端既有、40h=前端软提示、口径不同源披露）            |
| B4  | "复制上周模板"需求点悬空                                                                    | ✅ 采纳：§8.6 闭合（后端 action，组件无缺口）                                       |
| B5  | projects 树形+直编被降级且未声明 owner doc 偏离                                             | ✅ 采纳：§6.2 方案 a 原生承载（不再降级）；方案 b 标注"相对 owner doc 为降级需裁决" |
| B6  | 共享组件合并裁决缺失                                                                        | ✅ 采纳：§8.9 共享裁决（共享网格+pivot 模式，保存/审批各域既有）                    |
| B7  | 成员维度 userId 无承载 + costRate/costAmount 只读列未提                                     | ✅ 采纳：§8.8                                                                       |
| B8  | 列标题日期带解法局限（丢失逐列日期对齐、隐含周一开局假设）                                  | ✅ 采纳：§8.2 注明 + §8.7 关联                                                      |
| B9  | 周切换刷新/脏数据确认未提                                                                   | ✅ 采纳：§8.10                                                                      |
| B10 | 附录 B 全"待填"与头部措辞冲突                                                               | ✅ 采纳：本版已填第 1 轮记录                                                        |
| B11 | TL;DR 缺方案摘要                                                                            | ✅ 采纳：TL;DR 增 #5 落地路径                                                       |
| B12 | §7 footer 语气与 §8.4 不一致                                                                | ✅ 采纳：§7 档位注明"评估结论 vs 应用侧路径"                                        |
| B13 | §9 落在外部仓库，未注明治理门槛                                                             | ✅ 采纳：§9 治理约束段                                                              |

### 第 2 轮（2026-08-09，全面复核 + 第 1 轮落实核验）

**核验结果**：第 1 轮 19 条意见全部落到实处（Part A 六项抽查：quickEdit/affixRow 证据行号精确、§8.7 冲突披露实质、§8.4 保存语义实质、SummaryRow 路径修正、附录 B 自洽）。

| #   | 审查意见                                                                                                                                                                                                                          | 采纳                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **AMIS Table 亦支持 quickEdit**（renderers/QuickEdit.tsx mode:'inline' + renderInlineForm :581 + TableBody 接线 :143；quickEditEnabled 门控 :142 当前被注释）——"Flux 超出 AMIS 两组件能力集"断言不实，应改"对齐"                  | ✅ 采纳：§4.1 单元格直编行改"对齐"（附 AMIS 证据）、§4.2 结论段改写、TL;DR #6 改写                                                        |
| M2  | **quickEdit inline 是常驻输入**（table-quick-edit-cell.tsx:110-127 无条件渲染 Input，每格独立、多格可同时编辑；行级 draft+保存条 / saveImmediately 失焦提交）——报告"点击进入编辑态 vs 单格编辑"表述失实，PoC 只能验证常驻输入体验 | ✅ 采纳：TL;DR #5、§6.2 方案 a、§8.2 交互表述全部改写为"常驻输入 + 行级保存；PoC 实测体验；不达标再评估扩展(ask-first)或退回 input-table" |
| m3  | quickEdit 类型定义在 schemas.ts:16-20（:89 仅声明）；saveImmediately 为 `boolean \| SchemaValue`                                                                                                                                  | ✅ 采纳：§3.1 补引注 + 类型修正                                                                                                           |
| m4  | hr 身份键未含 activityType（ErpHrTimesheetLine 有该字段），同 project+task+date 下多活动类型键不唯一                                                                                                                              | ✅ 采纳：§8.4 注明"网格约束单活动类型前提下成立，否则键需含 activityType"                                                                 |
| m5  | hr"项目下拉/任务自动补全"未显式承载                                                                                                                                                                                               | ✅ 采纳：§8.2 补一句（常规 form 控件承载）                                                                                                |
| m6  | TL;DR #5 与 §8.2 措辞不一致                                                                                                                                                                                                       | ✅ 采纳：与 M2 合并修正                                                                                                                   |

### 第 3 轮（2026-08-09，共识确认）

**核验结果**：第 2 轮 2 major + 4 minor 全部核实落实（M1 对齐结论与 AMIS 源码相符、M2 常驻输入交互与源码逐一相符、m3-m6 落实）。

**最终通读**：blocker 0 / major 0。残留 2 处行号漂移级 minor（§3.1 quickEdit 引注 110-127→113-129、树形同格 483-503→483-515 语义），已随本版修正。

**共识判定**：✅ **final**——报告作为实现决策依据完整（TL;DR 与正文自洽、"真实缺口收敛为 0（组件层）"有源码支撑、§8 方案含保存语义/冲突披露/治理约束），无第 4 轮启动条件。
