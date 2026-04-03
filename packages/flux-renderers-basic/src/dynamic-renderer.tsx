import React, { useEffect, useRef, useState } from 'react';
import type { ApiObject, BaseSchema, DynamicRendererSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererEnv, useRendererRuntime } from '@nop-chaos/flux-react';
import { executeApiObject } from '@nop-chaos/flux-runtime';
import { classNames } from './utils';

function isBaseSchemaLike(value: unknown): value is BaseSchema {
  return Boolean(value) && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';
}

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
        const scope = props.helpers.createScope({});
        const result = await executeApiObject(schemaApi as ApiObject, scope, env, runtime.expressionCompiler);

        if (!mountedRef.current) return;

        if (!isBaseSchemaLike(result.data)) {
          setState({ loading: false, error: 'Invalid schema received from API', schema: null });
          return;
        }

        setState({ loading: false, error: undefined, schema: result.data });
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
      <div className={classNames('nop-dynamic-renderer', props.meta.className)} data-error="" data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
        Error: {state.error instanceof Error ? state.error.message : String(state.error)}
      </div>
    );
  }

  if (state.schema) {
    return (
      <div className={classNames('nop-dynamic-renderer', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
        {props.helpers.render(state.schema)}
      </div>
    );
  }

  return (
    <div className={classNames('nop-dynamic-renderer', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {props.regions.body?.render()}
    </div>
  );
}
