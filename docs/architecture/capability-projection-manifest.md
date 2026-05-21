# Capability Projection Manifest Design

## Purpose

This document defines the missing static contract layer between Flux schema and complex domain hosts.

Use it when designing:

- typed host projection fields for workbench-like hosts such as flow-designer, spreadsheet, report-designer, and word-editor
- typed host capability methods such as `designer:addNode`, `report-designer:preview`, or `word-editor:save`
- compile-time validation for `${expr}` reads against host-provided projection fields
- compile-time validation for action payloads dispatched to host-provided capability methods
- versioned host contracts that can evolve without turning Flux runtime into a pile of ad hoc host-specific code

This document does **not** replace `ActionScope`, `ComponentHandleRegistry`, or `useHostScope`.

It adds the missing static manifest contract that those runtime mechanisms currently lack.

It also does **not** act as the generic metadata envelope for ordinary renderers such as `button`, `input-text`, or `table`.
Those renderers may reuse the same structural shape language, but they stay on the ordinary renderer contract path rather than becoming host-family manifests.

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-core/src/schema-diagnostics/manifest.ts` for manifest envelope types, structural shape contract, and resolver contracts
- `packages/flux-core/src/schema-diagnostics/index.ts` for host-specific diagnostic codes and `SchemaCompileValidationOptions.hostContractContext`
- `packages/flux-core/src/types/renderer-core.ts` for `RendererDefinition.hostContract`
- `packages/flux-compiler/src/schema-compiler/diagnostics.ts` for `xui:version` validation and diagnostics context
- `docs/architecture/schema-file-validator.md` for compiler-integrated diagnostics framework

## Relationship To Existing Docs

Read this document together with:

- `docs/architecture/frontend-programming-model.md` for primitive-level precedence
- `docs/architecture/action-scope-and-imports.md` for runtime capability lookup and `xui:imports`
- `docs/architecture/schema-file-validator.md` for compiler-integrated diagnostics
- `docs/architecture/complex-control-host-protocol.md` for current host bridge and snapshot wiring

Precedence note:

- `frontend-programming-model.md` still owns primitive identity and the readonly `Host Projection` plus `Capability` write boundary
- `action-scope-and-imports.md` still owns runtime dispatch order and lexical visibility rules
- this document owns the **static manifest contract** that lets the compiler understand what a host projection exposes and what a host capability accepts

Readonly-projection note:

- in this repository, readonly host projection means **one-way readonly semantics**, not mandatory defensive copying
- projection exposes a readonly interface to schema/host consumers; the backing implementation may still be the live internal object graph
- a host projection may legally expose by-reference live objects when they remain inside the framework's strict readonly discipline
- do not infer detached-clone requirements from the word `readonly` unless the owner doc explicitly says `snapshot copy`, `materialized copy`, `defensive clone`, or equivalent

## Problem

The current architecture already has the right runtime split:

- schema reads host snapshot through host projection / host scope
- schema writes through namespaced actions
- domain internals stay behind a bridge or core runtime

But one important layer is still missing.

Today the compiler mostly knows that:

- `designer:*` is a namespaced action
- `${activeNode.id}` is an expression path

What it usually does **not** know is:

- whether `activeNode` is actually a valid host projection field in the current host boundary
- whether `designer:addNode` is actually a declared capability method in that host boundary
- which payload shape `designer:addNode` expects
- what result shape `designer:exportDocument` returns
- which host contract version the current schema fragment was authored against

That creates four problems:

1. host projection fields remain stringly typed at authoring time
2. namespaced host actions remain stringly typed at authoring time
3. host evolution has no explicit versioned compatibility surface
4. every host renderer repeats wiring knowledge that should be a contract, not folklore

## Chosen Integration Model

This document adopts a deliberately minimal integration model.

The default host contract is attached to the publishing owner renderer definition and reached through its `type`.

The renderer definition does **not** inline every supported manifest version into one static field.

Instead, the renderer definition anchors:

- host family identity
- default version selector
- a renderer-owned manifest resolution entry that can return one concrete manifest bundle for the requested version selector

Directionally:

- `designer-page` renderer definition publishes the default `designer` host contract
- `report-designer-page` renderer definition publishes the default `report-designer` host contract

Schema does **not** declare host family explicitly in the common case.

At schema level, the only added contract override is a version selector such as `xui:version` on the publishing owner node.

Standalone fragment validation may still supply explicit compile-time host context when no enclosing owner node is available.

## Main Rule

Complex hosts should publish two things separately:

1. runtime bridge/scope wiring
2. static manifest contract

The bridge may keep projection reads zero-copy for performance. The contract requirement is readonly interface semantics, not copy semantics, unless the owner doc explicitly tightens that boundary.

The runtime bridge answers:

- how the host is mounted
- how snapshots are read
- how commands are dispatched

The manifest answers:

- which readonly projection fields are visible to schema
- which capability methods are callable from schema
- what arguments and results those methods use
- which contract version the schema expects

The compiler validates schema against the manifest.

The runtime executes schema through the bridge.

Do not merge those two roles into one ad hoc object.

## Design Position

The Capability Projection Manifest is a **platform-extension architecture layer**, not a new Flux primitive.

It is derived from the existing primitive split:

- `Host Projection` remains readonly snapshot admission
- `Capability` remains the only effect authority path

The manifest simply gives those two existing channels a compile-time contract.

It does not turn readonly projection into clone-on-read by default.

## Mental Model

The full host integration stack should be read as five layers:

1. domain core or bridge
2. host runtime wiring
3. host scope / action-scope publication
4. capability-projection manifest
5. compiler diagnostics and tooling

```text
domain core / bridge
  -> host renderer wiring
  -> host projection scope + namespaced capability registration
  -> host manifest publication
  -> compiler validates schema reads/writes against the manifest
  -> runtime executes through existing bridge/action-scope mechanisms
