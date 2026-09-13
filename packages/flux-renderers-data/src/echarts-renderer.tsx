import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ComponentHandle, RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { EChartsSchema } from './echarts-schemas.js';
import type { EChartsType } from './echarts-setup.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const lastOptionRef = useRef<Record<string, unknown> | null>(null);
  const [chartInstance, setChartInstance] = useState<EChartsType | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const option = props.props.option;
  const optionIsObject = isPlainObject(option);
  const series = optionIsObject ? option.series : undefined;
  const hasSeries = Array.isArray(series) && series.length > 0;
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
          typeof theme === 'string' || isPlainObject(theme) ? theme : undefined;
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
    if (lastOptionRef.current === option) {
      return;
    }
    lastOptionRef.current = option;
    instance.setOption(option, { notMerge, lazyUpdate });
  }, [chartInstance, option, optionIsObject, notMerge, lazyUpdate]);

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

  return (
    <div
      className={cn('nop-echarts', props.meta.className)}
      style={{ height: chartHeight } as CSSProperties}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-empty={!optionIsObject || !hasSeries ? 'true' : undefined}
    >
      {!optionIsObject ? (
        <div data-slot="echarts-empty">{t('flux.common.noData')}</div>
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
