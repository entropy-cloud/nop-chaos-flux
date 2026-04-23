# V11: Next-Generation Frontend Programming Model

**Version**: 0.2.1  
**Status**: Revised Design (Architectural Issues Identified)  
**Review Cycle**: 2

---

> **⚠️ ARCHITECTURAL WARNING**
> 
> This document contains execution strategy designs (Resumability, Islands, ExecutionStrategy, QRL) that are **architecturally flawed**. These concepts assume the DSL layer can control framework-level execution, which is incorrect.
> 
> **What's wrong:**
> - `ExecutionStrategy` per node cannot be honored by React
> - `Resumability` requires Qwik's architecture, not implementable on React
> - `Islands` / `hydration: visible|interaction` require framework-level support
> 
> **See**: `v11-final-design.md` for the corrected design that properly separates DSL concerns from framework concerns.
> 
> **What remains valid**: Seven Primitives, Algebraic Schema Calculus, Security Sandbox, Expression Engine design.

---

## Executive Summary

This document presents a **truly next-generation** frontend programming model designed from first principles. After rigorous peer review, the initial design has been substantially revised to address fundamental gaps and ensure genuine innovation beyond existing frameworks.

**Core Differentiators from ALL Existing Frameworks:**

| Concept | Innovation | Why It's Different |
|---------|-----------|-------------------|
| **Resumable-First Architecture** | Zero hydration by default | Unlike React/Vue/Solid, components serialize their state for instant resume |
| **Compile-Time Reactivity** | No runtime VDOM diff | Unlike Solid's runtime signals, generates direct DOM mutation code |
| **Algebraic Schema Calculus** | Formally verifiable compositions | Not marketing - actual monoid/functor laws with proofs |
| **Selective Hydration Islands** | Per-node execution control | Beyond Astro - schema-level hydration strategies |
| **Server-Client Schema Unification** | Single schema, execution boundary control | Beyond RSC - declarative execution location |

---

## Part I: Architectural Foundation

### 1.1 The Seven Primitives

After review, we expand from five to **seven core primitives**:

```
Primitive    | Symbol | Category      | Purpose
-------------|--------|---------------|----------------------------------
Value        | V      | Data          | Polymorphic data container
Cell         | C      | State         | Observable state atom
Lens         | L      | Access        | Bidirectional data path
Node         | N      | Structure     | UI render unit
Action       | A      | Effect        | One-shot side effect
Effect       | E      | Lifecycle     | Persistent side effect with cleanup
Query        | Q      | Server State  | Cached async resource with invalidation
```

### 1.2 Primitive Interactions

```
                    ┌─────────────┐
                    │   Query (Q) │  Server State
                    └──────┬──────┘
                           │ hydrates
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Value (V)  │ ◄── │   Cell (C)  │ ──► │  Effect (E) │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │ accessed via
       │                   ▼
       │            ┌─────────────┐
       │            │   Lens (L)  │
       │            └──────┬──────┘
       │                   │ feeds
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  Action (A) │ ◄── │   Node (N)  │
└─────────────┘     └─────────────┘
```

---

## Part II: Primitive Definitions (Revised)

### 2.1 Value (V) - Unchanged but Clarified

```typescript
type Value<T> = 
  | { kind: 'static'; data: T }
  | { kind: 'expr'; source: string; deps: string[]; evaluate: (scope: Scope) => T }
  | { kind: 'async'; loader: (signal: AbortSignal) => Promise<T>; fallback?: T }
  | { kind: 'bound'; cell: Cell<any>; lens: Lens<any, T> }

// Clarification: Values are LAZY and MEMOIZED
// They only compute when .resolve(scope) is called
// Results cached until deps change
```

### 2.2 Cell (C) - Revised with Lens-Only Access

```typescript
interface Cell<T> {
  // Read via identity lens
  get(): T;
  
  // Read via arbitrary lens
  view<U>(lens: Lens<T, U>): U;
  
  // Write via identity lens  
  set(value: T): void;
  
  // Write via arbitrary lens
  over<U>(lens: Lens<T, U>, updater: (u: U) => U): void;
  
  // Derived cell (read-only computed)
  derive<U>(fn: (value: T) => U): ReadonlyCell<U>;
  
  // Bidirectional derived cell (requires Iso)
  focus<U>(iso: Iso<T, U>): Cell<U>;
  
  // Subscribe with automatic cleanup tracking
  subscribe(listener: (value: T, prev: T) => void): Unsubscribe;
  
  // Serialization for resumability
  serialize(): SerializedCell;
  static hydrate<T>(data: SerializedCell): Cell<T>;
}

interface ReadonlyCell<T> {
  get(): T;
  view<U>(lens: Lens<T, U>): U;
  subscribe(listener: (value: T, prev: T) => void): Unsubscribe;
}
```

### 2.3 Lens (L) - Clarified with Transform/Iso Distinction

