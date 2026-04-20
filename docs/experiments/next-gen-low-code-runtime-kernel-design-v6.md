# 下一代低代码底层框架设计 v6

## 状态

- 状态: draft-under-review
- 设计输入: `docs/low-code-dsl-runtime-requirements.md`
- 设计约束: 本文档先只基于需求规格推导，不以当前项目既有架构、源码实现或既有实验稿为前提
- 目标: 从零设计一个执行效率、可扩展性、可诊断性、宿主嵌入能力都优于现有主流低代码运行时的底层框架

## 1. 设计立场

本方案刻意不沿用当前 Flux 的核心设计原则，而是采用一套更偏执行内核和全局优化的路线。

这套 v6 方案的核心判断是:

1. schema 依然是一等输入制品，但不是平台内部唯一的权威模型
2. 平台内部的权威模型应当是可优化、可调度、可诊断的语义执行图，而不是贴近作者书写形态的结构树
3. 响应式系统不能只靠运行时隐式追踪，应尽可能在编译期静态收窄依赖面，再由运行时补充动态依赖
4. 复杂领域能力不应永远隔离在核心外侧，凡是跨域复用概率高、可静态约束、可统一调度的能力，应允许进入平台一级扩展面
5. 运行时不应被词法树结构主导，而应由数据单元、调度单元、失效传播图、宿主桥接图共同主导

一句话概括: v6 不是“把 schema 树翻译成组件树”，而是“把 schema 编译成一个可执行、可增量更新、可观测、可跨宿主优化的应用图内核”。

## 2. 北极星目标

v6 追求以下同时成立:

1. 简单 schema 的静态部分零额外计算
2. 动态值、数据源、校验、反应、动作编排共享统一调度内核
3. 高频集合场景中的单行更新成本与总树规模弱相关
4. 任何运行时行为都能被映射回编译期节点、字段、表达式、依赖和调度记录
5. 域控件不只是被“嵌入”，而是被纳入统一的类型、调度、诊断和命令契约
6. 运行时能在 React、Web Component、原生宿主桥接层之上复用，不把执行语义绑定到某个 UI 框架

## 3. 总体架构

v6 分为七层:

1. Schema Frontend
2. Semantic Graph Compiler
3. Optimization and Scheduling Planner
4. Runtime Kernel
5. Renderer Adapter Layer
6. Host Bridge Layer
7. Tooling and Diagnostics Layer

### 3.1 Schema Frontend

职责:

1. 接收 JSON/DSL schema
2. 做语法归一化、类型别名展开、区域结构标准化、国际化替换
3. 保留 source map、字段来源、诊断位置信息

这一层保留作者可理解结构，但它不是后续执行的权威模型。Frontend 输出的是中间语义图构建请求，而不是直接给运行时消费的树。

### 3.1.1 最小内核与可选模块

v6 不要求首版一次性落完全部能力。为避免研究型抽象拖垮首版实现，分为两层。

最小内核:

1. schema frontend
2. expression VM
3. scope frame + data cell
4. dependency graph
5. effect plan
6. settled turn scheduler
7. host bridge
8. renderer adapter contract

可选高级模块:

1. row arena
2. surface kernel
3. form kernel
4. domain module contract
5. graph devtools
6. benchmark/profiling kit

只有最小内核是 v6 的首阶段必选项。高级模块必须建立在最小内核语义已经闭合之上。

### 3.2 Semantic Graph Compiler

编译器把 schema 树降为四张核心图:

1. Node Graph: 结构节点图，描述页面、表单、表格、片段、循环、表面对话等实例边界
2. Value Graph: 值计算图，描述字面量、表达式、模板、异步值生产者、命名数据源、校验表达式
3. Effect Graph: 动作、反应、副作用、重试、超时、防抖、并发聚合等控制流图
4. Data Graph: 作用域、路径、发布目标、快照投影、依赖订阅和写入路由图

编译结果不是普通 AST，而是一个不可变的应用执行包 `ApplicationKernelBundle`。

这里的“不可变”指语义计划不可变，不等于运行时实现绑定也被编死。组件、动作、校验器、域模块的实际实现绑定会在 world 创建时做一次 registry handshake。

### 3.3 Optimization and Scheduling Planner

这层在编译后进一步做全局优化:

1. 静态字段冻结和内联
2. 路径字符串字典化和路径段编号
3. 表达式访问计划静态提取
4. 动作图扁平化和失败路径归并
5. 表格/循环模板实例池规划
6. 数据源刷新图去重
7. 依赖传播分层调度规划

这里的输出是运行时用的 `ExecutionPlan`，包含 lane、优先级、缓存策略、实例化策略和诊断索引。

### 3.4 Runtime Kernel

内核维护一个 `World` 对象，内部由多个 arena 组成:

1. Structure Arena: 节点实例和区域实例
2. Scope Arena: 作用域快照、遮蔽关系、投影关系
3. Cell Arena: 数据单元、派生值单元、资源状态单元、校验单元
4. Effect Arena: 动作实例、反应实例、运行中的任务句柄
5. Surface Arena: dialog/drawer 等表面栈
6. Handle Arena: 组件实例句柄和域控件命名空间句柄

这不是一个大对象树，而是一个分区、编号、可追踪、可增量回收的执行内核。

### 3.5 Renderer Adapter Layer

渲染层不是内核的一部分。内核只发布:

1. 当前节点的解析 props
2. 控制元信息
3. 子区域渲染计划
4. 订阅句柄
5. 事件和动作派发器

React 适配层、Web Component 适配层、其他 UI 适配层都只是消费这些稳定快照和渲染句柄。

