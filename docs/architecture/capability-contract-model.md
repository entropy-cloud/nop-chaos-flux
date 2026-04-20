# Capability Contract Model

## Purpose

This document defines the shared contract model behind:

- host/domain capability manifests
- ordinary renderer property metadata
- ordinary renderer instance-targeted capability metadata

Use it when deciding:

- what should be shared between host manifests and renderer metadata
- whether namespace capabilities and component capabilities should use one runtime lookup path
- whether `FluxValueShape` should stay the common structural contract language
- whether a runtime validation library such as Zod should replace the shared contract IR

## Main Rule

Flux should unify the **contract language**, not necessarily the **runtime lookup mechanism**.

In practical terms:

- share structural shape language
- share method arg/result contract language
- keep host and renderer envelopes separate
- keep namespace and component runtime lookup separate

`RendererDefinition` should therefore become the single static discovery entry for one renderer `type`, while still carrying multiple distinct contract sub-envelopes.

Important rule:

- unify at the `RendererDefinition` entry level
- do not flatten all contracts into one host-shaped or one component-shaped envelope

## Problem

Flux currently has two capability families:

1. **host/domain capability contracts**
   - examples: `designer:addNode`, `spreadsheet:setCellValue`, `report-designer:preview`
   - runtime lookup: `ActionScope`
   - static envelope: `HostCapabilityProjectionManifest`

2. **component instance capability contracts**
   - examples: `component:submit`, `component:refresh`, `component:setValue`
   - runtime lookup: `ComponentHandleRegistry`
   - static envelope: currently ad hoc / sparse on `RendererDefinition`

These two families should not drift into unrelated type systems.

At the same time, they should not be forced into one runtime registry just because both expose methods.

## Shared Contract Layer

The shared structural contract IR is `FluxValueShape`.

Directionally:

```ts
type FluxValueShape =
  | { kind: 'string'; description?: string }
  | { kind: 'number'; description?: string }
  | { kind: 'boolean'; description?: string }
  | { kind: 'null'; description?: string }
  | { kind: 'literal'; value: string | number | boolean | null; description?: string }
  | { kind: 'array'; item: FluxValueShape; description?: string }
  | { kind: 'object'; fields: Record<string, FluxValueShape>; optional?: readonly string[]; description?: string }
  | { kind: 'union'; anyOf: readonly FluxValueShape[]; description?: string }
  | { kind: 'unknown'; description?: string };
```

This is the platform-owned structural contract language used by compiler and tooling.

Important rule:

- `FluxValueShape` is a **serializable contract IR**
- it is not a renderer-local runtime validation object
- it is not host-exclusive

## Shared Method Contract

Both host capabilities and component capabilities can share one method-contract shape.

Directionally:

```ts
interface CapabilityMethodContract {
  args?: FluxValueShape;
  result?: FluxValueShape;
  description?: string;
  deprecated?: boolean;
}
```

This shared method contract is used in different envelopes.

## RendererDefinition As Unified Static Entry

Future type inference, authoring tooling, online editing, autocomplete, and diagnostics should be able to start from one place: the renderer definition for the current `type`.

That does **not** mean every renderer uses the same semantic envelope.

Recommended direction:

```ts
interface RendererDefinition {
  type: string;
  component: ComponentType<any>;

  rendererClass?: 'instance-renderer' | 'flux-owner-renderer' | 'domain-host-renderer';
  rendererTraits?: readonly string[];

  propContracts?: Record<string, RendererPropContract>;
  eventContracts?: Record<string, RendererEventContract>;
  componentCapabilityContracts?: readonly RendererCapabilityContract[];
  scopeExportContracts?: Record<string, FluxValueShape>;

  hostContract?: RendererHostContract;
}
```

Meaning:

- editor/tooling gets one lookup root per renderer `type`
- ordinary renderer metadata remains ordinary renderer metadata
- host-specific contract remains nested in `hostContract`
- type inference and diagnostics can assemble a unified derived authoring model without erasing semantic distinctions

Typical derived tooling model:

```ts
interface ResolvedAuthoringContract {
  rendererType: string;
  rendererClass: 'instance-renderer' | 'flux-owner-renderer' | 'domain-host-renderer';
  editableProps?: Record<string, RendererPropContract>;
  events?: Record<string, RendererEventContract>;
  componentMethods?: readonly RendererCapabilityContract[];
  scopeExports?: Record<string, FluxValueShape>;
  hostProjection?: HostProjectionContract;
  hostActions?: Record<string, CapabilityMethodContract>;
}
```

This `ResolvedAuthoringContract` is a tooling-facing adapter model, not necessarily the persisted source contract.

## Envelope Split

### Host Manifest Envelope

Host/domain boundaries need a richer envelope.

Directionally:

```ts
interface HostCapabilityProjectionManifest {
  family: string;
  version: string;
  projection: HostProjectionContract;
  capabilities: {
    namespace: string;
    methods: Record<string, CapabilityMethodContract>;
  };
  compatibility?: HostManifestCompatibility;
  metadata?: HostManifestMetadata;
}
```

Host manifest needs extra concepts that ordinary renderers do not:

- `family`
- `version`
- readonly `projection`
- capability publication attribution
- compile-time host boundary validation

### Renderer Metadata Envelope

Ordinary renderers need a different envelope.

Directionally:

```ts
interface RendererPropContract {
  shape: FluxValueShape;
  displayName: string;
  description?: string;
  editorType?: string;
  defaultValue?: unknown;
}

interface RendererCapabilityContract extends CapabilityMethodContract {
  handle: string;
  displayName: string;
}

interface RendererDefinition {
  type: string;
  component: ComponentType<any>;
  propContracts?: Record<string, RendererPropContract>;
  capabilityContracts?: readonly RendererCapabilityContract[];
  hostContract?: RendererHostContract;
}
```

Renderer metadata needs concepts that host manifest does not:

- author-facing display names for inspector/palette tooling
- editor UI hints (`editorType`)
- default schema values
- layout or builder metadata

Important rule:

- ordinary renderer metadata should **not** be wrapped in host-family/version/projection manifest envelope

## Runtime Lookup Split

The static contract model is shared, but runtime lookup remains split.

### Namespace Capabilities

- runtime owner: `ActionScope`
- examples: `designer:addNode`, `demo:open`
- lookup basis: lexical namespace visibility

### Component Capabilities

- runtime owner: `ComponentHandleRegistry`
- examples: `component:submit`, `component:refresh`
- lookup basis: instance target (`componentId`, `componentName`, `cid`)

Important rule:

- do not collapse these into one runtime registry just because both expose methods

Why:

- namespace capability is lexical and family-oriented
- component capability is instance-targeted and registry-oriented
- host manifest also carries readonly projection and versioning concerns that component handles do not need

## Renderer Classification

Do not classify renderers mainly by visual complexity such as "ordinary control" versus "complex designer".

The normative classifier is ownership/publication boundary.

### Class 1: `instance-renderer`

Criteria:

- does not create a new Flux semantic owner runtime
- does not publish readonly host projection
- does not define `hostContract`
- may expose no capabilities or only very small instance-local methods

Representative example:

- `button`

### Class 2: `flux-owner-renderer`

Criteria:

- does not define `hostContract`
- owns Flux-native semantic or interaction state
- may publish local Flux-facing summaries such as `statusPath`, `$form`, `$crud`, or other narrow scope exports
- may expose instance-targeted capabilities through `ComponentHandleRegistry`
- remains inside Flux-native runtime semantics rather than becoming a versioned host family

Representative examples:

- `form`
- `table`
- `crud`

Typical traits:

- `semantic-owner`
- `interaction-owner`
- `composite`

### Class 3: `domain-host-renderer`

Criteria:

- defines `hostContract`
- publishes readonly host projection to inner schema
- publishes namespaced host capabilities to inner schema
- owns bridge/session/subscription lifecycle for a domain runtime
- deserves family/version/publication-boundary semantics and compiler validation

Representative examples:

- `designer-page`
- `report-designer-page`
- `spreadsheet-page`
- `word-editor-page`

Typical traits:

- `workbench-shell`
- `builder-facing`

Important rule:

- capabilities are traits that help tooling and authoring
- capabilities alone are not enough to erase ownership/publication class distinctions

## Why Not Use One Unified Runtime Registry

At first glance, it may seem attractive to let `ComponentHandleRegistry` resolve everything.

That is not the recommended baseline.

Problems with one-registry-for-all design:

1. it blurs lexical namespace lookup and instance targeting into one ambiguous model
2. it weakens the mental model of host-family publication boundaries
3. it makes imported namespaces look like fake component instances
4. it pushes host family/version/projection semantics into an instance registry that does not own those concepts

If a higher-level abstraction is needed, it should be a façade over both systems, not a replacement for both.

Directionally:

```ts
interface CapabilityResolver {
  resolveNamespace(namespace: string): ActionNamespaceProvider | undefined;
  resolveComponent(target: ComponentTarget): ComponentHandle | undefined;
}
```

This is acceptable as a runtime orchestration façade.
It is not a reason to delete `ActionScope` or `ComponentHandleRegistry` as separate owner-level mechanisms.

## Zod And Runtime Validation Libraries

`FluxValueShape` should remain the platform-owned structural contract IR.

Do not replace it with Zod as the core contract language.

Why:

- `FluxValueShape` is serializable and tool-friendly
- compiler diagnostics and static validation need a data IR, not executable runtime schema objects
- host manifests and renderer metadata should remain library-agnostic platform contracts
- Zod is strongest as runtime parsing/guard logic, not as the platform's canonical exchange format

Recommended position for Zod:

- optional adapter from `FluxValueShape` to Zod
- optional host-internal/runtime-side validation helper
- optional editor-side runtime validation helper
- not the normative contract model in `flux-core`

Directionally:

```ts
function fluxShapeToZod(shape: FluxValueShape): ZodTypeAny;
function zodToFluxShape(schema: ZodTypeAny): FluxValueShape;
```

That adapter is optional convenience, not the core architecture baseline.

## Design Rules

1. `FluxValueShape` is the shared structural contract language.
2. `CapabilityMethodContract` is the shared method signature model.
3. Host manifests keep their own envelope with family/version/projection semantics.
4. Ordinary renderer metadata keeps its own envelope on `RendererDefinition`.
5. `RendererDefinition` is the unified static entry point, not a flattened universal envelope.
6. Renderers should be classified by ownership/publication boundary (`instance-renderer`, `flux-owner-renderer`, `domain-host-renderer`) rather than by vague visual complexity.
7. `ActionScope` and `ComponentHandleRegistry` remain separate runtime lookup mechanisms.
8. Zod-like libraries may be adapters or runtime guards, not the core contract IR.

## Related Documents

- `docs/architecture/capability-projection-manifest.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/schema-file-validator.md`
