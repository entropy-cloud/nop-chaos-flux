# 在实验性下一代内核上实现 `variant-field`、`object-field` 与 `flow-designer`

> 本文是 `docs/experiments/next-gen-low-code-runtime-kernel-design.md` 的专题补充。
>
> 目标：说明在该实验性内核上，复杂字段 owner 与复杂宿主控件协议到底如何组织，避免把它们再次做成特例系统。

## 1. 先给结论

在实验稿的内核里：

1. `object-field` 不是一个“会渲染多个子字段的普通 renderer”，而是一个 **composite value owner**。
2. `variant-field` 不是一个“if/switch + 多个编辑器”的 UI 组件，而是一个 **shape-switching value owner**。
3. `flow-designer` 不是一个“大组件”，而是一个 **host-owned domain kernel**，通过只读快照投影和命名空间命令接入 Schema VM。

三者应该落在同一条主线里：

1. 内核只认 owner、scope、projection、capability、commit、validation。
2. 字段只是 value owner 的一种。
3. flow designer 这种复杂域控件只是 host owner 的一种。
4. 不允许再为这些能力各自发明第二套运行时。

## 1.1 统一 owner 合同

要让三者真正统一，不能只靠叙述，必须先定义一等 owner 合同。

```ts
export interface RuntimeOwner {
  id: string;
  kind: 'field-object' | 'field-variant' | 'host-domain';
  scopeId?: ScopeId;
  parentOwnerId?: string;

  mount(): void | Promise<void>;
  collectCommitIntents(input: OwnerMutationInput): Promise<CommitIntent[]>;
  inspect(): OwnerSnapshot;
  dispose(): void;
}
```

统一规则：

1. 所有 owner 都注册到 session owner graph。
2. 所有 owner 写入都只能产出 `CommitIntent`，不能绕开事务。
3. 所有 owner 都必须可 inspect、可 dispose。
4. 所有 owner 的生命周期都从属于 session。

这样 `object-field`、`variant-field`、`flow-designer` 虽然不是同一类 owner，但它们终于共享同一 owner substrate。

## 2. 总体原则

### 2.1 不把复杂字段降级成“普通 renderer + 局部 state”

传统实现里，`object-field` 和 `variant-field` 容易被做成：

1. 一个 React 组件。
2. 内部自己维护一些临时 state。
3. 在各种时机把结果回写到 form。

这在简单阶段可用，但一旦涉及：

1. draft isolation
2. 局部校验
3. 类型切换
4. 结果转换
5. dirty/touched 传播
6. 嵌套子字段生命周期

就会迅速失控。

因此实验稿里必须坚持：

**复杂字段一律建模为 value owner，而不是纯 UI 组件。**

### 2.2 不把复杂域控件塞进 schema visible scope

`flow-designer` 这类 host，内部会有：

1. 图状态机
2. selection
3. viewport
4. undo/redo
5. 节点编辑协议
6. codec
7. 可能还有协作协议

这些东西绝不能直接泄漏进 schema scope。

schema 只能看到：

1. 只读快照 projection
2. 通过命名空间暴露的显式 command

## 3. `object-field` 的正确模型

### 3.1 核心定义

`object-field` 是一个 **拥有单个逻辑值、内部有多个子编辑入口的 composite owner**。

它的逻辑值是一个 object，例如：

```ts
type Address = {
  province?: string;
  city?: string;
  zip?: string;
};
```

但它不能被简单理解为“把 `province`、`city`、`zip` 三个字段直接平铺到父表单里”。

在内核上，`object-field` 应拥有：

1. 一个 owner value path，例如 `shippingAddress`
2. 一个 object root scope
3. 一组相对 object root 的 child field bindings
4. 一个可选 draft owner
5. 一个 object-level validation boundary

### 3.2 运行时接口

