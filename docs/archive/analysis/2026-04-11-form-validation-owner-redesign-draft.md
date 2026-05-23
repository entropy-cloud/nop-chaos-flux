# Form Validation Owner Redesign Draft

> Status: draft

> Last Reviewed: 2026-04-11

> This document is an exploratory design draft. It is not the active architecture contract. The current normative baseline remains `docs/architecture/form-validation.md`.

## Purpose

本文档记录对 Flux form validation 的下一轮重构草案。

这份草案的目标不是立刻替换现有实现，而是先回答以下问题：

- validation 应该按什么边界分层
- `table` / `object-field` / `array-field` / `detail-field` / `detail-view` / `dialog` 的嵌套验证应如何归属
- `required`、`minLength`、`pattern` 等规则参数是否应支持表达式
- 预编译模型如何和运行时局部验证协同
- draft editor 是否需要独立 owner
- 复杂控件的动态验证应该如何挂接到主模型

## Scope

本文只讨论：

- value validation model
- owner boundary
- draft validation
- partial validation
- dynamic rule extension
- error model

本文不直接定义：

- 最终代码拆分方案
- 最终 public API 名称
- renderer 级具体 UI 表现
- 最终 migration plan

## Background

当前仓库已经有一套可工作的验证系统，优势包括：

- 编译期提取 validation graph
- `validateField(path)` / `validateSubtree(path)` / `validateForm()` 三层 API
- hidden field policy
- async validation debounce + stale run suppression
- array path state remapping

但当前设计也存在明显问题：

- validation core model 和 form UX state 耦合过深
- owner boundary 还没有抽象清楚，当前实质上仍是 form-only
- dialog/detail draft editing 还没有 first-class 设计落地
- aggregate rule freshness 仍部分依赖 renderer 手工触发 subtree validation
- 规则值仍以静态字面量为主，对表达式化 low-code schema 支持不足

## Design Goals

1. 保留 Flux 的预编译优势，而不是退回 mount-driven registration 模型。
2. 保留 owner-scoped validation，不退回 pure field-scoped validation。
3. 让规则本身支持表达式化，不把 `required` 等限制成静态 boolean。
4. 让局部验证成为 owner 上的一等能力，而不是 renderer workaround。
5. 让 draft editor 成为普通 owner 变体，而不是临时补丁。
6. 让复杂控件尽量注册 dynamic rules，而不是优先注册黑盒 `validate()`。
7. 让错误模型对 aggregate/composite 场景仍有足够表达力。

## Non-Goals

1. 不把 Flux 变成 Yup 风格 fluent builder library。
2. 不把 React mount/unmount 当作字段发现主机制。
3. 不强求所有复杂控件第一版都完全静态化。
4. 不在本草案里废除现有 `FormRuntime`。
5. 第一阶段不把 arbitrary projection edit 建成 first-class validation owner。

## Core Claim

Validation 必须同时按两条轴建模：

- **value axis**：值树上的约束、路径、依赖、聚合规则
- **owner axis**：当前由谁拥有 value / errors / validating / commit boundary

只看 value axis 不够，因为 draft/detail/dialog 会引入 owner boundary。
只看 owner axis 也不够，因为 object/array/aggregate rule 本质上仍是值结构约束。

推荐结论：

- Value Validation Layer 负责“什么值合法”
- ValidationOwner 负责“当前谁拥有这组值和错误”
- FormRuntime 负责“什么时候触发、什么时候显示、什么时候提交”

## Layering

推荐把 validation 系统收敛成三层。

### 1. Value Validation Layer

只负责：

- compiled path graph
- rule templates
- dependency extraction
- effective rule materialization
- validator execution

它不负责：

- touched / dirty / visited
- showErrorOn
- blur/change/submit trigger policy
- hidden-field UI policy

### 2. ValidationOwner

只负责：

- 当前 owner 的 values root
- 当前 owner 的 error map
- compiled model 引用
- dynamic rule overlay
- `validateAt` / `validateSubtree` / `validateAll`
- owner-local error lifecycle

它不负责：

- UI 何时显示错误
- submit button lifecycle
- surface open/close state

说明：

- hidden/active participation policy 的来源仍可由 `FormRuntime` 等 UX layer 决定
- 但 phase 1 中，owner 负责执行 participation reconciliation，并承担由 `clearValueWhenHidden` 等策略引起的值侧副作用

### 3. FormRuntime UX Layer

只负责：

- `validateOn`
- `showErrorOn`
- `touched` / `dirty` / `visited`
- hidden-field participation policy
- submit gate
- `$form` status summary

## Comparison With `form-validation-expression-rules-design.md`

`docs/analysis/2026-04-11-form-validation-expression-rules-design.md` 提出了几条很有价值的修正意见，也有一些不应完全采纳的地方。

### Worth Adopting

值得吸收的点：

1. `field tree` / `field registry` / `validation state` 需要明确区分
2. 规则参数表达式化是刚需，不应继续局限在静态字面量
3. `isFieldEffectivelyRequired` 不能继续和 validator 走两套逻辑
4. 渲染控件不只是 runtime component，也应允许声明编译期 validation registration 规则

### Not Fully Adopted

不完全采纳的点：

1. 不把“当前挂载字段集合 = validation 唯一真相”作为最终模型
2. 不把 React mount/unmount 当成替代 active instance materialization 的唯一机制
3. 不把 `ValidationOwner` 方向整体否定掉

原因：

- Flux 不是只在 React mount 生命周期里运行
- 它有预编译、owner boundary、draft owner、aggregate graph 这些要求
- mount-driven registry 很适合反映“当前活跃实例”和“当前 field state”，但不应反过来成为 validation graph 的唯一来源

### Current Draft Position

当前草案吸收该文档后的结论是：

- **compiled field tree / validation graph 是主模型**
- **runtime registry 是当前活跃实例和 field state 的补充模型**
- 二者不是二选一，而是协作关系

## Field Tree Model

form 内原则上应该存在一份明确的 `field tree` 模型。

这是本草案当前确认采纳的方向。

### Why A Field Tree Must Exist

如果没有 field tree，就很难稳定表达：

- object/array/aggregate 父子关系
- subtree validation
- aggregate ancestor 传播
- variant / if / repeated template 的结构边界
- renderer-specific compile-time registration

因此 Flux 不应只维护“平面 path -> rules”映射心智。

更准确地说：

- 对外查询仍然可以是 flat absolute path
- 但编译产物内部应该有一份 field/tree/node 结构模型

### Recommended Split

推荐区分三类模型：

```ts
interface CompiledFieldTreeNode {
  path: string;
  kind: 'field' | 'object' | 'array' | 'variant-root' | 'branch' | 'form';
  children: string[];
  parent?: string;
  ruleTemplates: CompiledRuleTemplate[];
}

interface FieldRegistrationState {
  path: string;
  mounted: boolean;
  visible: boolean;
  disabled: boolean;
}

interface FieldValidationState {
  path: string;
  errors: ValidationError[];
  validating: boolean;
}
```

语义：

- `CompiledFieldTreeNode`: 编译期结构与规则定义
- `FieldRegistrationState`: 运行时当前实例/挂载/显示状态
- `FieldValidationState`: 当前验证结果状态

### Tree Versus Flat Path

这不是回到嵌套对象 runtime graph。

推荐做法仍然是：

- storage/query key 使用 flat absolute path
- tree 关系通过 `parent` / `children` 保留

也就是说：

- 内部仍可用 flat map 高效查询
- 但语义上它是一棵 field tree，而不是无结构 path 列表

## Runtime Registry Position

runtime registry 仍然需要，但它的角色应明确收窄。

推荐它只负责：

- 当前哪些 field instance 已 materialize/mount
- 当前 visible/hidden/disabled 状态
- 复杂控件运行时补充 child paths 或 dynamic rules

不建议让 registry 直接承担：

- validation graph 的主定义
- aggregate 结构来源
- 编译期 rule definition 的唯一来源

### Recommended Mental Model

不是：

- compiled graph or runtime registry

而是：

- compiled field tree defines **what may exist**
- runtime registry tells **what is currently instantiated/participating**
- validation state stores **what currently failed/is validating**

## Compiler-Integrated Registration Hooks

这也是一个很重要的点：Flux 平台是一体化设计的，renderer/component definition 不应只有 runtime component 行为，也应允许声明编译期注册规则。

这条我认为是应该明确采纳的。

### Why Compile-Time Hooks Matter

如果只有 runtime registration：

- aggregate shape 很难提前知道
- subtree validation 拓扑过于依赖 mount 时机
- field tree 只能靠 React 反推
- 表达式依赖和 child→parent 传播很难完整建立

而 Flux 已经有 compiler 和 renderer definition 体系，因此更自然的方向是：

- renderer 声明 compile-time collector hook
- compiler 在遇到某个 `type` 时调用它
- collector hook 向 field tree / validation graph 注册结构和规则

### Recommended Shape

推荐 renderer definition 增加更明确的编译期 collector 能力。

