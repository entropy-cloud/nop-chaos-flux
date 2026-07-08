# Renderer Runtime Design

## Purpose

This document defines the normative runtime, renderer, and React integration shape for Flux's React host.

Use it when changing:

- renderer component contracts
- hooks and context usage
- fragment rendering and region handling
- scope flow through React render trees
- render-time performance behavior

For detailed slot and field-semantics rules, use `docs/architecture/field-metadata-slot-modeling.md` as the primary document.

For the clean-slate template/instance split, compiled-node identity, and table/loop instance rules, use `docs/architecture/template-instantiation-and-node-identity.md`.

## Reference Anchors

When this document needs to be checked against implementation progress, start with:

- `packages/flux-core/src/index.ts` for renderer contracts
- `packages/flux-react/src/index.tsx` for hooks, rendering helpers, and React boundaries
- `packages/flux-runtime/src/node-runtime.ts` for resolved prop/meta behavior
- `packages/flux-runtime/src/page-runtime.ts` and `packages/flux-runtime/src/form-runtime.ts` for runtime container creation

For compiled-node identity, template/instance split, and table/loop instance rules, see `docs/architecture/template-instantiation-and-node-identity.md`.

## Main Design Rule

The core rule is:

`boundary inputs stay explicit; ambient runtime capabilities come from hooks; local fragment rendering uses explicit render handles.`

## Design Principles

### Explicit at boundaries, implicit in the middle

- root boundaries use explicit props
- internal nodes avoid prop-drilling chains for shared runtime capabilities
- shared runtime services come from contexts and hooks

### Selective data access

Components that need one piece of state should not rerender for unrelated changes.

Prefer selector-style reads over broad `scope.materializeVisible()` access.

The runtime baseline carries this one step further for compiled node resolution:

- dynamic value execution records the scope paths it actually read
- scope subscriptions carry `ScopeChange.paths`
- `NodeRenderer` only re-runs `resolveNodeMeta()` / `resolveNodeProps()` when the incoming changed paths intersect the node's last dependency set
- wildcard or broad-access reads remain conservatively invalidated on any scope change
- compile-time-owned structural fields that intentionally execute outside ordinary `propsProgram` resolution still have to participate in that invalidation contract; the current live baseline keeps node-level `when` on compiled structural fields and treats dynamic structural `loop` / `recurse` `itemData` conservatively as props invalidation inputs so repeated subtrees rerender when their parent lexical inputs change
- runtime owners must expose explicit teardown for long-lived resources; the current `RendererRuntime` surface includes `dispose()` to stop owned data sources, reactions, imported namespace registrations, and in-flight requests when a host unmounts or replaces a runtime instance
- runtime-owned teardown aborts action dispatch first. The current baseline requires `runtime.dispose()` to abort the action dispatcher root signal before forms, pages, surfaces, import frames, or other runtime-owned resources begin tearing down, so in-flight dispatch chains observe cancellation instead of continuing against partially disposed owners.
- React-owned runtime cleanup must be StrictMode-safe: renderer-owned runtimes created during render, such as `FormRenderer` owned form runtimes, must not be synchronously disposed by the first effect cleanup pass if React dev StrictMode immediately replays the effect for the same still-current owner. Cleanup should defer disposal long enough to distinguish true unmount/replacement from StrictMode effect replay.

### Compile once, execute many times

Template compilation should happen once per schema identity, while runtime mostly instantiates templates and resolves live node instances.

Normative compile model:

- `SchemaCompiler.compile()` returns `CompiledTemplate` containing a `TemplateNode` tree
- all compilation calls within one `RendererRuntime` share a single counter, giving every `templateNodeId` a globally unique value within that runtime
- `TemplateNode.component` carries the resolved `RendererDefinition` directly from compile time — no per-render registry lookup
- `NodeRenderer` receives `TemplateNode` and constructs `NodeInstance` directly; the older `CompiledSchemaNode` step has been eliminated and does not appear in the render path
- `templateNodeId` is the compiled structural identity
- `cid` is the live inspectable bridge token written to `data-cid` when a mounted node needs DOM/debugger/registry bridging
- `NodeLocator` is a retired transitional wrapper and must not remain in runtime-facing contracts
- repeated structure remains available through `instancePath`, but mounted lookup/debugger/registry entry is `cid`

`cid` belongs on the mounted inspectable node root, not mechanically on the innermost interactive element.

- when a renderer owns its DOM root directly, that renderer root emits `data-cid`
- when a field renderer is wrapped by `FieldFrame`, the mounted inspectable node root is the `FieldFrame` root, so `data-cid` lives there
- debugger lookup climbs to the nearest ancestor with `data-cid`, so descendants do not need duplicate `data-cid` markers
- do not duplicate the same `cid` onto both `FieldFrame` and the inner control root unless a future owner doc explicitly introduces a different bridge contract

### Static fast path and identity reuse are mandatory

- no expression means original-reference return
- unchanged dynamic results should reuse previous references whenever possible

### Runtime helpers should stay reference-stable

Helpers such as `evaluate`, `dispatch`, `render`, and `createScope` should be stable across renders unless ownership truly changes.

## Architecture Guardrails (Bug-Derived)

The following are architecture-level constraints distilled from historical regressions.

- Reactive render paths must subscribe. Components that need reactive scope data in render must use selector/subscription APIs such as `useScopeSelector`, not imperative reads such as `scope.get(...)`.
- Render phase must stay side-effect free. Renderer paths must not call store writers or state setters during render. If synchronization is needed, buffer and flush in an effect. Current live baseline: `NodeRenderer` installs prepared import frames and named-action namespaces from layout effects, and import-owned nodes may return `null` for the pre-commit pass instead of mutating runtime state during render.
- Runtime-owned React boundaries must allocate owner resources only after commit. The current live baseline applies the same commit-safe rule to fragment child scopes, node-owned action scopes/component registries, host projection scopes, declarative surface scopes, and renderer-owned form runtimes; pre-commit passes may temporarily render a preparing/null state instead of creating runtime-owned resources during render.
- Root page scope should be seeded when `SchemaRenderer` creates the page runtime. Effects should only reconcile subsequent prop changes so mount-time child effects do not lose writes to a later root-data sync.
- Scope identity and lifecycle must stay stable. Fragment/dialog render paths should avoid unnecessary scope recreation and must preserve parent-child reactivity when parent scope data changes.
- React host effects should not republish owner summaries that already belong to runtime owners. For example, `DialogHost` may render the mounted surface tree, but `statusPath` publication belongs to `SurfaceRuntime` so React rendering does not create a second source of truth or write to the wrong scope.
- Surface-family cleanup follows the same runtime-owned summary contract for both declarative and action-opened entries: close/unmount writes the closed summary `{ open: false, active: false, opening: false, closing: false }` through `SurfaceRuntime`, not `undefined`.
- Surface body rendering must preserve local crash containment. Dialog/drawer body content should be wrapped in a node-level error boundary so one failing surface body cannot collapse the root schema tree or sibling surfaces.

Use `docs/references/architecture-guardrails-from-bugs.md` for concrete anti-patterns, regression examples, and verification checks.

## Active Internal Shape

The current renderer stack is effectively split into:

1. `SchemaCompiler` → produces `CompiledTemplate` (containing `TemplateNode` tree)
2. `RendererRegistry`
3. `RendererRuntime`
4. split React contexts and hooks
5. `SchemaRenderer` and `NodeRenderer`

```text
raw schema
  -> SchemaCompiler
CompiledTemplate (TemplateNode tree)
  -> SchemaRenderer
runtime + root scope + page context
  -> NodeRenderer(templateNode, instancePath?)
NodeInstance (cid, templateNode, instancePath, scope, state)
resolved meta + resolved props + regions + events + helpers
  -> concrete renderer component
```

## End-To-End Render Pipeline

The current mental model is:

1. `SchemaRenderer` is the explicit root boundary
2. `RenderNodes` normalizes raw schema input into compiled nodes and handles fragment-local rendering concerns
3. `NodeRenderer` executes one compiled node against the current scope and runtime
4. the concrete renderer component receives already-resolved inputs plus ambient runtime contexts

Expanded flow:

```text
JSON schema
  -> RendererRegistry resolves `schema.type`
  -> SchemaCompiler classifies fields as meta / prop / region / event / value-or-region
  -> compiled node tree
  -> SchemaRenderer creates runtime + page runtime + root scope + root action scope + root component registry
  -> RenderNodes picks the current child scope / fragment scope
  -> NodeRenderer resolves node meta and props against that scope
  -> NodeRenderer builds regions, events, helpers, and node identity context
  -> concrete renderer runs
```

