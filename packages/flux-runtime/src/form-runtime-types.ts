import type {
  AsyncGovernanceStore,
  CompiledFormValidationField,
  CompiledFormValidationModel,
  CompiledValidationRule,
  FormLifecycleHandlers,
  FormStoreApi,
  PageRuntime,
  RuntimeFieldRegistration,
  ScopeRef,
  ValidationError,
  ValidationRule,
  ValidationOwnerLifecycleState,
  ChildValidationContractRegistration,
} from '@nop-chaos/flux-core';

export interface CreateManagedFormRuntimeInput {
  id?: string;
  name?: string;
  initialValues?: Record<string, any>;
  parentScope?: ScopeRef;
  page?: PageRuntime;
  validation?: CompiledFormValidationModel;
  lifecycle?: FormLifecycleHandlers;
  validatingDelay?: number;
  submittingDelay?: number;
  existingStore?: FormStoreApi;
  existingScope?: ScopeRef;
  scopePath?: string;
  scopeBinding?: 'form' | 'none';
  initialLifecycleState?: ValidationOwnerLifecycleState;
  executeValidationRule: (
    compiledRule: CompiledValidationRule,
    rule: Extract<ValidationRule, { kind: 'async' }>,
    field: CompiledFormValidationField,
    scope: ScopeRef,
    signal?: AbortSignal,
  ) => Promise<ValidationError | undefined>;
  validateRule: (
    compiledRule: CompiledValidationRule,
    value: unknown,
    field: CompiledFormValidationField,
    scope: ScopeRef,
  ) => ValidationError | undefined;
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

export interface FormRuntimeCoreState
  extends FormRuntimeStoreScopeState, FormRuntimeInitialStateSlice {}

export interface FormRuntimeValidationRunState {
  validationRuns: Map<string, number>;
  pendingValidationDebounces: Map<string, PendingValidationDebounce>;
  validationAbortControllers: Map<string, AbortController>;
  validationAsyncGovernance: AsyncGovernanceStore;
}

export interface FormRuntimeRegistrationIndexState {
  runtimeFieldRegistrations: Map<string, RegisteredFieldEntry>;
  pathToRegistrationId: Map<string, string>;
  childPathToRegistrationId: Map<string, string>;
}

export type FormRuntimeRegistrationState = FormRuntimeCoreState & FormRuntimeRegistrationIndexState;

export interface FormRuntimeValidationOwnerState {
  inputValue: CreateManagedFormRuntimeInput;
  hiddenFields: Set<string>;
  lifecycleState: ValidationOwnerLifecycleState;
  modelGeneration: number;
  modelGenerationListeners: Set<() => void>;
  lifecycleWaiters: Set<() => void>;
}

export type FormRuntimeValidationState = FormRuntimeCoreState &
  FormRuntimeRegistrationIndexState &
  FormRuntimeValidationRunState &
  FormRuntimeValidationOwnerState &
  FormRuntimeExternalErrorState &
  FormRuntimeChildContractState;

export interface FormRuntimeExternalErrorState {
  externalErrors: Map<string, ExternalErrorEntry>;
}

export interface FormRuntimeChildContractState {
  childContracts: Map<string, ChildValidationContractRegistration>;
}

export type FormRuntimeOwnerState = FormRuntimeCoreState &
  FormRuntimeRegistrationIndexState &
  FormRuntimeValidationRunState &
  FormRuntimeValidationOwnerState &
  FormRuntimeExternalErrorState &
  FormRuntimeChildContractState;

export type ManagedFormRuntimeSharedState = FormRuntimeCoreState &
  FormRuntimeRegistrationIndexState &
  FormRuntimeValidationRunState &
  FormRuntimeValidationOwnerState &
  FormRuntimeExternalErrorState &
  FormRuntimeChildContractState;
