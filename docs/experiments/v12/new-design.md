# Next-Generation Frontend Programming Model for Low-Code

Status: draft-2, intentionally authored without reading any project source or documentation

## 1. Design Goal

This document defines a frontend programming model built for low-code systems first, rather than adapting a hand-code-first UI framework into low-code after the fact.

The target is not a better form library, a better component tree, or a better state store. The target is a new executable model where:

- business structure is the primary abstraction,
- UI is one projection of that structure,
- data, validation, visibility, actions, and async effects share the same runtime semantics,
- low-code schemas remain declarative even for highly dynamic behavior,
- composition scales from field-level interactions to large application graphs.

The model must exceed current low-code and frontend systems by removing four historical mismatches:

- component tree vs business structure mismatch,
- local state vs domain state mismatch,
- imperative event wiring vs declarative intent mismatch,
- validation/render/action/runtime split-brain.

## 2. Core Thesis

The fundamental unit of frontend programming should not be the component.

It should be the **interactive semantic node**.

An application is a graph of semantic nodes. Each node declares:

- what value it owns or projects,
- what contract it exposes,
- what participation rules govern it,
- what intents it can emit or handle,
- what projections can materialize it.

Rendering is a projection of the graph, not the graph itself.

## 3. The Seven Core Primitives

### 3.1 `Cell`

The smallest stable semantic unit.

A `Cell` is not just state. It is a typed value slot with lifecycle, provenance, revision history, participation state, and constraints.

Each `Cell` has:

- `value`: current semantic value,
- `shape`: type contract,
- `status`: clean, dirty, pending, invalid, disabled, hidden, detached,
- `origin`: default, user, computed, remote, restored,
- `confidence`: certain, optimistic, provisional,
- `revision`: monotonic change stamp,
- `issues`: normalized diagnostics,
- `meta`: labels, hints, permissions, presentation signals.

`Cell` replaces the split between state atom, form field state, validation holder, and loading holder.

### 3.2 `Lens`

A `Lens` is a typed navigable path from one semantic structure into another.

It is used to project nested business structures without losing identity.

Examples:

- record field lens: `customer.name`
- collection item lens: `items[id=42]`
- variant active branch lens: `payment#card`
- computed lens: `order.total`

Every interaction in the system targets a `Lens`, not a raw path string.

This gives:

- structural identity,
- refactorable references,
- stable dependency tracking,
- branch-aware validation and rendering.

### 3.3 `Shape`

`Shape` defines the semantic type of a value, but unlike classical type systems it includes runtime participation semantics.

Base shapes:

- scalar
- record
- collection
- variant
- relation
- resource
- expression
- command

Each shape declares:

- value structure,
- empty semantics,
- equality semantics,
- merge semantics,
- validation protocol,
- patch protocol,
- projection hints.

`Shape` replaces the artificial gap between schema, runtime type, and renderer contract.

### 3.4 `Guard`

`Guard` is the universal participation primitive.

It decides whether a node is:

- present,
- visible,
- enabled,
- required,
- writable,
- submittable,
- validatable,
- serializable.

Instead of scattered booleans like `visibleOn`, `disabledOn`, `requiredOn`, the model treats participation as a vector derived from one rule family.

This is critical for low-code, because real systems need consistent behavior across rendering, validation, serialization, and backend submission.

### 3.5 `Rule`

`Rule` is a pure derivation from graph state to graph state meaning.

Kinds of rules:

- derive value,
- derive participation,
- derive diagnostics,
- derive options,
- derive layout hints,
- derive intent routing.

Rules are pure, replayable, inspectable, and cacheable.

A rule never performs side effects.

### 3.6 `Intent`

`Intent` is the only way behavior enters the system.

Examples:

- `set-value`
- `focus`
- `append-item`
- `switch-variant`
- `validate`
- `submit`
- `load-resource`
- `invoke-command`

An intent is not an event callback. It is a semantic request.

Each intent goes through:

1. normalization,
2. authorization,
3. transaction planning,
4. rule recomputation,
5. effect scheduling,
6. projection invalidation.

### 3.7 `Projection`

`Projection` materializes semantic nodes into concrete artifacts.

