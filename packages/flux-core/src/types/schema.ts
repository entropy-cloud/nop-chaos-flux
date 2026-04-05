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
}

export interface ApiObject extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  params?: SchemaValue;
  headers?: Record<string, string>;
  includeScope?: '*' | string[];
  responseAdaptor?: string;
  requestAdaptor?: string;
  cacheTTL?: number;
  cacheKey?: string;
  dedupStrategy?: 'cancel-previous' | 'parallel' | 'ignore-new';
}

export interface DataSourceSchema extends BaseSchema {
  type: 'data-source';
  api: ApiObject;
  dataPath?: string;
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
  initialData?: SchemaValue;
}

export interface DynamicRendererSchema extends BaseSchema {
  type: 'dynamic-renderer';
  schemaApi: ApiObject;
  body?: SchemaInput;
}

export interface XuiImportSpec extends SchemaObject {
  from: string;
  as: string;
  options?: Record<string, SchemaValue>;
}