```typescript
// One-way transform (not reversible)
interface Transform<A, B> {
  apply(a: A): B;
}

// Bidirectional isomorphism (reversible)
interface Iso<A, B> extends Transform<A, B> {
  reverse(b: B): A;
  
  // Iso laws:
  // reverse(apply(a)) === a  (round-trip A)
  // apply(reverse(b)) === b  (round-trip B)
}

// Lens: focus on a part of a whole
interface Lens<S, A> {
  get(source: S): A;
  set(source: S, value: A): S;
  
  // Composition
  compose<B>(other: Lens<A, B>): Lens<S, B>;
  
  // Array index lens
  at(index: number): Lens<S, ElementOf<A>>;
  at(index: Value<number>): Lens<S, ElementOf<A>>; // Dynamic index
  
  // Object key lens
  prop<K extends keyof A>(key: K): Lens<S, A[K]>;
  
  // Optional lens (for nullable paths)
  optional(): Lens<S, A | undefined>;
  
  // Lens laws:
  // get(set(s, a)) === a           (get-put)
  // set(s, get(s)) === s           (put-get)
  // set(set(s, a1), a2) === set(s, a2)  (put-put)
}

// Built-in lenses
const Lens = {
  identity<T>(): Lens<T, T>,
  path<T>(path: string): Lens<T, any>,  // "user.address.city"
  index<T>(i: number): Lens<T[], T>,
};
```

### 2.4 Node (N) - With Hydration Strategy

```typescript
interface Node<Props = any, Slots extends string = string> {
  // Type identifier
  type: string;
  
  // Resolved props
  props: Props;
  
  // Named child slots
  slots: Partial<Record<Slots, Node[]>>;
  
  // Metadata
  meta: NodeMeta;
  
  // Event handlers
  events: Record<string, Action>;
  
  // NEW: Execution and hydration control
  execution: ExecutionStrategy;
}

interface NodeMeta {
  id: string;
  visible: boolean;
  disabled: boolean;
  className?: string;
  testId?: string;
  
  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;
  role?: string;
}

// NEW: Execution strategy for each node
interface ExecutionStrategy {
  // Where the node executes
  location: 'server' | 'client' | 'edge';
  
  // When to hydrate (if location includes client)
  hydration: 'none' | 'load' | 'visible' | 'idle' | 'interaction';
  
  // Whether to stream or block
  streaming: boolean;
  
  // Priority for scheduling
  priority: 'critical' | 'high' | 'normal' | 'low';
}
```

### 2.5 Action (A) - Unchanged

```typescript
interface Action {
  type: string;
  params: Record<string, Value<any>>;
  then?: Action | Action[];
  catch?: Action;
  when?: Value<boolean>;
}

// Action combinators
const Action = {
  seq(...actions: Action[]): Action,
  par(...actions: Action[]): Action,
  when(cond: Value<boolean>, action: Action): Action,
  match<T>(value: Value<T>, cases: Record<string, Action>): Action,
  try(action: Action, onError: Action): Action,
  loop(action: Action, while: Value<boolean>): Action,
};
```

### 2.6 Effect (E) - NEW Primitive

```typescript
interface Effect<T = void> {
  // Unique identifier
  id: string;
  
  // Setup function - returns cleanup
  setup: (context: EffectContext) => EffectCleanup | void;
  
  // Dependencies that trigger re-run
  deps: Value<any>[];
  
  // Associated resource (optional)
  resource?: Cell<T>;
  
  // Lifecycle hooks
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

interface EffectContext {
  scope: Scope;
  signal: AbortSignal;  // For cancellation
  services: ServiceRegistry;
}

type EffectCleanup = () => void;

// Examples:
// WebSocket connection
const wsEffect: Effect = {
  id: 'websocket',
  setup: ({ scope, signal }) => {
    const ws = new WebSocket(scope.resolve('wsUrl'));
    signal.addEventListener('abort', () => ws.close());
    ws.onmessage = (e) => scope.cell('messages').set(prev => [...prev, e.data]);
    return () => ws.close();
  },
  deps: [V.expr('${wsUrl}')]
};

// Timer
const timerEffect: Effect<number> = {
  id: 'timer',
  resource: timerCell,
  setup: ({ signal }) => {
    const id = setInterval(() => timerCell.set(v => v + 1), 1000);
    return () => clearInterval(id);
  },
  deps: []
};
```

### 2.7 Query (Q) - NEW Primitive

