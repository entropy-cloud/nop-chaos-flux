# Runtime And Renderer FAQ

## Purpose

This document answers recurring questions about how the main runtime and renderer concepts fit together.

Use it when:

- you know some of the terms but still do not see how they cooperate
- you need a newcomer-friendly explanation before reading the owner docs in full
- a question is about relationships between concepts rather than one isolated contract

This is a reference and orientation document.

Normative behavior still belongs to the owner docs such as:

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/architecture/surface-owner.md`
- `docs/components/page/design.md`

## Quick Mental Model

Think in three layers:

1. host-created runtime boundaries
2. schema-visible renderer nodes
3. per-instance scopes and entries created while the tree runs

Typical root shape:

```text
SchemaRenderer
  -> RendererRuntime
  -> PageRuntime
  -> SurfaceRuntime
  -> render tree
     -> type: 'page'
        -> type: 'form' -> FormRuntime
        -> button -> open dialog -> SurfaceEntry(scope)
```

The most common source of confusion is that some names describe runtime owners and other names describe schema node types. They are related, but they are not the same layer.

Illustrative runtime shape:

```text
SchemaRenderer root
  |
  +-- create RendererRuntime
  |     core public handles:
  |       - runtimeId
  |       - registry
  |       - env
  |       - expressionCompiler
  |       - schemaCompiler
  |       - plugins
  |     main factory / infra methods:
  |       - compile(...)
  |       - evaluate(...)
  |       - dispatch(...)
  |       - createChildScope(...)
  |       - createPageRuntime(...)
  |       - createSurfaceRuntime(...)
  |       - createFormRuntime(...)
  |     internal bookkeeping:
  |       - ownedPages: Set<PageRuntime>
  |       - ownedSurfaceRuntimes: Set<SurfaceRuntime>
  |       - ownedActionScopes: Set<ActionScope>
  |
  +-- create root ActionScope
  +-- create PageRuntime via runtime.createPageRuntime(...)
  |     core public handles:
  |       - store: PageStoreApi
  |       - scope: ScopeRef     // root page scope, path usually `$page`
  |       - refresh()
  |     main state in store:
  |       - data
  |       - refreshTick
  |
  +-- create SurfaceRuntime via runtime.createSurfaceRuntime(...)
  |     core public handles:
  |       - store: SurfaceStoreApi
  |       - open(...)
  |       - close(...)
  |       - closeTop()
  |     main state in store:
  |       - entries: SurfaceEntry[]
  |           each SurfaceEntry contains:
  |             - id
  |             - kind: dialog | drawer | sheet
  |             - scope: ScopeRef
  |             - surface
  |             - actionScope?
  |             - componentRegistry?
  |             - ownerTemplateNode?
  |             - ownerNodeInstance?
  |             - title?
  |             - body?
  |
  +-- publish contexts
        - RuntimeContext -> RendererRuntime
        - ActionScopeContext -> root ActionScope
        - PageContext -> PageRuntime
        - SurfaceContext -> SurfaceRuntime
