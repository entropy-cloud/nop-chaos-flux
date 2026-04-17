# Form Validation Runtime Types Reference

> Reference Status: Active
> Last Updated: 2026-04-16
> Owner Doc: `docs/architecture/form-validation.md`

This document contains the complete TypeScript type definitions for the form validation runtime model. It is a companion reference to the main architecture document `docs/architecture/form-validation.md`.

For conceptual design, principles, and implementation guidance, see the owner document.

---

## Minimal Normative Types

```ts
type ValidateOnPolicy = 'change' | 'blur' | 'submit' | 'manual';
type ShowErrorOnPolicy = 'change' | 'blur' | 'submit' | 'touched' | 'manual';
type ValidationOwnerLifecycleState =
  | 'bootstrapping'
  | 'active'
  | 'refreshing'
  | 'disposed';

type ValidationRuleKind = string;

type CompiledRuntimeValue<T> =
  | { kind: 'static'; value: T }
  | { kind: 'expression'; code: string; dependencies: string[] };

interface ValidationError {
  path: string;
  ownerId: string;
  rule: string;
  message: string;
  sourceKind:
    | 'field'
    | 'object'
    | 'array'
    | 'row'
    | 'scope-root'
    | 'external'
    | 'runtime-overlay'
    | 'runtime-opaque';
}

interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  validating?: boolean;
}

interface ScopeValidationResult {
  ok: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, ValidationError[]>;
  validating?: boolean;
}

interface FormSubmitResult {
  ok: boolean;
  errors: ValidationError[];
}
```

### Result Type Usage

- **`ValidationResult`**: Use for local validation entry points such as `validateAt(path)`, where the caller needs the outcome of one path-centered validation run and does not need a full owner-wide field error map.

- **`ScopeValidationResult`**: Use for subtree-level or owner-level operations such as `validateSubtree(path)`, `validateAll()`, and `applyChangesAndRevalidate(...)`, where the caller needs an aggregated view of the validated scope including `fieldErrors`.

---

## ValidationScopeRuntime

The core runtime abstraction for any scope that has validation semantics.

```ts
type ValidationReason = 'change' | 'blur' | 'submit' | 'commit' | 'system';

interface ValidationScopeRuntime {
  readonly scopeId: string;
  readonly rootPath: string;
  readonly compiledModel: CompiledFormValidationModel | null;
  readonly lifecycleState: ValidationOwnerLifecycleState;
  readonly modelGeneration: number;
  readonly showErrorOn: Exclude<ShowErrorOnPolicy, 'touched'>;

  validateAt(path: string, reason?: ValidationReason): Promise<ValidationResult>;
  validateSubtree(path: string, reason?: ValidationReason): Promise<ScopeValidationResult>;
  validateAll(reason?: ValidationReason): Promise<ScopeValidationResult>;

  applyChangesAndRevalidate(input: ApplyScopeChangesInput): Promise<ScopeValidationResult>;
  applyExternalErrors(input: ApplyExternalErrorsInput): ScopeValidationResult;

  getFieldState(path: string): FieldValidationStateSnapshot;
  getScopeState(): ScopeValidationStateSnapshot;
  getScopeRootErrors(): ValidationError[];
  isPathOwned(path: string): boolean;

  registerField(state: FieldRegistrationState): FieldRegistrationHandle;
  updateFieldRegistration(registrationId: string, patch: Partial<FieldRegistrationState>): void;
}

interface ApplyScopeChangesInput {
  writes: Record<string, unknown>;
  changedPaths: string[];
  reason: ValidationReason;
}

interface ApplyExternalErrorsInput {
  sourceId: string;
  errors: ValidationError[];
  replace?: boolean;
}

interface ScopeValidationStateSnapshot {
  valid: boolean;
  hasErrors: boolean;
  validating: boolean;
  lifecycleState: ValidationOwnerLifecycleState;
  /**
   * Whether this scope is in a state where it can be submitted or confirmed.
   * FormRuntime: form-specific readiness derived from validity, validating state,
   * and touch policy.
   * Non-form ValidationScopeRuntime: ready = valid && !validating.
   * Parent scopes read this field instead of valid when gating on a child scope,
   * to prevent misreading a FormRuntime child as ready when allTouched is false.
   */
  ready: boolean;
}

interface FieldRegistrationHandle {
  accepted: boolean;
  registrationId: string;
  unregister(): void;
}
```

