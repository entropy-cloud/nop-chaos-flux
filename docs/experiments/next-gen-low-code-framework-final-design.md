# 下一代低代码底层框架最终设计

> Status: final clean-slate spec proposal
>
> Scope: clean-slate architecture for a new low-code execution framework, written without inheriting the current implementation as a constraint, but after evaluating the full `docs/experiments` series and the current Flux architecture and codebase.

## 1. 结论

最终方案选择：

**Execution Package + Minimal Execution Kernel + Independent Owner Evolution**。

这不是当前 Flux 的直接重命名，也不是 v6 那种大一统 graph kernel，而是一个新的 clean-slate 架构，吸收了整个实验序列和当前项目里最强的部分，同时主动放弃几个长期看会把系统拖向复杂失控的方向。

最终判断如下：

1. 保留稳定的语义原语分层，不把一切都压成 graph/cell，也不把所有运行时状态塞进一个 God Runtime。
2. 引入比当前 Flux 更强的 **Execution Package** 编译边界，彻底区分 authoring、assembly、execution、host/domain。
3. 引入比当前 Flux 更强的 **transaction / publish / async governance** 内核，解决 stale result、并发、取消、重入、提交一致性问题。
4. 保留 `Value`、`Resource`、`Reaction`、`Capability`、`Host Projection` 的分离，不把它们统一成一个“泛 binding”。
5. 把 `form`、`surface`、`object-field`、`variant-field`、`array-field`、`table`、复杂 designer host 统一到一个 **owner substrate** 上，但 owner family 继续独立演化。
6. 复杂域控件继续采用窄边界接入：读只读 projection，写走 namespaced capability / command，不向 schema 暴露私有 store/controller。
7. validation、action algebra、surface、collection row runtime、undo/redo、collaboration 都是 **derived systems**，不是 primitive；但它们必须在内核层拥有明确的 substrate，而不是零散挂在 renderer 或 React 上。

一句话概括：

**新的底层框架应当是一个以 Execution Package 为边界、以 deterministic transaction 为执行核心、以 owner graph 为组织骨架、以 capability 为唯一效果出口的低代码执行内核。**

本文中的“最终”表示：

1. 已完成实验路线收敛，不再继续在 graph-kernel、统一 binding、运行时 authoring 这些方向摇摆。
2. 已给出足以指导从零实现的主协议、主不变量和模块边界。
3. 仍允许后续在不破坏本文不变量的前提下细化局部实现，而不是重新改写顶层模型。

---

## 2. 方案取舍

## 2.1 被评估的四类路线

### A. 当前 Flux 路线

优点：

1. primitive 边界稳。
2. DSL 连续性好。
3. host/domain 边界克制。
4. 适合嵌入式局部页面执行。
5. 当前实现已经覆盖很多真实问题。

缺点：

1. 公开执行边界不够硬，`RendererRuntime` 概念负担偏大。
2. transaction、publish、async stale-result 治理还不够内核化。
3. resource / reaction / validation / surface / action orchestration 的 substrate 还不够统一。
4. 一些 owner family 的 clean-slate 规则已经形成，但实现和接口没有完全收拢。

结论：

不直接采用当前实现形态，但保留其语义判断和 primitive 分界。

### B. Algebraic / Unified Kernel 路线

优点：

1. 模型整齐。
2. transaction、effect、signal、resource 容易被统一描述。
3. 对异步和调度的抽象更干净。

缺点：

1. 很容易把 compile-time、runtime、domain boundary 混成一层。
2. 太容易为了优雅而引入不必要的公共抽象。
3. 对 DSL 连续性和作者心智不友好。

结论：

吸收它的 transaction discipline、async governance、effect data 化思路，不采用它的大一统 public model。

### C. Graph Kernel / Cell / Arena 路线

优点：

1. 从实现统一性看很强。
2. 对高性能局部失效、诊断、调度、图级可视化很有吸引力。
3. 对 collection、designer、collaboration 这些复杂场景天然有表达力。

缺点：

1. public mental model 过重。
2. 极易把整个框架推成“图平台”，而不是低代码执行框架。
3. 很多 domain concern 会反向污染 core。
4. 容易造成 authoring DSL 与 runtime substrate 的概念错位。

结论：

cell/graph 只保留为内核内部实现自由度，不进入顶层公开语义模型。

### D. 最终方案：Execution Package + Minimal Kernel + Owner Graph

优点：

1. 保留 low-code DSL 的渐进心智。
2. 核心边界小而稳。
3. transaction、async、publish 一致性足够强。
4. owner family 可以按业务独立演化。
5. 复杂域控件和普通 renderer 可以共用一套底层规则。
6. 能兼容嵌入式页面，也能支撑复杂 designer shell。

代价：

1. 实现时需要比当前 Flux 更强的 package compiler 和 runtime kernel。
2. 对工程组织要求更高，不能继续容忍“一个文件先做完再说”的运行时堆叠。
3. 需要较早建设调试、诊断和 manifest 系统。

结论：

这是最终采用方案。

---

## 3. 顶层目标

新框架必须同时满足以下目标：

1. 能执行低代码页面、表单、列表、表格、弹窗、工作台和复杂 domain host。
2. 运行时输入必须是 **Final Execution Package**，而不是 authoring DSL。
3. 作者可见副作用只能通过 `Capability` 发生。
4. 运行时必须提供 deterministic transaction、stale-result 防护、owner-local publish 语义。
5. 值、资源、反应、验证、表单、表格、复杂域控件必须共享同一套 ownership 和 dependency 基线。
6. React 只是一个 host，不得成为语义来源。
7. 所有长期运行单元都必须具备可诊断性：谁依赖谁、谁写了什么、谁丢弃了什么结果、为什么没触发。
8. 大型对象编辑、对象数组编辑、editable table、designer host 必须是 first-class，而不是特殊补丁。
9. 必须内建版本协商、package 兼容、host manifest 校验、插件权限控制。
10. 必须为 SSR、worker、协作编辑、undo/redo 预留稳定边界。

---

## 4. 非目标

1. 不把 authoring model 直接带入 runtime。
2. 不把 CRDT、OT、布局算法、图编辑算法升格为 core primitive。
3. 不把 React context/store 形态当成 core architecture。
4. 不提供任意 JavaScript 执行能力。
5. 不把所有 owner family 压成一个统一 public runtime type。
6. 不把 graph/cell 内部实现细节暴露给 schema 作者。

---

## 5. 分层

新框架分成五层：

| 层 | 职责 | 输出 |
| --- | --- | --- |
| Authoring Layer | round-trip DSL、编辑器元数据、继承、组合、权限裁剪、profile 组装 | Authoring Document |
| Assembly Layer | 解析引用、静态裁剪、i18n、默认展开、host/domain manifest 装配 | Assembled Program |
| Compiler Layer | 编译 template、value、action、validation、projection、manifest | Execution Package |
| Execution Kernel | runtime session、scope、dependency、transaction、resource、reaction、capability、owner substrate | Runtime Session |
| Host / Domain Layer | React host、designer host、spreadsheet/report/word domain、bridge、session shell | Concrete App |

关键规则：

1. runtime 只接收 `Execution Package`。
2. runtime 不做 authoring inheritance expansion。
3. domain host 不进入 schema-visible scope，只有 projection 和 capability 能穿透边界。

