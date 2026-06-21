import { useRef, useEffect, useId, useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { ComponentHandle, RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentComponentRegistry,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn, Spinner } from '@nop-chaos/ui';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@nop-chaos/ui/chart';
import type { ChartSchema, ChartSeriesSchema, ChartType } from './chart-schemas.js';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function isChartType(value: unknown): value is ChartType {
  return (
    value === 'bar' ||
    value === 'line' ||
    value === 'pie' ||
    value === 'scatter' ||
    value === 'area'
  );
}

function isChartDatum(value: unknown): value is number | { name?: string; value: number } {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return true;
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { name?: unknown; value?: unknown };
  return (
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value) &&
    (candidate.name === undefined || typeof candidate.name === 'string')
  );
}

function sanitizeSeries(value: unknown): ChartSeriesSchema[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as Record<string, unknown>;
    return [
      {
        name: typeof candidate.name === 'string' ? candidate.name : undefined,
        type: isChartType(candidate.type) ? candidate.type : undefined,
        data: Array.isArray(candidate.data) ? candidate.data.filter(isChartDatum) : undefined,
        dataRegionKey: typeof candidate.dataRegionKey === 'string' ? candidate.dataRegionKey : undefined,
      },
    ];
  });
}

export function ChartRenderer(props: RendererComponentProps<ChartSchema>) {
  const componentRegistry = useCurrentComponentRegistry();
  const chartRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const chartType = isChartType(props.props.chartType) ? props.props.chartType : 'bar';
  const titleContent = resolveRendererSlotContent(props, 'title');
  const titleText = typeof props.props.title === 'string' ? props.props.title : undefined;
  const source = Array.isArray(props.props.source)
    ? (props.props.source as Array<Record<string, unknown>>)
    : [];
  const series = sanitizeSeries(props.props.series);
  const componentId =
    typeof props.props.componentId === 'string' ? props.props.componentId : props.id;
  const xAxis = props.props.xAxis as { dataKey?: string; label?: string } | undefined;
  const yAxis = props.props.yAxis as { label?: string } | undefined;
  const height = props.props.height ?? 400;
  const loading = props.props.loading as boolean | undefined;
  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });

  const isEmpty = source.length === 0 && series.every((s) => !s.data || s.data.length === 0);

  const xKey = xAxis?.dataKey;
  const hasMultipleSeries = series.length > 1;
  const showLegend = (props.props.legend as boolean | undefined) ?? hasMultipleSeries;
  const showGrid = (props.props.grid as boolean | undefined) ?? true;
  const stacked = props.props.stacked === true;
  const palette =
    Array.isArray(props.props.colors) && props.props.colors.length > 0
      ? (props.props.colors as string[])
      : COLORS;

  const chartConfig: ChartConfig = (() => {
    const config: ChartConfig = {};
    series.forEach((s, i) => {
      if (s.name) {
        config[s.name] = { label: s.name, color: palette[i % palette.length] };
      }
    });
    if (Object.keys(config).length === 0) {
      config.value = { label: titleText ?? 'Value', color: palette[0] };
    }
    return config;
  })();

  const pieData = (() => {
    if (source.length > 0 && xKey) {
      return source.map((item, i) => ({
        name: String(item[xKey] ?? ''),
        value: Number(series[0]?.dataRegionKey ? item[series[0].dataRegionKey] : (item.value ?? 0)),
        fill: palette[i % palette.length],
      }));
    }
    if (series[0]?.data) {
      return series[0].data.map((d, i) => ({
        name: typeof d === 'object' && d !== null ? String(d.name ?? '') : '',
        value: typeof d === 'object' && d !== null ? d.value : d,
        fill: palette[i % palette.length],
      }));
    }
    return [];
  })();

  const cartesianData = (() => {
    if (source.length > 0) {
      return source;
    }
    if (series.length > 0 && series[0].data) {
      return series[0].data.map((d, i) => {
        if (typeof d === 'object' && d !== null) {
          return { name: d.name ?? `item-${i}`, value: d.value };
        }
        return { name: `item-${i}`, value: d };
      });
    }
    return [];
  })();

  const chartHeight = typeof height === 'number' ? `${height}px` : height || '400px';
  const hasTitleContent = hasRendererSlotContent(titleContent);
  const chartAccessibleName = titleText?.trim() || t('flux.common.chart');
  const resolvedChartType = (
    series.length > 0 ? (series[0].type ?? chartType) : chartType
  ) as ChartType;
  const chartDataSummary = (() => {
    if (resolvedChartType === 'pie') {
      return pieData.map((item) => `${item.name}: ${item.value}`);
    }

    return cartesianData.slice(0, 20).map((item, index) => {
      const record = item as Record<string, unknown>;
      const label = xKey ? String(record[xKey] ?? `item-${index + 1}`) : `item-${index + 1}`;
      const seriesList = (series.length > 0 ? series : [{ name: 'value' } as ChartSeriesSchema])
        .map((seriesItem) => {
          const key = seriesItem.dataRegionKey ?? seriesItem.name ?? 'value';
          return `${seriesItem.name ?? key}: ${String(record[key] ?? '')}`;
        })
        .join(', ');
      return `${label}: ${seriesList}`;
    });
  })();

  const handleResize = () => {
    void chartRef.current;
  };

  const chartHandle: ComponentHandle = useMemo(() => ({
    id: componentId,
    type: 'chart',
    get ref() {
      return chartRef.current;
    },
    capabilities: {
      invoke(method, _payload) {
        switch (method) {
          case 'resize':
            handleResize();
            return { ok: true };
          default:
            return { ok: false, error: new Error(`Unsupported chart handle method: ${method}`) };
        }
      },
      hasMethod(method) {
        return method === 'resize';
      },
      listMethods() {
        return ['resize'];
      },
    },
  }), [componentId]);

  useEffect(() => {
    if (!componentRegistry) return;
    return componentRegistry.register(chartHandle, { cid: props.meta.cid });
  }, [chartHandle, componentRegistry, props.meta.cid]);

  const renderChart = () => {
    if (resolvedChartType === 'pie') {
      return (
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%">
            {pieData.map((item, i) => (
              <Cell key={item.name || `cell-${item.value}-${i}`} fill={palette[i % palette.length]} />
            ))}
          </Pie>
        </PieChart>
      );
    }

    if (resolvedChartType === 'scatter') {
      return (
        <ScatterChart>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          {xKey && <XAxis dataKey={xKey} name={xAxis?.label} />}
          <YAxis name={yAxis?.label} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          {series.length > 0 ? (
            series.map((s, i) => (
              <Scatter
                key={s.name ?? `series-${i}`}
                name={s.name}
                data={
                  s.dataRegionKey
                    ? cartesianData.map((item: Record<string, unknown>) => ({
                        x: item[xKey ?? 'name'],
                        y: item[s.dataRegionKey!],
                      }))
                    : cartesianData
                }
              />
            ))
          ) : (
            <Scatter data={cartesianData} />
          )}
        </ScatterChart>
      );
    }

    if (resolvedChartType === 'line') {
      return (
        <LineChart data={cartesianData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          {xKey && <XAxis dataKey={xKey} name={xAxis?.label} />}
          <YAxis name={yAxis?.label} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          {series.length > 0 ? (
            series.map((s, i) => (
              <Line
                key={s.name ?? `series-${i}`}
                type="monotone"
                dataKey={s.dataRegionKey ?? s.name ?? 'value'}
                name={s.name}
                stroke={palette[i % palette.length]}
                strokeWidth={2}
                dot={false}
              />
            ))
          ) : (
            <Line type="monotone" dataKey="value" stroke={palette[0]} strokeWidth={2} dot={false} />
          )}
        </LineChart>
      );
    }

    if (resolvedChartType === 'area') {
      return (
        <AreaChart data={cartesianData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          {xKey && <XAxis dataKey={xKey} name={xAxis?.label} />}
          <YAxis name={yAxis?.label} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <ChartLegend content={<ChartLegendContent />} />}
          {series.length > 0 ? (
            series.map((s, i) => (
              <Area
                key={s.name ?? `series-${i}`}
                type="monotone"
                dataKey={s.dataRegionKey ?? s.name ?? 'value'}
                name={s.name}
                stroke={palette[i % palette.length]}
                fill={palette[i % palette.length]}
                stackId={stacked ? 'a' : undefined}
              />
            ))
          ) : (
            <Area type="monotone" dataKey="value" stroke={palette[0]} fill={palette[0]} />
          )}
        </AreaChart>
      );
    }

    return (
      <BarChart data={cartesianData}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        {xKey && <XAxis dataKey={xKey} name={xAxis?.label} />}
        <YAxis name={yAxis?.label} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        {series.length > 0 ? (
          series.map((s, i) => (
            <Bar
              key={s.name ?? `series-${i}`}
              dataKey={s.dataRegionKey ?? s.name ?? 'value'}
              name={s.name}
              fill={palette[i % palette.length]}
              stackId={stacked ? 'a' : undefined}
            />
          ))
        ) : (
          <Bar dataKey="value" fill={palette[0]} />
        )}
      </BarChart>
    );
  };

  return (
    <div
      className={cn('nop-chart', props.meta.className)}
      style={{ height: chartHeight } as CSSProperties}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {hasTitleContent ? <div data-slot="chart-title" id={titleId}>{titleContent}</div> : null}
      {isEmpty ? (
        <div data-slot="chart-empty">{emptyContent}</div>
      ) : (
        <div
          data-slot="chart-canvas"
          ref={chartRef}
          style={{ width: '100%', height: '100%' }}
          role="img"
          tabIndex={0}
          aria-label={hasTitleContent ? undefined : chartAccessibleName}
          aria-labelledby={hasTitleContent ? titleId : undefined}
          onClick={(event) => void props.events.onClick?.(event, {})}
          onKeyDown={(event) => {
            if (props.events.onClick && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              void props.events.onClick?.(event, {});
            }
          }}
          onMouseEnter={(event) => void props.events.onHover?.(event, {})}
          className="focus-visible:ring-2 focus-visible:ring-ring rounded-sm outline-none"
        >
          <div className="sr-only" data-slot="chart-data-equivalent">
            <p>{chartAccessibleName}</p>
            <ul>
              {chartDataSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                height: '100%',
              }}
            >
              <Spinner className="size-4" aria-hidden="true" />
              <span>{t('flux.common.loading')}</span>
            </div>
          ) : (
            <ChartContainer config={chartConfig} style={{ height: '100%' }}>
              {renderChart()}
            </ChartContainer>
          )}
        </div>
      )}
    </div>
  );
}
