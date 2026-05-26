# TaskFlow Visual Designer

## 1. 目标与结论

本文定义 `nop-task` 的 TaskFlow 可视化设计器架构，目标是把 `c:/can/nop/nop-entropy/nop-task` 的 DSL 映射到 `nop-chaos-flux` 的 `designer-page` / Flow Designer 机制上。

最终结论：TaskFlow Designer 采用 **active-container hybrid projection**。

- `graphMode=true` 的根 task，以及 `<graph>` 步骤，使用 `workflow` profile，也就是 Flow Designer `documentMode: 'graph'`。
- `graphMode=false` 的根 task，以及结构化容器的内部 `<steps>`，使用 `dingflow` profile，也就是 Flow Designer `documentMode: 'tree'`。
- 一个 `designer-page` 实例一次只编辑一个 active container，不在同一个 Flow Designer core 里混合 graph/tree 两种文档模式。
- TaskFlow 的 owner truth 是专用 `TaskFlowAuthoringModel`；`GraphDocument` / `TreeDocument` 只是投影文档，不是最终持久化格式。
- 最终保存路径必须走 TaskFlow domain adapter：projection update -> authoring model sync -> domain validate -> lower -> serialize XML/YAML。
- 当前 Flow Designer generic API 尚不能直接完成 TaskFlow 的全部保存闭环：tree owner document 需要公开同步/export surface，graph 连线需要能写入 TaskFlow 语义 edge kind。本文把这两项列为落地前置约束；在 Phase 0 完成前，TaskFlow Designer 只能作为目标架构设计，不能声明为可基于现有 generic `designer-page` 直接无损保存的实现方案。

## 2. 来源锚点

本设计基于以下真实模型：

- `c:/can/nop/nop-entropy/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema/task/task.xdef`
- `c:/can/nop/nop-entropy/nop-task/nop-task-core/src/main/java/io/nop/task/model/TaskFlowModel.java`
- `c:/can/nop/nop-entropy/nop-task/nop-task-core/src/main/java/io/nop/task/model/TaskStepModel.java`
- `c:/can/nop/nop-entropy/nop-task/nop-task-core/src/main/java/io/nop/task/model/GraphTaskStepModel.java`
- `c:/can/nop/nop-entropy/nop-task/nop-task-core/src/main/java/io/nop/task/builder/TaskFlowAnalyzer.java`
- `c:/can/nop/nop-entropy/nop-task/nop-task-core/src/main/java/io/nop/task/builder/GraphStepAnalyzer.java`
- `c:/can/nop/nop-entropy/nop-task/nop-task-core/src/main/java/io/nop/task/builder/TaskStepBuilder.java`
- `c:/can/nop/nop-entropy/nop-task/nop-task-core/src/main/java/io/nop/task/builder/TaskStepEnhancer.java`
- `c:/can/nop/nop-entropy/nop-task/nop-task-ext/src/main/java/io/nop/task/ext/TaskExtConstants.java`

关键事实：

- `TaskFlowModel` 的根属性是 `version`，不是 `taskVersion`。
- `TaskFlowModel` 继承 `TaskStepsModel`，根 task 也拥有继承而来的 step/executable 通用属性。
- `graphMode=true` 与 `<graph>` 要求 `enterSteps` 与 `exitSteps` 非空，并引用已有 step；在 authoring model 中它们只由 graph container 的 `enterStepRefs` / `exitStepRefs` 拥有。
- `next` / `nextOnError` 在 graph 分析阶段会被规范化为目标 step 的 `waitSteps` / `waitErrorSteps`。
- 当前 live adapter 只支持有限的 TaskFlow step 子集：`script`、`invoke`、`sequential`、`graph`、`parallel`、`if`、`choose`、`delay`、`end`。其余更宽的 DSL 家族仍属于目标架构，不是已落地 baseline。
- `fork` / `fork-n` 是单一 body 被动态复制执行，不是用户手工维护多条 branch；但这些类型在当前 live adapter 中仍未实现，导入时会被显式拒绝而不是静默降级。
- `choose.case` 与 `choose.otherwise` 都支持 `to` 属性，必须 round-trip 保留。
- `decorator` 是开放模型，扩展属性可能是 namespaced attribute，例如 `txn:txnGroup`、`txn:propagation`、`orm:newSession`。
- XML tag、Java model `getType()`、可视节点 id 不是总是同一个字符串，例如 `<loop-n>` 对应 Java runtime type `loopN`。本文的 `TaskFlowStep.type` 使用可视/DSL tag id，lowering 时必须通过显式映射表转换。

