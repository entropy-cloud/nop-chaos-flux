import { useMemo, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Label,
  cn,
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { TableColumnSchema } from '../schemas.js';

export interface TableColumnSettingsEntry {
  key: string;
  column: TableColumnSchema;
  orderedIndex: number;
  label: string;
  visible: boolean;
}

export interface TableColumnSettingsProps {
  enabled: boolean;
  overlay: boolean;
  align: 'left' | 'right';
  columns: TableColumnSchema[];
  orderedColumns: string[];
  visibleColumnKeys: ReadonlySet<string>;
  rendererId: string | number;
  onToggle: (key: string, checked: boolean) => void;
  onMove: (key: string, direction: 'up' | 'down') => void;
  /** 测试/调试锚点，透传 renderer props.id。 */
  debugId?: string;
}

/**
 * 表格列设置 UI（overlay 下拉 / inline 面板两种形态）。
 * 自 table-renderer.tsx 拆出（<700 行门禁），仅搬运 UI 与派生逻辑，不改行为。
 */
export function TableColumnSettings(props: TableColumnSettingsProps) {
  const [inlineOpen, setInlineOpen] = useState(false);

  const columnSettingsColumnsByKey = useMemo(
    () => new Map(props.columns.map((column, index) => [column.name ?? `column-${index}`, column] as const)),
    [props.columns],
  );
  const orderedColumnKeyToIndex = useMemo(
    () => new Map(props.orderedColumns.map((key, index) => [key, index] as const)),
    [props.orderedColumns],
  );
  const columnSettingsItems = useMemo(
    () =>
      props.orderedColumns.flatMap((key) => {
        const orderedIndex = orderedColumnKeyToIndex.get(key);
        const column = columnSettingsColumnsByKey.get(key);

        if (!column || orderedIndex == null) {
          return [];
        }

        return [
          {
            key,
            column,
            orderedIndex,
            label: typeof column.label === 'string' ? column.label : (column.name ?? key),
            visible: props.visibleColumnKeys.has(key),
          } satisfies TableColumnSettingsEntry,
        ];
      }),
    [columnSettingsColumnsByKey, orderedColumnKeyToIndex, props.orderedColumns, props.visibleColumnKeys],
  );

  if (!props.enabled) {
    return null;
  }

  const renderItem = ({ key, label, orderedIndex, visible }: TableColumnSettingsEntry) => {
    if (props.overlay) {
      return (
        <div key={key} data-slot="table-column-settings-item">
          <DropdownMenuCheckboxItem
            checked={visible}
            onCheckedChange={(checked) => props.onToggle(key, checked)}
          >
            {label}
          </DropdownMenuCheckboxItem>
          <div
            className="flex gap-1 px-1.5 pb-1"
            data-slot="table-column-settings-actions"
          >
            <DropdownMenuItem
              aria-label={`${t('flux.table.moveUp')} ${label}`}
              disabled={orderedIndex === 0}
              onClick={() => props.onMove(key, 'up')}
            >
              {t('flux.table.moveUp')}
            </DropdownMenuItem>
            <DropdownMenuItem
              aria-label={`${t('flux.table.moveDown')} ${label}`}
              disabled={orderedIndex === props.orderedColumns.length - 1}
              onClick={() => props.onMove(key, 'down')}
            >
              {t('flux.table.moveDown')}
            </DropdownMenuItem>
          </div>
          {orderedIndex < props.orderedColumns.length - 1 ? <DropdownMenuSeparator /> : null}
        </div>
      );
    }

    const checkboxId = `table-column-settings-${props.rendererId}-${key}`;

    return (
      <div
        key={key}
        className="flex items-center justify-between gap-3 px-2 py-1.5"
        data-slot="table-column-settings-item"
      >
        <div className="flex items-center gap-2">
          <Checkbox
            id={checkboxId}
            checked={visible}
            onCheckedChange={(checked) => props.onToggle(key, Boolean(checked))}
          />
          <Label htmlFor={checkboxId}>{label}</Label>
        </div>
        <div className="flex gap-1" data-slot="table-column-settings-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`${t('flux.table.moveUp')} ${label}`}
            disabled={orderedIndex === 0}
            onClick={() => props.onMove(key, 'up')}
          >
            {t('flux.table.moveUp')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`${t('flux.table.moveDown')} ${label}`}
            disabled={orderedIndex === props.orderedColumns.length - 1}
            onClick={() => props.onMove(key, 'down')}
          >
            {t('flux.table.moveDown')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn('mb-2 flex flex-col', props.align === 'left' ? 'items-start' : 'items-end')}
      data-slot="table-column-settings"
    >
      {props.overlay ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {t('flux.table.columns')}
              </Button>
            }
          />
          <DropdownMenuContent>{columnSettingsItems.map(renderItem)}</DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInlineOpen((value) => !value)}
          >
            {t('flux.table.columns')}
          </Button>
          {inlineOpen ? (
            <div
              className="mt-2 w-full max-w-sm rounded-md border bg-popover p-2 shadow-sm"
              data-slot="table-column-settings-inline"
            >
              {columnSettingsItems.map(renderItem)}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export type { RendererComponentProps };
