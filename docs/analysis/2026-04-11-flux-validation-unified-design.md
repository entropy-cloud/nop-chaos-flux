# Flux Validation Unified Design

> 类型: 最终设计文档
> 状态: 已审核（两轮深度审核，所有 P1/P2/P3 问题已处理，可采纳为实施参考）
> 日期: 2026-04-11
> 取代: `form-validation-expression-rules-design.md`, `form-validation-owner-redesign-draft.md`, `2026-04-form-validation-design-synthesis.md`, `2026-04-form-validation-final-design.md`, `2026-04-11-scope-owned-validation-model.md`
> 关联: `docs/architecture/form-validation.md`

---

## 1. 目的

本文档是 Flux validation 的最终设计目标文档，自包含，不依赖任何前序草案。

它回答以下问题：

1. validation 结构的唯一真相是什么？
2. 哪个运行时拥有 validation 状态和执行权？
3. form、draft editor、object editor、array、table、非 form 过滤面板如何统一进一个模型？
4. 表达式化规则、动态可见性、async validator 如何协同工作？
5. 先实现什么，后实现什么？

---

## 2. 核心主张

**Flux validation 由最近的具备 validation 能力的 scope runtime 拥有。**

这意味着：

1. validation 不由 React mount 树拥有
2. validation 不只由 `form` renderer 拥有
3. validation 不由任意 UI 嵌套层级拥有
4. validation 不在运行时从已挂载控件临时组装

拥有 validation 的 runtime 是当前持有以下内容的 runtime：

1. 某个 scope 的已编译 validation 模板图
2. 该 scope 当前活跃参与的 validation 实例
3. 该 scope 的 field-addressed validation 状态
4. 触发该 scope validation 的 API

`form` 是这个 runtime 的特化，而不是 validation 本身的定义。

### 术语说明

本文档使用三个独立术语：

| 术语 | 含义 |
|------|------|
| `render scope` | 用于渲染或数据查找的任意运行时 scope |
| `validation scope` | 具有 validation 语义的 render scope |
| `validation owner` | 拥有一个 validation scope 的运行时实例 |

每个 validation scope 有且只有一个 validation owner。

---

## 3. 设计目标

1. 保持编译期 validation 结构作为主要真相来源
2. 支持 `form` 之外的 validation，如过滤面板、inline editor、本地 draft scope
3. 在同一个模型中支持 field rules、object rules、array rules、branch-dependent rules
4. 支持表达式化规则参数，不在 validation 时重新解析 schema
5. 将 `showErrorOn`、submit gate 等 UI 策略与规则执行分离
6. 保留动态运行时参与机制，但不让 runtime registration 成为唯一真相
7. 将 child draft validation 状态与父 scope 隔离直到 commit
8. 集中管理可取消的 async validation
9. 支持基于 path 和 subtree 的局部 validation
10. 允许分阶段实现，不改变目标架构

---

## 4. 非目标

1. 不把 React mount/unmount 作为 validation 结构发现的唯一方式
2. 不把 validation 变成 builder-style fluent schema library
3. 不要求每个 UI scope 都创建 validation runtime
4. 不要求每个复杂控件只能通过声明式规则模板表达
5. 不自动向父 scope 暴露所有 child scope 内部 field errors

---

## 5. 主要原则

### 5.1 两条轴必须同时存在

Validation 必须同时在两条轴上建模。

**value axis** 回答：

1. validation 结构中存在哪些 path
2. 哪些规则属于每个 path
3. 存在哪些 aggregate 关系
4. 哪些 path 依赖其他 path

**owner axis** 回答：

1. 哪个 runtime 当前拥有那些值
2. validation 状态存储在哪里
3. 哪些 validation API 被允许作用于那些 path
4. draft 隔离从哪里开始和结束

两条轴缺一不可。

### 5.2 编译期图优先

Flux 提前编译 validation 结构。

编译产出的图定义"哪些 validation 可能存在"。

运行时状态决定"当前哪些在参与"。

### 5.3 运行时参与是补充，不是替代

运行时 field registration 很重要，但它不是唯一真相。

它告诉 owner runtime：

1. 哪些 field instance 当前已 materialize
2. 哪些 path 当前可见或隐藏
3. 哪些动态 child path 或 overlay 已出现

它不定义完整的 validation 图。以下节点没有对应 renderer，不会出现在 registry 中，但仍然需要参与 validation：

- `object`/`array` aggregate node
- `variant-root` / `branch` 等结构节点
- repeated item template 的模板级边界

正确的协作模型：

- **compiled field tree** 定义"哪些 validation 结构可能存在"
- **FormFieldRegistry** 报告"当前哪些 leaf field instance 已 mount/participate"
- `validateAll()` 以 compiled traversal order 为主序，与 registry 交叉过滤 leaf 参与状态

### 5.4 form 是特化的 validation scope

Validation 必须在非 submit 导向的 scope 中工作。

示例：

1. dashboard 过滤面板（endDate 不能早于 startDate）
2. 搜索面板（有格式约束）
3. inline row editor（有行级跨字段规则）
4. local draft editor（confirm 前隔离验证）

`FormRuntime` 在通用 validation scope runtime 基础上增加 submit、touch policy、error display policy。

### 5.5 错误属于 field，不属于 owner

错误存储在 field-addressed validation state 中，不存在 owner 上。

owner runtime 存储和管理这些 field state，但对外的主要读取 API 是 `getFieldState(path)`，而不是 `getErrors(path)`。

这保持两个事实同时成立：

1. field UI 直接读取 field-addressed errors
2. owner runtime 仍然协调生命周期、聚合、async 所有权和 subtree 查询

---

## 6. Runtime 模型

### 6.1 ValidationScopeRuntime

