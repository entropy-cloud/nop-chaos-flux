import type { ActionSchema, ActionShapeFields } from './actions';

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type SchemaValue = Primitive | SchemaObject | ReadonlyArray<SchemaValue> | SchemaValue[];

export interface SchemaObject {
  [key: string]: SchemaValue;
}

export type SchemaPath = string;

export type ValidationTrigger = 'change' | 'blur' | 'submit';
export type ValidationVisibilityTrigger = 'touched' | 'dirty' | 'visited' | 'submit';
export type ScopePolicy = 'inherit' | 'form';
export type SchemaFieldKind = 'meta' | 'prop' | 'region' | 'value-or-region' | 'event' | 'ignored';
export type FrameWrapMode = boolean | 'label' | 'group' | 'none';

export interface BaseSchema extends SchemaObject {
  type: string;
  id?: string;
  name?: string;
  label?: string;
  title?: string;
  className?: string;
  classAliases?: Record<string, string>;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  testid?: string;
  frameWrap?: FrameWrapMode;
  validateOn?: ValidationTrigger | ValidationTrigger[];
  showErrorOn?: ValidationVisibilityTrigger | ValidationVisibilityTrigger[];
  onMount?: ActionSchema | ActionSchema[];
  onUnmount?: ActionSchema | ActionSchema[];
  'xui:imports'?: XuiImportSpec[];
}

export type SchemaInput = BaseSchema | BaseSchema[];

export interface BoundFieldSchemaBase extends BaseSchema {
  name: string;
  readOnly?: boolean;
  required?: boolean;
}

export interface SchemaFieldRule {
  key: string;
  kind: SchemaFieldKind;
  regionKey?: string;
  allowSource?: boolean;
  sourceStateKey?: string;
  /**
   * Declared parameter names for parameterized regions.
   * Only valid when kind is 'region' or 'value-or-region'.
   * Names must not start with '$' (reserved for slot-frame metadata).
   * At runtime, these bindings are published under the reserved $slot frame
   * rather than flattened into top-level scope names.
   */
  params?: readonly string[];
  /**
   * When true, the child scope created for this parameterized region is
   * isolated from parent lexical scope.
   * Defaults to false (inherits parent scope).
   */
  isolate?: boolean;
}

export type RequestDedupStrategy = 'cancel-previous' | 'parallel' | 'ignore-new';

export interface OperationControlConfig extends SchemaObject {
  timeout?: number;
  retry?: {
    times: number;
    delay?: number;
    strategy?: 'fixed' | 'exponential';
    maxDelay?: number;
  };
  debounce?: number;
  throttle?: number;
  cacheTTL?: number;
  cacheKey?: string;
  dedup?: RequestDedupStrategy;
}

export interface ApiSchema extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  params?: SchemaValue;
  headers?: Record<string, string>;
  includeScope?: '*' | string[];
  responseAdaptor?: string;
  requestAdaptor?: string;

  // Legacy compatibility carriers. Prefer ActionSchema/SourceSchema.control.
  cacheTTL?: number;
  cacheKey?: string;
  dedupStrategy?: RequestDedupStrategy;
}

export interface ExecutableApiRequest extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  headers?: Record<string, string>;
  params?: never;
  includeScope?: never;
  responseAdaptor?: never;
  requestAdaptor?: never;
  cacheTTL?: never;
  cacheKey?: never;
  dedupStrategy?: never;
}

export interface PreparedApiRequest {
  request: ExecutableApiRequest;
  data: SchemaValue | undefined;
  params: Record<string, unknown> | undefined;
  finalUrl: string;
}

export interface BaseDataSourceSchema extends BaseSchema {
  type: 'data-source';
  name?: string;
  mergeToScope?: boolean;
  resultMapping?: Record<string, SchemaValue>;
  statusPath?: string;
  dependsOn?: string[];
  initialData?: SchemaValue;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
}

export interface SourceActionSchema extends ActionShapeFields {
  action?: string;
  formula?: SchemaValue;
}

export interface SourceSchema extends SourceActionSchema {
  type: 'source';
}

export interface FormulaDataSourceSchema extends BaseDataSourceSchema, ActionShapeFields {
  formula: SchemaValue;
  action?: never;
  api?: never;
}

export interface ActionDataSourceSchema extends BaseDataSourceSchema, SourceActionSchema {
  action?: string;
  api: ApiSchema;
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
}

export type DataSourceSchema = FormulaDataSourceSchema | ActionDataSourceSchema;

export interface ReactionSchema extends BaseSchema {
  type: 'reaction';
  watch: SchemaValue;
  dependsOn?: string[];
  when?: string;
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
  actions: ActionSchema;
}

export interface DynamicRendererSchema extends BaseSchema {
  type: 'dynamic-renderer';
  schemaApi: ApiSchema;
  body?: SchemaInput;
}

export interface XuiImportSpec extends SchemaObject {
  from: string;
  as: string;
  options?: Record<string, SchemaValue>;
}
