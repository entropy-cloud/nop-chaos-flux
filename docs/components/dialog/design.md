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

- 正式字段建议为 `title`、`body`、`actions`、`data`、`open`、`defaultOpen`、`size`、`showCloseButton`、`closeOnOutsideClick`、`statusPath`。
- 打开态命名应优先对齐 UI primitive 的 `open/defaultOpen`。
- `data` 若存在，其语义应与 `page` / `form` 保持一致：初始化 dialog own scope patch，而不是第二套局部 props 系统。

## 5. 字段分类

- `title`: `value-or-region`
- `body`、`actions`: `region`
- `data`: `value`
- `open`、`defaultOpen`、`size`、`showCloseButton`: `value`
- `onOpen`、`onClose`: `event`

## 6. regions 与 slot 约定

- `title` 是头部标题区。
- `body` 是主要内容区。
- `actions` 是底部动作区。

## 7. 运行期状态归属

- 打开态应支持 `local`、`controlled` 或 page/dialog runtime 驱动。
- 对话框内部表单状态属于其子树的 form runtime，而不是 dialog 自身。
- dialog 自己拥有的是 surface state，例如 `open` / `active` / `opening` / `closing`。
- 如果后续引入 confirm/commit 语义，那是叠加在 surface 之上的 semantic lifecycle，不应与 open-state 混成一份模糊状态。
- dialog 外部若需要读取其状态，应通过 `statusPath` 读取只读 summary DTO，而不是通过 page 或 id/name 做隐式查询。
- 如果未来确认 subtree-local authoring 频繁需要读取当前弹层状态，优先考虑共享 `$surface`，而不是单独发明 `$dialog`。
- 共享 surface owner 规则以 `docs/architecture/surface-owner.md` 为准。

## 8. 事件、动作与组件句柄能力

- 推荐支持 `component:open`、`component:close`。
- `onOpen`、`onClose` 通过 action schema 触发。
- `example.json` 应同时展示 `onOpen` / `onClose` 的最小事件示例。
- `component:open` / `component:close` 解决的是 surface control，不应替代 dialog 内 form 的 `component:submit` 或其他更具体 semantic owner 入口。

## 9. 数据源、表达式、导入能力接入点

- 标题和 body 内部内容支持表达式和 region 渲染。
- `data` 初始化 dialog own scope；dialog subtree 默认仍按普通 lexical scope 规则继承父级，除非某个更窄 fragment 显式 `isolate`。
- 打开前数据准备应由 action 或 loader 完成，不让 dialog 自己发明请求协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-dialog` marker。
- 视觉和可访问性交互复用 `@nop-chaos/ui` Dialog。

## 11. 实现拆分建议

- dialog shell、open-state bridge、host integration 和 actions footer 分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是与现有 dialog host 路径重复建模，需要先统一“页面级弹层管理”和“声明式 dialog renderer”的关系。
