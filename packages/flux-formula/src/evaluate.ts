import type {
  ArrayValueNode,
  CompiledValueNode,
  EvalContext,
  ExpressionValueNode,
  ObjectValueNode,
  RendererEnv,
  RuntimeValueState,
  RuntimeValueStateNode,
  ScopeRef,
  TemplateValueNode,
  ValueEvaluationResult
} from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';

function createEvalContext(scope: ScopeRef): EvalContext {
  let materialized: Record<string, any> | undefined;

  return {
    resolve(path: string) {
      return scope.get(path);
    },
    has(path: string) {
      return scope.has(path);
    },
    materialize() {
      if (!materialized) {
        materialized = scope.read();
      }

      return materialized;
    }
  };
}

function createLeafState<T = unknown>(): RuntimeValueState<T> {
  return {
    root: {
      kind: 'leaf-state',
      initialized: false
    }
  };
}

function createStateFromNode<T = unknown>(node: CompiledValueNode<T>): RuntimeValueState<T> {
  switch (node.kind) {
    case 'static-node':
    case 'expression-node':
    case 'template-node':
      return createLeafState<T>();
    case 'array-node':
      return {
        root: {
          kind: 'array-state',
          initialized: false,
          items: node.items.map((item) => createStateFromNode(item).root)
        }
      };
    case 'object-node': {
      const entries: Record<string, RuntimeValueStateNode> = {};
      for (const key of node.keys) {
        entries[key] = createStateFromNode(node.entries[key]).root;
      }

      return {
        root: {
          kind: 'object-state',
          initialized: false,
          entries
        }
      };
    }
  }
}

function evaluateNode<T>(
  node: CompiledValueNode<T>,
  context: EvalContext,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<T> {
  switch (node.kind) {
    case 'static-node':
      return {
        value: node.value,
        changed: false,
        reusedReference: true
      };
    case 'expression-node':
      return evaluateLeaf(node, context, env, stateNode);
    case 'template-node':
      return evaluateLeaf(node, context, env, stateNode);
    case 'array-node':
      return evaluateArray(node, context, env, stateNode) as ValueEvaluationResult<T>;
    case 'object-node':
      return evaluateObject(node, context, env, stateNode) as ValueEvaluationResult<T>;
  }
}

function evaluateLeaf<T>(
  node: ExpressionValueNode<T> | TemplateValueNode<T>,
  context: EvalContext,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<T> {
  if (stateNode.kind !== 'leaf-state') {
    throw new Error(`Invalid runtime state for ${node.kind}`);
  }

  const value = node.compiled.exec(context, env);

  if (stateNode.initialized && Object.is(stateNode.lastValue, value)) {
    return {
      value: stateNode.lastValue as T,
      changed: false,
      reusedReference: true
    };
  }

  stateNode.initialized = true;
  stateNode.lastValue = value;

  return {
    value,
    changed: true,
    reusedReference: false
  };
}

function evaluateArray(
  node: ArrayValueNode,
  context: EvalContext,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<any[]> {
  if (stateNode.kind !== 'array-state') {
    throw new Error('Invalid runtime state for array-node');
  }

  if (stateNode.items.length !== node.items.length) {
    stateNode.items = node.items.map((item) => createStateFromNode(item).root);
    stateNode.initialized = false;
  }

  let anyChildChanged = false;
  const nextValue = node.items.map((item, index) => {
    const result = evaluateNode(item, context, env, stateNode.items[index]);
    if (result.changed) anyChildChanged = true;
    return result.value;
  });

  if (!anyChildChanged && stateNode.initialized && stateNode.lastValue) {
    return {
      value: stateNode.lastValue,
      changed: false,
      reusedReference: true
    };
  }

  if (stateNode.initialized && stateNode.lastValue && shallowEqual(stateNode.lastValue, nextValue)) {
    return {
      value: stateNode.lastValue,
      changed: false,
      reusedReference: true
    };
  }

  stateNode.initialized = true;
  stateNode.lastValue = nextValue;

  return {
    value: nextValue,
    changed: true,
    reusedReference: false
  };
}

function evaluateObject(
  node: ObjectValueNode,
  context: EvalContext,
  env: RendererEnv,
  stateNode: RuntimeValueStateNode
): ValueEvaluationResult<Record<string, unknown>> {
  if (stateNode.kind !== 'object-state') {
    throw new Error('Invalid runtime state for object-node');
  }

  const currentKeys = Object.keys(stateNode.entries);
  const keySet = new Set(node.keys);
  const needsRebuild =
    node.keys.some((key) => !(key in stateNode.entries)) ||
    currentKeys.some((key) => !keySet.has(key));
  if (needsRebuild) {
    const entries: Record<string, RuntimeValueStateNode> = {};
    for (const key of node.keys) {
      entries[key] = key in stateNode.entries
        ? stateNode.entries[key]
        : createStateFromNode(node.entries[key]).root;
    }
    stateNode.entries = entries;
    stateNode.initialized = false;
  }

  let anyChildChanged = false;
  const nextValue: Record<string, unknown> = {};
  for (const key of node.keys) {
    const result = evaluateNode(node.entries[key], context, env, stateNode.entries[key]);
    if (result.changed) anyChildChanged = true;
    nextValue[key] = result.value;
  }

  if (!anyChildChanged && stateNode.initialized && stateNode.lastValue) {
    return {
      value: stateNode.lastValue,
      changed: false,
      reusedReference: true
    };
  }

  if (stateNode.initialized && stateNode.lastValue && shallowEqual(stateNode.lastValue, nextValue)) {
    return {
      value: stateNode.lastValue,
      changed: false,
      reusedReference: true
    };
  }

  stateNode.initialized = true;
  stateNode.lastValue = nextValue;

  return {
    value: nextValue,
    changed: true,
    reusedReference: false
  };
}

export { createEvalContext, createStateFromNode, evaluateNode };
