import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';

export function createRendererRegistry(initialDefinitions: RendererDefinition[] = []): RendererRegistry {
  const map = new Map<string, RendererDefinition>();

  for (const definition of initialDefinitions) {
    map.set(definition.type, definition);
  }

  return {
    register(definition) {
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

