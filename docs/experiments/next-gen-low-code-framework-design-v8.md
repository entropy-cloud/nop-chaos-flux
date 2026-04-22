# 下一代声明式低代码 DSL 运行时 — v8 架构设计

> **文档性质**: 从零出发的完整架构设计，仅基于需求规格说明和设计原则文档，不参考任何已有实现。
>
> **设计目标**: 在理论完备性、工程可实现性、性能边界、可扩展性四个维度上，超越当前所有主流低代码框架。
>
> **版本历史**: v8.0 初稿 → v8.1 经三轮独立审查（架构审查、AMIS 对标、响应式专家审查）修订。

---

## 0. 设计哲学

本设计由六条不可协商的原则驱动，它们在后续每一层设计中反复出现、彼此约束：

| # | 原则 | 核心断言 |
|---|------|---------|
| P1 | DSL 优先 | Schema 是平台一级制品，拥有独立于运行时的结构操作空间 |
| P2 | 编写-执行分离 | 编写态与执行态由预编译边界分隔，两侧优化目标不同 |
| P3 | 响应式数据驱动 | 运行时以动态求值、依赖追踪、定点失效为核心节拍 |
| P4 | 渐进式演化 | 复杂度从简单形式自然生长，不膨胀原语集 |
| P5 | 词法所有权 | 数据、能力、资源、反应跟随词法/子树边界归属 |
| P6 | 领域隔离 | 核心提供小而稳的执行内核，领域复杂度留在核心之外 |

这些原则不是装饰——当两个设计选项冲突时，由原则裁决。

---

## 1. 架构总览

### 1.1 五层模型

```
┌──────────────────────────────────────────────────────────────┐
│                    Rendering Host Layer                       │
│            (React / Vue / Vanilla — 可替换宿主)                │
├──────────────────────────────────────────────────────────────┤
│                    Runtime API Surface                        │
│     (Observers / Selectors — 渲染宿主与运行时的唯一接触面)       │
├──────────────────────────────────────────────────────────────┤
│                    Reactive Kernel                            │
│  ┌────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ Scope Graph│ Dependency   │ Value        │ Action       │ │
│  │ (词法环境)  │ Tracker      │ Evaluator    │ Dispatcher   │ │
│  │            │ (依赖追踪)    │ (求值器)      │ (动作派发)   │ │
│  └────────────┴──────────────┴──────────────┴──────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                    Expression Engine                          │
│        (编译型表达式语言 — 无 eval / new Function)              │
├──────────────────────────────────────────────────────────────┤
│                    Capability Registry                        │
│    (平台动作 / 组件实例动作 / 命名空间动作 — 三层解析)           │
└──────────────────────────────────────────────────────────────┘
```

**关键决策**:
- 渲染宿主是可替换的——Runtime API Surface 是唯一的耦合点
- Reactive Kernel 不依赖任何 UI 框架——可以在 Node.js 中测试
- Expression Engine 是纯函数式的——编译一次，执行多次，无副作用
- Capability Registry 是分层的——平台 < 组件实例 < 命名空间，词法解析

### 1.2 编译管线

```
Authoring Schema (JSON)
       │
       ▼
  ┌─────────────┐
  │ Transformer  │ ← i18n 替换、权限裁剪、feature flag、
  │   Layer      │   继承合并、片段组合、默认展开
  └─────┬───────┘
        │ Final Schema (已组装、已裁剪)
        ▼
  ┌─────────────┐
  │  Compiler    │ ← 类型解析、值 IR 编译、Region 提取、
  │   Pipeline   │   Action DAG 组装、校验图构建
  └─────┬───────┘
        │ Execution Package (不可变)
        ▼
  ┌─────────────┐
  │  Instantiator│ ← 为每个运行时实例创建状态
  │              │   绑定 Scope、注入宿主能力
  └─────┬───────┘
        │ Runtime Instance
        ▼
    [Reactive Kernel + Rendering Host]
```

每一阶段产出的都是**不可变**结构。编译管线是纯函数式的：相同输入必定产出相同输出。

### 1.3 数据流方向

```
                 读路径 (Pull)
    ┌──────────────────────────────────────┐
    │                                      │
    │  Renderer ──→ ScopeRef ──→ Value IR ──→ Expression
    │                                      │
    └──────────────────────────────────────┘

                 写路径 (Push through Capability)
    ┌──────────────────────────────────────┐
    │                                      │
    │  User Event ──→ Action ──→ Capability ──→ Scope Write / API / Navigation
    │                                      │
    └──────────────────────────────────────┘
```

读写严格分离。读路径是响应式的（依赖追踪 → 自动重求值），写路径是命令式的（通过 Capability 派发）。两者唯一的交汇点是 Reaction——数据变化触发动作，但中间必须经过显式声明。

---

## 2. Schema 结构模型

### 2.1 节点模型

Schema 是一棵节点树。每个节点具有以下结构：

```typescript
interface SchemaNode {
  type: string;
  id?: string;
  [key: string]: SchemaValue;
}

type SchemaValue =
  | LiteralValue
  | ExpressionValue
  | TemplateValue
  | ActionValue
  | DataSourceValue
  | RegionValue
  | ConditionalValue
  | LoopValue;
```

### 2.2 值的分类与 IR

这是整个编译管线的关键设计——所有值形式在编译阶段被归一化为统一的 Value IR。

#### 2.2.1 值形式谱系

```
Literal ─────────────────────────────────────────────→ StaticValue
   │                                                      │
Expression ──────────────────────────────────────────→ DynamicValue
   │                                                      │
Template ("Hello ${name}") ─────────────────────────→ DynamicValue
   │                                                      │
Action-based (async producer) ─────────────────────→ DynamicValue
   │                                                      │
Named DataSource (lifecycle producer) ─────────────→ ResourceValue
```

#### 2.2.2 Value IR 定义

```typescript
type ValueIR =
  | { kind: 'static'; value: unknown }
  | { kind: 'dynamic'; exprId: number; dependencies: ReadonlyArray<string> }
  | { kind: 'resource'; resourceId: number; strategy: RefreshStrategy }
  | { kind: 'slot'; regionId: number; params: string[] };
```

**StaticValue 零开销保证**：编译后，纯静态值直接内联到 Execution Package，运行时不经过求值器。

#### 2.2.3 渐进式值语义

| 层级 | 声明形式 | 编译产物 | 运行时行为 |
|------|---------|---------|-----------|
| L0 | `"Hello"` | `StaticValue("Hello")` | 直接返回，零开销 |
| L1 | `"${user.name}"` | `DynamicValue(expr#42, deps=["user.name"])` | 首次求值，缓存，依赖变更时重求值 |
| L2 | `"Hello ${user.name}"` | `DynamicValue(expr#43, deps=["user.name"])` | 同 L1，模板编译为拼接表达式 |
| L3 | `{ action: "ajax", url: "..." }` | `DynamicValue(expr#44, deps=[])` | 异步求值，发布结果 |
| L4 | `{ name: "ds", action: "ajax", ... }` | `ResourceValue(res#1, strategy=manual)` | 带生命周期管理的持续值发布 |

消费者端的读值方式在 L0-L4 之间完全一致——都是通过 ScopeRef 的 `resolve(path)` 接口。这是渐进式演化的核心体现：复杂度增长不改变消费模式。

### 2.3 区域 (Region) 模型

区域是节点的子节点容器，编译时提取为独立的渲染句柄：

```typescript
interface RegionIR {
  id: number;
  name: string;
  params: string[];
  children: TemplateIR[];
  isolated: boolean;
  defaultIsolated: boolean;
}

interface TemplateIR {
  id: number;
  node: ExecutionNode;
  conditional?: {
    when: ValueIR;
  };
  loop?: {
    collection: ValueIR;
    itemVar: string;
    indexVar: string;
    isolated: boolean;
  };
}
```

**参数化区域**：区域的参数在求值时注入到子数据环境中。例如表格列区域声明 `params: ["record", "index"]`，渲染时每行创建独立 Scope，将 `record` 和 `index` 绑定进去。在表达式中，参数通过区域声明的参数名直接访问（如 `${record.name}`）。也可通过 `$slot` 前缀访问（如 `${$slot.record.name}`），`$slot` 是所有区域参数的统一命名空间——在嵌套区域场景中可消除歧义。

**隔离默认值规则**：
- 表格行区域 (`columns`)：`isolated` 默认为 `true`
- 其他区域：`isolated` 默认为 `false`
- `defaultIsolated` 记录默认值，以便 Schema 可以显式覆盖

