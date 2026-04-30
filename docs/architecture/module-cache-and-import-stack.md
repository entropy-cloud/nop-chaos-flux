# Module Cache And Import Stack

## Purpose

This document defines the three-layer library management architecture for `xui:imports`:

1. **ModuleCache** — global, cross-Runtime deduplication and caching of loaded library modules
2. **env-level loader and URL resolution** — host-controlled loading strategy and relative path resolution
3. **ImportStack** — per-Runtime lexical scope management of import aliases

Use it when:

- deciding how `xui:imports` loads, caches, and deduplicates external libraries
- designing the boundary between Flux-internal library management and host-provided loading infrastructure
- integrating Flux into a host application (e.g. nop-chaos-next) that already has its own module federation layer
- implementing compile-time symbol visibility for imported expression helpers

This document supplements `docs/architecture/action-scope-and-imports.md`, which defines the semantic contract of `xui:imports` (declaration semantics, action dispatch, expression bindings). This document focuses on the _loading, caching, and lexical scoping_ mechanics that are not covered there.

## Current Implementation

The current implementation now has all three landed layers:

| Current Layer                               | Location                                                                                                           | Responsibility                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Module loading dedup                        | `packages/flux-runtime/src/runtime-factory.ts` `createModuleCache()` + `packages/flux-runtime/src/import-stack.ts` | Shared `ModuleCache` dedup keyed by resolved `from+options`                                                                     |
| Alias + lexical frame ownership             | `packages/flux-runtime/src/import-stack.ts`                                                                        | Per-runtime `ImportStack` push/pop, nearest-frame shadowing, namespace registration/release                                     |
| Schema preparation + static import metadata | `packages/flux-runtime/src/runtime-factory.ts` `prepareSchema()` + `packages/flux-compiler/src/schema-compiler.ts` | Collects all `xui:imports` before compile, resolves URLs, preloads modules, and feeds prepared import metadata into compilation |
| Expression bindings                         | `packages/flux-react/src/node-renderer.tsx` + child scope overlay                                                  | compiled node installs current-frame bindings synchronously as ordinary `$alias` scope keys for expression evaluation           |

### Relationship To ActionScope

`ImportStack` and `ActionScope` are intentionally related but not identical:

- `ImportStack` owns lexical import frames and imported alias visibility for expression helpers such as `$demo`
- `ActionScope` owns lexical capability lookup for namespaced actions such as `demo:open`

Current baseline:

- `SchemaRenderer` / runtime preparation collects schema imports and preloads modules before compilation
- compiled nodes carry prepared import metadata rather than forcing `NodeRenderer` to rediscover raw `xui:imports` from schema
- runtime `ImportStack.installPrepared(...)` creates an `ImportFrame` synchronously from preloaded module data and records imported alias entries
- if the imported module exposes an action namespace provider, that provider is attached to the current import-owned child `ActionScope`
- `NodeRenderer` guarantees that import-owned capability boundary by creating a child `ActionScope` whenever the compiled node carries `importsPlan`; this rule is import-owned runtime semantics, not renderer `actionScopePolicy`

Important consequence:

- `ImportFrame` should not be described as a replacement for `ActionScope`
- `ActionScope` should not be described as the expression-alias carrier
- the two mechanisms cooperate to implement one `xui:imports` declaration

### Current Constraints

1. Import static metadata is available to compilation through prepared imports, including imported helper/member lookup and callable parameter-count validation when `ImportedLibraryStaticMeta.helpers` includes function parameter definitions.

2. Compile-time symbol visibility is additive and conservative. Unknown `$` references outside the known categories remain informational or runtime-resolved rather than becoming hard compile blockers.

3. Page-level `$page` metadata is available to the compile-time symbol table, but page-lifecycle authoring semantics still remain governed by the existing page/status architecture docs rather than by this file alone.

## Three-Layer Design

