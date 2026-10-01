import type { EvalContext, RendererEnv, UndefinedVariableInfo } from '@nop-chaos/flux-core';
import type { FormulaAstNode, IdentifierNode, MemberExpressionNode } from './ast.js';
import { customEquals, installBuiltins } from './builtins.js';
import { createFormulaRegistry, type FormulaRegistrySnapshot } from './registry.js';

const defaultRegistry = createFormulaRegistry();
installBuiltins(defaultRegistry);

const MAX_EVAL_DEPTH = 256;
const DANGEROUS_MEMBER_KEYS = new Set([
  '__proto__', 'constructor', 'prototype',
  'toString', 'valueOf', 'hasOwnProperty',
  'isPrototypeOf', 'propertyIsEnumerable',
  '__defineGetter__', '__defineSetter__',
  '__lookupGetter__', '__lookupSetter__',
]);

interface LambdaFrame {
  values: Record<string, unknown>;
  parent?: LambdaFrame;
}

interface EvaluateOptions {
  env: RendererEnv;
  context: EvalContext;
  registry?: FormulaRegistrySnapshot;
  reportError?: (error: unknown, details?: Record<string, unknown>) => void;
  onUndefinedVariable?: (info: UndefinedVariableInfo) => void;
}

interface ResolvedCallable {
  receiver: unknown;
  fn: (...args: any[]) => any;
  name?: string;
}

const FRAME_NOT_FOUND = Symbol('FRAME_NOT_FOUND');

function lookupFrame(frame: LambdaFrame | undefined, name: string): unknown {
  let current = frame;
  while (current) {
    if (Object.prototype.hasOwnProperty.call(current.values, name)) {
      return current.values[name];
    }
    current = current.parent;
  }
  return FRAME_NOT_FOUND;
}

function toPropertyKey(value: unknown): string | number | symbol {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'symbol') {
    return value;
  }
  return String(value);
}

function createExpressionError(message: string): Error {
  return new Error(message);
}
function normalizeLogicalName(name: string): string {
  return name === 'and' ? '&&' : name === 'or' ? '||' : name;
}

const LEGAL_PRIMITIVE_OPERAND = new Set(['number', 'string', 'boolean', 'bigint']);

function isLegalOperand(value: unknown): boolean {
  return (
    value === null || value === undefined || LEGAL_PRIMITIVE_OPERAND.has(typeof value)
  );
}

function reportIllegalOperand(
  reportError: ((error: unknown, details?: Record<string, unknown>) => void) | undefined,
  op: string,
  value: unknown,
): void {
  reportError?.(
    createExpressionError(`Binary '${op}' requires primitive operands; received ${typeof value}`),
    { op, operandType: typeof value },
  );
}

function applyBinaryOperator(
  op: string,
  left: unknown,
  right: unknown,
  reportError?: (error: unknown, details?: Record<string, unknown>) => void,
): unknown {
  switch (op) {
    case '+': {
      if (!isLegalOperand(left)) {
        reportIllegalOperand(reportError, op, left);
        return undefined;
      }
      if (!isLegalOperand(right)) {
        reportIllegalOperand(reportError, op, right);
        return undefined;
      }
      // Explicit JS `+` semantics for primitive operands (was `(as any)` —
      // cq-6 Phase 1; behavior pinned by the characterisation matrix).
      if (typeof left === 'string' || typeof right === 'string') {
        return String(left) + String(right);
      }
      if (typeof left === 'bigint' && typeof right === 'bigint') {
        return left + right;
      }
      if (typeof left === 'bigint' || typeof right === 'bigint') {
        throw createExpressionError("Cannot mix BigInt and other types, use explicit conversions");
      }
      return (left as number) + (right as number);
    }
    case '-':
      return Number(left) - Number(right);
    case '*':
      return Number(left) * Number(right);
    case '/':
      return Number(left) / Number(right);
    case '%':
      return Number(left) % Number(right);
    case '**':
      return Number(left) ** Number(right);
    case '<': {
      if (!isLegalOperand(left)) {
        reportIllegalOperand(reportError, op, left);
        return undefined;
      }
      if (!isLegalOperand(right)) {
        reportIllegalOperand(reportError, op, right);
        return undefined;
      }
      // String pairs compare lexicographically; everything else numeric
      // (bigint via Number — precision only degrades past 2^53, documented).
      if (typeof left === 'string' && typeof right === 'string') {
        return left < right;
      }
      return (left as number) < (right as number);
    }
    case '<=': {
      if (!isLegalOperand(left)) {
        reportIllegalOperand(reportError, op, left);
        return undefined;
      }
      if (!isLegalOperand(right)) {
        reportIllegalOperand(reportError, op, right);
        return undefined;
      }
      // String pairs compare lexicographically; everything else numeric
      // (bigint via Number — precision only degrades past 2^53, documented).
      if (typeof left === 'string' && typeof right === 'string') {
        return left <= right;
      }
      return (left as number) <= (right as number);
    }
    case '>': {
      if (!isLegalOperand(left)) {
        reportIllegalOperand(reportError, op, left);
        return undefined;
      }
      if (!isLegalOperand(right)) {
        reportIllegalOperand(reportError, op, right);
        return undefined;
      }
      // String pairs compare lexicographically; everything else numeric
      // (bigint via Number — precision only degrades past 2^53, documented).
      if (typeof left === 'string' && typeof right === 'string') {
        return left > right;
      }
      return (left as number) > (right as number);
    }
    case '>=': {
      if (!isLegalOperand(left)) {
        reportIllegalOperand(reportError, op, left);
        return undefined;
      }
      if (!isLegalOperand(right)) {
        reportIllegalOperand(reportError, op, right);
        return undefined;
      }
      // String pairs compare lexicographically; everything else numeric
      // (bigint via Number — precision only degrades past 2^53, documented).
      if (typeof left === 'string' && typeof right === 'string') {
        return left >= right;
      }
      return (left as number) >= (right as number);
    }
    case '|':
      return Number(left) | Number(right);
    case '^':
      return Number(left) ^ Number(right);
    case '&':
      return Number(left) & Number(right);
    case '<<':
      return Number(left) << Number(right);
    case '>>':
      return Number(left) >> Number(right);
    case '>>>':
      return Number(left) >>> Number(right);
    case 'instanceof':
      throw createExpressionError('instanceof operator is not allowed in expressions');
    case '==':
    case '===':
      return customEquals(left, right);
    case '!=':
    case '!==':
      return !customEquals(left, right);
    default:
      throw createExpressionError(`Unsupported binary operator ${op}`);
  }
}

