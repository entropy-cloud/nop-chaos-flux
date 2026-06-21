import React, { useEffect, useRef, useState } from 'react';
import type {
  BaseSchema,
  ComponentCapabilityResult,
  ComponentHandle,
  DynamicRendererSchema,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { cn, Spinner } from '@nop-chaos/ui';
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

type LoadAction = NonNullable<DynamicRendererSchema['loadAction']>;

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

function createDynamicRendererState(
  loadAction: DynamicRendererSchema['loadAction'] | undefined,
  autoLoad: boolean,
): DynamicRendererState {
  if (!autoLoad) {
    return {
      loadActionKey: getLoadActionKey(loadAction),
      loading: false,
      error: undefined,
      schema: null,
    };
  }
  return {
    loadActionKey: getLoadActionKey(loadAction),
    loading: Boolean(loadAction),
    error: loadAction ? undefined : 'loadAction is required',
    schema: null,
  };
}

export function DynamicRenderer(props: RendererComponentProps<DynamicRendererSchema>) {
  'use no memo';

  const scope = useRenderScope();
  const componentRegistry = useCurrentComponentRegistry();
  const autoLoad = props.props.autoLoad !== false;
  const loadActionKey = useScopeSelector(
    () =>
      getLoadActionKey(
        props.helpers.evaluate(props.schema.loadAction, scope) as
          | DynamicRendererSchema['loadAction']
          | undefined,
      ),
    Object.is,
  );
  const loadAction = props.helpers.evaluate(props.schema.loadAction, scope) as
    | DynamicRendererSchema['loadAction']
    | undefined;
  const [state, setState] = useState<DynamicRendererState>(
    () => createDynamicRendererState(loadAction, autoLoad),
  );
  const visibleState =
    state.loadActionKey === loadActionKey
      ? state
      : createDynamicRendererState(loadAction, autoLoad);

  const loadSchemaRef = useRef<{
    run: () => Promise<ComponentCapabilityResult>;
    abort: () => void;
  } | null>(null);

  useEffect(() => {
    let controller: AbortController | null = null;

    const run = async (): Promise<ComponentCapabilityResult> => {
      loadSchemaRef.current?.abort();

      let evaluatedLoadAction: DynamicRendererSchema['loadAction'] | undefined;
      try {
        evaluatedLoadAction = props.helpers.evaluate(props.schema.loadAction, scope) as
          | DynamicRendererSchema['loadAction']
          | undefined;
      } catch (err) {
        return { ok: false, error: err };
      }

      if (!evaluatedLoadAction) {
        return {
          ok: false,
          error: new Error('dynamic-renderer loadAction is not configured'),
        };
      }

      const key = getLoadActionKey(evaluatedLoadAction);
      controller = new AbortController();
      setState({ loadActionKey: key, loading: true, error: undefined, schema: null });

      try {
        const result = await props.helpers.dispatch(evaluatedLoadAction as LoadAction, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return { ok: false, cancelled: true };
        }

        if (!result.ok) {
          setState({
            loadActionKey: key,
            loading: false,
            error: result.error ?? new Error('dynamic-renderer loadAction failed'),
            schema: null,
          });
          return { ok: false, error: result.error };
        }

        const nextSchema = isActionResult(result.data) ? result.data.data : result.data;

        if (!isBaseSchemaLike(nextSchema)) {
          setState({
            loadActionKey: key,
            loading: false,
            error: 'Invalid schema received from action',
            schema: null,
          });
          return { ok: false, error: 'Invalid schema received from action' };
        }

        setState({ loadActionKey: key, loading: false, error: undefined, schema: nextSchema });
        return { ok: true };
      } catch (err) {
        if (controller.signal.aborted) {
          return { ok: false, cancelled: true };
        }
        setState({ loadActionKey: key, loading: false, error: err, schema: null });
        return { ok: false, error: err };
      }
    };

    loadSchemaRef.current = {
      run,
      abort: () => {
        controller?.abort();
      },
    };

    if (autoLoad && loadActionKey) {
      void run();
    }

    return () => {
      controller?.abort();
    };
  }, [loadActionKey, autoLoad, props.helpers, props.schema.loadAction, scope]);

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }

    const handle: ComponentHandle = {
      id: props.id,
      type: 'dynamic-renderer',
      capabilities: {
        invoke(method) {
          if (method !== 'refresh') {
            return Promise.resolve({
              ok: false,
              error: new Error(`Unsupported dynamic-renderer handle method: ${method}`),
            });
          }

          const entry = loadSchemaRef.current;
          if (!entry) {
            return Promise.resolve({
              ok: false,
              error: new Error('dynamic-renderer load pipeline is not initialized'),
            });
          }

          return entry.run();
        },
        hasMethod(method) {
          return method === 'refresh';
        },
        listMethods() {
          return ['refresh'];
        },
      },
    };

    return componentRegistry.register(handle, { cid: props.meta.cid });
  }, [componentRegistry, props.id, props.meta.cid]);

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

  if (visibleState.loading) {
    return (
      <div
        className={cn('nop-dynamic-renderer flex flex-col gap-3', props.meta.className)}
        data-loading=""
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
      >
        <div data-slot="dynamic-renderer-loading" role="status" aria-live="polite" className="flex items-center gap-2">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </div>
        {asReactNode(props.regions.body?.render())}
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