```ts
interface ValidationCompileContribution<S extends BaseSchema = BaseSchema> {
  kind: 'field' | 'object' | 'array' | 'variant-root' | 'branch' | 'none';

  collectNode?(schema: S, ctx: ValidationCompileContext<S>): CompiledFieldTreeNodeInput | undefined;
  collectChildren?(schema: S, ctx: ValidationCompileContext<S>): ValidationChildDescriptor[];
  collectRules?(schema: S, ctx: ValidationCompileContext<S>): CompiledRuleTemplate[];
  collectDependencies?(schema: S, ctx: ValidationCompileContext<S>): string[];
}
```

关键点：

- 不是只注册 leaf field path
- 还可以注册 object/array/variant-root 这类结构节点
- repeated template、branch root、aggregate ancestor 都能在编译期显式进入 field tree

### Runtime Hook Still Exists

编译期 hook 并不取代 runtime hook。

推荐分工：

- 编译期 hook：定义结构、模板规则、依赖、aggregate topology
- 运行时 hook：补充动态 child paths、visible/mounted state、dynamic overlays、escape hatch validate

这正是 Flux 相比 AMIS 更强的地方。

## Field Tree Node Shape

在确认 form 内需要 field tree 之后，下一步就是把 node shape 明确下来。

第一阶段不追求一次把所有 renderer family 都建全，但 node shape 至少要能承载：

- field/object/array/form 根
- variant root 与 branch
- subtree validation
- aggregate ancestor 查找
- repeated template registration

### Recommended Shape

```ts
type FieldTreeNodeKind =
  | 'form'
  | 'field'
  | 'object'
  | 'array'
  | 'variant-root'
  | 'variant-branch'
  | 'repeated-template';

interface CompiledFieldTreeNode {
  id: string;
  path: string;
  kind: FieldTreeNodeKind;
  parent?: string;
  children: string[];

  ownerPath: string;
  templatePath?: string;
  repeatedTemplateId?: string;

  ruleTemplates: CompiledRuleTemplate[];
  dependencyPaths: string[];
  aggregateDependencies?: string[];

  metadata?: {
    sourceType?: string;
    branchKey?: string;
    valueKind?: 'scalar' | 'object' | 'array' | 'variant';
  };
}
```

### Field Meanings

- `id`: 编译期稳定节点 id，不等同于运行时实例 path
- `path`: canonical absolute path；template node 也使用模板级 canonical path
- `kind`: 结构语义
- `parent` / `children`: field tree 拓扑
- `ownerPath`: 当前节点所属 owner 根路径
- `templatePath?`: 对 repeated/branch/template 节点保留模板级来源路径
- `repeatedTemplateId?`: repeated item 模板标识，用于 loop/array 等展开边界
- `ruleTemplates`: 本节点自有规则模板
- `dependencyPaths`: 规则表达式和显式 relational 依赖
- `aggregateDependencies?`: child -> aggregate parent 这类编译器自动关系

### Why `id` And `path` Are Both Needed

`path` 解决验证查询和状态归属。
`id` 解决模板级结构身份。

例如：

- 一个 array item template 可能最终实例化为很多 indexed path
- 这些实例共享同一个 template identity，但不共享最终 absolute path

因此编译器不能只靠 `path` 一把梭。

### Why `ownerPath` Is On Nodes

虽然当前 phase 1 只有 `form` 和 `draft` owner，但 node 上保留 `ownerPath` 仍然有价值：

- 编译器可提前标出该节点归属哪个 owner root
- nested form / draft subtree extraction 时更容易裁剪
- 未来若引入更多 owner family，不用回头整体改 node shape

## From `renderer.validation` To Compile-Time Collectors

当前已有的 `renderer.validation` 是一个正确起点，但它还偏“field participation”而不够“field tree registration”。

### Current Direction

当前 shape 大致是：

- `kind`
- `getFieldPath(...)`
- `collectRules(...)`

它已经说明了 renderer definition 可以参与 validation compile。

### Limitation Of Current Shape

当前 shape 的局限是：

- 更偏 leaf field
- 对 object/array/variant-root/repeated-template 的结构注册能力不足
- 对 child node 描述和 branch/repeated template 边界表达不足

### Recommended Evolution

推荐采用兼容式演进，而不是一次推翻：

```ts
interface ValidationCompileContribution<S extends BaseSchema = BaseSchema> {
  kind:
    | 'field'
    | 'object'
    | 'array'
    | 'variant-root'
    | 'variant-branch'
    | 'repeated-template'
    | 'none';

  getNodePath?(schema: S, ctx: ValidationCompileContext<S>): string | undefined;
  collectNode?(schema: S, ctx: ValidationCompileContext<S>): CompiledFieldTreeNodeInput | undefined;
  collectChildren?(schema: S, ctx: ValidationCompileContext<S>): ValidationChildDescriptor[];
  collectRules?(schema: S, ctx: ValidationCompileContext<S>): CompiledRuleTemplate[];
  collectDependencies?(schema: S, ctx: ValidationCompileContext<S>): string[];
}
```

### Backward-Compatible Migration

推荐迁移顺序：

1. 保留现有 `getFieldPath(...)`
2. 内部把它适配成 `getNodePath(...)`
3. 保留现有 `collectRules(...)`
4. 对 object/array/variant/loop 新增 `collectNode(...)` / `collectChildren(...)`
5. 编译器优先走新 collector；旧 shape 作为 leaf-only fallback

这样可以避免一次性改爆所有 renderer definition。

## Collector Responsibilities By Control Type

下面明确 `object-field` / `array-field` / `variant-field` / `loop` 在编译期应该注册什么。

### `object-field`

`object-field` 编译期至少应注册：

1. 一个 `object` node
2. 该 object root 自有 aggregate rules
3. body 中相对子字段的 child descriptors

推荐：

- root path 例如 `profile`
- child relative names 在 collector 中 rebased 成：
- `profile.firstName`
- `profile.lastName`

collector 语义：

- `collectNode(...)` 产出 `kind: 'object'`
- `collectChildren(...)` 指明 body 下是 object-root-relative children
- `collectRules(...)` 收集 object root rules 和 field-level rules

### `array-field`

`array-field` 编译期至少应注册：

1. 一个 `array` root node
2. 一个 `repeated-template` node 表示 item template 边界
3. array root aggregate rules
4. item subtree template child descriptors

推荐：

- array root path: `contacts`
- repeated template node path: `contacts[*]` 或内部模板表示
- item children collector 继续用相对字段，例如 `label`, `email`

关键点：

- 编译器不展开具体 index path
- 但必须保留 item template 结构，供 runtime materialization 成 `contacts.0.email` 等实例 path

### `variant-field`

`variant-field` 编译期至少应注册：

1. 一个 `variant-root` node
2. 每个 variant 一个 `variant-branch` node
3. branch 自有规则模板
4. branch body children
5. branch activation dependency

推荐：

- root path 例如 `profile.contact`
- branch path 可用编译期内部形式，例如 `profile.contact#email` / `profile.contact#webhook`
- 运行时 active instance graph 再决定哪一支 materialize 为当前参与节点

关键点：

- variant branch 是互斥结构节点，不是普通 sibling field
- submit validation 只遍历 active branch

### `loop`

`loop` 编译期不应注册普通 field node，除非它本身同时是 value-bearing editor。

对纯 structural `loop`，推荐：

1. 注册一个 `repeated-template` node
2. 声明 body child template descriptors
3. 不注册 value root rule node

如果 loop body 内有 bound field，例如 `${users}` 每项里有 `input-text name='email'`，则：

- 这些 field node 仍由其子 renderer collector 注册
- `loop` 只提供 repeated-template 边界和实例化线索

### Why `loop` And `array-field` Must Stay Separate

两者都涉及 repeated template，但语义不同：

- `loop`: 结构展开
- `array-field`: 值编辑 + array aggregate validation

因此：

- 两者可以共享 repeated-template collector substrate
- 但不能共享同一个高层 node kind 语义

## Suggested Compiler Flow

推荐编译器处理某个 schema node 时采用以下顺序：

1. 查 renderer definition
2. 如果存在 validation compile contribution：

- 调用 `collectNode(...)`
- 将 node 放入 field tree

3. 调用 `collectRules(...)`
4. 调用 `collectDependencies(...)`
5. 调用 `collectChildren(...)`
6. 对 children 递归执行同样流程
7. 编译器在回溯阶段自动补 aggregate child->parent 依赖

### Compiler-Owned Versus Renderer-Owned Work

renderer collector 负责：

- 描述这个 type 的 validation 语义
- 描述子结构边界

compiler 负责：

- 统一 path rebasing
- 统一 field tree 组装
- 统一 dependency graph 合并
- 统一 validation order 计算

这样可以避免每个 renderer 自己偷偷拼一份私有 validation graph。

## Owner Model

### ValidationOwner

推荐抽象：

