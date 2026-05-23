# 维度 14：测试覆盖与质量

## 范围与状态

- 审核范围：Component Lab coverage manifest 与 live routes/specs 一致性，以及 table selection semantics 的测试覆盖。
- 来源限定：本文件仅基于同目录 `stage-1-full-findings-11-15.md`、`raw-findings-07-20.md`、`final-review-results-11-15.md`、`summary.md` 重写。
- 当前状态：最终归档维度文件。运行时代码未修改。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 2 项：`14-01`、`14-02`。
- 第 2-5 轮追加深挖发现 1 项：`14-03`。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

- 最终复核条目数：3。
- 最终保留：3。
- 最终驳回：0。
- 严重程度分布：P3 3 项。

## 最终保留项

### [14-01] Component Lab coverage manifest 漏 live `input-number` route

- 文件：`apps/playground/src/route-model.ts:173-178`; `apps/playground/src/component-lab/renderer-lab-registry.ts:66-71`; `tests/e2e/component-lab/coverage-manifest.ts:167-180`
- 严重程度：P3
- 当前行为：playground route 与 lab registry 暴露 `input-number`，但 E2E coverage manifest 从 `input-password` 跳到 `textarea`，未列出 input-number。
- 风险：Component Lab coverage accounting 漏报 active renderer route，route-specific smoke/coverage 可能漏掉回归。
- 建议：添加 `input-number` manifest entry 和对应 E2E assertion。
- 误报排除：`input-number` 在 route model、lab registry、renderer implementation、lab page 均存在，不是 dead code。
- 最终复核结论：保留，P3。
- 修订标题/理由：标题保持为 Component Lab route/lab registry 有 `input-number`，coverage manifest 缺 entry。
- 证据片段：

```ts
id: 'input-number',
title: 'Input Number',
category: 'form',
sourcePackage: '@nop-chaos/flux-renderers-form',
description: 'Numeric input with min/max, precision, stepper, and prefix/suffix support.',
```

```ts
{
  id: 'input-password',
  title: 'Input Password',
  tier: 'write',
},
{
  id: 'textarea',
```

### [14-02] Component Lab manifest 声明 write coverage，但 specs 只断言 read visibility

- 文件：`tests/e2e/component-lab/coverage-manifest.ts:244-255`; `tests/e2e/component-lab/complex-form.spec.ts:110-124`, `129-148`
- 严重程度：P3
- 当前行为：manifest tier 标记 `write`，但 live specs 至少对 `key-value`/`array-editor` 是 read-style 可见性检查。
- 风险：dashboard/reviewer 会误以为 mutation/write behavior 已锁定，实际只测初始渲染。
- 建议：降级 manifest tiers 为 `read`，或补充真实 write interaction tests。
- 误报排除：manifest 对 `write` 有明确语义，spec 名称和动作显示 read-only。
- 最终复核结论：保留，P3。
- 修订标题/理由：标题保持为 `key-value`/`array-editor` manifest 标 `write` 但 specs 仅验证 read visibility。
- 证据片段：

```ts
{
  id: 'key-value',
  title: 'Key Value',
  tier: 'write',
  primaryScenario: 'HTTP header editing',
  notes: 'Verify pre-populated rows are visible; add a row and verify it appears',
},
{
  id: 'array-editor',
  title: 'Array Editor',
  tier: 'write',
```

```ts
test.describe('key-value renderer', () => {
  test('read: pre-populated HTTP headers are visible', async ({ page }) => {
```

### [14-03] table select-all 缺少 filter/sort/pagination 交互覆盖

- 文件：`packages/flux-renderers-data/src/table-renderer.tsx:214-225`, `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:54-68`
- 严重程度：P3
- 当前行为：渲染使用 filter/sort/pagination 后的 `processedData`，select-all 则基于原始 `source` 的 `normalizedRows`。现有测试只覆盖基础 rowKey/ownership，没有覆盖过滤/分页后的 select-all 语义。
- 风险：“全选”可能选中被过滤掉或当前页不可见的行；如果这是 intended 全源选择，也缺少测试和文档锁定。
- 建议：新增 filter/pagination 下 select-all 的回归测试，然后明确选择基于 visible rows 还是 whole source。
- 误报排除：不是说行为一定错误；本条是测试覆盖缺口且当前代码存在两套数据视角。
- 最终复核结论：保留，P3。
- 修订标题/理由：标题保持为 table rendering 用 processedData，select-all 基于 raw source；最终复核确认缺 filtered/sorted/paginated semantics tests。
- 证据片段：

```tsx
const processedData = useMemo(
  () =>
    processTableData(
      source,
      schemaProps.rowKey,
```

```ts
const normalizedRows = useMemo(
  () => buildTableRowEntries(source, schemaProps.rowKey),
```

```ts
const nextKeys = checked ? new Set(normalizedRows.map((row) => row.rowKey)) : new Set<string>();
```

## 最终驳回项

无。