核心 runtime 抽象是 `ValidationScopeRuntime`：

```ts
type ValidationReason = 'change' | 'blur' | 'submit' | 'commit' | 'system';

interface ValidationScopeRuntime {
  readonly scopeId: string;
  readonly rootPath: string;

  /**
   * 编译期产出的 validation 模板图。
   *
   * 为 null 时，表示该 scope 没有 compiled field tree，只持有
   * runtime-only dynamic validator（如通过 RuntimeValidationDescriptor 注册的黑盒控件）。
   * 此时所有 validateAt / validateSubtree / validateAll 调用仍然有效：
   *   - compiled graph 部分产出空结果
   *   - runtime overlay / opaque validator 部分正常执行
   *   - getScopeState() 返回基于 overlay 结果的摘要
   *
   * Phase 1–2 中该字段始终非 null（FormRuntime 总有 compiled model）。
   * Phase 3 引入的非 form scope 在编译器产出 field tree 时才创建 runtime，
   * 因此 Phase 3 的 ValidationScopeRuntime 仍总有非 null compiled model。
   * Phase 4 中若引入纯动态 overlay-only scope（无编译期 field tree），
   * 则该字段可能为 null。
   */
  readonly compiledModel: CompiledValidationModel | null;

  validateAt(path: string, reason?: ValidationReason): Promise<ValidationResult>;
  validateSubtree(path: string, reason?: ValidationReason): Promise<ScopeValidationResult>;
  validateAll(reason?: ValidationReason): Promise<ScopeValidationResult>;
  applyChangesAndRevalidate(input: ApplyScopeChangesInput): Promise<ScopeValidationResult>;

  getFieldState(path: string): FieldValidationStateSnapshot;
  getScopeState(): ScopeValidationStateSnapshot;
  getScopeRootErrors(): ValidationError[];
  isPathOwned(path: string): boolean;

  registerField(state: FieldRegistrationState): () => void;
  updateFieldRegistration(path: string, patch: Partial<FieldRegistrationState>): void;
}

interface ApplyScopeChangesInput {
  writes: Record<string, unknown>;
  changedPaths: string[];
  reason: ValidationReason;
}

interface ScopeValidationStateSnapshot {
  valid: boolean;
  hasErrors: boolean;
  validating: boolean;
  /**
   * 该 scope 是否处于可以被提交 / 确认的状态。
   * FormRuntime: valid && allTouched（或按 validateOn 策略）。
   * 非 form ValidationScopeRuntime: 等同于 valid。
   * 父 scope 通过 summary-gate 读取此字段而非直接读 valid，
   * 以避免"字段未 touch 时 valid=true 被误判为就绪"。
   */
  ready: boolean;
}
```

注：`getScopeRootErrors()` 只返回 scope root path 上 `sourceKind === 'scope-root'` 的错误，不返回同路径上的 object/array aggregate 错误（那些由 aggregate root 自身的 chrome 渲染）。等价于 `getFieldState(this.rootPath).errors.filter(e => e.sourceKind === 'scope-root')`。它作为快捷路径存在，供 scope summary UI 使用，避免外部代码依赖 `rootPath` 字符串。

### 6.2 FormRuntime

`FormRuntime` 是 `ValidationScopeRuntime` 的特化：

```ts
interface FormRuntime extends ValidationScopeRuntime {
  readonly validateOn: ValidateOnPolicy;
  readonly showErrorOn: ShowErrorOnPolicy;

  touchField(path: string): void;
  visitField(path: string): void;
  isTouched(path: string): boolean;
  isDirty(path: string): boolean;
  isVisited(path: string): boolean;

  submit(): Promise<FormSubmitResult>;
  readonly canSubmit: boolean;
  readonly allTouched: boolean;
}

```

`FormRuntime` 的附加职责：

1. submit gate（所有 active field valid 才放行）
2. touched / dirty / visited 状态的持有与 UX 联动
3. `showErrorOn` 策略（blur / change / submit）
4. submit action 编排

规则执行、依赖扩展、subtree validation、async 所有权来自基类 `ValidationScopeRuntime`。

### 6.3 Touched / Dirty 的归属

touched / dirty / visited 的**存储**在 field（`FieldRegistrationState` 中），**策略**在 `FormRuntime`。

`ValidationScopeRuntime` 不持有 touched 汇总——它只管 validation 触发和结果。

`FormRuntime` 在基类基础上增加：

- `allTouched`：是否所有 active field 都被 touched
- `showErrorOn: 'touched'`：只在 touched 的 field 上显示错误
- `canSubmit`：结合 scope validity 和 touched 状态计算

### 6.4 非 form scope 的 showErrorOn 默认值

`showErrorOn` 控制的是 error **显示**时机，而不是 validation **执行**时机。validation 总是按 reason 正常运行，`showErrorOn` 只决定 `FieldValidationStateSnapshot.errors` 何时被 UI 渲染为可见错误。

`FormRuntime` 默认 `showErrorOn: 'blur'`，可配置。

`ValidationScopeRuntime`（非 form）默认 `showErrorOn: 'blur'`（不是 immediate），因为 cross-field dependency 场景（如 endDate 依赖 startDate）在用户输入中途会产生噪音。`'change'` 适合单字段格式校验，不适合跨字段规则。

可通过 schema 配置覆盖：

```json
{
  "type": "hbox",
  "scopeId": "dateFilter",
  "validation": { "showErrorOn": "change" },
  "body": [...]
}
```

当 A 变化触发 B 进入 closure 扩展时，B 的 error 按 **B 自身的 `showErrorOn`** 策略决定是否显示，与触发原因无关。

---

## 7. 哪些 scope 成为 validation scope

不是每个 render scope 都创建 validation runtime。