```

## Non-Goals

This design does not attempt to:

- force detached copying for every host projection read surface when a zero-copy readonly view already satisfies the active owner contract

This design does not attempt to:

- replace `ActionScope` with a global manifest registry
- make runtime dispatch depend on a central global host table
- expose host internals or mutable stores directly to schema
- require all ordinary built-in Flux actions to move into the manifest system
- turn Flux into a general RPC framework
- allow manifest presence to bypass runtime ownership and lexical visibility rules

## Scope Of The Manifest Layer

The manifest layer is only for host/domain boundaries that satisfy all of the following:

- the host exposes readonly projection fields to schema
- the host exposes namespaced capability methods to schema
- the contract is stable enough to deserve versioning
- the contract is reused across multiple schema fragments, tools, or teams

Typical examples:

- `designer` host family
- `spreadsheet` host family
- `report-designer` host family
- `word-editor` host family

Not every component needs a manifest.

Simple renderer-local component handles such as `component:submit` on a form usually stay on the ordinary renderer contract path unless they become a broad platform surface.

Related renderer taxonomy:

- `instance-renderer` and `flux-owner-renderer` do not become host manifests just because they expose capabilities
- only `domain-host-renderer` should define `hostContract`

Cross-reference: `docs/architecture/capability-contract-model.md`

## Relationship To Renderer-Level Contracts

The manifest envelope is intentionally scoped to host/domain boundaries.

Ordinary renderer contracts may still need static metadata for:

- property editor tooling
- component-level capability hints
- builder palette/search/category metadata
- instance-targeted capability documentation for `component:<method>` authoring

Those needs should **not** be modeled by turning every renderer into a host-family manifest.

Instead, the architecture baseline is:

- `HostCapabilityProjectionManifest` stays the host/domain envelope
- ordinary renderer metadata lives on `RendererDefinition`
- both layers may reuse the same structural shape contract (`FluxValueShape`) for args/results/value shape description
- `ResolvedAuthoringContract` may assemble host fields together with ordinary renderer metadata for tooling, but `hostContract` itself remains host-only on `domain-host-renderer`

Why this split matters:

- host manifest contract is family/version/publication-boundary oriented
- renderer metadata is instance/property/editor oriented
- host projection is readonly schema-visible host state
- renderer property metadata usually describes author-editable schema fields, not readonly host projection

Representative rule:

- `form`, `table`, and `crud` may be strong Flux-native owners, but they still remain ordinary renderer metadata + component capability cases unless they cross into real host-family semantics

In other words:

- **share the shape language**
- **do not collapse the envelopes**

Cross-reference: `docs/architecture/capability-contract-model.md`

## Core Concepts

### Host Family

A host family is the stable platform-facing namespace for one domain host type.

Examples:

- `designer`
- `spreadsheet`
- `report-designer`
- `word-editor`

The family name is also the default action namespace prefix.

### Projection Contract

The projection contract declares the readonly fields that schema expressions may read from the host boundary.

In the current baseline, these readonly fields may be backed by live by-reference objects. The manifest constrains **who may write** and **which fields are schema-visible**; it does not by itself require clone-on-read. In other words, the projection is an external readonly contract, not a promise that the runtime materializes a detached copy.

Examples:

- `doc`
- `selection`
- `activeNode`
- `activeEdge`
- `runtime`

Important rule:

- projection contract is about **schema-visible readonly shape**, not about the internal bridge snapshot shape

The host may internally keep a richer snapshot and publish only a trimmed projection contract.

### Capability Contract

The capability contract declares the namespaced methods schema may dispatch.

Examples:

- `designer:addNode`
- `designer:updateNodeData`
- `spreadsheet:setCellValue`
- `report-designer:preview`

Important rule:

- capability contract is about the **schema-callable method surface**, not every method on the underlying bridge/core

### Contract Version

Each manifest carries an explicit semantic version string.

The version is attached to the host family contract, not to one random mounted instance.

Examples:

- `designer@1.0.0`
- `report-designer@2.1.0`

### Manifest Bundle

The manifest bundle is the full static contract published for one host family version.

Directionally:

```ts
interface HostCapabilityProjectionManifest {
  family: string;
  version: string;
  projection: HostProjectionContract;
  capabilities: HostCapabilityContract;
  compatibility?: HostManifestCompatibility;
  metadata?: HostManifestMetadata;
}

