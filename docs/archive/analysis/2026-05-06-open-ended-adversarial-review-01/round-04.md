# 开放式对抗性审查 — 2026-05-06 — 第四轮

> 本轮覆盖 SSR/browser API 泄漏、跨包循环依赖、三个设计器的 undo/redo 系统完整性。

---

## 发现 1：Report Designer 的 `setMetadata()` 绕过 undo 系统 — 元数据更改不可撤销

**在哪里**

- `packages/report-designer-core/src/core.ts:371-375`

**是什么**

```ts
setMetadata(target: ReportSelectionTarget, nextMeta: MetadataBag): void {
    store.setState((current) => {
        const result = updateMetadata(current.document, target, nextMeta);
        return result.changed ? { ...current, document: result.document } : current;
    });
}
```

`setMetadata()` 直接修改文档状态，不调用 `pushUndoEntry`，不清空 redo 栈。通过此 API 做的更改对用户"消失"了——没有 undo 记录，且可能破坏 redo 栈一致性。

**为什么值得关心**

如果宿主程序调用 `setMetadata`（而非通过 `dispatch`），用户无法撤销元数据更改。更严重的是，dirty 状态由 `undoStack.length > 0` 决定（发现 2），绕过 undo 的修改不会标记文档为 dirty，用户可能关闭已修改但标记为"干净"的文档。

**信心水平**：确定

---

## 发现 2：Report Designer 的 dirty 状态完全由 undo 栈深度决定

**在哪里**

- `packages/report-designer-core/src/core.ts:61`

**是什么**

```ts
dirty: state.undoStack.length > 0,
```

文档的 dirty 状态完全由 undo 栈是否有条目决定。`setMetadata()`、`syncSpreadsheetDocument()`、`importTemplate()` 都修改文档但绕过 undo 系统。修改后 `undoStack.length` 不变，文档仍标记为 clean。

**为什么值得关心**

用户可能关闭一个实际已被修改（通过 `setMetadata`/`sync`/`import` 路径）的文档，不会收到"未保存更改"警告。数据丢失风险。

**信心水平**：确定

---

## 发现 3：Spreadsheet 事务的 undo 原子性完全损坏 — 回滚不清除事务内 undo 条目

**在哪里**

- `packages/spreadsheet-core/src/command-handlers/history-handlers.ts:11-38`

**是什么**

三个相互关联的问题：

1. **事务内操作仍推入 undo 栈**：`handleBeginTransaction` 保存 `transactionDoc`，但事务内的 `setCellValue` 等操作仍然调用 `pushUndo`，每次操作都创建 undo 条目。
2. **回滚不清除 undo 条目**：`handleRollbackTransaction` 恢复 `transactionDoc`，但不清除 undo 栈中事务内操作产生的条目。用户可以 undo 到事务内的中间状态。
3. **提交时多推一次**：`handleCommitTransaction` 再次调用 `pushUndo`，导致栈中存在重复条目。

**为什么值得关心**

事务的本意是"全做或全不做"。当前实现下，事务内的每个操作都是独立的 undo 步骤。回滚事务后，用户仍然可以 undo 到事务内的中间状态——事务原子性是假的。

**信心水平**：确定

---

## 发现 4：Spreadsheet undo 不清除编辑状态 — 可能静默覆盖 undo 结果

**在哪里**

- `packages/spreadsheet-core/src/command-handlers/history-handlers.ts:40-53`

**是什么**

`handleUndo` 恢复文档但不处理 `editing` 状态。如果用户正在编辑单元格 A1（draftValue 包含未提交值），触发 undo：

1. 文档恢复到旧版本，A1 值可能已变
2. 但 `editing` 状态仍指向 A1，`draftValue` 仍是编辑中的值
3. 用户按 Enter 提交 → `draftValue` 覆盖 undo 后的值 → undo 效果被静默消除

**为什么值得关心**

这是电子表格的经典 UX bug：undo 无效因为编辑状态覆盖了 undo 结果。用户不会意识到数据被"恢复"又被"覆盖"。

**信心水平**：确定

---

## 发现 5：Report Designer 的 `importTemplate` 是不可撤销的破坏性操作

**在哪里**

- `packages/report-designer-core/src/core-dispatch.ts:228-254`

**是什么**

导入模板完全替换文档，但不调用 `pushUndoEntry`，不清空 redo 栈。用户无法通过 undo 回到导入前的状态。

**为什么值得关心**

