import React, { useCallback, useMemo } from 'react';
import type { BaseSchema, FormRuntime, ScopeRef, ValidationScopeRuntime } from '@nop-chaos/flux-core';
import { PlusIcon, GroupIcon, Trash2Icon } from 'lucide-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn, Input } from '@nop-chaos/ui';
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
  BaseConditionField,
  ConditionBuilderSchema,
  ConditionConjunction,
  ConditionField,
  ConditionFormulaConfig,
  ConditionGroupValue,
  ConditionItemValue,
  ConditionOperatorOverrides,
  ConditionValueNode,
} from './types.js';
import { ConditionItem } from './condition-item.js';
import { genId } from './id-utils.js';
import { resolveDefaultOp } from './operators.js';
import { computeUsedFields } from './utils.js';
import { WrappedFieldAction } from '../wrapped-field-action.js';
import type { EvaluateConditionFormula } from './condition-builder.js';

interface ConditionGroupProps {
  value: ConditionGroupValue;
  schema: ConditionBuilderSchema;
  fields: ConditionField[];
  operatorsOverride?: ConditionOperatorOverrides;
  onChange: (value: ConditionGroupValue) => void;
  onRemove?: () => void;
  disabled?: boolean;
  depth: number;
  formulas?: ConditionFormulaConfig;
  formulaForIf?: ConditionFormulaConfig;
  evaluateFormula?: EvaluateConditionFormula;
  renderCustomSchema?: (schema: BaseSchema, options: RenderCustomSchemaOptions) => React.ReactNode;
  projectedFormFactory?: (item: ConditionItemValue) => FormRuntime | undefined;
  projectedScopeFactory?: (item: ConditionItemValue) => ScopeRef;
  projectedValidationFactory?: (item: ConditionItemValue) => ValidationScopeRuntime | undefined;
}

