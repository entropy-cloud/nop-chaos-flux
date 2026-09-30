import { useState } from 'react';
import { Button, Checkbox, Input, Popover, PopoverContent, PopoverTrigger, Spinner, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { OrgNode } from '../../schemas-org.js';
import { isNodeTypeSelectable } from './org-data-protocol.js';
import type { OrgDataState } from './use-org-data.js';

function OrgNodeRow(input: {
  node: OrgNode;
  depth: number;
  selectable: boolean;
  checked: boolean;
  interactive: boolean;
  navigable: boolean;
  loading: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const { node, depth, selectable, checked, interactive, navigable, loading, onToggle, onNavigate } = input;
  const rowDisabled = !interactive || node.disabled === true;
  return (
    <div
      data-slot="org-select-node"
      data-node-id={node.id}
      data-node-type={node.type ?? ''}
      data-disabled={rowDisabled || !selectable ? true : undefined}
      className="flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-accent"
      style={{ paddingLeft: 4 + depth * 14 }}
    >
      {selectable ? (
        <Checkbox
          data-slot="org-select-node-check"
          checked={checked}
          disabled={rowDisabled}
          onCheckedChange={() => onToggle()}
          aria-label={node.name}
        />
      ) : null}
      {/* text-level inline affordance: bare button + data-slot per
          renderer-markers-and-selectors.md (a nested ui Button inside the
          selectable row button would violate the button content model). */}
      <button
        type="button"
        data-slot="org-select-node-name"
        data-checked={checked ? true : undefined}
        className="flex-1 truncate text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={rowDisabled}
        title={node.disabledTip}
        onClick={() => (selectable ? onToggle() : onNavigate())}
      >
        {node.name}
      </button>
      {loading ? <Spinner className="size-3.5" data-slot="org-select-node-loading" /> : null}
      {navigable ? (
        <button
          type="button"
          data-slot="org-select-expand"
          className="rounded-sm px-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={node.name}
          onClick={onNavigate}
        >
          ›
        </button>
      ) : null}
    </div>
  );
}

/**
 * Shared presentation for the org-family pickers (plan 505). One panel,
 * two configurations: user-select renders department rows as navigable-only
 * (default `selectableTypes: ['user']`); department-select selects
 * departments directly. Trigger + Popover panel; tree browse and flat
 * search share the same row renderer.
 */
export function OrgSelectPanel(input: {
  value: unknown;
  multiple: boolean;
  searchable: boolean;
  clearable?: boolean;
  interactive: boolean;
  selectableTypes: string[];
  placeholder: string;
  ariaLabel: string;
  staticOptions: OrgNode[];
  data: OrgDataState;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  onToggleNode: (node: OrgNode) => void;
  onClear: () => void;
  testid?: string;
  className?: string;
}) {
  const {
    value,
    multiple,
    searchable,
    clearable,
    interactive,
    selectableTypes,
    placeholder,
    ariaLabel,
    staticOptions,
    data,
    panelOpen,
    onPanelOpenChange,
    onToggleNode,
    onClear,
    testid,
    className,
  } = input;
  const [path, setPath] = useState<OrgNode[]>([]);

  const selectedIds = new Set(
    (Array.isArray(value) ? value : value == null ? [] : [value]).map((entry) => String(entry)),
  );
  const hasValue = selectedIds.size > 0;
  const labels = data.labelsFor(value);

  const searching = data.search.query.trim() !== '';
  const searchMode = searchable && searching;
  const levelState = path.length === 0 ? data.children.rootState : data.children.nodeStates[path[path.length - 1].id];
  const levelNodes = (() => {
    if (path.length === 0) {
      return staticOptions.length > 0 ? staticOptions : data.children.rootState.nodes;
    }
    const parent = path[path.length - 1];
    if (parent.children && parent.children.length > 0) {
      return parent.children;
    }
    return data.children.nodeStates[parent.id]?.nodes ?? [];
  })();

  const navigate = (node: OrgNode) => {
    data.children.loadNode(node, path.length + 1);
    setPath((previous) => [...previous, node]);
  };

  const closePanel = () => onPanelOpenChange(false);

  return (
    <Popover open={panelOpen} onOpenChange={(open) => interactive && onPanelOpenChange(open)}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            data-slot="org-select-trigger"
            data-testid={testid}
            data-empty={hasValue ? undefined : true}
            aria-label={ariaLabel}
            disabled={!interactive}
            className={cn('w-full justify-start font-normal', className)}
            onClick={(event) => {
              if (!interactive) {
                event.preventDefault();
                return;
              }
              onPanelOpenChange(!panelOpen);
            }}
          >
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1" data-slot="org-select-value-area">
              {hasValue ? (
                multiple ? (
                  [...selectedIds].map((id) => (
                    <span
                      key={id}
                      data-slot="org-select-chip"
                      data-value={id}
                      className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-xs"
                    >
                      {labels[id] ?? id}
                    </span>
                  ))
                ) : (
                  <span data-slot="org-select-value" data-value={[...selectedIds][0]} className="truncate text-sm">
                    {labels[[...selectedIds][0]] ?? [...selectedIds][0]}
                  </span>
                )
              ) : (
                <span className="truncate text-sm text-muted-foreground">{placeholder}</span>
              )}
            </span>
            {clearable && hasValue && interactive ? (
              <span
                role="button"
                tabIndex={0}
                data-slot="org-select-clear"
                aria-label={t('flux.form.orgClear')}
                className="px-1 text-muted-foreground hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  onClear();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.stopPropagation();
                    onClear();
                  }
                }}
              >
                ✕
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80 p-2" data-slot="org-select-panel">
        {searchable ? (
          <Input
            data-slot="org-select-search"
            value={data.search.query}
            placeholder={t('flux.form.orgSearchPlaceholder')}
            className="mb-1 h-8"
            onChange={(event) => data.search.setQuery(event.target.value)}
          />
        ) : null}
        {searchMode ? null : (
          <div className="mb-1 flex items-center gap-0.5 text-xs text-muted-foreground" data-slot="org-select-breadcrumb">
            <button
              type="button"
              className="rounded-sm px-1 hover:bg-accent hover:text-foreground"
              data-current={path.length === 0 ? true : undefined}
              onClick={() => setPath([])}
            >
              {t('flux.form.orgBreadcrumbRoot')}
            </button>
            {path.map((node, index) => (
              <span key={node.id} className="flex items-center gap-0.5">
                <span>/</span>
                <button
                  type="button"
                  className="rounded-sm px-1 hover:bg-accent hover:text-foreground"
                  data-current={index === path.length - 1 ? true : undefined}
                  onClick={() => setPath((previous) => previous.slice(0, index + 1))}
                >
                  {node.name}
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="max-h-64 overflow-y-auto" data-slot="org-select-list">
          {searchMode ? (
            data.search.status === 'error' ? (
              <div className="px-2 py-3 text-center text-sm text-destructive" data-slot="org-select-error">
                {data.search.error ?? t('flux.form.orgSearchFailed')}
              </div>
            ) : data.searchResults && data.searchResults.length > 0 ? (
              <>
                {data.searchResults.map((node) => (
                  <OrgNodeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    selectable={isNodeTypeSelectable(node, selectableTypes)}
                    checked={selectedIds.has(node.id)}
                    interactive={interactive}
                    navigable={false}
                    loading={false}
                    onToggle={() => onToggleNode(node)}
                    onNavigate={() => {}}
                  />
                ))}
                {data.search.status === 'ready' && data.search.hasMore ? (
                  <button
                    type="button"
                    data-slot="org-select-load-more"
                    className="w-full rounded-sm px-2 py-1.5 text-center text-sm text-muted-foreground hover:bg-accent"
                    onClick={() => data.search.loadMore()}
                  >
                    {t('flux.form.orgLoadMore')}
                  </button>
                ) : null}
              </>
            ) : data.search.status === 'loading' ? (
              <div className="flex justify-center py-3" data-slot="org-select-loading">
                <Spinner className="size-4" />
              </div>
            ) : (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground" data-slot="org-select-empty">
                {t('flux.form.orgEmpty')}
              </div>
            )
          ) : levelState?.status === 'error' ? (
            <div className="px-2 py-3 text-center text-sm text-destructive" data-slot="org-select-error">
              {levelState.error ?? t('flux.form.orgChildrenFailed')}
              <button
                type="button"
                data-slot="org-select-retry"
                className="ml-2 underline hover:text-foreground"
                onClick={() =>
                  path.length === 0 ? data.children.retryRoot() : data.children.retryNode(path[path.length - 1], path.length)
                }
              >
                {t('flux.form.orgRetry')}
              </button>
            </div>
          ) : (
            <>
              {levelNodes.map((node) => (
                <OrgNodeRow
                  key={node.id}
                  node={node}
                  depth={path.length}
                  selectable={isNodeTypeSelectable(node, selectableTypes)}
                  checked={selectedIds.has(node.id)}
                  interactive={interactive}
                  navigable={node.leaf !== true}
                  loading={data.children.nodeStates[node.id]?.status === 'loading'}
                  onToggle={() => onToggleNode(node)}
                  onNavigate={() => navigate(node)}
                />
              ))}
              {levelState?.status === 'loading' ? (
                <div className="flex justify-center py-3" data-slot="org-select-loading">
                  <Spinner className="size-4" />
                </div>
              ) : null}
              {levelState?.status === 'ready' && levelState.hasMore ? (
                <button
                  type="button"
                  data-slot="org-select-load-more"
                  className="w-full rounded-sm px-2 py-1.5 text-center text-sm text-muted-foreground hover:bg-accent"
                  onClick={() =>
                    data.children.loadMore(path.length === 0 ? null : path[path.length - 1], path.length)
                  }
                >
                  {t('flux.form.orgLoadMore')}
                </button>
              ) : null}
              {(!levelState || levelState.status === 'ready' || levelState.status === 'idle') && levelNodes.length === 0 ? (
                <div className="px-2 py-3 text-center text-sm text-muted-foreground" data-slot="org-select-empty">
                  {t('flux.form.orgEmpty')}
                </div>
              ) : null}
            </>
          )}
        </div>
        {multiple && hasValue ? (
          <div className="mt-1 border-t pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              data-slot="org-select-done"
              onClick={closePanel}
            >
              {t('flux.common.confirm')}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