interface HostManifestResolver {
  resolve(input: {
    family: string;
    versionSelector: string;
  }): HostCapabilityProjectionManifest | undefined;
}
```

### Publisher And Consumer Model

This document keeps one strict ownership split.

#### Publisher

The **publisher** is the host owner boundary that actually exposes:

- readonly host projection fields
- namespaced capability methods

Representative publishers:

- `designer-page`
- `report-designer-page`
- `spreadsheet-page`
- `word-editor-page`

The publisher owns:

- which host family is active for that subtree
- which manifest version is published
- runtime host-scope publication
- runtime action-scope namespace registration

In the default design, the publisher is identified by renderer `type`, and the default host contract comes from that renderer's definition.

#### Consumer

The **consumer** is a schema fragment that runs under a compatible publisher.

Examples:

- a toolbar fragment that reads `${activeNode.id}` and dispatches `designer:updateNodeData`
- an inspector fragment that reads `fieldSources` and dispatches `report-designer:preview`

Important rule:

- a consumer requirement does not create a publisher
- ordinary in-tree consumers receive a candidate host contract context from the nearest publishing owner node; actual host capability validation still depends on compiler-visible publication attribution

#### Inheritance Rule

When a fragment is compiled as part of the same schema tree under a publishing owner node, the nearest publisher establishes only the **candidate** host contract family/version.

That candidate contract becomes active for diagnostics only when the relevant publication boundary is compiler-visible.

When a fragment is compiled standalone or validated out of context, the host contract context may be supplied through explicit compiler input.

That keeps the current lexical host-boundary model intact without requiring fragment-local family declarations.

### Capability Publication Attribution

Host capability visibility follows the same explicit render-boundary rule as `ActionScope`.

Rules:

- a publishing owner declaring `hostContract` does **not** by itself prove that every descendant executes inside that host capability scope
- capability validation is only sound for fragments whose execution path is known to receive the relevant host `actionScope`
- compiler-owned action validation therefore needs a compiler-visible capability publication attribution model, not only nearest-owner discovery
- this attribution may be whole-owner-subtree or region-specific, but it must be explicit

Current baseline guidance:

- hosts such as `designer-page` often publish capability scope only to specific rendered regions via explicit `render({ actionScope })`
- until that publication boundary is available to the compiler, generic host-family action diagnostics must stay disabled for ambiguous descendants

Directionally, the publishing owner contract needs to answer:

- which subtree or regions receive the host capability scope
- whether capability publication is whole-owner or region-scoped
- whether descendants inherit that capability scope transitively once inside the published boundary

## Normative Shape

### Top-Level Manifest

Directionally:

```ts
interface HostCapabilityProjectionManifest {
  family: string;
  version: string;
  projection: HostProjectionContract;
  capabilities: HostCapabilityContract;
  compatibility?: {
    minRuntimeVersion?: string;
    deprecatedProjectionPaths?: readonly string[];
    deprecatedMethods?: readonly string[];
    replacedBy?: Readonly<Record<string, string>>;
  };
  metadata?: {
    title?: string;
    description?: string;
    docsPath?: string;
  };
}

interface HostProjectionContract {
  fields: Readonly<Record<string, HostProjectionField>>;
}

interface HostCapabilityContract {
  namespace: string;
  methods: Readonly<Record<string, HostCapabilityMethod>>;
}

interface HostProjectionField {
  schema: FluxValueShape;
  description?: string;
  deprecated?: boolean;
}

