# QR Code 二维码

```json
{
  "type": "qrcode",
  "value": "https://example.com",
  "size": 200,
  "level": "M"
}
```

### 自定义配色

```json
{
  "type": "qrcode",
  "value": "${product.link}",
  "size": 180,
  "foreground": "#1890ff",
  "background": "#ffffff",
  "level": "H"
}
```

### 二维码带标签

```json
{
  "type": "qrcode",
  "value": "${order.id}",
  "label": [{ "type": "text", "text": "扫码查看订单" }]
}
```

## 字段参考

| 字段          | 类型                       | 说明                         |
| ------------- | -------------------------- | ---------------------------- |
| `value`       | `SchemaValue`              | 编码内容（任何可序列化的值） |
| `size`        | `number`                   | 二维码像素尺寸（默认 128）   |
| `level`       | `'L' \| 'M' \| 'Q' \| 'H'` | 纠错级别（默认 M）           |
| `foreground`  | `string`                   | 前景色（hex，默认 #000000）  |
| `background`  | `string`                   | 背景色（hex，默认 #ffffff）  |
| `label`       | `SchemaInput`              | 底部标签（figcaption）       |
| `onLoadError` | `ActionSchema`             | 生成失败事件                 |
