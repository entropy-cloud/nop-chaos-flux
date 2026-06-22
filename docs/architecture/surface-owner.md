# Surface Owner Design

## Purpose

本文档定义 `dialog`、`drawer`、`sheet`（BottomSheet）以及未来同类浮层表面的共享 owner 规则。

用它回答：

- dialog 和 drawer 的状态应该归谁
- 为什么它们不应上卷到 `page`
- 为什么 declarative surface 和 action-opened surface 不应长期保留两套 runtime
- 为什么不建议分别发明 `$dialog`、`$drawer`
- `sheet`（BottomSheet）应如何归类

## Position

- `docs/architecture/action-interaction-state.md` 拥有通用 owner taxonomy。
- 本文档只收口 surface owner family 的窄规则。
- 本文档现在定义的是长期统一基线：`dialog` / `drawer` / future `sheet` 应共享一套 surface-family runtime，而不是长期保留 declarative path 与 managed path 两套平行模型。

Current live implementation note:

- 当前 live 基线已经收口到一个共享 surface-family runtime：declarative `type: 'dialog' | 'drawer'` 与 built-in `openDialog` / `openDrawer` 都注册到同一个 `SurfaceRuntime` / root host / `SurfaceEntry` stack。
- React host 只负责渲染 root surface stack；surface open/close/status publication 与 active/top-surface 语义统一归 `SurfaceRuntime`。
- declarative uncontrolled open state (`defaultOpen`) 现在也由 `SurfaceRuntime` / `SurfaceStore` 持有；local close 或 runtime close 会写回同一 owner truth，而不会再被 renderer-local `defaultOpen` 状态重新打开。
- surface container targeting 现在也要求 geometry 诚实对齐：当 `dialog` / `drawer` 传入 `containerElement` 时，portal、overlay、viewport、popup 必须一起切到容器内 absolute geometry；不允许继续把主要表面保持成 viewport-fixed while only the portal mount target changes.

## Core Claim

`dialog`、`drawer` 这类组件首先是 **surface owner**，不是 page shell，也不是语义生命周期 owner。

它们首先拥有的是“表面状态”：

- `open`
- `active`
- `opening`
- `closing`

如果某个 surface 内部又承载了 form submit、confirm、source loading 等行为，那些状态仍属于更具体的 owner，而不是 surface 自己全部吞掉。

## Ownership Boundary

### Surface Owns

surface owner 只拥有：

- 当前是否打开
- 当前是否激活/聚焦
- 打开中/关闭中过渡态
- shell-level dismissability，例如是否允许点击外部关闭

### Surface Does Not Own

surface owner 不直接拥有：

- 内部 form 的 `submitting` / `validating`
- 内部 table/query 的 `loading`
- 内部 source 的 `error` / `stale`
- 内部业务提交的 success/failure summary

这些状态应继续由更具体的 owner 暴露。

## Relation To Page

`page` 是 shell owner，不是 surface owner。

因此：

- dialog/drawer 的状态不应默认上卷到 `page`
- page 只拥有 page shell 自己的状态
- 如果 page 上存在多个 dialog/drawer，仍应按各自 surface 区分，而不是合成一个模糊的 `page.surfaceState`
- page runtime/store 不应直接充当 dialog/drawer 的 owner store；surface family 需要自己的 runtime/store 结构

## Surface Runtime Model

`dialog` 和 `drawer` 应共享一套 surface-family runtime/store 抽象，而不是各自发明完全不同的 store，也不是直接复用 page store。

更进一步地说：

- schema 中声明式 `type: 'dialog'` / `type: 'drawer'`
- 内置动作 `openDialog` / `openDrawer`

都应进入同一个 `SurfaceRuntime` + root host + `SurfaceEntry` 栈模型。

推荐基线：

- `page` 使用 page shell 自己的 runtime/store
- `form` 使用 form 自己的 runtime/store
- `dialog` / `drawer` / future `sheet` 共享 surface-family owner substrate（文档中记作 `SurfaceRuntime` / `SurfaceStore`）
- surface family 内部通过稳定 kind 区分具体表面，例如 `kind: 'dialog' | 'drawer'`
- 每一个已打开的 surface 都对应一个 `SurfaceEntry`
- declarative surface 在运行时也应注册为 `SurfaceEntry`，而不是绕过 host 直接各自持有局部 lifecycle

这样做的原因：

