import type {
  ActionResult,
  ApiObject,
  CompiledFormValidationField,
  CompiledFormValidationModel,
  CompiledValidationRule,
  FormStoreApi,
  PageRuntime,
  RuntimeFieldRegistration,
  ScopeRef,
  ValidationError,
  ValidationRule
} from '@nop-chaos/amis-schema';

export interface CreateManagedFormRuntimeInput {
  id?: string;
  initialValues?: Record<string, any>;
  parentScope: ScopeRef;
  page?: PageRuntime;
  validation?: CompiledFormValidationModel;
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
  submitApi: (api: ApiObject, scope: ScopeRef) => Promise<ActionResult>;
}

export interface InitialFieldState {
  initialValues: Record<string, unknown>;
  dirty: Record<string, boolean>;
}

export interface PendingValidationDebounce {
  timer: ReturnType<typeof setTimeout>;
  resolve: (run: boolean) => void;
}

export interface ManagedFormRuntimeSharedState {
  inputValue: CreateManagedFormRuntimeInput;
  store: FormStoreApi;
  scope: ScopeRef;
  initialFieldState: InitialFieldState;
  validationRuns: Map<string, number>;
  pendingValidationDebounces: Map<string, PendingValidationDebounce>;
  runtimeFieldRegistrations: Map<string, RuntimeFieldRegistration>;
}
