# V11 Low-Code DSL Runtime Design

**Version**: 0.2.1  
**Status**: Revised Design (Architectural Issues Identified)  
**Prerequisites**: [v11-design.md](./v11-design.md), [low-code-dsl-runtime-requirements.md](../low-code-dsl-runtime-requirements.md)

---

> **⚠️ ARCHITECTURAL WARNING**
> 
> This document inherits architectural issues from v11-design.md regarding execution strategies. The `ExecutionStrategy` references in this document (e.g., `execution.location`, `execution.hydration`) are **not implementable** on React.
> 
> **See**: `v11-final-design.md` for the corrected design.
> 
> **What remains valid in this document**: Schema compilation pipeline, Expression engine, Lexical scope, Action system, Form runtime, Data sources, Surface system.

---

## Executive Summary

This document extends the V11 frontend programming model (v11-design.md) to specifically address the requirements outlined in `low-code-dsl-runtime-requirements.md`. It maps V11's seven primitives to the DSL runtime capabilities and provides detailed designs for low-code specific concerns.

**Key Design Decisions:**

| Requirement | V11 Solution |
|-------------|--------------|
| Schema compilation | Three-phase pipeline: Parse → Compile → Blueprint |
| Expression engine | V11 Value + compiled expression with dependency extraction |
| Lexical scope | V11 Scope with isolation and shadowing support |
| Reactive updates | V11 Cell + Lens with path-level change propagation |
| Action system | V11 Action with three-layer resolution |
| Form runtime | V11 FormDefinition + FormState + ValidationContext |
| Named data sources | V11 Query + Effect primitives |
| Surface system | Dialog/Drawer as scoped Node trees with stack management |

---

## Part I: Requirements Mapping

### 1.1 Core Capabilities Mapping

| Requirement Section | V11 Primitive(s) | Design Section |
|--------------------|------------------|----------------|
| 2.1 Schema Parsing & Compilation | Node, Blueprint | Part II |
| 2.2 Expression Engine | Value (expr kind), CompiledExpr | Part III |
| 2.3 Lexical Scope | Scope | Part IV |
| 2.4 Dependency Tracking | Cell, Lens, subscription system | Part V |
| 2.5 Rendering & Components | Node, Renderer, regions | Part VI |
| 2.6 Action System | Action, combinators | Part VII |
| 2.7 Action Resolution | Three-layer resolution | Part VII |
| 2.8 Form & Validation | FormDefinition, ValidationRule, FormState | Part VIII |
| 2.9 API & Data Sources | Query, Effect (reaction) | Part IX |
| 2.10 Surface System | SurfaceManager, Dialog/Drawer nodes | Part X |
| 2.11 Table & Collections | Isolated row scopes, Loop node | Part XI |
| 2.12 Loop & Recursion | Loop node, recursive schema refs | Part XI |

### 1.2 Host Integration Mapping

| Requirement Section | V11 Design |
|--------------------|------------|
| 3.1 Host Environment | ServiceRegistry, delegate callbacks |
| 3.2 Complex Domain Controls | Namespace actions, read-only projection |
| 3.3 Theme & Styling | CSS variables, marker classes, schema-driven |

### 1.3 Cross-Cutting Constraints Mapping

| Constraint | V11 Approach |
|------------|--------------|
| Security (no eval) | Pre-compiled expressions, sandboxed evaluation |
| Static zero-overhead | Compile-time analysis, lazy Values |
| Reference reuse | Memoized evaluation, structural sharing |
| Selector subscription | Path-based subscriptions |
| Progressive complexity | Value polymorphism, Action composition |

---

## Part II: Schema Compilation Pipeline

### 2.1 Compilation Phases

```
                     ┌─────────────────────────────────────────────┐
                     │            COMPILE TIME                     │
                     └─────────────────────────────────────────────┘
                                        │
JSON/YAML Schema ────► [Parse] ────► AST ────► [Compile] ────► Blueprint
                                        │
                     ┌─────────────────────────────────────────────┐
                     │            RUNTIME                          │
                     └─────────────────────────────────────────────┘
                                        │
Blueprint ────► [Resolve] ────► Node Tree ────► [Render] ────► DOM/Native
```

### 2.2 Schema AST

```typescript
// Raw parsed schema (mutable, for editing)
interface SchemaAST {
  type: string;
  props?: Record<string, SchemaValue>;
  regions?: Record<string, SchemaAST[]>;
  validations?: ValidationSchemaAST[];
  events?: Record<string, ActionSchemaAST>;
  data?: Record<string, SchemaValue>;
  sources?: Record<string, DataSourceSchemaAST>;
  
  // Metadata for editor round-trip
  $loc?: SourceLocation;
  $comments?: string[];
}

// Schema value before classification
type SchemaValue = 
  | any                                // Literal
  | `\${${string}}`                    // Expression
  | `\`${string}\``                    // Template string
  | { $expr: string }                  // Explicit expression
  | { $action: ActionSchemaAST }       // Action-based value producer
  | { $source: string }                // Reference to named data source
```

### 2.3 Blueprint (Compiled Schema)

```typescript
interface Blueprint {
  // Unique identifier
  id: string;
  
  // Compiled structure (immutable)
  root: CompiledNode;
  
  // Pre-compiled expressions by ID
  expressions: Map<string, CompiledExpr>;
  
  // Pre-compiled validations
  validations: CompiledValidation[];
  
  // Pre-compiled actions by ID
  actions: Map<string, CompiledAction>;
  
  // Data sources
  sources: Map<string, CompiledDataSource>;
  
  // Static analysis results
  analysis: BlueprintAnalysis;
  
  // Diagnostics
  diagnostics: Diagnostic[];
}

interface BlueprintAnalysis {
  // Dependency graph for all expressions
  dependencyGraph: DependencyGraph;
  
  // Type information
  typeMap: Map<string, TypeDescriptor>;
  
  // Region definitions
  regions: Map<string, RegionDefinition>;
  
  // Required services
  requiredServices: string[];
}
```

### 2.4 CompiledNode

```typescript
interface CompiledNode {
  // Unique node ID (stable across compilations)
  id: string;
  
  // Node type for renderer lookup
  type: string;
  
  // Classified props
  props: ClassifiedProps;
  
  // Compiled regions (named child slots)
  regions: Map<string, CompiledRegion>;
  
  // Compiled events
  events: Map<string, CompiledAction>;
  
  // Compiled visibility condition
  visible?: CompiledExpr<boolean>;
  
  // Compiled disabled condition
  disabled?: CompiledExpr<boolean>;
  
  // Data initialization for this node's scope
  data?: Map<string, CompiledExpr>;
  
  // Named data sources for this node's scope
  sources?: Map<string, CompiledDataSource>;
  
  // Execution strategy (for Resumability/Islands)
  execution: ExecutionStrategy;
}

interface ClassifiedProps {
  // Static props (no expressions) - zero runtime cost
  static: Record<string, any>;
  
  // Dynamic props (contain expressions) - require evaluation
  dynamic: Map<string, CompiledExpr>;
  
  // Bound props (bidirectional binding) - for form fields
  bindings: Map<string, {
    path: string;
    lens: Lens<any, any>;
    transform?: { input?: Transform<any, any>; output?: Transform<any, any> };
  }>;
}
```

### 2.5 Compiled Expression

```typescript
interface CompiledExpr<T = any> {
  // Expression ID
  id: string;
  
  // Original source
  source: string;
  
  // Parsed AST
  ast: ExprAST;
  
  // Extracted dependencies (paths that are read)
  deps: string[];
  
  // Inferred type
  type: TypeDescriptor;
  
  // Optimized evaluator (no eval/Function)
  evaluate: (scope: Scope) => T;
  
  // Check if result changed (for memoization)
  hasChanged: (scope: Scope, prev: T) => boolean;
}

// Expression AST node types
type ExprAST = 
  | { kind: 'literal'; value: any }
  | { kind: 'path'; segments: string[] }
  | { kind: 'unary'; op: UnaryOp; operand: ExprAST }
  | { kind: 'binary'; op: BinaryOp; left: ExprAST; right: ExprAST }
  | { kind: 'ternary'; condition: ExprAST; consequent: ExprAST; alternate: ExprAST }
  | { kind: 'call'; fn: string; args: ExprAST[] }
  | { kind: 'pipe'; input: ExprAST; pipes: PipeCall[] }
  | { kind: 'member'; object: ExprAST; property: ExprAST; computed: boolean }
  | { kind: 'array'; elements: ExprAST[] }
  | { kind: 'object'; properties: [ExprAST, ExprAST][] }
  | { kind: 'spread'; argument: ExprAST }
  | { kind: 'template'; parts: (string | ExprAST)[] };
```

### 2.6 Compiled Region

```typescript
interface CompiledRegion {
  // Region name (e.g., 'body', 'header', 'actions')
  name: string;
  
  // Child nodes
  children: CompiledNode[];
  
  // Region parameters (for parameterized slots)
  params?: RegionParam[];
  
  // Whether region creates isolated scope
  isolated: boolean;
}

interface RegionParam {
  name: string;
  type: TypeDescriptor;
  // How to access from expressions (e.g., $slot.item, $slot.index)
  accessor: string;
}
```

---

## Part III: Expression Engine

### 3.1 Expression Syntax

```
// Full expression grammar
Expression
  := Ternary

Ternary
  := LogicalOr ('?' Ternary ':' Ternary)?

LogicalOr
  := LogicalAnd ('||' LogicalAnd)*

LogicalAnd
  := Equality ('&&' Equality)*

Equality
  := Comparison (('==' | '!=' | '===' | '!==') Comparison)*

Comparison
  := Addition (('<' | '>' | '<=' | '>=') Addition)*

Addition
  := Multiplication (('+' | '-') Multiplication)*

Multiplication
  := Unary (('*' | '/' | '%') Unary)*

Unary
  := ('!' | '-' | '+') Unary
   | Pipe

