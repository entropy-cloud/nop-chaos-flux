# CRUD 组件设计

## 1. 组件定位

- `crud` 是面向业务数据工作流的复合 renderer，用来把查询表单、数据加载、表格展示、工具栏动作、批量操作和 create/edit/detail surface 组织成一个稳定的 schema 契约。
- `crud` 是一个有明确领域边界的组合组件，但它不是新的全局 owner，也不是把 `table`、`form`、`dialog`、`data-source` 粗暴塞进一个黑盒实现。
- `crud` 的目标是提供类似 AMIS `CRUD` 的业务能力密度，同时坚持 Flux 当前的 owner 分层、命名规范、region 建模和 action/source 语义。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 的 `CRUD` 把搜索、请求、表格、分页、批量操作、弹窗编辑、行操作等能力集中在一个历史大组件中；这也是它功能强但实现复杂的根源。
- Flux 不应直接复制 AMIS 的 monolithic renderer 结构。正式契约应保持 `crud` 的业务组合语义，同时把状态和实现职责拆回已有 owner：`form`、`data-source`、`table`、`dialog`、显式 tracked operation。
- Flux 正式 schema 也不应直接沿用 AMIS 旧字段名集合。应先给出符合 Flux 标准命名的最终契约，再单独说明与 AMIS 的语义映射。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'crud'`
- 预期归属 `@nop-chaos/flux-renderers-data`
- 组件性质：`category: 'data'`
- 设计定位：复合 renderer contract，不是新的 runtime primitive family

## 4. 设计目标

1. 用一个稳定的 schema 节点表达“列表页 CRUD 工作流”。
2. 保持查询、加载、表格交互、表单提交、弹层开关各自 owner 清晰。
3. 支持后续逐步逼近 AMIS CRUD 能力，但不在首版正式契约里复制历史兼容噪音。
4. 保持与 `table`、`form`、`dialog`、`data-source`、`page` 现有文档一致的命名与状态模型。
5. 允许设计器、AI 产码和后续模板库直接产出统一 CRUD schema，而不是每次手写一大段松散组合节点。

## 5. 非目标

- 不把 `crud` 定义成新的请求协议 owner；请求仍由 `source` / `data-source` / action 承担。
- 不把行内编辑、卡片模式、无限滚动、移动端特化视图、树表、嵌套 master-detail 全部挤进首版正式契约。
- 不为了兼容 AMIS 而保留 `xxxApi`、`xxxSource`、`xxxOn`、字符串脚本事件等历史命名。
- 不暴露 renderer 私有 store、React ref 或内部子组件实例给 schema。

## 6. 组件边界

`crud` 负责的是业务组合与默认协作关系：

- 查询区如何与列表刷新协作
- 列表数据如何进入表格
- 顶部工具栏、行操作、批量操作如何共享当前列表上下文
- create / edit / detail 如何声明为标准 surface
- 常见空态、刷新、选择、分页、提交成功后的 follow-up 如何收敛为统一 authoring 模式

`crud` 不负责重新定义这些底层能力：

- 查询字段验证规则仍由 `form` 负责
- 数据请求、轮询、失败、取消、缓存仍由 `data-source` / source runtime 负责
- 分页、排序、筛选、选择、row scope 仍由 `table` 负责
- 对话框开合仍由 `dialog` / surface owner 负责

## 7. Flux 正式 schema 设计

### 7.1 顶层字段

建议正式字段：

- `name`
- `data`
- `statusPath`
- `queryForm`
- `source`
- `toolbar`
- `bulkActions`
- `columns`
- `rowActions`
- `empty`
- `createDialog`
- `editDialog`
- `detailDialog`
- `selectionOwnership`
- `selectionStatePath`
- `paginationOwnership`
- `paginationStatePath`
- `sortOwnership`
- `sortStatePath`
- `filterOwnership`
- `filterStatePath`
- `rowKey`
- `rowData`
- `autoRefreshOnQuerySubmit`
- `autoClearSelectionOnRefresh`
- `refreshAction`
- `onQuerySubmit`
- `onQueryReset`
- `onRowClick`
- `onSelectionChange`
- `onBulkActionSuccess`

### 7.2 推荐最小形态

```json
{
  "type": "crud",
  "name": "usersCrud",
  "statusPath": "usersCrudStatus",
  "queryForm": {
    "data": {
      "keyword": "",
      "status": "all"
    },
    "body": [
      {
        "type": "input-text",
        "name": "keyword",
        "label": "关键字"
      }
    ]
  },
  "source": {
    "type": "source",
    "action": "ajax",
    "api": {
      "url": "/api/users",
      "method": "get",
      "params": {
        "keyword": "${query.keyword}",
        "page": "${pagination.currentPage}",
        "pageSize": "${pagination.pageSize}"
      }
    }
  },
  "columns": [
    {
      "name": "name",
      "label": "姓名"
    }
  ]
}
```

这里的 `crud` 不是把整份查询、source、table 协议重新发明一遍，而是提供一个更适合业务 authoring 的上层组合入口。

## 8. 字段分类

| 字段 | 分类 | 说明 |
| --- | --- | --- |
| `name`、`data`、`statusPath` | `value` | 组件标识、初始 scope patch、只读状态摘要发布路径 |
| `queryForm` | `object-field-like value` | CRUD 内建查询区配置对象，不是独立 renderer region |
| `source` | `source-enabled value` | 列表结果生产者，优先接最终列表载荷或标准 source |
| `toolbar`、`bulkActions`、`rowActions` | `region` | 工具区、批量动作区、行操作模板区 |
| `columns` | `value` | 表格列定义 |
| `empty` | `value-or-region` | 空态 |
| `createDialog`、`editDialog`、`detailDialog` | `object-field-like value` | 标准 surface 配置对象 |
| `selectionOwnership` / `paginationOwnership` / `sortOwnership` / `filterOwnership` | `value` | interaction owner 模式 |
| `selectionStatePath` / `paginationStatePath` / `sortStatePath` / `filterStatePath` | `value` | 交互状态 scope 路径 |
| `rowKey`、`rowData` | `value` | row identity 与 row scope 投影 |
| `autoRefreshOnQuerySubmit`、`autoClearSelectionOnRefresh` | `value` | 组合级协作策略 |
| `refreshAction`、`onQuerySubmit`、`onQueryReset`、`onRowClick`、`onSelectionChange`、`onBulkActionSuccess` | `event` | 复合工作流事件 |

说明：

- `queryForm`、`createDialog`、`editDialog`、`detailDialog` 是“配置对象字段”，不是新的 renderer type 名称。
- 这类字段应在编译期被 lower 到内部标准子树，而不是在运行时靠 JSX 分支拼凑任意对象结构。

## 9. 子对象契约

### 9.1 `queryForm`

建议字段：

- `data`
- `body`
- `actions`
- `statusPath`
- `submitAction`
- `resetAction`
- `autoSubmit`
- `layout`

规则：

- `queryForm` 对应一个内部 `form` owner。
- `queryForm.body` 与 `queryForm.actions` 语义直接对齐 `form` 的 `body` / `actions`。
- `queryForm` 子树内部使用 `$form` 读取查询表单状态。
- 查询参数应在 `source` 执行时显式读取 query scope，不走隐式 sibling 注入。

推荐查询 scope 根名：

- 内部只读/实现层可用固定 query projection
- 对外 authoring 不要求用户手写内部私有路径名

首版实现建议对外暴露稳定表达式根：

- `${query.xxx}` 表示当前查询值摘要
- `${pagination.xxx}` 表示当前分页摘要
- `${sort.xxx}` / `${filter.xxx}` 表示表格交互摘要

这些是 `crud` 作为组合 renderer 向其内部 source/action 上下文提供的窄投影，不等于暴露底层 runtime store。

### 9.2 `source`

建议支持两种正式输入：

1. 直接提供注册 renderer 形式的 `type: 'data-source'`
2. 提供 inline source/value 形式，例如 `type: 'source'` 或静态/表达式值，值已是最终 rows 或标准列表载荷

说明：

- `data-source` 是当前 live repo 已注册的 renderer / runtime owner 入口。
- `type: 'source'` 目前属于 core schema 中可内联表达的 source 形态；若 `crud` 首版支持该写法，编译期 normalize 必须把它清晰 lower 到现有 source/data-source runtime 语义，而不是让实现者误以为它是另一个独立 renderer 包入口。

推荐列表载荷形态：

```ts
interface CrudCollectionResult {
  items: unknown[];
  total?: number;
  page?: number;
  pageSize?: number;
  summary?: Record<string, unknown>;
}
```

规则：

- `crud` 应优先消费统一列表载荷，而不是强制后端必须返回某个 AMIS 兼容响应壳。
- 如果后端响应不是该形态，应通过 `responseAdaptor` 或 source/action 先完成归一化。
- rows loading 属于上游 source owner；`crud` 和内部 `table` 只是消费该状态。

### 9.3 `createDialog` / `editDialog` / `detailDialog`

建议字段：

- `title`
- `size`
- `data`
- `body`
- `actions`
- `statusPath`
- `submitAction`
- `onSubmitSuccess`
- `onSubmitError`
- `closeOnSuccess`

规则：

- 这三个字段是 CRUD 标准 surface 插槽，不要求用户每次手写完整独立 `dialog` 树。
- 它们在 lower 后仍然应该变成标准 `dialog` + `form` 子树。
- `editDialog.data` 的推荐默认上下文包含当前行 `record`、`rowKey`、`index`。
- `detailDialog` 可以不带 `submitAction`，只承载查看语义。
- create/edit/detail 是否存在由字段是否声明决定，不再发明 `canCreate`、`canEdit` 这种只为是否渲染而存在的第二命名层；可见性直接用 `visible` 或条件表达式控制。

## 10. regions 与 slot 约定

正式 regions：

- `toolbar`
- `bulkActions`
- `rowActions`
- `empty`

约定：

- `toolbar` 是表格上方的主工具区，通常放新增、刷新、导出、筛选辅助入口等。
- `bulkActions` 只在存在选中行时具备业务意义，但是否隐藏由 schema/实现策略决定。
- `rowActions` 运行在 row scope 内，每一行获得当前 `record`、`index`、`rowKey`。
- `empty` 是结果为空时的内容区。

不推荐把 `headerToolbar`、`footerToolbar`、`itemActions`、`bulkButtons` 之类同义名同时作为正式契约保留。

## 11. 运行期状态归属

`crud` 必须明确声明自己是组合模式，不是单一 owner。

状态拆分如下：

- 查询提交状态 -> `queryForm` 内部 `form`
- 列表加载/刷新/错误 -> `source` owner
- 表格分页/排序/筛选/选择 -> 内部 `table`
- create/edit dialog open state -> 对应 `dialog` surface owner
- create/edit submit state -> dialog 内部 `form`
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
  querySubmitting: boolean;
  createOpen: boolean;
  editOpen: boolean;
  detailOpen: boolean;
}
```

