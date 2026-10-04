# NOP Chaos Flux Core Architecture

## Purpose

This document records the current codebase-wide architecture baseline for the active `nop-chaos-flux` codebase.

Use it after `docs/architecture/frontend-programming-model.md` when you need the high-level codebase answer to:

- how schema values are compiled and evaluated
- how runtime, scope, forms, pages, and actions fit together
- what the current behavior baseline is and where compatibility gaps still remain

Precedence note:

- `docs/architecture/frontend-programming-model.md` owns top-level primitive identity, macro execution boundaries, and the normative loader/runtime/host split
- this document owns the current codebase-wide architecture baseline and high-level runtime composition beneath that top-level programming model
- narrower architecture docs still own local precedence inside their subject area

For the dedicated template/instance identity model, continue with `docs/architecture/template-instantiation-and-node-identity.md`.

If this document conflicts with template versus runtime-instance ownership, `docs/architecture/template-instantiation-and-node-identity.md` wins.

Code-level source of truth lives primarily in `packages/flux-core/src/index.ts`, `packages/flux-runtime/src/index.ts`, and `packages/flux-react/src/index.tsx`.

## Package Role: `@nop-chaos/flux-core`

flux-core is the **foundation contracts and shared utilities** package — the lowest-level shared layer that all other packages depend on. It contains:

- **Type definitions and interfaces**: Host-neutral core contracts (`ScopeRef`, `FormRuntime`, `ValidationScopeRuntime`, `RendererRuntime`, `CompiledValueNode`, etc.) that define the boundaries between packages.
- **Constants**: Shared constants like `META_FIELDS`.
- **Side-effect-free pure utility functions**: Functions that have no external dependencies and no side effects — e.g. `getIn`, `isPlainObject`, `shallowEqual`, `buildCompiledFormValidationModel`. These are shared across all packages because they operate on language-level primitives, not business logic.
- **Validation model data transforms**: Pure functions for validation model construction (`buildCompiledFormValidationModel`, `buildCompiledValidationOrder`, etc.) that are needed by both `flux-formula` and `flux-runtime`.

**What does NOT belong in flux-core**: Business logic with side effects, framework-specific code (React/Zustand), or any function that depends on external state. The dependency direction is strictly `flux-core ← all other packages`.

The renderer registration contract in `flux-core` is host-neutral: `RendererDefinition` exposes the callable `component(props)` entry plus static metadata and policies. React-only conveniences such as `reactComponent(props)` are owned by `@nop-chaos/flux-react`, which normalizes them into `component` before definitions reach the core `RendererRegistry`.

**Known exception — `i18n-sink.ts`**: This module exports a module-level mutable singleton (`setMessageFormatter` / `getMessageFormatter`) that lets `flux-i18n` inject its concrete formatter at init time without creating a circular dependency. It is the **only** stateful module in flux-core and is documented as an intentional design trade-off. See the in-file JSDoc in `packages/flux-core/src/i18n-sink.ts` for ownership rules.

## flux-core Package

When this document needs to be checked against code, start with:

- `packages/flux-core/src/index.ts` for core contracts and shared utilities
- `packages/flux-compiler/src/schema-compiler.ts` for template node assembly
- `packages/flux-action-core/src/action-dispatcher.ts` for action semantics
- `packages/flux-runtime/src/page-runtime.ts` and `packages/flux-runtime/src/form-runtime.ts` for page/form runtime behavior
- `packages/flux-react/src/index.tsx` for React integration boundaries

## Current Architecture Baseline

### Unified value semantics

All schema fields follow one primary rule:

- plain values stay plain values
- expression syntax means expression semantics
- do not introduce parallel suffix-based field families such as `xxxExpr` or `xxxOn` as the default design path

Which fields allow literals, templates, pure expressions, events, or renderable fragments is determined by schema typing plus renderer field metadata, not by proliferating alternate field names.

Boolean-like fields have a stricter runtime contract:

- authoring schema accepts boolean literals and `${expr}` expression strings
- validation mode rejects plain string booleans such as `"true"`, `"false"`, and `"!canUndo"`
- after compilation and runtime evaluation, renderer-facing props and meta expose only `boolean | undefined` for boolean-like fields
- expression results that are not booleans resolve to `undefined` for boolean-like fields and may be reported through host diagnostics; runtime never applies JavaScript truthiness coercion to them
- renderers must pass resolved booleans through instead of applying JavaScript truthiness coercion

This keeps expression syntax ordinary while preventing invalid strings from surviving as runtime values.

### Whole value-tree compilation

Schema values compile as one value tree.

In current code that means two related layers:

- `CompiledValueNode` is the internal node tree used by the expression compiler
- `CompiledRuntimeValue` is the runtime-facing wrapper used for fast static return or dynamic execution

Current `CompiledValueNode` kinds are:

```ts
type CompiledValueNode<T = unknown> =
  | { kind: 'static-node'; value: T }
  | { kind: 'expression-node'; source: string; compiled: CompiledExpression<T> }
  | { kind: 'template-node'; source: string; compiled: CompiledTemplate<T> }
  | { kind: 'array-node'; items: ReadonlyArray<CompiledValueNode<unknown>> }
  | {
      kind: 'object-node';
      keys: readonly string[];
      entries: Readonly<Record<string, CompiledValueNode<unknown>>>;
    };
```

Current runtime wrapper shape is directionally:

```ts
type CompiledRuntimeValue<T = unknown> =
  | { kind: 'static'; isStatic: true; value: T }
  | { kind: 'dynamic'; isStatic: false; exec(...): ValueEvaluationResult<T> };
```

The long-term architectural intent still matches the original goal:

- static subtrees should stay zero-cost at runtime
- dynamic subtrees should preserve identity reuse when results do not change
- runtime should not expose a long-term external model centered on `staticProps` plus `dynamicProps`

### Scope chain reads over merged objects

The preferred hot path is:

- `scope.get(path)`
- `scope.has(path)`
- `scope.readOwn()`
- `scope.readVisible()` for prototype-backed visible view (lexical scope chain, JS property access)
- `scope.materializeVisible()` only when a plain-object snapshot of the full visible scope is truly needed (formula broad-access, debugger dump, serialization)

`read()` has been removed. All callers use either `readVisible()` (prototype-backed, zero allocation for hot paths) or `materializeVisible()` (eager spread, for boundaries that need a plain own-enumerable object).

### Scope prototype-pollution defense

All scope write paths (`merge`, `update`, `replace`) and read paths (`readVisible`, `materializeVisible`) filter dangerous keys (`__proto__`, `constructor`, `prototype`) through `sanitizeSnapshot()`. Initial data passed to `createScopeStore()` is also sanitized. The `update(path, value)` method skips writes whose first path segment is a dangerous key.

Formula scope proxies (`flux-formula/src/scope.ts`) and adaptor scope views (`flux-runtime/src/async-data/request-runtime-adaptor.ts`) intercept reads of `__proto__`, `constructor`, and `prototype`, returning `undefined`.

### `flux-formula` is the expression base

Expression execution is built on `flux-formula` through `FormulaCompiler` and `ExpressionCompiler`.

Current implementation detail:

- `flux-formula` now provides the workspace expression parser, AST evaluator, template compiler, and function/filter registry directly inside `@nop-chaos/flux-formula`.
- Other packages still depend only on Flux contracts such as `FormulaCompiler`, `ExpressionCompiler`, and `EvalContext`; they do not depend on parser/evaluator internals.
- Expression compile/evaluate failures are surfaced as thrown errors rather than being silently swallowed, so runtime/tests must use nullable-safe access when async data may not exist yet.
- When expression or template compilation falls back to a static value through compiler diagnostics, the diagnostic surface keeps the original failure detail in `cause` instead of flattening the error object into an opaque string.
- Schema validation diagnostics for union-shaped value contracts keep per-branch failure detail in the emitted message so authoring surfaces can explain why each allowed option failed instead of only repeating the top-level union summary.

The production direction is:

- compile expressions and templates once
- execute against `EvalContext`
- resolve variables through `resolve(path)` and `has(path)`
- avoid prototype `new Function(...)` and `with(scope)` execution

### `closeSurface` default behavior

`closeSurface` closes the current surface by default.

