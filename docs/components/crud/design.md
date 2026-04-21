# CRUD 组件设计

## 1. 组件定位

- `crud` 是面向业务数据工作流的复合 renderer，用来把查询表单、数据加载、表格展示、工具栏动作、批量操作组织成一个稳定的 schema 契约。
- `crud` 是一个有明确领域边界的组合组件，但它不是新的全局 owner，也不是把 `table`、`form`、`dialog`、`data-source` 粗暴塞进一个黑盒实现。
- `crud` 的目标是提供类似 AMIS `CRUD` 的业务能力密度，同时坚持 Flux 当前的 owner 分层、命名规范、region 建模和 action/source 语义。

## 2. 核心设计原则

### 2.1 对话框由按钮自己控制

**CRUD 不统一管理对话框**。这是与早期设计的关键区别。

- 在 `toolbar` 或 `columns` 的 operation 列中配置按钮
- 按钮使用 `action: 'openDialog'` 和 `args: {...}` 配置对话框
- 对话框中的表单提交成功后，通过 `reload` 属性或 `component:refresh` action 刷新 CRUD

这与 AMIS 的设计一致：每个按钮携带完整的 dialog 定义，CRUD 只负责渲染 shell 和协调刷新。

### 2.2 Operation 列由用户定义

用户在 `columns` 中自行定义 `type: 'operation'` 列，在 `buttons` 中配置按钮。CRUD 不进行 `rowActions` -> operation 列的自动 lowering。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'crud'`
- 归属 `@nop-chaos/flux-renderers-data`
- 组件性质：`category: 'data'`
- 设计定位：复合 renderer shell，不是新的 runtime primitive family

## 4. 设计目标

1. 用一个稳定的 schema 节点表达"列表页 CRUD 工作流"。
2. 保持查询、加载、表格交互、表单提交、弹层开关各自 owner 清晰。
3. 支持后续逐步逼近 AMIS CRUD 能力，但不在首版正式契约里复制历史兼容噪音。
4. 保持与 `table`、`form`、`dialog`、`data-source`、`page` 现有文档一致的命名与状态模型。

## 5. 非目标

- 不把 `crud` 定义成新的请求协议 owner；请求仍由 `source` / `data-source` / action 承担。
- 不把行内编辑、卡片模式、无限滚动、移动端特化视图、树表、嵌套 master-detail 全部挤进首版正式契约。
- 不为了兼容 AMIS 而保留 `xxxApi`、`xxxSource`、`xxxOn`、字符串脚本事件等历史命名。
- 不暴露 renderer 私有 store、React ref 或内部子组件实例给 schema。
- **不在 CRUD 顶层定义 `createDialog`/`editDialog`/`detailDialog`**；对话框由按钮自己携带。

## 6. 组件边界

`crud` 负责的是业务组合与默认协作关系：

- 查询区如何与列表刷新协作
- 列表数据如何进入表格
- 顶部工具栏、批量操作如何共享当前列表上下文
- 常见空态、刷新、选择、分页如何收敛为统一 authoring 模式
- 通过 `$crud` 状态摘要暴露 `hasSelection`、`selectionCount` 等供按钮条件渲染

`crud` 不负责重新定义这些底层能力：

- 查询字段验证规则仍由 `form` 负责
- 数据请求、轮询、失败、取消、缓存仍由 `data-source` / source runtime 负责
- 分页、排序、筛选、选择、row scope 仍由 `table` 负责
- 对话框开合仍由 `dialog` / surface owner 负责，**由按钮 action 触发**

## 7. Flux 正式 schema 设计

### 7.1 顶层字段

正式字段：

- `name` - 组件名称，用于 component handle 查找
- `statusPath` - 状态摘要发布路径
- `queryForm` - 查询表单配置对象
- `source` - 数据源，可以是数组或 data-source
- `toolbar` - 工具栏 region
- `bulkActions` - 批量操作 region
- `columns` - 表格列配置，**用户在此定义 operation 列**
- `empty` - 空数据时显示的内容
- `selectionOwnership` / `selectionStatePath` - 选择状态
- `paginationOwnership` / `paginationStatePath` - 分页状态
- `sortOwnership` / `sortStatePath` - 排序状态
- `filterOwnership` / `filterStatePath` - 筛选状态
- `rowKey` - 行主键字段名
- `autoClearSelectionOnRefresh` - 刷新后是否自动清空选择
- `onRowClick` / `onSelectionChange` / `onRefresh` - 事件

### 7.2 推荐最小形态

```json
{
  "type": "crud",
  "name": "usersCrud",
  "source": [
    { "id": "1", "name": "Alice" },
    { "id": "2", "name": "Bob" }
  ],
  "columns": [
    { "name": "name", "label": "姓名" }
  ]
}
```

### 7.3 带工具栏和操作列的完整示例

```json
{
  "type": "crud",
  "id": "users-crud",
  "name": "usersCrud",
  "statusPath": "crudStatus",
  "rowKey": "id",
  "source": "${userList}",
  "toolbar": [
    {
      "type": "button",
      "label": "新增",
      "onClick": {
        "action": "openDialog",
        "args": {
          "title": "新增用户",
          "body": {
            "type": "form",
            "body": [
              { "type": "input-text", "name": "name", "label": "姓名" },
              { "type": "input-email", "name": "email", "label": "邮箱" }
            ],
            "submitAction": {
              "action": "ajax",
                "args": { "url": "/api/users", "method": "post" }
            },
            "onSubmitSuccess": {
              "action": "component:refresh",
              "componentId": "users-crud"
            }
          }
        }
      }
    },
    {
      "type": "button",
      "label": "刷新",
      "onClick": {
        "action": "component:refresh",
        "componentId": "users-crud"
      }
    }
  ],
  "bulkActions": [
    {
      "type": "button",
      "label": "批量删除",
      "disabled": "${!$crud.hasSelection}",
      "onClick": {
        "action": "ajax",
        "args": {
          "url": "/api/users/bulk-delete",
          "method": "post",
          "data": { "ids": "${$crud.selectedRowKeys}" }
        },
        "then": {
          "action": "component:refresh",
          "componentId": "users-crud"
        }
      }
    }
  ],
  "columns": [
    { "name": "name", "label": "姓名", "sortable": true },
    { "name": "email", "label": "邮箱" },
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
              "body": {
                "type": "form",
                "data": "${record}",
                "body": [
                  { "type": "input-text", "name": "name", "label": "姓名" },
                  { "type": "input-email", "name": "email", "label": "邮箱" }
                ],
                "submitAction": {
                  "action": "ajax",
                  "args": { "url": "/api/users/${record.id}", "method": "put" }
                },
                "onSubmitSuccess": {
                  "action": "component:refresh",
                  "componentId": "users-crud"
                }
              }
            }
          }
        },
        {
          "type": "button",
          "label": "删除",
          "onClick": {
            "action": "ajax",
            "args": { "url": "/api/users/${record.id}", "method": "delete" },
            "then": {
              "action": "component:refresh",
              "componentId": "users-crud"
            }
          }
        }
      ]
    }
  ],
  "empty": "暂无用户数据"
}
```

## 8. 字段分类

| 字段 | 分类 | 说明 |
| --- | --- | --- |
| `name`、`statusPath` | `value` | 组件标识、只读状态摘要发布路径 |
| `queryForm` | `object-field-like value` | CRUD 内建查询区配置对象 |
| `source` | `source-enabled value` | 列表结果生产者 |
| `toolbar`、`bulkActions` | `region` | 工具区、批量动作区 |
| `columns` | `value` | 表格列定义，包含 operation 列 |
| `empty` | `value-or-region` | 空态 |
| `selectionOwnership` 等 | `value` | interaction owner 模式 |
| `rowKey` | `value` | row identity |
| `autoClearSelectionOnRefresh` | `value` | 组合级协作策略 |
| `onRowClick`、`onSelectionChange`、`onRefresh` | `event` | 事件 |

## 9. 运行期状态归属

`crud` 必须明确声明自己是组合模式，不是单一 owner。

状态拆分如下：

- 查询提交状态 -> `queryForm` 内部 `form`
- 列表加载/刷新/错误 -> `source` owner
- 表格分页/排序/筛选/选择 -> 内部 `table`
- 对话框开合 -> **按钮触发的 dialog surface owner**
- 表单提交 -> **dialog 内部 form**
- bulk delete/export/import 之类长操作 -> `Explicit Tracked Operation`

`crud.statusPath` 发布的是一份组合摘要 DTO，而不是底层 owner store：

```ts
interface CrudStatusSummary {
  loading: boolean;
  refreshing: boolean;
  itemCount: number;
  total?: number;
  hasSelection: boolean;
  selectionCount: number;
  selectedRowKeys: string[];
}
```

规则：

- 这是外部观察面，不是内部 authoring 的唯一读面。
- `crud` 子树内部默认提供只读 `$crud` 摘要绑定，供工具栏、批量动作、空态等内部子树直接读取。
- 如果声明了 `statusPath`，同一份只读摘要会同时发布到该路径，供 CRUD 子树外部观察或宿主集成读取。
- `$crud` 与 `statusPath` 不是二选一，也不是两份独立状态；它们是同一个 `CrudStatusSummary` 的两个只读访问入口。
- 这两条通道都只允许暴露窄 summary，不暴露 store / methods，也不允许把 `$crud` 当作可写 façade。
- `statusPath` 是组合摘要；`selectionStatePath` / `paginationStatePath` 等仍然是具体交互轴的可写状态路径。

## 10. 组件句柄

推荐组件句柄：

- `component:refresh` - 刷新列表
- `component:getSelection` - 获取当前选中的行键
- `component:clearSelection` - 清空选择

使用示例：

```json
{
  "type": "button",
  "label": "刷新",
  "onClick": {
    "action": "component:refresh",
    "componentId": "users-crud"
  }
}
```

## 11. 样式与 DOM marker 约定

- 根节点保留 `nop-crud` marker
- 查询区：`nop-crud-query`，`data-slot="crud-query"`
- 工具栏：`nop-crud-toolbar`，`data-slot="crud-toolbar"`
- 表格区：`nop-crud-table`，`data-slot="crud-table"`
- 批量动作区：`data-slot="crud-bulk-actions"`

这些 marker 只表达结构语义，不携带隐式视觉布局。视觉布局仍来自 schema `className` / `classAliases` 和底层 `@nop-chaos/ui` primitive。

## 12. 与 AMIS 命名对照

| AMIS 概念 | Flux 正式建议 | 说明 |
| --- | --- | --- |
| `type: 'crud'` | `type: 'crud'` | 类型名可直接保留 |
| `api` | `source` | Flux 优先用统一 source/value producer 语义 |
| `filter` | `queryForm` | 查询区统一落到表单配置 |
| `headerToolbar` | `toolbar` | 使用自然 region 名 |
| `bulkActions` | `bulkActions` | 可保留，已符合 Flux 命名 |
| `itemActions` | `columns[].buttons` | operation 列由用户在 columns 中定义 |
| `primaryField` | `rowKey` | 对齐 table row identity 术语 |

## 13. 风险、取舍与后续阶段

- 最大风险是把 `crud` 重新实现成一个单文件巨型 renderer，再次混合查询、请求、表格、弹层、表单、批量操作逻辑。
- 第二个风险是把 CRUD 做成"只是示例组合"，没有统一 schema 契约。
- 正确方向是保持 CRUD 作为轻量 shell，复用现有 `table`、`form`、`dialog` 等组件。

后续可扩展方向：

- 远端分页/排序/筛选联动
- 导出、权限控制
- 行内编辑、列设置、保存查询

## 14. 关联文档

- `docs/components/table/design.md`
- `docs/components/form/design.md`
- `docs/components/dialog/design.md`
- `docs/components/data-source/design.md`
- `docs/architecture/action-interaction-state.md`
