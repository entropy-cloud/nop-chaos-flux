# Dialog 组件设计

## 1. 组件定位

- `dialog` 是模态对话框 renderer，用来承接标题、内容、操作区和打开关闭状态。
- 它是通用弹层容器，不应与具体业务表单或确认框混写为单独 type。

## 2. 与 AMIS 或既有产品的能力对照

- 当前代码库已有 `DialogHost` 和 `@nop-chaos/ui` Dialog primitive，但通用 `dialog` renderer 还未落位。
- 文档基线应优先围绕 title/body/actions/open-state 这些稳定能力，不急于覆盖全部历史 mode。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'dialog'`
- 预期归属 `@nop-chaos/flux-renderers-basic`
- 预期 regions: `title`、`body`、`actions`

## 4. schema 设计

- 正式字段建议为 `title`、`body`、`actions`、`open`、`defaultOpen`、`size`、`showCloseButton`、`closeOnOutsideClick`。
- 打开态命名应优先对齐 UI primitive 的 `open/defaultOpen`。

## 5. 字段分类

- `title`: `value-or-region`
- `body`、`actions`: `region`
- `open`、`defaultOpen`、`size`、`showCloseButton`: `value`
- `onOpen`、`onClose`: `event`

## 6. regions 与 slot 约定

- `title` 是头部标题区。
- `body` 是主要内容区。
- `actions` 是底部动作区。

## 7. 运行期状态归属

- 打开态应支持 `local`、`controlled` 或 page/dialog runtime 驱动。
- 对话框内部表单状态属于其子树的 form runtime，而不是 dialog 自身。

## 8. 事件、动作与组件句柄能力

- 推荐支持 `component:open`、`component:close`。
- `onOpen`、`onClose` 通过 action schema 触发。
- `example.json` 应同时展示 `onOpen` / `onClose` 的最小事件示例。

## 9. 数据源、表达式、导入能力接入点

- 标题和 body 内部内容支持表达式和 region 渲染。
- 打开前数据准备应由 action 或 loader 完成，不让 dialog 自己发明请求协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-dialog` marker。
- 视觉和可访问性交互复用 `@nop-chaos/ui` Dialog。

## 11. 实现拆分建议

- dialog shell、open-state bridge、host integration 和 actions footer 分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是与现有 dialog host 路径重复建模，需要先统一“页面级弹层管理”和“声明式 dialog renderer”的关系。
