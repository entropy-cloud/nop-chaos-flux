import React, { useEffect, useState } from 'react';
import type {
  BaseSchema,
  DynamicRendererSchema,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { asReactNode } from './utils.js';

function isBaseSchemaLike(value: unknown): value is BaseSchema {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

type DynamicRendererState = {
  loadAction?: DynamicRendererSchema['loadAction'];
  loading: boolean;
  error: unknown;
  schema: BaseSchema | null;
};

function createDynamicRendererState(loadAction?: DynamicRendererSchema['loadAction']): DynamicRendererState {
  return {
    loadAction,
    loading: Boolean(loadAction),
    error: loadAction ? undefined : 'loadAction is required',
    schema: null,
  };
}

export function DynamicRenderer(props: RendererComponentProps<DynamicRendererSchema>) {
  const loadAction = props.props.loadAction;
  const dispatch = props.helpers.dispatch;
  const [state, setState] = useState<DynamicRendererState>(() => createDynamicRendererState(loadAction));
  const visibleState = state.loadAction === loadAction ? state : createDynamicRendererState(loadAction);

  useEffect(() => {
    if (!loadAction) {
      return;
    }

    const controller = new AbortController();

    const loadSchema = async () => {
      try {
        const result = await dispatch(loadAction, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!isBaseSchemaLike(result.data)) {
          setState({
            loadAction,
            loading: false,
            error: 'Invalid schema received from action',
            schema: null,
          });
          return;
        }

        setState({ loadAction, loading: false, error: undefined, schema: result.data });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({ loadAction, loading: false, error: err, schema: null });
      }
    };

    loadSchema();

    return () => {
      controller.abort();
    };
  }, [dispatch, loadAction]);

   if (visibleState.error) {
    return (
      <div
        className={cn('nop-dynamic-renderer', props.meta.className)}
        data-error=""
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
      >
        {t('flux.dynamicRenderer.error')}
        {visibleState.error instanceof Error ? visibleState.error.message : String(visibleState.error)}
      </div>
    );
  }

  if (visibleState.schema) {
    return (
      <div
        className={cn('nop-dynamic-renderer', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
      >
        {asReactNode(props.helpers.render(visibleState.schema))}
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
