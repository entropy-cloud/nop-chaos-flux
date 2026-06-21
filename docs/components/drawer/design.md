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

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 shadcn/ui、请求下沉 data-source + action、移动端走响应式（X3 §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                            | 采纳                                                                                                 | 不采纳     | 理由                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `title`/`body`/`actions` region                                 | **实现**：同 dialog 三 region                                                                        | —          | 当前基线                                                                 |
| `side`（left/right/top/bottom）                                 | **实现**：drawer 专属方向                                                                            | —          | 当前基线                                                                 |
| `data`/`open`/`defaultOpen`/`statusPath`/`container`/`showMask` | **实现**：共享 SurfaceRuntime                                                                        | —          | 当前基线                                                                 |
| `closeOnOutside`（修不对称 bug）                                | **实现**：host `onOpenChange` reason-inspection（缺省 true；false 时拦截 outside-press reason）      | —          | dialog 有 `closeOnOutsideClick`，drawer 缺失，E2f 补齐（命名对齐表面族） |
| `closeOnEsc`                                                    | **实现**：同 dialog                                                                                  | —          | 高频交互（E2f）                                                          |
| `size` 预设                                                     | **实现**：Flux 6 档映射 ui Drawer 几何 + `full` 走 inline 100%                                       | —          | 对齐 shadcn size 语义（X3 §2，E2f）                                      |
| `width`（左右）/`height`（上下）显式尺寸                        | **实现**：inline style 覆盖（number→px）；与 size 并存时显式优先                                     | —          | drawer 方向相关尺寸（E2f）                                               |
| 独立 `header`/`footer` region                                   | **实现**：`header` 与 `title` 并存于 DrawerHeader；`footer` 与 `actions` 并存于 DrawerFooter         | —          | 与 dialog 一致，解耦 actions；命名沿用 region 语义（X3 §4.5，E2f）       |
| `resizable`（拖拽调整 drawer 尺寸）                             | **实现**：ui DrawerContent 内置边缘 resize handle（pointer events + local state）                    | —          | drawer 常见需求（E2f）                                                   |
| `bodyClassName`/`headerClassName`/`footerClassName`             | **实现**：透传到 ui `DrawerBody`/`DrawerHeader`/`DrawerFooter`，经 `cn()` 合并                       | —          | E2f 补齐                                                                 |
| `confirm`（actions 省略时自动生成 cancel/confirm 按钮）         | **实现**：同 dialog（cancel→onClose，confirm→onConfirm+onClose）                                     | —          | 与 dialog 表面对齐（E2f）                                                |
| `showCloseButton` toggle                                        | **实现**：透传 ui DrawerContent（缺省 true，detail-field 等自定义 header 场景显式传 false 抑制重复） | —          | 显式开关（E2f）                                                          |
| amis 文本/参数包 `msg`/`confirmText`/`cancelText`/`inputParams` | —                                                                                                    | **不采纳** | 同 dialog 原则；用 Flux action + surface（X3 §3 button amis 化同源）     |
| amis 组件级 `api` 生命周期                                      | —                                                                                                    | **不采纳** | 请求下沉 data-source + action（X3 §1/§3）                                |
| amis `mobileUI`                                                 | —                                                                                                    | **不采纳** | 走响应式（见 mobile-roadmap），不引入双实现标志位（X3 §3）               |

## 3. Flux 中的 renderer/type 定义

- 当前 `type: 'drawer'`
- 当前归属 `@nop-chaos/flux-renderers-basic`
- 当前 regions: `title`、`body`、`actions`
- 内部 runtime 归属 surface family，由 `docs/architecture/surface-owner.md` 统一定义

## 4. schema 设计

- 当前与长期共同保留的基础字段为 `title`、`body`、`actions`、`open`、`defaultOpen`、`side`、`container`、`showMask`、`statusPath`、`data`。
- E2f 新增字段（已落地）：`closeOnOutside`（缺省 `true`，与 dialog `closeOnOutsideClick` 行为对齐；命名采用 surface family 风格不带 `Click` 后缀，host 内部统一映射）、`closeOnEsc`（缺省 `true`）、`size?: 'xs'|'sm'|'md'|'lg'|'xl'|'full'`、`width`/`height`（number|string，方向相关：left/right 影响 width，top/bottom 影响 height）、`showCloseButton`（缺省 `true`）、`header?: BaseSchema[]`、`footer?: BaseSchema[]`、`confirm?: boolean|string`、`onConfirm?: ActionSchema|ActionSchema[]`、`resizable?: boolean`（drawer 专属）、`bodyClassName`/`headerClassName`/`footerClassName`。
- `data` 的语义是初始化 drawer own child scope patch，而不是第二套局部 props 系统。
- `open` / `defaultOpen` 继续作为 public DSL 的最小打开态接口。
- 如果未来需要把打开轴正式外置到 scope/host，命名应沿用 surface family 语言，例如 `openOwnership` / `openStatePath`，而不是再为 drawer 发明私有命名。
- `size`/`showCloseButton`/`header`/`footer`/`confirm`/`onConfirm`/`resizable`/`closeOnOutside`/`closeOnEsc`/`width`/`height`/`bodyClassName`/`headerClassName`/`footerClassName` 已在 E2f 落地为基础 contract（propContracts + fields 已注册，drawer 为 closed-model renderer）。

Current live implementation note:

- 通用 declarative `type: 'drawer'` renderer 已落位，并已接入 shared `SurfaceRuntime` / root host stack。
- declarative `drawer` 现在和 built-in `openDrawer` 一样注册为 `SurfaceEntry`、创建 runtime-owned child scope、共享 close/status publication/validation-owner 规则。