Practical ownership split:

- compilation decides what each field means
- runtime resolution decides what each dynamic field evaluates to now
- `NodeRenderer` assembles the final renderer contract
- owner renderers such as `form` create descendant runtime boundaries
- `@nop-chaos/flux-core` owns only the host-neutral callable contract shape for renderer definitions and fragment helpers
- `@nop-chaos/flux-react` owns the React-specialized aliases for `RendererDefinition`, `RenderRegionHandle`, `RendererHelpers`, and `SchemaRendererComponent`, plus the active React hook surface exported from `packages/flux-react/src/hooks.ts`
- source lifecycle semantics remain runtime-owned even when React helpers expose source-enabled props; React host code should mount, subscribe, and dispose, but must not invent a parallel source-controller model
- source-enabled prop execution must preserve the same merged renderer action context shape that `helpers.executeSource(...)` uses for the same node, including action scope, component registry, form/page/surface handles, and evaluation bindings

## NodeRenderer Responsibilities

`NodeRenderer` is the single-node execution orchestrator. Its current responsibilities are:

- resolve `meta` from the current node and scope
- resolve `props` from the current node and scope
- subscribe selectively so unrelated scope writes do not recompute unrelated nodes
- build `events` from declarative event fields
- build region handles for child schema
- create stable `helpers`
- execute node-local optional provider closures such as class-alias publication
- install compiled import-owned capability boundaries from preloaded import data in a commit-safe effect before rendering the import-owned subtree
- dispatch node lifecycle actions
- invoke the concrete renderer component

It is intentionally not the owner of every runtime boundary in the tree.

`NodeRenderer` does not own:

- page runtime creation
- form runtime creation
- fragment child scope creation for `render({ bindings })`
- dialog / drawer surface runtime ownership and root surface host rendering

Those boundaries belong to the concrete creator path that introduces them.

## Renderer Component Contract

Renderer components receive:

```ts
type RendererResolvedProps<S extends BaseSchema = BaseSchema> = Record<string, unknown> & {
  type?: S['type'];
  id?: string;
  className?: string;
  frameClassName?: string;
  disabled?: boolean;
  testid?: string;
  cid?: number;
};

interface RendererComponentProps<
  S extends BaseSchema = BaseSchema,
  P extends Record<string, unknown> = RendererResolvedProps<S>,
> {
  id: string;
  path: SchemaPath;
  schema: S;
  templateNode: TemplateNode<S>;
  node: NodeInstance<S>;
  props: Readonly<P>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  reactions: Readonly<Record<string, ReactionHandle>>;
  helpers: RendererHelpers;
}
```

Meaning:

- `schema` is the declared source shape
- `props` is the final renderer-facing runtime prop bag for the current render
- `props` includes evaluated renderer-declared prop fields, values resolved from `allowSource` fields, any companion source state named by `sourceStateKey`, and renderer-facing node-control projections such as `disabled`, `className`, `testid`, and `cid`
- renderer-facing props are assembled as meta projection first and compiled prop values second, so an explicitly declared renderer prop wins over a projected node-control default for the same key
- `templateNode` is the immutable structural definition produced at compile time; `templateNode.component` carries the resolved `RendererDefinition` directly
- `node` is the live runtime `NodeInstance` for this mounted node; `node.cid` is the unique live mounted-node id used by DOM/debugger/registry lookup
- `RendererResolvedProps<S>` is intentionally wider than raw `S`: runtime prop bags may include only the resolved business fields a renderer consumes, while structural schema-only fields still remain on `schema`
- `meta` is the resolved node-control record used by `NodeRenderer` and frame/runtime plumbing for lifecycle, visibility, hidden-field participation, and wrapper behavior; concrete renderers should prefer `props` for renderable attributes
- `schema.frameWrap` is the per-instance override for `RendererDefinition.wrap`; it can suppress wrapping or switch wrap-compatible renderers to grouped `<fieldset>` layout
- `regions` is the map of precompiled child render handles
- `events` is the map of runtime event handlers derived from declarative event fields
- `reactions` is the map of `ReactionHandle` entries derived from `kind: 'reaction'` fields; it is a new channel parallel to `events` and `regions`, used for fields that are both reactive (auto-fire on declared `dependsOn` root changes) and imperative (renderer calls `dispatch()`/`force()`) with renderer-owned timing via `ready()`/`pause()`/`resume()`. A `ReactionHandle` starts in the `initial-paused` phase; the renderer must call `ready()` to enable firing.
- `helpers` exposes stable imperative runtime helpers
- `templateNode.lifecycleActions` carries compiled `onMount` / `onUnmount` actions when the schema declares them
- `templateNode.structuralWhen` is the compiled structural-activation guard for node-local `when`; React/runtime code owns executing this guard before renderer render and lifecycle/effect participation
- `templateNode.structuralFields` is a generic `Record<string, CompiledRuntimeValue>` holding fields declared with `lazyEval: true` on `SchemaFieldRule`. The compiler compiles these fields into this record instead of `propsProgram`, and each renderer evaluates them at a time and scope of its choosing via `helpers.evaluateCompiled()`. Currently used by `loop` / `recurse` `itemData`, but any renderer can declare lazy-eval fields.
- renderer event handlers consume `Partial<ActionContext>`; component capability handlers receive the looser `ComponentCapabilityActionContext`, so renderer/package adapters must explicitly bridge only the fields they actually need instead of assuming the capability context is a full action context

`RendererHelpers` also expose two evaluation channels:

- `helpers.evaluate(target, scope?)` for schema-authored ad hoc values that still need compile+evaluate behavior at the helper boundary
- `helpers.evaluateCompiled(compiled, scope?)` for renderer paths that must execute an already-compiled runtime value from `TemplateNode` without falling back to runtime recompilation
- `helpers.createScope(patch, options?)` and `helpers.disposeScope(scopeId)` for renderer-owned child-scope lifecycles; long-lived renderer caches such as table row scopes must dispose owned scopes on eviction and unmount instead of only dropping local references

Current helper lifecycle baseline:

- `helpers.createScope(patch?, options?)` creates a child scope for renderer-owned local materialization needs
- `helpers.disposeScope(scopeId)` is the matching explicit teardown hook for renderer-owned scope lifecycles such as table row-scope eviction or unmount cleanup
- renderers that retain child scopes across renders must dispose those scopes explicitly when the owning renderer no longer materializes them
- one-off event payloads that only need expression visibility should prefer `evaluationBindings` overlays over creating disposable runtime-owned child scopes

### Evaluation bindings versus child scopes

The current design baseline treats `evaluationBindings` and child scopes as two different tools with different costs.

- Use `evaluationBindings` when a renderer or owner needs to expose **one dispatch-local semantic snapshot** to an action or expression.
- Use a child scope only when the subtree truly needs a **persistent lexical read/write environment** with lifecycle, reactivity, or ownership semantics.

Practical rule:

- `evaluationBindings` are for temporary query / row / event / summary overlays during one dispatch.
- child scopes are for long-lived subtree execution contexts.

Why this matters:

- dispatch-local data such as CRUD query context, row-operation payloads, or temporary derived summary values should not be upgraded into runtime-owned child scopes by default
- doing so creates extra lifecycle, teardown, and reactivity obligations for data that was only needed for one action dispatch
- it also risks accidentally turning renderer-internal implementation details into apparent scope contract

Related contract rule:

- renderer-owned public bindings should expose stable semantic fields, not implementation jitter such as internal refresh counters or forced-rerender sentinels

### Resolved Boolean Props

Boolean-like authoring fields have two distinct shapes:

- authoring schema may use a boolean literal or a `${expr}` expression string
- renderer-facing resolved props and resolved meta use only `boolean | undefined`

Validation mode rejects literal strings such as `"true"`, `"false"`, and `"!canUndo"` for boolean-like fields. Use `true`, `false`, or `${expr}`.

If a valid `${expr}` expression evaluates to a non-boolean runtime value, the boolean-like field resolves to `undefined`. This is fail-closed: `undefined` means the renderer or frame uses its ordinary absence/default behavior, while host diagnostics may report the contract mismatch. Runtime does not apply JavaScript truthiness to strings, numbers, arrays, or objects.

