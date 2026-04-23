# 132 Runtime Schema Dependency Elimination Plan

> Plan Status: partially completed
> Last Reviewed: 2026-04-23
> Source: `docs/logs/2026/04-23.md`, investigation of runtime schema usage
> Related: 131-static-analysis-optimization-plan.md

---

## Goals

1. Complete the compilation pipeline so runtime does NOT need raw schema
2. Compile data sources (sources) into executable programs
3. Compile reactions into executable programs
4. Make `schema` field optional/debug-only in TemplateNode
5. Remove or deprecate `schema` from RendererComponentProps

## Non-Goals

- Breaking existing renderers (backward compatibility during transition)
- Removing DevTools/Debugger access to schema
- Changing the external schema DSL format

## Current Baseline

### Schema Storage

```typescript
// TemplateNode keeps full schema (unnecessary for runtime)
interface TemplateNode {
  schema: S;                    // ← Full original schema
  propsProgram: CompiledRuntimeValue;  // ← Compiled props (duplicate)
  // ...
}

// RendererComponentProps also passes schema
interface RendererComponentProps {
  schema: S;                    // ← Why? Renderers should use props/meta
  props: Record<string, unknown>;  // ← Resolved values
  // ...
}
```

### Uncompiled Runtime Usage

Found in `flux-runtime/src/async-data/source-registry.ts`:
```typescript
// Data source schema is NOT compiled - used raw at runtime
api: args.schema.api,
mergeToScope: args.schema.mergeToScope,
resultMapping: args.schema.resultMapping,
mergeStrategy: args.schema.mergeStrategy,
statusPath: args.schema.statusPath,
interval: asNumber(args.schema.interval),
// ... 20+ fields read from raw schema
```

Found in `flux-runtime/src/runtime-factory.ts`:
```typescript
// Reaction schema is NOT compiled
watch: inputValue.schema.watch,
dependsOn: inputValue.schema.dependsOn,
when: inputValue.schema.when,
// ...
```

### What's NOT Compiled

| Schema Type | Compiled? | Location |
|-------------|-----------|----------|
| Node props | ✅ Yes | `propsProgram` |
| Node meta | ✅ Yes | `metaProgram` |
| Events | ✅ Yes | `eventPlans` |
| Validations | ✅ Yes | `validationPlan` |
| **Data Sources** | ❌ No | Raw `schema.sources` |
| **Reactions** | ❌ No | Raw `schema.reactions` |
| **Source API config** | ❌ No | Raw `schema.api`, etc. |

---

## Phase 1: Define Compiled Types

Status: ✅ completed

### 1.1 Compiled Data Source

File: `packages/flux-core/src/types/compilation.ts`

Implemented types:
- `CompiledApiConfig` - compiled API configuration
- `CompiledOperationControl` - operation control settings
- `CompiledDataSource` - full compiled data source

### 1.2 Compiled Reaction

File: `packages/flux-core/src/types/compilation.ts`

Implemented `CompiledReaction` with:
- `id`, `watch` (static paths), `when` (compiled condition)
- `action` (CompiledActionProgram), timing/dependency options

### 1.3 Update TemplateNode

File: `packages/flux-core/src/types/node-identity.ts`

Added:
- `compiledSources?: readonly CompiledDataSource[]`
- `compiledReactions?: readonly CompiledReaction[]`

### Exit Criteria

- [x] Types defined
- [x] Types exported
- [x] `pnpm typecheck` passes

---

## Phase 2: Compiler Implementation

Status: ✅ completed

### 2.1 Data Source Compilation

File: `packages/flux-compiler/src/source-compiler.ts` (new)

Implemented:
- `compileDataSource(id, schema, compiler, options)` - compiles DataSourceSchema to CompiledDataSource
- `isDataSourceFullyStatic(compiled)` - checks if all fields are static
- Handles API sources (url, method, data, params, headers, adaptors)
- Handles formula sources
- Compiles all merge options (strategy, key, mapping)
- Compiles timing options (interval, stopWhen, silent)

### 2.2 Reaction Compilation

File: `packages/flux-compiler/src/reaction-compiler.ts` (new)

Implemented:
- `compileReaction(id, schema, compiler, options)` - compiles ReactionSchema to CompiledReaction
- `isReactionFullyStatic(compiled)` - checks if when/action are static
- Normalizes watch paths (string → array)
- Compiles when condition
- Uses existing `compileActions()` for action compilation

### 2.3 Integrate into Schema Compiler

File: `packages/flux-compiler/src/schema-compiler.ts`

Integration:
- Detects `type: 'data-source'` nodes and populates `compiledSources`
- Detects `type: 'reaction'` nodes and populates `compiledReactions`
- Added imports for new compilers

### 2.4 Unit Tests

New test files:
- `packages/flux-compiler/src/source-compiler.test.ts` (14 tests)
- `packages/flux-compiler/src/reaction-compiler.test.ts` (12 tests)

### Exit Criteria

