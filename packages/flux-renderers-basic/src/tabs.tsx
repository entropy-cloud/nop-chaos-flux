import React, { useEffect, useMemo } from 'react';
import type { ComponentHandle, RendererComponentProps, TabsStatusSummary } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import { Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@nop-chaos/ui';
import type { TabsItemSchema, TabsSchema } from './schemas';
import { useOwnedAxisValue } from './interaction-owner';
import { useStatusPathPublication } from './status-hooks';

const EMPTY_ITEMS: TabsItemSchema[] = [];

function getItemValue(item: TabsItemSchema, index: number): string {
  const candidate = item.value ?? item.key;
  return String(candidate ?? index);
}

export function TabsRenderer(props: RendererComponentProps<TabsSchema>) {
  const componentRegistry = useCurrentComponentRegistry();
  const schemaProps = props.props as unknown as TabsSchema;
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

  return (
    <section className={cn('nop-tabs', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {toolbarContent ? <div data-slot="tabs-toolbar">{toolbarContent}</div> : null}
      <Tabs value={ownedAxis.value} onValueChange={(next) => {
        ownedAxis.setValue(String(next));
        const nextIndex = items.findIndex((item, index) => getItemValue(item, index) === String(next));
        void props.events.onChange?.(null, {
          scope: props.helpers.createScope({ value: next, index: nextIndex }, { scopeKey: 'tabs', pathSuffix: 'tabs' })
        });
      }} orientation={schemaProps.orientation ?? 'horizontal'} className="nop-tabs-root">
        <TabsList variant={schemaProps.variant ?? 'default'}>
          {items.map((item, index) => {
            const value = getItemValue(item, index);
            const titleRegion = typeof item.titleRegionKey === 'string' ? props.regions[item.titleRegionKey] : undefined;
            const titleContent = titleRegion?.instantiate({ }) ?? item.title ?? item.label ?? value;
            return (
              <TabsTrigger key={value} value={value} disabled={Boolean(item.disabled)}>
                {titleContent}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {items.map((item, index) => {
          const value = getItemValue(item, index);
          const bodyRegion = typeof item.bodyRegionKey === 'string' ? props.regions[item.bodyRegionKey] : undefined;
          const toolbarRegion = typeof item.toolbarRegionKey === 'string' ? props.regions[item.toolbarRegionKey] : undefined;
          return (
            <TabsContent key={value} value={value} className="nop-tabs-content">
              {toolbarRegion ? <div data-slot="tabs-item-toolbar">{toolbarRegion.instantiate()}</div> : null}
              {bodyRegion ? bodyRegion.instantiate() : null}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
