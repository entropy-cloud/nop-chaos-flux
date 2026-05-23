# 开放式对抗性审查 — 2026-05-07 — 第二轮

> 延续第一轮的 split-brain / owner-boundary 视角，本轮深入 `flow-designer` tree mode 的 owner/history 边界，以及 `runtime.dispose()` 对 surface family 生命周期的收尾语义。

---

## 发现 1：Flow Designer tree mode 的 undo/redo 只回滚投影后的 graph core，不回滚真正 owner 的 `treeDocument`

**在哪里**

- `packages/flow-designer-renderers/src/designer-page.tsx:493-512`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts:58-64,177-182,207-212`
- `packages/flow-designer-core/src/core.ts:296-324`
- 旁证测试：`packages/flow-designer-renderers/src/designer-page.tree.test.tsx:571-664`
- 对照文档：`docs/architecture/flow-designer/tree-mode.md`

**是什么**

- tree mode 下，结构性命令通过 `applyTreeDocument(nextTree)` 同时做两件事：
  1. `treeOwner.setTreeDocument(nextTree)` 更新外层 React state 中真正持有的 `treeDocument`
  2. `core.replaceDocument(projectTreeDocumentToGraph(nextTree, ...))` 更新投影后的 graph core
- 但 `undo` / `redo` 分支只调用 `core.undo()` / `core.redo()`，完全没有把回滚后的 graph 再投回 `treeOwner.setTreeDocument(...)`。
- 这意味着 tree mode 下存在两份状态：
  - 外层 owner 持有的 canonical `treeDocument`
  - core 内部历史栈里的 graph projection

undo/redo 只修改后者，不修改前者。

**为什么值得关心**

- 这是 tree mode 自己的 owner model 断裂：UI 可能暂时显示 undo 后的旧 graph，但下一次任何 tree-owned 命令都会再次从较新的 `treeDocument` 重新投影，把 undo 结果覆盖掉。
- 当前测试只证明了 `core.undo()` 之后 graph 节点数会回退，没有证明 `treeDocument` 也同步回退；反而暴露出这个缺口已经被当前“history continuity”测试遗漏。
- 这会让 tree mode 的撤销语义变成假的历史回放，只要用户再做一次结构编辑，系统就会重新以未回滚的 tree state 为真相源。

**信心水平**：确定

---

## 发现 2：`runtime.dispose()` 不会真正关闭已打开的 surface entries，surface store 可能保留僵尸对话框状态

**在哪里**

- `packages/flux-runtime/src/runtime-factory.ts:463-505`
- `packages/flux-runtime/src/surface-runtime.ts:162-187`
- `packages/flux-core/src/types/runtime.ts:236-269`
- 对照文档：`docs/architecture/surface-owner.md:313-318`

**是什么**

- `runtime.dispose()` 在处理 `ownedSurfaceRuntimes` 时，只遍历 entries 并对每个 surface scope 调用 `disposeScopeTree(...)`：

```ts
for (const surfaceRuntime of ownedSurfaceRuntimes) {
  for (const surface of surfaceRuntime.store.getState().entries) {
    sourceRegistryRef.current?.disposeScopeTree(surface.scope.id);
    reactionRegistryRef.current?.disposeScopeTree(surface.scope.id);
  }
}
```

- 它没有调用 `surfaceRuntime.close(...)` / `closeTop()`，因此不会执行这些 close 路径自带的清理：
  - 从 `surfaceRuntime.store` 移除 entry
  - `setUncontrolledOpen(false)`
  - `clearSurfaceStatus(...)`
  - dispose/release `validationOwner`
  - `republishActiveStatuses()`
- 同时 `SurfaceRuntime` 接口本身也没有 `dispose()`，所以 runtime-level dispose 并没有把 opened surface family entry 当作“已关闭 surface”去完成生命周期收尾。

**为什么值得关心**

- 文档当前基线明确写着“每个已打开 surface 都拥有 child scope 和 validation owner；关闭后统一跟随 entry 生命周期释放”。live code 在 runtime dispose 场景下没有兑现这个关闭语义，只做了部分 scope-tree 清理。
- 如果宿主保留了 `surfaceRuntime` 引用，dispose 后仍可从 `surfaceRuntime.store.getState().entries` 读到旧 entry；状态发布和 validation owner 释放也可能停留在半清理状态。
- 这是一个资源和契约都不完整的收尾路径：系统看似“已经 dispose”，但 surface family 自己并不知道自己被关闭了。

**信心水平**：很可能

---

## 总评

第二轮延续了第一轮的核心模式：**同一个子系统在边界两侧各自维护状态，但只有一侧参与了生命周期或历史回滚**。

- `flow-designer` tree mode 的问题是 history 只回滚 projection，不回滚 owner tree。
- `surface-runtime` 的问题是 runtime dispose 只清 scope tree，不走 surface entry 的正式 close 生命周期。

这两条都不是单点 API 小瑕疵，而是“边界内外对同一对象的生死和版本理解不同步”。

## 本轮盲区自评

- 这一轮基本耗尽了我当前最强的两条线索：tree mode owner/history 边界，以及 surface runtime 收尾语义。
- 如果还要继续下一轮，更适合切去尚未深挖的方向，如 `report/spreadsheet` 桥接测试缺口、或 `debugger` 自动化多实例行为的实际测试覆盖。