Pipe
  := Primary ('|' Identifier Arguments?)*

Primary
  := Literal
   | Path
   | '(' Expression ')'
   | '[' (Expression (',' Expression)*)? ']'
   | '{' (Identifier ':' Expression (',' Identifier ':' Expression)*)? '}'
   | Call
   | Member

Path
  := Identifier ('.' Identifier | '[' Expression ']')*

Literal
  := Number | String | Boolean | 'null' | 'undefined'

Call
  := Identifier '(' Arguments? ')'

Arguments
  := Expression (',' Expression)*

Member
  := Primary '.' Identifier
   | Primary '[' Expression ']'
```

### 3.2 Path Resolution

```typescript
interface ExpressionContext {
  // Resolve a path to its value
  resolve(path: string): any;
  
  // Check if path exists
  has(path: string): boolean;
  
  // Get path segments that were accessed (for dependency tracking)
  getAccessedPaths(): string[];
}

// Path resolution algorithm
function resolvePath(scope: Scope, path: string): any {
  const segments = parsePath(path);
  let current: any = scope;
  
  for (const segment of segments) {
    // Check current scope's own data
    if (current.data.has(segment)) {
      current = current.data.get(segment);
      continue;
    }
    
    // Check current scope's cells
    if (current.cells.has(segment)) {
      current = current.cells.get(segment).get();
      continue;
    }
    
    // Check parent scope (unless isolated)
    if (current.parent && !current.isolated) {
      return resolvePath(current.parent, segments.slice(segments.indexOf(segment)).join('.'));
    }
    
    // Not found
    return undefined;
  }
  
  return current;
}
```

### 3.3 Built-in Functions & Pipes

```typescript
// Built-in functions available in expressions
const builtinFunctions = {
  // Type checking
  typeof: (v: any) => typeof v,
  isArray: (v: any) => Array.isArray(v),
  isObject: (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v),
  isEmpty: (v: any) => v == null || v === '' || (Array.isArray(v) && v.length === 0),
  
  // Math
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  
  // String
  toLowerCase: (s: string) => s.toLowerCase(),
  toUpperCase: (s: string) => s.toUpperCase(),
  trim: (s: string) => s.trim(),
  split: (s: string, sep: string) => s.split(sep),
  join: (arr: string[], sep: string) => arr.join(sep),
  
  // Array
  length: (v: any[] | string) => v.length,
  first: <T>(arr: T[]) => arr[0],
  last: <T>(arr: T[]) => arr[arr.length - 1],
  at: <T>(arr: T[], i: number) => arr[i],
  slice: <T>(arr: T[], start: number, end?: number) => arr.slice(start, end),
  concat: <T>(...arrs: T[][]) => arrs.flat(),
  includes: <T>(arr: T[], item: T) => arr.includes(item),
  find: <T>(arr: T[], pred: (item: T) => boolean) => arr.find(pred),
  filter: <T>(arr: T[], pred: (item: T) => boolean) => arr.filter(pred),
  map: <T, U>(arr: T[], fn: (item: T) => U) => arr.map(fn),
  reduce: <T, U>(arr: T[], fn: (acc: U, item: T) => U, init: U) => arr.reduce(fn, init),
  some: <T>(arr: T[], pred: (item: T) => boolean) => arr.some(pred),
  every: <T>(arr: T[], pred: (item: T) => boolean) => arr.every(pred),
  sort: <T>(arr: T[], key?: string) => [...arr].sort((a, b) => 
    key ? (a as any)[key] > (b as any)[key] ? 1 : -1 : a > b ? 1 : -1
  ),
  unique: <T>(arr: T[]) => [...new Set(arr)],
  
  // Object
  keys: Object.keys,
  values: Object.values,
  entries: Object.entries,
  get: (obj: any, path: string) => resolvePath({ data: new Map(Object.entries(obj)) }, path),
};