规则：

- 这是外部观察面，不是内部 authoring 的唯一读面。
- `crud` 子树内部可提供只读 `$crud` 摘要绑定，但只允许暴露窄 summary，不暴露 store / methods。
- `statusPath` 是组合摘要；`selectionStatePath` / `paginationStatePath` 等仍然是具体交互轴的可写状态路径，二者不能互相替代。

## 12. 查询、表格与 source 的协作规则

### 12.1 查询提交

- `queryForm` 成功提交后，默认触发 `refreshAction`。
- 若 `autoRefreshOnQuerySubmit` 未显式关闭，则查询提交等价于“提交查询条件并刷新列表”。
- `onQuerySubmit` 是附加事件，不替代列表刷新主路径。
- query reset 若触发下一次列表刷新，也应复用同一 `refreshAction` 入口，而不是走第二套私有 reload 逻辑。

### 12.2 刷新

- `refreshAction` 默认应 lower 为刷新内部 source，而不是刷新整个 page。
- 推荐底层动作形式为 `refreshSource` 定向到内部列表 source。
- 手动刷新、查询提交成功、create/edit/delete 成功后的 reload 都优先复用同一刷新入口。

### 12.3 分页/排序/筛选

- 这些状态归内部 `table` interaction owner。
- 若 `source` 使用远端模式，分页/排序/筛选变化后可触发刷新；刷新时显式把交互摘要注入 source 请求参数。
- `crud` 不额外发明 `pageField`、`perPageField`、`orderField` 一类历史字段；请求字段映射应留给 `api.params` 或 adaptor。

