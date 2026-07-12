# CRUD 页面设计：跨框架对比分析

> 对比对象：amis、refine、Ant Design Table、PrimeReact DataTable、TanStack Table、NocoBase、pro-admin-template、nop-chaos-flux（当前实现）。
>
> 三大主题：①查询/筛选 UI 的做法；②复杂查看/编辑页面的组织方式；③主表与子表的布局模式。

---

## 目录

1. [查询/筛选 UI 的五种做法](#1-查询筛选-ui-的五种做法)
2. [复杂查看/编辑页面的组织方式](#2-复杂查看编辑页面的组织方式)
3. [主表与子表的布局模式](#3-主表与子表的布局模式)
4. [flux 现状诊断与改进建议](#4-flux-现状诊断与改进建议)

---

## 1. 查询/筛选 UI 的五种做法

综合所有框架，CRUD 列表页的查询/筛选存在 **五种正交模式**。一个框架通常组合使用其中 2-3 种。

### 模式总览

| 模式                | 位置         | 触发方式            | 代表框架                                             |
| ------------------- | ------------ | ------------------- | ---------------------------------------------------- |
| **A. 顶部表单**     | 表格上方     | 提交按钮 / onSearch | amis `filter`、refine `searchForm`、flux `queryForm` |
| **B. 列头下拉**     | 表头单元格内 | 点击漏斗图标        | Ant Design、amis `filterable`                        |
| **C. 列头内联行**   | 表头下方一行 | 实时 onChange       | PrimeReact `filterDisplay="row"`                     |
| **D. 列头菜单弹出** | 表头弹出面板 | 点击图标弹出        | PrimeReact `filterDisplay="menu"`                    |
| **E. 自动生成**     | 表格上方     | 从列定义推导        | amis `autoGenerateFilter`、pro-admin-template        |

---

### 模式 A：顶部表单（最主流）

**做法**：在表格上方放一个 inline 表单，用户填入条件后提交触发查询。

```
┌────────────────────────────────────┐
│  [关键字____] [状态▾] [搜索] [重置]  │  ← 顶部查询表单
├────────────────────────────────────┤
│  [+ 新增]        [刷新] [列设置]    │  ← 工具栏
├────────────────────────────────────┤
│  Name    │ Status  │ Actions       │
│  ────────┼─────────┼────────────── │
│  Alice   │ Active  │ [编辑] [删除]  │
└────────────────────────────────────┘
```

#### 各框架的差异点

| 框架                          | 布局                                            | 字段来源                                   | 折叠                             | URL 同步           |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------ | -------------------------------- | ------------------ |
| **amis** `filter`             | `mode: 'inline'`，字段水平排列，有面板包裹      | 手动写 `filter.body[]`                     | `filterTogglable`                | `syncLocation`     |
| **amis** `autoGenerateFilter` | 网格布局，`columnsNum` 列/行                    | 从列的 `searchable` 属性自动推导           | 默认折叠到一行                   | ✅                 |
| **refine**                    | `layout="inline"`，字段+提交按钮一行            | 手动写 `<Form>` + `useTable` 的 `onSearch` | ❌ 无                            | `syncWithLocation` |
| **flux** `queryForm`          | 裸 div，字段在上、按钮在下（`mt-2 flex gap-2`） | 手动写 `queryForm.body[]`                  | `filterTogglable`（local state） | ❌ 未实现          |

**关键差异**：amis 和 refine 都让字段和按钮**在同一行**（inline），而 flux 把按钮硬编码在字段**下方**一行，视觉上割裂。

#### amis 的三种切换状态

amis 的 `filterTogglable` 支持标签/图标定制：

```
折叠态：[筛选 (3)]  ← 显示已激活筛选数 + 展开按钮
展开态：[字段A] [字段B] [搜索] [重置] [收起]
```

pro-admin-template 和 refine 都**不支持折叠**——筛选表单始终可见。

---

### 模式 B：列头下拉（Ant Design 经典做法）

**做法**：每个可筛选列的表头标题旁有一个漏斗图标，点击弹出下拉菜单（checkbox/radio/tree）。

```
┌──────────────────────────────────────┐
│  Name    │ Status 🔽 │ Type 🔽       │
│          │  ┌────────┴───────────┐   │
│          │  │ ☑ Active           │   │
│          │  │ ☐ Inactive         │   │
│          │  │ ☐ Pending          │   │
│          │  ├────────────────────┤   │
│          │  │ [确定] [重置]       │   │
│          │  └────────────────────┘   │
└──────────────────────────────────────┘
```

**Ant Design 的 API**：

```ts
interface ColumnType {
  filters?: ColumnFilterItem[]; // 静态选项
  filterDropdown?: (props: FilterDropdownProps) => ReactNode; // 自定义控件
  filterMultiple?: boolean; // checkbox vs radio
  filterMode?: 'menu' | 'tree'; // 菜单 or 树形
  filterSearch?: boolean; // 下拉内搜索框
  onFilter?: (value, record) => boolean; // 过滤函数
}
```

**amis 也支持这种模式**（`column.filterable`），弹出 PopOver 含 checkbox 列表 + 可选搜索框。

**特点**：

- 适合**枚举值离散筛选**（状态、类型、分类）
- 不适合范围查询（日期区间、数字区间）
- 需要 `confirm()` 显式提交（两步操作）
- 多列筛选独立，不汇总

---

### 模式 C：列头内联行（PrimeReact 做法）

**做法**：表头下方多一行，每列正下方放一个输入框，实时过滤。

```
┌──────────────────────────────────────┐
│  Name    │ Status  │ Date            │
│  ────────┼─────────┼──────────────── │
│  [_____] │ [_____] │ [_____]        │  ← 内联筛选行
│  ────────┼─────────┼──────────────── │
│  Alice   │ Active  │ 2024-01-15      │
└──────────────────────────────────────┘
```

**PrimeReact** `filterDisplay="row"`：

```jsx
<Column field="name" filter filterPlaceholder="Search" />
<Column field="status" filter filterMatchMode="equals" />
```

**特点**：

- 始终可见，所见即所得
- 实时过滤（debounce），无需提交按钮
- 占用一行垂直空间
- 适合简单文本/枚举筛选，复杂条件体验差

---

### 模式 D：列头菜单弹出（PrimeReact 高级做法）

**做法**：表头有筛选图标，弹出面板含输入框 + 匹配模式选择 + AND/OR 规则组合。

```
│ Status 🔽 │
│  ┌────────────────────────┐
│  │ [____________]         │
│  │ Match: [Equals    🔽]  │
│  │ [+ Add Rule]           │
│  │ [+ Add Group]  AND / OR│
│  ├────────────────────────┤
│  │ [Apply] [Clear]        │
│  └────────────────────────┘
```

**PrimeReact** `filterDisplay="menu"` 的数据模型：

```js
{
  status: {
    operator: 'AND',                    // 或 'OR'
    constraints: [
      { value: 'active', matchMode: 'equals' },
      { value: 'pending', matchMode: 'equals' }
    ]
  }
}
```

**特点**：

- 最强大的筛选能力（多条件 + AND/OR + 匹配模式）
- 面向高级用户，学习曲线陡
- 适合数据分析类场景

---

### 模式 E：自动生成（amis + pro-admin-template）

**做法**：不在 schema 里手写筛选表单，而是从**列定义**自动推导。

**amis**：

```json
{
  "autoGenerateFilter": { "columnsNum": 4, "showBtnToolbar": true },
  "columns": [
    { "name": "title", "searchable": true },
    { "name": "status", "searchable": { "type": "select", "options": ["A", "B"] } }
  ]
}
```

**pro-admin-template**（ProTable 的 `valueType` + `valueEnum`）：

```ts
const columns: ProColumnType<User>[] = [
  { title: 'User', dataIndex: 'name', valueType: 'text' },
  {
    title: 'Role',
    dataIndex: 'role',
    valueType: 'select',
    valueEnum: { admin: { text: 'Admin' }, editor: { text: 'Editor' } },
  },
  { title: 'Joined', dataIndex: 'joined', valueType: 'date' },
];
// ProTable 自动生成：[User 输入框] [Role 下拉] [Joined 日期] [搜索]
```

**特点**：

- 零配置成本——列定义即查询定义
- 列变更自动同步到查询表单
- 适合标准化 CRUD 场景

**flux 现状**：`autoGenerateQueryForm` 已在 schema 中声明，但**运行时未实现**（design.md §9 标记为 DESIGN-ACK-NOT-IMPL）。

---

### 全局搜索（跨列关键词搜索）

| 框架       | 支持             | 实现方式                                   |
| ---------- | ---------------- | ------------------------------------------ |
| Ant Design | ❌ 不内置        | 需外部实现                                 |
| PrimeReact | ✅ 内置          | `globalFilter` prop + `globalFilterFields` |
| amis       | 通过 filter 表单 | 手动写一个 keyword 字段                    |
| refine     | 通过 searchForm  | 手动写 Input + onSearch                    |
| flux       | 通过 queryForm   | 手动写 keyword 字段                        |

PrimeReact 的全局搜索走同一个 filter 管道，行必须同时满足列级 + 全局条件才匹配。

---

## 2. 复杂查看/编辑页面的组织方式

当一条记录有很多字段（20+）时，如何在查看/编辑页面有效组织？

### 5 种组织策略

| 策略         | 适用场景               | 代表                         |
| ------------ | ---------------------- | ---------------------------- |
| **容器嵌套** | 任意复杂度，声明式组装 | amis, flux                   |
| **块组合**   | 低代码可视化搭建       | NocoBase                     |
| **Tab 分区** | 字段可按主题分组       | 所有框架                     |
| **向导分步** | 有序提交流程           | amis `wizard`, flux `wizard` |
| **字段网格** | 多列紧凑排列           | 所有框架                     |

---

### 策略详解：容器嵌套（amis + flux 的核心模式）

**思路**：一切皆 schema 节点，容器节点取 `body: []`，可任意嵌套。

**amis 的容器词汇表**：

| 容器       | 作用        | 关键属性                                |
| ---------- | ----------- | --------------------------------------- |
| `group`    | 一行多字段  | `direction`, `columnRatio`              |
| `fieldset` | 可折叠分组  | `collapsable`, `subFormMode`            |
| `tabs`     | 标签页      | `tabsMode`: line/card/vertical/sidebar… |
| `wizard`   | 多步骤      | 每步独立 `api`                          |
| `grid`     | 12 列响应式 | `xs/sm/md/lg`                           |
| `divider`  | 视觉分隔    | —                                       |

**典型复杂表单的 amis schema 结构**：

```
form
 └ tabs
    ├ Tab "基本信息"
    │  └ fieldset "联系方式"
    │     └ group [email | phone]     ← 两字段并排
    │  └ fieldset "地址"
    │     └ grid [省 | 市 | 区 | 地址]
    │
    ├ Tab "角色权限"
    │  └ input-table "角色列表"       ← 内嵌子表
    │
    └ Tab "审计日志" (static 只读)
       └ crud "操作记录"
```

**flux 的容器词汇表**（基本对齐 amis）：

| 容器               | 文件                                             | 作用                                    |
| ------------------ | ------------------------------------------------ | --------------------------------------- |
| `grid`             | `flux-renderers-layout/src/grid-renderer.tsx`    | CSS grid，`columns`/`colSpan`/`rowSpan` |
| `fieldset`         | `flux-renderers-form/src/renderers/fieldset.tsx` | `<fieldset>/<legend>` + `collapsible`   |
| `tabs`             | `flux-renderers-basic/src/tabs.tsx`              | 多模式标签页                            |
| `wizard`           | `flux-renderers-layout/src/wizard-renderer.tsx`  | 步骤表单                                |
| `form.columnCount` | `flux-renderers-form/src/renderers/form.tsx:556` | 表单级多列网格                          |

**flux 的 form 多列布局**：

```json
{
  "type": "form",
  "form": { "columnCount": 2 }, // CSS grid auto-flow
  "body": [
    { "type": "input-text", "name": "name" },
    { "type": "input-text", "name": "email" },
    { "type": "input-text", "name": "addr", "className": "col-span-2" }
  ]
}
```

---

### 策略详解：块组合（NocoBase 的革命性思路）

**思路**：页面是"块"（Block）的集合，每个块独立绑定数据源，通过共享上下文关联。

**NocoBase 的块类型**：

| 类别   | 块                                                               |
| ------ | ---------------------------------------------------------------- |
| 数据块 | table, form, details, kanban, calendar, gantt, list, map, charts |
| 筛选块 | filter-form, filter-collapse                                     |
| 其他   | markdown, iframe                                                 |

**编辑页面的组织方式**——抽屉内放 Tabs + Grid，每个 Tab 放多个表单块：

```
Action (create, openMode: 'drawer')
 └ Action.Container (抽屉)
    └ Tabs
       ├ TabPane "基本信息"
       │  └ Grid → [FormBlock (collection: users)]
       ├ TabPane "角色"
       │  └ Grid → [FormBlock (association: users.roles)]
       └ TabPane "权限"
          └ Grid → [FormBlock (association: users.permissions)]
```

**核心区别**：amis/flux 是"一个 form + 多个容器分组字段"；NocoBase 是"多个独立 FormBlock 各自绑定数据源"。

**NocoBase 的 DataBlockProvider 8 种场景矩阵**：

| 场景               | 属性                                       |
| ------------------ | ------------------------------------------ |
| 新建               | `collection`                               |
| 获取单条           | `collection` + `action:get`                |
| 列表               | `collection` + `action:list`               |
| 提供记录（不请求） | `collection` + `record`                    |
| 关联新建           | `association` + `sourceId`                 |
| 关联获取           | `association` + `sourceId` + `action:get`  |
| 关联列表           | `association` + `sourceId` + `action:list` |
| 提供关联记录       | `association` + `sourceId` + `record`      |

---

### 查看 vs 编辑

**amis 方式**：同一个 dialog 壳，叶子字段类型不同。

```jsx
// 查看：叶子是 static
dialog: { body: { type:'form', body: [{type:'static', name:'name'}] }}

// 编辑：叶子是 input-text
dialog: { body: { type:'form', body: [{type:'input-text', name:'name'}] }}
```

**flux 方式**：`form` 的 `static: true` 模式。

```json
{ "type": "form", "static": true, "body": [...] }
```

通过 `FormLayoutContext.staticReadOnly` 切换所有 FieldFrame 为只读。

**NocoBase 方式**：`readPretty` 块 vs 编辑块，完全不同的 schema 节点。

---

### 对比总结

| 维度          | amis                     | NocoBase                    | flux               |
| ------------- | ------------------------ | --------------------------- | ------------------ |
| 组织单位      | 容器节点 (body[])        | 独立块 (Block)              | 容器节点 (regions) |
| 字段归属      | 一个 form                | 多个 FormBlock              | 一个 form          |
| 查看/编辑切换 | 换叶子类型 / static 模式 | readPretty 块               | form.static        |
| 复杂度上限    | 任意嵌套                 | Tab × Grid × Block          | 任意嵌套           |
| 可视化编辑    | ❌                       | ✅ (Initializer + Settings) | ❌                 |
| 表单复用      | 片段重复                 | 块天然独立                  | 片段重复           |

**flux 的主要问题**：crud-demo 中 add 和 edit 各自完整重写了 form schema（`crud-demo.json:56-146` vs `197-281`），没有表单片段复用机制。

---

## 3. 主表与子表的布局模式

### 5 种主子表布局

| 布局            | 图示                         | 代表                                           |
| --------------- | ---------------------------- | ---------------------------------------------- |
| **A. 展开行**   | 行下方展开内容               | Ant Design, PrimeReact                         |
| **B. 同页分栏** | 左右或上下两个表             | amis grid, NocoBase Grid                       |
| **C. 弹窗编辑** | 点击行打开弹窗，弹窗内含子表 | amis, flux                                     |
| **D. 树形嵌套** | 子行缩进在父行下方           | Ant Design nest, amis deferApi                 |
| **E. 内嵌编辑** | 表单内嵌表格控件             | amis combo/input-table, flux combo/input-table |

---

### 布局 A：展开行（Row Expansion）

**Ant Design**：`expandedRowRender` 返回任意内容，渲染为额外的 `<tr>`。

```jsx
<Table
  expandable={{
    expandedRowRender: (record) => <SubTable parentId={record.id} />,
    rowExpandable: (record) => record.hasChildren,
  }}
/>
```

**PrimeReact**：`rowExpansionTemplate` + 控制式 `expandedRows`。

```jsx
const [expandedRows, setExpandedRows] = useState({});
<DataTable
  value={products}
  expandedRows={expandedRows}
  onRowToggle={(e) => setExpandedRows(e.data)}
  rowExpansionTemplate={(data) => <SubTable item={data} />}
>
  <Column expander style={{ width: '3em' }} />
</DataTable>;
```

**TanStack Table**：独特——展开是把子行**展平进主行数组**，不是额外行。

```ts
// expanded = true 表示全部展开
const [expanded, setExpanded] = useState<ExpandedState>({});
table.getRowModel().rows.forEach((row) => {
  // row.subRows 在展开时被展平进 rows
});
```

**三种库的展开状态对比**：

| 维度       | Ant Design               | PrimeReact          | TanStack                   |
| ---------- | ------------------------ | ------------------- | -------------------------- |
| 状态形态   | `expandedRowKeys: Key[]` | Array 或 Object map | `true` 全展 或 `{id:true}` |
| 全展开     | 手动枚举                 | 手动枚举            | `true` 哨兵 O(1)           |
| 状态持久化 | ❌                       | ✅ localStorage     | ❌                         |
| 嵌套深度   | indentSize 像素          | 有限                | dot-ID 无限                |
| 懒加载     | expandedRowRender 按需   | template 按需       | `manualExpanding`          |

---

### 布局 B：同页分栏（Master-Detail Split）

**amis**：`grid` 两列 + `itemAction` 联动。

```jsx
{ type:'grid', columns: [
  { md:6, body: [{
    type:'crud', name:'masterCRUD', api:'/api/departments',
    itemAction: { actionType:'reload', target:'detailCRUD?id=${id}' },
    columns: [{name:'name', label:'部门'}]
  }]},
  { md:6, body: [{
    type:'crud', name:'detailCRUD', api:'/api/users?deptId=${id}',
    columns: [{name:'name', label:'员工'}]
  }]}
]}
```

**NocoBase**：共享 record 上下文，不是事件联动。

```tsx
<CollectionRecordProvider record={selectedDept}>
  {' '}
  {/* 主表选中行 */}
  <DataBlockProvider association="dept.users" sourceId={selectedDept.id}>
    <TableV2 /> {/* 子表自动过滤 */}
  </DataBlockProvider>
</CollectionRecordProvider>
```

**关键区别**：

- amis：**显式 target 事件**——主表行点击 → reload 目标 CRUD
- NocoBase：**隐式上下文**——子 DataBlockProvider 从 parentRecord 自动推导 sourceId
- flux：需手动用 `$crud.selectedRowKeys` 表达式关联，无内置 master-detail 组件

---

### 布局 C：弹窗编辑（Dialog with Sub-Table）

**amis**：

```jsx
{ type:'button', actionType:'dialog', dialog:{ title:'编辑', body:{
  type:'form', api:'/api/save', body:[
    { type:'input-text', name:'name' },
    { type:'input-table', name:'items', columns:[...], addable:true }  // 子表
  ]
}}}
```

**flux**（crud-demo 的做法）：

```json
{
  "type": "button",
  "onClick": { "action": "openDialog", "args": { "body": [
    { "type": "form", "submitAction": {...}, "body": [
      { "type": "input-text", "name": "name" },
      { "type": "combo", "name": "items", "items": [...] }  // 子表
    ]}
  ]}}
}
```

---

### 布局 D：树形嵌套（Tree Table）

**Ant Design**：数据带 `children` 数组自动进入 `nest` 模式。

```jsx
const data = [
  { id:1, name:'Parent', children: [
    { id:2, name:'Child 1' },
    { id:3, name:'Child 2', children: [...] }
  ]}
];
<Table columns={cols} dataSource={data} />
// 自动显示展开图标，子行缩进 indentSize 像素
```

**amis**：`deferApi` 懒加载子节点。

```jsx
{ type:'crud', api:'/api/tree', deferApi:'/api/tree?parentId=${id}' }
```

---

### 布局 E：内嵌编辑控件（In-Form Array Editor）

**amis / flux 共有三兄弟**：

| 控件             | 数据形态 | UI 形态          | 文件 (flux)                                                 |
| ---------------- | -------- | ---------------- | ----------------------------------------------------------- |
| **combo**        | 对象数组 | 卡片列表         | `flux-renderers-form-advanced/src/combo-renderer.tsx`       |
| **input-table**  | 对象数组 | 表格行（有列头） | `flux-renderers-form-advanced/src/input-table-renderer.tsx` |
| **array-editor** | 标量数组 | 单输入框/行      | `flux-renderers-form-advanced/src/array-editor.tsx`         |

三者共享同一个 `array-field.tsx` 内核：

```
array-field.tsx (内核)
 ├ createItemScope           ← 每项独立 scope
 ├ createItemFormProxy       ← 每项 FormRuntime 代理
 ├ createProjectedValidation ← 投影验证
 └ addItem/removeItem/moveItem
```

**数据来源**：这三个控件的值通过 `name` 绑定到父 form/scope 路径。该路径可以由父表单的 `loadAction` 从服务端加载（服务端数据），行级操作（增/删/排序）可通过 `onAdd`/`onRemove`/`onReorder` 事件触发服务端 ajax。但它们**没有独立分页/查询**——一次性加载全部行。如果子表数据量大需要独立翻页/筛选，应嵌入完整 CRUD。

> 注：renderer definition 框架支持 `allowSource` 标注（`SchemaFieldRule.allowSource`），用于 `options`（select/radio-group）、CRUD `source` 等动态数据源绑定。input-table/combo 当前未使用 `allowSource`，而是通过 `name` → form/scope 路径间接获取数据。

---

### flux 的 detail-view（一對一草稿编辑器）

flux 独有的 `detail-view`（`flux-renderers-form-advanced/src/detail-view/detail-view.tsx`）：

```
表单中显示一个只读 viewer（内联预览）
  └ 点击触发 → 创建 draft FormRuntime → 打开 DetailSurface（弹窗）
     └ transformIn → 编辑 → validate → transformOut → 提交回父表单
```

这是一对一投影编辑，不支持子集合。

---

## 4. flux 现状诊断与改进建议

### 4.1 查询/筛选 UI 的问题诊断

#### 当前实现

```
nop-crud (div)
 ├ CrudQueryRegion (nop-crud-query)     ← 裸 div，无样式
 │   ├ [form fields]                    ← 由嵌套 form 渲染器决定布局
 │   └ [搜索] [重置]                     ← mt-2 flex gap-2（硬编码，字段下方）
 ├ nop-crud-toolbar (flex flex-col)
 ├ nop-crud-table
 └ nop-crud-footer
```

#### 问题清单

| #   | 问题                                                        | 严重度 | 对比                             |
| --- | ----------------------------------------------------------- | ------ | -------------------------------- |
| 1   | **查询区无面板样式**——裸 div，无 padding/border/card        | 高     | amis 有 `Panel--default` 包裹    |
| 2   | **按钮位置割裂**——硬编码在字段下方，非 inline               | 高     | amis/refine 字段+按钮同一行      |
| 3   | **`autoGenerateQueryForm` 未实现**——必须手写全部字段        | 高     | amis/pro-admin-template 自动生成 |
| 4   | **`queryForm.layout` 声明但未消费**——inline/horizontal 无效 | 中     | amis `mode` 生效                 |
| 5   | **`queryForm.actions` 声明但未消费**——按钮不可定制          | 中     | amis 支持自定义                  |
| 6   | **两条筛选路径不统一**——queryForm→query vs 列头→filters     | 中     | amis 也分离但文档明确            |
| 7   | **折叠状态 local-only**——不持久化、不可外部控制             | 低     | amis 也 local                    |
| 8   | **无 URL 同步**——刷新丢失查询条件                           | 低     | amis/refine 有                   |

#### 改进建议

**短期（高 ROI）**：

1. **给查询区加面板样式**——`nop-crud-query` 加 padding + 背景色 + 圆角边框，视觉上与工具栏/表格分离。

2. **按钮 inline 化**——当 `queryForm.layout` 为 `inline`（或默认）时，搜索/重置按钮与字段在同一行，右对齐。

3. **实现 `queryForm.layout`**——读取 `horizontal`/`inline`/`vertical` 并传递给嵌套 form 渲染器。

**中期**：

4. **实现 `autoGenerateQueryForm`**——从 `columns` 的 `searchable`/`searchConfig` 属性自动生成 `queryForm.body`，参考 amis 的 `AutoFilterForm`。

5. **工具栏内嵌搜索**——在 toolbar 提供一个紧凑关键词搜索输入框（类似 PrimeReact global filter），作为顶部表单的补充。

6. **支持 `queryForm.actions`**——允许 schema 自定义查询区按钮。

**长期**：

7. **列头筛选**——支持 Ant Design 式的 `column.filterable`（表头漏斗图标 + 下拉菜单）。

8. **URL 同步**——`syncLocation` 选项。

---

### 4.2 复杂查看/编辑页面的问题诊断

#### 问题清单

| #   | 问题                                                                  | 严重度 |
| --- | --------------------------------------------------------------------- | ------ |
| 1   | **add/edit 表单重复**——crud-demo 中完整重写了两遍 form schema         | 高     |
| 2   | **无表单片段复用机制**——不能定义一次、add/edit/view 三处引用          | 高     |
| 3   | **查看模式粗糙**——`static: true` 切全部字段只读，无字段级 view 配置   | 中     |
| 4   | **无页面级查看/编辑复合体**——没有"查看页 → 点编辑 → 编辑页"的内置流程 | 低     |

#### 改进建议

1. **表单片段复用**——引入 `xui:import` 或 schema ref 机制，定义 form 片段后多处引用。

2. **字段级 view 配置**——FieldFrame 支持 `viewType`（如 `static-text`、`tag`、`image`），查看/编辑使用不同渲染。

3. **CRUD 内置表单模板**——CRUD 支持 `formTemplate` 属性，add/edit/view 共享一份 body 定义，通过 mode 区分。

---

### 4.3 主子表布局的问题诊断

#### 问题清单

| #   | 问题                                                    | 严重度 |
| --- | ------------------------------------------------------- | ------ |
| 1   | **无声明式 master-detail**——需手动用表达式关联两个 CRUD | 高     |
| 2   | **嵌套 CRUD 隔离靠约定**——无运行时 id 冲突检测          | 中     |
| 3   | **detail-view 仅一对一**——不支持一对多子集合            | 中     |

#### 改进建议

1. **master-detail 复合组件**——参考 NocoBase 的上下文关联模式，提供 `<MasterDetail>` 布局，主表选中行自动注入子表的 `parentId`。

2. **CRUD id 冲突检测**——运行时 warn 重复 id。

3. **detail-view 扩展子集合**——支持一对多投影。

---

## 附录：参考源码索引

| 框架                   | 源码位置                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------- |
| amis CRUD              | `~/sources/amis/packages/amis/src/renderers/CRUD.tsx`                              |
| amis AutoFilterForm    | `~/sources/amis/packages/amis/src/renderers/Table/AutoFilterForm.tsx`              |
| amis HeadCellFilter    | `~/sources/amis/packages/amis/src/renderers/Table/HeadCellFilterDropdown.tsx`      |
| amis Form 容器         | `~/sources/amis/packages/amis/src/renderers/Form/{Group,FieldSet,Tabs,Wizard}.tsx` |
| amis input-table       | `~/sources/amis/packages/amis/src/renderers/Form/InputTable.tsx`                   |
| amis combo             | `~/sources/amis/packages/amis/src/renderers/Form/Combo.tsx`                        |
| refine List            | https://github.com/refinedev/refine (packages/antd/src/components/crud/list/)      |
| refine FilterDropdown  | 同上 (packages/antd/src/components/filterDropdown/)                                |
| Ant Design Table       | `~/sources/ant-design/table/InternalTable.tsx`                                     |
| Ant Design ExpandIcon  | `~/sources/ant-design/table/ExpandIcon.tsx`                                        |
| PrimeReact DataTable   | `~/sources/primereact/DataTable.js`                                                |
| PrimeReact TableBody   | `~/sources/primereact/TableBody.js`                                                |
| TanStack row-expanding | `~/sources/tanstack-table/row-expanding/`                                          |
| NocoBase docs          | `~/sources/nocobase/packages/core/client/docs/`                                    |
| flux CRUD              | `packages/flux-renderers-data/src/crud-renderer.tsx`                               |
| flux CRUD query        | `packages/flux-renderers-data/src/crud-query-region.tsx`                           |
| flux CRUD schema       | `packages/flux-renderers-data/src/crud-schema.ts`                                  |
| flux array-field       | `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`        |
| flux detail-view       | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`            |
| flux crud-demo         | `apps/playground/src/complex-pages/page-schemas/standard-crud.json`                |