---

## 3. 编译管线

### 3.1 编译阶段

编译管线由四个顺序阶段组成，每个阶段的输入输出都是不可变结构：

```
Stage 1: Parse          → SchemaNode tree (AST)
Stage 2: Transform      → TransformedNode tree (已展开继承、i18n、裁剪)
Stage 3: Compile        → ExecutionPackage (不可变执行包)
Stage 4: Diagnose       → Diagnostic[] (诊断信息，不修改执行包)
```

#### Stage 1: Parse

```typescript
function parse(input: string | JsonObject): SchemaNodeTree {
  // JSON 解析 + 基本结构校验
}
```

#### Stage 2: Transform (编写态变换)

此阶段处理所有 DSL 层面的结构操作，不影响运行时行为：

| 变换 | 说明 | 何时执行 |
|------|------|---------|
| 继承合并 | `x:extends` 式继承与覆写，定义明确的合并语义（数组覆盖、对象深度合并、`x:override` 强制替换） | 装配时 |
| 片段组合 | `$ref` 引用并内联外部片段 | 装配时 |
| i18n 替换 | 匹配 `i18n:flux.xxx` 模式，替换为 `messages[prefix + key]`，fallback 到默认 locale | 装配时 |
| 权限裁剪 | 删除当前用户无权访问的节点 | 装配时 |
| Feature Flag | 删除被 flag 关闭的分支 | 装配时 |
| 默认展开 | 填充未声明的默认值 | 编译时 |

**关键约束**: 变换阶段不引入任何运行时概念——它只操作 SchemaNode 结构。

#### Stage 3: Compile (编译核心)

```typescript
interface ExecutionPackage {
  root: ExecutionNode;
  expressions: ReadonlyExpressionTable;
  resources: ReadonlyResourceTable;
  validations: ReadonlyValidationTable;
  actions: ReadonlyActionTable;
  regions: ReadonlyRegionTable;
  diagnostics: readonly Diagnostic[];
}
```

**ExecutionNode 定义**：

```typescript
interface ExecutionNode {
  templateId: number;
  typeId: string;
  props: Readonly<Record<string, ValueIR>>;
  meta: {
    visible: ValueIR;
    when: ValueIR | null;
    className: ValueIR;
    disabled: ValueIR;
  };
  regions: Readonly<Record<string, RegionIR>>;
  events: Readonly<Record<string, ActionRef>>;
  scopeDecl: ScopeDeclaration | null;
  resourceDecls: readonly ResourceDeclaration[];
  reactionDecls: readonly ReactionDeclaration[];
}
```

#### Stage 4: Diagnose

诊断阶段检查编译产物的正确性，产出诊断信息但不修改执行包：

- 类型不匹配（渲染器未注册、属性类型错误）
- 无效引用（表达式引用了不存在的路径）
- 校验规则冲突
- 动作链中的死路径
- 循环依赖检测（Resource A → Resource B → Resource A）

### 3.2 编译不变量

| 不变量 | 含义 |
|--------|------|
| 幂等性 | 相同输入 → 相同输出，无隐藏状态 |
| 单调性 | 编译只产出结构，不丢失信息（诊断独立产出） |
| 边界纯净 | Stage 2 结束后不再有编写态概念 |
| 引用完整 | 所有 ValueIR 引用的 exprId/resourceId 在表中存在 |

### 3.3 全局表设计

```typescript
interface ReadonlyExpressionTable {
  readonly entries: ReadonlyMap<number, CompiledExpression>;
}

interface CompiledExpression {
  readonly id: number;
  readonly ast: ExprAST;
  readonly staticDependencies: readonly string[];
  readonly isPure: boolean;
}
```

循环体内的表达式只编译一次，多个实例共享同一个 CompiledExpression。依赖追踪在 AST 级别进行精确分析。

---

## 4. 表达式引擎

### 4.1 设计目标

1. **编译一次，执行多次** — 表达式在首次遇到时编译为 AST/字节码
2. **禁止动态代码生成** — 不使用 `eval`、`new Function`、`with`
3. **依赖自动收集** — 执行时自动记录读取了哪些路径
4. **确定性** — 相同输入 + 相同上下文 → 相同输出
5. **可扩展** — 宿主和域控件可以注册自定义函数

### 4.2 表达式语言

#### 语法

```
expression := literal | path | unary_op expression | expression binary_op expression
            | function_call | ternary | object_literal | array_literal
            | filter_expression

path       := identifier ('.' identifier)* | identifier '[' expression ']'
function_call := identifier '(' (expression (',' expression)*)? ')'
ternary    := expression '?' expression ':' expression
unary_op   := '!' | '-'
binary_op  := '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '>' | '<=' | '>='
            | '&&' | '||' | '??'
literal    := string | number | boolean | null
filter_expression := expression '|' identifier (':' expression)*
```

**管道过滤器语法**：受 AMIS 和 Liquid 启发，支持链式变换：

```
${date | formatDate:'YYYY-MM-DD'}
${name | trim | lower}
${items | filter:{active: true} | map:'name'}
```

过滤器编译为标准函数调用：`formatDate(date, 'YYYY-MM-DD')`。

#### 内置函数

| 类别 | 函数 |
|------|------|
| 数学 | `abs`, `ceil`, `floor`, `round`, `max`, `min` |
| 字符串 | `len`, `upper`, `lower`, `trim`, `split`, `join`, `startsWith`, `endsWith`, `includes` |
| 集合 | `count`, `filter`, `map`, `reduce`, `find`, `some`, `every`, `sort`, `slice`, `includes`, `pick`, `groupBy` |
| 类型 | `typeof`, `isArray`, `isObject`, `isNil`, `isEmpty` |
| 路径 | `get(obj, path)`, `has(obj, path)`, `pick`, `omit` |
| 日期 | `now`, `formatDate`, `parseDate` |
| 逻辑 | `if(cond, then, else)`, `switch(val, ...cases)` |
| 过滤器 | `trim`, `lower`, `upper`, `date`, `number`, `json`, `raw`, `default` |

#### 自定义函数注册

```typescript
interface ExpressionFunctionRegistry {
  register(name: string, fn: ExpressionFunction, options?: FunctionOptions): void;
  unregister(name: string): void;
  resolve(name: string): ExpressionFunction | null;
}

interface ExpressionFunction {
  (args: unknown[], ctx: EvalContext): unknown;
}

interface FunctionOptions {
  namespace?: string;
  pure: boolean;
  lazy?: boolean;  // true = 不预先求值参数，函数自行决定何时求值（用于短路逻辑函数如 &&）
}
```

这允许域控件注册自定义表达式函数（如 `spreadsheet.evalFormula`），而不修改核心语法。

#### 求值上下文接口

```typescript
interface EvalContext {
  resolve(path: string, tracker: DependencyTracker): unknown;
  has(path: string): boolean;
}
```

**关键不变量**：`resolve()` **必须**接收 `tracker` 参数。所有数据访问必须经过 `resolve()`，不允许绕过 tracker 直接访问 Scope 数据。表达式编译器将嵌套属性访问展平为全限定路径：`obj.a.b` 编译为单次 `resolve("obj.a.b")` 调用，而非 `resolve("obj").a.b`。

### 4.3 编译与执行

```
源字符串 → Lexer → Parser → AST → (首次) → AST Evaluator
                                    → (可选优化) → Bytecode → VM
```

#### AST Evaluator

```typescript
function evaluate(ast: ExprAST, ctx: EvalContext, tracker: DependencyTracker): unknown {
  switch (ast.type) {
    case 'Literal': return ast.value;
    case 'Path': return ctx.resolve(ast.path, tracker);
    case 'BinaryOp':
      return applyOp(
        evaluate(ast.left, ctx, tracker),
        ast.op,
        evaluate(ast.right, ctx, tracker)
      );
    case 'FunctionCall': {
      const fn = resolveFunction(ast.name);
      const args = ast.args.map(a => evaluate(a, ctx, tracker));
      return fn(args, ctx);
    }
    case 'Filter': {
      const value = evaluate(ast.input, ctx, tracker);
      const filterArgs = ast.args.map(a => evaluate(a, ctx, tracker));
      return resolveFilter(ast.name)([value, ...filterArgs], ctx);
    }
  }
}
```

#### 依赖收集机制

```typescript
class DependencyTracker {
  private currentFrame: Set<string>;

  beginEvaluation(): void { this.currentFrame = new Set(); }
  recordRead(path: string): void { this.currentFrame.add(path); }
  endEvaluation(): ReadonlySet<string> { return this.currentFrame; }
}
```

