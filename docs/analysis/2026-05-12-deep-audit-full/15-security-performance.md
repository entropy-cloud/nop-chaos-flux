# 维度 15：安全与性能红线

## 范围与状态

- 审核范围：安全边界文档一致性与交互路径性能红线。
- 来源限定：本文件仅基于同目录 `stage-1-full-findings-11-15.md`、`raw-findings-07-20.md`、`final-review-results-11-15.md`、`summary.md` 重写。
- 当前状态：最终归档维度文件。运行时代码未修改。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 1 项：`15-01`。
- 第 2-5 轮追加深挖发现 1 项：`15-02`。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

- 最终复核条目数：2。
- 最终保留：2。
- 最终驳回：0。
- 严重程度分布：P2 2 项。

## 最终保留项

### [15-01] Report/spreadsheet sync 热路径全量 `JSON.stringify` spreadsheet document

- 文件：`packages/report-designer-renderers/src/page-renderer.tsx:124-126`, `301-337`
- 严重程度：P2
- 当前行为：report/spreadsheet bridge 在 refs/effects 中通过 stringify 整个 spreadsheet document 比较 sync state。
- 风险：spreadsheet document 变大后，订阅/effect 路径上出现 O(document size) serialization hot-path cost。
- 建议：使用 revision/version counters、structural sharing identity、dirty generation IDs 或 core 维护的 targeted hashes 替代 full stringify。
- 误报排除：不是 cold save/export path；调用位于 React sync effects 与 snapshot subscriptions。
- 最终复核结论：保留，P2。
- 修订标题/理由：标题保持为 report/spreadsheet sync effects 全量 stringify；最终复核确认这是交互路径 O(document size) 成本。
- 证据片段：

```tsx
function serializeSpreadsheetDocument(document: SpreadsheetRuntimeSnapshot['document']): string {
  return JSON.stringify(document);
}
...
const syncingSpreadsheetFromReportRef = useRef(false);
const lastSyncedSpreadsheetRef = useRef(serializeSpreadsheetDocument(spreadsheetSnapshot.document));
const lastAppliedReportSpreadsheetRef = useRef(
  serializeSpreadsheetDocument(snapshot.document.spreadsheet),
);
```

### [15-02] Formula docs 将 `$JSON` 记录为原生 JSON，掩盖 live sanitize 安全边界

- 文件：`docs/architecture/flux-formula.md:342-365`, `packages/flux-formula/src/builtins.ts:41-64`
- 严重程度：P2
- 当前行为：文档声称 `$JSON` 直接返回原生 JSON 且零成本；live code 实际使用包装对象，`parse()` 会深度 sanitize 并移除危险 key。
- 风险：安全语义被文档误导，后续维护者可能为“对齐文档”移除 prototype pollution hardening。
- 建议：更新 formula docs，明确 `$JSON.parse()` 返回 sanitized value，移除 `__proto__`、`constructor`、`prototype`，不是原生 JSON 直通。
- 误报排除：当前代码不是漏洞；问题是安全边界文档低估 live hardening。
- 最终复核结论：保留，P2。
- 修订标题/理由：标题保持为 formula docs native passthrough/zero-cost 与 live sanitize 不一致；最终复核确认这是安全边界文档不一致。
- 证据片段：

```md
| `$Math` | `Math`（原生对象） | `$Math.abs(-3)`、`$Math.round(1.5)`、`$Math.max(1, 2)` |
| `$JSON` | `JSON`（原生对象） | `$JSON.stringify(obj)`、`$JSON.parse(str)` |
...
registry.registerNamespace('$Math', Math);
registry.registerNamespace('$JSON', JSON);
...
`$Math` 和 `$JSON` 直接返回原生对象，零成本。
```

```ts
const DANGEROUS_KEYS_SET = new Set(['__proto__', 'constructor', 'prototype']);
function deepSanitize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepSanitize);
  const result: Record<string, unknown> = Object.create(null);
...
registry.registerNamespace('$JSON', {
  parse(text: string) {
    return deepSanitize(JSON.parse(text));
```

## 最终驳回项

无。