### 3.6 Host Bridge Layer

宿主集成不直接散落在 runtime 中，而通过一组稳定桥接接口接入:

1. `HostNetworkBridge`
2. `HostNavigationBridge`
3. `HostNotificationBridge`
4. `HostEnvironmentBridge`
5. `HostDomainBridge`

所有桥接都必须提供稳定引用语义。宿主可以替换其内部实现，但不能用新的对象引用强迫 runtime 重建世界。

### 3.7 Tooling and Diagnostics Layer

工具层从编译和运行两端收集数据:

1. schema 节点到运行时实例的双向索引
2. 表达式 AST 到访问计划、依赖集合、最近求值结果的索引
3. 动作 DAG 到运行记录、重试记录、超时记录的索引
4. 表单校验图到规则命中、取消、错误来源的索引

## 4. 核心原语

v6 的原语不是 Flux 风格的小集合，而是更偏“图内核”风格的七类实体。

### 4.1 Node Template

编译期节点模板，包含:

1. `nodeId`
2. `typeId`
3. `regionDefs`
4. `propBindings`
5. `metaBindings`
6. `eventBindings`
7. `activationPolicy`
8. `instancePolicy`

### 4.2 Scope Frame

作用域帧不是普通对象，而是一个带遮蔽表和投影表的结构:

1. `frameId`
2. `parentFrameId`
3. `isIsolated`
4. `ownedCells`
5. `projectedCells`
6. `namespaceTable`
7. `componentHandleTable`

这样做的原因是路径读写、依赖追踪、局部复制、行级隔离都需要比普通对象更强的结构信息。

### 4.3 Data Cell

任何可观察数据都落到 cell 上，而不是散落在匿名对象上。cell 有明确种类:

1. `StateCell`: 普通可写数据
2. `DerivedCell`: 编译值或表达式结果
3. `ResourceCell`: 命名数据源和其 loading/error/value 三态槽位
4. `ValidationCell`: 校验结果和脏状态、访问状态
5. `ProjectionCell`: 域控件只读快照投影
6. `SurfaceCell`: 对话框、抽屉等表面状态

所有 author-visible 数据读取最终都落到 cell。`scope` 只是命名查找面，cell 才是依赖、写入、失效传播和诊断的权威单位。

### 4.4 Evaluator Program

表达式不是运行时解释字符串，而是编译为字节码风格的求值程序 `EvaluatorProgram`。其特征:

1. 指令集封闭，可审计
2. 不依赖 `eval` 或动态函数构造
3. 在执行时天然可插入依赖收集、性能采样和路径命中记录
4. 允许编译期提取静态路径访问计划

表达式 VM 是纯求值环境。它内部只允许纯函数，不允许任何可见副作用、宿主调用、时间读取、随机数、网络能力或隐式状态读取。

任何非纯行为都必须降到 `producer`、`resource`、`action` 或宿主 bridge 层，不进入 `EvaluatorProgram`。

### 4.5 Effect Plan

动作系统编译为 `EffectPlan`，本质上是带状态转移语义的 DAG，节点类型包括:

1. dispatch
2. guard
3. map-result
4. branch-on-success
5. branch-on-failure
6. parallel-fanout
7. aggregate
8. retry
9. timeout
10. debounce

### 4.6 Instance Channel

组件实例动作和命名空间动作不共享解析表，而是统一落到 `InstanceChannel` 抽象:

1. `platform` channel: 内置动作
2. `component` channel: 组件句柄方法
3. `namespace` channel: 域命名空间能力

统一后可复用鉴权、参数校验、超时、取消、 tracing、错误包装和结果分类逻辑。

### 4.7 Scheduler Lane

调度器以 lane 为核心，不以“组件 render”作为唯一执行单位。典型 lane:

1. sync-input
2. derived-value
3. validation
4. resource-refresh
5. reaction
6. render-publish
7. surface-transition
8. low-priority-polling

## 5. 编译模型

### 5.1 编译阶段划分

编译分九步:

1. Parse: 解析原始 schema
2. Normalize: 统一结构、别名和字段形态
3. Resolve: 解析 type、component、action、validator、data-source、slot 参数
4. Classify: 把值字段分类为 static/expr/template/producer/source/region
5. Lower: 降为 Node Graph、Value Graph、Effect Graph、Data Graph
6. Optimize: 常量折叠、访问计划生成、路径压缩、共享子图去重
7. Plan: 生成 ExecutionPlan 和 SchedulerPlan
8. Pack: 生成 `ApplicationKernelBundle`
9. Index: 生成调试、诊断和 source map 索引

### 5.2 值语义的统一表示

需求要求值从字面量一路渐进到命名数据源。v6 用统一 `ValueSpec` 建模:

1. `literal`
2. `expr`
3. `template`
4. `producer`
5. `resource`
6. `resource-ref`
7. `struct`

`resource` 是一等值类型，不再只是外部引用。这样值阶梯可以闭合为:

1. `literal`
2. `expr`
3. `template`
4. `producer`
5. `resource`

重点不是形式不同，而是统一解决四个问题:

1. 如何编译
2. 如何求值
3. 如何建立依赖
4. 如何决定缓存和引用复用

这使得 props、meta、validator 参数、action 参数、API 参数、slot 参数共享同一套值求值设施。

### 5.2.1 Value Result 契约

为避免“值位置到底拿到值还是资源对象”的歧义，v6 规定所有值绑定最终只暴露两种 author-visible 读取结果:

1. `plain value`
2. `published stateful value`

对应规则:

