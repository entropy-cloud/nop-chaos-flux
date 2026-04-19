import type {
  ActionResult,
  ApiSchema,
  CompiledFormValidationField,
  CompiledFormValidationModel,
  CompiledValidationRule,
  FormLifecycleHandlers,
  FormStoreApi,
  OperationControlConfig,
  PageRuntime,
  RuntimeFieldRegistration,
  ScopeRef,
  ValidationError,
  ValidationRule,
  ValidationOwnerLifecycleState,
  ChildValidationContractRegistration
} from '@nop-chaos/flux-core';

export interface CreateManagedFormRuntimeInput {
  id?: string;
  name?: string;
  initialValues?: Record<string, any>;
  parentScope: ScopeRef;
  page?: PageRuntime;
  validation?: CompiledFormValidationModel;
  lifecycle?: FormLifecycleHandlers;
  validatingDelay?: number;
  submittingDelay?: number;
  executeValidationRule: (
    compiledRule: CompiledValidationRule,
    rule: Extract<ValidationRule, { kind: 'async' }>,
    field: CompiledFormValidationField,
    scope: ScopeRef,
    signal?: AbortSignal
  ) => Promise<ValidationError | undefined>;
  validateRule: (
    compiledRule: CompiledValidationRule,
    value: unknown,
    field: CompiledFormValidationField,
    scope: ScopeRef
  ) => ValidationError | undefined;
  submitApi: (api: ApiSchema, scope: ScopeRef, options?: { interactionId?: string; signal?: AbortSignal; control?: OperationControlConfig }) => Promise<ActionResult>;
}

export interface InitialFieldState {
  initialValues: Record<string, unknown>;
  dirty: Record<string, boolean>;
}

export interface PendingValidationDebounce {
  timer: ReturnType<typeof setTimeout>;
  resolve: (run: boolean) => void;
  reject: (error: unknown) => void;
}

export interface RegisteredFieldEntry {
  registrationId: string;
  registration: RuntimeFieldRegistration;
  modelGeneration: number;
}

export interface ExternalErrorEntry {
  sourceId: string;
  errors: ValidationError[];
}

export interface FormRuntimeStoreScopeState {
  store: FormStoreApi;
  scope: ScopeRef;
}

export interface FormRuntimeInitialStateSlice {
  initialFieldState: InitialFieldState;
}

export interface FormRuntimeValidationRunState {
  validationRuns: Map<string, number>;
  pendingValidationDebounces: Map<string, PendingValidationDebounce>;
  validationAbortControllers: Map<string, AbortController>;
}

export interface FormRuntimeRegistrationState
  extends FormRuntimeStoreScopeState,
    FormRuntimeInitialStateSlice {
  runtimeFieldRegistrations: Map<string, RegisteredFieldEntry>;
  pathToRegistrationId: Map<string, string>;
}

export interface FormRuntimeValidationState
  extends FormRuntimeRegistrationState,
    FormRuntimeValidationRunState {
  inputValue: CreateManagedFormRuntimeInput;
  hiddenFields: Set<string>;
  lifecycleState: ValidationOwnerLifecycleState;
  modelGeneration: number;
}

export interface FormRuntimeExternalErrorState extends FormRuntimeStoreScopeState {
  externalErrors: Map<string, ExternalErrorEntry>;
}

export interface FormRuntimeChildContractState {
  childContracts: Map<string, ChildValidationContractRegistration>;
}

export interface FormRuntimeOwnerState
  extends FormRuntimeValidationState,
    FormRuntimeExternalErrorState,
    FormRuntimeChildContractState {}

export interface ManagedFormRuntimeSharedState extends FormRuntimeOwnerState {}
