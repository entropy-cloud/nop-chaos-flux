import type { ActionContext, ActionResult, ActionSchema, ActionScope } from './actions.js';
import type { AsyncOwnerDebugSnapshot, AsyncOwnerDebugState } from './async-governance.js';
import type { ComponentHandleRegistryCore } from './component-handle-core.js';
import type { NodeInstance, TemplateNode } from './node-identity.js';
import type { ScopeRef } from './scope.js';
import type {
  ValidationRule,
  ValidationError,
  ValidationResult,
  FormValidationResult,
  CompiledFormValidationModel,
  CompiledFormValidationField,
  RuntimeFieldRegistration,
  ValidationOwnerLifecycleState,
  ValidationReason,
  FieldRegistrationHandle,
  ApplyExternalErrorsInput,
  ScopeValidationStateSnapshot,
  ChildValidationContractRegistration,
} from './validation.js';
import type { RenderNodeInput, RenderRegionHandle } from './render-fragment-types.js';

type SurfaceNodeMeta = {
  className?: string;
  testid?: string;
  cid?: number;
};

export interface FieldState {
  touched?: true;
  dirty?: true;
  visited?: true;
  validating?: true;
  errors?: ValidationError[];
}

export interface FormStoreState {
  values: Record<string, unknown>;
  fieldStates: Record<string, FieldState>;
  submitting: boolean;
  submitAttempted: boolean;
}

export type FormStoreCommitDiagnosticKind =
  | 'values'
  | 'fieldStates'
  | 'submitting'
  | 'submitAttempted';

export interface FormStoreCommitDiagnostic {
  timestamp: number;
  sequence: number;
  ownerId: string;
  changedPaths: readonly string[];
  changedKinds: readonly FormStoreCommitDiagnosticKind[];
}

export interface FormStoreDiagnosticsSnapshot {
  enabled: boolean;
  commitCount: number;
  recentCommits: readonly FormStoreCommitDiagnostic[];
  droppedCommitCount: number;
}

export interface FormStoreDiagnosticsOptions {
  maxRecentCommits?: number;
}

export interface FormStoreDiagnosticsOwnerQuery {
  formId?: string;
  formName?: string;
  scopeId?: string;
}

export interface FormStoreDiagnosticsOwnerSummary {
  formId: string;
  formName?: string;
  scopeId: string;
}

export interface FormStoreDiagnosticsBridge {
  listOwners(): FormStoreDiagnosticsOwnerSummary[];
  startSession(
    query: FormStoreDiagnosticsOwnerQuery,
    options?: FormStoreDiagnosticsOptions,
  ): boolean;
  stopSession(query: FormStoreDiagnosticsOwnerQuery): boolean;
  clearSession(query: FormStoreDiagnosticsOwnerQuery): boolean;
  getSnapshot(query: FormStoreDiagnosticsOwnerQuery): FormStoreDiagnosticsSnapshot | undefined;
}

export interface FormErrorQuery {
  path?: string;
  ownerPath?: string;
  sourceKinds?: Array<NonNullable<ValidationError['sourceKind']>>;
  rule?: ValidationRule['kind'];
}

export interface FormFieldStateSnapshot {
  error?: ValidationError;
  validating: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
  submitting: boolean;
  submitAttempted: boolean;
}

export interface FormFieldPresentationSnapshot extends FormFieldStateSnapshot {
  effectiveDisabled: boolean;
  effectiveRequired: boolean;
  showError: boolean;
  interactive: boolean;
  readOnly: boolean;
}

export interface FormPathState {
  errors: ValidationError[] | undefined;
  validating: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
}

export type { FieldState as FormFieldState };

