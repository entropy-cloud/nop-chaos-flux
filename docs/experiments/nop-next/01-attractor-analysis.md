# 01. 吸引子分析

## 1. 当前吸引子识别

当前主流低代码框架普遍依赖以下结构假设：

1. `页面/组件树` 同时承担布局、状态组织、作用域传播和执行宿主。
2. `Action` 本质上是从当前节点上下文出发的动态命令，依赖隐式可见对象。
3. `Schema` 既描述静态结构，又夹带运行时依赖、权限、数据读写和副作用路径。
4. `Host 能力` 往往表现为上下文对象、service 容器或全局 bridge。
5. `执行逻辑` 最终会收敛成作者手写的 step graph 或脚本节点。

其中 1、2、3、5 明显来自主流平均路径：`Schema Form`、`Renderer + Action`、`Page Context + Service`、`BPMN-like action graph`。

## 2. 混合概念清单

1. `视图结构` 和 `状态 owner` 被混在一起。
   代价：UI 重组会拖着状态边界漂移。

2. `动作触发` 和 `执行编排` 被混在一起。
   代价：作者为了表达一个业务意图，被迫手写过程图。

3. `数据读取权` 和 `能力调用权` 被混在一起。
   代价：拿到上下文的人顺带就拿到宿主权力。

4. `局部作用域` 和 `动态调用链` 被混在一起。
   代价：定位行为来源依赖运行时追链，而非静态边界。

5. `授权判断` 和 `宿主调用` 被混在一起。
   代价：系统无法回答“谁凭什么执行了这个 effect”。

## 3. 替代切分矩阵

### 方案 A：更强 Schema Tree

- 概念中心：继续以组件 schema 为中心，补更多字段和 hooks
- 保留：主流使用习惯、低迁移成本
- 放弃：明确边界、静态可分析性
- 复杂度迁移：迁移到 schema 解释器、上下文对象、文档规范

### 方案 B：Action Graph First

- 概念中心：把页面抽成动作图，UI 只是图节点投影
- 保留：流程编排表达力
- 放弃：局部 UI 更新的自然性、授权与状态边界清晰度
- 复杂度迁移：迁移到图调度器、脚本节点、流程编辑器

### 方案 C：Cell + Projection + Intent + Flow + Lease

- 概念中心：把状态、视图、动作、宿主能力拆分，但仍由作者写执行流程
- 保留：更干净的边界、较强可落地性
- 放弃：彻底脱离 workflow 与 capability handle 心智
- 复杂度迁移：迁移到 typed workflow 和 scoped capability runtime

### 方案 D：Cell + Projection + Intent + Goal + Proof + Effect Request

- 概念中心：作者声明目标与边界证明，不直接声明执行图
- 保留：声明式 UI、可组合性、宿主裁剪能力
- 放弃：任意动态上下文、作者级过程编排自由
- 复杂度迁移：迁移到 goal lowering、proof checking、effect receipt runtime

## 4. 主流盆地回流检测

1. 方案 A 明确回流到 `AMIS / JSON Schema UI` 盆地。
2. 方案 B 明确回流到 `BPMN / action graph / workflow UI` 盆地。
3. 方案 C 虽然比主流干净，但仍容易回流到“收紧版 action graph + typed service locator”。
4. 方案 D 不再把作者语言建立在 schema tree、workflow graph 或 service registry 上，而建立在 goal、proof、effect receipt 上，明显更远离主流盆地。

## 5. 新吸引子候选

只保留 2 个候选：

### 候选 1：Goal-Proved Effect Fabric

核心思想：

1. UI 和自动化只发出 `Intent`
2. Intent 必须映射到确定的 `Goal`
3. 运行时根据 snapshot、proof 和 host manifest 生成短命 plan
4. plan 只能发出 `Effect Request`
5. 只有带 `Proof` 的 effect request 才可能被宿主兑现

它不是旧方案换词重说，因为它重写了两条核心边界：

1. 作者不再直接定义执行图
2. 运行时不再直接持有宿主能力句柄

### 候选 2：Ownered Fact, Ownerless View

核心思想：

1. 视图永远不是 owner
2. 每个逻辑事实只能有一个 `authority cell`
3. 草稿、缓存、离线副本都必须声明为 authority 的派生或 replica

它不是旧方案换词重说，因为它重写了“页面树天然承载状态边界”和“副本只是实现细节”这两个前提。

## 6. 反例与失败模式

### 候选 1 失败场景

1. 目标过于抽象，planner 生成的行为不稳定，导致开发者失去预期性。
   结论：概念层与实现层交界问题，必须限制目标语言而不是做通用 AI planner。

2. proof 建模过重，普通 CRUD 也需要声明过多主体与资源约束。
   结论：实现层问题，需要默认 policy 模板，但不能退回 ambient capability。

3. effect request 过度细粒度，导致一次简单提交产生大量审计噪音。
   结论：实现层问题，需要 effect class 聚合规则。

### 候选 2 失败场景

1. 极简单页面如果也强制显式 authority/replica，可能显得过度设计。
   结论：实现层问题，需要编译器内联简化。

2. 编辑器习惯基于树来选中和编辑，如果 owner 不在树上，编辑器映射更难做。
   结论：概念层代价，但可通过 owner overlay 缓解。

3. 逻辑事实切分不当会导致 authority 粒度失控。
   结论：方法论问题，需要事实建模规范和 anti-fragmentation 检查。

## 7. 最小可执行语言

至少需要以下新术语：

1. `authority cell`
2. `replica cell`
3. `projection`
4. `intent`
5. `goal`
6. `proof`
7. `effect request`
8. `effect receipt`
9. `goal binder`
10. `outcome`

## 8. 收敛验证计划

1. 做一个 `表单 + 远程校验 + 提交 + 跳转` 切片，比较 goal 模型与 action graph 模型谁更少泄漏过程细节。
2. 做一个 `主从表 + 局部弹窗编辑 + 嵌套列表` 切片，验证 ownerless view 是否稳定。
3. 做一个 `离线草稿 + 恢复 + 冲突合并` 切片，验证 authority/replica 语言是否真的比页面上下文更清楚。
4. 做一个 `多租户宿主裁剪 + 审计回放` 切片，验证 proof/effect receipt 是否形成真实边界。

## 9. 结论

当前最值得验证的新吸引子是统一方案：`Cell + Projection + Intent + Goal + Proof + Effect Request`。

它值得验证，因为它同时废掉了三条旧吸引子：

1. `组件节点天然就是状态边界`
2. `动作必须由作者手写流程图`
3. `宿主能力可以表现为上下文里的可调用对象`

它最可能失败在两个点：

1. goal 语言如果过强，会变成不可控 planner
2. proof 语言如果过重，会压垮日常开发体验

必须废弃的旧吸引子是：`运行时可直接持有并调用宿主能力句柄`。
