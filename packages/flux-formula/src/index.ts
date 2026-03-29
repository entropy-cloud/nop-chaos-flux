import { evaluate, parse } from 'amis-formula';
import type {
  ArrayValueNode,
  CompiledExpression,
  CompiledRuntimeValue,
  CompiledTemplate,
  CompiledValueNode,
  DynamicRuntimeValue,
  EvalContext,
  ExpressionCompiler,
  ExpressionValueNode,
  FormulaCompiler,
  ObjectValueNode,
  RendererEnv,
  RuntimeValueState,
  RuntimeValueStateNode,
  ScopeRef,
  StaticRuntimeValue,
  StaticValueNode,
  TemplateValueNode,
  ValueEvaluationResult
} from '@nop-chaos/flux-core';
import { getIn, isPlainObject, shallowEqual } from '@nop-chaos/flux-core';

function isEvalContext(input: EvalContext | object): input is EvalContext {
  return (
    typeof input === 'object' &&
    input !== null &&
    'resolve' in input &&
    typeof (input as EvalContext).resolve === 'function' &&
    'has' in input &&
    typeof (input as EvalContext).has === 'function' &&
    'materialize' in input &&
    typeof (input as EvalContext).materialize === 'function'
  );
}

function createObjectEvalContext(data: object): EvalContext {
  const record = data as Record<string, any>;

  return {
    resolve(path: string) {
      return getIn(record, path);
    },
    has(path: string) {
      return getIn(record, path) !== undefined;
    },
    materialize() {
      return record;
    }
  };
}

function isScopeRef(input: unknown): input is ScopeRef {
  return (
    typeof input === 'object' &&
    input !== null &&
    'get' in input &&
    typeof (input as ScopeRef).get === 'function' &&
    'has' in input &&
    typeof (input as ScopeRef).has === 'function' &&
    'read' in input &&
    typeof (input as ScopeRef).read === 'function'
  );
}

function toEvalContext(input: EvalContext | ScopeRef | object): EvalContext {
  if (isEvalContext(input)) {
    return input;
  }
  if (isScopeRef(input)) {
    return createEvalContext(input);
  }
  return createObjectEvalContext(input);
}

function createEvalContext(scope: ScopeRef): EvalContext {
  let materialized: Record<string, any> | undefined;

  return {
    resolve(path: string) {
      return scope.get(path);
    },
    has(path: string) {
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

function createFormulaScope(context: EvalContext): Record<string, any> {
  return new Proxy(
    {},
    {
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
    }
  );
}

function normalizeExpressionSource(source: string): string {
  const trimmed = source.trim();
  const directMatch = /^\$\{([\s\S]+)\}$/.exec(trimmed);

  if (directMatch) {
    return directMatch[1].trim();
  }

  return trimmed;
}

function isPureExpression(source: string): boolean {
  if (!source.startsWith('${')) {
    return false;
  }

  let depth = 1;
  let j = 2;
  let inString: string | null = null;

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
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
    }
    j++;
  }

  return depth === 0 && j === source.length;
}

function parseTemplateSegments(source: string): Array<{ type: 'text' | 'expr'; value: string }> {
  const segments: Array<{ type: 'text' | 'expr'; value: string }> = [];
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
    let inString: string | null = null;

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
      } else if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
      }
      j++;
    }

    if (depth === 0) {
      const exprContent = source.slice(exprStart + 2, j - 1).trim();
      segments.push({ type: 'expr', value: exprContent });
      i = j;
    } else {
      segments.push({ type: 'text', value: source.slice(exprStart) });
      break;
    }
  }

  return segments;
}

export function createFormulaCompiler(): FormulaCompiler {
  return {
    hasExpression(input: string) {
      return typeof input === 'string' && input.includes('${');
    },
    compileExpression<T = unknown>(source: string): CompiledExpression<T> {
      const normalized = normalizeExpressionSource(source);
      const ast = parse(normalized, { evalMode: true });

      return {
        kind: 'expression',
        source,
        exec(input: EvalContext, env: RendererEnv): T {
          const context = toEvalContext(input);

          return evaluate(ast, createFormulaScope(context), {
            functions: env.functions,
            filters: env.filters
          }) as T;
        }
      };
    },
    compileTemplate<T = unknown>(source: string): CompiledTemplate<T> {
      const segments = parseTemplateSegments(source).map((segment) => {
        if (segment.type === 'text') {
          return segment;
        }

        return {
          type: 'expr' as const,
          value: parse(segment.value, { evalMode: true })
        };
      });

      return {
        kind: 'template',
        source,
        exec(input: EvalContext, env: RendererEnv): T {
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

          return result as T;
        }
      };
    }
  };
}

function createLeafState<T = unknown>(): RuntimeValueState<T> {
  return {
    root: {
      kind: 'leaf-state',
      initialized: false
    }
  };
}

