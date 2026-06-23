import React, { useEffect, useState } from 'react';
import type { InstanceFrame, RendererComponentProps, RendererRenderOutput, ScopeRef } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useRenderInstancePath,
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { ListSchema, ListSelectionMode } from './schemas.js';

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
}

function ListItemView(props: ListItemViewProps) {
  const { owner, item, index, itemKey, instancePath, selectionMode, selected, onSelect } = props;
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
        'min-w-0 px-3 py-2 text-sm transition-colors',
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

  const handleSelect = (key: string) => {
    if (selectionMode === 'none') {
      return;
    }

    const prev = selectedKeys;
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

  return (
    <div
      className={cn(
        'nop-list divide-y divide-border overflow-hidden rounded-md border border-border',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="list-root"
      role="list"
    >
      {items.map((item, index) => {
        const itemKey = toListItemKey(item, keyField, index);
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
            selected={selectedKeys.has(itemKey)}
            onSelect={handleSelect}
          />
        );
      })}
    </div>
  );
}
