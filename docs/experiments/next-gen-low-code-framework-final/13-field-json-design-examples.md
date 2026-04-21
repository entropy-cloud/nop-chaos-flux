# 13 Field JSON Design Examples

## 1. 目标

本文给出 `object-field`、`variant-field`、`array-field` 的具体 JSON 设计示例。

这些示例是 clean-slate 设计下的 authoring 形态，不要求与当前实现完全兼容。

## 2. 共同原则

1. `object-field`、`variant-field`、`array-field` 默认不是新的 owner family。
2. 它们默认写入父 owner 的 canonical value path。
3. staged edit 明确通过 `detail-view` 或 `editable-staged` 创建 draft owner，不靠字段自身暗中变 owner。
4. 结构字段只描述值语义、子字段结构、参与策略和显示行为，不直接暴露 runtime store/controller 概念。
5. `variant-field` 的 `inactiveBranchPolicy` 在 authoring 层必须显式声明；编译器可以在 normalize 阶段补默认值，但不应让最终 authoring contract 依赖隐式猜测。

---

## 3. `object-field`

## 3.1 最小示例

```json
{
  "type": "object-field",
  "name": "customer",
  "label": "Customer",
  "fields": [
    {
      "type": "input-text",
      "name": "name",
      "label": "Name",
      "required": true
    },
    {
      "type": "input-text",
      "name": "phone",
      "label": "Phone"
    },
    {
      "type": "input-text",
      "name": "email",
      "label": "Email",
      "validations": [
        {
          "rule": "email"
        }
      ]
    }
  ]
}
```

语义：

1. 字段相对 `customer` 根绑定。
2. 子字段路径分别是 `customer.name`、`customer.phone`、`customer.email`。
3. 不创建独立 owner。

## 3.2 带对象级验证

```json
{
  "type": "object-field",
  "name": "contact",
  "label": "Contact",
  "fields": [
    {
      "type": "input-text",
      "name": "phone",
      "label": "Phone"
    },
    {
      "type": "input-text",
      "name": "email",
      "label": "Email"
    }
  ],
  "validations": [
    {
      "rule": "atLeastOne",
      "args": {
        "paths": ["phone", "email"]
      },
      "message": "Phone or email is required"
    }
  ]
}
```

语义：

1. 对象级错误挂在 `contact` 根路径。
2. 子字段错误仍挂在各自字段路径。

## 3.3 带 `detail-view` 的 staged 编辑

```json
{
  "type": "object-field",
  "name": "shippingAddress",
  "label": "Shipping Address",
  "display": "summary-card",
  "editMode": "detail-view",
  "detailView": {
    "surface": "dialog",
    "title": "Edit Shipping Address",
    "fields": [
      {
        "type": "input-text",
        "name": "province",
        "label": "Province",
        "required": true
      },
      {
        "type": "input-text",
        "name": "city",
        "label": "City",
        "required": true
      },
      {
        "type": "textarea",
        "name": "street",
        "label": "Street",
        "required": true
      }
    ],
    "transformOut": {
      "mode": "merge",
      "type": "object",
      "fields": {
        "province": "${province}",
        "city": "${city}",
        "street": "${street}",
        "fullText": "${province} ${city} ${street}"
      }
    }
  }
}
```

语义：

1. `detailView` 打开时创建 draft owner。
2. confirm 顺序是 `validate -> transformOut -> commit -> parent revalidate`。
3. `mode: merge` 表示只覆盖 transformOut 明确产出的字段，其余未编辑字段继续保留在原 canonical object 上。

---

## 4. `variant-field`

## 4.1 最小分支示例

```json
{
  "type": "variant-field",
  "name": "paymentMethod",
  "label": "Payment Method",
  "discriminator": "type",
  "inactiveBranchPolicy": "drop",
  "branches": [
    {
      "value": "bank",
      "label": "Bank Transfer",
      "fields": [
        {
          "type": "input-text",
          "name": "bankName",
          "label": "Bank Name",
          "required": true
        },
        {
          "type": "input-text",
          "name": "accountNo",
          "label": "Account No",
          "required": true
        }
      ]
    },
    {
      "value": "card",
      "label": "Bank Card",
      "fields": [
        {
          "type": "input-text",
          "name": "cardNo",
          "label": "Card No",
          "required": true
        },
        {
          "type": "input-text",
          "name": "holderName",
          "label": "Holder Name",
          "required": true
        }
      ]
    }
  ]
}
```

语义：

1. canonical value 根路径是 `paymentMethod`。
2. active branch 由 `paymentMethod.type` 决定。
3. inactive branch 默认不参与 active validation。

## 4.1.1 `drop` 策略语义

1. branch 切换后，inactive branch 的 field state 与错误清理。
2. inactive branch 专属值从 active materialization 结果中移除。
3. 对 canonical path 立即 revalidate。

## 4.2 带 inactive branch policy