```
┌──────────────────────────────────────────────────────────────┐
│  Host Application (e.g. nop-chaos-next)                      │
│                                                               │
│  env.importLoader          — how to load a module             │
│  env.resolveImportUrl      — how to resolve relative paths    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ModuleCache (global, shared across Runtimes)            │ │
│  │  — keyed by absolute URL                                 │ │
│  │  — deduplicates loads                                    │ │
│  │  — can be shared with host module federation             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ RendererRuntime A│  │ RendererRuntime B│                  │
│  │  ImportStack     │  │  ImportStack     │                  │
│  │   Frame (node 1) │  │   Frame (node 1) │                  │
│  │   Frame (node 2) │  │                   │                  │
│  └──────────────────┘  └──────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

### Layer 1: ModuleCache

**Scope**: global or host-provided, shared across all `RendererRuntime` instances within the same application.

**Responsibilities**:

- Deduplicate module loads by absolute URL
- Cache loaded `ImportedLibraryModule` objects
- Track pending loads to avoid duplicate fetches
- Optionally share cached results with the host's own module federation (e.g. `globalThis.__NOP_SHARED__`)

**Interface**:

```typescript
interface ModuleCache {
  get(absUrl: string): ImportedLibraryModule | undefined;
  set(absUrl: string, module: ImportedLibraryModule): void;
  has(absUrl: string): boolean;
  getPending(absUrl: string): Promise<ImportedLibraryModule> | undefined;
  setPending(absUrl: string, promise: Promise<ImportedLibraryModule>): void;
  removePending(absUrl: string): void;
}

function createModuleCache(): ModuleCache;
```

**Deduplication key**: the absolute URL string, produced by Layer 2's URL resolution. Two `xui:imports` declarations with different `as` aliases but the same resolved absolute URL share one cached module.

**Lifecycle**: the `ModuleCache` outlives any individual `RendererRuntime`. It should be created once by the host application and passed into `createRendererRuntime`. If not provided, a default per-runtime cache is created for standalone usage.

**Integration with nop-chaos-next**:

nop-chaos-next uses `globalThis.__NOP_SHARED__` for framework-level shared modules (React, UI library, etc.) and SystemJS import maps for plugin-level modules. The `ModuleCache` complements this: it caches _business-level library modules_ (e.g. `demo-lib`, `spreadsheet-lib`) that are loaded via `env.importLoader`. The host may choose to back the `ModuleCache` with `__NOP_SHARED__` entries, or keep them separate.

```typescript
// Host-side integration example
const fluxModuleCache = createModuleCache();

// Optional: pre-populate with already-loaded host modules
if (globalThis.__NOP_SHARED__?.['my-flux-lib']) {
  fluxModuleCache.set(
    'https://app.com/libs/my-flux-lib',
    adaptHostModule(globalThis.__NOP_SHARED__['my-flux-lib'])
  );
}

const runtime = createRendererRuntime({
  ...,
  moduleCache: fluxModuleCache
});
```

### Layer 2: env-level Loader and URL Resolution

**Scope**: provided by the host application on `RendererEnv`.

**Responsibilities**:

- `env.importLoader` — actual module loading (fetch, SystemJS import, dynamic import, etc.)
- `env.resolveImportUrl` — resolve relative `from` paths to absolute URLs based on the schema's origin

**Interface additions to `RendererEnv`**:

```typescript
interface RendererEnv {
  // Existing
  importLoader?: ImportedLibraryLoader;

  // New: resolve a relative or aliased import path to an absolute URL
  resolveImportUrl?(schemaUrl: string, from: string, options?: Record<string, unknown>): string;
}
```

**`schemaUrl` propagation**: the `SchemaRenderer` must know its schema's origin URL so it can resolve relative imports. This is passed as a new prop:

```typescript
interface SchemaRendererProps {
  // Existing
  schema: SchemaInput;
  env: RendererEnv;

  // New: the origin URL of the schema, used for resolving relative xui:imports
  schemaUrl: string;
}
```

When `schemaUrl` and `env.resolveImportUrl` are available, the runtime resolves each `xui:imports` entry's `from` to an absolute URL before cache lookup or loading.

**Resolution flow**:

```
xui:imports from: "./libs/demo-lib"
        │
        ▼
env.resolveImportUrl(schemaUrl, "./libs/demo-lib")
        │
        ▼
"https://app.com/pages/libs/demo-lib"   (absolute URL)
        │
        ▼
ModuleCache.get(absUrl)                 (check cache)
        │
        ▼
if miss → env.importLoader.load(spec)   (actual load)
        │
        ▼