Projection targets may include:

- visual UI,
- submission payload,
- analytics event,
- accessibility tree,
- collaboration delta,
- debugger view,
- test API,
- offline snapshot.

This makes UI only one of many outputs from the same semantic runtime.

## 4. The Three Derived Structural Primitives

### 4.1 `Record`

A named product of child nodes.

Properties:

- stable field identity,
- independent field participation,
- aggregate diagnostics,
- partial serialization,
- patch-aware merging.

### 4.2 `Collection`

An ordered or keyed set of homogeneous or polymorphic entries.

Properties:

- stable item identity separate from visual index,
- insertion and deletion as first-class intents,
- collection-level constraints,
- incremental validation and rendering,
- virtualization-compatible projection.

### 4.3 `Variant`

A discriminated semantic sum type.

This is not just conditional rendering. It is branch-governed state.

Properties:

- explicit discriminator,
- branch-local schema,
- inactive branch retention policy,
- branch switch migration policy,
- branch-specific validation and serialization.

`Variant` is elevated to a core structural primitive because low-code systems constantly model dynamic forms, conditional business records, workflow nodes, and polymorphic lists.

## 5. The Execution Model

The design only matters if it can be executed deterministically. This section defines the minimum executable kernel.

## 5.0 Minimal Kernel

The runtime kernel is the tuple:

- `Graph`: the persistent semantic node graph,
- `Owner`: edit-session and commit boundary,
- `Lens`: canonical address into the graph,
- `Rule`: pure derivation unit,
- `Intent`: semantic input request,
- `Transaction`: atomic semantic transition,
- `Projection`: materialization target.

Everything else is layered on top.

This means:

- `Form` is an `Owner` specialized for record editing,
- `Command` is a typed named `Intent` template,
- `ResourceCell` is a `Cell` whose value contract is fulfilled by effect-backed loading,
- fields are projections over lenses, not primitive runtime owners.

## 5.1 Semantic Graph, Not Component Tree

The runtime maintains a semantic graph.

Nodes are keyed by semantic identity, not render order.

A visual tree is generated by projection from the graph. Multiple visual trees can coexist over the same semantic graph.

Consequences:

- one business node can appear in multiple synchronized views,
- form logic is independent from page layout,
- drag/drop, tabs, wizards, and inspectors no longer require state hoisting hacks,
- collaborative and debugger views become native.

## 5.1.1 Node Identity Contract

Every node has a stable identity:

- `nodeId`: globally unique semantic ID,
- `ownerId`: the nearest owner boundary,
- `shapeId`: the declared shape contract,
- `instanceId`: repeated-instance identity for collection entries or branch instances.

Identity is never derived from render order.

The canonical address of a runtime value is:

`ownerId :: lens(instanceId-aware path)`

This is the address recorded in diagnostics, audit logs, rule dependencies, collaboration deltas, and server error mappings.

## 5.1.2 Ownership Contract

Every subgraph lives under exactly one effective owner.

Owner modes:

- `inherit-owner`: child changes belong to the nearest ancestor owner,
- `create-owner`: child becomes its own draft/commit boundary,
- `reference-owner`: child is edited through a foreign owner without rebasing ownership.

Without this contract, nested forms and independently saveable object fields are impossible to implement correctly.

## 5.2 Transactions

Every intent executes inside a transaction.

A transaction has:

- cause,
- target lens,
- optimistic patch,
- recomputation frontier,
- effect plan,
- commit result.

Transactions allow:

- deterministic replay,
- undo/redo,
- async optimism,
- conflict inspection,
- audit history.

## 5.2.1 Transaction Phases

Each transaction executes these phases in order:

1. `normalize`: convert raw UI or external input into a typed intent payload,
2. `authorize`: check permissions, participation, and command policies,
3. `plan`: expand the intent into candidate graph patches and effect proposals,
4. `apply`: apply optimistic graph patch to the targeted owner draft,
5. `recompute`: evaluate impacted rules to a fixed point,
6. `diagnose`: attach normalized issues,
7. `seal`: derive transaction outputs such as changed projections and effect queue,
8. `commit`: persist owner-level accepted state if the intent requires commit semantics.

