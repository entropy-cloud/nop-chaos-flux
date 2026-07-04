# 卡片列表

> `cards` 用 `items`（表达式绑定数据）+ `card`（每张卡片模板 region，运行在 item/index 作用域）。**没有** `source`/`itemSchema` 字段。数据由 `data-source` 节点准备。

## 基础卡片列表

```json
[
  { "type": "data-source", "name": "products", "action": "ajax", "args": { "url": "/api/products" } },
  {
    "type": "cards",
    "items": "${products}",
    "card": {
      "type": "card",
      "header": { "type": "text", "text": "${$slot.item.name}" },
      "body": [
        { "type": "image", "src": "${$slot.item.image}" },
        { "type": "text", "text": "${$slot.item.description}" },
        { "type": "text", "text": "价格: ¥${$slot.item.price}" }
      ],
      "footer": [{ "type": "button", "label": "购买", "variant": "default" }]
    }
  }
]
```

## 带搜索的卡片列表

```json
{
  "type": "page",
  "body": [
    {
      "type": "form",
      "id": "searchForm",
      "body": [
        { "type": "input-text", "name": "keyword", "label": "搜索" },
        {
          "type": "button",
          "label": "搜索",
          "variant": "default",
          "onClick": { "action": "refreshSource", "targetId": "productList" }
        }
      ]
    },
    {
      "type": "data-source",
      "name": "productList",
      "action": "ajax",
      "args": { "url": "/api/products?keyword=${keyword}" }
    },
    {
      "type": "cards",
      "items": "${productList}",
      "card": {
        "type": "card",
        "header": { "type": "text", "text": "${$slot.item.name}" },
        "body": [{ "type": "text", "text": "${$slot.item.description}" }]
      }
    }
  ]
}
```

**关键点**：`cards` 经 `items` 接收集合数据，`card` 定义每张卡片结构（region 参数 `item`/`index`，绑定用 `${$slot.item.xxx}`）。请求下沉到 `data-source` 节点。
