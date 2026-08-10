# CRUD 标准操作

> CRUD 取数**没有** `api` 字段，也**没有**顶层 `perPage`。取数走两条路径之一：
>
> - **`source`**（推荐）：消费上游 `data-source` 节点已准备好的数据，请求下沉到 data-source + action。
> - **`loadAction`**：CRUD 自带取数编排入口，接收 `pagination`/`query`/`sort`/`filters` 绑定。
>
> 数据格式统一为 `{ items: [...], total: N }`。所有字段定义见 `flux-types/schema.d.ts` 的 `CrudSchema`。

---

## 1. 标准 CRUD + 搜索 + 新增/编辑/删除（source 路径）

请求下沉到 `data-source` 节点，CRUD 经 `source` 消费结果，刷新用 `refreshSource`。

```jsonc
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "id": "pagedUsers-source",
      "name": "pagedUsers",
      "action": "ajax",
      "args": { "url": "/api/users", "cacheTTL": 0 },
    },
    {
      "type": "crud",
      "id": "users-crud",
      "name": "users-crud",
      "source": "${pagedUsers}",
      "rowKey": "id",
      "onRefresh": { "action": "refreshSource", "targetId": "pagedUsers" },
      "queryForm": {
        "body": [{ "type": "input-text", "name": "keyword", "label": "关键字" }],
      },
      "columns": [
        { "name": "id", "label": "ID", "width": 60 },
        { "name": "name", "label": "姓名", "sortable": true },
        { "name": "email", "label": "邮箱" },
        {
          "name": "status",
          "label": "状态",
          "type": "mapping",
          "map": { "1": "启用", "0": "禁用" },
        },
        {
          "type": "operation",
          "label": "操作",
          "buttons": [
            {
              "type": "button",
              "label": "编辑",
              "onClick": {
                "action": "openDialog",
                "args": {
                  "title": "编辑用户",
                  "data": { "id": "${id}", "name": "${name}", "email": "${email}" },
                  "body": {
                    "type": "form",
                    "id": "editForm",
                    "submitAction": {
                      "action": "ajax",
                      "args": { "url": "/api/users/${id}", "method": "put" },
                    },
                    "onSubmitSuccess": {
                      "action": "closeSurface",
                      "then": { "action": "refreshSource", "targetId": "pagedUsers" },
                    },
                    "body": [
                      { "type": "input-text", "name": "name", "label": "姓名", "required": true },
                      { "type": "input-email", "name": "email", "label": "邮箱" },
                    ],
                  },
                },
              },
            },
            {
              "type": "button",
              "label": "删除",
              "onClick": {
                "action": "confirm",
                "args": { "message": "确定删除该用户？", "title": "确认" },
                "then": {
                  "action": "ajax",
                  "args": { "url": "/api/users/${id}", "method": "delete" },
                  "then": { "action": "refreshSource", "targetId": "pagedUsers" },
                },
              },
            },
          ],
        },
      ],
      "toolbar": [
        {
          "type": "button",
          "label": "新增",
          "variant": "default",
          "onClick": {
            "action": "openDialog",
            "args": {
              "title": "新增用户",
              "body": {
                "type": "form",
                "id": "createForm",
                "submitAction": {
                  "action": "ajax",
                  "args": { "url": "/api/users", "method": "post" },
                },
                "onSubmitSuccess": {
                  "action": "closeSurface",
                  "then": { "action": "refreshSource", "targetId": "pagedUsers" },
                },
                "body": [
                  { "type": "input-text", "name": "name", "label": "姓名", "required": true },
                  { "type": "input-email", "name": "email", "label": "邮箱" },
                ],
              },
            },
          },
        },
      ],
      "footerToolbar": [
        { "type": "statistics", "total": "${$crud.total}" },
        { "type": "pagination" },
      ],
    },
  ],
}
```

**关键点**：