```ts
export interface ObjectFieldRuntime {
  id: string;
  ownerPath: ValuePath;
  formId: string;
  objectScopeId: ScopeId;

  getObjectValue(): Record<string, unknown> | undefined;
  setObjectValue(
    value: Record<string, unknown>,
    options?: ObjectFieldWriteOptions,
  ): Promise<CommitResult>;
  setChildValue(
    relativePath: ValuePath,
    value: unknown,
    options?: ObjectFieldWriteOptions,
  ): Promise<CommitResult>;
  validate(request?: ValidationRequest): Promise<ValidationResult>;
  commitDraft?(): Promise<CommitResult>;
  discardDraft?(): Promise<void>;
  snapshot(): ObjectFieldSnapshot;
}
```

### 3.3 它如何组织 scope

推荐结构：

1. 父表单拥有正式值路径 `shippingAddress`
2. `object-field` 创建一个 `projected` 或 `draft` object root scope
3. 子字段以相对路径绑定到 object root，比如：
   - `province`
   - `city`
   - `zip`

也就是：

```text
parent form scope
  └─ shippingAddress (logical value owner path)
       └─ object-field owner
            └─ object root scope
                 ├─ province
                 ├─ city
                 └─ zip
```

### 3.4 两种模式

`object-field` 应支持两种运行模式。

#### 模式 A：直接模式

1. object root scope 仍然是 owner-managed working view，而不是对子路径的随意直通写入。
2. 子字段写入相对路径时，先落到 object owner 的 working copy。
3. object owner 在同一事务内重新组装完整对象，再产出一个针对 `shippingAddress` 的单对象 `CommitIntent`。
4. child field-level 校验可以增量执行，但 object-level transform 和 object-level validation 永远基于完整对象执行。
5. 适合普通表单编辑。

#### 模式 B：draft 模式

1. object root scope 是一个独立 draft scope。
2. 子字段所有修改先进入 draft。
3. dirty/touched/validation 先局部归属在 draft owner。
4. 只有显式 `commitDraft()` 才把整对象 merge 回父表单路径。

这正好复用实验稿里的“草稿隔离”原则。

### 3.5 子字段为什么必须相对 object root 绑定

因为 `object-field` 的真正价值不是布局，而是 **重新定义绑定根**。

子字段不应该再直接认父表单 scope，而应该认 object root scope。

这样可以得到：

1. 更稳定的局部校验边界。
2. 更简单的 child schema 复用。
3. 更明确的 object-level transform。
4. 不必到处写绝对路径。

### 3.5.1 原子提交规则

这是 `object-field` 最关键的规则：

1. 无论 direct 还是 draft，**逻辑值提交单位始终是整个 object owner value**。
2. 子字段编辑可以是增量的，但 owner 对父表单发布的永远是完整对象。
3. object-level transform、normalize、联合校验都只在完整对象上运行。
4. 因此不存在“子路径直接绕过 object owner 写入父表单”的第二条路径。

### 3.6 校验如何做

`object-field` 至少需要三层校验：

1. child field-level rules
2. object-level rules
3. optional transform/normalize stage checks

编译时应产生：

```ts
export interface CompiledObjectFieldModel {
  ownerPath: ValuePath;
  childBindings: ObjectChildBinding[];
  objectValidation: CompiledValidationRule[];
  draftMode: boolean;
  writeMode: 'owner-atomic';
}
```

对象级规则举例：

1. `province` 与 `city` 联合必填
2. `zip` 必须与 `country` 匹配
3. `startDate <= endDate`

### 3.7 transform 应放在哪里

`object-field` 往往需要：

1. UI -> logical value 的输入整形
2. logical value -> UI draft shape 的输出整形

在实验稿里，正确做法不是把 transform 写死在 React 组件里，而是把它建模成 owner 级 staged transform：

```ts
export interface ObjectFieldTransformPlan {
  loadTransform?: OwnerTransform<Record<string, unknown>>;
  commitTransform?: OwnerTransform<Record<string, unknown>>;
}
```

这里要刻意收窄，不直接复用宽泛的 `ValueProvider`。

