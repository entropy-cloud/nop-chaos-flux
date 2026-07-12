# API 配置

> Flux **没有**组件级顶层 `api` 字段（那是 amis 简写）。请求一律经 `ajax` action，API 配置作为 action 的 `args`（`ApiSchema`）。下列配置对象就是 `ajax` action 的 `args` 内容。

---

## 作为 action args

```json
{ "action": "ajax", "args": "/api/users" }
{ "action": "ajax", "args": "post:/api/save" }
{ "action": "ajax", "args": { "url": "/api/save", "method": "post", "data": { "name": "${name}" } } }
```

## 完整字段 (看 `ApiSchema` / `ApiSchemaObject`)

```json
{
  "url": "/api/save",
  "method": "post",
  "data": { "name": "${name}" },
  "headers": { "Authorization": "Bearer ${token}" },
  "includeScope": ["userId", "token"],
  "params": { "page": "${page}" },
  "responseAdaptor": "return { ...payload, data: payload.data.list }",
  "requestAdaptor": "api.data.timestamp = Date.now(); return api;"
}
```

## includeScope：向请求注入当前 scope 数据

`includeScope` 将当前 scope 中指定字段的值自动合并到请求参数中，避免手动拼接。

```json
// 只注入指定字段
{ "url": "/api/users", "includeScope": ["userId", "token"] }

// 注入所有字段
{ "url": "/api/profile", "includeScope": "*" }
```

> 当 CRUD 的 `source` 消费 data-source 时，data-source 的 `includeScope` 会自动携带 CRUD 查询表单的筛选参数。

## responseAdaptor：转换响应数据

`responseAdaptor` 是一段运行时表达式，接收 `payload`（原始响应体）和 `api`（请求配置），需 `return` 最终数据。

```jsonc
// 后端返回 { code: 0, result: { list: [...], total: 100 } }
// 前端需要 { items: [...], total: 100 }
{
  "url": "/api/users",
  "responseAdaptor": "return { items: payload.result.list, total: payload.result.total }"
}

// 提取嵌套字段
{
  "url": "/api/detail",
  "responseAdaptor": "return payload.data"
}
```

## requestAdaptor：修改请求数据

`requestAdaptor` 在发送前修改请求配置，接收 `api`（请求配置对象），需 `return` 修改后的 `api`。

```jsonc
// 添加时间戳
{
  "url": "/api/log",
  "requestAdaptor": "api.data.timestamp = Date.now(); return api;"
}

// 添加自定义 header
{
  "url": "/api/secure",
  "requestAdaptor": "api.headers['X-Custom'] = 'value'; return api;"
}
```

## 错误处理

ajax action 支持 `onError` 分支处理请求失败：

```jsonc
{
  "action": "ajax",
  "args": { "url": "/api/save", "method": "post" },
  "onError": {
    "action": "showToast",
    "args": { "level": "error", "message": "${error.message}" },
  },
}
```

## 自动 Toast 反馈

通过 `messages` 配置自动显示成功/失败 Toast，无需手动写 `then`/`onError`：

```jsonc
{
  "action": "ajax",
  "args": { "url": "/api/save", "method": "post" },
  "messages": { "success": "保存成功", "failed": "保存失败" },
}
```

## 重试与防抖

```jsonc
{
  "action": "ajax",
  "args": { "url": "/api/save", "method": "post" },
  "control": {
    "retry": { "times": 3, "delay": 1000, "strategy": "exponential" },
    "debounce": 300,
    "dedup": "cancel-previous",
  },
}
```

| 字段             | 说明                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| `retry.times`    | 重试次数                                                                 |
| `retry.delay`    | 重试间隔（ms）                                                           |
| `retry.strategy` | `fixed` 固定间隔 / `exponential` 指数退避                                |
| `debounce`       | 防抖时间（ms）                                                           |
| `dedup`          | `cancel-previous` 取消前一个 / `parallel` 并行 / `ignore-new` 忽略新请求 |

## API 响应格式

```json
{"status": 0, "msg": "成功", "data": { ... }}
```

- `status: 0` → 成功；非 0 → 失败
- CRUD 的 data 必须是 `{"items": [...], "total": N}`

## selection：服务端字段投影

`args` 里的 `selection` 是一个**逗号分隔的字段名串**，约定由后端按此清单裁剪返回字段（类似 GraphQL 的字段选择）。常用于列表/详情接口避免拉回大字段。

```jsonc
// 列表只取需要的几列
{ "url": "/api/users", "method": "get", "selection": "id,name,email,status,status_label,createTime" }

// 详情按 id 取 + 字段投影
{ "url": "/api/users/get", "method": "get", "data": { "id": "${id}" }, "selection": "id,name,email,role" }
```

> `selection` 是约定字段，需后端配合解析；它出现在请求参数里，由宿主/后端决定如何投影。`*_label` 这类带后缀的字段通常是后端把码值 join 成可读文本后返回的"展示字段"。
