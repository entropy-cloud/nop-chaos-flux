# Commit-Oriented Low-Code Kernel 完整设计（v1）

> 基线来源：`docs/experiments/next-gen-lowcode-attractor-discovery-independent-v1.md`
>
> 本文目标不是对主流页面-schema 方案做局部优化，而是把 `Commit Unit` 提升为低代码平台的一等执行对象，给出一套可编译、可运行、可协作、可审计、可接入 AI 的完整设计。

## 1. 设计目标

### 1.1 目标

平台必须同时满足以下目标：

1. 用同一执行语义统一 UI 交互、自动化、AI 代理、外部事件四类入口。
2. 把业务变化建模为可解释、可审计、可回放、可合并的提交，而不是隐式上下文里的副作用脚本。
3. 把宿主能力从“到处可拿的 context”收缩为显式申请、显式授予、显式失效的租约。
4. 让编译期能检查可见性、权限、依赖和能力需求，而不只是做 schema 规范化。
5. 让多人协作和 AI 参与构建时，冲突发生在语义层，而不是字符串或 JSON merge 层。

### 1.2 非目标

本文不追求：

- 兼容现有任意页面-schema/action 语义。
- 把所有瞬时 UI 行为都提交化。
- 用单一领域模型覆盖所有可视化设计器品类。
- 取代后端事务系统。

## 2. 核心判断

旧方案的问题不是“页面 schema 不够强”，而是系统把以下对象误当成主语：

- 页面节点
- 组件树
- action handler
- 流程节点

新方案的根判断是：

- 页面只是意图采集器。
- action 只是提交构造器。
- 流程只是提交链路。
- 真正的一等对象只有 `Commit Unit`。

## 3. 最小术语系统

### 3.1 一等术语

1. `Intent Producer`
   任何可以发起业务意图的入口。包括页面按钮、字段提交器、AI agent、cron、webhook、人工审批器。
2. `Commit Draft`
   一个尚未进入 admission 的候选提交，通常由 producer 产生。
3. `Commit Unit`
   通过 admission 后进入执行核的标准化提交。
4. `Admission Contract`
   提交进入执行核前必须满足的声明式前置条件集合。
5. `Constraint Set`
   对状态变更是否成立的业务约束集合。
6. `Capability Lease`
   某个提交在执行窗口中被授予的宿主能力句柄。
7. `Effect Schedule`
   提交通过后可以执行的副作用清单及顺序。
8. `Journal Entry`
   提交执行结果的不可歧义记录。
9. `Projection`
   从状态与日志派生出的 UI、报表、消息、接口输出。
10. `Ephemeral Intent Lane`
   不进入业务日志的瞬时交互通道，用于输入中间态、拖拽预览、光标广播等。

### 3.2 二等术语

- `Page`
- `Form`
- `Workflow`
- `Bot`
- `Webhook`
- `Table`
- `Dialog`

这些都不是执行核主语，而是 projection 或 producer 的具体形态。

## 4. 系统总图

系统分成 7 层：

1. Authoring Layer
   设计器、手写 DSL、AI 生成器。
2. Compile Layer
   校验、lowering、依赖收集、提交模板生成。
3. Intent Layer
   处理用户输入、AI 输出、外部事件并形成 `Commit Draft`。
4. Admission Layer
   执行权限、可见性、前置依赖、能力申请检查。
5. Kernel Layer
   对 `Commit Unit` 做约束求解、状态变更、效果调度、日志落盘。
6. Projection Layer
   从内核状态和日志生成页面、表单、报表、列表、通知、API 响应。
7. Collaboration Layer
   基于 journal、draft、conflict 对多人协作与 AI 协同建模。

最关键的依赖方向：

- 所有入口只能进入 Intent Layer。
- 所有业务变化只能通过 Kernel Layer。
- 所有展示只能从 Projection Layer 派生。
- 宿主能力不允许绕过 Admission Layer 直接进入执行逻辑。

## 5. 核心数据模型

### 5.1 Commit Draft

```ts
type CommitDraft = {
  producerId: string;
  producerKind: 'page' | 'agent' | 'webhook' | 'timer' | 'operator';
  templateId: string;
  targetRef: TargetRef;
  intentPayload: Record<string, unknown>;
  requestedCapabilities?: string[];
  clientContext?: Record<string, unknown>;
  dedupeKey?: string;
};
```

