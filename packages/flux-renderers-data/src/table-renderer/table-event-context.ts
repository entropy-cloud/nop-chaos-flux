import type { FluxActionEvent, RendererComponentProps } from '@nop-chaos/flux-core';
import type { TableSchema } from '../schemas.js';

type TableHelpers = RendererComponentProps<TableSchema>['helpers'];

export function createTableEventContext(
  payload: Record<string, unknown>,
  args: {
    helpers: TableHelpers;
    scopeKey: string;
    pathSuffix: string;
    event?: FluxActionEvent;
  },
) {
  return {
    event: args.event,
    scope: args.helpers.createScope(payload, {
      scopeKey: args.scopeKey,
      pathSuffix: args.pathSuffix,
    }),
    evaluationBindings: payload,
  };
}
