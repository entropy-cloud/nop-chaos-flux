import React from 'react';
import type { InstanceFrame, RenderRegionHandle, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { Button } from '@nop-chaos/ui';
import { CopyIcon, CheckIcon } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';
import type { TableSchema, TableColumnSchema } from '../schemas.js';
import { TableCellPopOver } from './table-cell-popover.js';
import { copyToClipboard } from './copy-to-clipboard.js';

export function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

export function indentStyle(level: number): React.CSSProperties {
  if (level <= 0) return {};
  return { paddingLeft: `${level * 1.25}rem` };
}

export interface CellContentWithPopOverProps {
  column: TableColumnSchema;
  record: Record<string, unknown>;
  rowIndex: number;
  rowScope: ScopeRef;
  rowInstancePath: InstanceFrame[];
  columnIndex: number;
  regions: RendererComponentProps<TableSchema>['regions'];
}

export function CellContentWithPopOver(props: CellContentWithPopOverProps) {
  const { column, record, rowIndex, rowScope, rowInstancePath, columnIndex, regions } = props;
  const cellContentRef = React.useRef<HTMLElement | null>(null);
  const popOverConfig = column.popOver;
  const hasPopOver = Boolean(popOverConfig);

  const cellText = column.name ? String(getIn(record, column.name) ?? '') : '';

  let popOverContentRegion: Pick<RenderRegionHandle, 'render' | 'key'> | undefined;
  if (
    popOverConfig &&
    typeof popOverConfig.contentRegionKey === 'string' &&
    regions[popOverConfig.contentRegionKey]
  ) {
    popOverContentRegion = regions[popOverConfig.contentRegionKey];
  }

  return (
    <span className="inline-flex items-center">
      <span ref={hasPopOver ? cellContentRef : undefined} className="truncate">
        {cellText}
      </span>
      {column.copyable === true && column.name ? (
        <CopyButton value={String(getIn(record, column.name) ?? '')} />
      ) : null}
      {hasPopOver && popOverConfig ? (
        <TableCellPopOver
          popOver={popOverConfig}
          rowValue={column.name ? getIn(record, column.name) : undefined}
          record={record}
          rowIndex={rowIndex}
          rowScope={rowScope}
          rowInstancePath={rowInstancePath}
          contentRegion={popOverContentRegion}
          cellContentRef={cellContentRef}
          columnIndex={columnIndex}
        />
      ) : null}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const onClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const result = await copyToClipboard(value);
    if (result.success) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      data-slot="table-cell-copy-button"
      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-primary"
      onClick={onClick}
      aria-label={copied ? t('flux.table.copied') : t('flux.table.copy')}
    >
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
    </Button>
  );
}
