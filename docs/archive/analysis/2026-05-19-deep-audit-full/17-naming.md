# 维度 17: 命名与术语一致性

## 第 1 轮（初审）

### [维度17-01] SourceSchema 测试仍使用非规范 `sourceType` 字段

- **文件**: `packages/flux-react/src/__tests__/node-source-prop-controller.test.ts:102-120`; `packages/flux-react/src/__tests__/use-source-value.test.tsx`
- **证据片段**:

  ```ts
  controller.subscribe(listener);
  controller.run({ items: { type: 'source', sourceType: 'api' }, plain: 'keep' }, scope);

  expect(observer.run).toHaveBeenCalledWith({
    scope,
    entries: [
      {
        key: 'items',
        source: { type: 'source', sourceType: 'api' },
  ```

- **严重程度**: P2
- **冲突名称**: `sourceType: 'api'` vs `action` / `formula`
- **冲突位置**: `flux-react` source tests vs `SourceSchema` types/docs。
- **统一建议**: 将测试改为 `{ type: 'source', action: 'ajax' }` 或公式形态；若只是 sentinel，避免使用像 authoring contract 的字段名。
- **现状**: 当前 `SourceSchema` 类型和 docs 只定义 `action?/formula?` carrier，但测试样例使用不存在的 `sourceType`。
- **风险**: 开放 schema index signature 不会阻止该字段，后续维护者可能复制测试样例到 docs/renderer。
- **为什么值得现在做**: 低成本测试数据收敛，防止公开 JSON carrier 口径漂移。
- **误报排除**: 不是普通业务变量；对象直接是 `{ type: 'source' }` carrier。
- **参考文档**: `docs/references/flux-json-conventions.md`, `docs/architecture/api-data-source.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

维度 17：未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度17-01]: 保留 (P2)。live tests 多处使用非 canonical `sourceType`，而类型/文档基线为 `action`/`formula`。

## 子项复核结论

无。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                            | 一句话摘要                                        |
| ----- | -------- | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| 17-01 | P2       | `packages/flux-react/src/__tests__/node-source-prop-controller.test.ts:102-120` | SourceSchema 测试样例使用非规范 `sourceType` 字段 |