Runtime renderers must not coerce boolean-like props with JavaScript truthiness. They should pass through the resolved value:

```tsx
<Button disabled={props.props.disabled} />
<Input readOnly={props.props.readOnly} aria-required={props.props.required || undefined} />
```

Do not write:

```tsx
<Button disabled={Boolean(props.props.disabled)} />
```

`Boolean("false")` is `true`, so renderer-side truthiness checks are contract bugs. The compiler/runtime boundary owns expression execution and boolean normalization.

## Declarative Configuration Principle (No Hardcoded Type Dispatch)

The renderer system must be fully extensible without modifying core compiler or runtime code. This means:

**No runtime code may hardcode renderer type names to select behavior.**

Violations of this principle include:

- comparing `templateNode.type` or `schema.type` against a fixed list of string literals in `if`/`switch` chains
- using `renderer.type === 'xxx'` or `schema.type === 'xxx'` in compiler or runtime core to branch into type-specific logic

Instead, all renderer-specific behavior must be declared on `RendererDefinition` so that each renderer self-describes its needs:

| Current hardcoded location                                   | What it controls                                              | Declarative home                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `node-frame-wrapper.tsx` type list                           | Whether `FieldFrame` root uses `<div>` vs default tag         | `RendererDefinition.frameRootTag?: string`                               |
| `shape-validation-deep-fields.ts` type checks                | Deep nested-region traversal rules (columns, items, variants) | `RendererDefinition.deepFields?: readonly RendererDeepFieldDefinition[]` |
| `shape-validation-node-fields.ts` type checks                | Per-item boolean field validation inside deep item containers | `RendererDefinition.deepFields?: readonly RendererDeepFieldDefinition[]` |
| `node-compiler.ts` `schema.type === 'form'`                  | Default child validation contract mode                        | `RendererDefinition.validationDefaults?.defaultChildContractMode`        |
| `node-compiler.ts` `schema.type === 'page'`                  | Descendant validation-model collection without a form owner   | `RendererDefinition.validationDefaults?.collectDescendantValidation`     |
| `node-compiler.ts` `data-source` / `reaction`                | Compile-time attachment of runtime artifacts                  | `RendererDefinition.compilation` metadata                                |
| `shape-validation-node-fields.ts` `data-source` / `reaction` | Renderer-specific node shape validation                       | `RendererDefinition.schemaValidator(...)`                                |
| `tables.ts` `DEEP_FIELD_NORMALIZERS` map                     | Deep field normalization keyed by renderer type               | `RendererDefinition.deepFields[].normalize(...)`                         |

Existing mechanisms that already follow this principle:

- `rendererTraits: readonly string[]` — semantic trait tags like `'trigger'`, `'semantic-owner'`, `'composite'`
- `scopePolicy: ScopePolicy` — per-renderer scope boundary declaration
- `wrap: boolean` — per-renderer FieldFrame opt-in
- `fields: readonly SchemaFieldRule[]` — per-renderer field classification

New renderers must be able to opt into any of the above behaviors by declaring appropriate metadata, without requiring changes to compiler or runtime core code.

This principle is enforced by the `check:audit-hardcoded-type-dispatch` heuristic scanner.

### Declarative Metadata Ownership

The current baseline uses four distinct renderer-owned metadata surfaces for former hardcoded dispatch sites:

1. `frameRootTag`
2. `deepFields`
3. `validationDefaults`
4. `compilation`

They have different responsibilities and must not be collapsed into one generic catch-all field.

#### `frameRootTag`

- Purpose: choose the semantic root tag used by `FieldFrame` when a wrapped renderer cannot safely use the default root element.
- Owner: the renderer definition.
- Current baseline use case: wrapped composite controls such as `array-editor`, `array-field`, `tag-list`, `condition-builder`, `key-value`, and `detail-field` declare `frameRootTag: 'div'`.
- Boundary: this only controls wrapper root semantics. It does not own layout, styling, or validation behavior.

#### `deepFields`

- Purpose: declare renderer props that contain nested schema-bearing structures rather than ordinary scalar/object props.
- Owner: the renderer definition.
- Each entry may declare:
  - the authored prop key
  - how nested region-bearing items are traversed for shape validation
  - which nested item fields are boolean-like and must follow boolean authoring rules
  - how the field is normalized into compiled region keys during schema compilation
- Current baseline use cases:
  - `table.columns`
  - `table.expandable`
  - `crud.columns`
  - `tabs.items`
  - `variant-field.variants`
- Boundary: `deepFields` is for nested schema-bearing authored props, not for ordinary top-level `fields` classification.

Custom field compilation note:

- Some renderer-owned schema-bearing props are not modeled as `deepFields`, but still need compile-time-owned nested schema transport. The live baseline allows `SchemaFieldRule.compile` to precompile renderer-specific nested artifacts such as `CompiledActionProgram` or `TemplateNode` fragments, as long as those values are preserved as atomic compiled leaves instead of being recursively rewritten back into ordinary runtime value trees.
- This is the current closure path for `designer-page.config` nested schema leaves and detail owner value-adaptation action slots.

#### `validationDefaults`

- Purpose: declare renderer-owned default validation behavior that affects validation owner setup or descendant model collection even when the renderer's `validation` contributor does not state every default explicitly.
- Owner: the renderer definition.
- Current baseline use cases:
  - `form` declares `defaultChildContractMode: 'ignore'`
  - `page` declares `collectDescendantValidation: true`
- Boundary: renderer-specific authored-schema shape checks still belong in `schemaValidator`, while per-field rule contribution still belongs in `validation`.

#### `compilation`

- Purpose: declare renderer-owned compile-time artifact requirements that the compiler recognizes and lowers automatically.
- Owner: the renderer definition.
- Current baseline use cases:
  - `data-source` declares that compilation must attach `compiledSources`
  - `reaction` declares that compilation must attach `compiledReactions`
- Boundary:
  - `compilation` is declarative metadata, not a renderer-local callback system.
  - compiler still owns the actual lowering implementations and artifact attachment.
  - renderer-specific schema shape checks belong in `schemaValidator`.
  - generic prop/meta/event/region classification still belongs in `fields` and ordinary compiler logic.

Special-case clarification:

- `data-source` and `reaction` are special because their runtime renderers consume precompiled behavior artifacts from `TemplateNode` rather than only ordinary resolved props.
- This does **not** make them exceptions to the no-hardcoded-type-dispatch rule.
- The allowed model is: compiler automatically recognizes declarative compilation metadata on the renderer definition and lowers the required artifact.
- The disallowed model is: compiler branches on `schema.type === 'data-source' | 'reaction'` to decide that behavior.

### Validation Boundary Split

Renderer-owned validation metadata is intentionally split across three separate surfaces:

- `validation`: contributes field/container semantics and validation rules to the validation model.
- `validationDefaults`: fills in renderer-owned defaults for owner boundary behavior or descendant collection.
- `schemaValidator`: validates authored renderer-specific schema shape.

This split avoids overloading `validation` with compile-time node-shape checks that are not part of the runtime validation model.

## Renderer-Level Static Metadata

`RendererDefinition` is not only the runtime component-registration record.
It is also the normative place for ordinary renderer static metadata.

Typical renderer-level metadata needs include:

- display name, icon, and category for discovery/palette tooling
- static property metadata for inspector/editor tooling
- instance-targeted capability metadata for `component:<method>` authoring and diagnostics
- layout hints or placement metadata for future builder tooling

Important boundary:

- ordinary renderer metadata belongs on `RendererDefinition`
- host/domain manifest envelope belongs on `RendererDefinition.hostContract`
- do not turn ordinary renderers into host-family manifests

Renderer classification rule:

- `instance-renderer`: no new semantic owner boundary, no `hostContract`
- `flux-owner-renderer`: owns Flux-native semantic or interaction state, may publish local summaries and component capabilities, but still no `hostContract`
- `domain-host-renderer`: defines `hostContract`, publishes readonly host projection and namespaced host capabilities for inner schema

This classification is about ownership/publication boundary, not about whether a component looks visually simple or complex.

Important clarification:

- `domain-host-renderer` identifies the owner class, not automatic whole-subtree namespace visibility
- actual host capability visibility still follows manifest publication attribution and explicit render boundaries such as `render({ actionScope })`

Recommended direction:

```ts
interface RendererPropContract {
  shape: FluxValueShape;
  displayName: string;
  description?: string;
  editorType?: string;
  defaultValue?: unknown;
}

interface RendererCapabilityContract {
  handle: string;
  displayName: string;
  description?: string;
  args?: FluxValueShape;
  result?: FluxValueShape;
}
```

The key rule is that renderer-level contracts may reuse `FluxValueShape` as the shared structural contract IR, while still remaining renderer metadata rather than host manifests.

Current implementation baseline:

- `packages/flux-core/src/types/renderer-core.ts` now defines `rendererClass`, `rendererTraits`, `propContracts`, `eventContracts`, `componentCapabilityContracts`, and `scopeExportContracts` directly on `RendererDefinition`
- `packages/flux-core/src/types/renderer-authoring-contract.ts` provides the tooling-facing `ResolvedAuthoringContract` adapter over those fields
- initial pilot metadata started with `button`, `form`, `crud`, and `designer-page`; current live coverage also includes renderers such as `tabs`, `table`, `chart`, and `code-editor`, so the renderer definitions remain the source of truth for exact coverage

Authoring/runtime split reminder:

- `propContracts` and tooling `editableProps` describe authored schema fields
- runtime `RendererComponentProps['props']` remains the resolved render-time value bag
- `shape` / `required` / `defaultValue` belong to authored schema semantics and parse/validate boundaries
- property editing UI itself is better owned by `inspector`/schema for designer-like scenarios; `editorType` should not be treated as the primary architecture path for attribute editing
- `scopeExportContracts` describes narrow readonly Flux-native exports such as `$form` and `$crud`; it is not host projection
- `hostContract` remains host-only and should appear only on `domain-host-renderer`
- `domain-host-renderer` families should not publish parallel `$designer` / `$report` / `$spreadsheet` aliases through `scopeExportContracts` unless the live runtime actually exports those keys and all host families follow the same rule

Representative mapping:

- `button` -> `instance-renderer`
- `form` -> `flux-owner-renderer` + `semantic-owner`
- `table` -> `flux-owner-renderer` + `interaction-owner`
- `crud` -> `flux-owner-renderer` + `composite`
- `designer-page`, `report-designer-page`, `spreadsheet-page`, `word-editor-page` -> `domain-host-renderer` + `workbench-shell`

Important boundary for `domain-host-renderer` + `workbench-shell` families:

- they share the host-manifest / host-projection / namespaced-action / `WorkbenchShell` pattern
- they do **not** imply one universal workbench schema or one shared baseline type for visible UI composition
- each host family owns its own built-in default UI and its own explicit override surfaces
- tooling may later consume those per-family override contracts, but runtime should not assume a cross-family ambient "workbench registry" or one canonical host-page baseline object

Cross-reference:

- `docs/architecture/capability-contract-model.md`
- `docs/architecture/capability-projection-manifest.md`

## Props Versus Hooks

### Pass by props

Use props for data that is renderer-local and explicit:

- `schema`
- `node`
- resolved `props`
- resolved `meta`
- `regions`
- `events`
- stable `helpers`

### Pass by hooks

Use hooks for ambient runtime state and services:

- `useRendererRuntime()`
- `useRenderScope()`
- `useCurrentActionScope()`
- `useCurrentComponentRegistry()`
- `useScopeSelector()`
- `useOwnScopeSelector()`
- `useRendererEnv()`
- `useActionDispatcher()`
- `useCurrentForm()`
- `useCurrentPage()`
- `useCurrentNodeMeta()`
- `useCurrentNodeInstance()`
- `useRenderFragment()`

This split matches actual ownership and change frequency better than either "everything by props" or "everything by hooks".

### `props` versus `meta`

`props` and `meta` are both resolved by runtime, but they serve different purposes.

- `props` contains the node's business-facing runtime values such as `label`, `options`, `placeholder`, `name`, or `items`
- `meta` contains node control state and outer-frame information such as `visible`, `hidden`, `disabled`, `className`, `testid`, or `cid`

For field-like widget renderers, `props.meta.className` must land on the canonical control root that consumers actually target for styling. It must not be silently dropped or left only on an unrelated outer frame when the supported override surface is the widget root itself.

`testid` and `cid` follow a different rule from `className`.

- `testid` is the stable node-level test anchor unless a component contract explicitly defines a more specific control-level anchor
- `cid` is the node-level DOM/debugger bridge token and must remain on the mounted inspectable node root
- for `wrap: true` field renderers, the mounted node root is normally `FieldFrame`, so `props.meta.testid` and `props.meta.cid` belong on `FieldFrame`
- inner controls may define their own dedicated test hooks when needed, but they should not blindly mirror the node-level `testid` or `cid`

Quick rule:

- if the concrete component needs it as a normal input, it is usually in `props`
- if the runtime needs it to control the node or its outer wrapper, it is usually in `meta`

### Per-Slot ClassName Props

Layout container renderers (page, container, form, fieldset, tabs) support per-slot `className` props that route Tailwind classes to inner slot wrappers (`data-slot` elements) instead of the root element.

- `props.meta.className` targets the root element (`.nop-page`, `.nop-container`, `.nop-form`, `.nop-fieldset`, `.nop-tabs`)
- Per-slot props like `bodyClassName`, `headerClassName`, etc. target the corresponding inner `data-slot` wrapper

| Renderer  | Slot Prop                                                                 | Target                                                    |
| --------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| Page      | `bodyClassName`, `headerClassName`, `footerClassName`, `toolbarClassName` | `page-body`, `page-header`, `page-footer`, `page-toolbar` |
| Container | `bodyClassName`, `headerClassName`, `footerClassName`                     | `container-body`, `container-header`, `container-footer`  |
| Form      | `bodyClassName`, `actionsClassName`                                       | `form-body`, `form-actions`                               |
| Fieldset  | `bodyClassName`, `titleClassName`                                         | `fieldset-body`, `fieldset-title`                         |
| Tabs      | `contentClassName`, `toolbarClassName`                                    | `tabs-content`, `tabs-toolbar`                            |

All slot className props are optional. When omitted, no class is emitted. See `docs/architecture/container-spacing-design.md` for the full per-slot className reference.

Current orchestration boundary note:

- `NodeRenderer` remains the orchestration boundary for compiled-node resolution, lifecycle dispatch, import/capability setup, and final renderer invocation.
- `NodeRenderer` should not remain a generic creator for every possible descendant boundary. Data scope and owner runtime creation belong to the concrete creator path such as fragment rendering, page/form owners, and surface hosts.
- Compiler-owned node-local optional boundaries may still be precompiled as node-local closures when the boundary truly belongs to the node itself, such as node-local `classAliases` publication or `xui:imports`-driven capability setup.
- The React runtime should execute those node-local closures directly instead of re-deriving generic provider structure from scattered runtime props.
- Effect helpers such as lifecycle dispatch, render-monitor wiring, and narrow boundary execution can still be extracted when they reduce file-level complexity without moving ownership into renderers that do not actually own that boundary.

## `page` -> `form` -> `input` Walkthrough

The cleanest way to understand props versus context is to follow a typical nested render path.

Example schema shape:

```json
{
  "type": "page",
  "body": [
    {
      "type": "form",
      "body": [
        {
          "type": "input-text",
          "name": "userName",
          "label": "User Name"
        }
      ]
    }
  ]
}
```

### Step 1: page

At the root, `SchemaRenderer` creates:

- renderer runtime
- page runtime
- root render scope
- root action scope
- root component registry

The compiled `page` node is then passed to `NodeRenderer`.

The concrete `page` renderer mainly consumes explicit renderer props:

- `props.regions.body`
- `props.regions.header`
- `props.regions.footer`
- `props.meta.className`
- `props.meta.testid`

This is a good example of a renderer that mostly just consumes resolved inputs and renders regions.

### Step 2: form

When `page` renders its `body` region, `RenderNodes` renders the child `form` node under the inherited page scope.

The concrete `form` renderer still receives explicit renderer props such as:

- `props.regions.body`
- `props.regions.actions`
- `props.events.submitAction`
- `props.node.validation`

But `form` is also an owner renderer. It creates a new `FormRuntime` and publishes:

- `FormContext`
- a new active child `ScopeContext` pointing at `form.scope`

This is the key boundary transition: descendants of the form now read and write through form-owned scope and form runtime, not directly through the page root scope.

### Step 3: input

When the form body region renders an `input-text` node, `NodeRenderer` again resolves the node and calls the input renderer.