```typescript
interface Query<T, TError = Error> {
  // Cache key (can be dynamic)
  key: string | Value<(string | number)[]>;
  
  // Fetch function
  fetch: (context: QueryContext) => Promise<T>;
  
  // Cache configuration
  staleTime: number;      // How long data is considered fresh (ms)
  cacheTime: number;      // How long to keep in cache after unmount (ms)
  
  // Retry configuration
  retry: number | ((failureCount: number, error: TError) => boolean);
  retryDelay: number | ((failureCount: number) => number);
  
  // Behavior
  enabled: Value<boolean>;           // Conditional fetching
  refetchOnWindowFocus: boolean;     // Refetch when tab becomes active
  refetchOnReconnect: boolean;       // Refetch when network reconnects
  keepPreviousData: boolean;         // Show stale data while fetching
  
  // Transformations
  select?: (data: T) => any;         // Transform result
  
  // Optimistic updates
  optimisticUpdate?: (variables: any) => T;
  rollbackOnError?: boolean;
  
  // Placeholder/initial data
  placeholderData?: T | (() => T);
  initialData?: T;
}

interface QueryContext {
  signal: AbortSignal;
  scope: Scope;
  services: ServiceRegistry;
  previousData?: any;
}

// Query state (returned to consumers)
interface QueryState<T, TError = Error> {
  data: T | undefined;
  error: TError | undefined;
  status: 'idle' | 'loading' | 'error' | 'success';
  fetchStatus: 'idle' | 'fetching' | 'paused';
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  isStale: boolean;
  
  // Actions
  refetch: () => Promise<T>;
  invalidate: () => void;
}
```

---

## Part III: Compile-Time Reactivity (NEW)

### 3.1 The Compilation Model

Unlike Solid.js which uses **runtime** signal tracking, V11 uses **compile-time** analysis to generate optimal DOM mutations:

```
Schema (YAML/JSON)
       │
       ▼ [Parse]
    AST
       │
       ▼ [Analyze]
  Dependency Graph
       │
       ▼ [Optimize]
  Optimized IR
       │
       ▼ [Codegen]
  Platform Code (DOM/Native/WASM)
```

### 3.2 Compilation Example

**Input Schema:**
```yaml
type: container
props:
  className: "counter"
body:
  - type: text
    props:
      content: "Count: ${count}"
  - type: button
    props:
      label: "Increment"
    events:
      onClick:
        type: setValue
        path: count
        value: ${count + 1}
```

**Compiled Output (DOM target):**

```javascript
// Generated code - NO VDOM, NO DIFF
function mount(scope, container) {
  const div = document.createElement('div');
  div.className = 'counter';
  
  const text = document.createTextNode('');
  
  const button = document.createElement('button');
  button.textContent = 'Increment';
  button.onclick = () => scope.cell('count').set(v => v + 1);
  
  div.appendChild(text);
  div.appendChild(button);
  container.appendChild(div);
  
  // Fine-grained subscription - only updates the text node
  const unsub = scope.cell('count').subscribe((count) => {
    text.data = `Count: ${count}`;
  });
  
  // Initial render
  text.data = `Count: ${scope.cell('count').get()}`;
  
  return () => {
    unsub();
    container.removeChild(div);
  };
}
```

### 3.3 Why This Matters

| Approach | Runtime Cost | Memory | Updates |
|----------|--------------|--------|---------|
| React VDOM | O(tree) diff every render | O(tree) VDOM | Reconciliation |
| Vue VDOM | O(tree) diff every render | O(tree) VDOM | Reconciliation |
| Solid Signals | O(1) signal reads | O(signals) | Direct DOM |
| **V11 Compiled** | **O(0) at runtime** | **O(changed nodes)** | **Direct DOM** |

The key insight: **dependency tracking happens at compile time**, so runtime only executes pre-analyzed subscriptions.

---

## Part IV: Resumability Architecture (NEW)

### 4.1 The Problem with Hydration

Traditional SSR:
```
Server: Render HTML → Send to Client
Client: Parse HTML → Download JS → Execute → Rebuild State → Attach Listeners
        ↑_________________Hydration (expensive!)_________________↑
```

V11 Resumability:
```
Server: Render HTML + Serialize State → Send to Client
Client: Parse HTML → Resume (O(1) per interaction)
        ↑_____No global hydration!_____↑
```

### 4.2 Resumable Node Serialization

```typescript
interface ResumableNode extends Node {
  // Serialized state snapshot
  $state: SerializedState;
  
  // Lazy-loadable event handlers
  $handlers: Record<string, QRL>;  // QRL = serialized function reference
  
  // Restore point
  $resume: ResumePoint;
}

// QRL: Qwik-inspired serializable function reference
interface QRL<T = any> {
  // Module path for lazy loading
  $chunk: string;
  
  // Symbol name within module
  $symbol: string;
  
  // Captured lexical scope (serialized)
  $capture: any[];
}

// ResumePoint: Everything needed to resume a component
interface ResumePoint {
  // Scope state
  cells: Record<string, any>;
  
  // Pending queries
  queries: Record<string, QueryState>;
  
  // Active effects (to reconnect)
  effects: string[];
  
  // Element references
  refs: Record<string, string>;  // id -> DOM selector
}
```

### 4.3 Server Rendering with Resumability