```

Read this diagram as:

- `SchemaRenderer` does not expose one literal object tree with three runtime fields hanging off it.
- instead, `SchemaRenderer` creates the root runtime handles, then publishes them into separate React contexts.
- `RendererRuntime` is the root services container plus factory boundary.
- `PageRuntime` is the current page owner published into page context.
- `SurfaceRuntime` is the current shared surface owner published into surface context.
- the active opened dialog/drawer instances are not stored on `RendererRuntime`; they live in `SurfaceRuntime.store.entries`.

## FAQ

### What is the difference between `RendererRuntime`, `PageRuntime`, `FormRuntime`, and `SurfaceRuntime`?

- `RendererRuntime` is the top-level runtime services container for one `SchemaRenderer` execution root.
- `PageRuntime` is the page-level owner for root page data scope and page shell behavior such as refresh.
- `FormRuntime` is the form-level owner for values, validation, submission, and field state.
- `SurfaceRuntime` is the shared owner for dialog/drawer/sheet-style surface stacking and open/close behavior.

They are cooperating runtime families, not a class inheritance chain.

### Who creates them?

- `SchemaRenderer` creates `RendererRuntime`.
- `SchemaRenderer` creates the root `ActionScope` for the execution root.
- `SchemaRenderer` also creates the root `PageRuntime` and `SurfaceRuntime` for that execution root.
- the concrete `form` renderer creates `FormRuntime` when a form node mounts.

That split is why a tree can have one page runtime, one shared surface runtime, and many nested form runtimes.

Implementation note:

- `RendererRuntime` internally keeps owned registries such as `Set<PageRuntime>` and `Set<SurfaceRuntime>`.
- those sets are mainly bookkeeping for cleanup and disposal, not the main runtime lookup path used during normal rendering.
- the currently active page/surface/form during execution comes from React contexts and scope boundaries, while the active opened surfaces live in `SurfaceRuntime.store.entries`.

### Does `SchemaRenderer` directly "have three runtimes under it"?

Not as one plain object graph.

The more accurate reading is:

1. `SchemaRenderer` creates `RendererRuntime`
2. it asks that runtime to create `PageRuntime` and `SurfaceRuntime`
3. it creates or receives the root `ActionScope`
4. it publishes those handles through separate React contexts

So when people say "under `SchemaRenderer` there is `RendererRuntime` + `PageRuntime` + `SurfaceRuntime`", treat that as a lifecycle and provider relationship, not as a single nested runtime object model.

### Is `PageRuntime` the same thing as schema `type: 'page'`?

No.

- `PageRuntime` is a runtime owner boundary.
- `type: 'page'` is a schema-visible page shell renderer.

They often appear together in one root page flow, but they are still different layers.

Useful shortcut:

- `PageRuntime` answers: who owns the page-level runtime state?
- `type: 'page'` answers: which renderer draws the page shell regions?

### If they are different, why do they feel related?

Because the common root page flow usually looks like this:

1. `SchemaRenderer` creates `PageRuntime`
2. the compiled root node is often `type: 'page'`
3. that page renderer consumes the already-created page context and renders `title` / `header` / `body` / `footer`

So they cooperate in the same flow, but `type: 'page'` does not create the page runtime by itself.

### Is one JSON page equal to one `PageRuntime`?

Usually yes in practice, but the more correct statement is:

- one `SchemaRenderer` execution root gets one `PageRuntime`

In many business screens the root schema is a full page, so the shortcut works. But architecturally the boundary is the execution root, not the file size or route shape.

### What does schema `type: 'page'` mean then?

It means a page shell renderer.

It is the preferred root renderer in normal page-shaped schemas and mainly provides page-level regions such as:

- `title`
- `header`
- `body`
- `footer`

It is not merely “a random layout container with a nicer name”, but its current implementation is intentionally thin. It mostly renders shell structure and consumes the existing page context.

### What is a `SurfaceRuntime`?

It is the shared runtime owner for dialog/drawer/future-sheet style surfaces.

It owns surface-family concerns such as:

- opened entry stack
- open/close operations
- which surface is currently topmost

It does not own the internal business state inside the surface. For example, a form inside a dialog still belongs to `FormRuntime`, not to `SurfaceRuntime`.

### What is a `SurfaceEntry`?

`SurfaceEntry` is one opened surface instance inside the shared `SurfaceRuntime` stack.

It is an instance record, not a runtime family.

Typical contents include:

- surface id
- surface kind such as `dialog` or `drawer`
- surface-local scope
- owner node metadata needed for rendering
- title/body render input

Think:

- `SurfaceRuntime` = the stack owner
- `SurfaceEntry` = one item in that stack

### What does `SurfaceEntry.actionScope` mean? Does `PageRuntime` have `actionScope`?

`PageRuntime` does not have an `actionScope` field.

`actionScope` is a parallel execution context used for action namespace resolution. It is published through `ActionScopeContext`, not stored inside `PageRuntime`.

`SurfaceEntry.actionScope` means:

- this opened surface instance remembers the action namespace environment from the place that opened it
- when the top-level dialog host renders that surface later, it restores that action scope for the surface subtree

That is important because a dialog or drawer is rendered by the shared root host, but it may have been opened from inside a more specific node-owned or imported action namespace boundary.

So the split is:

- `PageRuntime.scope` -> page data owner boundary
- `ActionScope` -> action namespace boundary
- `SurfaceEntry.actionScope` -> the action namespace boundary that should be restored for this one opened surface instance

`actionScope` is stored on each `SurfaceEntry`, not on `SurfaceRuntime` as a whole, because different opened surfaces may come from different opening sites and therefore different action namespace chains.

### What is `sheet`?

`sheet` is part of the surface family vocabulary.

In the current baseline it means a future surface kind in the same dialog/drawer family, not a completely separate owner family.

Use this rule:

- if it is fundamentally an overlay surface, it belongs with `SurfaceRuntime`
- if it is actually a step flow, container switch, or some other interaction model, it may belong elsewhere

### What is the relation between `SurfaceEntry.scope` and page scope?

`SurfaceEntry.scope` is the local scope for one opened surface instance.

It is usually created as a child of the current action/render scope that opened the surface, not always directly as a child of page root scope.

So these are all possible:

- page scope -> dialog scope
- form scope -> dialog scope
- row scope -> dialog scope

Because normal scope behavior is lexical inheritance, the surface scope usually still sees parent values unless an explicit isolated subtree is introduced further inside.

### Does a dialog always belong directly to the page?

No.

The shared surface host lives at the root, but the opened entry's scope is tied to the scope that opened it.

That is why a dialog can naturally inherit form-local or row-local context even though rendering is centralized in one top-level host.

### Why not let `PageRuntime` own dialogs directly?

Because page shell state and surface state are different owner families.

If page owned everything, it would become a vague umbrella runtime for unrelated concerns. Keeping `SurfaceRuntime` separate makes these boundaries clearer:

- page owns page shell concerns
- form owns form lifecycle concerns
- surface owns overlay open/close stack concerns

### What is the difference between `render scope` and `validation scope`?

- `render scope` answers: where does this subtree read and write data?
- `validation scope` answers: which runtime owns validation state and validation APIs for this subtree?

Every validation scope is based on an existing render/data scope, but not every render scope becomes a validation owner boundary.

Useful shortcut:

- `ScopeRef` = data visibility and writes
- `ValidationScopeRuntime` = validation ownership for some scope-backed values
- `FormRuntime` = the current concrete validation-owner specialization most commonly used in the UI tree

### Are validation rules rebuilt every time values change?

Not from raw schema text.

The intended model is:

1. rules are compiled once as templates
2. each validation run materializes effective rules against the current owner-local scope
3. rule activation, arguments, and messages may therefore differ between runs when current values differ

So the system should not reparsed schema on every validation run, but it does need per-run materialization against the current scope.

### Is validation only attached to the changed `name/path`?

No. The changed path is only the starting point.

Validation impact may also include:

- other fields that depend on that path
- object/array/root aggregate rules
- additional owner-local targets reached through dependency closure

Useful shortcut:

- change starts at a path
- validation runs against the affected owner-local target set

### Does that closure need to reach a fixed point? Can dynamic re-triggering replace it?

The target-set semantics still need a fixed owner-local closure.

In practice, an implementation may use incremental propagation or queued re-triggering internally, but it still needs to converge to the correct owner-local affected set for the current interaction boundary.

Relying only on one-step "re-trigger later" behavior is not enough, because it can publish partial results or behave badly around dependency cycles.

### Should validation wait for `batchUpdate(...)` because validation is already async-capable?

Not as one blanket rule.

- async-capable validation and validation trigger policy are separate concerns
- ordinary `change` flows should usually validate the edited path plus its local affected closure
- broader aggregate correctness may be deferred to `blur`, `commit`, or `submit`
- owner-local structural edits and multi-path writes are the main use case for `applyChangesAndRevalidate(...)`

So batching is important, but "validation supports async" is not by itself a reason to delay all validation until a later batch boundary.

### How does one field instance find its validation rules?

Usually by `path`, not by holding a rule object on the React component instance.

Typical flow:

1. the field renderer resolves its `name`
2. it uses the nearest `FormRuntime`
3. validation calls such as `validateField(name)` send that path into the owner runtime
4. the owner runtime looks up compiled validation metadata by path and executes it against the current scope

So the main join key is the owned field path.

### What does `currentForm.registerField({ path: name, ... })` mean?

It means the mounted field instance is registering runtime participation information with the current validation owner.

That registration may provide things such as:

- the mounted field path
- how to read or sync the current runtime value
- runtime-only validators
- dynamic child paths for composite or opaque controls

This is not the same thing as recompiling schema rules. It is runtime registration into an already existing owner boundary.

### Is `registerField(...)` called on every render?

The normal pattern is no.

Field renderers call it from `useEffect(...)`, so the registration lifetime is tied to mount/update cleanup rather than every render pass.

In practice that means:

- mount -> register
- dependency/model-generation change -> cleanup old registration, then register again if needed
- unmount -> unregister

### How do indirectly affected validation targets get found?

Through the compiled validation dependency map.

- each compiled rule declares dependency paths
- the compiled validation model stores a reverse `dependents[path]` map
- runtime revalidation uses that map to find directly affected targets from a changed path

The current fast path mainly uses direct dependents plus broader subtree/owner validation when the interaction boundary requires it.

### Are the compiled validation model and validation results stored separately?

Yes.

- the compiled validation model describes what rules and dependencies may exist
- runtime state stores current values, errors, validating flags, touched/dirty/visited state, and runtime registrations

They are linked mainly by owner boundary plus field path.

More concretely:

- compiled model keys are mainly field or aggregate paths such as `user.email`, `contacts`, or `contacts[].email`
- runtime field state is also stored by owned path, for example `errors[path]`, `validating[path]`, `touched[path]`, `dirty[path]`, and `visited[path]`
- runtime registration state is stored through `path -> registrationId` and `registrationId -> registration entry` indexes

Useful shortcut:

- compiled model = what may validate
- runtime state = what is currently mounted, visible, pending, invalid, or dirty

### Do `disabled`, `visible`, `hidden`, or `when` change whether validation runs?

Yes, but not all in the same way.

- `disabled` is mainly an interaction/UI state and does not automatically remove a path from validation participation
- hidden paths skip validation by default unless hidden-field policy says otherwise
- inactive branches do not participate in validation and should clear stale errors
- `when` is closer to structural participation than to pure visual hiding

Useful shortcut:

- `disabled` does not mean "not validated"
- hidden/inactive content is normally non-participating

### How does validation work for a table cell versus a row draft editor?

Use two different mental models.

Example A: inline editable table cell bound directly to parent values.

```text
Parent FormRuntime
  values.contacts[0].email
  errors['contacts.0.email']
  errors['contacts']           // aggregate array error when relevant

