import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  ActionSchema,
  ComponentHandle,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import {
  createNormalizedActionEvent,
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentComponentRegistry,
  useRenderScope,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { EChartsSchema } from './echarts-schemas.js';
import type { EChartsType } from './echarts-setup.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 裁决 A3：flux on* 命名 → ECharts 原生事件名，不发明平行命名。 */
const NATIVE_EVENT_BINDINGS: Array<{ fluxKey: string; native: string }> = [
  { fluxKey: 'onClick', native: 'click' },
  { fluxKey: 'onDblClick', native: 'dblclick' },
  { fluxKey: 'onMouseOver', native: 'mouseover' },
  { fluxKey: 'onMouseOut', native: 'mouseout' },
  { fluxKey: 'onMouseDown', native: 'mousedown' },
  { fluxKey: 'onMouseUp', native: 'mouseup' },
  { fluxKey: 'onContextMenu', native: 'contextmenu' },
  { fluxKey: 'onDataZoom', native: 'dataZoom' },
  { fluxKey: 'onLegendSelectChanged', native: 'legendselectchanged' },
];

const KNOWN_FLUX_EVENT_KEYS = new Set(NATIVE_EVENT_BINDINGS.map((binding) => binding.fluxKey));

function isValidDatasetSource(value: unknown): boolean {
  if (Array.isArray(value)) {
    return true;
  }
  if (isPlainObject(value)) {
    const columns = Object.values(value);
    return columns.length > 0 && columns.every((entry) => Array.isArray(entry));
  }
  return false;
}

interface ResolvedDatasetBinding {
  source: unknown;
  raw: Record<string, unknown>;
}

type EChartsSetupModule = typeof import('./echarts-setup.js');

let echartsSetupPromise: Promise<EChartsSetupModule> | null = null;

function loadEChartsSetup(): Promise<EChartsSetupModule> {
  if (!echartsSetupPromise) {
    echartsSetupPromise = import('./echarts-setup.js').catch((error: unknown) => {
      echartsSetupPromise = null;
      throw error;
    });
  }
  return echartsSetupPromise;
}

export function EChartsRenderer(props: RendererComponentProps<EChartsSchema>) {
  const componentRegistry = useCurrentComponentRegistry();
  const scope = useRenderScope();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const lastOptionRef = useRef<Record<string, unknown> | null>(null);
  const [chartInstance, setChartInstance] = useState<EChartsType | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const eventsMap = isPlainObject(props.props.events)
    ? (props.props.events as Record<string, unknown>)
    : undefined;

  const option = props.props.option;
  const optionIsObject = isPlainObject(option);
  const series = optionIsObject ? option.series : undefined;
  const hasSeries = Array.isArray(series) && series.length > 0;
  const datasetBinding = props.props.dataset;
  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });
  const hasEmptySlotContent = hasRendererSlotContent(emptyContent);

  const datasetInfo = useMemo((): ResolvedDatasetBinding | null => {
    if (!isPlainObject(datasetBinding)) {
      return null;
    }
    const raw = datasetBinding;
    let source: unknown = raw.source;
    if (typeof source === 'string') {
      try {
        source = props.helpers.evaluate(source);
      } catch (error) {
        console.warn('[flux-echarts] dataset.source expression evaluation failed:', error);
        return null;
      }
    }
    if (!isValidDatasetSource(source)) {
      if (source !== undefined) {
        console.warn(
          '[flux-echarts] dataset.source must resolve to a row array, a columnar object, or a 2D array; ignoring the dataset binding.',
        );
      }
      return null;
    }
    return { source, raw };
  }, [datasetBinding, props.helpers]);

  const datasetEmpty =
    datasetInfo !== null && Array.isArray(datasetInfo.source) && datasetInfo.source.length === 0;

  const composedOption = useMemo((): unknown => {
    if (!optionIsObject || !datasetInfo) {
      return option;
    }
    const nextDataset: Record<string, unknown> = { source: datasetInfo.source };
    if (datasetInfo.raw.dimensions !== undefined) {
      nextDataset.dimensions = datasetInfo.raw.dimensions;
    }
    if (datasetInfo.raw.transform !== undefined) {
      nextDataset.transform = datasetInfo.raw.transform;
    }
    return { ...option, dataset: nextDataset };
  }, [option, optionIsObject, datasetInfo]);

  useEffect(() => {
    if (!datasetInfo || !optionIsObject) {
      return;
    }
    const dimensions = datasetInfo.raw.dimensions;
    const source = datasetInfo.source;
    if (
      Array.isArray(dimensions) &&
      Array.isArray(source) &&
      source.length > 0 &&
      isPlainObject(source[0])
    ) {
      const keys = Object.keys(source[0]);
      for (const dim of dimensions) {
        if (typeof dim === 'string' && !keys.includes(dim)) {
          console.warn(`[flux-echarts] dimension "${dim}" not found in dataset source keys.`);
        }
      }
    }
    if (Array.isArray(dimensions) && optionIsObject && Array.isArray(option.series)) {
      for (const entry of option.series) {
        if (!isPlainObject(entry) || !isPlainObject(entry.encode)) {
          continue;
        }
        for (const [channel, ref] of Object.entries(entry.encode)) {
          const refs = Array.isArray(ref) ? ref : [ref];
          for (const item of refs) {
            if (typeof item === 'string' && !dimensions.includes(item)) {
              console.warn(
                `[flux-echarts] encode.${channel} references unknown dimension: ${item}`,
              );
            }
          }
        }
      }
    }
  }, [datasetInfo, optionIsObject, option]);
  const rendererMode = props.props.renderer === 'svg' ? 'svg' : 'canvas';
  const theme = props.props.theme;
  const initOptions = isPlainObject(props.props.initOptions) ? props.props.initOptions : undefined;
  const notMerge = props.props.notMerge === true;
  const lazyUpdate = props.props.lazyUpdate === true;
  const componentId =
    typeof props.props.componentId === 'string' ? props.props.componentId : props.id;
  const height = props.props.height;
  const chartHeight =
    typeof height === 'number' ? `${height}px` : height ? height : '400px';

  useEffect(() => {
    if (!optionIsObject) {
      return;
    }
    let cancelled = false;
    let instance: EChartsType | null = null;

    loadEChartsSetup()
      .then(({ getECharts }) => {
        if (cancelled) {
          return;
        }
        const container = containerRef.current;
        if (!container) {
          return;
        }
        const themeArg =
          typeof theme === 'string' || isPlainObject(theme) ? theme : 'flux';
        instance = getECharts().init(container, themeArg as string, {
          renderer: rendererMode,
          ...initOptions,
        });
        chartRef.current = instance;
        lastOptionRef.current = null;
        setChartInstance(instance);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        console.warn('[flux-echarts] failed to load the echarts chunk:', error);
        setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      instance?.dispose();
      chartRef.current = null;
      setChartInstance(null);
    };
  }, [optionIsObject, rendererMode, theme, initOptions]);

  useEffect(() => {
    const instance = chartRef.current;
    if (!instance || !optionIsObject) {
      return;
    }
    if (lastOptionRef.current === composedOption) {
      return;
    }
    lastOptionRef.current = composedOption as Record<string, unknown>;
    instance.setOption(composedOption as Record<string, unknown>, { notMerge, lazyUpdate });
  }, [chartInstance, composedOption, optionIsObject, notMerge, lazyUpdate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !chartInstance || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [chartInstance]);

  useEffect(() => {
    if (!chartInstance || !eventsMap) {
      return;
    }
    const events = eventsMap;
    for (const key of Object.keys(events)) {
      if (!KNOWN_FLUX_EVENT_KEYS.has(key)) {
        console.warn(
          `[flux-echarts] unknown echarts event key "${key}"; expected one of ${[...KNOWN_FLUX_EVENT_KEYS].join(', ')}.`,
        );
      }
    }
    const nativeBindings: Array<[string, unknown]> = [
      ['click', events?.onClick],
      ['dblclick', events?.onDblClick],
      ['mouseover', events?.onMouseOver],
      ['mouseout', events?.onMouseOut],
      ['mousedown', events?.onMouseDown],
      ['mouseup', events?.onMouseUp],
      ['contextmenu', events?.onContextMenu],
      ['dataZoom', events?.onDataZoom],
      ['legendselectchanged', events?.onLegendSelectChanged],
    ];
    const handlers: Array<[string, (params: unknown) => void]> = [];
    for (const [native, action] of nativeBindings) {
      if (action === undefined) {
        continue;
      }
      const handler = (params: unknown) => {
        const normalized = createNormalizedActionEvent(
          isPlainObject(params) ? { type: native, ...params } : { type: native, params },
        );
        try {
          void Promise.resolve(
            props.helpers.dispatch(action as ActionSchema, { event: normalized, scope }),
          ).catch((error: unknown) => {
            console.warn('[flux-echarts] event action dispatch failed:', error);
          });
        } catch (error) {
          console.warn('[flux-echarts] event action dispatch failed:', error);
        }
      };
      chartInstance.on(native, handler);
      handlers.push([native, handler]);
    }
    return () => {
      for (const [native, handler] of handlers) {
        chartInstance.off(native, handler);
      }
    };
  }, [chartInstance, eventsMap, scope, props.helpers]);

  const chartHandle: ComponentHandle = useMemo(
    () => ({
      id: componentId,
      type: 'echarts',
      get ref() {
        return containerRef.current;
      },
      capabilities: {
        invoke(method, _payload) {
          if (method === 'resize') {
            chartRef.current?.resize();
            return { ok: true };
          }
          return { ok: false, error: new Error(`Unsupported echarts handle method: ${method}`) };
        },
        hasMethod(method) {
          return method === 'resize';
        },
        listMethods() {
          return ['resize'];
        },
      },
    }),
    [componentId],
  );

  useEffect(() => {
    if (!componentRegistry) return;
    return componentRegistry.register(chartHandle, { cid: props.meta.cid });
  }, [chartHandle, componentRegistry, props.meta.cid]);

  const isEmpty = !optionIsObject || datasetEmpty;

  return (
    <div
      className={cn('nop-echarts', props.meta.className)}
      style={{ height: chartHeight } as CSSProperties}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-empty={isEmpty || !hasSeries ? 'true' : undefined}
    >
      {isEmpty ? (
        <div data-slot="echarts-empty">
          {hasEmptySlotContent ? emptyContent : t('flux.common.noData')}
        </div>
      ) : loadFailed ? (
        <div data-slot="echarts-error">{t('flux.common.loadFailed')}</div>
      ) : (
        <div
          data-slot="echarts-canvas"
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
          role="img"
          aria-label={t('flux.common.chart')}
        />
      )}
    </div>
  );
}