- surface family 共享 open/close/active/dismiss/focus 语义
- page shell 状态与 surface 状态不是同一个 owner family
- dialog 和 drawer 在运行期行为上足够接近，没必要为了名字不同拆成两套 store 模型
- declarative surface 与 action-opened surface 如果长期双轨，未来所有新需求都会被迫做两遍

## Public DSL vs Internal Canonical Model

对外 public DSL：

- `type: 'dialog'`
- `type: 'drawer'`
- built-in actions: `openDialog`、`openDrawer`、`closeSurface`

对内 canonical model：

- `SurfaceRuntime.open({ kind: 'dialog' | 'drawer', ... })`
- `SurfaceRuntime.close(...)`
- `SurfaceEntry`

因此：

- `openDialog` = surface open 的 dialog authoring sugar
- `openDrawer` = surface open 的 drawer authoring sugar
- `closeSurface` = 统一关闭动作
- declarative `dialog` / `drawer` = surface node authoring sugar，而不是另一套 runtime family

不建议对外暴露 `type: 'surface'` 作为公共 DSL。

原因：

- 作者更容易理解 `dialog` / `drawer`
- surface 是 runtime owner family，不是最终用户最关心的业务概念

## Root Host And Stacking

surface 的推荐渲染方式是：统一由根 surface host 维护一个 stack，而不是在已打开的 dialog/drawer DOM 子树里继续嵌套一个新的独立 host。

推荐规则：

- 所有 surface entry 注册到同一个根 host stack
- 后打开的 surface 追加到 stack 尾部
- 同一 host 容器内，后渲染的 surface 自然显示在前面
- 同 family surface 的前后关系优先通过根 host 内的渲染顺序解决，而不是每次打开都递增 `z-index`

这条规则成立的前提是：

- surface 处于同一个 root host / portal 容器
- 容器自身已经有稳定的 surface-level stacking baseline
- 不为不同 surface 人为制造额外 stacking context

## Global z-index Stack

跨 family / 跨 portal 的浮层（dialog、drawer、sheet、popover、tooltip、dropdown、combobox、select、hover-card、context-menu、navigation-menu、alert-dialog）必须共享一个 process-wide 自增 z-index 计数器，避免扁平 `z-50` 导致的多浮层叠加错乱。

### Counter Semantics

- Owner: `@nop-chaos/ui`（`packages/ui/src/hooks/use-global-z-index.ts`）。surface-runtime 不再维护第二份 z 状态；这是 UI 层 stacking 工具，不是 surface 状态模型的一部分。
- Baseline: `2000`（对齐 Vant `useGlobalZIndex`）。基线远高于既有非浮层 z-index 区段（普通内容 / 固定栏 / dropdown 等），保证迁移后单浮层视觉行为与扁平 `z-50` 等价。
- Public API:
  - `useGlobalZIndex(): number` — React hook，每次 mount 取一个递增值并在组件实例生命周期内保持稳定。
  - `nextGlobalZIndex(): number` — 非 hook 入口，纯函数取值并自增。
  - `peekGlobalZIndex(): number` — 只读，不自增。
  - `setGlobalZIndex(value: number): void` — **测试专用**，重置计数器。生产代码不得调用。
- Counter scope: module-scoped（process-wide）。多个 React root / 多个 host 共享同一栈，确保 popover-in-dialog、toast-over-dialog 等跨 host 场景按打开顺序叠放。

### Overlay Migration Status

`packages/ui/src/components/ui/` 下 12 个 overlay 组件 + sonner 已从扁平 `z-50` 迁移到计数器取值：

