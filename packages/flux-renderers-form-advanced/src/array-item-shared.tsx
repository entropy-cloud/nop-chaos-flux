import React from 'react';
import type {
  ComponentHandleRegistry,
  FormRuntime,
  InstanceFrame,
  RendererRuntime,
  ScopeRef,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { useFormLayout, type FormLayoutContextValue } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon } from 'lucide-react';
import { createItemFormProxy, createItemScope } from './composite-field/array-field-runtime.js';
import { createProjectedValidationRuntime } from './detail-view/projected-validation-runtime.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

interface ArrayItemContext {
  itemScope: ScopeRef;
  itemForm: FormRuntime | undefined;
  itemValidationOwner: ValidationScopeRuntime | undefined;
  /** input-table only: row-scoped component handle registry (disposed on unmount). */
  itemComponentRegistry?: ComponentHandleRegistry | undefined;
  itemContent: React.ReactNode;
  itemLayout: FormLayoutContextValue | undefined;
}

/**
 * Container-agnostic array-item wiring shared by combo cards and input-table
 * rows (cq-3 Phase 3): item scope/form/validation-owner projection, rendered
 * content, and the read-only layout override (C3.1 P1-2). Visual chrome stays
 * per consumer; pass `parentComponentRegistry` (input-table only) to also get
 * the row-scoped component handle registry with microtask dispose.
 */
export function useArrayItemContext(options: {
  parentScope: ScopeRef;
  parentForm: FormRuntime | undefined;
  parentValidationOwner: ValidationScopeRuntime | undefined;
  arrayPath: string;
  index: number;
  readOnly: boolean;
  itemIdentity: string;
  item: unknown;
  itemInstancePath: readonly InstanceFrame[];
  itemRegion?: { render(input: {
    scope: ScopeRef;
    bindings: { index: number; value: unknown };
    instancePath: readonly InstanceFrame[];
  }): unknown } | undefined;
  parentComponentRegistry?: ComponentHandleRegistry | undefined;
  runtime?: RendererRuntime;
}): ArrayItemContext {
  const {
    parentScope,
    parentForm,
    parentValidationOwner,
    arrayPath,
    index,
    readOnly,
    itemIdentity,
    item,
    itemInstancePath,
    itemRegion,
    parentComponentRegistry,
    runtime,
  } = options;

  const itemScope = React.useMemo(
    () => createItemScope(parentScope, arrayPath, index, 'object', readOnly, itemIdentity),
    [parentScope, arrayPath, index, readOnly, itemIdentity],
  );
  const itemForm = React.useMemo(
    () => (parentForm ? createItemFormProxy(parentForm, arrayPath, index, 'object') : parentForm),
    [parentForm, arrayPath, index],
  );
  const itemValidationOwner = React.useMemo(() => {
    if (!parentValidationOwner) {
      return parentValidationOwner;
    }
    return createProjectedValidationRuntime(parentValidationOwner, {
      ownerRootPath: `${arrayPath}.${index}`,
      prefixPath(path) {
        if (!path) return `${arrayPath}.${index}`;
        return `${arrayPath}.${index}.${path}`;
      },
    });
  }, [arrayPath, index, parentValidationOwner]);

  const itemComponentRegistry = React.useMemo(() => {
    if (!parentComponentRegistry || !runtime) {
      return undefined;
    }
    return runtime.createComponentHandleRegistry({
      id: `${arrayPath}.${index}:input-table-row:component-registry`,
      parent: parentComponentRegistry,
    });
  }, [runtime, parentComponentRegistry, arrayPath, index]);

  React.useEffect(() => {
    const registry = itemComponentRegistry;
    return () => {
      queueMicrotask(() => {
        registry?.dispose?.();
      });
    };
  }, [itemComponentRegistry]);

  const itemContent = React.useMemo(
    () =>
      asReactNode(
        itemRegion?.render({
          scope: itemScope,
          bindings: { index, value: item },
          instancePath: itemInstancePath,
        }),
      ) ?? null,
    [index, item, itemInstancePath, itemRegion, itemScope],
  );

  const parentLayout = useFormLayout();
  const itemLayout = React.useMemo(() => {
    if (readOnly) {
      return parentLayout
        ? { ...parentLayout, staticReadOnly: true }
        : { staticReadOnly: true };
    }
    return parentLayout;
  }, [parentLayout, readOnly]);

  return {
    itemScope,
    itemForm,
    itemValidationOwner,
    itemComponentRegistry,
    itemContent,
    itemLayout,
  };
}

/**
 * Shared reorder/remove chrome for array items (cq-3 Phase 3). `dataSlot`
 * prefixes the per-consumer markers (`combo-*` / `input-table-*`); `noun`
 * carries the aria-label wording ("item N" / "row N").
 */
export function ArrayItemActionButtons(props: {
  dataSlot: string;
  noun: string;
  readOnly: boolean;
  index: number;
  totalCount: number;
  minItems: number;
  removeBlocked: boolean;
  reorderable: boolean;
  removable: boolean;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const {
    dataSlot,
    noun,
    readOnly,
    index,
    totalCount,
    minItems,
    removeBlocked,
    reorderable,
    removable,
    onRemove,
    onMoveUp,
    onMoveDown,
  } = props;
  const canRemove = totalCount > minItems;
  const canRemoveNow = canRemove && !removeBlocked;
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

  return (
    <>
      {reorderable && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-slot={`${dataSlot}-move-up`}
            disabled={readOnly || !canMoveUp}
            aria-label={t('flux.form.moveUp', { defaultValue: `Move up ${noun} ${index + 1}` })}
            onClick={() => canMoveUp && onMoveUp(index)}
          >
            <ChevronUpIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-slot={`${dataSlot}-move-down`}
            disabled={readOnly || !canMoveDown}
            aria-label={t('flux.form.moveDown', { defaultValue: `Move down ${noun} ${index + 1}` })}
            onClick={() => canMoveDown && onMoveDown(index)}
          >
            <ChevronDownIcon className="size-4" />
          </Button>
        </>
      )}
      {removable && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-slot={`${dataSlot}-remove`}
          disabled={readOnly || !canRemoveNow}
          className="hover:text-destructive"
          aria-label={t('flux.form.remove', { defaultValue: `Remove ${noun} ${index + 1}` })}
          onClick={() => canRemoveNow && onRemove(index)}
        >
          <Trash2Icon className="size-4" />
        </Button>
      )}
    </>
  );
}