export interface FormStoreApi {
  getState(): FormStoreState;
  subscribe(listener: () => void): () => void;
  subscribeToPath(path: string, listener: () => void): () => void;
  subscribeToPaths(paths: readonly string[], listener: () => void): () => void;
  subscribeToSubmitting(listener: () => void): () => void;
  subscribeToModelGeneration?(listener: () => void): () => void;
  getPathState(path: string): FormPathState;
  getFieldState(path: string): FieldState | undefined;
  setFieldState(path: string, state: Partial<FieldState>): void;
  setValues(values: Record<string, unknown>): void;
  setValue(path: string, value: unknown): void;
  setPathErrors(path: string, errors?: ValidationError[]): void;
  setValidating(path: string, validating: boolean): void;
  setTouched(path: string, touched: boolean): void;
  setDirty(path: string, dirty: boolean): void;
  setVisited(path: string, visited: boolean): void;
  setSubmitting(submitting: boolean): void;
  setSubmitAttempted(submitAttempted: boolean): void;
  batchUpdate(updates: Partial<FormStoreState>): void;
  startDiagnosticsSession(options?: FormStoreDiagnosticsOptions): void;
  stopDiagnosticsSession(): void;
  clearDiagnosticsSession(): void;
  getDiagnosticsSnapshot(): FormStoreDiagnosticsSnapshot;
}

export interface ValidationStoreApi {
  getState(): FormStoreState;
  subscribe(listener: () => void): () => void;
  subscribeToPath(path: string, listener: () => void): () => void;
  subscribeToPaths(paths: readonly string[], listener: () => void): () => void;
  subscribeToSubmitting(listener: () => void): () => void;
  subscribeToModelGeneration?(listener: () => void): () => void;
  getPathState(path: string): FormPathState;
  getFieldState(path: string): FieldState | undefined;
}

export interface FormStatusSummary {
  id?: string;
  name?: string;
  submitting: boolean;
  validating: boolean;
  dirty: boolean;
  touched: boolean;
  visited: boolean;
  valid: boolean;
  invalid: boolean;
  hasErrors: boolean;
  errorCount: number;
}

export interface PageStatusSummary {
  refreshTick: number;
}

export interface SurfaceStatusSummary {
  id: string;
  kind: 'dialog' | 'drawer' | 'sheet';
  open: boolean;
  active: boolean;
  opening: boolean;
  closing: boolean;
}

export interface TabsStatusSummary {
  activeValue?: string | number;
  activeIndex: number;
  itemCount: number;
}

export interface DomainHostStatusSummary {
  kind: string;
}

export interface DataSourceStatusSummary {
  started: boolean;
  loading: boolean;
  ready: boolean;
  stale: boolean;
  hasData: boolean;
  hasError: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  inFlightCount: number;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  failureCount: number;
  failureReason?: unknown;
  error?: { message: string };
  async?: AsyncOwnerDebugState;
}

export interface FormLifecycleHandlers {
  submitAction?: (options?: {
    interactionId?: string;
    signal?: AbortSignal;
  }) => Promise<ActionResult>;
  onSubmitSuccess?: (
    result: ActionResult,
    options?: { interactionId?: string; signal?: AbortSignal },
  ) => Promise<ActionResult>;
  onSubmitError?: (
    result: ActionResult,
    options?: { interactionId?: string; signal?: AbortSignal },
  ) => Promise<ActionResult>;
  onValidateError?: (
    result: ActionResult,
    options?: { interactionId?: string; signal?: AbortSignal },
  ) => Promise<ActionResult>;
}

export interface OwnedSurfaceStateBase {
  id: string;
  kind: 'dialog' | 'drawer' | 'sheet';
  scope: ScopeRef;
  ownerScope?: ScopeRef;
  validationOwner?: ValidationScopeRuntime;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistryCore;
  ownerTemplateNode?: TemplateNode;
  ownerNodeInstance?: NodeInstance;
  title?: RenderNodeInput | string;
  body?: RenderNodeInput;
  actions?: RenderNodeInput;
  /**
   * The form runtime registered by a form with `submitScope: 'surface'`.
   * Populated when the form mounts; cleared when it unmounts. Used by the
   * renderer to resolve `ctx.form` for action buttons rendered outside the
   * form's FormContext (e.g. dialog footer submit button).
   */
  surfaceForm?: FormRuntime;
  meta?: SurfaceNodeMeta;
  regionHandles?: Readonly<Record<string, RenderRegionHandle>>;
  controlledOpen?: boolean;
  onOpen?: () => Promise<ActionResult> | ActionResult | void;
  onClose?: () => Promise<ActionResult> | ActionResult | void;
  onConfirm?: () => Promise<ActionResult> | ActionResult | void;
  /**
   * Lifecycle hooks authored in schema form (ActionSchema | ActionSchema[]).
   *
   * Populated only by action-style openDialog/openDrawer when the schema declares
   * `args.onClose` / `args.onSubmitSuccess` / `args.onSubmitError`. Declarative
   * surfaces keep using the function-based `onClose` above.
   *
   * Hooks are dispatched in the owner ctx (see SurfaceEntry.ownerActionCtx) when
   * the corresponding surface event fires. See
   * `docs/architecture/surface-lifecycle-callbacks.md`.
   */
  onCloseNodes?: ActionSchema | ActionSchema[];
  onSubmitSuccessNodes?: ActionSchema | ActionSchema[];
  onSubmitErrorNodes?: ActionSchema | ActionSchema[];
  /**
   * Snapshot of the owner ActionContext captured at surface open time. Used by
   * lifecycle hook dispatch to reconstruct an owner-side ctx (scope, runtime,
   * componentRegistry, etc.). May become stale if the owner runtime is torn down
   * while the surface is still open; consumers must guard against disposed
   * runtimes.
   */
  ownerActionCtx?: ActionContext;
}

