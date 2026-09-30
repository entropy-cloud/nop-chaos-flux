import type { RendererDefinition } from './types/renderer-core.js';

/**
 * Builder for `RendererDefinition` registration literals (cq-2 Phase 5).
 * `family` pins the package-wide invariants (category/sourcePackage and a
 * defaultSchema factory) once; each entry then only states what varies. The
 * output shape is exactly `RendererDefinition` — registry behavior and the
 * contract gates (`schema-prop-coverage`, `finite-prop-contracts`) are
 * unaffected because the produced objects are structurally identical to the
 * former hand-written literals.
 */
export function defineRendererFamily(options: {
  sourcePackage?: string;
  defaultSchema?: (type: string) => Record<string, unknown>;
}) {
  const { defaultSchema: familyDefaultSchema, ...familyRest } = options;
  return function defineRenderer<S extends Record<string, unknown>>(
    entry: Omit<RendererDefinition, 'sourcePackage' | 'defaultSchema' | 'type'> & {
      type: string;
      defaultSchema?: S;
    },
  ): RendererDefinition {
    return {
      ...familyRest,
      ...entry,
      defaultSchema:
        entry.defaultSchema ??
        (familyDefaultSchema
          ? (familyDefaultSchema as (type: string) => Record<string, unknown>)(entry.type)
          : undefined),
    } as RendererDefinition;
  };
}
