import type { RendererDefinition } from './types/renderer-core.js';
import type {
  RendererEventContract,
  RendererPropContract,
} from './types/renderer-definition-types.js';

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
    if (field.kind !== 'prop' || !field.key) {
      continue;
    }
    // Union carrier (RM-5): prop contracts must carry `shape` (plan 605
    // adjudication); event-entry contracts are shapeless and never surface
    // in the prop view.
    if (!field.contract || !('shape' in field.contract)) {
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

/**
 * Event-contract view over a renderer's `fields` entries (RM-5, plan 607):
 * entries with `kind: 'event'` and an inline `contract` surface their
 * `payload` / `displayName` / `description` as `RendererEventContract`s.
 * Entries without a contract are classified events with no authoring
 * metadata and do not appear in the view.
 */
export function resolveRendererEventContracts(
  renderer: RendererDefinition,
): Readonly<Record<string, RendererEventContract>> {
  const events: Record<string, RendererEventContract> = {};

  for (const field of renderer.fields ?? []) {
    if (field.kind !== 'event' || !field.key || !field.contract) {
      continue;
    }
    events[field.key] = {
      displayName: field.contract.displayName ?? field.key,
      description: field.contract.description,
      payload: field.contract.payload,
    };
  }

  return events;
}