```typescript
// Server-side rendering
async function renderToResumableHTML(schema: Schema, data: any): Promise<string> {
  const scope = createScope(data);
  const nodes = await compile(schema).resolve(scope);
  
  // Render HTML with embedded state
  const html = renderHTML(nodes);
  
  // Serialize resume points
  const resumeScript = `<script type="application/json" id="__V11_STATE__">
    ${JSON.stringify(scope.serialize())}
  </script>`;
  
  // Serialize QRLs for event handlers
  const qrlScript = `<script type="module">
    import { resume } from 'v11/client';
    resume(document.getElementById('__V11_STATE__'));
  </script>`;
  
  return html + resumeScript + qrlScript;
}

// Client-side resume (NOT hydrate)
function resume(stateElement: HTMLElement) {
  const state = JSON.parse(stateElement.textContent!);
  
  // Attach event listeners lazily
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const qrl = target.getAttribute('on:click');
    if (qrl) {
      const handler = await loadQRL(qrl);
      handler(e, state);
    }
  }, { capture: true });
}
```

### 4.4 Benefits

| Metric | Traditional Hydration | V11 Resumability |
|--------|----------------------|------------------|
| TTI (Time to Interactive) | O(components) | O(1) |
| JS Bundle | All components | Only interacted |
| Memory | Full component tree | On-demand |
| First Interaction | After hydration | Immediate |

---

## Part V: Selective Hydration Islands (NEW)

### 5.1 Per-Node Execution Control

```yaml
type: page
# Page-level default
execution:
  location: server
  hydration: none

body:
  # Static hero - no JS needed
  - type: hero
    props:
      title: "Welcome"
      image: "/hero.jpg"
    execution:
      location: server
      hydration: none  # Pure HTML, zero JS
      
  # Interactive search - hydrate when visible
  - type: search-bar
    execution:
      location: client
      hydration: visible  # Load JS when scrolled into view
      
  # Data table - hydrate on interaction
  - type: data-table
    props:
      data: ${users}
    execution:
      location: server  # Initial render on server
      hydration: interaction  # Only load JS when user interacts
      
  # Real-time chat - always client
  - type: chat-widget
    execution:
      location: client
      hydration: load  # Load JS immediately
      streaming: true
```

### 5.2 Hydration Strategies

| Strategy | When JS Loads | Use Case |
|----------|---------------|----------|
| `none` | Never | Static content, SEO text |
| `load` | Page load | Critical interactive components |
| `visible` | Scroll into viewport | Below-fold interactive content |
| `idle` | Browser idle | Non-critical components |
| `interaction` | First user interaction | Hover/click-activated components |

### 5.3 Automatic Island Detection

The compiler can auto-detect hydration needs:

```typescript
interface HydrationAnalysis {
  // Analyze schema for interactivity
  analyze(schema: Schema): HydrationMap;
}

// Analysis result
interface HydrationMap {
  nodes: Map<string, {
    hasEvents: boolean;        // Has onClick, onChange, etc.
    hasClientCells: boolean;   // Uses client-side state
    hasDynamicContent: boolean; // Content changes after load
    recommendedHydration: HydrationStrategy;
  }>;
}
```

---

## Part VI: Algebraic Schema Calculus (Formalized)

### 6.1 Schema Algebra Definition

A Schema forms a **Monoid** under composition:

```typescript
// Monoid laws
interface SchemaMonoid {
  // Identity element
  empty: Schema;  // Empty schema that renders nothing
  
  // Binary operation (composition)
  compose(a: Schema, b: Schema): Schema;
  
  // Laws:
  // compose(empty, a) === a          (left identity)
  // compose(a, empty) === a          (right identity)
  // compose(compose(a, b), c) === compose(a, compose(b, c))  (associativity)
}
```

### 6.2 Schema as Functor

Schemas can be mapped over:

```typescript
// Functor: map over schema structure
interface SchemaFunctor {
  // Map function over all nodes
  map<A, B>(schema: Schema<A>, fn: (node: Node<A>) => Node<B>): Schema<B>;
  
  // Functor laws:
  // map(schema, identity) === schema                    (identity)
  // map(schema, f . g) === map(map(schema, g), f)       (composition)
}

// Example: Transform all button labels to uppercase
const uppercaseButtons = Schema.map(schema, node => 
  node.type === 'button' 
    ? { ...node, props: { ...node.props, label: node.props.label.toUpperCase() } }
    : node
);
```

### 6.3 Schema Transformations

```typescript
// Algebra of transformations
const Transform = {
  // Map: Apply function to all nodes
  map: <A, B>(f: (a: A) => B) => (schema: Schema<A>) => Schema<B>,
  
  // Filter: Remove nodes matching predicate
  filter: (pred: (node: Node) => boolean) => (schema: Schema) => Schema,
  
  // FlatMap: Replace nodes with schemas
  flatMap: (f: (node: Node) => Schema) => (schema: Schema) => Schema,
  
  // Fold: Reduce schema to single value
  fold: <A>(init: A, f: (acc: A, node: Node) => A) => (schema: Schema) => A,
  
  // Traverse: Apply effectful function to all nodes
  traverse: <F>(f: (node: Node) => F<Node>) => (schema: Schema) => F<Schema>,
};

// Composition is associative
const pipeline = Transform.compose(
  Transform.filter(n => n.meta.visible),
  Transform.map(n => ({ ...n, meta: { ...n.meta, testId: `test-${n.type}` } })),
  Transform.flatMap(n => n.type === 'fragment' ? n.slots.children : [n])
);
```

