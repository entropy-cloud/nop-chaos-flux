# 132 Runtime Schema Dependency Elimination Plan

> Plan Status: proposed
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

Status: planned

### 1.1 Compiled Data Source

File: `packages/flux-core/src/types/compilation.ts`

```typescript
/**
 * Compiled data source - all expressions pre-compiled.
 */
export interface CompiledDataSource {
  id: string;
  kind: 'api' | 'formula';
  
  // Compiled target path
  targetPath: CompiledRuntimeValue<string>;
  
  // API source specific
  api?: CompiledApiConfig;
  
  // Formula source specific
  formula?: CompiledRuntimeValue<unknown>;
  
  // Common config (all pre-compiled)
  mergeToScope?: CompiledRuntimeValue<boolean>;
  resultMapping?: CompiledRuntimeValue<Record<string, string>>;
  mergeStrategy?: CompiledRuntimeValue<'replace' | 'merge' | 'append'>;
  mergeKey?: CompiledRuntimeValue<string>;
  statusPath?: CompiledRuntimeValue<string>;
  interval?: CompiledRuntimeValue<number>;
  stopWhen?: CompiledRuntimeValue<boolean>;
  silent?: CompiledRuntimeValue<boolean>;
  initialData?: CompiledRuntimeValue<unknown>;
  dependsOn?: readonly string[];  // Static dependency list
  control?: CompiledOperationControl;
}

export interface CompiledApiConfig {
  url: CompiledRuntimeValue<string>;
  method: CompiledRuntimeValue<string>;
  data?: CompiledRuntimeValue<unknown>;
  headers?: CompiledRuntimeValue<Record<string, string>>;
  // ... other API fields
}
```

### 1.2 Compiled Reaction

```typescript
/**
 * Compiled reaction - all expressions pre-compiled.
 */
export interface CompiledReaction {
  id: string;
  
  // Static watch paths
  watch: readonly string[];
  
  // Compiled condition
  when?: CompiledRuntimeValue<boolean>;
  
  // Compiled action
  action: CompiledActionProgram;
  
  // Config
  dependsOn?: readonly string[];
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
}
```

### 1.3 Update TemplateNode

```typescript
export interface TemplateNode<S extends BaseSchema = BaseSchema> {
  // ... existing fields
  
  // Compiled sources (replaces runtime schema.sources access)
  compiledSources?: Readonly<Record<string, CompiledDataSource>>;
  
  // Compiled reactions (replaces runtime schema.reactions access)
  compiledReactions?: readonly CompiledReaction[];
  
  // Original schema - DEBUG ONLY, may be undefined in production
  schema?: S;  // ← Make optional
}
```

### Exit Criteria

- [ ] Types defined
- [ ] Types exported
- [ ] `pnpm typecheck` passes

---

## Phase 2: Compiler Implementation

Status: planned

### 2.1 Data Source Compilation

File: `packages/flux-compiler/src/source-compiler.ts` (new)

```typescript
export function compileDataSource(
  schema: DataSourceSchema,
  expressionCompiler: ExpressionCompiler
): CompiledDataSource {
  return {
    id: schema.name,
    kind: 'api' in schema ? 'api' : 'formula',
    targetPath: expressionCompiler.compileValue(schema.target ?? schema.name),
    api: schema.api ? compileApiConfig(schema.api, expressionCompiler) : undefined,
    formula: schema.formula ? expressionCompiler.compileValue(schema.formula) : undefined,
    mergeToScope: compileOptional(schema.mergeToScope, expressionCompiler),
    resultMapping: compileOptional(schema.resultMapping, expressionCompiler),
    // ... etc
  };
}
```

### 2.2 Reaction Compilation

File: `packages/flux-compiler/src/reaction-compiler.ts` (new)

```typescript
export function compileReaction(
  schema: ReactionSchema,
  expressionCompiler: ExpressionCompiler,
  actionCompiler: ActionCompiler
): CompiledReaction {
  return {
    id: schema.name,
    watch: normalizeWatchPaths(schema.watch),
    when: schema.when ? expressionCompiler.compileValue(schema.when) : undefined,
    action: actionCompiler.compile(schema.actions),
    dependsOn: schema.dependsOn,
    immediate: schema.immediate,
    debounce: schema.debounce,
    once: schema.once,
  };
}
```

### 2.3 Integrate into Schema Compiler

Update schema-compiler to call source/reaction compilers and store results in TemplateNode.

### Exit Criteria

- [ ] Source compiler implemented
- [ ] Reaction compiler implemented
- [ ] Schema compiler integration
- [ ] Unit tests for compilation
- [ ] `pnpm typecheck && pnpm test` passes

---

## Phase 3: Runtime Migration

Status: planned

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

Either:
- Remove `schema` field entirely (breaking)
- Mark as deprecated and optional (backward compatible)
- Only include in dev builds

### Exit Criteria

- [ ] Source registry uses compiled sources
- [ ] Reaction registry uses compiled reactions
- [ ] No runtime schema access (except DevTools)
- [ ] All tests pass
- [ ] `pnpm typecheck && pnpm build && pnpm test` passes

---

## Phase 4: DevTools Compatibility

Status: planned

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

Status: planned

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

- [ ] All source schemas compiled
- [ ] All reaction schemas compiled
- [ ] No runtime `schema.xxx` access (except DevTools)
- [ ] RendererComponentProps.schema removed or deprecated
- [ ] DevTools still functional
- [ ] All existing tests pass
- [ ] No performance regression
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` passes

---

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
