import React, { useEffect, useRef, useState } from 'react';
import type {
  ComponentHandleRegistry,
  InstanceFrame,
  RendererComponentProps,
  RendererRenderOutput,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { getIn, toPositiveNumber } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentComponentRegistry,
  useRenderInstancePath,
  useRenderScope,
} from '@nop-chaos/flux-react';
import { cn, useIsMobile } from '@nop-chaos/ui';
import type { ListSchema, ListSelectionMode } from './schemas.js';
import {
  resolveListPaginationOwnership,
  useListPagination,
  type ResolvedListPagination,
} from './list-pagination.js';
import { useInfiniteScroll } from './use-infinite-scroll.js';

const DEFAULT_LIST_KEY_FIELD = 'id';
const EMPTY_SET: ReadonlySet<string> = new Set();

type ListOwner = RendererComponentProps<ListSchema>;

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

function toListItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toListItemKey(item: unknown, keyField: string, index: number): string {
  const explicit =
    item !== null && typeof item === 'object' ? getIn(item as Record<string, unknown>, keyField) : undefined;

  if (explicit !== undefined && explicit !== null && explicit !== '') {
    return String(explicit);
  }

  return `item:${index}`;
}

function resolveSelectionMode(value: unknown): ListSelectionMode {
  return value === 'single' || value === 'multiple' ? value : 'none';
}

function createListRepeatedTemplateId(ownerId: string): string {
  return `list-item:${ownerId}`;
}

interface ListItemViewProps {
  owner: ListOwner;
  item: unknown;
  index: number;
  itemKey: string;
  instancePath: readonly InstanceFrame[];
  selectionMode: ListSelectionMode;
  selected: boolean;
  onSelect: (key: string) => void;
  isLast: boolean;
  isMobile: boolean;
}

function ListItemView(props: ListItemViewProps) {
  const { owner, item, index, itemKey, instancePath, selectionMode, selected, onSelect, isLast, isMobile } = props;
  const helpers = owner.helpers;
  const [itemScope] = useState<ScopeRef>(() => helpers.createScope({ item, index }));

  useEffect(() => {
    itemScope.merge({ item, index });
  }, [itemScope, item, index]);

  useEffect(() => {
    return () => {
      helpers.disposeScope(itemScope.id);
    };
  }, [helpers, itemScope.id]);

  const content = owner.regions.item
    ? asReactNode(
        owner.regions.item.render({
          scope: itemScope,
          bindings: { item, index },
          instancePath,
        }),
      )
    : null;

  const interactive = selectionMode !== 'none' || Boolean(owner.events.onItemClick);

  const handleClick = (_event: React.MouseEvent<HTMLDivElement>) => {
    onSelect(itemKey);
    void owner.events.onItemClick?.(
      { type: 'list:item-click', item, index, key: itemKey },
      { scope: itemScope },
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onSelect(itemKey);
    void owner.events.onItemClick?.(
      { type: 'list:item-click', item, index, key: itemKey },
      { scope: itemScope },
    );
  };

  return (
    <div
      data-slot="list-item"
      data-item-key={itemKey}
      data-selected={selected || undefined}
      role="listitem"
      aria-selected={selectionMode !== 'none' ? selected : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        'min-w-0 px-3 text-sm transition-colors',
        isMobile ? 'py-3' : 'py-2',
        // Inter-item divider migrated from root `divide-y divide-border` to the M0.1
        // `nop-hairline` 0.5px hairline (last item omits the bottom edge).
        !isLast ? 'nop-hairline nop-hairline--bottom' : null,
        interactive ? 'cursor-pointer hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none' : null,
        selected ? 'bg-primary/10' : null,
      )}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      {content}
    </div>
  );
}

function computeVisibleItems(items: unknown[], pagination: ResolvedListPagination): unknown[] {
  if (!pagination.enabled) {
    return items;
  }
  if (pagination.mode === 'infinite') {
    return items.slice(0, pagination.currentPage * pagination.pageSize);
  }
  const start = (pagination.currentPage - 1) * pagination.pageSize;
  return items.slice(start, start + pagination.pageSize);
}

interface UseListHandleArgs {
  componentRegistry: ComponentHandleRegistry | undefined;
  id: string | number | undefined;
  cid: number | undefined;
  gotoPage: (next: number) => number;
  pagination: ResolvedListPagination;
}

