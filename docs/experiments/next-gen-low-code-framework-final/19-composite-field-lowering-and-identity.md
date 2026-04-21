# 19 Composite Field Lowering And Identity

## 1. 目标

本文只解决前面分册之间尚未完全闭合的两类 bridge：

1. `array-field` 从 authoring `itemKey` 到 IR `itemKeyPath` 再到 runtime `rowKey` / index mode 的 lowering。
2. `editable-staged` / `rowEditor` 从 authoring 语义到 draft owner commit target 的 lowering。

它不重复发明新的 owner family，也不替代 `04` / `17` / `18`。

## 1.1 与 04 / 13 / 17 / 18 的关系

1. `04-owner-validation-and-data-model.md` 仍是 composite field owner 语义 owner。
2. `13-field-json-design-examples.md` 仍是 authoring JSON 示例 owner。
3. `17-execution-package-ir-spec.md` 仍是字段级 IR DTO owner。
4. `18-mvp-kernel-pseudocode.md` 仍是执行步骤 owner。
5. 本文只补齐它们之间的 lowering / identity / commit-target bridge。

## 2. Array Identity Lowering

### 2.1 两种 collection identity mode

`array-field` 只有两种运行时 identity mode：

1. `keyed`
2. `index`

Lowering 规则：

1. authoring 有 `itemKey` 时，编译后 `ArrayFieldBindingDefinition.itemKeyPath` 必须存在，runtime mode = `keyed`。
2. authoring 无 `itemKey` 时，`itemKeyPath` 缺失，runtime mode = `index`。
3. `index` 不是退化成“假装也有稳定 rowKey”，而是显式表示 continuity 不保证。

### 2.2 `rowKey` 的定义

```ts
type CollectionIdentityMode = 'keyed' | 'index';

interface CollectionRowIdentity {
  mode: CollectionIdentityMode;
  rowKey?: string;
  itemKeyPath?: string;
  itemKeyValue?: string | number | boolean;
  sourceIndex: number;
}
```

规则：

1. 只有 `keyed` mode 才要求 stable `rowKey`。
2. `rowKey` 必须只由当前 item 的 canonical `itemKeyPath` 值稳定派生。
3. `rowKey` 不能依赖对象地址、渲染顺序、随机数。
4. `index` mode 下允许 runtime 使用临时内部 token，但它不是 stability contract，不能冒充 stable `rowKey`。

### 2.3 `keyed` mode 行为

`keyed` mode 下：

1. reorder 不改变同一 item 的 `rowKey`。
2. field state migration、row scope cache、node resolution reuse、journal metadata 都按 `rowKey` 追踪。
3. `array-remove` 后被删除 row 的 async run、field state、row scope cache 必须按 `rowKey` 清理。
4. 若 `itemKeyPath` 解析结果为空、重复或非稳定标量，必须进入 diagnostics，并拒绝把该 collection 当成 `keyed` collection 执行。

### 2.4 `index` mode 行为

`index` mode 下：

1. 值地址就是唯一权威地址，例如 `items.3.qty`。
2. reorder/remove 后不保证 child field state、row scope、draft target continuity。
3. reorder/remove 必须发出 continuity-risk diagnostics。
4. validation / cache / row runtime 默认按 index remap 或直接失效，不要求保留原 row identity。

## 3. Cache And Journal Contract

### 3.1 Row scope cache

1. `rowKey` cache 只适用于 `keyed` mode。
2. `index` mode 不要求 reorder 后命中同一 row scope cache。
3. `index` mode 下 reorder/remove 可直接失效相关 row scope / node-resolution cache。

### 3.2 Journal metadata

数组结构写入记录规则：

1. `keyed` mode 的 `array-insert` / `array-remove` / `array-move` 应记录 `rowKey`。
2. `index` mode 的 journal 只要求记录结构位置与必要值快照，不要求 stable `rowKey`。
3. replay keyed collection 时按 `rowKey` 维持 identity continuity。
4. replay index collection 时只恢复结构结果，不承诺 row continuity。

