import React, { useEffect, useRef, useState } from 'react';
import type { ApiObject, BaseSchema, DynamicRendererSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererEnv, useRendererRuntime } from '@nop-chaos/flux-react';
import { classNames } from './utils';

type DynamicRendererState = {
  loading: boolean;
  error: unknown;
  schema: BaseSchema | null;
};

export function DynamicRenderer(props: RendererComponentProps<DynamicRendererSchema>) {
  const runtime = useRendererRuntime();
  const env = useRendererEnv();
  const schemaApi = props.props.schemaApi;

  const [state, setState] = useState<DynamicRendererState>({
    loading: true,
    error: undefined,
    schema: null
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const loadSchema = async () => {
      try {
        const evaluatedApi = runtime.evaluate<ApiObject>(schemaApi, props.helpers.createScope({}));
        const response = await env.fetcher(evaluatedApi, {
          scope: props.helpers.createScope({}),
          env
        });

        if (!mountedRef.current) return;

        setState({ loading: false, error: undefined, schema: response.data as BaseSchema });
      } catch (err) {
        if (!mountedRef.current) return;
        setState({ loading: false, error: err, schema: null });
      }
    };

    loadSchema();

    return () => {
      mountedRef.current = false;
    };
  }, [schemaApi, runtime, env, props.helpers]);

  if (state.error) {
    return (
      <div className={classNames('nop-dynamic-renderer', props.meta.className)} data-error="">
        Error: {state.error instanceof Error ? state.error.message : String(state.error)}
      </div>
    );
  }

  if (state.schema) {
    return (
      <div className={classNames('nop-dynamic-renderer', props.meta.className)}>
        {props.helpers.render(state.schema)}
      </div>
    );
  }

  return (
    <div className={classNames('nop-dynamic-renderer', props.meta.className)}>
      {props.regions.body?.render()}
    </div>
  );
}
