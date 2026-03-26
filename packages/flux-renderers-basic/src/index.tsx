import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { PageRenderer } from './page';
import { ContainerRenderer } from './container';
import { TextRenderer } from './text';
import { ButtonRenderer } from './button';
import { IconRenderer } from './icon';
import { BadgeRenderer } from './badge';
import { DynamicRenderer } from './dynamic-renderer';

export * from './schemas';
export * from './utils';
export { PageRenderer } from './page';
export { ContainerRenderer } from './container';
export { TextRenderer } from './text';
export { ButtonRenderer } from './button';
export { IconRenderer } from './icon';
export { BadgeRenderer } from './badge';
export { DynamicRenderer } from './dynamic-renderer';

export const basicRendererDefinitions: RendererDefinition[] = [
  {
    type: 'page',
    component: PageRenderer,
    regions: ['body', 'header', 'footer'],
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }]
  },
  {
    type: 'container',
    component: ContainerRenderer,
    regions: ['body', 'header', 'footer']
  },
  {
    type: 'text',
    component: TextRenderer,
    fields: [{ key: 'text', kind: 'prop' }]
  },
  {
    type: 'button',
    component: ButtonRenderer,
    fields: [{ key: 'onClick', kind: 'event' }]
  },
  {
    type: 'icon',
    component: IconRenderer
  },
  {
    type: 'badge',
    component: BadgeRenderer
  },
  {
    type: 'dynamic-renderer',
    component: DynamicRenderer,
    regions: ['body']
  }
];

export function registerBasicRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, basicRendererDefinitions);
}
