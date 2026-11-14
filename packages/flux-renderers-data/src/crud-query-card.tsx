import type { ReactNode } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import { ChevronDownIcon } from 'lucide-react';
import type { CrudFilterToggleConfig } from './crud-schema.js';
import type { CrudFilterToggleResult } from './use-crud-filter-toggle.js';
import { CrudQueryActions } from './crud-query-actions.js';

interface CrudQueryCardProps {
  filterToggle: CrudFilterToggleResult;
  filterToggleConfig: CrudFilterToggleConfig | undefined;
  queryFormNode: ReactNode;
  queryFormOwnsActions: boolean;
  onSearch(): void;
  onReset(): void;
}

export function CrudQueryCard({
  filterToggle,
  filterToggleConfig,
  queryFormNode,
  queryFormOwnsActions,
  onSearch,
  onReset,
}: CrudQueryCardProps) {
  return (
    <div
      className={cn(
        'nop-crud-query rounded-lg border bg-muted/30',
        filterToggle.collapsed && filterToggle.enabled ? 'px-3 py-2' : 'p-4',
      )}
      data-slot="crud-query"
    >
      {filterToggle.enabled ? (
        <div
          className={cn('flex items-center', filterToggle.collapsed ? 'justify-between' : 'justify-end')}
          data-slot="crud-query-collapse"
          data-collapsed={filterToggle.collapsed || undefined}
        >
          {filterToggle.collapsed ? (
            <span className="text-sm text-muted-foreground">
              {filterToggleConfig?.collapsedLabel ??
                (filterToggle.activeFilterCount > 0
                  ? t('flux.crud.activeFilters', { count: filterToggle.activeFilterCount })
                  : t('flux.crud.collapseQuery'))}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => filterToggle.setCollapsed(!filterToggle.collapsed)}
            aria-expanded={!filterToggle.collapsed}
            aria-label={
              filterToggle.collapsed
                ? t('flux.crud.expandQuery')
                : (filterToggleConfig?.expandedLabel ?? t('flux.crud.collapseQuery'))
            }
          >
            <ChevronDownIcon
              className={cn('size-4 transition-transform', !filterToggle.collapsed && 'rotate-180')}
            />
          </Button>
        </div>
      ) : null}
      <div
        className={filterToggle.enabled ? 'mt-3' : ''}
        hidden={filterToggle.enabled && filterToggle.collapsed ? true : undefined}
      >
        {queryFormNode}
        <CrudQueryActions
          hasQueryForm={!queryFormOwnsActions}
          onSearch={onSearch}
          onReset={onReset}
        />
      </div>
    </div>
  );
}