---

## 6. Execution Package

## 6.1 为什么必须引入 Execution Package

这是整个新设计最关键的变化。

过去很多争论其实都在混淆两件事：

1. “框架怎么执行”。
2. “低代码文档怎么写、怎么继承、怎么组装”。

新框架必须强制引入一个硬边界：

**Execution Package 是唯一进入执行内核的制品。**

它不是 raw schema，也不是 authoring AST，而是已经完成结构装配、字段语义定型、value/action/validation 编译、manifest 汇总后的可执行包。

## 6.2 Execution Package 结构

```ts
interface ExecutionPackage {
  packageId: string;
  packageVersion: string;
  frameworkRange: string;
  hash: string;
  entryTemplateId: string;
  templates: Record<string, TemplateDefinition>;
  values: Record<string, ValueProgram>;
  actions: Record<string, ActionProgram>;
  validations: Record<string, ValidationModelDefinition>;
  resources: Record<string, ResourceDefinition>;
  reactions: Record<string, ReactionDefinition>;
  renderers: Record<string, RendererBinding>;
  hostContracts: Record<string, HostContractManifest>;
  capabilityContracts: Record<string, CapabilityContract>;
  diagnostics: PackageDiagnosticsBundle;
  sourceMap: ExecutionSourceMap;
  migrations?: PackageMigrationManifest;
}
```

## 6.3 包级不变量

1. package 内所有 template id、value id、action id、resource id、reaction id 全局唯一。
2. renderer binding 已解析完成，运行时不再做 type discovery。
3. validation model 已按 owner boundary 分区完成。
4. host contract 必须带版本和方向校验信息。
5. package hash 必须稳定，可用于 cache、debug、remote distribution。

## 6.4 版本协商

```ts
interface PackageMigrationManifest {
  authoredSchemaVersion: string;
  executionFormatVersion: string;
  persistedSnapshotVersion?: string;
  journalVersion?: string;
  hostContractVersions?: Record<string, string>;
  capabilityContractVersions?: Record<string, string>;
  requiredFeatures: string[];
  incompatibleFeatures?: string[];
  fallbackPolicy?: 'reject' | 'warn-and-disable';
}
```

规则：

1. compiler 负责 authoring version 到 execution format 的迁移。
2. runtime 首先校验 `executionFormatVersion`，再校验 host/capability contract version，最后校验 feature compatibility。
3. 如果 package 需要 host contract v3，而 host 只提供 v2，runtime 必须在 mount 前拒绝执行。
4. persisted snapshot 和 transaction journal 只有在对应 version 兼容时才能恢复；否则必须丢弃恢复数据并给出 diagnostics。
5. `fallbackPolicy = 'warn-and-disable'` 只允许关闭非核心扩展能力，不能降级七个语义原语的主语义。

## 6.5 Authoring DSL 到 Execution Package 的 Lowering 规则

Execution Package 不是一个“装东西的桶”，而是 authoring 语义 lowering 后的权威执行形态。

最低限度必须遵守下表：

| Authoring construct | Lowering target | 运行时责任 | 备注 |
| --- | --- | --- | --- |
| `type` / renderer node | `TemplateDefinition` / `TemplateNode` | node instantiate / render boundary | renderer binding 在编译期解析 |
| 普通值字段 | `ValueProgram` | 求值、依赖收集、identity reuse | 不产生副作用 |
| `visible` | `metaProgram` | 控制显示，不改变 owner participation | 仅 visual presence |
| `when` | `TemplateNode.scopeBoundary` 或 activation guard | 控制结构激活、owner participation、lifecycle | 影响存在性 |
| `loop` / repeated region | `TemplateNode + RegionDefinition + repeated binding plan` | repeated instantiate、instancePath、row scope | 模板只保留一份 |
| `dynamic-renderer` | admitted package fragment placeholder | lazy admission、attach/detach | 仍必须进入同一 execution contract |
| 事件字段 | `EventDefinition` + `ActionProgram` entry binding | event payload normalize + action dispatch | 不允许 renderer 私自解释 |
| `data-source` / named source | `ResourceDefinition` | lifecycle、status、publish、refresh | async producer 通过 capability refresh 闭合 |
| `reaction` | `ReactionDefinition` | watch、change detect、post-publish dispatch | 只观察，不发布 |
| validation rules | `ValidationModelDefinition` | owner-local materialization/validation | 按 owner boundary 分区 |
| slot params / render params | `RegionDefinition.params` | `$slot` frame publish | 不扁平 merge 到父 scope |
| namespaced host action | `CapabilityContract` + `HostContractManifest.commands` | command validation/dispatch | host-private bridge 不可见 |
| host projection | `HostContractManifest.projections` + `TemplateNode.hostBoundary` | readonly snapshot admit | 只读，不可写 |
| semantic owner constructs | `OwnerBoundaryDefinition` | owner create/inherit/no-owner | 编译期定型 |

规则：

1. 同一个 authoring construct 只能有一个规范 lowering 目标，不能由 runtime 再“猜一次”。
2. diagnostics、source-map、debugger 都必须基于同一 lowering 结果工作。
3. 任何 runtime admitted fragment 也必须经过同一 lowering pipeline，只是 admission 时机不同。

## 6.6 Admission Protocol

Execution Package 和 package fragment 进入 session 时必须经过统一 admission 协议。

```ts
interface PackageAdmissionRequest {
  packageOrFragment: ExecutionPackage | ExecutionPackageFragment;
  targetSessionId: string;
  mountPoint?: string;
  trustLevel: 'local' | 'signed-remote' | 'unsigned-remote';
}

interface PackageAdmissionResult {
  ok: boolean;
  admissionId: string;
  attachedTemplateIds?: string[];
  disabledFeatures?: string[];
  diagnostics: PackageDiagnosticsBundle;
}
```

admission 顺序固定为：

1. 校验 execution format version。
2. 校验 package hash / signature / trust policy。
3. 校验 host contract 和 capability permission。
4. 校验 id namespace 冲突。
5. 为 fragment 预留 template/action/resource/reaction id namespace。
6. 通过后一次性 attach；失败则整个请求回滚。

规则：

1. fragment attach 是原子操作，不允许半 attach。
2. 冲突默认 `reject`，不做 silent override。
3. detach 时必须 dispose 由该 admission 引入的 owner/resource/reaction/handles/async runs。

## 6.7 Runtime Session

```ts
interface RuntimeSession {
  sessionId: string;
  packageId: string;
  packageHash: string;
  mount(): void;
  dispose(): void;
  admit(request: PackageAdmissionRequest): PackageAdmissionResult;
  exportSnapshot(): PublishedSnapshot;
  importSnapshot(snapshot: PublishedSnapshot): void;
  subscribe(listener: (snapshot: PublishedSnapshot) => void): () => void;
}

interface PublishedSnapshot {
  sessionId: string;
  snapshotVersion: string;
  publishSeq: number;
  txId: string;
  committedAt: number;
  scopeSummaries: Record<string, ScopeSummarySnapshot>;
  ownerSummaries: Record<string, OwnerSummaryState>;
  resourceSummaries: Record<string, ResourceState>;
  surfaceSummary: SurfaceSummarySnapshot;
}
```

