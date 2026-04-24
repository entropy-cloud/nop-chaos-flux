import {
  type CompiledExpression,
  type CompiledStringTemplate,
  type CompiledValueNode,
  type EvalContext,
  type ExpressionCompileOptions,
  type FormulaCompiler,
  type RendererEnv,
  type StaticValueNode
} from '@nop-chaos/flux-core';
import { isPlainObject } from '@nop-chaos/flux-core';
import { bindAst, type BindingContext } from './bind-ast';
import { installBuiltins } from './builtins';
import { evaluateAst } from './evaluator';
import type { FormulaAstNode } from './ast';
import { parseFormula } from './parser';
import { isPureExpression, normalizeExpressionSource, parseTemplateSegments } from './template';
import { toEvalContext } from './scope';
import { getFormulaRegistrySnapshot } from './registry';

function ensureCompileOptions(options?: ExpressionCompileOptions): ExpressionCompileOptions {
  if (options?.symbolTable) {
    return options;
  }

  const registry = getFormulaRegistrySnapshot();
  const symbols = Object.fromEntries(
    Object.keys(registry.namespaces).map((name) => [name, {
      name,
      kind: 'builtin-namespace' as const,
      members: Object.keys(registry.namespaces[name] as Record<string, unknown>)
    }])
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
      }
    }
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

function buildMemberPath(node: FormulaAstNode): string[] | undefined {
  if (node.type === 'Identifier') {
    return [node.name];
  }

  if (node.type !== 'MemberExpression' || node.computed) {
    return undefined;
  }

  const parent = buildMemberPath(node.object);
  if (!parent) {
    return undefined;
  }

  if (node.property.type === 'Identifier') {
    return [...parent, node.property.name];
  }

  if (node.property.type === 'Literal' && typeof node.property.value === 'string') {
    return [...parent, node.property.value];
  }

  return undefined;
}