## 2.1 实现前置约束

TaskFlow 落地前需要补齐或绕开两个 Flow Designer 集成缺口：

- Tree owner sync：tree 模式编辑后的 owner `TreeDocument` 必须能通过 `onTreeDocumentChange`、`designer:exportTreeDocument`、或 TaskFlow wrapper 托管 tree mutation 的方式回传给 TaskFlow adapter。
- Graph semantic edge creation：graph 模式连线时必须能确定 TaskFlow edge kind。实现可以扩展 `designer:addEdge` 支持 `edgeType`，也可以把语义绑定到 `sourcePort` / `data.taskflowEdgeKind`；但创建时必须写入 owner edge，不能只依赖默认 edge type。

没有这两项能力时，TaskFlow 仍可把 Flow Designer 当作只读/半受控投影画布使用，但不能宣称已经可通过现有 generic API 无损保存 TaskFlow。TaskFlow 落地必须二选一：要么扩展 Flow Designer 公共 API，要么实现一个 TaskFlow-specific wrapper，让所有 tree mutation 和 graph edge mutation 先进入 TaskFlow adapter，再投影给 generic designer。

## 3. 三层模型

TaskFlow Designer 必须明确区分三层数据：

| 层                               | 角色                                                                      | 是否 owner truth   |
| -------------------------------- | ------------------------------------------------------------------------- | ------------------ |
| `TaskFlowAuthoringModel`         | 设计器专用 JSON，保存 step、container、branch、decorator 的完整可编辑状态 | 是                 |
| `GraphDocument` / `TreeDocument` | Flow Designer 当前 active container 的投影输入                            | 否                 |
| nop-task XML/YAML                | `task.xdef` 对应的最终 DSL 表象                                           | 是，属于序列化目标 |

Flow Designer 不拥有 `nop-task` 的 parse、lower、validate、serialize 语义。这些能力由 TaskFlow domain adapter 提供。

## 4. `workflow` 与 `dingflow` 选型

### 4.1 对比

| 维度                      | `workflow` profile         | `dingflow` profile             |
| ------------------------- | -------------------------- | ------------------------------ |
| Flow Designer 模式        | `documentMode: 'graph'`    | `documentMode: 'tree'`         |
| 适合结构                  | 任意 DAG、显式依赖、错误边 | 链式步骤、结构化分支、隐式汇合 |
| 能否表达 `waitSteps`      | 适合                       | 不适合                         |
| 能否表达 `nextOnError`    | 适合                       | 不适合                         |
| 能否表达 `if/choose` 结构 | 可表达但不自然             | 适合                           |
| 能否表达 `parallel` 结构  | 可表达但过度自由           | 适合                           |
| 是否允许任意连线          | 是                         | 否                             |

### 4.2 决策表

| TaskFlow 结构                | Active container profile | 原因                                                               |
| ---------------------------- | ------------------------ | ------------------------------------------------------------------ |
| 根 task 且 `graphMode=true`  | `workflow`               | 需要自由 graph edge 语义                                           |
| `<graph>`                    | `workflow`               | 与根 graph 同构，且 `GraphTaskStepModel.isGraphMode()` 固定为 true |
| 根 task 且 `graphMode=false` | `dingflow`               | 缺省按 `steps` 顺序执行                                            |
| `<sequential>`               | `dingflow`               | 线性 body                                                          |
| `<selector>`                 | `dingflow`               | 线性尝试子步骤                                                     |
| `<parallel>`                 | `dingflow`               | 多子步骤并行后汇合                                                 |
| `<fork>` / `<fork-n>`        | `dingflow`               | 单一 body 被复制执行，不是自由 DAG                                 |
| `<loop>` / `<loop-n>`        | `dingflow`               | 单一循环 body                                                      |
| `<if>` / `<choose>`          | `dingflow`               | 分支 body 结构化                                                   |

## 5. Active Container 工作流

一个页面中可以存在嵌套 container，但运行时一次只打开一个 active container：

```text
TaskFlowAuthoringModel
  -> select active container
  -> project to GraphDocument or TreeDocument
  -> designer-page renders one Flow Designer runtime
  -> designer:* commands mutate projection
  -> TaskFlow adapter syncs projection back to active container
```

复合 step 的内部 `<steps>` 不直接塞进 `TreeNode.child`。规则是：

- `TaskFlowStep.body` 拥有复合 step 的内部 container。
- `TreeNode.child` 只表示当前 active tree container 中的下游 continuation。
- 双击复合 step 或点击“进入子流程”会切换 active container。
- 切换 active container 前必须先把当前 projection flush 回 `TaskFlowAuthoringModel`，避免子流程导航丢失未保存编辑。
- `if` / `choose` 的 branch body 可以在当前 tree 投影中展开，因为它们是同一个结构化 container 的局部分支。