规则：

1. host 和 React 只能订阅 `PublishedSnapshot`，不能订阅中间 transaction state。
2. `publishSeq` 在同一 session 内单调递增。
3. snapshot import 只能在 package hash 与 snapshot schema 兼容时执行。

---

## 7. 语义原语

最终采用七个语义原语；这不是因为“7”本身神圣，而是因为在所有实验和现有架构中，这个闭包最稳定、最易解释、最不容易出错。

| Primitive | 回答的问题 | 说明 |
| --- | --- | --- |
| Template | 结构是什么 | 结构树、region、生命周期锚点、renderer 选择 |
| Scope | 这里能看到什么数据 | 词法可见性、own write、shadowing、owner-local bindings |
| Value | 这里怎么读值/派生值 | literal、expr、template、array、object、anonymous source |
| Resource | runtime 是否拥有一个值的生产和发布 | data-source、polling、cache、status、refresh、publication |
| Reaction | watched value 变化是否触发后果 | watch、when、debounce、once、effect dispatch |
| Capability | 谁能执行副作用 | built-in、namespaced、instance-targeted、host-targeted |
| Host Projection | 哪些 host-owned 只读快照可见 | domain snapshot、session summary、selection、readonly status |

两个明确判断：

1. `surface` 不是 primitive；它是 owner substrate 上的 derived system。
2. `validation` 不是 primitive；它是 compile-time model + owner runtime + async governance 组成的 derived system。

补充说明：

`Owner` 不是第八个 primitive。原因不是它不重要，而是它不是 schema 作者直接操作的跨域最小语义单元。它是 **kernel organizing substrate**：负责把已有 primitive 组织到 form、draft、surface、collection、domain-host 这些运行时边界上。

---

## 8. Template 模型

## 8.1 TemplateDefinition

```ts
interface TemplateDefinition {
  templateId: string;
  rendererType: string;
  rendererBinding: RendererBinding;
  templateNode: TemplateNode;
}

interface TemplateNode {
  id: string;
  path: string;
  rendererType: string;
  propsProgramId?: string;
  metaProgramId?: string;
  regionDefs: Record<string, RegionDefinition>;
  eventDefs: Record<string, EventDefinition>;
  lifecycle?: LifecycleActionBinding;
  scopeBoundary?: ScopeBoundaryDefinition;
  ownerBoundary?: OwnerBoundaryDefinition;
  hostBoundary?: HostBoundaryDefinition;
  validationBinding?: ValidationBindingDefinition;
}
```

## 8.2 结构规则

1. Template 只表达结构和边界，不承载 live state。
2. `loop`、`list`、`table` 这类 repeated structure 只保留一份模板，实例化由 runtime 执行。
3. `dynamic-renderer` 不是 authoring loader，而是 runtime admitted package fragment；它也必须编译成同一个 execution contract。

## 8.3 Region 规则

```ts
interface RegionDefinition {
  key: string;
  templateIds: string[];
  params?: string[];
}
```

1. 参数化 region 的 bindings 发布到 `$slot` frame。
2. region render 必须接收显式 `instancePath`。
3. repeated instance identity 永远是显式 contract，不允许隐式 index-only 心智成为唯一模型。

---

## 9. Scope 模型

## 9.1 ScopeFrame

```ts
interface ScopeFrame {
  scopeId: string;
  parentScopeId?: string;
  ownerId: string;
  rootPath: string;
  kind: 'page' | 'form' | 'draft' | 'row' | 'slot' | 'host-projection' | 'fragment';
  store: ScopeStore;
}

interface ScopeStore {
  getOwnSnapshot(): Record<string, unknown>;
  getVisibleSnapshot(): Record<string, unknown>;
  read(path: string): unknown;
  has(path: string): boolean;
  write(change: ScopeWrite): void;
  subscribe(listener: (change: ScopeChange) => void): () => void;
}
```

## 9.2 词法规则

1. Scope 是数据环境，不是行为注册表。
2. 行为查找通过 `CapabilityResolver`，实例查找通过 `HandleRegistry`，不混入 Scope。
3. child scope 默认继承 parent visible data；`isolate` 必须显式声明。
4. 不提供 `$parentScope` 这种逃逸式万能引用；需要上层值时显式投影或 bindings 传入。

## 9.3 读取语义

热路径只允许三类读取：

1. `read(path)`
2. `has(path)`
3. tracked evaluation context 中的 lexical proxy 读取

整 scope materialization 只允许在以下边界发生：

1. debugger dump
2. serialization
3. 明确声明 whole-scope formula 的冷路径

---

## 10. Value 模型

## 10.1 ValueProgram

```ts
type ValueProgram =
  | { kind: 'static'; value: unknown }
  | { kind: 'expr'; exprId: string }
  | { kind: 'template'; templateId: string }
  | { kind: 'array'; items: string[] }
  | { kind: 'object'; entries: Record<string, string> }
  | { kind: 'source-ref'; sourceDefId: string };
```

## 10.2 运行时状态

```ts
interface ValueRuntimeState {
  stateId: string;
  initialized: boolean;
  lastValue?: unknown;
  dependencies?: DependencySet;
  error?: unknown;
}
```

## 10.3 设计规则

1. 静态子树必须零开销返回原引用。
2. 动态值只要语义未变就尽量复用旧引用。
3. 值求值不允许产生副作用。
4. 匿名 `source` 属于 Value 范畴，但其执行仍受 async governance 和 capability 管控。

## 10.4 表达式语义

表达式语言必须满足：

1. 无任意 JS 执行。
2. 无 `new Function`、无 `with(scope)`。
3. 有受限函数库、过滤器库和字面模板能力。
4. 所有变量解析都通过 `EvalContext.resolve()`。
5. 运行时可插入 dependency collector。

```ts
interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  materializeVisible(): Record<string, unknown>;
  collector?: DependencyCollector;
  host?: Record<string, unknown>;
}
```

---

## 11. Dependency 模型

## 11.1 核心判断

最终采用：

**显式 roots 优先，runtime lexical-root tracking 兜底。**

这比“纯静态提取”更稳，也比“纯运行时自由追踪”更可控。

## 11.2 依赖单位

依赖模型采用分层粒度，而不是单一粒度：

| Granularity | 适用场景 |
| --- | --- |
| lexical root | 普通 `Value`、大多数 `Resource` / `Reaction` |
| exact path | validation target、structural write diagnostics、draft patch tracking |
| collection-shape | collection owner 对 row materialization / virtualization 的结构订阅 |
| wildcard | whole-scope enumeration 或显式 broad access |

普通数据流的主依赖单位不是深层 member path，而是 lexical root：

1. `user`
2. `filters`
3. `row`
4. `record`
5. `item`

深层路径不会作为普通 `Value` / `Resource` / `Reaction` 的主 invalidation 单位，但会保留给 validation、draft patch、diagnostics 和 collection structural reconciliation。

## 11.3 DependencySet

```ts
interface DependencySet {
  roots: readonly string[];
  exactPaths?: readonly string[];
  collectionShapes?: readonly string[];
  wildcard: boolean;
  broadAccess: boolean;
}
```

## 11.4 规则

