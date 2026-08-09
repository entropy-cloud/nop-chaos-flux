import { useRef, useEffect, useId, useCallback, useMemo, useState } from 'react';
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
  ReferenceLine,
  ReferenceArea,
  Brush,
} from 'recharts';
import { getIn, type ComponentHandle, type RendererComponentProps } from '@nop-chaos/flux-core';
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
import { buildHeatmapGrid, HeatmapGrid, sanitizeHeatmapRows } from './chart-heatmap.js';
import { sanitizeYAxis, type SanitizedYAxisEntry } from './chart-y-axis.js';
import {
  isChartType,
  sanitizeBand,
  sanitizeMarkers,
  sanitizeReferenceLines,
  sanitizeSeries,
} from './chart-sanitize.js';

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
  const [chartNode, setChartNode] = useState<HTMLDivElement | null>(null);
  const titleId = useId();

  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  // Callback ref so the observer re-attaches when the async canvas mounts (the
  // canvas is only rendered once data arrives, so a plain ref + empty-deps effect
  // would bail on the first empty render and never observe the late-mounted node).
  const setChartRef = useCallback((node: HTMLDivElement | null) => {
    chartRef.current = node;
    setChartNode(node);
  }, []);

  const measureContainerWidth = useCallback(() => {
    const node = chartRef.current;
    if (!node) {
      return;
    }
    const width = node.getBoundingClientRect().width;
    if (Number.isFinite(width)) {
      setContainerWidth(width);
    }
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !chartNode) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry?.contentRect?.width;
      if (typeof width === 'number' && Number.isFinite(width)) {
        setContainerWidth(width);
      }
    });
    observer.observe(chartNode);
    return () => observer.disconnect();
  }, [chartNode]);

  const chartType = isChartType(props.props.chartType) ? props.props.chartType : 'bar';
  const titleContent = resolveRendererSlotContent(props, 'title');
  const titleText = typeof props.props.title === 'string' ? props.props.title : undefined;
  const source = Array.isArray(props.props.source)
    ? (props.props.source as Array<Record<string, unknown>>)
    : [];
  const series = sanitizeSeries(props.props.series);
  const referenceLines = sanitizeReferenceLines(props.props.referenceLines);
  const band = sanitizeBand(props.props.band);
  const markers = sanitizeMarkers(props.props.markers);
  const componentId =
    typeof props.props.componentId === 'string' ? props.props.componentId : props.id;
  const xAxis = props.props.xAxis as { dataKey?: string; label?: string } | undefined;
  const yAxisInfo = sanitizeYAxis(props.props.yAxis);
  const height = props.props.height ?? 400;
  const loading = props.props.loading as boolean | undefined;
  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });

  const xKey = xAxis?.dataKey;
  const hasMultipleSeries = series.length > 1;
  const showLegend = (props.props.legend as boolean | undefined) ?? hasMultipleSeries;
  const showGrid = (props.props.grid as boolean | undefined) ?? true;
  const stacked = props.props.stacked === true;
  const brushEnabled = props.props.brush === true;
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
      return source.map((item, i) => {
        // H22: guard the source-array numeric coercion so a non-numeric cell does
        // not pollute the chart with NaN.
        const rawValue = series[0]?.dataRegionKey
          ? getIn(item, series[0].dataRegionKey)
          : (item.value ?? 0);
        const coerced = Number(rawValue);
        return {
          name: String(getIn(item, xKey) ?? ''),
          value: Number.isFinite(coerced) ? coerced : 0,
          fill: palette[i % palette.length],
        };
      });
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

  // 双轴/多轴：yAxis 数组形态 + 至少一个 series 声明 yAxisId 才启用；缺映射
  // 回退单轴渲染（Failure Path chart-dual-axis-invalid）。
  const dualAxisEnabled = yAxisInfo.multi && series.some((s) => typeof s.yAxisId === 'number');
  const yAxisEntries: SanitizedYAxisEntry[] = dualAxisEnabled
    ? yAxisInfo.entries.map((entry, index) => ({
        ...entry,
        position: entry.position === 'right' ? 'right' : index === 0 ? 'left' : 'right',
      }))
    : [yAxisInfo.entries[0]];

  // 自绘 heatmap 网格（recharts 无原生 heatmap 系列）。
  const heatmapRows = sanitizeHeatmapRows(
    source.length > 0 ? source : (series[0]?.data ?? []),
  );
  const heatmapGrid = buildHeatmapGrid(heatmapRows);
  const isHeatmap = (series.length > 0 ? (series[0].type ?? chartType) : chartType) === 'heatmap';
  const isEmpty = isHeatmap
    ? heatmapRows.length === 0
    : source.length === 0 && series.every((s) => !s.data || s.data.length === 0);

  const MOBILE_BREAKPOINT = 768;
  const MOBILE_HEIGHT_CEILING = 300;
  const isNarrow = containerWidth !== null && containerWidth < MOBILE_BREAKPOINT;
  const responsiveSupported = containerWidth !== null;
  const effectiveHeight =
    isNarrow && typeof height === 'number' ? Math.min(height, MOBILE_HEIGHT_CEILING) : height;
  const chartHeight =
    typeof effectiveHeight === 'number'
      ? `${effectiveHeight}px`
      : effectiveHeight || '400px';
  const hasTitleContent = hasRendererSlotContent(titleContent);
  const legendClassName = isNarrow ? 'flex-wrap gap-x-3 gap-y-1' : undefined;
  const chartAccessibleName = titleText?.trim() || t('flux.common.chart');
  const resolvedChartType = (
    series.length > 0 ? (series[0].type ?? chartType) : chartType
  ) as ChartType;
  const chartDataSummary = (() => {
    if (isHeatmap) {
      return heatmapRows.slice(0, 20).map((row) => `${row.x}/${row.y}: ${row.value}`);
    }
    if (resolvedChartType === 'pie') {
      return pieData.map((item) => `${item.name}: ${item.value}`);
    }

    return cartesianData.slice(0, 20).map((item, index) => {
      const record = item as Record<string, unknown>;
      const label = xKey ? String(getIn(record, xKey) ?? `item-${index + 1}`) : `item-${index + 1}`;
      const seriesList = (series.length > 0 ? series : [{ name: 'value' } as ChartSeriesSchema])
        .map((seriesItem) => {
          const key = seriesItem.dataRegionKey ?? seriesItem.name ?? 'value';
          return `${seriesItem.name ?? key}: ${String(getIn(record, key) ?? '')}`;
        })
        .join(', ');
      return `${label}: ${seriesList}`;
    });
  })();
  const referenceSummary =
    referenceLines.length > 0
      ? `References: ${referenceLines
          .map((line) => `${line.label ?? 'reference'}: ${line.value}`)
          .join(', ')}`
      : undefined;

  const handleResize = useCallback(() => {
    measureContainerWidth();
  }, [measureContainerWidth]);

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
  }), [componentId, handleResize]);

  useEffect(() => {
    if (!componentRegistry) return;
    return componentRegistry.register(chartHandle, { cid: props.meta.cid });
  }, [chartHandle, componentRegistry, props.meta.cid]);

  // Marked points (e.g. SPC out-of-control subgroups) render as prominent
  // dots; unmarked points keep the clean `dot={false}` line look.
  const markerDot = markers
    ? (dotProps: {
        cx?: number;
        cy?: number;
        index?: number;
        payload?: Record<string, unknown>;
      }) => {
        const marked = markers.dataKey
          ? Boolean(getIn(dotProps.payload, markers.dataKey))
          : markers.indices?.includes(dotProps.index ?? -1) ?? false;
        if (!marked) {
          return null;
        }
        return (
          <circle
            cx={dotProps.cx}
            cy={dotProps.cy}
            r={4}
            fill={markers.color ?? '#ef4444'}
            stroke="none"
          />
        );
      }
    : undefined;

  // UCL/LCL/CL style horizontal reference lines plus an optional shaded band
  // between two bounds. Cartes-ian chart types only (line/bar/area).
  const referenceOverlay =
    band || referenceLines.length > 0 ? (
      <>
        {band ? (
          <ReferenceArea
            y1={band.upper}
            y2={band.lower}
            fill={band.color ?? 'hsl(var(--chart-2))'}
            fillOpacity={band.opacity ?? 0.08}
          />
        ) : null}
        {referenceLines.map((line, i) => (
          <ReferenceLine
            key={line.label ?? `reference-${i}`}
            y={line.value}
            stroke={line.color ?? 'hsl(var(--chart-5))'}
            strokeOpacity={0.8}
            strokeDasharray={line.dashed ? '4 4' : undefined}
            label={
              line.label
                ? { value: line.label, position: 'insideTopRight', fontSize: 11 }
                : undefined
            }
          />
        ))}
      </>
    ) : null;

  const renderChart = () => {
    if (isHeatmap) {
      return <HeatmapGrid grid={heatmapGrid} accessibleName={chartAccessibleName} />;
    }

    if (resolvedChartType === 'pie') {
      return (
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <ChartLegend content={<ChartLegendContent className={legendClassName} />} />}
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%">
            {pieData.map((item, i) => (
              // H22: key on name+value so same-named Pie cells no longer collide
              // (previously keyed on `item.name` alone).
              <Cell
                key={`pie-cell-${item.name}:${item.value}`}
                fill={palette[i % palette.length]}
              />
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
          <YAxis name={yAxisEntries[0].label} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <ChartLegend content={<ChartLegendContent className={legendClassName} />} />}
          {series.length > 0 ? (
            series.map((s, i) => (
              <Scatter
                key={s.name ?? `series-${i}`}
                name={s.name}
                data={
                  s.dataRegionKey
                    ? cartesianData.map((item: Record<string, unknown>) => ({
                        x: getIn(item, xKey ?? 'name'),
                        y: getIn(item, s.dataRegionKey!),
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
          {yAxisEntries.map((entry, index) => (
            <YAxis
              key={entry.label ?? `axis-${index}`}
              yAxisId={index}
              orientation={entry.position}
              name={entry.label}
            />
          ))}
          {brushEnabled && xKey ? (
            <Brush dataKey={xKey} height={24} stroke="hsl(var(--chart-5))" />
          ) : null}
          {referenceOverlay}
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <ChartLegend content={<ChartLegendContent className={legendClassName} />} />}
          {series.length > 0 ? (
            series.map((s, i) => (
              <Line
                key={s.name ?? `series-${i}`}
                type="monotone"
                dataKey={s.dataRegionKey ?? s.name ?? 'value'}
                name={s.name}
                yAxisId={dualAxisEnabled ? (s.yAxisId ?? 0) : 0}
                stroke={palette[i % palette.length]}
                strokeWidth={2}
                dot={markerDot ?? false}
              />
            ))
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              yAxisId={0}
              stroke={palette[0]}
              strokeWidth={2}
              dot={markerDot ?? false}
            />
          )}
        </LineChart>
      );
    }

    if (resolvedChartType === 'area') {
      return (
        <AreaChart data={cartesianData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          {xKey && <XAxis dataKey={xKey} name={xAxis?.label} />}
          {yAxisEntries.map((entry, index) => (
            <YAxis
              key={entry.label ?? `axis-${index}`}
              yAxisId={index}
              orientation={entry.position}
              name={entry.label}
            />
          ))}
          {brushEnabled && xKey ? (
            <Brush dataKey={xKey} height={24} stroke="hsl(var(--chart-5))" />
          ) : null}
          {referenceOverlay}
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend && <ChartLegend content={<ChartLegendContent className={legendClassName} />} />}
          {series.length > 0 ? (
            series.map((s, i) => (
              <Area
                key={s.name ?? `series-${i}`}
                type="monotone"
                dataKey={s.dataRegionKey ?? s.name ?? 'value'}
                name={s.name}
                yAxisId={dualAxisEnabled ? (s.yAxisId ?? 0) : 0}
                stroke={palette[i % palette.length]}
                fill={palette[i % palette.length]}
                stackId={stacked ? 'a' : undefined}
              />
            ))
          ) : (
            <Area type="monotone" dataKey="value" yAxisId={0} stroke={palette[0]} fill={palette[0]} />
          )}
        </AreaChart>
      );
    }

    return (
      <BarChart data={cartesianData}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        {xKey && <XAxis dataKey={xKey} name={xAxis?.label} />}
        {yAxisEntries.map((entry, index) => (
          <YAxis
            key={entry.label ?? `axis-${index}`}
            yAxisId={index}
            orientation={entry.position}
            name={entry.label}
          />
        ))}
        {brushEnabled && xKey ? (
          <Brush dataKey={xKey} height={24} stroke="hsl(var(--chart-5))" />
        ) : null}
        {referenceOverlay}
        <ChartTooltip content={<ChartTooltipContent />} />
        {showLegend && <ChartLegend content={<ChartLegendContent className={legendClassName} />} />}
        {series.length > 0 ? (
          series.map((s, i) => (
            <Bar
              key={s.name ?? `series-${i}`}
              dataKey={s.dataRegionKey ?? s.name ?? 'value'}
              name={s.name}
              yAxisId={dualAxisEnabled ? (s.yAxisId ?? 0) : 0}
              fill={palette[i % palette.length]}
              stackId={stacked ? 'a' : undefined}
            />
          ))
        ) : (
          <Bar dataKey="value" yAxisId={0} fill={palette[0]} />
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
      data-responsive={isNarrow ? 'narrow' : undefined}
      data-responsive-supported={responsiveSupported ? 'true' : undefined}
    >
      {hasTitleContent ? <div data-slot="chart-title" id={titleId}>{titleContent}</div> : null}
      {isEmpty ? (
        <div data-slot="chart-empty">{emptyContent}</div>
      ) : (
        <div
          data-slot="chart-canvas"
          ref={setChartRef}
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
              {referenceSummary ? <li>{referenceSummary}</li> : null}
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
