import React, { useEffect, useState } from 'react';
import type {
  BaseSchema,
  DynamicRendererSchema,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { asReactNode } from './utils.js';

function isActionResult(value: unknown): value is { ok?: unknown; data?: unknown; error?: unknown } {
  return value != null && typeof value === 'object' && ('ok' in value || 'data' in value || 'error' in value);
}

function isBaseSchemaLike(value: unknown): value is BaseSchema {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

type DynamicRendererState = {
  loadActionKey?: string;
  loading: boolean;
  error: unknown;
  schema: BaseSchema | null;
};

function getLoadActionKey(loadAction?: DynamicRendererSchema['loadAction']): string | undefined {
  if (!loadAction) {
    return undefined;
  }

  try {
    return JSON.stringify(loadAction);
  } catch {
    return String(loadAction);
  }
}

function createDynamicRendererState(loadAction?: DynamicRendererSchema['loadAction']): DynamicRendererState {
  return {
    loadActionKey: getLoadActionKey(loadAction),
    loading: Boolean(loadAction),
    error: loadAction ? undefined : 'loadAction is required',
    schema: null,
  };
}

export function DynamicRenderer(props: RendererComponentProps<DynamicRendererSchema>) {
  'use no memo';

  const loadAction = props.props.loadAction;
  const loadActionKey = getLoadActionKey(loadAction);
  const [state, setState] = useState<DynamicRendererState>(() => createDynamicRendererState(loadAction));
  const visibleState = state.loadActionKey === loadActionKey ? state : createDynamicRendererState(loadAction);

  useEffect(() => {
    if (!loadAction) {
      return;
    }

    const controller = new AbortController();

    const loadSchema = async () => {
      try {
        const result = await props.helpers.dispatch(loadAction, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!result.ok) {
          setState({
            loadActionKey,
            loading: false,
            error: result.error ?? new Error('dynamic-renderer loadAction failed'),
            schema: null,
          });
          return;
        }

        const nextSchema = isActionResult(result.data) ? result.data.data : result.data;

        if (!isBaseSchemaLike(nextSchema)) {
          setState({
            loadActionKey,
            loading: false,
            error: 'Invalid schema received from action',
            schema: null,
          });
          return;
        }

        setState({ loadActionKey, loading: false, error: undefined, schema: nextSchema });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({ loadActionKey, loading: false, error: err, schema: null });
      }
    };

    loadSchema();

    return () => {
      controller.abort();
    };
  }, [loadAction, loadActionKey, props.helpers]);

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
        {asReactNode(
          props.helpers.render(visibleState.schema, {
            pathSuffix: `dynamic.${loadActionKey ?? 'schema'}`,
          }),
        )}
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