每次求值调用 `beginEvaluation()` 开始，执行过程中自动记录所有读取的路径，`endEvaluation()` 返回本次依赖集合。

**错误处理**：如果求值过程中抛出异常，`endEvaluation()` 必须在 `finally` 块中调用。部分收集的依赖集合仍然有效（已读取的路径确实是依赖），表达式被标记为"错误态"，下次任何相关路径变更时重新尝试求值。

### 4.4 求值缓存、失效与引用稳定

```typescript
interface CachedEvaluator {
  evaluate(exprId: number, ctx: EvalContext, tracker: DependencyTracker): unknown;
  invalidate(changedPaths: ReadonlySet<string>): ReadonlySet<number>;
  getCachedValue(exprId: number): unknown;
  isInvalidated(exprId: number): boolean;
}
```

**依赖集合替换不变量**：每次重新求值后，缓存的依赖集合被**原子替换**。上一次求值的依赖路径中，不在新依赖集合中的路径自动从反向索引中移除（依赖 GC）。

#### 失效算法：前缀匹配

失效检查必须支持**前缀匹配**，以确保正确性：

```typescript
invalidate(changedPaths: ReadonlySet<string>): ReadonlySet<number> {
  const result = new Set<number>();
  for (const changed of changedPaths) {
    // 精确匹配
    for (const exprId of this.reverseIndex.get(changed) ?? []) result.add(exprId);
    // 前缀匹配：写入 "user" 使依赖 "user.name" 的表达式失效
    for (const [depPath, exprIds] of this.reverseIndex) {
      if (depPath.startsWith(changed + '.') || depPath.startsWith(changed + '[')) {
        for (const exprId of exprIds) result.add(exprId);
      }
    }
  }
  return result;
}
```

**替代方案（更高效）**：在求值时，将路径的**所有前缀**也记录为依赖。例如读取 `user.name` 时，同时记录 `user` 和 `user.name`。这样失效检查只需要精确匹配：

```typescript
recordRead(path: string): void {
  this.currentFrame.add(path);
  // 记录所有前缀路径
  const parts = path.split('.');
  for (let i = 1; i < parts.length; i++) {
    this.currentFrame.add(parts.slice(0, i).join('.'));
  }
}
```

具体使用哪种策略由实现选择，但失效算法**必须**保证：当 `user` 被整体替换时，依赖 `user.name` 的表达式也会被标记为失效。

**引用稳定保证**：当依赖未变更时，`getCachedValue` 返回与上次完全相同的引用（`===`），避免下游不必要的重渲染。

---

## 5. 词法数据环境 (Scope Graph)

### 5.1 Scope Graph 模型

数据环境不是扁平的对象，而是一棵**词法作用域树**：

```typescript
interface ScopeRef {
  readonly id: number;
  readonly parent: ScopeRef | null;
  readonly owner: ExecutionNode;
  readonly isDisposed: boolean;

  resolve(path: string, tracker: DependencyTracker): unknown;
  has(path: string): boolean;
  resolveOwn(path: string): unknown;

  subscribe(paths: ReadonlyArray<string>, callback: () => void): Unsubscribe;

  createChild(ownData?: Record<string, unknown>, options?: ScopeOptions): ScopeRef;
  dispose(): void;
}

interface ScopeOptions {
  isolated: boolean;
  projections: Readonly<Record<string, ValueIR>>;
}
```

**写接口独立分离**（不暴露在 ScopeRef 公共接口上）：

```typescript
interface ScopeWriteAccess {
  write(path: string, value: unknown): void;
  applyPatch(patch: ReadonlyArray<PatchOperation>): void;
}
```

`ScopeWriteAccess` 只通过 Capability 内部机制获取。具体机制：Capability 在执行动作时，创建一个 `ActionExecutionContext`，其中包含 `ScopeWriteAccess`。只有通过 `CapabilityDispatcher.dispatch()` 进入的动作处理器才能获得写权限：

```typescript
interface ActionExecutionContext {
  write: ScopeWriteAccess;
  scope: ScopeRef;
  host: HostIntegration;
}

type CapabilityHandler = (args: Record<string, unknown>, ctx: ActionExecutionContext) => Promise<ActionResult>;
```

内置动作（如 `setValue`、`ajax`）和注册的命名空间方法都通过此接口访问写能力。外部消费者（如渲染器）永远无法直接获取 `ScopeWriteAccess`。

### 5.2 路径解析算法

```
resolve(scope, "user.name", tracker):
  1. 查 ownData["user.name"] → 找到则 recordRead + 返回
  2. 查 ownData["user"] → 如果是对象，取 .name → recordRead("user.name") + 返回
  3. 检查 projections["user.name"] → 如果存在，求值投影表达式 + 返回
  4. 如果 !isolated && parent ≠ null → resolve(parent, "user.name", tracker)
  5. 返回 undefined
```

**路径解析缓存**：每个 ScopeRef 维护一个 `resolvedPathCache: Map<string, { found: boolean, scopeId: number }>`，在自身或任何祖先 Scope 被写入时失效。对于高频读取的路径，缓存将 O(d) 查找降为 O(1)。

### 5.3 词法所有权规则

| 实体 | 归属规则 |
|------|---------|
| ScopeRef | 跟随创建它的节点 |
| Resource | 绑定目标按词法所有权确定 ScopeRef |
| Reaction | 跟随声明它的节点所属的 ScopeRef |
| ComponentHandle | 跟随渲染它的节点所属的 ScopeRef |
| NamespaceRegistry | 跟随声明命名空间的节点的 ScopeRef |

**关键约束**：
- 同一拥有 Scope 内，同一 binding target 不应被两个同时活跃的发布型生产者占有
- Resource 写入的数据变更**不触发**该 Resource 自身的刷新（自写保护）
- 子 Scope 通过词法遮蔽覆盖父级发布，而非全局覆盖

### 5.4 变更传播与跨 Scope 订阅

```typescript
interface ScopeChange {
  paths: ReadonlySet<string>;
  source: 'write' | 'resource' | 'projection';
  sourceId: number;
}

interface ChangePropagator {
  onPathsChange(paths: ReadonlySet<string>, callback: (change: ScopeChange) => void): Unsubscribe;
  notify(change: ScopeChange): void;
  settle(): SettlementResult;
}
```

**跨 Scope 依赖**：当子 Scope 解析一个路径时，如果该路径来自父 Scope，子 Scope 必须在父 Scope 的 `ChangePropagator` 上订阅该路径。这创建了**跨 Scope 依赖边**：

```typescript
interface ScopeAwareDepIndex {
  localDeps: ReadonlyMap<string, ReadonlySet<ConsumerRef>>;
  childDeps: ReadonlyMap<string, ReadonlySet<number>>;
}
```

当父 Scope 的路径变更时：
1. 本地消费者通过 `localDeps` 查找并标记失效
2. 依赖该路径的子 Scope 通过 `childDeps` 查找，并向子 Scope 传播变更

**变更传播流程**：

```
写入 → ChangePropagator.notify()
         │
         ├─→ 收集所有受影响的路径（含前缀匹配）
         ├─→ 查找依赖这些路径的表达式 → 标记失效
         ├─→ 查找依赖这些路径的资源 → 按策略标脏
         ├─→ 查找依赖这些路径的反应 → 加入待触发队列
         ├─→ 向依赖这些路径的子 Scope 传播
         │
         └─→ settle() 返回结算结果
```

### 5.5 Scope 生命周期与内存管理

```typescript
interface ScopeRef {
  dispose(): void;
  readonly isDisposed: boolean;
}
```

**dispose 语义**：
1. 从父 Scope 的 `childDeps` 中移除自身
2. 取消所有在父 Scope 上的订阅
3. 停止所有拥有 Scope 内的 Resource（取消进行中的请求）
4. 移除所有 Reaction
5. 清理求值缓存和反向依赖索引
6. 标记 `isDisposed = true`
7. 递归 dispose 所有子 Scope

**触发时机**：
- `when` 条件变为 false → 节点卸载 → 其 Scope 被 dispose
- 表格翻页 → 旧行 Scope 通过 `ScopePool` 回收
- Runtime unmount → 根 Scope dispose → 级联清理

**ScopePool（高频场景优化）**：

```typescript
interface ScopePool {
  acquire(data: Record<string, unknown>): ScopeRef;
  release(scope: ScopeRef): void;
  drain(): void;
}
```

