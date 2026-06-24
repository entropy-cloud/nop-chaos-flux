# Input File 组件设计

## 1. 组件定位

- `input-file` 是文件上传字段 renderer。
- 它承接普通文件选择、上传状态展示与上传结果值写回，不替代图片专用上传或复杂媒体工作台。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-file`。
- Flux 正式契约应优先围绕值模型、上传动作和结果列表，而不是直接复制历史 uploader 实现细节。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-file'`
- 归属 `@nop-chaos/flux-renderers-form-advanced`（roadmap 权威包分配；与 `editor` 同属 form-advanced 复合字段层）

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
- **W3d upload action 桥接裁定**：`uploadAction` 是 action 引用（schema 里以 `kind: 'prop'` 透传原始 ActionSchema）。renderer 在文件选择后通过 `props.helpers.dispatch(uploadAction, { scope })` 派发——派发用的子 scope 携带 `__uploadFile`（{ name, size, type }）与 `__uploadFileRef`（原始 File），由宿主 action（ajax 等）从 `ctx.scope` 读取并发起真正网络请求。renderer 不在挂载期发请求、不实现上传网络层（请求下沉约束）。action 结果（`ActionResult.data`，需含 `url`，可含 `name`/`size`）经 `valueMode`（url/object/array）归一化后写回字段值；失败触发 `onUploadError`、值不污染。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-file` marker。

## 11. 实现拆分建议

- 文件列表状态、上传动作桥接、值归一化分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是与 `input-image`、通用 action 上传器和复杂媒体工作台边界混乱。