// Built-in pipes (can be used with | syntax)
const builtinPipes = {
  // Formatting
  currency: (v: number, code = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(v),
  percent: (v: number, decimals = 0) => (v * 100).toFixed(decimals) + '%',
  number: (v: number, decimals = 2) => v.toFixed(decimals),
  date: (v: Date | string, format = 'YYYY-MM-DD') => formatDate(new Date(v), format),
  json: (v: any) => JSON.stringify(v, null, 2),
  
  // String
  uppercase: (s: string) => s.toUpperCase(),
  lowercase: (s: string) => s.toLowerCase(),
  capitalize: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
  truncate: (s: string, len: number, suffix = '...') => 
    s.length > len ? s.slice(0, len - suffix.length) + suffix : s,
  
  // Array
  pluck: <T>(arr: T[], key: keyof T) => arr.map(item => item[key]),
  groupBy: <T>(arr: T[], key: keyof T) => arr.reduce((acc, item) => {
    const k = item[key] as string;
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>),
  
  // Mapping
  mapToOptions: <T>(arr: T[], valueKey: keyof T, labelKey: keyof T) => 
    arr.map(item => ({ value: item[valueKey], label: item[labelKey] })),
  
  // Default value
  default: (v: any, defaultValue: any) => v ?? defaultValue,
};
```

### 3.4 Security: No Dynamic Code Generation

The expression engine MUST NOT use:
- `new Function()`
- `eval()`
- `with(scope) {}`

Instead, expressions are compiled to an AST and evaluated through a safe interpreter:

```typescript
function evaluate(ast: ExprAST, context: ExpressionContext): any {
  switch (ast.kind) {
    case 'literal':
      return ast.value;
      
    case 'path':
      // Track dependency
      const path = ast.segments.join('.');
      context.trackAccess(path);
      return context.resolve(path);
      
    case 'binary':
      const left = evaluate(ast.left, context);
      const right = evaluate(ast.right, context);
      return applyBinaryOp(ast.op, left, right);
      
    case 'call':
      const fn = builtinFunctions[ast.fn];
      if (!fn) throw new Error(`Unknown function: ${ast.fn}`);
      const args = ast.args.map(arg => evaluate(arg, context));
      return fn(...args);
      
    case 'pipe':
      let value = evaluate(ast.input, context);
      for (const pipe of ast.pipes) {
        const pipeFn = builtinPipes[pipe.name];
        if (!pipeFn) throw new Error(`Unknown pipe: ${pipe.name}`);
        const pipeArgs = pipe.args.map(arg => evaluate(arg, context));
        value = pipeFn(value, ...pipeArgs);
      }
      return value;
      
    // ... other cases
  }
}
```

---

## Part IV: Lexical Scope System

### 4.1 Scope Definition

```typescript
interface Scope {
  // Unique scope identifier
  id: string;
  
  // Parent scope (null for root)
  parent: Scope | null;
  
  // Whether this scope is isolated from parent
  isolated: boolean;
  
  // Own data (static, set during initialization)
  data: Map<string, any>;
  
  // Own cells (reactive state)
  cells: Map<string, Cell<any>>;
  
  // Named data sources
  sources: Map<string, DataSourceInstance>;
  
  // Namespace registrations (for domain controls)
  namespaces: Map<string, NamespaceInstance>;
  
  // Services (injected from host)
  services: ServiceRegistry;
  
  // Create child scope
  child(config: ChildScopeConfig): Scope;
  
  // Resolve path to value (with parent traversal)
  resolve(path: string): any;
  
  // Check if path exists
  has(path: string): boolean;
  
  // Get or create cell at path
  cell(path: string): Cell<any>;
  
  // Write value at path (creates cell if needed)
  setValue(path: string, value: any): void;
  
  // Apply patch to data
  patch(patch: DataPatch): void;
  
  // Subscribe to path changes
  subscribe(path: string, listener: (value: any, prev: any) => void): Unsubscribe;
  
  // Dispose scope (cleanup all subscriptions, effects)
  dispose(): void;
}

interface ChildScopeConfig {
  id: string;
  isolated?: boolean;  // Default: false
  data?: Record<string, any>;
  sources?: Record<string, DataSourceDefinition>;
}
```

### 4.2 Scope Hierarchy

```
RootScope (application level)
│   data: { user, config }
│   services: { api, i18n, router }
│
├── PageScope (page level)
│   │   data: { pageTitle }
│   │   sources: { users: Query }
│   │
│   ├── FormScope (form level)
│   │   │   data: { formValues }
│   │   │   cells: { name, email, address.* }
│   │   │
│   │   └── FieldScope (repeating field)
│   │       isolated: true  // For performance
│   │       data: { $slot: { item, index } }
│   │
│   └── TableScope (table level)
│       │
│       └── RowScope[0..n] (row level)
│           isolated: true  // For performance
│           data: { record, index, selected }
│
└── DialogScope (dialog level)
    isolated: true  // Independent data environment
    data: { dialogData }
```

### 4.3 Path Resolution Rules

```typescript
function resolve(scope: Scope, path: string): any {
  const segments = path.split('.');
  const rootSegment = segments[0];
  
  // Special prefixes
  if (rootSegment === '$slot') {
    // Slot parameters
    return resolvePath(scope.data.get('$slot'), segments.slice(1).join('.'));
  }
  if (rootSegment === '$parent') {
    // Explicit parent access
    if (!scope.parent) return undefined;
    return resolve(scope.parent, segments.slice(1).join('.'));
  }
  if (rootSegment === '$root') {
    // Root scope access
    let root = scope;
    while (root.parent) root = root.parent;
    return resolve(root, segments.slice(1).join('.'));
  }
  
  // Standard resolution: own → parent (unless isolated)
  // 1. Check own data
  if (scope.data.has(rootSegment)) {
    return resolvePath(scope.data, path);
  }
  
  // 2. Check own cells
  if (scope.cells.has(rootSegment)) {
    const cell = scope.cells.get(rootSegment)!;
    if (segments.length === 1) return cell.get();
    return resolvePath(cell.get(), segments.slice(1).join('.'));
  }
  
  // 3. Check named sources
  if (scope.sources.has(rootSegment)) {
    const source = scope.sources.get(rootSegment)!;
    if (segments.length === 1) return source.data;
    return resolvePath(source, segments.slice(1).join('.'));
  }
  
  // 4. Check parent (unless isolated)
  if (scope.parent && !scope.isolated) {
    return resolve(scope.parent, path);
  }
  
  return undefined;
}
```

### 4.4 Change Propagation

```typescript
interface DataPatch {
  // Specific path changes
  changes: Map<string, { prev: any; next: any }>;
  
  // Whether this is a structural change (added/removed properties)
  structural: boolean;
}

// Scope notifies subscribers of specific path changes
function notifyChange(scope: Scope, path: string, prev: any, next: any): void {
  // Notify exact path subscribers
  const listeners = scope.subscriptions.get(path);
  if (listeners) {
    for (const listener of listeners) {
      listener(next, prev);
    }
  }
  
  // Notify wildcard subscribers (path.*)
  const wildcardPath = path.split('.').slice(0, -1).join('.') + '.*';
  const wildcardListeners = scope.subscriptions.get(wildcardPath);
  if (wildcardListeners) {
    for (const listener of wildcardListeners) {
      listener(next, prev);
    }
  }
  
  // Notify parent path subscribers (for structural changes)
  // e.g., if 'user.address.city' changes, notify 'user.address' and 'user' subscribers
}
```

---

## Part V: Dependency Tracking & Reactive Updates

### 5.1 Dependency Collection

```typescript
interface DependencyTracker {
  // Start tracking dependencies
  startTracking(): void;
  
  // Record an access
  recordAccess(path: string): void;
  
  // Stop tracking and return collected dependencies
  stopTracking(): string[];
}

// During expression evaluation, all path accesses are recorded
function evaluateWithTracking(expr: CompiledExpr, scope: Scope): { value: any; deps: string[] } {
  const tracker = new DependencyTracker();
  tracker.startTracking();
  
  const context = createExpressionContext(scope, tracker);
  const value = expr.evaluate(context);
  
  const deps = tracker.stopTracking();
  return { value, deps };
}
```

### 5.2 Subscription System

```typescript
// Three types of consumers with different behaviors
type Consumer = 
  | ValueConsumer      // Expression value → re-compute on change
  | DataSourceConsumer // Named data source → refresh on change
  | ReactionConsumer;  // Side-effect observer → maybe trigger action

interface ValueConsumer {
  kind: 'value';
  deps: string[];
  compute: () => any;
  onInvalidate: () => void;
}

interface DataSourceConsumer {
  kind: 'source';
  sourceId: string;
  deps: string[];
  refreshPolicy: 'eager' | 'lazy' | 'manual';
  // Self-write protection: writes by this source don't trigger its own refresh
  selfWritePaths: Set<string>;
}

interface ReactionConsumer {
  kind: 'reaction';
  deps: string[];
  condition?: CompiledExpr<boolean>;
  action: CompiledAction;
}

// Subscription manager
interface SubscriptionManager {
  // Register consumer
  register(consumer: Consumer): Unsubscribe;
  
  // Notify of path change
  notify(path: string, prev: any, next: any): void;
}
```

### 5.3 Self-Write Protection

```typescript
// Named data sources write data to scope, but should not trigger their own refresh
function handleDataSourceWrite(source: DataSourceInstance, scope: Scope, data: any): void {
  // Mark that we're in a self-write transaction
  scope.beginSelfWrite(source.id);
  
  // Write data
  scope.setValue(source.outputPath, data);
  
  // End self-write transaction
  scope.endSelfWrite(source.id);
}

// During notify, check if source is in self-write mode
function shouldNotifySource(source: DataSourceConsumer, changedPath: string, scope: Scope): boolean {
  if (scope.isInSelfWrite(source.sourceId) && source.selfWritePaths.has(changedPath)) {
    return false; // Skip - self-write protection
  }
  return source.deps.some(dep => pathMatches(dep, changedPath));
}
```

---

## Part VI: Rendering & Component System

### 6.1 Renderer Registry

```typescript
interface RendererRegistry {
  // Register a renderer
  register(definition: RendererDefinition): void;
  
  // Get renderer by type
  get(type: string): Renderer | undefined;
  
  // Check if type is registered
  has(type: string): boolean;
  
  // List all registered types
  list(): string[];
}

interface RendererDefinition {
  // Type identifier
  type: string;
  
  // Component category
  category: 'layout' | 'control' | 'composite' | 'domain';
  
  // Schema definition (for validation and IntelliSense)
  schema: RendererSchema;
  
  // Render function
  render: (props: RendererComponentProps) => RenderOutput;
}

interface RendererSchema {
  // Prop definitions
  props: Record<string, PropDefinition>;
  
  // Region definitions (named child slots)
  regions?: Record<string, RegionDefinition>;
  
  // Event definitions
  events?: string[];
  
  // Default values
  defaults?: Record<string, any>;
}
```

### 6.2 Resolved Node Props

```typescript
interface RendererComponentProps<Props = any, Regions extends string = string> {
  // Resolved props (all expressions evaluated)
  props: Props;
  
  // Control metadata
  meta: NodeMeta;
  
  // Region render handles
  regions: Record<Regions, RegionHandle>;
  
  // Event handlers
  events: Record<string, EventHandler>;
  
  // Helpers
  helpers: RendererHelpers;
}

interface NodeMeta {
  id: string;
  visible: boolean;
  disabled: boolean;
  readOnly: boolean;
  className?: string;
  testId?: string;
  
  // Accessibility
  aria?: AriaAttributes;
}

interface RegionHandle {
  // Render the region
  render(data?: Record<string, any>): RenderOutput;
  
  // Check if region has children
  isEmpty: boolean;
  
  // Number of children
  count: number;
}

interface RendererHelpers {
  // Render ad-hoc schema fragment
  renderFragment(schema: SchemaAST, data?: Record<string, any>): RenderOutput;
  
  // Evaluate expression in current scope
  evaluate<T>(expr: string): T;
  
  // Dispatch action
  dispatch(action: Action): Promise<ActionResult>;
  
  // Access current scope
  scope: Scope;
  
  // Access services
  services: ServiceRegistry;
}
```

### 6.3 Layout vs Control Components

**Layout Components** (category: 'layout'):
- Emit marker class names only
- No built-in visual styles
- Examples: `page`, `container`, `flex`, `grid`, `panel`

```typescript
// Example: Container renderer
function ContainerRenderer({ props, meta, regions }: RendererComponentProps) {
  return (
    <div 
      className={cn('nop-container', meta.className)}
      data-testid={meta.testId}
    >
      {regions.body.render()}
    </div>
  );
}
```

**Control Components** (category: 'control'):
- Self-contained UI controls
- Include built-in visual styles
- Examples: `input-text`, `select`, `button`, `table`, `code-editor`

```typescript
// Example: InputText renderer
function InputTextRenderer({ props, meta, events }: RendererComponentProps<InputTextProps>) {
  return (
    <Input
      value={props.value}
      placeholder={props.placeholder}
      disabled={meta.disabled}
      readOnly={meta.readOnly}
      className={cn('nop-input-text', meta.className)}
      onChange={(e) => events.onChange?.(e.target.value)}
      onBlur={() => events.onBlur?.()}
    />
  );
}
```

### 6.4 Region Parameters

```yaml
# Schema with parameterized region
type: table
props:
  data: ${users}
columns:
  - key: name
    label: "Name"
    render:
      # $slot.record and $slot.index are available here
      type: text
      props:
        content: ${$slot.record.firstName + ' ' + $slot.record.lastName}
```

```typescript
// When rendering the cell region
interface CellRegionParams {
  record: any;
  index: number;
  column: ColumnDefinition;
}

// The region handle injects these into a child scope
function renderCellRegion(params: CellRegionParams): RenderOutput {
  const childScope = scope.child({
    id: `row-${params.index}-col-${params.column.key}`,
    data: { $slot: params },
    isolated: true, // Performance: don't inherit parent
  });
  
  return renderNode(cellSchema, childScope);
}
```

---

## Part VII: Action System

### 7.1 Action Structure

```typescript
interface ActionDefinition {
  // Action identifier
  action: string;
  
  // Action arguments (can contain expressions)
  args?: Record<string, SchemaValue>;
  
  // Condition guard
  when?: string;  // Expression
  
  // Success continuation
  then?: ActionDefinition | ActionDefinition[];
  
  // Error handler
  onError?: ActionDefinition;
  
  // Concurrency control
  parallel?: ActionDefinition[];
  
  // Retry configuration
  retry?: { count: number; delay: number };
  
  // Timeout
  timeout?: number;
  
  // Debounce
  debounce?: number;
}

// Compiled action
interface CompiledAction {
  id: string;
  
  // Resolved action type and resolver
  resolver: ActionResolver;
  
  // Compiled arguments
  args: Map<string, CompiledExpr>;
  
  // Compiled guard
  when?: CompiledExpr<boolean>;
  
  // Compiled continuations
  then?: CompiledAction[];
  onError?: CompiledAction;
  parallel?: CompiledAction[];
  
  // Config
  retry?: { count: number; delay: number };
  timeout?: number;
  debounce?: number;
}
```

### 7.2 Three-Layer Action Resolution

```typescript
type ActionResolver = 
  | BuiltinActionResolver
  | ComponentActionResolver
  | NamespaceActionResolver;

// Layer 1: Built-in platform actions
interface BuiltinActionResolver {
  kind: 'builtin';
  action: string;
  // e.g., 'setValue', 'ajax', 'dialog', 'submitForm', 'closeDialog', 'toast', 'navigate'
}

// Layer 2: Component instance actions
interface ComponentActionResolver {
  kind: 'component';
  // Format: 'component:<instanceId>:<method>'
  instanceId: string;
  method: string;
  // e.g., 'component:userTable:refresh', 'component:userTable:getSelected'
}

// Layer 3: Namespace actions
interface NamespaceActionResolver {
  kind: 'namespace';
  // Format: '<namespace>:<method>'
  namespace: string;
  method: string;
  // e.g., 'designer:export', 'spreadsheet:getCellValue'
}

// Resolution algorithm
function resolveAction(actionStr: string, scope: Scope): ActionResolver {
  // Check for component: prefix
  if (actionStr.startsWith('component:')) {
    const [_, instanceId, method] = actionStr.split(':');
    return { kind: 'component', instanceId, method };
  }
  
  // Check for namespace prefix
  if (actionStr.includes(':')) {
    const [namespace, method] = actionStr.split(':');
    // Verify namespace is registered in scope chain
    let current: Scope | null = scope;
    while (current) {
      if (current.namespaces.has(namespace)) {
        return { kind: 'namespace', namespace, method };
      }
      current = current.parent;
    }
    throw new Error(`Unknown namespace: ${namespace}`);
  }
  
  // Default: built-in action
  if (!builtinActions.has(actionStr)) {
    throw new Error(`Unknown action: ${actionStr}`);
  }
  return { kind: 'builtin', action: actionStr };
}
```

### 7.3 Built-in Actions

```typescript
const builtinActions = {
  // Data manipulation
  setValue: async (args: { path: string; value: any }, ctx: ActionContext) => {
    ctx.scope.setValue(args.path, args.value);
    return { success: true };
  },
  
  patch: async (args: { data: Record<string, any> }, ctx: ActionContext) => {
    for (const [path, value] of Object.entries(args.data)) {
      ctx.scope.setValue(path, value);
    }
    return { success: true };
  },
  
  // API calls
  ajax: async (args: AjaxArgs, ctx: ActionContext) => {
    const response = await ctx.services.api.request(args);
    if (args.target) {
      ctx.scope.setValue(args.target, response.data);
    }
    return { success: true, data: response.data };
  },
  
  // Navigation
  navigate: async (args: { url: string; params?: Record<string, any> }, ctx: ActionContext) => {
    await ctx.services.router.navigate(args.url, args.params);
    return { success: true };
  },
  
  // Dialog
  openDialog: async (args: { id: string; data?: Record<string, any> }, ctx: ActionContext) => {
    const result = await ctx.services.surface.openDialog(args);
    return { success: true, data: result };
  },
  
  closeDialog: async (args: { result?: any }, ctx: ActionContext) => {
    ctx.services.surface.closeDialog(args.result);
    return { success: true };
  },
  
  // Form
  submitForm: async (args: { formId?: string }, ctx: ActionContext) => {
    const form = args.formId ? ctx.scope.resolve(`$form.${args.formId}`) : ctx.scope.resolve('$form');
    if (!form) throw new Error('No form in scope');
    const result = await form.submit();
    return result;
  },
  
  resetForm: async (args: { formId?: string; values?: Record<string, any> }, ctx: ActionContext) => {
    const form = args.formId ? ctx.scope.resolve(`$form.${args.formId}`) : ctx.scope.resolve('$form');
    if (!form) throw new Error('No form in scope');
    form.reset(args.values);
    return { success: true };
  },
  
  validateForm: async (args: { formId?: string; path?: string }, ctx: ActionContext) => {
    const form = args.formId ? ctx.scope.resolve(`$form.${args.formId}`) : ctx.scope.resolve('$form');
    if (!form) throw new Error('No form in scope');
    const valid = await form.validate(args.path);
    return { success: true, valid };
  },
  
  // Toast
  toast: async (args: { message: string; type?: 'info' | 'success' | 'warning' | 'error' }, ctx: ActionContext) => {
    ctx.services.toast.show(args.message, args.type);
    return { success: true };
  },
  
  // Data source
  refreshSource: async (args: { source: string }, ctx: ActionContext) => {
    const source = ctx.scope.sources.get(args.source);
    if (!source) throw new Error(`Unknown source: ${args.source}`);
    await source.refresh();
    return { success: true };
  },
  
  invalidateQuery: async (args: { key: string | string[] }, ctx: ActionContext) => {
    ctx.services.queryCache.invalidate(args.key);
    return { success: true };
  },
};
```

### 7.4 Action Result & Control Flow

```typescript
type ActionResult = 
  | { status: 'success'; data?: any }
  | { status: 'error'; error: Error }
  | { status: 'skipped'; reason: string };

interface ActionContext {
  scope: Scope;
  services: ServiceRegistry;
  event?: Event;
  prevResult?: ActionResult;
  resultChain: ActionResult[];
}

// Control flow execution
async function executeAction(action: CompiledAction, ctx: ActionContext): Promise<ActionResult> {
  // Check guard
  if (action.when) {
    const shouldRun = action.when.evaluate(ctx.scope);
    if (!shouldRun) {
      return { status: 'skipped', reason: 'Guard condition false' };
    }
  }
  
  try {
    // Apply timeout if configured
    const executePromise = executeActionCore(action, ctx);
    const result = action.timeout
      ? await withTimeout(executePromise, action.timeout)
      : await executePromise;
    
    // Execute success continuation
    if (action.then && result.status === 'success') {
      const thenCtx = { ...ctx, prevResult: result, resultChain: [...ctx.resultChain, result] };
      for (const thenAction of action.then) {
        await executeAction(thenAction, thenCtx);
      }
    }
    
    return result;
  } catch (error) {
    const errorResult: ActionResult = { status: 'error', error: error as Error };
    
    // Execute error handler
    if (action.onError) {
      const errorCtx = { ...ctx, prevResult: errorResult, resultChain: [...ctx.resultChain, errorResult] };
      // Add error to scope for access in onError expressions
      errorCtx.scope.setValue('$error', error);
      await executeAction(action.onError, errorCtx);
    }
    
    return errorResult;
  }
}

// Parallel execution
async function executeParallel(actions: CompiledAction[], ctx: ActionContext): Promise<ActionResult[]> {
  const promises = actions.map(action => executeAction(action, ctx));
  const results = await Promise.allSettled(promises);
  return results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error', error: r.reason });
}
```

---

## Part VIII: Form Runtime

### 8.1 Form Scope & Runtime

```typescript
interface FormRuntime {
  // Form ID
  id: string;
  
  // Form state (observable)
  state: FormState;
  
  // Validation engine
  validationEngine: ValidationEngine;
  
  // Submit handler
  submit: () => Promise<ActionResult>;
  
  // Reset handler
  reset: (values?: Record<string, any>) => void;
  
  // Field-level operations
  setFieldValue: (path: string, value: any) => void;
  setFieldError: (path: string, errors: string[]) => void;
  setFieldTouched: (path: string, touched: boolean) => void;
  
  // Validation
  validate: (path?: string) => Promise<boolean>;
  
  // Draft mode (for nested editors)
  enterDraftMode: () => void;
  commitDraft: () => void;
  discardDraft: () => void;
}

// Form is created as a scope extension
function createFormScope(parent: Scope, formDef: CompiledFormDefinition): Scope {
  const formRuntime = new FormRuntime(formDef);
  
  const formScope = parent.child({
    id: formDef.id,
    data: {
      $form: formRuntime,
      ...formDef.initialValues,
    },
  });
  
  // Create cells for all form fields
  for (const [path, fieldDef] of formDef.fields) {
    const initialValue = resolvePath(formDef.initialValues, path) ?? fieldDef.defaultValue;
    formScope.cells.set(path, createCell(initialValue, {
      onChange: (value) => formRuntime.handleFieldChange(path, value),
    }));
  }
  
  return formScope;
}
```

### 8.2 Validation Engine

```typescript
interface ValidationEngine {
  // Compiled validation graph
  validationGraph: ValidationGraph;
  
  // Validate all fields
  validateAll(): Promise<ValidationResults>;
  
  // Validate specific path
  validatePath(path: string): Promise<ValidationResult>;
  
  // Validate tree (path and all descendants)
  validateTree(path: string): Promise<ValidationResults>;
  
  // Get current errors
  getErrors(): Record<string, string[]>;
  
  // Clear errors
  clearErrors(path?: string): void;
}

interface ValidationGraph {
  // Rules organized by path
  byPath: Map<string, CompiledValidationRule[]>;
  
  // Dependencies: which paths trigger re-validation of which other paths
  dependencies: Map<string, string[]>;
  
  // Object-level rules
  objectRules: Map<string, CompiledValidationRule[]>;
  
  // Array-level rules
  arrayRules: Map<string, CompiledValidationRule[]>;
}

interface CompiledValidationRule {
  id: string;
  path: string;
  validate: CompiledExpr<boolean> | ((ctx: ValidationContext) => boolean | Promise<boolean>);
  message: CompiledExpr<string>;
  trigger: ValidationTrigger[];
  async: boolean;
  debounce?: number;
  when?: CompiledExpr<boolean>;
  dependsOn: string[];
  level: 'error' | 'warning' | 'info';
  priority: number;
}

// Validation execution
async function executeValidation(
  rules: CompiledValidationRule[],
  ctx: ValidationContext
): Promise<ValidationResult[]> {
  // Sort by priority
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
  
  const results: ValidationResult[] = [];
  
  for (const rule of sortedRules) {
    // Check condition
    if (rule.when && !rule.when.evaluate(ctx.scope)) {
      continue;
    }
    
    let valid: boolean;
    if (typeof rule.validate === 'function') {
      valid = await rule.validate(ctx);
    } else {
      valid = rule.validate.evaluate(ctx.scope);
    }
    
    if (!valid) {
      const message = rule.message.evaluate(ctx.scope);
      results.push({
        ruleId: rule.id,
        path: rule.path,
        valid: false,
        message,
        level: rule.level,
      });
    }
  }
  
  return results;
}
```

### 8.3 Draft Mode

```typescript
// Draft mode isolates validation state for nested editors
interface DraftState {
  // Original values at draft start
  originalValues: Record<string, any>;
  
  // Draft-specific errors
  draftErrors: Record<string, string[]>;
  
  // Draft-specific dirty state
  draftDirty: boolean;
}

function enterDraftMode(form: FormRuntime): void {
  form.draftState = {
    originalValues: JSON.parse(JSON.stringify(form.state.values)),
    draftErrors: {},
    draftDirty: false,
  };
}

function commitDraft(form: FormRuntime): void {
  if (!form.draftState) return;
  
  // Merge draft errors into main errors
  for (const [path, errors] of Object.entries(form.draftState.draftErrors)) {
    form.state.errors[path] = errors;
  }
  
  // Update dirty state
  form.state.isDirty = form.state.isDirty || form.draftState.draftDirty;
  
  form.draftState = null;
}

function discardDraft(form: FormRuntime): void {
  if (!form.draftState) return;
  
  // Restore original values
  form.setValues(form.draftState.originalValues, { replace: true });
  
  form.draftState = null;
}
```

---

## Part IX: API & Data Sources

### 9.1 Named Data Source

```typescript
interface DataSourceDefinition {
  // Data source ID
  id: string;
  
  // Query definition (for Query-based sources)
  query?: QueryDefinition;
  
  // Effect definition (for Effect-based sources)
  effect?: EffectDefinition;
  
  // Output path in scope
  outputPath: string;
  
  // Refresh policy
  refresh: 'manual' | 'onMount' | 'onDepsChange' | { interval: number };
  
  // Dependencies that trigger refresh
  deps?: string[];
  
  // Transform before writing to scope
  transform?: CompiledExpr;
  
  // Loading/error state output paths
  loadingPath?: string;
  errorPath?: string;
}

interface DataSourceInstance {
  // Current data
  data: any;
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: Error | null;
  
  // Refresh the data source
  refresh: () => Promise<void>;
  
  // Dispose (cleanup)
  dispose: () => void;
}

// Create data source instance
function createDataSource(def: DataSourceDefinition, scope: Scope): DataSourceInstance {
  const instance: DataSourceInstance = {
    data: undefined,
    isLoading: false,
    error: null,
    refresh: async () => { /* ... */ },
    dispose: () => { /* ... */ },
  };
  
  // Setup based on type
  if (def.query) {
    setupQuerySource(instance, def, scope);
  } else if (def.effect) {
    setupEffectSource(instance, def, scope);
  }
  
  // Setup refresh policy
  if (def.refresh === 'onMount') {
    instance.refresh();
  } else if (def.refresh === 'onDepsChange' && def.deps) {
    for (const dep of def.deps) {
      scope.subscribe(dep, () => {
        // Self-write protection: don't refresh if we caused the change
        if (!scope.isInSelfWrite(def.id)) {
          instance.refresh();
        }
      });
    }
  } else if (typeof def.refresh === 'object') {
    const intervalId = setInterval(() => instance.refresh(), def.refresh.interval);
    const originalDispose = instance.dispose;
    instance.dispose = () => {
      clearInterval(intervalId);
      originalDispose();
    };
  }
  
  return instance;
}
```

### 9.2 Reaction (Side-Effect Observer)

```typescript
interface ReactionDefinition {
  // Reaction ID
  id: string;
  
  // Paths to observe
  watch: string[];
  
  // Condition (optional)
  when?: CompiledExpr<boolean>;
  
  // Action to dispatch
  action: CompiledAction;
  
  // Debounce
  debounce?: number;
}

function createReaction(def: ReactionDefinition, scope: Scope): Unsubscribe {
  let debounceTimer: any = null;
  
  const handler = () => {
    // Check condition
    if (def.when && !def.when.evaluate(scope)) {
      return;
    }
    
    // Dispatch action (with debounce if configured)
    if (def.debounce) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        executeAction(def.action, { scope, services: scope.services, resultChain: [] });
      }, def.debounce);
    } else {
      executeAction(def.action, { scope, services: scope.services, resultChain: [] });
    }
  };
  
  // Subscribe to all watched paths
  const unsubscribes = def.watch.map(path => scope.subscribe(path, handler));
  
  return () => {
    clearTimeout(debounceTimer);
    unsubscribes.forEach(unsub => unsub());
  };
}
```

---

## Part X: Surface System (Dialogs & Drawers)

### 10.1 Surface Manager

```typescript
interface SurfaceManager {
  // Current surface stack
  stack: Surface[];
  
