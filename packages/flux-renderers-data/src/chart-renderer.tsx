import React, { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import * as echarts from 'echarts/core';
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import type { ChartSchema, ChartSeriesSchema } from './chart-schemas';

const EMPTY_CHART_SOURCE: Array<Record<string, unknown>> = [];
const EMPTY_CHART_SERIES: ChartSeriesSchema[] = [];

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer
]);

export function ChartRenderer(props: RendererComponentProps<ChartSchema>) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const chartType = props.props.chartType ?? 'bar';
  const title = props.props.title;
  const source = Array.isArray(props.props.source) ? props.props.source : EMPTY_CHART_SOURCE;
  const series: ChartSeriesSchema[] = Array.isArray(props.props.series) ? props.props.series : EMPTY_CHART_SERIES;
  const xAxis = props.props.xAxis as { dataKey?: string; label?: string } | undefined;
  const yAxis = props.props.yAxis as { label?: string } | undefined;
  const height = props.props.height ?? 400;
  const loading = props.props.loading ?? false;
  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: 'No data' });

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const xAxisData = xAxis?.dataKey && source.length > 0
      ? source.map((item) => String(item[xAxis.dataKey as string] ?? ''))
      : [];

    const seriesData = series.length > 0
      ? series.map((s) => {
          const data = s.dataRegionKey && source.length > 0
            ? source.map((item) => item[s.dataRegionKey!])
            : s.data ?? [];

          return {
            name: s.name,
            type: s.type ?? chartType,
            data
          };
        })
      : [{ type: chartType, data: [] }];

    const option: echarts.EChartsCoreOption = {
      title: title ? { text: title } : undefined,
      tooltip: { trigger: 'axis' },
      legend: series.length > 1 ? { data: series.map((s) => s.name).filter(Boolean) as string[] } : undefined,
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: xAxisData.length > 0 ? { type: 'category', data: xAxisData, name: xAxis?.label } : undefined,
      yAxis: yAxis ? { type: 'value', name: yAxis.label } : undefined,
      series: seriesData
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartType, title, source, series, xAxis, yAxis]);

  useEffect(() => {
    if (chartInstance.current) {
      if (loading) {
        chartInstance.current.showLoading();
      } else {
        chartInstance.current.hideLoading();
      }
    }
  }, [loading]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  const isEmpty = source.length === 0 && series.every((s) => !s.data || s.data.length === 0);

  const chartHeight = typeof height === 'number' ? `${height}px` : (height || '400px');

  return (
    <div
      className="nop-chart"
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
          onClick={(event) => void props.events.onClick?.(event, {})}
          onMouseEnter={(event) => void props.events.onHover?.(event, {})}
        />
      )}
    </div>
  );
}