```ts
interface ValidationOwner {
  readonly kind: 'form' | 'draft';
  readonly rootPath: string;
  readonly model: CompiledValidationModel;

  getRootValue(): unknown;
  getValue(path: string): unknown;

  validateAt(path: string): Promise<ValidationResult>;
  validateSubtree(path: string): Promise<FormValidationResult>;
  validateAll(): Promise<FormValidationResult>;
  applyChangesAndRevalidate(input: ApplyOwnerChangesInput): Promise<FormValidationResult>;

  getErrors(path?: string, options?: { includeSubtree?: boolean }): ValidationError[];
  setErrors(path: string, errors: ValidationError[]): void;
  clearErrors(path?: string): void;

  getDependents(path: string): string[];
  getSubtreePaths(path: string): string[];

  addDynamicRules(path: string, rules: DynamicValidationRule[]): () => void;

  materializeRules(path: string): EffectiveRuleMaterialization;
}
```

```ts
interface ApplyOwnerChangesInput {
  writes: Record<string, unknown>;
  changedPaths: string[];
  reason: 'change' | 'commit' | 'system';
}
```

关键点：

- `ValidationOwner` 是验证语义边界
- `form` owner 和 `draft` owner 共享这套接口
- surface 不是 owner；surface 只是 host/entry

### Owner API Path Semantics

第一阶段必须把 path 语义写死。

推荐规则：

- 对外 canonical path 一律使用 `absolutePath`
- subtree draft owner 可额外提供内部 local-path helper，但 public owner API 默认接收/返回 absolute path
- `ValidationError.ownerPath` 一律为 absolute path
- `ValidationError.path` 在 phase 1 也统一使用 absolute path，避免 public query 语义分裂

这意味着：

- local-path 主要是实现内部 authoring/helper 概念
- owner graph / dependents / overlays / hidden state / cache invalidation / public query 全部统一在 absolute path 空间

### Owner Kinds

第一版建议只支持两种 owner：

- `form`
- `draft`

不单独发明 `dialog-owner` / `detail-owner` / `table-owner`。

这些都是 UI/surface/container 概念，不应该直接成为 validation owner family。

## Path Spaces And Rebasing

draft owner 只有在路径空间定义清楚时才成立。

推荐同时区分两种路径：

- `absolutePath`: parent/global owner 视角下的完整路径，例如 `items.3.name`
- `localPath`: current owner root 下的相对路径，例如 `name` 或 `3.name`

### Phase 1 Constraint

第一阶段只把 **subtree-based owner** 做成 first-class validation owner。

也就是说：

- owner 必须对应一个连续 rooted subtree
- owner 的 canonical graph/address space 必须可稳定映射到 absolute path
- arbitrary projection edit 不进入 phase 1 owner model

### Owner Path Contract

```ts
interface OwnerPathMapper {
  rootAbsolutePath: string;

  toLocalPath(absolutePath: string): string;
  toAbsolutePath(localPath: string): string;

  containsAbsolutePath(absolutePath: string): boolean;
}
```

### Rules

1. parent form owner 对外主要使用 `absolutePath`
2. child draft owner 内部验证主要使用 `localPath`
3. child draft owner 输出错误时，必须同时知道本地 key 和绝对归属路径
4. dependency extraction 在编译阶段可先产出相对 owner-root 的依赖，再由 owner mapper rebasing 到当前路径空间

### Error Path Rule

推荐错误同时保留：

- `path`: 当前 owner 查询 key；phase 1 中与 absolute path 对齐
- `ownerPath`: 当前错误在 parent/global 路径空间中的稳定归属路径

这样可以兼顾：

- owner-local 查询
- parent-side aggregate/composite 错误归属
- array remove/reorder 的 indexed path remapping

Phase 1 中推荐约束：

- `path === ownerPath` for ordinary field errors
- aggregate/composite errors may use `path !== ownerPath` only when display/query semantics require it

### Examples

Parent owner:

- `rootPath = ''`
- `absolutePath('profile.firstName') = 'profile.firstName'`
- `localPath('profile.firstName') = 'profile.firstName'`

Draft owner for `profile`:

- `rootPath = 'profile'`
- local `firstName` -> absolute `profile.firstName`
- local aggregate root ``-> absolute`profile`

Draft owner for `items.3`:

- `rootPath = 'items.3'`
- local `name` -> absolute `items.3.name`
- local aggregate root ``-> absolute`items.3`

### Projection Editing Boundary

`detail-view` 的 projection / patch editing 需求是真实存在的，但第一阶段不把它建成 first-class validation owner。

第一阶段建议：

- subtree edit: 使用 subtree draft owner
- projection/patch edit: 仍作为 value-adaptation / commit wrapper 处理
- projection draft 的本地校验暂不纳入统一 owner graph 模型

后续如果要把 projection draft 纳入 owner family，需要单独设计 projection address space，而不是硬塞进 subtree owner 模型。

## Participation Rules

### Same Owner

以下场景默认属于同一个 owner：

- inline `object-field` 直接绑定父 form 值
- inline `array-field` 直接绑定父 form 值
- editable table cell 直接绑定父 form 值
- object/array subtree inline 编辑

这些场景中：

- child path 属于 parent owner graph
- 局部触发应调用 parent owner 的 `validateAt` 或 `validateSubtree`

### Child Draft Owner

以下场景推荐创建 draft owner：

- `detail-field` 打开 surface 后先编辑局部 draft，确认时才提交
- `detail-view` 打开 row/object detail editor，确认时才写回
- button 打开 dialog，dialog body 编辑临时对象，confirm 后才回写外层

这些场景中：

- draft 内的验证不应污染 parent owner 的错误状态
- draft confirm 时先 `validateAll()`
- commit 成功后 parent owner 再 revalidate 受影响 path/subtree

### Nested Form Owner

如果 dialog/body 中显式放了 `form` renderer，则它是独立 `form` owner。

这时：

- outer form 不收集 inner form 字段
- inner form submit 不依赖 outer form validation
- outer form submit 也不应被 inner form draft/field 阻塞

## Compiled Model

当前设计里 `CompiledValidationNode` 混入了较多 UI 语义。

草案建议把 value validation core model 收敛成更窄的结构。

```ts
interface CompiledValidationModel {
  rootPath: string;
  nodes: Record<string, CompiledValidationPath>;
  validationOrder: string[];
  dependents: Record<string, string[]>;
}

interface CompiledValidationPath {
  path: string;
  kind: 'field' | 'object' | 'array' | 'form';
  rules: CompiledRuleTemplate[];
  children: string[];
  parent?: string;
}
```

### Moved Out Of Core Model

以下字段不建议留在 value validation core model：

- `behavior`
- `showErrorOn`
- `controlType`
- `label`

这些属于 UI/authoring/UX 层，而不是 rule execution core。

### Kept In Core Model

以下字段仍建议保留：

- `kind`
- `children`
- `parent`
- `validationOrder`
- `dependents`

原因：

- subtree validation 需要节点拓扑
- aggregate rule freshness 需要 dependency graph
- owner graph 仍要知道 object/array root

### Relative Authoring Versus Compiled Paths

`object-field` / `array-field` 作者可继续写相对字段名，但编译产物必须落到明确的 owner path space。

推荐：

- compile step 先在 renderer-local authoring scope 下收集相对路径
- owner binding step 再把这些路径 rebase 到 absolute path 或 owner-local path

不要让 validator 在运行时猜测相对路径含义。

### Canonical Path Space

第一阶段推荐：

- compiled model nodes: canonical absolute path
- dependents: canonical absolute path
- dynamic overlay registration: canonical absolute path
- hidden-path state: canonical absolute path
- cache invalidation: canonical absolute path

subtree draft owner 内部可暴露 local path helper，但底层 canonical bookkeeping 仍统一回 absolute path。

## Template Graph Versus Active Instance Graph

`if`、`loop`、`variant-field`、`array-field` 都会带来动态性。

这不意味着 validation 无法预编译，而是意味着不能把“编译结果”误解成“最终活跃字段集合”。

推荐明确区分两层：

### 1. Compiled Validation Template Graph

编译期收集的是模板级信息：

- 哪些节点可能参与 validation
- 每个节点的 rule template
- object/array/aggregate 拓扑
- `if` / `variant` / rule-expression 的依赖
- repeated item template 的相对结构

它回答的是：

- 哪些 validation **可能存在**
- 它们的执行模板是什么

### 2. Active Validation Instance Graph

运行时 owner 基于当前值和当前 UI/owner 状态，实例化当前活跃节点：

- 当前 `if` 哪一支激活
- 当前 `variant-field` 哪个 branch 激活
- 当前 `array-field` / `loop` 有多少个 item instance
- 当前 dialog/detail draft 是否已创建 child owner

它回答的是：

- 当前时刻哪些 validation **真正参与**

### Why Flux Needs Both

Yup 更偏“值树 + validateAt(path)”思路。
AMIS 更偏“mount 了什么就注册什么”思路。

Flux 更适合：

- 编译期产出 template graph
- 运行时 materialize active instance graph
- 复杂控件再用 registration overlay 补充

这比纯动态挂载注册更适合 Flux 的预编译方向，也比纯静态 graph 更能处理 `if` / `loop` / `variant` 的动态性。

## Dynamic Participation Nodes

### `if`

`if` 的关键不是“是否能收集 rule”，而是“哪一支当前激活”。

推荐：

- 编译期收集所有 branch 的 template rules
- 记录 branch guard expression dependency
- 运行时只把当前激活 branch materialize 到 active instance graph
- 非激活 branch 不参与当前 validation