scope 成为 validation scope 当且仅当以下至少一个为真：

1. 编译器为它产出了非空的 validation model
2. 它显式声明了 validation 行为（如 `showErrorOn`）
3. 它托管了一个必须在 commit 前 validate 的 local draft editor
4. 它托管了需要 owner 级协调的 runtime-only dynamic validator

纯视觉容器没有 validation 内容时不创建 validation runtime，运行时开销为零。

### 7.1 Owner Resolution 算法

编译器将每个可能引入 scope boundary 的 schema 节点分类为：

| 类别 | 语义 |
|------|------|
| `no-owner` | 子树无 validation 结构，无 runtime validation 注册需求 |
| `inherit-owner` | 子树向最近祖先 owner 贡献 validation 节点 |
| `create-owner` | 子树创建新 validation scope 和新 validation owner |

编译器和 runtime 必须遵循相同的 resolution 规则。

**`inherit-owner` 的使用场景：**

1. 直接绑定父 owner 值的 inline object editor
2. 直接绑定父 owner 值的 inline array editor
3. 直接绑定父 owner 值的 editable table cell
4. 纯视觉 layout 容器，其后代有 field 但没有引入新的 draft 或 submit 边界

**`create-owner` 的使用场景：**

1. `form` renderer
2. 在 commit 前 validate 的 draft editor
3. 有 validation rules 但没有 submit 语义的 filter/search scope
4. row-local draft editor

**`no-owner` 的使用场景：**

1. 纯 layout 容器
2. 只读 surface
3. 无 validation 语义的 action 控件

"最近 owner"是指最近的 `create-owner` 祖先 boundary。

### 7.2 运行时 Owner Boundary 补充规则

§7.1 的三分类是编译期静态分类，以下动态场景需要额外说明：

1. **同一 schema 模板的运行时 owner 差异**：同一 renderer（如 object editor）在 schema 中可能被用作 `inherit-owner`（inline 直接编辑）或 `create-owner`（draft 模式编辑）。编译器在 owner 分类时以 schema 属性为准（如 `"draft": true` 可将 object 提升为 `create-owner`）；运行时不自行重分类。

2. **嵌套 owner 的 ChildValidationContract 初始化**：当 `create-owner` scope 被嵌套在另一个 `create-owner` 内时，`ChildValidationContractRegistration` 由**子 scope 在自身激活时**通过内部 API（`parentOwner.registerChildContract(contract)`）向父 owner 注册，父 owner 在子 scope 注册到来时确定契约模式（见 §22）。若父 scope 不是 validation scope（`no-owner`），子 scope 向上继续查找直到找到最近的 `create-owner` 祖先。子 scope 销毁时调用 `unregister()` 取消注册。

3. **RuntimeValidationDescriptor 的 path 校验**：§21 的 `RuntimeValidationDescriptor` 通过 `ownerId` 字段声明归属。owner runtime 在接受注册时，必须验证 `ownerId` 与自身 `scopeId` 匹配，且 `targetPaths` 中所有 path 均在本 owner 的 `rootPath` 子树内。校验失败时拒绝注册并记录警告。

---

## 8. 分层状态模型

### 8.1 Compiled Validation Model

编译器产出的不可变运行时输入。定义结构和模板。

```ts
interface CompiledValidationModel {
  rootPath: string;
  ownerId: string;
  nodes: Record<string, CompiledFieldTreeNode>;
  validationOrder: string[];
  dependents: Record<string, string[]>;
}

type FieldTreeNodeKind =
  | 'scope-root'
  | 'form-root'
  | 'field'
  | 'object'
  | 'array'
  | 'variant-root'
  | 'variant-branch'
  | 'repeated-template';

interface CompiledFieldTreeNode {
  id: string;
  path: string;
  ownerId: string;
  kind: FieldTreeNodeKind;
  parent?: string;
  children: string[];
  ruleTemplates: CompiledRuleTemplate[];
  dependencyPaths: string[];
  aggregateDependencies?: string[];
}
```

`id` 是编译期稳定的模板身份，`path` 是运行时 canonical absolute path。

`validationOrder` 包含模板 id（以模板形式，如 `contacts[].email`）。运行时执行 `validateAll` 时，每个 array template entry 被展开为当前所有 active indexed instance（`contacts.0.email`、`contacts.1.email`…）后按序执行。

对 array item template，`id` 和 `path` 的关系如下：

```
编译期模板节点（以 id 为 key）：
  id: 'contacts[].email'   path: 'contacts[].email'   kind: 'field'

运行时 active instance（以 indexed path 为 key，不在 CompiledValidationModel.nodes 中）：
  path: 'contacts.0.email'  ← 通过 'contacts[].email' 模板 materialize
  path: 'contacts.1.email'  ← 同上
  path: 'contacts.2.email'  ← 同上
```

`CompiledValidationModel.nodes` 的 key 是模板 `id`（对 array item 使用 `contacts[].email` 形式），而不是 indexed path。

运行时 active instance graph 以 indexed absolute path（`contacts.0.email`）为 key，通过 path-to-templateId 映射（去掉 index 后还原为模板 id）定位对应的 `CompiledFieldTreeNode` 读取 ruleTemplates。

Materialization cache 和 field validation state bucket 以 indexed absolute path 为 key（运行时粒度），不以模板 id 为 key。

### 8.2 Field Registration State

运行时参与状态，由 React mount/unmount 驱动。

```ts
interface FieldRegistrationState {
  path: string;
  mounted: boolean;
  visible: boolean;
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
}
```

### 8.3 Field Validation State

运行时 validation 结果状态，由 ValidationEngine 维护。

```ts
interface FieldValidationStateSnapshot {
  ownerId: string;
  path: string;
  errors: ValidationError[];
  validating: boolean;
}
```

