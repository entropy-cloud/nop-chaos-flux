# 开放式对抗性审查 — 2026-05-11 — 第十轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：上一轮已在 Flow Designer 中确认 shallow clone + live snapshot/document read surface 会导致嵌套 payload aliasing；本轮切到 Report Designer，检查另一个 designer core 是否也把外部对象引用直接收编进 live state。
> 本轮切入点：`syncSpreadsheetDocument(...)` 是否把调用方提供的 spreadsheet subtree 直接放进 internal document，从而让外部后续 mutation 绕过 command/history/dirty tracking。

---

## 发现 1：Report Designer 的 `syncSpreadsheetDocument(...)` 直接保留调用方传入的 spreadsheet subtree 引用，外部后续 mutation 会静默改写 live document

**在哪里**

- runtime snapshot 直接把 internal `document` 暴露出去：`packages/report-designer-core/src/core.ts:55-72,376-384`
- `syncSpreadsheetDocument(nextDocument)` 直接把调用方传入的 `nextDocument` 塞到 live report document 中：`packages/report-designer-core/src/core.ts:405-414`
- 现有测试甚至把“保留同一引用”固化成了当前行为：`packages/report-designer-core/src/__tests__/designer-core.test.ts:224-233`
- `exportDocument()` 只有在导出时才 clone；在此之前 internal state 持有的就是外部借来的那份 subtree：`packages/report-designer-core/src/core.ts:421-423`

**是什么**

`syncSpreadsheetDocument(...)` 目前不是“把 spreadsheet 文档同步进 core”，而是“把外部传入对象的引用接进 core state”：

```ts
applyDocumentChange({
  ...currentDocument,
  spreadsheet: nextDocument,
});
```

由于 `buildSnapshot()` 也直接返回 `state.document`，后续调用者只要还持有 `nextDocument`，就可以在 sync 之后继续原地改它，而这些改动会直接反映到 Report Designer 的 live document 上。

更糟的是，这不是偶然行为；测试已经明确断言：

```ts
expect(core.getSnapshot().document.spreadsheet).toBe(nextSpreadsheet);
```

也就是说，当前 repo 把“borrow caller subtree into live state”当成了既定 contract。

**为什么值得关心**

这条问题和一般的“dirty/undo gap”不同，它更基础：command model 的写入边界本身被绕开了。只要外部还握着 `nextSpreadsheet`：

1. 可以在 sync 之后继续改 live report document。
2. 不需要 dispatch command。
3. 不会新增 undo history entry。
4. 不会经过明确的 state replacement 边界。

对于一个设计器内核来说，这会直接破坏“snapshot/read surface 只读，写入统一走 command pipeline”的基线。尤其 Report Designer 本来就有意把 spreadsheet subtree 嵌进 report document；如果这里继续保留 by-reference sync，任何桥接层、host shell 或外部 adapter 只要复用同一对象，就都可能变成 designer core 的隐式写入者。

**信心水平**：确定

---

## 本轮小结

本轮在另一个 designer core 里发现了与前一轮相呼应、但根因不同的 contract 漏洞：Flow Designer 是 clone 不够深导致 aliasing；Report Designer 则更直接，`syncSpreadsheetDocument(...)` 主动把外部引用接进 live state。二者共同说明 designer family 的只读 snapshot / command-only write 基线还没有在所有 core 中真正闭合。

## 本轮盲区自评

- 本轮没有继续扩到 Spreadsheet core 本身是否也存在 public read surface aliasing。
- 还没检查 `syncSpreadsheetDocument(...)` 之后 dirty/undo/redo 的细粒度行为是否会因为外部后续 mutation 出现更大的连锁后果。
- 下一轮应做最后一次 fresh sweep；如果再没有新的高价值问题，就停止。