  // Open a dialog
  openDialog(config: SurfaceConfig): Promise<any>;
  
  // Open a drawer
  openDrawer(config: SurfaceConfig): Promise<any>;
  
  // Close the top surface
  close(result?: any): void;
  
  // Close a specific surface by ID
  closeById(id: string, result?: any): void;
  
  // Close all surfaces
  closeAll(): void;
  
  // Get the active (top) surface
  getActive(): Surface | null;
}

interface Surface {
  // Unique surface ID
  id: string;
  
  // Surface type
  type: 'dialog' | 'drawer';
  
  // Surface scope (independent data environment)
  scope: Scope;
  
  // Schema to render
  schema: CompiledNode;
  
  // Promise resolver (for async open/close pattern)
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  
  // Surface options
  options: SurfaceOptions;
}

interface SurfaceConfig {
  // Optional ID (auto-generated if not provided)
  id?: string;
  
  // Schema to render (ID reference or inline)
  schema: string | SchemaAST;
  
  // Initial data for surface scope
  data?: Record<string, any>;
  
  // Options
  options?: SurfaceOptions;
}

interface SurfaceOptions {
  // Dialog/drawer size
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  // Position (for drawer)
  position?: 'left' | 'right' | 'top' | 'bottom';
  
  // Close on overlay click
  closeOnOverlay?: boolean;
  
