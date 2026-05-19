import { staticCompiled } from './action-dispatcher-test-support.js';

type ActionNodeOptions = {
  control?: Record<string, unknown>;
  source?: Record<string, unknown>;
  when?: unknown;
  then?: unknown[];
  onError?: unknown[];
  onSettled?: unknown[];
  parallel?: unknown[];
};

export function actionNode(
  action: string,
  args?: Record<string, unknown>,
  options: ActionNodeOptions = {},
) {
  const { control, source, ...rest } = options;

  return {
    action,
    payload: args === undefined ? {} : { args: staticCompiled(args) },
    targeting: {},
    control: control ?? {},
    source: { action, ...(args === undefined ? {} : { args }), ...(source ?? {}) },
    ...rest,
  } as any;
}

export function parallelNode(children: unknown[]) {
  return actionNode('__parallel__', undefined, { parallel: children });
}
