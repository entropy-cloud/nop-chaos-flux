# 下一代低代码底层框架设计 v9

> **文档性质**: 从零开始的下一代低代码底层框架完整架构设计。
>
> **设计定位**: 将业界已验证的先进模式（Signal 响应式、编译期优化、效应通道、细粒度更新）进行系统性整合，在**集成创新**和**工程完备性**上超越当前所有低代码框架。
>
> **诚实声明**: 本设计不声称在单一机制上具有原创性突破。其价值在于将这些机制以正确的层次和交互方式组合为一个完整、可用、可渐进采纳的低代码运行时。

---

## 0. 设计哲学

### 0.1 核心原则

| 原则 | 含义 |
|------|------|
| **编译即优化** | 凡可在编译期确定的信息，绝不推迟到运行时。编译产物是最小执行单元 |
| **可组合原语** | 所有运行时原语（Scope、Action、Reactor、Component）可组合、可变换，通过明确的接口契约组合 |
| **渐进式零假设** | 框架对宿主环境、UI 库、状态管理方案零假设。从最简 schema 到最复杂场景，概念集合严格递增 |
| **效应通道隔离** | 所有副作用（网络、DOM、存储）通过显式效应通道执行，核心逻辑保持可测试 |
| **增量采纳** | 可以从一个表单、一个表格开始使用，不必一次性采纳全部架构 |

### 0.2 分阶段交付目标

**MVP（核心）**:
- Schema → IR → Scope → Signal → React 渲染 → 基础动作
- 表达式引擎（编译期闭包）
- 错误边界与恢复

**V2（企业基础）**:
- 校验引擎、数据源管理、集合渲染（表格/列表）
- 表面管理（对话框/抽屉）
- 访问控制集成点

**V3（高级）**:
- 热更新、SSR、循环/递归结构
- 域控嵌入、命名空间

**V4（开发者体验）**:
- 时间旅行调试、编译诊断增强
- 多目标编译适配器（Vue/Solid/WebComp）

### 0.3 量化的务实目标

| 目标 | 说明 |
|------|------|
| 核心可表达 | 一个声明式 schema 覆盖企业级前端 **80%+** 的常见场景，其余通过受控扩展点接入 |
| 行级更新粒度 | 表格万行数据，修改一个单元格只触发该单元格的重新渲染 |
| MVP 核心 < 35KB gzipped | 通过编译期裁剪，仅包含 Signal、Scope、表达式、基础 Action、React 适配器 |
| 核心 runtime 可在 Node.js 中无 DOM 测试 | 所有非渲染逻辑独立于 DOM |

---

## 1. 总体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Schema Authoring                         │
│   JSON Schema ──► Schema Validator ──► Type Inference           │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Compilation Pipeline                         │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ Parse &  │──►│ Resolve  │──►│ Optimize │──►│ Emit     │    │
│  │ Normalize│   │ & Bind   │   │ & Analyze│   │ IR       │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│                                                                  │
│  Diagnostics: type errors, dead code, circular deps, perf hints │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Execution Kernel (IR)                        │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Scope Graph │  │ Reactor     │  │ Effect      │            │
│  │ (Data)      │  │ Engine      │  │ Channel     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Component   │  │ Form        │  │ Surface     │            │
│  │ Registry    │  │ Runtime     │  │ Manager     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ Error       │  │ Collection  │                               │
│  │ Boundary    │  │ Engine      │                               │
│  └─────────────┘  └─────────────┘                               │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Rendering Adapter (Primary: React)           │
│                                                                  │
│  React Adapter (MVP) │ Vue/Solid/WebComp (V4, adapter-based)    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 三阶段分离

| 阶段 | 输入 | 输出 | 职责 | 优化目标 |
|------|------|------|------|---------|
| **Schema 编译** | JSON Schema | CompiledIR | 解析、绑定、表达式预编译、静态分析、诊断 | 正确性、最小化 |
| **IR 实例化** | CompiledIR + HostContext | RuntimeInstance | 创建 Scope 图、注册 Reactor、挂载 Effect Channel | 性能 |
| **运行时执行** | RuntimeInstance | UI + Side Effects | 响应式求值、动作派发、渲染 | 实时性、精确更新 |

### 1.2 MVP 范围裁剪原则

MVP 阶段严格只包含：
- Schema 解析与编译（单遍，足以产出可执行 IR）
- Scope + Signal（核心数据层）
- Expression Engine（闭包求值器）
- Reactor Engine（响应式计算，microtask 批处理）
- Effect Channel + Action Executor（基础动作）
- React Adapter（唯一渲染目标）
- Error Boundary（错误隔离）
- Component Registry + 基础组件契约

**明确排除直到 V2+**：校验引擎、数据源管理、集合渲染、表面管理、热更新、SSR、多目标编译、时间旅行调试。

---

## 2. Schema 模型

### 2.1 节点结构

```typescript
interface SchemaNode {
  type: string;
  key?: string;
  props?: Record<string, SchemaValue>;
  regions?: Record<string, RegionDef>;
  actions?: Record<string, ActionDef>;
  datasource?: Record<string, DatasourceDef>;
  reactions?: ReactionDef[];
  validation?: ValidationDef[];
  lifecycle?: LifecycleHooks;
}

interface RegionDef {
  parameters?: string[];
  body: SchemaNode[];
}

type SchemaValue =
  | LiteralValue
  | ExpressionValue
  | TemplateValue
  | ComputedValue
  | DataSourceRef;
```

### 2.2 值语义分类

```
SchemaValue = Literal(a)              // 静态值，编译时确定
            | Expr(expression)        // 同步表达式，求值即得
            | Template(parts[])       // 模板字符串，部分动态
            | Computed(producer)      // 计算属性，带缓存
            | Stream(datasource)      // 异步数据源
```

**简化原则**：`Computed` 和 `Template` 不可从其他三种派生——`Computed` 有缓存语义，`Template` 有部分求值优化——所以保留为独立变体。

### 2.3 Schema 组合

```typescript
interface SchemaComposition {
  $import?: string;
  $merge?: SchemaNode[];
  $extends?: string;
}
```

**$merge 合并语义精确定义**：

| 类型 | 合并策略 |
|------|---------|
| 对象 | 深度合并，后者覆盖前者同名键 |
| 数组 | **替换**（后者覆盖前者），不复用 |
| 基本类型 | 后者覆盖前者 |
| regions | 按区域名深度合并，区域内 `body` 数组替换 |
| actions | 按动作名覆盖 |
| validation | **并集**（两者都保留） |
| $import | 检测循环引用，最大深度 10，超出报编译错误 |
| $extends | 单继承，覆写规则同 $merge |

### 2.4 Schema 简写约定

```json
// 完整形式
{ "props": { "visible": { "kind": "literal", "value": true } } }

// 简写形式（编译器自动标准化）
{ "props": { "visible": true } }

// 表达式简写
{ "props": { "label": "${user.name}" } }     // 自动识别为 Template
{ "props": { "data": "${items | filter(x => x.active)}" } }  // 自动识别为 Expr
```

`${...}` 在 JSON 字符串内使用。编译器通过 JSON Schema 验证确保表达式不与转义冲突。对于需要包含字面 `${` 的场景，使用 `\${` 转义。

---

## 3. 编译管线

### 3.1 编译阶段

#### Stage 1: Parse & Normalize

- JSON 解析为 AST
- 标准化简写形式（如 `"visible": true` → `LiteralValue(true)`）
- 分配稳定节点 ID（基于 schema 中的 `key` 字段，无 key 时基于位置哈希）
- 展开 `$import` 和 `$extends`

#### Stage 2: Resolve & Bind

- **类型绑定**：将每个 `type` 映射到已注册的组件契约
- **表达式编译**：将字符串表达式编译为闭包函数（不使用 `new Function`，使用自定义树遍历解释器）
- **依赖提取**：静态分析每个表达式依赖的数据路径
- **动作绑定**：将动作声明编译为可执行的动作描述

#### Stage 3: Optimize & Analyze

- **静态提升**：将纯静态子树标记为不可变（跳过运行时求值）
- **循环体模板化**：识别 loop/表格结构，预编译循环体为可复用模板
- **依赖图构建**：构建全局依赖 DAG，检测循环依赖
- **诊断分析**：
  - 类型不匹配警告（基于组件契约的 props 类型）
  - 循环依赖检测
  - 未使用变量/动作提示
  - 性能风险提示