Only `plan` may propose effects. Only `apply` may change graph state. Only `recompute` may update derived values.

## 5.2.2 Determinism Contract

For deterministic replay, a transaction must capture:

- transaction ID,
- actor and source channel,
- runtime version,
- schema version,
- target lens,
- normalized intent payload,
- before and after patch,
- rule IDs evaluated,
- issues added or removed,
- effects proposed and effects resolved.

If any of these are omitted, replay becomes approximate rather than authoritative.

## 5.3 Reactive Evaluation by Dependency Slices

Rules are compiled into dependency slices over lenses.

Instead of rerendering components or recomputing broad selector trees, the runtime recomputes only semantic slices touched by a transaction.

This produces better scaling for large low-code screens with hundreds or thousands of fields.

## 5.3.1 Rule Contract

A rule is defined by:

- `ruleId`,
- `reads`: the lenses or lens patterns it depends on,
- `guard`: when the rule is active,
- `compute`: pure function from current semantic slice to derived outputs,
- `writes`: the specific derived targets it may set,
- `stability`: equality semantics for change detection.

A rule may read:

- exact lenses,
- owner aggregates,
- collection wildcard slices,
- active branch slices,
- resource snapshots.

A rule may not:

- perform I/O,
- read wall clock directly,
- mutate arbitrary nodes,
- depend on projection-local state.

## 5.3.2 Cycles and Fixpoint

Rule writes form a derived dependency graph.

The system permits only:

- acyclic derivation graphs, or
- explicitly declared fixpoint groups with monotonic convergence semantics.

If a rule set creates a non-convergent cycle, schema validation must reject it before runtime activation.

## 5.3.3 Wildcard Dependency Semantics

Wildcard reads such as collection aggregates are legal but must declare their scope:

- `items[*].price` means value-sensitive item aggregation,
- `items[count]` means structure-sensitive aggregation,
- `payment#active.*` means active-branch-only dependency.

This is necessary for scalable invalidation on large dynamic screens.

## 5.4 Effects as Planned Consequences

Effects are not embedded inside render or rule logic.

An effect is produced by the transaction planner and executed by capability adapters.

Examples:

- network fetch,
- file upload,
- clipboard write,
- navigation,
- modal open,
- timer,
- remote validation.

Effects can be simulated, rejected, retried, or audited.

## 5.4.1 Capability Adapters

Effects are executed only by named capability adapters:

- `http`,
- `navigation`,
- `dialog`,
- `clipboard`,
- `storage`,
- `timer`,
- `worker`,
- `custom`.

An effect proposal that targets an unavailable capability must fail predictably at planning or execution time according to owner policy.

## 5.4.2 Effect Result Re-entry

Effects never mutate the graph directly.

All effect results re-enter as new intents, for example:

- `resource-loaded`,
- `submit-succeeded`,
- `submit-failed`,
- `dialog-confirmed`.

This keeps the semantic model single-threaded at the intent boundary.

## 5.5 Authoring Boundary

To prevent the low-code schema from silently turning into an unbounded programming language, authoring must stay within these layers:

- declarative graph construction,
- declarative rule wiring,
- declarative command declaration,
- declarative projection configuration,
- capability-backed extension points.

Escape hatches may exist, but are always explicit foreign functions with declared inputs and outputs. They are never mixed invisibly into rule bodies.

## 5.6 Modules and Reuse

Serious low-code systems require reusable semantic modules.

A module defines:

- exported shapes,
- exported graph fragments,
- exported commands,
- exported projection recipes,
- required imports,
- parameter slots,
- extension hooks,
- version contract.

Module composition rules:

- imports are explicit,
- name rebasing is deterministic,
- overrides are structural rather than text-based,
- downstream modules may extend projections without mutating semantic ownership,
- upgrades must be schema-diffable.

## 5.7 Explainability API

Every runtime decision must be explainable through machine-readable APIs.

Required explain queries:

- why is this node hidden,
- why is this node disabled,
- why is this node invalid,
- why is this command unavailable,
- why did this value change,
- which rule depends on this lens,
- which submit slice includes this node,
- which owner currently controls this node.

No claim of superiority is credible without this capability.

