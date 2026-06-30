# 远程选项联动

## 省市区级联

```json
[
  {
    "type": "data-source",
    "name": "provinces",
    "action": { "action": "ajax", "args": { "url": "/api/provinces" } }
  },
  {
    "type": "select",
    "name": "province",
    "label": "省份",
    "source": "${provinces}",
    "onChange": {
      "action": "refreshSource",
      "args": { "targetId": "cities" }
    }
  },
  {
    "type": "data-source",
    "name": "cities",
    "action": { "action": "ajax", "args": { "url": "/api/cities?province=${province}" } },
    "sendOn": "${province}"
  },
  {
    "type": "select",
    "name": "city",
    "label": "城市",
    "source": "${cities}",
    "visible": "${province}"
  }
]
```

## 从 API 加载选项

```json
{
  "type": "select",
  "name": "product",
  "label": "商品",
  "source": "/api/products",
  "autoFill": { "price": "${price}", "unit": "${unit}" }
}
```

## 从上下文变量加载

```json
{
  "type": "data-source",
  "name": "roleOptions",
  "action": {"action": "ajax", "args": {"url": "/api/roles"}}
},
{
  "type": "select",
  "name": "role",
  "label": "角色",
  "source": "${roleOptions}"
}
```

## 条件加载

```json
{
  "type": "data-source",
  "name": "permissions",
  "action": {"action": "ajax", "args": {"url": "/api/permissions?role=${role}"}},
  "sendOn": "${role}"
},
{
  "type": "select",
  "name": "permissions",
  "label": "权限",
  "multiple": true,
  "source": "${permissions}",
  "visible": "${role}"
}
```

**关键点**：`data-source` 节点通过 `sendOn` 控制是否发送请求，通过 `source` prop 将数据绑定到选项控件。
