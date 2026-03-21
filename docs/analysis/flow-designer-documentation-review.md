# Flow Designer Documentation Review

## Purpose

This document records the parts of the original Flow Designer review that still hold after re-reading the active design set and tightening the architecture docs.

It is not the source of truth for runtime contracts. Treat it as a validated review note that explains which concerns were real, how they were resolved in the docs, and which areas remain intentionally open.

## Reviewed Documents

- `docs/architecture/flow-designer/README.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`

## Confirmed Conclusions

### 1. `@xyflow/react` must stay an adapter, not a second source of truth

This concern was valid.

- The original docs already said the graph runtime should own graph editing behavior, but they did not define which canvas state may live only inside `@xyflow/react` and which state must round-trip through designer actions.
- The corrected baseline is now: document structure, viewport, selection, active target, history, dirty state, and validation-relevant graph state belong to the Flow Designer runtime; gesture-local canvas details such as pointer capture, connection preview, and DOM measurement may stay inside the canvas adapter.
- `onNodesChange`, `onEdgesChange`, `onConnect`, and selection callbacks should be normalized into `designer:*` actions or bridge commands instead of mutating graph state directly.
- Loop avoidance is a design requirement: the canvas consumes runtime snapshots, emits normalized changes, and must ignore no-op or self-originated patches.

Recorded in:

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`

### 2. Graph runtime and schema runtime need an explicit bridge contract

This concern was valid.

- The previous docs correctly required graph runtime state and schema runtime state to stay separate, but they did not define the bridge clearly enough.
- The accepted contract is read-mostly from schema fragments: inspector, toolbar, dialogs, and other schema regions read designer snapshots from the fixed host scope and write back only through `designer:*` actions or a bridge dispatch API.
- Schema fragments must not write graph store state directly.
- The bridge should expose stable snapshot reads plus a constrained dispatch/event surface, instead of leaking the full graph store into schema expressions or renderer props.

Recorded in:

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`

### 3. Version migration needed a real protocol, not just a placeholder function

This concern was valid.

- `version` already existed on `GraphDocument` and `DesignerConfig`, and `migrateDesignerDocument()` was already named in the API draft.
- What was missing was the migration chain contract, registration shape, and failure behavior.
- The accepted baseline is sequential `from -> to` migration with a registry, structured migration failures, and a caller-visible decision point between refusing to load and degrading to read-only mode.

Recorded in:

- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`

### 4. Composite modeling is a real future pressure, but not a v1 hard contract

The original concern was directionally correct, but it needed narrowing.

- It is true that workflow and state-machine editors often grow group nodes, subprocess nodes, and nested documents.
- However, the active docs still describe a flat `GraphDocument` model, and there is not enough current evidence to standardize a nested document format yet.
- The validated conclusion is therefore narrower: v1 must not block future composite modeling, but the docs should describe it as a reserved extension area rather than pretending it is already specified.

Recorded in:

- `docs/architecture/flow-designer/config-schema.md`

### 5. Permission and rule expressions needed a stable scope whitelist

This concern was valid.

- Expression strings appear in permissions and connection rules, so they need a predictable evaluation context.
- The corrected baseline is to compile these expressions during config normalization and evaluate them against a documented, narrow whitelist of inputs such as `doc`, `selection`, `runtime`, `node`, `edge`, `nodeType`, `edgeType`, and connection candidate objects when relevant.
- The environment should not expose arbitrary mutable runtime internals to formula expressions.
- Expression failures should resolve through structured diagnostics rather than silently changing graph state.

Recorded in:

- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`

### 6. Action coverage and transaction semantics needed to be more explicit

This concern was valid, but the exact action names needed refinement.

- The original docs had a useful base action set, but they did not cover batched updates, drag aggregation, or explicit transaction boundaries well enough.
- The accepted direction is not "copy every suggested action name literally"; it is to require first-class support for batch update, move, selection, and transaction/commit semantics so complex interactions can share one history pipeline.
- Whether selection is exposed as `designer:selectNode` or a broader `designer:setSelection` is a secondary naming decision. The important contract is that programmatic selection and multi-target updates are supported.

Recorded in:

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`

### 7. Undo/redo storage format stays flexible, but transaction boundaries are mandatory

This concern was partially valid and required refinement.

- The earlier recommendation asked the docs to choose between snapshot and patch history immediately.
- After review, the stronger conclusion is: transaction boundaries and operation merging are the real hard contract, while patch-vs-snapshot storage may remain an implementation choice per operation class.
- Dragging, auto layout, and batch delete must collapse into a single logical history entry even if they generate many intermediate internal updates.

Recorded in:

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`

### 8. Performance guidance needed executable structure, not only principles

This concern was valid.

- The previous docs already mentioned compile/cache/incremental-update priorities, but they did not say enough about the data structures needed to uphold them.
- The corrected baseline now calls out normalized indexes, adjacency lookup, structural sharing, selector-scoped subscriptions, and lazy expensive work.
- Large graphs are now treated explicitly as a stress case that must have documented degradation strategies instead of being ignored.

Recorded in:

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`

### 9. Extension points need both commands and observable lifecycle/events

This concern was valid.

- Action-only extensibility is not enough for auditing, synchronization, analytics, or host-level reactions.
- The docs now need a minimal event model plus lifecycle hooks around create, connect, delete, selection, document change, and validation failure.
- Hooks may block or rewrite the action input only where the docs say so; passive observation remains a separate event concern.

Recorded in:

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`

### 10. Error handling, test layering, and end-to-end examples were genuinely underspecified

This concern was valid.

- The original flow-designer docs focused on structure and omitted error classes, failure surfaces, and test boundaries.
- The corrected baseline separates config/migration/expression/graph-action/render integration failures, and it distinguishes core pure-state tests from renderer integration tests.
- Examples should cover at least one full workflow that includes document data, node types, connection rules, inspector usage, and action wiring.

Recorded in:

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`

## Narrowed Or Deferred Points

### Composite nodes remain an extension area

- The review did not confirm enough current design material to standardize subprocess or nested-document contracts now.
- The docs should preserve space for them, but not claim a finished model.

### History storage format is still intentionally open

- The review did not establish that patch-only or snapshot-only history is always correct.
- What is fixed is the need for operation grouping, transaction semantics, and stable undo/redo behavior.

## Resulting Documentation Direction

The final validated direction is:

- keep Flow Designer as a `SchemaRenderer` domain extension, not a second rendering engine
- make graph runtime the only source of truth for graph-editing state
- let schema fragments read designer state through a fixed host scope and write only through `designer:*` actions
- normalize canvas-library callbacks into graph actions
- document migration, expression scope, transaction/history, event hooks, and large-graph constraints explicitly

## Related Documents

- `docs/architecture/flow-designer/README.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/flow-designer/api.md`