### 6.4 Why Formal Algebra Matters

1. **Provable Correctness**: Transformations preserve structure
2. **Optimization**: Algebraic laws enable automatic optimization
3. **Composability**: Any two transformations can be combined
4. **Reasoning**: Developers can reason about schema manipulation mathematically

---

## Part VII: Form System (Comprehensive Revision)

### 7.1 FormDefinition (Complete)

```typescript
interface FormDefinition<T extends Record<string, any> = Record<string, any>> {
  // Data
  initialValues: Value<T>;
  
  // Field definitions
  fields: FieldDefinitions<T>;
  
  // Validation
  validations: ValidationRule<T>[];
  validationStrategy: ValidationStrategy;
  
  // Actions
  onSubmit: Action;
  onReset?: Action;
  onValidate?: Action;
  onValuesChange?: Action;
  
  // State management
  state: FormStateConfig;
  
  // Auto-save
  autoSave?: AutoSaveConfig;
  
  // Navigation guard
  confirmOnLeave?: ConfirmOnLeaveConfig;
  
  // Persistence
  persist?: PersistConfig;
}

interface ValidationStrategy {
  // When to validate
  mode: 'onChange' | 'onBlur' | 'onSubmit' | 'all';
  
  // When to re-validate after error
  revalidateMode: 'onChange' | 'onBlur' | 'onSubmit';
  
  // Debounce for onChange validation
  debounceMs?: number;
  
  // Continue validation after first error?
  validateAll: boolean;
}

interface FormStateConfig {
  // Track touched fields
  trackTouched: boolean;
  
  // Track dirty fields
  trackDirty: boolean;
  
  // Store submit count
  trackSubmitCount: boolean;
}

interface AutoSaveConfig {
  enabled: Value<boolean>;
  debounceMs: number;
  action: Action;
  onAutoSaveError?: Action;
}

interface ConfirmOnLeaveConfig {
  enabled: Value<boolean>;
  message: Value<string>;
  // Condition to check (e.g., only when dirty)
  when?: Value<boolean>;
}

interface PersistConfig {
  key: string;
  storage: 'local' | 'session' | Storage;
  // Fields to persist (default: all)
  fields?: string[];
  // Debounce persistence
  debounceMs?: number;
}
```

### 7.2 FormState (Runtime)

```typescript
interface FormState<T = Record<string, any>> {
  // Current values
  values: T;
  
  // Original values for dirty checking
  initialValues: T;
  
  // Validation errors by path
  errors: Record<string, string[]>;
  
  // Touched fields (user has interacted)
  touched: Record<string, boolean>;
  
  // Dirty fields (value differs from initial)
  dirty: Record<string, boolean>;
  
  // Submission state
  isSubmitting: boolean;
  isSubmitSuccessful: boolean;
  submitCount: number;
  
  // Validation state
  isValidating: boolean;
  isValid: boolean;
  
  // Derived flags
  isDirty: boolean;      // Any field dirty
  isTouched: boolean;    // Any field touched
  
  // Actions
  setValue: (path: string, value: any) => void;
  setValues: (values: Partial<T>, options?: { merge?: boolean }) => void;
  setError: (path: string, error: string | string[]) => void;
  clearErrors: (path?: string) => void;
  reset: (values?: Partial<T>) => void;
  resetField: (path: string) => void;
  validate: (path?: string) => Promise<boolean>;
  submit: () => Promise<void>;
  
  // Field-level state
  getFieldState: (path: string) => FieldState;
}

interface FieldState {
  value: any;
  error: string[];
  touched: boolean;
  dirty: boolean;
  validating: boolean;
}
```

### 7.3 ValidationContext (Complete Definition)

```typescript
interface ValidationContext<T = Record<string, any>> {
  // Current field value
  value: any;
  
  // Full path to current field
  path: string;
  
  // Entire form data
  formData: T;
  
  // Access other field values
  getFieldValue: <V = any>(path: string) => V;
  
  // Access other field metadata
  getFieldState: (path: string) => FieldState;
  
  // Current scope
  scope: Scope;
  
  // Services (API, i18n, etc.)
  services: ServiceRegistry;
  
  // For async validation: abort signal
  signal: AbortSignal;
  
  // Previous value (for change-based validation)
  previousValue?: any;
}
```

### 7.4 ValidationRule (Enhanced)