### `variant-field`

`variant-field` 的关键不是 object subtree，而是 **mutually exclusive branch activation**。

推荐：

- 编译期收集所有 variant branch 的 template rules
- 运行时根据 detect/match 只激活当前 variant branch
- 非激活 variant branch 不参与当前 validation

### `loop`

`loop` 本身是结构展开节点，不天然是 validation owner。

推荐：

- 编译期收集 repeated item template 的 validation subtree
- 运行时按当前 items 实例化成具体 active instance paths
- 验证语义来自被展开出来的 field/object/array 节点，而不是来自 `loop` 壳本身

### `array-field`

`array-field` 和普通 `loop` 不同。

它既有：

- repeated item subtree
- 又有 array-root aggregate validation 语义

因此它不能只当结构展开看待，仍然是 value validation graph 中的一等 array node。

## Rule Templates With Expressions

这是本草案最重要的新增点。

Flux 是预编译系统，因此验证规则不应局限于静态字面量。

推荐规则：

- `required` 可对应表达式
- `minLength` / `maxLength` / `minItems` / `pattern` / `message` 等都可对应表达式
- 编译阶段把表达式编译成 `CompiledRuntimeValue`
- 运行时触发验证时再 materialize 成本次执行的 effective static rule

### Recommended Shape

```ts
interface CompiledRuleTemplate {
  id: string;
  kind: ValidationRuleKind;
  when?: CompiledRuntimeValue<boolean>;
  args: Record<string, CompiledRuntimeValue<unknown> | unknown>;
  message?: CompiledRuntimeValue<string> | string;
  dependencyPaths: string[];
}
```

### Materialization Flow

```ts
interface EffectiveValidationRule {
  id: string;
  kind: ValidationRuleKind;
  args: Record<string, unknown>;
  message?: string;
}
```

```ts
interface EffectiveRuleMaterialization {
  path: string;
  rules: EffectiveValidationRule[];
  effectiveRequired: boolean;
}
```

执行流程：

1. 读取当前 owner scope/root value
2. evaluate `when`
3. 若 `when === false`，跳过该 rule
4. evaluate `args`
5. evaluate `message`
6. 生成本次 trigger 下的 `EffectiveValidationRule`
7. 交给 validator 执行

### Examples

```json
{
  "type": "input-text",
  "name": "username",
  "required": "${mode === 'create'}",
  "minLength": "${passwordPolicy.usernameMinLength}",
  "pattern": "${tenantRules.usernameRegex}",
  "validationErrors": {
    "required": "${label}不能为空",
    "minLength": "${label}长度不足"
  }
}
```

这不表示运行时去重新解析 schema，而是：

- schema compile once
- expressions compile once
- validation trigger time only evaluates compiled expressions

### Compile-Time Optimizations

如果 `CompiledRuntimeValue.kind === 'static'`，则：

- `when: false` 可直接在编译期剔除 dead rule
- `when: true` 可省去运行时分支
- static `args` 和 static `message` 可直接内联

这正是 Flux 相比 Yup builder 模型的优势之一。

## Effective Rule Materialization Service

表达式化规则不能只让 validator 看见，UI 也要能读取同一份“本次有效规则”。

推荐 owner 暴露统一 materialization service：

- validator execution 读取它
- `effectiveRequired` 读取它
- field chrome / future diagnostics 读取它

### Why This Exists

如果没有统一 materialization service，就会出现：

- validator 认为 field required
- `FieldFrame` 星号不亮
- message 是动态表达式，但 UI 和 validator 看到的不是同一个结果

### Cache Rule

推荐缓存粒度：

- owner-local
- by `path`
- invalidated by dependent path writes

### Normative Invalidation Triggers

以下事件必须使 owner-local materialization cache 失效：

- dependent value writes
- dynamic overlay add/remove/update
- array index remap / reorder / remove / insert
- owner path mapper remapping
- hidden-state changes if effective metadata depends on hidden participation policy

缓存不要求跨 owner 共享。

draft owner 与 parent owner 各自维护独立 materialization cache。

## Dependency Extraction

一旦规则参数可表达式化，dependency extraction 就不能只看显式 relational rule。

推荐规则：

- `requiredWhen` / `equalsField` 这类显式依赖仍保留
- 对 `when`、`args`、`message` 中的表达式也提取依赖路径
- aggregate node 需要显式 child-to-parent freshness 关系

依赖图应至少覆盖：

- peer field -> peer field
- child path -> aggregate parent path
- expression dependency -> owning field/aggregate node
- dynamic overlay dependency -> owning field/aggregate node

### Why This Matters

否则会出现：

- 编辑 `items.0.name` 后，`items` 的 `uniqueBy` 不自动刷新
- 编辑 `startDate` 后，`endDate` 的表达式化 `min` 约束不自动刷新
- 编辑 `role` 后，`required: '${role === "admin"}'` 的 field 不自动刷新 required 状态

## Aggregate Rules

Aggregate rule 继续是一等能力。

推荐支持：

- array root rules: `minItems`, `maxItems`, `uniqueBy`
- object root rules: `allOrNone`, `atLeastOneOf`
- row/root composite rules

不建议退回纯 leaf-field validation。

### Generic Freshness Rule

推荐在 compiled graph 中表达：

- child path change -> parent aggregate node becomes stale
- dependent aggregate node should be revalidated when trigger policy requires

这能减少 renderer 手工 `validateSubtree(path)` 的数量。

## Component-Specific Validation Execution

这一节定义 `object-field` / `array-field` / `variant-field` / `loop` 的执行语义。

### `object-field`

`object-field` 是 object subtree editor。

推荐执行模型：

- 编译期收集 object root rules，例如 `profile`
- 编译期收集 child field rules，例如 `profile.firstName`
- 局部编辑 leaf 时，owner 执行 `validateAt('profile.firstName')`
- owner 自动扩展 impacted closure，包括：
- 当前 leaf path
- 依赖该 leaf 的 peer field
- object root aggregate node `profile`

局部确认或对象级保存时：

- `validateSubtree('profile')`

整体提交时：

- `validateAll('submit')`

### `array-field`

`array-field` 是 array root + repeated item subtree 的组合。

推荐执行模型：

- array root path 例如 `contacts`
- item subtree path 例如 `contacts.0.email`
- array root aggregate 例如 `minItems`, `uniqueBy`
- item object aggregate 例如 `contacts.0` 上的 row rule

leaf edit 时：

- `validateAt('contacts.0.email')`
- owner 自动扩展 closure 到：
- leaf 自身
- row/object aggregate `contacts.0`
- array aggregate `contacts`
- expression/dynamic dependents

数组 add/remove/move/swap 时：

- 不只是写值
- 还必须 remap：
- error state
- touched/dirty/visited/validating
- dynamic overlay paths
- dependent/materialization cache key

然后再：

- `applyChangesAndRevalidate({ writes, changedPaths: ['contacts'], reason: 'system' })`

### `variant-field`

`variant-field` 不是普通 subtree，它是多分支值编辑器。

推荐执行模型：

- 编译期收集所有 variant branch template rules
- 运行时根据 active variant 只 materialize 一条 branch
- 非激活 branch 不参与 active instance graph

当前 active branch 内 leaf edit 时：

- `validateAt(activeBranchLeafPath)`
- owner 只扩展当前 active branch closure

variant switch 时，必须执行：

1. 失活旧 branch
2. 清理旧 branch 错误和 validating state
3. 按策略决定是否保留旧 branch 值
4. 激活新 branch
5. `validateSubtree(variantRoot)` 或至少验证新 branch 的 required/aggregate

推荐默认策略：

- inactive branch 默认不参与 validation
- inactive branch 默认可保留值，但不参与 submit gate
- submit 时只验证 active branch

### `loop`

`loop` 是 structural repeated renderer，不直接发明新的 value validation 语义。

推荐执行模型：

- `loop` 编译 repeated item template
- runtime 用当前 item 实例 materialize child validation paths
- `loop` 本身不自动成为 aggregate validation root
- aggregate validation 如果需要，应该由外层 value node，例如 `array-field` 或 table/form owner 来承担

这意味着：

- pure structural `loop` 主要负责实例化 active instance graph
- value-bound repeated editing 仍应落到 `array-field` 或 table row editing owner 模型

## Local Validation Trigger Rules

局部验证不能简单理解成“只验证当前 leaf”。

推荐统一规则：

- renderer 发起的是 path-local trigger
- owner 执行的是 closure-aware validation

例如：

```ts
validateAt('contacts.0.email', 'change');
```

owner 应自动扩展到：

- direct path
- aggregate ancestors
- expression dependents
- dynamic overlay dependents
- active branch / active subtree participation changes

因此 renderer 不应长期依赖手工决定“这里还要不要顺便调 `validateSubtree(...)`”。

## Submit Validation Rule

提交时的整体验证也不是“把所有编译过的节点都跑一遍”。

推荐：

- `validateAll('submit')` 遍历当前 owner 的 **active validation instance graph**
- 只包含当前激活的：
- `if` branch
- `variant` branch
- array/loop/materialized item instances
- hidden policy 允许参与的路径
- 当前 owner 拥有的 subtree
- 不包含别的 owner，例如 nested form 或 child draft owner