## 6. Owner Truth JSON Schema

### 6.1 顶层模型

```ts
interface TaskFlowAuthoringModel {
  kind: 'nop-taskflow';
  schemaVersion: '1.0';
  task: TaskFlowTaskMeta;
  root: TaskFlowContainer;
}

interface TaskFlowTaskMeta {
  version: number;
  graphMode: boolean;
  restartable: boolean;
  defaultSaveState: boolean;
  defaultUseParentScope?: boolean;
  useParentBeanContainer: boolean;
  recordMetrics: boolean;
  imports?: TaskImportConfig[];
  auth?: TaskFlowRawNode;
  beans?: TaskFlowRawNode;
  common?: TaskFlowRootCommonConfig;
  raw?: TaskFlowRawExtension;
}

interface TaskFlowRootCommonConfig extends Partial<TaskFlowCommonStepConfig> {
  name?: string;
}

interface TaskImportConfig {
  as: string;
  class: string;
}
```

`task.common` 保存根 task 从 `TaskStepsModel` / `TaskStepModel` / `TaskExecutableModel` 继承来的通用属性，例如 `name`、`timeout`、`inputs`、`outputs`、`decorators`、`when`、`retry` 等。根 task 名称只放在 `task.common.name`，不在 `TaskFlowTaskMeta` 上再复制一份。

### 6.2 Container Union

```ts
type TaskFlowContainer = TaskFlowGraphContainer | TaskFlowTreeContainer;

interface TaskFlowContainerBase {
  id: string;
  name?: string;
  ownerStepId?: string;
  viewport?: { x: number; y: number; zoom: number };
}

interface TaskFlowGraphContainer extends TaskFlowContainerBase {
  profile: 'workflow';
  enterStepRefs: string[];
  exitStepRefs: string[];
  nodes: TaskFlowGraphNode[];
  edges: TaskFlowGraphEdge[];
}

interface TaskFlowTreeContainer extends TaskFlowContainerBase {
  profile: 'dingflow';
  steps: TaskFlowStep[];
  syntheticRootId: string;
}
```

TaskFlow tree container 始终投影一个 synthetic root wrapper 到 `TreeDocument.root`，真实 `steps[]` 作为该 root 的 `child` 链。这样可以避免 Flow Designer tree root 不可删除的约束误伤第一个真实 step。synthetic root 不进入 `TaskFlowAuthoringModel.steps`，也不序列化到 nop-task DSL。该规则由 TaskFlow adapter/wrapper 实现；generic Flow Designer tree mode 不会自动识别或剥离 `syntheticRootId`。

### 6.3 Graph Container

```ts
interface TaskFlowGraphNode {
  id: string;
  position: { x: number; y: number };
  step: TaskFlowStep;
}

interface TaskFlowGraphEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: 'next' | 'error' | 'wait' | 'wait-error';
  targetPort?: 'in';
  edgeType: 'taskflow-next' | 'taskflow-error' | 'taskflow-wait' | 'taskflow-wait-error';
  data?: { label?: string };
}
```

约束：

- `TaskFlowGraphNode.id` 是稳定设计器 id。
- `step.common.name` 是最终 DSL step name，可重命名。
- edge 端点引用 node id；lowering 时用 node id 查到 `step.common.name`。
- `node.step.type` 是唯一 step type source；投影到 `GraphNode.type` 时复制该值。
- `enterStepRefs` / `exitStepRefs` 存储 node id，不存储 DSL step name。lowering 时通过 node id 解析为 `step.common.name`，从而支持安全重命名。
- `edgeType` 是 owner-truth 语义字段；投影到现有 Flow Designer 时可以复制为 `GraphEdge.type`，也可以同时复制到 `GraphEdge.data.taskflowEdgeKind` 以规避 generic addEdge 只使用默认 edge type 的限制。

### 6.4 Tree Container

`TaskFlowTreeContainer.steps` 是当前结构化容器的顺序 body。投影到 `TreeDocument` 时，`TreeDocument.root` 永远是 synthetic container wrapper，`steps[0]` 投影为 synthetic root 的 `child`，后续步骤继续通过 `TreeNode.child` 串成 continuation。