  // Close on escape key
  closeOnEscape?: boolean;
  
  // Show close button
  showCloseButton?: boolean;
}
```

### 10.2 Surface Stack Management

```typescript
class SurfaceManagerImpl implements SurfaceManager {
  stack: Surface[] = [];
  
  async openDialog(config: SurfaceConfig): Promise<any> {
    return this.open({ ...config, type: 'dialog' });
  }
  
  async openDrawer(config: SurfaceConfig): Promise<any> {
    return this.open({ ...config, type: 'drawer' });
  }
  
  private async open(config: SurfaceConfig & { type: 'dialog' | 'drawer' }): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create independent scope for surface
      const surfaceScope = this.rootScope.child({
        id: config.id ?? generateId(),
        isolated: true, // Independent data environment
        data: config.data ?? {},
      });
      
      // Compile schema if needed
      const schema = typeof config.schema === 'string'
        ? this.schemaRegistry.get(config.schema)
        : this.compiler.compile(config.schema);
      
      const surface: Surface = {
        id: surfaceScope.id,
        type: config.type,
        scope: surfaceScope,
        schema,
        resolve,
        reject,
        options: config.options ?? {},
      };
      
      // Push to stack
      this.stack.push(surface);
      
      // Update focus to new surface
      this.focusTopSurface();
      
      // Notify listeners
      this.emit('surfaceOpened', surface);
    });
  }
  
  close(result?: any): void {
    const surface = this.stack.pop();
    if (!surface) return;
    
    // Resolve the promise
    surface.resolve(result);
    
    // Dispose surface scope
    surface.scope.dispose();
    
    // Focus previous surface or main content
    this.focusTopSurface();
    
    // Notify listeners
    this.emit('surfaceClosed', surface);
  }
  
  private focusTopSurface(): void {
    const top = this.stack[this.stack.length - 1];
    // Only top surface receives keyboard events
    // Implement focus trap
  }
}
```

---

## Part XI: Table & Collection Rendering

### 11.1 Isolated Row Scopes

```typescript
// Table creates isolated scopes for each row for performance
function createTableRowScope(
  tableScope: Scope,
  record: any,
  index: number,
  projections?: Record<string, string>  // Explicit projections from parent
): Scope {
  // Prepare projected data
  const projected: Record<string, any> = {};
  if (projections) {
    for (const [localName, parentPath] of Object.entries(projections)) {
      projected[localName] = tableScope.resolve(parentPath);
    }
  }
  
  return tableScope.child({
    id: `row-${index}`,
    isolated: true,  // Critical for performance
    data: {
      record,
      index,
      $slot: { item: record, index },
      ...projected,
    },
  });
}

// Row data change should NOT affect other rows
function handleRowDataChange(rowScope: Scope, path: string, value: any): void {
  // Only notify within this row's scope
  rowScope.setValue(path, value);
  // Parent table scope is NOT notified (isolated)
}
```

### 11.2 Loop Node

```typescript
interface LoopNodeDefinition {
  type: 'loop';
  
  // Collection to iterate
  items: CompiledExpr;
  
  // Item variable name (accessible as $slot.item or direct name)
  as: string;
  
  // Index variable name
  indexAs?: string;
  
  // Key extractor for stable identity
  keyBy: string | CompiledExpr;
  
  // Child template (compiled once, instantiated per item)
  template: CompiledNode;
  
  // Whether to isolate item scopes (default: true)
  isolated?: boolean;
}

// Loop rendering
function renderLoop(loopDef: LoopNodeDefinition, scope: Scope): RenderOutput[] {
  const items = loopDef.items.evaluate(scope);
  if (!Array.isArray(items)) return [];
  
  return items.map((item, index) => {
    // Compute stable key
    const key = typeof loopDef.keyBy === 'string'
      ? item[loopDef.keyBy]
      : loopDef.keyBy.evaluate({ ...scope, data: { ...scope.data, [loopDef.as]: item } });
    
    // Create item scope
    const itemScope = scope.child({
      id: `loop-item-${key}`,
      isolated: loopDef.isolated ?? true,
      data: {
        [loopDef.as]: item,
        [loopDef.indexAs ?? 'index']: index,
        $slot: { item, index },
      },
    });
    
    // Render template in item scope
    return renderNode(loopDef.template, itemScope);
  });
}
```

### 11.3 Recursive Schema

```typescript
// Recursive structure support
interface SchemaReference {
  $ref: string;  // Reference to schema definition by ID
  props?: Record<string, SchemaValue>;  // Override props
}