1. `Resource` 和 `Reaction` 可声明 `dependsOn`；声明即权威。
2. 普通 `Value` 默认走 runtime root tracking。
3. validation 运行时对 target path 使用 exact-path closure，但不得反向扩大普通 dataflow primitive 的 invalidation 粒度。
4. collection owner 必须把 parent collection 变化翻译为 row-local root 和 collection-shape 变化，不能让所有 row consumer 都订阅整个数组根。
5. whole-scope enumeration 降级为 wildcard。
6. validation 继续维持独立 dependency substrate，但必须复用同一 owner/local change language。

---

## 12. Transaction 内核

## 12.1 为什么要把 transaction 升为内核级

很多历史问题本质都不是“表达式算错了”，而是：

1. 同一轮写入中间态被看见。
2. 老异步结果覆盖新结果。
3. 多个 owner 发布顺序不稳定。
4. reaction 在错误时机重入。
5. form submit 和 async validation、resource refresh 互相踩踏。

所以新框架必须拥有明确 transaction 内核。

## 12.2 Transaction 对象

```ts
interface RuntimeTransaction {
  txId: string;
  cause: TransactionCause;
  startedAt: number;
  writes: ScopeWrite[];
  commitDomain: 'session' | 'owner';
  ownerEffects: OwnerEffect[];
  resourcePublications: ResourcePublication[];
  reactionQueue: ReactionTrigger[];
  diagnostics: TransactionDiagnostics;
}
```

## 12.3 执行阶段

每一轮更新使用固定 phase：

1. `collect`：接收 write / capability result / async settle。
2. `apply`：应用 scope patch 和 owner-local structural change。
3. `invalidate`：按 dependency roots 标记 Value / Resource / Reaction / owner materialization cache。
4. `recompute`：重算受影响值、source status、owner summary。
5. `publish`：一次性发布稳定 snapshot。
6. `settle`：触发 reaction、继续 async queue、记录 diagnostics。

## 12.4 Commit 语义

`deterministic transaction` 的关键不是“有 phase”，而是 commit 可线性化。

规则：

1. 默认 commit domain 是 `session`，即同一 transaction 中所有 owner-local 派生状态在一次 publish 中一起可见。
2. `owner` 级 commit 只允许在 detached child runtime 或 offscreen precompute 场景使用；进入 host 可见世界前仍必须合并成 session-level publish。
3. 同一 event-loop tick 内进入 kernel 的多个 async settle 必须按 `(arrivalSeq, lanePriority, runEpoch)` 排序线性化。
4. 同一 transaction 内若多个写命中同一路径，按写入优先级和最后时序仲裁。
5. reaction enqueue 的边界是 `publish` 之后、下一个 transaction 之前，不允许在当前 transaction 的 `apply/recompute` 阶段重入。

## 12.5 写入仲裁规则

同一路径的默认优先级：

1. `submit/commit`
2. `user-input`
3. `host-command`
4. `resource publication`
5. `reaction`
6. `system`

补充规则：

1. 更高优先级写入可以覆盖同 transaction 内更低优先级写入。
2. `resource publication` 不得覆盖已经开始的 `submit/commit` authoritative snapshot。
3. remote patch 不参与这张默认优先级表；它必须先经过 collaboration policy 归类为 `host-command` 或 `system-reconcile` 后再入 transaction。

## 12.6 核心不变量

1. React 或 host 只能看到 publish 后的稳定快照。
2. 同一 tx 内多次写同一路径，最后一次有效。
3. Reaction 不得在 `apply` 中间相位直接触发。
4. 任何异步 settle 进入 runtime 时都要开启新 transaction。
5. owner summary、resource status、form validity 等派生状态必须与值写入同轮发布。
6. owner dispose 必须取消其未完成 async run、resource polling、reaction schedule、host subscription 和 component handle。
7. 同一输入、同一 arrivalSeq、同一 host snapshot 序列下，session publish 序列必须确定。

---

## 13. Async Governance

## 13.1 目标

异步不是 request runtime 的局部细节，而是全框架共享的问题。

新框架必须统一治理：

1. request
2. async validation
3. resource refresh
4. submit/confirm
5. domain command

## 13.2 AsyncRun

```ts
interface AsyncRun {
  runId: string;
  ownerId: string;
  lane: string;
  cause: string;
  epoch: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled' | 'stale-dropped';
  startedAt?: number;
  settledAt?: number;
  abortController?: AbortController;
  result?: unknown;
  error?: unknown;
}
```

## 13.3 lane 规则

每个 owner 下可以有多个 async lane，例如：

1. `resource:companyLookup`
2. `validation:user.email`
3. `submit:mainForm`
4. `domain:designer.save`

每个 lane 声明并发策略：

```ts
type ConcurrencyPolicy = 'cancel-previous' | 'ignore-new' | 'parallel' | 'queue';
```

每个 lane 还必须声明：

```ts
interface LanePolicy {
  concurrency: ConcurrencyPolicy;
  timeoutMs?: number;
  retry?: RetryPolicy;
  authoritativeScope: 'lane' | 'owner' | 'target-path';
}
```

## 13.4 publish gate

即使允许并行，publish 仍必须受 gate 控制：

1. 最新 authoritative run 才能发布 authoritative value/status。
2. 旧 run 即使晚到，也只能记为 `stale-dropped`。
3. diagnostics 必须保留这些被丢弃结果。

补充规则：

1. `submit` lane 默认等待同 owner 内必需的 validation lane，但不等待无关 resource lane。
2. owner dispose 后，该 owner 下所有 lane 必须立刻进入 `cancelled` 或 `stale-dropped`。
3. streaming 或 progress 结果只能发布到非 authoritative summary channel，不能直接覆盖最终 authoritative value。

---

## 14. Capability 模型

## 14.1 唯一效果出口

所有作者可见副作用都必须通过 `Capability` 执行。

包括：

1. scope write
2. ajax / invoke
3. navigation
4. open/close surface
5. resource refresh
6. form submit / validate
7. component target
8. domain command

## 14.2 Capability 分类

```ts
type CapabilityKind =
  | 'built-in'
  | 'namespaced'
  | 'instance-targeted'
  | 'resource-targeted'
  | 'host-targeted';

interface CapabilityRequest {
  capability: string;
  target?: CapabilityTarget;
  args?: unknown;
  control?: OperationControl;
}
```

`Capability` 是唯一效果出口的严格含义是：

1. 所有 async producer 的外部交互都必须归约到 capability request。
2. `Resource` 只能拥有 lifecycle、publish 和 status，不能另开第二套 effect protocol。
3. host command、ajax、navigation、surface、submit、component target 都是 capability family 的不同目标形式。

## 14.3 Resolver

```ts
interface CapabilityResolver {
  resolve(request: CapabilityRequest, ctx: CapabilityContext): ResolvedCapability;
}
```

解析顺序：

1. built-in platform capability
2. explicit instance target via handle registry
3. namespaced lexical provider
4. host-targeted domain command

Capability 执行前必须经过：

1. args schema 校验
2. permission manifest 校验
3. target existence / visibility 校验
4. optional result sanitization policy 绑定

## 14.4 Action Algebra 作为派生系统

Action 不是 primitive，而是 capability orchestration IR。

