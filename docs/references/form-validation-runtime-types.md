# Form Validation Runtime Types Reference

> Reference Status: Active
> Last Updated: 2026-05-17
> Owner Doc: `docs/architecture/form-validation.md`

This document is the live-code reference for the exported validation runtime types.

Use `docs/architecture/form-validation.md` for behavior, phased architecture, and target-state discussion. Use this file only for the current exported type surface.

## Source Of Truth

- `packages/flux-core/src/types/schema.ts`
- `packages/flux-core/src/types/validation.ts`
- `packages/flux-core/src/types/runtime.ts`

## Trigger And Reason Types

```ts
type ValidationTrigger = 'change' | 'blur' | 'submit';

type ValidationVisibilityTrigger = 'touched' | 'dirty' | 'visited' | 'submit';

type ValidationOwnerLifecycleState = 'bootstrapping' | 'active' | 'refreshing' | 'disposed';

type ValidationReason = 'change' | 'blur' | 'submit' | 'commit' | 'system' | 'manual';
```

## Core Result Types

```ts
interface ValidationError {
  path: string;
  message: string;
  rule: ValidationRule['kind'];
  ruleId?: string;
  ownerPath?: string;
  cause?: unknown;
  sourceKind?:
    | 'field'
    | 'object'
    | 'array'
    | 'row'
    | 'scope-root'
    | 'external'
    | 'runtime-overlay'
    | 'runtime-opaque'
    | 'form'
    | 'runtime-registration';
  relatedPaths?: string[];
}

interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

interface FormValidationResult extends ValidationResult {
  fieldErrors: Record<string, ValidationError[]>;
}

interface FormErrorQuery {
  path?: string;
  ownerPath?: string;
  sourceKinds?: Array<NonNullable<ValidationError['sourceKind']>>;
  rule?: ValidationRule['kind'];
}
```

Current return-shape baseline:

- `ValidationScopeRuntime.validateAt()` returns `Promise<ValidationResult>`
- `ValidationScopeRuntime.validateSubtree()` returns `Promise<FormValidationResult>`
- `ValidationScopeRuntime.validateAll()` returns `Promise<FormValidationResult>`
- `ValidationScopeRuntime.applyChangesAndRevalidate()` returns `Promise<FormValidationResult>`
- `FormRuntime.submit()` returns `Promise<ActionResult>`

Current result-fidelity note:

- lifecycle-blocked validation entry points, including disposed `applyChangesAndRevalidate(...)`, return `ok: false` blocked results instead of ordinary clean success
- `ValidationError.cause` is the exported escape hatch for preserving original unexpected failure payloads when runtime validation has to synthesize an error record

`FormErrorQuery` is the public filter shape used by React form-state hooks such as
`useCurrentFormErrors(query)`, `useCurrentFormError(query)`, and
`useCurrentFormFieldState(path, query)`.

Current live filter semantics:

- `path` filters by exact `ValidationError.path`
- `ownerPath` filters by exact `ValidationError.ownerPath`, falling back to `error.path` when `ownerPath` is absent
- `sourceKinds` filters by `ValidationError.sourceKind`
- `rule` filters by `ValidationError.rule`

## Registration And Behavior Types

```ts
interface RuntimeFieldRegistration {
  path: string;
  getValue(): unknown;
  childPaths?: string[];
  hiddenFieldPolicy?: HiddenFieldPolicy;
  syncValue?(): unknown;
  onRemove?(): void;
  validateChild?(path: string): Promise<ValidationError[]> | ValidationError[];
  validate?(): Promise<ValidationError[]> | ValidationError[];
}

interface FieldRegistrationHandle {
  accepted: boolean;
  registrationId: string;
  unregister(): void;
}

interface CompiledValidationBehavior {
  triggers: ValidationTrigger[];
  showErrorOn: ValidationVisibilityTrigger[];
}
```

## Compiled Validation Model Types

