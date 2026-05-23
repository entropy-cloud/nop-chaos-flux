# 开放式对抗性审查 — 2026-05-11 — 第九轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：前 8 轮主要集中在 action/runtime/import/surface 边界；本轮改切到完全不同子系统，检查 Flow Designer 的 public snapshot/document 读面是否真的与 command/history/save 基线保持隔离。
> 本轮切入点：Flow Designer `cloneDocument()` 是否足够深，`getSnapshot()` / `getDocument()` / `save()` / `restore()` 是否会因为嵌套 `node.data` / `edge.data` 共享引用而破坏 undo/save 合同。

---

## 发现 1：Flow Designer 只浅拷贝 `node.data` / `edge.data`，嵌套 payload 会静默污染 live doc、history 和 saved baseline

**在哪里**

- clone 逻辑只对 `data` 做一层展开：`packages/flow-designer-core/src/core/clone.ts:7-28`
- history baseline 依赖这份 clone：`packages/flow-designer-core/src/core/history.ts:19-55`
- save/restore baseline 也依赖同一 clone：`packages/flow-designer-core/src/core.ts:124-126,426-437`
- public 读面直接返回 live `doc` / snapshot 内 doc：`packages/flow-designer-core/src/core.ts:147-160`
- snapshot cache 同样直接把 `input.doc` 放进对外 snapshot：`packages/flow-designer-core/src/core/snapshot.ts:37-50,98-112`

**是什么**

Flow Designer 的 clone contract 目前只保护了：

- `node.position`
- 顶层 `node.data`
- 顶层 `edge.data`
- 顶层 `doc.viewport`

但如果 `node.data` 或 `edge.data` 内部再含嵌套对象/数组，例如：

```ts
node.data = {
  settings: { enabled: false },
  branches: [{ id: 'b1', label: 'A' }],
};
```

那么 `cloneNode()` 之后，`settings` / `branches` 仍和原对象共享引用。

与此同时：

1. `getDocument()` 直接返回 live `doc`
2. `getSnapshot().doc` 直接指向 live `doc`
3. history entry / savedDoc 也都用这份浅 clone

所以外部只要持有 snapshot/document 并修改嵌套 `data`，就可能在不经过 command pipeline 的情况下直接污染 live doc；如果污染的是 `savedDoc` / history entry 的共享嵌套引用，`restore()` / undo 也可能带着被污染的 baseline 一起失真。

**为什么值得关心**

这条问题直接打穿了 Flow Designer 最核心的设计假设：文档/快照读面应是读面，写入应统一走 command/history pipeline。当前浅 clone 让这个假设在嵌套 payload 上失效：

1. 没有 command。
2. 没有 history entry。
3. 没有 dirty transition 保证。
4. 甚至 save/restore baseline 也可能一起被共享引用污染。

这比普通“读面返回 live object”更严重，因为 Flow Designer 的 node/edge data 正是最容易放复杂嵌套结构的地方，例如 branch config、host metadata、layout options、schema fragments。只要有调用方把 snapshot/doc 当普通 JS 对象继续改，live graph、undo/redo、save/restore 三条线会一起失真。

**信心水平**：确定

---

## 本轮小结

本轮发现的是一个跨层 aliasing defect：public read surface、history baseline 和 save baseline 都建立在同一份浅 clone 策略上，而这份 clone 对嵌套 `data` 根本不封闭。它和前几轮的共同点仍然是“表面 contract 看起来像读面/快照，实际仍把内部 live 引用泄露出来”。

## 本轮盲区自评

- 本轮没有继续审查 Report Designer / Spreadsheet 是否有同类 shallow snapshot aliasing。
- 还没验证哪些真实 renderer/bridge 会向 `node.data` / `edge.data` 塞入深层结构；但从领域上看，这类 payload 在 Flow Designer 中很常见。
- 下一轮如果继续，适合做最后一次 fresh sweep；如果再找不到新的高价值问题，就应停止而不是继续机械扩展。