```ts
interface TaskFlowTreeBranch {
  id: string;
  data: {
    branchType: 'then' | 'else' | 'case' | 'otherwise' | 'parallel-body' | 'loop-body';
    label?: string;
    match?: string;
    to?: string;
    priority?: number;
    raw?: TaskFlowRawExtension;
  };
  steps: TaskFlowStep[];
}
```

投影到 Flow Designer `TreeNodeBranch` 时，`branchType` 放在 `branch.data.branchType`，不新增 top-level `branchType` 字段。

## 7. Step Discriminated Union

```ts
type TaskFlowStepType =
  | 'script'
  | 'invoke'
  | 'sequential'
  | 'graph'
  | 'parallel'
  | 'if'
  | 'choose'
  | 'delay'
  | 'end';

interface TaskFlowStep {
  id: string;
  type: TaskFlowStepType;
  common: TaskFlowCommonStepConfig;
  props: TaskFlowStepProps;
  body?: TaskFlowContainer;
  branches?: TaskFlowTreeBranch[];
  raw?: TaskFlowRawExtension;
}
```

`id` 与 `common.name` 分离是为了支持安全重命名。最终序列化时只输出 `common.name`。

## 8. 通用 Step 属性

```ts
interface TaskFlowCommonStepConfig {
  name: string;
  displayName?: string;
  description?: string;
  meta?: TaskFlowRawNode | Record<string, unknown>;
  tagSet?: string[];
  disabled?: boolean;
  allowFailure?: boolean;
  concurrent?: boolean;
  sync?: boolean;
  internal?: boolean;
  runOnContext?: boolean;
  recordMetrics?: boolean;
  allowStartIfComplete?: boolean;
  catchInternalException?: boolean;
  saveState?: boolean;
  useParentScope?: boolean;
  executor?: string;
  returnType?: string;
  timeout?: number;
  errorName?: string;
  persisVars?: string[];
  graphqlOperationType?: string;
  next?: string;
  nextOnError?: string;
  waitSteps?: string[];
  waitErrorSteps?: string[];
  when?: string;
  validator?: string;
  catch?: string;
  finally?: string;
  onEnter?: string;
  onReload?: string;
  flags?: TaskFlowFlags;
  inputs?: TaskFlowInput[];
  outputs?: TaskFlowOutput[];
  retry?: TaskFlowRetry;
  throttle?: TaskFlowThrottle;
  rateLimit?: TaskFlowRateLimit;
  decorators?: TaskFlowDecoratorConfig[];
}
```

说明：

- `tagSet` 保持 DSL 命名，不改成 `tags`。
- `persisVars` 保持 XDef 原始拼写，避免 round-trip 时误改名。
- `graphqlOperationType` 对应 `graphql:operationType`。
- `next` / `nextOnError` / `waitSteps` / `waitErrorSteps` 是所有 step 的标准字段。graph container 可以用 typed edges 编辑这些字段，但 owner schema 仍保留字段位，用于导入非 graph tree container 中已有的显式引用并支持无损 round-trip。

## 9. 类型专属属性

```ts
type TaskFlowStepProps =
  | { type: 'script'; lang: string; source?: string }
  | { type: 'invoke'; bean: string; method: string }
  | { type: 'sequential' }
  | { type: 'graph' }
  | { type: 'parallel'; joinType?: string; autoCancelUnfinished?: boolean; aggregator?: string }
  | { type: 'if'; condition?: string }
  | { type: 'choose'; decider?: string }
  | { type: 'delay'; delayMillisExpr: string }
  | { type: 'end'; source?: string };
```

校验要求：`TaskFlowStep.type === TaskFlowStep.props.type`，否则为 authoring model 错误。

### 9.1 Step Type 映射

`TaskFlowStep.type` 使用可视/DSL tag id。序列化和运行时解释必须经过显式映射表：

| `TaskFlowStep.type` | XML tag                                  | Java/model step type |
| ------------------- | ---------------------------------------- | -------------------- |
| `step`              | `step`，导入旧模型时可记录原始 `xpl` tag | `step`               |
| `fork-n`            | `fork-n`                                 | `fork-n`             |
| `loop-n`            | `loop-n`                                 | `loopN`              |
| 其他同名类型        | 同名 tag                                 | 同名 type            |

Current live baseline note:

- `end` 已加入当前 adapter 的 supported union，并通过 graph node type `tf-end` 映射到 `TaskFlowStepType = 'end'`。
- 其余更宽的 DSL 类型，如 `selector`、`fork`、`fork-n`、`loop`、`loop-n`、`invoke-static`、`call-task`、`call-step`、`sleep`、`suspend`、`exit`、`custom`，目前仍未进入 live adapter union。
- 对这些未支持类型，`import-json` 当前会显式返回 `Unsupported TaskFlow step types: ...`，而不是再降级成 `script`。

