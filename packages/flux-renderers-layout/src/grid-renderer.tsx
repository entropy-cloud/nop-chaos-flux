import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { GridItemSchema, GridSchema } from './schemas.js';

type CompiledGridItem = GridItemSchema & {
  bodyRegionKey?: string;
};

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

function resolveItemKey(item: CompiledGridItem, index: number): string {
  if (item.key !== undefined && item.key !== null && item.key !== '') {
    return String(item.key);
  }
  return String(index);
}

function resolveColumnCount(columns: unknown): number | undefined {
  if (typeof columns === 'number' && columns > 0) {
    return Math.floor(columns);
  }
  return undefined;
}

function clampSpan(span: unknown, max: number | undefined): number {
  const n = typeof span === 'number' ? Math.floor(span) : 1;
  const lower = Math.max(1, n);
  if (max !== undefined && max > 0) {
    return Math.min(lower, max);
  }
  return lower;
}

function buildGridStyle(schemaProps: GridSchema): React.CSSProperties {
  const style: React.CSSProperties = { display: 'grid' };
  const columnCount = resolveColumnCount(schemaProps.columns);

  if (columnCount !== undefined) {
    style.gridTemplateColumns = `repeat(${columnCount}, minmax(0, 1fr))`;
  } else if (typeof schemaProps.columns === 'string' && schemaProps.columns.length > 0) {
    style.gridTemplateColumns = schemaProps.columns;
  }

  if (schemaProps.gap !== undefined && schemaProps.gap !== null) {
    style.gap = typeof schemaProps.gap === 'number' ? `${schemaProps.gap}px` : schemaProps.gap;
  }

  if (schemaProps.autoFlow) {
    style.gridAutoFlow = schemaProps.autoFlow;
  }
  if (schemaProps.alignItems) {
    style.alignItems = schemaProps.alignItems;
  }
  if (schemaProps.justifyItems) {
    style.justifyItems = schemaProps.justifyItems;
  }

  return style;
}

export function GridRenderer(props: RendererComponentProps<GridSchema>) {
  const schemaProps = props.props;
  const rawItems = Array.isArray(schemaProps.items)
    ? (schemaProps.items as unknown as CompiledGridItem[])
    : [];

  const gridStyle = buildGridStyle(schemaProps as GridSchema);
  const columnCount = resolveColumnCount(schemaProps.columns);

  return (
    <div
      className={cn('nop-grid', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="grid-root"
      data-columns={columnCount ?? undefined}
      style={gridStyle}
    >
      {rawItems.length === 0
        ? null
        : rawItems.map((item, index) => {
            const key = resolveItemKey(item, index);
            const bodyRegion =
              typeof item.bodyRegionKey === 'string' ? props.regions[item.bodyRegionKey] : undefined;
            const content = bodyRegion ? asReactNode(bodyRegion.render()) : null;

            const colSpan = clampSpan(item.colSpan, columnCount);
            const rowSpan = clampSpan(item.rowSpan, undefined);
            const itemStyle: React.CSSProperties = {};
            if (colSpan > 1) {
              itemStyle.gridColumn = `span ${colSpan}`;
            }
            if (rowSpan > 1) {
              itemStyle.gridRow = `span ${rowSpan}`;
            }

            return (
              <div
                key={key}
                data-slot="grid-item"
                data-item-index={index}
                data-item-key={key}
                data-col-span={colSpan > 1 ? colSpan : undefined}
                data-row-span={rowSpan > 1 ? rowSpan : undefined}
                style={itemStyle}
              >
                {content}
              </div>
            );
          })}
    </div>
  );
}