## Async Validation Semantics

异步验证应继续是统一 rule pipeline 的一部分，而不是额外平行体系。

推荐每个 async validation run 至少拥有：

- `path`
- `ruleId`
- `reason` (`change` / `blur` / `submit`)
- `runId`
- `abort` / cancellation handle

### General Rules

1. `change` / `blur` 可使用 debounce
2. 新 run 覆盖旧 run
3. 过期 run 结果不得写回 owner
4. `submit` 不应继续等待 change-debounce；应立即运行并等待当前活跃 async rules
5. path 失活时，对应 async run 必须失效

### Path Deactivation Cases

以下情况会使 async run 失效：

- `if` branch 失活
- `variant` branch 切换
- array row 删除
- draft owner cancel/dispose
- field path 因 owner change 不再属于当前 active instance graph

### Component Notes

`object-field`:

- child leaf async rule 按 leaf path 跑
- 对象级异步校验更适合 `validateSubtree(objectRoot)`

`array-field`:

- item leaf async rule 按实例 path 跑，例如 `contacts.2.email`
- row remove/reorder 后旧 run 必须 remap 或失效

`variant-field`:

- 只运行 active branch 的 async rule
- branch 切换时，旧 branch 全部 async run 失效

`loop`:

- 只为当前 materialized path 运行 async validation
- item instance 消失后，对应 run 失效

## ValidationOwner Execution Model

这一节把前面的设计收敛成更接近实现的执行步骤。

目标不是规定最终代码文件结构，而是明确 owner 在运行期到底按什么顺序做事。

### Core Inputs

推荐 owner 内部始终围绕以下输入工作：

```ts
type ValidationReason = 'change' | 'blur' | 'submit' | 'commit' | 'system';

interface ValidationExecutionContext {
  reason: ValidationReason;
  changedPaths: string[];
  activePaths: Set<string>;
  hiddenPaths: Set<string>;
}
```

其中：

- `changedPaths` 是本轮触发的直接输入
- `activePaths` 由 active instance graph materialization 得到
- `hiddenPaths` 由 owner/runtime 当前参与策略得到

### Step 0: Recompute Active Instance Participation

任何 validation 入口在真正执行 rule 之前，都应先确认 active instance graph 是最新的。

推荐顺序：

1. 读取当前 owner value
2. 重新判断：

- `if` branch activation
- `variant-field` active branch
- repeated item instance materialization
- draft owner subtree existence

3. 得到新的 `activePaths`
4. 清理已失活 path 的：

- error state
- validating state
- async runs
- cached effective rule materialization

### Step 1: Compute Impacted Closure

owner 不能只验证 direct path。

推荐统一 closure 计算：

```ts
function computeImpactedClosure(input: {
  changedPaths: string[];
  activePaths: Set<string>;
  dependents: Record<string, string[]>;
  aggregateAncestors: (path: string) => string[];
  overlayDependents: (path: string) => string[];
}): Set<string>;
```

closure 至少包含：

- direct changed paths
- aggregate ancestors
- expression dependents
- dynamic overlay dependents
- active-branch-switch 影响到的新旧 branch root

### Step 2: Reconcile Hidden Participation

hidden/path participation 不能在 rule 执行后再补。

推荐顺序：

1. 基于最新 values 重新判断隐藏状态
2. 对 newly hidden path：

- 如 policy 要求，立即 clear value
- clear stale errors
- cancel async runs

3. 将 hidden transition 产生的 path 追加进 `changedPaths`
4. 重新计算 impacted closure

这样 `clearValueWhenHidden` 才能影响后续 rule materialization 和 dependent validation。

### Step 3: Materialize Effective Rules

对 impacted closure 中的每个 active path：

1. 读取 compiled rule templates
2. 合并 dynamic overlays
3. evaluate `when`
4. evaluate rule args/message
5. 产出本轮 effective rules
6. 更新 owner-local materialization cache

推荐伪代码：

```ts
function materializeRulesForPath(
  path: string,
  ctx: ValidationExecutionContext,
): EffectiveValidationRule[] {
  const templates = getCompiledTemplates(path);
  const overlays = getDynamicOverlays(path);
  const combined = mergeTemplatesAndOverlays(templates, overlays);

  return combined.flatMap((template) => {
    if (!evaluateWhen(template.when, ctx)) {
      return [];
    }

    return [
      {
        id: template.id,
        kind: template.kind,
        args: evaluateArgs(template.args, ctx),
        message: evaluateMessage(template.message, ctx),
      } satisfies EffectiveValidationRule,
    ];
  });
}
```

### Step 4: Execute Sync Rules First

同步 rule 应先运行并立即得到稳定错误结果。

推荐：

- sync rule 直接产出 `ValidationError[]`
- path-level error bucket 先更新为 sync 结果
- async rule 再作为后续阶段叠加

这样 UI 不需要等 async 才看到明显同步错误。

### Step 5: Execute Async Rules With Run Ownership

异步 rule 必须显式绑定运行所有权。

推荐内部记录：

```ts
interface AsyncValidationRun {
  path: string;
  ruleId: string;
  reason: ValidationReason;
  runId: string;
  ownerEpoch: string;
  abort(): void;
}
```

启动 async rule 时：

1. 生成新的 `runId`
2. 取消同 `path + ruleId` 的旧 run
3. 注册 validating state
4. 等待结果
5. 返回时检查：

- run 是否仍是 latest
- path 是否仍 active
- owner epoch 是否仍有效

6. 只有满足条件才写回错误和 validating=false

### Phase 1 Structural Edit Rule

第一阶段不尝试把 in-flight async run 跨结构变化做 remap。

推荐硬规则：

- array remove/reorder
- variant switch
- path subtree deactivation
- owner dispose

以上情况一律 **invalidate affected subtree async runs**。

也就是说：

- phase 1 对 async run 采用 subtree invalidate，不做 remap
- remap 只用于静态状态映射，例如错误/touched/dirty 等 index-addressed state

### Step 6: Publish Result

推荐 owner 将本轮结果分开发布：

- sync errors immediately
- async pending state immediately
- async final errors when run settles

最终返回结果时：

- `validateAt` 返回当前已知结果，若有 async pending，则同时标注 validating
- `validateAll('submit')` 必须等待 submit-required async rules settle

## Owner API Algorithms

### Step 0: Fixed-Point Preflight

`activePaths` 与 hidden participation 不能只各算一次。

`clearValueWhenHidden`、variant switch、`if` guard 变化都可能让 participation 在一次运行中再次变化。

因此推荐先做 fixed-point preflight，再进入真正的 rule execution。

推荐伪代码：

```ts
function prepareExecution(seedChangedPaths: string[], reason: ValidationReason): PreparedExecution {
  const changed = new Set(seedChangedPaths);

  while (true) {
    const active = materializeActiveInstanceGraph();
    const participation = reconcileParticipation({
      activePaths: active,
      changedPaths: [...changed],
      reason,
    });

    const extraChanged = participation.extraChangedPaths.filter((path) => !changed.has(path));

    cleanupDeactivatedPaths(participation.deactivatedPaths);

    if (extraChanged.length === 0 && participation.stable) {
      return {
        changedPaths: [...changed],
        activePaths: participation.activePaths,
        hiddenPaths: participation.hiddenPaths,
      };
    }

    for (const path of extraChanged) {
      changed.add(path);
    }
  }
}
```

注意：

- parent owner 的 active graph 只包含 parent owner 自己的 paths
- child draft owner 的内部 paths 不会进入 parent owner active path set
- draft existence 只可能影响 parent owner 的 summary/root contract path，而不是 child owner internals

### Step 1: Compute Impacted Closure

owner 不能只验证 direct path。

推荐统一 closure 计算：

```ts
function computeImpactedClosure(input: {
  changedPaths: string[];
  activePaths: Set<string>;
  dependents: Record<string, string[]>;
  aggregateAncestors: (path: string) => string[];
  overlayDependents: (path: string) => string[];
}): Set<string>;
```

closure 至少包含：

- direct changed paths
- aggregate ancestors
- expression dependents
- dynamic overlay dependents
- active-branch-switch 影响到的新旧 branch root

### Step 1b: Expand Validation Targets

closure roots 不等于最终 validation target set。

推荐再加一层 target expansion：

```ts
function expandValidationTargets(input: {
  closureRoots: Set<string>;
  reason: ValidationReason;
  activePaths: Set<string>;
}): Set<string>;
```

规则：

- `submit` / `commit`: newly activated root 需要下钻到所有 active descendants
- `change` / `blur`: 可只验证 root 和必要 descendants，除非 trigger policy 要求 eager descendant validation
- variant/if activation 必须至少定义 activated root 的 descendant expansion policy

### Step 2: Hidden Participation Is Part Of Preflight

hidden/path participation 不再作为独立后置步骤出现。

phase 1 中它属于 `prepareExecution(...)` 的一部分，由 participation reconciliation 统一处理。

规则：