```json
{
  "type": "variant-field",
  "name": "invoiceReceiver",
  "label": "Invoice Receiver",
  "discriminator": "kind",
  "inactiveBranchPolicy": "preserve",
  "branches": [
    {
      "value": "person",
      "label": "Person",
      "fields": [
        {
          "type": "input-text",
          "name": "personName",
          "label": "Person Name",
          "required": true
        },
        {
          "type": "input-text",
          "name": "idNo",
          "label": "ID No"
        }
      ]
    },
    {
      "value": "company",
      "label": "Company",
      "fields": [
        {
          "type": "input-text",
          "name": "companyName",
          "label": "Company Name",
          "required": true
        },
        {
          "type": "input-text",
          "name": "taxCode",
          "label": "Tax Code",
          "required": true
        }
      ]
    }
  ]
}
```

语义：

1. `preserve` 表示 inactive branch 的值继续保留在同一 canonical value path 下，但不参与 active branch materialization。
2. inactive branch 的 field state 进入 inactive bucket，不参与 active presentation 和 active validation。
3. 切回原分支时可以恢复。

## 4.3 `project` 策略示例

```json
{
  "type": "variant-field",
  "name": "identity",
  "label": "Identity",
  "discriminator": "mode",
  "inactiveBranchPolicy": "project",
  "projection": {
    "canonicalFields": ["displayName"],
    "map": {
      "displayName": "${displayName}"
    }
  },
  "branches": [
    {
      "value": "simple",
      "fields": [
        {
          "type": "input-text",
          "name": "displayName",
          "label": "Display Name",
          "required": true
        }
      ]
    },
    {
      "value": "enterprise",
      "fields": [
        {
          "type": "input-text",
          "name": "displayName",
          "label": "Display Name",
          "required": true
        },
        {
          "type": "input-text",
          "name": "registrationNo",
          "label": "Registration No",
          "required": true
        }
      ]
    }
  ]
}
```

语义：

1. active branch 的公共字段投影回 canonical shape。
2. 分支切换后对 canonical path 立即 revalidate。
3. `project` 不依赖“同名字段自动猜测”，而依赖显式 `projection` 契约。

## 4.4 带分支级规则

```json
{
  "type": "variant-field",
  "name": "delivery",
  "label": "Delivery",
  "discriminator": "type",
  "inactiveBranchPolicy": "drop",
  "branches": [
    {
      "value": "self-pickup",
      "fields": [
        {
          "type": "input-text",
          "name": "pickupStoreId",
          "label": "Pickup Store",
          "required": true
        }
      ]
    },
    {
      "value": "express",
      "fields": [
        {
          "type": "input-text",
          "name": "receiverName",
          "label": "Receiver",
          "required": true
        },
        {
          "type": "input-text",
          "name": "phone",
          "label": "Phone",
          "required": true
        }
      ],
      "validations": [
        {
          "rule": "requiredTogether",
          "args": {
            "paths": ["receiverName", "phone"]
          }
        }
      ]
    }
  ]
}
```

---

## 5. `array-field`

## 5.1 最小对象数组

```json
{
  "type": "array-field",
  "name": "contacts",
  "label": "Contacts",
  "itemKey": "id",
  "item": {
    "type": "object-field",
    "fields": [
      {
        "type": "input-text",
        "name": "name",
        "label": "Name",
        "required": true
      },
      {
        "type": "input-text",
        "name": "phone",
        "label": "Phone"
      },
      {
        "type": "input-text",
        "name": "email",
        "label": "Email"
      }
    ]
  }
}
```

语义：

1. 值地址按 index，如 `contacts.0.name`。
2. runtime identity 优先按 `itemKey = id`。
3. reorder 时 field state 按 item identity 迁移。

## 5.2 带数组级验证

```json
{
  "type": "array-field",
  "name": "approvers",
  "label": "Approvers",
  "itemKey": "userId",
  "item": {
    "type": "object-field",
    "fields": [
      {
        "type": "input-text",
        "name": "userId",
        "label": "User ID",
        "required": true
      },
      {
        "type": "input-text",
        "name": "userName",
        "label": "User Name",
        "required": true
      }
    ]
  },
  "validations": [
    {
      "rule": "minItems",
      "args": {
        "value": 1
      }
    },
    {
      "rule": "uniqueBy",
      "args": {
        "path": "userId"
      },
      "message": "Approver must be unique"
    }
  ]
}
```

语义：

1. `uniqueBy(userId)` 是数组级规则。
2. 错误挂在 `approvers` 根路径，而不是单个叶子字段。

## 5.3 带 inline 编辑模式

```json
{
  "type": "array-field",
  "name": "items",
  "label": "Order Items",
  "itemKey": "lineId",
  "view": {
    "type": "table",
    "mode": "editable-inline",
    "columns": [
      {
        "field": "sku",
        "label": "SKU"
      },
      {
        "field": "qty",
        "label": "Qty"
      }
    ]
  },
  "item": {
    "type": "object-field",
    "fields": [
      {
        "type": "input-text",
        "name": "sku"
      },
      {
        "type": "input-number",
        "name": "qty"
      }
    ]
  }
}
```

语义：

