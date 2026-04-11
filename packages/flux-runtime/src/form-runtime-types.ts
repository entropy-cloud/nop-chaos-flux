import type {
  ActionResult,
  ApiSchema,
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
    scope: ScopeRef
  ) => Promise<ValidationError | undefined>;
  validateRule: (
    compiledRule: CompiledValidationRule,
    value: unknown,
    field: CompiledFormValidationField,
    scope: ScopeRef
  ) => ValidationError | undefined;
  submitApi: (api: ApiSchema, scope: ScopeRef, options?: { interactionId?: string }) => Promise<ActionResult>;
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

export interface ManagedFormRuntimeSharedState {
  inputValue: CreateManagedFormRuntimeInput;
  store: FormStoreApi;
  scope: ScopeRef;
  initialFieldState: InitialFieldState;
  validationRuns: Map<string, number>;
  pendingValidationDebounces: Map<string, PendingValidationDebounce>;
  runtimeFieldRegistrations: Map<string, RegisteredFieldEntry>;
  pathToRegistrationId: Map<string, string>;
  hiddenFields: Set<string>;
  lifecycleState: ValidationOwnerLifecycleState;
  modelGeneration: number;
  externalErrors: Map<string, ExternalErrorEntry>;
  childContracts: Map<string, ChildValidationContractRegistration>;
}
