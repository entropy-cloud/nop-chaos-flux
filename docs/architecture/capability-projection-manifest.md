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
- ordinary in-tree consumers inherit host contract context from the nearest publishing owner node

#### Inheritance Rule

When a fragment is compiled as part of the same schema tree under a publishing owner node, the active host contract is inherited from the nearest publisher.

When a fragment is compiled standalone or validated out of context, the host contract context may be supplied through explicit compiler input.

That keeps the current lexical host-boundary model intact without requiring fragment-local family declarations.

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
    manifest: HostCapabilityProjectionManifest;
  };
}
```

Rules:

- only publishing owner renderers should define `hostContract`
- child fragments do not repeat host family by default
- the renderer `type` chooses the default host family contract
- schema may override only the version, not the family, unless a future owner doc introduces a stronger reason

## Shape Language

This document does **not** introduce a second independent structural type system.

The manifest must reuse the compiler-owned structural shape contract owned by the schema-diagnostics family described in `docs/architecture/schema-file-validator.md`.

Rules:

- manifest shapes are compiler/tooling shapes, not author-visible Flux primitives
- shape ownership belongs with schema diagnostics, not with host runtime wiring
- the concrete exported TypeScript type should live with the compiler-owned diagnostics contracts, not in ad hoc host packages

Required capabilities of that reused shape contract:

- primitive scalar kinds
- object fields plus optional keys
- array item shape
- enum/literal values
- union-like alternatives
- `unknown` escape hatch for intentionally broad payloads

This document uses `FluxValueShape` directionally only as a placeholder name for that reused compiler-owned shape contract.

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
- `xui:version` overrides the renderer definition's `defaultVersion`
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
interface CompileSchemaValidationOptions {
  hostContractContext?: {
    family: string;
    version: string;
  };
}
```

Meaning:

- this is a compile-time fallback context for standalone fragment validation
- it is used only when no enclosing publishing owner node can establish host contract context through `type`
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
2. read `RendererDefinition.hostContract` for default family/version/manifest
3. if owner node declares `xui:version`, override only the version

## Compiler Responsibilities

The compiler should use the manifest in two places.

### 1. Expression Validation

When a schema fragment is validated inside a resolved host boundary, the compiler should validate only the portion of expression reads that claim to come from the host-published projection contract.

This document does **not** redefine the full expression environment.

The full expression environment may still include:

- ordinary lexical scope data through `ScopeRef`
- imported expression helpers such as `$demo`
- chained-action evaluation bindings such as `result`, `error`, and `prevResult`

The manifest layer only validates host-published projection reads.

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

1. resolve the namespace family for the current host manifest
2. verify that method `addNode` exists
3. validate `args` shape against the method contract
4. optionally expose result shape metadata for chained-action tooling

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

- `packages/flux-core/src/workbench/` or a nearby contract area for manifest envelope types and pure manifest helpers
- `packages/flux-runtime/src/schema-compiler/` for compiler validation against manifests
- domain renderer packages such as `flow-designer-renderers` and `report-designer-renderers` for manifest publication of their host families

Shape ownership split:

- the manifest envelope types live with host/workbench contract types
- the reused structural shape type lives with compiler/schema-diagnostics ownership

Do not bury manifest definitions only inside React page renderers.

They are platform contracts, not local component implementation details.

## Compiler Integration Contract

Manifest resolution starts from renderer `type`, not from a free-floating host declaration field.

Rules:

- during normal tree compilation, the compiler resolves the publishing owner node's `RendererDefinition`
- the owner renderer definition provides the default host contract metadata
- standalone fragment workflows may provide `hostContractContext` explicitly when no publishing owner node is present
- do not introduce an ambient global manifest registry

This keeps the design aligned with `schema-file-validator.md`:

- no hidden global switch
- no hidden global registry
- explicit per-call context only for true standalone validation cases

### Manifest Publication Model

