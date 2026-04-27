# 02. 核心语言

## 设计目标

框架底层只负责 6 件事：

1. 管理状态 authority
2. 管理副本与快照
3. 管理视图投影
4. 管理语义触发
5. 管理目标达成
6. 管理效果证明与兑现

它不直接负责：页面设计器、权限平台、流程平台、组件物料市场。

## 六个一等概念

### 1. Authority Cell

`Authority Cell` 是某个逻辑事实的唯一可写权威 owner。

约束：

1. 每个逻辑事实必须有且只有一个 authority cell。
2. 任何可变提交都必须最终落到 authority cell 或被 authority 拒绝。
3. authority cell 可以有副本，但副本必须声明同步关系。

### 2. Replica Cell

`Replica Cell` 是 authority 的派生副本，用于草稿、缓存、离线、宿主镜像等场景。

约束：

1. replica 必须声明其 authority 来源。
2. replica 必须声明同步策略：`draft`、`cache`、`mirror`、`fork`。
3. merge 不是隐式覆盖，而是显式 reconciliation policy。

### 3. Projection

`Projection` 是从一个有界 snapshot surface 到 UI/数据片段的纯映射。

约束：

1. Projection 不持有能力。
2. Projection 不直接触发副作用。
3. Projection 读取面必须静态有界，可以是参数化读族，但不能是无限动态 context。

### 4. Intent

`Intent` 是触发，不是执行图。

例子：

- `Order.SubmitDraft`
- `Customer.EditRequested`
- `List.RefreshRequested`
- `Route.DetailRequested`

约束：

1. Intent 只表达发生了什么语义请求。
2. Intent 不内嵌宿主 API 引用。
3. Intent 必须通过 `Goal Binder` 映射到确定 goal family。

### 5. Goal

`Goal` 是系统希望达成的后置条件契约，不是作者手写的过程图。

例子：

- `OrderDraft persisted and receipt cell updated`
- `Customer editor opened in interactive host`
- `Order list synchronized with remote authority`

约束：

1. Goal 必须可判定是否达成。
2. Goal 必须声明允许的 outcome：`satisfied`、`partially-satisfied`、`deferred`、`rejected`。
3. Goal 必须声明需要哪些 proof class 与 effect class。
4. Goal 必须声明 `satisfaction predicate`、`receipt reducer` 和 `bounded effect slots`。

这里的关键不是“系统自己想办法完成”，而是“作者声明目标契约，编译器把它降低成有界 recipe”。

### 6. Proof

`Proof` 不是 capability handle，而是某个 effect request 可以被宿主兑现的证明对象。

Proof 至少绑定：

1. principal
2. tenant
3. resource scope
4. effect class
5. time window
6. boundary
7. audit lineage
8. issuer
9. revocation epoch
10. signature or verifiable token

没有 proof，不允许发出可兑现的 effect request。

### 6.1 Proof Grant

`Proof Grant` 是编译期和装配期可见的授权模板，定义哪类 goal 在什么边界下可申请哪类 proof。

它和运行时 `Proof` 的关系是：

1. Grant 是策略模板
2. Proof 是某次执行拿到的可验证实例

没有 grant，就不允许 mint proof。

### 6.2 Proof Source

`Proof` 只允许来自两种来源：

1. `Derived Proof`：可由本地已持有的签名令牌、会话声明或宿主预装信封纯验证得出
2. `Proof Receipt`：通过显式 `Proof Request` 发给 proof issuer 后返回的收据

禁止第三种来源：运行时不得通过未审计的宿主通道“临时 mint proof”。

### 6.3 Proof Request / Proof Receipt

当 proof 不能本地派生时，必须走 proof 请求链路。

1. `Proof Request` 是 effect request 的特例，effect class 属于 `proof/*`
2. `Proof Receipt` 是带签名与 issuer 证据的专用 receipt
3. proof issuer 也必须处于 effect manifest 和审计模型内

### 6.4 Bootstrap Attestation

为避免“首个 proof 还没拿到，所以永远无法请求 proof”的循环，本方案引入受限的 `Bootstrap Attestation`。

它的规则是：

1. bootstrap attestation 不是普通 proof，不能授权业务 effect
2. 它只能授权 `proof/*` 类请求
3. 它必须绑定 principal、tenant、resource scope、boundary、freshness epoch
4. 它必须来自宿主启动信封、登录会话令牌或预装签名材料
5. 它必须可验证、可过期、可审计
6. 它只能申请其自身范围子集内的 proof class，不得扩权
7. 一旦拿到正式 proof，后续业务 effect 不得再依赖 bootstrap attestation

## 二个执行概念

### 7. Effect Request

`Effect Request` 是运行时对宿主发出的声明式效果请求。

它不是“直接调用 API”，而是“请求宿主在 proof 约束下兑现一个效果”。

注意：`Proof Request` 也是 effect request，只是它生产的是 proof receipt，而不是业务 effect receipt。

普通业务 effect request 需要 proof；`proof/*` request 需要 proof 或 bootstrap attestation 二者之一。

Effect Request 至少包含：

1. request key
2. goal linkage
3. effect class
4. payload
5. required proof ids
6. idempotency contract

