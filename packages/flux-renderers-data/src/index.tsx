import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry
} from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';

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

function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const columns = Array.isArray(props.props.columns) ? (props.props.columns as TableColumnSchema[]) : [];
  const source = Array.isArray(props.props.source) ? (props.props.source as Array<Record<string, any>>) : [];
  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: 'No data' });
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const columnCount = Math.max(columns.length, 1);

  return (
    <div className="na-table-wrap">
      {hasRendererSlotContent(headerContent) ? <div className="na-table__header">{headerContent}</div> : null}
      <table className="na-table">
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
                <tr className="na-table__empty-row">
                  <td colSpan={columnCount} className="na-table__empty-cell">{emptyContent}</td>
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
                    className={props.events.onRowClick ? 'na-table__row na-table__row--interactive' : 'na-table__row'}
                    onClick={props.events.onRowClick ? (event) => void props.events.onRowClick?.(event, { scope: rowScope }) : undefined}
                  >
                    {columns.map((column, columnIndex) => {
                      const cellRegion = typeof column.cellRegionKey === 'string' ? props.regions[column.cellRegionKey] : undefined;
                      const buttonRegion = typeof column.buttonsRegionKey === 'string' ? props.regions[column.buttonsRegionKey] : undefined;

                      if (column.type === 'operation' && (buttonRegion || Array.isArray(column.buttons))) {
                        return (
                          <td key={`op-${columnIndex}`}>
                            <div className="na-table__actions" onClick={(event) => event.stopPropagation()}>
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
      {hasRendererSlotContent(footerContent) ? <div className="na-table__footer">{footerContent}</div> : null}
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
  }
];

export function registerDataRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, dataRendererDefinitions);
}