#### Stage 4: Emit IR

```typescript
interface CompiledIR {
  id: string;
  nodeType: string;
  componentKey: string;
  props: Map<string, CompiledValue>;     // 编译后的值描述
  regions: Map<string, CompiledRegion>;  // 编译后的子区域
  actions: Map<string, CompiledAction>;  // 编译后的动作
  reactors: CompiledReactor[];           // 需要的响应式计算
  scopeTemplate: ScopeTemplate;          // Scope 初始化模板
  dependencies: DependencyEdge[];        // 依赖边列表
  diagnostics: Diagnostic[];             // 编译诊断
  isStatic: boolean;                     // 是否纯静态子树
}
```

### 3.2 编译器是单遍的（MVP）

MVP 阶段编译器是**线性单遍**的：Parse → Bind → Optimize → Emit 依次执行，不回溯。这限制了某些优化（如跨过程死代码消除），但：
- 实现简单，调试容易
- 编译速度快（< 10ms for typical page）
- 后续需要时可改为多遍迭代

### 3.3 编译期类型检查

类型检查基于组件契约的 `propsSchema`（JSON Schema 类型），对每个 prop 进行：
1. 字面量值：直接验证类型
2. 表达式值：推断返回类型，与期望类型兼容性检查
3. 模板字符串：始终视为 string 类型

这不是形式化验证，而是实用的类型兼容性检查——类似 TypeScript 的 structural typing 但更宽松（允许 `any` 逃逸）。

---

## 4. Scope Graph —— 分层数据环境

### 4.1 Scope 结构

```typescript
interface Scope {
  // 自有数据（Signal 映射）
  own: Map<string, Signal<unknown>>;
  
  // 父级 Scope（可选）
  parent: Scope | null;
  
  // 隔离模式
  mode: 'inherited' | 'isolated';
  
  // 投影（从父级选择性暴露到隔离子 Scope）
  projections: Map<string, Signal<unknown>>;
  
  // 路径查找
  get(path: string): unknown;
  set(path: string, value: unknown): void;
}
```

**路径查找机制**（`get`）：
1. 将路径按 `.` 分割：`user.address.city` → `['user', 'address', 'city']`
2. 第一段在 `own` 中查找 Signal
3. 如果 `own` 中没有且 `mode === 'inherited'`，沿 `parent` 递归查找
4. 如果 `mode === 'isolated'`，检查 `projections` 中是否有该路径的第一段
5. 找到第一段 Signal 后，对剩余路径在 Signal 值上进行属性遍历
6. 任一级为 `null`/`undefined` → 返回 `undefined`（空值安全）

**路径写入机制**（`set`）：
1. 路径存在于 `own` → 直接写入该 Signal
2. 路径不存在于 `own` 但存在于父级 → 写入父级 Signal
3. 路径完全不存在 → 在 `own` 中创建新 Signal

**可组合性质**（非形式化代数，而是实用的组合规则）：
- **继承**: 子 Scope 读取时，先查 own，再查 parent（递归）
- **隔离**: 子 Scope 的 own 为空开始，不自动继承 parent
- **投影**: 隔离 Scope 通过显式 projection 从 parent 获取指定 Signal
- **合并**: `$merge` 场景下的深度合并规则见 Section 2.3

### 4.2 Signal —— 细粒度响应式原语

```typescript
interface Signal<T> {
  get(): T;
  set(value: T): void;
  mutate(fn: (draft: T) => void): void;
  subscribe(listener: (value: T) => void): () => void;  // 返回 unsubscribe 函数
}
```

`subscribe` 语义：
- 立即注册，不触发初始回调（只在值变更时触发）
- 返回 `unsubscribe` 函数，调用后不再接收通知
- 批量更新期间，listener 在传播完成后调用一次（不是每次 set 都调用）
- 同一个 listener 不会被重复注册

**设计依据**：Signal 模式已被 SolidJS（2018）、Svelte 5 Runes（2023）、Preact Signals（2022）、Angular Signals（2023）验证。这不是原创发明，而是对已验证模式的采纳。

**依赖追踪上下文**：`get()` 在求值上下文中自动注册依赖的机制通过一个模块级变量实现（类似 SolidJS 的 `Listener` 全局）：

```typescript
// 框架内部实现
let activeTracker: DependencyTracker | null = null;

function signalGet<T>(signal: InternalSignal<T>): T {
  if (activeTracker) {
    activeTracker.recordDep(signal.path);
  }
  return signal.value;
}

function trackedEvaluation<T>(fn: () => T, tracker: DependencyTracker): { value: T; deps: Set<string> } {
  const prev = activeTracker;
  activeTracker = tracker;
  try {
    const value = fn();
    return { value, deps: tracker.deps };
  } finally {
    activeTracker = prev;
  }
}
```

这保证了嵌套计算正确追踪——内层 Computed 只追踪它自己的依赖，不会泄漏到外层。

**关键特性**：
- `get()` 在 Reactor 求值上下文中调用时自动注册依赖（类似 SolidJS 的 `createMemo` 内的读取）
- `createComputed` 创建惰性求值 + 缓存的派生 Signal
- 批量更新：同一 microtask 内多次 set 只触发一次传播

### 4.3 依赖追踪

```typescript
interface DependencyTracker {
  track<T>(fn: () => T): { value: T; deps: Set<string> };
  notify(path: string): void;
  getDependents(path: string): Set<string>;
}
```

**MVP 策略**：全路径追踪。每次求值记录所有访问的路径。不做自适应降级——这是 V4 的优化项，MVP 保持简单。

### 4.4 变更传播

```typescript
interface ChangeEvent {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  source: 'user' | 'system' | 'datasource' | 'action';
}
```

传播保证：
1. **拓扑排序**：按依赖 DAG 的拓扑序传播
2. **microtask 批量合并**：同一 microtask 内的多次写入合并为一次传播
3. **自写保护**：数据源写入的变更不触发该数据源自身的重新求值

### 4.5 事务

```typescript
interface ScopeTransaction {
  begin(): void;
  commit(): void;
  rollback(): void;
  set(path: string, value: unknown): void;
}
```

用于表单提交时批量更新、复杂动作序列的中间状态不可见。

**与 React 渲染协调**：事务 `commit()` 触发 Signal 变更，这些变更进入 microtask 批处理。React 的 `useSyncExternalStore` 在下一个渲染周期读取到一致的最终值。事务不应在 React 渲染阶段（render 函数体内）中使用——仅在事件处理器或 action 回调中使用。

### 4.6 Scope 内存生命周期

```typescript
interface ScopeLifecycle {
  // 创建：IR 实例化时
  onCreate(scope: Scope): void;
  
  // 激活：Surface 打开、组件挂载
  onActivate(scope: Scope): void;
  
  // 挂起：Surface 被其他 Surface 遮盖
  onSuspend(scope: Scope): void;
  
  // 销毁：组件卸载、Surface 关闭、表格行滚出虚拟视口
  onDispose(scope: Scope): void;
}
```

**清理规则**：
1. **Signal 订阅清理**：Scope 销毁时，自动取消该 Scope 下所有 Signal 的订阅。Reactor 自动反注册
2. **行 Scope 与虚拟化**：行 Scope 在滚出虚拟视口时销毁（不是隐藏）。如果 DOM 元素被回收复用，创建新 Scope。数据保留在父 Scope 的 `items` Signal 中
3. **DataSource 销毁**：Scope 销毁时，该 Scope 注册的所有 DataSource 自动 cancel + dispose
4. **EffectReactor 清理**：Scope 销毁时，该 Scope 下的所有 EffectReactor 自动取消进行中的副作用
5. **长运行 SPA 防泄漏**：组件卸载时框架自动检查并警告未清理的订阅（dev mode only）

### 4.7 Undo/Redo 支持

Scope 的事务系统为 Undo/Redo 提供基础设施：

```typescript
interface UndoManager {
  // 记录一个变更到 undo 栈
  push(change: ScopeChange): void;
  
  // 撤销
  undo(): void;
  
  // 重做
  redo(): void;
  
  // 查询
  canUndo: Signal<boolean>;
  canRedo: Signal<boolean>;
  stackSize: number;
}

interface ScopeChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  description?: string;     // 用于 UI 显示，如 "修改了用户名"
}
```

