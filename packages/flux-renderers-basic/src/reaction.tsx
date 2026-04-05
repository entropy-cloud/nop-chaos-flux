import { useEffect } from 'react';
import type { ReactionSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useRendererRuntime } from '@nop-chaos/flux-react';

export function ReactionRenderer(props: RendererComponentProps<ReactionSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();

  useEffect(() => {
    const registration = runtime.registerReaction({
      id: props.id,
      schema: props.schema,
      scope,
      dispatch: props.helpers.dispatch
    });

    return () => {
      registration.dispose();
    };
  }, [props.helpers.dispatch, props.id, props.schema, runtime, scope]);

  return null;
}