- [x] Source compiler implemented
- [x] Reaction compiler implemented
- [x] Schema compiler integration
- [x] Unit tests for compilation (26 new tests)
- [x] `pnpm typecheck && pnpm test` passes

---

## Phase 3: Runtime Migration

Status: partially completed

### 3.1 Update Source Registry

File: `packages/flux-runtime/src/async-data/source-registry.ts`

**Before:**
```typescript
api: args.schema.api,
mergeToScope: args.schema.mergeToScope,
```

**After:**
```typescript
api: evaluateCompiledApi(args.compiledSource.api, scope),
mergeToScope: evaluateValue(args.compiledSource.mergeToScope, scope),
```

### 3.2 Update Reaction Registry

File: `packages/flux-runtime/src/runtime-factory.ts`

**Before:**
```typescript
watch: inputValue.schema.watch,
when: inputValue.schema.when,
```

**After:**
```typescript
watch: inputValue.compiledReaction.watch,
when: evaluateValue(inputValue.compiledReaction.when, scope),
```

### 3.3 Remove schema from RendererComponentProps

Current re-audit note (2026-04-23): this sub-goal has not landed and is broader than the already-completed compiled source/reaction substrate. Live repo still has legitimate renderer/static-config consumers of `props.schema`, so any future work here should be split from the landed source/reaction compilation baseline rather than silently treated as part of the same active slice.

### Exit Criteria

- [x] Source registry uses compiled sources
- [ ] Reaction registry uses compiled reactions
- [ ] No runtime schema access (except DevTools)
- [ ] All tests pass
- [ ] `pnpm typecheck && pnpm build && pnpm test` passes

---

## Phase 4: DevTools Compatibility

Status: deferred

### 4.1 Conditional Schema Storage

```typescript
// In schema compiler
const templateNode: TemplateNode = {
  // ... compiled fields
  
  // Only store schema in development
  schema: import.meta.env.DEV ? schema : undefined,
};
```

### 4.2 DevTools Access

Ensure nop-debugger can still access schema for inspection:
- Either store schema separately in a debug map
- Or use conditional compilation to include schema

### Exit Criteria

- [ ] DevTools still works
- [ ] Production builds don't include schema (optional optimization)

---

## Phase 5: Cleanup and Documentation

Status: deferred

### 5.1 Remove Deprecated Fields

After transition period:
- Remove `schema` from RendererComponentProps
- Make `schema` truly optional in TemplateNode

### 5.2 Documentation

Update:
- `docs/architecture/flux-core.md` - document compiled sources/reactions
- API documentation for new types

### Exit Criteria

- [ ] Documentation updated
- [ ] No deprecated fields in active use

---

## Validation Checklist

- [x] All source schemas compiled
- [x] All reaction schemas compiled
- [ ] No runtime `schema.xxx` access (except DevTools)
- [ ] RendererComponentProps.schema removed or deprecated
- [ ] DevTools still functional
- [ ] All existing tests pass
- [ ] No performance regression
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` passes

---

## Closure

Status Note: Partially completed. Phases 1-2 landed the compiled source/reaction types and compiler output, and runtime source registration now consumes compiled sources. The remaining scope in this file mixes three different follow-up tracks that have not landed: reaction runtime migration, broader runtime/raw-schema elimination outside source registration, and any `TemplateNode.schema` / `RendererComponentProps.schema` / DevTools cleanup. Those follow-ups should be re-owned by narrower successor work instead of treating this plan as still one coherent active execution plan.

Closure Audit Evidence:

- Reviewer / Agent: live repo re-audit during plan closure cleanup (2026-04-23)
- Evidence: `packages/flux-core/src/types/compilation.ts` and `packages/flux-core/src/types/node-identity.ts` define compiled source/reaction carriers; `packages/flux-compiler/src/source-compiler.ts`, `reaction-compiler.ts`, and `schema-compiler.ts` populate them; `packages/flux-runtime/src/async-data/source-registry.ts` now prefers `compiledSource`; but `packages/flux-runtime/src/runtime-factory.ts` still falls back to raw reaction fields and `packages/flux-runtime/src/async-data/reaction-runtime.ts` still retains raw-schema fallback semantics, while many renderer/static-config call sites still legitimately consume `props.schema`.

Follow-up:

- Split reaction runtime migration into a narrower successor plan that closes the remaining `compiledReaction` execution path without bundling renderer/devtools schema removal.
- Treat any `TemplateNode.schema` / `RendererComponentProps.schema` cleanup as a separate architecture/boundary plan after legitimate static-config schema consumers are audited and narrowed.

## Migration Path

1. **Phase 1-2**: Add compiled types and compilers (additive, no breaking changes)
2. **Phase 3**: Runtime uses compiled data (internal refactor)
3. **Phase 4**: DevTools compatibility
4. **Phase 5**: Remove deprecated fields (breaking, with migration guide)

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing renderers | Deprecation period, not immediate removal |
| DevTools regression | Phase 4 specifically addresses this |
| Performance during compilation | Compilation is one-time cost |
| Increased compile time | Source/reaction compilation is lightweight |
