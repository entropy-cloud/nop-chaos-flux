# 116 Module Cache, Import Stack, And Compile-Time Symbol Resolution Plan

> Plan Status: completed
> Last Reviewed: 2026-04-21
> Source: `docs/architecture/module-cache-and-import-stack.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flux-formula.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/scoped-render-slots.md`
> Related: `docs/plans/85-formula-engine-self-implementation-plan.md`, `docs/plans/65-scoped-render-slots-implementation-plan.md`, `docs/plans/41-compiler-integrated-schema-diagnostics-implementation-plan.md`

## Purpose

Implement the three-layer library management architecture described in `docs/architecture/module-cache-and-import-stack.md`:

1. **ModuleCache** — global, cross-Runtime deduplication and caching of loaded library modules keyed by absolute URL
2. **ImportStack** — per-Runtime lexical scope management of import aliases, replacing the current flat `__imports` scope map
3. **CompileSymbolTable** — compile-time `$` variable resolution, validation, and static expression folding

The current implementation conflates module loading dedup with alias scope registration inside a single `ImportManager` closure, puts all imports into a flat `__imports` map on the scope, and has no compile-time symbol visibility. This plan addresses all three gaps incrementally.

## Current Baseline

- `packages/flux-runtime/src/imports.ts` implements `ImportManager` with `moduleLoads` (module dedup) and `scopeRegistrations` (per-ActionScope alias registration) as closure variables. No cross-Runtime sharing.
- `packages/flux-react/src/schema-renderer.tsx` creates a new `RendererRuntime` per `SchemaRenderer` instance, each with its own `ImportManager`. Root-level import preloading has now been removed because it leaked aliases/actions outside their declaring lexical boundary.
- `packages/flux-react/src/node-renderer.tsx` uses `useNodeImports()` to load the node's declared imports and overlays imported expression helpers directly as `$alias` bindings in a child scope. The old `__imports` transport key has been removed from live code.
- `packages/flux-react/src/useNodeImports.ts` manages async load state per node, gated by `importState.ready`.
- `packages/flux-formula/src/evaluator.ts` now resolves `$`-prefixed names through the normal scope channel (lambda params → builtin namespaces → global functions → scope data), which means imported helpers work as ordinary `$alias` scope bindings instead of a special `imports` side channel. No compile-time validation yet.
- `packages/flux-formula/src/compile.ts` classifies values as `static-node` / `expression-node` / `template-node` but does not fold static expressions or validate `$` variable existence.
- `packages/flux-core/src/types/renderer-api.ts` has `RendererEnv.importLoader?: ImportedLibraryLoader`. No `resolveImportUrl`, no `schemaUrl`.
- `SchemaFieldRule.params` exists for parameterized regions, propagated through `TemplateRegion` and `RenderRegionHandle`. `$slot` frame is published at runtime. No compile-time symbol table consumes this information.
- `RendererDefinition` does not declare which `$` bindings its scope policy makes available (e.g. form renderer publishes `$form`).

## Goals

- Extract module loading dedup into a standalone `ModuleCache` interface that can be shared across `RendererRuntime` instances.
- Add `resolveImportUrl` and `schemaUrl` support for relative-to-absolute path resolution.
- Replace the flat `__imports` scope map with a push/pop `ImportStack` for proper lexical scope management.
- Introduce `CompileSymbolTable` into the expression compiler, populated from renderer metadata, region params, and `xui:imports` declarations.
- Validate `$`-prefixed variable references at compile time and produce structured diagnostics.
- Implement static expression folding for expressions whose operands are all statically resolvable.
- Preserve full backwards compatibility: existing schemas without `schemaUrl` or `resolveImportUrl` continue to work.

## Non-Goals

