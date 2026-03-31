import type { ApiObject, ValidationTrigger, ValidationVisibilityTrigger } from './schema';

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
  | { kind: 'async'; api: ApiObject; debounce?: number; message?: string };

export interface ValidationError {
  path: string;
  message: string;
  rule: ValidationRule['kind'];
  ruleId?: string;
  ownerPath?: string;
  sourceKind?: 'field' | 'object' | 'array' | 'form' | 'runtime-registration';
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
}

export interface CompiledValidationRule {
  id: string;
  rule: ValidationRule;
  dependencyPaths: string[];
  precompiled?: {
    regex?: RegExp;
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
}

export interface CompiledFormValidationModel {
  order: string[];
  behavior: CompiledValidationBehavior;
  dependents: Record<string, string[]>;
  nodes?: Record<string, CompiledValidationNode>;
  validationOrder?: string[];
  rootPath?: string;
}