1. 普通 props/meta/validator/action 参数默认读取 `plain value`
2. `resource` 默认向 schema 发布其 `value` 槽位，因此 `${users}` 表示 `${users.value}`
3. `resource` 的伴随状态通过命名派生路径暴露，例如 `${users.$loading}`、`${users.$error}`、`${users.$status}`
4. `resource-ref` 只在框架内部和高级扩展场景使用，不作为默认作者心智模型

这样作者端的值读取模型保持统一，不需要在普通表达式中手动区分“值对象”和“资源句柄对象”。

### 5.2.2 Producer 归约契约

`producer` 是值语义主链的一部分，必须有明确运行时归约，不允许不同实现各自发挥。

固定规则:

1. `producer` 表示一次性值生产过程，不拥有命名生命周期，不长期发布
2. 编译后 `producer` 必须 lower 为 `EffectBackedValueCell`
3. `producer` 首次求值时若未命中缓存，会派发一次受控 effect 来生产结果
4. `producer` 的 pending/completion/cancel 都不直接暴露为默认作者值；默认作者只读取其完成后的 `plain value`
5. 若作者需要 `loading/error` 等伴随状态，必须显式升级为 `resource`
6. `producer` 的异步完成总是进入下一 turn 发布结果
7. `producer` 可取消，但取消后只留下内部 trace，不向作者暴露独立状态代数
8. `producer` 可以有局部 memo policy，但作用域仅限其 owning frame 和值绑定位置

因此，`producer` 是“临时异步值”，`resource` 是“命名持续值”。两者不能混同。

### 5.3 静态访问计划

为了超越纯运行时隐式追踪，编译器会先对表达式做静态访问计划分析。

输出分三类:

1. `closed`: 可静态确定访问路径集合
2. `parametric`: 访问路径依赖 slot 参数或局部变量模板，可生成访问模板
3. `dynamic`: 包含真正不可静态确定的索引或函数路径，只能运行时补追踪

运行时策略:

1. `closed` 直接订阅精确路径集
2. `parametric` 在实例化时按绑定参数展开为精确路径集
3. `dynamic` 执行时开启读追踪并补全依赖

这样比纯运行时隐式依赖更快，也比纯静态分析更稳健。

### 5.4 路径系统

字符串路径在大系统中代价太高。v6 路径系统分三层:

1. Author Path: 用户可理解的 `user.name`
2. Canonical Path: 编译后标准路径对象
3. Path Token Sequence: 运行时整数 token 序列

依赖图、写入路由、局部校验、行级隔离都基于 token 化路径完成。

### 5.5 Registry Binding Contract

编译阶段解析的是稳定符号，而不是最终实现引用。v6 明确拆开两件事:

1. 编译期固化 `typeId`、`actionId`、`validatorId`、`domainModuleId`
2. world 创建时由运行时 registry 完成 symbol-to-implementation handshake

handshake 规则:

1. 若 bundle 中的稳定符号在 registry 中缺失，world 创建失败并产出结构化诊断
2. 若符号存在但版本签名不兼容，world 创建失败并给出兼容性诊断
3. 允许运行时新增实现，但新增实现只对后续编译产物可见，不能偷偷改变当前 bundle 的语义计划
4. 动态扩展组件注册表时，本质是注册新 `typeId` 对应实现并触发重新编译或远程片段装载，而不是热替换当前 bundle 已绑定节点的语义定义

## 6. 数据环境设计

### 6.0 Scope Construction Contract

为避免词法继承、显式隔离、草稿隔离、表面独立环境和局部覆盖之间的语义冲突，v6 固定五类 frame 构造顺序。

#### A. World 根 frame

合成顺序:

1. 宿主 `initialData`
2. 宿主 `environment projection`
3. 平台保留内置只读绑定

#### B. 容器 frame: page/form/dialog/drawer/fragment-root

合成顺序:

1. 若 `isIsolated=false`，先建立 parent link
2. 应用容器 `initialData`
3. 应用实例化时局部 override
4. 挂入局部 namespace 和 component handle table

#### C. 表面 frame

合成顺序:

1. 以 world root 为 parent，而不是复用打开者页面 frame
2. 注入 open args
3. 应用表面 schema 的 `initialData`
4. 建立独立 namespace/component handle scope

#### D. 片段局部 frame

合成顺序:

1. 若声明继承，则 parent 指向调用点 frame
2. 若声明隔离，则无 parent link
3. 绑定 slot 参数
4. 应用 fragment override data

#### D-1. loop/row frame

合成顺序:

1. 默认 `isIsolated=true`
2. 绑定 `item`、`index`、`rowKey`
3. 应用显式外部投影字段
4. 挂入局部实例句柄表

#### E. 草稿 frame

合成顺序:

1. parent 指向 owning form frame
2. 复制 canonical form value 的只读基线快照
3. 建立独立 dirty/touched/validation cell
4. 所有修改仅写入草稿 overlay，直到显式 commit

优先级原则:

1. 局部显式 override 高于容器 `initialData`
2. slot 参数高于继承可见值
3. projection 只读，不参与默认写目标选择
4. 草稿 overlay 高于父 form 可见值，但 commit 前不回写父级

### 6.1 Scope Frame 而不是普通词法对象

需求强调词法继承，但 v6 不把 scope 实现成层层对象查找，而是实现为 scope frame 图。

原因:

1. 普通对象链不利于精确追踪遮蔽关系
2. 行级隔离和显式投影需要结构化标记
3. 局部写入、局部校验、局部失效需要路径到 cell 的直接映射
4. 命名空间和组件实例注册表不能和普通数据混在一起

### 6.2 读路径解析

读取一个路径时，运行时执行:

