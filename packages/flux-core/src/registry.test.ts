import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, registerRendererDefinitions } from './registry.js';
import type { RendererDefinition } from './types.js';

function createMockDefinition(type: string, overrides?: Partial<RendererDefinition>): RendererDefinition {
  return {
    type,
    component: vi.fn(),
    ...overrides,
  };
}

describe('createRendererRegistry', () => {
  it('creates an empty registry with no arguments', () => {
    const registry = createRendererRegistry();
    expect(registry.list()).toEqual([]);
    expect(registry.has('anything')).toBe(false);
  });

  it('creates a registry with initial definitions', () => {
    const def1 = createMockDefinition('text');
    const def2 = createMockDefinition('button');
    const registry = createRendererRegistry([def1, def2]);

    expect(registry.list()).toHaveLength(2);
    expect(registry.get('text')).toBe(def1);
    expect(registry.get('button')).toBe(def2);
  });

  it('throws on duplicate type in initial definitions', () => {
    const def1 = createMockDefinition('text');
    const def2 = createMockDefinition('text');

    expect(() => createRendererRegistry([def1, def2])).toThrow(
      'Duplicate renderer definition for type "text"',
    );
  });

  it('throws on definition without component', () => {
    const def = createMockDefinition('text', { component: undefined });

    expect(() => createRendererRegistry([def])).toThrow(
      'Renderer definition for type "text" must specify "component".',
    );
  });

  describe('register', () => {
    it('adds a new definition', () => {
      const registry = createRendererRegistry();
      const def = createMockDefinition('text');

      registry.register(def);

      expect(registry.get('text')).toBe(def);
      expect(registry.has('text')).toBe(true);
    });

    it('throws on duplicate without override option', () => {
      const registry = createRendererRegistry();
      const def1 = createMockDefinition('text');
      const def2 = createMockDefinition('text');

      registry.register(def1);
      expect(() => registry.register(def2)).toThrow(
        'Duplicate renderer definition for type "text"',
      );
    });

    it('allows override with option', () => {
      const registry = createRendererRegistry();
      const def1 = createMockDefinition('text');
      const def2 = createMockDefinition('text');

      registry.register(def1);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      registry.register(def2, { override: true });

      expect(registry.get('text')).toBe(def2);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overriding renderer definition for type "text"'),
      );
      warnSpy.mockRestore();
    });

    it('does not warn on override when same reference', () => {
      const registry = createRendererRegistry();
      const def = createMockDefinition('text');

      registry.register(def);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      registry.register(def, { override: true });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('throws on register of definition without component', () => {
      const registry = createRendererRegistry();
      const def = createMockDefinition('text', { component: undefined });

      expect(() => registry.register(def)).toThrow(
        'Renderer definition for type "text" must specify "component".',
      );
    });
  });

  describe('get', () => {
    it('returns undefined for unknown type', () => {
      const registry = createRendererRegistry();
      expect(registry.get('unknown')).toBeUndefined();
    });

    it('returns the registered definition', () => {
      const registry = createRendererRegistry();
      const def = createMockDefinition('text');
      registry.register(def);

      expect(registry.get('text')).toBe(def);
    });
  });

  describe('has', () => {
    it('returns false for unknown type', () => {
      const registry = createRendererRegistry();
      expect(registry.has('unknown')).toBe(false);
    });

    it('returns true for registered type', () => {
      const registry = createRendererRegistry();
      registry.register(createMockDefinition('text'));

      expect(registry.has('text')).toBe(true);
    });
  });

  describe('list', () => {
    it('returns all definitions', () => {
      const def1 = createMockDefinition('text');
      const def2 = createMockDefinition('button');
      const registry = createRendererRegistry([def1, def2]);

      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list).toContain(def1);
      expect(list).toContain(def2);
    });

    it('returns a copy (not the internal map)', () => {
      const registry = createRendererRegistry();
      registry.register(createMockDefinition('text'));

      const list = registry.list();
      registry.register(createMockDefinition('button'));

      expect(list).toHaveLength(1);
      expect(list[0].type).toBe('text');
    });
  });
});

describe('registerRendererDefinitions', () => {
  it('registers all definitions and returns the registry', () => {
    const registry = createRendererRegistry();
    const defs = [createMockDefinition('text'), createMockDefinition('button')];

    const result = registerRendererDefinitions(registry, defs);

    expect(result).toBe(registry);
    expect(registry.has('text')).toBe(true);
    expect(registry.has('button')).toBe(true);
  });

  it('throws on duplicate definitions', () => {
    const defs = [createMockDefinition('text'), createMockDefinition('text')];

    expect(() => registerRendererDefinitions(createRendererRegistry(), defs)).toThrow(
      'Duplicate renderer definition for type "text"',
    );
  });
});
