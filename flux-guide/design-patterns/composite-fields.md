# 复合字段 (Composite Fields)

> `object-field`、`variant-field`、`detail-field`、`detail-view` 是四种复合字段，用于编辑结构化对象值。它们共享 **projected scope**（投影作用域）模式：在父表单内创建子表单上下文，子字段的值组合成一个对象写回父表单。
>
> 所有字段定义见 `flux-types/schema.d.ts` 的 `ObjectFieldSchema`、`VariantFieldSchema`、`DetailFieldSchema`、`DetailViewSchema`。

---

## 1. ObjectField：对象子表单

将多个子字段组合成一个对象值。适用于地址、联系信息等结构化数据。

```jsonc
{
  "type": "form",
  "id": "profileForm",
  "submitAction": { "action": "ajax", "args": { "url": "/api/profile", "method": "post" } },
  "body": [
    { "type": "input-text", "name": "name", "label": "姓名", "required": true },
    {
      "type": "object-field",
      "name": "address",
      "label": "地址",
      "body": [
        { "type": "input-text", "name": "street", "label": "街道" },
        { "type": "input-text", "name": "city", "label": "城市", "required": true },
        { "type": "input-text", "name": "zip", "label": "邮编" },
      ],
    },
    {
      "type": "button",
      "label": "提交",
      "onClick": { "action": "component:submit", "componentId": "profileForm" },
    },
  ],
}
```

**提交数据结构**：

```json
{ "name": "张三", "address": { "street": "朝阳路1号", "city": "北京", "zip": "100000" } }
```

**值适配**：当后端数据格式与子表单不一致时，用 `transformInAction` / `transformOutAction` 转换。

假设后端返回 `contact` 为字符串（如 `"13800138000"`），需要拆分为 `phone` 和 `email` 子字段：

```jsonc
{
  "type": "object-field",
  "name": "contact",
  "label": "联系方式",
  "transformInAction": {
    "action": "setValue",
    "args": { "path": "contact.phone", "value": "${contact}" },
  },
  "body": [
    { "type": "input-text", "name": "phone", "label": "电话" },
    { "type": "input-email", "name": "email", "label": "邮箱" },
  ],
}
```

---

## 2. VariantField：多态字段

根据值类型切换不同编辑界面。适用于支付方式、通知渠道等多态场景。

```jsonc
{
  "type": "variant-field",
  "name": "paymentMethod",
  "label": "支付方式",
  "selectorMode": "tabs",
  "defaultVariant": "creditCard",
  "variants": [
    {
      "key": "creditCard",
      "label": "信用卡",
      "content": [
        { "type": "input-text", "name": "cardNumber", "label": "卡号", "required": true },
        { "type": "input-text", "name": "expiry", "label": "有效期", "required": true },
      ],
    },
    {
      "key": "bankTransfer",
      "label": "银行转账",
      "content": [
        { "type": "input-text", "name": "accountNumber", "label": "账号", "required": true },
        { "type": "input-text", "name": "routingNumber", "label": "路由号" },
      ],
    },
    {
      "key": "alipay",
      "label": "支付宝",
      "content": [
        { "type": "input-text", "name": "alipayId", "label": "支付宝账号", "required": true },
      ],
    },
  ],
}
```

**selectorMode**：`tabs`（标签页，默认）或 `select`（下拉选择）。

**值结构**：当前 variant 的子字段值直接作为对象值写回父表单。切换 variant 时，前一个 variant 的值被保留但不提交。

**动态检测**：用 `detectVariantAction` 根据值自动匹配 variant：

```jsonc
{
  "type": "variant-field",
  "name": "notifyChannel",
  "label": "通知渠道",
  "detectVariantAction": {
    "action": "setValue",
    "args": { "path": "notifyChannel", "value": "${notifyChannel.type || 'email'}" }
  },
  "variants": [ ... ]
}
```

---

## 3. DetailField：表单绑定的详情编辑

在表单内显示只读摘要，点击按钮打开弹窗编辑。编辑在 **draft form** 中进行，确认后写回父表单。

```jsonc
{
  "type": "form",
  "id": "orderForm",
  "body": [
    { "type": "input-text", "name": "orderNo", "label": "订单号" },
    {
      "type": "detail-field",
      "name": "shippingAddress",
      "label": "收货地址",
      "triggerLabel": "编辑地址",
      "surface": { "mode": "dialog", "title": "编辑收货地址" },
      "viewer": [
        {
          "type": "text",
          "text": "${shippingAddress.city} ${shippingAddress.street} ${shippingAddress.zip}",
        },
      ],
      "content": [
        { "type": "input-text", "name": "street", "label": "街道", "required": true },
        { "type": "input-text", "name": "city", "label": "城市", "required": true },
        { "type": "input-text", "name": "zip", "label": "邮编" },
      ],
    },
    {
      "type": "button",
      "label": "提交",
      "onClick": { "action": "component:submit", "componentId": "orderForm" },
    },
  ],
}
```

**工作流**：点击"编辑地址" → 弹窗打开 → draft form 编辑 → 确认写回 / 取消丢弃。

**surface 配置**：

| 字段    | 说明                        |
| ------- | --------------------------- |
| `mode`  | `dialog`（默认）或 `drawer` |
| `title` | 弹窗标题                    |
| `size`  | 弹窗大小                    |

---

## 4. DetailView：独立详情编辑

与 `detail-field` 类似，但不绑定父表单字段。从 `scopePath` 或静态 `data` 读取数据。

```jsonc
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "name": "serverInfo",
      "action": "ajax",
      "args": { "url": "/api/server" },
    },
    {
      "type": "detail-view",
      "scopePath": "serverInfo",
      "label": "服务器信息",
      "triggerLabel": "编辑",
      "surface": { "mode": "drawer", "title": "编辑服务器信息", "placement": "right" },
      "viewer": [
        { "type": "text", "text": "名称: ${serverInfo.name} | 状态: ${serverInfo.status}" },
      ],
      "content": [
        { "type": "input-text", "name": "name", "label": "名称" },
        {
          "type": "select",
          "name": "status",
          "label": "状态",
          "options": [
            { "label": "运行中", "value": "active" },
            { "label": "维护中", "value": "maintenance" },
          ],
        },
      ],
    },
  ],
}
```

**detail-field vs detail-view**：

| 特性      | detail-field            | detail-view                             |
| --------- | ----------------------- | --------------------------------------- |
| 表单绑定  | 需要 `name`，绑定父表单 | 不需要 `name`，用 `scopePath` 或 `data` |
| 验证类型  | `field` 级别            | `container` 级别                        |
| 使用场景  | 表单内嵌详情编辑        | 页面级独立详情编辑                      |
| 确认/取消 | 写回父表单字段          | 更新 scope 或 data                      |

---

## 共享能力

四种复合字段都支持：

- **`transformInAction`**：值进入编辑界面时的转换（raw → draft）
- **`transformOutAction`**：编辑确认时的转换（draft → committed）
- **`validateValueAction`**：自定义校验逻辑

```jsonc
{
  "type": "object-field",
  "name": "dateRange",
  "label": "日期范围",
  "transformInAction": {
    "action": "setValue",
    "args": {
      "path": "dateRange",
      "value": { "start": "${dateRange[0]}", "end": "${dateRange[1]}" },
    },
  },
  "transformOutAction": {
    "action": "setValue",
    "args": { "path": "dateRange", "value": ["${dateRange.start}", "${dateRange.end}"] },
  },
  "body": [
    { "type": "input-date", "name": "start", "label": "开始日期" },
    { "type": "input-date", "name": "end", "label": "结束日期" },
  ],
}
```
