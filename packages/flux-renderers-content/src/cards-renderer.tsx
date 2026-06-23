import React, { useEffect, useState } from 'react';
import type {
  InstanceFrame,
  RendererComponentProps,
  RendererRenderOutput,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useRenderInstancePath,
} from '@nop-chaos/flux-react';
import { Card, CardContent, cn } from '@nop-chaos/ui';
import type { CardsSchema, CardsSelectionMode } from './schemas.js';

const DEFAULT_CARDS_KEY_FIELD = 'id';
const EMPTY_SET: ReadonlySet<string> = new Set();

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

function toCardsItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toCardKey(item: unknown, keyField: string, index: number): string {
  const explicit =
    item !== null && typeof item === 'object' ? getIn(item as Record<string, unknown>, keyField) : undefined;
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    return String(explicit);
  }
  return `card:${index}`;
}

function resolveSelectionMode(value: unknown): CardsSelectionMode {
  return value === 'single' || value === 'multiple' ? value : 'none';
}

function createCardsRepeatedTemplateId(ownerId: string): string {
  return `cards-item:${ownerId}`;
}

interface CardItemViewProps {
  owner: RendererComponentProps<CardsSchema>;
  item: unknown;
  index: number;
  itemKey: string;
  instancePath: readonly InstanceFrame[];
  selectionMode: CardsSelectionMode;
  selected: boolean;
  onSelect: (key: string) => void;
}

function CardItemView(props: CardItemViewProps) {
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

  const content = owner.regions.card
    ? asReactNode(
        owner.regions.card.render({
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
      { type: 'cards:item-click', item, index, key: itemKey },
      { scope: itemScope },
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect(itemKey);
    void owner.events.onItemClick?.(
      { type: 'cards:item-click', item, index, key: itemKey },
      { scope: itemScope },
    );
  };

  return (
    <Card
      data-slot="cards-item"
      data-item-key={itemKey}
      data-selected={selected || undefined}
      role="listitem"
      aria-selected={selectionMode !== 'none' ? selected : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      className={cn(
        'transition-colors',
        interactive
          ? 'cursor-pointer hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          : null,
        selected ? 'border-primary ring-2 ring-primary/40' : null,
      )}
    >
      <CardContent>{content}</CardContent>
    </Card>
  );
}

export function CardsRenderer(props: RendererComponentProps<CardsSchema>) {
  const schemaProps = props.props;
  const items = toCardsItems(schemaProps.items);
  const selectionMode = resolveSelectionMode(schemaProps.selectionMode);
  const keyField =
    typeof schemaProps.keyField === 'string' && schemaProps.keyField
      ? schemaProps.keyField
      : DEFAULT_CARDS_KEY_FIELD;
  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });
  const parentInstancePath = useRenderInstancePath();
  const repeatedTemplateId = createCardsRepeatedTemplateId(props.id);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(() => EMPTY_SET);

  const handleSelect = (key: string) => {
    if (selectionMode === 'none') return;
    const prev = selectedKeys;
    let next: Set<string>;
    if (selectionMode === 'single') {
      next = prev.has(key) ? new Set<string>() : new Set<string>([key]);
    } else {
      next = new Set<string>(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
    }
    setSelectedKeys(next);
    const payload = {
      type: 'cards:selection-change',
      selectedKeys: Array.from(next),
      selectionMode,
    };
    void props.events.onSelectionChange?.(payload, { scope: props.node.scope });
  };

  if (items.length === 0) {
    return (
      <div
        className={cn('nop-cards', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="cards-root"
        data-empty="true"
        role="list"
      >
        {hasRendererSlotContent(emptyContent) ? (
          <div data-slot="cards-empty" className="text-sm text-muted-foreground">
            {emptyContent}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn('nop-cards grid gap-3 sm:grid-cols-2 lg:grid-cols-3', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="cards-root"
      role="list"
    >
      {items.map((item, index) => {
        const itemKey = toCardKey(item, keyField, index);
        const instancePath: InstanceFrame[] = [
          ...(parentInstancePath ?? []),
          { repeatedTemplateId, instanceKey: itemKey },
        ];
        return (
          <CardItemView
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