```ts
export interface OwnerTransform<T> {
  kind: 'sync' | 'async';
  run(input: OwnerTransformInput): Promise<T> | T;
}
```

规则：

1. transform 可以异步，但必须在 owner 事务边界内执行。
2. transform 不参与普通依赖追踪，不是可持续 reactive consumer。
3. transform 失败时整个 owner commit 失败，不允许部分提交。

这会让 object-field 成为一个真正可组合的值 owner，而不是一个大号 widget。

## 4. `variant-field` 的正确模型

### 4.1 核心定义

`variant-field` 是一个 **拥有单个逻辑值、但允许该值在多个 shape 之间切换的 owner**。

典型例子：

1. `string | Expression`
2. `string | ApiSchema`
3. `number | { min: number; max: number }`
4. `ActionSchema | ActionSchema[]`

`variant-field` 的关键不是“显示哪个编辑器”，而是：

1. 当前 active variant 是什么
2. variant 间如何切换
3. 切换时旧值如何保留、转换、丢弃
4. 每个 variant 的校验边界和默认值如何工作

### 4.2 运行时接口

```ts
export interface VariantFieldRuntime {
  id: string;
  ownerPath: ValuePath;
  activeVariant: string;
  draftScopeId?: ScopeId;

  getValue(): unknown;
  setValue(value: unknown, options?: VariantFieldWriteOptions): Promise<CommitResult>;
  switchVariant(variant: string, options?: VariantSwitchOptions): Promise<CommitResult>;
  validate(request?: ValidationRequest): Promise<ValidationResult>;
  snapshot(): VariantFieldSnapshot;
}
```

`VariantFieldRuntime` 也应实现统一 `RuntimeOwner` 合同。

### 4.3 `variant-field` 拥有哪些状态

最少应有：

1. `activeVariant`
2. `logicalValue`
3. `draftByVariant?`
4. `switchPolicy`
5. `validationState`

也就是说，它不是简单的：

```text
variant = 'expr' ? render ExprEditor : render TextEditor
```

而是一个显式的 owner 状态机。

### 4.4 编译模型

```ts
export interface CompiledVariantFieldModel {
  ownerPath: ValuePath;
  discriminator?: VariantDiscriminatorPlan;
  variants: CompiledVariantBranch[];
  defaultVariant: string;
  switchPolicy: 'replace' | 'preserve-per-variant' | 'transform';
  unmatchedPolicy: 'fallback-default' | 'preserve-current' | 'error';
}

export interface CompiledVariantBranch {
  id: string;
  label?: string;
  match: VariantMatchRule;
  editorTemplateId: TemplateId;
  loadTransform?: ValueProvider<unknown>;
  commitTransform?: ValueProvider<unknown>;
  validation?: CompiledValidationRule[];
  defaultValue?: ValueProvider<unknown>;
}
```

### 4.5 切换策略

这是 `variant-field` 的核心。

#### 策略 A：`replace`

切换变体时：

1. 丢弃旧 variant draft
2. 加载新 variant default value
3. 把逻辑值替换为新 variant 的值

适合互斥且不可兼容的 shape。

#### 策略 B：`preserve-per-variant`

切换变体时：

1. 每个 variant 保留自己的 draft
2. 来回切换时恢复之前的 draft
3. 只有 active variant 会 commit 为 logical value

适合编辑器切换频繁的 authoring 场景。

#### 策略 C：`transform`

切换变体时：

1. 调用 `commitTransform/loadTransform`
2. 把旧值投影成新 variant 草稿
3. 如果 transform 失败，阻止切换或进入错误态

这才是高级 variant-field 需要的能力。

### 4.5.1 外部写回规则

`variant-field` 不能只处理“本地切换”，还必须处理外部事务对 owner path 的改写。

规则：

1. 当父表单或宿主对 `ownerPath` 产生外部 `commit()` 时，variant owner 必须重新判定 `activeVariant`。
2. 判定顺序：`discriminator` -> `match` -> `defaultVariant`。
3. 若无任何 branch 命中，则按 `unmatchedPolicy` 执行：
   - `fallback-default`: 切回默认分支并加载默认值或 transform 结果
   - `preserve-current`: 保留当前 active branch，但标记 `shapeMismatch`
   - `error`: owner 进入错误态，阻止继续提交
