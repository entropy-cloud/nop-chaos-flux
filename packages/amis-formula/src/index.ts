import { evaluate, parse } from 'amis-formula';
import type {
  ArrayValueNode,
  CompiledExpression,
  CompiledRuntimeValue,
  CompiledTemplate,
  CompiledValueNode,
  DynamicRuntimeValue,
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
} from '@nop-chaos/amis-schema';
import { isPlainObject, shallowEqual } from '@nop-chaos/amis-schema';

function normalizeExpressionSource(source: string): string {
  const trimmed = source.trim();
  const directMatch = /^\$\{([\s\S]+)\}$/.exec(trimmed);

  if (directMatch) {
    return directMatch[1].trim();
  }

  return trimmed;
}

function parseTemplateSegments(source: string): Array<{ type: 'text' | 'expr'; value: string }> {
  const segments: Array<{ type: 'text' | 'expr'; value: string }> = [];
  const regex = /\$\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    }

    segments.push({ type: 'expr', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    segments.push({ type: 'text', value: source.slice(lastIndex) });
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
        exec(scope: object, env: RendererEnv): T {
          return evaluate(ast, scope, {
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
        exec(scope: object, env: RendererEnv): T {
          const result = segments
            .map((segment) => {
              if (segment.type === 'text') {
                return segment.value;
              }

              const evaluated = evaluate(segment.value, scope, {
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
  scope: object,
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
      return evaluateLeaf(node, scope, env, stateNode);
    case 'template-node':
      return evaluateLeaf(node, scope, env, stateNode);
    case 'array-node':
      return evaluateArray(node, scope, env, stateNode) as ValueEvaluationResult<T>;
    case 'object-node':
      return evaluateObject(node, scope, env, stateNode) as ValueEvaluationResult<T>;
  }
}

function evaluateLeaf<T>(
  node: ExpressionValueNode<T> | TemplateValueNode<T>,
  scope: object,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<T> {
  if (stateNode.kind !== 'leaf-state') {
    throw new Error(`Invalid runtime state for ${node.kind}`);
  }

  const value = node.compiled.exec(scope, env);

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
  scope: object,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<any[]> {
  if (stateNode.kind !== 'array-state') {
    throw new Error('Invalid runtime state for array-node');
  }

  const nextValue = node.items.map((item, index) => evaluateNode(item, scope, env, stateNode.items[index]).value);

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
  scope: object,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<Record<string, unknown>> {
  if (stateNode.kind !== 'object-state') {
    throw new Error('Invalid runtime state for object-node');
  }

  const nextValue: Record<string, unknown> = {};

  for (const key of node.keys) {
    nextValue[key] = evaluateNode(node.entries[key], scope, env, stateNode.entries[key]).value;
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

    if (/^\$\{[\s\S]+\}$/.test(input.trim())) {
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
        exec(scope: object, env: RendererEnv, state?: RuntimeValueState<T>) {
          const resolvedState = state ?? createStateFromNode(node);
          return evaluateNode(node, scope, env, resolvedState.root);
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

      return input.exec(scope.read(), env, state).value;
    },
    evaluateWithState<T = unknown>(
      input: DynamicRuntimeValue<T>,
      scope: ScopeRef,
      env: RendererEnv,
      state: RuntimeValueState<T>
    ): ValueEvaluationResult<T> {
      return input.exec(scope.read(), env, state);
    }
  };
}
