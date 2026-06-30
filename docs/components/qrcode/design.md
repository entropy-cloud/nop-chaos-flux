# QRCode 组件设计

## 1. 组件定位

- `qrcode` 是二维码展示 renderer。
- 它负责把一个值渲染为二维码，不承接扫描、支付流程或复杂码类型工作台。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `qrcode` / `qr-code`，但 Flux 只保留 canonical `qrcode` 名称（`qr-code` 不保留为独立 type，见 amis-baseline-matrix）。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'qrcode'`
- 归属 `@nop-chaos/flux-renderers-content`（roadmap 权威包分配；组件重组后从 basic 拆出）
- QR 生成库：引入轻量 MIT 库 `qrcode`（canvas 输出，单一 canonical 名 `qrcode`）

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

- `onLoadError`：二维码生成失败时触发（payload 过大/颜色非法等），与 image/audio/video 家族对齐；触发后维持 failed UI（失败占位）。早期 schema 缺该事件，作者挂的 `onLoadError` 被静默忽略——已补齐（见 `docs/plans/2026-06-25-0510-2-new-package-advertised-contract-and-lifecycle-honesty-plan.md` WS-B）。
- 生成失败的诊断 `console.warn` 属另一计划（C-22），与本事件同处 catch、互不冲突。

## 9. 数据源、表达式、导入能力接入点

- `value` 可由表达式求值。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-qrcode` marker。

## 11. 实现拆分建议

- 二维码生成适配与可选标签壳分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是同时保留 `qrcode` 与 `qr-code` 两个 canonical type 名。