interface RenderCustomSchemaOptions {
  field: Extract<ConditionField, { type: 'custom' }>;
  op: string;
  value: unknown;
  disabled?: boolean;
  scope: ScopeRef;
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
  formulas,
  formulaForIf,
  evaluateFormula,
  renderCustomSchema,
  projectedFormFactory,
  projectedScopeFactory,
  projectedValidationFactory,
}: ConditionGroupProps) {
  const {
    builderMode = 'full',
    showAndOr = true,
    showNot = false,
    showIf = false,
    draggable = false,
    searchable = false,
    uniqueFields = false,
    maxDepth,
    maxItemsPerGroup,
    addConditionLabel = t('conditionBuilder.addCondition'),
    addGroupLabel = t('conditionBuilder.addGroup'),
    removeGroupLabel = t('conditionBuilder.removeGroup'),
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

  const handleIfChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      onChange({ ...value, if: next === '' ? undefined : next });
    },
    [value, onChange],
  );

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
    const fieldType = firstField?.type ?? 'text';
    const defaultOp = resolveDefaultOp(
      fieldType,
      (firstField as BaseConditionField | undefined)?.defaultOp,
      operatorsOverride,
    );
    const formulaSeed = formulas?.enabled && formulas.formula ? formulas.formula : undefined;
    const newItem: ConditionItemValue = {
      id: genId('item'),
      left: { type: 'field', field: fieldName },
      op: defaultOp,
      right: formulaSeed,
    };
    onChange({ ...value, children: [...value.children, newItem] });
  }, [fields, onChange, operatorsOverride, value, formulas]);

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

  const conjunctionLabel =
    value.conjunction === 'and' ? t('conditionBuilder.and') : t('conditionBuilder.or');

  const childIds = useMemo(() => value.children.map((c) => c.id), [value.children]);

  const childrenList = draggable ? (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
        {value.children.length === 0 && (
          <div className="text-xs text-muted-foreground py-4 text-center">
            {schema.placeholder ?? t('conditionBuilder.placeholder')}
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
                  formulas={formulas}
                  formulaForIf={formulaForIf}
                  evaluateFormula={evaluateFormula}
                  renderCustomSchema={renderCustomSchema}
                  projectedFormFactory={projectedFormFactory}
                  projectedScopeFactory={projectedScopeFactory}
                  projectedValidationFactory={projectedValidationFactory}
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
                  usedFields={
                    uniqueFields ? computeUsedFields(value.children, child.id) : undefined
                  }
                  uniqueFields={uniqueFields}
                  draggable={draggable}
                  dragHandleProps={dragHandleProps}
                  formulas={formulas}
                  evaluateFormula={evaluateFormula}
                  renderCustomSchema={renderCustomSchema}
                  projectedForm={projectedFormFactory?.(child)}
                  projectedScope={projectedScopeFactory?.(child)}
                  projectedValidationOwner={projectedValidationFactory?.(child)}
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
          {schema.placeholder ?? t('conditionBuilder.placeholder')}
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
              formulas={formulas}
              formulaForIf={formulaForIf}
              evaluateFormula={evaluateFormula}
              renderCustomSchema={renderCustomSchema}
              projectedFormFactory={projectedFormFactory}
              projectedScopeFactory={projectedScopeFactory}
              projectedValidationFactory={projectedValidationFactory}
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
              formulas={formulas}
              evaluateFormula={evaluateFormula}
              renderCustomSchema={renderCustomSchema}
              projectedForm={projectedFormFactory?.(child)}
              projectedScope={projectedScopeFactory?.(child)}
              projectedValidationOwner={projectedValidationFactory?.(child)}
            />
          ),
        )}
    </>
  );

  return (
    <div
      data-slot="condition-group"
      className="flex flex-col gap-2"
      role="group"
      aria-label={depth === 0 ? t('conditionBuilder.satisfyFollowing') : `${t('conditionBuilder.satisfyFollowing')} ${depth + 1}`}
    >
      {depth === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t('conditionBuilder.satisfyFollowing')}</span>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card pl-0">
        {(showAndOr || showNot || showIf || (depth > 0 && onRemove && !disabled)) && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/30 rounded-t-lg">
            {showAndOr && !isSimple ? (
              <div className="flex items-center rounded-full border border-border p-0.5 bg-background">
                <WrappedFieldAction
                  variant="ghost"
                  size="xs"
                  aria-pressed={value.conjunction === 'and'}
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium transition-none',
                    value.conjunction === 'and'
                      ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => handleConjunctionChange('and')}
                  disabled={disabled}
                >
                  {t('conditionBuilder.and')}
                </WrappedFieldAction>
                <WrappedFieldAction
                  variant="ghost"
                  size="xs"
                  aria-pressed={value.conjunction === 'or'}
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium transition-none',
                    value.conjunction === 'or'
                      ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => handleConjunctionChange('or')}
                  disabled={disabled}
                >
                  {t('conditionBuilder.or')}
                </WrappedFieldAction>
              </div>
            ) : showAndOr ? (
              <span className="text-xs font-medium text-muted-foreground">{conjunctionLabel}</span>
            ) : null}

            {showNot && (
              <WrappedFieldAction
                variant="ghost"
                size="xs"
                aria-pressed={value.not}
                className={cn(
                  'ml-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
                  value.not
                    ? 'border-warning bg-warning/10 text-warning dark:border-warning dark:bg-warning/10 dark:text-warning'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
                onClick={handleNotToggle}
                disabled={disabled}
              >
                {value.not ? t('conditionBuilder.notActive') : t('conditionBuilder.not')}
              </WrappedFieldAction>
            )}

            {showIf && (
              <Input
                data-slot={formulaForIf?.enabled ? 'condition-group-if-formula' : 'condition-group-if-input'}
                type="text"
                value={value.if ?? ''}
                onChange={handleIfChange}
                disabled={disabled}
                placeholder={t('conditionBuilder.ifExpressionPlaceholder')}
                aria-label={t('conditionBuilder.ifExpressionLabel')}
                aria-describedby={formulaForIf?.enabled ? 'condition-if-formula-hint' : undefined}
                className="ml-auto h-7 text-xs min-w-[120px] max-w-[200px]"
              />
            )}

            {depth > 0 && onRemove && !disabled && (
              <WrappedFieldAction
                variant="ghost"
                size="icon-xs"
                className={cn(
                  showIf ? 'ml-1' : 'ml-auto',
                  'text-muted-foreground hover:text-destructive transition-colors',
                )}
                onClick={onRemove}
                title={removeGroupLabel}
                aria-label={removeGroupLabel}
              >
                <Trash2Icon className="size-3.5" />
              </WrappedFieldAction>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5 p-3">{childrenList}</div>

        {(!atMaxItems || canNest) && (
          <div className="flex items-center gap-1.5 px-3 pb-3">
            {!atMaxItems && (
              <WrappedFieldAction
                variant="ghost"
                size="xs"
                className="text-xs text-muted-foreground hover:text-primary"
                onClick={handleAddCondition}
                disabled={disabled}
              >
                <PlusIcon className="size-3 mr-1" />
                {addConditionLabel}
              </WrappedFieldAction>
            )}
            {canNest && !atMaxItems && <span className="text-muted-foreground/40 text-xs">|</span>}
            {canNest && (
              <WrappedFieldAction
                variant="ghost"
                size="xs"
                className="text-xs text-muted-foreground hover:text-primary"
                onClick={handleAddGroup}
                disabled={disabled}
              >
                <GroupIcon className="size-3 mr-1" />
                {addGroupLabel}
              </WrappedFieldAction>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

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