**集成方式**：
- UndoManager 是可选的，由宿主在需要时创建并绑定到 Scope
- Scope 的 `set()` 和 `mutate()` 在 UndoManager 存在时自动记录变更
- 表单场景下，通常绑定到表单级别的 UndoManager
- Action 系统的 `setValue` 效应自动与 UndoManager 集成
- 复合动作（如批量更新）记录为单个 Undo 条目

---

## 5. Reactor Engine —— 响应式计算引擎

### 5.1 Reactor 类型

```
Reactor = ValueReactor       // 表达式求值 → 产出值
        | EffectReactor      // 数据变更 → 触发副作用
        | DataSourceReactor  // 依赖变更 → 刷新数据源
        | ValidationReactor  // 值变更 → 重新校验
```

### 5.2 Reactor 生命周期

```
created → active → error → active (recovered) → disposing → disposed
                 → suspended (scope deactivated) → reactivating → active
```

**新增 error 状态**：当 Reactor 求值抛出异常时，进入 error 状态。ErrorReactor 的错误信息写入到 scope 的 `__errors` 路径下，渲染层可以读取并展示。Reactor 不会因为单次错误停止——下次依赖变更时自动重试。

### 5.3 调度策略

```typescript
type ScheduleMode = 'sync' | 'deferred';

// MVP: 只两级
// sync: 立即执行（值求值）
// deferred: microtask 批处理后执行（EffectReactor、ValidationReactor）
```

**不使用 5 级优先级调度器**。MVP 只需要：
1. 值求值按依赖拓扑序同步执行
2. 副作用和校验延迟到当前 microtask 结束后执行
3. 与 React 的调度器协调通过 `useSyncExternalStore` 的 `getSnapshot` 约束自然实现

### 5.4 与 React Concurrent Mode 的协调

React 适配器使用 `useSyncExternalStore` 订阅 Signal：

```typescript
function useSignalValue<T>(signal: Signal<T>): T {
  const getSnapshot = useCallback(() => signal.get(), [signal]);
  const getServerSnapshot = useCallback(() => signal.get(), [signal]);
  return useSyncExternalStore(
    useCallback((callback) => signal.subscribe(callback), [signal]),
    getSnapshot,
    getServerSnapshot
  );
}
```

**引用稳定性机制（关键）**：`getSnapshot` 必须返回引用稳定的值。Signal 内部通过以下策略保证：

1. **原始类型**（string/number/boolean/null/undefined）：使用 `===` 比较，天然稳定
2. **对象/数组**：Signal 维护 `lastNotifiedValue` 引用。每次 `set()` 时，使用 `Object.is()` 比较：
   - 相同引用 → 返回缓存的 `lastNotifiedValue`，不触发订阅
   - 不同引用 → 更新 `lastNotifiedValue`，触发订阅
3. **`mutate()` 模式**：`mutate` 使用 Immer-style 不可变更新，产出新引用。如果用户需要浅比较，可以在 `createSignal` 时传入 `equals` 函数：

```typescript
// 默认：引用相等
const s1 = createSignal({ name: 'Alice' });

// 自定义相等性（浅比较）
const s2 = createSignal({ name: 'Alice' }, { 
  equals: (a, b) => Object.keys(a).every(k => a[k] === b[k]) 
});
```

4. **Diamond 依赖**：拓扑排序传播保证 glitch-free——一个 Signal 的更新在所有下游消费者求值前完成传播。没有消费者会看到中间态。

5. **React 安全**：`useSyncExternalStore` 的 `subscribe` 在 Signal 变更时被调用，但 `getSnapshot` 始终返回一致的值。批量更新期间，React 只在传播完成后才读取快照。

---

## 6. Effect Channel —— 副作用通道

### 6.1 设计定位

这不是代数效应（Algebraic Effects）。这是一个**可拦截的命令管道**（Command Pipeline with Middleware），类似 Redux middleware / Koa middleware chain。设计简洁，解决问题。

### 6.2 效应类型

```typescript
type Effect =
  | { kind: 'setValue'; path: string; value: unknown }
  | { kind: 'httpRequest'; config: FetchConfig }
  | { kind: 'navigate'; url: string }
  | { kind: 'showDialog'; schema: SchemaNode; scope: Scope }
  | { kind: 'closeDialog'; result?: unknown }
  | { kind: 'notify'; message: string; level: 'info' | 'warn' | 'error' }
  | { kind: 'componentCall'; ref: string; method: string; args: unknown[] }
  | { kind: 'namespaceCall'; ns: string; method: string; args: unknown[] }
  | { kind: 'validate'; paths?: string[] }
  | { kind: 'submitForm'; formId: string }
  | { kind: 'delay'; ms: number }
  | { kind: 'log'; message: string };
```

### 6.3 Effect Handler

```typescript
interface EffectHandler {
  canHandle(effect: Effect): boolean;
  handle(effect: Effect, context: EffectContext): Promise<ActionResult>;
}

interface EffectContext {
  scope: Scope;
  host: HostCapabilities;
  dispatch: (action: ActionDef) => Promise<ActionResult>;
}
```

宿主可以注册自定义 EffectHandler 来拦截或替换任何内置处理器。测试时可以用 Mock Handler 替换所有副作用。

### 6.4 Action —— 效应编排

```typescript
interface ActionDef {
  type: string;
  args?: Record<string, SchemaValue>;
  
  when?: string;              // 条件守卫表达式
  then?: ActionDef;           // 成功续接
  catch?: ActionDef;          // 失败续接
  finally?: ActionDef;        // 无论成功失败
  
  parallel?: ActionDef[];     // 并行执行
  race?: ActionDef[];         // 竞速
  
  retry?: { max: number; delay: number; backoff: 'fixed' | 'exponential' };
  timeout?: number;
  debounce?: number;
  
  assignTo?: string;          // 将结果写入 scope 路径
}

interface ActionResult {
  status: 'success' | 'failure' | 'skipped' | 'cancelled';
  value?: unknown;
  error?: FrameworkError;     // 结构化错误（见 Section 7）
}
```

### 6.5 Action 执行器

```typescript
class ActionExecutor {
  execute(def: ActionDef, ctx: ActionContext): Promise<ActionResult>;
  cancel(actionId: string): void;
  running(): string[];
}

interface ActionContext {
  scope: Scope;
  result?: unknown;
  prevResults: unknown[];
  error?: FrameworkError;
  host: HostCapabilities;
  dispatch: (def: ActionDef) => Promise<ActionResult>;
}
```

---

## 7. Error Architecture —— 错误架构

### 7.1 结构化错误

```typescript
interface FrameworkError {
  code: string;                    // 错误码，如 'EXPR_RUNTIME', 'ACTION_TIMEOUT'
  message: string;                 // 人类可读消息
  category: 'expression' | 'action' | 'validation' | 'rendering' | 'network' | 'system';
  nodeId?: string;                 // 相关 schema 节点
  path?: string;                   // 相关 scope 路径
  cause?: Error;                   // 原始错误
  recoverable: boolean;            // 是否可自动恢复
}
```

### 7.2 错误边界

三层错误隔离，与 React Error Boundary 集成：

```
┌─ Page Error Boundary ─────────────────────────────┐
│                                                    │
│  ┌─ Component Error Boundary ───────────────────┐ │
│  │                                               │ │
│  │  ┌─ Expression Error Boundary ───────────┐   │ │
│  │  │ 表达式求值失败 → fallback 值 + 内联提示│   │ │
│  │  └────────────────────────────────────────┘   │ │
│  │                                               │ │
│  │  组件渲染失败 → ErrorFallback 组件           │ │
│  └───────────────────────────────────────────────┘ │
│                                                    │
│  页面级致命错误 → 整页 ErrorFallback              │
└────────────────────────────────────────────────────┘
```

**React Error Boundary 实现**：

框架提供内置的 `SchemaErrorBoundary` React 组件：

```typescript
// 框架内部实现（简化）
class SchemaErrorBoundary extends React.Component {
  state = { error: null };
  
  static getDerivedStateFromError(error) {
    return { error: toFrameworkError(error) };
  }
  
  componentDidCatch(error, info) {
    // 将错误报告给 HostContext.onError
    this.props.onError?.(toFrameworkError(error));
  }
  
  render() {
    if (this.state.error) {
      const Fallback = this.props.errorFallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}
```

