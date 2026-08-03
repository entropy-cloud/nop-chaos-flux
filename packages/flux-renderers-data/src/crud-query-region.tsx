import type { CrudFilterToggleConfig } from './crud-schema.js';

export interface CrudQueryRegionProps {
  filterTogglable: boolean | CrudFilterToggleConfig | undefined;
  queryState: Record<string, unknown>;
  defaultQuery: Record<string, unknown>;
  queryFormRegionRender: () => React.ReactNode;
  onSubmit: () => void;
  onReset: () => void;
  isMobile?: boolean;
}

export function resolvePaginationMode(
  crudPagination: { mode?: 'pages' | 'infinite' } | undefined,
  tablePagination: { mode?: 'pages' | 'infinite' } | undefined,
): 'pages' | 'infinite' {
  if (crudPagination?.mode === 'infinite') {
    return 'infinite';
  }
  if (tablePagination?.mode === 'infinite') {
    return 'infinite';
  }
  return 'pages';
}

export function isAtLastPage(
  total: number | undefined,
  currentPage: number,
  pageSize: number,
): boolean {
  if (typeof total !== 'number' || !Number.isFinite(total)) {
    return false;
  }
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  return currentPage >= lastPage;
}