```typescript
interface ValidationRule<T = any> {
  // Unique identifier
  id: string;
  
  // Validation logic
  validate: 
    | Value<boolean>  // Expression-based
    | ((context: ValidationContext<T>) => boolean | Promise<boolean>)
    | ((context: ValidationContext<T>) => ValidationResult | Promise<ValidationResult>);
  
  // Error message (supports i18n and interpolation)
  message: Value<string>;
  
  // When to trigger
  trigger: ('change' | 'blur' | 'submit')[];
  
  // Async configuration
  async?: boolean;
  debounceMs?: number;
  cancelOnChange?: boolean;  // Cancel pending async validation on new change
  
  // Dependencies (re-run when these fields change)
  dependsOn?: string[];
  
  // Validation level
  level?: 'error' | 'warning' | 'info';
  
  // Validation priority (lower runs first)
  priority?: number;
  
  // Condition to run validation
  when?: Value<boolean>;
}

// Rich validation result
type ValidationResult = 
  | boolean 
  | string  // Single error message
  | { 
      valid: boolean;
      message?: string;
      level?: 'error' | 'warning' | 'info';
      path?: string;  // For object/array level validation
    }
  | ValidationResult[];  // Multiple results
```

### 7.5 FieldDefinition Union Type (Recursive)

```typescript
type FieldDefinition = 
  | SimpleFieldDefinition
  | ObjectFieldDefinition
  | ArrayFieldDefinition
  | VariantFieldDefinition;

interface SimpleFieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'time' | 'file';
  path: string;
  defaultValue?: Value<any>;
  validations?: ValidationRule[];
  visible?: Value<boolean>;
  disabled?: Value<boolean>;
  readOnly?: Value<boolean>;
  
  // Transform on read/write
  transform?: {
    input?: Transform<any, any>;   // Transform before display
    output?: Transform<any, any>;  // Transform before storage
  };
}
```

### 7.6 VariantFieldDefinition (Enhanced)

```typescript
interface VariantFieldDefinition {
  type: 'variant';
  
  // Single or multiple discriminators
  discriminator: string | string[];
  
  // Or use expression for complex discrimination
  discriminatorExpr?: Value<string>;
  
  // Static variants
  variants?: Record<string, VariantConfig>;
  
  // Dynamic variants (from API or computed)
  variantsSource?: Value<Record<string, VariantConfig>>;
  
  // Default variant when discriminator is empty
  default?: string;
  
  // Behavior when variant changes
  onSwitch: 'preserve' | 'clear' | 'reset-to-default';
  
  // Custom action on variant change
  onVariantChange?: Action;
  
  // Path configuration
  path?: string;
  pathMode?: 'absolute' | 'relative';
}

interface VariantConfig {
  // Label for UI (e.g., tabs, radio)
  label?: Value<string>;
  
  // Fields for this variant
  fields: Record<string, FieldDefinition>;
  
  // UI schema for rendering
  schema?: NodeSchema;
  
  // Visibility condition
  visible?: Value<boolean>;
  
  // Icon for UI
  icon?: string;
}
```

### 7.7 ObjectFieldDefinition (Enhanced)

```typescript
interface ObjectFieldDefinition {
  type: 'object';
  
  // Path to object in form data
  path: string;
  
  // Path interpretation
  pathMode?: 'absolute' | 'relative';
  
  // Nested fields (can include any FieldDefinition type)
  fields: Record<string, FieldDefinition>;
  
  // Object-level validation
  validations?: ValidationRule[];
  
  // Visibility and state
  visible?: Value<boolean>;
  disabled?: Value<boolean>;
  
  // Collapse/expand for UI
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}
```

### 7.8 ArrayFieldDefinition (Enhanced)

```typescript
interface ArrayFieldDefinition {
  type: 'array';
  
  // Path to array
  path: string;
  
  // Item definition (recursive - can be any FieldDefinition)
  item: FieldDefinition;
  
  // Item rendering
  itemSchema?: NodeSchema;
  itemLayout?: 'inline' | 'card' | 'row' | 'accordion' | 'table';
  
  // Empty state
  emptySchema?: NodeSchema;
  emptyMessage?: Value<string>;
  
  // Constraints
  minItems?: number;
  maxItems?: number;
  
  // Operations
  reorderable?: boolean;
  addable?: boolean;       // Show add button
  removable?: boolean;     // Show remove button
  duplicatable?: boolean;  // Show duplicate button
  
  // Item identity
  keyExtractor: string | ((item: any, index: number) => string);
  
  // Validation
  validations?: ValidationRule[];
  
  // Actions
  onAdd?: Action;
  onRemove?: Action;
  onReorder?: Action;
}

// Built-in array actions
type ArrayAction = 
  | { type: 'array.push'; path: string; value?: any }
  | { type: 'array.insert'; path: string; index: number; value?: any }
  | { type: 'array.remove'; path: string; index: number }
  | { type: 'array.removeWhere'; path: string; predicate: Value<boolean> }
  | { type: 'array.move'; path: string; from: number; to: number }
  | { type: 'array.swap'; path: string; indexA: number; indexB: number }
  | { type: 'array.clear'; path: string }
  | { type: 'array.replace'; path: string; items: any[] }
  | { type: 'array.duplicate'; path: string; index: number };
```

