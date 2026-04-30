# Dialog 组件设计

## 1. 组件定位

- `dialog` 是模态对话框 renderer，用来承接标题、内容、操作区和打开关闭状态。
- 它是通用弹层容器，不应与具体业务表单或确认框混写为单独 type。

## 2. 与 AMIS 或既有产品的能力对照

- 当前代码库已同时具备 declarative `dialog` renderer、`DialogHost` 和 `@nop-chaos/ui` Dialog primitive。
- 文档基线应优先围绕 title/body/actions/open-state 这些稳定能力，不急于覆盖全部历史 mode。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'dialog'`
- 预期归属 `@nop-chaos/flux-renderers-basic`
- 预期 regions: `title`、`body`、`actions`

## 4. schema 设计

- 正式字段建议为 `title`、`body`、`actions`、`data`、`open`、`defaultOpen`、`size`、`showCloseButton`、`closeOnOutsideClick`、`statusPath`。
- 打开态命名应优先对齐 UI primitive 的 `open/defaultOpen`。
- `data` 若存在，其语义应与 `page` / `form` 保持一致：初始化 dialog own scope patch，而不是第二套局部 props 系统。

Current live implementation note:

- 通用 declarative `type: 'dialog'` renderer 已落位，但这里描述的完整 surface contract 仍在逐步补齐
- `statusPath` 已是 declarative dialog 的 current live capability
- `data` 仍属于 target/recommended baseline，不应误读为 declarative renderer 已完整支持

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
- dialog 不应复用 page store 作为自己的 owner store；它应使用 surface family 共用的 `SurfaceRuntime` / `SurfaceStore`。
- drawer 与 dialog 属于同一 surface family，应共享同一种 runtime/store 结构，只通过 surface kind 区分具体表面类型。
- 如果后续引入 confirm/commit 语义，那是叠加在 surface 之上的 semantic lifecycle，不应与 open-state 混成一份模糊状态。
- dialog 外部若需要读取其状态，应通过 `statusPath` 读取只读 summary DTO，而不是通过 page 或 id/name 做隐式查询。
- 如果未来确认 subtree-local authoring 频繁需要读取当前弹层状态，优先考虑共享 `$surface`，而不是单独发明 `$dialog`。
- 共享 surface owner 规则以 `docs/architecture/surface-owner.md` 为准。

Current live implementation note:

- shared `SurfaceRuntime` / `SurfaceStore` 与根 host stack 当前主要适用于 action-opened managed dialog path
- declarative dialog renderer 当前是直接 UI wrapper path，不应自动视为已经接入同一套 host-managed surface runtime
- declarative dialog 当前已支持在 renderer path 上发布 `statusPath` summary，但这不等于它已经接入 managed surface runtime

嵌套 dialog 基线：

- 在 dialog 中再打开 dialog 时，新 surface 仍注册到根 surface host，而不是渲染成当前 dialog DOM 子树内的第二个独立 host
- 后打开的 dialog 应出现在先打开的 dialog 前面
- 同一个 root host 容器内优先通过渲染顺序解决前后覆盖关系，不依赖每次打开都提升 `z-index`
- 只有最上层 dialog 拥有焦点、`Esc`、backdrop dismiss 等 active surface 行为

## 8. 事件、动作与组件句柄能力

- 推荐支持 `component:open`、`component:close`。
- `onOpen`、`onClose` 通过 action schema 触发。
- `example.json` 应同时展示 `onOpen` / `onClose` 的最小事件示例。
- `component:open` / `component:close` 解决的是 surface control，不应替代 dialog 内 form 的 `component:submit` 或其他更具体 semantic owner 入口。

## 9. 数据源、表达式、导入能力接入点

- 标题和 body 内部内容支持表达式和 region 渲染。
- `data` 初始化 dialog own scope；dialog subtree 默认仍按普通 lexical scope 规则继承父级，除非某个更窄 fragment 显式 `isolate`。
- 打开前数据准备应由 action 或 loader 完成，不让 dialog 自己发明请求协议。

Current live implementation note:

- action-opened managed dialog 当前会创建 child scope
- declarative dialog renderer 当前不应被表述为已经完整支持 `data` 初始化 own scope patch

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
- 如果某一类 dialog 子特性后续新增明显的控件级交互复杂度，例如 confirm/dirty/cancel restore 这类语义生命周期，再考虑在更窄的子特性层引入 local controller hook；但 dialog 基础 surface lifecycle 本身更适合沉到 shared helper 或 runtime 层。
- 纯 helper 仍应先行，例如 status summary 组装、container 解析、surface stack snapshot 判断；只有 helper 不能覆盖交互复杂度时才继续提升抽象层级。
- 这也是 `dialog` 与 `tree-select` 一类控件的区别：前者主要问题是 surface family shared lifecycle，后者主要问题是 renderer-local interaction complexity，二者不应套用同一拆分模板。
- 具体拆分判断应参考 `docs/references/renderer-implementation-guidelines.md`，并结合 `docs/architecture/surface-owner.md` 保持 surface owner 边界不被 renderer-local 状态侵蚀。

## 12. 风险、取舍与后续阶段

- 最大风险是与现有 dialog host 路径重复建模，需要先统一“页面级弹层管理”和“声明式 dialog renderer”的关系。