interface HostCapabilityMethod {
  args?: FluxValueShape;
  result?: FluxValueShape;
  description?: string;
  idempotent?: boolean;
  deprecated?: boolean;
}
```

The exact TypeScript names can evolve, but the contract must preserve:

- host family
- explicit version
- projection field map
- capability method map
- per-method args shapes and optional result metadata
- compatibility/deprecation metadata

Namespace rule:

- one manifest publishes exactly one host family and one default action namespace
- if a host family ever truly needs multiple schema-callable namespaces, it should publish them as separate family contracts unless a later owner doc explicitly widens this rule

### Renderer Definition Attachment

The default publication point for a host contract is the publishing owner's `RendererDefinition`.

Directionally:

```ts
interface RendererDefinition {
  type: string;
  hostContract?: {
    family: string;
    defaultVersion: string;
    resolveManifest(versionSelector: string): HostCapabilityProjectionManifest | undefined;
  };
}
```

Rules:

- only publishing owner renderers should define `hostContract`
- child fragments do not repeat host family by default
- the renderer `type` chooses the default host family contract
- the renderer definition must be able to resolve the requested version selector to one concrete manifest bundle
- schema may override only the version, not the family, unless a future owner doc introduces a stronger reason

### Manifest Resolution Contract

Manifest resolution is explicit and local to the publishing owner contract.

Rules:

- normal tree compilation starts from owner `RendererDefinition.hostContract`
- `defaultVersion` is a version selector, not a promise that only one manifest version exists
- `xui:version` may supply another selector string for that same family
- the owner's `resolveManifest(...)` must return one concrete `HostCapabilityProjectionManifest` or fail explicitly
- standalone fragment validation must pass an already resolved manifest through explicit compiler input when no publishing owner node is present
- do not make manifest selection depend on a hidden process-global registry

## Shape Language

This document does **not** introduce a second independent structural type system.

The manifest must reuse the shared structural shape contract owned by the schema-diagnostics family described in `docs/architecture/schema-file-validator.md`.

Rules:

- manifest shapes are compiler/tooling shapes, not author-visible Flux primitives
- shape ownership belongs with schema diagnostics, not with host runtime wiring
- the concrete exported TypeScript type should live in a dependency-safe shared contract layer, directionally `packages/flux-core/src/schema-diagnostics/`, not in ad hoc host packages or only inside runtime implementation files

Required capabilities of that reused shape contract:

- primitive scalar kinds
- object fields plus optional keys
- array item shape
- enum/literal values
- union-like alternatives
- `unknown` escape hatch for intentionally broad payloads

This document uses `FluxValueShape` directionally only as a placeholder name for that reused compiler-owned shape contract.

That reused shape contract is not host-exclusive.

It is the shared structural contract IR for:

- host manifest projection/capability shapes
- renderer-level property metadata when a renderer wants typed static authoring metadata
- renderer-level component capability metadata when a component exposes instance-targeted methods

The manifest layer owns the host envelope, but not exclusive ownership of the underlying shape language.

## Projection Rules

### Rule 1: Projection Is Readonly

Manifest projection fields describe what schema may read, not what schema may write.

Even if a projection field looks like ordinary object data, writing to that path through `setValue` is not automatically valid.

Writes still go through capabilities.

### Rule 2: Projection Describes Published Shape, Not Internal Snapshot

If a host snapshot contains internal fields such as caches, private ids, or control objects, those do not belong in the projection contract.

The manifest describes only the stable readonly projection surface.

### Rule 3: Projection Visibility Is Still Lexical

The manifest does not make projection fields globally visible.

It only tells the compiler what fields are valid **inside the host boundary that publishes that manifest**.

Visibility still follows the host scope / render boundary rules from `renderer-runtime.md` and `complex-control-host-protocol.md`.

Important implementation constraint:

- current hosts publish projection through explicit render boundaries such as `render({ scope, actionScope })`, often for specific regions only
- therefore a generic compiler must not assume that every descendant of a publishing owner automatically sees the manifest projection
- generic projection-path diagnostics are only sound after the publication boundary is compiler-visible

### Rule 4: Projection Is Internal Host-Boundary Data

Manifest projection fields describe the internal host boundary visible to schema fragments running under that host.

They are not automatically page-global published state.

If a host wants to expose external summary state outside its internal host boundary, that still belongs on a narrow published DTO path such as `statusPath`, not on the full manifest projection surface.

## Capability Rules

### Rule 1: Namespace And Method Are Separate Concepts

The manifest stores methods under a capability contract with one namespace.

Schema still dispatches using the normal `namespace:method` string format.

The manifest does not replace that syntax; it validates it.

### Rule 2: Capability Surface Is Explicit

Only methods declared in the manifest are considered stable schema-callable contract.

If the bridge/core has more methods, those remain internal unless explicitly published.

### Rule 3: Result Shape Is Part Of The Contract

Capability result shape matters for chained actions and tooling.

If `designer:exportDocument` returns `{ json: string }`, the manifest should declare that result rather than treating `ActionResult.data` as opaque.

Important boundary:

- result shape is tooling/documentation metadata by default
- compile-time validation can use it for editor hints or branch-result metadata
- `HostCapabilityMethod.result` describes the expected shape of `ActionResult.data`, not the whole chained branch `result` object
- runtime conformance checking is **not** part of the baseline hot-path contract in this document

### Rule 4: Manifest Does Not Override Runtime Ownership

A declared method is not automatically invokable everywhere.

The runtime must still resolve it through the current lexical `ActionScope`.

### Rule 5: Host Manifest Validation Only Owns The Host Family Namespace

The host manifest validates only the namespace published by that host family.

It does not redefine validation for:

- built-in platform actions such as `ajax` or `openDialog`
- component-targeted actions such as `component:submit`
- imported namespaces provisioned through `xui:imports`

Those paths remain owned by `docs/architecture/action-scope-and-imports.md` and the shared schema-diagnostics rules.

### Rule 6: Host Action Validation Requires Capability Publication Attribution

Host action validation is only sound when the compiler can prove that the fragment executes inside the host capability publication boundary.

Important constraint:

- nearest publishing owner discovery alone is insufficient
- explicit action-scope publication boundaries still win
- ambiguous descendants must not be validated as if host capability visibility were guaranteed

## Authoring Contract

### Schema-Level Version Override

At schema level, this design adds at most one host-contract-specific field:

- `xui:version`

Directionally:

```ts
interface BaseSchema {
  'xui:version'?: string;
}
```

Rules:

- `xui:version` is meaningful only on a publishing owner node whose `RendererDefinition` already defines `hostContract`
- `xui:version` overrides the renderer definition's `defaultVersion` selector
- `xui:version` does not change host family
- descendant fragments inherit the resolved family/version context

Representative example:

```json
{
  "type": "designer-page",
  "xui:version": "1.x"
}
```

This keeps schema authoring minimal:

- `type` selects the host family through `RendererDefinition`
- `xui:version` selects the desired contract version for that owner node

### Standalone Fragment Validation Context

Some workflows validate a fragment without its enclosing publishing owner node.

Examples:

- editor-side validation of a toolbar fragment file
- CI validation of an extracted inspector fragment
- docs example verification for host-specific snippets

In those cases, the compiler may accept explicit host context input.

Directionally:

```ts
interface CompileSchemaOptions {
  validation?: {
    hostContractContext?: {
      family: string;
      version: string;
      manifest: HostCapabilityProjectionManifest;
    };
  };
}
```

Meaning:

- this is a compile-time fallback context for standalone fragment validation
- it is used only when no enclosing publishing owner node can establish host contract context through `type`
- callers provide the already resolved manifest explicitly instead of relying on an ambient registry
- it does not replace the normal in-tree inheritance model

### Publisher Declaration

Publishing owner nodes should expose their published family/version through `RendererDefinition.hostContract` plus optional schema-level `xui:version`, not through ambient global state.

Directionally:

- `designer-page` publishes `designer@1.x`
- `report-designer-page` publishes `report-designer@2.x`

The concrete publication carrier must be visible to the compiler from:

1. the publishing owner node's renderer `type`
2. the resolved `RendererDefinition.hostContract`
3. optional node-local `xui:version`

Do not make publisher discovery depend on runtime mounting.

Resolution order:

1. resolve owner renderer definition from node `type`
2. read `RendererDefinition.hostContract` for default family and default version selector
3. if owner node declares `xui:version`, override only the version selector
4. call `resolveManifest(versionSelector)` and require one concrete manifest bundle

## Compiler Responsibilities

The compiler should use the manifest in two phases.

Baseline required for the first implementation slice, but only after capability publication attribution is compiler-visible:

- host-family action validation

Deferred until publication attribution becomes compiler-visible:

- generic projection-path validation for host reads

### 1. Expression Validation

Projection validation is a later slice, not the required v1 baseline.

When this slice lands, the compiler should validate only the portion of expression reads that are proven to execute inside a concrete host projection publication boundary.

This document does **not** redefine the full expression environment.

The full expression environment may still include:

- ordinary lexical scope data through `ScopeRef`
- imported expression helpers such as `$demo`
- chained-action evaluation bindings such as `result`, `error`, and `prevResult`

The manifest layer only validates host-published projection reads.

Required precondition:

- the compiler must know which render boundary actually publishes the host projection for the fragment being validated

Until that attribution is available, hosts may still publish projection contracts for documentation, debugger inspection, and future tooling, but generic compile-time projection-path diagnostics should stay disabled.

Examples:

- `${activeNode.id}` is valid if `activeNode` exists in projection
- `${activeNode.foo.bar}` is invalid if `foo` is not in the published object shape
- `${graphStore.internal.cache}` is invalid if `graphStore` is not a published projection field

Important limitation:

- this is structural path validation, not full value-flow proof
- dynamic map-like or `unknown` regions can still relax validation where declared intentionally
- ordinary non-host lexical scope reads are still governed by the normal compiler/runtime expression rules rather than by the host manifest

### 2. Action Validation

When the compiler sees `designer:addNode`, it should:

1. confirm that the action namespace matches the active host manifest namespace
2. verify that method `addNode` exists
3. validate `args` shape against the method contract
4. optionally expose result shape metadata for chained-action tooling

Important boundary:

- this validation applies only to the active host family namespace
- built-in actions, `component:*`, and imported namespaces continue through their existing validation paths
- this validation is enabled only inside explicit capability publication boundaries

Examples:

- `{ action: 'designer:addNode', args: { nodeType: 'task' } }` fails if `position` is required
- `{ action: 'designer:deleteNode', args: { edgeId: 'x' } }` fails because the arg shape is wrong

## Diagnostics Model

Recommended new diagnostic codes:

- `unknown-host-contract-family`
- `unsupported-host-contract-version`
- `unresolved-host-contract-context`
- `unknown-host-projection-field`
- `invalid-host-projection-path`
- `unknown-host-capability-method`
- `invalid-host-capability-args`
- `host-contract-version-mismatch`

Baseline versus deferred diagnostics:

- baseline implementation should prioritize `unsupported-host-contract-version`, `unresolved-host-contract-context`, `unknown-host-capability-method`, and `invalid-host-capability-args`
- `unknown-host-projection-field` and `invalid-host-projection-path` belong to the later projection-attribution slice

Recommended principles:

- diagnostics point to the exact failing field or action
- host contract mismatch is explicit, not silently downgraded to generic unknown-property noise
- deprecated methods or fields may emit warnings rather than errors according to policy

## Versioning Rules

### Rule 1: Host Contracts Are Semantically Versioned

Every manifest must carry a semver string.

### Rule 2: Schema Declares Compatible Range

Schema should declare the compatible contract version or range it expects.

This allows the compiler and loader to reject obvious mismatches before runtime.

Version-range rule:

- the version selector is a semver-compatible range string interpreted by the loader/compiler-supplied manifest resolver
- this document does not create a second custom range grammar
- the selector is resolved by the publishing owner's manifest resolver, not by a hidden ambient registry

### Rule 3: Deprecation Is First-Class

If a projection path or capability method is being replaced, the manifest should declare:

- that it is deprecated
- what the replacement is when known

### Rule 4: Family Rename Is A Breaking Change

If `designer` becomes `workflow-designer`, that is not a soft alias in the manifest layer.

Treat it as a breaking contract family change, even if runtime temporarily supports compatibility aliases.

## Runtime Responsibilities

The runtime remains intentionally narrow.

It should:

- register and resolve namespaced providers through `ActionScope`
- publish host projection through `useHostScope` or equivalent
- optionally expose the active manifest for debugger/tooling inspection

It should not:

- reinterpret manifest shape on every dispatch hot path
- use manifest presence as a substitute for lexical scope ownership
- allow manifest-defined methods to bypass provider registration

In other words:

- manifest is compiler/tooling truth
- provider registration is runtime execution truth

Both must agree, but they serve different phases.

If a product wants runtime result-conformance checks for debugging, that should be a separate non-hot-path diagnostics mode, not the default runtime contract.

## Recommended Package Placement

Recommended ownership split:

- `packages/flux-core/src/schema-diagnostics/` or a nearby dependency-safe shared contract area for manifest envelope types, manifest resolution contracts, and the reused structural shape types
- `packages/flux-compiler/src/schema-compiler/` for compiler validation against manifests
- domain renderer packages such as `flow-designer-renderers` and `report-designer-renderers` for manifest publication of their host families

Shape ownership split:

- the manifest envelope types and reused structural shape contract should live in the same dependency-safe shared layer
- compiler traversal, diagnostics emission, and resolution flow stay in `flux-compiler`

Do not bury manifest definitions only inside React page renderers.

They are platform contracts, not local component implementation details.

## Compiler Integration Contract

Manifest resolution starts from renderer `type`, not from a free-floating host declaration field.

Rules:

- during normal tree compilation, the compiler resolves the publishing owner node's `RendererDefinition`
- the owner renderer definition provides the family, default version selector, and manifest resolution entry
- standalone fragment workflows may provide `hostContractContext` explicitly when no publishing owner node is present
- host-family action validation additionally requires compiler-visible capability publication attribution
- do not introduce an ambient global manifest registry

This keeps the design aligned with `schema-file-validator.md`:

- no hidden global switch
- no hidden global registry
- explicit per-call context only for true standalone validation cases

### Manifest Publication Model

First-party host families should publish reusable manifest bundles alongside their owner renderer definitions through normal package exports.

But those exports are compiler/runtime dependency inputs, not an ambient runtime authority.

Directionally:

- renderer packages may export a manifest catalog or resolver helper for their host family
- `RendererDefinition.hostContract` points to that local resolution entry
- the compiler consumes the resolved bundle for the current compile call only

## Relationship To `xui:imports`

`xui:imports` remains the dynamic capability provisioning mechanism.

The manifest layer is not a replacement for it.

The clean split is:

- host manifest = stable contract for shipped host families
- `xui:imports` = dynamic provisioning path for extra namespaces/helpers

Validation split:

- host manifest validation only applies to the active host family namespace
- imported namespaces keep using the `xui:imports` and namespace-validator path from `schema-file-validator.md`

If an imported namespace becomes stable enough to be platform-governed, it may later graduate into a manifest-published host or library contract.

Do not force ephemeral imported libraries into the manifest system too early.

## Relationship To Component Handles

Component handles remain instance-targeted runtime capability lookup.

Usually they do not need a host manifest.

However, if a component-handle family becomes a broad schema-facing standard surface, a lighter manifest pattern may be introduced later for that family.

For now, keep this document focused on host/domain workbench contracts.

## Representative Example: Designer

Directionally:

```ts
const designerManifest: HostCapabilityProjectionManifest = {
  family: 'designer',
  version: '1.0.0',
  projection: {
    fields: {
      doc: {
        schema: {
          kind: 'object',
          fields: {
            id: { kind: 'string' },
            nodes: { kind: 'array', item: { kind: 'unknown' } },
            edges: { kind: 'array', item: { kind: 'unknown' } },
          },
        },
      },
      selection: {
        schema: {
          kind: 'object',
          fields: {
            selectedNodeIds: { kind: 'array', item: { kind: 'string' } },
            selectedEdgeIds: { kind: 'array', item: { kind: 'string' } },
          },
        },
      },
      activeNode: {
        schema: {
          kind: 'union',
          anyOf: [
            { kind: 'null' },
            {
              kind: 'object',
              fields: {
                id: { kind: 'string' },
                type: { kind: 'string' },
                data: { kind: 'unknown' },
              },
            },
          ],
        },
      },
      runtime: {
        schema: {
          kind: 'object',
          fields: {
            canUndo: { kind: 'boolean' },
            canRedo: { kind: 'boolean' },
            dirty: { kind: 'boolean' },
          },
        },
      },
    },
  },
  capabilities: {
    namespace: 'designer',
    methods: {
      addNode: {
        args: {
          kind: 'object',
          fields: {
            nodeType: { kind: 'string' },
            position: {
              kind: 'object',
              fields: {
                x: { kind: 'number' },
                y: { kind: 'number' },
              },
            },
            data: { kind: 'unknown' },
          },
          optional: ['data'],
        },
        result: {
          kind: 'object',
          fields: {
            nodeId: { kind: 'string' },
          },
        },
      },
      updateNodeData: {
        args: {
          kind: 'object',
          fields: {
            nodeId: { kind: 'string' },
            data: { kind: 'object', fields: {} },
          },
        },
      },
    },
  },
};
```

This does not require the runtime to execute through the manifest.

`designer-page` still registers a runtime provider through `ActionScope`.

The manifest just lets tools know what `designer` means.

## Representative Example: Report Designer

`report-designer` can publish:

- projection: `selectionTarget`, `fieldSources`, `preview`, `runtime`, `activeSheet`
- capabilities: `preview`, `save`, `setSelectionTarget`, `insertField`

The manifest lets the compiler validate that `report-designer:preview` takes the documented args shape.

Projection-path validation remains narrower:

- generic projection-path diagnostics are only sound after projection publication attribution is compiler-visible
- until that attribution exists, projection fields remain documented contract and future-tooling input, not a universally enabled compile-time path validator

## Loader And CI Use

The loader should be able to validate a schema bundle against declared host contracts without mounting the app.

Recommended flow:

```text
schema file
  -> parse
  -> resolve publishing owner nodes by renderer type
  -> read family + default version selector + `resolveManifest(...)` from renderer definition
  -> apply optional `xui:version` override on owner node
  -> resolve one concrete manifest bundle through the owner-local resolver
  -> confirm the fragment executes inside a compiler-visible capability publication boundary
  -> for standalone fragment validation, use explicit `hostContractContext` if needed
  -> validate actions against manifest contracts
  -> validate projection paths only where projection publication attribution is compiler-visible
  -> compile final execution schema
