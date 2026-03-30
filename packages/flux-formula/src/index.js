import { evaluate, parse } from 'amis-formula';
import { getIn, isPlainObject, shallowEqual } from '@nop-chaos/flux-core';
function isEvalContext(input) {
    return (typeof input === 'object' &&
        input !== null &&
        'resolve' in input &&
        typeof input.resolve === 'function' &&
        'has' in input &&
        typeof input.has === 'function' &&
        'materialize' in input &&
        typeof input.materialize === 'function');
}
function createObjectEvalContext(data) {
    const record = data;
    return {
        resolve(path) {
            return getIn(record, path);
        },
        has(path) {
            return getIn(record, path) !== undefined;
        },
        materialize() {
            return record;
        }
    };
}
function isScopeRef(input) {
    return (typeof input === 'object' &&
        input !== null &&
        'get' in input &&
        typeof input.get === 'function' &&
        'has' in input &&
        typeof input.has === 'function' &&
        'read' in input &&
        typeof input.read === 'function');
}
function toEvalContext(input) {
    if (isEvalContext(input)) {
        return input;
    }
    if (isScopeRef(input)) {
        return createEvalContext(input);
    }
    return createObjectEvalContext(input);
}
function createEvalContext(scope) {
    let materialized;
    return {
        resolve(path) {
            return scope.get(path);
        },
        has(path) {
            return scope.has(path);
        },
        materialize() {
            if (!materialized) {
                materialized = scope.read();
            }
            return materialized;
        }
    };
}
function createFormulaScope(context) {
    return new Proxy({}, {
        get(_target, property) {
            if (typeof property !== 'string') {
                return undefined;
            }
            if (property === '__proto__') {
                return undefined;
            }
            if (context.has(property)) {
                return context.resolve(property);
            }
            return getIn(context.materialize(), property);
        },
        has(_target, property) {
            return typeof property === 'string' ? context.has(property) : false;
        },
        ownKeys() {
            return Reflect.ownKeys(context.materialize());
        },
        getOwnPropertyDescriptor(_target, property) {
            if (typeof property !== 'string') {
                return undefined;
            }
            const materialized = context.materialize();
            if (Object.prototype.hasOwnProperty.call(materialized, property)) {
                return {
                    configurable: true,
                    enumerable: true,
                    value: materialized[property],
                    writable: false
                };
            }
            return undefined;
        }
    });
}
function normalizeExpressionSource(source) {
    const trimmed = source.trim();
    const directMatch = /^\$\{([\s\S]+)\}$/.exec(trimmed);
    if (directMatch) {
        return directMatch[1].trim();
    }
    return trimmed;
}
function isPureExpression(source) {
    if (!source.startsWith('${')) {
        return false;
    }
    let depth = 1;
    let j = 2;
    let inString = null;
    while (j < source.length && depth > 0) {
        const ch = source[j];
        if (inString) {
            if (ch === '\\' && j + 1 < source.length) {
                j += 2;
                continue;
            }
            if (ch === inString) {
                inString = null;
            }
        }
        else if (ch === '"' || ch === "'" || ch === '`') {
            inString = ch;
        }
        else if (ch === '{') {
            depth++;
        }
        else if (ch === '}') {
            depth--;
        }
        j++;
    }
    return depth === 0 && j === source.length;
}
function parseTemplateSegments(source) {
    const segments = [];
    let i = 0;
    while (i < source.length) {
        const exprStart = source.indexOf('${', i);
        if (exprStart === -1) {
            if (i < source.length) {
                segments.push({ type: 'text', value: source.slice(i) });
            }
            break;
        }
        if (exprStart > i) {
            segments.push({ type: 'text', value: source.slice(i, exprStart) });
        }
        let depth = 1;
        let j = exprStart + 2;
        let inString = null;
        while (j < source.length && depth > 0) {
            const ch = source[j];
            if (inString) {
                if (ch === '\\' && j + 1 < source.length) {
                    j += 2;
                    continue;
                }
                if (ch === inString) {
                    inString = null;
                }
            }
            else if (ch === '"' || ch === "'" || ch === '`') {
                inString = ch;
            }
            else if (ch === '{') {
                depth++;
            }
            else if (ch === '}') {
                depth--;
            }
            j++;
        }
        if (depth === 0) {
            const exprContent = source.slice(exprStart + 2, j - 1).trim();
            segments.push({ type: 'expr', value: exprContent });
            i = j;
        }
        else {
            segments.push({ type: 'text', value: source.slice(exprStart) });
            break;
        }
    }
    return segments;
}
export function createFormulaCompiler() {
    return {
        hasExpression(input) {
            return typeof input === 'string' && input.includes('${');
        },
        compileExpression(source) {
            const normalized = normalizeExpressionSource(source);
            const ast = parse(normalized, { evalMode: true });
            return {
                kind: 'expression',
                source,
                exec(input, env) {
                    const context = toEvalContext(input);
                    return evaluate(ast, createFormulaScope(context), {
                        functions: env.functions,
                        filters: env.filters
                    });
                }
            };
        },
        compileTemplate(source) {
            const segments = parseTemplateSegments(source).map((segment) => {
                if (segment.type === 'text') {
                    return segment;
                }
                return {
                    type: 'expr',
                    value: parse(segment.value, { evalMode: true })
                };
            });
            return {
                kind: 'template',
                source,
                exec(input, env) {
                    const context = toEvalContext(input);
                    const result = segments
                        .map((segment) => {
                        if (segment.type === 'text') {
                            return segment.value;
                        }
                        const evaluated = evaluate(segment.value, createFormulaScope(context), {
                            functions: env.functions,
                            filters: env.filters
                        });
                        return evaluated == null ? '' : String(evaluated);
                    })
                        .join('');
                    return result;
                }
            };
        }
    };
}
function createLeafState() {
    return {
        root: {
            kind: 'leaf-state',
            initialized: false
        }
    };
}
function createStateFromNode(node) {
    switch (node.kind) {
        case 'static-node':
        case 'expression-node':
        case 'template-node':
            return createLeafState();
        case 'array-node':
            return {
                root: {
                    kind: 'array-state',
                    initialized: false,
                    items: node.items.map((item) => createStateFromNode(item).root)
                }
            };
        case 'object-node': {
            const entries = {};
            for (const key of node.keys) {
                entries[key] = createStateFromNode(node.entries[key]).root;
            }
            return {
                root: {
                    kind: 'object-state',
                    initialized: false,
                    entries
                }
            };
        }
    }
}
function evaluateNode(node, context, env, stateNode) {
    switch (node.kind) {
        case 'static-node':
            return {
                value: node.value,
                changed: false,
                reusedReference: true
            };
        case 'expression-node':
            return evaluateLeaf(node, context, env, stateNode);
        case 'template-node':
            return evaluateLeaf(node, context, env, stateNode);
        case 'array-node':
            return evaluateArray(node, context, env, stateNode);
        case 'object-node':
            return evaluateObject(node, context, env, stateNode);
    }
}
function evaluateLeaf(node, context, env, stateNode) {
    if (stateNode.kind !== 'leaf-state') {
        throw new Error(`Invalid runtime state for ${node.kind}`);
    }
    const value = node.compiled.exec(context, env);
    if (stateNode.initialized && Object.is(stateNode.lastValue, value)) {
        return {
            value: stateNode.lastValue,
            changed: false,
            reusedReference: true
        };
    }
    stateNode.initialized = true;
    stateNode.lastValue = value;
    return {
        value,
        changed: true,
        reusedReference: false
    };
}
function evaluateArray(node, context, env, stateNode) {
    if (stateNode.kind !== 'array-state') {
        throw new Error('Invalid runtime state for array-node');
    }
    const nextValue = node.items.map((item, index) => evaluateNode(item, context, env, stateNode.items[index]).value);
    if (stateNode.initialized && stateNode.lastValue && shallowEqual(stateNode.lastValue, nextValue)) {
        return {
            value: stateNode.lastValue,
            changed: false,
            reusedReference: true
        };
    }
    stateNode.initialized = true;
    stateNode.lastValue = nextValue;
    return {
        value: nextValue,
        changed: true,
        reusedReference: false
    };
}
function evaluateObject(node, context, env, stateNode) {
    if (stateNode.kind !== 'object-state') {
        throw new Error('Invalid runtime state for object-node');
    }
    const nextValue = {};
    for (const key of node.keys) {
        nextValue[key] = evaluateNode(node.entries[key], context, env, stateNode.entries[key]).value;
    }
    if (stateNode.initialized && stateNode.lastValue && shallowEqual(stateNode.lastValue, nextValue)) {
        return {
            value: stateNode.lastValue,
            changed: false,
            reusedReference: true
        };
    }
    stateNode.initialized = true;
    stateNode.lastValue = nextValue;
    return {
        value: nextValue,
        changed: true,
        reusedReference: false
    };
}
function compileNode(input, formulaCompiler) {
    if (typeof input === 'string') {
        if (!formulaCompiler.hasExpression(input)) {
            return {
                kind: 'static-node',
                value: input
            };
        }
        const trimmed = input.trim();
        if (isPureExpression(trimmed)) {
            return {
                kind: 'expression-node',
                source: input,
                compiled: formulaCompiler.compileExpression(input)
            };
        }
        return {
            kind: 'template-node',
            source: input,
            compiled: formulaCompiler.compileTemplate(input)
        };
    }
    if (Array.isArray(input)) {
        const items = input.map((item) => compileNode(item, formulaCompiler));
        if (items.every((item) => item.kind === 'static-node')) {
            return {
                kind: 'static-node',
                value: input
            };
        }
        return {
            kind: 'array-node',
            items
        };
    }
    if (isPlainObject(input)) {
        const objectInput = input;
        const keys = Object.keys(objectInput);
        const entries = Object.fromEntries(keys.map((key) => [key, compileNode(objectInput[key], formulaCompiler)]));
        const hasDynamic = keys.some((key) => entries[key].kind !== 'static-node');
        if (!hasDynamic) {
            return {
                kind: 'static-node',
                value: input
            };
        }
        return {
            kind: 'object-node',
            keys,
            entries
        };
    }
    return {
        kind: 'static-node',
        value: input
    };
}
export function createExpressionCompiler(formulaCompiler = createFormulaCompiler()) {
    return {
        formulaCompiler,
        compileNode(input) {
            return compileNode(input, formulaCompiler);
        },
        compileValue(input) {
            const node = compileNode(input, formulaCompiler);
            if (node.kind === 'static-node') {
                return {
                    kind: 'static',
                    isStatic: true,
                    node,
                    value: node.value
                };
            }
            return {
                kind: 'dynamic',
                isStatic: false,
                node,
                createState() {
                    return createStateFromNode(node);
                },
                exec(context, env, state) {
                    const resolvedState = state ?? createStateFromNode(node);
                    return evaluateNode(node, context, env, resolvedState.root);
                }
            };
        },
        createState(input) {
            return input.createState();
        },
        evaluateValue(input, scope, env, state) {
            if (input.kind === 'static') {
                return input.value;
            }
            return input.exec(createEvalContext(scope), env, state).value;
        },
        evaluateWithState(input, scope, env, state) {
            return input.exec(createEvalContext(scope), env, state);
        }
    };
}
//# sourceMappingURL=index.js.map