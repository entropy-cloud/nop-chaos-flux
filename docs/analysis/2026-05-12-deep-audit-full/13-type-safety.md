# 维度 13：类型安全与动态边界

## 范围与状态

- 审核范围：dynamic data boundary、persisted JSON、production data renderer 中的 `any`/unchecked casts。
- 来源限定：本文件仅基于同目录 `stage-1-full-findings-11-15.md`、`raw-findings-07-20.md`、`final-review-results-11-15.md`、`summary.md` 重写。
- 当前状态：最终归档维度文件。运行时代码未修改。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 1 项：`13-01`。
- 第 2-5 轮追加深挖发现 1 项：`13-02`。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

- 最终复核条目数：2。
- 最终保留：2。
- 最终驳回：0。
- 严重程度分布：P2 1 项，P3 1 项。

## 最终保留项

### [13-01] Persisted datasets JSON 未校验直接断言为 `Dataset[]`

- 文件：`packages/word-editor-core/src/document-io.ts:131-150`
- 严重程度：P2
- 当前行为：从 `localStorage` 读取的数据 parse 后直接 cast 为 `Dataset[]`。
- 风险：语法合法但 shape 错误的 persisted data 会作为可信 typed data 进入 editor state，引发下游 shape errors 或无效状态。
- 建议：为 `Dataset[]` 增加 runtime validation/coercion，丢弃或修复 invalid entries。
- 误报排除：`try/catch` 只处理 parse/storage exceptions，不验证 array 和 dataset item shape。
- 最终复核结论：保留，P2。
- 修订标题/理由：标题保持为 persisted word-editor datasets JSON parse 后直接 cast；最终复核补充未复用 validation helpers。
- 证据片段：

```ts
export function loadDatasets(): Dataset[] {
  try {
    const storage = getStorage();
    if (!storage) return [];

    const raw = storage.getItem(DATASET_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Dataset[];
  } catch {
    return [];
  }
```

### [13-02] table data pipeline 用 `Record<string, any>` 吞掉数据源边界类型

- 文件：`packages/flux-renderers-data/src/table-renderer/table-data.ts:9-16`, `28-35`, `60-62`
- 严重程度：P3
- 当前行为：表格核心数据处理接受 `Record<string, any>`，之后直接读取字段用于 row key、排序、过滤和渲染。
- 风险：schema/runtime 数据源边界无法阻止非 record row 或 unsafe member access，TypeScript 也无法提示错误使用。
- 建议：改为 `Record<string, unknown>[]`，在进入 table processing 前 validate/coerce 行数据，字段读取处显式 narrow。
- 误报排除：排除测试 any；该处是 production data renderer 的数据源入口。
- 最终复核结论：保留，P3。
- 修订标题/理由：标题保持为 table data pipeline data-source boundary 使用 `Record<string, any>`；最终复核补充该 pipeline 将 any array source cast 为 rows。
- 证据片段：

```ts
export function normalizeRowKey(
  record: Record<string, any>,
  rowKey?: string,
  fallbackIndex?: number,
): string {
```

```ts
export function buildTableRowEntries(
  source: Array<Record<string, any>>,
  rowKey?: string,
): TableRowEntry[] {
```

```ts
export function processTableData(
  source: Array<Record<string, any>>,
```

## 最终驳回项

无。