### Applicable Scopes

This runtime exists for any scope that has validation semantics:

1. normal forms
2. draft editors
3. non-form filter scopes
4. row-local editors when they own local validation

---

## FormRuntime

`FormRuntime` is a specialization of `ValidationScopeRuntime`.

```ts
interface FormRuntime extends ValidationScopeRuntime {
  readonly validateOn: ValidateOnPolicy;
  readonly showErrorOn: ShowErrorOnPolicy;

  touchField(path: string): void;
  visitField(path: string): void;
  isTouched(path: string): boolean;
  isDirty(path: string): boolean;
  isVisited(path: string): boolean;

  submit(): Promise<FormSubmitResult>;
  readonly canSubmit: boolean;
  readonly allTouched: boolean;
}
```

### Additional FormRuntime Responsibilities

1. tracking touched/dirty/visited state
2. implementing `showErrorOn: 'touched'` policy
3. providing `submit()` with form-specific validation and gating
4. computing `canSubmit` and `allTouched`

---

## Compiled Validation Model

Immutable runtime input produced by the compiler.

```ts
interface CompiledFormValidationModel {
  rootPath: string;
  ownerId: string;
  nodes: Record<string, CompiledFieldTreeNode>;
  validationOrder: string[];
  dependents: Record<string, string[]>;
}

type FieldTreeNodeKind =
  | 'scope-root'
  | 'form-root'
  | 'field'
  | 'object'
  | 'array'
  | 'variant-root'
  | 'variant-branch'
  | 'repeated-template';

interface CompiledFieldTreeNode {
  id: string;
  path: string;
  ownerId: string;
  kind: FieldTreeNodeKind;
  parent?: string;
  children: string[];
  ruleTemplates: CompiledRuleTemplate[];
  dependencyPaths: string[];
  aggregateDependencies?: string[];
}
```

### Repeated Template Handling

For repeated templates, `id` is the template identity and runtime indexed paths are materialized from that template.

```ts
// compiled template node
{ id: 'contacts[].email', path: 'contacts[].email', kind: 'field' }

// runtime active instances
'contacts.0.email'
'contacts.1.email'
'contacts.2.email'
```

---

## Field Registration State

Runtime participation state.

```ts
interface FieldRegistrationState {
  registrationId: string;
  path: string;
  mounted: boolean;
  visible: boolean;
  disabled: boolean;
  /**
   * These UX fields are actively maintained by FormRuntime.
   * Base ValidationScopeRuntime may leave them at their default values.
   */
  touched: boolean;
  dirty: boolean;
  visited: boolean;
}
```

---

## Field Validation State

Runtime validation result state.

```ts
interface FieldValidationStateSnapshot {
  ownerId: string;
  path: string;
  errors: ValidationError[];
  validating: boolean;
}
```

---

## Form Store State Structure

Form state uses a normalized flat structure following React/Redux best practices.

```ts
/**
 * Per-field state stored in a single flat map.
 * Properties use `true | undefined` pattern for memory efficiency.
 */
interface FieldState {
  touched?: true;
  dirty?: true;
  visited?: true;
  validating?: true;
  errors?: ValidationError[];
}

/**
 * The form store state structure.
 * Uses a single `fieldStates` map instead of multiple separate maps.
 */
interface FormStoreState {
  values: Record<string, unknown>;
  fieldStates: Record<string, FieldState>;
  submitting: boolean;
}
```

### Design Rationale

