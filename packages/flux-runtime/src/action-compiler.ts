import type {
  ActionSchema,
  CompiledActionControl,
  CompiledActionNode,
  CompiledActionPayload,
  CompiledActionProgram,
  CompiledActionTargeting,
  CompiledRuntimeValue,
  ExpressionCompiler,
  ExpressionCompileOptions,
  SchemaValue,
} from '@nop-chaos/flux-core';

const ACTION_PAYLOAD_RESERVED_KEYS = new Set([
  'action',
  'targetId',
  'componentId',
  'componentName',
  'componentPath',
  'formId',
  'dialogId',
  'dataPath',
  'value',
  'values',
  'when',
  'parallel',
  'control',
  'timeout',
  'retry',
  'debounce',
  'continueOnError',
  'then',
  'onError',
  'onSettled',
  'args',
  '_targetCid',
  '_targetTemplateId',
]);

function extractLegacyTopLevelPayload(action: ActionSchema): Record<string, SchemaValue> | undefined {
  const payloadEntries = Object.entries(action).filter(
    ([key]) => !ACTION_PAYLOAD_RESERVED_KEYS.has(key)
  );

  if (payloadEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(payloadEntries) as Record<string, SchemaValue>;
}

function compilePayload(
  action: ActionSchema,
  compiler: ExpressionCompiler,
  options?: ExpressionCompileOptions
): CompiledActionPayload {
  const payload: CompiledActionPayload = {};

  if (action.args !== undefined) {
    payload.args = compiler.compileValue<Record<string, unknown>>(action.args, options);
  } else {
    const legacy = extractLegacyTopLevelPayload(action);
    if (legacy !== undefined) {
      payload.args = compiler.compileValue<Record<string, unknown>>(legacy, options);
    }
  }

  if (action.value !== undefined) {
    payload.value = compiler.compileValue<SchemaValue>(action.value, options);
  }

  if (action.values !== undefined) {
    payload.values = compiler.compileValue<Record<string, SchemaValue>>(action.values, options);
  }

  return payload;
}

function compileTargeting(action: ActionSchema): CompiledActionTargeting {
  return {
    _targetCid: action._targetCid,
    _targetTemplateId: action._targetTemplateId,
    targetId: action.targetId,
    componentId: action.componentId,
    componentName: action.componentName,
    componentPath: action.componentPath,
    formId: action.formId,
    dialogId: action.dialogId,
    dataPath: action.dataPath,
  };
}

function compileControl(action: ActionSchema): CompiledActionControl {
  return {
    control: action.control,
    timeout: action.timeout,
    retry: action.retry,
    debounce: action.debounce,
    continueOnError: action.continueOnError,
  };
}

function compileActionNode(
  action: ActionSchema,
  compiler: ExpressionCompiler,
  basePath: string,
  options?: ExpressionCompileOptions
): CompiledActionNode {
  const node: CompiledActionNode = {
    action: action.action,
    payload: compilePayload(action, compiler, options),
    targeting: compileTargeting(action),
    control: compileControl(action),
    source: action,
    sourcePath: basePath,
  };

  if (action.when !== undefined) {
    node.when = compiler.compileValue(action.when, options) as unknown as CompiledRuntimeValue<boolean>;
  }

  if (action.then !== undefined) {
    const thenActions = Array.isArray(action.then) ? action.then : [action.then];
    node.then = thenActions.map((a, i) =>
      compileActionNode(a, compiler, `${basePath}.then[${i}]`, options)
    );
  }

  if (action.onError !== undefined) {
    const onErrorActions = Array.isArray(action.onError) ? action.onError : [action.onError];
    node.onError = onErrorActions.map((a, i) =>
      compileActionNode(a, compiler, `${basePath}.onError[${i}]`, options)
    );
  }

  if (action.onSettled !== undefined) {
    const onSettledActions = Array.isArray(action.onSettled) ? action.onSettled : [action.onSettled];
    node.onSettled = onSettledActions.map((a, i) =>
      compileActionNode(a, compiler, `${basePath}.onSettled[${i}]`, options)
    );
  }

  if (action.parallel !== undefined) {
    node.parallel = action.parallel.map((a, i) =>
      compileActionNode(a, compiler, `${basePath}.parallel[${i}]`, options)
    );
  }

  return node;
}

function isPayloadFullyStatic(payload: CompiledActionPayload): boolean {
  const values = [
    payload.args,
    payload.value,
    payload.values,
  ];

  return values.every((v) => v === undefined || v.isStatic);
}

function isNodeFullyStatic(node: CompiledActionNode): boolean {
  if (node.when !== undefined && !node.when.isStatic) {
    return false;
  }

  if (!isPayloadFullyStatic(node.payload)) {
    return false;
  }

  const branches = [node.then, node.onError, node.onSettled, node.parallel];

  for (const branch of branches) {
    if (branch !== undefined && !branch.every(isNodeFullyStatic)) {
      return false;
    }
  }

  return true;
}

export interface ActionCompilerOptions extends ExpressionCompileOptions {
  basePath?: string;
}

export function compileAction(
  action: ActionSchema,
  compiler: ExpressionCompiler,
  options?: ActionCompilerOptions
): CompiledActionProgram {
  const basePath = options?.basePath ?? '$';
  const node = compileActionNode(action, compiler, basePath, options);

  return {
    nodes: [node],
    isFullyStatic: isNodeFullyStatic(node),
  };
}

export function compileActions(
  actions: ActionSchema | ActionSchema[],
  compiler: ExpressionCompiler,
  options?: ActionCompilerOptions
): CompiledActionProgram {
  const basePath = options?.basePath ?? '$';
  const actionArray = Array.isArray(actions) ? actions : [actions];
  const nodes = actionArray.map((a, i) =>
    compileActionNode(a, compiler, `${basePath}[${i}]`, options)
  );

  return {
    nodes,
    isFullyStatic: nodes.every(isNodeFullyStatic),
  };
}

export type { CompiledActionNode, CompiledActionProgram };