## 10. 通用复合属性

```ts
interface TaskFlowFlags {
  match?: string;
  enable?: string[];
  disable?: string[];
  rename?: Record<string, string>;
}

interface TaskFlowInput {
  name: string;
  displayName?: string;
  type?: string;
  mandatory?: boolean;
  optional?: boolean;
  persist?: boolean;
  fromTaskScope?: boolean;
  dump?: boolean;
  role?: string;
  defaultValue?: unknown;
  value?: string;
  source?: string;
  schema?: TaskFlowRawNode;
  description?: string;
}

interface TaskFlowOutput {
  name: string;
  displayName?: string;
  type?: string;
  persist?: boolean;
  toTaskScope?: boolean;
  dump?: boolean;
  exportAs?: string;
  roles?: string[];
  value?: string;
  source?: string;
  schema?: TaskFlowRawNode;
  description?: string;
}

interface TaskFlowRetry {
  maxRetryCount: number;
  retryDelay?: number;
  maxRetryDelay?: number;
  exponentialDelay?: boolean;
  exceptionFilter?: string;
}

interface TaskFlowThrottle {
  maxConcurrency: number;
  maxWait?: number;
  keyExpr?: string;
  global?: boolean;
}

interface TaskFlowRateLimit {
  requestPerSecond: number;
  maxWait?: number;
  keyExpr?: string;
  global?: boolean;
}
```

## 11. Decorator Schema

Decorator 必须支持 lossless round-trip。单纯 `ext: Record<string, unknown>` 不够，因为 XML/YAML 需要区分 attribute、child element、namespace、顺序与重复节点。

```ts
interface TaskFlowDecoratorConfig {
  name: string;
  order?: number;
  bean?: string;
  source?: string;
  attrs?: Record<string, unknown>;
  children?: TaskFlowRawNode[];
  namespaces?: Record<string, string>;
}

interface TaskFlowRawExtension {
  attrs?: Record<string, unknown>;
  children?: TaskFlowRawNode[];
  namespaces?: Record<string, string>;
}

interface TaskFlowRawNode {
  name: string;
  attrs?: Record<string, unknown>;
  children?: TaskFlowRawNode[];
  text?: string;
  namespaces?: Record<string, string>;
}
```

`TaskFlowRawNode` 的 lossless 目标限定为 `nop-task` 常见结构化节点：attribute、child element、text body、namespace 和重复 child。若未来需要保留 XML mixed content 的精确顺序，应把 `text` / `children` 收敛为 ordered content array。

内置 decorator 定义用于生成 inspector schema，不是新的表单引擎。

```ts
interface TaskFlowDecoratorDefinition {
  name: string;
  label: string;
  description?: string;
  icon?: string;
  defaultOrder?: number;
  fields?: TaskFlowFieldDefinition[];
}

interface TaskFlowFieldDefinition {
  label: string;
  pathSegments: string[];
  valueType:
    | 'string'
    | 'boolean'
    | 'number'
    | 'expr'
    | 'predicate'
    | 'xpl'
    | 'enum'
    | 'bean-ref'
    | 'path';
  required?: boolean;
  options?: Array<{ label: string; value: string | number }>;
}
```

示例：

```json
[
  {
    "name": "transaction",
    "label": "事务",
    "defaultOrder": 100,
    "fields": [
      { "label": "事务组", "pathSegments": ["attrs", "txn:txnGroup"], "valueType": "string" },
      { "label": "传播行为", "pathSegments": ["attrs", "txn:propagation"], "valueType": "enum" }
    ]
  },
  {
    "name": "orm-session",
    "label": "ORM Session",
    "defaultOrder": 100,
    "fields": [
      { "label": "新会话", "pathSegments": ["attrs", "orm:newSession"], "valueType": "boolean" }
    ]
  }
]
```

使用 `pathSegments` 是为了把 `txn:txnGroup` 当作 literal key，避免 dotted-path 解析器误判。

## 12. 属性编辑器映射

