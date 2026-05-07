import type { FormulaAstNode, IdentifierBinding, IdentifierNode } from './ast.js';

export interface BindingContext {
  libraryNames?: ReadonlySet<string>;
  namespaceNames?: ReadonlySet<string>;
  functionNames?: ReadonlySet<string>;
}

function walkAndBind(
  node: FormulaAstNode,
  context: BindingContext,
  lambdaParams: Set<string>,
): void {
  switch (node.type) {
    case 'Literal':
      return;
    case 'Identifier':
      bindIdentifier(node, context, lambdaParams);
      return;
    case 'UnaryExpression':
      walkAndBind(node.argument, context, lambdaParams);
      return;
    case 'BinaryExpression':
      walkAndBind(node.left, context, lambdaParams);
      walkAndBind(node.right, context, lambdaParams);
      return;
    case 'LogicalExpression':
      walkAndBind(node.left, context, lambdaParams);
      walkAndBind(node.right, context, lambdaParams);
      return;
    case 'NullCoalesceExpression':
      walkAndBind(node.left, context, lambdaParams);
      walkAndBind(node.right, context, lambdaParams);
      return;
    case 'ConditionalExpression':
      walkAndBind(node.test, context, lambdaParams);
      walkAndBind(node.consequent, context, lambdaParams);
      walkAndBind(node.alternate, context, lambdaParams);
      return;
    case 'ArrayExpression':
      for (const el of node.elements) {
        walkAndBind(el, context, lambdaParams);
      }
      return;
    case 'ObjectExpression':
      for (const prop of node.properties) {
        walkAndBind(prop.key, context, lambdaParams);
        walkAndBind(prop.value, context, lambdaParams);
      }
      return;
    case 'MemberExpression':
      walkAndBind(node.object, context, lambdaParams);
      if (node.computed) {
        walkAndBind(node.property, context, lambdaParams);
      }
      return;
    case 'CallExpression':
      walkAndBind(node.callee, context, lambdaParams);
      for (const arg of node.arguments) {
        walkAndBind(arg, context, lambdaParams);
      }
      return;
    case 'ArrowFunctionExpression': {
      const innerParams = new Set(lambdaParams);
      for (const p of node.params) {
        innerParams.add(p.name);
      }
      walkAndBind(node.body, context, innerParams);
      return;
    }
  }
}

function bindIdentifier(
  node: IdentifierNode,
  context: BindingContext,
  lambdaParams: Set<string>,
): void {
  if (lambdaParams.has(node.name)) {
    return;
  }

  if (context.namespaceNames?.has(node.name)) {
    (node as IdentifierNode & { binding: IdentifierBinding }).binding = 'namespace';
    return;
  }

  if (context.libraryNames?.has(node.name)) {
    (node as IdentifierNode & { binding: IdentifierBinding }).binding = 'library';
    return;
  }

  if (context.functionNames?.has(node.name)) {
    return;
  }

  node.binding = 'scope';
}

export function bindAst(node: FormulaAstNode, context: BindingContext): void {
  walkAndBind(node, context, new Set());
}
