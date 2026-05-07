import { startTransition, useCallback, useState } from 'react';
import { getIn, shallowEqual, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import { toPositiveNumber } from './table-data.js';

export function useTablePagination(
  schemaProps: TableSchema,
  onPageChange: RendererComponentProps<TableSchema>['events']['onPageChange'],
  helpers: RendererComponentProps<TableSchema>['helpers'],
) {
  const renderScope = useRenderScope();
  const paginationOwnership = schemaProps.paginationOwnership ?? 'local';
  const paginationStatePath =
    typeof schemaProps.paginationStatePath === 'string'
      ? schemaProps.paginationStatePath
      : undefined;
  const paginationEnabled = schemaProps.pagination?.enabled !== false;

  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(schemaProps.pagination?.pageSize ?? 10);

  const scopePaginationState = useScopeSelector(
    (scopeData) =>
      paginationOwnership === 'scope' && paginationStatePath
        ? (getIn(scopeData, paginationStatePath) as Record<string, unknown> | undefined)
        : undefined,
    shallowEqual,
  );

  const currentPage =
    paginationOwnership === 'controlled'
      ? toPositiveNumber(schemaProps.pagination?.currentPage, 1)
      : paginationOwnership === 'scope'
        ? toPositiveNumber(
            scopePaginationState?.currentPage,
            toPositiveNumber(schemaProps.pagination?.currentPage, 1),
          )
        : localCurrentPage;

  const pageSize =
    paginationOwnership === 'controlled'
      ? toPositiveNumber(schemaProps.pagination?.pageSize, 10)
      : paginationOwnership === 'scope'
        ? toPositiveNumber(
            scopePaginationState?.pageSize,
            toPositiveNumber(schemaProps.pagination?.pageSize, 10),
          )
        : localPageSize;

  const handlePageChange = useCallback(
    (page: number) => {
      startTransition(() => {
        if (paginationOwnership === 'local') {
          setLocalCurrentPage(page);
        } else if (paginationOwnership === 'scope' && paginationStatePath) {
          renderScope.update(paginationStatePath, { currentPage: page, pageSize });
        }
      });
      onPageChange?.(null, {
        scope: helpers.createScope(
          { page, pageSize },
          { scopeKey: 'pagination', pathSuffix: 'pagination' },
        ),
      });
    },
    [paginationOwnership, paginationStatePath, pageSize, onPageChange, helpers, renderScope],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      startTransition(() => {
        if (paginationOwnership === 'local') {
          setLocalPageSize(newPageSize);
          setLocalCurrentPage(1);
        } else if (paginationOwnership === 'scope' && paginationStatePath) {
          renderScope.update(paginationStatePath, { currentPage: 1, pageSize: newPageSize });
        }
      });
      onPageChange?.(null, {
        scope: helpers.createScope(
          { page: 1, pageSize: newPageSize },
          { scopeKey: 'pagination', pathSuffix: 'pagination' },
        ),
      });
    },
    [paginationOwnership, paginationStatePath, onPageChange, helpers, renderScope],
  );

  return { paginationEnabled, currentPage, pageSize, handlePageChange, handlePageSizeChange };
}