表格虚拟滚动使用 ScopePool：行滚出可见区域时 `release`，行滚入时 `acquire`。释放的 Scope 清理 ownData 和求值缓存，但复用内部数据结构以避免 GC 压力。

### 5.6 高频隔离：表格行

```typescript
for (const [index, record] of records.entries()) {
  const rowScope = parentScope.createChild(
    { record, index },
    { isolated: true, projections: { totalCount: totalExpr } }
  );
}
```

隔离的含义：
- **不继承父级** — 行内表达式不读取页面级数据（除非显式投影）
- **行间隔离** — 修改一行的数据不影响其他行的依赖
- **显式投影** — 隔离环境若需要外部数据，必须通过 `projections` 显式声明
- **延迟创建** — 配合虚拟滚动，只创建可见行的 Scope

---

## 6. 响应式系统

### 6.1 三类消费者

| 消费者 | 依赖变更后果 | 触发方式 |
|--------|-------------|---------|
| **Value** | 重新计算该值（lazy, pull-based） | 下次读取时 |
| **Resource** | 按策略刷新（重新请求/重新计算） | settle 后异步刷新 |
| **Reaction** | 评估条件，可能触发 Capability 派发 | settle 末尾执行 |

### 6.2 Value 求值生命周期

```
              ┌───────────────────────────────────────┐
              │                                       │
   首次读取 ──→ 求值 + 收集依赖 ──→ 缓存值 + 缓存依赖  │
              │       │                               │
              │   依赖变更 ──→ 标记失效                 │
              │       │                               │
              │   再次读取 ──→ 重新求值 + 原子替换依赖   │
              │                                       │
              └───────────────────────────────────────┘
```

**依赖替换原子性**：重新求值后，旧依赖集合从反向索引中移除，新依赖集合插入反向索引。这两个操作在同一个同步块中完成，保证不会出现依赖丢失。

### 6.3 Resource 生命周期

```
     Mount (节点激活)
       │
       ├─→ 初始加载 (首次求值生产者)
       │    └─→ 发布值到 ScopeRef
       │    └─→ 发布 loading/error 状态
       │
       ├─→ 按策略刷新
       │    ├─ manual: 仅手动刷新
       │    ├─ polling: 定时轮询
       │    └─ onDependencyChange: 依赖变更时刷新
       │
       ├─→ 竞态处理：加载中的 Resource 收到新刷新请求
       │    ├─ 取消进行中的请求（AbortController）
       │    ├─ 如有 debounceMs，重置计时器
       │    └─ 立即启动新请求
       │
       ├─→ 自写保护：Resource 写入的变更不触发自身刷新
       │
       └─→ Unmount (节点失活 / Scope dispose)
            └─→ 取消进行中的请求
            └─→ 清理资源状态
            └─→ 释放引用（协助 GC 大对象）
```

```typescript
interface ResourceDeclaration {
  id: number;
  name: string;
  bindingPath: string;
  producer: ValueIR;
  strategy: RefreshStrategy;
  loadingStatePath: string;
  errorStatePath: string;
}

type RefreshStrategy =
  | { type: 'manual' }
  | { type: 'polling'; intervalMs: number }
  | { type: 'onDependencyChange'; debounceMs?: number };
```

**Resource 依赖排序**：编译时构建 Resource 间依赖 DAG（如果 Resource A 写入 `data.x` 而 Resource B 依赖 `data.x`，则 B 必须在 A 完成后刷新）。同一拓扑层级的 Resource 可并行刷新。运行时按拓扑序执行刷新。

### 6.4 Reaction

```typescript
interface ReactionDeclaration {
  id: number;
  observe: ValueIR;
  when: ValueIR;
  action: ActionRef;
  debounceMs?: number;
}
```

执行语义：
1. 每次 settle 末尾检查被观察值的依赖是否变更
2. 如果变更，求值 `when` 条件
3. 如果条件为 truthy，将动作加入**下一轮** Settled Update Turn（deferred，不在当前 Turn 内同步执行）
4. Reaction 只通过 Capability 派发，不直接修改数据

**Deferred 执行是关键**：Reaction 不在当前 settle 内同步执行，避免 re-entrancy。Reaction 的动作写入进入下一个 Turn 的批处理队列。

### 6.5 Settled Update Turn

一个 Settled Update Turn 是从数据写入到快照发布的原子过程。

#### Settle 控制器

```typescript
interface SettleController {
  readonly turnDepth: number;
  readonly maxTurnDepth: number;

  scheduleSettle(): void;
  settleNow(): SettlementResult;
  batch(fn: () => void): SettlementResult;

  readonly isSettling: boolean;
}
```

#### Settle 流程

```
batch(fn) 或 scheduleSettle():
  │
  ├─→ 1. 执行所有写入（batch 模式下收集，scheduleSettle 模式下微任务触发）
  ├─→ 2. ChangePropagator.notify(allChangedPaths)
  ├─→ 3. 计算受影响的消费者（含前缀匹配、跨 Scope 传播）
  ├─→ 4. settle():
  │      ├─ 标记失效 Value
  │      ├─ 标脏 Resource（记录拓扑序）
  │      └─ 收集待触发 Reaction（不立即执行）
  ├─→ 5. 异步刷新标脏 Resource（按拓扑序，同层级并行）
  │      └─ Resource 完成后的写入进入下一 Turn
  ├─→ 6. 执行收集的 Reaction（deferred，写入进入下一 Turn）
  ├─→ 7. 检查 turnDepth < maxTurnDepth
  │      └─ 如有新写入 → turnDepth++ → 回到步骤 2
  │      └─ 超过 maxTurnDepth → 抛出 CascadeOverflowError）
  │
  │  CascadeOverflowError 语义：溢出 Turn 中的部分写入已提交到 Scope，
  │  系统处于一致但可能不完整的状态。错误附带完整写入链路，
  │  宿主可选择展示错误提示或回退到最后一个一致快照。
  └─→ 8. 发布一致快照
```

**关键语义**：

1. **批处理**：`batch(fn)` 内的所有写操作合并为一次 settle。默认调度通过 `queueMicrotask` 合并同一微任务内的多次写入。

2. **级联深度保护**：`maxTurnDepth` 默认为 10。Resource 写入或 Reaction 执行可能触发新的 settle Turn。超过限制时抛出 `CascadeOverflowError`，附带完整的写入链路信息用于调试。

3. **一致性保证**：快照在所有同步 settle 完成后发布。Resource 的异步刷新完成后触发新的 Turn 和新的快照。渲染宿主在每个快照中看到的数据是**一致的**——不会看到同一个依赖链中部分更新部分陈旧的状态。

4. **Glitch-free**：在同一 Turn 内，即使 A 依赖 B 依赖 C 且 C 变更，消费者读取 A 时会触发完整的级联 pull 求值（C → B → A），确保读到最终一致的结果。

---

## 7. 动作系统

### 7.1 动作模型

动作是声明式的副作用描述。Schema 中声明的动作在编译阶段被组装为**有向无环执行图 (DAG)**。

```typescript
type ActionRef = number;

interface ActionTable {
  entries: ReadonlyMap<number, ActionDAG>;
}

interface ActionDAG {
  id: number;
  root: ActionNode;
}

type ActionNode =
  | SingleAction
  | ConditionalAction
  | SequentialAction
  | ParallelAction
  | RetryAction;

interface SingleAction {
  type: 'single';
  action: string;
  args: Readonly<Record<string, ValueIR>>;
  timeoutMs?: number;
}

interface ConditionalAction {
  type: 'conditional';
  when: ValueIR;
  then: ActionNode;
  else?: ActionNode;
}

interface SequentialAction {
  type: 'sequential';
  steps: readonly ActionNode[];
  resultBinding?: string;
}

interface ParallelAction {
  type: 'parallel';
  branches: readonly ActionNode[];
  strategy: ParallelStrategy;
}

type ParallelStrategy =
  | { type: 'all'; cancelOnError: boolean }
  | { type: 'race' }
  | { type: 'allSettled' };

interface RetryAction {
  type: 'retry';
  inner: ActionNode;
  maxAttempts: number;
  delayMs: number;
  backoff: 'fixed' | 'exponential';
}
```

### 7.2 动作结果

