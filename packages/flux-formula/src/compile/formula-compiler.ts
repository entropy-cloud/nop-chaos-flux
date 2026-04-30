import type {
  CompiledExpression,
  CompiledStringTemplate,
  EvalContext,
  ExpressionCompileOptions,
  FormulaCompiler,
  RendererEnv,
} from '@nop-chaos/flux-core';
import { bindAst, type BindingContext } from '../bind-ast';
import { installBuiltins } from '../builtins';
import { evaluateAst } from '../evaluator';
import { parseFormula } from '../parser';
import { normalizeExpressionSource, parseTemplateSegments } from '../template';
import { toEvalContext } from '../scope';
import { getFormulaRegistrySnapshot } from '../registry';
import { rewriteFilterPipeSyntax } from './pipe-syntax';
import { emitSymbolDiagnostics } from './symbol-diagnostics';
import { evaluateStaticAst } from './static-eval';

function ensureCompileOptions(options?: ExpressionCompileOptions): ExpressionCompileOptions {
  if (options?.symbolTable) {
    return options;
  }

  const registry = getFormulaRegistrySnapshot();
  const symbols = Object.fromEntries(
    Object.keys(registry.namespaces).map((name) => [
      name,
      {
        name,
        kind: 'builtin-namespace' as const,
        members: Object.keys(registry.namespaces[name] as Record<string, unknown>),
      },
    ]),
  );

  return {
    ...options,
    symbolTable: {
      frames: [{ id: 'default-builtins', kind: 'root', symbols }],
      push(_frame) {
        return this;
      },
      resolve(name: string) {
        return symbols[name];
      },
    },
  };
}

type CompiledTemplateSegment =
  | { type: 'text'; value: string }
  | {
      type: 'expr';
      value: {
        ast: ReturnType<typeof parseFormula>;
      };
    };

function createExpressionMonitorReporter(env: RendererEnv, source: string) {
  return (error: unknown, details?: Record<string, unknown>) => {
    env.monitor?.onError?.({
      phase: 'expression',
      error,
      details: {
        ...details,
        source,
      },
    });
  };
}

function createFormulaCompiler(): FormulaCompiler {
  installBuiltins();

  function buildBindingContext(options?: ExpressionCompileOptions): BindingContext {
    const registry = getFormulaRegistrySnapshot();
    const libraryNames = new Set(options?.libraryNames ?? []);
    const namespaceNames = new Set(Object.keys(registry.namespaces));

    for (const frame of options?.symbolTable?.frames ?? []) {
      for (const info of Object.values(frame.symbols)) {
        if (info.kind === 'builtin-namespace') {
          namespaceNames.add(info.name);
        } else {
          libraryNames.add(info.name);
        }
      }
    }

    return {
      libraryNames,
      namespaceNames,
      functionNames: new Set(Object.keys(registry.functions)),
    };
  }

  return {
    hasExpression(input: string) {
      return typeof input === 'string' && input.includes('${');
    },
    compileExpression<T = unknown>(
      source: string,
      options?: ExpressionCompileOptions,
    ): CompiledExpression<T> {
      const resolvedOptions = ensureCompileOptions(options);
      const normalized = rewriteFilterPipeSyntax(normalizeExpressionSource(source));
      const ast = parseFormula(normalized);
      bindAst(ast, buildBindingContext(resolvedOptions));
      emitSymbolDiagnostics(ast, resolvedOptions);
      const staticEval = evaluateStaticAst(ast, resolvedOptions);

      return {
        kind: 'expression',
        source,
        ...(staticEval.static ? { staticValue: staticEval.value as T } : {}),
        exec(input: EvalContext, env: RendererEnv): T {
          if (staticEval.static) {
            return staticEval.value as T;
          }

          const context = toEvalContext(input);

          try {
            return evaluateAst(ast, {
              env,
              context,
              reportError: createExpressionMonitorReporter(env, source),
            }) as T;
          } catch {
            return undefined as T;
          }
        },
      };
    },
    compileTemplate<T = unknown>(
      source: string,
      options?: ExpressionCompileOptions,
    ): CompiledStringTemplate<T> {
      const resolvedOptions = ensureCompileOptions(options);
      const bindingContext = buildBindingContext(resolvedOptions);
      const segments: CompiledTemplateSegment[] = parseTemplateSegments(source).map((segment) => {
        if (segment.type === 'text') {
          return {
            type: 'text',
            value: segment.value,
          };
        }

        return {
          type: 'expr' as const,
          value: (() => {
            const ast = parseFormula(rewriteFilterPipeSyntax(segment.value));
            bindAst(ast, bindingContext);
            emitSymbolDiagnostics(ast, resolvedOptions);
            return { ast };
          })(),
        };
      });

      const staticSegments = segments.map((segment) => {
        if (segment.type === 'text') {
          return { static: true as const, value: segment.value };
        }

        const evaluated = evaluateStaticAst(segment.value.ast, resolvedOptions);
        if (!evaluated.static) {
          return evaluated;
        }

        return {
          static: true as const,
          value: evaluated.value == null ? '' : String(evaluated.value),
        };
      });
      const staticTemplate = staticSegments.every((segment) => segment.static)
        ? (staticSegments.map((segment) => segment.value).join('') as T)
        : undefined;

      return {
        kind: 'template',
        source,
        ...(staticTemplate !== undefined ? { staticValue: staticTemplate } : {}),
        exec(input: EvalContext, env: RendererEnv): T {
          if (staticTemplate !== undefined) {
            return staticTemplate;
          }

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
                  reportError: createExpressionMonitorReporter(env, source),
                });

                return evaluated == null ? '' : String(evaluated);
              } catch {
                return '';
              }
            })
            .join('');

          return result as T;
        },
      };
    },
  };
}

export { createFormulaCompiler };