## 6. Authoring Model

Low-code authors should not directly author render trees. They author semantic graphs with optional projections.

Authoring layers:

1. semantic layer: shapes, cells, variants, records, collections,
2. rule layer: participation, derivation, diagnostics, options,
3. intent layer: commands and action policies,
4. projection layer: page regions, widgets, layout,
5. experience layer: themes, transitions, collaboration, analytics.

This layered model prevents the classic low-code failure mode where business logic leaks into widget props.

## 7. Form as a First-Class Semantic Protocol

A form is not a container of inputs.

A form is a transaction-scoped semantic protocol over a record graph.

The form protocol defines:

- edit session lifetime,
- dirty tracking,
- issue accumulation,
- staged vs committed values,
- validation timing,
- submission serialization,
- optimistic submit and rollback,
- recovery from partial remote failures.

### 7.1 Form Primitive

`Form<RecordShape>` is a semantic boundary with:

- `draft`: editable graph,
- `baseline`: comparison graph,
- `policy`: validate/submit/reset rules,
- `channels`: local, remote, collaborative,
- `result`: last submit state.

### 7.1.1 Owner Semantics

Every form is an owner.

It defines:

- `draftGraph`: mutable semantic slice under active edit,
- `baselineGraph`: comparison slice for dirty computation,
- `commitGraph`: last acknowledged committed slice,
- `submitPolicy`: which slices and issues gate submit,
- `childOwnerPolicy`: whether child owners bubble status or must commit independently.

### 7.1.2 Parent and Child Forms

Parent-child owner contracts must be explicit:

- `embedded`: child draft participates in parent submit,
- `independent`: child requires its own commit before parent submit may reference it,
- `referenced`: parent submits a reference to child committed state only.

This removes ambiguity for nested dialogs, subforms, and editable objects.

### 7.2 Field Participation Matrix

Each field in a form must answer these questions independently:

- Is it mounted?
- Is it visible?
- Is it interactive?
- Is it required?
- Is it dirty-participating?
- Is it validation-participating?
- Is it serialization-participating?
- Is it submit-blocking?

This matrix is derived through `Guard`, never ad hoc.

### 7.2.1 Participation Transition Semantics

Participation state transitions must preserve consistency:

- hidden does not imply detached,
- detached implies non-validating and non-serializing,
- disabled does not imply non-visible,
- required only applies when validatable,
- submit-blocking is derived from issue severity plus submit policy, not from visibility alone.

This avoids the common bug where a hidden field still blocks submit or a disabled field is accidentally serialized.

### 7.3 Validation Model

Validation exists in four layers:

1. shape validation: type and structure,
2. local rule validation: cross-field business logic,
3. async domain validation: server or remote policy,
4. transactional validation: submit-time invariants.

All validation outputs are normalized as issues attached to cells and aggregates.

### 7.4 Submission

Submission serializes only the semantic slice declared by form policy.

This allows:

- partial submits,
- branch-sensitive submits,
- patch submits,
- intent-triggered submits from nested regions,
- multi-step workflow submissions over one graph.

### 7.4.1 Submit Slice Language

Every submit policy resolves to an explicit slice expression.

Supported selectors:

- `owner:/` entire owner graph,
- `dirty:/` dirty nodes under owner,
- `active:/` currently active participation slice,
- `lens:<path>` explicit subtree,
- `union(...)` and `exclude(...)`.

### 7.4.2 Partial Success Contract

Submit responses may be:

- full success,
- partial accept,
- validation reject,
- conflict reject,
- transport failure.

The form runtime must define, for each class:

- baseline update policy,
- issue merge policy,
- local draft preservation policy,
- retryability,
- server-path to lens remapping.

## 8. Variant-Field Design

`variant-field` is a first-class branch node, not a field with hidden children.

### 8.1 Definition

A variant field has:

- discriminator cell,
- branch registry,
- branch state retention policy,
- branch migration policy,
- branch projection strategy.

### 8.1.1 Canonical Addressing

Variant addressing uses these canonical forms:

- discriminator lens: `payment@case`,
- active branch lens: `payment#active`,
- explicit branch lens: `payment#card`,
- field inside branch: `payment#card.cardNo`.