- `data-source` 节点持有请求（`action: "ajax"`），CRUD 只消费 `${pagedUsers}`。
- CRUD 的 `onRefresh` 指向 `refreshSource` + `targetId`（data-source 的 `name` 或 `id`）。
- 弹窗 `data` 传当前行数据 → 表单引用 `${id}` → 成功后 `closeSurface` 再 `refreshSource`。
- `footerToolbar` 接收 schema 对象数组——`statistics` 和 `pagination` 都是独立 renderer，`total` 可通过表达式绑定到 `${$crud.total}`。

> ⚠️ **`footerToolbar` 里的 `{ "type": "pagination" }` 是自包含组件，不与 CRUD 分页状态联动**（点击页码不触发数据刷新）。loadAction/source 路径下分页请用缺省内建 `TablePaginationBar`（不写分页配置即可）或 `toolbarLayout` 拆分方案，详见下方 **§2a**。`statistics` 独立 renderer 是纯展示（读 `$crud.total`），放在 footerToolbar 正常。

> **弹窗提交后刷新外部 CRUD**：上例的 `onSubmitSuccess: { closeSurface, then: refreshSource }` 写法依赖 `then` 链共享 ctx，仅适用于** declarative dialog 或 source/CRUD 共享 page scope** 的场景。action-style `openDialog` 推荐改用 lifecycle callback + `refreshNearest`，详见 `design-patterns/page-dialog-drawer.md` §6 与 `docs/architecture/surface-lifecycle-callbacks.md`：
>
> ```jsonc
> {
>   "action": "openDialog",
>   "args": {
>     "body": {
>       /* form */
>     },
>     "onSubmitSuccess": [{ "action": "closeSurface" }, { "action": "refreshNearest" }],
>   },
> }
> ```

---

## 2. CRUD 自带取数（loadAction 路径）

CRUD 自己声明如何拉数据，`loadAction` 接收分页/查询/排序/筛选绑定。适合不需要复用数据的简单场景。

```jsonc
{
  "type": "crud",
  "id": "my-crud",
  "loadAction": {
    "action": "ajax",
    "args": { "url": "/api/users", "method": "get" },
    "dependsOn": ["searchQuery"],
  },
  "columns": [{ "name": "name", "label": "姓名" }],
}
```

- `loadAction` 派发时，action 的 `evaluationBindings` 会带上 `pagination`（`{ currentPage, pageSize }`）、`query`、`sort`、`filters`。
- 后端按 `page`/`perPage` 字段名（可用 `pageField`/`pageSizeField` 覆盖）返回 `{ items, total }`。
- 一次性拉全量、前端分页/过滤：加 `loadAllData: true`。

**翻页重载机制（loadAction 路径）**：分页变化会写入 scope 的 `paginationStatePath`（默认 `$_crud.<id>.pagination`），CRUD 内部据此重新派发 `loadAction`（`useCrudLoadAction` 的 imperative effect 依赖 pagination 状态，不依赖 `dependsOn`）。上游测试保证：翻页触发恰好一次 load（`crud-loadaction-reaction-regression.test.tsx`）。因此 **loadAction 不需要显式 `dependsOn` 分页路径**。

---

## 2a. 分页器：三套机制与正确用法（重要）

flux CRUD 的分页有三套并存机制，**其中一套不联动**，踩坑成本高，先给结论：

| 路径                                          | 配置                                        | 翻页联动      | 页码列表             | 统计                       | 适用                                                                        |
| --------------------------------------------- | ------------------------------------------- | ------------- | -------------------- | -------------------------- | --------------------------------------------------------------------------- |
| A. footerToolbar 放独立 `pagination` renderer | `footerToolbar: [{ "type": "pagination" }]` | ❌ **不联动** | 完整                 | —                          | **不要用**（自包含组件，点击只更新自身 DOM，不驱动 loadAction/source 刷新） |
| B. 缺省内建 `TablePaginationBar`              | **不写任何分页配置**                        | ✅            | 完整 + 省略号        | `1-10 of 15`（英文硬编码） | **推荐**，零配置                                                            |
| C. `toolbarLayout` 拆分 blocks                | `toolbarLayout: { footer: [...] }`          | ✅            | 仅 `‹ 第 X / Y 页 ›` | `共 X 条`（i18n）          | 需要自定义布局/中文统计时                                                   |