**错误边界层级**：
- 每个 Schema 节点的渲染被 `SchemaErrorBoundary` 包裹
- 页面级有一个全局 ErrorBoundary（由框架自动创建）
- 组件级 ErrorBoundary 在编译时根据 `componentContract.category` 决定是否需要

**行为规则**：
1. **表达式错误**：`${user.address.city}` 遇到 null → 返回 `undefined`（空值安全），不触发 ErrorBoundary。只有表达式语法错误或内部异常才触发
2. **Reactor 错误**：Reactor 进入 error 状态，错误写入 `__errors.{nodeId}` 路径。组件可选择读取并显示。ErrorBoundary 不触发
3. **组件渲染错误**：React Error Boundary 捕获，显示 ErrorFallback，提供 `onRetry` 回调重试渲染
4. **Action 执行错误**：`ActionResult.status = 'failure'`，`error` 包含 `FrameworkError`，catch 分支处理
5. **并行 Action 部分失败**：`parallel` 返回所有子 Action 的结果数组，每个都有独立的 status
6. **数据源错误**：`DataSourceHandle.error` Signal 包含 `FrameworkError`，渲染层可读取
7. **错误聚合**：同一节点下的多个表达式错误合并为一条错误消息，避免表格中 50 行同时报错时显示 50 条消息

### 7.3 空值安全

表达式引擎默认空值安全：
- `user.address.city` 当 `user` 或 `address` 为 null/undefined 时，返回 `undefined` 而非抛出异常
- 可选链语法支持：`user?.address?.city`
- 空值回退：`${user.name ?? 'Anonymous'}`

---

## 8. Expression Engine —— 表达式引擎

### 8.1 表达式语言

```
Expression =
  | LiteralExpr(value)
  | PathExpr(path)                        // user.name, items[0]
  | BinaryExpr(op, left, right)
  | UnaryExpr(op, operand)
  | CallExpr(fn, args[])                  // sum(1, 2, 3)
  | ConditionalExpr(test, then, else)
  | PipeExpr(value, pipeline[])           // items | filter(x => x.active) | map(x => x.name)
  | LambdaExpr(params, body)              // x => x * 2
```

### 8.2 管道操作符

```
value | filter(predicate)     // 过滤
      | map(transform)        // 映射
      | sortBy(key, order)    // 排序
      | groupBy(key)          // 分组
      | flatten               // 展平
      | unique                // 去重
      | first / last          // 首尾元素
      | count                 // 计数
      | pick(keys)            // 选取字段
      | defaults(fallback)    // 默认值
```

### 8.3 编译策略

```typescript
interface CompiledExpression {
  dependencies: string[];       // 依赖的数据路径
  evaluate(ctx: EvalContext): unknown;
  source: string;               // 原始文本（调试用）
}
```

- 表达式编译为闭包函数（树遍历解释器），不使用 `new Function`
- 所有变量访问通过 `ctx.resolve(path)` 进行
- 编译期提取所有可能的依赖路径
- 空值安全：路径中任何一级为 null/undefined 时返回 undefined

### 8.4 内置函数

```
// 数学
sum, avg, min, max, round, ceil, floor, abs

// 字符串
trim, split, join, replace, toUpperCase, toLowerCase, startsWith, endsWith, includes

// 集合
filter, map, reduce, find, findIndex, some, every, includes, flat, flatMap

// 类型检查
isString, isNumber, isBoolean, isArray, isObject, isNull, isUndefined

// 日期
formatDate, parseDate, now, addDays, diffDays

// 对象
keys, values, entries, pick, omit, merge
```

---

## 9. Component Model —— 组件模型（React Primary）

### 9.1 组件契约

```typescript
interface ComponentContract<P = any> {
  name: string;
  category: 'layout' | 'widget' | 'editor' | 'data' | 'form';
  propsSchema: Record<string, PropSchema>;
  regions: Record<string, { parameters?: string[] }>;
  events: Record<string, { args: Record<string, string> }>;
  methods: Record<string, { args: Record<string, string>; returnType: string }>;
  markerClass?: string;                    // 布局组件的标记类名
  
  // React 渲染组件（MVP）
  render: React.ComponentType<RendererProps<P>>;
}

interface PropSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  default?: unknown;
  description?: string;
}

interface RendererProps<P> {
  props: P;                       // 解析后的业务属性
  meta: RenderMeta;               // 控制元数据
  regions: Record<string, RegionHandle>;  // 子区域渲染句柄
  events: Record<string, (...args: any[]) => void>;  // 事件处理器
  helpers: RendererHelpers;       // 运行时辅助
}

interface RenderMeta {
  disabled: boolean;
  visible: boolean;
  className: string;
  testid: string;
  nodeId: string;
}

interface RegionHandle {
  render(overrides?: Record<string, unknown>): React.ReactNode;
}

interface RendererHelpers {
  scope: Scope;
  dispatch(action: ActionDef): Promise<ActionResult>;
  evaluate(expr: string): unknown;
}
```

### 9.2 组件注册表

```typescript
class ComponentRegistry {
  register(contract: ComponentContract): void;
  resolve(type: string): ComponentContract | undefined;
  all(): ComponentContract[];
}
```

### 9.3 布局组件 vs 控件组件

| 类别 | 行为 | 示例 |
|------|------|------|
| **布局组件** (layout) | 只输出标记类名，无内置样式。所有视觉样式由 schema `className` 驱动 | page, container, flex, panel, grid |
| **控件组件** (widget) | 完整的、自包含的 UI 控件，内置样式 | input, select, table, button, date-picker |
| **编辑器组件** (editor) | 域专用编辑器，通过命名空间暴露能力 | code-editor, flow-designer, spreadsheet |
| **数据组件** (data) | 数据展示和管理 | data-list, data-table, tree |
| **表单组件** (form) | 表单容器和字段 | form, form-item, field-group |

### 9.4 组件实例注册表

```typescript
class ComponentInstanceRegistry {
  register(key: string, instance: ComponentInstance): void;
  unregister(key: string): void;
  invoke(key: string, method: string, args: any[]): any;
}

interface ComponentInstance {
  methods: Record<string, (...args: any[]) => any>;
  element?: Element;
}
```

### 9.5 扩展点 —— 5% 逃生舱

当 schema 无法表达需求时，通过以下机制扩展：

**1. 自定义组件**（最常用）：

```typescript
// 注册自定义组件
registry.register({
  name: 'custom-chart',
  category: 'widget',
  render: CustomChartComponent,
  propsSchema: { ... }
});
```

**2. 自定义 Effect Handler**（拦截副作用）：

```typescript
host.capabilities.effectHandlers = [
  {
    canHandle: (e) => e.kind === 'httpRequest' && e.config.url.startsWith('/api/v2'),
    handle: async (e, ctx) => { /* 自定义请求逻辑 */ }
  }
];
```

**3. 命名空间动作**（域控件能力暴露）：

```typescript
// schema 中使用
{ "type": "button", "actions": { "onClick": { "type": "designer:export" } } }
```

**4. 自定义 Scope 初始化**（数据预加载）：

通过 `lifecycle.onMount` 动作在组件挂载时执行自定义逻辑。

---

## 10. Form Runtime —— 表单运行时

### 10.1 表单状态

```typescript
interface FormState {
  values: Signal<Record<string, any>>;
  initialValues: Record<string, any>;
  touched: Signal<Record<string, boolean>>;
  dirty: Signal<Record<string, boolean>>;
  errors: Signal<Record<string, FieldError[]>>;
  validating: Signal<Record<string, boolean>>;
  isDirty: Signal<boolean>;
  isValid: Signal<boolean>;
  isValidating: Signal<boolean>;
  isSubmitting: Signal<boolean>;
  submitCount: Signal<number>;
}

interface FieldError {
  path: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}
```

### 10.2 校验规则

```typescript
interface ValidationRule {
  path: string;
  rule: string;                    // required, minLength, pattern, custom, etc.
  params?: Record<string, any>;
  message?: string;
  when?: string;                   // 条件表达式
  severity?: 'error' | 'warning';
  async?: boolean;
  debounce?: number;
  crossFields?: string[];          // 跨字段依赖声明
}
```

### 10.3 校验策略

```typescript
interface ValidationConfig {
  trigger: 'submit' | 'change' | 'blur' | 'manual';
  mode: 'all' | 'first-error' | 'first-error-per-field';
  display: 'touched' | 'always' | 'submit-attempt';
}
```

### 10.4 校验引擎