语义：

- draft 只是候选，不代表会被执行。
- draft 可以是不完整的。
- draft 不允许包含直接可执行脚本。

### 5.2 Commit Unit

```ts
type CommitUnit = {
  commitId: string;
  templateId: string;
  producer: ProducerRef;
  target: TargetRef;
  basis: CommitBasis;
  claims: CommitClaim[];
  constraints: ConstraintRef[];
  capabilityRequests: CapabilityRequest[];
  effectPlan: EffectStep[];
  metadata: CommitMetadata;
};
```

语义：

- `basis` 描述提交依据的前提快照、版本、上游日志位置。
- `claims` 是“想改变什么”的声明，不是执行脚本。
- `constraints` 是“什么条件下这些变更才成立”。
- `effectPlan` 是“通过后允许触发什么副作用”。

### 5.3 Commit Claim

```ts
type CommitClaim = {
  path: string;
  op: 'set' | 'merge' | 'append' | 'remove' | 'transition';
  value?: unknown;
  fromState?: string;
  toState?: string;
  reason?: string;
};
```

语义：

- claim 是面向业务状态空间的操作。
- 不允许 claim 在执行时任意读写全局对象。

### 5.4 Constraint

```ts
type ConstraintRef = {
  constraintId: string;
  args?: Record<string, unknown>;
};
```

约束分三类：

1. Visibility Constraint
   当前 producer 是否看得见该提交模板。
2. Permission Constraint
   当前 actor 是否有资格提交此类变更。
3. Business Constraint
   当前业务状态是否允许这次转移成立。

### 5.5 Capability Lease

```ts
type CapabilityLease = {
  leaseId: string;
  capability: string;
  grantedToCommitId: string;
  scope: 'commit';
  expiresAt: number;
  limits?: Record<string, unknown>;
};
```

语义：

- 租约只能绑定到 commit，不绑定到 page 或 component。
- 租约不可被子流程隐式继承，必须重新声明。

### 5.6 Journal Entry

```ts
type JournalEntry = {
  entryId: string;
  commitId: string;
  status: 'accepted' | 'rejected' | 'applied' | 'compensated';
  basisHash: string;
  appliedClaims: CommitClaim[];
  rejectedReasons?: Diagnostic[];
  effects: EffectResult[];
  actor: ActorRef;
  timestamp: number;
};
```

## 6. 状态模型

平台维护三类状态：

1. `Canonical Business State`
   由 journal 折叠或快照恢复出的正式业务状态。
2. `Draft State`
   producer 局部维护的草稿态，不进入正式 journal。
3. `Ephemeral Interaction State`
   输入中间态、hover、drag-preview、cursor-presence 等瞬时状态。

关键边界：

- `Draft State` 可以驱动页面预览，但不能直接触发业务副作用。
- `Ephemeral Interaction State` 不参与业务约束求解。
- 只有 `Canonical Business State` 能作为提交 basis 的可信依据。

## 7. 提交流程

### 7.1 标准流水线

1. Producer 产生 `Commit Draft`
2. Compiler/Resolver 选择对应 `Commit Template`
3. Admission Engine 解析 actor、target、basis、capabilities
4. Constraint Engine 执行前置约束检查
5. 通过后生成 `Commit Unit`
6. Kernel 应用 claims 到 canonical state
7. Effect Engine 根据 `Effect Schedule` 触发副作用
8. Journal Writer 记录结果
9. Projection Engine 更新各类投影

### 7.2 拒绝点

一个 draft 可以在以下阶段失败：

1. Template resolution failure
2. Visibility denial
3. Permission denial
4. Missing capability lease
5. Business constraint failure
6. Basis stale conflict
7. Effect execution failure after state apply

失败策略：

- 1-6 阶段失败时，不产生已应用 journal。
- 7 阶段失败时，必须产生 journal，并记录补偿状态或待处理结果。

## 8. 编译期设计

### 8.1 编译输入

编译器输入不是页面树本身，而是以下几类声明：

- projection declarations
- commit template declarations
- constraint declarations
- capability declarations
- effect declarations
- producer bindings

### 8.2 编译产物

编译后必须得到：