export interface SurfaceEntry extends OwnedSurfaceStateBase {
  surface: Record<string, unknown>;
}

export interface SurfaceStoreState {
  entries: SurfaceEntry[];
  uncontrolledOpenById: Readonly<Record<string, boolean>>;
}

export interface PageStoreState {
  data: Record<string, unknown>;
  refreshTick: number;
}

export interface PageStoreApi {
  getState(): PageStoreState;
  subscribe(listener: () => void): () => void;
  setData(data: Record<string, unknown>): void;
  updateData(path: string, value: unknown): void;
  refresh(): void;
}

export interface SurfaceStoreApi {
  getState(): SurfaceStoreState;
  subscribe(listener: () => void): () => void;
  push(entry: SurfaceEntry): void;
  upsert(entry: SurfaceEntry): void;
  remove(surfaceId?: string): SurfaceEntry | undefined;
  setUncontrolledOpen(surfaceId: string, open: boolean): void;
  getUncontrolledOpen(surfaceId: string): boolean | undefined;
  clearUncontrolledOpen(surfaceId: string): void;
}

export interface SurfaceRuntime {
  store: SurfaceStoreApi;
  open(input: {
    kind: 'dialog' | 'drawer' | 'sheet';
  surface: Record<string, unknown>;
    scope: ScopeRef;
    surfaceId?: string;
    options?: {
      ownerScope?: ScopeRef;
      actionScope?: ActionScope;
      componentRegistry?: ComponentHandleRegistryCore;
      validationPlan?: CompiledFormValidationModel;
      ownerTemplateNode?: TemplateNode;
      ownerNodeInstance?: NodeInstance;
      title?: RenderNodeInput | string;
      body?: RenderNodeInput;
      actions?: RenderNodeInput;
      meta?: SurfaceNodeMeta;
      regionHandles?: Readonly<Record<string, RenderRegionHandle>>;
      controlledOpen?: boolean;
      onOpen?: () => Promise<ActionResult> | ActionResult | void;
      onClose?: () => Promise<ActionResult> | ActionResult | void;
      onConfirm?: () => Promise<ActionResult> | ActionResult | void;
      // ── lifecycle hook schema nodes (action-style openDialog/openDrawer only) ──
      onCloseNodes?: ActionSchema | ActionSchema[];
      onSubmitSuccessNodes?: ActionSchema | ActionSchema[];
      onSubmitErrorNodes?: ActionSchema | ActionSchema[];
      // ── owner ActionContext snapshot for hook dispatch ──
      ownerActionCtx?: ActionContext;
    };
  }): string;
  upsert(entry: SurfaceEntry): void;
  publishStatus(surfaceId?: string): void;
  publishClosed(input: {
    surfaceId: string;
    kind: 'dialog' | 'drawer' | 'sheet';
    scope: ScopeRef;
    statusPath?: string;
  }): void;
  close(surfaceId?: string): void;
  closeTop(): void;
  /**
   * Trigger a lifecycle hook (submit:success / submit:error / close) on the
   * given entry, dispatching the corresponding hook schema nodes in the
   * owner ctx. Used by form submit flow when a `submitScope: 'surface'` form
   * completes ajax. See `docs/architecture/surface-lifecycle-callbacks.md`.
   *
   * Returns the hook dispatch result; callers do not need to await close()
   * (close still has its own onCloseNodes fire-and-forget path).
   */
  triggerHook?(
    entry: SurfaceEntry,
    hookName: 'submit:success' | 'submit:error' | 'close',
    payload: {
      result?: unknown;
      formData?: Record<string, unknown>;
      hookName?: 'close' | 'submit:success' | 'submit:error';
    },
  ): Promise<ActionResult>;
  /**
   * Register or clear the surface form. Called by a form with
   * `submitScope: 'surface'` on mount / unmount so that action buttons
   * outside FormContext (e.g. dialog footer) can resolve `ctx.form`.
   */
  setSurfaceForm?(surfaceId: string, form: FormRuntime | undefined): void;
  /**
   * Get the surface form registered via `setSurfaceForm`. Returns undefined
   * when no form has registered or the surface is not found.
   */
  getSurfaceForm?(surfaceId: string): FormRuntime | undefined;
  dispose(): void;
}

