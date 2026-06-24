import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { layoutRendererDefinitions } from './layout-renderer-definitions.js';

export type {
  WizardSchema,
  WizardStepSchema,
  WizardStatusSummary,
  WizardLastCommitStatus,
  GridSchema,
  GridItemSchema,
  CollapseSchema,
  CollapseItemSchema,
  ButtonGroupSchema,
  ButtonGroupItemSchema,
  DropdownButtonSchema,
  DropdownButtonItemSchema,
  StepsSchema,
  StepsItemSchema,
  StepsItemStatus,
  TimelineSchema,
  TimelineItemSchema,
  TimelineItemLevel,
  TimelineMode,
} from './schemas.js';
export { WizardRenderer } from './wizard-renderer.js';
export { GridRenderer } from './grid-renderer.js';
export { CollapseRenderer } from './collapse-renderer.js';
export { ButtonGroupRenderer } from './button-group-renderer.js';
export { DropdownButtonRenderer } from './dropdown-button-renderer.js';
export { StepsRenderer } from './steps-renderer.js';
export { TimelineRenderer } from './timeline-renderer.js';
export { layoutRendererDefinitions } from './layout-renderer-definitions.js';

export function registerLayoutRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, layoutRendererDefinitions);
}
