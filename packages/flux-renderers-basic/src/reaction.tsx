import { useLayoutEffect, useRef } from 'react';
import type { ActionContext, ActionResult, ActionSchema, CompiledActionProgram } from '@nop-chaos/flux-core';
import type { ReactionSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useRendererRuntime } from '@nop-chaos/flux-react';

export function ReactionRenderer(props: RendererComponentProps<ReactionSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const dispatchRef = useRef(props.helpers.dispatch);
  const compiledReaction = props.templateNode.compiledReactions?.[0];

  useLayoutEffect(() => {
    dispatchRef.current = props.helpers.dispatch;
  }, [props.helpers.dispatch]);

  useLayoutEffect(() => {
    const registration = runtime.registerReaction({
      id: props.id,
      schema: props.schema,
      compiledReaction,
      scope,
      dispatch(action: ActionSchema | ActionSchema[] | CompiledActionProgram, ctx?: Partial<ActionContext>): Promise<ActionResult> {
        return dispatchRef.current(action, ctx);
      }
    });

    return () => {
      registration.dispose();
    };
  }, [props.id, props.schema, compiledReaction, runtime, scope]);

  return null;
}