1. `Commit Template Registry`
2. `Constraint Registry`
3. `Capability Manifest`
4. `Projection Spec`
5. `Admission Index`
6. `Diagnostic Report`

### 8.3 编译检查

编译器至少做以下检查：

1. 某 producer 引用的 template 是否存在。
2. template 需要的 capability 是否已声明。
3. claim path 是否指向合法 target 空间。
4. effect 是否依赖未声明 capability。
5. constraint 参数是否完整。
6. projection 读取的字段是否有合法来源。
7. 是否出现绕过 commit kernel 的直接 mutation 声明。

### 8.4 Lowering 原则

页面作者可以写高层糖，但最终都必须降到：

- producer binding
- commit draft builder
- projection formula
- draft-state adapter

任何“点击按钮直接调用 API 并改页面状态”的语法糖，最终都必须拆解为：

1. 构造 draft
2. admission
3. state apply
4. effect schedule
5. projection refresh

## 9. Projection 模型

### 9.1 Projection 定义

projection 是只读派生，不是业务主语。

```ts
type ProjectionSpec = {
  projectionId: string;
  reads: string[];
  derives?: DerivedFieldSpec[];
  viewKind: 'page' | 'table' | 'detail' | 'report' | 'api' | 'notification';
};
```

### 9.2 Projection 原则

1. projection 可以读取 canonical state、selected journal slices、draft overlays。
2. projection 不能直接修改 canonical state。
3. projection 允许叠加本地 draft overlay，展示“未提交预览”。
4. projection 是多形态的，页面只是其中一种。

### 9.3 Page 的新角色

在本设计中，page 只承担三种职责：

1. 展示 projection
2. 维护局部 draft
3. 绑定 intent producer

page 不再承担：

- 全局业务状态 owner
- 隐式 action scope provider
- 任意宿主能力注入点

## 10. Producer 模型

### 10.1 Producer 种类

```ts
type ProducerKind =
  | 'page-event'
  | 'form-submit'
  | 'batch-operator'
  | 'agent'
  | 'webhook'
  | 'timer'
  | 'system-reaction';
```

### 10.2 Producer 职责

producer 只负责：

1. 提供输入参数
2. 指定目标 template
3. 提供局部上下文片段
4. 请求所需 capability

producer 不负责：

- 直接执行副作用
- 持有长期能力引用
- 越过 admission 修改 state

## 11. Admission 模型

Admission Engine 是内核入口守卫。

### 11.1 Admission 检查项

1. Actor identity
2. Producer validity
3. Template visibility
4. Target existence
5. Basis freshness
6. Permission constraints
7. Capability request allowlist
8. Constraint parameter completeness

### 11.2 Admission 输出

输出只有两种：

1. Rejected Draft
   附结构化诊断。
2. Accepted Commit Unit
   进入执行核。

### 11.3 诊断结构

```ts
type Diagnostic = {
  code: string;
  level: 'error' | 'warning';
  message: string;
  path?: string;
  hint?: string;
};
```

## 12. Constraint 模型

### 12.1 约束分类

1. Structural Constraint
   路径、类型、目标存在性。
2. Temporal Constraint
   basis 版本、时序窗口、截止时间。
3. Authority Constraint
   actor、role、tenant、policy。
4. Business Constraint
   领域规则、状态转移条件、跨字段一致性。
5. Resource Constraint
   capability 配额、速率、预算。

### 12.2 约束求解顺序

默认顺序：

1. structural
2. authority
3. temporal
4. business
5. resource

原因：

- 先尽快过滤无意义提交。
- 避免为明显非法提交申请昂贵资源。

## 13. Effect 模型

### 13.1 Effect 的地位

effect 不是业务真相，只是提交被接受后允许发生的外部动作。

### 13.2 Effect 类型

1. `notify`
2. `request`
3. `emit-event`
4. `enqueue-job`
5. `open-surface`
6. `refresh-projection`

### 13.3 Effect 原则

1. effect 必须从 commit 派生，不能反向定义 commit。
2. effect 失败不抹掉已接受的业务提交，但必须进入 journal。
3. effect 若需要外部资源，必须消费 capability lease。

## 14. Capability 模型

### 14.1 设计原则

宿主能力不再作为全局 context 暴露，而采用“声明-申请-授予-过期”模型。

### 14.2 Capability Manifest

