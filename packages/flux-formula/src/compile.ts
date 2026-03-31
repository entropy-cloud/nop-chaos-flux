import { evaluate, parse } from 'amis-formula';
import type {
  CompiledExpression,
  CompiledTemplate,
  CompiledValueNode,
  EvalContext,
  FormulaCompiler,
  RendererEnv,
  StaticValueNode
} from '@nop-chaos/flux-core';
import { isPlainObject } from '@nop-chaos/flux-core';
import { isPureExpression, normalizeExpressionSource, parseTemplateSegments } from './template';
import { toEvalContext, createFormulaScope } from './scope';

function createFormulaCompiler(): FormulaCompiler {
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
      try {
        return {
          kind: 'expression-node',
          source: input,
          compiled: formulaCompiler.compileExpression<T>(input)
        };
      } catch {
        return {
          kind: 'static-node',
          value: input
        } as StaticValueNode<T>;
      }
    }

    try {
      return {
        kind: 'template-node',
        source: input,
        compiled: formulaCompiler.compileTemplate<T>(input)
      };
    } catch {
      return {
        kind: 'static-node',
        value: input
      } as StaticValueNode<T>;
    }
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

export { createFormulaCompiler, compileNode };
