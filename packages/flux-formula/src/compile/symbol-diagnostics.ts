import type { ExpressionCompileOptions, SchemaDiagnosticCode, SchemaDiagnosticSeverity } from '@nop-chaos/flux-core';
import type { FormulaAstNode } from '../ast';

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

  function emit(code: SchemaDiagnosticCode, message: string, severity: SchemaDiagnosticSeverity = 'error') {
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

export { buildMemberPath, emitSymbolDiagnostics };