| 属性类型           | 典型字段                                                   | 设计器编辑器                 |
| ------------------ | ---------------------------------------------------------- | ---------------------------- |
| `string`           | `name`, `displayName`, `bean`, `lang`                      | `Input`                      |
| `boolean`          | `sync`, `concurrent`, `allowFailure`                       | `Switch`                     |
| `int/long/double`  | `timeout`, `maxRetryCount`, `requestPerSecond`             | number input                 |
| `csv-set`          | `tagSet`, `persisVars`, `enterStepRefs`, `exitStepRefs`    | tags combobox                |
| `expr`             | `delayMillisExpr`, `itemsExpr`, `countExpr`, `stepExpr`    | expression editor            |
| `xpl-predicate`    | `when`, `while`, `until`, `resumeWhen`, `condition`        | predicate code editor        |
| `xpl` 内容         | `source`, `validator`, `aggregator`, `producer`, `decider` | multiline code editor        |
| `bean-name`        | `executor`, `bean`                                         | bean picker + fallback input |
| `method-ref`       | `invoke-static.method`                                     | method picker                |
| `v-path`           | `taskModelPath`, `libModelPath`                            | resource picker              |
| `generic-type`     | `returnType`, `varType`, input/output `type`               | type picker                  |
| `enum`             | `joinType`, `txn:propagation`                              | select                       |
| `xjson` / raw node | `meta`, `auth`, `beans`, `schema`                          | JSON/XML structured editor   |

## 13. 核心步骤覆盖矩阵

| 步骤类型                                                                                                  | 当前状态 | 可视节点                | 类型专属属性                                                                         | 子编辑器                         |
| --------------------------------------------------------------------------------------------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------ | -------------------------------- |
| `script`                                                                                                  | live     | 叶子节点                | `lang`, `source`                                                                     | 无                               |
| `invoke`                                                                                                  | live     | 叶子节点                | `bean`, `method`                                                                     | 无                               |
| `delay`                                                                                                   | live     | 叶子节点                | `delayMillisExpr`                                                                    | 无                               |
| `end`                                                                                                     | live     | 终止节点                | `source`                                                                             | 无                               |
| `sequential`                                                                                              | live     | 容器节点                | 无                                                                                   | `dingflow` body                  |
| `graph`                                                                                                   | live     | 容器节点                | active graph container 的 `enterStepRefs`, `exitStepRefs`                            | `workflow` body                  |
| `parallel`                                                                                                | live     | 容器节点                | `joinType`, `autoCancelUnfinished`, `aggregator`                                     | `dingflow` body                  |
| `if`                                                                                                      | live     | 分支容器节点            | `condition`                                                                          | `then` / `else` branch body      |
| `choose`                                                                                                  | live     | 分支容器节点            | `decider`                                                                            | `case` / `otherwise` branch body |
| `selector`                                                                                                | planned  | 容器节点                | 无                                                                                   | `dingflow` body                  |
| `fork`                                                                                                    | planned  | 容器节点                | `varName`, `indexName`, `producer`, `joinType`, `autoCancelUnfinished`, `aggregator` | single `dingflow` body           |
| `fork-n`                                                                                                  | planned  | 容器节点                | `indexName`, `countExpr`, `joinType`, `autoCancelUnfinished`, `aggregator`           | single `dingflow` body           |
| `loop`                                                                                                    | planned  | 容器节点                | `varName`, `indexName`, `itemsExpr`, `maxCount`, `varType`, `while`, `until`         | single `dingflow` body           |
| `loop-n`                                                                                                  | planned  | 容器节点                | `varName`, `indexName`, `beginExpr`, `endExpr`, `stepExpr`                           | single `dingflow` body           |
| `simple` / `step` / `invoke-static` / `call-task` / `call-step` / `sleep` / `suspend` / `exit` / `custom` | planned  | see target architecture | see target architecture                                                              | not yet implemented              |

`fork` / `fork-n` 不能建模成用户手工增加多条 branch；它们的 body 是一个结构化子步骤列表，运行时按数据项或 count 动态复制执行。

## 14. Projection 到 Flow Designer

### 14.1 GraphDocument Projection

`TaskFlowGraphContainer` 投影到 Flow Designer `GraphDocument`：

