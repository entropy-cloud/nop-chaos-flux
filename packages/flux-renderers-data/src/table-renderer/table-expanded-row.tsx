import type { InstanceFrame, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { TableCell, TableRow } from '@nop-chaos/ui';
import type { TableSchema, TableColumnSchema } from '../schemas.js';
import { asReactNode } from './table-cell-chrome.js';
import type { FlattenedExpandedRow } from './table-flattened-items.js';

export function renderExpandedRow(
  item: FlattenedExpandedRow,
  schemaProps: TableSchema,
  helpers: RendererComponentProps<TableSchema>['helpers'],
  parentProps: RendererComponentProps<TableSchema>,
  rowScopeCache: Map<string, ScopeRef>,
  rowRepeatedTemplateId: string,
  responsiveHiddenColumns: TableColumnSchema[],
) {
  const regionKey = schemaProps.expandable?.expandedRowRegionKey;
  const hasResponsiveHiddenColumns = responsiveHiddenColumns.length > 0;
  if (!regionKey && !hasResponsiveHiddenColumns) return null;

  const rowScope = rowScopeCache.get(item.rowKey);
  if (!rowScope) return null;

  const rowInstancePath: InstanceFrame[] = [
    ...(parentProps.node.instancePath ?? []),
    { repeatedTemplateId: rowRepeatedTemplateId, instanceKey: item.rowKey },
  ];

  return (
    <TableRow data-slot="table-expanded-row">
      <TableCell colSpan={item.columnCount} data-slot="table-expanded-cell">
        {hasResponsiveHiddenColumns ? (
          <div
            className="nop-safe-bottom grid gap-2 p-2 sm:grid-cols-2 sm:p-1"
            data-slot="table-responsive-expanded"
          >
            {responsiveHiddenColumns.map((column, index) => {
              const cellRegion =
                typeof column.cellRegionKey === 'string'
                  ? parentProps.regions[column.cellRegionKey]
                  : undefined;
              const labelRegion =
                typeof column.labelRegionKey === 'string'
                  ? parentProps.regions[column.labelRegionKey]
                  : undefined;
              const label =
                asReactNode(labelRegion?.render()) ??
                (typeof column.label === 'string' ? column.label : (column.name ?? `Column ${index + 1}`));
              const columnKey = column.name ?? `${label}-${column.type ?? 'value'}`;
              return (
                <div
                  key={columnKey}
                  className="nop-hairline nop-hairline--bottom rounded-md border bg-muted/20 px-3 py-3 sm:py-2"
                  data-slot="table-responsive-expanded-item"
                >
                  <div
                    className="text-xs font-medium text-muted-foreground"
                    data-slot="table-responsive-expanded-label"
                  >
                    {label}
                  </div>
                  <div className="mt-1 text-sm" data-slot="table-responsive-expanded-value">
                    {cellRegion
                      ? asReactNode(
                          cellRegion.render({
                            scope: rowScope,
                            bindings: {
                              record: rowScope.get('record'),
                              index: rowScope.get('index'),
                            },
                            instancePath: rowInstancePath,
                            pathSuffix: `responsive.${index}`,
                          }),
                        )
                      : column.name
                        ? String(
                            getIn(
                              rowScope.get('record') as Record<string, unknown> | undefined,
                              column.name,
                            ) ?? '',
                          )
                        : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {regionKey && parentProps.regions[regionKey]
          ? asReactNode(
              parentProps.regions[regionKey].render({
                scope: rowScope,
                bindings: {
                  record: rowScope.get('record'),
                  index: rowScope.get('index'),
                },
                instancePath: rowInstancePath,
                pathSuffix: `expanded.${item.rowKey}`,
              }),
            )
          : null}
      </TableCell>
    </TableRow>
  );
}