### 12.4 选择态

- 选择态复用 `table` 的 `selectionOwnership` 与 `selectionStatePath`。
- `bulkActions` 在运行时读取当前 selection summary，不直接扫描 DOM 或表格实例。
- `autoClearSelectionOnRefresh` 默认建议为 `true`，但需要在文档和实现中保持显式可配置。

## 13. 事件、动作与组件句柄能力

推荐组件句柄：

- `component:refresh`
- `component:getSelection`
- `component:clearSelection`
- `component:openCreate`
- `component:openEdit`
- `component:openDetail`

事件入口：

- `refreshAction`
- `onQuerySubmit`
- `onQueryReset`
- `onRowClick`
- `onSelectionChange`
- `onBulkActionSuccess`

规则：

- CRUD 句柄是组合级能力，底层仍应路由到具体 owner。
- `component:openEdit` 必须要求足够的上下文，例如 `record` 或 `rowKey`。
- 不提供模糊的 `component:doAction` 之类黑盒入口。

## 14. 数据与作用域模型

推荐内部作用域根：

- `query`
- `collection`
- `selection`
- `pagination`
- `sort`
- `filter`
- `record` / `index` / `rowKey`（row scope）

规则：

- 这些根是 CRUD 复合 renderer 的窄 authoring projection，不等于复制 parent scope 全量快照。
- `collection` 推荐至少包含 `items`、`total`、`page`、`pageSize`、`summary`。
- row scope 规则必须继续遵守 `table-row-identity-and-scope-performance.md`。
- `rowData` 的计算和发布也必须复用 table 的 row-scope cache 规则，不能在 CRUD 层再发明第二套 row projection。