- normal schema authors should not need to pass `surfaceId`
- explicit surface targeting exists as a narrow extension path
- `closeDialog` and `closeDrawer` may still exist as compatibility aliases, but active docs and new schema should use `closeSurface`
- current live targeting rule is: close explicit `surfaceId` when provided; otherwise close the current action context surface via `ctx.dialogId`; if there is no current surface context, close the top-most active surface in the shared surface stack

Architecturally, this should resolve through the nearest creator-owned surface boundary rather than through page-owned dialog state.

### Shared surface-family runtime

The current live baseline has one surface-family runtime for `dialog` / `drawer`.

- declarative `type: 'dialog' | 'drawer'` and built-in `openDialog` / `openDrawer` both register `SurfaceEntry` instances into the same `SurfaceRuntime`
- both paths render through the same root React surface host stack
- both paths create runtime-owned child scopes and surface-root validation owners
- surface close/unmount publishes the same closed summary through `statusPath` instead of clearing the path to `undefined`

## Main Layers

The active system is organized into five layers:

1. `SchemaCompiler`
2. `ExpressionCompiler`
3. `RendererRuntime`
4. `Store` and `Scope`
5. React renderer and hooks

```text
raw schema
  -> TemplateCompiler
compiled template graph
  -> runtime normalization + `NodeRenderer` / `RenderNodes` execution
runtime node instances + action dispatch + page/form runtimes
  -> React renderer
concrete component render
```

`SchemaCompiler` directly produces `TemplateNode` (and `CompiledTemplate` for template graphs). The intermediate `CompiledSchemaNode` type has been fully eliminated. The compile pipeline is now: `SchemaInput → TemplateNode → CompiledTemplate`. The active React render path is `CompiledTemplate -> TemplateNode -> NodeInstance`.

## Layer Responsibilities

### `SchemaCompiler`

Owns:

- raw schema normalization
- region extraction such as `body`, `actions`, and renderer-owned nested regions
- field classification through renderer field metadata
- compiled props, meta, event, and validation assembly
- declarative compile-artifact lowering declared by renderer metadata
- template graph construction, including template-local node ids and duplicate-`id` reporting by template path

Current declarative lowering rule:

- compiler may still perform renderer-specific lowering when a renderer requires compile-time artifacts that runtime consumes from `TemplateNode`
- however, the trigger must come from declarative renderer metadata, not from hardcoded `schema.type === '...'` dispatch in compiler core
- current baseline example: `data-source` and `reaction` declare compile-artifact requirements, and compiler lowers them into `TemplateNode.compiledSources` / `TemplateNode.compiledReactions`
- `SchemaFieldRule` fields declared as `kind: 'reaction'` compile into `TemplateNode.reactionPlans[key]` (`CompiledReactionPlan`), parallel to `compiledSources`/`compiledReactions`. Each plan carries the compiled action body plus `dependsOn: readonly string[]` (root-level paths) and optional `ignoreWritesTo?: readonly string[]` (root-level self-write filter). At runtime the React layer activates one `ReactionHandle` per plan (surfaced as `props.reactions[key]`); v1 does not support `immediate`/`debounce`/`once`/`control` on `ReactiveActionSchema`. See `docs/plans/2026-07-07-loadAction-reaction-kind-plan.md`.

Current internal-id baseline:

- `cid` is the live runtime node identity allocated for a mounted inspectable node
- template-level node identity should use `templateNodeId`
- runtime state should be instantiated separately from template structure
- full compiled node trees should not be reused as if they were live runtime instances; compile-once benefits should come from immutable template reuse plus per-instance runtime state

### `ExpressionCompiler`

Owns:

- literal, expression, template, array, and object recognition
- value-tree compilation
- static versus dynamic classification
- program generation for dynamic execution and identity reuse

Current boundary note:

- runtime state allocation belongs to runtime instantiation, not to template ownership

### `RendererRuntime`

Owns:

- node meta and prop resolution
- layered action dispatch
- page runtime creation
- form runtime creation
- child-scope creation

Current action dispatch now resolves through three explicit paths in order:

1. built-in platform actions such as `setValue`, `ajax`, `dialog`, `closeSurface`, `refreshTable`, and `submitForm`
2. component-targeted actions matching `component:<method>` pattern through `ComponentHandleRegistry`
3. namespaced actions such as `designer:export` through `ActionScope`

This keeps data scope, namespaced behavior lookup, and instance-targeted capability invocation separate even though all three are available from the same runtime host tree.

Current orchestration boundary note:

- `@nop-chaos/flux-action-core` owns the action entry/composition root, selector classification, compiled payload evaluation, and control-flow semantics.
- Final built-in / component / namespaced invocation now stays behind the unified `ActionRuntimeAdapter` boundary in `@nop-chaos/flux-runtime`.

### `Store` and `Scope`

Own:

- `PageStoreApi` for page data and refresh ticks
- `FormStoreApi` for values, errors, validating state, touched state, dirty state, visited state, and submitting state
- `ScopeRef` for lexical lookup, shadowing, and current-scope updates

The active runtime now also exposes two non-data runtime registries:

- `ActionScope` for namespaced non-built-in action providers; treat it as capability lexical scope, not a global registry
- `ComponentHandleRegistry` for explicit component-handle registration and lookup by `componentId` (resolves `handle.id` first, then `handle.name`)

These are intentionally not folded into `ScopeRef`.

Current design direction also treats `data-source` / `reaction` ownership as scope-scoped runtime state, but still not as part of the `ScopeRef` behavior surface:

- `ScopeRef` stays the pure data lookup and update contract
- source/reaction registration should live in runtime-owned sidecar registries keyed by `ScopeRef.id`
- this keeps source/reaction lifecycle aligned with lexical data scopes without turning `ScopeRef` into a mixed data-plus-behavior abstraction
- a practical first implementation is `RendererRuntime`-owned `scopeEntries: Map<scopeId, Map<entryId, Entry>>`

Detailed `ActionScope` resolution, `xui:imports`, collision, and lifecycle semantics live in `docs/architecture/action-scope-and-imports.md`.

### React renderer

Owns:

- runtime and scope context wiring
- fragment rendering
- dialog hosting
- selector-based subscriptions and renderer hooks
- React-specialized renderer contract aliases such as `RendererDefinition`, `RendererHelpers`, `RenderRegionHandle`, and `SchemaRendererComponent`

Current orchestration boundary note:

- `NodeRenderer`, `DialogHost`, and the core React hooks remain the React integration composition roots; provider wiring, lifecycle/render monitor effects, and dialog/drawer shared surface assembly may be extracted as implementation helpers as long as runtime semantics and explicit boundary inputs stay unchanged.
- Compiled nodes may also carry internal boundary hints describing which runtime contexts can change beneath the node, so the React layer can keep provider structure stable while still avoiding unconditional publication of every boundary on every node.
- When possible, those hints should converge into a framework-agnostic compiled render plan so runtime frameworks execute precomputed boundary structure instead of rediscovering it per render.

## Current Value And Node Model

### `EvalContext`

Current execution context:

```ts
interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  materialize(): Record<string, any>;
  collector?: ScopeDependencyCollector;
}
```

Rules:

- variable access should go through `resolve(path)`
- `materialize()` exists for the minority case that needs a complete object view
- when dynamic values are evaluated on the tracked path, runtime may attach a dependency collector so each successful run refreshes the actual path set it read

### `ScopeRef`

Current exported contract:

```ts
interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
  kind?: 'update' | 'merge' | 'replace';
  revision?: number;
}

interface ScopeStore<T = Record<string, any>> {
  getSnapshot(): T;
  getLastChange(): ScopeChange | undefined;
  setSnapshot(next: T, change?: ScopeChange): void;
  subscribe(listener: (change: ScopeChange) => void): () => void;
}

interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  store?: ScopeStore;
  readonly value: Record<string, any>;
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  readVisible(): Record<string, any>;
  materializeVisible(): Record<string, any>;
  update(path: string, value: unknown): void;
  merge(data: Record<string, unknown>): void;
  replace?(data: Record<string, unknown>): void;
}
```

Current invalidation baseline:

- scope writes report changed paths through `ScopeChange`
- `update(path, value)` reports the exact path it wrote
- `merge(data)` reports changed top-level keys and can conservatively fall back to `['*']` when enumeration is not trustworthy
- composite child scopes preserve the original `sourceScopeId` when parent changes flow through

Lookup preserves lexical shadowing:

1. check whether the current scope owns the top-level key
2. if yes, continue lookup inside that owned object
3. otherwise climb to the parent scope

### `CompiledSchemaNode` — Eliminated

`CompiledSchemaNode` has been **fully eliminated** from the codebase. The compiler now directly produces `TemplateNode` instead of going through an intermediate `CompiledSchemaNode → TemplateNode` conversion step.

The compile pipeline is now: `SchemaInput → TemplateNode → CompiledTemplate`.

Previous `CompiledSchemaNode` responsibilities are now carried by:

- **`TemplateNode`** — carries schema identity, compiled props (`propsProgram`), compiled meta (`metaProgram`), regions, event plans, validation, scope plan, and provider plan
- **`NodeMetaProgram`** — the compiled meta program (formerly `CompiledSchemaMeta`), defined in `node-identity.ts`
- **`NodeRuntimeState`** — per-instance runtime state (formerly `CompiledNodeRuntimeState`), defined in `node-identity.ts`

## Action Baseline

Current action system supports at least:

- `setValue`
- `ajax`
- `submitForm`
- `openDialog`
- `openDrawer`
- `closeSurface`
- `refreshTable`

Current behavior includes:

- `then`
- `continueOnError`
- debounce
- request cancellation
- plugin interception
- `prevResult` propagation across chained actions

## React Rendering Baseline

The React side follows one stable rule:

- boundary inputs stay explicit
- shared runtime services come from hooks and contexts
- local fragment rendering uses `RenderRegionHandle` or `helpers.render(...)`

Current boundary note:

- `@nop-chaos/flux-core` keeps the host-neutral callable contract for renderer definitions and fragment helpers, but it does not import or re-export React types.
- `@nop-chaos/flux-react` owns the React-specialized aliases and root renderer component contract used by React hosts.

Important current hooks include:

- `useRendererRuntime()`
- `useRenderScope()`
- `useScopeSelector()`
- `useOwnScopeSelector()`
- `useCurrentForm()`
- `useCurrentPage()`
- `useActionDispatcher()`
- `useCurrentNodeMeta()`
- `useRenderFragment()`

Current scope selector semantics:

- `useScopeSelector()` reads and subscribes against the lexical-scope-visible snapshot.
- `useOwnScopeSelector()` reads and subscribes against the current scope's own snapshot only.
- `readOwn()` stays narrowly defined as "current layer only" and should not be overloaded with parent-chain data.

Current env-handling baseline:

- `env` remains the host integration boundary for fetch/notify/navigation/import hooks.
- runtime internals read the latest env via a stable getter instead of assuming the first `env` object identity is permanent.
- React hosts should still treat `env` as semantically stable, but accidental wrapper re-creation no longer implies runtime teardown.

## Performance Principles

Priority order:

1. preserve static fast path
2. preserve dynamic identity reuse
3. avoid merged-object construction in hot paths
4. keep selector subscriptions narrow
5. apply debounce and cancellation to high-frequency actions and async validation

## Current Baseline

- `value-or-region` and `event` field kinds already exist in active code
- opened surface state is represented by `SurfaceEntry` under the shared `SurfaceRuntime` / `SurfaceStore` family
- form runtime already supports validation state and first-class array operations
- subtree validation already has graph-aware entry points

## Remaining Gaps

- richer validation normalization phases
- more compiler-described composite validation in place of runtime registration
- further reduction of duplicated validation projections where it can be done safely

## Path Resolution Utilities

`packages/flux-core/src/utils/path.ts` provides the core path resolution functions used across all packages:

- **`parsePath(path)`** — tokenizes a dot/bracket path string into segments. Supports numeric bracket syntax (`items[0].name` → `['items', '0', 'name']`) and quoted bracket-key syntax (`obj["key.with.dots"]` → `['obj', 'key.with.dots']`). Dots inside quoted brackets are treated as literal characters, not separators. Results are LRU-cached (max 1000 entries).
- **`getIn(input, path)`** — immutable nested value lookup via `parsePath`. Guards against `__proto__`/`constructor`/`prototype` access.
- **`setIn(input, path, value)`** — immutable nested value assignment with automatic intermediate object/array creation. Numeric intermediate segments create arrays.
- **`resolveRelativePath(currentPath, relativePath)`** — resolves `../`-style relative paths against a current path. `resolveRelativePath('items.0.field', '../sibling')` → `'items.0.sibling'`. Handles out-of-bounds and root-relative edge cases.
- **`normalizeRootPath(path)`** / **`normalizeRootPaths(paths)`** — extract first path segment(s) for dependency tracking. `*` acts as wildcard.
- **`createPathBinding`** (`packages/flux-core/src/utils/path-binding.ts`) — creates a path-binding service for projected-owner subtree rebasing, mapping between relative (owner-local) and absolute (parent-scope) coordinates.

## Authoring Domain — Inspector Schema Generator (P4.2)

`src/authoring/inspector-schema.ts`：inspector schema 生成器——输入 `ResolvedAuthoringContract`（authoring 契约层），输出瞬态 flux form `SchemaInput`（`buildInspectorSchema`；`deriveControlFromShape` shape 推导兜底；`xui:inspector*`/`xui:events` 瞬态标记键；无 propContracts 降级 `xui:raw`）。纯逻辑零 React。归宿裁定（plan 556）：authoring contract 同层（editor-core 零依赖姿态保持；React 无关）；page-designer-core 经选择性具名兼容再导出保留旧路径。消费：page-designer（参照实现）；其余家族按 `editor-designer-standard.md` §2.7 档位裁定分档采纳。

## Schema-Agnostic JSON Merge / Delta Utility

`packages/flux-core/src/json-merge/` 提供 "基线 + 差量 = 结果" 的合并与差量提取能力。**该层不含任何 Flux schema 依赖**：签名与实现都不出现 `SchemaInput` / `BaseSchema` / renderer 类型，元素身份在运行时从数据本身发现，因此同一套代码可服务任意 JSON 文档形态（表单配置、页面 schema、i18n 文案、任意业务配置）。

### API

- **`mergeJson(base, delta, options?) → { value, diagnostics }`** — 把 `delta` 合并到 `base`。纯函数，不修改入参，输出与入参不共享引用。从不抛异常：所有降级通过 `diagnostics` 上报。
- **`diffToDelta(resolved, base, options?) → { value, diagnostics }`** — 求出差量文档 `d`，使 `mergeJson(base, d)` 深度等于 `resolved`。无差异时 `value` 为 `undefined`。round-trip 性质由 `round-trip.test.ts` 锁定。
- **`classifyList(list, options?) → 'all' | 'some' | 'none'`** — 运行时判定列表的身份覆盖率。
- **`readIdentity(value, options?) → IdentityRef | undefined`** — 解析单个元素的身份。
- **`planListMerge(baseCount, deltaIndexes) → ListMergeSlot[]`** — 由身份匹配结果重建列表顺序。

### 合并语义

| delta 形态                          | 行为                                        |
| ----------------------------------- | ------------------------------------------- |
| 键缺省 / `undefined`                | base 值保持不变                             |
| `null`                              | 置为 `null`                                 |
| 标量                                | delta 覆盖 base                             |
| 对象                                | 逐键递归合并                                |
| 数组                                | 按身份匹配元素，顺序由 `planListMerge` 重建 |
| `{ [overrideKey]: 'remove' }`       | 删除该子树                                  |
| `{ [overrideKey]: 'replace', ... }` | 整段替换，标记键从输出剥离                  |

列表顺序重建遵循三条规则：delta 顺序优先；未匹配的 base 元素尽量保序；delta 新元素插入到其锚点元素之后。每个被匹配的 base 元素充当锚点，代表它自己直到下一个锚点之间的全部内容。

### 身份解析

`options.identityKeys` 为有序链，默认 `['xui:id', 'id', 'name']`，首个持有非空标量的键胜出。`options.uniqueAttrKey`（默认 `xui:unique-attr`）提供间接寻址：其值是另一个键名，用该键的值作为身份。空串、`null`、非标量值不携带身份。

