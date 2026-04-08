import type { ActionSchema } from './actions';

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
  'xui:imports'?: XuiImportSpec[];
}

export type SchemaInput = BaseSchema | BaseSchema[];

export interface SchemaFieldRule {
  key: string;
  kind: SchemaFieldKind;
  regionKey?: string;
  allowSource?: boolean;
  sourceStateKey?: string;
}

export type RequestDedupStrategy = 'cancel-previous' | 'parallel' | 'ignore-new';

export interface OperationControlConfig extends SchemaObject {
  timeout?: number;
  retry?: {
    times: number;
    delay?: number;
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

export type ApiObject = ApiSchema;

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
  statusPath?: string;
  dataPath?: string;
  dependsOn?: string[];
  initialData?: SchemaValue;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
}

export interface SourceActionSchema extends Omit<ActionSchema, 'action'> {
  action?: string;
  formula?: SchemaValue;
}

export interface SourceSchema extends SourceActionSchema {
  type: 'source';
}

export interface FormulaDataSourceSchema extends BaseDataSourceSchema, Omit<ActionSchema, 'action'> {
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
