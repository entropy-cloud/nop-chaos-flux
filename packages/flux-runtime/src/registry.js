export function createRendererRegistry(initialDefinitions = []) {
    const map = new Map();
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
export function registerRendererDefinitions(registry, definitions) {
    for (const definition of definitions) {
        registry.register(definition);
    }
    return registry;
}
//# sourceMappingURL=registry.js.map