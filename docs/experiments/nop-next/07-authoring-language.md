# 07. 作者语言

## 目标

本文件把前面的概念压到作者可写、编译器可吃、运行时可落的最小语言面。

原则：

1. 作者写 `事实`、`投影`、`触发`、`目标`、`配方`、`证明策略`
2. 作者不写通用流程图
3. 作者不直接写宿主 API 调用
4. 作者代码必须可 lowering 到稳定 IR

## 文件结构

一个应用单元由 7 类声明组成：

1. `cell`
2. `projection`
3. `intent`
4. `goal`
5. `recipe`
6. `binder`
7. `proof-policy`

## 语法草案

```txt
module OrderEditor

cell authority order : Order by orderId

cell replica orderDraft : OrderDraft
  from order
  sync draft
  reconcile OrderDraftMerge

cell authority submitReceipt : SubmitReceipt by orderId

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

## 语义规则

### 1. cell 声明

`cell` 的最小字段：

1. kind: `authority` 或 `replica`
2. id
3. value type
4. key space
5. source authority，仅 replica 需要
6. sync mode，仅 replica 需要
7. reconcile policy，仅 replica 需要
8. conflict policy，authority 可省略，默认 `reject-stale`

禁止：

1. 一个 replica 同时从多个 authority 派生
2. authority 没有主键域
3. draft/cache/fork 不声明 reconcile policy

### 2. projection 声明

`projection` 必须显式列出 `reads` 面。

允许：

1. 参数化 key 访问，例如 `orderDraft[orderId]`
2. 有界集合访问，例如 `orderItems[*].price`

禁止：

1. 运行时字符串拼路径
2. 读取 ambient context
3. 在 projection 中触发 effect

### 3. intent 声明

`intent` 只定义输入 payload 类型，不定义执行步骤。

规则：

1. 一个 intent family 只能被一个 binder owner 绑定
2. intent 名称应表达语义触发，而不是技术动作

### 4. goal 声明

`goal` 最少需要：

1. payload signature
2. required/optional portability classes
3. outcome set
4. required/optional effect classes
5. required/optional proof classes
6. satisfaction predicate
7. satisfaction surface
8. version surface
9. recipe ref

规则：

1. satisfaction predicate 必须是纯判定函数
2. satisfaction surface 必须显式列出 predicate 可读的 cell/selectors
3. version surface 必须显式列出 reducer 可读取版本号的 target selectors
4. recipe ref 必须指向有界 recipe 定义
5. outcome set 中必须至少包含 `rejected`
6. 如果系统允许 `partially-satisfied`，它必须出现在 goal 的 outcome set 中；否则运行时不得产出该状态

### 5. recipe 声明

`recipe` 是作者可见但受限的有界配方语言，不是通用流程图。

slot 允许声明：

1. slot id
2. dependsOn
3. portability class
4. required proof class
5. required scope expression
6. effect class
7. payload builder
8. receipt reducer
9. patch targets
10. onRejected outcome

规则：

1. recipe 必须是 DAG
2. slot 数量必须可静态确定
3. recipe 不允许循环、脚本节点、运行时插槽扩张
4. requested proof 获取不是显式业务 slot，而是 `needs proof` 的标准解析步骤
5. 同一 portability class 下多个 slot 的聚合规则必须固定：所有 slot satisfied 才能让该 class satisfied；任一 slot rejected 则该 class rejected；存在 deferred 且无 rejected 时该 class deferred
6. 服务于 required portability 的 slot，其 `onRejected` 只能是 `rejected`

### 6. binder 声明

`binder` 的作用是把 intent family 映射到 goal family。

规则：

1. binder 可以带 guard，但 guard 必须纯且可编译
2. binder 不得依赖宿主运行时对象
3. binder 决定 goal family，不决定 effect 执行细节
4. binder 必须显式声明 intent payload 到 goal payload 的映射

### 7. proof-policy 声明

`proof-policy` 定义某类 proof 如何获得。

字段：

1. proof class
2. source: `derived` 或 `requested`
3. verifier 或 issuer
4. revocation channel
5. scope template

规则：

1. `requested` proof 必须绑定 `proof/*` effect class
2. `derived` proof 必须能通过本地 verifier 独立验证
3. scope template 必须可由 intent/goal payload 实例化
4. `requested` proof 必须声明 proof request payload builder 与 proof receipt schema

## Patch 契约

所有 `ReceiptReducer` 必须返回显式 patch：

```ts
interface FactPatch {
  targetCell: string
  key: string
  op: 'upsert' | 'delete' | 'merge'
  value?: unknown
  expectedTargetVersion: number
}
```

规则：

1. patch target 必须在 slot 的 `patch-targets` 中预声明
2. patch 必须带 `expectedTargetVersion`
3. patch 不得写未声明 cell

Reducer 运行时输入固定为：

1. current receipt
2. goal payload
3. satisfaction-surface values
4. version-surface values
5. instantiated selector bindings

## Portability 契约

goal 中声明的 portability class 必须分成两类：

1. `required`
2. `optional`

规则：

1. 所有 required class 满足前，goal 不能进入 `satisfied`
2. optional class 可进入 `deferred`，但不得把 required class 一并拖入失败

## Version Surface

patch 的版本读取不属于 `satisfaction-surface`，而属于独立的 `version-surface`。

运行时可以读取 version-surface 上的当前版本号，用于填充 reducer 所需的 `expectedTargetVersion`。

## Authority 冲突策略

authority cell 的版本冲突不能复用 replica reconcile 语义，可显式声明：

1. `reject-stale`
2. `reload-and-rerun`
3. `domain-merge`

默认策略是 `reject-stale`。

## 作者语言中的受控自定义代码

作者只允许引用以下命名函数：

1. `Deriver`
2. `Predicate`
3. `ReceiptReducer`
4. `ReconcilePolicy`
5. `ProofVerifier`
6. `PayloadBuilder`

这些函数都必须在注册表中有类型签名和 purity 标记。

## 编译错误清单

以下情况必须在编译期报错：

1. intent 未绑定 goal
2. goal 引用了不存在的 recipe
3. recipe slot 引用了未声明的 proof/effect class
4. projection 读面超出静态有界分析能力
5. requested proof 没有 proof issuer contract
6. bootstrap attestation 可启动的 proof class 超出声明范围
7. binder 未声明 payload mapping
8. reducer 返回的 patch 未携带 expectedTargetVersion
9. goal 未声明 satisfaction surface
10. requested proof 未声明 request payload builder 或 proof receipt schema
11. goal 未声明 version surface