用户误操作导入错误模板后无法恢复，可能丢失所有当前工作。这在电子表格/报表场景中是灾难性的。

**信心水平**：确定

---

## 发现 6：Flow Designer 的 undo 不恢复选择状态 — 产生幽灵选择

**在哪里**

- `packages/flow-designer-core/src/core.ts:296-324`

**是什么**

`undo()` 和 `redo()` 恢复文档和视口，但 `selectionState`（selectedNodeIds、selectedEdgeIds、activeBranchId）独立于历史记录。undo 后选择可能指向不存在的节点。

**为什么值得关心**

幽灵选择可能导致下游 UI 崩溃（查找不存在的节点）或显示异常。在复杂流程图中尤其容易触发。

**信心水平**：确定

---

## 发现 7：Spreadsheet 的 `exportDocument()` 返回内部引用 — 外部代码可绕过所有保护

**在哪里**

- `packages/spreadsheet-core/src/core.ts:69-84`

**是什么**

```ts
exportDocument() {
    return store.getState().document;  // 直接返回内部引用
}
```

外部代码获取文档引用后可以原地修改内部状态，绕过 undo 系统、状态通知、和所有保护机制。`replaceDocument` 同样直接存储外部传入的引用。

**为什么值得关心**

如果桥接层（如 report-designer 的 bridge）保留了 `exportDocument()` 返回的引用并在后续修改它，会静默污染 spreadsheet 的内部状态。

**信心水平**：确定

---

## 发现 8：`word-editor-core` 的 `document-io.ts` 中 5 处裸 `localStorage` 调用 — SSR 崩溃

**在哪里**

- `packages/word-editor-core/src/document-io.ts:77, 86, 105, 109, 114`

**是什么**

`saveDocument()`、`loadDocument()`、`clearDocument()`、`saveDatasets()`、`loadDatasets()` 五个函数直接调用 `localStorage`，无 `typeof localStorage` 守卫。这些函数通过 `index.ts` 导出为公共 API。

**为什么值得关心**

虽然 `word-editor-core` 可能不被设计为 SSR-safe，但作为 "core" 包（无 React 依赖），消费者可能期望它在 Node.js 中可导入。在 SSR 环境中调用任何这些函数会直接崩溃。

**信心水平**：确定

---

## 发现 9：Report Designer 的 redo 栈无大小限制 — 极端操作下内存翻倍

**在哪里**

- `packages/report-designer-core/src/core-dispatch.ts:286-294`

**是什么**

Undo 栈有 `maxDepth` 限制，但 redo 栈没有。每次 undo 将当前文档（JSON 深拷贝）推入 redo 栈。连续 50 次 undo 后 redo 栈增长到 50 个文档副本。

**为什么值得关心**

结合 `JSON.parse(JSON.stringify())` 的克隆方式，极端场景下内存可能翻倍。虽然需要极端操作才能触发，但缺乏保护上限是设计缺陷。

**信心水平**：确定

---

---

## 总评

本轮发现集中在三个设计器的 undo/redo 系统完整性上。最值得关注的方向：

1. **Report Designer 的 undo 绕过问题链条**（发现 1、2、5、9）：`setMetadata`/`sync`/`import` 三条路径绕过 undo 系统，dirty 状态与 undo 栈绑定导致绕过路径不标记 dirty，redo 栈无上限。这是一条完整的"数据丢失链"。

2. **Spreadsheet 事务原子性失败**（发现 3、4）：事务机制的 undo 原子性完全损坏，回滚后 undo 栈被污染；编辑中 undo 会静默覆盖结果。这两个问题组合在一起意味着 spreadsheet 的 undo 系统在事务场景下不可信。

3. **引用泄漏**（发现 7）：`exportDocument` 返回内部引用是系统性风险——任何持有引用的外部代码都可以绕过所有保护。

## 盲区自评

四轮审查覆盖了：compiler pipeline、react 渲染层、action dispatch、runtime scope/store、异步数据流、formula 表达式系统、核心工具函数、renderer 实现、SSR 兼容性、undo/redo 系统完整性。

仍然可能遗漏的方向：

- **性能压力测试**：大规模 schema（10000+ 节点）的编译和渲染性能
- **并发用户场景**：WebSocket 推送 + 多 tab 同时操作
- **国际化的运行时正确性**（非 key 覆盖问题，而是 RTL 布局、日期格式化等）
- **构建产物分析**（tree-shaking、bundle size、code splitting 效果）
