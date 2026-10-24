import React, { useEffect, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@nop-chaos/ui';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { getOptionRowStateAttributes } from '@nop-chaos/flux-react';
import { asReactNode, type ListOwner, type ListItemOptionRowState } from './list-renderer.js';
import type { ListSelectionMode } from './schemas.js';
import type { ListReorderHandleProps } from './list-reorder.js';

// Uncompiled-host locality (H10 precedent in table-data-row-render): without
// this memo a selection click re-rendered every mounted item. instancePath is
// deliberately excluded — it is derived from (parentInstancePath, itemKey), and
// itemKey is compared directly.
export const ListItemView = React.memo(
  React.forwardRef<HTMLDivElement, ListItemViewProps>(function ListItemView(props, rowRef) {
    return <ListItemViewBase {...props} rowRef={rowRef} />;
  }),
  (prev, next) => {
  // G6: reorder handle identity changes when drag state or the underlying
  // collection changes — the comparator must not memo it away.
  const reorderEqual =
    prev.reorder === next.reorder ||
    (prev.reorder !== undefined &&
      next.reorder !== undefined &&
      prev.reorder.dragging === next.reorder.dragging &&
      prev.reorder.over === next.reorder.over &&
      prev.reorder.handleProps === next.reorder.handleProps);
  if (!reorderEqual) {
    return false;
  }
  return (
  prev.item === next.item &&
  prev.index === next.index &&
  prev.itemKey === next.itemKey &&
  prev.selectionMode === next.selectionMode &&
  prev.selected === next.selected &&
  prev.isLast === next.isLast &&
  prev.isMobile === next.isMobile &&
  prev.onSelect === next.onSelect &&
  prev.owner.helpers === next.owner.helpers &&
  prev.owner.regions === next.owner.regions &&
  prev.optionRow === next.optionRow ||
  (
    prev.item === next.item &&
    prev.index === next.index &&
    prev.itemKey === next.itemKey &&
    prev.selectionMode === next.selectionMode &&
    prev.selected === next.selected &&
    prev.isLast === next.isLast &&
    prev.isMobile === next.isMobile &&
    prev.onSelect === next.onSelect &&
    prev.owner.helpers === next.owner.helpers &&
    prev.owner.regions === next.owner.regions &&
    prev.optionRow !== undefined &&
    next.optionRow !== undefined &&
    prev.optionRow.selected === next.optionRow.selected &&
    prev.optionRow.disabled === next.optionRow.disabled &&
    prev.optionRow.selectedClass === next.optionRow.selectedClass
    )
  );
  },
);

interface ListItemViewProps {
  owner: ListOwner;
  item: unknown;
  index: number;
  itemKey: string;
  instancePath: readonly { repeatedTemplateId: string; instanceKey: string }[];
  selectionMode: ListSelectionMode;
  selected: boolean;
  onSelect: (key: string) => void;
  isLast: boolean;
  isMobile: boolean;
  /** D1 option-row contract; undefined = not declared (legacy output). */
  optionRow?: ListItemOptionRowState;
  /** G6 reorder contract; undefined = reorder disabled (zero handle DOM). */
  reorder?: {
    handleProps: ListReorderHandleProps;
    dragging: boolean;
    over: boolean;
  };
}

function ListItemViewBase(props: ListItemViewProps & { rowRef?: React.Ref<HTMLDivElement> }) {
  const { owner, item, index, itemKey, instancePath, selectionMode, selected, onSelect, isLast, isMobile, optionRow, reorder, rowRef } = props;
  const helpers = owner.helpers;
  const [itemScope] = useState<ScopeRef>(() => helpers.createScope({ item, index }));

  const optionRowActive = optionRow !== undefined;
  const optionRowState = optionRowActive
    ? getOptionRowStateAttributes({ selected: optionRow.selected, disabled: optionRow.disabled })
    : undefined;

  useEffect(() => {
    itemScope.merge({ item, index });
  }, [itemScope, item, index]);

  useEffect(() => {
    return () => {
      helpers.disposeScope(itemScope.id);
    };
  }, [helpers, itemScope.id]);

  const reorderHandle = reorder ? (
    <span
      {...reorder.handleProps}
      className="mr-2 inline-flex shrink-0 cursor-grab items-center text-muted-foreground"
    >
      <GripVertical size={14} aria-hidden="true" focusable="false" />
    </span>
  ) : null;

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
    // CX-10 / bug-83 family convention: the second dispatch arg carries
    // { event, evaluationBindings, scope } so action args templates can read
    // payload keys (${item} / ${index} / ${key}) as bare bindings.
    const payload = { type: 'list:item-click', item, index, key: itemKey };
    void owner.events.onItemClick?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: itemScope,
    });
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
    const payload = { type: 'list:item-click', item, index, key: itemKey };
    void owner.events.onItemClick?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: itemScope,
    });
  };

  return (
    <div
      ref={rowRef}
      data-index={index}
      data-slot="list-item"
      data-item-key={itemKey}
      data-dragging={reorder?.dragging ? 'true' : undefined}
      data-drag-over={reorder?.over ? 'true' : undefined}
      data-option-row={optionRowActive ? 'true' : undefined}
      data-state={optionRowState?.['data-state']}
      data-selected={selected || undefined}
      role="listitem"
      aria-selected={optionRowState?.['aria-selected']}
      aria-disabled={optionRowState?.['aria-disabled']}
      aria-current={selectionMode !== 'none' ? (selected ? 'true' : undefined) : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        'min-w-0 px-3 text-sm transition-colors',
        isMobile ? 'py-3' : 'py-2',
        // Inter-item divider migrated from root `divide-y divide-border` to the M0.1
        // `nop-hairline` 0.5px hairline (last item omits the bottom edge).
        !isLast ? 'nop-hairline nop-hairline-bottom' : null,
        interactive ? 'cursor-pointer hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none' : null,
        selected ? 'bg-primary/10' : null,
        optionRowActive && selected ? optionRow?.selectedClass : null,
      )}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      {reorderHandle}
      {content}
    </div>
  );
}