The input renderer typically consumes explicit node-local inputs from props:

- `props.props.name`
- `props.props.placeholder`
- `props.props.disabled`
- `props.props.label` or a renderer-owned `regions.label` contract when that renderer models label as value-or-region

But it reads ambient form/runtime services through hooks:

- `useCurrentForm()`
- `useRenderScope()`
- form controller hooks such as `useFormFieldController(...)`

That means:

- field configuration comes from renderer props
- field state, validation state, and write-back behavior come from context-backed hooks

This split is what lets ordinary renderers stay small while still participating in the full low-code runtime.

## Event Passthrough Contract

Renderer event handlers should forward the native UI event when one exists.

Required rule:

- DOM or React event entry points such as `onClick`, `onChange`, `onSubmit`, `onFocus`, and `onBlur` should call `props.events.onXxx?.(event)` rather than dropping the event object

Runtime then normalizes that payload into `ActionContext.event` as a structured `FluxActionEvent` shape.

Current normalized baseline includes:

- `type`
- `nativeEvent?`
- `currentTarget?`
- `target?`
- `preventDefault?()`
- `stopPropagation?()`

This rule exists so imported namespace providers, component-handle actions, and debugger/automation integrations can rely on one action-event contract instead of renderer-by-renderer ad hoc behavior.

Non-DOM semantic payloads are still allowed when a renderer emits higher-level interaction data, but those payloads should still carry a meaningful `type` field.

### Schema-Driven Prevention

In addition to forwarding the native event through `ActionContext.event`, the per-event handler at `NodeRenderer` (built in `packages/flux-react/src/node-renderer-resolved.tsx`) applies **schema-declared** `preventDefault` / `stopPropagation` **synchronously**, before dispatching the action body.

#### Field contract

Two optional fields on `ActionShapeFields` (defined in `packages/flux-core/src/types/actions.ts`):

- `preventDefault?: boolean | string`
- `stopPropagation?: boolean | string`

Each accepts either a boolean literal or an expression string (parallel to the existing `when` field shape). They are compiled onto `CompiledActionNode.preventDefault` / `CompiledActionNode.stopPropagation` as `CompiledRuntimeValue<boolean>` by the action compiler, and type-validated by `validateActionShape` in `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts` (same rule shape as `when`).

#### Sync timing model

When a DOM/React event triggers a compiled action program, the per-event handler runs the following steps **in order**, all synchronously, before `helpers.dispatch(...)` is awaited:

1. Normalize the raw event into a `FluxActionEvent` shape (existing `createNormalizedActionEvent`).
2. For every top-level node in the program, evaluate `preventDefault` against the dispatch scope (using `helpers.evaluateCompiled`):
   - If the runtime value is `undefined` → no-op.
   - If evaluation throws → fallback to `falsy` (do not prevent) and emit a dev console error (`x2-expr-eval-error`).
   - Non-boolean results are coerced truthy/falsy (mirrors `when`).
   - If **any** top-level node yields truthy → call `event.preventDefault()` on the normalized event (or its `nativeEvent`).
3. Repeat step 2 for `stopPropagation`; if truthy → call `event.stopPropagation()`.
4. If the normalized event has no `preventDefault`/`stopPropagation` callable (e.g. lifecycle/non-DOM context), the request is a no-op and a dev console warning is emitted (`x2-no-native-event`).
5. Finally invoke `helpers.dispatch(action, ctx)` as before. The existing imperative `ctx.event?.preventDefault?.()` path inside the action body continues to work for async-side-effect use cases, but it is no longer relied on for blocking the native default — that is now the schema field's responsibility.

The sync ordering is what makes `preventDefault: true` able to actually block form submit, link navigation, and keystroke scrolling. The pre-existing imperative `ctx.event?.preventDefault?.()` path used to race with the native default because `helpers.dispatch` returns a `Promise<ActionResult>`; the schema field removes that race.

#### Orthogonality with `when`

`preventDefault` / `stopPropagation` are **evaluated and applied independently of `when`**. Concretely:

- `when` gates whether the action body **runs**.
- `preventDefault` / `stopPropagation` gate whether the **native default fires**.

`when: false ∧ preventDefault: true` therefore still blocks the native default even though the action body is skipped. Rationale: prevention is an event-level declaration that the author wants to take effect regardless of whether the action body executes. The two fields are evaluated in the same scope but on independent gates; there is no implicit coupling.

#### Failure paths

| Scenario                           | Trigger                                                                     | Behavior                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `x2-no-native-event`               | `preventDefault` declared but runtime ctx has no event (lifecycle/init)     | no-op + dev console warn                                                                                |
| `x2-expr-non-boolean`              | expression evaluates to non-boolean                                         | truthy/falsy coerce (mirrors `when`) + dev console warn                                                 |
| `x2-expr-eval-error`               | expression evaluation throws                                                | catch → fallback falsy (do not prevent) + dev console error                                             |
| `x2-already-prevented-by-renderer` | renderer-internal code already called `event.preventDefault()`              | idempotent; second call is a no-op                                                                      |
| `x2-async-action-chain`            | action has `then` chain; only the first-level node carries `preventDefault` | sync prevention applies to the first-level trigger event only; downstream chain has no timing guarantee |

#### Out of scope

- `stopImmediatePropagation` (same-element listener ordering) — deferred; add only when a concrete use case appears.
- Per-renderer hardcoded `preventDefault()` migrations (e.g. `input-number` ArrowUp/ArrowDown step, `tree` keyboard navigation, `chart` resize) — those are renderer-internal UX decisions, separate from author-facing schema declaration.
- amis `rendererEvent` compatibility shim — explicitly rejected (see `docs/components/existing-components-improvement-analysis.md` §2.8).

## Reaction Handles (`props.reactions`)

`kind: 'reaction'` fields compile to `CompiledReactionPlan` on `TemplateNode.reactionPlans[key]` and are surfaced to renderers as `props.reactions[key]`, a `ReactionHandle`.

```ts
interface ReactionHandle {
  dispatch(ctx?: Partial<ActionContext>): Promise<ActionResult>;
  force(paths?: readonly string[]): void;
  ready(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
  getDebugState(): ReactionHandleDebugState;
}

interface ReactionHandleDebugState {
  phase: 'initial-paused' | 'ready' | 'explicit-paused' | 'disposed';
  fireCount: number;
  pauseCount: number;
  pendingChange: boolean;
  pendingChangedPaths: readonly string[];
  disposed: boolean;
}
```

Method semantics:

- `dispatch(ctx?)` — imperative fire. The handle injects `evaluationBindings`, owns the per-fire `AbortController` chain (a new `dispatch()` aborts an in-flight one), and resolves to `{ ok: false, cancelled: true }` after `dispose()`.
- `force(paths?)` — force a reactive fire as if `dependsOn` roots changed, without requiring a real scope write. Used by renderer-owned refresh paths.
- `ready()` — transition out of `initial-paused`; required for the handle to fire at all. Pending change accumulated before `ready()` is flushed once.
- `pause()` / `resume()` — counter-based nested gating. While paused, `dependsOn` hits accumulate into `pendingChange`; `resume()` flushes once when the counter returns to zero.
- `dispose()` — makes the handle inert; pending `dispatch()` promises resolve to the canonical cancelled result.
- `getDebugState()` — readonly diagnostic snapshot of phase, counters, and pending change.

Lazy activation: `flux-react` constructs one stable `ReactionHandle` proxy per `reactionPlans` entry in `useMemo`, activates it against `runtime.registerRendererReaction(...)` in a `useLayoutEffect` (so child `useEffect`s calling `dispatch()` find a real handle), and disposes on cleanup. The proxy buffers pre-activation calls and drains them on activation, and is StrictMode-safe across the dispose → reactivate sequence.

Source design: `docs/plans/2026-07-07-loadAction-reaction-kind-plan.md`.

## Lifecycle Actions

`BaseSchema` now reserves two lifecycle action fields:

- `onMount?: ActionSchema`
- `onUnmount?: ActionSchema`

Compiler/runtime rule:

- lifecycle actions are compiled onto `TemplateNode.lifecycleActions`
- they do not participate in normal `eventActions` / `eventKeys`
- renderers do not adapt them manually
- `NodeRenderer` owns mount/unmount dispatch centrally

This keeps lifecycle behavior consistent across all renderers and avoids per-renderer hook duplication.

React 19 ROI note:

- This layer should adopt `useEffectEvent` only when a real subscription or long-lived effect needs the latest values without re-subscribing.
- The current orchestration refactor does not treat `useEffectEvent`, `startTransition`, or `useDeferredValue` as mandatory syntax migrations for `NodeRenderer` or `DialogHost`; no high-ROI case was identified in the current live code for these extracted paths.

## Current Hooks

Key hooks in the active React package are:

```ts
function useRendererRuntime(): RendererRuntime;
function useRenderScope(): ScopeRef;
function useRenderInstancePath(): readonly InstanceFrame[] | undefined;
function useCurrentActionScope(): ActionScope | undefined;
function useCurrentComponentRegistry(): ComponentHandleRegistry | undefined;
function useCurrentImportFrame(): ImportFrame | undefined;
function useScopeSelector<T, S = Record<string, unknown>>(
  selector: (scopeData: S) => T,
  equalityFn?: (a: T, b: T) => boolean,
  options?: { enabled?: boolean; fallback?: T; paths?: readonly string[] },
): T;
function useOwnScopeSelector<T, S = Record<string, unknown>>(
  selector: (scopeData: S) => T,
  equalityFn?: (a: T, b: T) => boolean,
): T;
function useRendererEnv(): RendererEnv;
function useActionDispatcher(): RendererRuntime['dispatch'];
function useCurrentForm(): FormRuntime | undefined;
function useCurrentFormErrors(query?: FormErrorQuery): ValidationError[];
function useCurrentFormError(query: FormErrorQuery): ValidationError | undefined;
function useCurrentFormState<T>(
  selector: (state: FormStoreState) => T,
  equalityFn?: (a: T, b: T) => boolean,
  options?: { enabled?: boolean; path?: string; paths?: readonly string[] },
): T;
function useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot;
function useValidationNodeState(path: string): FormFieldStateSnapshot;
function useFieldError(path: string): ValidationError | undefined;
function useOwnedFieldState(path: string): FormFieldStateSnapshot;
function useChildFieldState(path: string): FormFieldStateSnapshot;
function useAggregateError(path: string): ValidationError | undefined;
function useCurrentPage(): PageRuntime | undefined;
function useCurrentSurfaceRuntime(): SurfaceRuntime | undefined;
function useCurrentNodeMeta(): {
  id: string;
  path: SchemaPath;
  type: string;
  cid?: number;
  templateNode: TemplateNode;
  node: NodeInstance;
};
function useCurrentNodeInstance(): NodeInstance | undefined;
function useStructuralLoopContext(): StructuralLoopRenderContext | undefined;
function useRenderFragment(): RendererHelpers['render'];
function useCurrentFormModelGeneration(): number;
function useCurrentValidationScope(): ValidationScopeRuntime | undefined;
function useCurrentValidationValues<T>(
  selector: (values: Record<string, unknown>) => T,
  equalityFn?: (a: T, b: T) => boolean,
  options?: { enabled?: boolean; path?: string; paths?: readonly string[] },
): T;
function useFormLayout(): {
  mode?: 'normal' | 'horizontal' | 'inline';
  labelAlign?: 'top' | 'left' | 'right';
  labelWidth?: string | number;
};
function useStrictMode(): boolean;
function useDataSourceStatus(
  path: string,
  options?: { enabled?: boolean },
): DataSourceStatusSummary | undefined;
```

Current scope-hook semantics are:

- `useCurrentImportFrame()` is part of the current public `@nop-chaos/flux-react` root hook surface. It exposes the nearest active import frame for import-aware renderers and host bridges; lower-level import-frame context objects remain internal/unstable implementation detail.
- `useScopeSelector()` subscribes to the lexical-scope-visible snapshot, so child renderers react when parent scope data changes.
- `useScopeSelector(..., { paths })` is the active path-aware scope subscription option for render-time derived reads; callers that know the dependency paths should provide them instead of subscribing to every lexical scope write.
- `useOwnScopeSelector()` subscribes only to the current scope's own snapshot, for paths that intentionally ignore parent-scope churn.
- `readOwn()` remains a current-layer-only API; selector inheritance should come from hook choice, not hidden fields on own snapshots.

Form-specific hooks such as `useCurrentValidationScope`, `useCurrentValidationValues`, `useCurrentFormErrors`, `useCurrentFormError`, `useCurrentFormState`, `useCurrentFormFieldState`, `useValidationNodeState`, `useFieldError`, `useOwnedFieldState`, `useChildFieldState`, `useAggregateError`, `useDataSourceStatus`, and `useCurrentFormModelGeneration` also exist and are part of the active form integration surface.

Current form-hook implementation note:

- `useCurrentFormErrors`, `useCurrentFormError`, `useCurrentFormFieldState`, and `useFieldError` share internal form-store subscription wiring, while `hook-subscriptions.ts` remains the owner of the low-level subscribe primitives.
- `useCurrentFormState(..., { path })` is the active path-aware subscription surface for single-path value reads; callers that only need one form value should prefer it over whole-store subscriptions.
- `useCurrentFormState(..., { paths })` is the active multi-path subscription surface for derived reads such as dynamic requiredness; callers should subscribe to the exact dependency set they need instead of falling back to whole-form `state.values` reads.
- `useChildFieldState(path)` remains an intentional alias for `useCurrentFormFieldState(path, { path })` in composite-field style UIs; it is still part of the active public hook surface.
- `useCurrentValidationValues(..., { path | paths })` mirrors the path-aware selector contract for non-form validation owners, and is the active subscription surface for owner-local derived validation reads.
- `useFormLayout()` exposes the current field-layout contract consumed by `FieldFrame`, while `useStrictMode()` exposes the runtime strict-mode flag for renderer-side feature gating.

## Regions And Fragment Rendering

Local schema rendering should prefer region handles over raw child schema whenever possible.

Region handle shape:

```ts
interface RenderRegionHandle<R = RendererRenderOutput> {
  key: string;
  templateNode: TemplateNode | TemplateNode[] | null;
  /** Declared slot parameter names for parameterized regions (e.g. ['item', 'index']). */
  params?: readonly string[];
  /**
   * Render the region, optionally injecting slot bindings and instance path.
   * For parameterized regions (params declared), bindings are published under
   * the reserved $slot frame rather than flattened into top-level scope.
   */
  render(options?: {
    scope?: ScopeRef;
    bindings?: Record<string, unknown>;
    instancePath?: readonly InstanceFrame[];
    scopeKey?: string;
    isolate?: boolean;
    pathSuffix?: string;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    ownerNodeInstance?: NodeInstance;
  }): R;
}
```

Host boundary note:

- `@nop-chaos/flux-core` owns the host-neutral callable shape (`RendererComponentProps`, `RendererHelpers`, `RenderRegionHandle`, `RendererDefinition`) and uses a host-owned render-result alias rather than React element types.
- `@nop-chaos/flux-react` owns the React-specialized aliases layered on top of that core contract, including `RenderRegionHandle<ReactElement | null>` and the optional `reactComponent` convenience registration path.
- `reactComponent` normalization only happens on the React-owned entry points that explicitly call `ensureRendererComponent(...)` (`createSchemaRenderer([...])`, `createDefaultRegistry([...])`, or caller code using the helper directly). A prebuilt `RendererRegistry` passed into `SchemaRendererProps.registry` is expected to already satisfy the core `component` contract.

Why this is preferred:

- child schema is compiled once into `TemplateNode` trees
- the handle is already bound to the current runtime model
- scope creation and path tracking stay consistent
- monitor and debug behavior remain centralized

Rules:

- `bindings` is optional convenience input for creating a child scope when the caller wants to inject local values
- `scope` is for callers that already created the right scope explicitly
- renderers should not pass both `scope` and `bindings` unless the child-scope merge rule is well-defined for that region
- repeated renderers should prefer explicit `instancePath` plus stable-key-derived bindings over index-only conventions
- `instancePath` is the full absolute repeated-instance path for the instantiated child subtree, not an owner-relative suffix

Normative rule:

- use `render({ bindings, instancePath })` as the primary API
- use `scope` only when the caller already owns the right child scope
- treat `scopeKey` as an advanced/internal child-scope reuse hint, not the primary repeated-identity contract

`instancePath` and stable bindings are the primary repeated rendering contract. `scopeKey` may still exist for scope/cache reuse, but should not be presented as the author-facing identity model.

### Pattern 1: render declared regions directly