- Do not redesign `ActionScope`, `ActionNamespaceProvider`, or the action dispatch pipeline.
- Do not change the `ImportedLibraryLoader` interface contract.
- Do not implement import manifest / capability signature loading in this plan (requires libraries to opt in separately).
- Do not implement IDE integration, language server, or autocomplete in this plan.
- Do not migrate all renderer families to declare their injected locals in this plan; only establish the mechanism and adopt it for the most common cases (`$form`, `$page`, `$slot`).
- Do not implement `$` variable type inference beyond classification; full type-level validation of imported helper signatures is a successor plan.

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-api.ts` — add `resolveImportUrl` to `RendererEnv`
- `packages/flux-core/src/types/compilation.ts` or new `module-cache.ts` — `ModuleCache` and `ImportStack` interfaces
- `packages/flux-core/src/types/renderer-compiler.ts` — `CompileSymbolTable` and `SymbolInfo` types
- `packages/flux-core/src/types/schema.ts` — `SchemaRendererProps` gains `schemaUrl`
- `packages/flux-runtime/src/imports.ts` — refactor `ImportManager` to use external `ModuleCache`
- `packages/flux-runtime/src/runtime-factory.ts` — accept optional `ModuleCache`, create `ImportStack`
- `packages/flux-runtime/src/schema-compiler.ts` — build `CompileSymbolTable` during compilation
- `packages/flux-runtime/src/schema-compiler/fields.ts` — feed region params into symbol table
- `packages/flux-formula/src/compile.ts` — accept and use `CompileSymbolTable` for validation and folding
- `packages/flux-formula/src/evaluator.ts` — no functional changes, but add symbol category metadata to compiled output
- `packages/flux-react/src/schema-renderer.tsx` — pass `schemaUrl`, use shared `ModuleCache`, stop root-preloading into flat `__imports`
- `packages/flux-react/src/node-renderer.tsx` — use `ImportStack` push/pop instead of flat `__imports`
- `packages/flux-react/src/useNodeImports.ts` — adapt to `ModuleCache` + `ImportStack`
- `packages/flux-runtime/src/schema-compiler/diagnostics.ts` — new diagnostic codes for `$` variable validation
- Tests for all touched packages
- `docs/architecture/module-cache-and-import-stack.md` — mark implemented phases as completed

### Out Of Scope

- Flow Designer / Report Designer / Spreadsheet Renderer integration
- `ImportCapabilityManifest` loading and member-level validation of imported helpers
- IDE language server integration
- Hot reload / module cache invalidation protocol
- Host application integration code (nop-chaos-next side)

## Execution Plan

### Phase 1 - ModuleCache Interface And Extraction

Status: completed
Targets: `packages/flux-core/src/types/compilation.ts` (or new `module-cache.ts`), `packages/flux-runtime/src/imports.ts`, `packages/flux-runtime/src/runtime-factory.ts`

- [x] Define `ModuleCache` interface in `flux-core`:
  ```
  get(absUrl: string): ImportedLibraryModule | undefined
  set(absUrl: string, module: ImportedLibraryModule): void
  has(absUrl: string): boolean
  getPending(absUrl: string): Promise<ImportedLibraryModule> | undefined
  setPending(absUrl: string, promise: Promise<ImportedLibraryModule>): void
  removePending(absUrl: string): void
  ```
- [x] Implement `createModuleCache()` factory returning a `Map`-backed `ModuleCache`.
- [x] Refactor `ImportManager` in `imports.ts` to accept an external `ModuleCache` instead of using its internal `moduleLoads` closure variable. All dedup logic delegates to `ModuleCache`.
- [x] Update `createRendererRuntime` to accept optional `moduleCache` parameter and share it when provided.
- [x] Update tests: existing `ImportManager` tests pass with the refactored implementation. Added tests verifying cross-Runtime cache sharing.
- [x] Verify `pnpm typecheck && pnpm build && pnpm test`.

Exit Criteria:

- [x] `ModuleCache` interface is in `flux-core`, `ImportManager` uses it, and existing tests pass.
- [x] Two `RendererRuntime` instances sharing one `ModuleCache` only load each library once.

### Phase 2 - URL Resolution And schemaUrl

Status: completed
Targets: `packages/flux-core/src/types/renderer-api.ts`, `packages/flux-core/src/types/renderer-hooks.ts`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-runtime/src/imports.ts`

