# CRUD 组件数据流分析报告：amis-react19 vs nop-chaos-flux

> 分析日期: 2026-06-29
> 项目路径:
>
> - amis-react19: `c:/can/amis-react19`
> - nop-chaos-flux: `c:/can/nop/nop-chaos-flux`

---

## 目录

1. [amis-react19 CRUD 数据流](#1-amis-react19-crud-数据流)
2. [nop-chaos-flux CRUD 数据流](#2-nop-chaos-flux-crud-数据流)
3. [核心差异对比](#3-核心差异对比)
4. [请求参数对照表](#4-请求参数对照表)
5. [响应格式对照表](#5-响应格式对照表)
6. [分页机制对比](#6-分页机制对比)
7. [行内编辑/保存对比](#7-行内编辑保存对比)
8. [架构设计哲学差异](#8-架构设计哲学差异)
9. [迁移指南摘要](#9-迁移指南摘要)

---

## 1. amis-react19 CRUD 数据流

### 1.1 核心文件

| 文件                   | 路径                                      | 行数 |
| ---------------------- | ----------------------------------------- | ---- |
| CRUD v1 渲染器         | `packages/amis/src/renderers/CRUD.tsx`    | 3364 |
| CRUD v2 (CRUD2) 渲染器 | `packages/amis/src/renderers/CRUD2.tsx`   | 1876 |
| CRUDStore (MST)        | `packages/amis-core/src/store/crud.ts`    | 833  |
| ServiceStore (父类)    | `packages/amis-core/src/store/service.ts` | 572  |
| API 工具               | `packages/amis-core/src/utils/api.ts`     | 1036 |

### 1.2 数据初始化流程

**核心机制**: 通过 `api` 属性（schema 中声明为 `api?: AMISApi`）声明式指定数据获取接口。

```
Schema: { type: 'crud', api: '/api/items', ... }
     │
     ▼
CRUD.constructor()
  ──► store.updateData({items: []})           // 清空继承数据
     │
     ▼
CRUD.componentDidMount()
  ──► handleFilterInit({})                     // 触发一次初始加载
      ──► 合并 defaultParams + orderBy/orderDir + store.query
      ──► handleFilterSubmit(params)
          ──► store.updateQuery({page: 1, ...})
          ──► store.setPristineQuery()
          ──► this.search()
              │
              ▼
        store.fetchInitData(api, data, options)
          ──► 构建 context: { ...store.query, page: store.page, perPage: store.perPage, ...data }
          ──► GET /api/items?page=1&perPage=10&orderBy=...&keyword=...
              │
              ▼ (via wrapFetcher → buildApi → fetch → responseAdaptor)
          ◄── Response: { status: 0, data: { items: [...], total: 144 } }
              ──► normalizeApiResponseData
              ──► extract items/rows, total/count, page, hasNext, columns
              ──► store.items.replace(rowsData)
              ──► store.total = 144
              ──► store.page = (from response or unchanged)
```

### 1.3 数据提交方式

**没有独立的 submitApi 属性，而是通过以下方式提交**：

| 提交类型     | Schema 属性        | 请求方式    | 发送数据                                          |
| ------------ | ------------------ | ----------- | ------------------------------------------------- |
| 批量行编辑   | `quickSaveApi`     | POST (默认) | `{ rows, rowsDiff, indexes, rowsOrigin, ids }`    |
| 单行行内编辑 | `quickSaveItemApi` | POST (默认) | `{ item, modified, origin, ...row }`              |
| 拖拽排序     | `saveOrderApi`     | POST (默认) | `{ insertAfter, insertBefore, idMap, rows, ids }` |
| 操作按钮     | action.`api`       | POST (默认) | 行数据 + 事件上下文                               |

### 1.4 分页管理

| 配置项               | 默认值      | 说明                 |
| -------------------- | ----------- | -------------------- |
| `pageField`          | `'page'`    | 请求中页码字段名     |
| `perPageField`       | `'perPage'` | 请求中每页条数字段名 |
| `totalField`         | `'total'`   | 响应中总数字段名     |
| `pageDirectionField` | `'pageDir'` | 简单分页方向字段     |

**分页状态存储在 MST store 中**：`page`、`perPage`、`total`、`hasNext`

**切换页码流程**：

```
handleChangePage(2)
  ──► store.updateQuery({page: 2})
  ──► store.changePage(2)
  ──► this.search()
      ──► GET /api/items?page=2&perPage=10...
```

### 1.5 请求参数完整列表 (GET /api/items)

| 参数          | 来源                      | 示例                       |
| ------------- | ------------------------- | -------------------------- |
| `page`        | `store.page` (默认 1)     | `page=1`                   |
| `perPage`     | `store.perPage` (默认 10) | `perPage=10`               |
| `orderBy`     | `store.query.orderBy`     | `orderBy=name`             |
| `orderDir`    | `store.query.orderDir`    | `orderDir=asc`             |
| `pageDir`     | `handleChangePage`        | `pageDir=forward`          |
| 筛选字段      | 查询表单值                | `keyword=xxx&category=yyy` |
| defaultParams | schema 静态配置           | `&source=web`              |

### 1.6 响应格式

**成功**:

```json
{
  "status": 0,
  "msg": "",
  "data": {
    "items": [...],     // 或 "rows": [...]
    "total": 144,       // 或 "count": 144
    "page": 1,          // 可选，可覆盖当前页
    "hasNext": true,    // 简单分页模式
    "columns": [...]    // 可选，动态列
  }
}
```

**成功（简化格式——顶层数组）**:

```json
{
  "status": 0,
  "msg": "",
  "data": [...]   // 自动识别为 items
}
```

**失败**:

```json
{
  "status": 1, // 非零
  "msg": "错误信息"
}
```

### 1.7 关键类图

```
ServiceStore (父类)
  ├── data, query, initData, pristineQuery
  └── saveRemote(api, data, options) → POST

CRUDStore extends ServiceStore
  ├── page, perPage, total, hasNext, lastPage
  ├── items, unSelected, selectedRows
  ├── fetchInitData(api, data, options) → GET
  ├── changePage(page, perPage)
  ├── updateQuery(query)
  └── reInitData(data)

CRUD Component
  ├── search() → store.fetchInitData()
  ├── handleFilterSubmit(params) → store.updateQuery()
  ├── handleChangePage(page, perPage) → search()
  ├── handleSave(rows, diffs) → store.saveRemote()
  └── handleAction(e, action) → store.saveRemote()
```

---

## 2. nop-chaos-flux CRUD 数据流

### 2.1 核心文件

| 文件         | 路径                                                                 | 行数 |
| ------------ | -------------------------------------------------------------------- | ---- |
| CRUD 渲染器  | `packages/flux-renderers-data/src/crud-renderer.tsx`                 | 531  |
| CRUD Schema  | `packages/flux-renderers-data/src/crud-schema.ts`                    | 238  |
| CRUD 状态    | `packages/flux-renderers-data/src/crud-renderer-state.ts`            | 384  |
| CRUD 定义    | `packages/flux-renderers-data/src/crud-renderer-definition.ts`       | 444  |
| CRUD 所有权  | `packages/flux-renderers-data/src/crud-renderer-ownership.ts`        | 273  |
| 表格渲染器   | `packages/flux-renderers-data/src/table-renderer.tsx`                | —    |
| 数据源控制器 | `packages/flux-runtime/src/async-data/api-data-source-controller.ts` | 155  |
| 数据源注册表 | `packages/flux-runtime/src/async-data/source-registry.ts`            | 418  |

### 2.2 数据初始化流程

**核心机制**: 没有 `api` / `initApi` 属性。取而代之的是**双层分离模式**：

1. **数据源层** (`<data-source type="data-source">`): 负责 HTTP 通信
2. **消费层** (`<crud source="${...}">`): 从数据源读取结果

```
组件树:
  <data-source type="data-source" name="users"
    action="ajax"
    args: {{ url: "/api/users", params: { page: "${page}", perPage: "${perPage}" }}}
  />
  <crud type="crud" source="${users}" ... />
```

#### 初始化流程详解

```
1. data-source 渲染器（渲染 null，不可见）
    a. 编译 DataSourceSchema → CompiledDataSource
    b. 创建 DataSourceController:
       controller = createDataSourceController({
         sourceId: "users",
         action: { actionType: "ajax", args: {...} },
         fetcher,
         onStatusChange,
         onDataChange
       })
    c. 控制器调度 action:
       dispatch(ajax action, { url, method, data, params, headers })
       ──► executeApiSchema(apiSchema, context)
           ──► 编译 url/params/data 中的表达式
           ──► fetcher(url, { method, data, params, headers })
               │
               ▼
           ◄── Response
           ──► 通过 dataKey 提取响应数据
           ──► 如有必要进行结果合并/映射
    d. 发布数据到 Scope:
       scope.set("users", responseData)
       scope.set("users.status", { loading, ready, ... })

2. CRUD 渲染器（从作用域读取）
    a. 解析 source="${users}" → scope.read("users")
    b. normalizeCrudSourceValue(value)
       ──► { rows: [...], total: N } // 统一格式
    c. 应用客户端分页/排序/筛选
    d. 渲染表格 + 分页 + 工具栏
```

### 2.3 数据提交方式

**没有 `submitApi` / `saveApi` / `quickSaveApi` 属性。改用事件驱动 Action 系统**。

| 提交类型         | 事件/属性             | 示例                                                                         |
| ---------------- | --------------------- | ---------------------------------------------------------------------------- |
| 表单提交         | `submitAction`        | `{ action: "ajax", args: { url: "/api/save", method: "post" } }`             |
| 行内编辑（单行） | `quickSaveItemAction` | `{ action: "ajax", args: { url: "/api/save/${record.id}", method: "put" } }` |
| 行内编辑（批量） | `quickSaveAction`     | `{ action: "ajax", args: { url: "/api/batch-save", method: "post" } }`       |
| 操作按钮         | `onEvent.click`       | `{ actions: [{ actionType: "ajax", ... }] }`                                 |
| 批量操作         | `listActions` 中按钮  | 按钮的 action                                                                |

**行内编辑提交细节** (`table-quick-edit-cell.tsx:64-78`):

```
保存时，在包含 record 绑定的行作用域下 dispatch quickSaveItemAction
作者可在 args 中通过表达式访问 ${record.id}, ${record.name} 等
```

### 2.4 分页管理

**分页通过作用域路径管理**，使用三种所有权模式：

| 模式           | 说明                                   |
| -------------- | -------------------------------------- |
| `'local'`      | 分页状态在组件内部维护（不写入作用域） |
| `'controlled'` | 分页状态由外部通过作用域控制           |
| `'scope'`      | CRUD 将分页状态写入/读取自作用域路径   |

**分页配置**:
| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `pageField` | `'page'` | 页码字段名 |
| `pageSizeField` | `'perPage'` | 每页条数字段名 |
| `pagination.mode` | `'pages'` | `'pages'` 或 `'infinite'` |
| `paginationStatePath` | — | 作用域中分页状态的路径 |
| `pagination.pageSize` | 10 | 默认每页条数 |
| `pagination.pageSizeOptions` | [10, 20, 50, 100] | 切换选项 |

**CRUD 持有的作用域路径** (`crud-renderer-ownership.ts:48-65`):

```
$_crud.<id>/
  query: { values: {...}, refreshCount: N }
  pagination: { currentPage: N, pageSize: N }
  sort: { column: string, direction: 'asc'|'desc' }
  filters: { key: { filters: [...], keyword: string } }
  selection: [...string]
```

**分页变更触发流程**:

```
用户点击第 2 页
  ──► CRUD 通过 scope.update("pagination", {currentPage: 2, pageSize: 10}) 更新作用域
  ──► refreshCount 递增
  ──► 如果 loadDataOnce = false
      ──► dispatch onRefresh 事件
          ──► 事件载荷: { query, pagination: {currentPage: 2, pageSize: 10}, page: 2, pageSize: 10 }
      ──► 上游 data-source 接收事件 → 重新 fetch
```

### 2.5 请求参数

**完全由 `data-source` 的 `args` 控制，CRUD 不直接发请求**。

典型配置:

```json
{
  "type": "data-source",
  "name": "users",
  "action": "ajax",
  "args": {
    "url": "/api/users",
    "method": "get",
    "params": {
      "page": "${page}",
      "perPage": "${perPage}",
      "keyword": "${keyword}",
      "category": "${category}"
    },
    "headers": {
      "Authorization": "Bearer ${token}"
    },
    "includeScope": ["page", "perPage", "keyword", "category"]
  }
}
```

**CRUD 的 `onRefresh` 事件载荷**（由 data-source 消费）:

```json
{
  "query": { "keyword": "Ali" },
  "pagination": { "currentPage": 1, "pageSize": 10 },
  "page": 1,
  "pageSize": 10
}
```

### 2.6 响应格式

**由 `normalizeCrudSourceValue()` 处理** (`crud-renderer-state.ts:201-231`)。

**接受的输入格式**（按优先级，任选其一）:

```typescript
// 1. 纯数组
[ { id: 1, name: "Alice" }, ... ]

// 2. 标准对象格式（AMIS 兼容）
{ items: [ ... ], total: 144 }

// 3. rows 别名
{ rows: [ ... ], total: 144 }

// 4. records 别名
{ records: [ ... ], total: 144 }

// 5. list 别名
{ list: [ ... ], total: 144 }

// 6. count 别名（代替 total）
{ items: [ ... ], count: 144 }
```

### 2.7 组件关系图

```
<data-source>                    <crud>
  │                                │
  ├─ DataSourceController          ├─ useScopeSelector(source)
  │   ├─ dispatch(ajax)            │    └─ normalizeCrudSourceValue()
  │   ├─ fetcher → HTTP            ├─ useCrudRuntimeState()
  │   └─ scope.set(name, data)     │    ├─ pagination (scope path)
  │                                │    ├─ query      (scope path)
  <scope store (Zustand)>          │    ├─ sort       (scope path)
  │                                │    ├─ filters    (scope path)
  ├─ users: responseData           │    └─ selection  (scope path)
  ├─ user.status: {...}            ├─ onRefresh → dispatch event
  └─ $_crud.<id>/{...}            └─ <TableRenderer>
       ↑ CRUD 写入                     ├─ use-table-pagination
       (分页/排序/筛选/选择)            ├─ use-table-selection
                                        ├─ use-table-sort
                                        └─ table-pagination-bar
```

---

## 3. 核心差异对比

| 维度             | amis-react19                                                | nop-chaos-flux                                                                          |
| ---------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **数据获取方式** | 组件内置 `api` 属性，CRUD 直接发请求                        | 分离的 `data-source` 组件，CRUD 读取作用域                                              |
| **数据提交方式** | 组件内置 `quickSaveApi` / `saveOrderApi` 属性               | 事件驱动 `quickSaveAction` / `quickSaveItemAction`                                      |
| **状态管理**     | MobX-State-Tree (MST) store，CRUDStore 继承 ServiceStore    | Zustand scope store，无专用 CRUD store                                                  |
| **分页状态**     | store.page / store.perPage / store.total                    | 作用域路径 `pagination.currentPage` / `pageSize`                                        |
| **请求参数**     | 自动注入 page/perPage/orderBy/orderDir/filter 等            | 完全由 data-source 的 args 表达式控制                                                   |
| **响应格式**     | `{status, msg, data: {items, total}}`                       | `{rows/items/records, total/count}` 多格式兼容                                          |
| **筛选**         | `filter` 子表单，自动提交                                   | `queryForm` 子区域，通过 onQuerySubmit 事件通信                                         |
| **排序**         | `orderBy` + `orderDir` 参数自动发送                         | 作用域路径 `sort.column` + `sort.direction`                                             |
| **行标识**       | `primaryField` (默认 'id')                                  | `rowKey` (默认 'id')                                                                    |
| **API 配置方式** | 属性字符串/对象（amis 风格）                                | Action + args（一次性描述请求及其参数）                                                 |
| **参数注入方式** | 隐式：scope 变量自动拼接到请求；page/perPage/orderBy 全自动 | 显式：所有参数在 `args.params`/`args.data` 中声明，无隐含注入。可选 `includeScope: "*"` |
| **加载模式**     | `loadDataOnce` 客户端分页                                   | `loadDataOnce` 类似概念                                                                 |
| **轮询**         | `interval` + `stopAutoRefreshWhen`                          | `polling.enabled` + `polling.stopWhen`（需 data-source）                                |
| **无限滚动**     | CRUD2 的 `loadType: 'more'`                                 | `pagination.mode: 'infinite'`                                                           |
| **URL 同步**     | `syncLocation` + `syncResponse2Query`                       | 支持已声明但未实现                                                                      |

---

## 4. 请求参数对照表

### 4.1 初始加载请求

| 项目     | amis-react19                                               | nop-chaos-flux                         |
| -------- | ---------------------------------------------------------- | -------------------------------------- |
| 触发者   | CRUD 组件本身                                              | data-source 组件                       |
| 方式     | `store.fetchInitData()`                                    | `DataSourceController.dispatch(ajax)`  |
| 请求方法 | GET (默认)                                                 | 由 args.method 指定                    |
| URL      | `api` 属性值 + query string                                | `args.url`（支持表达式）               |
| 参数     | 自动: `page`, `perPage`, `orderBy`, `orderDir`, 表单筛选值 | 从 `args.params` + `includeScope` 合并 |
| 参数来源 | store.query + store.page + store.perPage                   | 作用域变量 + args 表达式求值           |

### 4.2 提交请求（行内编辑）

| 项目        | amis-react19                        | nop-chaos-flux                            |
| ----------- | ----------------------------------- | ----------------------------------------- |
| Schema 属性 | `quickSaveApi` / `quickSaveItemApi` | `quickSaveAction` / `quickSaveItemAction` |
| 请求方式    | POST (硬编码)                       | 由 action.args.method 指定                |
| 请求体      | `{ rows, rowsDiff, indexes, ids }`  | 由 action.args.data 表达式定义            |
| 上下文      | store.data + 行数据                 | 行作用域 + $record 绑定                   |
| 成功后      | 自动 re-fetch (search)              | 由 onSuccess 事件驱动                     |

### 4.3 分页请求

| 项目     | amis-react19                        | nop-chaos-flux                                 |
| -------- | ----------------------------------- | ---------------------------------------------- |
| 触发者   | CRUD.handleChangePage → search()    | CRUD 更新 scope → onRefresh 事件 → data-source |
| 请求参数 | `page` + `perPage` 自动拼接         | 由 args 模板控制：`"page": "${page}"`          |
| 参数命名 | `pageField` / `perPageField` 可配置 | 完全自由，在 args 中写什么就是什么             |

### 4.4 排序请求

| 项目   | amis-react19           | nop-chaos-flux                                   |
| ------ | ---------------------- | ------------------------------------------------ |
| 参数   | `orderBy` + `orderDir` | 由 args 模板控制                                 |
| 字段名 | 写死在 query 中        | 用户自定义 `${sort.column}`, `${sort.direction}` |

### 4.5 筛选请求

| 项目   | amis-react19                | nop-chaos-flux                                |
| ------ | --------------------------- | --------------------------------------------- |
| 参数   | filter 表单项值展开到 query | `queryForm` 值在 `onQuerySubmit` 事件载荷中   |
| 自动性 | 全部自动拼接                | 需要用户显式绑定到 data-source 的 args.params |

---

## 5. 响应格式对照表

### 5.1 数据获取响应

| 项目       | amis-react19                          | nop-chaos-flux                                             |
| ---------- | ------------------------------------- | ---------------------------------------------------------- |
| 外层包装   | `{ status: 0, msg: "", data: {...} }` | 无固定包装（由 data-source 直接暴露 dataKey 提取后的数据） |
| 行数据字段 | `items` 或 `rows`                     | `items` / `rows` / `records` / `list` / 纯数组             |
| 总数字段   | `total` 或 `count`                    | `total` 或 `count`                                         |
| 当前页字段 | `page` (可选)                         | 不强制                                                     |
| 动态列     | `columns` (可选)                      | 不强制                                                     |
| 有无下一页 | `hasNext` (简单分页)                  | 不强制                                                     |

### 5.2 提交响应

| 项目   | amis-react19                          | nop-chaos-flux                        |
| ------ | ------------------------------------- | ------------------------------------- |
| 格式   | `{ status: 0, msg: "", data: {...} }` | 取决于 data-source 的 responseAdaptor |
| 状态码 | `status === 0` 为成功                 | 无固定约定，由 responseAdaptor 处理   |
| 错误   | `status !== 0` 显示 msg               | 由 onError 事件处理                   |

---

## 6. 分页机制对比

### 6.1 状态管理

```typescript
// amis-react19 (MST Store)
class CRUDStore {
  @observable page = 1;
  @observable perPage = 10;
  @observable total = 0;
  @computed get lastPage() {
    return Math.ceil(total / perPage);
  }
}

// nop-chaos-flux (Scope Paths)
const pagination = {
  currentPage: 1, // 注意命名不同：currentPage vs page
  pageSize: 10, // 注意命名不同：pageSize vs perPage
};
// 写入 scope path: $_crud.<id>.pagination
```

### 6.2 切换页码

```typescript
// amis-react19
handleChangePage(2) {
  store.updateQuery({page: 2});
  store.changePage(2);
  this.search(); // 直接发 HTTP
}

// nop-chaos-flux
handleChangePage(2) {
  scope.set('pagination', {currentPage: 2, pageSize: 10});
  // 如果 loadDataOnce=false，触发 onRefresh 事件
  // data-source 消费事件后发 HTTP
}
```

### 6.3 分页模式

| 模式       | amis-react19                | nop-chaos-flux       |
| ---------- | --------------------------- | -------------------- |
| 标准分页   | 默认                        | `mode: 'pages'`      |
| 加载更多   | CRUD2 的 `loadType: 'more'` | `mode: 'infinite'`   |
| 客户端分页 | `loadDataOnce: true`        | `loadDataOnce: true` |

---

## 7. 行内编辑/保存对比

### 7.1 amis-react19

```json
// 声明
{
  "type": "crud",
  "api": "/api/users",
  "quickSaveApi": "/api/batch-save",
  "quickSaveItemApi": "/api/save/${id}",
  "columns": [
    {
      "type": "text",
      "name": "name",
      "quickEdit": true
    }
  ]
}

// 发送 (quickSaveApi):
POST /api/batch-save
{
  "rows": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ],
  "rowsDiff": [
    { "name": "Alice" },
    { "name": "Bob" }
  ],
  "indexes": [0, 1],
  "rowsOrigin": [
    { "id": 1, "name": "Alicia" },
    { "id": 2, "name": "Robert" }
  ],
  "ids": "1,2"
}
```

### 7.2 nop-chaos-flux

```json
// 声明
{
  "type": "crud",
  "source": "${usersData}",
  "quickSaveItemAction": {
    "action": "ajax",
    "args": {
      "url": "/api/save/${record.id}",
      "method": "put",
      "data": {
        "id": "${record.id}",
        "name": "${record.name}",
        "email": "${record.email}"
      }
    },
    "onSuccess": {
      "action": "refreshSource",
      "args": { "name": "users" }
    }
  },
  "columns": [
    {
      "type": "text",
      "name": "name",
      "quickEdit": true
    }
  ]
}

// 发送 (quickSaveItemAction):
// 在每个行作用域下 dispatch，$record 绑定到当前行
PUT /api/save/1
{
  "id": 1,
  "name": "Alice",
  "email": "alice@example.com"
}
// 注意：flux 版本给出发送哪条数据完全由 args.data 控制
```

---

## 8. 架构设计哲学差异

### 8.1 关注点分离

```
amis-react19:
  [CRUD]
    ├── 自己发 HTTP        (api)
    ├── 自己提交           (quickSaveApi)
    ├── 自己管理分页状态    (MST CRUDStore)
    └── 自己处理筛选排序   (store.query)

nop-chaos-flux:
  [data-source]           [CRUD]
    ├── 发 HTTP              ├── 显示数据
    ├── 处理响应              ├── 管理交互状态
    └── 发布到作用域          ├── 渲染表格
                             └── 通过事件触发 data-source
```

**amis-react19** 将数据获取、提交、状态管理和 UI 渲染全部耦合在 CRUD 组件内部。CRUD 既是"数据获取者"也是"数据展示者"。

**nop-chaos-flux** 将数据获取职责分离到 `data-source` 组件，CRUD 只负责：

1. 从作用域读取数据
2. 管理交互状态（分页、排序、筛选、选择）
3. 触发事件通知上游数据源刷新

### 8.2 API 的声明方式

```
amis-react19:
  api: "/api/users"                       // 字符串（被转换为内部 Api 对象）
  quickSaveApi: "/api/batch-save"         // 字符串
  → 不够灵活，无法精细控制每个请求的细节

nop-chaos-flux:
  action: "ajax"
  args: {
    url: "/api/users",
    method: "get",
    params: { page: "${page}" },
    headers: { Authorization: "Bearer ${token}" },
    requestAdaptor: "...",
    responseAdaptor: "..."
  }
  → 每个方面都显式配置，表达式提供动态能力
```

### 8.3 状态管理

```
amis-react19:
  MST (MobX-State-Tree)：
    CRUDStore : ServiceStore
    ├── observable（自动追踪）
    ├── computed（派生状态）
    └── action（可变更新）
  → 单组件独享 store 实例

nop-chaos-flux:
  Zustand scope store：
    └── 全局作用域，按路径分片
        ├── $_crud.<id>       ← CRUD 写入
        ├── usersData         ← data-source 写入
        └── ...               ← 其他组件写入
  → 多组件共享作用域，通过路径隔离
```

### 8.4 控制反转

```
amis-react19:
  CRUD 组件 "推" 数据：
    CRUD.search() → HTTP → 存储到 store → 渲染
    所有控制权在 CRUD 内部

nop-chaos-flux:
  CRUD 组件 "拉" 数据：
    scope 变更 → CRUD 重新渲染
    数据由外部 data-source 推入 scope
    CRUD 对数据源没有强耦合
```

---

## 9. 迁移指南摘要

### 9.1 从 amis 迁移到 flux 的 CRUD 配置变换

```json
// amis-react19
{
  "type": "crud",
  "api": "/api/users?page=$page&perPage=$perPage",
  "quickSaveApi": "/api/batch-save",
  "quickSaveItemApi": "/api/save/$id",
  "saveOrderApi": "/api/save-order",
  "primaryField": "id",
  "pageField": "page",
  "perPageField": "perPage",
  "totalField": "total",
  "filter": {
    "body": [{ "type": "input-text", "name": "keyword", "label": "搜索" }]
  },
  "defaultParams": { "source": "web" },
  "orderBy": "name",
  "orderDir": "asc",
  "loadDataOnce": false,
  "interval": 30000,
  "stopAutoRefreshWhen": "false"
}
```

```json
// nop-chaos-flux
{
  "type": "data-source",
  "name": "usersDS",
  "action": "ajax",
  "args": {
    "url": "/api/users",
    "method": "get",
    "params": {
      "page": "${page}",
      "perPage": "${perPage}",
      "keyword": "${keyword}",
      "source": "${source}"
    }
  },
  "polling": {
    "enabled": true,
    "interval": 30000,
    "stopWhen": "${false}"
  }
},
{
  "type": "crud",
  "source": "${usersDS}",
  "rowKey": "id",
  "pageField": "page",
  "pageSizeField": "perPage",
  "totalField": "total",
  "queryForm": {
    "body": [
      { "type": "input-text", "name": "keyword", "label": "搜索" }
    ]
  },
  "quickSaveItemAction": {
    "action": "ajax",
    "args": {
      "url": "/api/save/${record.id}",
      "method": "post",
      "data": {
        "id": "${record.id}",
        "name": "${record.name}",
        "email": "${record.email}"
      }
    }
  },
  "quickSaveAction": {
    "action": "ajax",
    "args": {
      "url": "/api/batch-save",
      "method": "post",
      "data": {
        "rows": "${rowsDiff}",
        "ids": "${ids}"
      }
    }
  }
}
```

### 9.2 关键迁移注意事项

1. **必须显式配置 data-source**: CRUD 不再自己发请求
2. **参数绑定需显式声明**: 所有请求参数在 data-source 的 args 中声明
3. **提交通过 action 事件**: 不再用 quickSaveApi 字符串，改用 quickSaveItemAction 对象
4. **成功后的 re-fetch 也需显式**: 在 action 的 onSuccess 中配置 refreshSource 或其他 action
5. **数据流方向改变**: 从"组件推送"变为"作用域拉取"，调试时可观察 scope store 状态
6. **作用域路径隔离**: CRUD 的状态写在 `$_crud.<id>/*` 路径下，不会污染全局命名空间

---

---

## 10. 架构讨论：是否应该用 `loadAction` 替代 `source`？

> 这是一个核心架构问题。当前 flux 的设计决策（记录于 `docs/components/crud/design.md` §2 决策表）明确写死："请求下沉 data-source + action（不开组件级 api）"。下面的分析旨在评估这个决策是否需要重新考虑。

### 10.1 当前 `source` + 事件协调模式的运行时缺陷

当前 CRUD 通过 `source` 从作用域读取数据，数据由分离的 `data-source` 组件通过 `data-source → dispatch(ajax) → fetcher → scope.set(name, data)` 注入：

```
[用户翻页] → CRUD: scope.update(pagination, {currentPage: 2})
           → CRUD: refreshCount++
           → CRUD: onRefresh?.(payload, ctx)        ← 事件 fire & forget
           → [外部 action 消费事件，触发 data-source 重新 fetch]
           → data-source: dispatch(ajax) → fetcher → HTTP
           → data-source: scope.set("users", data)
           → CRUD: source="${users}" 重新求值
           → CRUD: normalizeCrudSourceValue(data)
           → CRUD: 渲染
```

这个链条存在几个实际问题：

#### 问题 1：`normalizeCrudSourceValue` 丢弃了大部分后端信息

```typescript
// crud-renderer-state.ts:201-231
export function normalizeCrudSourceValue(value: unknown): CrudResolvedSource {
  // 只提取了 rows + total
  return { rows, total };
}
```

典型后端 `PageBean` 返回：

```json
{
  "items": [...],
  "total": 100,
  "page": 1,          // ← 丢弃
  "pageSize": 10,     // ← 丢弃
  "totalPages": 10,   // ← 丢弃
  "hasMore": false,   // ← 丢弃
  "lastPage": true,   // ← 丢弃
  "startIndex": 0,    // ← 丢弃
  "endIndex": 9       // ← 丢弃
}
```

CRUD **不信后端告诉它的当前页**。它通过 `paginationState.currentPage` 跟踪"我以为我在哪一页"，这个状态与后端实际返回的 `page` 可能不一致（例如后端做了自动校正、空结果集回退等）。

#### 问题 2：事件协调是 fire-and-forget，无完成回执

`handleRefresh` 的签名：

```typescript
const handleRefresh = (ctx?: CrudRefreshContext) => {
  scope.update(queryStatePath, { ..., refreshCount: refreshCount + 1 });
  onRefresh?.(refreshSummary, ctx);  // ← 没有 await，没有返回值
};
```

CRUD 乐观地递增 `refreshCount`，期待外部 handler 消费事件后让数据流向 scope。但如果：

- 没有注册 `onRefresh` handler → refreshCount 无限自增，CRUD 永远在"刷新"
- `data-source` 组件不存在 → 数据永不更新
- 事件被消费但 fetch 失败 → CRUD 不知道，仍显示旧数据 + 新 refreshCount

#### 问题 3：翻页和筛选的"假"自洽

以翻页为例，当前流程：

```
CRUD: scope.update(pagination, {currentPage: 2})
CRUD: 渲染 Page 2（但数据还是 Page 1 的，因为 data-source 还没返回）
CRUD: onRefresh → 触发 data-source → fetch("/api/users?page=2")
data-source: scope.set("users", newData)
CRUD: 重新渲染 Page 2 数据
```

在 `data-source` 返回前的渲染周期里，CRUD 显示的页码是 2 但数据是上一页的。这需要额外的 `loading` 状态来避免视觉闪烁。

### 10.2 `loadAction` 提案：CRUD 作为自己数据的 owner

```json
{
  "type": "crud",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/api/users",
      "method": "get",
      "params": {
        "page": "${page}",
        "pageSize": "${perPage}",
        "keyword": "${keyword}",
        "sortField": "${sort.column}",
        "sortOrder": "${sort.direction}"
      }
    }
  }
}
```

#### 设计要点

> **重要设计前提**：Flux 的 `loadAction` 遵循 Nop 平台的**显式声明**原则，与 AMIS `api` 的隐式 scope 注入有根本区别。所有请求参数 `{page, perPage, keyword, sort}` **不会自动注入请求**，必须在 `args.params` 或 `args.data` 中显式声明。如果需要自动包含 scope 变量，需显式设置 `includeScope`。详见 §11.4.1。

#### 核心设计：CRUD 定义自己的 scope，`includeScope` 语义于此对齐

`loadAction` 的表达式（`${page}`、`${perPage}`、`${keyword}`）需要明确的解析上下文。AMIS 的做法是隐式地从 render scope 中查找——但这使得表达式含义模糊：`${page}` 是谁的 page？全局的？CRUD 的？

**Flux 的设计应当是：每个 CRUD 实例定义一个自己的 scope（虚拟作用域），`loadAction` 中的表达式优先在这个 scope 中解析。**

CRUD 的内置 scope 包含：

| 变量                | 来源                           | 示例值                                  |
| ------------------- | ------------------------------ | --------------------------------------- |
| `${page}`           | `paginationState.currentPage`  | `1`                                     |
| `${perPage}`        | `paginationState.pageSize`     | `10`                                    |
| `${query.*}`        | `queryState.values` → 扁平展开 | `${query.keyword}`, `${query.category}` |
| `${sort.column}`    | `sortState.column`             | `"roleName"`                            |
| `${sort.direction}` | `sortState.direction`          | `"asc"`                                 |
| `${filters.*}`      | `filterState`                  | `${filters.status}`                     |

当 `loadAction` 中写 `includeScope: "*"` 时，**只包含上述 CRUD 内置 scope 的变量**，而不是整个全局 scope。

```json
{
  "type": "crud",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/r/NopAuthRole__findPage",
      "includeScope": ["page", "perPage", "query.keyword", "query.category"]
    }
  }
}
```

等价于：

```json
{
  "type": "crud",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/r/NopAuthRole__findPage",
      "params": {
        "page": "${page}",
        "perPage": "${perPage}",
        "keyword": "${query.keyword}",
        "category": "${query.category}"
      }
    }
  }
}
```

选择哪种取决于详细程度的需求——`includeScope` 适合"大部分 CRUD 变量都要传"，`params` 适合"需要自定义参数名/值变换"。

#### 核心设计：queryForm 是一个真正的 Form，提交前先验证再收集

CRUD 的筛选区域（`queryForm`）**不是一个简单的 UI 区域，而是一个拥有完整 form 生命周期的子表单**：

```
用户填写筛选字段
    ↓
点击"搜索"按钮
    ↓
queryForm.validate()  ← 先验证
    ├── 失败 → 显示校验错误（红色边框、错误消息）
    └── 通过 → queryForm.getValues()  ← 再收集
                ↓
          values = { keyword: "xxx", category: "yyy" }
                ↓
          CRUD.queryState = { values, refreshCount: refreshCount + 1 }
                ↓
          page = 1
                ↓
          dispatch(loadAction, { ...CRUD scope })
```

当前代码（`useCrudQueryBridge`）已经实现了这个流程：

```typescript
// crud-renderer-ownership.ts:241-244
if (handle.capabilities.hasMethod?.('validate')) {
  const validateResult = await handle.capabilities.invoke('validate');
  if (!validateResult?.ok) return; // 验证失败，不继续
}
const valuesResult = await handle.capabilities.invoke('getValues');
submitQueryValues(valuesResult.data);
```

`loadAction` 模式下，这个流程变为：

```typescript
// loadAction 模式下的 query submit 流程
async function handleQuerySubmit() {
  // 1. 验证 queryForm（已有）
  const validateResult = await queryForm.invoke('validate');
  if (!validateResult.ok) return; // ← 验证不通过，表单显示错误，不发送请求

  // 2. 收集值（已有）
  const { data: values } = await queryForm.invoke('getValues');

  // 3. 更新 CRUD 内部 scope
  crudScope.update({ query: values });

  // 4. 重置到第一页
  crudScope.update({ page: 1 });

  // 5. 调用 loadAction（CRUD scope 中的变量自动可供表达式解析）
  const response = await dispatch(loadAction, crudScope);

  // 6. 处理响应
  processLoadActionResponse(response);
}
```

queryForm 的字段名直接成为 CRUD scope 中的 `${query.*}` 变量，可在 `loadAction.args.params` 中通过表达式引用。

#### Picker 的搜索表单同理

Picker 内部的搜索框（`searchable: true`）也可以看作一个简化版 form：

```
搜索输入 → 表单验证（非空等）→ 更新 CRUD scope → 调用 loadAction
```

甚至可以说：**Picker 内部默认的搜索框就是一个单字段的 queryForm**。

1. **`loadAction` 是一个 `ActionSchema`**，不限于 `ajax`：
   - `"action": "ajax"` → HTTP 请求（90% 场景）
   - `"action": "formula"` → 本地数据变换
   - `"action": "custom:graphql"` → 自定义 action
   - `"action": "custom:grpc"` → 任意扩展

2. **CRUD 在 Action 执行时的可用绑定变量**：
   - `${page}` / `${perPage}` — 当前分页
   - `${sort.column}` / `${sort.direction}` — 当前排序
   - `${keyword}` / `${filter.*}` — 当前筛选（来自 queryForm）
   - `${{ queryForm 各字段 }}` — 查询表单值
   - `${defaultParams.*}` — 静态默认参数

3. **CRUD 从响应中提取结构化数据**：

   ```typescript
   interface LoadActionResponse {
     items?: unknown[];
     rows?: unknown[];
     records?: unknown[];
     total?: number;
     count?: number;
     page?: number; // 后端返回的当前页，CRUD 据此同步
     pageSize?: number; // 可选覆盖
     totalPages?: number; // 可选，用于计算 lastPage
     hasMore?: boolean; // 可选，用于简单分页
   }
   ```

4. **完整的生命周期**：
   ```
   CRUD.loadAction()
     → dispatch(loadAction, ctx)
     → await response
     → extract items + total + page + pageSize + ... from response
     → update internal state:
       - rows = response.items
       - total = response.total
       - currentPage = response.page ?? currentPage  // 后端说了算
       - pageSize = response.pageSize ?? pageSize
     → render
   ```

### 10.3 与 `source` 对比

| 维度                       | `source`（当前）                                                                                                               | `loadAction`（提案）                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **数据流**                 | 间接：CRUD → scope → onRefresh → data-source → scope → CRUD                                                                    | 直接：CRUD → loadAction → response → CRUD                              |
| **状态同步**               | CRUD 自己维护 page/perPage，不信任后端返回                                                                                     | 后端返回的 page/pageSize 可直接覆盖 CRUD 状态                          |
| **错误处理**               | 事件 fire-and-forget，CRUD 不感知错误                                                                                          | `await` 可捕获错误，CRUD 可展示错误态                                  |
| **后端 PageBean**          | 只提取 `items` + `total`，其余字段丢弃                                                                                         | `page`、`pageSize`、`totalPages`、`hasMore` 全部可用                   |
| **loading 状态**           | 通过 refreshCount 间接推断                                                                                                     | 可明确前置/后置处理                                                    |
| **外部依赖**               | 必须有 data-source + onRefresh 事件接线                                                                                        | 无外部依赖，自包含                                                     |
| **复用性**                 | 数据可被多个组件共享                                                                                                           | 数据耦合在 CRUD 内部                                                   |
| **loadDataOnce**           | 数据通过 source 注入，客户端分页自然支持                                                                                       | 需额外支持：首次调用 ajax，后续客户端排序/筛选                         |
| **配置复杂度**             | data-source + crud + onRefresh + onQuerySubmit + onPageChange 事件绑定                                                         | 单个 `loadAction` 属性                                                 |
| **事件接线量**             | 用户必须手动绑 3-4 个事件：`onRefresh → refreshSource`、`onQuerySubmit → refreshSource`、必要时 `onPageChange → refreshSource` | **零事件接线**——pagination/filter/refresh/sort 联动全内置              |
| **后端 pagination 权威性** | CRUD 不信后端 page，完全靠 `paginationState.currentPage` 自管                                                                  | 信任后端 PageBean 中的 `page`/`pageSize`，用 server 返回值覆盖本地状态 |

### 10.4 为什么当前的 `source` 模式不够理想

**`source` 本质上是"只读消费者"**，但 CRUD 需要的是一个"读写闭环"：

```
只读消费者:        source → CRUD [读就完了，不写回去]
CRUD 需要的闭环:   CRUD 状态 → HTTP → 后端处理 → 响应 → CRUD 同步状态
```

当 CRUD 需要翻页、排序、筛选时，它不是在"消费已有数据"，而是在"驱动一个新的数据请求"。当前的 `source` + `onRefresh` 事件试图用分离组件拼出一个请求闭环，但代价是：

1. **事件链路的脆弱性** — 忘记绑定 `onRefresh` → CRUD 刷新无效
2. **`data-source` 组件必须与 CRUD 共存** — 如果用户只写了一个 `<crud>` 而没有 `<data-source>`，CRUD 永远无法加载数据。这是一种"隐性契约"：schema 作者必须知道两个组件必须配对使用
3. **响应信息丢失** — `data-source` 把整个响应放进 scope，但 `normalizeCrudSourceValue` 只提取了 items/total。PageBean 中的 page、pageSize、totalPages 等被有意丢弃

**事实上，`data-source` + `crud` + `onRefresh` 事件这三部分的组合，本质上是重新实现了一个轻度版的 `loadAction`，只不过拆成了三个独立 artifact 并用事件粘合。**

### 10.5 `loadAction` 对后端 PageBean 的完整支持

```typescript
// 提案的 loadAction 响应处理逻辑
function processLoadActionResponse(
  response: unknown,
  currentState: CrudPaginationState,
): {
  rows: unknown[];
  total: number;
  pagination?: Partial<CrudPaginationState>; // 后端可覆盖
} {
  const data = normalizeResponse(response); // items/rows/records/list 统一化
  const record = (data as Record<string, unknown>) ?? {};

  // 后端返回的 page/pageSize 可以覆盖 CRUD 的当前分页状态
  // 这是 source 模式做不到的
  const serverPage =
    typeof record.page === 'number'
      ? record.page
      : typeof record.currentPage === 'number'
        ? record.currentPage
        : undefined;
  const serverPageSize = typeof record.pageSize === 'number' ? record.pageSize : undefined;

  return {
    rows: record.items ?? record.rows ?? record.records ?? record.list ?? [],
    total:
      typeof record.total === 'number'
        ? record.total
        : typeof record.count === 'number'
          ? record.count
          : 0,
    pagination: {
      ...(serverPage !== undefined ? { currentPage: serverPage } : {}),
      ...(serverPageSize !== undefined ? { pageSize: serverPageSize } : {}),
    },
  };
}
```

### 10.6 `loadAction` 同时兼容 `source`：两者共存而非替代

`loadAction` 和 `source` 解决的是不同的问题，不应该完全替代对方：

| 场景                                                           | 用 `source`                  | 用 `loadAction`  |
| -------------------------------------------------------------- | ---------------------------- | ---------------- |
| 数据在 scope 中已有（来自 data-source、上游 page 初始化等）    | ✅                           | ❌ 不需要        |
| 多个组件共享同一数据（如 CRUD + Chart 使用相同的 `$ {users}`） | ✅                           | ❌ 重复加载      |
| 纯客户端数据（静态 JSON、memory store）                        | ✅                           | ❌ 无意义        |
| CRUD 自己请求后端 API（90% 场景）                              | ❌ 组合 data-source 太多仪式 | ✅ 自包含        |
| loadDataOnce 模式                                              | ✅ 首次通过 source 注入      | 需要负载模式支持 |
| 需要后端 PagBean 的 page/pageSize/totalPages 同步              | ❌ 信息丢失                  | ✅ 完整支持      |

**推荐**：同时支持 `source` 和 `loadAction`，优先级规则：

1. 如果提供了 `loadAction` → 使用 loadAction 模式（CRUD 自己管理数据获取）
2. 如果未提供 `loadAction` 但提供了 `source` → 使用 source 模式（当前行为，向后兼容）
3. 如果两个都提供了 → `source` 作为 `loadDataOnce` 的初始数据，`loadAction` 作为后续刷新

### 10.7 示例对比

#### 当前 flux 写法（source + data-source 配对）

```json
{
  "type": "data-source",
  "name": "users",
  "action": "ajax",
  "args": {
    "url": "/api/users",
    "method": "get",
    "params": {
      "page": "${page}",
      "perPage": "${perPage}",
      "keyword": "${keyword}"
    }
  }
},
{
  "type": "crud",
  "source": "${users}",
  "queryForm": { "body": [...] },
  "columns": [...],
  "onRefresh": {
    "action": "refreshSource",
    "targetId": "users"
  },
  "onQuerySubmit": {
    "action": "refreshSource",
    "targetId": "users"
  }
}
```

#### 用 `loadAction` 的等效写法

```json
{
  "type": "crud",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/api/users",
      "method": "get",
      "params": {
        "page": "${page}",
        "pageSize": "${perPage}",
        "keyword": "${keyword}"
      }
    }
  },
  "queryForm": { "body": [...] },
  "columns": [...]
}
```

更简洁：少了 data-source 组件、少了 onRefresh 事件绑定、少了 onQuerySubmit 事件绑定。

### 10.8 与 amis 的 `api` 对比

| 特性     | amis `api`                             | flux `loadAction`（提案）             |
| -------- | -------------------------------------- | ------------------------------------- |
| 本质     | 字符串 URL + 自动参数注入              | ActionSchema（完整 action 协议）      |
| 方法     | 自动 GET（可覆写）                     | 在 args.method 中显式指定             |
| 参数注入 | 自动注入 page/perPage/orderBy/orderDir | `${表达式}` 显式绑定                  |
| 非 HTTP  | ❌ 不支持                              | ✅ 支持 formula/custom 等 action 类型 |
| 请求变换 | `requestAdaptor` 字符串                | `requestAdaptor` 表达式               |
| 响应变换 | `responseAdaptor` 字符串               | `responseAdaptor` 表达式              |
| 错误处理 | 全局适配器                             | onError action                        |
| 载荷变换 | 有限                                   | 完整表达式系统                        |

`loadAction` 本质上是 amis 的 `api` 的**泛化版本**——把从字符串 URL 扩展为完整的 ActionSchema，使 CRUD 的数据获取可以和 flux 的 action 系统统一。

### 10.9 不采纳 `loadAction` 的理由（反方观点）

记录当前设计决策（`docs/components/crud/design.md` §2）的不采纳理由：

> "请求下沉 data-source + action（不开组件级 api）"

1. **架构纯度**：分离 data-source 保持了关注点分离——CRUD 管 UI，data-source 管数据。任何打破这个边界的改动都降低了内聚性。
2. **数据共享**：多个组件消费同一数据源时，data-source 天然支持"写一次，多处读"。
3. **`loadAction` + `source` 的职责模糊**：如果 CRUD 同时有 `loadAction` 和 `source`，哪个优先？它们的交互规则增加了 schema 复杂度。
4. **轮询/跨页面共享**：data-source 的 `interval` 轮询、`statusPath` 发布等能力需要额外考虑是否在 `loadAction` 中复制。
5. **`loadDataOnce` 模式**：前端一次性加载 + 客户端分页筛选，在 `loadAction` 模式下需要特殊处理（首次 ajax，后续客户端操作）。

### 10.10 折中方案：`loadAction` 不做为 CRUD 属性，而是作为 data-source 的"自动配对"契约

如果不想在 CRUD 中引入获取逻辑，但想解决事件链路的脆弱性问题，可以考虑：

```json
{
  "type": "data-source",
  "name": "users",
  "action": "ajax",
  "args": { "url": "/api/users" },
  "target": "myCrud"   // ← 自动关联到 crud 的 id，CRUD 自动订阅
},
{
  "type": "crud",
  "id": "myCrud",
  "source": "${users}",
  "autoBindSource": "users"  // ← 或自动从 data-source target 推导
}
```

但这本质上是把 `loadAction` 的语义从 CRUD 属性搬到了 data-source 属性，复杂度并未减少。

### 10.11 结论：`loadAction` 模式的核心设计原则——"内置联动，零事件接线"

用户最核心的需求是：**pagination + filter + table + loadAction 的联动机制必须内置在 CRUD 控件中，避免每次都需要重新接线。**

当前 `source` 模式的缺陷在于——CRUD 只负责"展示数据"和"管理本地状态（page/perPage/query/sort）"，但"数据获取"是外部的。这导致每次状态变化都需要用户手动绑定事件链路。

#### 设计原则

```
loadAction 模式下，CRUD 是完整的数据生命周期管理者：
  ┌────────────────────────────────────────────────────────┐
  │                     CRUD                               │
  │                                                        │
  │  pagination ──┐                                        │
  │  query/sort ──┤──→ dispatch(loadAction) → await →      │
  │  refresh ─────┘              │                         │
  │                              ▼                         │
  │                    response: {items, total, page, ...}  │
  │                              │                         │
  │                    rows = items                         │
  │                    total = response.total               │
  │                    page  = response.page  ← 信任后端    │
  │                    render table                         │
  └────────────────────────────────────────────────────────┘
```

#### 哪些联动是内置的

| 触发源                | 自动行为                                                     |
| --------------------- | ------------------------------------------------------------ |
| **用户翻页**          | `page → page+perPage` → 调用 `loadAction` → 更新 rows        |
| **用户切换 pageSize** | `pageSize → newSize, page → 1` → 调用 `loadAction`           |
| **用户提交查询表单**  | `query → values, page → 1` → 调用 `loadAction`               |
| **用户点击排序**      | `sort → column+direction` → 调用 `loadAction`                |
| **用户点击刷新按钮**  | `refreshCount++` → 调用 `loadAction`                         |
| **列头筛选**          | `filters → key+values` → 调用 `loadAction`                   |
| **首次挂载**          | 自动调用 `loadAction` 初始化数据                             |
| **后端返回 page**     | CRUD 用 `response.page` 覆盖自己的 `currentPage`（信任后端） |

#### 用户不需要写的事件（对比当前）

```jsonc
// 当前 source 模式 — 每个 CRUD 都需要手动绑三组事件
{
  "type": "crud",
  "source": "${users}",
  "onRefresh":       { "action": "refreshSource", "targetId": "users" },   // ← 必须
  "onQuerySubmit":   { "action": "refreshSource", "targetId": "users" },   // ← 必须
  "onPageChange":    { "action": "refreshSource", "targetId": "users" },   // ← 通常也要
}

// loadAction 模式 — 零事件接线
{
  "type": "crud",
  "loadAction": { "action": "ajax", "args": { "url": "/api/users" } }
  // ↑ 所有联动全内置
}
```

同时也不需要 `data-source` 组件。CRUD 的 `loadAction` 就是自己的数据源。

#### 响应处理——信任后端的分页状态

```typescript
// loadAction 模式下的响应处理（对比 source 模式的 normalizeCrudSourceValue）
function processLoadActionResponse(response: unknown): {
  rows: unknown[];
  total: number;
  serverPagination?: { currentPage: number; pageSize: number }; // ← 后端权威
} {
  const data = toRecord(response);
  const items = data.items ?? data.rows ?? data.records ?? data.list ?? [];
  const total =
    typeof data.total === 'number'
      ? data.total
      : typeof data.count === 'number'
        ? data.count
        : items.length;

  // 后端返回的 page 覆盖 CRUD 的 currentPage
  // 这是 source 模式做不到的——normalizeCrudSourceValue 丢弃了 page 字段
  const serverPage =
    typeof data.page === 'number'
      ? data.page
      : typeof data.currentPage === 'number'
        ? data.currentPage
        : undefined;
  const serverPageSize = typeof data.pageSize === 'number' ? data.pageSize : undefined;

  return {
    rows: Array.isArray(items) ? items : [],
    total,
    serverPagination:
      serverPage !== undefined || serverPageSize !== undefined
        ? {
            currentPage: serverPage ?? 1,
            pageSize: serverPageSize ?? DEFAULT_PAGE_SIZE,
          }
        : undefined,
  };
}
```

#### `loadAction` 模式下的事件事件（仍保留但变为可选）

事件仍可绑定，但**不再是强制性的数据流管道**：

```json
{
  "type": "crud",
  "loadAction": { "action": "ajax", "args": { "url": "/api/users" } },
  "onRefresh": { "action": "showToast", "args": { "msg": "数据已刷新" } }, // ← 纯副作用
  "onQuerySubmit": { "action": "trackEvent", "args": { "event": "search" } }, // ← 纯副作用
  "onPageChange": { "action": "logAnalytics", "args": { "page": "${page}" } } // ← 纯副作用
}
```

数据流不再依赖这些事件，它们是"副作用钩子"而非"数据管线"。

#### 双模式共存原则

```
if (schema.loadAction) {
  // Mode 1: 自包含模式
  //   - CRUD 内部管理 loadAction dispatch + 响应处理
  //   - pagination/query/sort 变化自动触发 loadAction
  //   - 响应中的 page/total/items 自动提取
  //   - source 字段被忽略（如果同时提供了，给出警告）
} else if (schema.source) {
  // Mode 2: 作用域读取模式（当前行为，向后兼容）
  //   - CRUD 从 scope 读取 source 表达式
  //   - 用户需自行绑定 onRefresh/onQuerySubmit/onPageChange 事件
  //   - normalizeCrudSourceValue 只提取 items + total
} else {
  // 无数据源——空表
  // 不影响现有行为
}
```

#### 结论

| 结论                                                               | 理由                                                                       |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **`loadAction` 不应完全替代 `source`**                             | `source` 在数据共享、客户端数据、loadDataOnce 等场景仍有价值               |
| **`loadAction` 应作为自包含 CRUD 的新生路径**                      | 覆盖 ~90% 的 CRUD 场景，内置 **pagination + filter + sort + refresh 联动** |
| **事件（onRefresh/onQuerySubmit/onPageChange）变为可选副作用钩子** | 数据流不再依赖事件线，事件仅用于副作用的扩展点                             |
| **`source` 保留为降级/兼容路径**                                   | 当没有 `loadAction` 时使用，现有 schema 完全不动                           |
| **建议在 `crud-schema.ts` 中添加 `loadAction?: ActionSchema`**     | 与 `quickSaveAction` / `quickSaveItemAction` 处于同一抽象层级              |
| **后端 PagBean 的 page/pageSize 被 CRUD 信任并同步**               | 这是 source 模式做不到的关键改进                                           |

### 10.12 `loadAction` 对现有代码的影响评估

| 影响领域                         | 变化                                                              |
| -------------------------------- | ----------------------------------------------------------------- |
| `crud-schema.ts`                 | 新增 `loadAction?: ActionSchema` 字段                             |
| `crud-renderer.tsx`              | 新增分支逻辑：有 `loadAction` 时接管数据获取，否则退回到 `source` |
| `crud-renderer-state.ts`         | 新增 `useLoadAction` hook，封装 dispatch → 响应处理流程           |
| 现有 `source` 路径               | 完全不动，不影响现有 schema                                       |
| data-source 组件                 | 不需要变化——有 `loadAction` 的 CRUD 可以不用 data-source          |
| 测试                             | 新增 loadAction 测试套件，现有测试不变                            |
| `docs/components/crud/design.md` | 更新决策表：从"不开组件级 api"改为"开 loadAction action 入口"     |

---

---

## 11. Picker 组件分析：amis → nop-entropy → flux

### 11.1 AMIS Picker 架构

Picker 本质上是一个**"Form Control + Dialog + CRUD"**的三层嵌套：

```
Picker (表单控件)
  ├── 触发器: Input 区域（显示已选值/Tag）
  │     点击 ──→ 弹出 Dialog/Drawer
  │               │
  │               ▼
  │          CRUD (内部)
  │            ├── api/source ──→ 数据获取
  │            ├── columns ──→ 表格列
  │            ├── headerToolbar ──→ 搜索/筛选
  │            ├── footerToolbar ──→ 分页+统计
  │            ├── checkOnItemClick ──→ 点击行即选择
  │            └── pickerMode: true ──→ 特殊选择模式
  │               │
  │               选择确认 ──→ 回写值到表单
  └── 值的格式: valueField/labelField/labelTpl 控制输出
```

**关键设计决定**：Picker 不自己实现数据获取和展示——它委派给 CRUD。这使得 Picker 拥有 CRUD 的全部能力（表格/列表/卡片模式、分页、排序、筛选、动态列）而不需要自己做任何事。

`buildSchema()` (`Picker.tsx:276-301`) 的核心代码：

```typescript
buildSchema(props) {
  return {
    ...props.pickerSchema,          // 用户自定义的 CRUD schema
    type: 'crud',                    // 强制 CRUD
    pickerMode: true,                // 选择模式标记
    checkOnItemClick: true,          // 点击行即选
    syncLocation: false,
    keepItemSelectionOnPageChange: true,  // 跨页保留选择
    api: ...                         // 数据 API
  };
}
```

### 11.2 nop-entropy 中的 Picker 使用模式

nop-entropy 在 AMIS Picker 上叠加了**元数据驱动的自动生成**，实现了极致的简洁性。

#### 每实体自动生成 picker 页面

每个业务实体都有自动生成的 `picker.page.yaml`：

```yaml
# /nop/auth/pages/NopAuthRole/picker.page.yaml
x:gen-extends: |
  <web:GenPage view="NopAuthRole.view.xml" page="picker" />
```

由 `page_picker.xpl` 转为 AMIS schema：

```xml
<picker valueField="id" labelField="${objMeta?.displayProp || 'id'}">
  <crud api="@query:NopAuthRole__findPage" ...>
    ...
  </crud>
</picker>
```

#### 业务页面中使用 Picker

典型的业务引用字段使用 `control.xlib:908-923` 生成的配置：

```json
// edit-ref-id 控件的最终输出
{
  "type": "picker",
  "x:extends": "/nop/auth/pages/NopAuthRole/picker.page.yaml",
  "valueField": "roleId",
  "labelField": "roleName",
  "source": {
    "valueField": "roleId",
    "labelField": "roleName"
  },
  "joinValues": false,
  "extractValue": true
}
```

**`x:extends` 是关键**: 它将 picker.page.yaml 中的所有 CRUD 配置（columns、api、搜索栏、分页）作为"模板"拉入，用户只需要覆盖 `valueField`/`labelField` 两个字段。

#### Java 端自动解析 picker URL

`XuiHelper.getRelationPickerUrl()` 自动解析引用属性的 picker 地址：

```java
// 通过元数据注解或约定推导 picker URL
String pickerUrl = dispMeta?.["ui:pickerUrl"]    // 优先: 显式注解
                ?? propMeta?.["ui:pickerUrl"]     // 次优: 属性注解
                ?? "/" + moduleId + "/pages/" + refObjName + "/picker.page.yaml";  // 约定
```

这意味着在 XLang 中写 `gen:extend` 时，开发者甚至不需要指定 `x:extends`——它可以从实体关系和元数据中自动推导。

### 11.3 Flux 当前 Picker 实现

当前 `packages/flux-renderers-form-advanced/src/picker-renderer.tsx:1-350`：

**功能**：支持打开 Dialog 显示候选列表，单选/多选，搜索过滤，`valueKey`/`labelKey` 映射。

**局限**：
| 缺失能力 | 说明 |
|----------|------|
| **无服务端数据加载** | 只支持静态 `options` 数组。无 `source`/`api`/`loadAction` |
| **无 CRUD 内嵌** | Dialog 内是简单的 `<ul><li>` 列表，不是 CRUD/Table |
| **无分页** | 候选列表必须一次性全部拉取，无法处理大数据集 |
| **无表格列展示** | 只有 `{label,value}` 两条信息，无法显示多列详情 |
| **无跨页保留选择** | 不支持 `keepItemSelectionOnPageChange` |
| **选择后无法自动填充其他字段** | 无 `autoFill` 等价物 |

### 11.4 Flux Picker 极简设计方案

#### 核心原则：Picker = Dialog + CRUD/Table + loadAction

Picker 不应重新发明数据获取、分页、搜索等——这些应该由 CRUD 的 `loadAction` 机制提供。Picker 只负责"打开 Dialog → 显示内部 CRUD → 监听选择 → 回写值"。

#### Schema 设计

```typescript
// 增量字段（在现有 pickerSchema 基础上扩展）
interface PickerSchema extends BoundFieldSchemaBase {
  type: 'picker';

  // 值映射（已有）
  valueKey?: string; // 默认 'id'
  labelKey?: string; // 默认 'label'
  multiple?: boolean;

  // 数据获取（新增）
  loadAction?: ActionSchema; // 服务端数据获取（自包含模式）
  source?: SchemaValue; // 兼容：作用域读取模式

  // 内部表格配置（新增 — 替代 AMIS 的 pickerSchema）
  columns?: PickerColumnSchema[]; // 表格列定义
  searchable?: boolean; // 是否显示搜索框
  searchPlaceholder?: string;

  // Dialog 配置（增强现有 pickerDialog）
  pickerDialog?: {
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    placement?: 'dialog' | 'drawer';
  };

  // 选择回写行为
  joinValues?: boolean; // 多选时以 delimiter 拼接
  delimiter?: string; // 默认 ','
  extractValue?: boolean; // 只存储值（而非完整对象）
  autoFill?: Record<string, string>; // 选择后自动填充其他字段
  labelTpl?: string; // 选中标签的自定义模板

  // 事件（已在 events 中，但 schema 层补充类型）
  onPick?: ActionSchema | ActionSchema[];
}
```

#### 极简配置示例

**场景 1：引用一个实体（最常见）**

```json
{
  "type": "picker",
  "name": "roleId",
  "label": "角色",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/r/NopAuthRole__findPage",
      "params": {
        "page": "${page}",
        "perPage": "${perPage}",
        "filter": "${filter_keyword}"
      }
    }
  },
  "valueKey": "id",
  "labelKey": "roleName"
}
```

**内部自动展开为**：

```
Picker
  ├── Trigger: Button("请选择") — 显示已选 roleName
  ├── Dialog(md)
  │   └── CRUD/Table (由 picker 内部渲染)
  │       ├── loadAction → GET /r/NopAuthRole__findPage?page=1&perPage=10&filter=
  │       ├── columns: [{name: "roleName", label: "角色名"}]  ← 智能默认
  │       ├── header: search box (searchable: true)
  │       ├── footer: pagination bar
  │       ├── checkOnItemClick: true
  │       └── keepSelectionOnPageChange: true
  └── 确认 → writeValue(formName, selectedId)
```

所有联动内置：

- 搜索 → 重置到第一页 → 调用 loadAction
- 翻页 → 调用 loadAction
- 确认 → 回写 valueKey 到表单字段
- 翻页时保持已选择状态

**场景 2：多选 + 自定义列**

```json
{
  "type": "picker",
  "name": "userIds",
  "label": "用户",
  "multiple": true,
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/r/NopAuthUser__findPage",
      "params": {
        "page": "${page}",
        "perPage": "${perPage}"
      }
    }
  },
  "valueKey": "userId",
  "labelKey": "userName",
  "columns": [
    { "name": "userName", "label": "用户名" },
    { "name": "nickName", "label": "昵称" },
    { "name": "status", "label": "状态" }
  ],
  "extractValue": true,
  "joinValues": false
}
```

**场景 3：选择后自动填充其他表单字段**

```json
{
  "type": "picker",
  "name": "userId",
  "label": "负责人",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/r/NopAuthUser__findPage",
      "params": { "page": "${page}", "perPage": "${perPage}" }
    }
  },
  "valueKey": "userId",
  "labelKey": "userName",
  "autoFill": {
    "managerId": "${managerId}", // 选中用户后，managerId 字段自动填充
    "deptId": "${deptId}"
  }
}
```

**场景 4：兼容现有 `options` 模式（纯客户端数据，无 loadAction）**

```json
{
  "type": "picker",
  "name": "country",
  "label": "国家",
  "options": [
    { "code": "CN", "name": "中国" },
    { "code": "US", "name": "美国" }
  ],
  "valueKey": "code",
  "labelKey": "name"
}
```

**场景 5：Drawer 模式**

```json
{
  "type": "picker",
  "name": "deptId",
  "label": "部门",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/r/NopDept__findPage",
      "params": { "page": "${page}", "perPage": "${perPage}" }
    }
  },
  "valueKey": "deptId",
  "labelKey": "deptName",
  "pickerDialog": {
    "type": "drawer",
    "title": "选择部门",
    "size": "lg"
  }
}
```

#### 11.4.1 重要设计决策：显式参数 vs 隐式 scope 注入

一个根本性的架构差异需要理清：

| 特性                 | AMIS `api` 模式                         | Nop/Flux `action:ajax` 模式                       |
| -------------------- | --------------------------------------- | ------------------------------------------------- |
| **参数来源**         | 隐式注入 scope 中所有变量               | 显式在 `args.params`/`args.data` 中声明           |
| **page/perPage**     | 自动注入 `?page=$page&perPage=$perPage` | 需要显式写 `${page}`/`${perPage}`                 |
| **筛选值**           | 自动注入 filter 表单所有字段            | 需要在 `params` 中显式列出                        |
| **orderBy/orderDir** | 自动注入                                | 需要显式声明 `${sort.column}`/`${sort.direction}` |
| **所有 scope 变量**  | 默认全部包含（无隔离）                  | 需要 `includeScope: "*"` 才自动包含               |

AMIS 的做法是**隐含假定"所有 scope 变量会自动跟随传递"**。这在快速原型时方便，但有两个严重问题：

1. **安全性**：不需要的参数也可能被发送到后端（如 token、密码、内部状态）
2. **不确定性**：scope 中有什么就发什么，schema 作者无法精确控制请求载荷

Nop/Flux 的 `action:ajax` 采用**显式声明**原则。所有请求参数必须显式列出，无隐含注入。如果确实需要批量包含 scope 变量，可以显式设置：

```json
{
  "action": "ajax",
  "args": {
    "url": "/r/NopAuthRole__findPage",
    "includeScope": "*" // ← 显式声明：包含所有 scope 变量
  }
}
```

或选择性地包含：

```json
{
  "action": "ajax",
  "args": {
    "url": "/r/NopAuthRole__findPage",
    "includeScope": ["page", "perPage", "keyword"],
    "params": { "filter": "${myFilter}" } // 显式 params 优先级 > includeScope
  }
}
```

**对 Picker 设计的影响**：Picker 的 `loadAction` 也遵循这个原则——page/perPage/search 等内置参数不会自动注入，但 Picker 作为"自包含"组件，**内部在调用 loadAction 时自动将 `{page, perPage, keyword, sort}` 放入 action context**，这与 CRUD 的 loadAction 内置联动一致。但 `includeScope` 作为后备机制仍然可用。

#### 与 `loadAction` + CRUD 联动

Picker 内部使用 CRUD 组件（复用 `flux-renderers-data` 的 TableRenderer/CRUD），其数据生命周期与 CRUD 的 `loadAction` 设计完全一致：

```typescript
// picker-renderer.tsx 内部逻辑（提案）
function PickerRenderer(props) {
  const loadAction = props.props.loadAction;
  const source = props.props.source;

  // 决定数据模式
  const hasLoadAction = Boolean(loadAction);
  const hasSource = Boolean(source);

  // 构建内部 table/CRUD schema
  const innerSchema = {
    type: hasLoadAction ? 'table' : undefined,  // loadAction 模式下用 table
    loadAction,                                   // 传入 loadAction
    source,                                       // 或 source（兼容）
    columns: resolvedColumns,
    pagination: { enabled: true },
    selection: { type: multiple ? 'checkbox' : 'radio', keepOnPageChange: true },
    checkOnItemClick: true,                       // 点击行即选择
    searchable: props.props.searchable,
  };

  // 渲染：Dialog → 内部表格
  return (
    <Dialog>
      <DialogHeader>{dialogTitle}</DialogHeader>
      <DialogBody>
        <SearchBox />                           // 搜索
        <TableRenderer {...innerSchemaProps} />  // 复用 table
      </DialogBody>
      <DialogFooter>
        <Confirm onClick={handleConfirm} />      // 确认选择
        <Cancel onClick={handleCancel} />
      </DialogFooter>
    </Dialog>
  );
}
```

#### 与 CRUD `loadAction` 的联动总结

| 联动场景        | Picker 行为                              |
| --------------- | ---------------------------------------- |
| **打开 Dialog** | 首次调用 `loadAction` 加载第一页数据     |
| **搜索输入**    | 搜索条件 → `page=1` → 调用 `loadAction`  |
| **翻页**        | `page=N` → 调用 `loadAction`             |
| **排序**        | `sort=col&order=asc` → 调用 `loadAction` |
| **选择行**      | 更新选中状态（跨页保留）                 |
| **确认**        | 将选中行的 `valueKey` 写入表单字段       |
| **取消**        | 关闭 Dialog，选中状态不提交              |
| **自动填充**    | 选中后自动填充 `autoFill` 配置的字段     |
| **labelTpl**    | 触发区域用模板渲染已选值                 |

#### 为什么这比 AMIS 更简洁

| 维度             | AMIS Picker                                   | Flux Picker（提案）                              |
| ---------------- | --------------------------------------------- | ------------------------------------------------ |
| 基本配置         | `pickerSchema` 内嵌完整 CRUD schema（~20 行） | `loadAction` + `valueKey` + `labelKey`（~3 行）  |
| `x:extends`      | 需要外部 `.page.yaml` 文件 + 文件加载机制     | 不需要——配置内联即可                             |
| 后端 URL 解析    | Java `XuiHelper` 自动推导                     | 用户在 `loadAction` 中显式指定 URL               |
| 列配置           | 必须在 `pickerSchema.columns` 中声明          | 默认只展示 `labelKey` 列，需要多列再写 `columns` |
| Dialog/CRUD 绑定 | 手工组合                                      | 内置——Picker 自动包装 CRUD                       |
| 无服务端/客户端  | 两个路径（api/source）                        | 三模式：`loadAction` / `source` / `options`      |
| 跨页选择         | 需要 `keepItemSelectionOnPageChange` 显式开启 | 默认开启                                         |

**极简主义的关键**：Picker 本身不实现数据获取、分页、搜索、排序。这些由 CRUD/Table 通过 `loadAction` 提供。Picker 只做一件事——"打开 Dialog → 选择 → 回写"。这就是关注点分离的极致。

### 11.5 与 nop-entropy 生态的映射

nop-entropy 中的 `XuiHelper.getRelationPickerUrl()` 在 flux 中可以用更简单的方式完成：

```json
// nop-entropy 风格（自动解析 picker URL，需 Java 后端支持）
{
  "type": "picker",
  "name": "roleId",
  "entity": "NopAuthRole"  // ← 需要后端自动解析
}

// flux 原生风格（URL 显式，更透明）
{
  "type": "picker",
  "name": "roleId",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/r/NopAuthRole__findPage",
      "params": { "page": "${page}", "perPage": "${perPage}" }
    }
  },
  "valueKey": "id",
  "labelKey": "roleName"
}
```

如果需要类似 nop-entropy 的"零配置 entity picker"，可以添加一个约定：

```json
{
  "type": "picker",
  "name": "roleId",
  "entityName": "NopAuthRole"
}
// ↓ 编译期展开为
{
  "type": "picker",
  "name": "roleId",
  "loadAction": {
    "action": "ajax",
    "args": {
      "url": "/r/NopAuthRole__findPage",
      "params": { "page": "${page}", "perPage": "${perPage}" }
    }
  },
  "valueKey": "id",
  "labelKey": "displayName"
}
```

但这个"编译期展开"需要在 schema 编译层实现 `entityName → loadAction` 的转换，属于未来扩展。当前阶段 `loadAction` 显式指定已经足够简洁。

---

## 附录：关键源码引用

### amis-react19 关键行

| 功能                             | 文件        | 行号      |
| -------------------------------- | ----------- | --------- |
| api 属性定义                     | `CRUD.tsx`  | 206       |
| 构造函数清空 items               | `CRUD.tsx`  | 768       |
| componentDidMount 触发加载       | `CRUD.tsx`  | 780-798   |
| handleFilterInit → merge params  | `CRUD.tsx`  | 1163-1216 |
| search() 核心 fetch 调用         | `CRUD.tsx`  | 1474-1659 |
| store.fetchInitData 构建 context | `crud.ts`   | 307-313   |
| store.fetchInitData 调用 fetcher | `crud.ts`   | 320       |
| store.fetchInitData 解析响应     | `crud.ts`   | 359-402   |
| handleChangePage 分页变更        | `CRUD.tsx`  | 1665-1720 |
| handleSave 批量保存              | `CRUD.tsx`  | 1755-1881 |
| saveRemote 提交方法              | `crud.ts`   | 533-622   |
| responseAdaptor                  | `api.ts`    | 424-527   |
| normalizeApiResponseData         | `api.ts`    | 1024-1034 |
| wrapFetcher                      | `api.ts`    | 537-691   |
| CRUD2 getData                    | `CRUD2.tsx` | 719-820   |

### nop-chaos-flux 关键行

| 功能                     | 文件                                     | 行号    |
| ------------------------ | ---------------------------------------- | ------- |
| CRUD 渲染器主入口        | `crud-renderer.tsx`                      | 1-531   |
| CRUD Schema 定义         | `crud-schema.ts`                         | 1-238   |
| normalizeCrudSourceValue | `crud-renderer-state.ts`                 | 201-231 |
| 分页状态初始化           | `crud-renderer-state.ts`                 | 290-384 |
| CRUD 所有权路径定义      | `crud-renderer-ownership.ts`             | 48-65   |
| 行内编辑 dispatch        | `table-quick-edit-cell.tsx`              | 64-78   |
| DataSourceController     | `api-data-source-controller.ts`          | 29-155  |
| 作用域 store 创建        | `scope-store.ts`                         | —       |
| 架构设计文档             | `docs/architecture/api-data-source.md`   | 201-223 |
| 架构设计文档             | `docs/architecture/data-domain-owner.md` | 全篇    |
| 快速参考类型             | `docs/references/quick-reference.md`     | 600-635 |
| CRUD 设计文档            | `docs/components/crud/design.md`         | 全篇    |