## 15. 样式与 DOM marker 约定

- 根节点保留 `nop-crud` marker。
- 查询区、工具栏、表格区、空态区、批量动作区应使用稳定 marker，例如 `nop-crud-query`、`nop-crud-toolbar`、`nop-crud-table`、`nop-crud-bulk-actions`。
- 这些 marker 只表达结构语义，不携带隐式视觉布局。
- 视觉布局仍来自 schema `className` / `classAliases` 和底层 `@nop-chaos/ui` primitive。

## 16. 编译与实现方案

### 16.1 编译策略

首选方案：`crud` 作为高层组合节点，在编译阶段 lower 为标准子树。

注意：当前 live repo 的 `DEEP_FIELD_NORMALIZERS` 只适合 `table.columns`、`tabs.items` 这类单字段深归一化，不足以承接 `queryForm + source + columns + rowActions + dialogs` 这种跨 sibling fields 的整节点 lowering。

因此，`crud` 需要的是 whole-node compiler lowering seam，而不是简单再加一个 field-local normalizer。

推荐 lower 结果结构：

1. 一个 CRUD shell renderer，负责状态摘要汇总、句柄注册和子树组装。
2. 一个内部查询 `form`。
3. 一个内部列表 `source` / `data-source` 执行边界。
4. 一个内部 `table`。
5. 零到多个内部 `dialog` + `form` surface。

这样做的原因：

- 运行期仍复用现有 renderer/runtime contract。
- CRUD 组合语义可由编译器显式检查和补默认值。
- 避免把大部分复杂逻辑重新塞回一个 JSX 巨型组件。

### 16.2 运行期模块拆分建议

- `crud-schema.ts`: 类型与 normalize
- `crud-lowering.ts`: 编译期 lower 与默认规则
- `crud-status.ts`: 组合摘要 DTO 汇总
- `crud-handles.ts`: 组合级 component handle
- `crud-renderer.tsx`: 最薄的 shell renderer
- `crud-actions.ts`: openCreate/openEdit/openDetail/refresh 等组合能力桥接

### 16.3 推荐分阶段实现

Phase 1:

- 查询表单 + 远端/本地 `data-source` + table + toolbar + rowActions
- create/edit/detail dialog 基线
- bulkActions 基线（至少单表批量删除）
- refresh / selection / statusPath / `$crud` 摘要
- query submit、query reset、create/edit/bulk delete success 后统一走 refresh 路径

Phase 2:

- 导出、权限控制、更多摘要状态
- 远端分页/排序/筛选联动的默认装配

Phase 3:

- 行内编辑、列设置、保存查询、更多 enterprise workflow 能力

### 16.4 首个端到端测试基线

首个实现切片至少应覆盖一个单表 CRUD JSON 场景，而不是只做散碎单点测试。

建议基线场景：

- 顶部查询区：关键字查询 + 查询/重置
- 顶部工具栏：`新增`、`批量删除`
- 表格列：基础文本列
- 行操作：`查看`、`修改`
- `查看` 点击后弹出 detail dialog
- `修改` 点击后弹出 edit dialog，并带当前行 `record`
- `新增` 点击后弹出 create dialog
- 勾选多行后触发批量删除动作
- 删除、创建、编辑成功后复用统一 refresh 入口刷新列表
- authored CRUD schema 只声明 `rowActions`，不要求手写内部 table `operation` 列；operation UI 应由 lowering 产出