```ts
interface ActionProgram {
  actionId: string;
  entryStepId: string;
  steps: Record<string, ActionStep>;
}

interface ActionStep {
  stepId: string;
  when?: string;
  request?: CapabilityRequestProgram;
  then?: string[];
  onError?: string[];
  parallel?: string[];
  finally?: string[];
}
```

新框架保留嵌套 authoring DSL，但编译为 DAG-like execution plan。

---

## 15. Resource 模型

## 15.1 ResourceDefinition

```ts
interface ResourceDefinition {
  resourceId: string;
  ownerScopePath: string;
  driver: ResourceDriverDefinition;
  publish: ResourcePublishDefinition;
  dependsOn?: string[];
  control?: OperationControl;
  schedule?: ResourceSchedule;
  statusPath?: string;
}

type ResourceDriverDefinition =
  | { kind: 'sync-value'; valueProgramId: string }
  | { kind: 'refresh-capability'; requestProgramId: string };
```

## 15.2 发布规则

从零开始，resource publication 采用比当前 `name + mergeToScope` 更干净的模型：

```ts
interface ResourcePublishDefinition {
  path: string;
  mode: 'replace' | 'shallow-merge' | 'append' | 'prepend' | 'upsert';
  keyField?: string;
  mapping?: Record<string, string>;
}
```

判断：

1. `path` 是 authoritative publication target。
2. `mapping` 在 publish 前执行，用于 linked projection。
3. `shallow-merge` 是显式行为，不再用模糊的隐式 merge 语义。
4. publish 最终必须 lowering 成一组 `ScopeWrite`，由 transaction apply/publish 处理，而不是 resource 私下改 store。

## 15.3 ResourceState

```ts
interface ResourceState {
  resourceId: string;
  status: 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';
  stale: boolean;
  hasData: boolean;
  hasError: boolean;
  inFlightCount: number;
  dataUpdatedAt?: number;
  errorUpdatedAt?: number;
  failureCount: number;
  lastError?: unknown;
  currentRunId?: string;
}
```

## 15.4 规则

1. Resource 自己写自己的发布路径时不得自触发循环刷新。
2. API resource 的 dedup 走 async governance lane policy。
3. polling、manual refresh、dependency invalidation、explicit refresh 都统一收敛到同一 refresh entry。
4. formula resource 也走统一的 status / publish / diagnostics contract，只是通常同步完成。
5. async resource 的“生产”只能通过 `refresh-capability` 完成，因此不会形成 capability 之外的第二条 effect 通道。

---

## 16. Reaction 模型

## 16.1 ReactionDefinition

```ts
interface ReactionDefinition {
  reactionId: string;
  watchProgramId: string;
  whenProgramId?: string;
  dependsOn?: string[];
  actionsProgramId: string;
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
}
```

## 16.2 行为规则

1. `watch` 先求值并记录依赖。
2. 上游 dependency hit 后重新求值。
3. 只有 `watch` 的语义值变化后才继续判断 `when`。
4. effect dispatch 永远晚于当前 transaction publish。
5. `once` 只在成功触发后失活。
6. reaction loop 通过 per-cycle dedupe、bounded cascade 和 stale guard 防护。

## 16.3 为什么保留 Reaction 独立原语

因为它和 Resource 虽然都依赖同一个 dependency substrate，但语义不同：

1. Resource 生产并发布值。
2. Reaction 观察值并触发后果。

把两者合并会导致生产和值外副作用纠缠。

---

## 17. Owner Substrate

## 17.1 核心判断

Owner 是新的组织骨架，但不是新的 primitive。

Owner substrate 用来统一这些问题：

1. 谁拥有值生命周期。
2. 谁拥有 validation state。
3. 谁拥有 submit / confirm / draft / row projection / surface state。
4. 哪些子树直接继承父 owner，哪些创建新 owner boundary。

Owner 的角色是运行时组织和责任分配，不是新的 author-visible semantic category。作者感知到的仍然是 form、dialog、table、detail-view、designer-page 这些 DSL 结构，而不是一个裸 `owner` primitive。

## 17.2 OwnerRuntime

```ts
interface OwnerRuntime {
  ownerId: string;
  ownerType: 'page' | 'form' | 'draft' | 'surface' | 'collection' | 'domain-host';
  parentOwnerId?: string;
  scopeId: string;
  rootPath: string;
  lifecycleState: 'bootstrapping' | 'active' | 'refreshing' | 'disposed';
  validation?: ValidationOwnerRuntime;
  asyncLanes: AsyncLaneRegistry;
  summary: OwnerSummaryState;
}
```

## 17.4 Owner 生命周期

```ts
type OwnerLifecycleState =
  | 'bootstrapping'
  | 'active'
  | 'refreshing'
  | 'suspended'
  | 'disposed';
```

规则：

1. `bootstrapping` 期间可以收集初始值和 host snapshot，但不能向 host 发布不稳定 summary。
2. `refreshing` 允许保留上一个 publish snapshot，同时进行 model/scope/resource 更新。
3. `suspended` 表示 owner 不可见但可被保留，例如 keep-alive tab、virtualized offscreen row。
4. `disposed` 后不得再接收 validation/resource/reaction/handle 注册。

## 17.5 Participation Matrix

| 状态 | value read | value write | validation | resource | reaction | summary gate |
| --- | --- | --- | --- | --- | --- | --- |
| active | yes | yes | participate | participate | participate | yes |
| hidden | yes | policy-based | skip by default | participate if owner-local contract says so | participate if semantic owner requires | summary only |
| disabled | yes | no user write | skip submit gating by default | unchanged | unchanged | summary only |
| readonly | yes | no direct user write | may validate existing value | unchanged | unchanged | yes |
| suspended | cached read only | no direct write | no active validation run | no polling by default | no firing by default | last summary |
| disposed | no | no | disposed | disposed | disposed | no |

补充规则：

1. hidden/disabled/readonly 的默认策略可以被 owner family 明确收紧，但不能由 renderer 随意私改。
2. suspended 不是 disposed；其 async lane 是否保留必须由 owner family 明确声明。

## 17.3 Owner family

最终保留六类 owner family：

1. `page owner`
2. `form owner`
3. `draft owner`
4. `surface owner`
5. `collection owner`
6. `domain-host owner`

补充判断：

1. `object-field`、`variant-field`、`array-field` 默认不是新 owner family；它们是 owner-local value structures。
2. `table` 默认是 collection owner；editable cell 是否进入 owner-local validation 取决于模式。
3. `dialog` / `drawer` 不是值 owner，本质是 surface owner 承载 boundary；真正的 draft/submit 可能在其内部 owner。

---

## 18. Validation 体系

## 18.1 总体判断

validation 继续采用：

**compile-time model first + owner-local runtime state + async rule governance**。

这是当前 Flux 最正确的一条路线，新的 clean-slate 设计保留它，但实现上进一步收口到 owner substrate 和 transaction 内核上。

## 18.2 ValidationModelDefinition

```ts
interface ValidationModelDefinition {
  modelId: string;
  ownerType: string;
  rootPath: string;
  nodes: Record<string, ValidationNodeDefinition>;
  order: string[];
  dependents: Record<string, string[]>;
}

interface ValidationNodeDefinition {
  path: string;
  kind: 'scope-root' | 'field' | 'object' | 'array' | 'variant-root' | 'variant-branch' | 'repeated-template';
  rules: ValidationRuleTemplate[];
  ownerResolution: 'inherit-owner' | 'create-owner' | 'no-owner';
}
```