| Component         | Family            | z-index source                                                                                            |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| `dialog`          | surface-family    | `useGlobalZIndex()` via `DialogContent`，通过 `DialogZIndexContext` 共享给 `DialogOverlay`                |
| `alert-dialog`    | surface-family    | `useGlobalZIndex()` via `AlertDialogContent`，通过 `AlertDialogZIndexContext` 共享给 `AlertDialogOverlay` |
| `drawer`          | surface-family    | `useGlobalZIndex()` via `DrawerContent`，通过 `DrawerZIndexContext` 共享给 `DrawerOverlay`                |
| `sheet`           | surface-family    | `useGlobalZIndex()` via `SheetContent`，通过 `SheetZIndexContext` 共享给 `SheetOverlay`                   |
| `popover`         | transient overlay | `useGlobalZIndex()` via `PopoverContent`，inline style on `Positioner`                                    |
| `tooltip`         | transient overlay | `useGlobalZIndex()` via `TooltipContent`，inline style on `Positioner`                                    |
| `hover-card`      | transient overlay | `useGlobalZIndex()` via `HoverCardContent`，inline style on `Positioner`                                  |
| `dropdown-menu`   | transient overlay | `useGlobalZIndex()` via `DropdownMenuContent` / `DropdownMenuPositioner`                                  |
| `context-menu`    | transient overlay | `useGlobalZIndex()` via `ContextMenuContent`                                                              |
| `combobox`        | transient overlay | `useGlobalZIndex()` via `ComboboxContent`                                                                 |
| `select`          | transient overlay | `useGlobalZIndex()` via `SelectContent`                                                                   |
| `navigation-menu` | transient overlay | `useGlobalZIndex()` via `NavigationMenuPositioner`                                                        |
| `sonner` Toaster  | toast / notify    | 固定 `10000`（`TOASTER_Z_INDEX`），独立于计数器，永远盖在所有 overlay 之上                                |

Compound overlay（dialog / alert-dialog / drawer / sheet）在 `*Content` 入口取一个值，通过 React Context 共享给同 instance 的 `*Overlay`，确保 backdrop 与 popup 用同一 z-index，由 DOM 顺序保证 popup 盖在 backdrop 之上。

允许保留扁平 `z-50` 的场景：

- 非浮层内部布局（如 tooltip 内部 `kbd` 子元素用 `**:data-[slot=kbd]:z-50` 维持 kbd 在 tooltip bg 之上的局部堆叠）
- drawer resize handle 的 `z-20`、close button 的 `z-30` 等 intra-overlay 局部层级（不是 overlay root z-index）

迁移完成后的 grep 约束：`packages/ui/src/components/ui/` 下不得新增扁平 `z-50` 作为 overlay root 取值；新增 overlay 组件必须从 `useGlobalZIndex()` 取值。

### Toaster Top-Layer Coordination

`sonner` Toaster 不从全局计数器取值，而是固定 `z-index: 10000`。原因：

- toast / notify 属于顶层反馈层，语义上永远盖在所有交互浮层之上，不应受打开顺序影响。
- 计数器取值会随 overlay 打开次数单调上升，toast 可能被先打开的 dialog 意外压在下面，违反"toast 永远最顶层"语义。
- 10000 远高于 dialog/drawer 等日常 overlay 的计数器取值上限（单次会话内不太可能打开 8000 个浮层），且留出未来 sub-layer（如 top-tray 10500）的扩展空间。

### Relationship To Same-Family Render-Order Rule

本节 global z-index 栈与上文 "同 family surface 的前后关系优先通过根 host 内的渲染顺序解决" 规则的关系：

- 同 family surface 内部 stacking：仍优先靠 root host 内渲染顺序，不强制每次打开都取计数器值（如果 dialog 内开同族 dialog 且二者都在同一 host stack，渲染顺序已经足够）。
- 跨 family / 跨 host 浮层：必须靠 `useGlobalZIndex()` 计数器解决，因为它们不共享同一 host 渲染顺序。
- 这两条规则互补，不冲突：同 family 走渲染顺序，跨 family 走计数器。

## Top Surface Rule

stack 中只有最上层 surface 拥有当前交互控制权。

这包括：

- focus trap
- `Esc` 关闭处理
- backdrop dismiss
- active surface 状态

关闭顶层后：

- 交互控制权回到前一个 surface
- 焦点恢复也应按 stack 顺序回退

## Scope And Data Initialization

每个已打开的 surface 都应拥有自己的 child scope。

统一规则：

- child scope 由打开位置的当前 scope 派生，而不是默认挂到 page root
- `data` 的语义是 child scope init patch
- 如果 `data` 含表达式，表达式在 surface 打开时基于 opening scope 求值一次
- 求值结果写入 surface child scope 后，`data` 不再代表 parent -> surface 的持续 live binding
- surface 保持打开期间，parent scope 后续变化默认不应替换该 surface child scope 或覆盖其中已存在的值
- 需要重新取新的 `data` 时，应通过关闭后重新打开、remount，或显式 action/lifecycle 完成，而不是给 `data` 增加 sync 开关
- 关闭 surface 时，对应 child scope 生命周期结束

因此这些都应成立：

- page scope -> dialog scope
- form scope -> dialog scope
- row scope -> drawer scope

推荐心智模型：

```text
opening scope
  --evaluate surface.data once when opening-->
surface init patch snapshot
  --seed-->
surface child scope
```