```ts
interface GraphDocument {
  id: string;
  kind: 'nop-taskflow-workflow';
  name: string;
  version: string;
  meta?: Record<string, unknown>;
  viewport?: { x: number; y: number; zoom: number };
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

投影规则：

- `GraphNode.id = TaskFlowGraphNode.id`
- `GraphNode.type = TaskFlowGraphNode.step.type`
- `GraphNode.data.step = TaskFlowGraphNode.step`
- `GraphEdge.type = TaskFlowGraphEdge.edgeType`
- `GraphEdge.data.taskflowEdgeKind = TaskFlowGraphEdge.edgeType`
- `GraphEdge.sourcePort` / `targetPort` 保留端口身份

Synthetic `__enter__` / `__exit__` 只允许出现在 projection 中。owner truth 是 `enterStepRefs` / `exitStepRefs` 字段，不能同时把 hub edges 当作第二份真相。

当前 generic `designer:addEdge` 不保证可写入任意 `GraphEdge.type`。TaskFlow graph adapter 必须在连线创建时根据 source port、快捷菜单或插入命令写入 `TaskFlowGraphEdge.edgeType`；若只是调用默认 addEdge，则只能得到默认边，不能作为 TaskFlow graph 保存依据。

### 14.2 TreeDocument Projection

`TaskFlowTreeContainer` 投影到 Flow Designer `TreeDocument`：

```ts
interface TreeDocument {
  id: string;
  kind: 'nop-taskflow-dingflow';
  name: string;
  version: string;
  meta?: Record<string, unknown>;
  root: TreeNode;
}
```

投影规则：

- `TreeDocument.root` 是 synthetic container wrapper，`container.steps` 从 `root.child` 开始串成 `TreeNode.child` 链。
- `TreeNode.data.step = TaskFlowStep`。
- `if.branches` 投影为 `TreeNode.branches`，`branch.data.branchType = 'then' | 'else'`。
- `choose.branches` 投影为 `TreeNode.branches`，并保留 `branch.data.match` 与 `branch.data.to`。
- `parallel` 的内部 body 可在当前 tree 中作为结构化 fan-out 展开，也可通过“进入子流程”打开；具体交互由 TaskFlow adapter 决定，但 owner truth 仍是 `step.body`。
- `TreeNode.child` 永远表示当前节点执行完成后的 downstream continuation，不表示复合 step 的内部 body。

## 15. Graph Edge 语义

| Edge kind             | Lowering                                                                               |
| --------------------- | -------------------------------------------------------------------------------------- |
| `taskflow-next`       | `source.next = target.name`，之后可被 graph analyzer 规范化为 target wait              |
| `taskflow-error`      | `source.nextOnError = target.name`，之后可被 graph analyzer 规范化为 target wait-error |
| `taskflow-wait`       | `target.waitSteps += source.name`                                                      |
| `taskflow-wait-error` | `target.waitErrorSteps += source.name`                                                 |

补充语义：

- 一个 step 同时出现在目标的 `waitSteps` 和 `waitErrorSteps` 时，运行时语义是等待该前置 step 完成，不区分成功或错误。
- 设计器内部 owner truth 是 `TaskFlowGraphEdge.edgeType`。投影层可以把它同步到 `GraphEdge.type` 和 `GraphEdge.data.taskflowEdgeKind`，但 lowering 必须从 owner edge 读取，不能依赖当前 generic `designer:addEdge` 一定能设置 `GraphEdge.type`。
- 每个 source 最多一条 `taskflow-next` 出边。
- 每个 source 最多一条 `taskflow-error` 出边。
- `taskflow-wait` / `taskflow-wait-error` 允许多条。

## 16. Inspector 组织规则

右侧属性面板使用 `NodeTypeConfig.inspector.body` 生成 Flux schema fragment。下面 6 组只是 TaskFlow profile 的生成约定，不是 Flow Designer core contract：

1. 基本信息：`name` / `displayName` / `description` / `tagSet`
2. 类型属性：当前 step type 的 `props`
3. 执行控制：`disabled` / `allowFailure` / `sync` / `executor` / `timeout` / `runOnContext`
4. 作用域与状态：`saveState` / `useParentScope` / `allowStartIfComplete` / `internal` / `errorName`
5. 输入输出与策略：`inputs[]` / `outputs[]` / `flags` / `retry` / `throttle` / `rateLimit`
6. Hooks 与 Decorators：`when` / `validator` / `catch` / `finally` / `onEnter` / `onReload` / `decorators[]`

Decorator definition registry 只负责生成这些 schema fragments。

## 17. Lowering 到 nop-task DSL

### 17.1 Graph Container Lowering

- 按 `nodes[]` 输出 `<steps>` 子节点。
- `node.step.common.name` 是最终 step name。
- edge 端点通过 node id 查找最终 step name。
- `enterStepRefs` / `exitStepRefs` 通过 node id 解析为 step name 后输出为 task 或 graph step 的 `enterSteps` / `exitSteps`，不从 synthetic hub edges 读取。`TaskFlowTaskMeta` 与 graph step `props` 不再保存重复 enter/exit 字段。
- `taskflow-next` / `taskflow-error` / `taskflow-wait` / `taskflow-wait-error` 按第 15 节规则输出。

### 17.2 Tree Container Lowering

- `steps[]` 按顺序输出到 `<steps>`。
- 当前 live lowering 只覆盖 `sequential` / `parallel` 的 `step.body -> <steps>`。`selector` / `fork` / `fork-n` / `loop` / `loop-n` 仍属于目标架构，未进入当前 adapter lowering baseline。
- `if.branches[data.branchType='then']` 输出到 `<then>`。
- `if.branches[data.branchType='else']` 输出到 `<else>`。
- `choose.case` 输出 `<case match="..." to="...">`，其中 `to` 可选。
- `choose.otherwise` 输出 `<otherwise to="...">`，其中 `to` 可选。

### 17.3 Decorator Lowering

- `attrs` 输出为 decorator attribute。
- `children` 输出为 decorator child elements。
- `namespaces` 保留 namespace declaration。
- `source` 输出为 `<source>` child。
- 设计器可以按 `order` 排序输出，但必须声明这是设计器策略；`TaskStepEnhancer` 本身按 list 顺序应用 decorator。

## 18. 验证规则

保存前由 TaskFlow adapter 执行 domain validation：

- 当前 container 内 step `common.name` 唯一。
- `TaskFlowStep.type === TaskFlowStep.props.type`。
- graph container 的 `enterStepRefs` 非空并引用已有 graph node id。
- graph container 的 `exitStepRefs` 非空并引用已有 graph node id。
- `enterStepRefs` / `exitStepRefs` 必须引用已有 graph node id。
- graph edge source/target 引用存在。
- `next` / `nextOnError` / `waitSteps` / `waitErrorSteps` 引用存在。
- `choose.case.match` 在同一个 choose 内不可重复。
- `choose.otherwise` 最多一个。
- `parallel` 只有一个 body container，不允许手工多 branch。
- 未支持类型在当前 import path 中必须显式报错，而不是静默降级到 `script`。

`if.then` 不强制必填，因为运行时代码允许缺失 then/else 后继续执行。

## 19. Save / Export Pipeline

Flow Designer 的 `designer:save` 和 `designer:export` 不能直接等同于 TaskFlow DSL 保存。当前 `designer:save` 只应理解为 projection/core dirty baseline 的保存语义，不表示已经持久化 nop-task XML/YAML。

TaskFlow 保存动作必须走 domain action：

```text
taskflow:save
  -> flush current active container into TaskFlowAuthoringModel
  -> read current designer projection or owner tree callback state
  -> sync active container into TaskFlowAuthoringModel
  -> validate TaskFlowAuthoringModel
  -> lower to nop-task object model
  -> serialize XML/YAML/JSON representation
  -> persist through host model service