```typescript
class ValidationEngine {
  // 编译规则为校验 DAG
  compile(rules: ValidationRule[]): ValidationGraph;
  
  // 全量校验
  validate(graph: ValidationGraph, scope: Scope): Promise<ValidationResult>;
  
  // 增量校验（只校验受影响的字段和其下游）
  validateAffected(graph: ValidationGraph, scope: Scope, changedPaths: string[]): Promise<ValidationResult>;
  
  // 取消
  cancel(): void;
}

interface ValidationGraph {
  rules: Map<string, CompiledRule[]>;           // path → 编译后的规则列表
  dependencies: Map<string, Set<string>>;       // path → 依赖的其他路径
}

interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
  warnings: FieldError[];
}
```

### 10.5 草稿隔离

```typescript
interface DraftFormHandle {
  commit(): void;        // 将草稿变更原子性应用到父表单
  discard(): void;       // 丢弃草稿变更
  isDirty(): boolean;
}
```

- 草稿表单有独立的 `dirty`、`errors` 状态
- 草稿内的校验不影响父表单的 `isValid`
- `commit()` 是原子的：所有变更一次性写入父 Scope

---

## 11. Surface Manager —— 表面管理

### 11.1 表面模型

```typescript
interface Surface {
  id: string;
  type: 'dialog' | 'drawer' | 'popover' | 'sheet';
  schema: SchemaNode;
  scope: Scope;
  state: 'opening' | 'open' | 'closing' | 'closed';
  result?: unknown;
  parent?: Surface;
}

class SurfaceManager {
  open(type: string, schema: SchemaNode, parentScope: Scope): SurfaceHandle;
  close(surfaceId: string, result?: unknown): void;
  closeAll(): void;
  getActive(): Surface | undefined;
}

interface SurfaceHandle {
  id: string;
  onClose: Promise<unknown>;
  close(result?: unknown): void;
}
```

### 11.2 表面栈

- 栈式管理：后打开的在上层
- 每个表面拥有独立 Scope
- 关闭顶层表面后，前一个恢复为活动状态
- 只有最顶层表面拥有焦点

---

## 12. Collection Engine —— 集合渲染引擎

### 12.1 行级隔离

```typescript
interface RowScope {
  mode: 'isolated';
  own: {
    record: Signal<Record<string, any>>;
    index: Signal<number>;
    isFirst: Signal<boolean>;
    isLast: Signal<boolean>;
    isSelected: Signal<boolean>;
  };
  projections: Map<string, Signal<any>>;  // 显式投影
}
```

**性能保证**：
- 修改一行数据，其他行不触发任何重新渲染
- 行 Scope 完全隔离，不继承父级
- 需要父级数据时通过 `projections` 显式传入

### 12.2 虚拟化渲染

```typescript
interface VirtualListConfig {
  itemHeight: number | 'auto';
  overscan: number;
  recycling: boolean;
}
```

与 React 适配器集成时使用 `@tanstack/react-virtual` 或类似方案。

### 12.3 树形展开

```typescript
interface TreeConfig {
  childrenField: string;
  expandMode: 'single' | 'multi' | 'accordion';
  defaultExpandAll?: boolean;
  lazyLoad?: boolean;
}
```

---

## 13. Loop & Recursion

### 13.1 循环节点

```typescript
interface LoopDef {
  items: string;                    // 表达式，返回集合
  itemName?: string;                // 默认 'item'
  indexName?: string;               // 默认 'index'
  filter?: string;                  // 过滤表达式
  orderBy?: string;                 // 排序表达式
  body: SchemaNode;                 // 循环体（编译一次，实例化多次）
  empty?: SchemaNode;               // 空集合渲染
}
```

### 13.2 递归渲染

```typescript
interface RecursiveDef {
  self: SchemaNode;
  childrenExpr: string;
  terminateWhen?: string;
  maxDepth: number;                 // 强制终止（安全阀，默认 100）
}
```

---

## 14. DataSource Engine —— 数据源引擎

### 14.1 数据源类型

```typescript
type DataSourceDef =
  | { kind: 'fetch'; config: FetchConfig; refreshPolicy?: RefreshPolicy }
  | { kind: 'poll'; config: FetchConfig; interval: number }
  | { kind: 'computed'; expression: string }
  | { kind: 'ws'; url: string; protocols?: string[] }
  | { kind: 'sse'; url: string }
  | { kind: 'custom'; factory: string };   // 注册的自定义工厂名
```

### 14.2 数据源生命周期

```
idle → loading → active → refreshing → active → ... → disposing → disposed
                → error → retrying → active / failed
```

### 14.3 数据源管理器

```typescript
class DataSourceManager {
  create(key: string, def: DataSourceDef, scope: Scope): DataSourceHandle;
  refresh(key: string): Promise<void>;
  cancel(key: string): void;
  dispose(key: string): void;
  disposeAll(): void;
}

interface DataSourceHandle {
  key: string;
  data: Signal<unknown>;
  loading: Signal<boolean>;
  error: Signal<FrameworkError | null>;
  refresh(): Promise<void>;
}
```

### 14.4 刷新策略

```typescript
interface RefreshPolicy {
  trigger: 'manual' | 'dependency' | 'interval';
  dependencies?: string[];
  debounce?: number;
  interval?: number;
  pauseWhenHidden?: boolean;
  retry?: { max: number; delay: number; backoff: 'fixed' | 'exponential' };
  cache?: { ttl: number; staleWhileRevalidate?: boolean };
}
```

### 14.5 请求配置

```typescript
interface FetchConfig {
  url: string;                               // 表达式
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, string>;            // 表达式
  body?: string;                              // 表达式
  headers?: Record<string, string>;           // 表达式
  requestAdapter?: string;                    // 请求变换表达式
  responseAdapter?: string;                   // 响应变换表达式
  errorAdapter?: string;                      // 错误变换表达式
  injectScope?: boolean;
}
```

### 14.6 加载状态架构

数据源的 `loading` 和 `error` 是 Signal，可以被表达式引用：

```json
{
  "type": "page",
  "datasource": { "users": { "kind": "fetch", "config": { "url": "/api/users" } } },
  "regions": {
    "body": {
      "body": [
        { "type": "spinner", "when": "${users.loading}", "props": {} },
        { "type": "error-display", "when": "${users.error}", "props": { "error": "${users.error}" } },
        { "type": "user-table", "when": "!${users.loading}", "props": { "data": "${users.data}" } }
      ]
    }
  }
}
```

多数据源时，可以组合 loading 状态：`${users.loading || orders.loading}`。

---

## 15. Namespace & Domain Control —— 命名空间与域控嵌入

### 15.1 命名空间注册

```typescript
interface NamespaceHandler {
  namespace: string;
  methods: Record<string, NamespaceMethod>;
  projections?: Record<string, Signal<unknown>>;
}

interface NamespaceMethod {
  name: string;
  execute(args: any[], context: NamespaceContext): Promise<any>;
}
```

### 15.2 域控嵌入协议

```typescript
interface DomainControl {
  contract: {
    projections: Record<string, string>;      // 字段名 → 类型
    methods: Record<string, { args: Record<string, string>; returnType: string }>;
  };
  mount(container: Element, scope: Scope): void;
  unmount(): void;
  execute(command: string, args: any[]): Promise<any>;
}
```

域控嵌入三原则：
1. **只读快照投影**：域控将只读状态投影到 Scope 可见的数据环境
2. **命名空间命令**：通过命名空间暴露能力方法
3. **私有通道**：域控内部状态不进入 Scope

---

## 16. Host Integration —— 宿主集成

### 16.1 宿主边界

```typescript
interface HostContext {
  initialData: Record<string, unknown>;
  capabilities: HostCapabilities;
  config: RuntimeConfig;
  onError?: (error: FrameworkError) => void;
}

interface HostCapabilities {
  fetch: (config: FetchConfig) => Promise<Response>;    // 必须
  navigate?: (url: string, options?: { replace?: boolean }) => void;
  notify?: (message: string, level: string) => void;
  storage?: { get(key: string): any; set(key: string, value: any): void };
  logger?: { debug(msg: string): void; warn(msg: string): void; error(msg: string): void };
  effectHandlers?: EffectHandler[];
}
```

### 16.2 运行时配置

