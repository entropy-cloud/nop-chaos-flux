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

- `selection: {}` 即启用多选；`type: "radio"` 为单选。
- `listActions` 里的按钮可用 `${$crud.hasSelection}` 控制禁用态。
- 跨页选择保留：`keepOnPageChange: true`。
- 按行可勾选条件：`selection.checkableWhen`（raw 表达式，行 scope 求值）。

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
        // 编辑控件的 name 必须以 `record.` 前缀写入行草稿
        "body": { "type": "input-number", "name": "record.q1", "min": 0, "frameWrap": false },
      },
    },
    {
      "name": "q2",
      "label": "Q2 预算(万)",
      "quickEdit": {
        "body": { "type": "input-number", "name": "record.q2", "min": 0, "frameWrap": false },
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

- `quickEdit.body` 是一个**内联的渲染器 spec**（通常是 `input-number`/`input-text`/`select`），其 `name` 用 `record.<字段>` 形式把编辑值写回该行草稿。
- `frameWrap: false` 去掉表单项的外框，让控件直接铺在单元格里。
- 行内保存按钮用 `actionType: "quickSaveItem"` 触发 CRUD 的 `quickSaveItemAction`；该 action 默认以当前行 scope 求值，`includeScope: "*"` 把整行草稿一起提交。
- 保存成功后通常 `then: component:refresh` 刷新本 CRUD。

> 完整真实范例见 `apps/playground/src/complex-pages/page-schemas/inline-edit-table.json` 与 `examples/inline-quick-edit.md`。

---

## 7. 常用补充能力

| 能力       | 字段                                                                                    | 说明                             |
| ---------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| 列排序     | `columns[].sortable`                                                                    | 排序状态所有权 `sortOwnership`   |
| 列筛选     | `columns[].filterable` / `filterOptions`                                                | 过滤状态所有权 `filterOwnership` |
| 行内快编   | `columns[].quickEdit` + `quickSaveItemAction`（行按钮用 `actionType: "quickSaveItem"`） | 见上文 §6                        |
| 列显隐管理 | `columnSettings: { enabled: true }`                                                     | 支持拖序（runtime 部分待补）     |
| 响应式展开 | `responsive: { mode: "expand", breakpoint: "sm" }`                                      | 窄屏展开为卡片                   |
| 前端全量   | `clientMode: { loadDataOnce: true }`                                                    | 一次拉全，分页/过滤前端完成      |
| 轮询       | `polling: { enabled: true, sourceId: "pagedUsers", stopWhen: "${done}" }`               | toggle 上游 data-source 启停     |
| 折叠查询区 | `filterTogglable: { defaultCollapsed: true }`                                           | 折叠态显示激活筛选摘要           |
| 无限滚动   | `pagination: { mode: "infinite" }`                                                      | 底部 sentinel 触发下一页         |
| 自定义空态 | `empty: { "type": "empty", "description": "暂无数据" }`                                 | value-or-region                  |

> 状态所有权统一三档：`local`（缺省，组件内部）/ `controlled`（外部受控）/ `scope`（持久化到 `xxxStatePath`）。