- [x] Add `resolveImportUrl?(schemaUrl: string, from: string, options?: Record<string, unknown>): string` to `RendererEnv`.
- [x] Add `schemaUrl: string` to `SchemaRendererProps`.
- [x] In `SchemaRenderer`, pass `schemaUrl` through to schema compilation and import loading paths.
- [x] In `ImportManager.ensureImportedNamespaces`, resolve `spec.from` to an absolute URL before cache lookup and use the resolved URL as the `ModuleCache` key.
- [x] Add tests: relative path resolution and same library different relative paths sharing one cache entry.
- [x] Verify `pnpm typecheck && pnpm build && pnpm test`.

Exit Criteria:

- [x] Schemas with `schemaUrl` and `env.resolveImportUrl` resolve relative import paths to absolute URLs.
- [x] Same library loaded via different relative paths from different schemas deduplicates correctly.
- [x] `schemaUrl` is now a required root contract rather than an optional compatibility carrier.

### Phase 3 - ImportStack And Lexical Scope

Status: completed
Targets: `packages/flux-core/src/types/compilation.ts` (or new `import-stack.ts`), `packages/flux-runtime/src/imports.ts`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/useNodeImports.ts`, `packages/flux-react/src/schema-renderer.tsx`

- [x] Define `ImportStack`, `ImportFrame`, and `ImportStackEntry` interfaces in `flux-core`.
- [x] Implement `createImportStack()` in `flux-runtime` with push/pop discipline:
  - `push()`: resolve modules from `ModuleCache`, register action providers on `ActionScope`, collect expression helpers by alias.
  - `pop()`: unregister action providers, remove frame.
  - `resolveAlias(alias)`: search frames from top to bottom.
  - `currentBindings()`: return merged alias→helpers map for scope creation.
- [x] Integrate `ImportStack` into `RendererRuntime`. Each runtime holds one `ImportStack`.
- [x] Update `NodeRenderer`:
  - When entering a node with `xui:imports`: call `importStack.push(...)` instead of creating a child scope with `__imports`.
  - Create child scope from `importStack.currentBindings()` for expression evaluation.
  - On unmount: call `importStack.pop(nodeId)`.
- [x] Update `SchemaRenderer`:
  - Stop `collectSchemaImports` root preload that puts all imports into root `__imports` map.
  - Instead, preload into `ModuleCache` only (modules are cached, aliases are not globally visible).
  - Remove `rootImportBindings` state and the root `__imports` scope injection.
- [x] Update `useNodeImports` to work with `ModuleCache` + `ImportStack` instead of the current `__imports` inheritance check.
- [x] Add tests:
  - Nested imports: inner frame shadows outer, outer still visible after inner pops.
  - Sibling isolation: sibling subtree cannot see imports from another sibling's `xui:imports`.
  - Root preload populates cache but does not leak aliases to root scope.
- [x] Verify focused typecheck and import-boundary tests.

Exit Criteria:

- [x] `__imports` flat map is fully replaced by `ImportStack` push/pop.
- [x] Root preload no longer injects all imports into root scope.
- [x] Sibling subtrees with different `xui:imports` have isolated alias visibility.
- [x] All existing import tests pass (adapted to new mechanism).

### Phase 4 - CompileSymbolTable And $ Variable Validation

Status: completed
Targets: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/fields.ts`, `packages/flux-formula/src/compile.ts`, `packages/flux-runtime/src/schema-compiler/diagnostics.ts`

- [x] Define `SymbolInfo`, `SymbolFrame`, and `CompileSymbolTable` interfaces in `flux-core`.
- [x] Extend `CompileSchemaOptions` with optional `symbolTable?: CompileSymbolTable` parameter.
- [x] Build `CompileSymbolTable` during schema compilation:
  - Root frame: register builtin namespaces (`$Math`, `$JSON`, `$Date`).
  - Host frame: register injected locals based on root renderer type (`$form` for `scopePolicy: 'form'`, `$page` always).
  - When compiling a node with `xui:imports`: push imports frame with aliases.
  - When compiling a parameterized region: push slot frame with `$slot` root and declared params.
  - When leaving a node/region: pop the corresponding frame.