## 18.3 ValidationOwnerRuntime

```ts
interface ValidationOwnerRuntime {
  modelId: string;
  ownerId: string;
  fieldStates: Map<string, FieldValidationState>;
  overlays: Map<string, RuntimeRuleOverlay>;
  asyncRuns: Map<string, AsyncRun>;
  validateAt(path: string, reason: ValidationReason): Promise<ValidationResult>;
  validateSubtree(path: string, reason: ValidationReason): Promise<ScopeValidationResult>;
  validateAll(reason: ValidationReason): Promise<ScopeValidationResult>;
}
```

## 18.4 Child Contract

```ts
interface ChildOwnerContract {
  childOwnerId: string;
  mode: 'ignore' | 'summary-gate' | 'recurse-submit';
  active: boolean;
}
```

规则：

1. `summary-gate` 只影响 parent readiness / busy / canSubmit，不暴露 child field-level errors。
2. `recurse-submit` 只在 parent submit/commit entry 触发，不改变普通 `validateSubtree()` 的 owner-local 边界。
3. child contract snapshot 必须在 parent submit 开始时固定，避免提交中途 child owner 动态进入/退出造成歧义。

## 18.5 关键规则

1. validation owner 由最近的 validation-capable owner 决定，而不是 React mount tree。
2. compile-time graph 是主真相，runtime registration 只决定 participation 和 overlay。
3. child draft owner 的错误状态不得默认泄露到 parent field map。
4. parent 与 child 通过 summary gate 或 recurse-submit contract 协调。
5. submit/commit entry 必须高优先级 supersede 低优先级 change/blur async runs。

## 18.6 Field State 与错误契约

```ts
interface FieldValidationState {
  path: string;
  touched?: true;
  dirty?: true;
  visited?: true;
  submitted?: true;
  validating?: true;
  errors: ValidationError[];
}

interface ValidationError {
  code: string;
  path: string;
  message?: string;
  i18nKey?: string;
  severity: 'error' | 'warning';
  source: 'rule' | 'external' | 'host' | 'runtime-overlay';
}
```

规则：

1. array reorder 时 field state 迁移按 runtime identity 和结构映射规则进行，不能简单按旧 index 整包复制。
2. server/external error 必须 owner-local 注入，且遇到 owner-local write 可按 source 清理。
3. `transformIn/transformOut` 若改变验证语义，必须在 owner contract 中声明验证发生在 transform 前还是 transform 后，不能由 renderer 自定。

---

## 19. Composite Value Structures

## 19.1 统一判断

`object-field`、`variant-field`、`array-field`、`detail-view`、editable `table` 不应各做一套 runtime。

它们共享统一规则：

1. 值读取走 owner-local binding path。
2. 值写入走 structural sharing。
3. 校验归最近 validation owner。
4. staged edit 通过 draft owner 隔离。
5. repeated runtime identity 与值地址分离。

## 19.2 Object Field

规则：

1. 默认不创建独立 owner。
2. 子字段相对对象根绑定。
3. 提交由父 owner 负责。

## 19.3 Variant Field

规则：

1. 默认只挂载 active branch。
2. active branch 通过 branch state machine 管理。
3. inactive branch 的值保留策略必须显式声明：`drop`、`preserve`、`project` 三选一。

```ts
type InactiveBranchPolicy = 'drop' | 'preserve' | 'project';
```

其中 `project` 的含义固定为：

1. 当前 active branch 的公共字段投影到 canonical value shape。
2. projection 结果仍写回当前 owner 的同一 canonical path。
3. projection 后立即触发当前 owner 的 subtree revalidation。

## 19.4 Array Field

规则：

1. 值地址按 index。
2. 运行时 identity 优先按 `itemKey`。
3. reorder 不得默认 remount 全部 item subtree。

## 19.5 Detail View

规则：

1. detail-view 是 draft owner，不是普通 container。
2. open 时创建 draft scope，优先 patch overlay，不 deep clone 整对象。
3. confirm 时执行 `validate -> transformOut -> commit -> parent revalidate`。

---

## 20. Collection 和 Table

## 20.1 值地址与运行时 identity 分离

这是大规模 editable collection 最重要的规则之一。

值路径：

1. `items.0.qty`
2. `items.1.name`

运行时 identity：

1. `rowKey = order-1001`
2. `itemKey = sku-abc`

新框架必须把两者彻底分开。

## 20.2 RowEntry

```ts
interface RowEntry {
  rowKey: string;
  sourceIndex: number;
  record: Record<string, unknown>;
}
```

## 20.3 Collection owner 责任

1. 把 parent array 变化翻译为 row-local root 变化。
2. 稳定 row scope cache。
3. 管理 virtualization/windowing 时的实例保留策略。
4. 管理 selection、expanded、editing、sort、pagination 这些 row-local UI state。

## 20.4 Editable Table 模式

`table.mode`：

1. `display`
2. `interactive`
3. `editable-inline`
4. `editable-staged`

语义：

1. `display` 不参与 field validation。
2. `interactive` 有 selection/sort/pagination 但不写值。
3. `editable-inline` 直接写父 owner。
4. `editable-staged` 为行或单元格创建 draft owner。

---

## 21. 数据写入与 Structural Sharing

## 21.1 基线

任何值写入都必须使用 path-based structural sharing。

拒绝 deep clone baseline。

## 21.2 PathWrite

```ts
interface ScopeWrite {
  scopeId: string;
  path: string;
  op: 'set' | 'merge' | 'replace' | 'remove' | 'array-insert' | 'array-remove' | 'array-move';
  value?: unknown;
  meta?: ScopeWriteMeta;
}
```

## 21.3 写入规则

1. 只复制被改路径上的祖先链。
2. 数组写单元素时只复制数组外壳和目标 item 分支。
3. draft overlay 写 patch，confirm 时再 materialize。
4. write meta 必须带 provenance，用于 diagnostics、undo、self-write guard。

```ts
interface ScopeWriteMeta {
  source: 'user-input' | 'resource' | 'reaction' | 'submit' | 'host-command' | 'system';
  ownerId?: string;
  txId?: string;
  runId?: string;
}
```

---

## 22. Surface 系统

## 22.1 Surface 不是 primitive

Surface 是 derived system，但它必须有独立 substrate，不能继续被 page runtime 或 React modal component 暗中拥有。

## 22.2 SurfaceRuntime

```ts
interface SurfaceRuntime {
  open(entry: SurfaceOpenRequest): SurfaceEntry;
  close(surfaceId: string): void;
  getActive(): SurfaceEntry | undefined;
  subscribe(listener: () => void): () => void;
}

interface SurfaceEntry {
  surfaceId: string;
  kind: 'dialog' | 'drawer' | 'sheet' | 'popover';
  ownerId: string;
  scopeId: string;
  active: boolean;
  zOrder: number;
}
```

```ts
interface SurfaceSummarySnapshot {
  activeSurfaceId?: string;
  stack: Array<{ surfaceId: string; kind: string; ownerId: string; active: boolean }>;
}
```

## 22.3 规则