Table row scope
  record
  index

Cell field
  -> uses nearest parent FormRuntime
  -> setValue('contacts.0.email', nextValue)
  -> validateField('contacts.0.email')
```

In that case the row scope is only a render/data scope. Validation ownership remains with the parent owner.

Example B: row-local draft editor.

```text
Parent FormRuntime
  values.contacts[0].email = 'a@test.com'

Child Draft FormRuntime
  values.email = ''
  errors['email'] = [...]

commit
  -> validate child draft owner
  -> write back to parent contacts.0
  -> parent revalidates impacted paths
```

In that case the draft editor is a child validation owner. Its errors stay local until commit succeeds.

Current repo note: the live `TableRenderer` is still read-only. These examples describe the established validation contract for future editable-cell and row-draft flows rather than a landed editable table renderer.

### Can compile time identify the editable or value-bound parts of a schema through `RendererDefinition`?

Yes, for the structural part of the problem.

The important signal is usually not a coarse `supportsEdit: true` flag. It is the renderer's validation/value contribution contract, especially:

- whether the renderer declares `validation`
- whether that contributor is `field`, `container`, or `none`
- how it derives a field path
- whether it contributes child path prefixes
- whether its value shape is scalar, object, or array

That lets compile time identify which schema nodes contribute to the validation/value graph.

Compile time still cannot fully decide runtime participation, because actual mounted state also depends on things such as hidden/inactive branches, runtime registrations, and current dynamic overlays.

### Does `variant-field` register and unregister too?

`variant-field` itself mainly creates a projected form/scope proxy over the parent owner.

The active variant subtree still uses the normal field pattern underneath it:

- child fields register through the variant form proxy
- the proxy prefixes child paths back into the parent form owner
- when those child fields unmount because the active variant changes, their effect cleanups call `unregister()` as usual

So variant switching does not create a second independent validation owner by itself. It remaps child field paths into the existing parent owner and relies on normal mount/unmount registration cleanup.

### Why can a newcomer still get confused even if the design is reasonable?

Because the same English words appear at different layers:

- runtime owner names such as `PageRuntime`
- schema type names such as `type: 'page'`
- instance record names such as `SurfaceEntry`

The architecture is cleaner than the first impression, but the naming only becomes obvious after seeing the layers side by side.

### What reading order should I use if I only want the minimum set?

Start here, then read:

1. `docs/references/terminology.md`
2. `docs/architecture/renderer-runtime.md`
3. `docs/architecture/scope-ownership-and-isolation.md`
4. `docs/architecture/surface-owner.md`
5. `docs/components/page/design.md`

### When should a new question be added to this file?

Add to this file when the question is primarily about:

- how two or more concepts relate
- how to avoid a recurring misreading
- which layer a concept belongs to

Do not move the normative contract here. Keep final behavior and owner decisions in the owner docs.

## Related Documents

- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`
- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/architecture/surface-owner.md`
- `docs/components/page/design.md`
