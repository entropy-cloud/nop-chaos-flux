import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createCompiler, designerManifest } from './schema-compiler-diagnostics.test-support.js';

export { createCompiler, designerManifest };

export const eventRenderer: RendererDefinition = {
  type: 'event-text',
  component: () => null,
  propSchema: { text: { type: 'string' } },
  fields: [
    { key: 'text', kind: 'prop' },
    { key: 'onClick', kind: 'event' },
  ],
};

export const pageRenderer: RendererDefinition = {
  type: 'page',
  component: () => null,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};
