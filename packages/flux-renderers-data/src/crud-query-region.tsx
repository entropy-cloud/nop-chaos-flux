import { useState } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
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

function countActiveFilters(values: Record<string, unknown>): number {
  return Object.entries(values).filter(([, value]) => {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return true;
  }).length;
}

function resolveFilterToggleConfig(
  value: boolean | CrudFilterToggleConfig | undefined,
): { enabled: boolean; config: CrudFilterToggleConfig } {
  if (value === true) {
    return { enabled: true, config: {} };
  }
  if (value && typeof value === 'object') {
    return { enabled: true, config: value };
  }
  return { enabled: false, config: {} };
}

export function CrudQueryRegion(props: CrudQueryRegionProps) {
  const { filterTogglable, queryState, queryFormRegionRender, onSubmit, onReset, isMobile } =
    props;
  const { enabled: toggleEnabled, config } = resolveFilterToggleConfig(filterTogglable);

  const mobileDefaultCollapsed = isMobile === true;
  const [collapsed, setCollapsed] = useState<boolean>(
    mobileDefaultCollapsed || config.defaultCollapsed === true,
  );

  if (!toggleEnabled) {
    return (
      <div className="nop-crud-query" data-slot="crud-query">
        {queryFormRegionRender()}
        <div className="mt-2 flex gap-2" data-slot="crud-query-controls">
          <Button variant="outline" size="sm" onClick={onSubmit}>
            {t('flux.common.search')}
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            {t('flux.common.reset')}
          </Button>
        </div>
      </div>
    );
  }

  const activeValues = queryState;
  const activeCount = countActiveFilters(activeValues);
  const expandLabel = config.expandedLabel ?? t('flux.crud.expandQuery');
  const collapseLabel = config.collapsedLabel ?? t('flux.crud.collapseQuery');

  return (
    <div className="nop-crud-query" data-slot="crud-query">
      <div
        className="flex items-center gap-2"
        data-slot="crud-query-collapse"
        data-collapsed={collapsed || undefined}
      >
        <span className="text-sm text-muted-foreground">
          {t('flux.crud.activeFilters', { count: activeCount })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? expandLabel : collapseLabel}
        >
          {collapsed ? expandLabel : collapseLabel}
        </Button>
      </div>
      {!collapsed ? (
        <>
          {queryFormRegionRender()}
          <div className="mt-2 flex gap-2" data-slot="crud-query-controls">
            <Button variant="outline" size="sm" onClick={onSubmit}>
              {t('flux.common.search')}
            </Button>
            <Button variant="outline" size="sm" onClick={onReset}>
              {t('flux.common.reset')}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
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

export function __test__countActiveFilters(values: Record<string, unknown>) {
  return countActiveFilters(values);
}
