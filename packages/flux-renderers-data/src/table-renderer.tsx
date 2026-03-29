import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@nop-chaos/ui';
import type { TableColumnSchema, TableSchema } from './schemas';

export function TableRenderer(props: RendererComponentProps<TableSchema>) {
  const columns = Array.isArray(props.props.columns) ? (props.props.columns as TableColumnSchema[]) : [];
  const source = Array.isArray(props.props.source) ? (props.props.source as Array<Record<string, any>>) : [];
  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: 'No data' });
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const columnCount = Math.max(columns.length, 1);

  return (
    <div className="nop-table-wrap grid gap-4" data-testid={props.meta.testid || undefined}>
      {hasRendererSlotContent(headerContent) ? <div className="nop-table__header">{headerContent}</div> : null}
      <Table className="nop-table">
        <TableHeader className="nop-table__header">
          <TableRow>
            {columns.map((column, index) => {
              const labelRegion = typeof column.labelRegionKey === 'string' ? props.regions[column.labelRegionKey] : undefined;
              const labelContent = labelRegion?.render({ pathSuffix: `columns.${index}.label` }) ?? column.label ?? column.name;

              return <TableHead key={`${column.name ?? column.label ?? 'column'}-${index}`}>{labelContent}</TableHead>;
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {source.length === 0
            ? (
                <TableRow className="nop-table__empty-row">
                  <TableCell colSpan={columnCount} className="nop-table__empty-cell">{emptyContent}</TableCell>
                </TableRow>
              )
            : source.map((record, index) => {
                const rowScope = props.helpers.createScope({ record, index }, {
                  scopeKey: `row:${record.id ?? index}`,
                  pathSuffix: `rows.${index}`,
                  source: 'row'
                });

                return (
                  <TableRow
                    key={String(record.id ?? index)}
                    className={props.events.onRowClick ? 'nop-table__row nop-table__row--interactive' : 'nop-table__row'}
                    onClick={props.events.onRowClick ? (event) => void props.events.onRowClick?.(event, { scope: rowScope }) : undefined}
                  >
                    {columns.map((column, columnIndex) => {
                      const cellRegion = typeof column.cellRegionKey === 'string' ? props.regions[column.cellRegionKey] : undefined;
                      const buttonRegion = typeof column.buttonsRegionKey === 'string' ? props.regions[column.buttonsRegionKey] : undefined;

                      if (column.type === 'operation' && (buttonRegion || Array.isArray(column.buttons))) {
                        return (
                          <TableCell key={`op-${columnIndex}`}>
                            <div className="nop-table__actions flex flex-wrap gap-3" onClick={(event) => event.stopPropagation()}>
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
                          </TableCell>
                        );
                      }

                      if (cellRegion) {
                        return (
                          <TableCell key={`${column.name ?? columnIndex}`}>
                            {cellRegion.render({
                              scope: rowScope,
                              pathSuffix: `cells.${columnIndex}`
                            })}
                          </TableCell>
                        );
                      }

                      return <TableCell key={`${column.name ?? columnIndex}`}>{column.name ? String(record[column.name] ?? '') : ''}</TableCell>;
                    })}
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
      {hasRendererSlotContent(footerContent) ? <div className="nop-table__footer">{footerContent}</div> : null}
    </div>
  );
}