// Schema registry for recursive references
interface SchemaRegistry {
  // Register a schema definition
  register(id: string, schema: SchemaAST): void;
  
  // Get schema by ID
  get(id: string): CompiledNode;
  
  // Resolve $ref references during compilation
  resolveRef(ref: SchemaReference): CompiledNode;
}

// Example: Tree component with recursive children
const treeNodeSchema: SchemaAST = {
  $id: 'tree-node',
  type: 'container',
  body: [
    { type: 'text', props: { content: '${node.label}' } },
    {
      type: 'loop',
      items: '${node.children}',
      as: 'node',
      body: [
        { $ref: 'tree-node' }  // Recursive reference
      ]
    }
  ]
};
```

---

## Part XII: Host Integration

### 12.1 Service Registry

```typescript
interface ServiceRegistry {
  // Core services (provided by host)
  api: ApiService;           // HTTP requests
  router: RouterService;     // Navigation
  toast: ToastService;       // Notifications
  i18n: I18nService;         // Internationalization
  
  // Query cache
  queryCache: QueryCache;
  
  // Surface manager
  surface: SurfaceManager;
  
  // Error handler
  errorHandler: (error: Error, context: ErrorContext) => void;
  
  // Register custom service
  register<T>(name: string, service: T): void;
  
  // Get service
  get<T>(name: string): T | undefined;
}

// Host provides implementations through delegate callbacks
interface HostDelegate {
  // API requests delegated to host
  request: (config: ApiRequestConfig) => Promise<ApiResponse>;
  
  // Navigation delegated to host
  navigate: (url: string, params?: Record<string, any>) => Promise<void>;
  
  // Toast delegated to host
  showToast: (message: string, type?: string) => void;
  
  // Error handling delegated to host
  handleError: (error: Error, context: ErrorContext) => void;
}
```

### 12.2 Domain Control Integration

```typescript
// Domain control (e.g., flow designer, spreadsheet) exposes:
// 1. Read-only state projection to scope
// 2. Namespace actions for commands

interface DomainControlContract {
  // Unique namespace
  namespace: string;
  
  // State projection (read-only, visible in expressions)
  projection: {
    fields: Record<string, TypeDescriptor>;
  };
  
  // Available commands
  commands: {
    [method: string]: {
      params: Record<string, TypeDescriptor>;
      returns: TypeDescriptor;
    };
  };
}

// Example: Flow Designer contract
const flowDesignerContract: DomainControlContract = {
  namespace: 'designer',
  projection: {
    fields: {
      selectedNodes: { kind: 'array', element: { kind: 'primitive', name: 'string' } },
      canUndo: { kind: 'primitive', name: 'boolean' },
      canRedo: { kind: 'primitive', name: 'boolean' },
      isDirty: { kind: 'primitive', name: 'boolean' },
    },
  },
  commands: {
    export: { params: { format: { kind: 'primitive', name: 'string' } }, returns: { kind: 'primitive', name: 'string' } },
    import: { params: { data: { kind: 'primitive', name: 'string' } }, returns: { kind: 'primitive', name: 'boolean' } },
    undo: { params: {}, returns: { kind: 'primitive', name: 'boolean' } },
    redo: { params: {}, returns: { kind: 'primitive', name: 'boolean' } },
    zoomToFit: { params: {}, returns: { kind: 'primitive', name: 'void' } },
  },
};

// Domain control registers itself in scope
function registerDomainControl(scope: Scope, control: DomainControl): void {
  // Register namespace for actions
  scope.namespaces.set(control.namespace, {
    invoke: (method, args) => control.executeCommand(method, args),
  });
  
  // Project read-only state to scope
  scope.data.set(`$${control.namespace}`, control.getProjection());
  
  // Subscribe to projection changes
  control.onProjectionChange((projection) => {
    scope.setValue(`$${control.namespace}`, projection);
  });
}
```

### 12.3 Styling Contract

```typescript
// No internal theme system - use CSS variables
// Layout components emit marker classes only

const layoutMarkerClasses = {
  page: 'nop-page',
  container: 'nop-container',
  flex: 'nop-flex',
  grid: 'nop-grid',
  panel: 'nop-panel',
  card: 'nop-card',
};

// Schema drives visual props
interface StyleableProps {
  className?: string;  // Additional classes
  style?: Record<string, string>;  // Inline styles (escape hatch)
  
  // Semantic spacing (resolved to CSS by host theme)
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}
```

---

## Part XIII: Cross-Cutting Concerns

### 13.1 Security

```typescript
// Expression sandbox - no access to global objects
const expressionSandbox = {
  // Allowed globals (safe, immutable)
  Math,
  JSON,
  Date,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  
  // Blocked globals (dangerous)
  // window: BLOCKED
  // document: BLOCKED
  // eval: BLOCKED
  // Function: BLOCKED
  // fetch: BLOCKED (use actions instead)
};

// All user-provided expressions go through the safe evaluator
function safeEvaluate(expr: CompiledExpr, scope: Scope): any {
  const context = createSandboxedContext(scope, expressionSandbox);
  return expr.evaluate(context);
}
```

### 13.2 Performance

```typescript
interface PerformanceConfig {
  // Static zero-overhead: expressions without dynamic parts skip evaluation
  staticOptimization: boolean;
  
  // Reference reuse: memoize expression results
  memoization: boolean;
  
  // Selector subscription: only subscribe to accessed paths
  selectiveSubscription: boolean;
  
  // Row isolation: table rows use isolated scopes
  rowIsolation: boolean;
  
  // Compile-once: schema compiles once, instantiates many times
  singleCompilation: boolean;
}

// Default performance settings
const defaultPerformanceConfig: PerformanceConfig = {
  staticOptimization: true,
  memoization: true,
  selectiveSubscription: true,
  rowIsolation: true,
  singleCompilation: true,
};
```

### 13.3 Internationalization

```typescript
// I18n is handled at compile time
interface I18nConfig {
  // Default locale
  defaultLocale: 'zh-CN' | 'en-US';
  
  // Key prefix
  prefix: 'flux.';
  
  // Translation function (provided by host)
  t: (key: string, params?: Record<string, any>) => string;
}

// During compilation, i18n keys are replaced with resolved strings
// This means no runtime i18n overhead
function compileWithI18n(schema: SchemaAST, i18n: I18nConfig): SchemaAST {
  return transformSchema(schema, (node) => {
    if (node.props) {
      for (const [key, value] of Object.entries(node.props)) {
        if (typeof value === 'string' && value.startsWith('$t(')) {
          // Extract key and resolve at compile time
          const i18nKey = extractI18nKey(value);
          node.props[key] = i18n.t(i18nKey);
        }
      }
    }
    return node;
  });
}
```

### 13.4 DevTools Support

```typescript
interface DevToolsIntegration {
  // Node identification
  getNodeById(id: string): DebugNodeInfo | null;
  
  // Scope inspection
  inspectScope(scopeId: string): ScopeSnapshot;
  
  // Expression evaluation
  evaluateExpression(expr: string, scopeId: string): any;
  
  // Validation state
  getValidationState(formId: string): ValidationSnapshot;
  
  // Action log
  getActionLog(): ActionLogEntry[];
  
  // Diagnostics
  getDiagnostics(): Diagnostic[];
}

