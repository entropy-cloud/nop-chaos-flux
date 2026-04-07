# Flux Schema File Validator Design

## Purpose

This document defines the recommended validation mechanism for Flux JSON schema documents.

The key design decision is:

- the schema compiler should own the structural analysis pass
- diagnostics-only validation should be a thin adapter over that same pass
- there should not be two separately maintained validation engines

Use it when designing:

- schema import preflight checks
- compile-time diagnostics for schema authoring
- CI validation for schema files or examples
- editor or language-server diagnostics for Flux JSON
- playground-side schema verification before or during compilation

For form value validation and submit-time validation behavior, use `docs/architecture/form-validation.md`.

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-runtime/src/schema-compiler.ts` for compile flow ownership
- `packages/flux-runtime/src/schema-compiler/fields.ts` for current field classification fallback
- `packages/flux-core/src/types/renderer-compiler.ts` for `CompileSchemaOptions` and `CompiledSchemaNode`
- `packages/flux-core/src/types/renderer-core.ts` for `RendererDefinition`
- `packages/flux-core/src/types/schema.ts` for shared schema contracts such as `BaseSchema`, `ReactionSchema`, and `XuiImportSpec`
- `docs/architecture/action-scope-and-imports.md` for namespaced action and `xui:imports` compatibility rules

## Problem

The current repository already has two related but different validation paths:

- compile-time structural checks scattered across the schema compiler and action compilation flow
- runtime form validation for values, rules, and submit behavior

What is still missing is one explicit, reusable structural-diagnostics model for schema documents.

That model must answer questions such as:

- is this document a valid `SchemaInput`
- are required structural fields present
- does each node's `type` resolve to a known renderer contract
- are known fields shaped correctly for that contract
- are nested regions, actions, sources, and shared schema carriers structurally well-formed

At the same time, it must not break forward-compatible extension points. In particular, namespaced properties such as `xui:imports` or host-owned `app:*` metadata may need to survive compilation even when the base compiler does not interpret their payload semantically.

## Main Rule

Compile-time structural validation should be compiler-integrated, not global-state-driven.

That means:

- `compileSchema(...)` runs the authoritative structural analysis pass
- `validateSchema(...)` may exist, but only as a diagnostics-only adapter over that same pass
- compiler behavior is controlled by explicit per-call options, not hidden process-global flags

The structural analysis pass validates everything that is knowable from the JSON document plus the active renderer contract.

It does not:

- execute expressions
- instantiate runtime scopes
- resolve live component instances
- prove that a namespaced action target exists at runtime
- replace runtime form validation

## Why Compile-Time Ownership Is Better

Using the compiler as the main validation engine has three advantages:

- it already owns the renderer registry, field classification, region traversal, and schema paths
- it avoids maintaining one walker for `compile` and another for `validate`
- it keeps diagnostics aligned with the same contracts that lowering uses

The important caveat is that compiler ownership does not mean side effects in the compiler core.

The compiler should produce diagnostics. Outer layers decide whether to:

- print to `console.error`
- accumulate issues in a collector
- throw on first error
- surface warnings in an editor or debugger panel

## Position In The Architecture

Recommended flow:

```text
json file
  -> JSON parse
  -> compiler-owned structural analysis + diagnostics
  -> compiled output when allowed
  -> runtime instantiation / execution
```

For diagnostics-only tooling, the flow can stop after analysis:

```text
json file
  -> JSON parse
  -> validateSchema(...) adapter
  -> diagnostics report only
```

Responsibilities by layer:

- compiler structural analysis: document shape, renderer lookup, field shape, namespace policy, and pre-lowering diagnostics
- compiled output: lowered regions, compiled props/meta/events, validation model assembly, and node graph generation
- runtime: dynamic checks that depend on live scope data, mounted instances, or host-provided capability wiring

## Compiler Diagnostics Contract

The core shape should be explicit compile options plus a diagnostics model.

Directionally:

```ts
interface SchemaCompileDiagnosticsOptions {
  enabled?: boolean;
  continueOnError?: boolean;
  maxIssues?: number;
  reporter?: SchemaDiagnosticReporter;
  collector?: SchemaDiagnosticCollector;
}