These addresses are stable for diagnostics, migration rules, and audit logs.

### 8.2 Required Policies

Every variant field must declare or inherit answers to:

- What is the discriminator source?
- Are inactive branch values preserved, frozen, pruned, or snapshotted?
- When switching branch, should compatible values be migrated?
- Which branches participate in validation?
- Which branch state is serialized?
- Can branches project to different layouts or widgets?

### 8.2.1 Retention Policies

The runtime supports exactly four retention modes:

- `prune`: inactive branch state is deleted,
- `freeze`: inactive branch state is retained read-only,
- `detach`: inactive branch state is retained outside active participation,
- `snapshot`: inactive branch state is retained as historical snapshot only.

Every variant field must choose one default retention mode.

### 8.2.2 Migration Contract

Branch switching may invoke a branch migration function with contract:

- input: source branch slice plus target defaults,
- output: target branch patch plus migration issues,
- purity: pure and replayable,
- idempotence: repeated application with same input yields same output.

### 8.3 Recommended Semantics

- active branch is fully participating,
- inactive branches are semantically detached by default,
- detached branches preserve data but do not validate or serialize,
- switching branches creates an explicit transaction with migration diagnostics,
- branch-local issues are retained for audit but not surfaced as blocking unless active.

### 8.3.1 Aggregate Validation Rule

By default, object-level or form-level validation only sees the active branch slice unless a rule explicitly opts into all-branch inspection.

This prevents inactive branch residue from contaminating user-facing validation while preserving advanced audit scenarios.

### 8.4 Why This Matters

Most current low-code systems implement variants as conditional sections. That fails for:

- branch data preservation,
- validation correctness,
- payload correctness,
- undo/redo,
- visual designer predictability.

The programming model must instead treat variant as a semantic sum type.

## 9. Object-Field Design

`object-field` is a record lens with local contract and aggregate semantics.

### 9.1 Definition

An object field owns a child `Record` within a parent graph.

It is not just a visual grouping. It is a semantic subgraph boundary.

### 9.1.1 Naming and Rebasing

Inside an object field, child declarations are relative by default.

If an object field is mounted at `customer.address`, then child field `street` is canonically addressed as `customer.address.street`.

This rebasing is structural and rename-safe; authoring tools never rewrite raw string paths when the parent object moves.

### 9.2 Responsibilities

- namespace child fields,
- define local defaults,
- provide local participation guards,
- aggregate diagnostics,
- expose local intents,
- serialize as whole object or patch,
- allow projection as section, card, dialog, embedded editor, or summary chip.

### 9.2.1 Owner Modes

An object field may run in one of three owner modes:

- `inline`: inherits parent owner,
- `staged`: creates local child owner with explicit apply/discard,
- `linked`: points to a referenced committed object owner.

This distinction is essential for address editors, embedded subrecords, and reusable master data editors.

### 9.3 Key Principle

An object field must preserve object identity even when rendered across multiple disjoint page regions.

This avoids a common failure mode where the same nested object is duplicated into multiple uncontrolled widget states.

### 9.4 Advanced Object Semantics

An object field may support:

- partial hydration,
- lazy expansion,
- relation-backed loading,
- independent save,
- embedded workflow state,
- nested access control.

### 9.4.1 Hydration Contract

Partially hydrated object fields carry a hydration state:

- `absent`,
- `stub`,
- `partial`,
- `full`.

Validation and serialization policies must state whether partial objects:

- block submit,
- submit stubs,
- auto-load before submit,
- or submit references only.

## 10. The Generalized Field Model

The word “field” should become a projection term, not a state term.

In this model:

- semantic ownership belongs to nodes and cells,
- fields are projections that let a user inspect or manipulate a lens,
- multiple fields may project the same lens,
- fields do not own truth; the graph does.

This is a major shift from traditional form frameworks and is necessary for low-code builders, inspectors, summaries, inline tables, dialogs, and workflow side panels to stay coherent.

## 10.1 Projection Ownership Rule

Projection configuration may alter:

- widget choice,
- formatting,
- local interaction affordances,
- density and layout,
- projection-local labels or helper text.

