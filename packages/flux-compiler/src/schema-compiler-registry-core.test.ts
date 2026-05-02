import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { textRenderer } from './schema-compiler-registry-fixtures';

describe('createSchemaCompiler', () => {
  it('fails fast on duplicate initial renderer definitions', () => {
    expect(() => createRendererRegistry([textRenderer, textRenderer])).toThrow(
      'Duplicate renderer definition for type "text"',
    );
  });

  it('rejects duplicate renderer registrations without explicit override', () => {
    const registry = createRendererRegistry([textRenderer]);

    expect(() =>
      registry.register({ ...textRenderer, component: () => 'override' } as RendererDefinition),
    ).toThrow('Duplicate renderer definition for type "text"');
  });

  it('allows explicit renderer overrides and warns when replacing definitions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const registry = createRendererRegistry([textRenderer]);
      const override = { ...textRenderer, component: () => 'override' } as RendererDefinition;

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
    const metadataRenderer: RendererDefinition = {
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
      propSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
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
      propSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
      },
    });
  });
});
