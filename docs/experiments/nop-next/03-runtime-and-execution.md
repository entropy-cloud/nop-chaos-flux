# 03. 运行时与执行模型

## 运行时职责

运行时只做 5 件事：

1. 维护 authority/replica graph
2. 维护一致性 snapshot
3. 把 intent 绑定到 goal
4. 把 goal 降到 bounded recipe，并生成短命 plan
5. 管理 effect request / receipt 生命周期

运行时不负责给作者暴露 action graph DSL，也不负责提供 ambient host API。

## 四层执行平面

### 1. Fact Plane

负责 authority cell、replica cell、reconciliation policy、commit version。

规则：

1. 逻辑事实以 authority 为准。
2. replica 的存在必须可解释。
3. merge 冲突必须落在显式 reconciliation policy。

### 2. Goal Plane

负责从 intent 导出 goal，并判断 goal outcome。

规则：

1. 一个 intent family 必须映射到确定 goal family。
2. 如果存在策略分支，必须在 binder 中显式声明选择条件。
3. 未绑定 intent 是装配错误，不是运行时兜底行为。
4. 每个 goal family 必须已经编译出 recipe、predicate 和 reducers，运行时不能临时发明。

### 2.1 Recipe Plane

负责执行 `Goal Recipe`。

规则：

1. recipe 由有限 `effect slot` 组成。
2. slot 之间只允许 DAG 偏序，不允许任意循环。
3. 每个 slot 的触发条件、proof class、effect class、receipt reducer 都已编译固化。
4. 单个 goal family 的最坏 effect cardinality 必须可静态计算。

### 3. Proof Plane

负责 proof 校验、主体绑定、资源范围约束、宿主支持矩阵。

规则：

1. proof 必须绑定 principal、tenant、resource scope、effect class。
2. 词法可见性不是授权，proof 才是授权。
3. proof 失效时只能产生 `deferred` 或 `rejected` outcome，不能偷跑 fallback effect。
4. proof 必须来自可验证 issuer，并可追溯到 proof grant。
5. proof revocation epoch 如果落后于宿主当前 epoch，则 proof 立即失效。
6. 运行时不得通过隐藏 host capability mint proof；proof 只能被本地验证或通过 proof request 获得。
7. `proof/*` request 可由 bootstrap attestation 启动，但 bootstrap attestation 不能用于业务 effect。
8. bootstrap attestation 发起的 proof request，其 principal/tenant/resource scope 必须是 attestation 范围的子集。

### 4. Effect Plane

负责持久化 effect request、等待宿主 receipt、驱动 commit 与恢复。

规则：

1. 所有外部 effect，包括 proof request，先写入 outbox，再发给宿主。
2. 宿主必须返回 effect receipt，才能进入后续 commit。
3. 崩溃恢复依赖 request key 与 receipt，而不是依赖“外部调用大概没发生”。
4. authority 变更只能由 receipt reducer 根据 typed receipt 生成。

## 一致性 snapshot

本方案不使用“各 cell 自己带版本号就算一致”这种弱定义。

一次 goal 求值读取的是 `Epoch Snapshot`：

1. 它是某个 transaction domain 内的有界一致性切面。
2. projection 和 planner 在同一 epoch 内看到相同事实集。
3. 跨域读取必须显式声明为 `federated snapshot`，并标注非原子边界。

这使系统可以明确回答：某个判断是基于哪一批事实做出的。

## 执行顺序

一次 goal 执行具有以下顺序：

1. 捕获 epoch snapshot
2. 通过 goal binder 生成 goal
3. 装载已编译 recipe
4. 对可本地派生的 proof 做验证；对不可本地派生的 proof 以已有 proof 或 bootstrap attestation 发 proof request 并等待 proof receipt
5. 生成短命 plan
6. 将各 effect request 写入 outbox
7. 宿主兑现并返回 typed receipt
8. 根据对应 reducer 生成 authority/replica 变更
9. 重新求值 satisfaction predicate
10. 发布 goal outcome 与审计记录

这套顺序专门解决“先调外部 API 再来不及记账”的经典重放问题。

## 短命 Plan 的边界

Plan 仍然存在，但它只是一种内部产物。

它必须满足：

1. 不可由作者直接手写或可视化编辑
2. 只服务于单次 goal 达成
3. 只允许有限原语：`read epoch`、`verify proof`、`request proof`、`request effect`、`apply receipt`、`reconcile`
4. 不允许退化成通用脚本宿主

## 多效果 Goal

多效果 goal 不是隐藏工作流，而是有限 slot 配方。

例如 `SubmitDraft` 可被降低为：

1. `validate-remote` slot
2. `persist-order` slot
3. `navigate-detail` slot

约束：

1. slot 数量与偏序在 recipe 中固定
2. 每个 slot 的失败分支只能映射到显式 outcome
3. 不允许在 receipt 结果之外临时插入新 slot

## 降级与可移植性

本方案不接受“缺少能力时随便降级一下”。

每个 goal 必须显式声明 portability class：

1. `pure`
2. `durable`
3. `interactive`
4. `navigational`
5. `local-only`

每个宿主必须声明自己支持哪些 effect class 与 portability class。

如果宿主不支持：

1. goal 可以进入 `deferred`
2. goal 可以进入 `rejected`
3. 只有显式声明替代 outcome 的 goal 才能 `partially-satisfied`

## 调试模型

调试器围绕以下对象展开：

1. `Authority Graph`：事实归属图
2. `Replica Trace`：副本同步与冲突路径
3. `Projection Surface`：某个 UI 片段读了哪些 epoch fact
4. `Intent -> Goal Trace`：触发如何变成目标
5. `Recipe Trace`：goal 使用了哪组 bounded slots
6. `Proof Audit`：哪条证明授权了哪个 effect request
7. `Receipt Timeline`：宿主实际兑现了哪些效果

这比“看某个 action 从上下文里拿到了什么 service”更接近真实复杂度来源。
