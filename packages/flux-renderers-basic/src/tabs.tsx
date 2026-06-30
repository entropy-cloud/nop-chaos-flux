import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ComponentHandle,
  RendererComponentProps,
  TabsStatusSummary,
} from '@nop-chaos/flux-core';
import {
  resolveRendererSlotContent,
  unwrapBooleanLiteral,
  useCurrentComponentRegistry,
  useSchemaProps,
} from '@nop-chaos/flux-react';
import {
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
  resolveLucideIcon,
  useIsMobile,
} from '@nop-chaos/ui';
import type { TabsItemSchema, TabsSchema } from './schemas.js';
import { useOwnedAxisValue } from './interaction-owner.js';
import { useStatusPathPublication } from './status-hooks.js';
import { asReactNode } from './utils.js';

const EMPTY_ITEMS: TabsItemSchema[] = [];

const TABS_SWIPE_THRESHOLD = 50;
const TABS_SWIPE_DIRECTION_THRESHOLD = 10;

function isTabDisabled(input: unknown): boolean {
  return unwrapBooleanLiteral(input);
}

function getItemValue(item: TabsItemSchema, index: number): string {
  const candidate = item.value ?? item.key;
  return String(candidate ?? index);
}

// design.md §10 candidate-fix: when the active value vanishes from `items`,
// correct it instead of leaving a stale value (which would render no panel).
// Rule: keep → nearest-right (item now at the removed index) → nearest-left
// (previous item) → empty. Returns `undefined` when no correction is needed
// (active value still present, or items empty with no candidate). This is the
// trigger+idempotency guard: once corrected, the value matches `items` and the
// effect no longer writes back.
function resolveCandidateValue(
  items: TabsItemSchema[],
  currentValue: string,
  prevItems: TabsItemSchema[],
): string | undefined {
  if (items.some((item, index) => getItemValue(item, index) === currentValue)) {
    return undefined;
  }

  const prevIndex = prevItems.findIndex(
    (item, index) => getItemValue(item, index) === currentValue,
  );

  if (prevIndex >= 0) {
    if (prevIndex < items.length) {
      return getItemValue(items[prevIndex]!, prevIndex);
    }
    if (items.length > 0) {
      return getItemValue(items[items.length - 1]!, items.length - 1);
    }
    return undefined;
  }

  if (items.length > 0) {
    return getItemValue(items[0]!, 0);
  }

  return undefined;
}

function resolveTabsVariant(tabsMode?: string): 'default' | 'line' {
  if (tabsMode === 'line' || tabsMode === 'simple' || tabsMode === 'strong') return 'line';
  return 'default';
}

function resolveTabsOrientation(
  tabsMode?: string,
  fallback?: 'horizontal' | 'vertical',
): 'horizontal' | 'vertical' {
  if (tabsMode === 'vertical' || tabsMode === 'sidebar') return 'vertical';
  return fallback ?? 'horizontal';
}

function createTabRegionOptions(item: TabsItemSchema, index: number) {
  const value = getItemValue(item, index);
  return {
    bindings: {
      item,
      index,
      key: value,
    },
    pathSuffix: `items.${index}`,
    scopeKey: `tabs:item:${value}`,
  };
}

function createTabsChangePayload(items: TabsItemSchema[], nextValue: string) {
  const nextIndex = items.findIndex((item, index) => getItemValue(item, index) === nextValue);
  return {
    type: 'change',
    value: nextValue,
    activeValue: nextValue,
    index: nextIndex,
    activeIndex: nextIndex,
    item: nextIndex >= 0 ? items[nextIndex] : undefined,
  };
}

function resolveTabBadge(badge: TabsItemSchema['badge']): React.ReactNode {
  if (badge === undefined || badge === null) {
    return null;
  }
  return <Badge variant="default">{String(badge)}</Badge>;
}

function resolveTabIcon(icon: TabsItemSchema['icon']): React.ReactNode {
  if (typeof icon !== 'string' || icon.length === 0) {
    return null;
  }
  const IconComp = resolveLucideIcon(icon) as React.ComponentType<Record<string, unknown>>;
  return <IconComp size={14} strokeWidth={1.8} aria-hidden="true" focusable="false" />;
}

function resolveTabKeepMounted(input: {
  mountOnEnter: boolean;
  unmountOnExit: boolean;
  isActive: boolean;
  activatedOnce: boolean;
}): boolean {
  const { mountOnEnter, unmountOnExit, isActive, activatedOnce } = input;
  if (mountOnEnter) {
    if (!activatedOnce) {
      return false;
    }
    if (unmountOnExit && !isActive) {
      return false;
    }
    return true;
  }
  if (unmountOnExit && !isActive) {
    return false;
  }
  return true;
}

export function TabsRenderer(props: RendererComponentProps<TabsSchema>) {
  const componentRegistry = useCurrentComponentRegistry();
  const schemaProps = useSchemaProps(props);
  const items = Array.isArray(schemaProps.items) ? schemaProps.items : EMPTY_ITEMS;
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

  const tabsHandle = useMemo<ComponentHandle>(
    () => ({
      id: props.id,
      type: 'tabs',
      capabilities: {
        invoke(method, payload) {
          switch (method) {
            case 'setValue':
              ownedAxis.setValue(String(payload?.value ?? firstValue));
              return { ok: true, data: payload?.value };
            case 'getValue':
              return { ok: true, data: ownedAxis.value };
            default:
              return { ok: false, error: new Error(`Unsupported tabs method: ${method}`) };
          }
        },
        hasMethod(method) {
          return method === 'setValue' || method === 'getValue';
        },
        listMethods() {
          return ['setValue', 'getValue'];
        },
        getDebugData() {
          return {
            activeValue: summary.activeValue,
            activeIndex: summary.activeIndex,
            itemCount: summary.itemCount,
          };
        },
      },
    }),
    [firstValue, ownedAxis, props.id, summary],
  );

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }

    return componentRegistry.register(tabsHandle, {
      cid: props.meta.cid,
    });
  }, [componentRegistry, props.meta.cid, tabsHandle]);

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
        return (
          <TabsTrigger key={value} value={value} disabled={isTabDisabled(item.disabled)}>
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
          </TabsTrigger>
        );
      })}
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
            {toolbarRegion ? (
              <div data-slot="tabs-item-toolbar">
                {asReactNode(toolbarRegion.render(regionOptions))}
              </div>
            ) : null}
            {bodyRegion ? asReactNode(bodyRegion.render(regionOptions)) : null}
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