4. 外部写回成功后，inactive branches 不得继续保留活跃订阅。

### 4.5.2 inactive branch 生命周期

这是 variant owner 最容易失控的地方。

规则：

1. 同一时刻只有 active branch 的 draft scope 处于 mounted 状态。
2. `preserve-per-variant` 可以保留 inactive draft 数据，但 inactive branch 的 validation consumer、reaction、render subscriber 都必须暂停。
3. branch 被永久放弃时，必须释放其 scope、依赖边与缓存。
4. branch 切换本身也必须走 owner transaction，而不是 UI 本地状态切换。

### 4.6 `variant-field` 如何组织 scope

推荐做法：

1. 逻辑值始终归属在 owner path，例如 `fieldValue`
2. active variant editor 拥有一个 branch-local draft scope
3. variant 切换只是更换 active branch owner，不改变父表单的整体拓扑

```text
parent form scope
  └─ fieldValue (logical owner path)
       └─ variant-field owner
            ├─ variant state: 'literal' | 'expr' | 'api'
            └─ active branch draft scope
```

### 4.7 `variant-field` 为什么不能只是 object-field 的特例

因为 `object-field` 解决的是：

1. 一个 object 内部多个子路径如何编辑

而 `variant-field` 解决的是：

1. 同一个逻辑值在多个 shape 之间如何切换

两者都属于 composite owner，但关注点不同：

1. `object-field` 核心是 **relative binding root**。
2. `variant-field` 核心是 **active shape state machine**。

### 4.8 两者如何组合

可以组合，而且应该非常自然：

1. `variant-field` 的某个 branch 可以是 `object-field`。
2. `object-field` 的某个 child field 也可以是 `variant-field`。

因为两者本质上都是 owner，不是 ad-hoc widget。

## 5. 编译器如何支持这两类字段

### 5.1 编译器不应只产出 renderer template

实验稿里，编译器除了产出 renderer template，还应产出 field owner model。

```ts
export interface CompiledFieldOwnerRegistry {
  objectFields: Record<string, CompiledObjectFieldModel>;
  variantFields: Record<string, CompiledVariantFieldModel>;
}
```

它不能只是补充结构，必须正式进入总内核编译产物：

```ts
export interface CompiledProgram {
  fieldOwners?: CompiledFieldOwnerRegistry;
}
```

唯一消费方也必须明确：

1. `fieldOwners` 仅由 `FieldOwnerEngine` 消费。
2. `FieldOwnerEngine` 负责 owner 实例化、inspect、dispose、commit intent lowering。
3. renderer 只能拿到 owner handle，不能直接消费编译模型。

```ts
export interface FieldOwnerEngine {
  instantiateObjectField(modelId: string, ctx: FieldOwnerContext): ObjectFieldRuntime;
  instantiateVariantField(modelId: string, ctx: FieldOwnerContext): VariantFieldRuntime;
  inspect(ownerId: string): OwnerSnapshot | undefined;
  dispose(ownerId: string): void;
}
```

每个字段 owner 在编译期就确定：

1. owner path
2. child binding model
3. branch model
4. validation graph
5. transform plan
6. default value strategy

### 5.2 projection 层怎么渲染

在 projection 层里，`object-field` 和 `variant-field` 仍然会表现为 renderer 节点，但它们拿到的不是散装 props，而是 owner handle。

例如：

```ts
export interface CompositeFieldRendererProps {
  runtimeNodeId: RuntimeNodeId;
  ownerId: string;
  fieldRuntime: ObjectFieldRuntime | VariantFieldRuntime;
  regions: Record<string, RenderFragmentHandle | RenderFragmentHandle[]>;
}
```

也就是说：

