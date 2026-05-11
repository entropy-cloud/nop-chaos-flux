# Drawer 组件设计

## 1. 组件定位

- `drawer` 是抽屉式弹层 renderer。
- 它与 `dialog` 共享弹层语义，但强调边缘滑入和较强的上下文保留。
- 从长期架构看，`drawer` 属于 surface family 的一种 public DSL authoring 形式，而不是独立 runtime family。
- 它不是 `container` 的样式变体，也不是页面内普通侧边栏 section 的别名。

## 2. 与 AMIS 或既有产品的能力对照

- 当前代码库已具备 declarative `drawer` renderer、surface host/runtime 路径和 `@nop-chaos/ui` Drawer primitive。
- 长期基线应把 declarative drawer 与 built-in `openDrawer` 打开的 drawer 收敛成同一 surface family runtime，而不是保留两套生命周期。
- 首版应优先保留方向、打开态和内容区，不额外复制一整套 dialog 专属字段别名。

## 3. Flux 中的 renderer/type 定义

- 当前 `type: 'drawer'`
- 当前归属 `@nop-chaos/flux-renderers-basic`
- 当前 regions: `title`、`body`、`actions`
- 内部 runtime 归属 surface family，由 `docs/architecture/surface-owner.md` 统一定义

## 4. schema 设计

- 当前与长期共同保留的基础字段为 `title`、`body`、`actions`、`open`、`defaultOpen`、`side`、`container`、`showMask`、`statusPath`、`data`。
- `data` 的语义是初始化 drawer own child scope patch，而不是第二套局部 props 系统。
- `open` / `defaultOpen` 继续作为 public DSL 的最小打开态接口。
- 如果未来需要把打开轴正式外置到 scope/host，命名应沿用 surface family 语言，例如 `openOwnership` / `openStatePath`，而不是再为 drawer 发明私有命名。
- `size`、`showCloseButton` 仍可作为后续扩展候选，但当前不应误写成已经稳定落地的基础 contract。

Current live implementation note:

- 通用 declarative `type: 'drawer'` renderer 已落位，并已接入 shared `SurfaceRuntime` / root host stack。
- declarative `drawer` 现在和 built-in `openDrawer` 一样注册为 `SurfaceEntry`、创建 runtime-owned child scope、共享 close/status publication/validation-owner 规则。

## 5. 字段分类

- `title`: `value-or-region`
- `body`、`actions`: `region`
- `open`、`defaultOpen`、`side`、`container`、`showMask`、`statusPath`、`data`: `value`
- `onOpen`、`onClose`: `event`

## 6. regions 与 slot 约定

- 与 `dialog` 基本一致。

## 7. 运行期状态归属

- 打开态与 `dialog` 一样应明确 ownership，并支持 `local`、`controlled`、`scope` 或 host 驱动。
- drawer 自己拥有的是 surface state，而不是其子树 form/source/table 的业务状态。
- drawer 外部若需要读取状态，应通过 `statusPath` 读取只读 summary DTO。
- 若未来需要 subtree-local 读取当前弹层状态，优先与 dialog 共用 `$surface`，不要单独发明 `$drawer`。
- 共享 surface owner 规则以 `docs/architecture/surface-owner.md` 为准。

统一基线说明：

- declarative `drawer` 与 built-in `openDrawer` 打开的 drawer 都应注册为 `SurfaceEntry`
- 都应进入同一个 root surface host stack
- 都应使用同一套 focus、dismiss、child scope、status publication 规则

## 8. 事件、动作与组件句柄能力

- 推荐支持 `component:open`、`component:close`，可选支持 `component:toggle`。
- `onOpen`、`onClose` 通过 action schema 触发，示例应覆盖至少一组最小事件用法。
- `component:open` / `component:close` 只解决 surface control；内部表单提交、source 刷新等仍应进入更具体 owner 的语义入口。
- 内置动作 authoring 应优先使用 `openDrawer` / `closeSurface`；runtime 内部不应为 `drawer` 单独再长出第二套 open/close 内核。

## 9. 数据源、表达式、导入能力接入点

- 与 `dialog` 一致，内容与标题支持表达式和 regions。
- `data` 初始化 drawer own child scope；drawer subtree 默认仍按普通 lexical scope 规则继承父级，除非某个更窄 fragment 显式 `isolate`。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-drawer` marker。
- 视觉和可访问性交互复用 `@nop-chaos/ui` Drawer。
- 标准 shell 结构应为 `DrawerContent -> DrawerHeader? -> DrawerBody -> DrawerFooter?`。
- `DrawerContent` 负责弹层壳行为；默认 body spacing 应归 `DrawerBody`，并与 dialog 保持相同的 body-slot 责任边界。

## 11. 与其他容器的边界

- 与 `container`：需要页面内普通侧栏或说明面板时，用 `container`；需要 surface open-state 和 host stack 时，用 `drawer`。
- 与 `dialog`：同属 surface family，但交互形态不同；不要仅因视觉偏好就把二者混成一个无差别 type。

## 12. 实现拆分建议

- 抽屉 open-state、方向映射和 host integration 分离。
- surface family 的 open-state bridge、status publish、stack 订阅等共享逻辑应沉到共享 helper/runtime，而不是在 `drawer` 自己内部再长一套。

## 13. 风险、取舍与后续阶段

- 需要避免 dialog/drawer 在统一 surface family 收口过程中再次分裂成 declarative 与 action-opened 两套生命周期模型；二者差异应尽量只保留在 `kind` 和 `side`。