1. surface stack 由 root host 统一渲染。
2. 只最上层 surface 拥有 focus trap、escape、backdrop dismiss。
3. close 后恢复前一个 active surface。
4. surface summary 是 owner-local summary，不允许 React host 成为第二来源。

---

## 23. Renderer 协议

## 23.1 Host-neutral Renderer Contract

React 很重要，但 renderer contract 不应绑死在 React 上。

最终 contract 分两层：

1. host-neutral node execution contract
2. React host adapter

```ts
interface ResolvedNodeContract {
  nodeId: string;
  templateNodeId: string;
  instancePath?: InstanceFrame[];
  props: Record<string, unknown>;
  meta: ResolvedNodeMeta;
  regions: Record<string, ResolvedRegionHandle>;
  events: Record<string, ResolvedEventHandler | undefined>;
  helpers: RuntimeHelpers;
}
```

## 23.2 React host 责任

1. 把 Runtime Session 暴露给 hooks。
2. 渲染 resolved node contract。
3. 订阅 publish 后的稳定快照。
4. 管理 DOM/container/ref bridge。
5. 承载 surface host。

## 23.3 Renderer 分类

继续采用三类：

1. `instance-renderer`
2. `owner-renderer`
3. `domain-host-renderer`

### instance-renderer

无 owner boundary，无 host contract。

### owner-renderer

引入 form/draft/collection/surface 这类 Flux-native owner boundary。

### domain-host-renderer

暴露 host projection 和 namespaced capability，但不暴露私有 domain store。

---

## 24. Host Projection 与复杂域协议

## 24.1 HostContractManifest

```ts
interface HostContractManifest {
  hostType: string;
  version: string;
  projections: Record<string, ProjectionShape>;
  commands: Record<string, CommandShape>;
  summaryShape?: ProjectionShape;
  snapshotVersionField?: string;
}
```

## 24.2 DomainBridge

```ts
interface DomainBridge<TSnapshot, TCommand, TResult> {
  getSnapshot(): { version: number; data: TSnapshot };
  subscribe(listener: () => void): () => void;
  dispatch(command: TCommand): Promise<TResult>;
  dispose?(): void;
}
```

## 24.3 复杂域接入规则

1. schema 只能读 readonly projection。
2. schema 只能写 namespaced command / capability。
3. host scope 只对 host own subtree 可见，不自动提升为 page global mutable state。
4. 如果外部需要 host 状态，只能读显式 summary DTO。
5. projection DTO 必须是 immutable、structured-clone-safe、无函数引用的只读快照。
6. host `dispatch()` 的结果必须归类为 `success`、`business-error`、`infra-error`、`cancelled`、`stale` 五类之一。
7. subscribe 回调中不允许同步重入另一次 host snapshot publish；若 host 需要联动 dispatch，必须进入新的 microtask / transaction。

## 24.4 domain-host owner

designer、spreadsheet、report、word editor 均视为 `domain-host owner`。

它们内部可以使用自己的 document model、command bus、undo/redo、CRDT/OT、layout engine，但对框架核心暴露的边界只有：

1. projection
2. command capability
3. optional status summary
4. optional component handles

domain-host owner 若提供 component handle，必须额外声明：

1. handle 生命周期跟随 owner lifecycle。
2. handle 只作为 instance-targeted capability target，不得泄露底层 document/store/controller。

---

## 25. Undo / Redo 与协作编辑

这是前几轮实验里普遍缺失的部分，这次必须补齐边界。

## 25.1 核心判断

undo/redo 和 collaboration 不属于 core primitive，但必须有统一 transaction journal substrate。

## 25.2 Transaction Journal

```ts
interface TransactionJournalEntry {
  txId: string;
  ownerId: string;
  reversible: boolean;
  forward: ScopeWrite[];
  inverse?: ScopeWrite[];
  domainCommand?: unknown;
  groupId?: string;
  committedAt: number;
}
```

## 25.3 Undo / Redo 规则

1. 普通 scope write 若可逆，应生成 inverse patch。
2. domain-host owner 若支持 undo，必须通过 host manifest 声明 `undo` / `redo` command。
3. 跨 owner 事务默认拆成 owner-local journal entry，再由 orchestration 形成复合提交记录。
4. selection、surface stack、focus 恢复默认不进入业务 undo，除非 owner family 明确声明它们是语义状态。
5. 不可逆 capability 必须显式标记 `reversible = false`，并通过 checkpoint 或补偿策略处理。

## 25.4 协作编辑规则

collaboration 不进 core primitive；但 remote patch 输入必须也走 transaction pipeline，而不是直接篡改 store。

最低协议：

```ts
interface CollaborationOperation {
  opId: string;
  source: string;
  logicalClock: string;
  targetOwnerId: string;
  writes: ScopeWrite[];
}
```

规则：

1. authority model 由 host/domain 决定，但进入 kernel 前必须转换成 `CollaborationOperation`。
2. local optimistic tx 与 remote ack/reject/rebase 的 reconcile 也必须进入 transaction pipeline。
3. conflict resolution 可以由 host/domain 采用 OT、CRDT、LWW 或其他策略，但 kernel 只接受已决议的 operation。

---

## 26. SSR、Worker、分布式装配

## 26.1 SSR

SSR 只做两件事：

1. 预编译 package 的静态部分。
2. 预渲染已有稳定 resource snapshot 的首屏结构。

不做：

1. 浏览器内 owner runtime 的持久化替代。
2. 把 host domain bridge 搬到服务端伪执行。

SSR 额外规则：

1. SSR 只能执行被标记为 `server-safe` 的 capability/resource。
2. hydration 必须接收一个 `PublishedSnapshot`，客户端以该 snapshot 为第一轮基线，不允许重新猜首屏 state。
3. hydration mismatch 由 session admission diagnostics 记录，并优先以客户端 authoritative runtime 为准。

## 26.2 Worker

适合放 worker 的部分：

1. package compiler
2. 大型 validation materialization
3. expression precompile
4. schema diagnostics

不适合默认放 worker 的部分：

1. 依赖 DOM 的 renderer host
2. 需要访问浏览器宿主 API 的 capability

Worker 额外规则：

1. worker 只能运行 `kernel-core` 的无 DOM 子集。
2. main thread 与 worker 之间交换的必须是 structured-clone-safe DTO，不传函数、class instance、DOM ref。
3. worker 产出的 settle/write 仍需回到主 session transaction pipeline 线性化。

## 26.3 动态装配

remote fragment 或 lazy package 必须经历同一 admission 流程：

1. schema normalize
2. compile to package fragment
3. validate host contract
4. register template ids / action ids / manifests
5. attach to current runtime session

若任一步失败：

1. 已分配 namespace 必须回滚。
2. 已创建 owner/resource/reaction 不得残留。
3. diagnostics 必须关联到 fragment source-map。

---

## 27. 诊断与调试

## 27.1 诊断是一等能力

每个长期运行实体都必须可检查：

1. Value last dependencies
2. Resource status/run history
3. Reaction fire history
4. Scope change provenance
5. Owner summary
6. Validation active rules / errors / overlays
7. Async lane state
8. Surface stack
9. Host projection snapshots

## 27.2 DebugSnapshot

