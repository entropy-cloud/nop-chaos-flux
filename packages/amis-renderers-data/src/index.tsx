import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry
} from '@nop-chaos/amis-schema';
import { registerRendererDefinitions } from '@nop-chaos/amis-runtime';

interface TableColumnSchema extends BaseSchema {
  label?: string;
  name?: string;
  buttons?: BaseSchema[];
}

interface TableSchema extends BaseSchema {
  type: 'table';
  columns?: TableColumnSchema[];
}

function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const columns = Array.isArray(props.props.columns) ? (props.props.columns as TableColumnSchema[]) : [];
  const source = Array.isArray(props.props.source) ? (props.props.source as Array<Record<string, any>>) : [];

  return (
    <div className="na-table-wrap">
      <table className="na-table">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={`${column.name ?? column.label ?? 'column'}-${index}`}>{column.label ?? column.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {source.map((record, index) => {
            const rowScope = props.helpers.createScope({ record, index }, {
              scopeKey: `row:${record.id ?? index}`,
              pathSuffix: `rows.${index}`,
              source: 'row'
            });

            return (
              <tr key={String(record.id ?? index)}>
                {columns.map((column, columnIndex) => {
                  if (column.type === 'operation' && Array.isArray(column.buttons)) {
                    return (
                      <td key={`op-${columnIndex}`}>
                        <div className="na-table__actions">
                          {column.buttons.map((button, buttonIndex) => (
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

                  return <td key={`${column.name ?? columnIndex}`}>{column.name ? String(record[column.name] ?? '') : ''}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const dataRendererDefinitions: RendererDefinition[] = [
  {
    type: 'table',
    component: TableRenderer
  }
];

export function registerDataRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, dataRendererDefinitions);
}