- newly hidden root must clear the full active descendant set under that root
- cleared state includes errors, validating state, async runs, and materialization cache
- if hide policy clears values, those value writes produce extra changed paths and trigger another preflight turn

### `validateAt(path, reason)`

推荐伪代码：

```ts
async function validateAt(path: string, reason: ValidationReason): Promise<ValidationResult> {
  const prepared = prepareExecution([path], reason);
  const closure = computeImpactedClosure({ changedPaths: prepared.changedPaths, ...runtimeState });
  const targetPaths = expandValidationTargets({
    closureRoots: closure,
    reason,
    activePaths: prepared.activePaths,
  });

  for (const targetPath of targetPaths) {
    const effectiveRules = materializeRulesForPath(
      targetPath,
      buildExecutionContext(reason, prepared.changedPaths),
    );
    const syncErrors = runSyncRules(targetPath, effectiveRules);
    publishSyncErrors(targetPath, syncErrors);
    startAsyncRules(targetPath, effectiveRules, reason);
  }

  return summarizeValidationResult(path, targetPaths);
}
```

语义：

- renderer 触发的是一个 leaf/root path
- owner 实际验证的是 impacted closure
- `validateAt` 返回时允许 async 仍在 pending

### `validateSubtree(path, reason)`

推荐伪代码：

```ts
async function validateSubtree(
  path: string,
  reason: ValidationReason,
): Promise<FormValidationResult> {
  const prepared = prepareExecution([path], reason);
  const subtreePaths = getActiveSubtreePaths(path, prepared.activePaths);
  const impacted = expandSubtreeWithDependents(subtreePaths);
  const ordered = orderForValidation(impacted);

  for (const targetPath of ordered) {
    launchConcretePathValidation(targetPath, reason);
  }

  if (reason === 'commit' || reason === 'submit') {
    await awaitRequiredAsyncRuns(ordered, reason);
  }

  return summarizeFormValidationResult(ordered);
}
```

适合：

- object-field section save
- array row save
- variant branch activation validation
- draft subtree confirm before commit

### `validateAll('submit')`

推荐伪代码：

```ts
async function validateAll(reason: 'submit'): Promise<FormValidationResult> {
  supersedePendingDebouncedRuns('submit');

  const prepared = prepareExecution(getRootSeedPaths(), reason);
  const allPaths = getAllActiveParticipatingPaths(prepared.activePaths);
  const ordered = orderForValidation(allPaths);

  for (const path of ordered) {
    launchConcretePathValidation(path, reason);
  }

  await awaitSubmitRequiredAsyncRuns();

  return summarizeFormValidationResult(ordered);
}
```

关键点：

- 只遍历 active instance graph
- 必须等待 submit-required async rules
- 不应验证 inactive branch / disposed draft owner / foreign owner path

### `applyChangesAndRevalidate({ writes, changedPaths })`

推荐伪代码：

```ts
async function applyChangesAndRevalidate(
  input: ApplyOwnerChangesInput,
): Promise<FormValidationResult> {
  applyWritesAtomically(input.writes);

  const prepared = prepareExecution(input.changedPaths, input.reason);
  const closure = computeImpactedClosure({ changedPaths: prepared.changedPaths, ...runtimeState });
  const targets = expandValidationTargets({
    closureRoots: closure,
    reason: input.reason,
    activePaths: prepared.activePaths,
  });
  const ordered = orderForValidation(targets);

  for (const path of ordered) {
    launchConcretePathValidation(path, input.reason);
  }

  if (input.reason === 'commit') {
    await awaitRequiredAsyncRuns(ordered, 'commit');
  }

  return summarizeFormValidationResult(ordered);
}
```

适合：

- draft confirm writeback 后 parent owner 重验
- array mutation 后 owner closure 重验
- variant switch 后 owner closure 重验

这里的关键不是 helper 名称，而是：

- write + preflight + closure + validation 必须由 owner 一次性完成

## Validation Ordering Notes

推荐排序规则：

1. leaf paths before aggregate ancestors when aggregate depends on finalized child values
2. 或者先 leaf sync，再 aggregate，再 leaf async settle
3. submit 时使用稳定 deterministic order

第一阶段最重要的不是追求最优 order，而是：

- 同一 owner 内 deterministic
- aggregate rule 不读到过期 child state
- async run ownership 不错乱

## Phase 1 Explicit Limits

为保证第一阶段可实现，草案明确采用以下保守规则：

1. active/hidden participation 通过 fixed-point preflight 达到稳定后才开始 validation
2. owner API 允许因 hidden policy 触发 value-side effects
3. post-write correctness 通过 `applyChangesAndRevalidate(...)` 提供，而不是靠外部手工拼装
4. in-flight async run 在结构变化下采取 subtree invalidate，不做 remap
5. child draft owner 内部 path 永不进入 parent owner active path set
6. submit 会 supersede pending debounced change/blur runs，并启动 submit-owned fresh runs

## Implementation Guidance

实现时不建议让每个 renderer 自己拼这些步骤。

推荐：

- renderer 只发出 owner API 调用
- owner 集中负责：
- active instance refresh
- hidden reconciliation
- impacted closure
- rule materialization
- sync/async execution
- error publication

这样 `object-field` / `array-field` / `variant-field` / `detail-field` / `loop` 只是在参与集和 root 选择上不同，不会裂解成五套独立 validation runtime。

## Dynamic Rules And Runtime Registration

当前实现里 runtime registration 提供黑盒 `validate()`。

草案建议：优先注册 dynamic rules，而不是优先注册黑盒 validator。

### Recommended Shape

```ts
interface DynamicValidationRule {
  id: string;
  kind: ValidationRuleKind | 'custom';
  when?: CompiledRuntimeValue<boolean>;
  args?: Record<string, unknown>;
  message?: string | CompiledRuntimeValue<string>;
  dependencyPaths?: string[];
  ownedChildPaths?: string[];
  validate?: (
    input: ValidationExecutionInput,
  ) =>
    | Promise<ValidationError | ValidationError[] | undefined>
    | ValidationError
    | ValidationError[]
    | undefined;
}
```

第一阶段中，所有 overlay path 和 `dependencyPaths` 都必须使用 **canonical absolute path** 声明。

```ts
interface RuntimeFieldRegistration {
  path: string;
  childPaths?: string[];
  syncValue?(): unknown;
  addRules?(owner: ValidationOwner): () => void;
  validateChild?(path: string): Promise<ValidationError[]> | ValidationError[];
  validate?(): Promise<ValidationError[]> | ValidationError[];
  onRemove?(): void;
}
```

### Policy

优先级建议：

1. compiled static/dynamic rule templates
2. runtime-added dynamic rules
3. 最后才是极少量 escape hatch `validate(...)`

也就是说：

- 不立刻强删黑盒校验能力
- 但设计重心应该从“注册 validate 回调”切向“注册 rule overlay”

### Why Child Paths Still Matter

`array-editor` / `key-value` 这类控件不仅有 owner root path，还会暴露具体 child paths。

因此 dynamic overlay 需要同时表达：

- 规则依赖哪些路径
- 自己拥有/生成哪些 child paths
- subtree validation 时应该把哪些 child paths 纳入 traversal

这也是为什么第一版不应过早删除 `childPaths` / `validateChild(...)`。

### Array Remap Rule

如果 dynamic overlay 绑定到了 indexed absolute path，例如 `items.3.name`，则数组 insert/remove/reorder 后必须按与错误状态相同的 remap 规则同步更新：

- overlay registration path
- overlay dependency paths
- overlay owned child paths

## Error Model

不建议把错误直接缩减成只有 `{ path, message, rule }`。

那会削弱 aggregate/composite 场景的表达力。

但也不建议继续让 `ownerPath` / `sourceKind` 语义过于隐晦。

### Draft Proposal

```ts
interface ValidationError {
  path: string;
  ownerPath: string;
  message: string;
  rule: ValidationRuleKind | 'custom';
  displayPath?: string;
  source: 'field' | 'object' | 'array' | 'form' | 'custom';
  relatedPaths?: string[];
}
```

建议解释：

- `path`: 当前 owner 下的查询 key
- `ownerPath`: 稳定归属路径，用于 aggregate/composite 查询与 remapping
- `displayPath?`: 当 composite/aggregate 想在别处展示时的可选投影路径
- `source`: 错误来源类型，替代更含糊的 `sourceKind`
- `relatedPaths?`: 用于 cross-field / aggregate diagnostics

### Compatibility Note

当前实现已有 `ownerPath` 和 `sourceKind` 使用面。

因此草案结论改为：

- 保留 `ownerPath`
- `sourceKind` 可视情况重命名为 `source`
- `displayPath` 只是补充，不是替代 `ownerPath`

### Query Rule

UI 查询面应尽量收敛，而不是散成过多 hook。

推荐最终目标：

```ts
useFormErrors(path?: string, options?: { includeSubtree?: boolean }): ValidationError[]
```

以及更薄的状态 hook。

## Hidden And Inactive Policy

hidden/inactive 仍属于 UX Layer，不属于 pure value validation core。

推荐边界：

- rule execution engine 不知道 hidden
- ValidationOwner 需要持有 hidden-path participation state 的查询能力
- `FormRuntime` 负责 hidden policy 和 trigger policy 的 UX 入口