```ts
interface RuntimeDebugSnapshot {
  packageId: string;
  sessionId: string;
  scopes: ScopeDebugEntry[];
  owners: OwnerDebugEntry[];
  resources: ResourceDebugEntry[];
  reactions: ReactionDebugEntry[];
  transactions: TransactionDebugEntry[];
  asyncRuns: AsyncRunDebugEntry[];
}
```

## 27.3 必备工具视图

1. dependency inspector
2. action trace
3. resource timeline
4. validation inspector
5. surface stack viewer
6. host contract viewer
7. package/source-map viewer

---

## 28. 安全模型

## 28.1 核心规则

1. expression 是 sandboxed DSL，不是 JS。
2. capability 必须走 allowlist / manifest 校验。
3. dynamic package admission 必须校验签名或信任来源。
4. host command 不允许 schema 直接传递任意函数或 bridge object。
5. projection 是 readonly snapshot，不允许把 mutable host object 注入 scope。
6. expression、validation、resource refresh 都必须受 CPU/time budget 约束。
7. diagnostics 默认做 payload redaction，避免敏感数据直接泄露到 debugger snapshot。

## 28.2 权限模型

```ts
interface CapabilityPermissionManifest {
  allowedCapabilities: string[];
  allowedNamespaces: string[];
  deniedCapabilities?: string[];
  hostContracts?: string[];
}
```

## 28.3 插件与扩展

插件分三级：

1. compiler plugin
2. runtime capability plugin
3. host domain plugin

每一级都必须声明权限面，不允许无声明注入。

补充规则：

1. plugin API version 必须纳入 package version 协商矩阵。
2. 被撤销签名或不再信任的插件/remote package 必须拒绝 admission。

---

## 29. 性能基线

## 29.1 必须保障的性能原则

1. compile once, execute many times
2. static zero-cost fast path
3. lexical-root targeted invalidation
4. path-based structural sharing
5. row-local invalidation and row scope reuse
6. owner-local publish，不做全局大广播
7. diagnostics 不污染热路径，默认按 ring buffer / lazy snapshot 存储

## 29.2 大集合规则

1. table/list/tree/loop 必须支持 windowing。
2. row scope cache 按 `rowKey` 回收。
3. 未渲染项不得创建完整 child scope。
4. validate-all on every keystroke 不是允许的默认基线。

## 29.3 Materialization cache

必须具备以下 cache：

1. compiled expression cache
2. resolved props/meta cache
3. owner-local validation materialization cache
4. row scope cache
5. host projection memo by snapshot version

---

## 30. 包结构建议

新的框架建议从零开始按以下包拆分：

| Package | 职责 |
| --- | --- |
| `kernel-core` | primitives、transaction、dependency、async governance、scope、session |
| `kernel-compiler` | authoring assembly to execution package compiler |
| `kernel-actions` | action algebra compile/execute |
| `kernel-validation` | validation model compile/runtime |
| `kernel-owners` | form/draft/surface/collection owner substrate |
| `kernel-react` | React host adapter、hooks、surface host、renderer node executor |
| `kernel-renderers` | built-in renderer definitions |
| `kernel-host-sdk` | host projection / capability manifest / domain host SDK |
| `kernel-debugger` | runtime inspection and diagnostics UI |

明确禁止：

1. 把 compiler、runtime、React host 混在同一个 package。
2. 把 domain host 协议放进普通 renderer package。
3. 把 validation 逻辑散落在 renderer 中。

---

## 31. 参考执行流程

## 31.1 启动

```text
authoring document
  -> assemble
  -> compile
  -> execution package
  -> runtime session create
  -> root owner create
  -> initial resource bootstrap
  -> initial publish
  -> host render
```

## 31.2 用户输入

```text
input change
  -> capability(setValue)
  -> transaction.collect
  -> apply scope write
  -> invalidate affected values/resources/reactions/validation caches
  -> owner-local validateAt(change)
  -> publish stable snapshot
  -> queued reactions settle
```

## 31.3 Resource 刷新

```text
dependency hit / manual refresh / polling tick
  -> async lane schedule
  -> request starts
  -> result settles
  -> publish gate checks epoch
  -> new transaction
  -> resource publish + status update
  -> dependent values/reactions invalidate
  -> publish stable snapshot
```

## 31.4 Draft Confirm

```text
confirm
  -> child owner validateAll(commit)
  -> transformOut
  -> parent scope write
  -> child owner dispose
  -> parent impacted-path revalidate
  -> publish stable snapshot
```

---

## 32. 关键不变量

1. Execution kernel 只执行 `Execution Package`。
2. Schema 作者可见副作用只通过 `Capability`。
3. `Value`、`Resource`、`Reaction` 不得合并成一个泛 binding。
4. `Scope` 是数据环境，不是命令对象容器。
5. 所有跨异步 publish 都受 epoch / authoritative-run gate 控制。
6. Validation owner 跟随 owner graph，不跟随 React mount tree。
7. Surface、validation、action algebra、undo/redo、collaboration 都是 derived system，不是 primitive。
8. 复杂域宿主只能通过 projection + namespaced command 接入。
9. collection runtime identity 与值地址分离。
10. 任何 write 都必须进入 transaction pipeline。

---

## 33. 明确拒绝的基线

1. raw schema 直接进入 runtime。
2. 一切值和副作用统一成一个 graph cell public API。
3. `Scope` 同时承载数据、行为、controller、bridge。
4. React component local state 成为 low-code authoritative state。
5. `dialog` / `drawer` / `table` / `detail-view` 各自私有一套完全不同的值与校验规则。
6. editable collection 依赖 index 作为唯一 runtime identity。
7. validation 全靠 mounted field runtime register 临时拼装。
8. 旧 async 结果可以覆盖新状态。
9. host domain store 可以直接注入 schema scope 并任意读写。
10. 调试靠猜测，不提供 transaction/dependency/run diagnostics。

---

## 34. 与当前 Flux 的关系

这套方案不是“当前 Flux 的小修小补”，也不是“完全否定 Flux”。

它做了三个判断：

1. **Flux 在 primitive judgment、DSL continuity、host/domain boundary 上是对的。**
2. **Flux 当前实现还没有把 execution package、transaction kernel、async governance、owner substrate 彻底做成第一层公民。**
3. **新的 clean-slate 框架应当保留 Flux 最强的语义判断，但用更硬的执行边界和更干净的 runtime substrate 重落地。**

所以，这份设计既不是 v6 graph-kernel，也不是当前实现的直接重写，而是：

**以 Flux 的语义边界为上限，以 v7 的 execution-package 与 transaction 方向为收口，再补齐 owner substrate、undo/collaboration、version/security/diagnostics 的完整下一代底层框架。**

---

## 35. 最终总结

下一代低代码底层框架的最优解，不是继续堆 React runtime 细节，也不是把一切都抽象成 graph/cell，而是建立一个新的执行中心：

1. 用 `Execution Package` 关闭 authoring 与 execution 的边界。
2. 用七个稳定语义原语保持 DSL 心智和跨域一致性。
3. 用 `transaction + async governance + owner graph` 解决真正困难的运行时问题。
4. 用 `projection + capability` 把复杂域控件安全地嵌进来。
5. 用 compile-first validation、structural sharing、row identity split 和 diagnostics 让系统既能跑简单表单，也能跑复杂 designer。

这就是从零开始重新落地时，应该采用的最终版本底层框架设计。