function applyUnaryOperator(op: string, value: unknown): unknown {
  switch (op) {
    case '!':
      return !value;
    case '~':
      return ~Number(value);
    case '-':
      return -Number(value);
    case '+':
      return Number(value);
    default:
      throw createExpressionError(`Unsupported unary operator ${op}`);
  }
}

export function evaluateAst(ast: FormulaAstNode, options: EvaluateOptions): unknown {
  const registry = options.registry ?? defaultRegistry.getSnapshot();
  let evalDepth = 0;

  const evaluateNode = (node: FormulaAstNode, frame?: LambdaFrame): unknown => {
    evalDepth += 1;
    if (evalDepth > MAX_EVAL_DEPTH) {
      throw createExpressionError(`Evaluation depth limit exceeded (${MAX_EVAL_DEPTH})`);
    }
    try {
      switch (node.type) {
        case 'Literal':
          return node.value;
        case 'Identifier':
          return evaluateIdentifier(node, frame);
        case 'UnaryExpression':
          return applyUnaryOperator(node.op, evaluateNode(node.argument, frame));
        case 'BinaryExpression':
          return applyBinaryOperator(
            node.op,
            evaluateNode(node.left, frame),
            evaluateNode(node.right, frame),
            options.reportError,
          );
        case 'LogicalExpression': {
          const left = evaluateNode(node.left, frame);
          const op = normalizeLogicalName(node.op);
          return op === '&&'
            ? left
              ? evaluateNode(node.right, frame)
              : left
            : left
              ? left
              : evaluateNode(node.right, frame);
        }
        case 'NullCoalesceExpression': {
          const left = evaluateNode(node.left, frame);
          return left ?? evaluateNode(node.right, frame);
        }
        case 'ConditionalExpression':
          return evaluateNode(node.test, frame)
            ? evaluateNode(node.consequent, frame)
            : evaluateNode(node.alternate, frame);
        case 'ArrayExpression':
          return node.elements.map((element) => evaluateNode(element, frame));
        case 'ObjectExpression': {
          const result: Record<string, unknown> = Object.create(null);
          for (const property of node.properties) {
            const key = property.computed
              ? evaluateNode(property.key, frame)
              : property.key.type === 'Identifier'
                ? property.key.name
                : property.key.type === 'Literal'
                  ? property.key.value
                  : evaluateNode(property.key, frame);
            const keyStr = String(key);
            if (DANGEROUS_MEMBER_KEYS.has(keyStr)) {
              throw createExpressionError(`Object key '${keyStr}' is not allowed in expressions`);
            }
            result[keyStr] = evaluateNode(property.value, frame);
          }
          return result;
        }
        case 'MemberExpression':
          return evaluateMember(node, frame);
        case 'CallExpression':
          return evaluateCall(node, frame);
        case 'ArrowFunctionExpression': {
          const params = node.params;
          if (params.length === 1) {
            const paramName = params[0].name;
            return (...args: unknown[]) => {
              return evaluateNode(node.body, { values: { [paramName]: args[0] }, parent: frame });
            };
          }
          return (...args: unknown[]) => {
            const values: Record<string, unknown> = {};
            for (let i = 0; i < params.length; i++) {
              values[params[i].name] = args[i];
            }
            return evaluateNode(node.body, { values, parent: frame });
          };
        }
      }
    } finally {
      evalDepth -= 1;
    }
  };

  const evaluateIdentifier = (node: IdentifierNode, frame?: LambdaFrame): unknown => {
    const frameValue = lookupFrame(frame, node.name);
    if (frameValue !== FRAME_NOT_FOUND) {
      return frameValue;
    }

    if (node.binding === 'namespace') {
      return registry.namespaces[node.name];
    }

    if (node.binding === undefined) {
      if (node.name in registry.namespaces) {
        return registry.namespaces[node.name];
      }
      if (node.name in registry.functions) {
        return registry.functions[node.name];
      }
    }

    if (node.binding !== 'library') {
      options.context.collector?.recordPath(node.name);
    }

    const resolved = options.context.resolve(node.name);

    if (resolved === undefined && !options.context.has(node.name) && node.binding !== 'library') {
      options.onUndefinedVariable?.({
        variableName: node.name,
      });
    }

    return resolved;
  };

  const evaluateMemberTarget = (node: MemberExpressionNode, frame?: LambdaFrame) => {
    const objectValue = evaluateNode(node.object, frame);

    if (objectValue === undefined && node.object.type === 'Identifier' && node.object.binding === 'scope') {
      options.onUndefinedVariable?.({
        variableName: `${node.object.name}.${node.property.type === 'Identifier' ? node.property.name : '(computed)'}`,
      });
    }

    if (objectValue == null) {
      if (node.optional) {
        return { value: undefined, receiver: undefined, name: undefined };
      }
      throw createExpressionError('Cannot access member of null or undefined');
    }

    const propertyValue = node.computed
      ? evaluateNode(node.property, frame)
      : node.property.type === 'Identifier'
        ? node.property.name
        : evaluateNode(node.property, frame);

    if (
      !node.computed &&
      node.object.type === 'Identifier' &&
      node.object.binding === 'scope' &&
      typeof propertyValue === 'string'
    ) {
      options.context.collector?.recordPath(`${node.object.name}.${propertyValue}`);
    }

    const key = toPropertyKey(propertyValue);
    if (typeof key === 'string' && DANGEROUS_MEMBER_KEYS.has(key)) {
      throw createExpressionError(`Access to '${key}' is not allowed in expressions`);
    }
    return {
      value: (objectValue as any)[key],
      receiver: objectValue,
      name: typeof propertyValue === 'string' ? propertyValue : undefined,
    };
  };

  const evaluateMember = (node: MemberExpressionNode, frame?: LambdaFrame): unknown => {
    return evaluateMemberTarget(node, frame).value;
  };

  const resolveCallable = (node: FormulaAstNode, frame?: LambdaFrame): ResolvedCallable => {
    if (node.type === 'MemberExpression') {
      const resolved = evaluateMemberTarget(node, frame);
      if (typeof resolved.value !== 'function') {
        throw createExpressionError('Call target is not a function');
      }
      return {
        receiver: resolved.receiver,
        fn: resolved.value as (...args: any[]) => any,
        name: resolved.name,
      };
    }

    const fn = evaluateNode(node, frame);
    if (typeof fn !== 'function') {
      throw createExpressionError('Call target is not a function');
    }

    return {
      receiver: undefined,
      fn: fn as (...args: any[]) => any,
      name: node.type === 'Identifier' ? node.name : undefined,
    };
  };

  const evaluateCall = (
    node: Extract<FormulaAstNode, { type: 'CallExpression' }>,
    frame?: LambdaFrame,
  ): unknown => {
    const callable = resolveCallable(node.callee, frame);
    const invokeMode = callable.name
      ? (registry.functionMeta[callable.name]?.invoke ?? 'eager')
      : 'eager';
    const args =
      invokeMode === 'lazy'
        ? node.arguments.map((arg) => () => evaluateNode(arg, frame))
        : node.arguments.map((arg) => evaluateNode(arg, frame));

    return callable.fn.apply(callable.receiver, args);
  };

  try {
    return evaluateNode(ast);
  } catch (error) {
    options.reportError?.(error, { source: 'formula-evaluator' });
    throw error;
  }
}
