# Input Image 组件设计

## 1. 组件定位

- `input-image` 是图片上传字段 renderer。
- 它在 `input-file` 的上传基线上增加图片预览、尺寸与裁剪类能力，但仍保持字段 owner 语义。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-image`。
- Flux 应把图片上传与预览 contract 保持在字段层，不把富媒体编辑工作台能力直接混入首版 owner。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-image'`
- 归属 `@nop-chaos/flux-renderers-form-advanced`（roadmap 权威包分配；与 `input-file`/`editor` 同属 form-advanced 复合字段层）

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`multiple`、`accept`、`uploadAction`、`previewMode`、`crop`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`multiple`、`accept`、`uploadAction`、`previewMode`、`crop`、`required`: `value`
- `onUploadSuccess`、`onUploadError`: `event`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。

## 7. 运行期状态归属

- 字段值归最近表单或 owner scope。
- 图片预览、裁剪弹层、上传 pending 等属于字段局部交互状态。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onUploadSuccess`、`onUploadError`。

## 9. 数据源、表达式、导入能力接入点

- 上传流程继续走显式 action/source 路线。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-image` marker。

## 11. 实现拆分建议

- 上传桥接、预览壳、裁剪扩展点、值归一化分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是和纯展示型 `image` 及更复杂媒体编辑场景重叠。