Projection configuration may not alter:

- semantic ownership,
- validation truth,
- submit inclusion,
- command authorization,
- branch retention semantics.

This prevents presenter-local logic drift.

## 11. Commands and Actions

A low-code system needs a stronger abstraction than “event action list”.

Introduce `Command` as a typed intent bundle.

A command declares:

- required input lenses,
- output contracts,
- authorization policy,
- effect plan template,
- compensation behavior,
- visibility and enabled guards.

Examples:

- `SaveDraft`
- `SubmitOrder`
- `AddAddress`
- `SwitchPaymentMethod`
- `RefreshQuote`

Commands can be projected as buttons, menu items, keyboard shortcuts, automation hooks, or workflow transitions.

## 12. Layout and UI Projection

Layout must not define business semantics.

The projection layer uses:

- `Region`: a place where semantic nodes may be projected,
- `View`: a configured projection recipe,
- `Presenter`: a renderer for a given node shape and context,
- `Decorator`: cross-cutting visual augmentation.

A node can be projected differently in:

- form edit mode,
- table cell summary mode,
- review page,
- mobile detail sheet,
- debugger panel.

This solves the chronic coupling between widget choice and domain structure.

## 13. Async and Resource Model

Low-code systems must unify local values and remote resources.

Introduce `ResourceShape` and `ResourceCell`.

They represent:

- remote entity,
- option list,
- paged collection,
- computed quote,
- server validation result,
- generated document.

A resource cell has:

- fetch policy,
- staleness policy,
- optimistic merge policy,
- dependency keys,
- cancellation semantics.

## 13.1 Resource Key Contract

Every resource cell declares:

- `resourceKey`: stable cache identity,
- `dependsOn`: semantic lenses that parameterize the request,
- `scope`: owner-local, page-local, app-global, or session-global,
- `supersede`: whether newer requests cancel or merely overshadow older ones.

## 13.2 Option Resource Specialization

Option resources are special because field value continuity matters.

They must additionally define:

- option identity field,
- label projection,
- lookup-by-id behavior,
- stale selected value behavior,
- paging strategy,
- free-text or strict-membership policy.

## 13.3 Offline Resource Semantics

Resources may declare offline modes:

- `cache-only`,
- `cache-then-network`,
- `network-required`,
- `deferred-intent`.

This lets forms behave predictably under intermittent connectivity.

Resources participate in the same transaction and issue model as local cells.

## 14. Collaboration and Time

The semantic graph is naturally event-sourced at the intent layer.

This enables:

- undo/redo,
- collaborative editing,
- timeline inspection,
- recorded automation,
- reproducible bug reports.

Time should be a first-class dimension:

- current state,
- pending state,
- committed state,
- historical state,
- alternate state for what-if simulation.

## 14.1 Offline Intent Log

Offline editing is modeled as an append-only local intent log against a known baseline version.

On reconnect, the runtime replays local intents against the latest acknowledged graph using:

- temporary ID remapping,
- conflict classification,
- rule re-evaluation,
- effect re-planning.

## 14.2 Conflict Classes

Conflicts should not be a single generic error.

Minimum conflict classes:

- concurrent value overwrite,
- deleted target,
- branch mismatch,
- schema incompatibility,
- authorization drift,
- resource stale precondition.

Each class must have a default resolution policy.

## 15. Tooling Implications

If the runtime is graph-first, tooling becomes substantially better.

The designer can inspect:

- every cell and lens,
- why a field is hidden or disabled,
- which rules produced an issue,
- which transaction changed a value,
- which branch of a variant is active,
- which payload slice will be submitted.

This is a decisive advantage over current frameworks whose real runtime model is too implicit for serious tooling.

## 15.1 Designer IR

The visual designer should edit a stable intermediate representation rather than raw renderer trees.

The IR contains:

- semantic nodes,
- owner boundaries,
- lenses,
- rules,
- commands,
- projection bindings,
- stable authoring IDs.

Palette operations modify IR nodes. View layout operations modify projections. Refactors operate on IDs and structural rebasing, not string search.

## 15.2 Minimal Executable IR

The authoring model may use sugar, but the compiler must lower to one canonical IR.

