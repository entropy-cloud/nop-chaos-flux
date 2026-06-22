import React from 'react';
import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  resolveLucideIconStrict,
  type LucideIconComponent,
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { InstanceFrame, RenderRegionHandle, ScopeRef } from '@nop-chaos/flux-core';
import type { TableColumnPopOverConfig, TableColumnPopOverPlacement } from '../schemas.js';

export interface TableCellPopOverProps {
  popOver: TableColumnPopOverConfig;
  rowValue: unknown;
  record: Record<string, unknown>;
  rowIndex: number;
  rowScope: ScopeRef;
  rowInstancePath: InstanceFrame[];
  contentRegion?: Pick<RenderRegionHandle, 'render' | 'key'>;
  cellContentRef?: React.RefObject<HTMLElement | null>;
  columnIndex: number;
}

interface PlacementParts {
  side: 'top' | 'right' | 'bottom' | 'left';
  align: 'start' | 'center' | 'end';
}

const PLACEMENT_MAP: Record<TableColumnPopOverPlacement, PlacementParts> = {
  top: { side: 'top', align: 'center' },
  'top-start': { side: 'top', align: 'start' },
  'top-end': { side: 'top', align: 'end' },
  right: { side: 'right', align: 'center' },
  'right-start': { side: 'right', align: 'start' },
  'right-end': { side: 'right', align: 'end' },
  bottom: { side: 'bottom', align: 'center' },
  'bottom-start': { side: 'bottom', align: 'start' },
  'bottom-end': { side: 'bottom', align: 'end' },
  left: { side: 'left', align: 'center' },
  'left-start': { side: 'left', align: 'start' },
  'left-end': { side: 'left', align: 'end' },
};

function isEmptyRowValue(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

const DefaultInfoIcon = Info as unknown as LucideIconComponent;

function renderTriggerIcon(iconName: string | undefined): React.ReactNode {
  const ResolvedIcon = iconName ? resolveLucideIconStrict(iconName) : null;
  const IconComp = ResolvedIcon ?? DefaultInfoIcon;
  return <IconComp className="size-3" />;
}

function resolvePlacement(placement: TableColumnPopOverPlacement | undefined): PlacementParts {
  if (placement && PLACEMENT_MAP[placement]) {
    return PLACEMENT_MAP[placement];
  }
  return PLACEMENT_MAP.top;
}

export function TableCellPopOver(props: TableCellPopOverProps) {
  const {
    popOver,
    rowValue,
    record,
    rowIndex,
    rowScope,
    rowInstancePath,
    contentRegion,
    cellContentRef,
    columnIndex,
  } = props;

  const trigger = popOver.trigger ?? 'click';
  const placement = resolvePlacement(popOver.placement);
  const showOnOverflow = popOver.showOnOverflow === true;
  const onEmpty = popOver.onEmpty ?? 'hide';
  const iconName = popOver.icon;

  const [isOpen, setIsOpen] = React.useState(false);
  const [overflowDetected, setOverflowDetected] = React.useState(false);

  const isEmpty = isEmptyRowValue(rowValue);
  const passesEmptyGate = !isEmpty || onEmpty === 'show';

  React.useLayoutEffect(() => {
    if (!showOnOverflow) {
      setOverflowDetected(false);
      return;
    }
    const el = cellContentRef?.current ?? null;
    if (!el) {
      setOverflowDetected(false);
      return;
    }
    const next = el.scrollWidth > el.clientWidth;
    setOverflowDetected((prev) => (prev === next ? prev : next));
  }, [showOnOverflow, cellContentRef, rowValue]);

  const passesOverflowGate = !showOnOverflow || overflowDetected;
  const shouldRender = passesEmptyGate && passesOverflowGate;

  if (!shouldRender) {
    return null;
  }

  const showEmptyFallback = isEmpty && onEmpty === 'show';

  let renderedContent: React.ReactNode = null;
  if (showEmptyFallback) {
    renderedContent = (
      <div data-slot="table-cell-popover-empty" className="text-sm text-muted-foreground">
        {popOver.emptyText ?? t('flux.table.popoverEmpty')}
      </div>
    );
  } else if (contentRegion) {
    try {
      renderedContent = (contentRegion.render({
        scope: rowScope,
        bindings: { record, index: rowIndex },
        instancePath: rowInstancePath,
        pathSuffix: `popOver.${columnIndex}`,
      }) ?? null) as React.ReactNode;
    } catch (err) {
      console.warn(
        '[TableCellPopOver] content region render failed; falling back to String(rowValue)',
        err,
      );
      renderedContent = String(rowValue ?? '');
    }
  } else {
    renderedContent = String(rowValue ?? '');
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        type="button"
        data-slot="table-cell-popover-trigger"
        aria-label={t('flux.table.viewDetails')}
        openOnHover={trigger === 'hover'}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => event.stopPropagation()}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-primary"
      >
        {renderTriggerIcon(iconName)}
      </PopoverTrigger>
      <PopoverContent
        data-slot="table-cell-popover-content"
        side={placement.side}
        align={placement.align}
      >
        {popOver.title ? (
          <div data-slot="table-cell-popover-title" className="text-sm font-medium">
            {popOver.title}
          </div>
        ) : null}
        {renderedContent}
      </PopoverContent>
    </Popover>
  );
}