```ts
type CapabilityManifest = {
  name: string;
  version: string;
  inputShape?: unknown;
  outputShape?: unknown;
  limits?: Record<string, unknown>;
  grantPolicy: string;
};
```

### 14.3 能力申请流程

1. template 声明需要哪些 capability
2. admission 检查 producer/actor 是否允许申请
3. host 按策略返回租约
4. effect engine 在执行窗口消费租约
5. 提交结束后租约立即失效

### 14.4 禁止事项

- 不允许 projection 直接拿 capability
- 不允许把 capability 透传给任意表达式
- 不允许 lease 跨 commit 复用，除非明示为 session-scoped 只读能力

## 15. AI 模型

### 15.1 AI 的正确位置

AI 不是超级 action，也不是全局管理员。

AI 在系统里只应扮演三类角色：

1. Authoring Assistant
   生成 projection、template、constraint 草案。
2. Intent Producer
   生成 `Commit Draft`。
3. Diagnostic Consumer
   读取 admission/journal 诊断并修正输出。

### 15.2 AI 不能做什么

- 不能直接拿 canonical state 的任意写权限。
- 不能绕过 admission 构造已接受 commit。
- 不能拿长期 capability token。

### 15.3 AI 的优势

在 COLK 下，AI 输出物天然更稳定，因为：

1. 输出目标是结构化 draft/template，而不是隐式脚本。
2. admission 结果可作为高质量纠错反馈。
3. journal 提供了真实可审计训练样本。

## 16. 协作模型

### 16.1 协作对象

多人协作不围绕 schema patch，而围绕以下对象：

- draft
- template
- journal
- conflict case

### 16.2 冲突类型

1. Basis Conflict
   提交依据的状态已过期。
2. Claim Conflict
   多个 commit 修改同一业务路径且不满足并存规则。
3. Constraint Conflict
   提交自身满足，但与另一提交组合后不再满足约束。
4. Capability Conflict
   多个提交争抢稀缺能力资源。

### 16.3 冲突处理策略

1. reject later commit
2. queue and retry with new basis
3. request human resolution
4. apply merge policy
5. compensate prior effect

## 17. 设计期与运行期关系

### 17.1 设计期产物

设计期真正产出的不是页面，而是：

- projection specs
- commit templates
- constraint sets
- capability manifests
- producer bindings

### 17.2 运行期实例化

运行时实例化的对象是：

- page projection instance
- local draft buffer
- active producers
- commit pipeline session

### 17.3 关键边界

- 设计期对象负责定义允许什么。
- 运行期对象负责在当前 basis 下发起什么。

## 18. JSON DSL 草案

### 18.1 Commit Template 示例

```json
{
  "type": "commit-template",
  "id": "approve-order",
  "target": "order",
  "claims": [
    {
      "path": "status",
      "op": "transition",
      "fromState": "pending",
      "toState": "approved",
      "reason": "manual approval"
    }
  ],
  "constraints": [
    { "constraintId": "actor-has-role", "args": { "role": "manager" } },
    { "constraintId": "order-total-under-limit", "args": { "limit": 50000 } }
  ],
  "capabilities": [
    { "name": "notify.order-service" }
  ],
  "effects": [
    {
      "type": "notify",
      "channel": "order-approved"
    }
  ]
}
```

### 18.2 Page Projection 示例

```json
{
  "type": "page-projection",
  "id": "order-detail-page",
  "reads": [
    "order.id",
    "order.status",
    "order.total",
    "order.items"
  ],
  "draft": {
    "enabled": true,
    "namespace": "approval-note"
  },
  "producers": [
    {
      "event": "approve.click",
      "templateId": "approve-order",
      "payload": {
        "note": "$draft.approval-note"
      }
    }
  ]
}
```

### 18.3 Webhook Producer 示例

```json
{
  "type": "producer",
  "kind": "webhook",
  "id": "erp-order-paid",
  "templateId": "mark-order-paid",
  "payloadMap": {
    "paymentId": "$input.paymentId",
    "orderId": "$input.orderId"
  }
}
```

## 19. 最小运行时模块图

运行时最少包含以下模块：

1. `draft-store`
2. `template-registry`
3. `admission-engine`
4. `constraint-engine`
5. `capability-broker`
6. `commit-kernel`
7. `effect-engine`
8. `journal-store`
9. `projection-engine`
10. `conflict-resolver`