### Important Distinction

- hidden field in current owner: 同 owner，是否参与由 policy 决定
- uncommitted draft field in child draft owner: 不是 parent owner 的 path，不参与 parent validation

### Recommended Split

- rule execution engine: unaware of hidden
- ValidationOwner: stores hidden-path state and provides `isPathHidden(path)`-style query
- FormRuntime: decides when to mark paths hidden/visible and whether hide should clear value

这样可以保留：

- owner-side correctness
- immediate clear-on-hide side effects
- trigger-layer UX policy separation

## Draft Owner

推荐把 draft owner 视为普通 `ValidationOwner` 的一种实例，而不是发明新的神秘 runtime family。

### Phase 1 Draft Owner Scope

第一阶段只定义：

- `Subtree Draft Owner`

不定义：

- `Projection Draft Owner`

projection edit 继续通过 value-adaptation owner + commit result 工作，但不加入 phase 1 validation owner 统一模型。

### Recommended Creation Rule

```ts
interface DraftOwnerOptions {
  parentOwner: ValidationOwner;
  rootPath: string;
  mode: 'subtree';
  draftValue: unknown;
}
```

创建 draft owner 时：

1. 从 parent owner 中提取 `rootPath` 子图并建立 path rebasing
2. 建立独立 error map
3. 以 draft value 作为 root value
4. 使用同一套 rule template materialization/execution 引擎

### Commit Rule

1. `draftOwner.validateAll()`
2. 若 invalid，停止提交
3. 运行 `transformOutAction` 或 owner-specific commit
4. 生成 `affectedPaths` 或 `affectedRoots`
5. 写回 parent owner
6. `parentOwner.revalidateAffected(...)`

### Owner-Computed Closure

post-write revalidation 不应要求 caller 自己算全量重验集合。

推荐 owner 内部自动扩展为：

- changed direct paths
- aggregate ancestors
- expression dependents
- dynamic overlay dependents
- hidden-path transitions
- clear-on-hide side effects resulting from changed values

推荐顺序：

1. apply committed value writes
2. reconcile hidden transitions / clear-on-hide
3. compute impacted closure
4. run validation on impacted set

### Atomicity Requirement

对于 change/commit 后重验，推荐由 owner 提供原子语义：

- 不要求 caller 手工拆成 “写值 -> 自己清 hidden -> 自己算 dependents -> 自己重验”
- caller 提供 `writes + changedPaths + reason`
- owner 负责完成写值、hidden reconciliation、closure expansion、async invalidation、revalidation 的完整顺序

### Why Draft Owner Exists

它解决的核心问题是：

- dialog/detail 内部未确认编辑，不应污染 parent form error state
- draft cancel 应丢弃局部错误和 validating 状态
- draft confirm 后才让 parent owner 接手最终值的合法性

## FormRuntime UX Layer

`FormRuntime` 继续存在，但职责收敛为 UX orchestration。

推荐：

```ts
interface FormRuntime {
  owner: ValidationOwner;

  validateField(path: string): Promise<ValidationResult>;
  validateSubtree(path: string): Promise<FormValidationResult>;
  validateForm(): Promise<FormValidationResult>;

  isTouched(path: string): boolean;
  isDirty(path: string): boolean;
  isVisited(path: string): boolean;
  isValidating(path: string): boolean;

  touchField(path: string): void;
  visitField(path: string): void;
  clearErrors(path?: string): void;
}
```

这里 `validateField/subtree/form` 仍保留，但底层只是 delegate 到 owner，同时叠加 UX policy：

- hidden policy
- touch/visit update
- showErrorOn
- submit gate

## Surface Ownership Matrix

surface 不是 validation owner，但 surface content 需要声明 owner mode。

推荐矩阵：

| Surface content mode   | Validation owner     | Notes                                          |
| ---------------------- | -------------------- | ---------------------------------------------- |
| direct-binding content | inherit parent owner | requires parent owner context propagation      |
| draft editor content   | child draft owner    | local errors/validating isolated until confirm |
| nested `form` content  | inner form owner     | fully independent owner                        |
| read-only content      | none                 | no validation owner needed                     |

### Provider Requirement

如果 surface 选择 `inherit parent owner`，则 runtime/provider 必须显式传播当前 owner context。

当前代码只传播了：

- scope
- action scope
- component registry

未来若支持 direct-binding dialog inherit mode，还必须传播：

- current form/owner context

否则“dialog 继承 parent owner”只是文档声明，不能真正成立。

### Capture Rule

surface 在 `inherit parent owner` 模式下，不应在 root host 重新“就地寻找” ambient owner。

推荐规则：

1. open surface 时捕获 `ValidationOwner` handle
2. 同时捕获当前 scope handle 与 path mapper 绑定
3. surface body 在整个 open lifecycle 中都使用该 captured handle
4. 若 surface body 内再创建 nested form/draft owner，则 nested owner 在其 subtree 内遮蔽 captured owner

这能避免 table row reorder / scope reconciliation 后 inherited surface 漂移到错误 owner。

### Phase 1 Limitation: Indexed Row Reorder During Open Surface

如果 inherited surface 绑定的是 index-addressed path，例如 `items.3.*`，而 surface 打开期间数组发生 reorder/remove，则是否持续绑定到“同一逻辑行”需要 stable row identity 设计支持。

本草案第一阶段暂不解决这个问题。

Phase 1 推荐约束：

- inherited surface direct-binding 模式优先用于非-reorder 场景
- 对数组行 detail editor，更推荐 draft mode
- 若未来要支持 open surface across row reorder，需要和 `table-row-identity-and-scope-performance.md` 协同设计稳定行身份锚点

## Scenarios

### Scenario 1: Inline Object Field In Parent Form

Schema:

- `profile.firstName`
- `profile.lastName`

Expected behavior:

- parent form owner 持有 `profile` subtree graph
- blur `profile.firstName` -> `validateAt('profile.firstName')`
- save section -> `validateSubtree('profile')`
- parent submit -> `validateAll()`

### Scenario 2: Inline Array Field With Aggregate Rule

Schema:

- `items[*].name`
- array root `items` has `uniqueBy('name')`

Expected behavior:

- edit `items.0.name`
- owner graph marks `items` aggregate dependent stale
- trigger policy requires时 revalidate `items`
- array root error stays on `items`

### Scenario 3: Button Opens Dialog Editing Parent-Bound Value Directly

Expected behavior:

- dialog surface itself is not owner
- if schema explicitly says direct-binding mode, dialog body inherits parent owner
- form context must stay available to dialog content
- edits still update parent owner state and validation

This is an important regression guard because current code is weak here.

### Scenario 4: Detail Field Edits Draft Then Confirm

Expected behavior:

- open -> create child draft owner
- all local validation stays in draft owner
- cancel -> discard draft owner state
- confirm -> `draftOwner.validateAll()`
- commit -> write back to parent owner
- parent owner revalidates affected paths/roots

### Scenario 5: Dialog Contains Inner Form

Expected behavior:

- inner `form` creates independent form owner
- outer form does not collect inner fields
- inner submit only validates inner owner

### Scenario 5b: Projection Detail View

Phase 1 recommendation:

- projection detail view 不作为 first-class validation owner
- 它继续通过 `transformInAction` / `validateValueAction` / `transformOutAction` 工作
- 若未来要纳入统一 owner 模型，需要单独设计 projection address space

### Scenario 6: Expression-Driven Required

Rule:

```json
{ "required": "${role === 'admin'}" }
```

Expected behavior:

- compile once to `CompiledRuntimeValue<boolean>`
- role change updates dependent graph freshness
- validation materializes effective required rule at trigger time
- required indicator UI can read the same effective rule result without duplicating schema logic

### Scenario 7: Tenant Policy Driven Pattern

Rule:

```json
{ "pattern": "${tenantPolicies.userNameRegex}" }
```

Expected behavior:

- owner validation materializes pattern from current scope
- dependency graph includes `tenantPolicies.userNameRegex`
- tenant policy change can revalidate affected fields

### Scenario 8: Dynamic Composite Control

Expected behavior:

- complex renderer registers dynamic rules on path(s)
- owner executes them in the same validation pipeline as compiled rules
- only无法规则化的情况才用 escape hatch custom validate callback

## Complex Worked Example

下面给出一个覆盖多种复杂情况的示例。

它包含：

- `if`
- `variant-field`
- `detail-field`
- `object-field`
- `array-field`
- `loop`
- async validation

### Example Schema Sketch