function emitSymbolDiagnostics(ast: FormulaAstNode, options?: ExpressionCompileOptions) {
  const symbolTable = options?.symbolTable;
  const report = options?.reportDiagnostic;
  const sourcePath = options?.sourcePath ?? '$';

  if (!symbolTable || !report) {
    return;
  }

  const requiredReport = report;
  const requiredSymbolTable = symbolTable;

  const seen = new Set<string>();

  function emit(code: import('@nop-chaos/flux-core').SchemaDiagnosticCode, message: string, severity: import('@nop-chaos/flux-core').SchemaDiagnosticSeverity = 'error') {
    const key = `${code}:${message}:${sourcePath}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    requiredReport({
      code,
      message,
      path: sourcePath,
      severity,
      source: 'core'
    });
  }

  function walk(node: FormulaAstNode) {
    if (node.type === 'Identifier' && node.name.startsWith('$')) {
      const resolved = requiredSymbolTable.resolve(node.name);
      if (!resolved) {
        if (node.name === '$slot') {
          emit('slot-used-outside-region', '$slot can only be used inside a parameterized region.');
        } else {
          emit('ambient-dollar-reference', `Unclassified dollar reference ${node.name} will resolve at runtime only.`, 'info');
        }
      }
    }

    if (node.type === 'MemberExpression') {
      const path = buildMemberPath(node);
      if (path && path[0].startsWith('$')) {
        const resolved = requiredSymbolTable.resolve(path[0]);

        if (!resolved) {
          if (path[0] === '$slot') {
            emit('slot-used-outside-region', '$slot can only be used inside a parameterized region.');
          } else {
            emit('unknown-import-alias', `Unknown import alias ${path[0]}.`);
          }
        } else if (resolved.kind === 'slot-root' && path.length > 1 && resolved.members && !resolved.members.includes(path[1])) {
          emit('unknown-slot-param', `Unknown slot param ${path[1]} on $slot.`);
        } else if (resolved.kind === 'builtin-namespace' && path.length > 1 && resolved.members && !resolved.members.includes(path[1])) {
          emit('unknown-builtin-member', `Unknown builtin member ${path[1]} on ${path[0]}.`);
        } else if (resolved.kind === 'import-alias' && path.length > 1 && resolved.members && !resolved.members.includes(path[1])) {
          emit('unknown-import-member', `Unknown imported member ${path[1]} on ${path[0]}.`, 'warning');
        }
      }
    }

    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const path = buildMemberPath(node.callee);
      if (path && path[0].startsWith('$')) {
        const resolved = requiredSymbolTable.resolve(path[0]);
        const definition = path.length > 1 ? resolved?.memberDefinitions?.[path[1]] : undefined;
        if (definition?.kind === 'function' && definition.params) {
          const requiredCount = definition.params.filter((param) => param.required !== false).length;
          const maxCount = definition.params.length;
          if (node.arguments.length < requiredCount || node.arguments.length > maxCount) {
            emit(
              'invalid-import-function-args',
              `Imported function ${path[0]}.${path[1]} expects ${requiredCount === maxCount ? requiredCount : `${requiredCount}-${maxCount}`} args but got ${node.arguments.length}.`
            );
          }
        }
      }
    }

    switch (node.type) {
      case 'Literal':
      case 'Identifier':
        return;
      case 'UnaryExpression':
        walk(node.argument);
        return;
      case 'BinaryExpression':
      case 'LogicalExpression':
      case 'NullCoalesceExpression':
        walk(node.left);
        walk(node.right);
        return;
      case 'ConditionalExpression':
        walk(node.test);
        walk(node.consequent);
        walk(node.alternate);
        return;
      case 'ArrayExpression':
        node.elements.forEach(walk);
        return;
      case 'ObjectExpression':
        node.properties.forEach((property) => {
          walk(property.key);
          walk(property.value);
        });
        return;
      case 'MemberExpression':
        walk(node.object);
        if (node.computed) {
          walk(node.property);
        }
        return;
      case 'CallExpression':
        walk(node.callee);
        node.arguments.forEach(walk);
        return;
      case 'ArrowFunctionExpression':
        walk(node.body);
        return;
    }
  }

  walk(ast);
}

function evaluateStaticAst(ast: FormulaAstNode, options?: ExpressionCompileOptions): { static: true; value: unknown } | { static: false } {
  const symbolTable = options?.symbolTable;
  const staticEnv: RendererEnv = {
    fetcher: async <T>() => ({ ok: true, status: 200, data: undefined as T }),
    notify: () => undefined
  };
  const staticContext = toEvalContext({});

  function evaluateNode(node: FormulaAstNode): { static: true; value: unknown } | { static: false } {
    switch (node.type) {
      case 'Literal':
        return { static: true, value: node.value };
      case 'Identifier': {
        if (!node.name.startsWith('$')) {
          return { static: false };
        }

        const resolved = symbolTable?.resolve(node.name);
        if (resolved?.kind === 'builtin-namespace') {
          const registry = getFormulaRegistrySnapshot();
          return { static: true, value: registry.namespaces[node.name] };
        }

        return { static: false };
      }
      case 'UnaryExpression': {
        const argument = evaluateNode(node.argument);
        if (!argument.static) {
          return argument;
        }
        return { static: true, value: evaluateAst(node, { env: staticEnv, context: staticContext }) };
      }
      case 'BinaryExpression': {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        if (!left.static || !right.static) {
          return { static: false };
        }
        const value = evaluateAst(node, { env: staticEnv, context: staticContext });
        return { static: true, value };
      }
      case 'LogicalExpression': {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        if (!left.static || !right.static) {
          return { static: false };
        }
        const value = evaluateAst(node, { env: staticEnv, context: staticContext });
        return { static: true, value };
      }
      case 'NullCoalesceExpression': {
        const left = evaluateNode(node.left);
        const right = evaluateNode(node.right);
        if (!left.static || !right.static) {
          return { static: false };
        }
        const value = evaluateAst(node, { env: staticEnv, context: staticContext });
        return { static: true, value };
      }
      case 'ConditionalExpression': {
        const test = evaluateNode(node.test);
        const consequent = evaluateNode(node.consequent);
        const alternate = evaluateNode(node.alternate);
        if (!test.static || !consequent.static || !alternate.static) {
          return { static: false };
        }
        const value = evaluateAst(node, { env: staticEnv, context: staticContext });
        return { static: true, value };
      }
      case 'ArrayExpression': {
        const values: unknown[] = [];
        for (const element of node.elements) {
          const evaluated = evaluateNode(element);
          if (!evaluated.static) {
            return evaluated;
          }
          values.push(evaluated.value);
        }
        return { static: true, value: values };
      }
      case 'ObjectExpression': {
        const result: Record<string, unknown> = {};
        for (const property of node.properties) {
          const value = evaluateNode(property.value);
          if (!value.static) {
            return value;
          }
          const key = property.key.type === 'Identifier'
            ? property.key.name
            : property.key.type === 'Literal'
              ? String(property.key.value)
              : undefined;
          if (key === undefined) {
            return { static: false };
          }
          result[key] = value.value;
        }
        return { static: true, value: result };
      }
      case 'MemberExpression': {
        const path = buildMemberPath(node);
        if (!path || path.length < 2) {
          return { static: false };
        }
        const root = evaluateNode(node.object);
        if (!root.static || root.value == null || typeof root.value !== 'object') {
          return { static: false };
        }
        return { static: true, value: (root.value as Record<string, unknown>)[path[path.length - 1]] };
      }
      case 'CallExpression': {
        if (node.callee.type !== 'MemberExpression') {
          return { static: false };
        }

        const calleePath = buildMemberPath(node.callee);
        if (!calleePath || calleePath.length < 2) {
          return { static: false };
        }

        const rootSymbol = symbolTable?.resolve(calleePath[0]);
        if (rootSymbol?.kind !== 'builtin-namespace') {
          return { static: false };
        }

        const objectValue = evaluateNode(node.callee.object);
        if (!objectValue.static || objectValue.value == null || typeof objectValue.value !== 'object') {
          return { static: false };
        }

        const fn = (objectValue.value as Record<string, unknown>)[calleePath[1]];
        if (typeof fn !== 'function') {
          return { static: false };
        }

        const args: unknown[] = [];
        for (const arg of node.arguments) {
          const evaluated = evaluateNode(arg);
          if (!evaluated.static) {
            return evaluated;
          }
          args.push(evaluated.value);
        }

        return { static: true, value: (fn as (...args: unknown[]) => unknown).apply(objectValue.value, args) };
      }
      case 'ArrowFunctionExpression':
        return { static: false };
    }
  }

  try {
    return evaluateNode(ast);
  } catch {
    return { static: false };
  }
}

function hasStaticValue<T>(value: { staticValue?: T }): value is { staticValue: T } {
  return Object.prototype.hasOwnProperty.call(value, 'staticValue');
}

function withSourcePath(options: ExpressionCompileOptions | undefined, segment: string): ExpressionCompileOptions | undefined {
  if (!options?.sourcePath) {
    return options;
  }

  return {
    ...options,
    sourcePath: segment.startsWith('[')
      ? `${options.sourcePath}${segment}`
      : `${options.sourcePath}.${segment}`
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
      functionNames: new Set(Object.keys(registry.functions))
    };
  }

  return {
    hasExpression(input: string) {
      return typeof input === 'string' && input.includes('${');
    },
    compileExpression<T = unknown>(source: string, options?: ExpressionCompileOptions): CompiledExpression<T> {
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
              reportError: createExpressionMonitorReporter(env, source)
            }) as T;
          } catch {
            return undefined as T;
          }
        }
      };
    },
    compileTemplate<T = unknown>(source: string, options?: ExpressionCompileOptions): CompiledStringTemplate<T> {
      const resolvedOptions = ensureCompileOptions(options);
      const bindingContext = buildBindingContext(resolvedOptions);
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
            const ast = parseFormula(rewriteFilterPipeSyntax(segment.value));
            bindAst(ast, bindingContext);
            emitSymbolDiagnostics(ast, resolvedOptions);
            return { ast };
          })()
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
          value: evaluated.value == null ? '' : String(evaluated.value)
        };
      });
      const staticTemplate = staticSegments.every((segment) => segment.static)
        ? staticSegments.map((segment) => segment.value).join('') as T
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

function compileNode<T>(input: T, formulaCompiler: FormulaCompiler, options?: ExpressionCompileOptions): CompiledValueNode<T> {
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
        const compiled = formulaCompiler.compileExpression<T>(input, options);
        if (hasStaticValue(compiled)) {
          return {
            kind: 'static-node',
            value: compiled.staticValue
          } as StaticValueNode<T>;
        }

        return {
          kind: 'expression-node',
          source: input,
          compiled
        };
      } catch {
        return {
          kind: 'static-node',
          value: input
        } as StaticValueNode<T>;
      }
    }

    try {
      const compiled = formulaCompiler.compileTemplate<T>(input, options);
      if (hasStaticValue(compiled)) {
        return {
          kind: 'static-node',
          value: compiled.staticValue
        } as StaticValueNode<T>;
      }

      return {
        kind: 'template-node',
        source: input,
        compiled
      };
    } catch {
      return {
        kind: 'static-node',
        value: input
      } as StaticValueNode<T>;
    }
  }

  if (Array.isArray(input)) {
    const items = input.map((item: unknown, index) => compileNode(item, formulaCompiler, withSourcePath(options, `[${index}]`)));

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
      keys.map((key) => [key, compileNode(objectInput[key], formulaCompiler, withSourcePath(options, key))])
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