function useListHandle(args: UseListHandleArgs): void {
  const { componentRegistry, id, cid, gotoPage, pagination } = args;

  useEffect(() => {
    if (!componentRegistry || cid === undefined) {
      return;
    }
    const snapshot = {
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
      totalPages: pagination.totalPages,
      total: pagination.total,
    };
    return componentRegistry.register(
      {
        id: id == null ? undefined : String(id),
        type: 'list',
        capabilities: {
          hasMethod(method: string) {
            return method === 'gotoPage' || method === 'getPagination';
          },
          listMethods() {
            return ['gotoPage', 'getPagination'];
          },
          async invoke(method: string, payload?: unknown) {
            if (method === 'getPagination') {
              return { ok: true, data: snapshot };
            }
            if (method === 'gotoPage') {
              const requested = toPositiveNumber(
                (payload as { page?: unknown } | undefined)?.page,
                pagination.currentPage,
              );
              const applied = gotoPage(requested);
              return {
                ok: true,
                data: {
                  currentPage: applied,
                  pageSize: pagination.pageSize,
                  totalPages: pagination.totalPages,
                  total: pagination.total,
                },
              };
            }
            return { ok: false, error: new Error(`Unknown method: ${method}`) };
          },
        },
      },
      { cid },
    );
  }, [componentRegistry, id, cid, gotoPage, pagination]);
}

