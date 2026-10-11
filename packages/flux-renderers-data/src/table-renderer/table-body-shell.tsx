import type { ReactNode } from 'react';
import { RadioGroup, TableBody } from '@nop-chaos/ui';
import type { TableSchema } from '../schemas.js';
import { formatGroupAggregateText } from './table-grouping.js';
import { TableGroupHeaderRow } from './table-group-header-row.js';
import type { FlattenedGroupRow } from './table-flattened-items.js';

/* WA-data-002: group-header and radio/table-body shells shared by the static
 * body (table-body-rows) and the virtual body (table-virtual-body). Both
 * branches must stay in lockstep — the virtual side previously carried an
 * "exactly like the non-virtual branch" comment instead of sharing. */

export function renderGroupHeaderRow(
  item: FlattenedGroupRow,
  key: React.Key,
  columnCount: number,
  onToggleGroupCollapse: ((groupKey: string) => void) | undefined,
): ReactNode {
  const { group, collapsed } = item.item;
  return (
    <TableGroupHeaderRow
      key={key}
      groupKey={group.key}
      label={group.label}
      count={group.count}
      aggregateText={formatGroupAggregateText(group.aggregates)}
      collapsed={collapsed}
      columnCount={columnCount}
      onToggle={onToggleGroupCollapse ?? (() => undefined)}
    />
  );
}

export function withRadioGroupBody(
  schemaProps: TableSchema,
  radioSelectionValue: string | undefined,
  onSelectRow: (rowKey: string, checked: boolean) => void,
  content: ReactNode,
): ReactNode {
  if (schemaProps.rowSelection?.type === 'radio') {
    return (
      <RadioGroup
        render={<TableBody />}
        className={undefined}
        value={radioSelectionValue ?? ''}
        onValueChange={(value) => onSelectRow(String(value), true)}
      >
        {content}
      </RadioGroup>
    );
  }
  return <TableBody>{content}</TableBody>;
}
