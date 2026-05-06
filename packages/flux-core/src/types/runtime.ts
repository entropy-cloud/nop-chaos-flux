import type { ActionResult } from './actions';
import type { AsyncOwnerDebugSnapshot, AsyncOwnerDebugState } from './async-governance';
import type { NodeInstance, TemplateNode } from './node-identity';
import type { ScopeRef } from './scope';
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
} from './validation';
import type { ActionScope } from './actions';
import type {
  ComponentHandleRegistry,
  RenderNodeInput,
  RenderRegionHandle,
  RendererRuntime,
  ResolvedNodeMeta,
} from './renderer';

export interface FieldState {
  touched?: true;
  dirty?: true;
  visited?: true;
  validating?: true;
  errors?: ValidationError[];
}

export interface FormStoreState {
  values: Record<string, any>;
  fieldStates: Record<string, FieldState>;
  submitting: boolean;
  submitAttempted: boolean;
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

export interface ValidationStoreApi {
  getState(): FormStoreState;
  subscribe(listener: () => void): () => void;
  subscribeToPath(path: string, listener: () => void): () => void;
  subscribeToPaths(paths: readonly string[], listener: () => void): () => void;
  subscribeToSubmitting(listener: () => void): () => void;
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
  validationOwner?: ValidationScopeRuntime;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  ownerTemplateNode?: TemplateNode;
  ownerNodeInstance?: NodeInstance;
  title?: RenderNodeInput | string;
  body?: RenderNodeInput;
  actions?: RenderNodeInput;
  meta?: Pick<ResolvedNodeMeta, 'className' | 'testid' | 'cid'>;
  regionHandles?: Readonly<Record<string, RenderRegionHandle>>;
  controlledOpen?: boolean;
  onOpen?: () => Promise<ActionResult> | ActionResult | void;
  onClose?: () => Promise<ActionResult> | ActionResult | void;
}

export interface SurfaceEntry extends OwnedSurfaceStateBase {
  surface: Record<string, any>;
}

export interface SurfaceStoreState {
  entries: SurfaceEntry[];
  uncontrolledOpenById: Readonly<Record<string, boolean>>;
}

export interface PageStoreState {
  data: Record<string, any>;
  refreshTick: number;
}

export interface PageStoreApi {
  getState(): PageStoreState;
  subscribe(listener: () => void): () => void;
  setData(data: Record<string, any>): void;
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
    surface: Record<string, any>;
    scope: ScopeRef;
    runtime: RendererRuntime;
    surfaceId?: string;
    options?: {
      actionScope?: ActionScope;
      componentRegistry?: ComponentHandleRegistry;
      ownerTemplateNode?: TemplateNode;
      ownerNodeInstance?: NodeInstance;
      title?: RenderNodeInput | string;
      body?: RenderNodeInput;
      actions?: RenderNodeInput;
      meta?: Pick<ResolvedNodeMeta, 'className' | 'testid' | 'cid'>;
      regionHandles?: Readonly<Record<string, RenderRegionHandle>>;
      controlledOpen?: boolean;
      onOpen?: () => Promise<ActionResult> | ActionResult | void;
      onClose?: () => Promise<ActionResult> | ActionResult | void;
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
}

export interface DataSourceController {
  getState(): DataSourceState;
  start(): void;
  stop(): void;
  refresh(): Promise<void>;
  reset(): void;
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
    patch: Partial<Pick<RuntimeFieldRegistration, 'childPaths'>>,
  ): void;
  notifyFieldHidden(path: string, hidden: boolean): void;
  touchField?(path: string): void;
  visitField?(path: string): void;

  refreshCompiledModel(newModel: CompiledFormValidationModel): void;
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