## 5. 字段分类

- `title`: `value-or-region`
- `body`、`actions`、`header`、`footer`: `region`
- `open`、`defaultOpen`、`side`、`closeOnOutside`、`closeOnEsc`、`size`、`width`、`height`、`showCloseButton`、`resizable`、`container`、`showMask`、`statusPath`、`data`、`confirm`、`bodyClassName`、`headerClassName`、`footerClassName`: `value`
- `onOpen`、`onClose`、`onConfirm`: `event`

## 6. regions 与 slot 约定

- 与 `dialog` 基本一致。

## 7. 运行期状态归属

- 打开态与 `dialog` 一样应明确 ownership，并支持 `local`、`controlled`、`scope` 或 host 驱动。
- drawer 自己拥有的是 surface state，而不是其子树 form/source/table 的业务状态。
- drawer 外部若需要读取状态，应通过 `statusPath` 读取只读 summary DTO。
- 若未来需要 subtree-local 读取当前弹层状态，优先与 dialog 共用 `$surface`，不要单独发明 `$drawer`。
- 共享 surface owner 规则以 `docs/architecture/surface-owner.md` 为准。
- E2f 落地 confirm 语义：与 dialog 一致，`confirm: true` 且无 `actions` 时 host 自动生成 `[Cancel][Confirm]`；confirm button 先触发 `onConfirm` 事件再 onClose。`resizable` 的拖拽状态为 local state（drawer 关闭后丢失，重新打开重置）。

统一基线说明：

- declarative `drawer` 与 built-in `openDrawer` 打开的 drawer 都应注册为 `SurfaceEntry`
- 都应进入同一个 root surface host stack
- 都应使用同一套 focus、dismiss、child scope、status publication 规则

## 8. 事件、动作与组件句柄能力

- X1 起落地 `component:open`、`component:close`、`component:toggle` handle（drawer renderer definition 已发布 `componentCapabilityContracts`），与既有 `openDrawer`/`closeSurface` action API **共存**。
- **共存关系**（X1 裁定，详见 `docs/references/component-handle-vocabulary.md` §surface-family 与 `docs/architecture/surface-owner.md` §Surface Handle Coexistence）：
  - `openDrawer`/`closeSurface`（action API）= 跨 target，surface body 可在 action 内联声明（ad-hoc surface）。
  - `component:open`/`close`/`toggle`（capability handle）= 同 component，操作已声明的 declarative drawer 实例。
  - 二者 lower 到同一 `SurfaceRuntime` 内核，不存在双状态源。
  - authoring 建议：declarative drawer 用 `component:*`；ad-hoc 弹层用 `openDrawer`。
- `onOpen`、`onClose` 通过 action schema 触发，示例应覆盖至少一组最小事件用法。
- `component:open` / `component:close` 只解决 surface control；内部表单提交、source 刷新等仍应进入更具体 owner 的语义入口。
- Failure paths：`x1-open-no-target`、`x1-close-not-open`（已 closed 时 close → `{ok:true, skipped:true}`）。

## 9. 数据源、表达式、导入能力接入点

- 与 `dialog` 一致，内容与标题支持表达式和 regions。
- `data` 初始化 drawer own child scope；drawer subtree 默认仍按普通 lexical scope 规则继承父级，除非某个更窄 fragment 显式 `isolate`。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-drawer` marker；host 在 DrawerContent 上额外发布 `data-slot="drawer-surface"` 以及 `data-close-on-outside` / `data-close-on-esc` 状态 marker。
- `size` 映射：Flux 6 档映射到 drawer 几何（left/right 影响 width，top/bottom 影响 height）；`full` 走 inline `width: 100%; height: 100%`。
- `width`/`height` 显式 override：number→px，string 透传 CSS length；与 `size` 并存时显式优先。
- `bodyClassName`/`headerClassName`/`footerClassName` 经 `cn()` 合并到 `DrawerBody`/`DrawerHeader`/`DrawerFooter`，不污染 `nop-drawer` 根 marker。
- `resizable: true` 时 DrawerContent 内置 `[data-slot="drawer-resize-handle"]`（边缘 separator，pointer events 拖拽）。
- 视觉和可访问性交互复用 `@nop-chaos/ui` Drawer。
- 标准 shell 结构应为 `DrawerContent -> DrawerHeader? -> DrawerBody -> DrawerFooter?`。
- `DrawerContent` 负责弹层壳行为；默认 body spacing 应归 `DrawerBody`，并与 dialog 保持相同的 body-slot 责任边界。
- 当前 live drawer header baseline 要求稳定可见的 close affordance：E2f 起 ui DrawerContent 默认渲染 `[data-slot="drawer-close"]`（缺省 `showCloseButton: true`）；自带 header close 的复合控件（如 `detail-field`）应显式 `showCloseButton={false}` 抑制重复按钮。

## 11. 与其他容器的边界

- 与 `container`：需要页面内普通侧栏或说明面板时，用 `container`；需要 surface open-state 和 host stack 时，用 `drawer`。
- 与 `dialog`：同属 surface family，但交互形态不同；不要仅因视觉偏好就把二者混成一个无差别 type。

## 12. 实现拆分建议

- 抽屉 open-state、方向映射和 host integration 分离。
- surface family 的 open-state bridge、status publish、stack 订阅等共享逻辑应沉到共享 helper/runtime，而不是在 `drawer` 自己内部再长一套。

## 13. 风险、取舍与后续阶段

- 需要避免 dialog/drawer 在统一 surface family 收口过程中再次分裂成 declarative 与 action-opened 两套生命周期模型；二者差异应尽量只保留在 `kind` 和 `side`。
