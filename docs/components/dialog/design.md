# Dialog 组件设计

## 1. 组件定位

- `dialog` 是模态对话框 renderer，用来承接标题、内容、操作区和打开关闭状态。
- 它是通用弹层容器，不应与具体业务表单或确认框混写为单独 type。
- 从长期架构看，`dialog` 属于 surface family 的一种 public DSL authoring 形式，而不是独立 runtime family。
- 它不是普通页面内容区块，不应由 `container` 伪装实现。

## 2. 与 AMIS 或既有产品的能力对照

- 当前代码库已具备 declarative `dialog` renderer、surface host/runtime 路径和 `@nop-chaos/ui` Dialog primitive。
- 长期基线应把 declarative dialog 与 built-in `openDialog` 打开的 dialog 收敛成同一 surface family runtime，而不是保留两套生命周期。
- 文档基线应优先围绕 title/body/actions/open-state 这些稳定能力，不急于覆盖全部历史 mode。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 shadcn/ui、请求下沉 data-source + action、移动端走响应式（X3 §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                            | 采纳                                                                                                                                                | 不采纳     | 理由                                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `title`/`body`/`actions` region                                 | **实现**：三 region shell                                                                                                                           | —          | 当前基线                                                                         |
| `data`/`open`/`defaultOpen`/`statusPath`                        | **实现**：受控/非受控打开态 + 状态发布                                                                                                              | —          | 当前基线                                                                         |
| `closeOnOutsideClick`/`container`/`showMask`                    | **实现**                                                                                                                                            | —          | 当前基线                                                                         |
| `onOpen`/`onClose` 事件                                         | **实现**：走 action schema                                                                                                                          | —          | 当前基线                                                                         |
| 共享 `SurfaceRuntime` + declarative/`openDialog` 漏斗同栈       | **实现**：runtime 子 scope、重新打开新建 scope                                                                                                      | —          | 当前基线                                                                         |
| `closeOnEsc`（Esc 关闭）                                        | **实现**：host `onOpenChange` reason-inspection（缺省 true；false 时拦截 escape-key reason）                                                        | —          | 高频交互（E2f）                                                                  |
| `size` 预设（xs/sm/md/lg/xl/full）                              | **实现**：Flux 6 档映射 ui DialogContent `sm/default/lg`（xs→sm, sm/md→default, lg/xl→lg）+ `full` 走 inline 100vw/100vh                            | —          | 对齐 shadcn size 语义（X3 §2，E2f）                                              |
| `width`/`height` 显式尺寸                                       | **实现**：inline style 覆盖（number→px）；与 size 并存时显式优先                                                                                    | —          | size 之上的精确覆盖（E2f）                                                       |
| 独立 `header`/`footer` region（当前 footer 折进 `actions`）     | **实现**：`header` 与 `title` 并存于 DialogHeader；`footer` 与 `actions` 并存于 DialogFooter（渲染顺序 footer content → actions buttons）           | —          | header/footer 与 actions 解耦；命名沿用 region 语义（X3 §4.5，E2f）              |
| `confirm`（actions 省略时自动生成 cancel/confirm 按钮）         | **实现**：`confirm` truthy 且无 `actions` 时自动生成 `[Cancel][Confirm]`；cancel→onClose，confirm→onConfirm+onClose；`confirm: '保存'` 用自定义文案 | —          | confirm 语义叠在 surface 之上，不混进 open-state（E2f）                          |
| `showCloseButton` toggle                                        | **实现**：透传 ui DialogContent（已支持）                                                                                                           | —          | 显式开关，替代隐式假设（E2f）                                                    |
| `draggable` + 拖把（schema 暴露）                               | **schema 暴露（typecheck）**：`DialogSchema.draggable` 字段已暴露对齐 amis 配置面；renderer 行为级实现仍为后续                                      | —          | UI primitive 已支持拖把；schema 配置面先行落地                                   |
| `allowFullscreen` + setFullScreen                               | **schema 暴露（typecheck）**：`DialogSchema.allowFullscreen` 字段已暴露对齐 amis 配置面；renderer 行为级实现仍为后续                                | —          | schema 配置面先行落地                                                            |
| `dialogType: 'confirm'` 类型判别                                | **暂不实现**                                                                                                                                        | —          | 用 `confirm` 布尔 + surface 语义，不引入判别树（X3 §4.2）                        |
| `showErrorMsg`/`showLoading` 叠层                               | **暂不实现**                                                                                                                                        | —          | 走 statusPath + 外部组件表达                                                     |
| `lazyRender`/`lazySchema`                                       | **暂不实现**                                                                                                                                        | —          | 当前重新打开即新建 scope，按需再评估                                             |
| 动画/过渡钩子（entered/exited 驱动生命周期事件）                | **暂不实现**                                                                                                                                        | —          | 低频，后续按需                                                                   |
| amis 文本/参数包 `msg`/`confirmText`/`cancelText`/`inputParams` | —                                                                                                                                                   | **不采纳** | 用 Flux action + surface 表达，不在组件塞文本/参数包（X3 §3 button amis 化同源） |
| amis 组件级 `api` 生命周期                                      | —                                                                                                                                                   | **不采纳** | 请求下沉 data-source + action，不开短路径（X3 §1/§3）                            |
| amis `mobileUI`（小屏全屏覆盖）                                 | —                                                                                                                                                   | **不采纳** | 走响应式（见 mobile-roadmap），不引入双实现标志位（X3 §3）                       |