ModuleCache.set(absUrl, module)         (cache result)
```

### Layer 3: ImportStack (per-Runtime lexical scope)

**Scope**: one per `RendererRuntime`, managed as a stack of `ImportFrame` objects.

**Responsibilities**:

- Map alias names to loaded module artifacts (action providers, expression helpers)
- Maintain proper lexical scope: push on entry to a node with `xui:imports`, pop on exit
- Support nested imports where inner frames shadow outer frames
- Provide the current set of visible aliases to expression evaluation

**Interface**:

```typescript
interface ImportStackEntry {
  alias: string;
  actionProvider: ActionNamespaceProvider;
  expressionHelpers: Record<string, unknown>;
}

interface ImportFrame {
  ownerNodeId: string;
  entries: Map<string, ImportStackEntry>; // alias → entry
}

interface ImportStack {
  readonly frames: readonly ImportFrame[];

  push(input: {
    nodeId: string;
    imports: readonly XuiImportSpec[];
    cache: ModuleCache;
    actionScope: ActionScope;
  }): Promise<void>;

  pop(nodeId: string): void;

  resolveAlias(alias: string): ImportStackEntry | undefined;

  currentBindings(): Readonly<Record<string, unknown>>;
}
```

**Stack discipline**:

- Entering a node with `xui:imports`: `push()` creates a new frame, resolves each import spec's module from `ModuleCache`, registers action providers on the current `ActionScope`, and collects expression helpers by alias.
- Inside that node's subtree: expression evaluation reads `$demo.xxx` by searching from the top of the stack.
- Leaving the node: `pop()` removes the frame, unregisters action providers from `ActionScope`.
- Nodes without `xui:imports`: no frame is pushed; alias resolution falls through to ancestor frames.

**Nesting example**:

```
root (xui:imports: [{ from: "lib-a", as: "common" }])
  └── container (xui:imports: [{ from: "lib-b", as: "chart" }])
        └── text: "${$common.prefix} ${$chart.title}"
              │
              │  resolveAlias("common") → found in frame[0]
              │  resolveAlias("chart")  → found in frame[1]
              │
        └── sibling-text: "${$common.prefix}"
              │
              │  resolveAlias("common") → found in frame[0]
              │  resolveAlias("chart")  → not found, returns undefined
              │
  └── other-text: "${$common.prefix}"
        │
        │  resolveAlias("chart")  → not found (frame[1] already popped)
```

**Difference from current `__imports`**: the current implementation puts all imports into a flat map on the scope. A sibling node that should not see `$chart` can still read it because the root `SchemaRenderer` pre-collected all imports. The stack model fixes this: only ancestors' frames are visible, and a frame is removed when its owning node is exited.

## Data Flow: Complete Import Lifecycle

### 1. Schema Compilation (Compile Time)

```
Schema compilation receives { schema, schemaUrl, env }
        │
        ▼
Compiler records `xui:imports` declarations into symbol visibility and node metadata
        │
        ▼
CompileSymbolTable learns which `$alias` names are lexically visible at each node
        │
        ▼
TemplateNodes are produced with import metadata attached
```

Compile-time rule:

- compilation validates declaration visibility and emits import-aware node metadata
- schema preparation plus compilation own import readiness for ordinary schema rendering: declared imports are resolved, preloaded, and queried for static meta before template generation completes
- mounted lifetime and lexical provider registration still remain runtime responsibilities through `ImportStack.installPrepared(...)` and import-owned `ActionScope` boundaries
- lexical visibility still comes from compiled node ownership plus runtime import-frame installation, not from cache warming alone

### 2. Node Rendering (Runtime)

```
NodeRenderer encounters node with xui:imports
        │
        ▼
    ensure import-owned capability boundary (current baseline: child `ActionScope` for every `xui:imports` node)
        │
        ▼
ImportStack.push({ nodeId, imports, cache, actionScope })
  - For each import spec:
    - absUrl = env.resolveImportUrl(schemaUrl, spec.from) [or reuse from compile time]
    - module = ModuleCache.get(absUrl)  [guaranteed to be cached after step 1]
    - actionProvider = module.createNamespace(context)
    - expressionHelpers = module.createExpressionHelpers?.(context)
    - register actionProvider on ActionScope as spec.as
    - record { alias: spec.as, actionProvider, expressionHelpers } in frame
        │
        ▼
