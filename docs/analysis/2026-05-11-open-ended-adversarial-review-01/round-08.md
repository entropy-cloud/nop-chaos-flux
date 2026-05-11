# 开放式对抗性审查 — 2026-05-11 — 第八轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：上一轮已确认 import manager 的 public ensure API 会复用 first context；本轮切到另一个 public runtime API，检查 `SurfaceRuntime.open()` 是否也把“调用者提供的上下文”与“runtime-owned resource”混为一谈。
> 本轮切入点：`SurfaceRuntime.open()` 接收任意 `scope`，close/dispose 时是否无差别把它当成 owned child scope teardown。

---

## 发现 1：`SurfaceRuntime.open()` 会把调用者传入的任意 `scope` 都当成 owned scope，在 close/dispose 时销毁整个 scope tree

**在哪里**

- `SurfaceRuntime.open()` public contract 只要求调用者提供 `scope: ScopeRef`，但没有任何 ownership flag、owned-scope id 或 “borrowed scope” 语义：`packages/flux-core/src/types/runtime.ts:238-272`
- managed surface runtime 在 `disposeEntry()` 中无条件调用 `disposeOwnedScope(entry.scope.id)`：`packages/flux-runtime/src/surface-runtime.ts:102-116`
- runtime-owned factories 把这个 hook 接到 `disposeScopeTree`：`packages/flux-runtime/src/runtime-owned-factories.ts:250-259`
- `disposeScopeTree` 会进一步销毁该 scope tree 下所有 data source / reaction：`packages/flux-runtime/src/runtime-factory.ts:214-218`、`packages/flux-runtime/src/async-data/source-registry.ts:296-314`、`packages/flux-runtime/src/async-data/reaction-runtime.ts:534-552`
- 直接 public 用法已经把非 owned scope（如 `page.scope`）传进 `surfaceRuntime.open(...)`：`packages/flux-runtime/src/__tests__/runtime-dialogs-scope.dialog-state.test.ts:219-260`

**是什么**

当前 `SurfaceRuntime.open()` 的接口看起来像“给 surface 一个当前 render/action context 下的 scope”。但 close/dispose 实现把这份 `scope` 直接当成“这个 surface 自己拥有的 scope subtree”去销毁。

也就是说，下面这类 public 用法：

```ts
surfaceRuntime.open({
  kind: 'dialog',
  surface,
  scope: page.scope,
  runtime,
});
```

在 surface 关闭时，runtime 会走到：

```ts
disposeOwnedScope(entry.scope.id);
```

而 runtime-owned hook 最终会把 `page.scope.id` 整棵 scope tree 下的 source/reaction registration 全部 dispose 掉。

**为什么值得关心**

这是一个非常危险的 ownership contract 混淆：

1. public API 形状允许调用者传“当前要在其中工作的 scope”。
2. runtime 实现却把它解释成“surface 自己拥有、关闭时应被回收的 owned subtree”。
3. 二者之间没有任何类型或字段把这两种语义区分开。

这意味着只要有调用方直接把 `page.scope`、`form.scope` 或其它上层现存 scope 传给 `SurfaceRuntime.open()`，surface 关闭时就可能顺带销毁与 surface 无关的 page/form async ownership。问题最坏的地方在于：UI 关闭本身看起来是成功的，被 dispose 的却是 page-level source/reaction 生命周期，属于典型的“一个正确子系统关闭时把另一个正确子系统一起杀掉”的跨边界破坏。

**信心水平**：确定

---

## 本轮小结

本轮确认的是 runtime public API 的 ownership 过载：`SurfaceRuntime.open()` 没有区分 borrowed scope 与 owned child scope，但 close/dispose 逻辑按 owned subtree 执行 teardown。这比普通资源泄漏更糟，因为它会回收错误的资源。

## 本轮盲区自评

- 本轮没有继续追 declarative surface renderer 是否总是创建独立 child scope；若 declarative path 始终如此，这条问题会更集中在 public/direct open API 与个别调用方上。
- 还没补 focused test 证明“用 page.scope 打开 surface 后，close 会 dispose page-owned source/reaction”。
- 下一轮若继续，最适合做一次新方向搜索，确认是否已经接近递减收益点；如果再找不到同等级别问题，应按提示词停止。