First-party host families should publish reusable manifest bundles alongside their owner renderer definitions through normal package exports.

But those exports are compiler/runtime dependency inputs, not an ambient runtime authority.

## Relationship To `xui:imports`

`xui:imports` remains the dynamic capability provisioning mechanism.

The manifest layer is not a replacement for it.

The clean split is:

- host manifest = stable contract for shipped host families
- `xui:imports` = dynamic provisioning path for extra namespaces/helpers

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
      doc: { schema: { kind: 'object', fields: { id: { kind: 'string' }, nodes: { kind: 'array', item: { kind: 'unknown' } }, edges: { kind: 'array', item: { kind: 'unknown' } } } } },
      selection: { schema: { kind: 'object', fields: { selectedNodeIds: { kind: 'array', item: { kind: 'string' } }, selectedEdgeIds: { kind: 'array', item: { kind: 'string' } } } } },
      activeNode: { schema: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: { id: { kind: 'string' }, type: { kind: 'string' }, data: { kind: 'unknown' } } }] } },
      runtime: { schema: { kind: 'object', fields: { canUndo: { kind: 'boolean' }, canRedo: { kind: 'boolean' }, dirty: { kind: 'boolean' } } } }
    }
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
                y: { kind: 'number' }
              }
            },
            data: { kind: 'unknown' }
          },
          optional: ['data']
        },
        result: {
          kind: 'object',
          fields: {
            nodeId: { kind: 'string' }
          }
        }
      },
      updateNodeData: {
        args: {
          kind: 'object',
          fields: {
            nodeId: { kind: 'string' },
            data: { kind: 'object', fields: {} }
          }
        }
      }
    }
  }
};
```

This does not require the runtime to execute through the manifest.

`designer-page` still registers a runtime provider through `ActionScope`.

The manifest just lets tools know what `designer` means.

## Representative Example: Report Designer

`report-designer` can publish:

- projection: `selectionTarget`, `fieldSources`, `preview`, `runtime`, `activeSheet`
- capabilities: `preview`, `save`, `setSelectionTarget`, `insertField`

The manifest lets the compiler validate that `${fieldSources[0].name}` is a valid projection path and that `report-designer:preview` takes the documented args shape.

## Loader And CI Use

The loader should be able to validate a schema bundle against declared host contracts without mounting the app.

Recommended flow:

```text
schema file
  -> parse
  -> resolve publishing owner nodes by renderer type
  -> read default host contract from renderer definition
  -> apply optional `xui:version` override on owner node
  -> for standalone fragment validation, use explicit `hostContractContext` if needed
  -> validate expressions and actions against manifest contracts
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

1. define manifest types and shape helpers in a core contract area
2. add optional `hostContract` metadata to publishing owner `RendererDefinition`s
3. implement compiler diagnostics for action validation first
4. add projection-path validation for host projection reads
5. add schema-level `xui:version` override on publishing owner nodes
6. wire standalone fragment validation to accept explicit `hostContractContext`
7. publish first-party manifests for `designer`, `spreadsheet`, `report-designer`, and `word-editor`
8. wire CI/schema validation tooling to require contract resolution for host-owned pages

Why this order:

- action validation gives immediate value with lower ambiguity
- projection-path validation is useful but needs more careful unknown/dynamic-shape escape hatches

## Decisions

The active decisions from this document are:

- add a static manifest layer for host projection and capability contracts
- keep runtime bridge wiring and static manifest publication separate
- validate `${expr}` host reads against projection contracts when a host contract is declared
- validate namespaced host action payloads against capability contracts when a host contract is declared
- version host contracts explicitly and let schema declare compatible ranges
- keep lexical runtime visibility and ownership rules unchanged; manifests validate contract, they do not grant authority
- treat first-party complex hosts as the primary owners of this system, not every ordinary renderer or component handle

## Related Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/schema-file-validator.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/report-designer/design.md`