Create child data scope with current frame's expression helpers as `$alias` bindings when bindings are non-empty
        │
        ▼
Render node content (expressions can see $alias.xxx)
        │
        ▼
On unmount / exit:
  ImportStack.pop(nodeId)
  - unregister action providers from ActionScope
  - frame is removed from stack
```

Runtime rule:

- `xui:imports` causes both an import frame and a child `ActionScope`, but for different reasons
- the import frame owns alias visibility and imported helper lifetime
- the child `ActionScope` owns imported namespace capability lookup
- runtime/docs must preserve this conceptual split and must not recast the child `ActionScope` as renderer-owned policy

## Relationship to Existing Documents

| Document                      | Relationship                                                                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action-scope-and-imports.md` | Defines `xui:imports` semantics: declaration model, action dispatch, expression binding conventions. This document defines the _mechanics_ of loading and scoping that fulfill those semantics. |
| `renderer-runtime.md`         | Describes `RendererRuntime` construction and lifecycle. This document introduces `ModuleCache` as a new cross-Runtime dependency and `ImportStack` as a new per-Runtime structure.              |
| `flux-formula.md`             | Describes the expression compiler. Future work will feed ImportStack alias information into the compile context so that `$demo.formatName()` can be validated at compile time.                  |

## Migration Path

The three-layer design can be adopted incrementally:

### Phase 1: Extract ModuleCache

- Extract `moduleLoads` from `ImportManager` closure into a standalone `ModuleCache` interface.
- Accept `ModuleCache` as an optional parameter to `createRendererRuntime`.
- Default to per-runtime cache when not provided (backwards compatible).
- nop-chaos-next integration passes a shared cache.

### Phase 2: Add URL Resolution

- Add `resolveImportUrl` to `RendererEnv`.
- Add `schemaUrl` to `SchemaRendererProps`.
- When both are present, resolve `from` before cache lookup.
- When not present, use `from` as-is (backwards compatible).

### Phase 3: Replace `__imports` With ImportStack

- Replace the flat `__imports` scope map with `ImportStack` push/pop discipline.
- Remove root-level `collectSchemaImports` preload that puts all imports into root scope.
- Instead, each node with `xui:imports` pushes its own frame.
- Root-level preloading still happens for performance, but the preload result goes into `ModuleCache`, not into the root scope map.

Status: landed

### Phase 4: Compile-Time Symbol Visibility

- Feed `ImportStack` alias information into the expression compiler's compile context.
- `$alias` names become known at compile time.
- Unknown `$alias` references produce compile diagnostics.
- This enables IDE support and earlier error detection.

Status: landed in conservative form

- The live compiler now builds a `CompileSymbolTable` from builtin namespaces, renderer-injected locals, `xui:imports`, and parameterized region slot metadata.
- Current diagnostics cover alias/slot/builtin-member categories without requiring import helper manifests.

### Phase 5: Static Expression Folding

Status: landed in conservative form

- Pure builtin-only expressions such as `${$Math.max(1, 2)}` and fully static templates now fold to `static-node`.
- Runtime-owned symbols such as imported aliases, injected locals, slot params, and ambient scope paths remain dynamic by design.

## Compile-Time `$` Variable Resolution And Validation

This section defines how the expression compiler resolves and validates `$`-prefixed identifiers at compile time.

### `$` Prefix Categories

Every `$`-prefixed identifier encountered in an expression falls into exactly one of the following categories. The compiler must determine which category applies **before** emitting runtime evaluation code.

| Category           | Examples                                      | Source Of Truth                                                                         | Known At Compile Time?                                          |
| ------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Builtin namespace  | `$Math`, `$JSON`, `$Date`                     | Hard-coded in `packages/flux-formula/src/builtins.ts`                                   | Yes — always available                                          |
| Imported namespace | `$demo`, `$chart`                             | `xui:imports` on current node or ancestor, resolved through `ImportStack`               | Yes — alias declared in schema                                  |
| Injected local     | `$form`, `$page`, `$surface`                  | Owner renderer type (form renderer publishes `$form`, page publishes `$page`)           | Yes — determinable from scope policy and renderer type          |
| Slot root + params | `$slot.item`, `$slot.index`, `$slot.$parent`  | `SchemaFieldRule.params` on the enclosing parameterized region, plus slot nesting depth | Yes — determinable from region metadata and parent region chain |
| Lambda parameter   | `$item` inside `${items.map(($item) => ...)}` | Inline lambda parameter declaration in the expression itself                            | Yes — parsed from expression AST                                |
| Ambient scope      | `$`-prefixed names not in any above category  | Resolved at runtime from the data scope                                                 | No — compiler cannot validate existence                         |