base 列表未达到 `'all'` 时整段取 delta，并产出 `list-not-keyed` 诊断；base 列表内身份重复时保留首个匹配并产出 `duplicate-identity` 诊断。诊断的 `path` 为 RFC 6901 JSON Pointer。

### 差量提取

identity 列表**按 resolved 顺序完整输出**，且每个元素都带上身份戳（否则 merge 无法定位）；从列表中消失的元素以 `remove` 算子追加。完整输出是重排序可表达的前提——部分列表无法携带顺序信息。无身份的列表整体替换。

### 配置项

`options.markers` 可覆盖标记键（默认 `xui:override` / `xui:virtual`），用于对接其它命名空间（如 NOP 的 `x:override`）。`options.forceOverridePrefix` 默认**禁用**：启用后带此前缀的 delta 键整段替换而不合并——它会占用任意文档的合法键空间，不适合作为默认值。

### 与 page-designer tree-patch 的分工

`packages/page-designer-core/src/tree-patch.ts` 的 `diffSchemaInput` / `applyTreePatches` 产出 JSON Pointer patch 列表，服务设计器 undo/redo 栈——该场景下同一会话内 base 不漂移，positional patch 体积小且可回放。本工具服务跨版本 / 跨文件 / 跨人场景。**两者并存，不互相替换。**

## Shared Value Utilities And Host Provider Factory (cq-2)

- **`cloneDeep(value)`** (`src/utils/object.ts`) — structuredClone with JSON round-trip fallback. Input domain: plain JSON data (functions rejected under structuredClone semantics; undefined-valued properties dropped).
- **`toJsonPointer(path, ...segments)`** (`src/utils/path.ts`) — dot/bracket schema path → escaped RFC 6901 pointer, `$` root dropped, empty output collapses to `''`.
- **`appendToJsonPointer(path, ...segments)`** — appends raw segments to an already pointer-shaped path (no parsing/escaping of the incoming path).
- **`genId()`** (`src/utils/id.ts`) — canonical `<ms>-<base36>` id shape. Package-local variants (prefixed/colon/underscore forms) are deliberate and annotated at their sites.
- **`createHostActionProvider({ namespace, methods, contracts, dispatch, toActionResult, fallbackErrorMessage?, onInvokeError? })`** (`src/host-action-provider.ts`) — designer-family host action-provider factory (contract-table validation + `namespace:method` dispatch + error normalization). `createHostMethodValidator(namespace, contracts)` and `toHostActionError(error, fallbackMessage)` are the lower-level primitives for providers that keep bespoke invoke bodies (word-editor, flow-designer).
- **`defineRendererFamily({ sourcePackage?, defaultSchema? })`** (`src/renderer-definition-builder.ts`) — registration builder pinning package-wide definition invariants; produced objects are structurally identical to hand-written `RendererDefinition` literals.

## URL Safety Utility

`packages/flux-core/src/utils/url.ts` hosts the shared schema-driven `href` safety gate:

- **`isSafeNavigationUrl(url, options?)`** — allowlist check for navigation hrefs (`http:`/`https:`/`mailto:`/`tel:`/`data:`; scheme-less relative strings are safe; `javascript:`/`vbscript:`/`file:`/`blob:` are rejected). `options.download: true` unlocks `blob:` only (same-origin object-URL export links, delivered as downloads via the anchor's `download` attribute — ui-review audit 15-02); without it `blob:` stays rejected, and script-execution schemes stay rejected regardless. Promoted here as the root-cause location for the shared href-protocol gap (content `link` + basic `button` were each guarding or leaking independently); `flux-renderers-content/src/sanitize.ts` re-exports it so existing content-package consumers keep a stable import path.

## Designs No Longer Preferred

- prototype-chain objects used directly as the expression execution context
- always materializing and merging a full scope object before evaluation
- suffix-based parallel field systems such as `xxxExpr`
- a long-term external runtime model built around `staticProps` plus `dynamicProps`
- `new Function` plus `with(scope)` expression execution
- hard-wiring a specific form or validation library into the core

## Related Documents

- `docs/references/terminology.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/references/renderer-interfaces.md`