1. 定位当前 frame
2. 在 frame 的 owned cell trie 中查找
3. 若未命中则按投影表查找
4. 若仍未命中且非隔离则沿 parent frame 查找
5. 记录最终命中的 cell id 和路径 token 序列

这里记录的是 cell 级依赖，而不是只记录抽象路径字符串。

### 6.3 写路径解析

定点写入采用 `WriteRoute` 机制:

1. 先判断目标路径是否绑定到已存在 cell
2. 若命中，直接 patch 到目标 cell
3. 若未命中，根据最近可写宿主 frame 的结构策略创建或扩展 cell
4. 生成精确的变更集 `ChangedPathSet`

为了不破坏词法和隔离语义，新增硬不变量:

1. `unresolved write` 默认只能落到当前 owning frame，不能自动上溯祖先 frame
2. `projectedCells` 默认只读
3. `$slot` 参数默认只读
4. draft frame、isolated frame、row frame 禁止隐式逃逸写祖先
5. 若 schema 明确声明 by-ref 投影或绝对写目标，才允许跨 frame 写入

### 6.3.1 缺失值语义

为统一 `resolve(path)` 与 `has(path)`，v6 定义三类状态:

1. `missing`: 路径不存在
2. `undefined`: 路径存在但值为 `undefined`
3. `null`: 路径存在且值为 `null`

规则:

1. `has(path)` 只在路径存在时返回 true，和值是否为 `undefined`/`null` 无关
2. `resolve(path)` 对 `missing` 返回内部哨兵值，表达式层按安全空值传播处理
3. `has(path)` 与 `resolve(path)` 建立独立依赖记录，因为条件规则常只依赖“是否存在”

### 6.3.2 Effect Context 注入规则

需求要求所有表达式共享统一上下文，同时 `then/onError` 可访问 `result/error/prevResult`。v6 固定 effect 上下文以保留名注入表达式环境:

1. `$input`
2. `$result`
3. `$prevResult`
4. `$error`
5. `$signal`

注入优先级:

1. effect 保留名
2. slot 参数
3. 当前 frame owned/projection 数据
4. 继承可见数据
5. environment projection

附加规则:

1. effect 保留名只读
2. effect 保留名参与普通依赖追踪
3. 作者表达式不得覆写这些保留名
4. `then/onError` 的表达式上下文与普通值表达式上下文是同一个求值模型，只是多了这些保留绑定

### 6.4 变更传播

变更传播以 cell 为核心，而不是以 scope object 为核心。传播包包含:

1. `changedCellIds`
2. `changedPathTokens`
3. `writeCause`
4. `turnId`
5. `selfWriteBarrierToken`

`selfWriteBarrierToken` 用于避免命名数据源因自己发布的值再次触发自身刷新。

## 7. 响应式系统

### 7.1 混合依赖模型

v6 采用“静态依赖计划 + 动态补追踪 + cell 级增量失效”的混合模型。

依赖消费者分为:

1. `DerivedConsumer`
2. `ResourceConsumer`
3. `ReactionConsumer`
4. `RenderConsumer`
5. `ValidationConsumer`

它们共享同一套依赖记录结构，但拥有不同的失效后果和调度 lane。

### 7.2 引用复用策略

需求要求动态结果未变时复用上次引用。v6 不靠浅比较碰运气，而在编译期给每个值绑定一个 `StabilityPolicy`:

1. `scalar`
2. `structural-share`
3. `always-new`
4. `custom-equality`

例如模板字符串是 `scalar`，对象字面量组合一般是 `structural-share`，远程响应适配可能配置 `custom-equality`。

### 7.3 Settled Turn

所有写入不会立刻任意级联到 UI，而是进入一次 `Settled Turn`:

1. 收集写入
2. 合并 path 变更
3. 失效命中 consumer
4. 按 lane 调度求值和副作用
5. 发布稳定快照给渲染适配器

这样可以把多次小写入合并成一次稳定发布，并保持调试可重放。

### 7.3.1 Turn Contract

`Settled Turn` 必须是形式化时序，而不是概念名词。v6 固定如下相序:

1. `collect-write`: 收集同步写入和 effect 产生的结构化 patch
2. `merge-write`: 合并路径变更并更新 cell version
3. `recompute-derived`: 重算 `DerivedConsumer`
4. `run-validation`: 执行同步校验和可继续的局部校验
5. `schedule-resource-refresh`: 标记资源刷新，但异步执行结果永远进入下一 turn
6. `run-reaction`: reaction 读取的是当前 turn 的稳定数据快照，不读取 render 中间态
7. `continue-effect`: 处理 `then/onError/parallel aggregate` 等 effect continuation
8. `publish-render`: 向渲染适配层发布稳定快照
9. `settle-surface`: 结算 dialog/drawer 打开关闭与焦点恢复

附加规则:

1. 任一阶段产生的新同步写入会被吸入当前 turn，但只能回到 `merge-write` 重新结算，不允许跳过相序
2. 异步 resource 完成、异步 validator 完成、宿主异步回调完成，统一开启下一 turn
3. render adapter 永远只看到 `publish-render` 之后的稳定快照
4. reaction 永远读取 `run-validation` 之后的稳定快照，因此它看到的是校验已更新但表面尚未结算的状态

### 7.4 防循环策略

除自写屏障外，还需要三层循环防护:

1. 同一 turn 内 effect-plan 节点重入预算
2. reaction 对同一 write-cause 的幂等去重
3. resource 刷新对同一依赖版本的重复触发抑制

### 7.4.1 收敛与熔断不变量

为保证 turn 一定可终止，v6 再增加收敛约束:

1. 单个 turn 存在最大回卷次数 `turnReentryBudget`
2. 单个 effect root 存在最大 continuation 次数 `effectContinuationBudget`
3. 单个 reaction 在同一 turn 内最多由同一 `writeCause` 触发一次
4. 单个同步 validator 在同一 path version 上最多执行一次
5. 任一预算耗尽后，当前 turn 不再继续回卷，转为 invariant violation 或降级诊断
6. render publish 必须在预算未耗尽的情况下最终发生，否则 world 进入 fail-fast 诊断态

## 8. 表达式引擎

### 8.1 语法与执行

表达式编译为 `EvaluatorProgram`，支持:

1. 路径读取
2. 算术、比较、逻辑运算
3. 内置函数和过滤器
4. 条件表达式
5. 安全的空值传播
6. 模板片段拼接

不支持任何动态代码生成。

### 8.2 函数注册

内置函数和宿主扩展函数都走注册表，但注册时必须声明:

1. 名称
2. 参数签名
3. 是否纯函数
4. 是否允许静态折叠
5. 是否可参与依赖外提分析

纯函数可在编译期折叠或提升缓存。表达式 VM 中不允许非纯函数注册。

### 8.3 调试能力

每个表达式都能输出:

1. 原始源码
2. 编译 AST
3. 字节码指令
4. 静态访问计划
5. 最近依赖集合
6. 最近求值耗时
7. 最近异常信息

## 9. 渲染系统

### 9.1 Node Runtime Shape

每个节点实例在渲染适配层暴露统一结构:

1. `propsView`
2. `metaView`
3. `regionViews`
4. `eventPorts`
5. `nodeState`
6. `traceInfo`

`propsView` 和 `metaView` 都是稳定快照对象，只有在其依赖结果变化时才替换引用。

### 9.2 容器与叶子

需求要求布局类组件只输出语义标记类名，控件类组件可以内建视觉样式。v6 保留这一点，但做进一步约束:

1. 布局类节点不得含内部测量副作用
2. 控件类节点若有内部状态，必须通过 `ControlAdapter` 显式注册其值端口和动作端口
3. 所有节点都必须支持被 devtools 识别的 `nodeId` 属性

### 9.3 片段渲染

片段渲染不直接重编译 schema，而是实例化已有 `FragmentTemplate`:

1. 可附带局部覆盖数据
2. 可指定继承或隔离模式
3. 可绑定 slot 参数
4. 可配置缓存或一次性实例策略

### 9.3.1 远程片段动态加载

需求中的复杂结构升级路径包含远程片段动态加载。v6 因此增加 `RemoteFragmentPlan`:

1. 远程片段不是直接执行原始 schema，而是加载另一个已编译 bundle 片段
2. 远程 bundle 必须携带类型签名、版本签名和 source diagnostics 摘要
3. 加载成功后先经过 registry handshake，再实例化为 `FragmentTemplate`
4. 远程片段可缓存、可失效、可按宿主策略回收
5. 远程片段失败不污染当前 world，按 effect failure 进入 `onError` 或错误边界

### 9.4 参数化区域

参数化区域被编译为 `RegionTemplate + RegionBindingPlan`，运行时绑定 `item`、`index`、`$slot` 并实例化局部 frame。

### 9.4.1 Form Canonical Path 映射契约

fragment、slot、loop、row 中渲染出的表单字段，若要参与最近 form owner 的 canonical value tree，必须显式声明 `fieldPathBinding`。

规则:

1. 未声明 `fieldPathBinding` 的局部字段只属于当前局部 frame，不进入表单 canonical tree
2. 已声明 `fieldPathBinding` 的字段，其读写目标固定映射到最近 form owner 的 canonical path
3. `fieldPathBinding` 可以参数化，例如基于 `index`、`rowKey` 生成 canonical path 模板
4. validator 的目标路径总是 canonical path，而条件表达式读取上下文仍可以看到局部 frame 值
5. dirty/touched/validation 只挂在 canonical path 上，绝不挂在 overlay 临时路径上

## 10. 动作系统

### 10.1 Action as Effect Graph

动作不是递归解释嵌套 JSON，而是编译成 `EffectPlan` DAG。优点:

1. 运行时无需反复解析结构
2. 失败路径、跳过路径、聚合路径更容易观测
3. 重试、超时、防抖等控制策略可被统一优化
4. 可预先检测明显的结构错误

### 10.2 执行上下文

执行 effect 时存在 `EffectContext`:

1. `scopeFrameId`
2. `input`
3. `result`
4. `prevResult`
5. `error`
6. `signal`
7. `trace`

`then` 和 `onError` 不是语法糖，而是 DAG 中有明确定义的边。

### 10.3 三层动作解析

要求中的三层解析被实现为统一的 channel dispatch:

1. 平台内置动作通过 `platform` channel
2. `component:<method>` 通过组件实例句柄路由到 `component` channel
3. `namespace:method` 通过 scope frame 的 namespace table 路由到 `namespace` channel

平台在 dispatch 前先完成:

1. action schema 校验
2. 参数值求值
3. channel 解析
4. 超时与取消绑定
5. tracing id 分配

### 10.4 结果分类

所有动作结果统一为:

1. `success`
2. `failure`
3. `skipped`

`parallel` 聚合结果会保留每个子节点结果和聚合摘要。

### 10.5 Reaction 与 Action 的关系

reaction 自身不进入作者可见的 action result 链。它的职责只是“在依赖变化后决定是否生成新的 effect root”。

因此:

1. reaction 的 `when=false`、dedupe 命中、lane 抑制、取消，都只记为 reaction trace 中的 `skipped reason`
2. 只有 reaction 触发出的 effect root 才拥有 `success/failure/skipped` 结果代数
3. `then/onError` 中的 `result/error/prevResult` 只沿 effect plan 链传播，不穿透回 reaction 本体

## 11. 表单与校验

### 11.1 Form Runtime Kernel

表单不是一组 input 的松散集合，而是独立子内核 `FormKernel`，拥有:

1. value cells
2. touched cells
3. dirty cells
4. submit state cell
5. validation graph
6. draft transaction state

### 11.2 校验图

校验规则编译为图而不是临时遍历:

1. 字段级规则节点
2. 对象级规则节点
3. 数组级规则节点
4. 条件启用节点
5. 异步校验任务节点

局部校验时可从目标路径切入，只跑受影响子图。

### 11.2.1 异步校验所有权

异步校验结果必须绑定以下所有权键:

1. `formId`
2. `draftTxId | null`
3. `canonicalPath`
4. `pathVersion`
5. `validatorId`
6. `validationRunId`
7. `dependencyVersionSet`

规则:

1. 任一所有权键失配，晚到结果必须丢弃
2. draft `commit/cancel` 后，旧 draftTxId 下的异步结果全部失效
3. fragment 卸载、surface 关闭、field unmount 后，相关 async validator 必须取消或在完成时丢弃
4. 只有命中当前 canonical path version 的结果才能写回 validation cell
5. 若校验规则依赖其他字段或条件表达式，`dependencyVersionSet` 必须一并匹配，否则旧结果无效
6. 每次重新发起异步校验都生成新的 `validationRunId`，旧 run 的结果即使目标字段未变也不得覆盖新 run

### 11.3 显示策略与执行策略分离

执行策略决定什么时候算，显示策略决定什么时候给用户看。两者分别建模:

1. `ValidationExecutionPolicy`
2. `ValidationPresentationPolicy`

这样可以支持“先算但暂不显示”与“提交后再显示但后台持续预热”的组合。

### 11.4 草稿隔离

草稿模式本质是子事务:

1. 在草稿 frame 中产生独立 dirty/touched/validation 状态
2. 修改暂不写回父 frame
3. 显式 commit 时合并为结构化 patch
4. cancel 时直接丢弃草稿事务

### 11.5 校验所有权不变量

为避免 fragment/local overlay 与 form canonical tree 混淆，v6 固定:

1. 只有 `form` 或 `draft form` owner 才能拥有 validation scope
2. fragment overlay 和 `$slot` 参数默认不进入表单 canonical value tree
3. dirty/touched/validation 只针对表单 canonical path 建立，不针对任意 frame-local 临时路径建立
4. 部分校验按 canonical path 或其子树执行，而不是按任意局部 frame path 执行

## 12. API 与数据源

### 12.1 API 请求模型

API 声明编译成 `RequestPlan`:

1. method/url/header/query/body 的值绑定
2. scope 注入规则
3. 请求去重键
4. 超时、取消、重试策略
5. 响应适配器
6. 错误适配器

实际执行由 `HostNetworkBridge` 完成。

### 12.2 Resource Runtime

命名数据源实现为 `ResourceCell + RefreshPolicy + RequestPlan/ComputePlan`。

刷新策略统一抽象为:

1. manual
2. on-mount
3. on-dependency-change
4. interval
5. visibility-aware

### 12.2.1 Resource 生命周期不变量

每个 resource 都必须绑定到明确 owning frame。

规则:

1. owning frame 挂载时，允许按策略初始化 resource
2. owning frame 卸载时，必须取消其未完成刷新并冻结后续发布
3. owning frame 已销毁时，晚到结果必须丢弃
4. fragment、surface、row、draft 等短生命周期 frame 中的 resource 不能逃逸发布到已失效 frame
5. resource 若要把值发布到更高层 canonical path，必须通过显式 publish target 契约，而不是靠隐式祖先穿透

### 12.3 资源自写保护

每次 resource 发布值时都带 `publicationToken`。依赖传播时若命中同一 resource 且变更原因为该 token，则跳过自刷新。

因果规则补充:

1. `value/$loading/$error/$status` 四个伴随槽位共享同一个 publication cause
2. 别名路径只要最终落到同一 resource owned cell，仍视为同源发布
3. `resource -> reaction -> same resource` 的间接回写不受 publicationToken 直接豁免，必须由 reaction dedupe 和 turn budget 再做约束
4. resource 异步完成永远进入下一 turn，因此不会在当前 turn 内形成直接自旋

### 12.4 Reaction

reaction 不是直接订阅原始对象，而是订阅 cell 版本和表达式输出。其执行条件为:

1. 依赖版本变化
2. `when` 条件成立
3. 去重键未命中
4. 当前 lane 允许执行

### 12.4.1 并发与覆盖规则

resource 与 reaction 的并发结果采用固定规则:

1. 同一 resource 的并发刷新以 `requestSeq` 标识
2. 默认只接受最新有效 `requestSeq` 的完成结果写回
3. 若策略声明 `allow-stale-commit=false`，任何旧序列完成结果都必须丢弃
4. reaction 的 dedupe key 至少包含 `reactionId + writeCause + dependencyVersionSet`
5. reaction 触发出的 effect 若再次写回同一路径，按下一 turn 普通写入处理，不享受特殊旁路

## 13. 表面对话系统

统一表面模型 `SurfaceKernel` 负责 dialog 和 drawer:

1. `surfaceId`
2. `surfaceType`
3. `frameId`
4. `zOrder`
5. `focusPolicy`
6. `closePolicy`
7. `resumeTarget`