## 3. Flux 中的 renderer/type 定义

- 当前 `type: 'dialog'`
- 当前归属 `@nop-chaos/flux-renderers-basic`
- 当前 regions: `title`、`body`、`actions`
- 内部 runtime 归属 surface family，由 `docs/architecture/surface-owner.md` 统一定义

## 4. schema 设计

- 当前与长期共同保留的基础字段为 `title`、`body`、`actions`、`open`、`defaultOpen`、`closeOnOutsideClick`、`container`、`showMask`、`statusPath`、`data`。
- E2f 新增字段（已落地）：`closeOnEsc`（缺省 `true`）、`size?: 'xs'|'sm'|'md'|'lg'|'xl'|'full'`、`width`/`height`（number|string）、`showCloseButton`（缺省 `true`）、`header?: BaseSchema[]`、`footer?: BaseSchema[]`（独立 region，与 `title`/`actions` 并存）、`confirm?: boolean|string`（actions 省略时自动生成 Cancel/Confirm 按钮；string 提供自定义 confirm 文案）、`onConfirm?: ActionSchema|ActionSchema[]`、`bodyClassName`/`headerClassName`/`footerClassName`（透传到 ui `DialogBody`/`DialogHeader`/`DialogFooter`）。
- `data` 的语义是初始化 dialog own child scope patch，而不是第二套局部 props 系统。
- `open` / `defaultOpen` 继续作为 public DSL 的最小打开态接口。
- 如果未来需要把打开轴正式外置到 scope/host，命名应沿用 surface family 语言，例如 `openOwnership` / `openStatePath`，而不是再为 dialog 发明私有命名。
- `size`/`showCloseButton`/`header`/`footer`/`confirm`/`onConfirm`/`bodyClassName`/`headerClassName`/`footerClassName` 已在 E2f 落地为基础 contract（propContracts + fields 已注册，dialog 为 closed-model renderer）。

Current live implementation note:

- 通用 declarative `type: 'dialog'` renderer 已落位，并已接入 shared `SurfaceRuntime` / root host stack。
- declarative `dialog` 现在和 built-in `openDialog` 一样注册为 `SurfaceEntry`、创建 runtime-owned child scope、共享 close/status publication/validation-owner 规则。

## 5. 字段分类

