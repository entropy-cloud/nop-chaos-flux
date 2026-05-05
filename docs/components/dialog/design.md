# Dialog 组件设计

## 1. 组件定位

- `dialog` 是模态对话框 renderer，用来承接标题、内容、操作区和打开关闭状态。
- 它是通用弹层容器，不应与具体业务表单或确认框混写为单独 type。
- 从长期架构看，`dialog` 属于 surface family 的一种 public DSL authoring 形式，而不是独立 runtime family。

## 2. 与 AMIS 或既有产品的能力对照

- 当前代码库已具备 declarative `dialog` renderer、surface host/runtime 路径和 `@nop-chaos/ui` Dialog primitive。
- 长期基线应把 declarative dialog 与 built-in `openDialog` 打开的 dialog 收敛成同一 surface family runtime，而不是保留两套生命周期。
- 文档基线应优先围绕 title/body/actions/open-state 这些稳定能力，不急于覆盖全部历史 mode。

## 3. Flux 中的 renderer/type 定义

- 当前 `type: 'dialog'`
- 当前归属 `@nop-chaos/flux-renderers-basic`
- 当前 regions: `title`、`body`、`actions`
- 内部 runtime 归属 surface family，由 `docs/architecture/surface-owner.md` 统一定义

## 4. schema 设计

- 当前与长期共同保留的基础字段为 `title`、`body`、`actions`、`open`、`defaultOpen`、`closeOnOutsideClick`、`container`、`showMask`、`statusPath`、`data`。
- `data` 的语义是初始化 dialog own child scope patch，而不是第二套局部 props 系统。
- `open` / `defaultOpen` 继续作为 public DSL 的最小打开态接口。
- 如果未来需要把打开轴正式外置到 scope/host，命名应沿用 surface family 语言，例如 `openOwnership` / `openStatePath`，而不是再为 dialog 发明私有命名。
- `size`、`showCloseButton` 仍可作为后续扩展候选，但当前不应误写成已经稳定落地的基础 contract。

Current live implementation note:

- 通用 declarative `type: 'dialog'` renderer 已落位，并已接入 shared `SurfaceRuntime` / root host stack。
- declarative `dialog` 现在和 built-in `openDialog` 一样注册为 `SurfaceEntry`、创建 runtime-owned child scope、共享 close/status publication/validation-owner 规则。

## 5. 字段分类

- `title`: `value-or-region`
- `body`、`actions`: `region`
- `open`、`defaultOpen`、`closeOnOutsideClick`、`container`、`showMask`、`statusPath`、`data`: `value`
- `onOpen`、`onClose`: `event`

## 6. regions 与 slot 约定

- `title` 是头部标题区。
- `body` 是主要内容区。
- `actions` 是底部动作区。

## 7. 运行期状态归属

- 打开态应支持 `local`、`controlled`、`scope` 或 host 驱动。
- dialog 自己拥有的是 surface state，例如 `open` / `active` / `opening` / `closing`。
- 对话框内部表单状态属于其子树的 form runtime，而不是 dialog 自身。
- dialog 不应复用 page store 作为自己的 owner store；它应使用 surface family 共用的 `SurfaceRuntime` / `SurfaceStore`。
- drawer 与 dialog 属于同一 surface family，应共享同一种 runtime/store 结构，只通过 surface kind 区分具体表面类型。
- 如果后续引入 confirm/commit 语义，那是叠加在 surface 之上的 semantic lifecycle，不应与 open-state 混成一份模糊状态。
- dialog 外部若需要读取其状态，应通过 `statusPath` 读取只读 summary DTO，而不是通过 page 或 id/name 做隐式查询。
- 如果未来确认 subtree-local authoring 频繁需要读取当前弹层状态，优先考虑共享 `$surface`，而不是单独发明 `$dialog`。
- 共享 surface owner 规则以 `docs/architecture/surface-owner.md` 为准。

统一基线说明：

- declarative `dialog` 与 built-in `openDialog` 打开的 dialog 都应注册为 `SurfaceEntry`
- 都应进入同一个 root surface host stack
- 都应使用同一套 focus、dismiss、child scope、status publication 规则

## 8. 事件、动作与组件句柄能力

- 推荐支持 `component:open`、`component:close`，可选支持 `component:toggle`。
- `onOpen`、`onClose` 通过 action schema 触发。
- `example.json` 应同时展示 `onOpen` / `onClose` 的最小事件示例。
- `component:open` / `component:close` 解决的是 surface control，不应替代 dialog 内 form 的 `component:submit` 或其他更具体 semantic owner 入口。
- 内置动作 authoring 应优先使用 `openDialog` / `closeSurface`；runtime 内部不应为 `dialog` 单独再长出第二套 open/close 内核。

## 9. 数据源、表达式、导入能力接入点

- 标题和 body 内部内容支持表达式和 region 渲染。
- `data` 初始化 dialog own child scope；dialog subtree 默认仍按普通 lexical scope 规则继承父级，除非某个更窄 fragment 显式 `isolate`。
- 打开前数据准备应由 action 或 loader 完成，不让 dialog 自己发明请求协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-dialog` marker。
- 视觉和可访问性交互复用 `@nop-chaos/ui` Dialog。
- 标准 shell 结构应为 `DialogContent -> DialogHeader? -> DialogBody -> DialogFooter?`。
- `DialogContent` 负责弹层壳行为；默认 body spacing 应归 `DialogBody`，不要把正文 padding/gap 放回 `DialogContent`。

## 11. 实现拆分建议

- dialog shell、open-state bridge、host integration 和 actions footer 分开实现。
- host integration 应围绕共享 surface host / stack 实现，而不是让每个 dialog renderer 自己管理一套嵌套 host。
- `dialog` 的实现拆分重点不是 local controller hook，而是 surface family shared helper / runtime：open-state bridge、active-surface 判断、stack registration、status publish 这类逻辑如果在 `dialog` 和 `drawer` 中重复出现，应优先抽成共享 surface helper，而不是分别在两个 renderer 里长出各自的 controller。
- renderer/view 层应保留 `DialogContent -> DialogHeader? -> DialogBody -> DialogFooter?` 结构、slot 组合、`RendererComponentProps` 接线和事件透传；不要把共享 stack/runtime 规则重新混回每个具体 surface renderer 的 JSX 文件。

## 12. 风险、取舍与后续阶段

- 最大风险是 surface family 统一收口做一半，留下 declarative 与 action-opened 两套并存实现。
- `dialog` 的第一优先级不是继续扩字段，而是先完成统一 surface runtime 的收口。
