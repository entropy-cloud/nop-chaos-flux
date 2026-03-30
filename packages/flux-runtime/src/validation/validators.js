import { getIn } from '@nop-chaos/flux-core';
import { createValidationError } from './errors';
import { buildValidationMessage } from './message';
export function isEmptyValue(value) {
    return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}
function hasFilledArrayItem(value, itemPath) {
    if (!Array.isArray(value)) {
        return false;
    }
    return value.some((item) => {
        const candidate = itemPath ? getIn(item, itemPath) : item;
        return !isEmptyValue(candidate);
    });
}
function violatesAllOrNone(value, itemPaths) {
    if (itemPaths.length === 0) {
        return false;
    }
    if (Array.isArray(value)) {
        return value.some((item) => {
            const flags = itemPaths.map((itemPath) => !isEmptyValue(getIn(item, itemPath)));
            return flags.some(Boolean) && flags.some((flag) => !flag);
        });
    }
    if (value == null || typeof value !== 'object') {
        return false;
    }
    const flags = itemPaths.map((itemPath) => !isEmptyValue(getIn(value, itemPath)));
    return flags.some(Boolean) && flags.some((flag) => !flag);
}
function violatesUniqueBy(value, itemPath) {
    if (!Array.isArray(value) || !itemPath) {
        return false;
    }
    const seen = new Set();
    for (const item of value) {
        const candidate = getIn(item, itemPath);
        if (isEmptyValue(candidate)) {
            continue;
        }
        if (seen.has(candidate)) {
            return true;
        }
        seen.add(candidate);
    }
    return false;
}
function lacksAtLeastOneOf(value, paths) {
    if (value == null || typeof value !== 'object' || paths.length === 0) {
        return true;
    }
    return !paths.some((path) => !isEmptyValue(getIn(value, path)));
}
function createBuiltInError(input, overrides) {
    return createValidationError(input.field, input.compiledRule, buildValidationMessage(input.rule, input.field), overrides);
}
export const builtInValidators = {
    required(input) {
        return isEmptyValue(input.value) ? createBuiltInError(input) : undefined;
    },
    minLength(input) {
        return typeof input.value === 'string' && input.value.length < input.rule.value ? createBuiltInError(input) : undefined;
    },
    maxLength(input) {
        return typeof input.value === 'string' && input.value.length > input.rule.value ? createBuiltInError(input) : undefined;
    },
    minItems(input) {
        return Array.isArray(input.value) && input.value.length < input.rule.value ? createBuiltInError(input) : undefined;
    },
    maxItems(input) {
        return Array.isArray(input.value) && input.value.length > input.rule.value ? createBuiltInError(input) : undefined;
    },
    atLeastOneFilled(input) {
        return !hasFilledArrayItem(input.value, input.rule.itemPath)
            ? createBuiltInError(input, {
                relatedPaths: input.rule.itemPath ? [input.rule.itemPath] : undefined
            })
            : undefined;
    },
    allOrNone(input) {
        return violatesAllOrNone(input.value, input.rule.itemPaths)
            ? createBuiltInError(input, {
                relatedPaths: input.rule.itemPaths
            })
            : undefined;
    },
    uniqueBy(input) {
        return violatesUniqueBy(input.value, input.rule.itemPath)
            ? createBuiltInError(input, {
                relatedPaths: [input.rule.itemPath]
            })
            : undefined;
    },
    atLeastOneOf(input) {
        return lacksAtLeastOneOf(input.value, input.rule.paths)
            ? createBuiltInError(input, {
                relatedPaths: input.rule.paths
            })
            : undefined;
    },
    pattern(input) {
        const regex = input.compiledRule.precompiled?.regex ?? new RegExp(input.rule.value);
        return typeof input.value === 'string' && input.value !== '' && !regex.test(input.value)
            ? createBuiltInError(input)
            : undefined;
    },
    email(input) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return typeof input.value === 'string' && input.value !== '' && !emailPattern.test(input.value)
            ? createBuiltInError(input)
            : undefined;
    },
    equalsField(input) {
        const peerValue = input.scope.get(input.rule.path);
        if (isEmptyValue(input.value) && isEmptyValue(peerValue)) {
            return undefined;
        }
        return !Object.is(input.value, peerValue)
            ? createBuiltInError(input, {
                relatedPaths: [input.rule.path]
            })
            : undefined;
    },
    notEqualsField(input) {
        const peerValue = input.scope.get(input.rule.path);
        if (isEmptyValue(input.value) && isEmptyValue(peerValue)) {
            return undefined;
        }
        return Object.is(input.value, peerValue)
            ? createBuiltInError(input, {
                relatedPaths: [input.rule.path]
            })
            : undefined;
    },
    requiredWhen(input) {
        const dependencyValue = input.scope.get(input.rule.path);
        const shouldRequire = Object.is(dependencyValue, input.rule.equals);
        return shouldRequire && isEmptyValue(input.value)
            ? createBuiltInError(input, {
                relatedPaths: [input.rule.path]
            })
            : undefined;
    },
    requiredUnless(input) {
        const dependencyValue = input.scope.get(input.rule.path);
        const shouldRequire = !Object.is(dependencyValue, input.rule.equals);
        return shouldRequire && isEmptyValue(input.value)
            ? createBuiltInError(input, {
                relatedPaths: [input.rule.path]
            })
            : undefined;
    }
};
//# sourceMappingURL=validators.js.map