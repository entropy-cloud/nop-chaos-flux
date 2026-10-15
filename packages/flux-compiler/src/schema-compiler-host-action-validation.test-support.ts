import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createCompiler, designerManifest } from './schema-compiler-diagnostics.test-support.js';

export { createCompiler, designerManifest };

export const eventRenderer: RegisteredRendererDefinition = {
  type: 'event-text',
  component: () => null,
  fields: [
    { key: 'text', kind: 'prop', contract: { shape: { kind: 'unknown' }, displayName: 'text' } },
    { key: 'onClick', kind: 'event' },
  ],
};

export const pageRenderer: RegisteredRendererDefinition = {
  type: 'page',
  component: () => null,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};