1. UI renderer 负责展示和交互。
2. owner runtime 负责值语义、commit、validation、draft、switch。

## 6. `flow-designer` 的正确模型

### 6.1 核心定义

`flow-designer` 在实验稿里不是 renderer owner，也不是 form owner，而是 **host-owned domain kernel**。

它的内部状态永远是 host private：

1. graph document
2. selection
3. cursor / viewport
4. undo/redo
5. validation markers
6. collaboration
7. codec/import/export

schema 不直接读写这些内部状态。

### 6.2 schema 侧能看到什么

只能看到两类东西：

1. projection
2. commands

```ts
export interface FlowDesignerManifest extends HostCapabilityManifest {
  namespace: string;
  projections: [
    CapabilityProjectionSpec,
    CapabilityProjectionSpec,
    CapabilityProjectionSpec,
    ...CapabilityProjectionSpec[],
  ];
  commands: [CapabilityCommandSpec, CapabilityCommandSpec, ...CapabilityCommandSpec[]];
}
```

这里不能写死 `'designer'`。正确规则是：

1. manifest 对作者暴露的逻辑 namespace 可以是 `designer`。
2. session 内实际注册时必须绑定到最近 scope 的 capability registry，并携带 owner-local instance identity。
3. 因此多个 designer 可以同时存在，resolver 总是按当前 scope 解析到最近实例，而不是全局冲突。

### 6.3 projection 应该暴露什么

原则：

1. 只暴露只读快照。
2. 只暴露 schema 有必要消费的稳定摘要。
3. 不暴露内部控制器、可变对象、画布实例。

推荐 projection：

```ts
type FlowDesignerProjection = {
  documentId?: string;
  dirty: boolean;
  readonly: boolean;
  nodeCount: number;
  edgeCount: number;
  selection: {
    nodeIds: string[];
    edgeIds: string[];
  };
  viewport: {
    zoom: number;
  };
  validation: {
    errorCount: number;
    warningCount: number;
  };
  activeNode?: {
    id: string;
    type: string;
    label?: string;
  };
};
```

注意：这里的 `activeNode` 是摘要，不是整个可变节点对象。

### 6.4 command 应该暴露什么

推荐只暴露稳定语义命令，而不是内部 controller 方法。

例如：

1. `designer:load`
2. `designer:save`
3. `designer:export`
4. `designer:import`
5. `designer:selectNode`
6. `designer:focusNode`
7. `designer:addNode`
8. `designer:deleteSelection`
9. `designer:undo`
10. `designer:redo`
11. `designer:validate`

不应该直接暴露：

1. ReactFlow instance
2. graph store reference
3. mutation API object
4. collaboration session object

### 6.5 运行时接口

```ts
export interface FlowDesignerHostRuntime {
  id: string;
  manifest: FlowDesignerManifest;

  getProjection(): FlowDesignerProjection;
  subscribeProjection(listener: (snapshot: FlowDesignerProjection) => void): Unsubscribe;
  invokeCommand(method: string, args?: unknown): Promise<unknown>;
  dispose(): void;
}
```

这个 runtime 不进入 Schema VM 内核内部；它位于 Host Bridge Layer。

Schema VM 只认识：

1. 命名空间注册
2. projection scope
3. command invocation

### 6.5.1 它如何严格接入 capability 通道

`flow-designer` 绝不能长出自己的第二命令系统。

正确接线方式是：

1. host runtime 通过 manifest 注册 `namespace capability provider`。
2. schema 侧只写 `designer:export`、`designer:validate` 这类 action selector。
3. `ActionCapabilityResolver.resolveNamespace(scopeId, ns, method)` 解析到最近的 designer provider。
4. provider 内部调用 `invokeCommand(method, args)`。
5. 若命令导致 schema-visible 状态变化，provider 必须返回 `CommitIntent[]`，再统一走 `commit()`。
6. 若命令只返回只读结果，该结果进入 scope 前仍必须经过 `SchemaValueNormalizer`。

