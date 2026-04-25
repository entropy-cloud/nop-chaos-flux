import {
  type ActionContext,
  type ActionResult,
  type ActionSchema,
  type RendererRuntime,
  type ScopeRef
} from '@nop-chaos/flux-core';

export function createSourceExecutor(input: {
  runtime: RendererRuntime;
  executeAction: (action: ActionSchema, ctx: ActionContext) => Promise<ActionResult>;
}) {
  return async function executeSource(source: import('@nop-chaos/flux-core').SourceSchema, scope: ScopeRef, ctx?: Partial<ActionContext>) {
    if (source.formula !== undefined) {
      const value = input.runtime.evaluate(source.formula, scope);
      return { ok: true, data: value };
    }

    if (!source.action) {
      return { ok: false, error: new Error('Source requires action or formula') };
    }

    const actionInput: ActionSchema = source as ActionSchema;

    const result = await input.executeAction(actionInput, {
      runtime: input.runtime,
      scope,
      ...ctx
    });

    return result;
  };
}