```typescript
interface RuntimeConfig {
  locale: string;
  translations?: Record<string, Record<string, string>>;
  components: ComponentContract[];
  namespaces?: NamespaceHandler[];
  debug?: boolean;
  errorFallback?: React.ComponentType<{ error: FrameworkError }>;
}
```

### 16.3 运行时实例

```typescript
class LowCodeRuntime {
  static create(schema: SchemaNode, host: HostContext): RuntimeInstance;
}

class RuntimeInstance {
  mount(container: Element): void;
  unmount(): void;
  
  // 公共 API
  scope: Scope;
  diagnostics: Diagnostic[];
  dispatch(actionName: string, args?: Record<string, any>): Promise<ActionResult>;
  
  // 调试（仅 debug 模式）
  inspect?(nodeId: string): NodeInspection;
}
```

---

## 17. Access Control Integration —— 访问控制集成点

### 17.1 编译期裁剪（推荐）

权限裁剪在 schema 进入运行时之前完成——由宿主系统根据用户角色裁剪 schema 节点：
- 移除无权访问的页面/区域
- 标记只读字段
- 移除无权执行的动作

运行时本身不做权限判断。

### 17.2 运行时集成点

对于需要运行时动态权限的场景：

```typescript
// 宿主可以在 initialData 中注入权限信息
host.initialData.__permissions = {
  canEdit: true,
  visibleFields: ['name', 'email', 'phone'],
  disabledActions: ['delete']
};

// Schema 中通过表达式引用
{
  "type": "button",
  "props": { "label": "Delete" },
  "meta": { "disabled": "${!__permissions.canEdit}" }
}
```

---

## 18. Internationalization —— 国际化

### 18.1 编译期国际化

```typescript
interface I18nConfig {
  locale: string;
  resources: Record<string, Record<string, string>>;
  prefix: string;
  fallbackLocale: string;
}
```

- Schema 中的 i18n key 在编译时替换为目标语言文本
- 表达式中的 `t('key')` 函数编译为直接值查找
- 数字、日期格式化通过 `Intl` API

### 18.2 运行时动态内容

对于用户输入的动态内容（如后端返回的枚举标签），提供运行时格式化函数：

```
formatDate(date, 'yyyy-MM-dd')
formatNumber(num, 'currency', 'CNY')
t('dynamic.key', { param: value })
```

---

## 18.5 Accessibility（可访问性）

### 18.5.1 框架责任

框架在 a11y 方面的职责是**为组件提供 a11y 信息传递通道**，而非自行实现 a11y 行为：

1. **ARIA 属性透传**：Schema 中的 `aria-*` 属性自动透传到组件 DOM 元素
2. **角色标记**：组件契约中声明 `role`，编译时写入 IR，运行时透传
3. **焦点管理**：
   - 表面（Dialog/Drawer）打开时，焦点移入表面内第一个可聚焦元素
   - 表面关闭时，焦点返回触发元素
   - ErrorFallback 渲染时，焦点移入错误提示
4. **键盘事件**：
   - Effect Channel 包含 `keyboard` 效应类型（V2），支持声明式快捷键绑定
   - 表面栈的最顶层表面捕获 Escape 键触发关闭
5. **实时区域**：数据源状态变更（loading/error）可通过 `aria-live` 区域通知屏幕阅读器

### 18.5.2 组件责任

每个组件渲染器负责：
- 正确的 ARIA 角色（`role="button"`, `role="textbox"` 等）
- 标签关联（`aria-labelledby`, `aria-describedby`）
- 状态表达（`aria-disabled`, `aria-expanded`, `aria-selected`）
- 键盘交互（Tab 序列、Enter/Space 激活）
- 校验错误的 `aria-invalid` 和 `aria-errormessage`

### 18.5.3 限制

框架不提供自动化的 WCAG 2.1 合规检查。a11y 合规由组件库和宿主应用负责。框架提供的是信息传递通道，确保 schema 中的 a11y 声明能正确到达 DOM。

---

## 18.6 DataSource ↔ Form 交互协议

### 18.6.1 级联选择场景

当表单字段 A 的值变化触发数据源刷新（如省 → 市级联），交互时序：

```
用户修改字段A的值
    │
    ▼
Scope.set('form.province', 'Zhejiang') ──── 触发 DataSource 依赖变更
    │                                              │
    ▼                                              ▼
字段A的 ValidationReactor 检查              DataSource 进入 refreshing 状态
（同步，立即完成）                                │
    │                                              ▼
    │                                    Scope 写入:
    │                                      cityOptions.loading = true
    │                                      cityOptions.data = null (旧数据清空)
    │                                              │
    ▼                                              ▼
React 渲染（字段A已更新）                字段B渲染时读取到 cityOptions.loading
                                         → 显示加载状态
                                                  │
                                                  ▼
                                        HTTP 请求完成
                                                  │
                                                  ▼
                                        Scope 写入:
                                          cityOptions.loading = false
                                          cityOptions.data = [...]
                                                  │
                                                  ▼
                                        React 渲染（字段B显示新选项）
```

**关键规则**：
1. **校验先于数据源**：字段校验在数据源刷新前同步完成
2. **校验失败不阻止数据源刷新**：校验和数据源是独立的 Reactor，不形成依赖链
3. **请求取消**：如果字段 A 在数据源请求进行中再次变更，前一个请求自动取消（DataSource 内部维护 `AbortController`）
4. **字段 B 的校验**：依赖 cityOptions 的字段 B 在 loading 期间不触发校验（`when: "!${cityOptions.loading}"`）

### 18.6.2 请求取消协议

```typescript
// DataSource 内部（框架实现）
class FetchDataSource {
  private abortController: AbortController | null = null;
  
  async refresh() {
    // 取消前一个请求
    this.abortController?.abort();
    this.abortController = new AbortController();
    
    try {
      this.loading.set(true);
      const result = await this.host.fetch({
        ...this.config,
        signal: this.abortController.signal,
      });
      this.data.set(result);
      this.error.set(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // 被取消，不设置错误
        return;
      }
      this.error.set(toFrameworkError(e));
    } finally {
      this.loading.set(false);
    }
  }
}
```

### 18.6.3 Surface 关闭时的清理

Surface 关闭时的清理时序：

1. **取消进行中的 Action**：Surface Scope 下的所有 Action 自动 cancel
2. **销毁 DataSource**：Surface Scope 下的所有 DataSource 自动 dispose
3. **清理 Reactor**：Surface Scope 下的所有 Reactor 自动反注册
4. **关闭子 Surface**：子 Surface 递归执行同样流程
5. **关闭回调**：`SurfaceHandle.onClose` resolve，携带 result

如果 Surface 内的 Action 正在执行并尝试关闭自己的 Surface，Action 的 `closeDialog` 效应在 Action 完成后延迟执行（不中断当前 Action）。

---

## 18.7 Expression Engine 性能策略

### 18.7.1 树遍历解释器的性能特征

**诚实声明**：自定义树遍历解释器比 `new Function` 编译的代码慢 10-100x。对于叶子表达式（简单属性访问、算术运算），每表达式 < 0.05ms 的目标可以达成。但对于集合操作表达式（如 `items | filter(x => x.active) | map(x => x.name)` 作用于 1000+ 元素），性能取决于数据规模而非表达式复杂度。

### 18.7.2 分层性能策略

| 层级 | 策略 | 适用场景 |
|------|------|---------|
| **L1: 编译期求值** | 纯静态表达式在编译时直接求值为字面量 | `${1 + 2}` → `3` |
| **L2: 闭包缓存** | 表达式编译为闭包，结果缓存直到依赖变更 | `${user.name}` |
| **L3: 集合委托** | 管道操作委托给宿主提供的高性能实现 | `items \| filter(...)` |

**L3 集合委托**：框架内置的 `filter`/`map`/`reduce` 等集合操作直接调用 JavaScript 原生 `Array.prototype` 方法，不走解释器循环。只有自定义函数调用和复杂表达式才走完整解释器。

### 18.7.3 性能预算分类

| 表达式类型 | 预算 | 说明 |
|-----------|------|------|
| 属性访问 `${user.name}` | < 0.01ms | 单次闭包调用 |
| 简单运算 `${count + 1}` | < 0.01ms | 单次闭包调用 |
| 条件表达式 `${flag ? 'A' : 'B'}` | < 0.02ms | 包含分支 |
| 集合管道（1000 元素） | < 2ms | 委托原生 Array 方法 |
| 复杂计算 | 视具体实现 | 不做硬性承诺 |