### Symbol Resolution Stack

The compiler maintains a `CompileSymbolTable` that is built incrementally as the schema is compiled. It follows the same stack discipline as the runtime `ImportStack`, but carries only declaration-level metadata, not runtime objects.

```typescript
interface SymbolInfo {
  name: string;
  kind:
    | 'builtin-namespace'
    | 'import-namespace'
    | 'injected-local'
    | 'slot-root'
    | 'slot-param'
    | 'lambda-param'
    | 'ambient-scope';
  source: string; // e.g. "builtin", "xui:imports[0]", "form-renderer", "region.params[0]"
  memberType?: TypeDescriptor; // for namespaces: what properties/methods are available
  required?: boolean; // true if the symbol must be present at runtime
}

interface SymbolFrame {
  owner: 'root' | 'imports' | 'slot' | 'lambda' | 'host';
  symbols: Map<string, SymbolInfo>;
}

interface CompileSymbolTable {
  frames: SymbolFrame[];
  resolve(name: string): SymbolInfo | undefined;
  pushFrame(owner: SymbolFrame['owner'], symbols: Iterable<SymbolInfo>): void;
  popFrame(): void;
}
```

### Build Order

The `CompileSymbolTable` is constructed in this order during schema compilation:

1. **Root frame** — builtin namespaces

   ```
   $Math  → { kind: 'builtin-namespace', source: 'builtin' }
   $JSON  → { kind: 'builtin-namespace', source: 'builtin' }
   $Date  → { kind: 'builtin-namespace', source: 'builtin' }
   ```

2. **Host frame** — injected locals determinable from the root renderer type
   - If root renderer has `scopePolicy: 'form'`:
     ```
     $form → { kind: 'injected-local', source: 'form-renderer' }
     ```
   - Always available in any context:
     ```
     $page → { kind: 'injected-local', source: 'page-runtime' }
     ```

3. **Imports frame** — pushed when compiling a node that declares `xui:imports`
   - For each `{ from: 'demo-lib', as: 'demo' }`:
     ```
     $demo → { kind: 'import-namespace', source: 'xui:imports[0]' }
     ```
   - Popped when leaving that node's schema subtree.

4. **Slot frame** — pushed when compiling the content of a parameterized region
   - If the enclosing region has `params: ['item', 'index']`:
     ```
     $slot → { kind: 'slot-root', source: 'region.params' }
     $slot.item → { kind: 'slot-param', source: 'region.params[0]' }
     $slot.index → { kind: 'slot-param', source: 'region.params[1]' }
     $slot.$parent → { kind: 'slot-param', source: 'slot-ancestry' }  // only if outer slot exists
     ```
   - Popped when leaving that region's content.

5. **Lambda frame** — pushed when the expression compiler encounters a lambda parameter

   ```
   $item → { kind: 'lambda-param', source: 'lambda-param' }
   ```

   - Popped when leaving the lambda body.

### Resolution Rules

When the expression compiler encounters a `$`-prefixed identifier:

1. Search from the top of the `CompileSymbolTable` stack downward.
2. If found in a frame:
   - Record the symbol as a dependency with known category.
   - If the symbol has `memberType` metadata and the expression accesses a member (e.g. `$demo.formatName`), validate the member access against `memberType`. Report `unknown-member` if the member is not declared.
   - Emit runtime evaluation code that resolves through the corresponding channel (builtin registry, `__imports`, `$slot` frame, lambda closure, or scope data).
3. If not found in any frame:
   - Classify as `ambient-scope`.
   - The compiler does **not** produce an error for unknown `$`-prefixed names. It emits a runtime scope read (`scope.get(name)`) and records a wildcard dependency.
   - Rationale: the data scope is dynamic and schema-authorable. The compiler cannot know every possible scope key. However, the `ambient-scope` classification is recorded in diagnostics metadata so that host-level validators or IDE tooling can flag potentially misspelled names if they choose to.

### Validation And Diagnostics

