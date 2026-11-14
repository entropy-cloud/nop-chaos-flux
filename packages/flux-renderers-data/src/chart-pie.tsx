import { getIn } from '@nop-chaos/flux-core';
import { Cell, Pie, PieChart } from 'recharts';
import { ChartTooltip, ChartTooltipContent } from '@nop-chaos/ui/chart';
import { cn } from '@nop-chaos/ui';
import type { ChartSeriesSchema } from './chart-schemas.js';

/**
 * ux-r12 cp3：pie 图例逐切片渲染（name + 调色板色点）。共享 ChartLegendContent
 * 按 ChartConfig（系列级，key=dataRegionKey）查标签，pie 场景会把每个切片都
 * 标成系列名（如 4 个切片全显「订单数」）——切片名在数据行里，须单独渲染。
 */
function PieSliceLegend({
  items,
  palette,
  className,
}: {
  items: Array<{ name: string | number; value: number }>;
  palette: string[];
  className?: string | undefined;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-1', className)}>
      {items.map((item, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key -- 图例纯展示不重排，name+value 可重复（H22 家族），index 是唯一稳定区分位
          key={`pie-legend-${i}-${item.name}:${item.value}`}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <div
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: palette[i % palette.length] }}
          />
          <span>{item.name}</span>
          <span className="font-medium text-foreground">
            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function buildPieData(
  source: Array<Record<string, unknown>>,
  series: ChartSeriesSchema[],
  xKey: string | undefined,
  palette: string[],
): Array<{ name: string; value: number; fill: string }> {
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
}

export function PieChartView({
  pieData,
  palette,
  showLegend,
  legendClassName,
}: {
  pieData: Array<{ name: string; value: number; fill: string }>;
  palette: string[];
  showLegend: boolean;
  legendClassName?: string | undefined;
}) {
  return (
    <PieChart>
      <ChartTooltip content={<ChartTooltipContent />} />
      {showLegend && <PieSliceLegend items={pieData} palette={palette} className={legendClassName} />}
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy={showLegend ? '45%' : '50%'}
        outerRadius={showLegend ? '65%' : '80%'}
        isAnimationActive={false}
      >
        {pieData.map((item, i) => (
          // H22: key on name+value so same-named Pie cells no longer collide
          // (previously keyed on `item.name` alone); the index joins the key
          // because H22's scheme still collides when both name AND value are
          // duplicated across rows. Cells are display-only and never reorder.
          <Cell
            // eslint-disable-next-line react/no-array-index-key -- 纯展示不重排，index 是重复 name+value 行的唯一稳定区分位（H22 家族）
            key={`pie-cell-${i}-${item.name}:${item.value}`}
            fill={palette[i % palette.length]}
          />
        ))}
      </Pie>
    </PieChart>
  );
}