---

## 19. Developer Experience —— 开发工具

### 19.1 节点检查

```typescript
interface NodeInspection {
  nodeId: string;
  nodeType: string;
  props: Record<string, unknown>;
  meta: RenderMeta;
  scopeData: Record<string, unknown>;
  dependencies: string[];
  validationState?: { errors: FieldError[]; warnings: FieldError[] };
}
```

### 19.2 时间旅行调试（V4）

仅开发模式，通过 `RuntimeConfig.debug = true` 启用。

**已知限制**（诚实声明）：
- 仅序列化可序列化的 Scope 数据（排除 DOM 引用、函数、WebSocket 等）
- 内存线性增长，需要在生产环境禁用
- `export()/import()` 仅支持 JSON-safe 数据

### 19.3 编译诊断

```typescript
interface Diagnostic {
  level: 'error' | 'warning' | 'info' | 'hint';
  code: string;
  message: string;
  nodeId: string;
  path?: string;
  suggestion?: string;
}
```

### 19.4 DOM 属性映射

每个渲染节点在 DOM 上暴露 `data-node-id` 属性，支持浏览器 DevTools 直接定位 schema 节点。

---

## 20. Testing Support —— 测试支持

### 20.1 核心 Runtime 无 DOM 测试

```typescript
const runtime = LowCodeRuntime.create(schema, createMockHost());
expect(runtime.scope.get('user.name')).toBe('Alice');
await runtime.dispatch('submit');
expect(mockHost.capabilities.fetch).toHaveBeenCalled();
```

### 20.2 Mock Host

```typescript
function createMockHost(overrides?: Partial<HostCapabilities>): HostContext {
  return {
    initialData: {},
    capabilities: {
      fetch: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: {} }) }),
      ...overrides,
    },
    config: { locale: 'zh-CN', components: [] },
  };
}
```

---

## 21. Performance —— 性能

### 21.1 编译期优化

| 优化 | 描述 |
|------|------|
| 静态提升 | 不含表达式的子树标记为 `isStatic`，运行时跳过求值 |
| 表达式预编译 | 表达式编译为闭包，避免运行时解析 |
| 依赖预计算 | 静态分析依赖图 |
| 循环体模板化 | Loop/递归体编译为可复用模板 |

### 21.2 运行时优化

| 优化 | 描述 |
|------|------|
| Signal 粒度更新 | 精确到单个 Signal |
| microtask 批量合并 | 同一 microtask 内多次写入合并 |
| 惰性求值 | Computed Signal 只在被订阅时求值 |
| 行级隔离 | 表格行完全隔离 |
| 引用稳定 | 值未变更时复用上次引用 |
| 增量校验 | 只校验受影响的字段 |

### 21.3 性能目标（需原型验证）

| 场景 | 目标 | 条件 |
|------|------|------|
| 静态页面首次渲染 | < 16ms/100节点 | 无表达式，纯静态 |
| 表达式首次求值 | < 0.05ms/expression | 简单到中等复杂度 |
| Signal 变更传播 | < 1ms/更新波 | 包含级联传播 |
| 表格单行更新 | 仅该行重渲染 | 隔离 Scope |
| 表格万行滚动 | > 50fps | 虚拟化 + 简单行模板 |
| 表单单字段校验 | < 2ms/field | 同步校验规则 |

**注意**：这些目标需要在 MVP 原型完成后用实际基准测试验证和调整。

---

## 22. Security —— 安全

### 22.1 沙箱边界

```
┌──────────────────────────────────────────────┐
│              Expression Sandbox               │
│  ✓ 自定义解释器执行（无 eval/new Function）  │
│  ✓ 变量访问仅限 Scope 可见路径              │
│  ✓ 空值安全（自动处理 null/undefined）      │
│  ✗ 禁止访问全局对象                         │
│  ✗ 禁止原型链操作                           │
└──────────────────────────────────────────────┘
         │
         │ Effect Channel（受控边界）
         ▼
┌──────────────────────────────────────────────┐
│              Effect Handlers                  │
│  宿主提供，可审计，可拦截                     │
└──────────────────────────────────────────────┘
```

### 22.2 表达式安全

- 自定义树遍历解释器，无动态代码生成
- 变量访问仅限当前 Scope 可见路径
- 禁止访问 `window`、`document`、`globalThis`
- 禁止访问 `__proto__`、`constructor`、`prototype`

---

## 23. Schema 热更新（V3）

### 23.1 增量编译

```typescript
class SchemaHotReloader {
  diff(oldSchema: SchemaNode, newSchema: SchemaNode): SchemaDiff;
  recompile(diff: SchemaDiff): CompiledIR[];
  apply(instance: RuntimeInstance, patches: CompiledIR[]): void;
}
```

### 23.2 Diff 算法

基于节点 `key` 和 `type` 的树 diff：
- 同 key 同 type → 属性差异更新
- 同 key 不同 type → 销毁重建
- 无 key → 按位置比较

### 23.3 状态保持策略

热更新时保持：
- Scope 数据（不删除仍有对应节点引用的路径）
- 表单填写状态（保留 dirty/touched 标记）
- 表面栈状态

**已知限制**：如果新 schema 移除了某个字段，该字段的值保留在 Scope 中但不被引用（惰性垃圾回收）。

---

## 24. SSR（V3）

### 24.1 服务端渲染

```typescript
class LowCodeRuntime {
  static async renderToString(
    schema: SchemaNode,
    host: HostContext
  ): Promise<{ html: string; state: SerializedState }>;
  
  static hydrate(
    state: SerializedState,
    host: HostContext,
    container: Element
  ): RuntimeInstance;
}
```

### 24.2 序列化协议

```typescript
interface SerializedState {
  scopeData: Record<string, unknown>;   // JSON-safe 数据
  surfaceStack: SurfaceState[];
  formStates: FormStateSnapshot[];
}
```

仅序列化 JSON-safe 的值。DOM 引用、函数、WebSocket 连接等不序列化。

### 24.3 已知挑战

- React 19 的 `useSyncExternalStore` 需要 `getServerSnapshot`，SSR 时的 Signal 值需要同步可用
- 异步数据源在 SSR 时需要预加载（等待所有 fetch 类数据源 resolve 后再 renderToString）
- Hydration 不匹配风险：Signal 值需要与 SSR 时一致

---

## 25. 与现有框架的对比

### 25.1 vs AMIS

| 维度 | AMIS | v9 |
|------|------|-----|
| 架构 | 单体运行时 | 编译期/运行期严格分离 |
| 响应式 | 粗粒度状态树 diff | Signal 细粒度更新 |
| 表达式 | 字符串模板 + 运行时解析 | 编译期闭包 + 空值安全 |
| 副作用 | 隐式嵌入各处 | 显式 Effect Channel，可拦截 |
| 性能 | 表格行级更新困难 | 行级完全隔离 + 虚拟化 |
| 可测试性 | 依赖 DOM | 核心 runtime 无 DOM 依赖 |
| 错误处理 | 薄弱 | 三层错误边界 + 结构化错误 |
| 调试 | 有限 | 节点检查 + 编译诊断 + DOM 映射 |

### 25.2 vs LowCodeEngine (阿里)

| 维度 | LowCodeEngine | v9 |
|------|---------------|-----|
| 设计器耦合 | 设计器是核心 | 运行时与设计器完全独立 |
| 扩展模型 | 插件系统（重） | Effect Handler + Component Contract（轻） |
| 性能模型 | 无明确性能契约 | 有基准目标和保证机制 |
| 可测试性 | 依赖浏览器环境 | 核心 runtime 可在 Node.js 测试 |

### 25.3 vs Formily

| 维度 | Formily | v9 |
|------|---------|-----|
| 范围 | 仅表单 | 完整应用（表单是子集） |
| 响应式 | 自建 reactive | Signal（业界验证的模式） |
| 校验 | 校验规则 | 校验 DAG + 增量校验 |
| 数据环境 | 单层 | 分层 Scope 图 |
| 集成 | 仅 React | MVP React，V4 多框架适配 |

### 25.4 vs Retool / Appsmith / ToolJet

| 维度 | Retool/Appsmith | v9 |
|------|----------------|-----|
| 架构 | 完整平台（含后端） | 纯前端运行时（可嵌入） |
| 可嵌入性 | 完整平台 | 可作为子组件嵌入任意应用 |
| 副作用控制 | 隐式 | 显式 Effect Channel |
| 扩展 | 组件市场 | Component Contract + Effect Handler |
| 行级更新 | 粗粒度 | Signal 精确更新 |