**路径 A 的坑**（crud.md §1 示例写法，loadAction 模式下不工作）：独立 `pagination` renderer 是通用受控组件（配合普通 table 使用时需显式传 `total`/`currentPage`/`pageSize` 并自行接事件），放进 CRUD footerToolbar 后**不会**与 CRUD 分页状态联动 —— 点击页码只更新自身 DOM，表格数据不刷新。已在上游标注（见 `nop-chaos-next` 排查记录）。

**路径 B（缺省内建栏）**：CRUD 的 table 在 `paginationMode: "pages"`（默认）且未配置 `toolbarLayout` 时，自动渲染 `TablePaginationBar`（`data-slot="table-pagination"`）：左侧每页条数选择、中间完整页码、右侧 `1-10 of 15` 统计，`flex justify-between` 左中右布局。翻页走 CRUD `handlePageChange` → scope 分页状态 → loadAction 重载。

**路径 C（toolbarLayout 拆分）**：显式配置后内建栏被抑制：

```jsonc
{
  "type": "crud",
  "toolbarLayout": {
    "footer": [
      { "type": "statistics", "align": "left" },
      { "type": "pagination", "align": "right" }
    ]
  },
  "columns": [...],
}
```

- 支持 block：`statistics`（共 X 条）、`pagination`（简化：`‹ 第 X / Y 页 ›`）、`switch-per-page`、`listActions`
- `align: "left" | "right"` 决定左右分组，`CrudToolbarBlocks` 用 `flex justify-between` 渲染同一行
- 分页 block 走 `handleToolbarPageChange`（联动正确）；`PaginationPrevious/Next` 来自 `@nop-chaos/ui`，样式可被 host CSS 覆盖替换

**已知上游限制**：路径 B 的统计文案 `1-10 of 15` 为硬编码英文（无 i18n）；如需中文"共 X 条" + 完整页码列表，需上游增强。

---

## 2b. 序号列与 selection 列

**序号列**：`{ "type": "index", "name": "index", "label": "序号", "width": 50 }` —— 渲染跨页累计行号 `viewIndex + indexColumnOffset + 1`（`indexColumnOffset = (currentPage-1)*pageSize`），自带 `text-center` 居中与 `data-slot="table-index-cell"`。测试覆盖见 `table-index-column.test.tsx`。

**selection（checkbox）列**：`selection: true`（或 `'multiple'`）启用多选（推荐简写；旧写法 `selection: {}` 兼容）。渲染为：

- 表头：`<th data-slot="table-select-column">`（内含全选 Checkbox）
- 表行：`<td data-slot="table-select-cell">`（内含行 Checkbox）

默认 `text-align: left`（checkbox 靠左），且表行首列有 `--table-edge-padding-x`（16px）左留白而表头没有，导致表头/表行 checkbox 水平错位。**居中需 host CSS 覆盖**（见 `nop-chaos-next` 的 `flux-spacing.css` F14 系列）：

```css
[data-slot='crud-table'] .nop-table [data-slot='table-select-column'],
[data-slot='crud-table'] .nop-table [data-slot='table-select-cell'] {
  text-align: center;
  vertical-align: middle;
}
[data-slot='crud-table'] .nop-table [data-slot='table-select-column'] [data-slot='checkbox'],
[data-slot='crud-table'] .nop-table [data-slot='table-select-cell'] [data-slot='checkbox'] {
  margin-inline: auto;
}
/* 表头首列与表行首列 padding 对齐（16px edge padding 只留给文本首列） */
[data-slot='crud-table'] .nop-table thead th:first-child {
  padding-left: var(--table-edge-padding-x);
}
[data-slot='crud-table'] .nop-table thead th[data-slot='table-select-column'],
[data-slot='crud-table'] .nop-table tbody [data-slot='table-select-cell'] {
  padding-left: var(--table-cell-padding-x);
}
```

---

## 3. `$crud` 摘要与查询表单