- `title`: `value-or-region`
- `body`、`actions`、`header`、`footer`: `region`
- `open`、`defaultOpen`、`closeOnOutsideClick`、`closeOnEsc`、`size`、`width`、`height`、`showCloseButton`、`container`、`showMask`、`statusPath`、`data`、`confirm`、`bodyClassName`、`headerClassName`、`footerClassName`: `value`
- `onOpen`、`onClose`、`onConfirm`: `event`

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
- E2f 落地 confirm 语义：`confirm: true` 且无 `actions` 时，host 自动生成 `[Cancel][Confirm]` 按钮；cancel button 触发 onClose，confirm button 先触发 `onConfirm` 事件（payload `{ surfaceId, kind, open }`）再触发 onClose。`confirm` 字段不替代 `actions`：当 `actions` 显式声明时，confirm 自动生成被抑制。
- dialog 外部若需要读取其状态，应通过 `statusPath` 读取只读 summary DTO，而不是通过 page 或 id/name 做隐式查询。
- 如果未来确认 subtree-local authoring 频繁需要读取当前弹层状态，优先考虑共享 `$surface`，而不是单独发明 `$dialog`。
- 共享 surface owner 规则以 `docs/architecture/surface-owner.md` 为准。

统一基线说明：

- declarative `dialog` 与 built-in `openDialog` 打开的 dialog 都应注册为 `SurfaceEntry`
- 都应进入同一个 root surface host stack
- 都应使用同一套 focus、dismiss、child scope、status publication 规则

## 8. 事件、动作与组件句柄能力

- X1 起落地 `component:open`、`component:close`、`component:toggle` handle（dialog renderer definition 已发布 `componentCapabilityContracts`），与既有 `openDialog`/`closeSurface` action API **共存**。
- **共存关系**（X1 裁定，详见 `docs/references/component-handle-vocabulary.md` §surface-family 与 `docs/architecture/surface-owner.md` §Surface Handle Coexistence）：
  - `openDialog`/`closeSurface`（action API）= 跨 target，surface body 可在 action 内联声明（ad-hoc surface）。
  - `component:open`/`close`/`toggle`（capability handle）= 同 component，操作已声明的 declarative dialog 实例（target 必须是已渲染 dialog 节点）。
  - 二者 lower 到同一 `SurfaceRuntime` 内核（同一 surface stack、focus/dismiss/scope 规则），不存在双状态源。
  - authoring 建议：declarative dialog 用 `component:*`；ad-hoc 弹层用 `openDialog`。
- `onOpen`、`onClose` 通过 action schema 触发。
- `example.json` 应同时展示 `onOpen` / `onClose` 的最小事件示例。
- `component:open` / `component:close` 只解决 surface control，不替代内部 form 的 `component:submit` 等更具体 semantic owner 入口。
- Failure paths：`x1-open-no-target`（目标未注册）、`x1-close-not-open`（已 closed 时 close → `{ok:true, skipped:true}`）。

## 9. 数据源、表达式、导入能力接入点