---

## 26. Renderer Ecosystem —— 渲染器生态计划

### 26.1 问题陈述

低代码框架的价值 90% 在其组件生态，而非核心运行时。AMIS 有 100+ 内置渲染器，Formily 有 50+ 字段组件。v9 的核心运行时设计再优秀，没有渲染器就是"优秀的引擎，没有车"。

### 26.2 最小可用渲染器集（MVP）

MVP 需要 **20 个渲染器**才能覆盖基本企业场景：

**布局类（5）**：
| 渲染器 | 职责 |
|--------|------|
| `page` | 页面容器，marker class only |
| `container` | 通用容器，marker class only |
| `flex` | 弹性布局，marker class only |
| `grid` | 网格布局，marker class only |
| `panel` | 面板（标题+内容），marker class only |

**表单类（8）**：
| 渲染器 | 职责 |
|--------|------|
| `form` | 表单容器，创建 FormState |
| `form-item` | 表单项包装器（标签+控件+校验提示） |
| `input-text` | 文本输入 |
| `input-number` | 数字输入 |
| `select` | 下拉选择 |
| `checkbox` | 复选框 |
| `radio` | 单选按钮 |
| `date-picker` | 日期选择器 |

**数据展示类（4）**：
| 渲染器 | 职责 |
|--------|------|
| `table` | 数据表格（虚拟化、行隔离） |
| `text` | 文本展示 |
| `badge` | 徽章/标签 |
| `image` | 图片展示 |

**交互类（3）**：
| 渲染器 | 职责 |
|--------|------|
| `button` | 按钮 |
| `link` | 链接 |
| `spinner` | 加载指示器 |

### 26.3 V2 扩展渲染器（20+）

- `textarea`, `password`, `email`, `url`, `color-picker`
- `switch`, `slider`, `rate`, `cascader`, `tree-select`, `transfer`
- `tabs`, `collapse`, `steps`, `wizard`
- `card`, `list`, `tree`, `calendar`
- `dialog`, `drawer`, `popover`
- `upload`, `rich-text-editor`

### 26.4 渲染器实现策略

**所有渲染器基于 `@nop-chaos/ui`（shadcn/ui）组件库**：
- 使用 `@nop-chaos/ui` 提供的 `<Input>`, `<Select>`, `<Table>` 等组件
- 渲染器是薄包装层（~50-100 行/渲染器），负责：
  1. 从 `RendererProps` 解构 props/meta/regions/events
  2. 映射到 UI 组件的 props
  3. 通过 hooks 订阅 Scope 数据

### 26.5 CRUD 领域抽象（V2）

企业低代码最常见的场景是 CRUD 页面。V2 提供领域级抽象：

```json
{
  "type": "crud",
  "props": {
    "api": "/api/users",
    "columns": [
      { "title": "Name", "key": "name" },
      { "title": "Email", "key": "email" }
    ],
    "filter": {
      "type": "form",
      "regions": { "body": { "body": [
        { "type": "input-text", "props": { "name": "keyword", "placeholder": "Search..." } }
      ] } }
    },
    "form": {
      "type": "form",
      "regions": { "body": { "body": [
        { "type": "input-text", "props": { "name": "name", "label": "Name" } },
        { "type": "input-text", "props": { "name": "email", "label": "Email" } }
      ] } }
    }
  }
}
```

`crud` 组件封装了：列表加载、搜索过滤、分页、新建/编辑对话框、删除确认。

---

## 27. 渐进式采纳指南

### 26.1 从一个表单开始

```typescript
// 最小使用：只渲染一个表单
const runtime = LowCodeRuntime.create(formSchema, {
  initialData: { user: { name: 'Alice' } },
  capabilities: { fetch: myFetch },
  config: { locale: 'zh-CN', components: [FormComponent, InputComponent, ...] },
});
runtime.mount(document.getElementById('form-container'));
```

### 26.2 嵌入到现有 React 应用

```tsx
function MyPage() {
  return (
    <div>
      <h1>My App</h1>
      <LowCodeRenderer schema={schema} host={host} />
      <p>Other content</p>
    </div>
  );
}
```

### 26.3 只使用部分能力

- **只用 Scope + Signal**：可以独立使用数据层，不引入 Schema 编译
- **只用表达式引擎**：可以独立编译和求值表达式
- **只用校验引擎**：可以独立校验任意数据结构

---

## 28. 总结：v9 的设计价值

### 28.1 核心价值

| # | 价值 | 描述 |
|---|------|------|
| 1 | **编译/运行严格分离** | 在编译期最大化能力，运行期最小化负担。在低代码领域的实现深度超越现有框架 |
| 2 | **Signal 细粒度响应式** | 采用业界验证的 Signal 模式，引用稳定性机制确保 React 集成安全 |
| 3 | **显式 Effect Channel** | 所有副作用通过可拦截、可测试的通道执行，不是隐式散落在各处 |
| 4 | **三层错误边界 + React 集成** | 表达式/组件/页面三层隔离，内置 React Error Boundary 实现 |
| 5 | **行级完全隔离** | 表格行 Scope 完全隔离，投影式数据访问，消除扇出刷新 |
| 6 | **渐进式采纳** | 可以从一个表单开始使用，不必一次性采纳全部架构 |
| 7 | **核心无 DOM 依赖** | 可在 Node.js 中完整测试所有非渲染逻辑 |
| 8 | **校验 DAG** | 校验规则编译为 DAG 结构，支持增量校验和跨字段依赖 |
| 9 | **结构化错误** | 所有错误携带 code、category、nodeId，便于定位和处理 |
| 10 | **受控扩展点** | 5% 逃生舱通过 Component/EffectHandler/Namespace 三种机制 |
| 11 | **DataSource ↔ Form 交互协议** | 级联选择、请求取消、Surface 清理的完整时序规范 |
| 12 | **Undo/Redo 基础设施** | Scope 事务系统自然支持 UndoManager |
| 13 | **Scope 内存生命周期** | 明确的创建/挂起/销毁流程，防止长运行 SPA 内存泄漏 |
| 14 | **渲染器生态计划** | MVP 20 渲染器 + V2 40+ 渲染器 + CRUD 领域抽象 |

### 28.2 诚实的局限性

| 局限 | 说明 |
|------|------|
| 无多目标编译 | MVP 只支持 React，V4 才考虑 Vue/Solid |
| 无协作编辑 | CRDT/OT 不在运行时职责内 |
| 无内置权限系统 | 权限在 schema 进入运行时前由宿主系统处理 |
| 无离线支持 | 离线队列、冲突解决由宿主处理 |
| 无 A/B 测试 | Schema 路由由宿主系统决定 |
| SSR 需要原型验证 | Signal + React SSR hydration 的兼容性需实际验证 |
| 表达式性能 | 自定义解释器比 `new Function` 慢 10-100x，通过分层策略缓解 |
| 无 AI 集成 | 当前不包含 AI 辅助 schema 生成 |
| 无 Schema 版本迁移 | 长期运行后 schema 格式升级的工具尚未设计 |
| a11y 合规 | 框架提供通道但不做自动化合规检查 |

### 28.3 与业界最先进实践的对比

| 实践 | 业界最先进 | v9 状态 |
|------|-----------|---------|
| 响应式原语 | SolidJS Signals, Svelte 5 Runes, TC39 Signals 提案 | 采纳同一模式；预留 TC39 Signals 适配接口 |
| 编译优化 | Svelte compiler, Vue template compiler | 采纳同一理念 |
| 类型安全 | TypeScript, tRPC, Zod | 有限的编译期类型检查 |
| 副作用管理 | Effect-TS, Redux middleware | 采用 Command Pipeline（简单但足够） |
| 多框架 | Mitosis, Stencil | V4 路线图 |
| 表单 | Formily, Conform, HouseForm | 校验 DAG + 草稿隔离 + Undo/Redo |
| CRUD 抽象 | AMIS CRUD, Appsmith Query | V2 路线图 |
| AI 辅助 | Appsmith AI, Retool AI | 未规划 |
| 组件生态 | AMIS 100+, Retool 80+ | MVP 20, V2 40+（差距显著） |
| SSR | Next.js, RSC | 传统 SSR + hydrate（非 RSC） |
