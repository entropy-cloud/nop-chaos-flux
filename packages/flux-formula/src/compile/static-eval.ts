import type { ExpressionCompileOptions, RendererEnv } from '@nop-chaos/flux-core';
import { evaluateAst } from '../evaluator';
import type { FormulaAstNode } from '../ast';
import { toEvalContext } from '../scope';
import { getFormulaRegistrySnapshot } from '../registry';
import { buildMemberPath } from './symbol-diagnostics';

function evaluateStaticAst(
  ast: FormulaAstNode,
  options?: ExpressionCompileOptions,
): { static: true; value: unknown } | { static: false } {
  const symbolTable = options?.symbolTable;
  const staticEnv: RendererEnv = {
    fetcher: async <T>() => ({ ok: true, status: 200, data: undefined as T }),
    notify: () => undefined,
  };
  const staticContext = toEvalContext({});

  function evaluateNode(
    node: FormulaAstNode,
  ): { static: true; value: unknown } | { static: false } {
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
        return {
          static: true,
          value: evaluateAst(node, { env: staticEnv, context: staticContext }),
        };
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
          const key =
            property.key.type === 'Identifier'
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
        return {
          static: true,
          value: (root.value as Record<string, unknown>)[path[path.length - 1]],
        };
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
        if (
          !objectValue.static ||
          objectValue.value == null ||
          typeof objectValue.value !== 'object'
        ) {
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

        return {
          static: true,
          value: (fn as (...args: unknown[]) => unknown).apply(objectValue.value, args),
        };
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

export { evaluateStaticAst };