这也意味着：

- `data` 应保持“初始化快照”单一语义，不承担 live sync 模式
- surface subtree 若需要持续读取父级某些值，应直接走 lexical scope 读取，而不是把这些值先复制进 `data`
- 如果未来确实需要显式 live projection，应设计独立字段，而不是复用 `data`

不应长期保留：

- action-opened surface 有 child scope
- declarative surface 没有 child scope

这种双轨差异。

## Read Surfaces

外部读取规则：

- 优先通过 `statusPath` 读取 surface summary
- `statusPath` 由 `SurfaceRuntime` 在 owner scope（通常是 `surface.scope.parent ?? surface.scope`）统一发布；React host 只负责渲染，不应重复写同一路径
- surface close 时仍要把同一路径写回 `{ open: false, active: false, opening: false, closing: false }`，避免外部读者长期停留在陈旧的“已打开”快照

Current live implementation note:

- 上面的 `statusPath` 规则已经是 live baseline。
- declarative surface close / unmount 与 action-opened surface close 现在都会把同一路径写回 closed summary，而不是清成 `undefined`。
- runtime teardown 也必须兑现同一条 close lifecycle：`runtime.dispose()` 需要驱动 `SurfaceRuntime` 释放已打开 entry、清理 active/status publication、并释放 surface validation owner，而不是只清 page scope 树却把 `surfaceRuntime.store` 留在已打开状态

局部读取规则：

- 不建议一开始就分别暴露 `$dialog`、`$drawer`
- 如果未来确认 subtree-local authoring 高频需要读取当前表面状态，优先收敛成共享 `$surface`

原因：

- dialog/drawer 共享同一类表面语义
- 对 subtree 作者来说，“当前所在弹层表面”比“当前组件名字是什么”更重要
- 这样可以避免 `$dialog` / `$drawer` / `$sheet` 膨胀成按名字分裂的绑定族

## Summary Shape

推荐的 surface summary 至少包含：

```ts
interface SurfaceStatusSummary {
  open: boolean;
  active: boolean;
  opening: boolean;
  closing: boolean;
}
```

更窄的 renderer 可以按需补充少量稳定字段，但不应把内部业务 owner 的状态混进同一个 summary。

## Built-In Actions And Handles

surface owner 的目标态 instance capability 可以是：

- `component:open`
- `component:close`
- `component:toggle`（可选，但推荐）

当前 live authoring baseline：

- 打开 surface 时对外保留 `openDialog` / `openDrawer`
- 关闭 surface 时统一使用 `closeSurface`
- runtime 内部统一 lower 到单一 surface 内核，例如 `surface:open` / `surface:close`
- `closeDialog` / `closeDrawer` 不应成为长期正式基线

X1 起 `dialog` / `drawer` renderer definitions 已发布 `componentCapabilityContracts`（`open`/`close`/`toggle`），`component:open` / `component:close` / `component:toggle` 现已是受支持的 live component handle。详见下方 §Surface Handle Coexistence 与 `docs/references/component-handle-vocabulary.md`。

建议语义：

- `openDialog(args)` -> `kind: 'dialog'`
- `openDrawer(args)` -> `kind: 'drawer'`
- `closeSurface(args?)` 支持：
  - 按 `surfaceId` 关闭
  - 关闭当前 action 所在 surface
  - 未指定时关闭 top-most active surface

Current live affordance baseline:

- drawer-like surfaces 不应只依赖 footer close/cancel 作为唯一退出路径。
- 当 surface 采用 drawer shell 时，header 需要保留稳定可见的 close affordance，并与 `onOpenChange(false)` / footer close 共享同一关闭语义，而不是变成第二套私有 lifecycle。

这些动作只解决 surface control，不替代内部更具体 owner 的入口，例如：

- form 的 `component:submit`
- table/source 的 `component:refresh`

## Confirm And Commit

如果未来某个 dialog/drawer 承担了 confirm/commit 语义：

- open/close 仍然属于 `Surface Owner`
- confirm/commit 应视为叠加在 surface 之上的 `Semantic Lifecycle Owner`

不要把两者压成一个模糊的 `dialog.status`。

## Surface Handle Coexistence

X1 落地 `component:open`/`close`/`toggle` handle（dialog/drawer），与既有 `openDialog`/`openDrawer`/`closeSurface` action API 共存。关系裁定（详见 `docs/references/component-handle-vocabulary.md` §surface-family）：

