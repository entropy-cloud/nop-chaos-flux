import React, { startTransition, useMemo, useState } from 'react';
import { getIn, type RendererComponentProps, type RendererRenderOutput } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector, unwrapBooleanLiteral } from '@nop-chaos/flux-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from '@nop-chaos/ui';
import { ChevronDownIcon } from 'lucide-react';
import type { CollapseItemSchema, CollapseSchema } from './schemas.js';

type CompiledCollapseItem = CollapseItemSchema & {
  titleRegionKey?: string;
  bodyRegionKey?: string;
};

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

function resolveItemKey(item: CompiledCollapseItem, index: number): string {
  if (item.key !== undefined && item.key !== null && item.key !== '') {
    return String(item.key);
  }
  return String(index);
}

function isItemDisabled(item: CompiledCollapseItem): boolean {
  return unwrapBooleanLiteral(item.disabled);
}

function toKeyArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (value !== undefined && value !== null) {
    return [String(value)];
  }
  return [];
}

const UNUSED: unique symbol = Symbol('unused');

function useCollapseValue(props: RendererComponentProps<CollapseSchema>) {
  const schemaProps = props.props;
  const ownership = (schemaProps.valueOwnership as string) ?? 'local';
  const statePath =
    typeof schemaProps.valueStatePath === 'string' ? schemaProps.valueStatePath : undefined;
  const multiple = schemaProps.multiple !== false;
  const renderScope = useRenderScope();

  const scopeValue = useScopeSelector(
    ownership === 'scope' && statePath
      ? (scopeData) => getIn(scopeData, statePath) as unknown
      : () => UNUSED as unknown,
    Object.is,
    {
      enabled: ownership === 'scope' && Boolean(statePath),
      fallback: undefined,
      paths: ownership === 'scope' && statePath ? [statePath] : undefined,
    },
  );

  const effectiveScopeValue = scopeValue === (UNUSED as unknown) ? undefined : scopeValue;

  const computeInitial = (): string[] => {
    const source =
      ownership === 'controlled'
        ? schemaProps.value
        : ownership === 'scope'
          ? effectiveScopeValue ?? schemaProps.value ?? schemaProps.defaultValue
          : schemaProps.defaultValue ?? schemaProps.value;
    return toKeyArray(source);
  };

  const [localExpanded, setLocalExpanded] = useState<string[]>(computeInitial);

  const expanded =
    ownership === 'controlled'
      ? toKeyArray(schemaProps.value)
      : ownership === 'scope'
        ? toKeyArray(effectiveScopeValue ?? schemaProps.value ?? localExpanded)
        : localExpanded;

  const expandedSet = useMemo(() => new Set(expanded), [expanded]);

  const setExpanded = (next: string[]) => {
    if (ownership === 'local') {
      setLocalExpanded(next);
    } else if (ownership === 'scope' && statePath) {
      startTransition(() => {
        renderScope.update(statePath, multiple ? next : (next[0] ?? null));
      });
      setLocalExpanded(next);
    }
  };

  const toggleKey = (key: string): string[] => {
    const has = expandedSet.has(key);
    if (multiple) {
      return has ? expanded.filter((k) => k !== key) : [...expanded, key];
    }
    return has ? [] : [key];
  };

  return { ownership, multiple, expanded, expandedSet, toggleKey, setExpanded };
}

export function CollapseRenderer(props: RendererComponentProps<CollapseSchema>) {
  const schemaProps = props.props;
  const rawItems = Array.isArray(schemaProps.items)
    ? (schemaProps.items as unknown as CompiledCollapseItem[])
    : [];
  const collapsible = schemaProps.collapsible !== false;
  const { multiple, expandedSet, toggleKey, setExpanded } = useCollapseValue(props);

  const handleToggle = (key: string, disabled: boolean) => {
    if (disabled) return;
    if (!collapsible && expandedSet.has(key)) return;
    const next = toggleKey(key);
    setExpanded(next);
    const payload = {
      type: 'collapse:change',
      value: multiple ? next : (next[0] ?? null),
      expandedKeys: next,
      multiple,
    };
    void props.events.onChange?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
  };

  return (
    <div
      className={cn('nop-collapse', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="collapse-root"
      data-multiple={multiple ? 'true' : 'false'}
    >
      {rawItems.map((item, index) => {
        const key = resolveItemKey(item, index);
        const isOpen = expandedSet.has(key);
        const disabled = isItemDisabled(item);

        const titleRegion =
          typeof item.titleRegionKey === 'string' ? props.regions[item.titleRegionKey] : undefined;
        const titleContent = titleRegion ? asReactNode(titleRegion.render()) : null;
        const titleText =
          titleContent ??
          (typeof item.title === 'string' ? item.title : null) ??
          key;

        const bodyRegion =
          typeof item.bodyRegionKey === 'string' ? props.regions[item.bodyRegionKey] : undefined;
        const bodyContent = bodyRegion ? asReactNode(bodyRegion.render()) : null;

        return (
          <Collapsible
            key={key}
            open={isOpen}
            data-slot="collapse-item"
            data-item-index={index}
            data-item-key={key}
            data-open={isOpen || undefined}
            data-disabled={disabled || undefined}
          >
            <CollapsibleTrigger
              data-slot="collapse-trigger"
              disabled={disabled}
              onClick={() => handleToggle(key, disabled)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted',
                isOpen && 'bg-muted',
              )}
            >
              <span data-slot="collapse-trigger-label">{titleText}</span>
              <ChevronDownIcon
                data-slot="collapse-trigger-icon"
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180',
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent data-slot="collapse-content">
              <div className="px-4 py-3 text-sm">{bodyContent}</div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
