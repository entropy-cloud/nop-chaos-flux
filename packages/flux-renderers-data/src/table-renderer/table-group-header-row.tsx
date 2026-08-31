import { Button, TableCell, TableRow } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';

export interface TableGroupHeaderRowProps {
  groupKey: string;
  label: string;
  count: number;
  aggregateText?: string;
  collapsed: boolean;
  columnCount: number;
  onToggle: (groupKey: string) => void;
}

export function TableGroupHeaderRow(props: TableGroupHeaderRowProps) {
  const { groupKey, label, count, aggregateText, collapsed, columnCount, onToggle } = props;

  return (
    <TableRow
      data-slot="table-group-header"
      data-group-key={groupKey}
      data-collapsed={collapsed || undefined}
    >
      <TableCell colSpan={columnCount} data-slot="table-group-header-cell">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            data-slot="table-group-toggle"
            aria-label={collapsed ? t('flux.table.expand') : t('flux.table.collapse')}
            aria-expanded={!collapsed}
            onClick={() => onToggle(groupKey)}
          >
            {collapsed ? (
              <ChevronRightIcon className="size-3" />
            ) : (
              <ChevronDownIcon className="size-3" />
            )}
          </Button>
          <span data-slot="table-group-label">{label}</span>
          <span data-slot="table-group-count">({count})</span>
          {aggregateText ? <span data-slot="table-group-aggregate">{aggregateText}</span> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
