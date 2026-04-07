import { evaluate, parse } from 'amis-formula';
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
import { isPureExpression, normalizeExpressionSource, parseTemplateSegments } from './template';
import { toEvalContext, createFormulaScope } from './scope';

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
        ast: ReturnType<typeof parse>;
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
      isIdentifierStart(next) &&
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

    let methodEnd = aliasEnd + 1;

    while (isIdentifierCharacter(source[methodEnd])) {
      methodEnd += 1;
    }

    const method = source.slice(aliasEnd + 1, methodEnd);

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

function buildImportedFunctions(
  env: RendererEnv,
  imports: Readonly<Record<string, unknown>> | undefined,
  bindings: readonly ImportedFunctionBinding[]
): Record<string, (...args: any[]) => any> | undefined {
  if (bindings.length === 0) {
    return env.functions;
  }

  const importedFunctions: Record<string, (...args: any[]) => any> = {};

  for (const [name, fn] of Object.entries(env.functions ?? {})) {
    importedFunctions[`fn${name}`] = fn;
  }

  for (const binding of bindings) {
    importedFunctions[`fn${binding.functionName}`] = (...args: any[]) => {
      const namespace = imports?.[binding.alias] as Record<string, unknown> | undefined;

      if (!namespace) {
        return undefined;
      }

      const method = namespace?.[binding.method];

      if (typeof method !== 'function') {
        throw new Error(`Imported expression binding $${binding.alias}.${binding.method}(...) is not available`);
      }

      return method.apply(namespace, args);
    };
  }

  return importedFunctions;
}

function createFormulaCompiler(): FormulaCompiler {
  return {
    hasExpression(input: string) {
      return typeof input === 'string' && input.includes('${');
    },
    compileExpression<T = unknown>(source: string): CompiledExpression<T> {
      const rewritten = rewriteImportedAliasSyntax(normalizeExpressionSource(source));
      const ast = parse(rewritten.source, { evalMode: true });

      return {
        kind: 'expression',
        source,
        exec(input: EvalContext, env: RendererEnv): T {
          const context = toEvalContext(input);
          const imports = context.resolve('__imports') as Readonly<Record<string, unknown>> | undefined;

          return evaluate(ast, createFormulaScope(context), {
            functions: buildImportedFunctions(env, imports, rewritten.bindings),
            filters: env.filters
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
            const rewritten = rewriteImportedAliasSyntax(segment.value);
            return {
              ast: parse(rewritten.source, { evalMode: true }),
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

              const evaluated = evaluate(segment.value.ast, createFormulaScope(context), {
                functions: buildImportedFunctions(env, imports, segment.value.bindings),
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
