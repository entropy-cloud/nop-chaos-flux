import { useMemo, useRef, useCallback, useEffect } from 'react';
import type { CSSProperties } from 'react';
import {
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
import { resolveRendererSlotContent, useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
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

export function ChartRenderer(props: RendererComponentProps<ChartSchema>) {
  const componentRegistry = useCurrentComponentRegistry();
  const chartRef = useRef<HTMLDivElement>(null);

  const chartType = (props.props.chartType as ChartType) ?? 'bar';
  const title = props.props.title as string | undefined;
  const source = useMemo(
    () =>
      Array.isArray(props.props.source)
        ? (props.props.source as Array<Record<string, unknown>>)
        : [],
    [props.props.source],
  );
  const series = useMemo<ChartSeriesSchema[]>(
    () => (Array.isArray(props.props.series) ? (props.props.series as ChartSeriesSchema[]) : []),
    [props.props.series],
  );
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

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    series.forEach((s, i) => {
      if (s.name) {
        config[s.name] = { label: s.name, color: COLORS[i % COLORS.length] };
      }
    });
    if (Object.keys(config).length === 0) {
      config.value = { label: title ?? 'Value', color: COLORS[0] };
    }
    return config;
  }, [series, title]);

  const pieData = useMemo(() => {
    if (source.length > 0 && xKey) {
      return source.map((item, i) => ({
        name: String(item[xKey] ?? ''),
        value: Number(series[0]?.dataRegionKey ? item[series[0].dataRegionKey] : (item.value ?? 0)),
        fill: COLORS[i % COLORS.length],
      }));
    }
    if (series[0]?.data) {
      return series[0].data.map((d, i) => ({
        name: typeof d === 'object' && d !== null ? String(d.name ?? '') : '',
        value: typeof d === 'object' && d !== null ? d.value : d,
        fill: COLORS[i % COLORS.length],
      }));
    }
    return [];
  }, [source, xKey, series]);

  const cartesianData = useMemo(() => {
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
  }, [source, series]);

  const chartHeight = typeof height === 'number' ? `${height}px` : height || '400px';
  const chartAccessibleName = title?.trim() || t('flux.common.chart');
  const resolvedChartType = (
    series.length > 0 ? (series[0].type ?? chartType) : chartType
  ) as ChartType;
  const chartDataSummary = useMemo(() => {
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
  }, [cartesianData, pieData, resolvedChartType, series, xKey]);

  const handleResize = useCallback(() => {
    void chartRef.current;
  }, []);

  const chartHandle = useMemo<ComponentHandle>(
    () => ({
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
    }),
    [componentId, handleResize],
  );

  useEffect(() => {
    if (!componentRegistry) return;
    return componentRegistry.register(chartHandle, { cid: props.meta.cid });
  }, [chartHandle, componentRegistry, props.meta.cid]);

  const renderChart = () => {
    if (resolvedChartType === 'pie') {
      return (
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          {hasMultipleSeries && <ChartLegend content={<ChartLegendContent />} />}
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%">
            {pieData.map((item, i) => (
              <Cell key={item.name || `cell-${item.value}-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      );
    }

    if (resolvedChartType === 'scatter') {
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          {xKey && <XAxis dataKey={xKey} name={xAxis?.label} />}
          <YAxis name={yAxis?.label} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {hasMultipleSeries && <ChartLegend content={<ChartLegendContent />} />}
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
          <CartesianGrid strokeDasharray="3 3" />
          {xKey && <XAxis dataKey={xKey} name={xAxis?.label} />}
          <YAxis name={yAxis?.label} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {hasMultipleSeries && <ChartLegend content={<ChartLegendContent />} />}
          {series.length > 0 ? (
            series.map((s, i) => (
              <Line
                key={s.name ?? `series-${i}`}
                type="monotone"
                dataKey={s.dataRegionKey ?? s.name ?? 'value'}
                name={s.name}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))
          ) : (
            <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={false} />
          )}
        </LineChart>
      );
    }

    return (
      <BarChart data={cartesianData}>
        <CartesianGrid strokeDasharray="3 3" />
        {xKey && <XAxis dataKey={xKey} name={xAxis?.label} />}
        <YAxis name={yAxis?.label} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {hasMultipleSeries && <ChartLegend content={<ChartLegendContent />} />}
        {series.length > 0 ? (
          series.map((s, i) => (
            <Bar
              key={s.name ?? `series-${i}`}
              dataKey={s.dataRegionKey ?? s.name ?? 'value'}
              name={s.name}
              fill={COLORS[i % COLORS.length]}
            />
          ))
        ) : (
          <Bar dataKey="value" fill={COLORS[0]} />
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
      {isEmpty ? (
        <div data-slot="chart-empty">{emptyContent}</div>
      ) : (
        <div
          data-slot="chart-canvas"
          ref={chartRef}
          style={{ width: '100%', height: '100%' }}
          role={props.events.onClick ? 'button' : undefined}
          tabIndex={props.events.onClick ? 0 : undefined}
          aria-label={chartAccessibleName}
          onClick={(event) => void props.events.onClick?.(event, {})}
          onKeyDown={
            props.events.onClick
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void props.events.onClick?.(event, {});
                  }
                }
              : undefined
          }
          onMouseEnter={(event) => void props.events.onHover?.(event, {})}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              {t('flux.common.loading')}
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