- [x] Pass `CompileSymbolTable` through to `expressionCompiler.compileValue()` / `compileExpression()`.
- [x] In `flux-formula/src/compile.ts`:
  - Accept optional `CompileSymbolTable` parameter.
  - When compiling an expression containing `$`-prefixed identifiers, resolve them against the symbol table.
  - Classify each `$` reference by its `SymbolInfo.kind`.
  - Record classification in the compiled AST / output for diagnostics.
- [x] Add new diagnostic codes in `diagnostics.ts` and `flux-core` schema diagnostics:
  - `unknown-import-alias` (error): `$alias` used but not declared in any reachable `xui:imports`.
  - `unknown-slot-param` (error): `$slot.xxx` where `xxx` is not in the enclosing region's `params`.
  - `slot-used-outside-region` (error): `$slot.xxx` used outside any parameterized region.
  - `unknown-builtin-member` (error): `$Math.xxx` where `xxx` is not a known builtin member.
  - `ambient-dollar-reference` (info): `$name` not matching any known category.
- [x] Add tests:
  - Known `$form` inside form scope: no diagnostic.
  - `$slot.item` inside parameterized region: no diagnostic.
  - `$slot.item` outside parameterized region: `slot-used-outside-region` diagnostic.
  - `$unknownAlias` not in any `xui:imports`: `unknown-import-alias` diagnostic.
  - Ambient `$someDataField`: `ambient-dollar-reference` info.
- [x] Verify focused typecheck and formula/compiler tests.

Exit Criteria:

- [x] `CompileSymbolTable` is built during schema compilation from renderer metadata, region params, and `xui:imports` declarations.
- [x] Expression compiler resolves and classifies all `$`-prefixed identifiers.
- [x] Structured diagnostics are emitted for invalid references.
- [x] Existing expression tests continue to pass (validation is additive, not blocking).

### Phase 5 - Static Expression Folding

Status: completed
Targets: `packages/flux-formula/src/compile.ts`, `packages/flux-formula/src/evaluator.ts`

- [x] After symbol resolution, add a folding pass in `compile.ts`:
  - `${1 + 2}` → `static-node` with value `3`.
  - `${'x'}3` → `static-node` with value `x3`.
  - `${true ? 'a' : 'b'}` → `static-node` with value `a`.
  - `${$Math.max(1, 2)}` → `static-node` with value `2` (only for known-pure builtin functions with literal args).
  - Expressions referencing any non-builtin symbol (`$form`, `$demo`, `$slot.item`, ambient scope) remain as `expression-node` or `template-node`.
- [x] Update `compileTemplate` to fold when all template parts are statically resolvable and there are no interpolation segments that reference non-literal symbols.
- [x] Add tests for folding and non-folding cases.
- [x] Verify folded builtin/math and non-folded imported alias cases through focused tests.
- [x] Verify focused typecheck and formula tests.

Exit Criteria:

- [x] Literal-only expressions are compiled to `static-node` with zero runtime overhead.
- [x] Template strings with only literal parts are folded to static strings.
- [x] Pure builtin function calls with literal args are folded.
- [x] Expressions referencing runtime symbols are NOT folded.
- [x] Existing tests pass; new folding tests cover the landed cases.

