# 远程选项联动

> `select` 没有 `source` 字段；远程选项用 `data-source` 节点准备，再绑定到 `options`。`data-source` 的 `action` 是字符串，`args` 同级；`refreshSource` 的目标用顶层 `targetId`。

## 省市区级联

```json
[
  {
    "type": "data-source",
    "name": "provinces",
    "action": "ajax",
    "args": { "url": "/api/provinces" }
  },
  {
    "type": "select",
    "name": "province",
    "label": "省份",
    "options": "${provinces}",
    "onChange": { "action": "refreshSource", "targetId": "cities" }
  },
  {
    "type": "data-source",
    "name": "cities",
    "action": "ajax",
    "args": { "url": "/api/cities?province=${province}" },
    "sendOn": "province"
  },
  {
    "type": "select",
    "name": "city",
    "label": "城市",
    "options": "${cities}",
    "visible": "${province}"
  }
]
```

## 从上下文变量加载

```json
[
  {
    "type": "data-source",
    "name": "roleOptions",
    "action": "ajax",
    "args": { "url": "/api/roles" }
  },
  { "type": "select", "name": "role", "label": "角色", "options": "${roleOptions}" }
]
```

## 条件加载 + 多选

```json
[
  {
    "type": "data-source",
    "name": "permissions",
    "action": "ajax",
    "args": { "url": "/api/permissions?role=${role}" },
    "sendOn": "role"
  },
  {
    "type": "select",
    "name": "permissions",
    "label": "权限",
    "multiple": true,
    "options": "${permissions}",
    "visible": "${role}"
  }
]
```

**关键点**：`data-source` 节点通过 `sendOn` 控制是否发送请求；选项数据绑定到 select 的 `options`（非 `source`）；联动刷新上游数据源用 `refreshSource` + 顶层 `targetId`。
