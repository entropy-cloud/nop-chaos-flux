# 开放式对抗性审查 — 2026-05-12 — 第一轮

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：已快速浏览近期 `open-ended-adversarial-review-*` 结果；本轮避开 action targeting、form live values、surface/import lifecycle、designer snapshot/host projection 等近期已报主线。落盘后再用全文搜索回查到 `CRUD/Table sort shape mismatch` 曾在 `docs/analysis/2026-05-07-deep-audit-full-8/04-state-ownership.md` 被列为保留项；本轮第一条属于 live revalidation，第二条 `rowKey` select-all 分叉是同一 data renderer 状态桥接模式下的新确认实例。
> 本轮切入点：`flux-renderers-data` 中表格与 CRUD 组合时，两个各自可工作的状态模型是否在共享同一个 scope path 后保持同义。

---

## 发现 1：CRUD 与 Table 对同一个 `sortStatePath` 使用两套不兼容的 sort state shape

**在哪里**

- CRUD 把同一个 `sortStatePath` 透传给内嵌 Table，并声明 `sortOwnership: 'scope'`：`packages/flux-renderers-data/src/crud-renderer.tsx:258-270`
- CRUD 自己把排序状态规范化为 `{ field, order }`：`packages/flux-renderers-data/src/crud-renderer-state.ts:25-28,58-63`
- Table scope sort 只读取 `{ column, direction }`：`packages/flux-renderers-data/src/table-renderer/use-table-sort.ts:43-55`
- Table header sort 又把同一路径写回 `{ column, direction }`：`packages/flux-renderers-data/src/table-renderer/use-table-sort.ts:88-91`

**是什么**

CRUD 和 Table 表面共享同一个 `sortStatePath`，但它们对该路径里的值有不同合同：

- CRUD 认为它是 `{ field: string, order: 'asc' | 'desc' }`
- Table 认为它是 `{ column: string, direction: 'asc' | 'desc' | null }`

因此一个 CRUD 初始 scope 中如果存在：

```ts
{ sort: { field: 'name', order: 'asc' } }
```

内嵌 Table 的排序 UI 和实际 `processTableData()` 都看不到它，因为 `useTableSort()` 只读 `column` / `direction`。反过来，用户点击 Table header 后，同一路径会被写成：

```ts
{ sort: { column: 'name', direction: 'asc' } }
```

下一次 CRUD 自己通过 `normalizeSort()` 读取时，又会把它规范化成 `{ field: undefined, order: undefined }`。

**为什么值得关心**

这不是单个字段命名问题，而是两个正确子系统组合后共享了一个不同义的 scope slot：

1. `$crud.sort` 公开状态与 table 实际排序状态会分裂。
2. 初始排序、header 交互、query/status publication 可能互相覆盖或看不到彼此。
3. 测试容易漏掉，因为 CRUD 测试可只看 `{ field, order }` summary，Table 测试可只看 `{ column, direction }`，但两者组合才失败。

**信心水平**：确定

---

## 发现 2：Table select-all 忽略 `rowKey`，会写入 `id` 派生 key，和单行选择使用的 key 不一致

**在哪里**

- Table selection hook 接收原始 `source`，没有接收 `rowKey` 或已规范化的 row entries：`packages/flux-renderers-data/src/table-renderer.tsx:183-186`
- row 渲染/数据处理路径使用 `normalizeRowKey(record, sourceIndex, rowKeyField)` 支持 `schemaProps.rowKey`、`__rowKey`、`id`、legacy index：`packages/flux-renderers-data/src/table-renderer/table-data.ts:9-36,60-69`
- select-all 只用 `String(r.id ?? '')` 判断和写入：`packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:54-62`

**是什么**

单行选择走的是渲染后的 `row.rowKey`，因此会尊重 `rowKey: 'uuid'`、嵌套 row key 或 legacy index fallback。但 header select-all 完全绕开了 `normalizeRowKey()`，直接用每行的 `id` 字段：

```ts
source.every((r) => selectedRowKeys.has(String(r.id ?? '')));
new Set(source.map((r) => String(r.id ?? '')));
```

如果 schema 使用 `rowKey: 'uuid'`，单行勾选会写入 `uuid`，全选会写入 `id`。如果行没有 `id`，全选甚至会把所有行折叠成同一个空字符串 key。

**为什么值得关心**

这会直接破坏 Table/CRUD 的选择合同：

1. 单选与全选写入不同 key 空间，checked 状态会错乱。
2. `onSelectionChange` 和 component handle 读到的 selected keys 不再代表实际行 identity。
3. 自定义 `rowKey` 是表格的核心能力，select-all 恰好是最容易批量放大错误的路径。

**信心水平**：确定

---

## 本轮小结

本轮发现的是 data renderer 的组合语义问题：单独看 CRUD、Table、selection、sort 都有各自状态模型，但一旦由 CRUD 把 Table 内嵌并共享 scope path，排序 shape 不同义；一旦 Table 使用自定义 `rowKey`，单行选择与全选 key 生成路径不同义。这类问题的共同根因是“中间桥接层复用了状态通道，但没有复用同一个规范化函数或同一个状态类型”。

## 本轮盲区自评

- 本轮主要核验 data renderer 的 sort/selection，没有继续覆盖 filter/pagination 是否也存在 CRUD 与 Table shape 漂移。
- 尚未写运行时探针；结论来自 code path 与状态 shape 的静态交叉核对。
- 下一轮适合切到 async data/runtime，请求缓存、参数序列化或运行态治理更可能暴露不同类型的问题。