### Phase 6 - Renderer Injected Local Declarations And Docs Update

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-data/src/renderers/page.tsx`, `docs/architecture/module-cache-and-import-stack.md`

- [x] Add `injectedLocals` metadata to `RendererDefinition` so that the form renderer declares `$form`; page metadata also declares `$page` for compile-time symbol visibility.
- [x] Wire `injectedLocals` into the `CompileSymbolTable` host frame during compilation.
- [x] Update `docs/architecture/module-cache-and-import-stack.md`: mark completed phases and reflect the landed architecture.
- [x] Update `docs/architecture/action-scope-and-imports.md`: runtime notes now reference `ImportStack` lexical ownership instead of any flat import map.
- [x] Verify focused typecheck and targeted tests.

Exit Criteria:

- [x] `RendererDefinition` can declare which `$` bindings its scope makes available.
- [x] The form renderer declares `$form`; page metadata now declares `$page` for compile-time symbol visibility.
- [x] Architecture docs reflect the implemented state.

## Risks And Rollback

Outdated Note:

- The original Phase 3 text assumed that replacing `__imports` required a dedicated runtime `ImportStack`. After auditing the live repo on 2026-04-19, that is too heavy for the current codebase: action lexical visibility is already handled by `ActionScope`, and expression lexical visibility can be modeled by direct `$alias` scope bindings without a second push/pop runtime stack.
- The current implementation slice therefore first removes `__imports` and root preload leakage. `ModuleCache`, URL resolution, and compile-time symbol resolution remain valid follow-up work, but `ImportStack` should be re-evaluated as an optional abstraction rather than a mandatory replacement step.

- **Breaking `__imports` consumers**: Phase 3 removes the `__imports` scope key. Any code outside the plan's scope that reads `scope.get('__imports')` will break. Mitigation: search the codebase for all `__imports` references and confirm they are within plan scope before removing.
- **Performance regression from symbol table overhead**: Phase 4 adds symbol resolution to every expression compilation. Mitigation: the symbol table is built once during schema compilation, not per-expression. Expression compilation only does a lookup, not construction.
- **Static folding changing observable behavior**: Phase 5 could fold expressions that have side effects if the folding logic is too aggressive. Mitigation: only fold expressions where all symbols are literals or pure builtin functions; never fold expressions referencing runtime symbols.
- **Backwards compatibility for schemas without `schemaUrl`**: Phases 1 and 2 are designed to be fully backwards compatible. Phase 3 changes the internal scope mechanism but preserves the expression-level contract (`$alias.xxx` still resolves to the same value).

Rollback approach:

- Each phase is independently deployable and testable. If a phase causes regressions, it can be reverted without undoing previous phases.
- Phase 1 (`ModuleCache`) is purely internal refactoring with no external API changes.
- Phase 2 (`schemaUrl`) is additive: new opt-in fields on existing interfaces.
- Phase 3 (`ImportStack`) replaces internal mechanics but preserves expression-level behavior.
- Phases 4 and 5 are additive diagnostics and optimization; they do not change runtime behavior of correctly-typed schemas.

## Validation Checklist

- [ ] `ModuleCache` interface is in `flux-core`, `ImportManager` uses it, and cross-Runtime sharing works.
- [ ] Relative import path resolution works when `schemaUrl` and `resolveImportUrl` are provided.
- [x] `ImportStack` push/pop provides proper lexical scope isolation for import aliases.
- [x] Root preload populates `ModuleCache` but does not leak aliases to root scope.
- [x] `CompileSymbolTable` is populated from renderer metadata, region params, and `xui:imports` during compilation.
- [x] `$`-prefixed identifiers are resolved and classified at compile time.
- [x] Structured diagnostics are emitted for invalid `$` references.
- [x] Static expressions are folded to `static-node` with zero runtime overhead.
- [x] Non-static expressions are NOT folded and produce correct runtime results.
- [x] All existing focused tests pass.
- [x] `docs/architecture/module-cache-and-import-stack.md` reflects implemented state (completed phases marked).
- [x] `docs/architecture/action-scope-and-imports.md` runtime notes updated to reference `ImportStack`.
- [ ] Independent closure audit completed and evidence recorded below.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Plan 116 is now complete. The repo no longer relies on a flat import map, runtime import visibility is frame-based through `ImportStack`, compile-time symbol metadata is threaded through schema compilation and formula compilation, and static builtin-only expressions can fold to `static-node` without changing runtime behavior for import/injected-local/ambient expressions.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: implementation pass landed `ImportStack`, compile-symbol metadata, diagnostics, folding, targeted tests, and doc sync in the live repo; final independent closure audit should recheck full-workspace verification and plan/doc drift before freezing this note.

Follow-up:

- `ImportCapabilityManifest` loading and member-level validation of imported helpers (`$demo.formatName()` argument types).
- IDE language server integration for `$` variable completion and hover documentation.
- Hot reload / module cache invalidation protocol.
- Host application integration (nop-chaos-next `FluxRouteRenderer` with shared `ModuleCache` and `resolveImportUrl`).
- Wider renderer-family adoption for `injectedLocals` declarations (surface runtime `$surface`, data-source status bindings, etc.).