```ts
interface HiddenFieldPolicy {
  validateWhenHidden?: boolean;
  clearValueWhenHidden?: boolean;
}

interface CompiledValidationRule {
  id: string;
  rule: ValidationRule;
  dependencyPaths: string[];
  precompiled?: {
    regex?: RegExp;
    error?: string;
  };
}

type CompiledValidationNodeKind = 'field' | 'object' | 'array' | 'form';

interface CompiledValidationNode {
  path: string;
  kind: CompiledValidationNodeKind;
  controlType?: string;
  label?: string;
  rules: CompiledValidationRule[];
  behavior?: CompiledValidationBehavior;
  children: string[];
  parent?: string;
  hiddenFieldPolicy?: HiddenFieldPolicy;
}

interface CompiledFormValidationField {
  path: string;
  controlType: string;
  label?: string;
  rules: CompiledValidationRule[];
  behavior: CompiledValidationBehavior;
  hiddenFieldPolicy: HiddenFieldPolicy;
}

interface CompiledFormValidationModel {
  order: string[];
  behavior: CompiledValidationBehavior;
  dependents: Record<string, string[]>;
  nodes?: Record<string, CompiledValidationNode>;
  rootPath?: string;
  ownerId?: string;
  defaultHiddenFieldPolicy?: HiddenFieldPolicy;
}
```

Current live note:

- `CompiledFormValidationModel.order` and `behavior` are required
- `nodes`, `rootPath`, and `ownerId` are optional on the exported type

## Store And Snapshot Types

```ts
interface FieldState {
  touched?: true;
  dirty?: true;
  visited?: true;
  validating?: true;
  errors?: ValidationError[];
}

interface FormStoreState {
  values: Record<string, any>;
  fieldStates: Record<string, FieldState>;
  submitting: boolean;
  submitAttempted: boolean;
}

interface FormPathState {
  errors: ValidationError[] | undefined;
  validating: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
}

interface ScopeValidationStateSnapshot {
  valid: boolean;
  hasErrors: boolean;
  validating: boolean;
  lifecycleState: ValidationOwnerLifecycleState;
  ready: boolean;
  modelGeneration: number;
}

interface FormFieldStateSnapshot {
  error?: ValidationError;
  validating: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
  submitting: boolean;
  submitAttempted: boolean;
}

interface FormFieldPresentationSnapshot extends FormFieldStateSnapshot {
  effectiveDisabled: boolean;
  effectiveRequired: boolean;
  showError: boolean;
  interactive: boolean;
  readOnly: boolean;
}
```

Current live note:

- `ready` is published only when `lifecycleState === 'active'`, no validation is still running, and no owned errors are present
- owners that are still `bootstrapping` therefore publish `ready: false` until a compiled model is attached and the owner becomes `active`

## Store APIs

```ts
interface ValidationStoreApi {
  getState(): FormStoreState;
  subscribe(listener: () => void): () => void;
  subscribeToPath(path: string, listener: () => void): () => void;
  subscribeToPaths(paths: readonly string[], listener: () => void): () => void;
  subscribeToSubmitting(listener: () => void): () => void;
  subscribeToModelGeneration?(listener: () => void): () => void;
  getPathState(path: string): FormPathState;
  getFieldState(path: string): FieldState | undefined;
}

interface FormStoreApi {
  getState(): FormStoreState;
  subscribe(listener: () => void): () => void;
  subscribeToPath(path: string, listener: () => void): () => void;
  subscribeToPaths(paths: readonly string[], listener: () => void): () => void;
  subscribeToSubmitting(listener: () => void): () => void;
  subscribeToModelGeneration?(listener: () => void): () => void;
  getPathState(path: string): FormPathState;
  getFieldState(path: string): FieldState | undefined;

  setFieldState(path: string, state: Partial<FieldState>): void;
  setValues(values: Record<string, any>): void;
  setValue(path: string, value: unknown): void;
  setPathErrors(path: string, errors?: ValidationError[]): void;
  setValidating(path: string, validating: boolean): void;
  setTouched(path: string, touched: boolean): void;
  setDirty(path: string, dirty: boolean): void;
  setVisited(path: string, visited: boolean): void;
  setSubmitting(submitting: boolean): void;
  setSubmitAttempted(submitAttempted: boolean): void;
  batchUpdate(updates: Partial<FormStoreState>): void;
}
```

Current live note:

- `subscribeToModelGeneration` is optional because projected runtimes and test doubles may forward it conditionally
- listeners are notified when the current owner swaps to a newer compiled validation model generation; React hooks use this to re-register or refresh subscriptions across model replacement

## Child Contract Types

```ts
type ChildValidationMode = 'ignore' | 'summary-gate' | 'recurse-submit';

interface ChildValidationContract {
  childOwnerId: string;
  mode: ChildValidationMode;
}

interface ChildValidationScopeState {
  ready: boolean;
  validating: boolean;
  valid: boolean;
  hasErrors: boolean;
}

interface ChildValidationContractRegistration extends ChildValidationContract {
  active: boolean;
  unregister(): void;
  getState(): ChildValidationScopeState;
  triggerValidation(): Promise<ValidationResult>;
}
```