errors 存储在这里，**不存在** owner 上。

### 8.4 Canonical Identity

内部记账的唯一标识是：

```ts
interface OwnerQualifiedPath {
  ownerId: string;
  path: string;
}
```

规则：

1. `path` 是 owning scope 地址空间内的绝对路径
2. `ownerId` 区分 parent-owned 已提交状态与 child-owned draft 状态，即使两者最终对应同一提交位置
3. cache、async run 所有权、runtime overlay、field validation bucket 均以 `OwnerQualifiedPath` 为 key
4. 当 owner runtime 已从上下文中已知时，public API 可以只接受绝对路径

示例：

- parent 已提交字段：`{ ownerId: 'form:profile', path: 'profile.firstName' }`
- child draft 编辑同一位置：`{ ownerId: 'draft:profileDialog', path: 'profile.firstName' }`
- array row draft editor：`{ ownerId: 'draft:items.3', path: 'items.3.name' }`

这在不引入第二套 path 语言的情况下保持了 draft 隔离。

---

## 9. Error 归属与查询模型

errors 不是独立于 field 的 owner 级实体。

它们是由最近 validation scope runtime 拥有的 field-addressed validation 状态。

查询规则：

1. `getFieldState(path)` 是 field errors 的主读取 API
2. `getScopeState()` 是 scope 级摘要状态的主读取 API
3. 父 scope 不自动枚举 child scope 内部的 field errors
4. 父 scope 需要 child validity 做 gate 时，读 child scope 摘要状态或使用显式依赖契约

### Aggregate 与 root error 的挂载点

| 规则类型 | 错误挂载路径 |
|---------|------------|
| object-level 规则 | object root path（如 `profile`） |
| array-level 规则 | array root path（如 `contacts`） |
| row-level 规则 | row object root path（如 `contacts.2`） |
| scope-root 规则 | scope root path |

渲染规则：

1. field chrome 读取 field 自身的 errors
2. object / array chrome 可读取 subtree root field state 渲染 aggregate errors
3. scope 级 summary UI 通过 `getScopeRootErrors()` 读取 scope root 级别的消息

---

## 10. 编译期收集

Validation 结构由 component-aware collector hook 编译。

```ts
interface ValidationCompileContribution<S = unknown> {
  kind: FieldTreeNodeKind | 'none';

  collectNode?(schema: S, ctx: ValidationCompileContext<S>): CompiledFieldTreeNodeInput | undefined;
  collectChildren?(schema: S, ctx: ValidationCompileContext<S>): ValidationChildDescriptor[];
  collectRules?(schema: S, ctx: ValidationCompileContext<S>): CompiledRuleTemplate[];
  collectDependencies?(schema: S, ctx: ValidationCompileContext<S>): string[];
}

interface ValidationCompileContext<S = unknown> {
  schema: S;
  path: string;
  parentPath?: string;
  ownerId: string;
  compiler: ExpressionCompiler;
  compileValue<T>(raw: unknown): CompiledRuntimeValue<T>;
  extractDependencies(compiled: CompiledRuntimeValue<unknown>): string[];
}
```

编译器必须按 owner boundary 划分 compiled validation model：

1. `inherit-owner` 下收集的 node 合并进父 owner 的 model
2. `create-owner` 下的 node 开始新的 compiled validation model
3. 依赖关系不直接跨 owner boundary

编译器负责：

1. authoring 路径到 canonical 路径的 rebase
2. field tree 组装
3. dependency graph 组装
4. validation 顺序计算
5. aggregate child-to-parent dependency 注册

renderer 负责描述其 validation 语义，不负责组装私有 runtime 图。

### 10.1 `kind` 与 Owner Resolution 的映射

`ValidationCompileContribution.kind` 是节点的结构语义，owner resolution 是节点的边界语义，两者是不同维度：

| `kind` | 默认 owner resolution | 可通过 schema 覆盖？ |
|--------|----------------------|---------------------|
| `'none'` | `no-owner` | 否 |
| `'field'` | `inherit-owner` | 否 |
| `'object'` | `inherit-owner` | 是（`"draft": true` → `create-owner`） |
| `'array'` | `inherit-owner` | 是（`"draft": true` → `create-owner`） |
| `'variant-root'` | `inherit-owner` | 否 |
| `'variant-branch'` | `inherit-owner` | 否 |
| `'repeated-template'` | `inherit-owner` | 否 |
| `'scope-root'` | `create-owner` | 否 |
| `'form-root'` | `create-owner` | 否 |

`scope-root` 和 `form-root` 类型的节点隐含 `create-owner` 语义，编译器在遇到这两种 kind 时自动开始新的 `CompiledValidationModel`。其他 kind 默认 `inherit-owner`，贡献到最近祖先 owner 的 model 中。

`kind: 'none'` 的 contribution 必须不提供 `collectNode`、`collectRules`、`collectChildren`——这些方法在 `kind` 为 `'none'` 时会被忽略。`'none'` kind 表示该 renderer 不产生任何 validation 结构，编译器在此处不分配 validation 节点。

---

## 11. Template Graph 与 Active Instance Graph

编译产物是模板图。

运行时，每个 validation scope 将模板图 materialize 为 active instance graph。

active instance graph 回答：

1. 哪个 branch 当前激活
2. 当前存在哪些 repeated item instance
3. 哪些 path 当前参与
4. 哪些 path 已失活，必须清理

active instance graph 从三个输入派生：

1. 编译期 validation 模板图
2. 当前值和 branch guard
3. 运行时参与信号（mounted field registration、dynamic child path）

active instance graph 不由任何单一输入单独定义。

**这是正确性的必要条件，不是后期优化。**