```typescript
type ActionResult =
  | { status: 'success'; value: unknown }
  | { status: 'error'; error: unknown; recoverable: boolean }
  | { status: 'skipped' };

interface AggregateActionResult {
  status: 'success' | 'partial' | 'error';
  results: readonly ActionResult[];
  values: readonly unknown[];
  errors: readonly unknown[];
}

interface ActionContext {
  result: unknown;
  error: unknown;
  prevResult: unknown;
}
```

**并行执行错误语义**：

| Strategy | 分支失败时 | 结果类型 |
|----------|-----------|---------|
| `all` + cancelOnError | 取消其余分支，立即返回 error | `AggregateActionResult(status: 'error')` |
| `all` + !cancelOnError | 等待所有分支完成，收集所有结果 | `AggregateActionResult(status: 'partial'/'error')` |
| `race` | 第一个完成的分支胜出（无论成功失败） | 单个 `ActionResult` |
| `allSettled` | 等待所有分支完成，收集所有结果 | `AggregateActionResult(status: 'partial'/'success'/'error')` |

**Sequential 中的控制流分支**：`SequentialAction` 的步骤根据前一步的 `ActionResult.status` 决定是否继续：
- `success` → 继续下一步，`ActionContext.result` = 当前步骤的 value
- `error` → 跳过后续步骤，整个 Sequential 返回 error 结果（除非某步骤是 `ConditionalAction` 的 else 分支处理错误）
- `skipped` → 继续下一步，`ActionContext.result` = 前一步非 skipped 步骤的结果

### 7.3 动作能力三层解析

```
1. component:<method>  → ComponentHandleRegistry 查找
2. <namespace>:<method>  → NamespaceRegistry 查找（词法作用域）
3. <builtin-action>  → 平台内置动作注册表
```

#### 7.3.1 平台内置动作

| 动作 | 说明 | 参数 |
|------|------|------|
| `setValue` | 设置 Scope 中的值 | `path`, `value` |
| `applyPatch` | 结构化补丁写入 | `patch: PatchOperation[]` |
| `ajax` | 发起 HTTP 请求 | `url`, `method`, `params`, `body`, `headers`, `scopeInjection`, `adaptor`, `requestAdaptor` |
| `dialog` | 打开对话框 | `schema`, `data` |
| `closeDialog` | 关闭对话框 | `result` |
| `drawer` | 打开抽屉 | `schema`, `data` |
| `closeDrawer` | 关闭抽屉 | `result` |
| `submitForm` | 提交表单 | `validate: boolean` |
| `resetForm` | 重置表单 | — |
| `navigate` | 导航 | `url`, `target` |
| `confirm` | 确认对话框 | `message` |
| `toast` | 通知消息 | `message`, `level` |
| `refresh` | 刷新命名数据源 | `name` |
| `preventDefault` | 阻止默认行为 | — |
| `stopPropagation` | 阻止事件冒泡 | — |

#### 7.3.2 AJAX 作用域注入与适配器

```typescript
interface AjaxConfig {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;

  scopeInjection?: {
    mappings: Record<string, string>;
  };

  adaptor?: (response: unknown) => unknown;
  requestAdaptor?: (request: HttpRequestConfig) => HttpRequestConfig;
}
```

**scopeInjection**：声明式地将当前 Scope 变量注入到请求参数中：

```json
{
  "action": "ajax",
  "url": "/api/users/${userId}",
  "scopeInjection": {
    "mappings": {
      "token": "${auth.token}",
      "orgId": "${currentOrg.id}"
    }
  },
  "headers": {
    "Authorization": "Bearer ${token}"
  }
}
```

`adaptor` 和 `requestAdaptor` 是在宿主的 `httpClient` 调用前后执行的变换函数。这些函数运行在受控的沙箱环境中（使用同一表达式引擎），不使用 `new Function`。

#### 7.3.3 组件实例动作

```typescript
interface ComponentHandleRegistry {
  register(nodeId: string, methods: Record<string, (...args: unknown[]) => unknown>): void;
  unregister(nodeId: string): void;
  invoke(nodeId: string, method: string, args: unknown[]): unknown;
}
```

#### 7.3.4 命名空间动作

```typescript
interface NamespaceRegistry {
  register(namespace: string, methods: Record<string, (...args: unknown[]) => unknown>): void;
  unregister(namespace: string): void;
  invoke(qualified: string, args: unknown[]): unknown;
}
```

命名空间按词法作用域注册，子作用域可以注册自己的命名空间而不冲突。

### 7.4 Action DAG 编译示例

```json
{
  "onClick": {
    "action": "ajax",
    "url": "/api/save",
    "method": "POST",
    "body": "${formData}",
    "then": {
      "action": "toast",
      "message": "保存成功"
    },
    "onError": {
      "action": "toast",
      "message": "保存失败：${error.message}",
      "level": "error"
    }
  }
}
```

编译为 SequentialAction，then/onError 编译时展开为条件分支：

```typescript
SequentialAction {
  steps: [
    SingleAction {
      action: "ajax",
      args: { url: StaticValue("/api/save"), body: DynamicValue(expr#100) }
    },
    ConditionalAction {
      when: DynamicValue(expr#101, /* prevResult.status === 'success' */),
      then: SingleAction { action: "toast", args: { message: StaticValue("保存成功") } },
      else: SingleAction { action: "toast", args: { message: DynamicValue(expr#102), level: StaticValue("error") } }
    }
  ]
}
```

### 7.5 防抖与执行控制

```typescript
interface ActionExecutionOptions {
  debounceMs?: number;
  throttleMs?: number;
  timeoutMs?: number;
  cancelPrevious?: boolean;
}
```

---

## 8. 渲染与组件系统

### 8.1 渲染协议

```typescript
interface RenderHost {
  getSnapshot(nodeId: string): RenderSnapshot;
  subscribe(nodeId: string, callback: (snapshot: RenderSnapshot) => void): Unsubscribe;
  createRegionHandle(regionId: number, params?: Record<string, unknown>): RegionRenderHandle;
}

interface RenderSnapshot {
  props: Readonly<Record<string, unknown>>;
  meta: {
    visible: boolean;
    disabled: boolean;
    className: string;
    testid: string;
  };
  regions: Readonly<Record<string, RegionRenderHandle>>;
  events: Readonly<Record<string, (...args: unknown[]) => void>>;
}
```

**宿主无关性**：`RenderSnapshot` 是纯数据结构，不包含任何框架特定的概念。不同渲染宿主（React、Vue、Web Components、终端）各自实现如何将 `RenderSnapshot` 映射到自身的渲染模型。

### 8.2 组件注册表

```typescript
interface RendererRegistry {
  register(type: string, component: RendererComponent, typeContract?: RendererType): void;
  resolve(type: string): RendererComponent | null;
}

type RendererComponent = (snapshot: RenderSnapshot, hostAdapter: HostAdapter) => void;

interface HostAdapter {
  getContainer(): unknown;
  scheduleUpdate(callback: () => void): void;
  onUnmount(callback: () => void): void;
}
```

`RendererComponent` 通过 `HostAdapter` 与宿主交互，而非直接返回 element。这使得同一 renderer 可以在不同宿主中工作——React 宿主的 `scheduleUpdate` 使用 `useState` setter，Vue 宿主使用 `reactive`，Web Components 宿主使用 `requestAnimationFrame`。

### 8.3 容器与叶子分离

| 类别 | 例子 | 样式策略 | 标记类名 |
|------|------|---------|---------|
| **布局容器** | page, container, flex, panel, grid | 仅输出标记类名，零内置样式 | `nop-page`, `nop-container`, `nop-flex` |
| **控件组件** | input, select, table, code-editor | 完整自包含 UI 控件，内置视觉样式 | `nop-input`, `nop-table` |

布局容器不包含任何隐式样式。所有视觉样式由 Schema 的 `className` 驱动，运行时仅透传。

### 8.4 片段渲染

```typescript
interface FragmentRenderer {
  render(schema: SchemaNode, scope: ScopeRef, options?: FragmentOptions): RegionRenderHandle;
}

interface FragmentOptions {
  dataOverride?: Record<string, unknown>;
  scopeIsolated?: boolean;
}
```

### 8.5 条件激活 (when) vs 可见性 (visible)

| 维度 | visible | when |
|------|---------|------|
| 渲染 | display: none | 不渲染 |
| Scope | 仍存在于 Scope 树 | Scope 被 dispose |
| Resource | 继续运行 | 停止并 dispose |
| Validation | 继续参与校验 | 不参与校验 |
| Reaction | 继续监听 | 停止监听 |
| Component | 保持挂载 | 卸载，unregister handles |

### 8.6 复合组件模式

