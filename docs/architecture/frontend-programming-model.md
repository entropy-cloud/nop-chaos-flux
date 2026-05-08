# Flux 前端编程模型

## 引言

`Flux` 是一个基于 `Final Execution Schema` 的前端运行时：结构在进入运行时之前已完成组装，运行时本身只做值求值（含内建依赖追踪）、资源生命周期、响应调度和效果权限控制。运行时核心由七个封闭原语定义，所有上层能力（表单、页面、动作组合、API 调度……）均派生自这组原语，不再增加。

## 七个原语

| 原语              | 回答的问题                         | 职责                                                                                                     |
| ----------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Template`        | 编译后的程序结构是什么？           | 不可变结构模板、`Region` 组合、生命周期锚定、渲染器选择；`RendererDefinition` 提供比类型系统更严格的校验 |
| `ScopeRef`        | 此处可见哪些数据？                 | 嵌套数据域，统一管理所有运行时状态；词法查找、自身作用域写入、遮蔽、作用域内所有权                       |
| `Value`           | 此处的值如何读取或派生？           | 通过 name 定位 scope 值；`${expr}` 表达式求值和复杂对象构造（含嵌套）；响应式依赖跟踪；name 绑定的值约束 |
| `Resource`        | 运行时是否拥有此处的值生产和发布？ | 拥有生命周期的值生产者：将远程 API 或公式映射为 scope 上的命名值；附带动态 status 管理                   |
| `Reaction`        | 值变化是否触发后续动作？           | Value 变化 → Action 系统的桥；基于依赖的 watch，条件满足时通过 Capability 派发动作                       |
| `Capability`      | 谁有权执行某个效果？               | 进入 Action 系统的控制权；ActionSchema 是具体 action 的建模，Capability 负责派发、权限和目标定位         |
| `Host Projection` | 此处可见哪些只读宿主快照？         | 将宿主拥有的只读快照数据引入 schema 可见作用域；复杂宿主对象的集成方案                                   |

原语补充说明：

- `Template` 是唯一的结构原语，编译时产出不可变模板，运行时永不修改。一个 `Template` 可多次实例化，每次产生独立的运行时状态。当前主要由 `CompiledTemplate` 和 `TemplateNode` 承载。
- `ScopeRef` 是嵌套数据域，界面由数据渲染。不是行为注册表。
- `Value` 是 Flux 的通用求值层。name 是值在 scope 中的定位方式，也是值约束（validation）的绑定锚点。任何 schema 字段中的 `${...}` 都经过统一的编译路径，覆盖节点属性、meta 控制、action 守卫和参数、data-source 配置、API 参数等。验证规则参数（`required`、`min`、`max`、`pattern` 等）同样走这条编译路径，支持动态表达式和依赖跟踪。静态值零开销折叠。响应式依赖跟踪是 Value 的内建能力：求值时自动收集依赖，依赖变化时重新求值。验证规则的执行编排（字段参与、级联策略、生命周期）属于领域运行时，不是原语层面的关注点。
- `Resource` 是"拥有生命周期的值生产者，通过写 scope 发布其产出"。远程调用是 action Resource 的一种值来源，formula Resource 则通过表达式求值生产值。两者共享发布管道和依赖追踪。
- `Reaction` 是 Value 变化到 Action 派发的桥梁。
- `Capability` 是唯一对作者可见的效果权限路径。
- `Host Projection` 是只读快照数据，不是宿主桥接对象或可变会话容器。

## 阅读须知

> **本文档是 `Flux` 前端编程模型的规范性架构文档**，负责定义原语身份、平台分层、核心执行边界和硬性不变量。子系统层面的详细规则归入更具体的子文档。当子文档与本文档在原语身份、核心边界等问题上冲突时，以本文档为准。

关键术语速查：

| 术语                       | 含义                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `Final Execution Schema`   | `Flux` 在运行时消费的已完成组装的 schema——此时静态结构决策、默认值展开和静态裁剪均已完毕 |
| `Authoring Model`          | 可编辑、可往返还原的源模型                                                               |
| `Execution Model`          | `Final Execution Schema` 加上运行时拥有的状态和附属数据                                  |
| `Lexical Ownership`        | 遵循作用域或子树边界的所有权关系                                                         |
| `Logical Value`            | 一个权威的、已发布的绑定目标                                                             |
| `Semantic Lifecycle Entry` | 节点拥有的语义入口点，例如表单提交、页面进入、对话框打开或宿主特定的语义激活             |

更多术语参见 `docs/references/terminology.md`。设计原理参见 `docs/architecture/flux-design-principles.md`。

## 设计连续性规则

当前编程模型遵循以下稳定设计规则：

1. 保持七原语封闭性。
2. 保持 `Flux` 作为 `Final Execution Schema` 运行时，而非分阶段程序系统或编写时结构组装器。
3. 不将 `Value`、`Resource` 和 `Host Projection` 坍缩为一个通用绑定原语。
4. 不将 SSR、hydration、CRDT、OT、本地优先复制或编辑器特定问题本身视为重新开启原语封闭集的理由。
5. 评判未来调整时，优先考虑 `DSL` 连续性，而非仅考虑运行时的优雅性。
6. 保留渐进式编写表面：

| 关注点   | 渐进路径                                                       |
| -------- | -------------------------------------------------------------- |
| 值生产   | 纯值 -> `${expr}` -> `type: 'source'` -> `type: 'data-source'` |
| 效果编排 | 单步 dispatch -> `when` -> `then` / `onError` -> `parallel`    |
| 结构     | `visible` -> `when` -> `loop` -> `dynamic-renderer`            |

7. 保持 `Capability` 聚焦于权限查找与目标定位；将 `Action Algebra` 作为其上层的派生控制流。
8. `ApiSchema` 是 `ajax` 动作使用的内部传输描述符，不是独立的执行路径。编写层的 `api` 字段会编译为标准 `ajax` 动作。`Operation Control` 始终是共享的执行控制层。
9. 保持 `Semantic Lifecycle Entry` 由语义节点（如表单、页面、对话框、语义宿主）拥有，而非将完整的业务管道分散到 UI 触发器中。
10. 保持 `Resource` 发布围绕 `name` 作为身份标识和默认发布路径收敛，`mergeToScope: true` 作为唯一收窄的特殊发布扩展，`statusPath` 作为只读状态摘要。
11. 保持宿主边界严格：通过只读 `Host Projection` 读取，通过 `Capability` 写入，bridge/controller/protocol 对象保持宿主私有。
12. 保持验证规则参数编译统一走 `Value` 的编译路径，验证执行编排属于领域运行时，不扩展原语集。

## 契约分层规则

对作者可见和集成可见的契约必须区分三个不同层次，而非将它们混为一个扁平表面：

| 层次                             | 含义                                             | 预期处理方式                                     |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `Canonical Core Contract`        | 权威的所有者定义的状态、命令或身份表面           | 主要文档、主要示例、主要测试、首选公开词汇       |
| `Derived Convenience Projection` | 从核心契约确定性派生的附加辅助字段或辅助读取     | 仅在明确标注为"派生"且不被视为对等契约时方可接受 |
| `Compatibility Alias`            | 仅为迁移目的保留的旧有或替代的公开拼写/路径/入口 | 明确标注为兼容用途，不在新文档/示例/测试中推广   |

规范性规则：

1. 便捷投影仅在以下条件下可接受：从核心契约派生，不引入第二所有权模型、第二写入路径或第二公开身份。
2. 兼容别名不是便捷投影。如果两个公开名称表达同一含义，非规范名称必须被标注并视为兼容用途。
3. 新架构文档和新示例应首先描述核心契约，将便捷或兼容表面放在明确标注的次要章节中。
4. 新测试应主要锁定核心契约。兼容性测试仅在项目明确决定保留该迁移表面时才允许存在。
5. 在没有兼容性要求的 v1 表面中，优先删除兼容别名，而非将其冻结到根导出、schema 验证器或顶层运行时契约中。

## 平台分层

基于 `Flux` 构建的平台可理解为四层：

| 层次                     | 职责                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `Authoring Model`        | 源码位置、别名、编辑器元数据、往返保真度、编辑结构                                                      |
| Loader / 组装层          | 继承展开、策略裁剪、`i18n`、静态默认值、最终 schema 组装                                                |
| `Flux` `Execution Model` | 值求值（含内建依赖追踪）、`Resource` 生命周期、`Reaction` 调度、`Capability` 解析、Host Projection 消费 |
| 宿主和领域运行时         | 领域核心、桥接器、协作引擎、会话模型、工作台 Shell、特殊宿主协议                                        |

`Flux` 是平台的执行核心，而非整个平台。

这四个平台层仅描述端到端的职责划分，不应与 `Flux` `Execution Model` 内部使用的分类体系相混淆。

## Execution Model 分类体系

在 `Flux` `Execution Model` 内部，概念分为三类：

| 类别                      | 含义                                                     |
| ------------------------- | -------------------------------------------------------- |
| `Core Primitive`          | 封闭原语集中的不可约简语义类别                           |
| `Primitive-Owned Surface` | 表达某个原语但对作者或求值器可见的表面，本身不成为新原语 |
| `Derived Runtime System`  | 由原语集组合而成的稳定运行时系统                         |

此分类体系是 `Flux` `Execution Model` 的内部概念，不是第二个平台层栈。

示例：

| 概念                                             | 平台层                               | Execution Model 类别                         |
| ------------------------------------------------ | ------------------------------------ | -------------------------------------------- |
| JSON/XML 编写 schema                             | `Authoring Model`                    | 不属于 Execution Model 分类体系              |
| `Final Execution Schema`                         | 进入 `Flux` `Execution Model` 的边界 | 已组装的执行契约，不是原语                   |
| 表达式和模板插值                                 | `Flux` `Execution Model`             | `Value` 的 `Primitive-Owned Surface`         |
| 验证规则参数（required/min/max/pattern 等）      | `Flux` `Execution Model`             | `Value` 的 `Primitive-Owned Surface`         |
| 验证执行编排（字段参与、级联、生命周期）         | `Flux` `Execution Model`             | 领域运行时（`Derived Runtime System`）       |
| `Action Algebra`                                 | `Flux` `Execution Model`             | `Capability` 之上的 `Derived Runtime System` |
| `ApiSchema`                                      | `Flux` `Execution Model`             | `ajax` 动作的内部传输描述符                  |
| `Operation Control`                              | `Flux` `Execution Model`             | `Derived Runtime System`                     |
| `FormRuntime` / `PageRuntime` / `SurfaceRuntime` | `Flux` `Execution Model`             | `Derived Runtime System`                     |
| CRDT / OT / 领域桥接 / 图引擎                    | 宿主和领域运行时                     | `Flux` 核心之外                              |

需要澄清两点：

1. `Action Algebra` 位于 `Flux` 执行模型内部，但在原语封闭集之外。
2. JSON、XML 等编写语法即使最终编译为 `Final Execution Schema`，也始终处于 `Flux` 核心之外。

关键规则：

> 如果一个问题可以在运行时之前通过结构变换来解决，它就不应被提升到 `Flux` 运行时表面中。

### 结构编写基线

对作者可见的结构基线保持如下：

- `visible` = 仅控制视觉呈现
- `when` = 控制结构激活与生命周期参与
- `loop` = 集合驱动的结构展开
- `dynamic-renderer` = 受控的延迟或远程片段组装
- `data-source` = `Resource` 声明，不是片段组装

`visible` 和 `when` 不是同义词。`dynamic-renderer` 不是第二个 `Resource` 表面。

## `Final Execution Schema` 边界

`Flux` 执行的是一个 `Final Execution Schema`。

这意味着：

- 结构已完成组装
- 静态默认值已展开
- 静态策略裁剪已完成
- 节点类型已确定

此架构规则约束的是进入执行阶段的契约，而非最后一次编译步骤的物理运行位置。

### 输入不变量

`Flux` 消费 `Final Execution Schema` 之前，该 schema 必须满足以下不变量：

1. `Flux` 接收的唯一执行主体是已跨越执行边界的 schema。
2. 该 schema 已完成继承展开、覆盖解析、删除、静态特性裁剪、默认值展开和结构规范化。
3. 该 schema 不携带需要在浏览器端进行结构组装的编写层合并语义——不存在未解析的 `x:extends`、未展开的 profile 规则、运行时补丁脚本或需要渲染器理解的继承链。
4. 与结构执行无关但有助于诊断和工具链的元数据可以与 schema 共存——例如 `xui:version`、每个节点的源码位置提示和诊断附属数据。
5. 此类元数据不得要求渲染器或运行时改变其求值、分发或渲染 schema 的方式。元数据是只读附属数据；执行行为仅来源于 schema 结构本身。

如果延迟或宿主引入的片段在初始页面加载之后才到达，它仍须跨越相同的边界才能进入执行：

- 被编译或规范化为与其余节点树相同的执行契约
- 获得相同的原语模型（`Template`、`ScopeRef`、`Value`、`Resource`、`Reaction`、`Capability`、`Host Projection`）
- 不在执行核心中重新开启编写时的继承展开或临时 Loader 语义

关于生成 `Final Execution Schema` 的 Loader 侧输出契约，参见 `docs/architecture/flux-dsl-vm-extensibility.md` 第 6.7–6.8 节。

### 运行时所有权

`Flux` 仍负责以下运行时工作：

- `Value` 求值（含内建依赖追踪）
- `Resource` 生命周期与发布
- `Reaction` 调度
- `Capability` 解析与分发
- `Host Projection` 消费
- 运行时拥有的节点边界处的语义生命周期分发

`Flux` 不在浏览器运行时中执行开放式 Loader 风格的 schema 重写、继承展开或 profile 组装。

允许的运行时结构倍增是狭窄且仅限派生的：

- 对已声明的子模板针对项作用域进行渲染
- 已编译节点或片段的条件激活或省略
- 不改变对作者可见的结构契约的虚拟化或保留策略

## 封闭原语集

`Flux` 核心恰好包含七个原语。原语定义和补充说明见"七个原语"节。

## 原语如何组合

七个原语不是独立的功能特性，它们共同构成一个执行模型。

### 执行循环

1. `Template` 锚定结构、渲染器所有权和词法边界。它编译一次，运行时实例化零次或多次。
2. `ScopeRef` 定义每个边界处可见的词法数据。
3. `Host Projection` 可以将只读宿主快照字段引入该可见作用域。
4. `Value` 通过 name 或 `${expr}` 从 `ScopeRef` 读取和构造值，求值时自动收集依赖，name 同时绑定值约束。
5. `Resource` 使用运行时拥有的生命周期将一个 `Logical Value` 发布回作用域。
6. `Reaction` 监视 `Value` 结果，当依赖命中时将可能的后续响应排入队列。
7. `Capability` 是这些后续响应跨越到效果层面的唯一路径。
8. 效果仅通过作用域写入、`Resource` 定向、组件定向或宿主快照替换重新进入 `Flux`。

### 依赖传播

依赖跟踪是 `Value` 的内建设计语义。`Value`、`Resource` 和 `Reaction` 都使用这一机制，但依赖命中后的后果各不相同：

| 原语       | 依赖命中后的后果                                         |
| ---------- | -------------------------------------------------------- |
| `Value`    | 重新计算读取结果                                         |
| `Resource` | 根据 Resource 策略进行失效、重新计算或刷新               |
| `Reaction` | 重新评估被监视的值，然后才决定是否通过 `Capability` 分发 |

仅依赖变化本身不会直接分发任意动作。从数据流跨越到效果层面，仍需通过 `Reaction` 或 `Semantic Lifecycle Entry`。

### 运行图景

从运行角度看，`Flux` 最好理解为：

- 一个不可变 `Template` 锚定结构和挂载生命周期
- 一个通过 `ScopeRef` 实现的词法数据层
- 一个通过 `Host Projection` 实现的宿主快照层
- 按 `Lexical Ownership` 索引的、运行时拥有的 `Resource` 和 `Reaction` 附属数据
- 一个通过 `Capability` 实现的权限层

`Capability` 本身通过两个辅助运行时层和内建平台动作进行解析：

- 内建平台能力
- 通过 `ComponentHandleRegistry` 进行的显式实例定向
- 通过 `ActionScope` 进行的词法命名空间查找

这些查找层属于 `Capability` 模型的一部分，不是额外原语。

## 充分性与晋升

### 充分性检验

原语集充分的条件是：`Flux` 中值得标准化的每个行为都可以归约为以下之一：

- 基于已编译 `Template` 的结构和生命周期
- 基于 `ScopeRef` 的 `Value` 求值
- 通过 `Resource` 进行的运行时拥有的发布
- 通过 `Reaction` 进行的被监听后续响应分发
- 通过 `Capability` 进行的效果权限控制
- 通过 `Host Projection` 引入的只读宿主快照
- 基于这些边界构建的派生运行时系统

如果某个特性似乎需要更多能力，首先应假设它属于宿主/领域架构或 schema 约定，而非 `Flux` 需要新原语。

### 晋升检验

一个概念只有同时满足以下所有条件，才可能成为新原语：

1. 它是跨领域的
2. 它不可约简为已有原语加约定
3. 它在语义上是稳定的
4. 它在 `Flux` schema 层面对作者可见
5. 它不仅仅是实现上的便利
6. 它不仅是宿主或领域的逃生舱口

### 排除规则

1. 并非每个重要的运行时系统都是原语。
2. Schema 可见的作用域携带的是数据，而非命令式权限对象。
3. `Schema` 仅通过 `Capability` 产生对作者可见的效果。

## 派生运行时系统

以下系统是重要的，但它们从原语集派生而来，而非被提升为原语：

| 系统                                             | 角色                                                                       | 主要文档                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Action Algebra`                                 | 组合、分支、聚合和分类 `Capability` 分发                                   | `docs/architecture/action-algebra-formal-spec.md`                                             |
| `Operation Control`                              | 位于传输层之上、消费策略之下的共享超时/取消/重试/去重基础设施              | `docs/architecture/api-data-source.md`                                                        |
| `Semantic Lifecycle Entry`                       | 节点拥有的语义入口点，如表单提交、页面进入、对话框打开或宿主特定的语义激活 | `docs/architecture/flux-design-principles.md`                                                 |
| `FormRuntime` / `PageRuntime` / `SurfaceRuntime` | 基于原语集构建的领域化执行表面                                             | `docs/architecture/flux-core.md`、`docs/architecture/form-validation.md`                      |
| 调试器运行时和复杂宿主接线                       | 检查、工具链和宿主协议层                                                   | `docs/architecture/debugger-runtime.md`、`docs/architecture/complex-control-host-protocol.md` |

