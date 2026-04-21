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