表面关闭时会:

1. 销毁或缓存对应实例
2. 恢复下层活动表面
3. 结算挂起动作或取消信号

## 14. 表格、集合和递归

### 14.1 Row Arena

表格和 loop 的高频实例统一使用 `RowArena` 或 `IterationArena`。每一行不是一个完整树复制，而是:

1. 共享模板
2. 独立 frame
3. 独立 row cell 集
4. 独立依赖订阅
5. 可选外部投影表

### 14.1.1 Row Identity Contract

为保证插入、删除、排序、过滤、虚拟滚动下的稳定更新，row 必须有明确身份规则:

1. 若 schema 提供 `rowKey`，则 row identity 以 `rowKey` 为准
2. 若未提供 `rowKey`，则只能退化为 `index` 身份，并明确不保证重排稳定性
3. row arena 的缓存、订阅、校验、resource、component handle 都必须绑定 row identity，而不是绑定瞬时可见位置
4. 虚拟滚动回收时，row identity 保留其逻辑实例状态；仅视图实例可回收
5. 插入、删除、排序、过滤导致的结构变化，必须先更新 row identity 映射，再做局部失效传播

### 14.2 行级隔离

默认行级隔离，只有显式声明的投影字段进入行 frame。这样可以确保:

1. 行数据改动只影响本行订阅
2. 父级全局数据不会默认扇出进所有行
3. 高频滚动或虚拟化时实例恢复成本更低

### 14.3 递归结构

递归渲染使用模板递归引用，但运行时增加:

1. 深度预算
2. 环检测
3. 实例缓存策略

从而避免错误 schema 造成无界膨胀。

## 15. 域控件集成

v6 不把复杂域控件仅视为“宿主外部黑盒”，而是提供一级域接入契约 `DomainModuleContract`。

域模块必须声明:

1. 暴露的只读 projection 字段
2. 暴露的命名空间方法
3. 参数和返回类型
4. 支持的生命周期事件
5. 可选诊断面板适配器

这使流程设计器、电子表格、报表设计器、文档编辑器都能被静态校验、统一调度和统一 tracing，而不是只停留在 runtime 逃逸口。

## 16. 宿主边界

### 16.1 稳定桥接

宿主桥接对象使用 `BridgeHost` 包装，内部可替换实现，但对内核暴露稳定引用和版本号。

### 16.1.1 World 创建入口

宿主唯一正式入口为:

`createKernelWorld({ bundle, registry, initialData, environment, bridges, onError })`

其中:

1. `bundle` 是编译产物
2. `registry` 提供 runtime symbol-to-implementation handshake
3. `initialData` 用于根 frame
4. `environment` 以只读 projection 形式注入
5. `bridges` 包含 network/navigation/notification/domain 等桥接实现
6. `onError` 是全局错误处理回调

错误分类至少包含:

1. compile diagnostic promoted-to-runtime
2. registry binding error
3. expression runtime error
4. action dispatch error
5. host bridge error
6. invariant violation

### 16.2.1 Channel 写入规则

为防止 `component` / `namespace` channel 绕过统一数据模型，v6 规定:

1. `platform` channel 可以直接产生结构化 patch
2. `component` / `namespace` 方法不得直接突变 schema-visible world 数据
3. 若 `component` / `namespace` 需要影响 schema-visible 数据，必须返回结构化 patch、命名结果或受控 effect 请求
4. 所有这类结果都必须进入下一次 turn 的 `collect-write`，不得旁路写入 cell
5. 域私有内部状态可以自行变化，但只有通过 projection publish 才能进入 schema-visible 数据环境

### 16.2 不污染全局

所有 bridge、namespace、surface、resource 都绑定在 `World` 内，不写全局单例。

### 16.3 可测试性

任何桥接接口都能被内存版 mock 实现替代，因此内核和大多数派生系统可在无 DOM 环境测试。

## 17. 类型系统与静态校验

v6 认为“必须超过现有框架”的关键不只在性能，也在静态可证性。

因此编译器要有完整的 schema type system:

1. 节点 type 的 props/meta/regions/events 签名
2. action 的参数和结果签名
3. namespace 方法签名
4. projection 字段签名
5. 表达式上下文类型
6. slot 参数类型

编译期至少能诊断:

1. 未知节点类型
2. 未知区域
3. 无效表达式路径
4. action 参数不匹配
5. namespace 方法不存在
6. component method 不存在
7. 校验规则参数错误
8. data-source 绑定冲突

## 18. 诊断与开发工具

每个运行时节点都可被定位到:

1. schema source range
2. node template id
3. runtime instance id
4. owning frame id
5. current props/meta snapshot
6. 最近依赖集合
7. 最近 effect trace

devtools 可以按以下视角检查系统:

1. tree view
2. graph view
3. dependency view
4. action trace view
5. validation view
6. resource view
7. surface stack view

## 19. 性能策略

### 19.0 性能声明边界

v6 当前只能声称“具备优于传统树解释器路线的潜力”，不能在没有基准数据前直接宣称已经优于主流框架。

因此本文中的性能优势都应理解为待验证假设，必须经过基准场景验证。

### 19.0.1 基准场景契约

至少要验证以下场景:

1. 纯静态页面: 验证静态零额外计算
2. 单字段编辑: 验证写入到渲染发布的热路径成本
3. 跨字段校验: 验证 validation graph 的局部失效
4. `on-dependency-change` resource: 验证刷新与自写保护
5. 1000 行表格单行更新: 验证 row arena 的扇出隔离
6. dialog 打开关闭: 验证 surface settle 成本
7. 局部片段重渲染: 验证 fragment frame 的局部性