interface DebugNodeInfo {
  id: string;
  type: string;
  props: Record<string, any>;
  meta: NodeMeta;
  scopeId: string;
  schemaLocation: SourceLocation;
}
```

---

## Part XIV: Requirements Compliance Checklist

| Section | Requirement | Design Location | Status |
|---------|-------------|-----------------|--------|
| 2.1 | Schema parsing | Part II | ✅ |
| 2.1 | Compilation | Part II | ✅ |
| 2.1 | Value classification | Part II.4 ClassifiedProps | ✅ |
| 2.1 | Region extraction | Part II.6 CompiledRegion | ✅ |
| 2.1 | Progressive value semantics | Part II.2 SchemaValue | ✅ |
| 2.2 | Variable resolution | Part III.2 | ✅ |
| 2.2 | Operations & functions | Part III.3 | ✅ |
| 2.2 | Unified context | Part III.2 ExpressionContext | ✅ |
| 2.2 | Compile once, execute many | Part II CompiledExpr | ✅ |
| 2.2 | No dynamic code | Part III.4 | ✅ |
| 2.3 | Lexical inheritance | Part IV.3 | ✅ |
| 2.3 | Explicit isolation | Part IV.1 isolated flag | ✅ |
| 2.3 | Data initialization | Part IV.1 ChildScopeConfig | ✅ |
| 2.3 | Point write | Part IV.1 setValue | ✅ |
| 2.3 | Change propagation | Part IV.4 | ✅ |
| 2.4 | Implicit dependency collection | Part V.1 | ✅ |
| 2.4 | Precise invalidation | Part V.2 | ✅ |
| 2.4 | Three consumer types | Part V.2 | ✅ |
| 2.4 | Self-write protection | Part V.3 | ✅ |
| 2.4 | Read-write separation | Design principle | ✅ |
| 2.5 | Component registry | Part VI.1 | ✅ |
| 2.5 | Props/Meta separation | Part VI.2 | ✅ |
| 2.5 | Layout vs Control | Part VI.3 | ✅ |
| 2.5 | Fragment rendering | Part VI.2 helpers.renderFragment | ✅ |
| 2.5 | Parameterized regions | Part VI.4 | ✅ |
| 2.6 | Single dispatch | Part VII.1 | ✅ |
| 2.6 | Condition guard | Part VII.1 when | ✅ |
| 2.6 | Success continuation | Part VII.1 then | ✅ |
| 2.6 | Error handling | Part VII.1 onError | ✅ |
| 2.6 | Parallel execution | Part VII.4 | ✅ |
| 2.6 | Retry & timeout | Part VII.1 | ✅ |
| 2.6 | Debounce | Part VII.1 | ✅ |
| 2.6 | Result classification | Part VII.4 ActionResult | ✅ |
| 2.6 | Chain context | Part VII.4 resultChain | ✅ |
| 2.7 | Built-in actions | Part VII.3 | ✅ |
| 2.7 | Component actions | Part VII.2 | ✅ |
| 2.7 | Namespace actions | Part VII.2 | ✅ |
| 2.8 | Form runtime | Part VIII.1 | ✅ |
| 2.8 | Declarative validation | Part VIII.2 | ✅ |
| 2.8 | Validation timing | Part VIII.2 trigger | ✅ |
| 2.8 | Async validation | Part VIII.2 async | ✅ |
| 2.8 | Partial validation | Part VIII.2 validatePath | ✅ |
| 2.8 | Draft isolation | Part VIII.3 | ✅ |
| 2.9 | Declarative API | Part IX.1 | ✅ |
| 2.9 | Scope injection | Part IX.1 deps | ✅ |
| 2.9 | Named data sources | Part IX.1 | ✅ |
| 2.9 | Reaction | Part IX.2 | ✅ |
| 2.10 | Unified surface model | Part X.1 | ✅ |
| 2.10 | Independent scope | Part X.2 isolated | ✅ |
| 2.10 | Stack management | Part X.2 | ✅ |
| 2.10 | Close recovery | Part X.2 | ✅ |
| 2.11 | Row-level scope | Part XI.1 | ✅ |
| 2.11 | Row isolation | Part XI.1 isolated | ✅ |
| 2.11 | Explicit projection | Part XI.1 projections | ✅ |
| 2.12 | Loop structure | Part XI.2 | ✅ |
| 2.12 | Recursive rendering | Part XI.3 | ✅ |
| 2.12 | Compile once | Part XI.2 template | ✅ |
| 3.1 | Data injection | Part XII.1 | ✅ |
| 3.1 | Request delegation | Part XII.1 HostDelegate | ✅ |
| 3.1 | Notification delegation | Part XII.1 | ✅ |
| 3.1 | Navigation delegation | Part XII.1 | ✅ |
| 3.1 | Environment stability | Part XII.1 | ✅ |
| 3.2 | Read-only projection | Part XII.2 | ✅ |
| 3.2 | Namespace commands | Part XII.2 | ✅ |
| 3.2 | Private channel | Part XII.2 | ✅ |
| 3.2 | Static contract | Part XII.2 DomainControlContract | ✅ |
| 3.3 | No theme provider | Part XII.3 | ✅ |
| 3.3 | Marker classes | Part XII.3 | ✅ |
| 3.3 | Schema-driven styling | Part XII.3 | ✅ |
| 4.1 | No runtime permission | Compile-time only | ✅ |
| 4.1 | No dynamic code | Part III.4 | ✅ |
| 4.1 | Controlled expression | Part XIII.1 | ✅ |
| 4.1 | Namespace boundaries | Part VII.2 | ✅ |
| 4.2 | Static zero-overhead | Part XIII.2 | ✅ |
| 4.2 | Reference reuse | Part XIII.2 | ✅ |
| 4.2 | Selector subscription | Part XIII.2 | ✅ |
| 4.2 | Compile once | Part XIII.2 | ✅ |
| 4.2 | High-frequency isolation | Part XIII.2 rowIsolation | ✅ |
| 4.3 | Progressive complexity | Schema value types | ✅ |
| 4.4 | Write/Execute separation | Compilation pipeline | ✅ |
| 5 | I18n | Part XIII.3 | ✅ |
| 6 | Node identification | Part XIII.4 | ✅ |
| 6 | Runtime inspection | Part XIII.4 | ✅ |
| 6 | Diagnostics | Part XIII.4 | ✅ |
| 6 | Error callbacks | Part XII.1 errorHandler | ✅ |

---

## Part XV: Quality Attributes (NEW)

### 15.1 Testability

Core logic is testable without DOM:

```typescript
// Runtime core is framework-agnostic
interface RuntimeCore {
  // Pure functions, no DOM dependency
  compile(schema: SchemaAST): Blueprint;
  evaluate(expr: CompiledExpr, scope: Scope): any;
  validate(rules: CompiledValidationRule[], ctx: ValidationContext): ValidationResult[];
  dispatch(action: CompiledAction, ctx: ActionContext): Promise<ActionResult>;
}

// Test without browser
describe('ExpressionEngine', () => {
  it('evaluates arithmetic', () => {
    const expr = compile('1 + 2 * 3');
    expect(evaluate(expr, emptyScope)).toBe(7);
  });
});
```

### 15.2 Embeddability

Runtime does not pollute global state:

```typescript
interface RuntimeInstance {
  // All state is contained within instance
  id: string;
  rootScope: Scope;
  rendererRegistry: RendererRegistry;
  actionRegistry: ActionRegistry;
  
  // No global side effects
  // No window.* modifications
  // No document.* listeners (except delegated events on mount root)
  
  // Clean disposal
  dispose(): void;
}

// Multiple instances can coexist
const instance1 = createRuntime({ root: div1 });
const instance2 = createRuntime({ root: div2 });
// No interference between instances
```

### 15.3 Extensibility

Clear extension points:

```typescript
interface ExtensionPoints {
  // Component registration
  registerRenderer(def: RendererDefinition): void;
  
  // Action registration
  registerAction(type: string, handler: ActionHandler): void;
  
  // Pipe/function registration
  registerPipe(name: string, fn: PipeFunction): void;
  registerFunction(name: string, fn: BuiltinFunction): void;
  
  // Domain control integration
  registerNamespace(name: string, contract: DomainControlContract): void;
  
  // Validation rule registration
  registerValidationRule(name: string, rule: ValidationRuleFactory): void;
}
```

### 15.4 Type Safety

Compile-time schema validation:

```typescript
interface SchemaValidator {
  // Validate schema against type definitions
  validate(schema: SchemaAST): ValidationResult;
  
  // Check expression types
  checkExpressionType(expr: string, expectedType: TypeDescriptor, scope: TypeScope): TypeError[];
  
  // Validate action arguments
  checkActionArgs(action: ActionSchemaAST, registry: ActionRegistry): ArgumentError[];
  
  // Generate diagnostics
  getDiagnostics(): Diagnostic[];
}

// Integration with IDE (JSON Schema + LSP)
const jsonSchema = generateJSONSchema(rendererRegistry);
// Provides autocomplete, validation, hover info
```

---

## Part XVI: Enhanced Security (NEW)

### 16.1 Expression Sandbox Hardening

```typescript
// Blocked property access patterns
const BLOCKED_PROPERTIES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

// Safe property access
function safeGetProperty(obj: any, key: string): any {
  // Block dangerous properties
  if (BLOCKED_PROPERTIES.has(key)) {
    throw new SecurityError(`Access to '${key}' is not allowed`);
  }
  
  // Block prototype chain access
  if (typeof key === 'string' && key.startsWith('__')) {
    throw new SecurityError(`Access to '${key}' is not allowed`);
  }
  
  // Safe access
  if (obj != null && Object.prototype.hasOwnProperty.call(obj, key)) {
    return obj[key];
  }
  
  return undefined;
}

// Safe function call (for filter/map/find predicates)
function safePredicateCall(fn: any, ...args: any[]): any {
  // Predicates must be compiled expressions, not raw functions
  if (typeof fn === 'function') {
    throw new SecurityError('Raw functions not allowed as predicates');
  }
  
  // fn is a CompiledExpr
  if (fn.kind === 'compiled-predicate') {
    return fn.evaluate(...args);
  }
  
  throw new SecurityError('Invalid predicate');
}
```

### 16.2 Execution Limits

```typescript
interface ExecutionLimits {
  // Maximum expression evaluation time
  maxEvaluationTimeMs: number;  // Default: 100ms
  
  // Maximum recursion depth
  maxRecursionDepth: number;  // Default: 100
  
  // Maximum loop iterations
  maxLoopIterations: number;  // Default: 10000
  
  // Maximum array size
  maxArraySize: number;  // Default: 100000
  
  // Maximum string length
  maxStringLength: number;  // Default: 1000000
}

// Enforced during evaluation
function evaluateWithLimits(ast: ExprAST, context: ExpressionContext, limits: ExecutionLimits): any {
  const startTime = Date.now();
  let recursionDepth = 0;
  
  function evalWithCheck(node: ExprAST): any {
    // Time limit check
    if (Date.now() - startTime > limits.maxEvaluationTimeMs) {
      throw new ExecutionLimitError('Evaluation timeout exceeded');
    }
    
    // Recursion limit check
    recursionDepth++;
    if (recursionDepth > limits.maxRecursionDepth) {
      throw new ExecutionLimitError('Maximum recursion depth exceeded');
    }
    
    try {
      return evaluate(node, context);
    } finally {
      recursionDepth--;
    }
  }
  
  return evalWithCheck(ast);
}
```

---

## Part XVII: Performance Optimization Details (NEW)

### 17.1 Static Node Marking

```typescript
interface CompiledNode {
  // ... existing fields
  
  // Static analysis results
  staticAnalysis: {
    // True if all props are static (no expressions)
    isFullyStatic: boolean;
    
    // List of dynamic prop names
    dynamicProps: string[];
    
    // Depth of deepest dynamic descendant (-1 if fully static)
    dynamicDepth: number;
  };
}

// During resolve, skip static subtrees
function resolveNode(node: CompiledNode, scope: Scope): ResolvedNode {
  if (node.staticAnalysis.isFullyStatic) {
    // Return cached resolved node
    return node.cachedResolved ?? (node.cachedResolved = resolveOnce(node, scope));
  }
  
  // Dynamic resolution
  return resolveWithDeps(node, scope);
}
```

### 17.2 Expression Result Caching (Memoization)

```typescript
interface MemoizedExpr<T> extends CompiledExpr<T> {
  // Cached result
  cachedValue: T | undefined;
  