export interface DataSourceController {
  getState(): DataSourceState;
  start(): void;
  stop(): void;
  refresh(): Promise<DataSourceRefreshResult>;
  reset(): void;
}

export interface DataSourceRefreshResult {
  /** true when the refresh was skipped (e.g. sendOn gate evaluated falsy) */
  skipped: boolean;
}

export type DataSourceStatus = 'idle' | 'pending' | 'success' | 'error';

export type DataSourceFetchStatus = 'idle' | 'fetching';

export interface DataSourceState {
  started: boolean;
  status: DataSourceStatus;
  fetchStatus: DataSourceFetchStatus;
  stale: boolean;
  hasData: boolean;
  hasError: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  inFlightCount: number;
  data?: unknown;
  error?: unknown;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  failureCount: number;
  failureReason?: unknown;
  async?: AsyncOwnerDebugState;
}

export interface DataSourceRegistration {
  id: string;
  controller: DataSourceController;
  dispose(): void;
}

export interface ApplyScopeChangesInput {
  writes: Record<string, unknown>;
  changedPaths: string[];
  reason: ValidationReason;
}

export interface ValidationScopeRuntime {
  readonly scopeId: string;
  readonly rootPath: string;
  readonly lifecycleState: ValidationOwnerLifecycleState;
  readonly modelGeneration: number;
  subscribeToModelGeneration?(listener: () => void): () => void;
  readonly store?: ValidationStoreApi;
  readonly scope?: ScopeRef;
  readonly validation?: CompiledFormValidationModel;

  validateAt(
    path: string,
    reason?: ValidationReason,
    options?: { signal?: AbortSignal },
  ): Promise<ValidationResult>;
  validateSubtree(
    path: string,
    reason?: ValidationReason,
    options?: { signal?: AbortSignal },
  ): Promise<FormValidationResult>;
  validateAll(reason?: ValidationReason, options?: { signal?: AbortSignal }): Promise<FormValidationResult>;

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

  refreshCompiledModel(newModel: CompiledFormValidationModel | undefined): void;
  dispose(): void;

  registerChildContract(contract: ChildValidationContractRegistration): void;
  unregisterChildContract(childOwnerId: string): void;
}

export interface FormRuntime extends ValidationScopeRuntime {
  id: string;
  name?: string;
  store: FormStoreApi;
  scope: ScopeRef;
  validation?: CompiledFormValidationModel;
  readonly canSubmit: boolean;
  readonly allTouched: boolean;
  setLifecycleHandlers(handlers?: FormLifecycleHandlers): void;
  validateField(
    path: string,
    reason?: ValidationReason,
    options?: { signal?: AbortSignal },
  ): Promise<ValidationResult>;
  validateForm(
    reason?: ValidationReason,
    options?: { signal?: AbortSignal },
  ): Promise<FormValidationResult>;
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
  subscribeToModelGeneration?(listener: () => void): () => void;
  setRefreshHandler(handler: (() => Promise<void>) | undefined): void;
  refresh(): Promise<void>;
}

export interface PageRuntime {
  store: PageStoreApi;
  scope: ScopeRef;
  validationOwner?: ValidationScopeRuntime;
  refresh(): void;
  modalContainer?: string;
}

export interface SurfaceRendererProps {
  surfaces: SurfaceEntry[];
  renderSurface: (surface: SurfaceEntry) => any;
}
