import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ComponentHandle,
  RendererComponentProps,
  TabsStatusSummary,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  resolveRendererSlotContent,
  unwrapBooleanLiteral,
  useCurrentComponentRegistry,
  useRenderScope,
  useSchemaProps,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
  useIsMobile,
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { TabsItemSchema, TabsSchema } from './schemas.js';
import { useOwnedAxisValue } from './interaction-owner.js';
import { useStatusPathPublication } from './status-hooks.js';
import { asReactNode } from './utils.js';
import {
  EMPTY_ITEMS,
  TABS_SWIPE_DIRECTION_THRESHOLD,
  TABS_SWIPE_THRESHOLD,
  createTabRegionOptions,
  createTabsChangePayload,
  getItemValue,
  isTabDisabled,
  resolveCandidateValue,
  resolveTabBadge,
  resolveTabIcon,
  resolveTabKeepMounted,
  resolveTabsOrientation,
  resolveTabsVariant,
} from './tabs-utils.js';
import {
  createTabsViewCapabilities,
  createTabsViewOps,
  type TabsViewOps,
} from './tabs-view-management.js';

export function TabsRenderer(props: RendererComponentProps<TabsSchema>) {
  const componentRegistry = useCurrentComponentRegistry();
  const schemaProps = useSchemaProps(props);
  const renderScope = useRenderScope();
  const rawItems = Array.isArray(schemaProps.items) ? schemaProps.items : EMPTY_ITEMS;
  const itemsOwnership = schemaProps.itemsOwnership ?? 'local';
  const itemsStatePath = schemaProps.itemsStatePath;
  const scopeItemsActive = itemsOwnership === 'scope' && typeof itemsStatePath === 'string' && itemsStatePath.length > 0;
  const isControlledItems = itemsOwnership === 'controlled';

  const scopeItems = useScopeSelector<TabsItemSchema[] | undefined, TabsItemSchema[] | undefined>(
    scopeItemsActive && itemsStatePath
      ? (scopeData) => getIn(scopeData, itemsStatePath) as TabsItemSchema[] | undefined
      : () => undefined,
    Object.is,
    {
      enabled: scopeItemsActive,
      fallback: undefined,
      paths: scopeItemsActive && itemsStatePath ? [itemsStatePath] : undefined,
    },
  );

  const [managedItems, setManagedItems] = useState<TabsItemSchema[] | null>(null);
  const baseItems = scopeItemsActive && scopeItems ? scopeItems : rawItems;
  const items = managedItems ?? baseItems;
  const toolbarContent = resolveRendererSlotContent(props, 'toolbar');
  const firstValue = getItemValue(items[0] ?? {}, 0);
  const ownedAxis = useOwnedAxisValue<string>({
    ownership: schemaProps.valueOwnership,
    value: schemaProps.value == null ? undefined : String(schemaProps.value),
    defaultValue: schemaProps.defaultValue == null ? undefined : String(schemaProps.defaultValue),
    statePath: schemaProps.valueStatePath,
    fallbackValue: firstValue,
  });

  const isMobile = useIsMobile();
  const tabsListRef = useRef<HTMLDivElement | null>(null);
  const swipeStateRef = useRef<{ startX: number; startY: number; tracking: boolean } | null>(null);
  const prevItemsRef = useRef<TabsItemSchema[]>(items);

  // candidate-fix (design.md §10): write back a corrected value when the active
  // tab disappears from `items`. Only local/scope ownership self-corrects;
  // controlled ownership stays driven by its bound expression.
  useEffect(() => {
    if (ownedAxis.ownership === 'controlled') {
      prevItemsRef.current = items;
      return;
    }

    const candidate = resolveCandidateValue(items, ownedAxis.value, prevItemsRef.current);
    if (candidate !== undefined && candidate !== ownedAxis.value) {
      ownedAxis.setValue(candidate);
    }
    prevItemsRef.current = items;
  }, [items, ownedAxis]);

  const tabsMode = schemaProps.tabsMode ?? '';
  const sidePosition = schemaProps.sidePosition ?? 'left';
  const isSidebarRight = tabsMode === 'sidebar' && sidePosition === 'right';
  const orientation = resolveTabsOrientation(tabsMode, schemaProps.orientation);
  const variant = resolveTabsVariant(tabsMode);

  const tabsClosable = unwrapBooleanLiteral(schemaProps.closable);
  const tabsAddable = unwrapBooleanLiteral(schemaProps.addable);
  const tabsDraggable = unwrapBooleanLiteral(schemaProps.draggable);

  const viewOps = createTabsViewOps({
    items,
    isControlledItems,
    scopeItemsActive,
    itemsStatePath,
    renderScope,
    seedManagedCollection: setManagedItems,
    getActiveValue: () => ownedAxis.value,
    setActiveValue: (value: string) => ownedAxis.setValue(value),
    events: props.events,
    eventScope: props.node.scope,
    warnKey: props.id,
  });

  const viewOpsRef = useRef<TabsViewOps | null>(null);
  useEffect(() => {
    viewOpsRef.current = viewOps;
  });

  const dragValueRef = useRef<string | null>(null);

  const activeIndex = Math.max(
    0,
    items.findIndex((item, index) => getItemValue(item, index) === ownedAxis.value),
  );
  const summary = useMemo<TabsStatusSummary>(
    () => ({
      activeValue: ownedAxis.value,
      activeIndex,
      itemCount: items.length,
    }),
    [activeIndex, items.length, ownedAxis.value],
  );

  useStatusPathPublication(
    props.node.scope.parent ?? props.node.scope,
    typeof schemaProps.statusPath === 'string' ? schemaProps.statusPath : undefined,
    summary,
  );

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }

    const tabsHandle: ComponentHandle = {
      id: props.id,
      type: 'tabs',
      capabilities: {
        ...createTabsViewCapabilities({
          getOps: () => viewOpsRef.current,
          getActiveValue: () => ownedAxis.value,
          setActiveValue: (value: string) => ownedAxis.setValue(value),
          fallbackValue: firstValue,
        }),
        getDebugData() {
          return {
            activeValue: summary.activeValue,
            activeIndex: summary.activeIndex,
            itemCount: summary.itemCount,
          };
        },
      },
    };

    return componentRegistry.register(tabsHandle, {
      cid: props.meta.cid,
    });
  }, [componentRegistry, firstValue, ownedAxis, props.id, props.meta.cid, summary]);

  useEffect(() => {
    if (!isMobile || !tabsListRef.current) {
      return;
    }
    const activeTrigger = tabsListRef.current.querySelector<HTMLElement>(
      '[data-slot="tabs-trigger"][data-active="true"]',
    );
    if (activeTrigger && typeof activeTrigger.scrollIntoView === 'function') {
      activeTrigger.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    }
  }, [isMobile, ownedAxis.value, items.length]);

  const [activated, setActivated] = useState<ReadonlySet<string>>(() => new Set());
  const currentActiveValue = ownedAxis.value;
  if (!activated.has(currentActiveValue)) {
    setActivated((prev) => {
      const next = new Set(prev);
      next.add(currentActiveValue);
      return next;
    });
  }

  const handleSwipeMove = (clientX: number, clientY: number) => {
    const state = swipeStateRef.current;
    if (!state || !state.tracking) {
      return;
    }
    const deltaX = clientX - state.startX;
    const deltaY = clientY - state.startY;
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > TABS_SWIPE_DIRECTION_THRESHOLD) {
      state.tracking = false;
    }
  };

  const handleSwipeEnd = (clientX: number) => {
    const state = swipeStateRef.current;
    if (!state || !state.tracking) {
      swipeStateRef.current = null;
      return;
    }
    const deltaX = clientX - state.startX;
    swipeStateRef.current = null;
    if (Math.abs(deltaX) < TABS_SWIPE_THRESHOLD) {
      return;
    }
    const nextIndex = deltaX < 0 ? activeIndex + 1 : activeIndex - 1;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }
    const nextValue = getItemValue(items[nextIndex]!, nextIndex);
    if (isTabDisabled(items[nextIndex]!.disabled)) {
      return;
    }
    ownedAxis.setValue(nextValue);
    const payload = createTabsChangePayload(items, nextValue);
    void props.events.onChange?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
  };

  const tabsList = (
    <TabsList
      ref={tabsListRef as React.Ref<HTMLDivElement>}
      variant={schemaProps.variant ?? variant}
      className={cn(
        isMobile && orientation === 'horizontal'
          ? 'nop-scrollbar-hide overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : undefined,
      )}
    >
      {items.map((item, index) => {
        const value = getItemValue(item, index);
        const regionOptions = createTabRegionOptions(item, index);
        const titleRegion =
          typeof item.titleRegionKey === 'string' ? props.regions[item.titleRegionKey] : undefined;
        const titleContent =
          asReactNode(titleRegion?.render(regionOptions)) ?? item.title ?? item.label ?? value;
        const badgeContent = resolveTabBadge(item.badge);
        const iconComp = resolveTabIcon(item.icon);
        const itemClosable =
          item.closable == null ? tabsClosable : unwrapBooleanLiteral(item.closable);
        const isLastItem = index === items.length - 1;
        const showClose = itemClosable && !isLastItem;
        return (
          <TabsTrigger
            key={value}
            value={value}
            disabled={isTabDisabled(item.disabled)}
            data-tab-value={value}
            draggable={tabsDraggable || undefined}
            onDragStart={(event) => {
              if (!tabsDraggable) {
                return;
              }
              dragValueRef.current = value;
              event.dataTransfer?.setData('text/plain', value);
              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
              }
            }}
            onDragOver={(event) => {
              if (!tabsDraggable || dragValueRef.current == null) {
                return;
              }
              event.preventDefault();
            }}
            onDrop={(event) => {
              if (!tabsDraggable) {
                return;
              }
              event.preventDefault();
              const fromValue = dragValueRef.current;
              dragValueRef.current = null;
              if (fromValue == null || fromValue === value) {
                return;
              }
              viewOps.runMoveTab(fromValue, index);
            }}
          >
            {iconComp ? (
              <span data-slot="tab-icon" className="inline-flex shrink-0">
                {iconComp}
              </span>
            ) : null}
            {titleContent}
            {badgeContent ? (
              <span data-slot="tab-badge" className="inline-flex shrink-0">
                {badgeContent}
              </span>
            ) : null}
            {showClose ? (
              <span
                data-slot="tabs-trigger-close"
                aria-hidden="true"
                title={String(item.title ?? item.label ?? value)}
                className="ml-0.5 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-[11px] leading-none text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  viewOps.runRemoveTab(value);
                }}
              >
                ×
              </span>
            ) : null}
          </TabsTrigger>
        );
      })}
      {tabsAddable ? (
        <span
          data-slot="tabs-trigger-add"
          role="button"
          tabIndex={0}
          aria-label={t('flux.tabs.newTab')}
          className="ml-1 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-base leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              viewOps.runAddTab({ title: t('flux.tabs.newTab') });
            }
          }}
          onClick={(event) => {
            event.stopPropagation();
            viewOps.runAddTab({ title: t('flux.tabs.newTab') });
          }}
        >
          +
        </span>
      ) : null}
    </TabsList>
  );

  const tabsPanels = (
    <>
      {items.map((item, index) => {
        const value = getItemValue(item, index);
        const regionOptions = createTabRegionOptions(item, index);
        const bodyRegion =
          typeof item.bodyRegionKey === 'string' ? props.regions[item.bodyRegionKey] : undefined;
        const toolbarRegion =
          typeof item.toolbarRegionKey === 'string'
            ? props.regions[item.toolbarRegionKey]
            : undefined;
        const isActive = ownedAxis.value === value;
        const activatedOnce = activated.has(value);
        const keepMounted = resolveTabKeepMounted({
          mountOnEnter: item.mountOnEnter === true,
          unmountOnExit: item.unmountOnExit === true,
          isActive,
          activatedOnce,
        });
        return (
          <TabsContent
            key={value}
            value={value}
            keepMounted={keepMounted}
            data-slot="tabs-content"
            className={cn(schemaProps.contentClassName)}
          >
            {!keepMounted ? null : (
              <>
                {toolbarRegion ? (
                  <div data-slot="tabs-item-toolbar">
                    {asReactNode(toolbarRegion.render(regionOptions))}
                  </div>
                ) : null}
                {bodyRegion ? asReactNode(bodyRegion.render(regionOptions)) : null}
              </>
            )}
          </TabsContent>
        );
      })}
    </>
  );

  return (
    <section
      className={cn('nop-tabs', props.meta.className)}
      data-tabs-mode={tabsMode || undefined}
      data-tabs-sidebar-right={isSidebarRight ? '' : undefined}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {toolbarContent ? (
        <div data-slot="tabs-toolbar" className={cn(schemaProps.toolbarClassName)}>
          {asReactNode(toolbarContent)}
        </div>
      ) : null}
      <Tabs
        value={ownedAxis.value}
        onValueChange={(next) => {
          ownedAxis.setValue(String(next));
          const payload = createTabsChangePayload(items, String(next));
          void props.events.onChange?.(payload, {
            event: payload,
            evaluationBindings: payload,
            scope: props.node.scope,
          });
        }}
        orientation={orientation}
        data-slot="tabs-root"
        className={cn(isSidebarRight && 'flex-row-reverse')}
      >
        {tabsList}
        {isMobile && orientation === 'horizontal' ? (
          <div
            data-slot="tabs-panels-swipe"
            onTouchStart={(event) => {
              if (event.touches.length !== 1) return;
              const touch = event.touches[0]!;
              swipeStateRef.current = {
                startX: touch.clientX,
                startY: touch.clientY,
                tracking: true,
              };
            }}
            onTouchMove={(event) => {
              const touch = event.touches[0];
              if (touch) handleSwipeMove(touch.clientX, touch.clientY);
            }}
            onTouchEnd={(event) => {
              const touch = event.changedTouches[0];
              handleSwipeEnd(touch ? touch.clientX : swipeStateRef.current?.startX ?? 0);
            }}
          >
            {tabsPanels}
          </div>
        ) : (
          tabsPanels
        )}
      </Tabs>
    </section>
  );
}