---

## Part VIII: Server-Client Unification (NEW)

### 8.1 The Problem

Current frameworks require different code for server and client:

- **React**: RSC vs Client Components
- **Next.js**: `'use client'` directive
- **Remix**: Loaders vs Actions

V11 uses **single schema** with execution location as configuration.

### 8.2 Unified Schema with Execution Boundary

```yaml
type: page

# Data fetching - runs on server
queries:
  users:
    key: ['users']
    fetch: |
      SELECT * FROM users WHERE active = true
    execution:
      location: server  # Database query - must be server

body:
  # Server-rendered list (no client JS)
  - type: user-list
    props:
      users: ${users.data}
    execution:
      location: server
      hydration: none
      
  # Client interactive components
  - type: user-search
    execution:
      location: client
      hydration: load
    events:
      onSearch:
        type: api
        url: '/api/users/search'
        params: { q: ${searchQuery} }
```

### 8.3 Execution Boundaries

```typescript
interface ExecutionBoundary {
  // Automatic serialization at boundary
  serialize: (data: any) => string;
  deserialize: (data: string) => any;
  
  // Type checking at boundary
  validate: (data: any, schema: TypeDescriptor) => boolean;
  
  // Security: What can cross the boundary
  allowlist?: string[];  // Only these fields
  blocklist?: string[];  // Not these fields
}
```

---

## Part IX: Accessibility-First Design (NEW)

### 9.1 Built-in Accessibility

Every Node includes accessibility metadata:

```typescript
interface NodeMeta {
  // Standard meta
  id: string;
  visible: boolean;
  disabled: boolean;
  
  // Accessibility (WCAG 2.1 AA compliance)
  aria?: {
    label?: string;
    labelledBy?: string;
    describedBy?: string;
    role?: AriaRole;
    live?: 'off' | 'polite' | 'assertive';
    atomic?: boolean;
    relevant?: ('additions' | 'removals' | 'text' | 'all')[];
    busy?: boolean;
    current?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
    expanded?: boolean;
    haspopup?: 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | boolean;
    pressed?: boolean | 'mixed';
    selected?: boolean;
    invalid?: boolean | 'grammar' | 'spelling';
    errormessage?: string;
  };
  
  // Keyboard navigation
  keyboard?: {
    tabIndex?: number;
    shortcuts?: Record<string, Action>;  // e.g., { 'ctrl+s': submitAction }
  };
  
  // Focus management
  focus?: {
    autoFocus?: boolean;
    trapFocus?: boolean;
    restoreFocus?: boolean;
  };
}
```

### 9.2 Automatic Accessibility Features

The compiler automatically:

1. **Generates ARIA attributes** from schema structure
2. **Creates skip links** for page regions
3. **Manages focus** on route changes
4. **Announces** dynamic content changes
5. **Validates** color contrast in themes

---

## Part X: Performance Model (Revised)

### 10.1 Compilation Phases

```
Parse (O(n))
  ↓
Analyze Dependencies (O(n))
  ↓
Detect Islands (O(n))
  ↓
Generate Code per Island (O(islands))
  ↓
Tree-shake Unused (O(n))
  ↓
Output Optimized Bundle
```

### 10.2 Runtime Performance

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Initial render | O(visible nodes) | Only visible islands |
| State update | O(affected subscriptions) | Pre-computed from dep graph |
| Event dispatch | O(1) | Direct handler lookup |
| Hydration | O(1) per interaction | Lazy loading, no global hydration |

### 10.3 Memory Model

```typescript
interface MemoryConfig {
  // Cell garbage collection
  cellGC: {
    enabled: boolean;
    // Collect unused cells after this time
    unusedTimeoutMs: number;
  };
  
  // Query cache limits
  queryCache: {
    maxSize: number;      // Max cached queries
    maxAge: number;       // Max cache age
    gcInterval: number;   // GC interval
  };
  
  // Effect cleanup
  effectCleanup: 'eager' | 'lazy';
}
```

---

## Part XI: Complete Schema Example

### 11.1 E-commerce Product Page

