import React, { useCallback, useMemo } from 'react';
import { PlusIcon, GroupIcon } from 'lucide-react';
import { Button, cn } from '@nop-chaos/ui';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  ConditionBuilderSchema,
  ConditionConjunction,
  ConditionField,
  ConditionGroupValue,
  ConditionItemValue,
  ConditionOperatorOverrides,
  ConditionValueNode,
} from './types';
import { ConditionItem } from './ConditionItem';
import { genId } from './id-utils';
import { t } from './i18n';
import { computeUsedFields } from './utils';

interface ConditionGroupProps {
  value: ConditionGroupValue;
  schema: ConditionBuilderSchema;
  fields: ConditionField[];
  operatorsOverride?: ConditionOperatorOverrides;
  onChange: (value: ConditionGroupValue) => void;
  onRemove?: () => void;
  disabled?: boolean;
  depth: number;
}

export function ConditionGroup({
  value,
  schema,
  fields,
  operatorsOverride,
  onChange,
  onRemove,
  disabled,
  depth,
}: ConditionGroupProps) {
  const {
    builderMode = 'full',
    showAndOr = true,
    showNot = false,
    draggable = false,
    searchable = false,
    uniqueFields = false,
    maxDepth,
    maxItemsPerGroup,
    addConditionLabel = t('addCondition'),
    addGroupLabel = t('addGroup'),
    removeGroupLabel = t('removeGroup'),
  } = schema;

  const isSimple = builderMode === 'simple';
  const canNest = !isSimple && (maxDepth == null || depth < maxDepth);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleConjunctionChange = useCallback(
    (conjunction: ConditionConjunction) => {
      onChange({ ...value, conjunction });
    },
    [value, onChange],
  );

  const handleNotToggle = useCallback(() => {
    onChange({ ...value, not: !value.not });
  }, [value, onChange]);

  const handleChildChange = useCallback(
    (index: number, child: ConditionValueNode) => {
      const next = [...value.children];
      next[index] = child;
      onChange({ ...value, children: next });
    },
    [value, onChange],
  );

  const handleChildRemove = useCallback(
    (index: number) => {
      const next = value.children.filter((_, i) => i !== index);
      onChange({ ...value, children: next });
    },
    [value, onChange],
  );

  const handleAddCondition = useCallback(() => {
    const firstField = fields.find((f) => f.type !== 'group');
    const fieldName = firstField?.name ?? '';
    const defaultOp = firstField?.defaultOp ?? 'equal';
    const newItem: ConditionItemValue = {
      id: genId('item'),
      left: { type: 'field', field: fieldName },
      op: defaultOp,
      right: undefined,
    };
    onChange({ ...value, children: [...value.children, newItem] });
  }, [fields, value, onChange]);

  const handleAddGroup = useCallback(() => {
    const newGroup: ConditionGroupValue = {
      id: genId('group'),
      conjunction: 'and',
      children: [],
    };
    onChange({ ...value, children: [...value.children, newGroup] });
  }, [value, onChange]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const oldIndex = value.children.findIndex((c) => c.id === active.id);
      const newIndex = value.children.findIndex((c) => c.id === over.id);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const next = arrayMove(value.children, oldIndex, newIndex);
      onChange({ ...value, children: next });
    },
    [value, onChange],
  );

  const atMaxItems = maxItemsPerGroup != null && value.children.length >= maxItemsPerGroup;

  const conjunctionLabel = value.conjunction === 'and' ? t('and') : t('or');

  const childIds = useMemo(() => value.children.map((c) => c.id), [value.children]);

  const childrenList = draggable ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
        {value.children.length === 0 && (
          <div className="text-xs text-muted-foreground py-4 text-center">
            {schema.placeholder ?? t('placeholder')}
          </div>
        )}
        {value.children.map((child, index) =>
          'children' in child ? (
            <SortableItem key={child.id} id={child.id}>
              {() => (
                <ConditionGroup
                  value={child}
                  schema={schema}
                  fields={fields}
                  operatorsOverride={operatorsOverride}
                  onChange={(v) => handleChildChange(index, v)}
                  onRemove={() => handleChildRemove(index)}
                  disabled={disabled}
                  depth={depth + 1}
                />
              )}
            </SortableItem>
          ) : (
            <SortableItem key={child.id} id={child.id}>
              {(dragHandleProps) => (
                <ConditionItem
                  value={child}
                  fields={fields}
                  operatorsOverride={operatorsOverride}
                  onChange={(v) => handleChildChange(index, v)}
                  onRemove={() => handleChildRemove(index)}
                  disabled={disabled}
                  searchable={searchable}
                  usedFields={uniqueFields ? computeUsedFields(value.children, child.id) : undefined}
                  uniqueFields={uniqueFields}
                  draggable={draggable}
                  dragHandleProps={dragHandleProps}
                />
              )}
            </SortableItem>
          ),
        )}
      </SortableContext>
    </DndContext>
  ) : (
    <>
      {value.children.length === 0 && (
        <div className="text-xs text-muted-foreground py-4 text-center">
          {schema.placeholder ?? t('placeholder')}
        </div>
      )}
      {value.children.map((child, index) =>
        'children' in child ? (
          <ConditionGroup
            key={child.id}
            value={child}
            schema={schema}
            fields={fields}
            operatorsOverride={operatorsOverride}
            onChange={(v) => handleChildChange(index, v)}
            onRemove={() => handleChildRemove(index)}
            disabled={disabled}
            depth={depth + 1}
          />
        ) : (
          <ConditionItem
            key={child.id}
            value={child}
            fields={fields}
            operatorsOverride={operatorsOverride}
            onChange={(v) => handleChildChange(index, v)}
            onRemove={() => handleChildRemove(index)}
            disabled={disabled}
            searchable={searchable}
            usedFields={uniqueFields ? computeUsedFields(value.children, child.id) : undefined}
            uniqueFields={uniqueFields}
            draggable={draggable}
          />
        ),
      )}
    </>
  );

  return (
    <div data-slot="condition-group" className="flex flex-col gap-2">
      {depth === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('satisfyFollowing')}</span>
        </div>
      )}

      <div className="relative rounded-lg border border-border bg-card pl-0">
        {depth > 0 && onRemove && (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            className="absolute -right-2 -top-2 z-10 rounded-full text-muted-foreground hover:text-destructive hover:border-destructive shadow-sm"
            onClick={onRemove}
            title={removeGroupLabel}
          >
            ×
          </Button>
        )}

        {(showAndOr || showNot) && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/30 rounded-t-lg">
            {showAndOr && !isSimple ? (
              <div className="flex items-center rounded-full border border-border p-0.5 bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                    value.conjunction === 'and'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => handleConjunctionChange('and')}
                  disabled={disabled}
                >
                  {t('and')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
                    value.conjunction === 'or'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => handleConjunctionChange('or')}
                  disabled={disabled}
                >
                  {t('or')}
                </Button>
              </div>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                {conjunctionLabel}
              </span>
            )}

            {showNot && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className={cn(
                  'ml-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
                  value.not
                    ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-950 dark:text-orange-300'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
                onClick={handleNotToggle}
                disabled={disabled}
              >
                {value.not ? t('notActive') : t('not')}
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5 p-3">
          {childrenList}
        </div>

        {(!atMaxItems || canNest) && (
          <div className="flex items-center gap-1.5 px-3 pb-3">
            {!atMaxItems && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-xs text-muted-foreground hover:text-primary"
                onClick={handleAddCondition}
                disabled={disabled}
              >
                <PlusIcon className="size-3 mr-1" />
                {addConditionLabel}
              </Button>
            )}
            {canNest && !atMaxItems && (
              <span className="text-muted-foreground/40 text-xs">|</span>
            )}
            {canNest && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-xs text-muted-foreground hover:text-primary"
                onClick={handleAddGroup}
                disabled={disabled}
              >
                <GroupIcon className="size-3 mr-1" />
                {addGroupLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableItem({ id, children }: { id: string; children: (dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners ?? {})}
    </div>
  );
}