owner 至少必须能够：

1. 激活和失活 branch
2. materialize repeated item instance
3. 标记 path 为参与或不参与
4. 清理失活的 field state 和 async run

---

## 12. 规则模板模型

规则编译一次为模板，每次 validation run 时 materialize。

```ts
interface CompiledRuleTemplate {
  id: string;
  kind: ValidationRuleKind;
  when?: CompiledRuntimeValue<boolean>;
  args: Record<string, CompiledRuntimeValue<unknown>>;
  message?: CompiledRuntimeValue<string> | string;
  dependencyPaths: string[];
}
```

静态 args 使用 `{ kind: 'static', value: ... }` 形式的 `CompiledRuntimeValue`，在 materialization 时走快速路径，无表达式求值开销。

规则可对以下内容使用表达式：

1. `when`（条件激活）
2. 数值或字符串阈值
3. 跨字段比较
4. 错误消息

schema 不在 validation 时重新解析。而是：

1. schema 编译一次
2. 规则表达式编译一次
3. 每次 validation run 对当前 scope 状态求值编译后的表达式

**纯静态规则（`when: undefined`，所有 args 均为 `{ kind: 'static', value: ... }`）完全走快速路径，无表达式求值开销，与现有行为等价。**

---

## 13. Materialization Service

每个 validation scope runtime 暴露一个内部规则 materialization service。

该 service 必须是以下内容的**单一来源**：

1. validator 执行
2. effective required 状态
3. 未来的 diagnostics 或规则检查 UI

这避免了 UI 认为 field required 但 validator 认为 optional 的分裂。

Materialization cache：

1. owner-local
2. 以 path 为 key
3. 因依赖写入、overlay 变化、结构变化、参与状态变化而失效

---

## 14. 依赖模型

依赖图合并三类来源：

### 14.1 显式规则依赖

- `equalsField`
- `requiredWhen`
- `requiredUnless`

### 14.2 表达式依赖

`when`、`args`、`message` 中任何已编译表达式贡献依赖 path。

### 14.3 Aggregate 依赖

编译器为 aggregate freshness 自动添加 child-to-parent 依赖：

- `contacts.0.email` 变化 → `contacts` 必须重验 `uniqueBy`
- `profile.firstName` 变化 → `profile` 必须重验 `allOrNone`

---

## 15. 参与规则

### 15.1 Bound Subtree Participation

如果 subtree 直接编辑 parent-owned 值，它停留在父 validation scope。

示例：

1. inline object editing
2. inline array editing
3. 直接绑定父 owner 值的 table cell editing

在这些场景中：

1. child path 属于 parent owner
2. 本地交互调用 parent owner API
3. parent submit 验证整个 owner

### 15.2 Local Draft Participation

如果 subtree 在 commit 前编辑 local draft，它使用 child validation scope runtime。

示例：

1. detail dialog 编辑临时对象
2. table 内的 row draft editor
3. 在 apply 前编辑 local projected data 的 side panel

在这些场景中：

1. draft errors 停留在 child scope
2. 父 scope 在 commit 前不受影响
3. commit 首先验证 child scope
4. 成功 commit 写回并触发父 scope 对受影响 path 的重验

**child draft scope 就是一个普通的子 ValidationScopeRuntime，不需要专门的 createDraftOwner 工厂函数。**

### 15.3 Non-Form Validation Scope

filter 或 search 面板可以创建 validation scope 而无需是 form。

在这种场景中：

1. 默认无 submit gate
2. validation 仍在 change 或 blur 时运行（默认 immediate）
3. errors 仍通过 field state 显示
4. action 可以在需要时读取 scope summary validity

---

## 16. Hidden 与 Inactive 内容

hidden 和 inactive path 是 owner-scoped 的参与关注点。

默认规则：

1. hidden field 保留其值，除非 policy 另有规定
2. hidden field 跳过 validation，除非 policy 另有规定
3. hidden 转换为已失活 path 清理 stale errors
4. 如果 policy 要求清除值，该值变化参与同一 validation 准备流程

Branch 失活遵循同一原则：

1. inactive branch 不参与 validation
2. inactive branch async run 失效
3. inactive branch stale errors 从 active scope state 中移除

---

## 17. Validation 执行模型

每个 validation 入口遵循以下高级流程。

**§17 与 §18 的职责关系**：§18 的清理是"结构突变事件的一次性副作用"（variant switch、array row 删除等触发），§17 Step 0 是"每次 validation run 的幂等状态同步"。两者互补：§18 在突变时立即清理失活状态，§17 Step 0 在每次 run 时确认参与状态是最新的。§18.1 Step 4 的 `validateSubtree` 调用会正常进入 §17 的完整 run 流程（含 Step 0），这是预期行为，Step 0 在此场景下是幂等的（没有新的失活需要清理）。

### Step 0: 准备参与状态

owner 在执行规则前刷新当前参与状态，包括：

1. branch activation（读取当前值和 guard expression）
2. repeated item materialization（按当前 array 长度展开）
3. hidden-path reconciliation
4. 失活 path 的清理（errors、validating、async run、materialization cache）

### Step 1: 计算 Impacted Closure

owner 将直接 changed path 集合扩展为 closure。

closure 包含：

1. direct changed path
2. aggregate ancestor
3. 显式 dependent
4. 表达式 dependent
5. dynamic overlay dependent
6. branch activation 变化影响到的 path

### Step 2: 扩展 Validation Target

closure root 被扩展为具体 validation target。

规则因 reason 不同而异：

1. `change` / `blur`：通常局部，closure-aware
2. `submit` / `commit`：可能向 active descendant 更深展开
3. `system`：与 `change` 相同的 closure-aware 局部展开，但不触发 touched 状态更新，也不受 `showErrorOn` 策略限制（始终将结果写入 field state，直接可见）