```

This gives the platform a real import gate for host contract compatibility.

## Security And Governance

The manifest layer improves governance in four ways:

1. it narrows schema-visible host surface deliberately
2. it makes breaking host changes explicit through versioning
3. it makes CI validation possible before runtime
4. it gives debugger/editor tooling a stable contract to inspect

But it does not replace runtime security boundaries.

The host must still control:

- which manifest families are available
- which host renderers may publish them
- which runtime namespaces are actually registered

## Rollout Strategy

Recommended rollout order:

1. define manifest envelope types, manifest resolution contracts, and reused shape types in a dependency-safe shared contract area
2. add optional `hostContract` metadata plus owner-local manifest resolution to publishing owner `RendererDefinition`s
3. add compiler-visible capability publication attribution for host-owned regions or owner subtrees
4. add schema-level `xui:version` override on publishing owner nodes
5. wire standalone fragment validation to accept explicit `hostContractContext`
6. implement compiler diagnostics for host-family action validation first
7. publish one first-party manifest family end to end
8. wire CI/schema validation tooling to require contract resolution for host-owned pages
9. add compiler-visible projection publication attribution for host-owned regions or owner subtrees
10. add projection-path validation for host projection reads

Why this order:

- action validation gives immediate value with lower ambiguity
- projection-path validation is useful but needs publication attribution and more careful unknown/dynamic-shape escape hatches

## Tooling Consumption Path

### Standard Resolution Rule

All tools (editor, debugger, docs export) should consume host manifests through the same resolution path:

1. Given a renderer definition with `hostContract`
2. Read `family`, `defaultVersion`, and `resolveManifest(...)` from `hostContract`
3. Use a schema-provided `xui:version` or fall back to `defaultVersion`
4. Resolve one concrete `HostCapabilityProjectionManifest`

This path is codified in `resolveHostContractManifest(definition, versionSelector?)` from `packages/flux-core/src/types/renderer-authoring-contract.ts`.

The full tooling adapter `resolveRendererAuthoringContract(definition, versionSelector?)` resolves the manifest and assembles a `ResolvedAuthoringContract` containing:

- `hostProjection` — the projection contract fields
- `hostActions` — capability methods adapted to `CapabilityMethodContract` shape
- `hostManifest` — the full resolved manifest for tools that need family, version, or compatibility metadata

### Standalone Fragment Fallback

When no renderer definition is available (standalone fragment validation, CI validation of extracted fragments), tools must provide an explicit `HostContractContext` containing an already-resolved manifest. The standard resolution path cannot be used because there is no renderer definition to start from.

### What Not To Do

- Do not introduce a global host manifest registry.
- Do not resolve manifests from ambient process state.
- Do not duplicate the resolution logic in each tool. Use the shared `resolveHostContractManifest` or `resolveRendererAuthoringContract` helper.

## Decisions

The active decisions from this document are:

- add a static manifest layer for host projection and capability contracts
- keep runtime bridge wiring and static manifest publication separate
- resolve manifest versions through renderer-owned contract metadata, not a hidden ambient registry
- validate namespaced host action payloads against capability contracts only inside compiler-visible host capability publication boundaries
- defer generic projection-path diagnostics until host projection publication boundaries are compiler-visible
- version host contracts explicitly and let schema declare compatible ranges
- keep lexical runtime visibility and ownership rules unchanged; manifests validate contract, they do not grant authority
- treat first-party complex hosts as the primary owners of this system, not every ordinary renderer or component handle
- tooling consumption uses the shared `resolveHostContractManifest` / `resolveRendererAuthoringContract` path, not ad hoc resolution in each tool

## Related Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/schema-file-validator.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/report-designer/design.md`
