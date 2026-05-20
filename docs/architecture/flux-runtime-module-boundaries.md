# Flux Runtime Module Boundaries

## Purpose

This note records current module ownership at the `flux-runtime` boundary.

Use it when deciding where new runtime behavior belongs.

This document is about code placement and ownership.

For validation behavior and form semantics, use `docs/architecture/form-validation.md` as the primary document.

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-runtime/src/index.ts` for package export surface only
- `packages/flux-runtime/src/runtime-factory.ts` for runtime assembly boundaries
- `packages/flux-action-core/src/index.ts` and `packages/flux-action-core/src/action-dispatcher.ts` for action execution ownership
- `packages/flux-compiler/src/index.ts` and `packages/flux-compiler/src/schema-compiler.ts` for compiler ownership
- `packages/flux-runtime/src/validation/` for reusable validation helpers
- `packages/flux-runtime/src/form-runtime.ts` and related `form-runtime-*` files for form flow ownership
- `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/async-data/request-runtime.ts`, and `packages/flux-runtime/src/scope.ts` for runtime subsystem placement
- `packages/flux-runtime/src/imports.ts`, `packages/flux-runtime/src/action-scope.ts`, and `packages/flux-runtime/src/component-handle-registry.ts` for action/capability/import/runtime-host boundaries

## Main Rule

`packages/flux-runtime/src/runtime-factory.ts` is the main assembly layer, while `packages/flux-runtime/src/index.ts` stays a thin package entry.

It should stay limited to:

- wiring runtime dependencies together
- creating top-level runtime factories
- exporting stable package entry points

If new logic is not trivial assembly code, it should move to a focused runtime module.

## Architecture Guardrails (Bug-Derived)

This document remains a placement guide, but the following boundaries are mandatory:

- Mutating async runtime methods must define explicit concurrency behavior (reject, dedupe, or queue) and return consistent cancellation semantics for intentionally skipped operations.
- Runtime-facing reactive contracts must be subscription-first. Non-reactive reads are allowed for command/event paths, but not as reactive render dependencies.
- Runtime state transitions should avoid silent race patterns where one in-flight call can clear state for another in-flight call.

Use `docs/references/architecture-guardrails-from-bugs.md` for detailed bug-to-guardrail mapping and verification patterns.

## Current Runtime Ownership

### Entry and assembly

- `packages/flux-runtime/src/index.ts`
  - package export surface
- `packages/flux-runtime/src/runtime-factory.ts`
  - runtime assembly
  - top-level factory composition
  - owned runtime factory wiring
- `packages/flux-runtime/src/runtime-eval-helpers.ts`
  - scope evaluation helpers extracted from the entry file
  - expression evaluation utilities used during runtime assembly
- `packages/flux-runtime/src/runtime-action-helpers.ts`
  - action-related helpers extracted from the entry file
  - action dispatch wiring utilities

### Compiler boundary

- `packages/flux-compiler/src/schema-compiler.ts`
  - schema-shape normalization
  - region extraction
  - renderer field classification
  - deep table column normalization
  - compiled form-validation model assembly
- `packages/flux-compiler/src/schema-compiler/index.ts`
  - compiler submodule composition
- `packages/flux-compiler/src/schema-compiler/fields.ts`
  - renderer field classification helpers and meta-program compilation
- `packages/flux-compiler/src/schema-compiler/regions.ts`
  - region extraction and nested child normalization helpers
- `packages/flux-compiler/src/schema-compiler/tables.ts`
  - table-specific deep normalization helpers
- `packages/flux-compiler/src/schema-compiler/validation-collection.ts`
  - compiled validation model collection during compilation
- `packages/flux-compiler/src/schema-compiler/diagnostics.ts`
  - compiler diagnostic collection helpers
- `packages/flux-compiler/src/schema-compiler/shape-validation.ts`
  - schema-shape validation helpers used during compilation
- `packages/flux-compiler/src/schema-compiler/host-action-validation.ts`
  - host action validation and capability checks during compile
- `packages/flux-compiler/src/schema-compiler/target-enrichment.ts`
  - target enrichment helpers for compiled nodes
- `packages/flux-compiler/src/schema-compiler/symbol-helpers.ts`
  - symbol table collection helpers for schema imports (xui:imports)
- `packages/flux-compiler/src/schema-compiler/static-analysis.ts`
  - static analysis for compiled nodes (dependency collection, purity checks)
- `packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts`
  - utility functions for schema shape validation
- `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`
  - schema shape validation rule implementations
- `packages/flux-compiler/src/schema-compiler/authoring-transform.ts`
  - authoring-time schema transformations (canonicalization, sugar lowering)
- `packages/flux-compiler/src/action-compiler.ts`
  - compiled action program assembly for static/ad-hoc precompile paths
  - `extractLegacyPayload` has been deleted; legacy payload extraction is no longer needed
- `packages/flux-compiler/src/compile-symbol-table.ts`
  - compile-time `$` symbol visibility substrate

Keep compiler-specific shape handling in `flux-compiler`.

Do not move generic validation helpers back into compiler modules when they can live in `packages/flux-runtime/src/validation/` or `@nop-chaos/flux-core`.

### Validation runtime flow

- `packages/flux-runtime/src/validation-runtime.ts`
  - sync validator execution entry point
- `packages/flux-runtime/src/form-runtime-validation.ts`
  - field validation orchestration
  - subtree validation entry points
  - async debounce and stale-run cancellation
- `packages/flux-runtime/src/form-runtime-owner.ts`
  - owner-local validation orchestration shared by `FormRuntime`
  - full-traversal / subtree validation coordination
  - dependent revalidation, external-error publication, owner summary computation
  - `applyChangesAndRevalidate(...)` sequencing, including the transitional lifecycle rule that owner-local writes can commit before validation resumes against the next active model generation
- `packages/flux-runtime/src/form-runtime-owner-field-states.ts`
  - shared field-state merge helpers used by owner-local external-error rebuild paths
- `packages/flux-runtime/src/form-runtime.ts`
  - `FormRuntime` assembly and form-specific specialization
  - submit orchestration, touched/visited/dirty policy, ordinary value writes, array mutation dispatch
- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
  - form submit flow orchestration (async submit sequence, commit/before-submit hooks)
- `packages/flux-runtime/src/form-runtime-submit.ts`
  - submit entry point and submit state management
- `packages/flux-runtime/src/form-runtime-field-ops.ts`
  - field registration and update operations
- `packages/flux-runtime/src/form-runtime-values.ts`
  - form value write helpers and batch update operations
- `packages/flux-runtime/src/form-runtime-lifecycle.ts`
  - form lifecycle helpers (mount/unmount/dispose coordination)
- `packages/flux-runtime/src/form-runtime-status.ts`
  - form status publication and summary helpers
- `packages/flux-runtime/src/form-runtime-array-ops.ts`
  - array field mutation operations (add/remove/move)
- `packages/flux-runtime/src/form-runtime-types.ts`
  - form-runtime-internal type definitions
- `packages/flux-runtime/src/form-runtime-derived-state.ts`
  - derived field state computation (dirty/visited/touched tracking from registered field values)
- `packages/flux-runtime/src/form-runtime-owner-external-errors.ts`
  - external error injection and reconciliation
- `packages/flux-runtime/src/form-runtime-owner-lifecycle.ts`
  - form runtime lifecycle state machine (active/refreshing/disposed), dispose and refresh logic
- `packages/flux-runtime/src/runtime-host-projection-scope.ts`
  - host projection scope store for projected scope views
- `packages/flux-runtime/src/runtime-owned-factories.ts`
  - factory functions for creating validation scope runtimes and other runtime-owned resources
- `packages/flux-runtime/src/form-path-state.ts`
  - per-path field state management utilities
- `packages/flux-runtime/src/error-utils.ts`
  - error classification utilities (isAbortError, etc.)

These files own runtime sequencing and form lifecycle behavior.

They should not become generic helper dumps.

### Validation modules

- `packages/flux-runtime/src/validation/rules.ts`
  - schema rule extraction
  - trigger normalization
  - compiled dependency path helpers
- `packages/flux-runtime/src/validation/message.ts`
  - default validation message construction
  - reads the global `MessageFormatter` from `@nop-chaos/flux-core/i18n-sink` (the only stateful read in validation)
- `packages/flux-runtime/src/validation/errors.ts`
  - validation error shaping and normalization helpers
- `packages/flux-runtime/src/validation/validators.ts`
  - built-in sync validator implementations
- `packages/flux-runtime/src/validation/registry.ts`
  - validator registration and lookup
- `packages/flux-runtime/src/validation/index.ts`
  - barrel for validation internals

This directory is the default home for reusable validation helpers.

### Action and request flow

Note:

- Action execution framework has been extracted to `@nop-chaos/flux-action-core`.
- Action precompile ownership (`compileAction(...)` / `compileActions(...)`) lives in `@nop-chaos/flux-compiler`.
- `flux-runtime` owns the `ActionRuntimeAdapter` implementation and runtime-host infrastructure.

### Action execution boundary (`@nop-chaos/flux-action-core`)

- `packages/flux-action-core/src/action-dispatcher.ts`
  - top-level action dispatch orchestration
  - dispatch ordering across built-in / component / namespaced paths
  - selector classification + args evaluation before runtime invocation
  - debounce, retry, and timeout composition entry
  - consumes `ActionRuntimeAdapter` as the single runtime invocation outlet for built-in / component / namespaced actions
- `packages/flux-action-core/src/action-core.ts`
  - action-evaluation helpers
  - compiled-value evaluation in action context
  - action monitor payload/result shaping
  - result classification and branch bindings
- `packages/flux-action-core/src/operation-control.ts`
  - timeout / retry / abort helpers (generic async execution control)
  - shared by action and request execution paths
- `packages/flux-core/src/utils/debounce.ts`
  - debounce utilities for action execution
  - re-exported by `flux-action-core` (`cancelPendingDebounce`, `scheduleDebounce`)

### Action adapter and runtime-specific execution (`flux-runtime`)

- `packages/flux-runtime/src/action-adapter.ts`
  - implements `ActionRuntimeAdapter` interface from `flux-core`
  - provides the unified runtime invocation boundary for built-in, component-targeted, and namespaced actions
  - keeps built-in payload args-centric at the adapter surface; narrower DTO normalization stays inside runtime implementation details
  - delegates to form/page/surface runtimes via `ActionContext`
- `packages/flux-runtime/src/runtime-action-helpers.ts`
  - runtime-owned async validation helpers and ajax-side request glue
  - delegates generic request-control resolution to `@nop-chaos/flux-action-core`

### Request and async-data boundary (`flux-runtime`)

- `packages/flux-runtime/src/async-data/request-runtime.ts`
  - request execution (`executeApiSchema`)
  - adaptor application
  - request cancellation plumbing
  - shared request substrate behind ajax actions, form submit actions, async validation actions, and data-source producer requests
- `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts`
  - request/response adaptor shaping shared by request execution paths
- `packages/flux-runtime/src/async-data/api-cache.ts`
  - cache store for request results
- `packages/flux-runtime/src/async-data/async-governance.ts`
  - runtime-local async run governance shared by data-source, reaction, and async validation paths
  - internal substrate only; not evidence of a separate request/data package owner
- `packages/flux-runtime/src/async-data/source-executor.ts`
  - anonymous source execution body orchestration
  - shared runtime substrate for source-enabled props; React host helpers should call into this path rather than own a separate source semantic model
  - evaluates formula sources directly and routes action-backed source bodies through action dispatch
- `packages/flux-runtime/src/async-data/data-source-state.ts`
  - data source state types and utilities
- `packages/flux-runtime/src/async-data/data-source-runtime-utils.ts`
  - shared utilities for data source runtime implementations
- `packages/flux-runtime/src/async-data/reaction-runtime-helpers.ts`
  - reaction runtime helper functions (limit reporting, watch evaluation, ID generation)
- `packages/flux-runtime/src/async-data/formula-data-source-controller.ts`
  - formula-based data source controller
- `packages/flux-runtime/src/async-data/api-data-source-controller.ts`
  - thin API data-source controller coordinator (`start` / `stop` / `refresh` / `reset` shell)
- `packages/flux-runtime/src/async-data/api-data-source-controller-types.ts`
  - API data-source controller input contract and mutable controller-state shape
- `packages/flux-runtime/src/async-data/api-data-source-controller-state.ts`
  - controller-local state creation, state publication, async-governance settle helpers, and stop-condition evaluation
- `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts`
  - request execution, cache/publish flow, request dedup, stale-settle handling, and refresh orchestration
- `packages/flux-runtime/src/async-data/api-data-source-controller-helpers.ts`
  - helper functions for API data source controller (abort helpers, state transforms, request-state shaping)

### Source and reaction runtime (`flux-runtime`)

- `packages/flux-runtime/src/async-data/data-source-runtime.ts`
  - barrel for formula-backed and action-backed data-source controllers plus anonymous source execution
  - does not own a second action executor
- `packages/flux-runtime/src/async-data/source-registry.ts`
  - scope-scoped source registration and replacement
  - source invalidation/refresh routing
  - source debug snapshot ownership
  - migrated from `let disposed = false` to `AbortController` for async cancellation
- action-backed remote data-source controllers own refresh/poll/status/publication lifecycle; their remote producer requests should target the ajax action / `ActionRuntimeAdapter` path while preserving owner-local orchestration
- source-enabled prop helpers in `flux-react` are host wiring over these runtime-owned source modules, not an ownership boundary of their own
- `packages/flux-runtime/src/async-data/reaction-runtime.ts`
  - scope-scoped reaction registration and replacement
  - reaction scheduling / loop guard behavior
  - reaction debug snapshot ownership
  - uses `helpers.dispatch` port to consume action-core dispatcher
  - migrated from `let disposed = false` to `AbortController` for async cancellation
- `runtime-factory.ts` still uses the boolean `disposed` pattern for synchronous dispose gating (by design)
- `packages/flux-runtime/src/surface-runtime.ts`
  - shared dialog/drawer surface ownership
  - stack-based open/close behavior and disposal hooks
- `packages/flux-runtime/src/status-owner.ts`
  - readonly status-summary publication helpers such as `statusPath` projection and owner-status binding helpers
  - cleanup-safe `statusPath` publication semantics, including the supported `publishOwnerStatus(scope, statusPath, undefined)` unmount cleanup path
- focused helpers such as `packages/flux-runtime/src/scope-change.ts` and `packages/flux-runtime/src/runtime-plugins.ts`
  - changed-path dependency matching
  - plugin ordering and similar hot-path coordination helpers

### Action/capability/import host boundaries

- `packages/flux-runtime/src/action-scope.ts`
  - lexical namespaced-action lookup
  - scope-local namespace registration and debug snapshot ownership
- `packages/flux-runtime/src/component-handle-registry.ts`
  - lexical component-handle registration and lookup by `cid`, `componentId`, or `componentName`
  - debugger-facing handle debug-data ownership
- `packages/flux-runtime/src/imports.ts`
  - import-module load dedupe
  - action-scope-local imported namespace registration lifecycle
  - expression-helper publication for imported aliases
- `packages/flux-runtime/src/import-stack.ts`
  - ImportFrame/ImportStack frame lifecycle management
  - alias visibility and import-frame push/pop
  - expression-binding resolution for imported aliases

These modules are runtime-host infrastructure.

They should not be folded into `ScopeRef`, pure domain cores, or generic renderer components.

Important boundary note:

- `flux-action-core` still knows how to classify selectors (`built-in` vs `component:<method>` vs `namespace:method`) and evaluate compiled payloads.
- But it no longer reaches directly into component or namespace providers as an execution boundary concern; all three action families now enter runtime through `ActionRuntimeAdapter`.
- `ActionScope` and `ComponentHandleRegistry` remain runtime-owned capability registries, not parallel action executors and not action-core-owned infrastructure.

### Scope and state plumbing

- `packages/flux-runtime/src/scope.ts`
  - scope store creation
  - lexical lookup behavior
  - scope materialization and update behavior
- `packages/flux-runtime/src/form-store.ts`
  - form store state updates
  - page store state updates
  - surface store state updates
- `packages/flux-runtime/src/form-runtime-state.ts`
  - initial form field-state derivation
- `packages/flux-runtime/src/form-runtime-array.ts`
  - runtime-specific array field-state remapping
- `packages/flux-runtime/src/form-runtime-registration.ts`
  - runtime field registration lookup and synchronization
- `packages/flux-runtime/src/form-runtime-subtree.ts`
  - subtree target collection helpers

`ScopeRef` remains the data lookup/update contract only.

Do not turn it into a mixed behavior registry for:

- namespaced actions
- component handles
- source/reaction runtime entries
- import loaders or debugger state

### Page and node runtime helpers

- `packages/flux-runtime/src/page-runtime.ts`
  - page runtime creation
  - page-shell state such as refresh tick and root scope ownership
- `packages/flux-runtime/src/node-runtime.ts`
  - resolved node meta and prop evaluation helpers
- `packages/flux-runtime/src/node-resolver.ts`
  - runtime target resolution across nearest-owner semantics, component targets, and compatibility carriers

## Where To Add A New Validation Rule

For a new built-in sync rule:

1. Add schema extraction in `packages/flux-runtime/src/validation/rules.ts` if the rule has schema syntax.
2. Add the validator implementation in `packages/flux-runtime/src/validation/validators.ts`.
3. Add default messaging in `packages/flux-runtime/src/validation/message.ts` if needed.
4. Add focused coverage in `packages/flux-runtime/src/validation/validators.test.ts` or `packages/flux-runtime/src/validation/registry.test.ts`.
5. Add or update integration coverage in active runtime test files such as `packages/flux-runtime/src/index.test.ts`, `packages/flux-runtime/src/form-runtime-validation.test.ts`, or other colocated runtime contract tests when behavior changes.

For async rules:

- keep the generic rule shape in compiled validation metadata
- keep debounce and stale-run behavior in `packages/flux-runtime/src/form-runtime-validation.ts`
- do not force async request flow into the sync validator registry

## `flux-compiler` Versus `validation/`

Keep code in `packages/flux-compiler/src/schema-compiler.ts` when it is primarily about schema shape:

- region extraction
- node tree traversal
- deep nested structure normalization
- ownership of compiled node paths
- renderer-driven field splitting into meta, props, regions, and events

Keep code in `packages/flux-runtime/src/validation/` when it is primarily about validation semantics:

- collecting rules from schema fields
- normalizing validation triggers and visibility triggers
- building messages
- shaping validation errors
- implementing reusable rule checks
- managing validator lookup

If a helper can be reused without knowledge of compiled regions or deep schema transformation, it usually belongs in `packages/flux-runtime/src/validation/`.

## Renderer Shared Primitives

Shared field chrome lives in `packages/flux-renderers-form/src/renderers/shared/`.

`resolveGap` is part of the shared renderer/runtime surface through `@nop-chaos/flux-react`; `flux-renderers-basic` no longer keeps a local duplicate copy.

`crud-renderer.tsx` now imports `createReadonlyScopeBinding` from `@nop-chaos/flux-react/unstable`; the implementation owner remains `@nop-chaos/flux-runtime` and is also still exported from `@nop-chaos/flux-runtime` root.

`schema-compiler-registry.test.ts` no longer imports `@nop-chaos/flux-renderers-data`.

Use that area for small repeated presentation primitives such as:

- field labels
- field hints
- help text
- validation message chrome

Do not add a shared primitive just because two controls look similar once.

Add one when:

- markup is repeated across multiple controls
- accessibility semantics stay consistent after extraction
- the primitive removes renderer noise without hiding field-specific behavior

## Maintenance Rule

No runtime entry file should become the default home for new behavior.

When in doubt, prefer one more focused module over growing a general-purpose file.

Corollary:

- if a concern has become its own stable runtime boundary (`action-scope`, component handles, imported namespace lifecycle, operation control, status publication), keep it in its focused module instead of re-inlining it into `index.ts` or `action-runtime.ts`

Current rule for plugin ordering:

- sort renderer plugins once at runtime creation
- lower `priority` runs first
- equal priorities preserve original declaration order

## Compatibility Layer Cleanup

The `selection`/`target` compatibility aliases for `selectionTarget` have been removed from the report-designer manifest (`report-designer-manifest.ts`); only `selectionTarget` remains in scope data.

## Package Entry Boundaries

`@nop-chaos/flux-react` root exports are now limited to the stable renderer/runtime surface. Internal orchestration helpers and raw contexts that are still needed by renderer packages live behind `@nop-chaos/flux-react/unstable`.

`@nop-chaos/flux` is now the supported host-facing facade package.

Its boundary is intentionally narrower than the internal package graph:

- hosts should create the default renderer stack through `createFluxRendererRegistry()` or `createFluxSchemaRenderer()` from `@nop-chaos/flux`
- hosts should import Flux package CSS through `@nop-chaos/flux/style.css`
- hosts should not import `@nop-chaos/flux-core`, `@nop-chaos/flux-runtime`, `@nop-chaos/flux-react`, or `@nop-chaos/flux-renderers-*` directly for ordinary page rendering
- `@nop-chaos/flux` may compose those internal packages at build time, but the packed manifest must not expose them as host-install requirements

The facade package currently owns the release-shaped host contract only:

- stable renderer creation entry points
- stable host env/schema/registry-facing types owned by the facade package
- CSS isolation boundary under `.nop-flux-root`

It does not change code ownership of runtime/compiler/react modules. Internal runtime semantics still belong to their existing packages.

Current unstable-only examples:

- `RenderNodes`
- raw context exports such as `FormContext` / `ScopeContext` / `RuntimeContext`
- internal helper surfaces such as `createHelpers`, `mergeActionContext`, `publishOwnerStatus`, and `createProjectedScopeStore`

`createReadonlyScopeBinding` remains runtime-owned (`packages/flux-runtime/src/status-owner.ts`) and is currently reachable both from `@nop-chaos/flux-runtime` root and the convenience re-export at `@nop-chaos/flux-react/unstable`; treat the unstable path as a renderer-facing convenience surface rather than proof that ownership moved into `flux-react`.

The same rule now applies to `@nop-chaos/flow-designer-renderers`: the root entry keeps the stable schema/manifest registration surface, while Xyflow bridge primitives, palette/canvas internals, and designer context helpers move behind `@nop-chaos/flow-designer-renderers/unstable`.

## Namespaced Host Provider Result Contract

Workbench host families that publish namespaced providers through `ActionScope` should converge on one result baseline:

- provider adapters own host-command normalization at the package boundary instead of forwarding `Record<string, unknown> + as any` glue into domain cores
- host command failures surface through top-level `ActionResult.error`
- any payload returned by the domain core remains available in `ActionResult.data`

`spreadsheet-renderers` and `report-designer-renderers` now follow this baseline through package-local host action providers, matching the established flow/word host family pattern.

## Related Documents

- `docs/references/terminology.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