## `ValidationScopeRuntime`

```ts
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

interface ValidationScopeRuntime {
  readonly scopeId: string;
  readonly rootPath: string;
  readonly lifecycleState: ValidationOwnerLifecycleState;
  readonly modelGeneration: number;
  subscribeToModelGeneration?(listener: () => void): () => void;
  readonly store?: ValidationStoreApi;
  readonly scope?: ScopeRef;
  readonly validation?: CompiledFormValidationModel;

  validateAt(path: string, reason?: ValidationReason): Promise<ValidationResult>;
  validateSubtree(path: string, reason?: ValidationReason): Promise<FormValidationResult>;
  validateAll(reason?: ValidationReason): Promise<FormValidationResult>;

  applyChangesAndRevalidate(input: ApplyScopeChangesInput): Promise<FormValidationResult>;
  applyExternalErrors(input: ApplyExternalErrorsInput): ScopeValidationStateSnapshot;

  getFieldState(path: string): {
    ownerId: string;
    path: string;
    errors: ValidationError[];
    validating: boolean;
  };
  getScopeState(): ScopeValidationStateSnapshot;
  getAsyncOwnerDebugSnapshot?(): AsyncOwnerDebugSnapshot;
  getScopeRootErrors(): ValidationError[];
  isPathOwned(path: string): boolean;

  registerField(registration: RuntimeFieldRegistration): FieldRegistrationHandle;
  updateFieldRegistration(
    registrationId: string,
    patch: Partial<Pick<RuntimeFieldRegistration, 'childPaths' | 'hiddenFieldPolicy'>>,
  ): void;
  notifyFieldHidden(path: string, hidden: boolean): void;

  touchField?(path: string): void;
  visitField?(path: string): void;

  refreshCompiledModel(newModel: CompiledFormValidationModel): void;
  dispose(): void;

  registerChildContract(contract: ChildValidationContractRegistration): void;
  unregisterChildContract(childOwnerId: string): void;
}
```

Current live note:

- the exported property name is `validation?`, not `compiledModel`
- `subscribeToModelGeneration` is part of the public owner contract and mirrors model-generation changes even when consumers only hold the owner runtime rather than the store
- subtree and owner-wide operations currently return `FormValidationResult`
- `applyExternalErrors(...)` currently returns `ScopeValidationStateSnapshot`
- `notifyFieldHidden(...)` is part of `ValidationScopeRuntime`, so non-form owners participate in hidden-field policy without a `FormRuntime`-only contract

## `FormRuntime`

```ts
interface FormRuntime extends ValidationScopeRuntime {
  id: string;
  name?: string;
  store: FormStoreApi;
  scope: ScopeRef;
  validation?: CompiledFormValidationModel;
  readonly canSubmit: boolean;
  readonly allTouched: boolean;

  setLifecycleHandlers(handlers?: FormLifecycleHandlers): void;
  validateField(path: string, reason?: ValidationReason): Promise<ValidationResult>;
  validateForm(reason?: ValidationReason): Promise<FormValidationResult>;
  getError(path: string): ValidationError[] | undefined;
  isValidating(path: string): boolean;
  isTouched(path: string): boolean;
  isDirty(path: string): boolean;
  isVisited(path: string): boolean;
  touchField(path: string): void;
  visitField(path: string): void;
  clearErrors(path?: string): void;
  submit(options?: { interactionId?: string; signal?: AbortSignal }): Promise<ActionResult>;
  reset(values?: object): void;
  setValue(name: string, value: unknown): void;
  setValues(values: Record<string, unknown>): void;
  appendValue(path: string, value: unknown): void;
  prependValue(path: string, value: unknown): void;
  insertValue(path: string, index: number, value: unknown): void;
  removeValue(path: string, index: number): void;
  moveValue(path: string, from: number, to: number): void;
  swapValue(path: string, a: number, b: number): void;
  replaceValue(path: string, value: unknown): void;
  getField(path: string): CompiledFormValidationField | undefined;
  getDependents(path: string): string[];
  findByPrefix(prefix: string): string[];
  getChildren(path: string): string[];
}
```

## Related Documents

- `docs/architecture/form-validation.md`
- `docs/references/form-validation-execution-details.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
