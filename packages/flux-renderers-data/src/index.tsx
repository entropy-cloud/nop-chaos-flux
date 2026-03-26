import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ApiObject,
  BaseSchema,
  DataSourceSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry
} from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useRendererEnv, useRendererRuntime } from '@nop-chaos/flux-react';
import { registerRendererDefinitions, createApiCacheStore, resolveCacheKey } from '@nop-chaos/flux-runtime';

interface TableColumnSchema extends BaseSchema {
  label?: string;
  labelRegionKey?: string;
  name?: string;
  cellRegionKey?: string;
  buttons?: BaseSchema[];
  buttonsRegionKey?: string;
}

interface TableSchema extends BaseSchema {
  type: 'table';
  columns?: TableColumnSchema[];
  onRowClick?: BaseSchema;
  empty?: BaseSchema | BaseSchema[] | string;
}

const globalApiCache = createApiCacheStore();

function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const columns = Array.isArray(props.props.columns) ? (props.props.columns as TableColumnSchema[]) : [];
  const source = Array.isArray(props.props.source) ? (props.props.source as Array<Record<string, any>>) : [];
  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: 'No data' });
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const columnCount = Math.max(columns.length, 1);

  return (
    <div className="nop-table-wrap">
      {hasRendererSlotContent(headerContent) ? <div className="nop-table__header">{headerContent}</div> : null}
      <table className="nop-table">
        <thead>
          <tr>
            {columns.map((column, index) => {
              const labelRegion = typeof column.labelRegionKey === 'string' ? props.regions[column.labelRegionKey] : undefined;
              const labelContent = labelRegion?.render({ pathSuffix: `columns.${index}.label` }) ?? column.label ?? column.name;

              return <th key={`${column.name ?? column.label ?? 'column'}-${index}`}>{labelContent}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {source.length === 0
            ? (
                <tr className="nop-table__empty-row">
                  <td colSpan={columnCount} className="nop-table__empty-cell">{emptyContent}</td>
                </tr>
              )
            : source.map((record, index) => {
                const rowScope = props.helpers.createScope({ record, index }, {
                  scopeKey: `row:${record.id ?? index}`,
                  pathSuffix: `rows.${index}`,
                  source: 'row'
                });

                return (
                  <tr
                    key={String(record.id ?? index)}
                    className={props.events.onRowClick ? 'nop-table__row nop-table__row--interactive' : 'nop-table__row'}
                    onClick={props.events.onRowClick ? (event) => void props.events.onRowClick?.(event, { scope: rowScope }) : undefined}
                  >
                    {columns.map((column, columnIndex) => {
                      const cellRegion = typeof column.cellRegionKey === 'string' ? props.regions[column.cellRegionKey] : undefined;
                      const buttonRegion = typeof column.buttonsRegionKey === 'string' ? props.regions[column.buttonsRegionKey] : undefined;

                      if (column.type === 'operation' && (buttonRegion || Array.isArray(column.buttons))) {
                        return (
                          <td key={`op-${columnIndex}`}>
                            <div className="nop-table__actions" onClick={(event) => event.stopPropagation()}>
                              {buttonRegion
                                ? buttonRegion.render({
                                    scope: rowScope,
                                    pathSuffix: `buttons.${columnIndex}`
                                  })
                                : (column.buttons ?? []).map((button, buttonIndex) => (
                                    <div key={`btn-${buttonIndex}`}>
                                      {props.helpers.render(button, {
                                        scope: rowScope,
                                        pathSuffix: `buttons.${buttonIndex}`
                                      })}
                                    </div>
                                  ))}
                            </div>
                          </td>
                        );
                      }

                      if (cellRegion) {
                        return (
                          <td key={`${column.name ?? columnIndex}`}>
                            {cellRegion.render({
                              scope: rowScope,
                              pathSuffix: `cells.${columnIndex}`
                            })}
                          </td>
                        );
                      }

                      return <td key={`${column.name ?? columnIndex}`}>{column.name ? String(record[column.name] ?? '') : ''}</td>;
                    })}
                  </tr>
                );
              })}
        </tbody>
      </table>
      {hasRendererSlotContent(footerContent) ? <div className="nop-table__footer">{footerContent}</div> : null}
    </div>
  );
}

type DataSourceState = {
  loading: boolean;
  error: unknown;
  data: unknown;
};

function DataSourceRenderer(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const env = useRendererEnv();
  const schema = props.schema;
  const api = schema.api;
  const dataPath = schema.dataPath;
  const interval = schema.interval;
  const stopWhen = schema.stopWhen;
  const silent = schema.silent === true;
  const initialData = schema.initialData;

  const [state, setState] = useState<DataSourceState>(() => ({
    loading: initialData === undefined,
    error: undefined,
    data: initialData
  }));

  const pollingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    const executeRequest = async (isPolling: boolean = false): Promise<void> => {
      if (!mountedRef.current) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!isPolling) {
        setState((prev) => ({ ...prev, loading: true, error: undefined }));
      }

      try {
        const evaluatedApi = runtime.evaluate<ApiObject>(api, props.helpers.createScope({}));
        
        const cacheKey = resolveCacheKey(evaluatedApi);
        
        if (cacheKey) {
          const cached = globalApiCache.get<unknown>(cacheKey);
          if (cached) {
            if (!mountedRef.current) return;
            setState({ loading: false, error: undefined, data: cached.data });
            checkStopCondition(cached.data);
            return;
          }
        }

        const response = await env.fetcher(evaluatedApi, {
          scope: props.helpers.createScope({}),
          env,
          signal: controller.signal
        });

        if (!mountedRef.current) return;

        if (controller.signal.aborted) return;

        const responseData = response.data;

        if (cacheKey && evaluatedApi.cacheTTL && evaluatedApi.cacheTTL > 0) {
          globalApiCache.set(cacheKey, responseData, evaluatedApi.cacheTTL);
        }

        setState({ loading: false, error: undefined, data: responseData });
        checkStopCondition(responseData);
      } catch (err) {
        if (!mountedRef.current) return;

        if (err && typeof err === 'object' && ((err as { name?: string }).name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR')) {
          return;
        }

        setState({ loading: false, error: err, data: initialData });

        if (!silent) {
          const message = err instanceof Error ? err.message : String(err);
          env.notify('error', message);
        }
      }
    };

    const checkStopCondition = (data: unknown) => {
      if (!stopWhen || !interval) return;

      try {
        const scope = props.helpers.createScope(
          dataPath ? { [dataPath]: data } : { data },
          { scopeKey: 'data-source-stop-check', pathSuffix: 'stop-check' }
        );
        const shouldStop = runtime.evaluate<boolean>(stopWhen, scope);
        if (shouldStop) {
          pollingRef.current = false;
        }
      } catch {
        // Ignore stopWhen evaluation errors
      }
    };

    executeRequest();

    if (interval && interval > 0) {
      pollingRef.current = true;
      const pollInterval = setInterval(() => {
        if (pollingRef.current && mountedRef.current) {
          executeRequest(true);
        }
      }, interval);

      return () => {
        pollingRef.current = false;
        mountedRef.current = false;
        clearInterval(pollInterval);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [api.url, interval, stopWhen, silent, dataPath, runtime, env, props.helpers, initialData]);

  const bodyData = useMemo(() => {
    if (dataPath && state.data !== undefined) {
      return { [dataPath]: state.data };
    }
    if (state.data !== undefined) {
      return state.data as Record<string, unknown>;
    }
    return {};
  }, [dataPath, state.data]);
  
  const bodyContent = props.regions.body?.render({ 
    data: bodyData,
    scopeKey: 'data-source-body',
    pathSuffix: 'body'
  });

  if (state.loading && state.data === undefined) {
    return (
      <div className={props.meta.className}>
        <div className="nop-data-source-loading">Loading...</div>
      </div>
    );
  }

  if (state.error && state.data === undefined) {
    return (
      <div className={props.meta.className}>
        <div className="nop-data-source-error">
          Error: {state.error instanceof Error ? state.error.message : String(state.error)}
        </div>
      </div>
    );
  }

  return (
    <div className={props.meta.className}>
      {bodyContent}
    </div>
  );
}

export const dataRendererDefinitions: RendererDefinition[] = [
  {
    type: 'table',
    component: TableRenderer,
    fields: [
      { key: 'onRowClick', kind: 'event' },
      { key: 'empty', kind: 'value-or-region', regionKey: 'empty' }
    ]
  },
  {
    type: 'data-source',
    component: DataSourceRenderer,
    regions: ['body']
  }
];

export function registerDataRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, dataRendererDefinitions);
}
