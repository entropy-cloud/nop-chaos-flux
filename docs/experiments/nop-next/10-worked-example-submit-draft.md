# 10. Worked Example: Submit Draft

## 目标

把一个常见场景从作者语言一路压到 IR、运行时实例和宿主交互。

场景：

1. 编辑订单草稿
2. 提交保存
3. 成功后跳转详情页

## 作者声明

```txt
module OrderEditor

cell authority order : Order by orderId
  conflict reject-stale
cell replica orderDraft : OrderDraft from order sync draft reconcile OrderDraftMerge
cell authority submitReceipt : SubmitReceipt by orderId
  conflict reject-stale

projection OrderForm(orderId: OrderId) reads {
  orderDraft[orderId],
  submitReceipt[orderId]
} => ui/OrderForm

intent SubmitDraft(orderId: OrderId)

goal PersistDraft(orderId: OrderId)
  portability required durable
  portability optional navigational
  outcomes satisfied | deferred | rejected
  requires effects required http/post
  requires effects optional route/go
  requires proofs required order.write
  requires proofs optional route.navigate
  satisfy HasSubmitReceipt(orderId)
  satisfaction-surface {
    submitReceipt[orderId]
  }
  version-surface {
    order[orderId],
    submitReceipt[orderId],
    orderDraft[orderId]
  }
  recipe PersistDraftRecipe

recipe PersistDraftRecipe {
  slot persistOrder {
    portability durable
    needs proof order.write scope OrderScope(orderId)
    request http/post with BuildPersistOrderPayload(orderId)
    reduce ApplyPersistedOrderReceipt
    patch-targets order, submitReceipt, orderDraft
    on rejected => rejected
  }

  slot goDetail after persistOrder {
    portability navigational
    needs proof route.navigate scope RouteScope(orderId)
    request route/go with BuildOrderDetailRoute(orderId)
    reduce NoopReducer
    patch-targets
    on rejected => deferred
  }
}

binder SubmitDraft(orderId) -> PersistDraft(orderId) using {
  orderId: orderId
}

proof-policy order.write
  source requested
  issuer authz-service
  via proof/order-write
  request BuildOrderWriteProofRequest(orderId)
  receipt-schema OrderWriteProofReceipt
  revoke authz-revocation
  scope OrderScope(orderId)

proof-policy route.navigate
  source derived
  verifier local-session
  revoke session-revocation
  scope RouteScope(orderId)
```

## 编译产物

### Binder IR

```ts
const binder = {
  intentId: 'SubmitDraft',
  goalId: 'PersistDraft',
  payloadMapping: '{ orderId: payload.orderId }'
}
```

### Proof Policy IR

```ts
const proofPolicies = {
  'order.write': {
    proofClass: 'order.write',
    source: 'requested',
    issuer: 'authz-service',
    requestEffectClass: 'proof/order-write',
    requestPayloadBuilder: 'BuildOrderWriteProofRequest',
    proofReceiptSchema: 'OrderWriteProofReceipt',
    revocationChannel: 'authz-revocation',
    scopeTemplate: 'OrderScope(orderId)'
  },
  'route.navigate': {
    proofClass: 'route.navigate',
    source: 'derived',
    verifier: 'local-session',
    revocationChannel: 'session-revocation',
    scopeTemplate: 'RouteScope(orderId)'
  }
}
```

### Goal IR

```ts
const goal = {
  id: 'PersistDraft',
  payloadType: '{ orderId: OrderId }',
  portability: ['durable', 'navigational'],
  requiredPortability: ['durable'],
  optionalPortability: ['navigational'],
  outcomes: ['satisfied', 'deferred', 'rejected'],
  requiredEffects: ['http/post'],
  requiredProofs: ['order.write'],
  optionalEffects: ['route/go'],
  optionalProofs: ['route.navigate'],
  satisfactionPredicate: 'HasSubmitReceipt(orderId)',
  satisfactionSurface: [
    {
      cellId: 'submitReceipt',
      selector: { kind: 'key', expr: 'orderId' },
      cardinality: 'one'
    }
  ],
  versionSurface: [
    { cellId: 'order', selector: { kind: 'key', expr: 'orderId' }, cardinality: 'one' },
    { cellId: 'submitReceipt', selector: { kind: 'key', expr: 'orderId' }, cardinality: 'one' },
    { cellId: 'orderDraft', selector: { kind: 'key', expr: 'orderId' }, cardinality: 'one' }
  ],
  recipeId: 'PersistDraftRecipe'
}
```

### Goal Recipe IR

```ts
const persistDraftRecipe = {
  id: 'PersistDraftRecipe',
  goalId: 'PersistDraft',
  maxEffectCount: 3,
  maxBusinessEffectCount: 2,
  maxProofEffectCount: 1,
  slots: [
    {
      id: 'persist-order',
      portabilityClass: 'durable',
      effectClass: 'http/post',
      proofClass: 'order.write',
      requiredScope: 'OrderScope(orderId)',
      payloadBuilder: 'BuildPersistOrderPayload',
      receiptReducer: 'ApplyPersistedOrderReceipt',
      patchTargets: ['order', 'submitReceipt', 'orderDraft'],
      dependsOn: [],
      onRejected: 'rejected'
    },
    {
      id: 'go-detail',
      portabilityClass: 'navigational',
      effectClass: 'route/go',
      proofClass: 'route.navigate',
      requiredScope: 'RouteScope(orderId)',
      payloadBuilder: 'BuildOrderDetailRoute',
      receiptReducer: 'NoopReducer',
      patchTargets: [],
      dependsOn: ['persist-order'],
      onRejected: 'deferred'
    }
  ]
}
```