```tsx
function PanelRenderer(props: RendererComponentProps<PanelSchema>) {
  return (
    <section>
      <header>{props.regions.header?.render()}</header>
      <main>{props.regions.body?.render()}</main>
      <footer>{props.regions.actions?.render()}</footer>
    </section>
  );
}
```

### Pattern 2: render with local data override (parameterized region)

```tsx
function ListRenderer(props: RendererComponentProps<ListSchema>) {
  const items = props.props.items as unknown[];

  return (
    <div>
      {items.map((item, index) => (
        <div key={String((item as { id?: string }).id ?? index)}>
          {props.regions.item?.render({
            bindings: { item, index },
            instancePath: [
              {
                repeatedTemplateId: 'list.item',
                instanceKey: String((item as { id?: string }).id ?? index),
              },
            ],
          })}
        </div>
      ))}
    </div>
  );
}
```

When `params` is declared on the region (e.g. `params: ['item', 'index']`), the `bindings` values are published under the reserved `$slot` frame (`$slot.item`, `$slot.index`) rather than flattened into the parent scope. Schema authors access them as `${$slot.item.name}`.

For non-parameterized regions, `render()` passes bindings directly into the child scope.

### Pattern 3: render an ad hoc fragment through helpers

```tsx
function EmptyStateWrapper(props: RendererComponentProps<EmptyWrapperSchema>) {
  const render = useRenderFragment();
  const isEmpty = useScopeSelector((scope) => !scope.items?.length);

  if (isEmpty) {
    return render(props.schema.emptyBody, {
      bindings: { reason: 'empty' },
    });
  }

  return <>{props.regions.body?.render()}</>;
}
```

Precompiled regions remain the preferred path; ad hoc rendering exists as a supplement. When an ad hoc fragment can swap between independently compiled schemas at the same call site, the caller should pass a stable distinguishing `pathSuffix`, and the React render path must key the child node by compiled template identity so stale compiled children are not reused across schema swaps.

## Slot And Field Semantics

When a renderer needs slot-like behavior such as `title`, `empty`, or `onClick`, field interpretation should come from renderer field metadata and compiler normalization, not renderer-local guessing.

Current implications for renderer authors:

- read renderable child fragments from `regions`
- read value-like content from `props`
- read event handlers from `events`
- use helper utilities such as `resolveRendererSlotContent(...)` when a slot can come from either a region or a value prop

The detailed semantics for `value-or-region`, event fields, and nested region extraction live in `docs/architecture/field-metadata-slot-modeling.md`.

## Execution Boundary Ownership Matrix

Not every boundary in the render tree has the same creator. The table below is the normative classification used to decide where each boundary is created and published.

| Boundary                                | Owner                                            | Creation Site                                                                | Notes                                                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `classAliases` publication              | Node-local (compile-time closure)                | `NodeRenderer` executes compiled closure                                     | Compiled into `renderPlan.wrapProviders`                                                                                                                                                          |
| `xui:imports`-driven import boundary    | Import-owned node boundary                       | `NodeRenderer` creates import-owned `ActionScope` and executes import wiring | Introduces import-owned lexical boundary. `xui:imports` always creates a child `ActionScope` for imported namespace providers; `ImportStack` separately owns alias frames and expression bindings |
| Fragment child data scope               | Fragment render path (`RenderNodes`)             | Created inside `RenderNodes` when `options.bindings` is passed               | Not `NodeRenderer`'s responsibility                                                                                                                                                               |
| Page data scope + `PageRuntime`         | Page owner/renderer                              | Created by page renderer/host at mount                                       | Published via `PageContext`                                                                                                                                                                       |
| Form data scope + `FormRuntime`         | Form owner/renderer                              | Created by form renderer at mount                                            | Published via `FormContext`; form scope is the active child scope for form children                                                                                                               |
| Dialog surface scope + `SurfaceRuntime` | Dialog host/renderer                             | Created per opened dialog entry                                              | `SurfaceRuntime`/`SurfaceStore` shared with drawer; `page` store is NOT reused                                                                                                                    |
| Drawer surface scope + `SurfaceRuntime` | Drawer host/renderer                             | Created per opened drawer entry                                              | Same `SurfaceRuntime`/`SurfaceStore` model as dialog, `kind: 'drawer'`                                                                                                                            |
| `ActionScope` (host-level)              | Host owner (e.g. `designer-page`)                | Created at host lifecycle                                                    | Capability lexical scope for namespaced actions; not equivalent to host projection                                                                                                                |
| `ComponentHandleRegistry`               | Form renderer (or other explicit boundary owner) | Created by form renderer at mount                                            | Instance-target lookup boundary for mounted component handles; not equivalent to `ActionScope`                                                                                                    |
| `ImportFrame` / `ImportStack`           | Runtime import boundary                          | Pushed/popped during import-owned node lifecycle                             | Alias visibility and import lifetime only; not a replacement for `ActionScope` or `ScopeRef`                                                                                                      |

Rules derived from this table:

- `classAliases` remains a compiled node-local provider closure executed by `NodeRenderer`.
- `xui:imports` is a separate import-owned boundary rule: `NodeRenderer` creates a child `ActionScope` whenever the node declares imports, but this is not derived from renderer `actionScopePolicy` and not encoded as renderer-owned provider metadata.
- Data scope, page/form runtime, and surface state are **creator-owned boundaries**: each is created and published by the concrete owner, not by a generic `NodeRenderer` provider layer.
- `dialog` and `drawer` share one `SurfaceRuntime`/`SurfaceStore` model. `page` runtime/store is NOT the owner of dialog/drawer state.
- `NodeRenderer` does not create or re-publish page, form, fragment data scope, or surface runtime. It only executes the node-local compiled closure and calls the concrete renderer.
- `Host Projection`, `ActionScope`, `ComponentHandleRegistry`, and `ImportFrame` are separate boundary types. One owner may publish more than one, but runtime/docs must not collapse them into one generic stack concept.

Common reading shortcut:

- `RendererRuntime`, `PageRuntime`, and root `SurfaceRuntime` are host-created runtime boundaries
- `type: 'page'` and `type: 'form'` are schema node types rendered inside that runtime environment
- `FormRuntime` is a renderer-created runtime boundary introduced by the concrete `form` owner

For a newcomer-oriented explanation of how these layers fit together, see `docs/references/runtime-and-renderer-faq.md`.

## Node Context Convergence

React integration should converge on one ambient node carrier context for the currently executing node instance.

That carrier owns:

- the current `NodeInstance`
- access to current node meta helpers such as `useCurrentNodeMeta()`
- fragment-owner fallback and helper creation when a subtree needs owner identity

Rule:

- React host implementations may choose the concrete context type/name
- Flux architecture should describe one node carrier, not parallel competing ambient node-identity stories

## Render Context Split

The React layer should not collapse all runtime and render state into one giant context.

Normative split context areas are:

- runtime context
- scope context
- action-scope context
- component-registry context
- node-instance context (single carrier for current node identity)
- form context
- page context
- surface context
- validation context (carries `ValidationScopeRuntime` for `useCurrentValidationScope`)
- import-frame context (carries `ImportFrame` for import boundary alias visibility)
- class-aliases context (carries merged `ClassAliasesMap` for renderer className resolution)
- structural-loop context (carries `StructuralLoopRenderContext` for loop iteration metadata)
- render-instance-path context (carries `InstanceFrame[]` for nested renderer instance tracking)

Why:

- runtime is mostly stable
- scope and form state change more frequently
- split context boundaries reduce unrelated rerenders
- node identity uses one unified carrier instead of parallel ambient node contexts

## Local Render Options

Fragment rendering accepts explicit local overrides.

Normative contract:

```ts
interface RenderFragmentOptions {
  bindings?: Record<string, unknown>;
  scope?: ScopeRef;
  instancePath?: readonly InstanceFrame[];
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  ownerNodeInstance?: NodeInstance;
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
}
```

The active React layer now carries three separate execution lookups through explicit boundaries:

- `ScopeRef` for data lookup and updates
- `ActionScope` for namespaced action resolution such as `designer:export`
- `ComponentHandleRegistry` for instance-targeted capability invocation such as `component:submit`

And one related import-visibility layer:

- `ImportFrame` / `ImportStack` for lexical imported alias visibility such as `$demo.formatName(...)`

This document only describes how React render boundaries carry those execution contexts. The resolution model, lexical-visibility rules, and `xui:imports` provisioning semantics belong to `docs/architecture/action-scope-and-imports.md`.