```yaml
type: page
execution:
  location: server
  hydration: selective

data:
  productId: ${route.params.id}

queries:
  product:
    key: ['product', '${productId}']
    fetch: |
      SELECT * FROM products WHERE id = ${productId}
    staleTime: 60000
    execution:
      location: server
      
  reviews:
    key: ['reviews', '${productId}']
    fetch: |
      SELECT * FROM reviews WHERE product_id = ${productId} ORDER BY created_at DESC LIMIT 10
    staleTime: 30000
    execution:
      location: server
      hydration: visible

body:
  # Hero section - server rendered, no JS
  - type: container
    props:
      className: "product-hero"
    execution:
      location: server
      hydration: none
    body:
      - type: image
        props:
          src: ${product.data.image}
          alt: ${product.data.name}
          
      - type: heading
        props:
          level: 1
          content: ${product.data.name}
          
      - type: text
        props:
          content: ${product.data.price | currency}
          
  # Add to cart form - client interactive
  - type: form
    execution:
      location: client
      hydration: load
    data:
      quantity: 1
      selectedVariant: null
    body:
      - type: variant-field
        discriminator: ${product.data.hasVariants}
        variants:
          true:
            - type: select
              props:
                label: "Select Option"
                bind: ${selectedVariant}
                options: ${product.data.variants | mapToOptions('id', 'name')}
          false: []
              
      - type: number-input
        props:
          label: "Quantity"
          bind: ${quantity}
          min: 1
          max: ${product.data.stock}
          
      - type: button
        props:
          label: "Add to Cart"
          disabled: ${product.data.stock === 0}
        events:
          onClick:
            type: api
            url: '/api/cart/add'
            method: POST
            body:
              productId: ${productId}
              quantity: ${quantity}
              variant: ${selectedVariant}
            then:
              - type: toast
                message: "Added to cart!"
              - type: invalidateQuery
                key: ['cart']
                
  # Reviews - server rendered, hydrate on visible
  - type: container
    props:
      className: "reviews-section"
    execution:
      location: server
      hydration: visible
    body:
      - type: heading
        props:
          level: 2
          content: "Reviews"
          
      - type: each
        items: ${reviews.data}
        as: review
        body:
          - type: review-card
            props:
              author: ${review.author}
              rating: ${review.rating}
              content: ${review.content}
              date: ${review.created_at | formatDate}
              
      - type: button
        props:
          label: "Load More Reviews"
        events:
          onClick:
            type: setValue
            path: reviews.limit
            value: ${reviews.limit + 10}
```

---

## Part XII: Comparison (Revised)

### 12.1 Innovation Matrix

| Feature | React | Vue | Solid | Qwik | AMIS | **V11** |
|---------|-------|-----|-------|------|------|---------|
| No VDOM | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Resumability | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Compile-time reactivity | ❌ | ⚠️ | ❌ | ✅ | ❌ | ✅ |
| Islands | ⚠️ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Server components | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Schema-driven | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Formal algebra | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Low-code native | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

### 12.2 What V11 Uniquely Provides

1. **Schema-driven + Compile-time reactivity**: No other low-code platform compiles schemas to optimized DOM code
2. **Resumability for low-code**: First low-code platform with zero-hydration architecture
3. **Formal schema algebra**: Provable composition laws for schema transformations
4. **Unified server-client schemas**: Single schema with declarative execution boundaries

---

## Part XIII: Implementation Roadmap (Revised)

### Phase 1: Core Primitives (4 weeks)
- [ ] Cell implementation with serialize/hydrate
- [ ] Lens library with laws verification
- [ ] Effect lifecycle management
- [ ] Query cache implementation

### Phase 2: Compiler (6 weeks)
- [ ] Schema parser (YAML/JSON)
- [ ] Dependency analyzer
- [ ] Island detector
- [ ] DOM codegen (compile-time reactivity)
- [ ] WASM codegen (optional)

### Phase 3: Resumability (4 weeks)
- [ ] Server renderer with state serialization
- [ ] QRL system for lazy event handlers
- [ ] Client resume (not hydrate) runtime
- [ ] State transfer protocol

### Phase 4: Form System (4 weeks)
- [ ] FormState implementation
- [ ] Validation engine
- [ ] Variant/Object/Array fields
- [ ] Form actions

### Phase 5: Developer Experience (2 weeks)
- [ ] DevTools extension
- [ ] Schema IntelliSense (JSON Schema + LSP)
- [ ] Error overlay
- [ ] Hot reload

---

## Appendix A: Glossary (Updated)

| Term | Definition |
|------|------------|
| **Cell** | Observable state atom with serialization support |
| **Lens** | Bidirectional data path with algebraic laws |
| **Iso** | Bidirectional transform (reversible pipe) |
| **Transform** | One-way data transform (non-reversible pipe) |
| **Value** | Polymorphic lazy/memoized data container |
| **Node** | UI render unit with execution strategy |
| **Action** | One-shot side effect descriptor |
| **Effect** | Persistent side effect with cleanup |
| **Query** | Cached async server state resource |
| **Scope** | Hierarchical execution context |
| **Blueprint** | Compiled intermediate representation |
| **QRL** | Serializable function reference for lazy loading |
| **Resumability** | Ability to continue execution without re-running |
| **Island** | Independently hydratable UI region |

---

## Appendix B: Design Principles (Updated)

1. **Resumable-First**: Design for instant interactivity, not hydration
2. **Compile-Time Over Runtime**: Move work to build time whenever possible
3. **Explicit Execution**: Every node declares where and when it runs
4. **Algebraic Composition**: Follow mathematical laws for predictable composition
5. **Schema as Source of Truth**: Single schema for server and client
6. **Accessibility by Default**: WCAG compliance built-in, not added
7. **Type-Safe Boundaries**: Validate data at server/client boundaries

---

*End of V11 Design Document - Revision 1*
