import { startTransition, useCallback, useState } from 'react';
import { getIn, shallowEqual, type FluxActionEvent, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { TableSchema } from '../schemas.js';
import { toPositiveNumber } from './table-data.js';
import { createTableEventContext } from './table-event-context.js';

function createPaginationEventContext(args: {
  helpers: RendererComponentProps<TableSchema>['helpers'];
  page: number;
  pageSize: number;
  uiEvent?: FluxActionEvent;
}) {
  const payload = {
    type: 'table:page-change',
    page: args.page,
    pageSize: args.pageSize,
    pagination: {
      currentPage: args.page,
      pageSize: args.pageSize,
    },
  };

  return createTableEventContext(payload, {
    helpers: args.helpers,
    scopeKey: 'pagination',
    pathSuffix: 'pagination',
    event: args.uiEvent,
  });
}

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
  const serverPaged = schemaProps.pagination?.serverPaged === true;

  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(schemaProps.pagination?.pageSize ?? 10);

  const scopePaginationState = useScopeSelector(
    (scopeData) =>
      paginationOwnership === 'scope' && paginationStatePath
        ? (getIn(scopeData, paginationStatePath) as Record<string, unknown> | undefined)
        : undefined,
    shallowEqual,
    { paths: paginationStatePath ? [paginationStatePath] : undefined },
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
    (page: number, uiEvent?: unknown) => {
      startTransition(() => {
        if (paginationOwnership === 'local') {
          setLocalCurrentPage(page);
        } else if (paginationOwnership === 'scope' && paginationStatePath) {
          renderScope.update(paginationStatePath, { currentPage: page, pageSize });
        }
      });
      onPageChange?.(
        uiEvent,
        createPaginationEventContext({
          helpers,
          page,
          pageSize,
          uiEvent: uiEvent as FluxActionEvent | undefined,
        }),
      );
    },
    [paginationOwnership, paginationStatePath, pageSize, onPageChange, helpers, renderScope],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number, uiEvent?: unknown) => {
      startTransition(() => {
        if (paginationOwnership === 'local') {
          setLocalPageSize(newPageSize);
          setLocalCurrentPage(1);
        } else if (paginationOwnership === 'scope' && paginationStatePath) {
          renderScope.update(paginationStatePath, { currentPage: 1, pageSize: newPageSize });
        }
      });
      onPageChange?.(
        uiEvent,
        createPaginationEventContext({
          helpers,
          page: 1,
          pageSize: newPageSize,
          uiEvent: uiEvent as FluxActionEvent | undefined,
        }),
      );
    },
    [paginationOwnership, paginationStatePath, onPageChange, helpers, renderScope],
  );

  const clampPage = useCallback(
    (nextPage: number, totalRows: number, uiEvent?: unknown) => {
      if (!paginationEnabled) {
        return currentPage;
      }

      const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
      const clampedPage = Math.min(Math.max(1, nextPage), totalPages);

      if (clampedPage === currentPage) {
        return clampedPage;
      }

      startTransition(() => {
        if (paginationOwnership === 'local') {
          setLocalCurrentPage(clampedPage);
        } else if (paginationOwnership === 'scope' && paginationStatePath) {
          renderScope.update(paginationStatePath, { currentPage: clampedPage, pageSize });
        }
      });
      onPageChange?.(
        uiEvent,
        createPaginationEventContext({
          helpers,
          page: clampedPage,
          pageSize,
          uiEvent: uiEvent as FluxActionEvent | undefined,
        }),
      );

      return clampedPage;
    },
    [
      currentPage,
      helpers,
      onPageChange,
      pageSize,
      paginationEnabled,
      paginationOwnership,
      paginationStatePath,
      renderScope,
    ],
  );

  return { paginationEnabled, serverPaged, currentPage, pageSize, handlePageChange, handlePageSizeChange, clampPage };
}
