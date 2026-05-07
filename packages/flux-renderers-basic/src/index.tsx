import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { basicRendererDefinitions } from './basic-renderer-definitions.js';

export * from './schemas.js';
export { PageRenderer } from './page.js';
export { ContainerRenderer } from './container.js';
export { FlexRenderer } from './flex.js';
export { TextRenderer } from './text.js';
export { ButtonRenderer } from './button.js';
export { IconRenderer } from './icon.js';
export { BadgeRenderer } from './badge.js';
export { DynamicRenderer } from './dynamic-renderer.js';
export { ReactionRenderer } from './reaction.js';
export { DialogRenderer } from './dialog.js';
export { DrawerRenderer } from './drawer.js';
export { TabsRenderer } from './tabs.js';
export { FragmentRenderer } from './fragment.js';
export { LoopRenderer } from './loop.js';
export { RecurseRenderer } from './recurse.js';
export { ScopeDebugRenderer } from './scope-debug.js';
export { basicRendererDefinitions } from './basic-renderer-definitions.js';

export function registerBasicRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, basicRendererDefinitions);
}