## 4. Row Editor Lowering

### 4.1 `useItemSchema: true`

`rowEditor.useItemSchema: true` 的 lowering 规则固定为：

1. row draft owner 的编辑模板直接复用 `ArrayFieldBindingDefinition.itemTemplateId`。
2. 不再要求 authoring 再写第二份 row fields。
3. 若同时显式提供 `contentTemplateId`，它必须与 `itemTemplateId` 指向同一 canonical item schema；否则编译拒绝。

### 4.2 Row draft commit target

```ts
interface RowDraftCommitTarget {
  collectionPath: string;
  identityMode: 'keyed' | 'index';
  rowKey?: string;
  sourceIndexAtOpen: number;
}
```

规则：

1. 每个 `editable-staged` row draft owner 在 open 时必须冻结 `RowDraftCommitTarget`。
2. `keyed` mode 下，commit target 以 `rowKey` 为主，`sourceIndexAtOpen` 仅作 diagnostics 辅助。
3. `index` mode 下，commit target 只能以 `sourceIndexAtOpen` 为主，并承担 reorder/remove continuity risk。

### 4.3 Confirm targeting

row draft confirm 的目标解析顺序固定为：

1. `keyed` mode：按 `rowKey` 在当前 collection 中重新定位目标 row。
2. 若 keyed row 不存在，commit 失败并进入 `stale-dropped` 或 `business-error` diagnostics，不得静默写错行。
3. `index` mode：按 `sourceIndexAtOpen` 写回。
4. 若 index mode 下 collection shape 已变化导致 target 不再可信，必须拒绝 commit 或要求 reopen，不得假定“还是原来那一行”。

## 5. Kernel Pseudocode Refinement

`18-mvp-kernel-pseudocode.md` 中 generic `confirmDraftOwner(...)` 对 row draft 需要按下列细化理解：

```text
confirmRowDraftOwner(childOwnerId, parentOwnerId, commitTarget)
  result = validateAll(childOwnerId, reason='commit')
  if result.invalid
    return invalid
  transformed = runTransformOut(childOwnerId)
  resolvedTarget = resolveRowDraftCommitTarget(commitTarget)
  if resolvedTarget.failed
    recordFailure(resolvedTarget.failureKind)
    return failed
  writes = lowerDraftCommitToParentWrites(transformed.value, resolvedTarget)
  enqueueTxInput({ kind: 'write', payload: writes })
  enqueueTxInput({ kind: 'reconcile', payload: { type: 'parent-revalidate', parentOwnerId, sourceChildOwnerId: childOwnerId } })
  enqueueTxInput({ kind: 'reconcile', payload: { type: 'dispose-child-after-commit', childOwnerId } })
```

## 6. Variant `project` Revalidation Refinement

`variant-field.inactiveBranchPolicy = 'project'` 的 bridge 固定为：

1. 先写 discriminator。
2. 再写 projection 产物。
3. 随后必须对 `fieldPath` 对应 subtree 进入 revalidation。
4. 这条 revalidation 可以通过 `variant-switch` reconcile 完成，但协议上必须被明确视为 required effect，而不是实现可选项。

## 7. Conformance Impact

以下 case family 必须按本文语义解释：

1. `collection-identity-*`
2. `validation-edge-*` 中的 `array reorder/remove` 与 `variant switch`
3. `draft-confirm-*`

最少新增的断言重点：

1. keyed reorder 后同 `rowKey` draft target 仍能定位到正确 row。
2. index mode reorder/remove 后必须出现 continuity-risk diagnostics。
3. `useItemSchema: true` 不允许隐式产生第二套 item schema。
4. variant `project` 切换后必须发生 subtree revalidation。

## 8. 明确拒绝的 bridge

1. 无 `itemKey` 时仍宣称存在 stable `rowKey`。
2. row draft confirm 只按“当前可见 index”盲写 parent row。
3. `useItemSchema: true` 但实际运行时偷偷复制出第二份 item schema。
4. variant `project` 只投影不 revalidate。
