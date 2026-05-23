# 开放式对抗性审查 — 2026-05-11 — 第十一轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：前两轮 designer-family 审查已确认 Flow Designer 的 shallow clone aliasing 和 Report Designer 的 `syncSpreadsheetDocument(...)` by-reference sync。为避免重复，本轮只检查 Spreadsheet 的正常 live read path，而不是 import/export/sync 入口。
> 本轮切入点：`SpreadsheetCore.getSnapshot()` 和 bridge host snapshot 是否真的兑现了“readonly bridge snapshot / host projection”合同。

---

## 发现 1：Spreadsheet live read surfaces 直接暴露 mutable internal state，bridge snapshot 并不是只读 snapshot

**在哪里**

- spreadsheet snapshot builder 直接把 `document`、`selection`、`viewport` 从 internal state 挂到 runtime snapshot 上：`packages/spreadsheet-core/src/core/internal-state.ts:29-45`
- `SpreadsheetCore.getSnapshot()` 缓存并返回这份 snapshot，本身不 clone：`packages/spreadsheet-core/src/core.ts:58-66`
- bridge `deriveHostSnapshot()` 又继续把 `runtime.document.workbook`、`activeSheet`、`selection` 直接暴露出去：`packages/spreadsheet-renderers/src/bridge.ts:35-76`
- 组件文档要求 schema 只应读取 host snapshot，而不直接操作内部 store：`docs/components/spreadsheet-page/design.md:49-51`
- Report Designer bridge API 文档也明确要求 schema 片段只读 bridge snapshot，写入必须通过 command/action：`docs/architecture/report-designer/api.md:168-172`

**是什么**

Spreadsheet 当前的 live read path 不是“只读 snapshot”，而是“把内部 live object 包进 snapshot 外壳后返回”：

```ts
return {
  document: state.document,
  selection: state.selection,
  viewport: state.viewport,
  ...
}
```

bridge 再进一步：

```ts
return {
  workbook: runtime.document.workbook,
  activeSheet,
  selection: runtime.selection,
  ...
}
```

所以消费者只要拿到：

- `core.getSnapshot()`
- 或 bridge `getSnapshot()`

就能直接持有 workbook/sheet/cell/selection 的 live 引用，并在不经过 `dispatch(command)` 的情况下原地修改它们。

**为什么值得关心**

这条问题直接违背了 Spreadsheet/Report Designer host bridge 最关键的合同文字：schema/host 只能读取 readonly bridge snapshot，写操作必须走 command。当前 live 实现却把最核心的 mutable document/selection 对象原样暴露给了读面。

这意味着：

1. workbook / activeSheet / selection 可以在 bridge 外被直接改写。
2. 绕过 `dispatch(command)`，也就绕过 undo/redo、dirty tracking、readonly/write boundary。
3. host projection / schema 侧如果误把 snapshot 当普通对象继续操作，会把“读面”变成隐式写面。

它与上一轮 Report Designer 的区别在于：上一轮是 `syncSpreadsheetDocument(...)` 主动把外部引用接进 live state；本轮是 Spreadsheet 自己的常规 live read surface 和 bridge snapshot 本身就在泄露 mutable internal state。

**信心水平**：确定

---

## 本轮小结

这一轮把 designer-family 的同类风险又推进了一层：不仅某些 sync/clone path 有 aliasing，连 Spreadsheet 最日常的 runtime snapshot / host bridge 读面本身都没有守住“只读 snapshot”合同。Flow / Report / Spreadsheet 三个 core 在只读读面与 command-only write 基线上都暴露了不同形态的缺口。

## 本轮盲区自评

- 本轮没有继续验证 Word Editor 是否也存在相同模式的 live read-surface leakage。
- 还没补 focused probe/test 去证明 bridge snapshot 外部 mutation 会直接影响 core state 且不进入 dirty/undo 流程；当前结论基于对象引用路径和已公开 contract 的对照。
- 下一轮应再次做 fresh sweep；如果没有新的高价值问题，就停止。
