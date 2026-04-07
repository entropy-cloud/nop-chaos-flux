import { useLayoutEffect, useRef } from 'react';
import type { ActionContext, ActionResult, ActionSchema } from '@nop-chaos/flux-core';
import type { ReactionSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useRendererRuntime } from '@nop-chaos/flux-react';

export function ReactionRenderer(props: RendererComponentProps<ReactionSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const dispatchRef = useRef(props.helpers.dispatch);

  useLayoutEffect(() => {
    dispatchRef.current = props.helpers.dispatch;
  }, [props.helpers.dispatch]);

  useLayoutEffect(() => {
    const registration = runtime.registerReaction({
      id: props.id,
      schema: props.schema,
      scope,
      dispatch(action: ActionSchema | ActionSchema[], ctx?: Partial<ActionContext>): Promise<ActionResult> {
        return dispatchRef.current(action, ctx);
      }
    });

    return () => {
      registration.dispose();
    };
  }, [props.id, props.schema, runtime, scope]);

  return null;
}
