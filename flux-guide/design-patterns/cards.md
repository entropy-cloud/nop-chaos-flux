# 卡片列表

## 基础卡片列表

```json
{
  "type": "cards",
  "source": "/api/products",
  "itemSchema": {
    "type": "card",
    "header": { "type": "text", "text": "${name}" },
    "body": [
      { "type": "image", "src": "${image}" },
      { "type": "text", "text": "${description}" },
      { "type": "text", "text": "价格: ¥${price}" }
    ],
    "footer": [{ "type": "button", "label": "购买", "level": "primary" }]
  }
}
```

## 带数据源的卡片

```json
{
  "type": "data-source",
  "name": "products",
  "action": {"action": "ajax", "args": {"url": "/api/products"}}
},
{
  "type": "cards",
  "source": "${products}",
  "itemSchema": {
    "type": "card",
    "header": {"type": "text", "text": "${item.name}"},
    "body": [
      {"type": "text", "text": "分类: ${item.category}"},
      {"type": "text", "text": "库存: ${item.stock}"}
    ]
  }
}
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
          "level": "primary",
          "onClick": {
            "action": "refreshSource",
            "args": { "targetId": "productList" }
          }
        }
      ]
    },
    {
      "type": "data-source",
      "name": "productList",
      "action": { "action": "ajax", "args": { "url": "/api/products?keyword=${keyword}" } }
    },
    {
      "type": "cards",
      "source": "${productList}",
      "itemSchema": {
        "type": "card",
        "header": { "type": "text", "text": "${item.name}" },
        "body": [{ "type": "text", "text": "${item.description}" }]
      }
    }
  ]
}
```

**关键点**：`cards` 是集合展示组件，通过 `source` 接收数据，通过 `itemSchema` 定义每张卡片的结构。
