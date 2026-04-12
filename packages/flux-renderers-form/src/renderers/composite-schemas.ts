import type { ActionSchema, BaseSchema, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

export type SchemaInput = BaseSchema | BaseSchema[];

export interface ObjectFieldSchema extends BaseSchema {
  type: 'object-field';
  name: string;
  readOnly?: boolean;
  body: SchemaInput;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

export interface ArrayFieldSchema extends BaseSchema {
  type: 'array-field';
  name: string;
  readOnly?: boolean;
  itemKind: 'scalar' | 'object';
  item: SchemaInput;
  addable?: boolean;
  removable?: boolean;
  sortable?: boolean;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

export interface VariantMatch extends SchemaObject {
  kind: string;
  value?: SchemaValue;
  key?: string;
  requiredKeys?: string[];
  when?: SchemaValue;
}

export interface VariantOption extends SchemaObject {
  key: string;
  label: string;
  viewer?: SchemaInput;
  content: SchemaInput;
  match?: VariantMatch;
  initialValue?: SchemaValue;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

export interface VariantSelectorConfig extends SchemaObject {
  mode?: string;
  label?: string;
}

export interface VariantFieldSchema extends BaseSchema {
  type: 'variant-field';
  name: string;
  readOnly?: boolean;
  variants: VariantOption[];
  selector?: VariantSelectorConfig;
  defaultVariant?: string;
  detectVariantAction?: ActionSchema | ActionSchema[];
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

export interface DetailSurfaceConfig extends SchemaObject {
  mode?: string;
  title?: string;
  size?: string;
  placement?: string;
}

export interface DetailFieldSchema extends BaseSchema {
  type: 'detail-field';
  name: string;
  readOnly?: boolean;
  viewer?: SchemaInput;
  content: SchemaInput;
  surface?: DetailSurfaceConfig;
  trigger?: string;
  triggerLabel?: string;
  openAction?: ActionSchema | ActionSchema[];
  confirmAction?: ActionSchema | ActionSchema[];
  cancelAction?: ActionSchema | ActionSchema[];
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

export interface DetailViewSchema extends BaseSchema {
  type: 'detail-view';
  readOnly?: boolean;
  data?: SchemaObject;
  scopePath?: string;
  viewer?: SchemaInput;
  content: SchemaInput;
  surface?: DetailSurfaceConfig;
  trigger?: string;
  triggerLabel?: string;
  openAction?: ActionSchema | ActionSchema[];
  confirmAction?: ActionSchema | ActionSchema[];
  cancelAction?: ActionSchema | ActionSchema[];
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