推荐调用链：

`producer -> draft-builder -> admission-engine -> commit-kernel -> effect-engine -> journal-store -> projection-engine`

## 20. 性能策略

### 20.1 热路径约束

热路径必须最小化以下成本：

- full projection recompute
- journal full replay
- capability handshake roundtrip
- large constraint graph re-evaluation

### 20.2 策略

1. canonical state 周期性快照，避免每次全量回放。
2. projection 做依赖索引，按读取字段增量失效。
3. constraint 分层，先 cheap check 再 expensive check。
4. draft 与 canonical 分开，避免高频输入污染业务热路径。
5. journal 支持按 target partition。

## 21. 安全策略

1. 所有业务写入必须可归因到 actor 或 system principal。
2. 所有 capability 使用必须记录 lease 来源。
3. 所有拒绝必须输出结构化诊断，而不是静默失败。
4. 所有 AI 产生的 draft 必须带 producerKind=`agent`。
5. 禁止未声明 effect 的隐式副作用。

## 22. 可观测性

平台必须原生暴露以下可观测对象：

1. draft timeline
2. admission failures
3. constraint evaluation trace
4. capability grant log
5. effect execution log
6. journal stream
7. projection invalidation graph

最关键的问题不是“某按钮为什么没反应”，而是：

- 它是否产生了 draft
- draft 是否通过 admission
- 是哪条 constraint 拒绝了它
- effect 是否成功消费 lease

## 23. 迁移策略

从旧平台迁移时，采用三段式：

1. `action -> commit-template` 映射
   先把显式 action 重写为模板化提交。
2. `page-state -> draft-overlay + projection-read` 分离
   把页面直写状态拆成草稿层和投影层。
3. `service/plugin context -> capability lease` 收口
   把上下文注入式能力改为显式租约。

迁移期允许兼容层，但兼容层必须是单向 lowering，不可把新内核再泄漏回旧动作模型。

## 24. MVP 范围

第一版只做四类能力：

1. 单实体表单提交
2. 列表批量操作提交
3. AI 代理代填并发起提交
4. webhook 触发提交

第一版明确不做：

- 通用图流程设计器
- 大规模实时协同画布
- 跨租户复杂分布式补偿
- 任意脚本注入

## 25. 验证标准

一个实现只有在以下条件同时成立时，才算符合 COLK：

1. 页面不能绕过 commit kernel 直接改 canonical state。
2. action 不能绕过 admission 直接拿 capability。
3. AI 输出的是 draft/template，而不是全局脚本。
4. 任意正式业务变化都能在 journal 中找到来源。
5. 冲突解释基于 basis/claim/constraint，而不是页面 patch。

如果做不到这五条，说明实现仍然在旧吸引子里。

## 26. 为什么它优于其他方案

相对“页面 schema + action handler”方案：

- 它把业务变化从 UI 层解耦，推理边界更干净。

相对“action graph”方案：

- 它不把流程节点当主语，因此不会自然回流到可视化流程编排器。

相对“领域状态机中心”方案：

- 它保留了多入口统一模型，更适合接 AI、Webhook、人工操作共存场景。

相对“event sourcing/CQRS 变体”方案：

- 它不是纯后端数据架构，而是把前端 authoring、运行时交互、宿主能力、协作语义一起纳入统一提交核。

## 27. 最大风险

1. 设计过重，导致简单页面场景 adoption 成本过高。
2. 草稿态、瞬时态、正式提交态分层不清，重新污染边界。
3. 团队为图省事在 template/effect 中偷偷塞脚本，内核被重新腐蚀。
4. projection 设计不足，导致前端作者觉得“写页面反而更难”。

## 28. 最终结论

`Commit-Oriented Low-Code Kernel` 的关键不是发明一个新术语，而是强制平台承认：

- 业务变化先于页面存在。
- 提交先于动作存在。
- 投影先于组件树中心性存在。
- 审计、协作、AI 不是外挂，而是内核约束。

只要这四点成立，低代码平台就不再是“会跑的页面配置器”，而会变成“可审计业务变化系统”的前端化 authoring 与 projection 外壳。

这就是该方案相对主流路径的根本优势，也是它作为下一代低代码平台候选吸引子的成立基础。
