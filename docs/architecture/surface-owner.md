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

## Read Surfaces

外部读取规则：

- 优先通过 `statusPath` 读取 surface summary

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

## Related Documents

- `docs/architecture/action-interaction-state.md`
- `docs/components/dialog/design.md`
- `docs/components/drawer/design.md`
- `docs/components/page/design.md`
