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
- `name`、`multiple`、`accept`、`maxFiles`、`maxSize`、`uploadAction`、`deleteAction`、`valueMode`、`required`: `value`
- `onUploadSuccess`、`onUploadError`、`onReject`、`onDelete`、`onDeleteSuccess`、`onDeleteFail`: `event`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。
- 若后续需要自定义 trigger/empty 区，应通过有限命名 slot 明确化，而不是先开放任意 regions。

## 7. 运行期状态归属

- 字段值归最近表单或 owner scope。
- 上传中的局部 pending/result/error 属于该字段的局部交互与显式 tracked operation 协作结果。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onUploadSuccess`、`onUploadError`。
- 若后续需要，句柄可提供 `component:clear`、`component:focus`。

### 8.1 upload lifecycle 状态机契约（U1）

- 状态机：`pending → done | error`（`UploadItemState`，本地局部状态）。**无独立 `uploading` 状态——`pending` 兼任上传中态**（by design；UI 在 pending 时显示「Uploading」label）。这是刻意裁定，不引入冗余状态。
- **payload / 顺序契约**：
  - `pending`：文件选中后立即加入（`handleFiles` → `status:'pending'`），携带 `id`/`name`。
  - `done`：`uploadAction` 成功后转 `done`，携带 `item`（`UploadResultItem`，含 `url`/`name`/`size`）；触发 `onUploadSuccess`（payload `{ type:'upload-success', file:{name,size,type}, item }`）。
  - `error`：失败（action `!ok`/`cancelled` 除外）转 `error`，携带 `message`；触发 `onUploadError`（payload `{ type:'upload-error', file:{…}, error }`，error 来自 server `result.error.message` / thrown Error / 末路兜底 i18n，**非** hardcoded）。
- **form `onChange` 仅在 success 写值（刻意契约）**：字段值（`commitItems`）只在 `done` 时写回；`pending`/`error` **不**触发 form `onChange`、不污染字段值。这是刻意的「form 值保持干净」契约——失败的上传不留半值。无 `onChange`-at-pending（如需跟踪上传中态，用 `onUploadSuccess`/`onUploadError` 或 future tracked-operation surface，不在本契约）。

### 8.2 deleteAction 裁定（U5 — 已实现）

- **实现**（B7 successor plan）：`InputFileSchema` 新增 `deleteAction: ActionSchema` 字段。当用户点击已上传文件的移除按钮时，若声明了 `deleteAction`，renderer 先派发该 action（携带 `__deleteFile: { name, url, size }` scope），再本地移除。删除过程通过 `onDelete`/`onDeleteSuccess`/`onDeleteFail` 事件暴露生命周期。action 失败时文件仍从本地列表移除（本地优先），但事件通知调用方失败详情。

### 8.3 maxSize 客户端拒绝 裁定（U6 — 已实现）

- **实现**（B7 successor plan）：`InputFileSchema` 新增 `maxSize: number`（字节）字段。`handleFiles` 在文件进入 pending 前进行客户端 size 校验：超限文件被滤出上传队列，同时触发 `onReject` 事件（payload `{ file: { name, size, type }, reason }`）。超限文件不占用 `maxFiles` 配额。新增 `onReject`（拒绝回调）、`onDelete`/`onDeleteSuccess`/`onDeleteFail`（删除生命周期事件）。

### 8.4 upload 行为契约（U2 / U3 / U4）

- **onUploadError 带 server msg（U2）**：失败时 `result.error.message`（server 返回 `{data:{message}}`）/ thrown Error / 末路 i18n 兜底经 `toUploadError` 进入 error 项 `message` 与 `onUploadError` payload `error` 字段——**非** hardcoded。该 server 消息同时显于用户可见 error DOM。
- **successive append（U3）**：`multiple` 时每次成功 upload 经 `[...committedItems(), item]` 累积；`latestValueRef` 使并行/连续 upload 同步累积——连续选择（选 2 再 1）共得 3，不会覆盖。
- **merge existing + uploaded-vs-pending 区分（U4）**：`existingItems()` 读字段值、`committedItems()` 读 `latestValueRef`，新 upload 经 `[...committedItems(), item]` merge → init form data 已有文件列表 + 新增保留既有 uploaded。pending（局部 UI 态）与 done（字段值）分开追踪，互不污染。

## 9. 数据源、表达式、导入能力接入点

- 上传本身应走显式 action/source 路线，不把完整请求协议重新塞进字段 JSX。
- **W3d upload action 桥接裁定**：`uploadAction` 是 action 引用（schema 里以 `kind: 'prop'` 透传原始 ActionSchema）。renderer 在文件选择后通过 `props.helpers.dispatch(uploadAction, { scope })` 派发——派发用的子 scope 携带 `__uploadFile`（{ name, size, type }）与 `__uploadFileRef`（原始 File），由宿主 action（ajax 等）从 `ctx.scope` 读取并发起真正网络请求。renderer 不在挂载期发请求、不实现上传网络层（请求下沉约束）。action 结果（`ActionResult.data`，需含 `url`，可含 `name`/`size`）经 `valueMode`（url/object/array）归一化后写回字段值；失败触发 `onUploadError`、值不污染。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-file` marker。

## 11. 实现拆分建议

- 文件列表状态、上传动作桥接、值归一化分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是与 `input-image`、通用 action 上传器和复杂媒体工作台边界混乱。