function createStateFromNode<T = unknown>(node: CompiledValueNode<T>): RuntimeValueState<T> {
  switch (node.kind) {
    case 'static-node':
    case 'expression-node':
    case 'template-node':
      return createLeafState<T>();
    case 'array-node':
      return {
        root: {
          kind: 'array-state',
          initialized: false,
          items: node.items.map((item) => createStateFromNode(item).root)
        }
      };
    case 'object-node': {
      const entries: Record<string, RuntimeValueStateNode> = {};
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

function evaluateNode<T>(
  node: CompiledValueNode<T>,
  context: EvalContext,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<T> {
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
      return evaluateArray(node, context, env, stateNode) as ValueEvaluationResult<T>;
    case 'object-node':
      return evaluateObject(node, context, env, stateNode) as ValueEvaluationResult<T>;
  }
}

function evaluateLeaf<T>(
  node: ExpressionValueNode<T> | TemplateValueNode<T>,
  context: EvalContext,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<T> {
  if (stateNode.kind !== 'leaf-state') {
    throw new Error(`Invalid runtime state for ${node.kind}`);
  }

  const value = node.compiled.exec(context, env);

  if (stateNode.initialized && Object.is(stateNode.lastValue, value)) {
    return {
      value: stateNode.lastValue as T,
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

function evaluateArray(
  node: ArrayValueNode,
  context: EvalContext,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<any[]> {
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

function evaluateObject(
  node: ObjectValueNode,
  context: EvalContext,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<Record<string, unknown>> {
  if (stateNode.kind !== 'object-state') {
    throw new Error('Invalid runtime state for object-node');
  }

  const nextValue: Record<string, unknown> = {};

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

function compileNode<T>(input: T, formulaCompiler: FormulaCompiler): CompiledValueNode<T> {
  if (typeof input === 'string') {
    if (!formulaCompiler.hasExpression(input)) {
      return {
        kind: 'static-node',
        value: input
      } as StaticValueNode<T>;
    }

    const trimmed = input.trim();
    if (isPureExpression(trimmed)) {
      return {
        kind: 'expression-node',
        source: input,
        compiled: formulaCompiler.compileExpression<T>(input)
      };
    }

    return {
      kind: 'template-node',
      source: input,
      compiled: formulaCompiler.compileTemplate<T>(input)
    };
  }

  if (Array.isArray(input)) {
    const items = input.map((item: unknown) => compileNode(item, formulaCompiler));

    if (items.every((item) => item.kind === 'static-node')) {
      return {
        kind: 'static-node',
        value: input
      } as StaticValueNode<T>;
    }

    return {
      kind: 'array-node',
      items
    } as CompiledValueNode<T>;
  }

  if (isPlainObject(input)) {
    const objectInput = input as Record<string, unknown>;
    const keys = Object.keys(objectInput);
    const entries = Object.fromEntries(
      keys.map((key) => [key, compileNode(objectInput[key], formulaCompiler)])
    );
    const hasDynamic = keys.some((key) => entries[key].kind !== 'static-node');

    if (!hasDynamic) {
      return {
        kind: 'static-node',
        value: input
      } as StaticValueNode<T>;
    }

    return {
      kind: 'object-node',
      keys,
      entries
    } as CompiledValueNode<T>;
  }

  return {
    kind: 'static-node',
    value: input
  } as StaticValueNode<T>;
}

export function createExpressionCompiler(formulaCompiler: FormulaCompiler = createFormulaCompiler()): ExpressionCompiler {
  return {
    formulaCompiler,
    compileNode<T = unknown>(input: T): CompiledValueNode<T> {
      return compileNode(input, formulaCompiler);
    },
    compileValue<T = unknown>(input: T): CompiledRuntimeValue<T> {
      const node = compileNode(input, formulaCompiler);

      if (node.kind === 'static-node') {
        return {
          kind: 'static',
          isStatic: true,
          node,
          value: node.value
        } as StaticRuntimeValue<T>;
      }

      return {
        kind: 'dynamic',
        isStatic: false,
        node,
        createState() {
          return createStateFromNode(node);
        },
        exec(context: EvalContext, env: RendererEnv, state?: RuntimeValueState<T>) {
          const resolvedState = state ?? createStateFromNode(node);
          return evaluateNode(node, context, env, resolvedState.root);
        }
      } as DynamicRuntimeValue<T>;
    },
    createState<T = unknown>(input: DynamicRuntimeValue<T>): RuntimeValueState<T> {
      return input.createState();
    },
    evaluateValue<T = unknown>(
      input: CompiledRuntimeValue<T>,
      scope: ScopeRef,
      env: RendererEnv,
      state?: RuntimeValueState<T>
    ): T {
      if (input.kind === 'static') {
        return input.value;
      }

      return input.exec(createEvalContext(scope), env, state).value;
    },
    evaluateWithState<T = unknown>(
      input: DynamicRuntimeValue<T>,
      scope: ScopeRef,
      env: RendererEnv,
      state: RuntimeValueState<T>
    ): ValueEvaluationResult<T> {
      return input.exec(createEvalContext(scope), env, state);
    }
  };
}

