import { describe, expect, it } from 'vitest';
import { createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';

describe('Amis basic renderer registration', () => {
  it('registers tpl renderer required by playground schemas', () => {
    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
    registerDataRenderers(registry);

    expect(registry.has('tpl')).toBe(true);
  });
});
