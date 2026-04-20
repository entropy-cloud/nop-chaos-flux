import React, { useEffect, useState } from 'react';
import type { BaseSchema, DynamicRendererSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererEnv, useRendererRuntime } from '@nop-chaos/flux-react';
import { executeApiObject } from '@nop-chaos/flux-runtime';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

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

  useEffect(() => {
    const controller = new AbortController();

    const loadSchema = async () => {
      try {
        const scope = props.helpers.createScope({});
        const result = await executeApiObject(schemaApi as DynamicRendererSchema['schemaApi'], scope, env, runtime.expressionCompiler, { signal: controller.signal });

        if (controller.signal.aborted) return;

        if (!isBaseSchemaLike(result.data)) {
          setState({ loading: false, error: 'Invalid schema received from API', schema: null });
          return;
        }

        setState({ loading: false, error: undefined, schema: result.data });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({ loading: false, error: err, schema: null });
      }
    };

    loadSchema();

    return () => {
      controller.abort();
    };
  }, [schemaApi, runtime, env, props.helpers]);

  if (state.error) {
    return (
      <div className={cn('nop-dynamic-renderer', props.meta.className)} data-error="" data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
        {t('flux.dynamicRenderer.error')}{state.error instanceof Error ? state.error.message : String(state.error)}
      </div>
    );
  }

  if (state.schema) {
    return (
      <div className={cn('nop-dynamic-renderer', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
        {props.helpers.render(state.schema)}
      </div>
    );
  }

  return (
    <div className={cn('nop-dynamic-renderer', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {props.regions.body?.render()}
    </div>
  );
}
