# Surface Owner Design

## Purpose

本文档定义 `dialog`、`drawer` 以及未来同类浮层表面的共享 owner 规则。

用它回答：

- dialog 和 drawer 的状态应该归谁
- 为什么它们不应上卷到 `page`
- 为什么不建议分别发明 `$dialog`、`$drawer`
- future `sheet` 应如何归类

## Position

- `docs/architecture/action-interaction-state.md` 拥有通用 owner taxonomy。
- 本文档只收口 surface owner family 的窄规则。
- 本文档描述的是目标 owner 基线，不要求当前代码已经完全落地同名 runtime/store 实现。

Current live implementation note:

- 当前代码库同时存在两条 surface path：
  1. action-opened managed surfaces：通过 `openDialog` / `openDrawer` 进入 `SurfaceRuntime` + `DialogHost`
  2. declarative `type: 'dialog'` / `type: 'drawer'` renderers：直接包裹 UI primitive 的 renderer path
- 本文中的 shared `SurfaceRuntime` / root host 规则，优先适用于 managed surface path，不应自动外推为 declarative renderer 已全部共享同一路径
- current live baseline 也已支持 declarative `dialog` / `drawer` 在 renderer path 上发布 `statusPath` summary；但它们仍不是 `SurfaceRuntime`-managed entries

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

推荐基线：

- `page` 使用 page shell 自己的 runtime/store
- `form` 使用 form 自己的 runtime/store
- `dialog` / `drawer` / future `sheet` 共享 surface-family owner substrate（文档中记作 `SurfaceRuntime` / `SurfaceStore`）
- surface family 内部通过稳定 kind 区分具体表面，例如 `kind: 'dialog' | 'drawer'`

这样做的原因：

- surface family 共享 open/close/active/dismiss/focus 语义
- page shell 状态与 surface 状态不是同一个 owner family
- dialog 和 drawer 在运行期行为上足够接近，没必要为了名字不同拆成两套 store 模型

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

## Read Surfaces

外部读取规则：

- 优先通过 `statusPath` 读取 surface summary
- `statusPath` 由 `SurfaceRuntime` 在 owner scope（通常是 `surface.scope.parent ?? surface.scope`）统一发布；React host 只负责渲染，不应重复写同一路径
- surface close 时仍要把同一路径写回 `{ open: false, active: false, opening: false, closing: false }`，避免外部读者长期停留在陈旧的“已打开”快照

Current live implementation note:

- 上面的 `statusPath` 规则当前适用于 action-opened managed surfaces
- declarative `dialog` / `drawer` renderers 当前也会在 renderer path 上发布自己的 summary DTO
- 但 declarative path 仍不是通过 `SurfaceRuntime` store/stack 完成该发布

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

## Actions And Handles

surface owner 的典型 instance capability 是：

- `component:open`
- `component:close`

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

## Relation To NodeRenderer

`NodeRenderer` does not create or manage surface runtime/store boundaries.

- `page` runtime/store is created by the page renderer; `NodeRenderer` does not publish it as a generic provider
- the concrete host/owner creates one surface-family entry per opened surface, not `NodeRenderer`
- each opened dialog or drawer entry owns its own surface-family owner instance; ownership is disposed when the surface closes

Current live split:

- managed surfaces 满足这条规则
- declarative `dialog` / `drawer` renderers 当前只是 renderer-level UI wrapper，不等于“每个 declarative dialog 都已经注册成 host-managed surface entry”

This rule is part of the broader creator-owned boundary model documented in `docs/architecture/renderer-runtime.md` → "Execution Boundary Ownership Matrix".

## Related Documents

- `docs/architecture/action-interaction-state.md`
- `docs/components/dialog/design.md`
- `docs/components/drawer/design.md`
- `docs/components/page/design.md`