## 一次真实执行

### Step 1: 发出 intent

```ts
dispatchIntent('SubmitDraft', { orderId: 'O-1001' })
```

### Step 2: 生成 goal instance

```ts
{
  instanceId: 'goal-1',
  goalId: 'PersistDraft',
  payload: { orderId: 'O-1001' },
  epochId: 'ep-42',
  recipeId: 'PersistDraftRecipe',
  outcome: 'pending',
  outcomeByClass: {
    durable: 'pending',
    navigational: 'pending'
  }
}
```

### Step 3: 解析 `persist-order` 所需 proof

运行时发现 `order.write` 为 requested proof，于是先运行 `BuildOrderWriteProofRequest(orderId)`，再在执行 slot 前发出 `proof/*` request。

这里假设当前会话中不存在可复用的 `order.write` proof，因此需要走一次 `proof/order-write` request；但当前会话中已存在可用会话证明，所以不需要 bootstrap attestation。这样该例子可作为 `P2` 目标；bootstrap 冷启动路径单独属于 `P3`。

```ts
{
  id: 'req-proof-1',
  goalInstanceId: 'goal-1',
  slotId: 'persist-order',
  effectClass: 'proof/order-write',
  payload: { orderId: 'O-1001', principal: 'u-7' },
  proofRefs: ['session-proof-1'],
  idempotencyKey: 'goal-1:persist-order:proof'
}
```

宿主返回 proof receipt，经 verifier 验证后，生成 `order.write` proof。

### Step 4: 执行 `persist-order`

```ts
{
  id: 'req-2',
  goalInstanceId: 'goal-1',
  slotId: 'persist-order',
  effectClass: 'http/post',
  payload: { orderId: 'O-1001', draft: { ... } },
  proofRefs: ['proof-order-write-1'],
  idempotencyKey: 'goal-1:persist-order'
}
```

宿主返回：

```ts
{
  requestId: 'req-2',
  status: 'completed',
  effectClass: 'http/post',
  result: {
    receiptId: 'r-91',
    order: { id: 'O-1001', status: 'submitted', version: 9 }
  },
  authorityImpact: ['order:O-1001', 'submitReceipt:O-1001'],
  outcomeHint: 'satisfied'
}
```

### Step 5: reducer 产出 patch

`ApplyPersistedOrderReceipt` 的输入固定包括：

1. current receipt
2. goal payload `{ orderId: 'O-1001' }`
3. `satisfactionSurface` 当前值
4. `versionSurface` 当前值
5. instantiated selector bindings

当前版本假定为：

- `order: 8`
- `submitReceipt: 0`
- `orderDraft: 3`

```ts
[
  {
    targetCell: 'order',
    key: 'O-1001',
    op: 'merge',
    value: { id: 'O-1001', status: 'submitted', version: 9 },
    expectedTargetVersion: 8
  },
  {
    targetCell: 'submitReceipt',
    key: 'O-1001',
    op: 'upsert',
    value: { receiptId: 'r-91', orderVersion: 9 },
    expectedTargetVersion: 0
  },
  {
    targetCell: 'orderDraft',
    key: 'O-1001',
    op: 'delete',
    expectedTargetVersion: 3
  }
]
```

### Step 6: 重新求值 predicate

运行时只在 `satisfactionSurface` 上求值：

```ts
HasSubmitReceipt('O-1001') === true
```

因此：

```ts
outcomeByClass.durable = 'satisfied'
```

### Step 7: 执行 `go-detail`

如果宿主支持 `route/go`，则继续执行导航。

如果不支持：

```ts
outcomeByClass.navigational = 'deferred'
```

这要求目标宿主在 manifest 中把 `route/go` 显式标记为 `unavailable`，而不是让编译器把整个 goal 判为不可装配。

而 durable 结果仍保持：

```ts
outcomeByClass.durable = 'satisfied'
```

因此整体 goal 仍可进入：

```ts
outcome = 'satisfied'
```

因为所有 required portability 已满足，只有 optional portability 被延期。

如果 `order` authority 在提交前已被其他写入更新导致版本不匹配，则本例默认按 `reject-stale` 处理，而不是偷偷覆盖远端新版本。

## 这个例子证明了什么

1. 作者没有手写通用流程图，只写了有界 recipe
2. proof 获取是 slot 执行前的标准解析步骤，不是隐藏 runtime 魔法
3. receipt 驱动 authority patch，而不是 host callback 直接写状态
4. 主业务事实 `order`、附属事实 `submitReceipt`、草稿副本 `orderDraft` 都被一致更新
5. durable 成功和 navigational 延期可被同时表达
6. 本例没有声明 `partially-satisfied`，因此运行时不得产出该状态

## 原型实现建议

把这个例子作为 `P2` 原型目标，只实现：

1. 单模块注册
2. 单 binder payload mapping
3. 两 slot recipe
4. 一个 requested proof
5. 两个 effect adapter: `proof/order-write`, `http/post`
6. 一个 optional adapter: `route/go`