系统支持通过组合基元构建高级复合模式：

#### 8.6.1 CRUD 模式

CRUD 不是内置组件，而是由 table + form + search + resource 组合而成的模式：

```json
{
  "type": "container",
  "resources": [{
    "name": "listData",
    "action": "ajax",
    "url": "/api/items",
    "params": { "keyword": "${keyword}", "page": "${page}" },
    "strategy": { "type": "onDependencyChange", "debounceMs": 300 }
  }],
  "body": [
    { "type": "form", "name": "searchForm", "body": [
      { "type": "input-text", "name": "keyword" }
    ]},
    { "type": "table", "data": "${listData.items}", "columns": [...],
      "pagination": { "total": "${listData.total}" }
    },
    { "type": "button", "label": "新增",
      "onClick": { "action": "dialog", "schema": { "type": "form", "api": "/api/items", "body": [...] } }
    }
  ]
}
```

关键：Resource 自动响应搜索条件变更（`onDependencyChange` 策略），table 绑定 Resource 输出，新增按钮通过 dialog 打开表单。所有交互通过标准基元完成，不需要专门的 CRUD 组件。

#### 8.6.2 Wizard 模式

Wizard 由 DraftScope + 步骤控制 + 条件渲染组成：

```json
{
  "type": "wizard",
  "steps": [
    { "title": "基本信息", "body": [...fields], "validate": [...] },
    { "title": "详细信息", "body": [...fields], "validate": [...] }
  ],
  "onSubmit": { "action": "ajax", "url": "/api/save" }
}
```

Wizard 的运行时通过以下机制实现：
- 整体 Wizard 创建一个根 DraftScope
- 每个步骤是 DraftScope 的子区域
- 步骤切换时验证当前步骤的草稿
- 提交时 `commit()` 所有步骤草稿到最终 Scope
- `prev/next` 动作控制步骤索引

---

## 9. 表单与校验

### 9.1 表单运行时

```typescript
interface FormRuntime {
  readonly scopeRef: ScopeRef;

  getValues(): Readonly<Record<string, unknown>>;
  getDirtyFields(): ReadonlySet<string>;
  getVisitedFields(): ReadonlySet<string>;
  getErrors(): readonly ValidationError[];
  isSubmitting(): boolean;
  isValid(): boolean;
  isDirty(): boolean;

  setFieldValue(path: string, value: unknown): void;
  setFieldVisited(path: string): void;
  reset(): void;
  submit(): Promise<SubmitResult>;
  validate(options?: ValidateOptions): Promise<ValidationResult>;
}

interface SubmitResult {
  success: boolean;
  values: Readonly<Record<string, unknown>>;
  errors: readonly ValidationError[];
}
```

### 9.2 校验图

```typescript
interface ValidationGraph {
  rules: readonly ValidationRule[];
  fieldRuleMap: ReadonlyMap<string, readonly number[]>;
  objectRules: readonly number[];
  arrayRules: readonly number[];
}

type ValidationRule = FieldRule | ObjectRule | ArrayRule | ConditionalRule;

interface FieldRule {
  type: 'field';
  path: string;
  validator: ValidatorBuiltin | ValueIR;
  message: string | ValueIR;
  trigger: ValidationTrigger;
}

interface ObjectRule {
  type: 'object';
  validator: ValueIR;
  message: string | ValueIR;
  trigger: ValidationTrigger;
}

interface ArrayRule {
  type: 'array';
  path: string;
  validator: ValueIR;
  message: string | ValueIR;
  trigger: ValidationTrigger;
}

interface ConditionalRule {
  type: 'conditional';
  condition: ValueIR;
  rule: ValidationRule;
}

type ValidationTrigger = 'submit' | 'change' | 'blur';
```

### 9.3 校验执行

```typescript
interface ValidationExecutor {
  validate(trigger: ValidationTrigger, paths?: readonly string[]): Promise<ValidationResult>;
  validateSubtree(regionPath: string): Promise<ValidationResult>;
  cancel(): void;
}

interface ValidationResult {
  valid: boolean;
  errors: readonly ValidationError[];
  warnings: readonly ValidationWarning[];
}

interface ValidationError {
  path: string;
  ruleId: number;
  message: string;
  severity: 'error' | 'warning';
}
```

**取消语义**：`cancel()` 中止所有进行中的异步校验。已完成的同步校验结果保留。下一次 `validate()` 调用从干净状态开始。

### 9.4 草稿隔离

```typescript
interface DraftScope {
  readonly scopeRef: ScopeRef;
  readonly validationState: Readonly<ValidationState>;
  readonly dirtyState: Readonly<DirtyState>;

  validate(): Promise<ValidationResult>;
  commit(): Promise<ValidationResult>;
  discard(): void;
}
```

**完整语义**：

1. **独立性**：DraftScope 的校验状态和脏状态完全独立于父表单。跨字段校验规则：
   - 如果规则引用的字段**全部**在 DraftScope 内 → 在 DraftScope 内求值
   - 如果规则引用的字段**跨越** DraftScope 和父 Scope → 求值时将 DraftScope 的值视为"当前值"，父 Scope 的值视为"已提交值"
   - 编译器在 Diagnose 阶段检测跨草稿边界的校验规则，产出警告

2. **commit()**：
   - 先执行 `validate()`
   - 如果校验通过，将 DraftScope 的值合并到父 Scope
   - 合并触发父 Scope 的 settle，父级跨字段规则自然重新求值
   - 返回 `ValidationResult`（包含父级因合并而重新求值的结果）
   - 如果校验失败，**不合并**，返回失败结果

3. **discard()**：
   - 清理 DraftScope（等价于 dispose）
   - 不影响父 Scope

4. **Reaction 隔离**：DraftScope 内的 Reaction 只监听 DraftScope 内的数据变更。父 Scope 的 Reaction 不监听 DraftScope 内的变更（直到 commit）。

---

## 10. 表面对话系统

### 10.1 表面管理器

```typescript
interface SurfaceManager {
  readonly stack: readonly Surface[];
  open(surface: SurfaceConfig): SurfaceHandle;
  close(handle: SurfaceHandle, result?: unknown): void;
  getActiveSurface(): Surface | null;
}

interface SurfaceConfig {
  type: 'dialog' | 'drawer';
  schema: SchemaNode;
  data?: Record<string, unknown>;
  closable?: boolean;
  width?: string;
  position?: 'left' | 'right';
}

interface Surface {
  readonly id: number;
  readonly type: 'dialog' | 'drawer';
  readonly scopeRef: ScopeRef;
  readonly handle: SurfaceHandle;
  readonly isActive: boolean;
}

interface SurfaceHandle {
  close(result?: unknown): void;
  getResult(): Promise<unknown>;
  getScope(): ScopeRef;
}
```

### 10.2 栈式管理规则

1. 每个 Surface 拥有**独立数据环境**
2. 后打开的 Surface 在上层
3. 只有栈顶 Surface 拥有焦点和键盘事件
4. 关闭栈顶后，前一个 Surface 恢复活动
5. 关闭非栈顶 Surface：抛出错误（防止隐式状态破坏）

### 10.3 关闭恢复与结果传递

```typescript
const handle = surfaceManager.open({
  type: 'dialog',
  schema: dialogSchema,
  data: { editItem: item }
});

const result = await handle.getResult();

// 对话框内部通过 Capability 关闭
capabilities.execute('closeDialog', { result: formData });
```

---

## 11. 集合渲染

### 11.1 表格渲染模型

```typescript
interface CollectionRenderModel {
  data: ResourceValue;
  rowTemplate: RegionIR;
  rowParams: readonly string[];
  rowIsolated: true;
  projections: Readonly<Record<string, ValueIR>>;
  selection: {
    mode: 'none' | 'single' | 'multiple';
    selectedKeys: ReadonlySet<unknown>;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### 11.2 虚拟化支持

```typescript
interface VirtualScrollAdapter {
  getVisibleRange(containerHeight: number, scrollTop: number): { start: number; end: number };
  estimateRowHeight(index: number, data: unknown): number;
  onRowHeightMeasured(index: number, height: number): void;
}
```

配合 ScopePool，只创建可见行的 Scope 和渲染实例。行滚出后释放 Scope，滚入时重新 acquire。

### 11.3 循环渲染

```json
{
  "type": "loop",
  "collection": "${items}",
  "itemVar": "item",
  "indexVar": "index",
  "body": [{ "type": "card", "title": "${item.title}" }]
}
```

编译为 TemplateIR，运行时为每个迭代项创建独立 Scope，共享编译后的模板。

### 11.4 递归渲染

编译时检测递归引用，编译一次，运行时通过 Scope 链递归实例化。必须有终止条件。

---

## 12. 宿主集成

### 12.1 宿主边界

```typescript
interface HostIntegration {
  initialData: Record<string, unknown>;
  httpClient: HttpRequestFunction;
  notify: NotifyFunction;
  navigate: NavigateFunction;
  onError?: ErrorHandler;
  rendererRegistry?: RendererRegistry;
  capabilityRegistry?: CapabilityRegistry;
  expressionFunctions?: ExpressionFunctionRegistry;
  stableRef: symbol;
}

