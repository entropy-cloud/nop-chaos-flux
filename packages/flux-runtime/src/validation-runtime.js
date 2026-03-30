import { createBuiltInValidationRegistry } from './validation';
export function validateRule(compiledRule, value, field, scope, registry = createBuiltInValidationRegistry()) {
    const rule = compiledRule.rule;
    if (rule.kind === 'async') {
        return undefined;
    }
    const validator = registry.get(rule.kind);
    if (!validator) {
        return undefined;
    }
    return validator({
        compiledRule,
        value,
        field,
        scope,
        rule
    });
}
//# sourceMappingURL=validation-runtime.js.map