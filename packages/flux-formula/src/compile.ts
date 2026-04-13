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

type ImportedFunctionBinding = {
  alias: string;
  method: string;
  functionName: string;
};

type RewrittenImportExpression = {
  source: string;
  bindings: readonly ImportedFunctionBinding[];
};

type CompiledTemplateSegment =
  | { type: 'text'; value: string }
  | {
      type: 'expr';
      value: {
        ast: ReturnType<typeof parseFormula>;
        bindings: readonly ImportedFunctionBinding[];
      };
    };

function createImportedFunctionName(alias: string, method: string): string {
  return `__flux_import_${alias}__${method}`;
}

function isIdentifierCharacter(value: string | undefined): boolean {
  return value !== undefined && /[A-Za-z0-9_]/.test(value);
}

function isIdentifierStart(value: string | undefined): boolean {
  return value !== undefined && /[A-Za-z_]/.test(value);
}

function isImportedAliasStart(value: string | undefined): boolean {
  return value !== undefined && /[a-z_]/.test(value);
}

function rewriteImportedAliasSyntax(source: string): RewrittenImportExpression {
  let result = '';
  let index = 0;
  let quote: "'" | '"' | '`' | undefined;
  const bindings = new Map<string, ImportedFunctionBinding>();

  while (index < source.length) {
    const current = source[index];

    if (quote) {
      result += current;

      if (current === '\\' && index + 1 < source.length) {
        result += source[index + 1];
        index += 2;
        continue;
      }

      if (current === quote) {
        quote = undefined;
      }

      index += 1;
      continue;
    }

    if (current === "'" || current === '"' || current === '`') {
      quote = current;
      result += current;
      index += 1;
      continue;
    }

    const previous = source[index - 1];
    const next = source[index + 1];
    const isAliasStart =
      current === '$' &&
      isImportedAliasStart(next) &&
      (previous === undefined || !/[A-Za-z0-9_.]/.test(previous));

    if (!isAliasStart) {
      result += current;
      index += 1;
      continue;
    }

    let aliasEnd = index + 1;

    while (isIdentifierCharacter(source[aliasEnd])) {
      aliasEnd += 1;
    }

    const alias = source.slice(index + 1, aliasEnd);

    if (source[aliasEnd] !== '.' || !isIdentifierStart(source[aliasEnd + 1])) {
      result += current;
      index += 1;
      continue;
    }

    const methodStart = aliasEnd + 1;
    let methodEnd = methodStart;

    while (isIdentifierCharacter(source[methodEnd])) {
      methodEnd += 1;
    }

    const method = source.slice(methodStart, methodEnd);

    if (source[methodEnd] !== '(') {
      result += current;
      index += 1;
      continue;
    }

    const functionName = createImportedFunctionName(alias, method);
    bindings.set(functionName, { alias, method, functionName });
    result += functionName;
    index = methodEnd;
  }

  return {
    source: result,
    bindings: Array.from(bindings.values())
  };
}

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
      const rewritten = rewriteImportedAliasSyntax(normalized);
      const ast = parseFormula(rewritten.source);

      return {
        kind: 'expression',
        source,
        exec(input: EvalContext, env: RendererEnv): T {
          const context = toEvalContext(input);
          const imports = context.resolve('__imports') as Readonly<Record<string, unknown>> | undefined;

          return evaluateAst(ast, {
            env,
            context,
            imports,
            reportError: createExpressionMonitorReporter(env, source)
          }) as T;
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
            const rewritten = rewriteImportedAliasSyntax(rewriteFilterPipeSyntax(segment.value));
            return {
              ast: parseFormula(rewritten.source),
              bindings: rewritten.bindings
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

              const imports = context.resolve('__imports') as Readonly<Record<string, unknown>> | undefined;
              
              const evaluated = evaluateAst(segment.value.ast, {
                env,
                context,
                imports,
                reportError: createExpressionMonitorReporter(env, source)
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
