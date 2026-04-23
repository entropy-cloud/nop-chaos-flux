import { useLayoutEffect, useRef } from 'react';
import type { ActionContext, ActionResult, ActionSchema, CompiledActionProgram, CompiledReaction } from '@nop-chaos/flux-core';
import type { ReactionSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useRendererRuntime } from '@nop-chaos/flux-react';

export function ReactionRenderer(props: RendererComponentProps<ReactionSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const dispatchRef = useRef(props.helpers.dispatch);
  const compiledReaction = props.templateNode.compiledReactions?.[0] as CompiledReaction | undefined;

  useLayoutEffect(() => {
    dispatchRef.current = props.helpers.dispatch;
  }, [props.helpers.dispatch]);

  useLayoutEffect(() => {
    if (!compiledReaction) {
      throw new Error(`ReactionRenderer requires compiledReaction for node ${props.id}. Ensure the schema is compiled before rendering.`);
    }

    const registration = runtime.registerReaction({
      id: props.id,
      compiledReaction,
      scope,
      dispatch(action: ActionSchema | ActionSchema[] | CompiledActionProgram, ctx?: Partial<ActionContext>): Promise<ActionResult> {
        return dispatchRef.current(action, ctx);
      }
    });

    return () => {
      registration.dispose();
    };
  }, [props.id, compiledReaction, runtime, scope]);

  return null;
}
