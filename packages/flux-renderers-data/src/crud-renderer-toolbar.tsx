import { t } from '@nop-chaos/flux-i18n';
import { Label, NativeSelect, NativeSelectOption, PaginationPrevious, PaginationNext } from '@nop-chaos/ui';
import type { CrudStatusSummary } from './crud-schema.js';
import { isRecord } from '@nop-chaos/flux-core';
import { DEFAULT_PAGE_SIZE_OPTIONS, type CrudPaginationState } from './crud-renderer-state.js';
import type { CrudSchema } from './crud-schema.js';

export interface ToolbarBlockDefinition {
  type: string;
  align?: 'left' | 'right';
}

export function normalizeToolbarBlocks(
  layout: CrudSchema['toolbarLayout'],
  slot: 'header' | 'footer',
): ToolbarBlockDefinition[] {
  const value = slot === 'header' ? layout?.header : layout?.footer;
  if (!Array.isArray(value)) {
    return [];
  }

  const blocks: ToolbarBlockDefinition[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      if (item === 'bulkActions') {
        continue;
      }
      blocks.push({ type: item });
      continue;
    }

    if (isRecord(item) && typeof item.type === 'string') {
      if (item.type === 'bulkActions') {
        continue;
      }
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
  const {
    blocks,
    slot,
    summary,
    hasListActions,
    listActionsContent,
    pagination,
    onPageChange,
    onPageSizeChange,
  } = props;

  if (blocks.length === 0) {
    return null;
  }

  const leftBlocks = blocks.filter((block) => block.align !== 'right');
  const rightBlocks = blocks.filter((block) => block.align === 'right');
  const pageSizeSelectId = `${slot}-toolbar-page-size-select`;

  function renderBlock(block: ToolbarBlockDefinition, index: number) {
    switch (block.type) {
      case 'listActions':
        return hasListActions ? (
          <div key={`${slot}-list-actions-${index}`} data-slot={`${slot}-toolbar-list-actions`}>
            {listActionsContent}
          </div>
        ) : null;
      case 'statistics':
        return (
          <div
            key={`${slot}-statistics-${index}`}
            data-slot={`${slot}-toolbar-statistics`}
            className="text-sm text-muted-foreground"
          >
            {t('flux.pagination.total', { count: summary.total ?? summary.itemCount ?? 0 })}
          </div>
        );
      case 'switch-per-page':
        return (
          <div
            key={`${slot}-switch-per-page-${index}`}
            data-slot={`${slot}-toolbar-page-size`}
            className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap"
          >
            <Label htmlFor={pageSizeSelectId}>{t('flux.pagination.rowsPerPage')}</Label>
            <NativeSelect
              id={pageSizeSelectId}
              size="sm"
              className="min-w-16"
              value={String(pagination.pageSize)}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {DEFAULT_PAGE_SIZE_OPTIONS.map((value) => (
                <NativeSelectOption key={value} value={String(value)}>
                  {value}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        );
      case 'pagination':
        return (
          <div
            key={`${slot}-pagination-${index}`}
            data-slot={`${slot}-toolbar-pagination`}
            className="flex items-center gap-2"
          >
            <PaginationPrevious
              text={t('flux.pagination.previous')}
              aria-label={t('flux.pagination.previous')}
              onClick={() => onPageChange(Math.max(1, pagination.currentPage - 1))}
              className={pagination.currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
            />
            <span className="text-sm text-muted-foreground">
              {t('flux.pagination.page', {
                current: pagination.currentPage,
                total: summary.total != null ? Math.ceil(summary.total / pagination.pageSize) : '?',
              })}
            </span>
            <PaginationNext
              text={t('flux.pagination.next')}
              aria-label={t('flux.pagination.next')}
              onClick={() => onPageChange(pagination.currentPage + 1)}
              className={
                summary.total != null && pagination.currentPage >= Math.ceil(summary.total / pagination.pageSize)
                  ? 'pointer-events-none opacity-50'
                  : undefined
              }
              aria-disabled={
                summary.total != null && pagination.currentPage >= Math.ceil(summary.total / pagination.pageSize)
                  ? true
                  : undefined
              }
            />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      data-slot={`${slot}-toolbar-layout`}
    >
      <div className="flex flex-wrap items-center gap-3">{leftBlocks.map(renderBlock)}</div>
      <div className="flex flex-wrap items-center gap-3">{rightBlocks.map(renderBlock)}</div>
    </div>
  );
}