Minimum IR entities:

- `OwnerDecl { ownerId, mode, parentOwnerId }`
- `NodeDecl { nodeId, shape, parentNodeId, ownerId }`
- `LensDecl { lensId, ownerId, address, targetNodeId }`
- `RuleDecl { ruleId, reads, guard, compute, writes }`
- `CommandDecl { commandId, inputSlice, intentTemplate, policy }`
- `ProjectionDecl { projectionId, region, sourceLens, presenter, options }`
- `ResourceDecl { resourceId, resourceKey, dependsOn, loader, policy }`

Compiler obligations:

- lower relative names to canonical rebased lenses,
- reject unresolved or cyclic structural references,
- compute owner-qualified addresses,
- pre-validate rule read/write legality,
- emit stable IDs for all explainability surfaces.

Runtime obligations:

- never depend on authoring sugar,
- only consume canonical IR,
- preserve IDs across hot reload, persistence, and designer round-trips.

## 15.3 Operational Semantics Matrix

This section is normative. If an implementation differs here, it is a different model.

### 15.3.1 Participation Matrix

| State    | Editable                |             Dirty-tracked |           Validates |          Serializes |        Blocks Submit | Visible in Default UI |
| -------- | ----------------------- | ------------------------: | ------------------: | ------------------: | -------------------: | --------------------: |
| visible  | yes if enabled+writable |                       yes |                 yes |                 yes | yes, by issue policy |                   yes |
| hidden   | no direct user edit     | yes if changed indirectly | yes unless detached | yes unless detached | yes, by issue policy |                    no |
| disabled | no direct user edit     | yes if changed indirectly |                 yes |                 yes | yes, by issue policy |                   yes |
| detached | no                      |                        no |                  no |                  no |                   no |         no by default |

Normative notes:

- hidden is a projection fact, not a data deletion signal,
- disabled is an interaction fact, not a serialization rule,
- detached removes the node from active participation but may retain stored value for audit or branch restore.

### 15.3.2 Owner Mode Matrix

| Owner Mode           |               Local Draft |       Local Commit | Parent Submit Reads Draft | Parent Submit Reads Committed |    Local Discard |  Status Bubbles to Parent |
| -------------------- | ------------------------: | -----------------: | ------------------------: | ----------------------------: | ---------------: | ------------------------: |
| inline / embedded    |         no separate draft | no separate commit |                       yes |                           n/a | via parent reset |                       yes |
| staged / independent |                       yes |                yes |                        no |                yes by default |              yes | configurable summary only |
| linked / referenced  | no local draft by default | foreign owner only |                        no |           yes, reference only |              n/a |     reference health only |

Normative notes:

- `inline` and `embedded` are equivalent runtime semantics viewed from object-field versus form perspective,
- `staged` and `independent` are equivalent runtime semantics viewed from object-field versus form perspective,
- `linked` and `referenced` are equivalent runtime semantics for foreign committed objects.

### 15.3.3 Variant Retention Matrix

| Retention | Inactive Data Kept |  Inactive Issues Kept | Inactive Validates | Inactive Serializes |  Restorable on Re-activate |     Undo Preserves Prior Branch |
| --------- | -----------------: | --------------------: | -----------------: | ------------------: | -------------------------: | ------------------------------: |
| prune     |                 no | historical audit only |                 no |                  no |                         no | yes through transaction history |
| freeze    |                yes |                   yes |                 no |                  no |                        yes |                             yes |
| detach    |                yes |                   yes |                 no |                  no |                        yes |                             yes |
| snapshot  |      snapshot only |         snapshot only |                 no |                  no | restore from snapshot only |                             yes |

Normative note:

- `freeze` means retained in-place and non-editable while inactive,
- `detach` means retained outside active participation and may still be programmatically migrated,
- `snapshot` means the inactive branch is preserved as historical state rather than live mutable state.

### 15.3.4 Hydration Matrix For Object Fields