### Step 3: Materialize 规则

对每个 target path：

1. 读取 compiled template
2. 合并 dynamic overlay
3. 求值 `when`
4. 求值 args 和 message
5. 产出 effective rules
6. 更新 materialization cache

### Step 4: 执行同步规则

同步规则先运行，立即发布错误结果。

### Step 5: 执行异步规则

异步规则在 owner-managed run ownership 下运行。

```ts
interface AsyncValidationRun {
  ownerId: string;
  path: string;
  ruleId: string;
  reason: ValidationReason;
  runId: string;
  /**
   * owner 级单调递增计数器，粒度为 per-owner（不是 per-path）。
   * 以下事件触发 owner epoch 递增：
   *   1. array structural mutation（delete / insert / reorder）
   *   2. owner scope destroy / recreate
   *   3. 显式 reset（如 form.reset()）
   * variant switch 和 if-branch 切换不递增 epoch——
   * 这些场景通过 registry.unregister 使 path 失活，
   * 由"path 仍在 registry"条件（第二个条件）拦截 stale run。
   */
  ownerEpoch: number;
  abort(): void;
}
```

只有最新的 valid run 才能发布结果。

结果返回时写回前必须验证：

1. `runId` 匹配该 path + ruleId 的最新 run
2. path 仍在 registry 中（仍为 active）
3. `ownerEpoch` 与 owner 当前 epoch 匹配

三个条件全部满足才写回，否则丢弃（stale run）。

`submit` 触发时：

1. 取消所有仍在 debounce 等待的 change/blur run
2. 对所有 active path 以 `reason: 'submit'` 重新启动 async run（不 debounce）
3. await 所有 submit-required async run 完成后才返回

### Step 6: 发布结果

owner 更新 field-addressed validation state 和 scope summary state：

- sync errors 立即发布
- async pending state 立即发布
- async final errors 在 run settle 时发布

---

## 18. 结构变化的副作用清理

### 18.1 Variant Switch 清理序列

1. 失活旧 branch（renderer unmount → registry unregister 自动完成）
2. 清理旧 branch 所有 path 的 errors / validating / async run / materialization cache
3. 激活新 branch（renderer mount → registry register 自动完成）
4. 触发新 branch 初始验证：`validateSubtree(variantRoot, 'system')`（使用 `'system'` reason 确保新 branch 的 effective required、conditional rules 被正确写入 field state，不触发 touched 更新，且不受 `showErrorOn` 限制）

默认策略：旧 branch 的**值**可保留，但旧 branch 字段不参与 submit gate。

### 18.2 Array Row 增删重排的状态 Remap

array row 删除后 indexed path 偏移，必须对以下状态执行 index remap：

| 状态 | Remap 方式 |
|------|-----------|
| `errors` | 按新 index 重新映射 key |
| `validating` | 按新 index 重新映射 key |
| `touched` / `dirty` / `visited` | 按新 index 重新映射 key |
| `materialization cache` | 失效受影响 index 及以后的所有 cache |
| in-flight async run | **不 remap**，直接 abort（epoch 递增失效） |

Remap 完成后执行：

```ts
applyChangesAndRevalidate({
  writes: { [arrayPath]: newArrayValue },
  changedPaths: [arrayPath],
  reason: 'system'
});
```

注：此处的 `applyChangesAndRevalidate` 使用 `reason: 'system'`，但由于 `changedPaths` 包含 array root，owner 在 Step 2 扩展 validation target 时对 array root 使用 **`validateSubtree` 语义**（全量展开所有 active descendant），而不是普通 `validateAt` 的 closure 局部展开。这保证了 remap 后所有行的字段都被重验，而不仅仅是 array-level aggregate 规则。

### 18.3 `if` 分支切换

由 React reconciler 自动处理：失活分支 renderer unmount → `registry.unregister` → 从 active 字段集合消失。

`ValidationScopeRuntime` 监听 registry unregister 事件，在 path unregister 时：

1. 清除该 path 的 errors / validating
2. abort 该 path 的 in-flight async run（通过 epoch 递增失效）
3. 清除该 path 的 materialization cache
4. 若该 path 有 aggregate ancestor，将 ancestor 加入下次 closure 扩展

---

## 19. Validation API

### 19.1 `validateAt(path, reason)`

leaf 或 local-root 触发。

调用方提供一个 path，owner 验证该 path 周围的 impacted closure。

用于：

1. 普通 field blur
2. 普通 field change
3. local dependent 刷新

### 19.2 `validateSubtree(path, reason)`

验证 object、array 或 local section。

用于：

1. object editor apply
2. row editor save
3. array item local validation
4. branch activation check

### 19.3 `validateAll(reason)`

验证当前 scope 拥有的所有 active participating path。

用于：

1. form submit
2. draft commit
3. non-form scope 的显式"检查全部"

### 19.4 `applyChangesAndRevalidate(input)`

此 API 保证值写入和重验由 owner 一次性完成。

用于：

1. 结构性 array 变化
2. branch 切换
3. draft commit 写回
4. 必须原子触发重验的系统级参与变化

---

## 20. Aggregate 规则

Aggregate 规则是一等能力。

支持的类别：

1. object-level 规则（`allOrNone`、`atLeastOneOf`）
2. array-level 规则（`minItems`、`maxItems`、`uniqueBy`）
3. row-level 规则（row composite 规则）
4. scope-root 规则

Aggregate root 不需要对应已 mount 的 leaf field。

这是 runtime registration 不能成为唯一 validation 真相的原因之一。

---

## 21. 复杂控件与 Dynamic Overlay