每个场景都必须固定:

1. 输入规模
2. 操作序列
3. 观测指标: CPU 时间、重算次数、失效命中数、内存增量、GC 次数、渲染发布次数
4. 判定方式: 与基线树解释器方案对比，或与自身简单模式对比
5. 回归阈值: 至少定义不可退化的上限，而不是只做相对描述

### 19.0.2 热路径复杂度表

以下复杂度是设计目标，不是已验证结果:

1. 路径读取: 与路径深度和 frame 查找深度相关，目标是弱于总节点规模
2. 定点写入: 与命中路径深度和局部结构扩展规模相关，目标是不扫描全树
3. 单表达式重算: 与该表达式指令长度和命中依赖数相关
4. 单 resource 刷新调度: 与其依赖数和 refresh policy 相关
5. 局部校验: 与目标子图大小相关，不与整表单规则总数线性绑定
6. 单行更新: 与本行实例规模和显式投影数相关，不与总行数线性绑定

真正的“超过现有框架”只能由这些场景的实测结果支持。

### 19.0.3 复杂度参数化说明

为避免“弱于总规模”这类口号式描述，复杂度分析至少使用以下参数:

1. `d`: 路径深度
2. `f`: frame 查找深度
3. `k`: 命中依赖数
4. `g`: 受影响校验子图大小
5. `p`: 显式投影字段数
6. `r`: 单行实例内活跃订阅数

后续基准必须围绕这些参数画出增长曲线，而不是只给单点结果。

### 19.1 编译期优化

1. 常量折叠
2. 模板预切片
3. 路径 token 化
4. 闭包式依赖预订阅
5. 重复子图共享
6. 行模板和片段模板复用

### 19.2 运行时优化

1. cell 级失效而非对象级失效
2. lane 分层调度
3. settled turn 合并写入
4. 引用稳定策略
5. 资源刷新去重
6. 行 arena 隔离
7. 按需实例化和回收

### 19.3 工程化优化

1. 运行包可拆分为 compiler-only、kernel-only、react-adapter、domain-kit
2. 表达式 VM、校验器、调度器都可做基准测试
3. 大表格、深递归、频繁 reaction 场景有专项 profiling 钩子

## 20. 为什么它有机会超过现有框架

v6 试图同时解决多数低代码引擎常见短板:

1. 只做 schema 树解释导致运行时结构冗余
2. 只靠运行时依赖追踪导致高频场景成本不稳
3. action、resource、validation 各自有独立执行器导致调度碎片化
4. 表格行和循环实例没有真正隔离导致扇出刷新
5. 域控件只能黑盒嵌入，无法静态校验和统一 tracing
6. devtools 只能看节点树，看不到真实依赖图和 effect 图

v6 的路线是把这些能力全部收束到统一 graph kernel 上。

但在基准数据出来前，更准确的表述是:

1. v6 对高频局部更新、统一调度、诊断可观测性有更强设计潜力
2. v6 同时引入了更高的实现复杂度和内核常数成本风险
3. 只有当最小内核在简单场景中能真正按需裁剪，高级模块又能在复杂场景中带来稳定收益，才算完成对传统方案的超越

## 21. 与 Flux 核心原则的刻意背离

本文档是按用户要求，刻意不遵循当前 `docs/architecture/flux-design-principles.md` 的核心方向。主要背离点如下。

### 21.1 不把 DSL 视为平台内部唯一中心

Flux 强调 DSL 优先。v6 则认为 schema 是重要输入制品，但内部权威模型必须是 graph kernel，而不是 authoring-friendly 结构层。

### 21.2 不把编写态和执行态分离当作第一原则

v6 承认存在编译边界，但更强调“语义执行包”的连续性。编译结果不是单纯给 runtime 的瘦执行树，而是平台级权威产物，调试、优化、分析、回放都围绕它展开。

### 21.3 不把纯隐式响应式作为默认最优答案

Flux 偏运行时动态依赖。v6 采用静态访问计划优先、运行时补追踪兜底的混合方案，以换取更强的可预测性能。

### 21.4 不坚持最小原语集

Flux 倾向通过少量 primitive 和派生系统维持抽象克制。v6 则接受更丰富的一等原语，只要这些原语能换来更强的统一调度、静态校验和工具可观测性。

### 21.5 不把词法所有权视为最高组织规则

v6 仍支持词法 scope 语义，但实际运行组织以 frame、cell、lane、arena、effect plan 为中心，而不是以“子树拥有权”作为最高层抽象。

### 21.6 不把复杂领域长期隔离在核心外

Flux 强调领域隔离。v6 则主张提供一级域模块契约，让复杂域以受控方式进入平台统一类型、调度和诊断体系。

## 22. 实施建议

如果真的要落地 v6，建议按以下顺序推进:

1. 先实现 compiler + path token + expression VM + cell graph
2. 再实现 settled turn + scheduler lanes + derived/resource/reaction 统一失效模型
3. 再实现 form kernel、surface kernel、row arena
4. 最后做 react adapter、domain module contract、devtools graph view

不要一开始就从组件渲染层逆推内核，否则会重新掉回“树解释器”路线。

## 23. 当前评审结论占位

- 当前状态: 已完成首轮独立子 agent 评审，已按共识问题补充关键不变量，待第二轮复审
- 目标共识标准:
  1. 无 P0 级自相矛盾
  2. 无明显违背需求规格的关键缺口
  3. 在性能、扩展性、宿主边界、诊断能力四个维度上具备清晰优于传统方案的论证