| Hydration |                         Editable |                             Validates |                     Serializes |                 Submit Default |
| --------- | -------------------------------: | ------------------------------------: | -----------------------------: | -----------------------------: |
| absent    |                               no |                                    no |                             no |                           skip |
| stub      | limited by reference fields only | no unless policy says reference-valid |                 reference only |               submit reference |
| partial   |             only hydrated fields |                   hydrated slice only | partial or reference by policy | auto-load or partial by policy |
| full      |                              yes |                                   yes |                            yes |                    full object |

### 15.3.5 Branch Switch Algorithm

When a variant discriminator changes:

1. capture source branch state and source issues,
2. apply retention policy to source branch,
3. materialize target branch defaults,
4. run optional pure migration,
5. attach migration issues,
6. activate target branch,
7. recompute active-slice rules,
8. emit one transaction record for the whole branch switch.

### 15.3.6 Parent Submit Algorithm

When a parent owner submits:

1. resolve submit slice,
2. expand embedded children into the parent draft slice,
3. replace referenced children with committed references,
4. require independent children to be committed or exclude them by explicit policy,
5. run submit-time validation over the resolved slice,
6. serialize payload and send effect plan,
7. merge response according to partial success contract.

## 16. Minimal Canonical Example

```yaml
node: OrderForm
shape:
  form:
    of:
      record:
        customer:
          object-field:
            of:
              record:
                name: string
                level: string
        payment:
          variant-field:
            discriminator: method
            branches:
              card:
                record:
                  cardNo: string
                  holder: string
              invoice:
                record:
                  taxId: string
                  title: string
rules:
  - when: customer.level == 'vip'
    derive:
      payment.branches.card.cardNo.meta.hint: 'Priority processing'
  - when: payment#card
    validate:
      payment.cardNo:
        required: true
  - when: payment#invoice
    validate:
      payment.taxId:
        required: true
commands:
  SubmitOrder:
    input: /
    intent: submit
projections:
  main:
    region: page.body
    present:
      - lens: customer
        as: object-section
      - lens: payment
        as: variant-editor
      - command: SubmitOrder
        as: primary-button
```

The important point is not this syntax. The important point is the execution model behind it.

## 17. What Makes This Model Superior

It is superior if it can do all of the following with one coherent runtime:

- a field exists in multiple synchronized views,
- a variant branch switches with data retention and audit,
- object subgraphs save independently,
- validation, visibility, and serialization agree,
- remote resources participate in the same semantics as local cells,
- commands are projected in many UI forms without duplicated wiring,
- tooling can explain every runtime decision.

## 17.1 Stronger Standard For Superiority

The model should only be considered superior if it simultaneously improves:

- expressive power,
- semantic coherence,
- tooling inspectability,
- large-screen performance,
- authoring composability,
- reliability under async and offline conditions.

If it improves one axis by making the others worse, it is not a next-generation model.

If a system cannot do these coherently, it is not yet a mature low-code programming model.

## 18. Design Non-Negotiables

- Semantic graph is primary; render tree is secondary.
- Variant is a core shape, not an if-block trick.
- Object field is a semantic boundary, not a grouping widget.
- Participation semantics are unified through guards.
- Rules are pure; effects are planned.
- Commands are typed semantic intents, not callback bags.
- Projection is multi-target, not only UI rendering.
- Every runtime decision must be inspectable by tools.

## 19. Open Research Questions

- How far should the rule language go before it becomes a general-purpose programming language?
- How should branch migration for variants be expressed declaratively?
- What is the minimal authoring syntax that preserves these semantics without becoming verbose?
- How should collaborative conflict resolution interact with guarded participation?
- Can projection recipes be statically optimized enough for very large applications?

## 19.1 Current Weak Points

Even after this revision, the hardest unsolved areas remain:

- compact but precise authoring syntax,
- declarative branch migration ergonomics,
- conflict handling UX for collaborative edits,
- proving that module composition remains simpler than code-first architectures.

These are the right remaining problems. The more basic semantic gaps should no longer be left implicit.

## 20. Provisional Conclusion

The next-generation frontend model for low-code should be built around semantic graph execution, typed lenses, guarded participation, transactional intents, and multi-target projection.

That is a deeper foundation than component trees, state stores, form libraries, or event-action chains.

If implemented correctly, it would not merely improve low-code systems. It would redefine frontend programming around business semantics instead of widget assembly.
