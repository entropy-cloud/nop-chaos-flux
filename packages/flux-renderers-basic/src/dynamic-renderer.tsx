import React, { useEffect, useState } from 'react';
import type {
  BaseSchema,
  DynamicRendererSchema,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { asReactNode } from './utils';

function isBaseSchemaLike(value: unknown): value is BaseSchema {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

type DynamicRendererState = {
  loading: boolean;
  error: unknown;
  schema: BaseSchema | null;
};

export function DynamicRenderer(props: RendererComponentProps<DynamicRendererSchema>) {
  const loadAction = props.props.loadAction;
  const [state, setState] = useState<DynamicRendererState>({
    loading: true,
    error: loadAction ? undefined : 'loadAction is required',
    schema: null,
  });

  useEffect(() => {
    if (!loadAction) return;

    const controller = new AbortController();

    const loadSchema = async () => {
      try {
        const result = await props.helpers.dispatch(loadAction, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!isBaseSchemaLike(result.data)) {
          setState({ loading: false, error: 'Invalid schema received from action', schema: null });
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
  }, [loadAction, props.helpers]);

  if (state.error) {
    return (
      <div
        className={cn('nop-dynamic-renderer', props.meta.className)}
        data-error=""
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
      >
        {t('flux.dynamicRenderer.error')}
        {state.error instanceof Error ? state.error.message : String(state.error)}
      </div>
    );
  }

  if (state.schema) {
    return (
      <div
        className={cn('nop-dynamic-renderer', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
      >
        {asReactNode(props.helpers.render(state.schema))}
      </div>
    );
  }

  return (
    <div
      className={cn('nop-dynamic-renderer', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {asReactNode(props.regions.body?.render())}
    </div>
  );
}