  // Dependency values at cache time
  cachedDeps: Map<string, any>;
  
  // Check if cache is valid
  isCacheValid(scope: Scope): boolean;
}

function evaluateMemoized<T>(expr: MemoizedExpr<T>, scope: Scope): T {
  // Check cache validity
  if (expr.cachedValue !== undefined && expr.isCacheValid(scope)) {
    return expr.cachedValue;
  }
  
  // Re-evaluate
  const value = expr.evaluate(scope);
  
  // Update cache
  expr.cachedValue = value;
  expr.cachedDeps = new Map();
  for (const dep of expr.deps) {
    expr.cachedDeps.set(dep, scope.resolve(dep));
  }
  
  return value;
}

// Cache validity check uses structural comparison
function isCacheValid<T>(expr: MemoizedExpr<T>, scope: Scope): boolean {
  for (const [path, cachedValue] of expr.cachedDeps) {
    const currentValue = scope.resolve(path);
    if (!structuralEquals(cachedValue, currentValue)) {
      return false;
    }
  }
  return true;
}

// Structural equality (handles objects/arrays)
function structuralEquals(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return a === b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => structuralEquals(v, b[i]));
  }
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => structuralEquals(a[k], b[k]));
  }
  
  return false;
}
```

### 17.3 Dependency Tracking Strategy

**Chosen approach: Static Analysis + First-Run Tracking + Cache**

```typescript
interface DependencyStrategy {
  // Phase 1: Static analysis (compile time)
  staticDeps: string[];  // Extracted from AST
  
  // Phase 2: First-run tracking (first evaluation)
  runtimeDeps: string[] | null;  // null = not yet tracked
  
  // Phase 3: Use cached deps
  finalDeps: string[];  // Union of static + runtime, then cached
}

function extractFinalDeps(expr: CompiledExpr, scope: Scope): string[] {
  if (expr.finalDeps) {
    return expr.finalDeps;  // Use cached
  }
  
  // First-run tracking
  const tracker = new DependencyTracker();
  const context = createTrackingContext(scope, tracker);
  
  expr.evaluate(context);
  
  const runtimeDeps = tracker.getAccessedPaths();
  
  // Final deps = union of static and runtime
  expr.finalDeps = [...new Set([...expr.deps, ...runtimeDeps])];
  
  return expr.finalDeps;
}
```

### 17.4 Batched Notifications

```typescript
class NotificationBatcher {
  private pending: Map<string, { prev: any; next: any }> = new Map();
  private scheduled = false;
  
  notify(path: string, prev: any, next: any): void {
    this.pending.set(path, { prev, next });
    
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => this.flush());
    }
  }
  
  private flush(): void {
    this.scheduled = false;
    const batch = new Map(this.pending);
    this.pending.clear();
    
    // Notify all subscribers with batched changes
    for (const [path, { prev, next }] of batch) {
      this.subscriptionManager.notifyPath(path, prev, next);
    }
  }
}
```

---

## Part XVIII: Remote Fragment Loading (NEW)

### 18.1 Remote Schema Reference

```yaml
# Reference a remote schema fragment
type: page
body:
  - type: container
    body:
      - $remote: /api/schemas/user-form
        fallback:
          type: skeleton
          props:
            rows: 5

  - $remote:
      url: /api/schemas/dynamic-section
      params:
        sectionId: ${currentSection}
      cache: 300000  # 5 minutes
      fallback:
        type: text
        props:
          content: "Loading..."
```

### 18.2 Remote Loading Implementation

```typescript
interface RemoteSchemaRef {
  $remote: string | {
    url: string;
    params?: Record<string, SchemaValue>;
    headers?: Record<string, string>;
    cache?: number;  // Cache duration in ms
    fallback?: SchemaAST;
  };
}

interface RemoteSchemaLoader {
  // Load remote schema
  load(ref: RemoteSchemaRef, scope: Scope): Promise<CompiledNode>;
  
  // Cache management
  invalidate(url: string): void;
  clearCache(): void;
}

class RemoteSchemaLoaderImpl implements RemoteSchemaLoader {
  private cache = new Map<string, { schema: CompiledNode; expiry: number }>();
  
  async load(ref: RemoteSchemaRef, scope: Scope): Promise<CompiledNode> {
    const config = typeof ref.$remote === 'string' 
      ? { url: ref.$remote } 
      : ref.$remote;
    
    // Resolve dynamic params
    const url = this.resolveUrl(config.url, config.params, scope);
    
    // Check cache
    const cached = this.cache.get(url);
    if (cached && cached.expiry > Date.now()) {
      return cached.schema;
    }
    
    // Fetch remote schema
    const response = await this.services.api.request({
      url,
      method: 'GET',
      headers: config.headers,
    });
    
    // Compile fetched schema
    const compiled = this.compiler.compile(response.data);
    
    // Cache if configured
    if (config.cache) {
      this.cache.set(url, {
        schema: compiled,
        expiry: Date.now() + config.cache,
      });
    }
    
    return compiled;
  }
}
```

### 18.3 Loading States

```typescript
// Remote node wrapper with loading states
interface RemoteNodeState {
  status: 'idle' | 'loading' | 'success' | 'error';
  schema: CompiledNode | null;
  error: Error | null;
}

function renderRemoteNode(ref: RemoteSchemaRef, scope: Scope): RenderOutput {
  const [state, setState] = useState<RemoteNodeState>({
    status: 'idle',
    schema: null,
    error: null,
  });
  
  useEffect(() => {
    setState(s => ({ ...s, status: 'loading' }));
    
    remoteLoader.load(ref, scope)
      .then(schema => setState({ status: 'success', schema, error: null }))
      .catch(error => setState({ status: 'error', schema: null, error }));
  }, [ref, scope]);
  
  switch (state.status) {
    case 'loading':
      return renderFallback(ref);
    case 'error':
      return renderError(state.error);
    case 'success':
      return renderNode(state.schema!, scope);
    default:
      return null;
  }
}
```

---

## Part XIX: ValidationTrigger & Async Cancellation (NEW)

### 19.1 Complete ValidationTrigger Definition

```typescript
// Validation execution triggers
type ValidationTrigger = 
  | 'change'   // On value change
  | 'blur'     // On field blur
  | 'focus'    // On field focus
  | 'submit'   // On form submit
  | 'manual';  // Programmatic call only

// Validation UI display policy (separate from execution)
interface ValidationDisplayPolicy {
  // When to show error messages
  showErrorsOn: 'touched' | 'dirty' | 'always' | 'submit-attempt';
  
  // When to clear error messages
  clearErrorsOn: 'change' | 'focus' | 'manual';
  
  // Delay before showing errors (ms)
  showDelay?: number;
}

// Complete validation configuration
interface FieldValidationConfig {
  // Execution rules
  rules: ValidationRule[];
  
  // Display policy
  display: ValidationDisplayPolicy;
  
  // When to run which rules
  triggerMap: Map<ValidationTrigger, string[]>;  // trigger → rule IDs
}
```

### 19.2 Async Validation Cancellation

```typescript
interface AsyncValidationRule extends ValidationRule {
  async: true;
  
  // Validation function receives AbortSignal
  validate: (ctx: ValidationContext, signal: AbortSignal) => Promise<boolean>;
  
  // Debounce config
  debounceMs?: number;
  
  // Auto-cancel previous validation on new trigger
  cancelOnRetrigger: boolean;  // Default: true
}

// Async validation manager
class AsyncValidationManager {
  private pending = new Map<string, AbortController>();
  
  async validate(
    rule: AsyncValidationRule,
    ctx: ValidationContext,
    path: string
  ): Promise<ValidationResult> {
    // Cancel previous validation for this path+rule
    const key = `${path}:${rule.id}`;
    const existingController = this.pending.get(key);
    if (existingController && rule.cancelOnRetrigger) {
      existingController.abort();
    }
    
    // Create new controller
    const controller = new AbortController();
    this.pending.set(key, controller);
    
    try {
      // Apply debounce
      if (rule.debounceMs) {
        await this.debounce(rule.debounceMs, controller.signal);
      }
      
      // Execute validation
      const valid = await rule.validate(ctx, controller.signal);
      
      return {
        ruleId: rule.id,
        path,
        valid,
        message: valid ? undefined : rule.message.evaluate(ctx.scope),
        level: rule.level,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { ruleId: rule.id, path, valid: true, cancelled: true };
      }
      throw error;
    } finally {
      this.pending.delete(key);
    }
  }
  
  private debounce(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Debounce cancelled', 'AbortError'));
      });
    });
  }
  
  // Cancel all pending validations
  cancelAll(): void {
    for (const controller of this.pending.values()) {
      controller.abort();
    }
    this.pending.clear();
  }
}
```

---

## Part XX: Summary (Revised)

This document provides a comprehensive design for the V11 Low-Code DSL Runtime that fully addresses all requirements in `low-code-dsl-runtime-requirements.md`. The design:

1. **Maps V11 primitives to DSL requirements**: Cell, Lens, Value, Action, Effect, Query, and Node provide the foundation
2. **Implements the complete compilation pipeline**: Schema → AST → Blueprint → Node Tree → DOM
3. **Provides secure expression evaluation**: No eval/Function, safe sandbox
4. **Supports lexical scoping with isolation**: Performance optimization for tables and loops
5. **Enables fine-grained reactivity**: Path-level dependency tracking and change propagation
6. **Implements comprehensive action system**: Three-layer resolution with full control flow
7. **Provides complete form runtime**: Validation engine, draft mode, field-level operations
8. **Supports domain control integration**: Read-only projection + namespace commands
9. **Meets all performance requirements**: Static optimization, memoization, isolation

The design is ready for implementation review.

---

*End of V11 Low-Code Design Document*
