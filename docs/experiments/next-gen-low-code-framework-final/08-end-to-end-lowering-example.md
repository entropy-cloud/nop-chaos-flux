# 08 End-To-End Lowering Example

## 1. Authoring 示例

```json
{
  "type": "page",
  "body": [
    {
      "type": "form",
      "body": [
        {
          "type": "input-text",
          "name": "companyId",
          "label": "Company ID"
        },
        {
          "type": "data-source",
          "name": "companyLookup",
          "dependsOn": ["companyId"],
          "api": {
            "url": "/api/company/${companyId}"
          },
          "resultMapping": {
            "companyName": "${payload.name}",
            "taxCode": "${payload.taxCode}"
          },
          "mergeToScope": true,
          "statusPath": "companyLookupStatus"
        },
        {
          "type": "reaction",
          "watch": "${companyId}",
          "when": "${value && value !== prev}",
          "actions": {
            "action": "setValue",
            "args": {
              "path": "notes",
              "value": ""
            }
          }
        }
      ]
    }
  ]
}
```

## 2. Lowering 结果

### Template

1. `page` 编译为 root template
2. `form` 编译为 owner-renderer template，携带 `create-owner` boundary
3. `input-text` 编译为 instance-renderer template
4. `data-source` 编译为 null-renderer template + `ResourceDefinition`
5. `reaction` 编译为 null-renderer template + `ReactionDefinition`

### Resource

`data-source` 降为：

```ts
const companyLookupResource: ResourceDefinition = {
  resourceId: 'resource.companyLookup',
  ownerScopePath: '',
  driver: {
    kind: 'refresh-capability',
    requestProgramId: 'capreq.companyLookup.refresh'
  },
  dependsOn: ['companyId'],
  publish: {
    path: '',
    mode: 'shallow-merge',
    mapping: {
      companyName: 'value.payload.name',
      taxCode: 'value.payload.taxCode'
    }
  },
  statusPath: 'companyLookupStatus'
};
```

解释：

1. 异步生产不是 resource 私有 effect，而是通过 refresh capability 请求驱动。
2. publish 最终会 lowering 成一组 `ScopeWrite[]`。

### Reaction

```ts
const companyIdReaction: ReactionDefinition = {
  reactionId: 'reaction.resetNotesOnCompanyChange',
  watchProgramId: 'value.watch.companyId',
  whenProgramId: 'value.when.companyChanged',
  actionsProgramId: 'action.resetNotes'
};
```

## 3. 运行时流程

### 用户输入 `companyId`

1. input renderer 通过 capability `setValue` 发起写入
2. transaction `collect -> apply -> invalidate -> recompute -> publish`
3. `ResourceDefinition.dependsOn = ['companyId']` 命中，调度 resource lane
4. `ReactionDefinition.watch = companyId` 命中，但 dispatch 延后到 `publish` 之后

### resource refresh

1. resource lane 发起 refresh capability
2. fetch 成功后 settle 为新的 transaction
3. mapping 结果 lowering 成：

```ts
[
  { scopeId: 'formScope', path: 'companyName', op: 'set', value: 'Acme' },
  { scopeId: 'formScope', path: 'taxCode', op: 'set', value: 'T-001' }
]
```

4. status summary 同轮 publish 到 `companyLookupStatus`

### reaction dispatch

1. publish 完成后，reaction 在 `settle` 阶段看到 `companyId` 变化
2. dispatch `setValue(notes, '')`
3. 进入新 transaction，不会重入当前 transaction

## 4. 为什么这个例子重要

这个例子同时验证了：

1. authoring construct 到 package lowering 的唯一性
2. capability 单效果出口
3. resource publish 通过 `ScopeWrite[]` 闭合
4. reaction post-publish dispatch
5. form owner 下 value/resource/reaction 的 owner-local 组织

## 5. Composite Field Extension

上面的例子覆盖了 resource / reaction。下面补一个 `array-field + editable-staged` 的 composite lowering 片段，用来承接 `19-composite-field-lowering-and-identity.md`。

### 5.1 Authoring 片段

```json
{
  "type": "array-field",
  "name": "products",
  "label": "Products",
  "itemKey": "id",
  "view": {
    "type": "table",
    "mode": "editable-staged",
    "rowEditor": {
      "surface": "drawer",
      "useItemSchema": true,
      "transformOut": {
        "mode": "merge",
        "type": "object",
        "fields": {
          "id": "${id}",
          "name": "${name}",
          "price": "${price}",
          "summary": "${name} / ${price}"
        }
      }
    }
  },
  "item": {
    "type": "object-field",
    "fields": [
      { "type": "input-text", "name": "name" },
      { "type": "input-number", "name": "price" }
    ]
  }
}
```

### 5.2 Lowering 结果

```ts
const productsField: ArrayFieldBindingDefinition = {
  fieldKind: 'array-field',
  fieldPath: 'products',
  itemKeyPath: 'id',
  itemTemplateId: 'template.products.item',
  tableView: {
    mode: 'editable-staged',
    rowEditor: {
      surfaceKind: 'drawer',
      useItemSchema: true,
      transformOut: { transformId: 'transform.products.rowEditor' }
    }
  }
};
```

解释：

1. `itemKey: "id"` lowering 为 `itemKeyPath: 'id'`，因此 collection identity mode = `keyed`。
2. `useItemSchema: true` 表示 row draft owner 直接复用 `itemTemplateId`，不再生成第二份 row schema。
3. row editor 打开时，runtime 冻结 commit target，例如：

```ts
const commitTarget: RowDraftCommitTarget = {
  collectionPath: 'products',
  identityMode: 'keyed',
  rowKey: 'products:id=p-100',
  sourceIndexAtOpen: 0
};
```

### 5.3 运行时流程

#### keyed row draft confirm

1. 用户打开第 0 行，创建 row draft owner，并冻结 `RowDraftCommitTarget`。
2. 在 draft 打开期间，table 发生 reorder，该商品移动到 index 1，但 `rowKey` 不变。
3. confirm 时执行 `validate -> transformOut -> resolveRowDraftCommitTarget -> commit -> parent revalidate`。
4. 因为当前是 keyed mode，commit target 按 `rowKey` 重新定位，所以最终写回的是当前真实位置，例如：

```ts
[
  { scopeId: 'formScope', path: 'products.1.name', op: 'set', value: 'Updated Name' },
  { scopeId: 'formScope', path: 'products.1.price', op: 'set', value: 99 },
  { scopeId: 'formScope', path: 'products.1.summary', op: 'set', value: 'Updated Name / 99' }
]
```

#### index mode 对照

若 authoring 没有 `itemKey`：

1. lowering 后 `itemKeyPath` 缺失，identity mode = `index`。
2. draft owner 只能冻结 `sourceIndexAtOpen`，不能宣称 stable `rowKey`。
3. 若 draft 打开期间发生 reorder/remove，confirm 必须拒绝 commit 或要求 reopen，并记录 continuity-risk diagnostics。

## 6. 为什么这个例子重要

这一组例子合起来验证了：

1. authoring construct 到 package lowering 的唯一性
2. capability 单效果出口
3. resource publish 通过 `ScopeWrite[]` 闭合
4. reaction post-publish dispatch
5. form owner 下 value/resource/reaction 的 owner-local 组织
6. `itemKey -> itemKeyPath -> rowKey` 的 keyed lowering
7. index mode 不是伪装 keyed mode
8. row draft confirm target 必须是 runtime contract，而不是 UI 临时状态