1. `editable-inline` 直接写父 owner。
2. table `columns[].field` 只引用 `item.fields` 的 canonical schema，不重复定义第二套 editor schema。
3. 击键级默认只做 leaf path + local closure 验证，不做全表 `validateAll('change')`。

## 5.4 带 staged 行编辑模式

```json
{
  "type": "array-field",
  "name": "products",
  "label": "Products",
  "itemKey": "id",
  "view": {
    "type": "table",
    "mode": "editable-staged",
    "rowEditor": {
      "surface": "drawer",
      "title": "Edit Product",
      "useItemSchema": true,
      "transformOut": {
        "mode": "merge",
        "type": "object",
        "fields": {
          "id": "${id}",
          "name": "${name}",
          "price": "${price}",
          "summary": "${name} / ${price}"
        }
      }
    }
  },
  "item": {
    "type": "object-field",
    "fields": [
      {
        "type": "input-text",
        "name": "name"
      },
      {
        "type": "input-number",
        "name": "price"
      }
    ]
  }
}
```

语义：

1. 每次行编辑创建 row draft owner。
2. confirm 时先本地 validate，再 `transformOut`，再写回 parent owner。
3. `useItemSchema: true` 表示 rowEditor 复用 `item` 的 canonical schema，而不是发明第二套字段定义。

## 5.4.1 无 `itemKey` 的退化示例

```json
{
  "type": "array-field",
  "name": "tags",
  "label": "Tags",
  "item": {
    "type": "input-text",
    "name": "$value",
    "label": "Tag",
    "required": true
  }
}
```

语义：

1. 这是标量数组示例。
2. 无 `itemKey` 时退化到 index 语义。
3. reorder/remove continuity 风险必须进入 diagnostics。

## 5.4.2 reorder/remove 场景示例

```json
{
  "type": "array-field",
  "name": "members",
  "label": "Members",
  "itemKey": "memberId",
  "allowReorder": true,
  "allowRemove": true,
  "item": {
    "type": "object-field",
    "fields": [
      {
        "type": "input-text",
        "name": "memberId",
        "label": "Member ID",
        "required": true
      },
      {
        "type": "input-text",
        "name": "memberName",
        "label": "Member Name",
        "required": true
      }
    ]
  }
}
```

语义：

1. reorder 时 field state 按 `memberId` 迁移。
2. remove 时被删除行的 async validation run 必须 `cancelled` 或 `stale-dropped`。

## 5.5 带 item factory

```json
{
  "type": "array-field",
  "name": "attachments",
  "label": "Attachments",
  "itemKey": "id",
  "createItem": {
    "type": "object",
    "fields": {
      "id": "${uuid()}",
      "name": "",
      "url": "",
      "kind": "file"
    }
  },
  "item": {
    "type": "object-field",
    "fields": [
      {
        "type": "input-text",
        "name": "name",
        "label": "Name",
        "required": true
      },
      {
        "type": "input-text",
        "name": "url",
        "label": "URL",
        "required": true
      }
    ]
  }
}
```

---

## 6. 三者嵌套组合示例

下面这个例子同时包含 `object-field` + `variant-field` + `array-field`：

```json
{
  "type": "object-field",
  "name": "order",
  "label": "Order",
  "fields": [
    {
      "type": "variant-field",
      "name": "invoice",
      "label": "Invoice",
      "discriminator": "type",
      "inactiveBranchPolicy": "preserve",
      "branches": [
        {
          "value": "none",
          "label": "No Invoice",
          "fields": []
        },
        {
          "value": "company",
          "label": "Company Invoice",
          "fields": [
            {
              "type": "input-text",
              "name": "title",
              "label": "Title",
              "required": true
            },
            {
              "type": "input-text",
              "name": "taxCode",
              "label": "Tax Code",
              "required": true
            }
          ]
        }
      ]
    },
    {
      "type": "array-field",
      "name": "lines",
      "label": "Lines",
      "itemKey": "lineId",
      "item": {
        "type": "object-field",
        "fields": [
          {
            "type": "input-text",
            "name": "sku",
            "label": "SKU",
            "required": true
          },
          {
            "type": "input-number",
            "name": "qty",
            "label": "Qty",
            "required": true,
            "min": 1
          }
        ]
      },
      "validations": [
        {
          "rule": "minItems",
          "args": {
            "value": 1
          }
        }
      ]
    }
  ]
}
```

---

## 7. 设计决定总结

### `object-field`

1. 是值结构边界，不是 owner 边界。
2. 支持对象级规则。
3. staged 编辑通过 `detailView` 明确声明。

### `variant-field`

1. 必须显式 `discriminator`。
2. 必须显式 `inactiveBranchPolicy`。
3. `project` 必须显式声明 projection 契约，不依赖同名字段猜测。
4. 分支切换后 validation participation 有固定规则。

### `array-field`

1. 值地址按 index，runtime identity 按 `itemKey`。
2. 支持数组级规则和 staged 行编辑。
3. 不允许把 index-only 心智作为唯一 identity 模型。