CRUD 把只读摘要发布到 scope 的 `$crud`，可在任意子节点表达式里读取：

```jsonc
{
  "type": "crud",
  "id": "query-crud",
  "source": "${pagedUsers}",
  "queryForm": {
    "body": [{ "type": "input-text", "name": "keyword", "label": "关键字" }],
  },
  "footerToolbar": [
    { "type": "text", "text": "共 ${$crud.total} 条，当前 ${$crud.itemCount} 条" },
    { "type": "text", "text": "查询: ${$crud.query.keyword || '无'}" },
  ],
  "columns": [{ "name": "name", "label": "姓名" }],
}
```

`$crud` 可用字段：`loading`、`refreshing`、`itemCount`、`total`、`hasSelection`、`selectionCount`、`selectedRowKeys`、`query`、`pagination`、`sort`、`filters`、`visibleColumnNames`。
查询表单提交/重置由 CRUD 自动接管（搜索/重置按钮内建），也可用 `onQuerySubmit` / `onQueryReset` 事件自定义。

---

## 4. 选择 + 批量操作（selection-aware listActions）

```jsonc
{
  "type": "crud",
  "id": "sel-crud",
  "selection": { "type": "checkbox", "keepOnPageChange": true, "maxSelectionLength": 10 },
  "source": "${pagedUsers}",
  "listActions": [
    {
      "type": "button",
      "label": "批量删除",
      "variant": "destructive",
      "disabled": "${!$crud.hasSelection}",
      "onClick": {
        "action": "confirm",
        "args": { "message": "删除选中的 ${$crud.selectionCount} 项？" },
        "then": {
          "action": "ajax",
          "args": { "url": "/api/users/batch", "method": "delete" },
          "then": { "action": "component:refresh", "componentId": "sel-crud" },
        },
      },
    },
  ],
  "footerToolbar": [{ "type": "text", "text": "已选 ${$crud.selectionCount} 行" }],
  "columns": [{ "name": "name", "label": "姓名" }],
}
```

- `selection` 简写形式（**设置即启用，缺省不启用**）：
  - `selection: true` / `'multiple'` → 多选 checkbox（最常用）
  - `selection: 'single'` → 单选 radio
  - `selection: { type: 'radio', maxSelectionLength: 5, checkableWhen: '...' }` → 高级配置
  - 旧写法 `selection: {}` 仍兼容（= 启用多选全默认）
- `listActions` 里的按钮可用 `${$crud.hasSelection}` 控制禁用态。
- 跨页选择保留：`keepOnPageChange: true`。
- 按行可勾选条件：`selection.checkableWhen`（raw 表达式，行 scope 求值）。
- **批量操作参数映射（AMIS 兼容）**：CRUD 把选中行键以 `selectionField` 指定的名字（默认 `ids`）发布到按钮 action scope，后端生成的 `@mutation:X__batchDelete?ids=${ids}` 可直接解析。与 `pageField`/`pageSizeField` 同一参数名映射模式；自定义名用 `selectionField: "selectedPositionIds"` 并写 `${selectedPositionIds}`。

---

## 5. 行渲染载体：cards / list 模式

`listMode` 缺省 `table`（零回归）。`cards` / `list` 下 CRUD 自持选择与分页，行内容由 `card` / `item` 模板表达。

```jsonc
{
  "type": "crud",
  "id": "list-crud",
  "listMode": "list",
  "source": "${records}",
  "rowKey": "id",
  "item": [{ "type": "text", "text": "${$slot.item.name} — ${$slot.item.status}" }],
  "columns": [{ "name": "name", "label": "姓名" }],
}
```

- `card`（cards 模式）/ `item`（list 模式）是按记录的 region，参数 `item` / `index`。
- 非表格模式下，选择经模板内控件写同一 `selectionStatePath`，`$crud` 摘要照常生效。

---

## 6. 行内编辑（quickEdit + quickSaveItemAction）

逐行就地编辑：列上挂 `quickEdit.body` 声明该列的编辑控件，CRUD 顶部声明 `quickSaveItemAction` 决定单行如何保存。每行可独立保存，无需弹窗。