- 标题和 body 内部内容支持表达式和 region 渲染。
- `data` 初始化 dialog own child scope；dialog subtree 默认仍按普通 lexical scope 规则继承父级，除非某个更窄 fragment 显式 `isolate`。
- 打开前数据准备应由 action 或 loader 完成，不让 dialog 自己发明请求协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-dialog` marker；host 在 DialogContent 上额外发布 `data-slot="dialog-surface"`（区别于 ui DialogContent 的 `data-slot="dialog-content"`）以及 `data-close-on-outside` / `data-close-on-esc` 状态 marker。
- `size` 映射：Flux 6 档（xs/sm/md/lg/xl/full）映射到 ui DialogContent 三档（sm/default/lg）+ `full` 走 inline `width: 100vw; height: 100vh`。
- `width`/`height` 显式 override：number→px，string 透传 CSS length；与 `size` 并存时显式优先。
- `bodyClassName`/`headerClassName`/`footerClassName` 经 `cn()` 合并到 `DialogBody`/`DialogHeader`/`DialogFooter`，不污染 `nop-dialog` 根 marker。
- 视觉和可访问性交互复用 `@nop-chaos/ui` Dialog。
- 标准 shell 结构应为 `DialogContent -> DialogHeader? -> DialogBody -> DialogFooter?`。
- `DialogContent` 负责弹层壳行为；默认 body spacing 应归 `DialogBody`，不要把正文 padding/gap 放回 `DialogContent`。
- 当 `@nop-chaos/ui` `Dialog` 启用 `draggable` 时，header 必须发布真实可聚焦的拖动把手按钮，而不是只保留 pointer drag。当前支持基线是 `Move dialog` drag handle，支持方向键移动、`Shift` 大步长移动与 `Home` 重置位置。

## 11. 与其他容器的边界

- 与 `container`：`container` 是页面内普通内容壳层；`dialog` 是 surface owner。
- 与 `drawer`：二者共享 surface family，但视觉 kind 和进入方式不同。
- 与 `tabs`：tabs activation 不等于 surface open-state；不要用 `tabs` 模拟 dialog，也不要把 dialog 写成多 tab 容器的别名。

## 12. 实现拆分建议

- dialog shell、open-state bridge、host integration 和 actions footer 分开实现。
- host integration 应围绕共享 surface host / stack 实现，而不是让每个 dialog renderer 自己管理一套嵌套 host。
- `dialog` 的实现拆分重点不是 local controller hook，而是 surface family shared helper / runtime：open-state bridge、active-surface 判断、stack registration、status publish 这类逻辑如果在 `dialog` 和 `drawer` 中重复出现，应优先抽成共享 surface helper，而不是分别在两个 renderer 里长出各自的 controller。
- renderer/view 层应保留 `DialogContent -> DialogHeader? -> DialogBody -> DialogFooter?` 结构、slot 组合、`RendererComponentProps` 接线和事件透传；不要把共享 stack/runtime 规则重新混回每个具体 surface renderer 的 JSX 文件。

## 13. 风险、取舍与后续阶段

- 最大风险是 surface family 统一收口做一半，留下 declarative 与 action-opened 两套并存实现。
- `dialog` 的第一优先级不是继续扩字段，而是先完成统一 surface runtime 的收口。

## 14. 响应式行为

引用 `docs/architecture/mobile-responsive-baseline.md`（M0 基线 + M0.1 基础设施 §4.2 FullScreen Dialog）。

| 断点              | 行为                                                                         | 实现方式                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| < 768px (mobile)  | dialog 自动全屏覆盖（`fullSize: 'viewport'`，`width: 100vw; height: 100vh`） | `dialog-host.tsx` `DialogView` 消费 `useIsMobile()`；当 schema 未显式声明 `size` 时强制 `effectiveSize = 'full'` |
| ≥ 768px (desktop) | 按 schema `size` / `width` / `height` 渲染（行为不变）                       | 同 E2f 后 `buildSurfaceInlineStyle` 路径                                                                         |

### 实现细节

- **schema 透明**：无新 `mobileUI` 标志位、无 `*-mobile` 组件。mobile 分支完全在 host 内部，由 `useIsMobile()`（断点 768）决定。
- **显式 size 优先**：当 schema 显式声明 `size`（包括 `size: 'full'`）时，mobile 不再强制覆盖（用户可显式要求非全屏 sized dialog）。仅当 `typeof size !== 'string'`（即未声明）时才在 mobile 强制 `effectiveSize = 'full'`。
- **观察性 marker**：mobile 全屏覆盖时 `DialogContent` 额外发布 `data-mobile-fullscreen="true"`，便于 e2e / 调试识别。
- **安全区域**：全屏覆盖时 body 应配合 `nop-safe-top` / `nop-safe-bottom`（M0.1a）适配 notch（由 dialog body className 注入）。
- **z-index**：经 `DialogContent` 内 `useGlobalZIndex()`（M0.1d）取值，多浮层叠加按打开顺序正确叠放。
- **close 行为**：`closeOnOutsideClick` / `closeOnEsc` / `showCloseButton` 在 mobile 不变；全屏 dialog 仍按 schema 配置响应遮罩点击 / ESC。

### 触摸适配

- 触摸目标：close button 复用 ui DialogContent 默认尺寸（满足 baseline §3）。
- 全屏覆盖避免小屏 dialog 内容被裁剪；正文滚动归 `DialogBody`。
