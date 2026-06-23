import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { layoutRendererDefinitions } from './layout-renderer-definitions.js';

export type { WizardSchema, WizardStepSchema, WizardStatusSummary, WizardLastCommitStatus } from './schemas.js';
export { WizardRenderer } from './wizard-renderer.js';
export { layoutRendererDefinitions } from './layout-renderer-definitions.js';

export function registerLayoutRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, layoutRendererDefinitions);
}