The compile-time validation produces the following diagnostic categories:

| Code                       | Severity | Condition                                                                                                                                                                                 |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unknown-import-alias`     | error    | A `$alias` name that matches the `import-namespace` naming pattern but the alias is not declared in any `xui:imports` reachable from the current node.                                    |
| `import-alias-not-ready`   | warning  | A `$alias` is declared in `xui:imports` but the module failed to load or is still loading at compile time. The expression is emitted but will likely fail at runtime.                     |
| `unknown-slot-param`       | error    | `$slot.xxx` is used where `xxx` is not declared in the enclosing region's `params`. `$slot.$parent.xxx` has the same check against the parent region's params.                            |
| `slot-used-outside-region` | error    | `$slot.xxx` is used outside any parameterized region. `$slot` is only available inside regions that declare `params`.                                                                     |
| `unknown-builtin-member`   | error    | `$Math.xxx` where `xxx` is not a known member of the builtin namespace.                                                                                                                   |
| `unknown-import-member`    | warning  | `$demo.xxx` where `xxx` is not declared in the imported module's capability manifest. Severity is `warning` because manifests may be incomplete; the member might still exist at runtime. |
| `ambient-dollar-reference` | info     | A `$`-prefixed name is used that does not match any known category. Informational only — not necessarily wrong, but useful for IDE highlighting.                                          |

### Interaction With Module Manifests

For `unknown-import-member` and imported callable diagnostics to work, imported modules must provide static metadata through `ImportedLibraryModule.getStaticMeta()`.

```typescript
interface ImportedLibraryStaticMeta {
  helpers?: Record<
    string,
    {
      kind?: 'function' | 'value';
      params?: Array<{
        name: string;
        required?: boolean;
      }>;
    }
  >;
  namespaceMethods?: readonly string[];
}
```

This metadata is separate from the runtime `createExpressionHelpers()` output. It is a static declaration returned during schema preparation, before template compilation.

When static meta is available, the compiler validates imported member access and imported function argument counts against it. When no static meta is available, the compiler skips those helper/member diagnostics for that alias and falls back to runtime resolution.

### Static Expression Folding

With a populated `CompileSymbolTable`, the compiler can also perform **static expression folding**:

| Expression                      | Condition                                                                | Result                                   |
| ------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| `${1 + 2}`                      | All operands are literals                                                | Compile to `static-node` with value `3`  |
| `${'x'}3`                       | Template parts are all literals or statically resolvable                 | Compile to `static-node` with value `x3` |
| `${true ? 'a' : 'b'}`           | Condition and branches are all literals                                  | Compile to `static-node` with value `a`  |
| `${$Math.max(1, 2)}`            | `$Math` is builtin, `max` is a pure function, all args are literals      | Compile to `static-node` with value `2`  |
| `${$form.submitting}`           | `$form` is an injected local — not statically resolvable                 | Compile to `expression-node`             |
| `${$demo.formatName('A', 'B')}` | `$demo` is an import — not statically resolvable (side effects possible) | Compile to `expression-node`             |

Rules for folding:

1. An expression can be folded to a static value only if **all** referenced symbols are either literals or builtin pure functions with literal arguments.
2. Injected locals (`$form`, `$page`), import namespaces (`$demo`), slot params (`$slot.item`), and ambient scope names are never statically resolvable — they depend on runtime state.
3. The folding decision is made after symbol resolution, not before. The compiler must first resolve the symbol to determine whether it is foldable.

## Open Questions

- **ModuleCache persistence**: should the cache survive page navigations in an SPA? If yes, should it have an LRU eviction policy or TTL? Currently the design assumes the cache lives as long as the host application.
- **Hot reload**: when a library module is updated on the server, how does the cache invalidate? The host can provide a new `env.importLoader` or clear cache entries, but this document does not define a standard invalidation protocol.
- **Lazy loading vs eager preload**: the current `SchemaRenderer` preloads all imports before rendering. With the new design, preload still populates `ModuleCache`, but the `ImportStack` push can be lazy (the module is already cached). Whether to preload or load-on-demand is a host-level decision, not a Flux-level mandate.
- **Richer callable contracts**: the current baseline validates imported function arity from static parameter definitions, but it does not yet model full argument type checking or return-type-aware IDE tooling.