复杂控件应优先使用 dynamic rule overlay，而不是不透明的黑盒 validation。

这允许：

1. 共享依赖追踪
2. 共享 effective required 逻辑
3. 共享 subtree validation 语义

不透明 runtime validator 作为 escape hatch 仍然允许，用于无法声明式建模的控件。

原则：优先用 overlay，只在必要时用黑盒 validation。

### Runtime Overlay 契约

两种不同的 descriptor 对应两种不同的使用方式，在实现层面走不同的管道：

**声明式规则 overlay**（优先使用）：

```ts
interface RuntimeRuleOverlayDescriptor {
  ownerId: string;
  targetPaths: string[];
  dependencyPaths: string[];
  childPaths?: string[];
  ruleTemplatesByPath: Record<string, CompiledRuleTemplate[]>;
  unregister(): void;
}
```

`ruleTemplatesByPath` 中的规则模板合并进 materialization pipeline，与编译期 compiled rule templates 走同一管道。这保证了 §13 所述的"单一来源"：UI 认为 required 与 validator 执行 required 的结论来自同一套 materialized rules。

**不透明 validator**（escape hatch，仅当无法声明式建模时使用）：

```ts
interface RuntimeOpaqueValidationDescriptor {
  ownerId: string;
  targetPaths: string[];
  dependencyPaths: string[];
  childPaths?: string[];
  attachTo?: 'target-path' | 'scope-root';
  unregister(): void;
  validatePath?(path: string): Promise<ValidationError[]> | ValidationError[];
  validateRoot?(): Promise<ValidationError[]> | ValidationError[];
}
```

`attachTo` 控制错误挂载点：`'target-path'` 将错误挂到对应 path，`'scope-root'` 将错误挂到 scope root path。

规则（两种 descriptor 均适用）：

1. descriptor 只能注册其 owner 拥有的 path
2. descriptor 不能创建跨 owner boundary 的依赖边
3. descriptor 移除必须清理受影响 path 的 child path、overlay、async 所有权
4. 不透明 validator 必须仍然声明 target path 和 dependency path，以保证 closure 计算正确

---

## 22. 父子 Scope 交互

**前提**：`ChildValidationContract` 仅适用于 `create-owner` 子 scope。`inherit-owner` 子树直接参与父 scope 的 validation graph，不存在契约对象——它们的 path 就是父 owner 的 path。

child scope 不自动将其内部 field state 合并到父 field state map。

父 scope 通过显式契约查看 child scope。

```ts
type ChildValidationMode = 'ignore' | 'summary-gate' | 'recurse-submit';

interface ChildValidationContract {
  childOwnerId: string;
  mode: ChildValidationMode;
}

interface ChildValidationContractRegistration extends ChildValidationContract {
  active: boolean;
  unregister(): void;
}
```

| 模式 | 含义 |
|------|------|
| `ignore` | 父 scope 不为 gate 或 submit 查询 child |
| `summary-gate` | 父 scope 可读取 child summary state 做 gate，但不检查 child 内部 |
| `recurse-submit` | 父 submit 显式调用 child submit-time validation 并等待其 async run |

生命周期规则：

1. 子 owner 在自身激活时向父 owner 注册 `ChildValidationContractRegistration`
2. 子 owner 在销毁或不再参与时取消注册（调用 `unregister()`）
3. 未打开或已销毁的子 owner 没有 active contract，不影响父 gating
4. 父 scope 的 summary 和 submit gating 只考虑 `active: true` 的 contract

默认契约：

1. child draft editor 默认 `ignore`，直到 commit 时
2. standalone filter/search scope 默认 `summary-gate`，只当 action 显式依赖时
3. nested submit-capable form 默认 `ignore`，除非显式配置

`canSubmit` 语义：

1. parent-owned errors 始终影响 parent `canSubmit`
2. `ignore` 模式的 child scope 不影响 parent `canSubmit`
3. `summary-gate` 模式的 child scope 通过 `ready` 和 `validating` 影响 parent `canSubmit`（使用 `ready` 而非 `valid`，确保 FormRuntime child 在 allTouched 为 false 时不被误判为就绪）
4. `recurse-submit` 模式的 child scope 在 parent submit 时被验证，可能阻塞 submit

---

## 23. Path 语义

canonical public path 语言是绝对路径。

canonical 内部记账标识是 `OwnerQualifiedPath`。

适用于：

1. compiled model nodes
2. 一个 owner 内的 dependency map
3. field validation state bucket
4. dynamic overlay
5. hidden participation state
6. cache invalidation
7. async run 所有权

规则：

1. 不带 owner context 的 plain path 不足以作为内部记账
2. 两个 owner 可以合法地使用相同的绝对路径，同时保持隔离
3. 跨 owner 操作必须显式命名源 owner 和目标 owner

---

## 24. 场景映射

### 24.1 普通 Form

`FormRuntime` 拥有 values、validation state、submit、field UX policy。

### 24.2 Dashboard 日期范围过滤面板

```json
{
  "type": "hbox",
  "validationScope": { "id": "dateFilter", "kind": "scope" },
  "body": [
    { "type": "input-date", "name": "startDate", "required": true },
    {
      "type": "input-date",
      "name": "endDate",
      "required": true,
      "rules": [{ "kind": "greaterThanOrEqualField", "path": "startDate", "message": "结束日期不能早于起始日期" }]
    }
  ]
}
```

编译器发现 body 内有 field renderer → 产出 field tree，创建 `ValidationScopeRuntime`（不是 FormRuntime）。onBlur 触发 `validateAt('endDate', 'blur')`，closure 自动扩展到 startDate。无 submit gate，默认 `showErrorOn: 'blur'`（可通过 `validationScope.validateOn` 覆盖为 `'change'`）。