type HttpRequestFunction = (config: HttpRequestConfig) => Promise<HttpResponse>;
type NotifyFunction = (message: string, level: 'info' | 'success' | 'warning' | 'error') => void;
type NavigateFunction = (url: string, options?: NavigateOptions) => void;
type ErrorHandler = (error: unknown, context: ErrorContext) => ErrorAction;

type ErrorAction =
  | { type: 'suppress' }
  | { type: 'fallback'; value: unknown }
  | { type: 'propagate' };
```

**错误处理回调语义**：
- 表达式求值错误 → 调用 `onError`，默认 `suppress`（返回 undefined）
- Resource 生产者错误 → 发布到 `errorStatePath`，同时调用 `onError`
- Renderer 错误 → 调用 `onError`，默认 `suppress`（渲染 error boundary）
- Action 执行错误 → 作为 `ActionResult.error` 返回，不调用 `onError`

### 12.2 环境稳定性

```typescript
const runtime = createRuntime(hostIntegration);
// 后续 hostIntegration 引用变化不影响运行时
// 运行时只通过 stableRef 判断是否需要重建
```

### 12.3 宿主生命周期

```typescript
interface RuntimeLifecycle {
  mount(host: HostIntegration): RuntimeHandle;
  unmount(): void;
}

interface RuntimeHandle {
  readonly scopeRef: ScopeRef;
  readonly surfaceManager: SurfaceManager;
  readonly componentRegistry: ComponentHandleRegistry;
  dispose(): void;
}
```

### 12.4 多实例隔离

多个 Runtime 实例在同一页面中完全隔离：
- 每个实例有独立的 Scope Graph、ChangePropagator、SurfaceManager
- 不共享全局状态，不污染全局命名空间
- 组件注册表和命名空间注册表按实例隔离
- 如需实例间通信，通过宿主应用中转（不属于运行时职责）

---

## 13. 领域控件嵌入

### 13.1 嵌入契约

```typescript
interface DomainControlContract {
  projections: Readonly<Record<string, ValueIR>>;
  namespace: string;
  methods: Record<string, DomainMethod>;
  bridge: DomainBridge;
  typeContract?: DomainTypeContract;
}

interface DomainBridge {
  getSnapshot(): unknown;
  subscribe(callback: () => void): Unsubscribe;
  dispatch(action: DomainAction): unknown;
}
```

### 13.2 交互方向

| 方向 | 机制 |
|------|------|
| 核心 → 领域 (读) | Host Projection |
| 领域 → 核心 (写) | Capability |
| 实例定位 | ComponentHandleRegistry |
| 领域私有 | DomainBridge |

---

## 14. 性能策略

### 14.1 静态零开销

**承诺**：不含表达式的 Schema 部分在运行时引入零额外计算开销。

```typescript
function resolveProp(prop: ValueIR, scope: ScopeRef, tracker: DependencyTracker): unknown {
  if (prop.kind === 'static') return prop.value;
  return evaluateWithCache(prop.exprId, scope, tracker);
}
```

### 14.2 选择器式订阅

```typescript
function createScopeSelector<T>(
  scopeRef: ScopeRef,
  selector: (resolve: (path: string) => unknown) => T,
  isEqual?: (prev: T, next: T) => boolean
): () => T;
```

选择器只在返回值变化时触发下游更新。这是宿主无关的——React 宿主通过 `useSyncExternalStore` 消费，Vue 宿主通过 `watchEffect` 消费。

### 14.3 编译一次实例化多次

```typescript
const rowTemplate = compile(rowSchema);
for (const record of data) {
  const instance = instantiate(rowTemplate, { record, index });
  // 共享 ExpressionTable，独立 Scope 和求值缓存
}
```

### 14.4 高频子树隔离

1. **Scope 隔离** — 行 Scope 不继承父级
2. **依赖隔离** — 行内表达式只记录行 Scope 内路径
3. **显式投影** — 行需要的外部数据通过投影传入
4. **虚拟化** — 只渲染可见行
5. **ScopePool** — 行 Scope 复用，减少 GC 压力
6. **延迟 Scope 创建** — 配合虚拟滚动，只创建可见行的 Scope

### 14.5 引用复用

```typescript
class EvalCache {
  getOrEvaluate(exprId: number, ctx: EvalContext, tracker: DependencyTracker): unknown {
    const cached = this.cache.get(exprId);
    if (cached && !this.isInvalidated(exprId, cached.deps)) {
      return cached.value;  // 引用稳定
    }
    const value = evaluate(exprId, ctx, tracker);
    const newDeps = tracker.endEvaluation();
    this.replaceDeps(exprId, cached?.deps ?? new Set(), newDeps);
    this.cache.set(exprId, { value, deps: newDeps });
    return value;
  }

  private replaceDeps(exprId: number, oldDeps: Set<string>, newDeps: Set<string>): void {
    for (const old of oldDeps) {
      if (!newDeps.has(old)) this.reverseIndex.delete(old, exprId);
    }
    for (const newPath of newDeps) {
      this.reverseIndex.add(newPath, exprId);
    }
  }
}
```

### 14.6 内存预算

典型页面（500 节点，~20 Scope，~200 表达式，~50 Resource）：

| 结构 | 估算大小 |
|------|---------|
| Scope 节点 | ~40 KB |
| 表达式缓存 | ~40 KB |
| 反向依赖索引 | ~10 KB |
| Resource 状态 | ~25 KB |
| **总计** | **~115 KB** |

大规模表格（1000 行 × 5 表达式）：~500 KB。可接受。行 Scope 滚出后释放，内存可控。

---

## 15. 安全模型

| 约束 | 实现机制 |
|------|---------|
| 禁止动态代码生成 | AST/字节码求值器 |
| 权限编译前裁剪 | Stage 2 Transform |
| 表达式执行受控 | 只通过 EvalContext.resolve 访问数据 |
| 命名空间边界显式 | 词法作用域解析 |
| adaptor 安全执行 | adaptor 使用同一表达式引擎，不使用 new Function |

---

## 16. 开发工具支持

### 16.1 节点标识与 DOM 关联

```typescript
interface NodeIdentity {
  nodeId: string;
  schemaPath: string;
  sourceLocation?: SourceLocation;
}

// DOM: <div data-flux-node="node-123" data-flux-type="form-input">
```

### 16.2 运行时检查器

```typescript
interface RuntimeInspector {
  getNodeInfo(nodeId: string): NodeDebugInfo;
  getScopeSnapshot(scopeId: number): ScopeSnapshot;
  getDependencyGraph(scopeId: number): DependencyGraphInfo;
  getValidationState(formNodeId: string): ValidationDebugInfo;
  getResourceState(resourceId: number): ResourceDebugInfo;
  getSettleHistory(limit: number): SettleTurnInfo[];
}
```

`SettleHistory` 记录最近 N 次 settle 的详细信息，用于调试级联写入和性能分析。

### 16.3 编译诊断

```typescript
interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  location: SourceLocation;
  relatedInformation?: readonly Diagnostic[];
}
```

---

## 17. 国际化

### 17.1 编译时 i18n 替换

```typescript
interface I18nConfig {
  locale: string;
  prefix: string;
  messages: ReadonlyMap<string, string>;
  fallback?: string;
}
```

在 Stage 2 Transform 中：
1. 匹配 `i18n:flux.xxx` 模式
2. 解析为 `prefix + "flux.xxx"` → 查找 `messages`
3. 未找到 → 尝试 fallback locale → 仍未找到 → 保留原始 key 并产出 warning 诊断
4. 替换后，进入编译管线的 Schema 与无 i18n 的 Schema 在结构上无差异

---

## 18. 测试策略

### 18.1 分层测试

| 层级 | 测试对象 | 环境 |
|------|---------|------|
| L1 | Expression Engine | Node.js |
| L2 | Scope Graph + Dependency Tracker | Node.js |
| L3 | Compiler Pipeline | Node.js |
| L4 | Reactive Kernel (settle/batch/cascade) | Node.js |
| L5 | Action System | Node.js (mock Capability) |
| L6 | Form Validation | Node.js |
| L7 | Renderer Host Integration | JSDOM / 浏览器 |

L1-L6 完全不依赖 DOM。

### 18.2 关键场景测试

- 级联 settle（A writes → B reacts → B writes → C reacts）
- 前缀匹配失效（写入 `user` 使 `user.name` 失效）
- Resource 竞态（依赖变更时正在加载）
- 循环/递归渲染 + 隔离 Scope
- DraftScope commit/discard 与跨字段校验
- 并行动作的错误聚合
- Scope dispose 后的内存回收

---

## 19. 类型系统

```typescript
interface TypeChecker {
  checkNodeType(node: SchemaNode): Diagnostic[];
  checkProps(node: SchemaNode, rendererType: RendererType): Diagnostic[];
  checkExpressionType(expr: string, expectedType: TypeRef, scope: TypeScope): Diagnostic[];
  checkActionRef(action: string, scope: ScopeRef): Diagnostic[];
}

