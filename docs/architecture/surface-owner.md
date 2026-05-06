# Surface Owner Design

## Purpose

本文档定义 `dialog`、`drawer` 以及未来同类浮层表面的共享 owner 规则。

用它回答：

- dialog 和 drawer 的状态应该归谁
- 为什么它们不应上卷到 `page`
- 为什么 declarative surface 和 action-opened surface 不应长期保留两套 runtime
- 为什么不建议分别发明 `$dialog`、`$drawer`
- future `sheet` 应如何归类

## Position

- `docs/architecture/action-interaction-state.md` 拥有通用 owner taxonomy。
- 本文档只收口 surface owner family 的窄规则。
- 本文档现在定义的是长期统一基线：`dialog` / `drawer` / future `sheet` 应共享一套 surface-family runtime，而不是长期保留 declarative path 与 managed path 两套平行模型。

Current live implementation note:

- 当前 live 基线已经收口到一个共享 surface-family runtime：declarative `type: 'dialog' | 'drawer'` 与 built-in `openDialog` / `openDrawer` 都注册到同一个 `SurfaceRuntime` / root host / `SurfaceEntry` stack。
- React host 只负责渲染 root surface stack；surface open/close/status publication 与 active/top-surface 语义统一归 `SurfaceRuntime`。
- declarative uncontrolled open state (`defaultOpen`) 现在也由 `SurfaceRuntime` / `SurfaceStore` 持有；local close 或 runtime close 会写回同一 owner truth，而不会再被 renderer-local `defaultOpen` 状态重新打开。

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

surface owner 的典型 instance capability 是：

- `component:open`
- `component:close`
- `component:toggle`（可选，但推荐）

对于内置 action authoring：

- 打开 surface 时对外保留 `openDialog` / `openDrawer`
- 关闭 surface 时统一使用 `closeSurface`
- runtime 内部应统一 lower 到单一 surface 内核，例如 `surface:open` / `surface:close`
- `closeDialog` / `closeDrawer` 不应成为长期正式基线

建议语义：

- `openDialog(args)` -> `kind: 'dialog'`
- `openDrawer(args)` -> `kind: 'drawer'`
- `closeSurface(args?)` 支持：
  - 按 `surfaceId` 关闭
  - 关闭当前 action 所在 surface
  - 未指定时关闭 top-most active surface

这些动作只解决 surface control，不替代内部更具体 owner 的入口，例如：

- form 的 `component:submit`
- table/source 的 `component:refresh`

## Confirm And Commit

如果未来某个 dialog/drawer 承担了 confirm/commit 语义：

- open/close 仍然属于 `Surface Owner`
- confirm/commit 应视为叠加在 surface 之上的 `Semantic Lifecycle Owner`

不要把两者压成一个模糊的 `dialog.status`。

## Future Sheet Rule

future `sheet` 不能因为名字不同就自动获得独立 owner family。

判断规则：

- 如果它本质上是浮层表面，归 `Surface Owner`
- 如果它更接近容器切换或步骤流，归其他 owner family

不要先发明 `$sheet`，先完成 owner classification。

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

This rule is part of the broader creator-owned boundary model documented in `docs/architecture/renderer-runtime.md` -> "Execution Boundary Ownership Matrix".

## Related Documents

- `docs/architecture/action-interaction-state.md`
- `docs/components/dialog/design.md`
- `docs/components/drawer/design.md`
- `docs/components/page/design.md`