测试目标：

- 证明 `crud` 不是仅有 schema 壳，而是已贯通查询、table row scope、dialog surface、form submit、bulk operation 的组合语义。
- 证明 rowActions 与 bulkActions 读取的是 `crud` / `table` 发布的稳定摘要，而不是 DOM 扫描或 ad-hoc React state。
- 证明 authoring 入口可以只写一个 `type: 'crud'` 节点，而不必手写整棵内部 lower 后子树。
- 证明 `$crud` 只是只读 summary 投影，不会退化成第二套 CRUD 私有 owner store。

## 17. 与 AMIS 命名对照

| AMIS 概念 | Flux 正式建议 | 说明 |
| --- | --- | --- |
| `type: 'crud'` | `type: 'crud'` | 类型名可直接保留 |
| `api` | `source` | Flux 优先用统一 source/value producer 语义 |
| `filter` / `filterTogglable` / `filterDefaultVisible` | `queryForm` | 查询区统一落到表单配置，而不是散落多个历史字段 |
| `headerToolbar` | `toolbar` | 使用自然 region 名 |
| `bulkActions` | `bulkActions` | 可保留，已符合 Flux 命名 |
| `itemActions` | `rowActions` | 显式表达 row scope 语义 |
| `perPageAvailable` | `pagination.pageSizeOptions` | 沿用 table/pagination 结构 |
| `primaryField` | `rowKey` | 对齐 table row identity 术语 |
| `syncLocation` / 各类 URL 协议字段 | 不进入首版正式契约 | 路由同步属于 page/router 层协作，不应先塞进 CRUD |
| `xxxApi` | `submitAction` / `source` / action | 不保留历史 `Api` 命名扩散 |

## 18. AMIS 迁移覆盖目标

为支持后续从 AMIS `crud` / `crud2` 迁移，`crud` 正式契约需要覆盖的不是历史字段名本身，而是这些能力面：

- 查询区：`filter`、`filterTogglable`、`filterDefaultVisible`、默认查询提交
- 列表请求：`api`、请求参数映射、response adaptor、静态/表达式 rows 输入
- 集合展示：列、空态、loading、分页、排序、筛选、rowKey
- 顶部工具栏：`headerToolbar` 语义
- 行操作：`itemActions` / `operation` 列语义
- 批量动作：`bulkActions`
- 标准 surface：create / edit / detail
- 刷新与联动：query submit 后刷新、submit success 后刷新、selection clear policy
- 上下文投影：query / pagination / sort / filter / record / selection / collection

迁移约束：

- 迁移层可以接受 AMIS 历史字段作为输入参考，但 Flux 正式 schema 不直接保留 `xxxApi`、`headerToolbar`、`itemActions`、`primaryField` 这类旧命名。
- migration adaptor 的职责是把 AMIS 历史字段 lower/normalize 到 Flux `crud` 正式字段，而不是让 runtime 长期同时背两套命名。
- 若某些 AMIS 边界能力短期不落地，必须在计划里显式标注为 deferred capability，不能用“先有 type 再说”掩盖。

## 19. 风险、取舍与后续阶段

- 最大风险是把 `crud` 重新实现成一个单文件巨型 renderer，再次混合查询、请求、表格、弹层、表单、批量操作、权限和路由逻辑。
- 第二个风险是把 CRUD 做成“只是示例组合”，没有统一 schema 契约，导致设计器和 AI 产码仍然要手写大量内部细节。
- 第三个风险是让 `$crud`、`crud-actions` 或 `crud-handles` 演变成可写 store façade，间接把 selection、dialog open state、mutation pending 等 canonical 状态重新收回 CRUD 本身。
- 正确方向是在“单一正式业务契约”和“底层 owner 分治实现”之间保持中间层：`crud` 有统一 schema，但 lower 到标准子系统。
- 后续如果要补充路由同步、列配置持久化、批量导入导出等能力，也应继续沿用当前命名和 owner 语言，不恢复 AMIS 历史双语义字段。

## 20. 关联文档

- `docs/components/table/design.md`
- `docs/components/form/design.md`
- `docs/components/dialog/design.md`
- `docs/components/data-source/design.md`
- `docs/architecture/action-interaction-state.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/table-row-identity-and-scope-performance.md`
- `docs/architecture/renderer-runtime.md`
- `docs/references/flux-json-conventions.md`
