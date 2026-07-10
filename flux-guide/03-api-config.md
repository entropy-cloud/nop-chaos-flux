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

## API 响应格式

```json
{"status": 0, "msg": "成功", "data": { ... }}
```

- `status: 0` → 成功；非 0 → 失败
- CRUD 的 data 必须是 `{"items": [...], "total": N}`
