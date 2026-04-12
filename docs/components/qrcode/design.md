# QRCode 组件设计

## 1. 组件定位

- `qrcode` 是二维码展示 renderer。
- 它负责把一个值渲染为二维码，不承接扫描、支付流程或复杂码类型工作台。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `qrcode` / `qr-code`，但 Flux 只保留 canonical `qrcode` 名称。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'qrcode'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议正式字段为 `value`、`size`、`level`、`foreground`、`background`、`label`。

## 5. 字段分类

- `value`、`size`、`level`、`foreground`、`background`: `value`
- `label`: `value-or-region`

## 6. regions 与 slot 约定

- `label` 可作为二维码下方说明内容。

## 7. 运行期状态归属

- `qrcode` 无复杂 owner 状态。

## 8. 事件、动作与组件句柄能力

- 首版不要求专门事件或句柄。

## 9. 数据源、表达式、导入能力接入点

- `value` 可由表达式求值。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-qrcode` marker。

## 11. 实现拆分建议

- 二维码生成适配与可选标签壳分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是同时保留 `qrcode` 与 `qr-code` 两个 canonical type 名。
