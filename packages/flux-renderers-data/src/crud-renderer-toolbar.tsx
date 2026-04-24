import { t } from '@nop-chaos/flux-i18n';
import { Button, NativeSelect, NativeSelectOption } from '@nop-chaos/ui';
import type { CrudStatusSummary } from './crud-schema';
import { DEFAULT_PAGE_SIZE_OPTIONS, type CrudPaginationState, isRecord } from './crud-renderer-state';
import type { CrudSchema } from './crud-schema';

export interface ToolbarBlockDefinition {
  type: string;
  align?: 'left' | 'right';
}

export function normalizeToolbarBlocks(
  layout: CrudSchema['toolbarLayout'],
  slot: 'header' | 'footer'
): ToolbarBlockDefinition[] {
  const value = slot === 'header' ? layout?.header : layout?.footer;
  if (!Array.isArray(value)) {
    return [];
  }

  const blocks: ToolbarBlockDefinition[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      blocks.push({ type: item });
      continue;
    }

    if (isRecord(item) && typeof item.type === 'string') {
      blocks.push({ type: item.type, align: item.align === 'right' ? 'right' : 'left' });
    }

  }

  return blocks;
}

export function CrudToolbarBlocks(props: {
  slot: 'header' | 'footer';
  blocks: ToolbarBlockDefinition[];
  summary: CrudStatusSummary;
  listActionsContent: React.ReactNode;
  hasListActions: boolean;
  pagination: CrudPaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { blocks, slot, summary, hasListActions, listActionsContent, pagination, onPageChange, onPageSizeChange } = props;

  if (blocks.length === 0) {
    return null;
  }

  const leftBlocks = blocks.filter((block) => block.align !== 'right');
  const rightBlocks = blocks.filter((block) => block.align === 'right');

  function renderBlock(block: ToolbarBlockDefinition, index: number) {
    switch (block.type) {
      case 'bulkActions':
      case 'listActions':
        return hasListActions ? <div key={`${slot}-list-actions-${index}`} data-slot={`${slot}-toolbar-list-actions`}>{listActionsContent}</div> : null;
      case 'statistics':
        return <div key={`${slot}-statistics-${index}`} data-slot={`${slot}-toolbar-statistics`} className="text-sm text-muted-foreground">{`Total ${summary.total ?? summary.itemCount}`}</div>;
      case 'switch-per-page':
        return (
          <label key={`${slot}-switch-per-page-${index}`} data-slot={`${slot}-toolbar-page-size`} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('flux.pagination.rowsPerPage')}</span>
            <NativeSelect size="sm" value={String(pagination.pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              {DEFAULT_PAGE_SIZE_OPTIONS.map((value) => (
                <NativeSelectOption key={value} value={String(value)}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        );
      case 'pagination':
        return (
          <div key={`${slot}-pagination-${index}`} data-slot={`${slot}-toolbar-pagination`} className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagination.currentPage <= 1} onClick={() => onPageChange(Math.max(1, pagination.currentPage - 1))}>
              {t('flux.common.collapse')}
            </Button>
            <span className="text-sm text-muted-foreground">{`Page ${pagination.currentPage}`}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(pagination.currentPage + 1)}>
              {t('flux.common.expand')}
            </Button>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3" data-slot={`${slot}-toolbar-layout`}>
      <div className="flex flex-wrap items-center gap-3">{leftBlocks.map(renderBlock)}</div>
      <div className="flex flex-wrap items-center gap-3">{rightBlocks.map(renderBlock)}</div>
    </div>
  );
}
