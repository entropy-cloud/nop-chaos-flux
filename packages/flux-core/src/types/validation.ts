import type { ActionSchema } from './actions.js';
import type { ValidationTrigger, ValidationVisibilityTrigger, SchemaObject } from './schema.js';

export interface HiddenFieldPolicy extends SchemaObject {
  validateWhenHidden?: boolean;
  clearValueWhenHidden?: boolean;
}

export type ValidationRule =
  | { kind: 'required'; message?: string }
  | { kind: 'minLength'; value: number; message?: string }
  | { kind: 'maxLength'; value: number; message?: string }
  | { kind: 'minItems'; value: number; message?: string }
  | { kind: 'maxItems'; value: number; message?: string }
  | { kind: 'atLeastOneFilled'; itemPath?: string; message?: string }
  | { kind: 'allOrNone'; itemPaths: string[]; message?: string }
  | { kind: 'uniqueBy'; itemPath: string; message?: string }
  | { kind: 'atLeastOneOf'; paths: string[]; message?: string }
  | { kind: 'pattern'; value: string; message?: string }
  | { kind: 'email'; message?: string }
  | { kind: 'equalsField'; path: string; message?: string }
  | { kind: 'notEqualsField'; path: string; message?: string }
  | { kind: 'requiredWhen'; path: string; equals: unknown; message?: string }
  | { kind: 'requiredUnless'; path: string; equals: unknown; message?: string }
  | { kind: 'async'; action: ActionSchema; debounce?: number; message?: string };

export interface ValidationError {
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

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export interface FormValidationResult extends ValidationResult {
  fieldErrors: Record<string, ValidationError[]>;
}

export interface RuntimeFieldRegistration {
  path: string;
  getValue(): unknown;
  childPaths?: string[];
  hiddenFieldPolicy?: HiddenFieldPolicy;
  syncValue?(): unknown;
  onRemove?(): void;
  validateChild?(path: string): Promise<ValidationError[]> | ValidationError[];
  validate?(): Promise<ValidationError[]> | ValidationError[];
}

export interface CompiledValidationBehavior {
  triggers: ValidationTrigger[];
  showErrorOn: ValidationVisibilityTrigger[];
}

export interface CompiledFormValidationField {
  path: string;
  controlType: string;
  label?: string;
  rules: CompiledValidationRule[];
  behavior: CompiledValidationBehavior;
  hiddenFieldPolicy: HiddenFieldPolicy;
}

export interface CompiledValidationRule {
  id: string;
  rule: ValidationRule;
  dependencyPaths: string[];
  precompiled?: {
    regex?: RegExp;
    error?: string;
    safe?: boolean;
  };
}

export type CompiledValidationNodeKind = 'field' | 'object' | 'array' | 'form';

export interface CompiledValidationNode {
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

export interface CompiledFormValidationModel {
  order: string[];
  behavior: CompiledValidationBehavior;
  dependents: Record<string, string[]>;
  nodes?: Record<string, CompiledValidationNode>;
  rootPath?: string;
  ownerId?: string;
  defaultHiddenFieldPolicy?: HiddenFieldPolicy;
}

export type ValidationOwnerLifecycleState = 'bootstrapping' | 'active' | 'refreshing' | 'disposed';

export type ValidationReason = 'change' | 'blur' | 'submit' | 'commit' | 'system' | 'manual';

export interface FieldRegistrationHandle {
  accepted: boolean;
  registrationId: string;
  unregister(): void;
}

export interface ApplyExternalErrorsInput {
  sourceId: string;
  errors: ValidationError[];
  replace?: boolean;
}

export interface ScopeValidationStateSnapshot {
  valid: boolean;
  hasErrors: boolean;
  validating: boolean;
  lifecycleState: ValidationOwnerLifecycleState;
  ready: boolean;
  modelGeneration: number;
}

export type ValidationOwnerBoundaryKind = 'inherit-owner' | 'create-owner' | 'no-owner';

export type ChildValidationMode = 'ignore' | 'summary-gate' | 'recurse-submit';

export interface ValidationOwnerPlan {
  boundary: ValidationOwnerBoundaryKind;
  childContractMode?: ChildValidationMode;
}

export interface ChildValidationContract {
  childOwnerId: string;
  mode: ChildValidationMode;
}

export interface ChildValidationScopeState {
  ready: boolean;
  validating: boolean;
  valid: boolean;
  hasErrors: boolean;
}

export interface ChildValidationContractRegistration extends ChildValidationContract {
  active: boolean;
  unregister(): void;
  getState(): ChildValidationScopeState;
  triggerValidation(): Promise<ValidationResult>;
}