```jsonc
{
  "type": "crud",
  "id": "budget-crud",
  "rowKey": "id",
  "loadAllData": true,
  "loadAction": {
    "action": "ajax",
    "dependsOn": ["__budget_load__"], // 挂载即触发一次（见 data-source.md）
    "args": { "url": "/api/budget", "method": "get" },
  },
  "quickSaveItemAction": {
    "action": "ajax",
    "args": { "url": "/api/budget/save", "method": "post", "includeScope": "*" },
    "messages": { "success": "保存成功" },
    "then": [{ "action": "component:refresh", "componentId": "budget-crud" }],
  },
  "columns": [
    { "name": "department", "label": "部门", "width": 160 },
    {
      "name": "q1",
      "label": "Q1 预算(万)",
      "width": 130,
      "quickEdit": {
        // 编辑控件的 name 直接用字段名（现在记录字段直接暴露在 scope 顶层）
        "body": { "type": "input-number", "name": "q1", "min": 0, "frameWrap": false },
      },
    },
    {
      "name": "q2",
      "label": "Q2 预算(万)",
      "quickEdit": {
        "body": { "type": "input-number", "name": "q2", "min": 0, "frameWrap": false },
      },
    },
    {
      "type": "operation",
      "label": "操作",
      "buttons": [
        // 行内保存按钮：CRUD 专用的 actionType（裸 spec，无需 type:"button"）
        { "label": "保存", "actionType": "quickSaveItem" },
      ],
    },
  ],
}
```

**关键点**：

- `quickEdit.body` 是一个**内联的渲染器 spec**（通常是 `input-number`/`input-text`/`select`），其 `name` 直接用 `<字段>` 形式把编辑值写回该行草稿（行 scope 已将记录字段展开到顶层）。
- `frameWrap: false` 去掉表单项的外框，让控件直接铺在单元格里。
- 行内保存按钮用 `actionType: "quickSaveItem"` 触发 CRUD 的 `quickSaveItemAction`；该 action 默认以当前行 scope 求值，`includeScope: "*"` 把整行草稿一起提交。
- 保存成功后通常 `then: component:refresh` 刷新本 CRUD。

> 完整真实范例见 `apps/playground/src/complex-pages/page-schemas/inline-edit-table.json` 与 `examples/inline-quick-edit.md`。

---

## 7. 常用补充能力

| 能力       | 字段                                                                                    | 说明                                                                                |
| ---------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 列排序     | `columns[].sortable`                                                                    | 排序状态所有权 `sortOwnership`                                                      |
| 列筛选     | `columns[].filterable` / `filterOptions`                                                | 过滤状态所有权 `filterOwnership`                                                    |
| 行内快编   | `columns[].quickEdit` + `quickSaveItemAction`（行按钮用 `actionType: "quickSaveItem"`） | 见上文 §6                                                                           |
| 列显隐管理 | `columnSettings: { enabled: true }`                                                     | 支持拖序（runtime 部分待补）                                                        |
| 响应式展开 | `responsive: { mode: "expand", breakpoint: "sm" }`                                      | 窄屏展开为卡片                                                                      |
| 前端全量   | `clientMode: { loadDataOnce: true }`                                                    | 一次拉全，分页/过滤前端完成                                                         |
| 轮询       | `polling: { enabled: true, sourceId: "pagedUsers" }`                                    | toggle 上游 data-source 启停；`interval`/`stopWhen` 停止条件配置在 data-source 自身 |
| 折叠查询区 | `filterTogglable: { defaultCollapsed: true }`                                           | 折叠态显示激活筛选摘要                                                              |
| 无限滚动   | `pagination: { mode: "infinite" }`                                                      | 底部 sentinel 触发下一页                                                            |
| 自定义空态 | `empty: { "type": "empty", "description": "暂无数据" }`                                 | value-or-region                                                                     |

> 状态所有权统一三档：`local`（缺省，组件内部）/ `controlled`（外部受控）/ `scope`（持久化到 `xxxStatePath`）。