```

Flow Designer 的 raw `core.exportDocument()` 只能作为调试投影输出，不可作为最终 TaskFlow 文件。

## 20. 实施顺序

0. 补齐 Tree owner sync/export surface 与 graph semantic edge creation：`onTreeDocumentChange`、`designer:exportTreeDocument`、TaskFlow wrapper 托管 tree mutation、或扩展 `designer:addEdge` / adapter edge-kind 写入。没有这一步，TaskFlow tree container 和 graph semantic edge 都不能无损保存。
1. 实现 `TaskFlowAuthoringModel`、active container selector、graph/tree projection adapter。
2. 支持 root `graphMode=true` 与 `<graph>` 的 `workflow` profile。
3. 支持 root `graphMode=false` 与 `<sequential>` 的 `dingflow` profile。
4. 补齐 `selector`、`fork`、`fork-n`、`loop`、`loop-n`，把当前 live subset 从 `parallel`/`if`/`choose`/`end` 继续扩展到完整目标架构。
5. 补齐 `if`、`choose`、branch body、`case.to` / `otherwise.to`。
6. 接入 decorator registry 与 lossless raw extension model。
7. 接入 XML/YAML round-trip 与 host persistence。

## 21. 最终决策摘要

- TaskFlow Designer 使用 Flow Designer 机制，不新增独立画布/runtime。
- `workflow` 与 `dingflow` 是 TaskFlow profile 名，不是 Flow Designer core 的第三种模式。
- 一个 active container 对应一个 `designer-page` 的 graph 或 tree 投影。
- 复合 step 的内部 body 由 `TaskFlowStep.body` 拥有，`TreeNode.child` 只表示 continuation。
- Decorator 必须使用 lossless extension model，不能只用普通 `Record<string, unknown>`。
- 当前 live subset（`script`、`invoke`、`sequential`、`graph`、`parallel`、`if`、`choose`、`delay`、`end`）已经有明确节点类型、属性 schema、同步/校验规则；其余核心步骤仍属于后续扩展范围，不应被文档表述成已落地 baseline。
