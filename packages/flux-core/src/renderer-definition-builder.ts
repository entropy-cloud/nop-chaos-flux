import type {
  RegisteredRendererDefinition,
  RendererDefinition,
} from './types/renderer-core.js';

/**
 * Builder for `RendererDefinition` registration literals (cq-2 Phase 5).
 * `family` pins the package-wide invariants (category/sourcePackage and a
 * defaultSchema factory) once; each entry then only states what varies. The
 * output type is `RegisteredRendererDefinition` (RM-1 plan 603): entries must
 * carry `component`, matching the registry's registration invariant without a
 * second runtime-only guarantee. The produced objects are structurally
 * identical to the former hand-written literals, so registry behavior and the
 * contract gates (`schema-prop-coverage`, `finite-prop-contracts`) are
 * unaffected.
 */
export function defineRendererFamily(options: {
  sourcePackage?: string;
  defaultSchema?: (type: string) => Record<string, unknown>;
}) {
  const { defaultSchema: familyDefaultSchema, ...familyRest } = options;
  return function defineRenderer<S extends Record<string, unknown>>(
    entry: Omit<RendererDefinition, 'sourcePackage' | 'defaultSchema' | 'type' | 'component'> & {
      type: string;
      component: NonNullable<RendererDefinition['component']>;
      defaultSchema?: S;
    },
  ): RegisteredRendererDefinition {
    return {
      ...familyRest,
      ...entry,
      defaultSchema:
        entry.defaultSchema ??
        (familyDefaultSchema
          ? (familyDefaultSchema as (type: string) => Record<string, unknown>)(entry.type)
          : undefined),
    } as RegisteredRendererDefinition;
  };
}
