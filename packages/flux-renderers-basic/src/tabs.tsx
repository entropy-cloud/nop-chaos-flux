import React, { useEffect, useMemo } from 'react';
import type { ComponentHandle, RendererComponentProps, TabsStatusSummary } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, useCurrentComponentRegistry, useSchemaProps } from '@nop-chaos/flux-react';
import { Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@nop-chaos/ui';
import type { TabsItemSchema, TabsSchema } from './schemas';
import { useOwnedAxisValue } from './interaction-owner';
import { useStatusPathPublication } from './status-hooks';

const EMPTY_ITEMS: TabsItemSchema[] = [];

function getItemValue(item: TabsItemSchema, index: number): string {
  const candidate = item.value ?? item.key;
  return String(candidate ?? index);
}

function resolveTabsVariant(tabsMode?: string): 'default' | 'line' {
  if (tabsMode === 'line' || tabsMode === 'simple' || tabsMode === 'strong') return 'line';
  return 'default';
}

function resolveTabsOrientation(tabsMode?: string, fallback?: 'horizontal' | 'vertical'): 'horizontal' | 'vertical' {
  if (tabsMode === 'vertical' || tabsMode === 'sidebar') return 'vertical';
  return fallback ?? 'horizontal';
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

  const tabsMode = schemaProps.tabsMode ?? '';
  const sidePosition = schemaProps.sidePosition ?? 'left';
  const isSidebarRight = tabsMode === 'sidebar' && sidePosition === 'right';
  const orientation = resolveTabsOrientation(tabsMode, schemaProps.orientation);
  const variant = resolveTabsVariant(tabsMode);

  const activeIndex = Math.max(0, items.findIndex((item, index) => getItemValue(item, index) === ownedAxis.value));
  const summary = useMemo<TabsStatusSummary>(() => ({
    activeValue: ownedAxis.value,
    activeIndex,
    itemCount: items.length,
  }), [activeIndex, items.length, ownedAxis.value]);

  useStatusPathPublication(props.node.scope.parent ?? props.node.scope, typeof schemaProps.statusPath === 'string' ? schemaProps.statusPath : undefined, summary);

  const tabsHandle = useMemo<ComponentHandle>(() => ({
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
      }
    }
  }), [firstValue, ownedAxis, props.id, summary]);

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }

    return componentRegistry.register(tabsHandle, {
      cid: props.meta.cid
    });
  }, [componentRegistry, props.meta.cid, tabsHandle]);

  const tabsList = (
    <TabsList variant={schemaProps.variant ?? variant}>
      {items.map((item, index) => {
        const value = getItemValue(item, index);
        const titleRegion = typeof item.titleRegionKey === 'string' ? props.regions[item.titleRegionKey] : undefined;
        const titleContent = titleRegion?.render() ?? item.title ?? item.label ?? value;
        return (
          <TabsTrigger key={value} value={value} disabled={Boolean(item.disabled)}>
            {titleContent}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );

  const tabsPanels = (
    <>
      {items.map((item, index) => {
        const value = getItemValue(item, index);
        const bodyRegion = typeof item.bodyRegionKey === 'string' ? props.regions[item.bodyRegionKey] : undefined;
        const toolbarRegion = typeof item.toolbarRegionKey === 'string' ? props.regions[item.toolbarRegionKey] : undefined;
        return (
          <TabsContent key={value} value={value} data-slot="tabs-content" className={cn(schemaProps.contentClassName)}>
            {toolbarRegion ? <div data-slot="tabs-item-toolbar">{toolbarRegion.render()}</div> : null}
            {bodyRegion ? bodyRegion.render() : null}
          </TabsContent>
        );
      })}
    </>
  );

  return (
    <section
      className={cn(
        'nop-tabs',
        tabsMode ? `nop-tabs--${tabsMode}` : undefined,
        isSidebarRight ? 'nop-tabs--sidebar-right' : undefined,
        props.meta.className
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {toolbarContent ? <div data-slot="tabs-toolbar" className={cn(schemaProps.toolbarClassName)}>{toolbarContent}</div> : null}
      <Tabs
        value={ownedAxis.value}
        onValueChange={(next) => {
          ownedAxis.setValue(String(next));
          const nextIndex = items.findIndex((item, index) => getItemValue(item, index) === String(next));
          void props.events.onChange?.(null, {
            scope: props.helpers.createScope({ value: next, index: nextIndex }, { scopeKey: 'tabs', pathSuffix: 'tabs' })
          });
        }}
        orientation={orientation}
        data-slot="tabs-root"
        className={cn(isSidebarRight && 'flex-row-reverse')}
      >
        {tabsList}
        {tabsPanels}
      </Tabs>
    </section>
  );
}
