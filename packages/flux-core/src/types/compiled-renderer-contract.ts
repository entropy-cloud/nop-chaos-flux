import type { CompiledActionProgram } from './actions.js';
import type { BaseSchema } from './schema.js';
import type {
  RendererDefinitionShape,
  ValidationContributor,
} from './renderer-definition-types.js';

/**
 * Runtime subset of `RendererDefinitionShape` materialized onto every
 * compiled template node. Derived from the shape (RM-1 plan 603): the
 * non-generic channels are `Pick`ed (renaming or removing a shape key breaks
 * here at compile time) and `validation` references `ValidationContributor`
 * by name, so new members of shared channel types flow through without a
 * hand-copy to miss. `component` is the only non-shape member; it stays
 * opaque (`unknown`) on the compiled face.
 *
 * Variance constraint (RM-1 execution finding): `S` must appear only in the
 * covariant `type` slot. Generic-schema slots (`validation?: ValidationContributor<S>`)
 * or `Pick`ing S-generic members make cross-instantiation comparisons
 * (`CompiledRendererContract<PageSchema>` → `CompiledRendererContract<BaseSchema>`
 * under `TemplateNode`) resolve through the same-generic-interface shortcut,
 * which measures `S` as invariant and breaks every concrete-schema renderer's
 * `component` assignment. The non-generic `ValidationContributor` reference
 * keeps the runtime objects identical (the compiler copies `definition.validation`
 * wholesale) while keeping the type-level chain covariant.
 */
export type CompiledRendererContract<S extends BaseSchema = BaseSchema> = {
  type: S['type'];
  validation?: ValidationContributor;
} & Pick<
  RendererDefinitionShape<S>,
  | 'scopePolicy'
  | 'actionScopePolicy'
  | 'componentRegistryPolicy'
  | 'fields'
  | 'validationDefaults'
  | 'compilation'
  | 'wrap'
  | 'frameRootTag'
  | 'frameWrap'
  | 'staticCapable'
> & {
  component?: unknown;
};

export function toCompiledRendererContract<S extends BaseSchema = BaseSchema>(
  definition: {
    type: S['type'];
    component?: unknown;
    validation?: ValidationContributor;
  } & Pick<
    RendererDefinitionShape<S>,
    | 'scopePolicy'
    | 'actionScopePolicy'
    | 'componentRegistryPolicy'
    | 'fields'
    | 'validationDefaults'
    | 'compilation'
    | 'wrap'
    | 'frameRootTag'
    | 'frameWrap'
    | 'staticCapable'
  >,
): CompiledRendererContract<S> {
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
    frameWrap: definition.frameWrap,
    staticCapable: definition.staticCapable,
  };
}

export type TemplateCompiledActionProgram = CompiledActionProgram;
