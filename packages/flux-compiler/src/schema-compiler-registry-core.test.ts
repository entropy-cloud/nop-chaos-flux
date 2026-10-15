import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { textRenderer } from './schema-compiler-registry-fixtures.js';

describe('createSchemaCompiler', () => {
  it('fails fast on duplicate initial renderer definitions', () => {
    expect(() => createRendererRegistry([textRenderer, textRenderer])).toThrow(
      'Duplicate renderer definition for type "text"',
    );
  });

  it('rejects duplicate renderer registrations without explicit override', () => {
    const registry = createRendererRegistry([textRenderer]);

    expect(() =>
      registry.register({ ...textRenderer, component: () => 'override' } as RegisteredRendererDefinition),
    ).toThrow('Duplicate renderer definition for type "text"');
  });

  it('allows explicit renderer overrides and warns when replacing definitions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const registry = createRendererRegistry([textRenderer]);
      const override = { ...textRenderer, component: () => 'override' } as RegisteredRendererDefinition;

      registry.register(override, { override: true });

      expect(registry.get('text')).toBe(override);
      expect(warnSpy).toHaveBeenCalledWith(
        '[RendererRegistry] Overriding renderer definition for type "text"',
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('preserves renderer metadata through the registry contract', () => {
    const metadataRenderer: RegisteredRendererDefinition = {
      type: 'metadata-text',
      component: () => null,
      displayName: 'Metadata Text',
      category: 'content',
      icon: 'type',
      sourcePackage: '@nop-chaos/test-renderers',
      defaultSchema: {
        type: 'metadata-text',
        text: 'Hello',
      },
    };
    const registry = createRendererRegistry([metadataRenderer]);

    expect(registry.get('metadata-text')).toMatchObject({
      displayName: 'Metadata Text',
      category: 'content',
      icon: 'type',
      sourcePackage: '@nop-chaos/test-renderers',
      defaultSchema: {
        type: 'metadata-text',
        text: 'Hello',
      },
    });
  });
});