因此 `invokeCommand()` 是 host runtime 内部协议，不是给 schema 暴露的第二条直接调用面。

### 6.6 它如何进入作用域

正确做法不是把 designer state merge 到普通 page/form scope，而是：

1. host runtime 周期性或事件驱动地生成只读 projection snapshot
2. Schema VM 为该 projection 建一个 `projected scope`
3. 这个 projected scope 作为 designer subtree 的可见 host projection

```text
page scope
  └─ host projection scope ($host or $designer projection)
       └─ flow-designer renderer subtree
```

### 6.7 flow-designer renderer 本身做什么

`flow-designer` renderer 只是 projection adapter：

1. 挂载 host widget
2. 注册 manifest
3. 发布 projection snapshot
4. 维护 `RuntimeNodeId -> ComponentInstanceHandle`

它不负责把 graph 逻辑重新实现到 schema runtime 里。

### 6.7.1 projection 发布规则

为了不破坏总内核的精确失效模型，designer projection 不能每次都发布整份大文档。

规则：

1. projection 只发布稳定摘要字段。
2. 大文档正文不进入普通 projection scope，除非显式通过 command 拉取。
3. projection 发布应支持节流或摘要增量更新。
4. projection 值进入 scope 前也必须经过 `SchemaValueNormalizer`。

### 6.8 flow-designer 与 form 的关系

有两种合理模式。

#### 模式 A：外部值拥有，designer 编辑

1. designer 接收外部 document value
2. 用户在 designer 内编辑
3. save/commit 时通过 capability 返回 schema-safe document snapshot
4. 由 action -> `commit()` 写回表单路径

适合：flow document 是表单中的一个字段值。

#### 模式 B：designer 自身拥有文档，schema 只消费摘要

1. designer 内部自己拥有文档状态
2. schema 只读 projection 摘要
3. save/export 时通过 `designer:*` command 与宿主交互

适合：大型设计器工作台。

### 6.9 为什么 `flow-designer` 不能被建模成大号 `object-field`

因为它不是值编辑器那么简单。

`object-field` 的核心是：

1. 单 logical value
2. 多 child paths
3. 可局部校验

而 `flow-designer` 还要处理：

1. 复杂交互状态机
2. 画布
3. selection
4. 命令系统
5. 领域 codec
6. 可能的协作模型

所以它属于 host domain kernel，不属于普通 field owner。

## 7. 三者放在一起的统一图景

### 7.1 `object-field`

是 **composite value owner**。

### 7.2 `variant-field`

是 **shape-switching value owner**。

### 7.3 `flow-designer`

是 **host-owned domain kernel**。

### 7.4 统一边界

三者都遵守同一内核规则：

1. 读通过 scope / projection。
2. 写通过 `dispatch()` 产出 `CommitIntent`，再统一走 `commit()`。
3. 校验进入统一 validation / dependency 模型。
4. 可见副作用只通过 capability。
5. 生命周期都服从 session owner graph。

### 7.5 真正统一后的 owner 分层

```text
RuntimeOwner
  ├─ FieldOwner
  │   ├─ ObjectFieldRuntime
  │   └─ VariantFieldRuntime
  └─ HostDomainOwner
      └─ FlowDesignerHostRuntime
```

它们的差异只在 owner 语义，不在接线协议：

1. 都要注册到 owner graph。
2. 都要产出 `CommitIntent`。
3. 都要可 inspect / dispose。
4. 都要服从统一事务与生命周期规则。

## 8. 最重要的设计判断

如果只能保留三句话，我会保留这三句。

1. `object-field` 的本质不是“对象布局”，而是“对象值 owner + 相对绑定根”。
2. `variant-field` 的本质不是“切换编辑器”，而是“同一逻辑值的 shape state machine”。
3. `flow-designer` 的本质不是“超大 renderer”，而是“host domain kernel 通过 projection + command 接入 Schema VM”。

只要这三句话成立，实验稿的内核就不会被复杂字段和复杂域控件重新拖回旧式 ad-hoc runtime。
