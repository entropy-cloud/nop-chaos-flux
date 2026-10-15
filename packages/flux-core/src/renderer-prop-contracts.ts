import type { RendererDefinition } from './types/renderer-core.js';
import type { RendererPropContract } from './types/renderer-definition-types.js';

/**
 * Dual-read view over a renderer's prop contracts (RM-3, plan 605): the
 * `propContracts` record is the authoritative base, and `fields` entries that
 * carry an inline `contract` (kind 'prop') fill in keys the record does not
 * cover. With no inline contracts — the current state of every declaration —
 * the output is key-for-key identical to `propContracts ?? {}`; RM-4 removes
 * the record and this helper degrades to the fields-only single source.
 */
export function resolveRendererPropContracts(
  renderer: RendererDefinition,
): Readonly<Record<string, RendererPropContract>> {
  const contracts: Record<string, RendererPropContract> = {
    ...(renderer.propContracts ?? {}),
  };

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
