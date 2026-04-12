# Input File 组件设计

## 1. 组件定位

- `input-file` 是文件上传字段 renderer。
- 它承接普通文件选择、上传状态展示与上传结果值写回，不替代图片专用上传或复杂媒体工作台。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-file`。
- Flux 正式契约应优先围绕值模型、上传动作和结果列表，而不是直接复制历史 uploader 实现细节。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-file'`
- 预期归属 `@nop-chaos/flux-renderers-form`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`multiple`、`accept`、`maxFiles`、`uploadAction`、`valueMode`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`multiple`、`accept`、`maxFiles`、`uploadAction`、`valueMode`、`required`: `value`
- `onUploadSuccess`、`onUploadError`: `event`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。
- 若后续需要自定义 trigger/empty 区，应通过有限命名 slot 明确化，而不是先开放任意 regions。

## 7. 运行期状态归属

- 字段值归最近表单或 owner scope。
- 上传中的局部 pending/result/error 属于该字段的局部交互与显式 tracked operation 协作结果。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onUploadSuccess`、`onUploadError`。
- 若后续需要，句柄可提供 `component:clear`、`component:focus`。

## 9. 数据源、表达式、导入能力接入点

- 上传本身应走显式 action/source 路线，不把完整请求协议重新塞进字段 JSX。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-file` marker。

## 11. 实现拆分建议

- 文件列表状态、上传动作桥接、值归一化分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是与 `input-image`、通用 action 上传器和复杂媒体工作台边界混乱。
