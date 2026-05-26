import type { BaseSchema, SchemaFieldRule } from './schema.js';
import type { CompiledActionProgram } from './actions.js';
import type { ValidationRule } from './validation.js';

export interface CompiledRendererContract<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component?: unknown;
  scopePolicy?: 'inherit' | 'form';
  actionScopePolicy?: 'inherit' | 'new';
  componentRegistryPolicy?: 'inherit' | 'new';
  fields?: readonly SchemaFieldRule[];
  validation?: {
    kind: 'field' | 'container' | 'none';
    valueKind?: 'scalar' | 'array' | 'object';
    ownerResolution?: 'inherit-owner' | 'create-owner' | 'no-owner';
    childContractMode?: 'ignore' | 'summary-gate' | 'recurse-submit';
    getFieldPath?(schema: S, ctx: { schema: S; renderer: CompiledRendererContract<S>; path: string; fieldPathPrefix?: string }): string | undefined;
    collectRules?(schema: S, ctx: { schema: S; renderer: CompiledRendererContract<S>; path: string; fieldPathPrefix?: string }): ValidationRule[];
    getChildFieldPathPrefix?(schema: S, ctx: { schema: S; renderer: CompiledRendererContract<S>; path: string; fieldPathPrefix?: string }): string | false | undefined;
  };
  validationDefaults?: {
    defaultChildContractMode?: 'ignore' | 'summary-gate' | 'recurse-submit';
    collectDescendantValidation?: boolean;
  };
  compilation?: {
    artifacts?: readonly ('data-source' | 'reaction')[];
  };
  wrap?: boolean;
  frameRootTag?: 'div' | 'label';
  staticCapable?: boolean;
}

export function toCompiledRendererContract<S extends BaseSchema = BaseSchema>(definition: {
  type: S['type'];
  component?: unknown;
  scopePolicy?: 'inherit' | 'form';
  actionScopePolicy?: 'inherit' | 'new';
  componentRegistryPolicy?: 'inherit' | 'new';
  fields?: readonly SchemaFieldRule[];
  validation?: CompiledRendererContract<S>['validation'];
  validationDefaults?: CompiledRendererContract<S>['validationDefaults'];
  compilation?: CompiledRendererContract<S>['compilation'];
  wrap?: boolean;
  frameRootTag?: 'div' | 'label';
  staticCapable?: boolean;
}): CompiledRendererContract<S> {
  return {
    type: definition.type,
    component: definition.component,
    scopePolicy: definition.scopePolicy,
    actionScopePolicy: definition.actionScopePolicy,
    componentRegistryPolicy: definition.componentRegistryPolicy,
    fields: definition.fields,
    validation: definition.validation,
    validationDefaults: definition.validationDefaults,
    compilation: definition.compilation,
    wrap: definition.wrap,
    frameRootTag: definition.frameRootTag,
    staticCapable: definition.staticCapable,
  };
}

export type TemplateCompiledActionProgram = CompiledActionProgram;