1. **Single map instead of five**: Previous design stored `touched`, `dirty`, `visited`, `validating`, and `errors` in five separate maps, duplicating path strings. The unified `fieldStates` map stores all field metadata together.
2. **`true | undefined` pattern**: Boolean flags use `true | undefined` instead of `boolean` to save memory. When a flag is false, it is omitted from the object entirely.
3. **Empty cleanup**: When all properties of a `FieldState` become undefined, the entire entry is removed from the map.
4. **Array remapping efficiency**: Array operations (insert/remove/move) traverse the map once instead of five times.

---

## Per-Path Subscription API

`FormStoreApi` exposes fine-grained subscription methods for field-level reactivity.

```ts
interface FormPathState {
  errors: ValidationError[] | undefined;
  validating: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
}

interface FormStoreApi {
  // ... existing members ...

  /**
   * Subscribe to state changes for a specific path.
   * The listener fires only when the field's state changes for this exact path.
   * Returns an unsubscribe function.
   */
  subscribeToPath(path: string, listener: () => void): () => void;

  /**
   * Subscribe to submitting state changes.
   * The listener fires only when the form's submitting flag changes.
   * Returns an unsubscribe function.
   */
  subscribeToSubmitting(listener: () => void): () => void;

  /**
   * Read the current field state for a specific path.
   * Returns a snapshot suitable for useSyncExternalStore's getSnapshot.
   */
  getPathState(path: string): FormPathState;

  /**
   * Get the raw FieldState for a path (may be undefined if no state exists).
   */
  getFieldState(path: string): FieldState | undefined;

  /**
   * Update field state for a path. Merges with existing state.
   * Empty entries are automatically cleaned up.
   */
  setFieldState(path: string, state: Partial<FieldState>): void;
}
```

### Semantics And Guarantees

1. `subscribeToPath` fires only when the specified path's field state changes, not when unrelated paths change.
2. In a 1000-field form, a keystroke that updates `fieldStates["name"]` wakes only hooks subscribed to `"name"`.
3. `subscribeToSubmitting` is separate from path subscriptions because `submitting` is a form-wide flag, not per-path state.
4. `getPathState` returns a plain object snapshot with no allocation beyond the returned object itself.
5. Projected stores (for object-field, array-item, variant-field) delegate these methods to the parent store with path translation, using the shared `projectFieldStates` helper from `flux-core`.
6. `batchUpdate` (array remap) performs diffing before notification: only paths whose state actually changed receive listener calls.
7. `getFieldState` and `setFieldState` provide direct access to the raw `FieldState` objects for internal use.

---

## Canonical Identity

Canonical bookkeeping identity is not plain path alone.

```ts
interface OwnerQualifiedPath {
  ownerId: string;
  path: string;
}
```

### Rules

1. `path` is always an absolute path inside the owning scope's address space
2. `ownerId` distinguishes parent-owned committed state from child-owned draft state
3. caches, async run ownership, runtime overlays, and field validation buckets are keyed by `OwnerQualifiedPath`
4. public APIs may accept plain absolute paths only when the owner runtime is already known from context

Repeated instances use absolute indexed paths inside their owner, such as `items.3.email`, plus owner identity for isolation when needed.

When repeated items have a stable logical identity, validation and UX state migration should prefer that logical identity over raw positional index. Pure index-based remapping is only the fallback when no stable item identity exists.

---

## React Hook Integration Example

```ts
// Simplified implementation pattern
function useCurrentFormFieldState(path: string) {
  const form = useCurrentForm();
  const absolutePath = resolveAbsolutePath(path);

  return useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        const unsub1 = form.store.subscribeToPath(absolutePath, onStoreChange);
        const unsub2 = form.store.subscribeToSubmitting(onStoreChange);
        return () => { unsub1(); unsub2(); };
      },
      [form.store, absolutePath]
    ),
    () => ({
      ...form.store.getPathState(absolutePath),
      submitting: form.store.getState().submitting,
    })
  );
}
```

This per-path subscription model ensures O(1) hook wake-up cost per field change, regardless of form size.

---

## Related Documents

- `docs/architecture/form-validation.md` - Owner architecture document
- `docs/architecture/flux-runtime-module-boundaries.md` - Module ownership
- `docs/references/renderer-interfaces.md` - Renderer contract types
