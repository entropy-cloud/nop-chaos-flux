import type { EvalContext, RendererEnv } from '@nop-chaos/flux-core';
import type { FormulaAstNode, IdentifierNode, MemberExpressionNode } from './ast';
import { customEquals } from './builtins';
import { getFormulaRegistrySnapshot, type FormulaRegistrySnapshot } from './registry';

const MAX_EVAL_DEPTH = 256;

interface LambdaFrame {
  values: Record<string, unknown>;
  parent?: LambdaFrame;
}

interface EvaluateOptions {
  env: RendererEnv;
  context: EvalContext;
  registry?: FormulaRegistrySnapshot;
  reportError?: (error: unknown, details?: Record<string, unknown>) => void;
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

function applyBinaryOperator(op: string, left: unknown, right: unknown): unknown {
  switch (op) {
    case '+':
      return (left as any) + (right as any);
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
    case '<':
      return (left as any) < (right as any);
    case '<=':
      return (left as any) <= (right as any);
    case '>':
      return (left as any) > (right as any);
    case '>=':
      return (left as any) >= (right as any);
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
      return typeof right === 'function' ? left instanceof (right as any) : false;
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
  const registry = options.registry ?? getFormulaRegistrySnapshot();
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
          const result: Record<string, unknown> = {};
          for (const property of node.properties) {
            const key = property.computed
              ? evaluateNode(property.key, frame)
              : property.key.type === 'Identifier'
                ? property.key.name
                : property.key.type === 'Literal'
                  ? property.key.value
                  : evaluateNode(property.key, frame);
            result[String(key)] = evaluateNode(property.value, frame);
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
    return options.context.resolve(node.name);
  };

  const evaluateMemberTarget = (node: MemberExpressionNode, frame?: LambdaFrame) => {
    const objectValue = evaluateNode(node.object, frame);
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