Node-local capability boundaries should be created by the owner that actually introduces them.

Normative baseline:

- fragment `render({ bindings })` creates the child data scope in the fragment render path itself
- page and form renderers/owners create and publish their own data/runtime boundaries
- node-local `xui:imports` boundaries create an import-owned child `ActionScope` plus import-frame wiring for that node; this remains distinct from renderer-owned `actionScopePolicy` and does not imply host projection or component-registry boundaries
- component registries should be created only by the concrete owner that needs a new registry boundary, not by every node pre-emptively

Representative uses:

- `designer-page` creates a local action-scope boundary and registers the `designer` namespace provider during owned lifecycle
- `form` creates a local component-registry boundary and registers an explicit form handle exposing `submit`, `validate`, `reset`, and `setValue`
- `DialogHost` owns surface-family rendering and keeps floating dialog/drawer surfaces under one root host while inheriting the app root theme contract

Fragment rendering keeps the same explicitness rule as data scope: callers must pass `actionScope` and `componentRegistry` through `render(options)` when a subtree should inherit or replace those execution boundaries deliberately.

Expected behavior:

- if `scope` is provided, use it directly
- otherwise, if `bindings` is provided, create a child scope
- if `isolate` is true, do not chain to the current parent scope
- `scopeKey` helps keep repeated scopes stable
- `pathSuffix` helps with path clarity and debugability

Authoring guidance:

- fragment / region render paths should default to lexical inheritance
- use `bindings` when a fragment needs a narrow own-scope patch
- use `isolate: true` only when the fragment should become own-scope-only for clear boundary or performance reasons
- do not compensate for `isolate: true` by introducing `$parentScope`; explicitly copy/projection-pass the small parent values the fragment really needs

## Root Entry Contract

Root renderer boundaries stay explicit.

Normative root props are:

```ts
interface SchemaRendererProps {
  schema: SchemaInput;
  schemaUrl: string;
  data?: Record<string, any>;
  env: RendererEnv;
  formulaCompiler: FormulaCompiler;
  registry?: RendererRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  surfaceRuntime?: SurfaceRuntime;
  moduleCache?: ModuleCache;
  parentScope?: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  strictValidation?: boolean;
  onRuntimeChange?: (runtime: RendererRuntime | null) => void;
  onComponentRegistryChange?: (componentRegistry: ComponentHandleRegistry | null) => void;
  onActionScopeChange?: (actionScope: ActionScope | null) => void;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}
```

Root lifecycle callbacks exist for host tooling integrations such as the debugger panel:

- `onComponentRegistryChange` exposes the active root component registry boundary
- `onActionScopeChange` exposes the active root action-scope boundary

These callbacks are for diagnostics/tooling handoff, not normal renderer data flow.

`surfaceRuntime` is a real supported seam:

- when supplied, `SchemaRenderer` uses the caller-owned `SurfaceRuntime` instead of creating a private one
- when omitted, `SchemaRenderer` creates and owns a root `SurfaceRuntime`
- this seam owns the root surface-family boundary used by declarative `dialog` / `drawer` nodes and built-in `openDialog` / `openDrawer` actions, all rendered through the shared surface host stack

Root uses explicit props because:

- ownership stays obvious
- tests stay straightforward
- embedding and plugin scenarios stay easier to reason about

`env` is still conceptually a host-owned long-lived environment object, but current implementation no longer rebuilds runtime/page state just because the outer `env` wrapper identity changes.

- `SchemaRenderer` keeps runtime/page instances stable across non-structural `env` identity churn
- runtime subsystems read the latest `env` through a stable getter instead of closing over the initial object
- `env` changes trigger a lightweight page refresh so env-dependent expressions and props can re-evaluate without dropping form/page state

Hosts should still prefer stable `env` objects when practical, but memoization is now an optimization, not a correctness requirement.

Current root fallback baseline:

- import preparation failure must render an explicit root error fallback instead of returning `null`
- while schema imports are still being prepared, `SchemaRenderer` may render a host-level loading/status fallback
- root render failures inside the compiled schema tree or host-only siblings are isolated by a top-level root error boundary instead of white-screening the entire host tree
- these root fallback surfaces are host-level diagnostics/status UI, distinct from per-node `NodeErrorBoundary` fallbacks

## Surface Ownership In React Runtime

Dialog and drawer should be treated as one surface family in the React runtime.

Normative baseline:

- `page`, `form`, and `surface` are different owner families and should not all share one owner runtime/store
- `dialog` and `drawer` should share one `SurfaceRuntime` / `SurfaceStore` model and differ by stable kind metadata such as `kind: 'dialog' | 'drawer'`
- each managed surface entry also owns its own `ValidationScopeRuntime`, published around the surface body by `DialogHost`
- surfaces are rendered by one root surface host stack rather than by recursively nesting independent hosts inside already-open surfaces
- a newly opened surface is appended after existing surfaces in the same host container so DOM/render order determines which surface appears in front
- this ordering rule should be preferred over per-open `z-index` escalation for same-family surfaces inside the same host container
- only the current top surface should own focus trap, escape handling, backdrop dismiss, and active-surface semantics
- closing the top surface should restore active ownership and focus to the previous surface in the stack

## Form And Table Expectations

### Form renderer

A form renderer is expected to:

1. create a `FormRuntime`
2. use the form scope as the active child scope
3. expose form context to descendants
4. render `body` and `actions` through regions

Child controls should use `useCurrentForm()` and the form-specific hooks instead of receiving repeated form props by hand.

### Table renderer

A table renderer is expected to:

- create a row scope from `{ record, index }`
- pass row-local scope into cell or button fragments
- keep row rendering aligned with the same fragment and action infrastructure used elsewhere
- dispose renderer-owned row scopes explicitly when a row leaves the materialized set or the owning table instance unmounts

The current performance baseline further narrows that expectation:

- row scopes should be isolated by default
- non-isolated row scopes are an explicit opt-out for real parent-binding needs

Table- and CRUD-like renderers are also the representative example for instance-targeted capability metadata.

Examples of instance-targeted capabilities:

- `component:refresh`
- `component:getSelection`
- `component:setSelection`

Those capabilities should be described as renderer/component metadata and resolved through `ComponentHandleRegistry`, not modeled as host-family manifest methods.

### Chart renderer

Chart now participates in the component-handle registry as a DOM-owning renderer.

Current handle baseline:

- chart registers a `ComponentHandle` with an optional `ref`
- the registered `ref` points at the mounted chart container element when materialized
- the handle currently exposes the narrow chart instance capability `resize`

This is the preferred bridge for imported libraries or host tooling that need one concrete chart instance or DOM anchor without turning renderer internals into ambient global state.

## Performance Rules

### Do not reinterpret compiled nodes every render

At compile time:

- detect regions
- precompile expressions and templates
- classify static versus dynamic work
- attach renderer definition and validation metadata once

At runtime:

- reuse compiled nodes
- resolve only what is dynamic
- preserve references where results are unchanged

### Keep helpers stable

`helpers` should be stable objects, not recreated with unnecessary inline identity churn.

### Reuse region handles

Region handle objects should be reusable and renderer-friendly.

### Create child scopes only when needed

List, table, and tree renderers should avoid eager child-scope creation for work that is not actually rendered.

## Contract Honesty Production Isolation Notes (2026-06-27)

- **Per-renderer source isolation (H7/G15)**: every production contract-honesty harness resolves each renderer definition's `componentSource` to that renderer's OWN implementation tree (via `buildPerRendererSourceResolver` in `@nop-chaos/flux-core`): the definition's `component:` ref is traced through imports to its file, then a bounded transitive closure (static + dynamic imports, excluding sibling renderer definition files and barrel `index` modules) forms the haystack. A sibling renderer's event/handle usage can no longer mask a missing implementation. Capability handles delegated to runtime factories (`input-component-handle`, `form-component-handle`, `composite-field-handle`, `surface-component-handle`) are mixed in only for renderers that actually reference the factory's hook.
- **Capability anchor tightening (H16)**: `isCapabilityHandleReferenced` counts an array element only in a `methods`/`listMethods` property array or a `return [...]` method list — incidental UI arrays (e.g. `labels: ['save', 'cancel']`) no longer satisfy a common-word handle.

## Related Documents

- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/form-validation.md`
- `docs/references/renderer-interfaces.md`
