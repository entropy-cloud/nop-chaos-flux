# 09. 运行时算法

## 目标

本文件定义可以直接写代码的最小算法框架。

## 算法 1：Intent Dispatch

输入：`IntentIR`, payload

输出：`GoalInstanceIR`

步骤：

1. 校验 intent payload 类型
2. 查询唯一 `BinderIR`
3. 求值 guard
4. 运行 `payloadMapping` 生成 goal payload
5. 捕获 `Epoch Snapshot`
6. 初始化 `outcomeByClass`
7. 创建 `GoalInstanceIR`

失败：

1. 无 binder -> assembly error
2. guard 为 false -> rejected

## 算法 2：Proof Resolution

输入：goal instance, recipe slot

输出：proof refs 或 deferred/rejected

步骤：

1. 根据 slot.proofClass 查 `ProofPolicyIR`
2. 若 source 为 `derived`，执行 `ProofVerifier`
3. 若 source 为 `requested`：
   1. 查是否已有可用 proof
   2. 若无，则运行 `requestPayloadBuilder`
   3. 查询 `proof/*` effect 的 manifest support
   4. 若 proof adapter `unavailable`：
      1. 若当前 proof 只服务 optional portability，则返回 `deferred`
      2. 若当前 proof 服务 required portability，则返回 `rejected`
   5. 若 proof adapter `available`，则尝试使用已有 proof 或 bootstrap attestation 发出 `proof/*` request
   6. 等待 proof receipt
   7. 按 `proofReceiptSchema` 校验 receipt
   8. 校验 receipt 签名、issuer、scope、freshness
4. 验证 proof scope 是否覆盖当前 slot.requiredScope
5. 返回 proof ref

失败：

1. 无法取得 proof -> deferred 或 rejected
2. proof scope 不匹配 -> rejected

说明：

requested proof 获取是 slot 执行前的标准解析步骤，不是单独作者业务 slot。

## 算法 3：Recipe Execution

输入：goal instance, `GoalRecipeIR`

输出：updated goal outcome

步骤：

1. 对 recipe 做拓扑排序
2. 对每个 ready slot：
   1. 读取 slot.portabilityClass 与 effect manifest support
   2. 若 support 为 `unavailable` 且 slot.portabilityClass 属于 optional，则跳过 proof 解析与 outbox 写入，并将对应 `outcomeByClass` 标记为 `deferred`
   3. 若 support 为 `unavailable` 且 slot.portabilityClass 属于 required，则整体 goal -> rejected
   4. 若 support 为 `available`，继续正常执行
   5. 解析 proof
   6. 若 proof resolution 返回 `deferred`：
      1. 若 slot.portabilityClass 属于 optional，则只更新对应 `outcomeByClass`
      2. 若 slot.portabilityClass 属于 required，则整体 goal -> deferred
      3. 跳过当前 slot 的 effect 执行
   7. 若 proof resolution 返回 `rejected`，则按 slot.onRejected 处理
   8. 构建 effect payload
   9. 生成 `EffectRequestRecordIR`
   10. 写入 outbox
   11. 等待 receipt
   12. 运行 `ReceiptReducer`
   13. 生成 authority/replica patch
   14. 应用 patch
   15. 重算 satisfaction predicate
   16. 更新 `outcomeByClass`
3. 对 goal.requiredPortability 与 goal.optionalPortability 中声明的每个 class按 slot 聚合更新 `outcomeByClass`
4. 若 goal.requiredPortability 中所有 class 均满足，则 goal -> satisfied
5. 若某 slot rejected：
   1. 若该 slot 只服务 optional portability，则只更新对应 `outcomeByClass`
   2. 若该 slot 服务 required portability，则整体 goal outcome 必须为 `rejected`

## 算法 4：Receipt Apply

输入：typed receipt, reducer, current epoch snapshot

输出：fact patch set

规则：

1. reducer 是纯函数
2. reducer 只能返回预声明 target 的 patch
3. patch 必须带 expected target version
4. reducer 输入固定为当前 slot receipt、goal payload、goal.satisfactionSurface、goal.versionSurface 与 instantiated selector bindings
5. replica version 冲突时触发 reconciliation；authority version 冲突时触发 `Authority Conflict Handling`

## 算法 4.1：Authority Conflict Handling

输入：authority patch, current authority version, authority conflict policy

输出：applied | rejected | rerun

规则：

1. 若 `expectedTargetVersion` 匹配，则直接应用
2. 若不匹配且 policy 为 `reject-stale`，则当前 goal 进入 `rejected`
3. 若不匹配且 policy 为 `reload-and-rerun`，则重新捕获 version-surface 与 satisfaction-surface，并重跑 reducer
4. 若不匹配且 policy 为 `domain-merge`，则调用显式 domain merge 函数
5. authority conflict 处理结果必须写入 audit log

## 算法 4.2：Portability Outcome Aggregation

输入：某个 portability class 下的全部 slot 状态

输出：该 class 的 `outcomeByClass`

规则：

1. 所有 slot satisfied -> class satisfied
2. 任一 slot rejected -> class rejected
3. 无 rejected 且至少一个 deferred -> class deferred
4. 其余情况 -> class pending
5. 只有当 goal.outcomes 包含 `partially-satisfied` 时，运行时才允许把 class 或 goal 标记为 `partially-satisfied`

## 算法 5：Replica Reconciliation

输入：authority fact, replica fact, reconcile policy

输出：merged fact 或 conflict record

策略接口：

```ts
interface ReconcilePolicy<A, R, M> {
  merge(input: {
    authority: A
    replica: R
    baseVersion: number
    authorityVersion: number
  }):
    | { kind: 'merged'; value: M }
    | { kind: 'conflict'; reason: string }
}
```

## 算法 6：Crash Recovery

启动时：

1. 扫描 outbox 中 `pending/sent` request
2. 按 `idempotencyKey` 查询是否已有 receipt
3. 有 receipt 则走 `Receipt Apply`
4. 无 receipt 则重发 request
5. 重新计算 goal instance outcome 与 `outcomeByClass`

## 最小运行时模块

原型至少需要这 8 个模块：

1. `fact-store`
2. `snapshot-engine`
3. `binder-registry`
4. `recipe-engine`
5. `proof-engine`
6. `outbox`
7. `adapter-host`
8. `audit-log`

## 原型顺序

### P1

只支持：

1. authority/replica cell
2. single binder with payload mapping
3. single-goal single-slot recipe
4. derived proof
5. local receipt apply

### P2

增加：

1. multi-slot recipe
2. requested proof
3. proof receipt
4. crash recovery
5. multi-portability outcomeByClass

### P3

增加：

1. bootstrap attestation
2. offline reconciliation
3. host trimming
