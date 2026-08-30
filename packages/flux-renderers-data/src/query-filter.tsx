import { useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import { ChevronDownIcon } from 'lucide-react';
import { asReactNode } from './crud-renderer-delegate.js';
import type { QueryFilterSchema } from './schemas.js';

export function QueryFilterRenderer(props: RendererComponentProps<QueryFilterSchema>) {
  const slotProps = props.props as QueryFilterSchema;
  const togglable = slotProps.togglable;
  const enabled = togglable === true || (togglable != null && typeof togglable === 'object');
  const toggleConfig =
    typeof togglable === 'object' && togglable !== null ? togglable : undefined;
  const [collapsed, setCollapsed] = useState(toggleConfig?.defaultCollapsed === true);

  const formContent = asReactNode(
    props.regions.filterForm?.render({ pathSuffix: 'filterForm' }),
  );

  const collapsedSummary =
    toggleConfig?.collapsedLabel ?? t('flux.crud.expandQuery');
  const expandedToggleLabel =
    toggleConfig?.expandedLabel ?? t('flux.crud.collapseQuery');

  return (
    <div
      className={cn(
        'nop-query-filter rounded-lg border bg-muted/30',
        enabled && collapsed ? 'px-3 py-2' : 'p-4',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="query-filter"
      data-collapsed={enabled && collapsed ? 'true' : undefined}
    >
      {enabled ? (
        <div
          className={cn('flex items-center', collapsed ? 'justify-between' : 'justify-end')}
          data-slot="query-filter-collapse"
          data-collapsed={collapsed || undefined}
        >
          {collapsed ? (
            <span className="text-sm text-muted-foreground" data-slot="query-filter-summary">
              {collapsedSummary}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? collapsedSummary : expandedToggleLabel}
          >
            <ChevronDownIcon
              className={cn('size-4 transition-transform', !collapsed && 'rotate-180')}
            />
          </Button>
        </div>
      ) : null}
      {!collapsed || !enabled ? <div className={enabled ? 'mt-3' : ''}>{formContent}</div> : null}
    </div>
  );
}