interface SchemaCompileValidationOptions {
  unknownBarePropertyPolicy?: 'ignore' | 'warn' | 'error';
  namespacedPropertyPolicy?: 'error' | 'ignore' | 'delegate-or-ignore';
  extensionPassthroughPolicy?: 'none' | 'namespaced-only';
  namespaceValidators?: readonly SchemaNamespaceValidator[];
}

interface CompileSchemaOptions {
  diagnostics?: SchemaCompileDiagnosticsOptions;
  validation?: SchemaCompileValidationOptions;
}

interface SchemaDiagnostic {
  code:
    | 'invalid-root'
    | 'expected-object'
    | 'missing-required-field'
    | 'unknown-renderer-type'
    | 'unknown-property'
    | 'invalid-property-shape'
    | 'invalid-region-node'
    | 'invalid-action-shape'
    | 'invalid-source-shape'
    | 'invalid-namespace-property';
  path: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: 'core' | 'renderer' | 'namespace';
}

interface SchemaDiagnosticCollector {
  add(issue: SchemaDiagnostic): void;
}

type SchemaDiagnosticReporter = (issue: SchemaDiagnostic) => void;
```

Default convenience API:

```ts
function validateSchema(input: unknown, options?: CompileSchemaOptions): SchemaDiagnostic[];
```

That helper should internally reuse the same compiler-owned analysis path rather than introducing a second standalone validator implementation.

## Default Profiles

The design does not require a hard-coded enum, but three preset profiles are recommended.

### Authoring profile

Use in playgrounds, editors, or interactive prototyping.

- diagnostics enabled
- unknown bare keys default to `warn`
- namespaced keys use `delegate-or-ignore`
- extension passthrough uses `namespaced-only`
- `continueOnError` defaults to `true` so the compiler can keep producing best-effort output where it is safe

### Strict validation profile

Use in CI, docs example verification, or schema import gates.

- diagnostics enabled
- unknown bare keys default to `error`
- namespaced keys still use `delegate-or-ignore`
- extension passthrough remains `namespaced-only`
- diagnostics-only `validateSchema(...)` is preferred over best-effort compile output

### Compatibility import profile

Use when loading third-party or legacy schema that still needs observability before full tightening.

- diagnostics enabled
- unknown bare keys may temporarily stay at `warn`
- namespaced keys use `delegate-or-ignore`
- extension passthrough remains `namespaced-only`
- reporter should surface debt clearly so compatibility mode does not silently become the permanent baseline

## Do Not Use Global Switches

Do not make validation behavior depend on an ambient global variable read directly by the compiler.

Why:

- concurrent or nested compilation becomes hard to reason about
- tests leak state into each other
- editor, playground, and runtime environments may accidentally share one mutable default

If an application wants a global default, it should wrap `compileSchema(...)` and inject default options at the application boundary. The compiler core itself should only read the options for the current invocation.

## Diagnostic Collection Versus Lowering Continuation

`continueOnError` should control lowering continuation, not diagnostic collection.

That means:

- diagnostics continue to accumulate until `maxIssues` is hit
- lowering may stop for one node, one subtree, or the whole compile depending on the blocking error class
- `validateSchema(...)` never lowers; it only runs analysis and returns diagnostics

Recommended blocking classes:

- invalid root shape
- non-object schema node
- missing string `type`
- unknown renderer type
- malformed region that cannot be interpreted as schema input
- malformed shared carrier such as action/source where the compiler would otherwise mis-lower semantics

Recommended non-blocking classes:

- unknown bare key under `warn`
- ignored namespaced extension subtree
- optional renderer-specific shape warnings that do not invalidate ownership boundaries

## Diagnostics Model

Canonical diagnostic path format should be JSON Pointer.

If a higher layer also wants Flux-style schema paths for debugger or compiler correlation, it may attach them as secondary metadata, but the primary diagnostic path should stay JSON Pointer so editor integrations and CI output remain stable.

Recommended principles:

- issue codes are stable and enumerable
- paths point at the failing property, not just the parent node
- messages mention expected versus actual shape when possible
- the compiler core emits diagnostics through a collector or reporter, but does not directly own `console.error`
- action-object diagnostics must preserve the current compatibility rule where namespaced or component actions may carry payload fields at the top level when `args` is omitted

## Validation Sources

The compiler-owned analysis pass should compose rules from four sources.

### 1. Core Flux contracts

These come from shared schema types such as:

- `BaseSchema`
- `ActionSchema`
- `ApiSchema`
- `SourceSchema`
- `DataSourceSchema`
- `ReactionSchema`
- `DynamicRendererSchema`
- `XuiImportSpec`

This is where the compiler enforces generic shapes like:

- every schema node is an object with a string `type`
- `xui:imports` is a declaration-style provisioning array validated by the standard `xui` namespace bundle
- event fields hold an action-shaped object
- region fields contain schema nodes or schema-node arrays when the owning contract says so

### 2. Renderer registry presence

`type` resolution must use the active renderer registry rather than a hard-coded static list.

That allows the compiler to answer:

- is this renderer type registered
- which package owns it
- which region keys and field rules are declared for it

An unknown `type` is a compile-time schema diagnostic even when the JSON is syntactically valid.

### 3. Renderer field metadata

The compiler should reuse `RendererDefinition.fields` and `RendererDefinition.regions` as the first structural hint layer.

Those descriptors already tell the compiler whether a field is:

- `meta`
- `prop`
- `region`
- `value-or-region`
- `event`
- `ignored`

This lets the diagnostics pass detect obvious shape mistakes without duplicating compiler ownership rules.

### 4. Renderer-specific validator descriptors

Field metadata alone is not enough for richer renderer-owned contracts such as `table.columns`, `form.actions`, or domain-specific shells.

Therefore the preferred design is to add a dedicated pure validator contribution on renderer definitions rather than overloading the current loose `propSchema` field.

Directionally:

```ts
interface RendererSchemaValidator<S extends BaseSchema = BaseSchema> {
  validate(ctx: RendererSchemaValidationContext<S>): void;
}

interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  // existing fields...
  schemaValidator?: RendererSchemaValidator<S>;
}
```

## Current Compiler Gap

The current compiler is permissive in one important way.

In today's implementation, unknown fields tend to fall through the generic field classifier and become ordinary props before lowering. That is useful for tolerant runtime compilation, but it is not strict enough to serve as the final diagnostics policy.

Therefore stricter diagnostics must run before generic prop lowering treats an unrecognized bare key as a normal prop.

In other words:

- current permissive lowering behavior is a compatibility baseline
- target diagnostics behavior should become stricter for unknown bare keys
- the stricter rule should be implemented as a compiler-owned diagnostics phase, not by hoping the current generic prop path is "good enough"

## Validation Pipeline

Recommended compiler pipeline:

1. Parse the JSON file into `unknown`.
2. Confirm the root is `SchemaInput`.
3. Walk each schema node recursively.
4. Resolve the node's renderer definition.
5. Build the accepted-property set from core fields, renderer fields, renderer regions, and shared schema carriers.
6. Apply namespaced-property policy before emitting unknown-property diagnostics.
7. Validate known properties by shape category, with special compatibility handling for action payload objects.
8. Recurse into child regions, nested action trees, source objects, and other shared carriers.
9. Preserve allowed extensions according to passthrough policy.
10. Continue into lowering only when the active compile options allow it.

Directionally:

```ts
function analyzeAndCompileNode(node: unknown, path: string, ctx: SchemaCompileContext): CompiledSchemaNode | undefined {
  if (!isPlainObject(node)) {
    ctx.error('expected-object', path, 'Schema node must be an object.');
    return undefined;
  }

  if (typeof node.type !== 'string') {
    ctx.error('missing-required-field', path, 'Schema node must declare a string type.');
    return undefined;
  }

  const definition = ctx.registry.get(node.type);
  if (!definition) {
    ctx.error('unknown-renderer-type', `${path}/type`, `Unknown renderer type ${node.type}.`);
    return undefined;
  }

  const analysis = analyzeNodeProperties(definition, node, path, ctx);
  if (analysis.hasErrors && !ctx.options.diagnostics?.continueOnError) {
    return undefined;
  }

  return lowerNode(definition, node, analysis, path, ctx);
}
```

## Compile Result Compatibility

The first implementation slice should preserve the current `compile(...) => CompiledSchemaNode | CompiledSchemaNode[]` return shape for compatibility.

Diagnostics should therefore travel out-of-band in phase one through:

- a collector provided in compile options
- a reporter provided in compile options
- a diagnostics-only `validateSchema(...)` helper

If a future API needs a richer combined result, add it as a new entry point such as `compileDetailed(...)` rather than immediately breaking the existing compile signature.

## Namespaced Property Exception

This document standardizes the requested extension point: properties with an explicit namespace prefix may be ignored or delegated by the base compiler diagnostics pass.

### Property classification

A namespaced property key is any JSON object key where:

- the substring before the first `:` matches `^[A-Za-z][A-Za-z0-9_-]*$`
- there is a non-empty suffix after that `:`

Examples:

- `xui:imports`
- `app:layout`
- `report:exportPolicy`

This rule applies to property names only. It does not change the semantics of action selector strings such as `designer:addNode`.

### Policy modes

The compiler should support three modes:

- `error`: treat unclaimed namespaced properties like any other unknown property
- `ignore`: skip namespaced properties and their entire subtrees without validating them
- `delegate-or-ignore`: if a namespace validator claims the key, validate it; otherwise skip it

Recommended default for general schema ingestion: `delegate-or-ignore`.

That recommendation assumes the standard validator bundle already registers validators for stable core namespaces owned by Flux itself. In current docs, `xui:imports` is already part of the active Final Execution Schema and should therefore be validated by the built-in `xui` namespace validator rather than silently skipped.

### Why subtree skipping is necessary

If the compiler does not understand the meaning of `app:foo`, it also does not understand the payload under that key. Descending into the subtree as if it were core Flux structure creates false positives.

Therefore "ignored" means:

- do not report unknown-property for that key
- do not recursively validate its payload using core rules
- keep the raw value untouched for later loader or host handling

### Namespace validators

A namespace owner may register a validator plugin and reclaim that key for structural checking.

Directionally:

```ts
interface SchemaNamespaceValidator {
  namespace: string;
  validate(input: {
    key: string;
    value: unknown;
    path: string;
    report: SchemaCompileContext;
  }): boolean;
}
```

Examples:

- the standard Flux compiler bundle validates `xui:imports`
- a report-designer package may validate `report:*` metadata
- a host application may validate `app:*` metadata

For the standard repository bundle, `xui` should not be optional. It is already part of the active schema contract, so the built-in compiler assembly should ship with an `xui` namespace validator by default.

## Unknown Properties And Passthrough

The compiler should stay strict for non-namespaced unknown properties.

That means:

- plain typos such as `visibel` or `layotu` remain warnings or errors according to policy
- unknown bare keys do not become silently accepted just because extension support exists elsewhere
- namespaced keys are the only escape hatch for forward-compatible unknown properties

Recommended policy:

- unknown bare keys: interactive authoring defaults to `warn`, while CI and docs-example verification should use `error`
- extension passthrough: default `namespaced-only`

Most importantly, unknown bare keys should not be merged into ordinary compiled props just because the compiler can carry them forward mechanically.

If passthrough is needed, preserve only allowed namespaced extensions through a dedicated extension channel or raw-sidecar field rather than mixing them into the normal compiled prop contract.

Directionally:

```ts
interface CompiledSchemaNode {
  // existing fields...
  extensions?: Record<string, unknown>;
}
```

This keeps three concepts separate:

- known core/renderer-owned props
- compiler diagnostics about unknown bare keys
- extension payload that is deliberately preserved for host-specific later handling

This also means `xui:*` should not be shoved into the generic extension bucket. It is a built-in validated namespace with compiler-known semantics.

## Action Compatibility Rule

Action-shaped objects need one explicit compatibility carve-out.

If an action selector is namespaced or component-targeted and `args` is omitted, non-reserved top-level action fields remain legal payload fields.

Therefore the compiler diagnostics phase must not apply a blanket unknown-property rule to action objects before it classifies whether the selector is:

- built-in
- `component:<method>`
- `namespace:method`

Built-in actions may stay strict by their narrower contract, but the compatibility path documented in `docs/architecture/action-scope-and-imports.md` must remain valid.

## Reporter Layering

The compiler core should emit diagnostics to collectors/reporters, not directly to the console.

Recommended layering:

- compiler core: create diagnostics
- collector: accumulate issues with stable paths and codes
- reporter: optionally mirror them to `console.error`, editor output, or UI diagnostics panes

This keeps tests, CI, editor tooling, and runtime authoring surfaces on the same data model.

## Interaction With Existing Compiler API

The current compiler API is permissive and centered on successful lowering.

The migration path should therefore be additive:

- extend `CompileSchemaOptions` rather than replacing it
- add diagnostics helpers and sidecar modules before changing default strictness
- keep the old call sites working when diagnostics are omitted
- tighten defaults only after regression coverage proves that authoring and runtime behavior remain understandable

## Package Placement

Because the compiler owns the structural analysis pass, the final package split should look different from a totally separate validator package.

Preferred placement:

- issue types, collector interfaces, and namespace-policy utilities in `packages/flux-core/src/schema-diagnostics/`
- compiler-owned analysis and lowering integration in `packages/flux-runtime/src/schema-compiler/`
- renderer-specific validator contributions exported from renderer-owning packages alongside their schema contracts
- thin adapter helpers in higher layers for CI, editor tooling, or playground import paths

This keeps the analysis logic close to compilation while still making diagnostics reusable outside runtime execution.

## Relationship To Existing Validation Systems

This design does not replace the current validator registry used by form validation.

The split is:

- compiler-integrated schema diagnostics: validate document structure before or during compile/execute
- form validation: validate current values against compiled rules during runtime

They may share issue-shaping conventions, but they are not the same subsystem.

## Rollout Strategy

Default implementation order:

1. add schema-diagnostic types and collector/reporter interfaces in `flux-core`
2. add compiler options for diagnostics, namespace policy, and passthrough policy
3. run a pre-lowering diagnostics phase inside the schema compiler so unknown bare keys are no longer silently normalized as ordinary props
4. register a built-in validator for stable core namespace keys such as `xui:imports`
5. add renderer-specific validator contributions for the currently shipped renderers
6. add a diagnostics-only `validateSchema(...)` adapter that reuses the same compiler-owned analysis pass
7. preserve only allowed namespaced extensions through a separate extension channel when passthrough is enabled

Acceptance baseline:

- docs examples can be checked automatically before merge
- plain-key typos are caught deterministically
- namespaced extension payloads no longer cause false-positive failures when policy says ignore
- existing compatibility shapes such as `{ action: 'designer:addNode', nodeType: 'task' }` do not regress under compile-time diagnostics
- the compiler core remains deterministic and side-effect-light because reporting stays outside direct `console` ownership
- compile return compatibility remains intact for existing call sites during the first migration slice