### 24.3 直接绑定父 owner 值的 Table Inline 编辑

停留在父 owner，继承外层 `FormRuntime` context，使用现有双轨逻辑。

### 24.4 Row Draft Editor

创建 child validation scope runtime，`rootPath` 指向该行数据路径（如 `items.3`）。

Commit：`rowScope.validateAll('commit')` → 合法 → 写回 → 父 scope `applyChangesAndRevalidate`。

### 24.5 Detail Dialog 编辑 Draft Data

创建 child validation scope runtime，父 scope 在 commit 前保持干净。

### 24.6 纯 Action 控件

无 validation 规则的控件不创建 validation scope runtime，无开销。

---

## 25. 实施阶段

目标架构固定，实施分阶段进行。

### Phase 1: 表达式化规则与统一 Materialization

实现：

1. `CompiledRuleTemplate` 类型（新增，所有 args 统一为 `CompiledRuntimeValue<unknown>`，静态值用 `{ kind: 'static', value: ... }` 包装；现有 `CompiledValidationRule` 保持不变作为快速路径）
2. 表达式依赖提取：`collectSchemaValidationRules()` 从表达式中提取 `dependencyPaths`，合并进现有 `buildCompiledValidationDependentMap()`
3. 统一 effective required 计算（`isFieldEffectivelyRequired` 改为从 materialize 结果读取）
4. validator 与 field chrome 共享同一份 materialization service

不需要：非 form scope 所有权。

**Phase 1 的依赖图策略（重要）**：Phase 1 在现有 `dependents` 图基础上扩充表达式依赖路径，无需重建整个图。`dependents` 图在 Phase 1 后已包含表达式依赖，但 `validateAt` 的 closure 扩展（§17 Step 1）在 Phase 1 中仍走现有路径——即当 `role` 变化时，依赖 `role` 的字段会在下次自身被触发验证时读到最新 materialized rule，但不会因 `role` 写入而自动触发重验。

自动依赖 push 通知（`role` 变化 → 所有依赖 `role` 的字段自动重验）在 Phase 2 中通过完整 closure 扩展实现。

**Phase 1 的 effectiveRequired 行为**：`effectiveRequired`（字段标签上的 `*` 标记）在 Phase 1 中与 validation 结果一样是懒惰的——只在 field 下次被触发验证时通过 materialization 重计算。这意味着 `role` 切换后、用户未重新触碰字段时，`*` 标记和 required 错误都不会立即更新。这是已知的 Phase 1 限制，Phase 2 通过自动 closure push 解决。

**验收**：
- `required: "${role === 'admin'}"` — 手动触发 field 的 blur/change 时，required 状态正确反映当前 role 值
- `minLength: "${policy.min}"` — 同上
- 所有现有静态规则测试通过

### Phase 2: 参与模型清理

实现：

1. 明确区分 compiled structure、registration state、field validation state 三层
2. 将 `hiddenFields: Set<string>` 扩展为完整 `FormFieldRegistry`
3. `validateAll()` 改为 compiled traversal order ∩ registry registered paths
4. 各 field renderer `useEffect` 从 `notifyFieldHidden` 切换到 `registry.register`
5. 结构变化（variant switch、array row 增删）的副作用清理语义（§18）
6. 完整 closure 扩展：`validateAt` 触发时自动将依赖了 changed path 的表达式字段纳入本轮验证

**Phase 2 验收**（新增）：`role` 写入后触发 `validateAt('role', 'change')`，所有声明了 `required: "${role === 'admin'}"` 的字段自动进入本轮 closure 并重验。

### Phase 3: 通用 ValidationScopeRuntime

实现：

1. 从现有 `FormRuntime` 提取 `ValidationScopeRuntime` 基类（submit/UX 无关的部分）
2. `FormRuntime` 保持原有接口，内部 extends ValidationScopeRuntime
3. **引入 `OwnerQualifiedPath` 作为内部记账 key**（async run ownership、validation state bucket、materialization cache），替换 plain path key，保证多 owner 并存时路径隔离正确
4. 非 form scope（带 `scopeId` 的 hbox、container 等）在编译期有 field tree 时，运行时创建 ValidationScopeRuntime
5. field renderer 双轨逻辑从"有 form 才验证"改为"有 scope runtime 就验证"
6. child draft scope 直接复用 ValidationScopeRuntime，无需专门工厂函数
7. 嵌套 owner 创建时，父 owner 自动初始化 `ChildValidationContract`，默认模式见 §22

**注**：`OwnerQualifiedPath` 在 Phase 1–2 中以 `{ ownerId: formScopeId, path }` 形式存在但 ownerId 固定（单 FormRuntime 场景），引入成本极低。Phase 3 中 ownerId 真正区分多个并发 owner。

### Phase 4: 高级 Owner 编排

按需实现：

1. 更强的 active instance graph 优化
2. owner-local caching 细化
3. 更丰富的 child scope gating contract（`ChildValidationContract` 完整实现）
4. 更高级的 dynamic overlay 管理

---

## 26. 最终决策

Flux validation 使用以下最终架构：

1. 编译期 validation 模板图是主要真相来源
2. 每个具备 validation 能力的 scope 通过 `ValidationScopeRuntime` 拥有 validation
3. `FormRuntime` 是该 runtime 的特化，不是唯一的 owner 模型
4. 运行时 field registration 补充 active participation，但不替代 compiled graph
5. field-addressed validation state 存储在 field 上，由 owning scope runtime 协调
6. rules 编译为模板，每次 run 时 materialize
7. 局部 validation 是 owner-scoped 且 path-aware 的
8. draft validation 在 child scope 中隔离直到 commit
9. 非 form scope 是一等公民，不是降级 fallback
