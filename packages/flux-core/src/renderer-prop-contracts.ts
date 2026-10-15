import type { RendererDefinition } from './types/renderer-core.js';
import type { RendererPropContract } from './types/renderer-definition-types.js';

/**
 * Contract view over a renderer's `fields` entries (RM-3 plan 605; RM-4 plan
 * 606 removed the former `propContracts` record — the inline `contract` on
 * `kind: 'prop'` entries is the single source).
 */
export function resolveRendererPropContracts(
  renderer: RendererDefinition,
): Readonly<Record<string, RendererPropContract>> {
  const contracts: Record<string, RendererPropContract> = {};

  for (const field of renderer.fields ?? []) {
    if (field.kind !== 'prop' || !field.key || !field.contract) {
      continue;
    }
    if (field.key in contracts) {
      continue;
    }
    contracts[field.key] = {
      shape: field.contract.shape,
      displayName: field.contract.displayName ?? field.key,
      description: field.contract.description,
      editorType: field.contract.editorType,
      defaultValue: field.contract.defaultValue,
      required: field.contract.required,
    };
  }

  return contracts;
}