interface RendererType {
  type: string;
  props: Readonly<Record<string, TypeRef>>;
  meta: Readonly<Record<string, TypeRef>>;
  events: Readonly<Record<string, EventSignature>>;
  regions: Readonly<Record<string, RegionTypeSignature>>;
}

type TypeRef =
  | { kind: 'primitive'; name: 'string' | 'number' | 'boolean' | 'any' }
  | { kind: 'array'; element: TypeRef }
  | { kind: 'object'; properties: Readonly<Record<string, TypeRef>> }
  | { kind: 'union'; members: readonly TypeRef[] }
  | { kind: 'expression'; resultType: TypeRef };
```

---

## 20. 与其他低代码框架的关键差异

> **注**：本表力求准确反映各框架的实际能力，而非营销式对比。

| 维度 | AMIS | Formily 2.x | Retool | Lowdefy | 本设计 (v8) |
|------|------|-------------|--------|---------|-------------|
| Schema 角色 | 运行时输入 + $ref 组合 | 运行时输入 | 运行时输入 | 编译时校验 + 运行时输入 | 一级制品，独立结构操作空间 |
| 编译边界 | JIT 表达式编译缓存 | 有限编译 | 无 | Schema 校验 | 完整 4 阶段 AOT 编译管线 |
| 静态零开销 | 否 | 否 | 否 | 否 | StaticValue 直接内联 |
| 依赖追踪 | MobX 组件/字段级，Scope 链隐式宽依赖 | 字段级 reactive，粒度好 | 全量重算 | 无 | 路径级前缀匹配 + 自动收集 + Scope 隔离 |
| 动作编排 | 字符串表达式 + adaptor(new Function) | 函数式链式 | JavaScript 代码 | 声明式 actions + JS | 编译时 DAG，三种并行策略 |
| 域控件嵌入 | 组件嵌套 | 组件嵌套 | iframe | 有限 | 窄契约四方向 |
| 表格行隔离 | 无 | 无 | 无 | 无 | Scope 隔离 + 显式投影 + ScopePool |
| 宿主耦合 | 中（env.fetcher 可注入但 adaptor 用 new Function） | 中 | 高（内置请求） | 中 | 低（全委托 + scopeInjection） |
| 安全性 | 混合（amis-formula 安全 + adaptor 用 new Function） | JS 表达式 | JS 代码 | 受限 JS | 全程受控表达式引擎 |
| 可测试性 | 需要 DOM | 需要 React | 需要浏览器 | 有限 | 核心 100% Node.js |
| 表达式丰富度 | 高（过滤器管道、数据映射、三元） | 中 | 完整 JS | 有限 | 中（管道过滤器 + 可扩展函数注册） |
| 复合模式 | 极丰富（CRUD/Wizard/Service 等 300+ 组件） | 中（ArrayCards/Tabs） | 中 | 有限 | 基元组合模式（不内置复合组件） |

**v8 的核心优势**：编译时优化、精确依赖追踪、Scope 隔离、安全表达式引擎、宿主无关性。

**v8 的核心差距**：复合模式生态（AMIS 的 CRUD/Wizard 等 300+ 组件需要大量工程投入）、表达式丰富度（缺少 AMIS 的数据映射 DSL）。

---

## 21. 错误边界

### 21.1 错误分级

| 错误来源 | 默认行为 | 可配置 |
|----------|---------|--------|
| 表达式求值 | suppress（返回 undefined） | onError 回调可配置为 fallback value |
| Resource 生产者 | 发布到 errorStatePath + onError 回调 | 不可 suppress（Resource 必须知道自身状态） |
| Renderer 渲染 | error boundary 包裹，显示降级 UI | onError 回调可配置 |
| Action 执行 | 作为 ActionResult.error 返回 | 由 Action DAG 的 onError 分支处理 |
| 编译错误 | 产出 Diagnostic，不阻断编译 | 严重错误（引用缺失）阻断编译 |
| Settle 级联溢出 | 抛出 CascadeOverflowError | maxTurnDepth 可配置 |

### 21.2 运行时错误追踪

所有运行时错误附带 `ErrorContext`：

```typescript
interface ErrorContext {
  nodeId?: string;
  schemaPath?: string;
  exprId?: number;
  resourceId?: number;
  actionRef?: number;
  scopeId?: number;
  settleTurn: number;
}
```

---

## 附录 A: 核心类型索引

```typescript
// Schema 层
SchemaNode, SchemaValue, ValueIR (Static/Dynamic/Resource/Slot)
RegionIR, TemplateIR

// 编译层
ExecutionPackage, ExecutionNode, CompiledExpression
ActionDAG, ActionNode, ActionResult, AggregateActionResult
ValidationGraph, ValidationRule

// 运行时层
ScopeRef, ScopeWriteAccess, ScopeOptions, ScopePool
ScopeChange, ChangePropagator, SettleController, SettlementResult
DependencyTracker, EvalCache, EvalContext
ResourceDeclaration, RefreshStrategy, ReactionDeclaration
FormRuntime, DraftScope, ValidationExecutor
SurfaceManager, Surface, SurfaceHandle
RuntimeHandle, RuntimeLifecycle, HostIntegration
ComponentHandleRegistry, NamespaceRegistry, CapabilityDispatcher
RendererRegistry, RendererComponent, RenderSnapshot, HostAdapter
ExpressionFunctionRegistry
RuntimeInspector, Diagnostic, ErrorContext
```

---

## 附录 B: 设计决策记录

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| 值表示 | 多种类型 vs 统一 IR | 统一 ValueIR | P4：消费者不感知生产者类型 |
| 依赖收集 | 显式声明 vs 隐式自动 | 隐式自动 | P3：降低 DSL 复杂度 |
| 失效策略 | Push 立即重算 vs Pull 标记重算 | Pull | 避免瀑布式重计算 |
| 失效匹配 | 精确匹配 vs 前缀匹配 | 前缀匹配 | 正确性保证（写入 `user` 使 `user.name` 失效） |
| Scope 继承 | 默认继承 vs 默认隔离 | 默认继承 | 符合直觉，表格行显式隔离 |
| Reaction 执行 | settle 内同步 vs deferred | deferred | 避免 re-entrancy |
| settle 调度 | 每次 write vs microtask batch | microtask batch | 合并多次写入，减少 Turn 数 |
| 动作编译 | 运行时解析 vs 编译时 DAG | 编译时 DAG | 零运行时图发现开销 |
| 表达式引擎 | eval vs AST/字节码 | AST/字节码 | 安全约束 |
| 表面管理 | 扁平 vs 栈式 | 栈式 | 多层叠加自然语义 |
| i18n | 运行时 vs 编译时 | 编译时 | 零运行时开销 |
| 主题 | ThemeProvider vs CSS 变量 | CSS 变量 | 无运行时耦合 |
| 渲染宿主 | 绑定 React vs 抽象协议 | 抽象协议 | 可替换宿主，核心可测试 |
| Scope 写接口 | 公共接口 vs 分离内部接口 | 分离 ScopeWriteAccess | 读写分离原则 |
| adaptor | new Function vs 表达式引擎 | 表达式引擎 | 安全性 |
| 复合组件 | 内置 vs 基元组合 | 基元组合 | P4/P6：复杂度从简单形式生长 |