### 8. Effect Receipt

`Effect Receipt` 是宿主对 effect request 的兑现记录。

它用于：

1. 幂等重试
2. 崩溃恢复
3. 审计回放
4. 结果归因

Receipt 不是一个薄状态码，而必须携带：

1. typed result
2. applied effect class
3. authority impact declaration
4. outcome hint
5. host evidence

### 9. Goal Recipe

`Goal Recipe` 是编译器固化后的有界执行配方。

它可以来自两种输入路径：

1. 作者声明受限 recipe，再由编译器校验并固化
2. 上层工具生成 recipe，再由编译器校验并固化

它不是作者手写流程图，必须满足：

1. effect slot 数量有上界
2. slot 之间只允许有限偏序关系，不允许任意循环
3. 每个 slot 必须绑定 proof class、effect class、receipt reducer
4. recipe 必须能在编译期导出最坏 effect cardinality

## 作者不直接面对 Flow

运行时内部仍可生成短命 `Plan`，但 plan 不是作者的一等语言。

这是本方案和 action graph 的关键分界：

1. 作者声明的是 intent、goal、proof policy
2. 编译器生成的是有界 goal recipe，运行时据此生成单次 plan
3. 内部 plan 不允许反向泄漏成作者级流程 DSL

## 最小接口草案

```ts
type CellId = string
type IntentId = string
type GoalId = string
type ProofId = string
type EffectRequestId = string

interface Intent<I = unknown> {
  id: IntentId
  payload: I
}

interface Goal {
  id: GoalId
  outcomes: Array<'satisfied' | 'partially-satisfied' | 'deferred' | 'rejected'>
  satisfaction: string
  requiredEffectClasses: string[]
  requiredProofClasses: string[]
  maxEffectCount: number
}

interface Proof {
  id: ProofId
  issuer: string
  principal: string
  tenant: string
  resourceScope: string
  effectClass: string
  boundary: string
  revocationEpoch: number
  validFrom: number
  validTo: number
  signature: string
}

interface EffectRequest {
  id: EffectRequestId
  goalId: GoalId
  effectClass: string
  payload: unknown
  proofIds: ProofId[]
  idempotencyKey: string
}

interface EffectReceipt {
  requestId: EffectRequestId
  status: 'accepted' | 'completed' | 'rejected'
  effectClass: string
  outcomeHint?: 'satisfied' | 'partially-satisfied' | 'deferred' | 'rejected'
  result?: unknown
  authorityImpact?: string[]
  externalRef?: string
}
```

## 关键不变量

1. 没有 authority 的逻辑事实不允许存在。
2. 没有声明同步关系的 replica 不允许存在。
3. 没有 proof 的外部 effect 不允许被宿主兑现。
4. 一个 intent 必须确定地落到一个 goal family，而不是运行时随缘分派。
5. Projection 读取的是一个有界一致性 snapshot，不是活的上下文对象。
6. 每个 effect request 都必须先持久化，再由宿主兑现，再返回 receipt。
7. 降级不是“假装成功”，而是 outcome 的显式状态变化。
8. 每个 goal family 都必须存在可机器检查的 satisfaction predicate。
9. 每个 proof 都必须可追溯到 grant、issuer 和 revocation epoch。
10. 每个 receipt 只能通过声明好的 reducer 影响 authority/replica。
11. 多效果 goal 只能通过 recipe 的有界 slot 偏序表达，不能退化成任意步骤图。
12. proof 获取只能来自 local derivation 或 proof receipt，不能来自隐藏宿主调用。
13. bootstrap attestation 只能用于 `proof/*` request，不能越权授权业务 effect。
14. bootstrap attestation 申请到的 proof，其 principal/tenant/resource scope 不得超出 attestation 自身范围。

## 受控扩展点

为了避免重新引入任意脚本，本方案只开放两类自定义代码：

1. `Deriver`：纯函数，用于派生 projection 或 merge candidates
2. `Effect Adapter`：宿主侧适配器，用于把 effect request 映射到真实宿主能力
3. `Receipt Reducer`：纯函数，用于把 typed receipt 映射为 authority/replica 变更建议
4. `Proof Verifier`：纯函数，用于验证 derived proof 或 proof receipt

限制：

1. Deriver 不得触发副作用。
2. Effect Adapter 不得绕过 proof 检查。
3. Effect Adapter 必须是 closed-world 的，一种 adapter 只能服务预声明的 effect classes。
4. Receipt Reducer 不得直接调用宿主能力。
5. Proof Verifier 不得产生新的 proof，只能验证已有证明材料。
6. 任何自定义逻辑都必须声明输入输出类型与 effect class。

## 为什么这套语言是新的

它不是把 `action` 改名成 `intent`，把 `service` 改名成 `lease` 那么简单。

它的新意在于：

1. 把作者语言从“写过程”改成“写目标”
2. 把宿主授权从“我拿到句柄所以能调”改成“我有证明所以宿主可兑现”
3. 把离线、缓存、草稿从实现细节提升成 authority/replica 语言的一部分
4. 把可恢复性建立在 effect request / receipt，而不是建立在运气和幂等假设上
