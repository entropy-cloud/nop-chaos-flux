import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';

export function createRendererRegistry(initialDefinitions: RendererDefinition[] = []): RendererRegistry {
  const map = new Map<string, RendererDefinition>();

  for (const definition of initialDefinitions) {
    if (map.has(definition.type)) {
      throw new Error(`Duplicate renderer definition for type "${definition.type}"`);
    }

    map.set(definition.type, definition);
  }

  return {
    register(definition, options) {
      const existing = map.get(definition.type);

      if (existing && existing !== definition && !options?.override) {
        throw new Error(`Duplicate renderer definition for type "${definition.type}"`);
      }

      if (existing && existing !== definition && options?.override) {
        console.warn(`[RendererRegistry] Overriding renderer definition for type "${definition.type}"`);
      }

      map.set(definition.type, definition);
    },
    get(type) {
      return map.get(type);
    },
    has(type) {
      return map.has(type);
    },
    list() {
      return Array.from(map.values());
    }
  };
}

export function registerRendererDefinitions(
  registry: RendererRegistry,
  definitions: ReadonlyArray<RendererDefinition>
): RendererRegistry {
  for (const definition of definitions) {
    registry.register(definition);
  }

  return registry;
}
