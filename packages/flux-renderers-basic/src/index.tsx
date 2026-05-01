import {
  registerRendererDefinitions,
  type RendererRegistry,
} from '@nop-chaos/flux-core';
import { basicRendererDefinitions } from './basic-renderer-definitions';

export * from './schemas';
export { PageRenderer } from './page';
export { ContainerRenderer } from './container';
export { FlexRenderer } from './flex';
export { TextRenderer } from './text';
export { ButtonRenderer } from './button';
export { IconRenderer } from './icon';
export { BadgeRenderer } from './badge';
export { DynamicRenderer } from './dynamic-renderer';
export { ReactionRenderer } from './reaction';
export { DialogRenderer } from './dialog';
export { DrawerRenderer } from './drawer';
export { TabsRenderer } from './tabs';
export { FragmentRenderer } from './fragment';
export { LoopRenderer } from './loop';
export { RecurseRenderer } from './recurse';
export { ScopeDebugRenderer } from './scope-debug';
export { basicRendererDefinitions } from './basic-renderer-definitions';

export function registerBasicRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, basicRendererDefinitions);
}