- **action API**（`openDialog`/`openDrawer`/`closeSurface`）：跨 target，surface body 可在 action 内联声明（ad-hoc surface）。按 `surfaceId`/top-most 寻址。
- **component capability handle**（`component:open`/`close`/`toggle`）：同 component，操作已声明的 declarative dialog/drawer 实例。按 `componentId`/`componentName` 寻址（target 必须是已渲染的 dialog/drawer renderer 节点）。
- 二者最终 lower 到同一 `SurfaceRuntime` 内核（同一 surface stack、同一 focus/dismiss/child scope/status publication 规则），**不存在双状态源**。
- authoring 建议：declarative dialog/drawer 用 `component:*`；ad-hoc 弹层用 `openDialog`/`openDrawer`。
- Failure paths：`x1-open-no-target`（component target 未注册）、`x1-close-not-open`（已 closed 时 close → `{ok:true, skipped:true}`）。

## Future Sheet Rule

future `sheet` 不能因为名字不同就自动获得独立 owner family。

判断规则：

- 如果它本质上是浮层表面，归 `Surface Owner`
- 如果它更接近容器切换或步骤流，归其他 owner family

不要先发明 `$sheet`，先完成 owner classification。

### BottomSheet 归类确认

`BottomSheet` 是 `surface owner` family 成员，与 `dialog` / `drawer` 共享 `SurfaceRuntime` / `SurfaceStore` / `SurfaceEntry` 基础设施。

| 维度       | dialog                 | drawer                 | BottomSheet                   |
| ---------- | ---------------------- | ---------------------- | ----------------------------- |
| 位置       | 居中                   | 左右滑入               | 底部滑入                      |
| 移动端变体 | < 640px 全屏           | 保持抽屉               | 仅小屏启用                    |
| 打开方式   | action / declarative   | action / declarative   | 组件内部自动切换（如 Select） |
| 状态管理   | SurfaceRuntime         | SurfaceRuntime         | SurfaceRuntime                |
| UI 基座    | `@nop-chaos/ui` Dialog | `@nop-chaos/ui` Drawer | `@nop-chaos/ui` Sheet         |

**实施规则**：

- BottomSheet 不新建独立 `type`（不暴露 `type: 'bottom-sheet'` 给 schema）
- 使用场景：Select/TreeSelect/Picker 在小屏自动使用 BottomSheet
- 通过 `@nop-chaos/ui` Sheet 组件 + SurfaceRuntime 实现
- UI 规格见 `mobile-responsive-baseline.md` §4.1

## Declarative And Action-Opened Surfaces

长期基线下，二者不是两套 runtime，只是两种 authoring 入口：

- declarative `type: 'dialog' | 'drawer'`
- built-in `openDialog` / `openDrawer`

它们都应：

- 注册成 `SurfaceEntry`
- 进入同一个 root host stack
- 遵守同一套 focus / dismiss / child scope / status publication 规则

不应再把 declarative surface 定义为“只是一个普通 renderer 包 UI primitive”。

## Relation To NodeRenderer

`NodeRenderer` does not create or manage surface runtime/store boundaries.

- `page` runtime/store is created by the page renderer; `NodeRenderer` does not publish it as a generic provider
- the concrete host/owner creates one surface-family entry per opened surface, not `NodeRenderer`
- each opened managed dialog or drawer entry owns its own surface-family owner instance and surface-root validation owner; both are disposed when the surface closes

Current live baseline:

- declarative `dialog` / `drawer` 已成为 host-managed `SurfaceEntry`，并通过 root host stack 渲染。
- 每个已打开 surface 都拥有 runtime-created child scope 和 surface-root validation owner；关闭后统一跟随 entry 生命周期释放。
- 当 `openDialog` / `openDrawer` 需要为 surface body 编译 validation plan 时，compile failure 现在走 fail-closed 语义：surface 不再继续打开为“弱化成功”路径，而是通过 runtime host-reporting seam 报告结构化失败。

This rule is part of the broader creator-owned boundary model documented in `docs/architecture/renderer-runtime.md` -> "Execution Boundary Ownership Matrix".

## Related Documents

- `docs/architecture/action-interaction-state.md`
- `docs/components/dialog/design.md`
- `docs/components/drawer/design.md`
- `docs/components/bottom-sheet/design.md`
- `docs/components/page/design.md`
- `docs/architecture/mobile-responsive-baseline.md`