```json
{
  "type": "form",
  "name": "userForm",
  "body": [
    {
      "type": "input-select",
      "name": "mode",
      "options": ["basic", "advanced"]
    },
    {
      "type": "input-select",
      "name": "contactMode",
      "options": ["email", "webhook"]
    },
    {
      "type": "if",
      "condition": "${mode === 'advanced'}",
      "then": {
        "type": "object-field",
        "name": "profile",
        "body": [
          {
            "type": "input-text",
            "name": "userName",
            "required": true,
            "validate": {
              "api": "/api/users/check-name"
            }
          },
          {
            "type": "variant-field",
            "name": "contact",
            "variants": [
              {
                "key": "email",
                "match": { "kind": "expression", "when": "${contactMode === 'email'}" },
                "content": {
                  "type": "input-text",
                  "name": "value",
                  "required": true,
                  "pattern": "${tenantPolicies.emailRegex}"
                }
              },
              {
                "key": "webhook",
                "match": { "kind": "expression", "when": "${contactMode === 'webhook'}" },
                "content": {
                  "type": "object-field",
                  "name": "value",
                  "body": [
                    {
                      "type": "input-text",
                      "name": "url",
                      "required": true
                    },
                    {
                      "type": "array-field",
                      "name": "headers",
                      "itemKind": "object",
                      "item": [
                        { "type": "input-text", "name": "key", "required": true },
                        { "type": "input-text", "name": "value", "required": true }
                      ]
                    }
                  ]
                }
              }
            ]
          },
          {
            "type": "detail-field",
            "name": "address",
            "content": {
              "type": "object-field",
              "name": "value",
              "body": [
                { "type": "input-text", "name": "street", "required": true },
                { "type": "input-text", "name": "city", "required": true },
                { "type": "input-text", "name": "zip", "required": "${country === 'US'}" }
              ]
            }
          },
          {
            "type": "array-field",
            "name": "contacts",
            "itemKind": "object",
            "item": [
              { "type": "input-text", "name": "label", "required": true },
              {
                "type": "input-text",
                "name": "email",
                "required": true,
                "validate": { "api": "/api/contacts/check-email" }
              }
            ]
          },
          {
            "type": "loop",
            "items": "${contacts}",
            "body": {
              "type": "text",
              "text": "${item.label}: ${item.email}"
            }
          }
        ]
      }
    }
  ]
}
```

### What Gets Compiled

编译期不会直接得到“最终活跃字段列表”，而是得到 template graph：

- `mode`
- `contactMode`
- guarded subtree `profile.*` under `if(mode === 'advanced')`
- `profile.userName`
- `profile.contact` variant root
- `profile.contact.value` email branch template
- `profile.contact.value.url` webhook branch template
- `profile.contact.value.headers` array root template
- `profile.address` detail-field root template
- `profile.contacts` array root template
- `profile.contacts[*].label`
- `profile.contacts[*].email`

以及它们的：

- rule templates
- expression dependencies
- aggregate ancestors
- async rule descriptors

### What Gets Materialized At Runtime Initially

假设初始值：

- `mode = 'advanced'`
- `contactMode = 'email'`
- `profile.contacts = [{ label: '', email: '' }]`

则 active instance graph 初始包含：

- `mode`
- `contactMode`
- `profile.userName`
- `profile.contact` root
- `profile.contact.value` email branch active node
- webhook branch inactive
- `profile.address` summary field root only；detail draft owner 尚未创建
- `profile.contacts`
- `profile.contacts.0.label`
- `profile.contacts.0.email`
- `loop` 展开的 display instances

注意：

- `detail-field` 的 dialog/draft 内容未打开时，不会创建 child draft owner
- `loop` 展开了展示实例，但它自己不额外发明新的 validation root

### Edit Flow 1: Editing `profile.userName`

用户在 `profile.userName` 输入框里输入 `alice`。

执行顺序推荐为：

1. `setValue('profile.userName', 'alice')`
2. mark dirty/touched as needed
3. `validateAt('profile.userName', 'change')`
4. owner materialize effective rules for `profile.userName`
5. sync rules先跑
6. async uniqueness rule 启动 debounce run
7. run completes -> if still latest and path still active, write back result

此时不会整表单重验，但 owner 会自动扩展 closure 到：

- `profile.userName`
- 依赖 `profile.userName` 的表达式规则
- `profile` object aggregate rule（如果存在）

### Edit Flow 2: Switching `contactMode` From `email` To `webhook`

这一步是 `variant-field` 的核心。

执行顺序推荐为：

1. `setValue('contactMode', 'webhook')`
2. owner 发现 `profile.contact` active branch 发生切换
3. email branch 失活
4. 清理 email branch 的错误、validating run、showError candidates
5. webhook branch 激活
6. 如果 schema 定义了 webhook variant `initialValue`，建立新 working value
7. `validateSubtree('profile.contact')`

验证参与集此时发生变化：

- `profile.contact.value` email leaf 不再参与
- `profile.contact.value.url` 开始参与
- `profile.contact.value.headers` array subtree 开始参与

旧 email branch 的 async run 如果尚未返回，也必须失效。

### Edit Flow 3: Adding A Header Row In Webhook Variant

用户在 `profile.contact.value.headers` 中新增一行。

执行顺序推荐为：

1. array owner append row
2. runtime 实例化新路径：

- `profile.contact.value.headers.0.key`
- `profile.contact.value.headers.0.value`

3. remap array-related state if needed
4. `revalidateAffected({ changedPaths: ['profile.contact.value.headers'] })`

owner 自动扩展 closure 到：

- array root `profile.contact.value.headers`
- row root `profile.contact.value.headers.0`
- leaf paths under that row if trigger policy requires

### Edit Flow 4: Opening And Confirming `detail-field` Address Editor

用户点击 `address` 的 detail editor。

打开时：

1. surface opens
2. create child draft owner rooted at `profile.address`
3. child owner loads draft value
4. draft subtree graph materializes under that owner

在 dialog 内编辑 `zip` 时：

1. update draft value
2. `draftOwner.validateAt('profile.address.zip', 'change')`
3. owner materializes `required: '${country === "US"}'`
4. if required, validate accordingly

确认时：

1. `draftOwner.validateAll('submit')`
2. 若 invalid，dialog stays open，错误只留在 draft owner
3. 若 valid，执行 commit/writeback
4. parent owner `revalidateAffected({ changedPaths: ['profile.address'] })`

这里最重要的是：

- draft 内错误不污染 parent owner
- confirm 前 outer form submit 不应看到 draft 内未确认错误

### Edit Flow 5: Editing `profile.contacts.0.email`

用户编辑对象数组中的 email。

执行顺序推荐为：

1. `setValue('profile.contacts.0.email', next)`
2. `validateAt('profile.contacts.0.email', 'blur')`
3. owner 扩展 closure 到：

- leaf `profile.contacts.0.email`
- row root `profile.contacts.0`
- array root `profile.contacts`
- expression / overlay dependents

4. async email-check rule 启动

如果用户随后删除第 0 行：

1. array remove remaps indexed state
2. `profile.contacts.0.*` 相关 async run 失效或 remap
3. array root `profile.contacts` 重验

### Submit Flow

用户点击整个 form 提交。

`validateAll('submit')` 遍历的是当前 active instance graph，而不是所有模板节点。

在上面的时刻，如果：

- `mode = 'advanced'`
- `contactMode = 'webhook'`
- address detail dialog 已关闭且已提交

那么 submit 时参与的节点包括：

- `mode`
- `contactMode`
- `profile.userName`
- `profile.contact.value.url`
- `profile.contact.value.headers` 及其活跃 rows
- `profile.contacts` 及其活跃 rows

不包括：

- `if` 的 inactive branch
- `variant-field` 的 inactive email branch
- 已关闭且未创建中的 detail draft owner 内部节点
- 其他 owner 的 nested form fields

### Why This Example Matters

这个例子说明：

- 预编译仍然有价值，因为 rule template、branch template、array template 都能提前收集
- 动态性确实存在，但主要体现在 active instance graph 的实例化/失活，而不是逼迫架构退回 mount-only registration
- 局部验证始终是 owner-aware closure validation
- 整体验证始终是 active instance graph validation
- async validation 只是同一 pipeline 中带 lifecycle/cancellation 语义的 rule 类型

## Decision Summary

当前草案推荐：

1. 继续坚持 owner-scoped validation。
2. 把 validation core 和 form UX layer 分开。
3. 引入 `ValidationOwner` 作为 form/draft 的共同抽象。
4. 支持表达式化 rule template，并利用预编译做 materialization。
5. 第一阶段只让 subtree draft owner 成为普通 child owner。
6. projection draft 暂不纳入 first-class owner 模型。
7. 让 dynamic rules 成为复杂控件扩展的首选机制。
8. 保留比最小三元组更强的错误表达能力，但收敛语义和查询面。

## Risks And Open Questions

1. array item 内的相对路径表达式如何映射到 concrete absolute dependency path
2. draft owner 子图提取是复制 compiled subtree 还是 parent model 视图映射
3. dynamic rule overlay 的优先级、覆盖关系与去重策略
4. `sourceKind` 是否直接重命名为 `source` 还是保持兼容字段
5. projection draft 的统一 owner 模型是否值得进入 phase 2，还是继续停留在 value-adaptation wrapper
6. open surface 期间数组行 reorder 的 direct-binding 支持是否要进入后续阶段

这些问题在本草案中尚未最终定案，需要继续场景化审计。

## Related Documents

- `docs/architecture/form-validation.md`
- `docs/architecture/object-field.md`
- `docs/architecture/array-field.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/surface-owner.md`
- `docs/analysis/2026-03-19-form-validation-comparison.md`
