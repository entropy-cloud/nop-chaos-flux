import { builtInValidators } from './validators';
export function createValidationRegistry() {
    const validators = new Map();
    return {
        get(ruleKind) {
            return validators.get(ruleKind);
        },
        has(ruleKind) {
            return validators.has(ruleKind);
        },
        register(ruleKind, validator) {
            if (validators.has(ruleKind)) {
                throw new Error(`Validation rule ${ruleKind} is already registered.`);
            }
            validators.set(ruleKind, validator);
        },
        list() {
            return Array.from(validators.keys());
        }
    };
}
export function registerBuiltInValidators(registry) {
    for (const [ruleKind, validator] of Object.entries(builtInValidators)) {
        registry.register(ruleKind, validator);
    }
    return registry;
}
export function createBuiltInValidationRegistry() {
    return registerBuiltInValidators(createValidationRegistry());
}
//# sourceMappingURL=registry.js.map