export function ListRenderer(props: ListOwner) {
  const schemaProps = props.props as ListSchema;
  const items = toListItems(schemaProps.items);
  const selectionMode = resolveSelectionMode(schemaProps.selectionMode);
  const keyField =
    typeof schemaProps.keyField === 'string' && schemaProps.keyField
      ? schemaProps.keyField
      : DEFAULT_LIST_KEY_FIELD;
  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });
  const parentInstancePath = useRenderInstancePath();
  const repeatedTemplateId = createListRepeatedTemplateId(props.id);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => EMPTY_SET);
  const scope = useRenderScope();
  const componentRegistry = useCurrentComponentRegistry();
  const isMobile = useIsMobile();

  const pagination = useListPagination({
    config: schemaProps.pagination,
    ownership: resolveListPaginationOwnership(schemaProps.paginationOwnership),
    paginationStatePath: schemaProps.paginationStatePath,
    pageSizeStatePath: schemaProps.pageSizeStatePath,
    scope,
    itemCount: items.length,
  });

  const visibleItems = computeVisibleItems(items, pagination);
  const lastDispatchedPageRef = useRef<number>(pagination.currentPage);

  // G12: derive the effective selection by evicting keys that no longer exist in
  // the current data set, so stale keys never leak into onSelectionChange or the
  // rendered `selected` state. Computed at render time (mirrors CRUD
  // `autoClearSelectionOnRefresh` for the standalone list) instead of mirroring
  // data into state via an effect.
  let effectiveSelectedKeys: ReadonlySet<string> = selectedKeys;
  if (selectedKeys.size > 0) {
    const validKeys = new Set(items.map((item, index) => toListItemKey(item, keyField, index)));
    let changed = false;
    const next = new Set<string>();
    for (const key of selectedKeys) {
      if (validKeys.has(key)) {
        next.add(key);
      } else {
        changed = true;
      }
    }
    if (changed) {
      effectiveSelectedKeys = next;
    }
  }

  function dispatchPageChange(page: number) {
    const payload = {
      type: 'list:page-change',
      currentPage: page,
      pageSize: pagination.pageSize,
      totalPages: pagination.totalPages,
      total: pagination.total,
    };
    void props.events.onPageChange?.(payload, {
      scope: props.node.scope,
      event: payload,
      evaluationBindings: payload,
    });
  }

  const gotoPage = (next: number): number => {
    const applied = pagination.applyPage(next);
    if (applied !== undefined && applied !== lastDispatchedPageRef.current) {
      lastDispatchedPageRef.current = applied;
      dispatchPageChange(applied);
    }
    return applied ?? pagination.currentPage;
  };

  const infiniteActive = pagination.enabled && pagination.mode === 'infinite';
  const infiniteSentinelEnabled = infiniteActive && visibleItems.length > 0 && pagination.hasMore;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleLoadMore = (): Promise<unknown> | void => {
    if (!infiniteActive || !pagination.hasMore) {
      return;
    }
    const nextPage = pagination.currentPage + 1;
    const applied = pagination.applyPage(nextPage);
    const effectivePage = applied ?? nextPage;
    const loadPayload = {
      type: 'list:load-more',
      currentPage: effectivePage,
      pageSize: pagination.pageSize,
      total: pagination.total,
    };
    // Return the load promise so the infinite-scroll hook can drive loading/error
    // state and guard against concurrent triggers (G5).
    const loadResult = props.events.onLoadMore?.(loadPayload, {
      scope: props.node.scope,
      event: loadPayload,
      evaluationBindings: loadPayload,
    });
    if (applied !== undefined && applied !== lastDispatchedPageRef.current) {
      lastDispatchedPageRef.current = applied;
      dispatchPageChange(applied);
    }
    return loadResult;
  };

  const infiniteState = useInfiniteScroll({
    enabled: infiniteSentinelEnabled,
    sentinelRef,
    onLoadMore: handleLoadMore,
  });

  useListHandle({
    componentRegistry,
    id: props.id,
    cid: props.meta.cid,
    gotoPage,
    pagination,
  });

  const handleSelect = (key: string) => {
    if (selectionMode === 'none') {
      return;
    }

    const prev = effectiveSelectedKeys;
    let next: Set<string>;

    if (selectionMode === 'single') {
      next = prev.has(key) ? new Set<string>() : new Set<string>([key]);
    } else {
      next = new Set<string>(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
    }

    setSelectedKeys(next);

    const payload = {
      type: 'list:selection-change',
      selectedKeys: Array.from(next),
      selectionMode,
    };
    void props.events.onSelectionChange?.(payload, { scope: props.node.scope });
  };

  if (items.length === 0) {
    return (
      <div
        className={cn('nop-list', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="list-root"
        data-empty="true"
        data-responsive={isMobile ? 'narrow' : undefined}
        role="list"
      >
        {hasRendererSlotContent(emptyContent) ? (
          <div data-slot="list-empty" className="px-3 py-3 text-sm text-muted-foreground">
            {emptyContent}
          </div>
        ) : null}
      </div>
    );
  }

  const infiniteStatus = infiniteActive
    ? pagination.hasMore
      ? infiniteState.error
        ? t('flux.list.loadFailed')
        : infiniteState.loading
          ? t('flux.list.loadingMore')
          : ''
      : t('flux.list.noMore')
    : '';

  return (
    <div
      className={cn(
        // Inter-item dividers migrated to per-item `nop-hairline` (M0.1); the root keeps the
        // outer rounded border. Mobile adds `touch-pan-y` for fluid vertical touch scrolling.
        'nop-list overflow-hidden rounded-md border border-border',
        isMobile ? 'touch-pan-y' : null,
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="list-root"
      data-responsive={isMobile ? 'narrow' : undefined}
      data-current-page={pagination.enabled ? pagination.currentPage : undefined}
      data-page-size={pagination.enabled ? pagination.pageSize : undefined}
      data-total-pages={pagination.enabled ? pagination.totalPages : undefined}
      data-pagination-mode={pagination.enabled ? pagination.mode : undefined}
      role="list"
    >
      {visibleItems.map((item, index) => {
        // Use the GLOBAL index (offset by the page window) for the fallback key
        // so keys stay unique across pages. Without this, every page reuses
        // `item:0..pageSize-1`, which lets React reconcile ListItemView across
        // unrelated records and leaks per-item scope/selection state between
        // pages (P0-4). Infinite/disabled modes already slice from index 0, so
        // their window index equals the global index (offset 0). The `index`
        // binding passed to the item region stays the within-window position.
        const keyGlobalIndex =
          pagination.enabled && pagination.mode === 'page'
            ? (pagination.currentPage - 1) * pagination.pageSize + index
            : index;
        const itemKey = toListItemKey(item, keyField, keyGlobalIndex);
        const instancePath: InstanceFrame[] = [
          ...(parentInstancePath ?? []),
          { repeatedTemplateId, instanceKey: itemKey },
        ];
        return (
          <ListItemView
            key={itemKey}
            owner={props}
            item={item}
            index={index}
            itemKey={itemKey}
            instancePath={instancePath}
            selectionMode={selectionMode}
            selected={effectiveSelectedKeys.has(itemKey)}
            onSelect={handleSelect}
            isLast={index === visibleItems.length - 1}
            isMobile={isMobile}
          />
        );
      })}
      {infiniteActive ? (
        <div className="nop-list-infinite px-3 py-2 text-sm text-muted-foreground" data-slot="list-infinite">
          <div data-slot="list-infinite-status">{infiniteStatus}</div>
          {infiniteSentinelEnabled ? (
            <div ref={sentinelRef} data-slot="list-infinite-sentinel" style={{ height: 1 }} aria-hidden />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
