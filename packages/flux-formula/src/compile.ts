import type {
  CompiledExpression,
  CompiledStringTemplate,
  CompiledValueNode,
  EvalContext,
  FormulaCompiler,
  RendererEnv,
  StaticValueNode
} from '@nop-chaos/flux-core';
import { isPlainObject } from '@nop-chaos/flux-core';
import { installBuiltins } from './builtins';
import { evaluateAst } from './evaluator';
import { parseFormula } from './parser';
import { isPureExpression, normalizeExpressionSource, parseTemplateSegments } from './template';
import { toEvalContext } from './scope';

type CompiledTemplateSegment =
  | { type: 'text'; value: string }
  | {
      type: 'expr';
      value: {
        ast: ReturnType<typeof parseFormula>;
      };
    };

function isPipeBoundary(source: string, index: number): boolean {
  const current = source[index];
  const previous = source[index - 1];
  const next = source[index + 1];

  if (current !== '|') {
    return false;
  }

  if (previous === '|' || next === '|' || previous === undefined || next === undefined) {
    return false;
  }

  return true;
}

function splitFilterArgs(source: string): string[] {
  const args: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];

    if (quote) {
      if (current === '\\') {
        index += 1;
        continue;
      }
      if (current === quote) {
        quote = undefined;
      }
      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === '(' || current === '[' || current === '{') {
      depth += 1;
      continue;
    }

    if (current === ')' || current === ']' || current === '}') {
      depth -= 1;
      continue;
    }

    if (current === ':' && depth === 0) {
      args.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  args.push(source.slice(start).trim());
  return args.filter((item) => item.length > 0);
}

function rewriteFilterPipeSyntax(source: string): string {
  let quote: string | undefined;
  let depth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];

    if (quote) {
      if (current === '\\') {
        index += 1;
        continue;
      }
      if (current === quote) {
        quote = undefined;
      }
      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === '(' || current === '[' || current === '{') {
      depth += 1;
      continue;
    }

    if (current === ')' || current === ']' || current === '}') {
      depth -= 1;
      continue;
    }

    if (depth === 0 && isPipeBoundary(source, index)) {
      const left = source.slice(0, index).trim();
      const right = source.slice(index + 1).trim();
      const [filterName, ...argParts] = splitFilterArgs(right);
      if (!filterName) {
        return source;
      }
      const args = [left, ...argParts].join(', ');
      return `${filterName}(${args})`;
    }
  }

  return source;
}

function createExpressionMonitorReporter(env: RendererEnv, source: string) {
  return (error: unknown, details?: Record<string, unknown>) => {
    env.monitor?.onError?.({
      phase: 'expression',
      error,
      details: {
        ...details,
        source
      }
    });
  };
}

function createFormulaCompiler(): FormulaCompiler {
  installBuiltins();

  return {
    hasExpression(input: string) {
      return typeof input === 'string' && input.includes('${');
    },
    compileExpression<T = unknown>(source: string): CompiledExpression<T> {
      const normalized = rewriteFilterPipeSyntax(normalizeExpressionSource(source));
      const ast = parseFormula(normalized);

      return {
        kind: 'expression',
        source,
        exec(input: EvalContext, env: RendererEnv): T {
          const context = toEvalContext(input);

          try {
            return evaluateAst(ast, {
              env,
              context,
              reportError: createExpressionMonitorReporter(env, source)
            }) as T;
          } catch {
            return undefined as T;
          }
        }
      };
    },
    compileTemplate<T = unknown>(source: string): CompiledStringTemplate<T> {
      const segments: CompiledTemplateSegment[] = parseTemplateSegments(source).map((segment) => {
        if (segment.type === 'text') {
          return {
            type: 'text',
            value: segment.value
          };
        }

        return {
          type: 'expr' as const,
          value: (() => {
            return {
              ast: parseFormula(rewriteFilterPipeSyntax(segment.value))
            };
          })()
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

              try {
                const evaluated = evaluateAst(segment.value.ast, {
                  env,
                  context,
                  reportError: createExpressionMonitorReporter(env, source)
                });

                return evaluated == null ? '' : String(evaluated);
              } catch {
                return '';
              }
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