这些系统可以演进，而不会增加原语数量。

除非更具体的所有者文档明确将它们放入宿主/领域架构，否则它们仍属于 `Flux` `Execution Model`。

## `Flux` 核心之外的内容

以下内容即使对实际产品很重要，也始终位于 `Flux` 核心之外：

- 往返编写的关注点和源码保留元数据
- XML/JSON 语法保留关注点
- 领域文档语义
- 图、电子表格、报表及其他领域算法
- 协作协议、CRDT、OT 和本地优先同步引擎
- 工作台 Shell 和会话模型
- 高频手势循环、布局、命中测试和空间算法
- 仅服务于单一领域的插件或提供者族
- 宿主桥接对象、控制器和协议状态机

它们位于核心之外并非因为不重要，而是因为它们是领域特定的、宿主特定的、可约简为已有原语加约定的，或是实现层系统而非对作者可见的跨领域语义。

它们只能通过以下狭窄边界出现在 `Flux` 中：

- 只读 `Host Projection`
- `Capability` 调用
- 显式实例定向
- 特殊宿主节点类型
- 当执行 schema 真正拥有生产策略时的 `Resource`

## 硬性不变量

`Flux` 核心必须保持以下不变量：

1. `Flux` 是一个 `Final Execution Schema` 运行时。
2. `Authoring Model` 和 `Execution Model` 保持分离。
3. `Template` 拥有结构和生命周期锚定。它在运行时不可变。
4. `ScopeRef` 是数据环境，不是行为注册表。
5. `Value`、`Resource` 和 `Reaction` 是不同的语义类别，不得坍缩为一个通用绑定概念。
6. 一个 `Resource` 发布一个权威的 `Logical Value`。
7. `Reaction` 用于被监听的后续响应，不用于值派生。
8. `Resource` 和 `Reaction` 的所有权遵循 `Lexical Ownership`。
9. `Host Projection` 是只读快照数据。
10. `Schema` 仅通过 `Capability` 产生可见效果。
11. `Capability` 是权限原语；`Action Algebra` 是其上层的派生控制流。
12. 依赖跟踪是 `Value` 原语的内建设计语义；依赖变化不直接分发任意动作。
13. 新的领域复杂度不会自动创建新原语。
14. `ApiSchema` 是 `ajax` 动作使用的内部传输描述符；所有运行时执行都通过动作分发进行。`Operation Control` 始终是共享的执行控制层。
15. `Semantic Lifecycle Entry` 在存在拥有者语义节点边界时，属于该节点。
16. 宿主集成遵循只读 `Host Projection` 加 `Capability` 写入边界。

## 相关文档

请查阅与所需细节最匹配的专门文档：

| 需求                                                             | 文档                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| 设计原理和原则                                                   | `docs/architecture/flux-design-principles.md`        |
| 当前代码级架构基线                                               | `docs/architecture/flux-core.md`                     |
| 依赖追踪细节                                                     | `docs/architecture/dependency-tracking.md`           |
| 动作组合、`then`、`onError`、`parallel`、结果分类                | `docs/architecture/action-algebra-formal-spec.md`    |
| Capability 查找、`ActionScope`、`xui:imports`、组件定向          | `docs/architecture/action-scope-and-imports.md`      |
| `source`、`data-source`、`Resource` 和 `Reaction` 的 Schema 细节 | `docs/architecture/api-data-source.md`               |
| 宿主快照和可编辑宿主协议细节                                     | `docs/architecture/complex-control-host-protocol.md` |
| 表单拥有的生命周期和校验行为                                     | `docs/architecture/form-validation.md`               |
