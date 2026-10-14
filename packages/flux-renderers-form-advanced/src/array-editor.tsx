import React from 'react';
import type {
  BaseSchema,
  CompiledValidationBehavior,
  FormRuntime,
  RendererComponentProps,
  RendererDefinition,
  RuntimeFieldRegistration,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { writeFieldValue } from './write-field-value.js';
import { useCurrentFormModelGeneration } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input, cn } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import {
  formFieldRules,
  getChildFieldUiState,
  getFieldValidationBehavior,
  useCompositeChildFieldState,
  useFormFieldFromProps,
} from '@nop-chaos/flux-renderers-form';
import type { ArrayEditorItem, ArrayEditorSchema } from '@nop-chaos/flux-renderers-form';
import { FieldHint } from '@nop-chaos/flux-renderers-form';
import { createNextCompositeItemId } from './composite-field/composite-item-id.js';
import {
  COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
} from './composite-field/composite-editor-capability-contracts.js';
import {
  useArrayContainerController,
  type UseArrayContainerControllerParams,
} from './composite-field/array-container-controller.js';

function ArrayEditorRow(props: {
  item: ArrayEditorItem;
  index: number;
  totalCount: number;
  minItems: number;
  name: string;
  currentForm: FormRuntime | undefined;
  childBehavior: CompiledValidationBehavior;
  onChange(nextItems: ArrayEditorItem[]): void;
  onRemove(index: number): void;
  onMoveUp(index: number): void;
  onMoveDown(index: number): void;
  items: ArrayEditorItem[];
  itemLabel?: string;
  disabled?: boolean;
  readOnly?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const {
    item,
    index,
    totalCount,
    minItems,
    name,
    currentForm,
    childBehavior,
    onChange,
    onRemove,
    onMoveUp,
    onMoveDown,
    items,
    itemLabel,
    disabled,
    readOnly,
    inputRef,
  } = props;
  const itemPath = `${name}.${index}.value`;
  const inputId = `${name || 'array-editor'}-${item.id}-value`;
  const errorId = `${inputId}-error`;
  const itemFieldState = useCompositeChildFieldState(itemPath);
  const itemUi = getChildFieldUiState({
    behavior: childBehavior,
    fieldState: itemFieldState,
  });
  const labelBase = itemLabel ? `${itemLabel} ${index + 1}` : t('flux.form.itemEntry', { index: index + 1 });
  const canRemove = totalCount > minItems;
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

  return (
    <div
      data-slot="array-editor-row"
      className="grid grid-cols-[1fr_auto_auto_auto] gap-2.5 items-start"
    >
      <div
        data-slot="array-editor-row-body"
        className={itemUi.className}
        data-child-field-visited={itemUi['data-child-field-visited']}
        data-child-field-touched={itemUi['data-child-field-touched']}
        data-child-field-dirty={itemUi['data-child-field-dirty']}
        data-child-field-invalid={itemUi['data-child-field-invalid']}
      >
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          value={item.value}
          disabled={disabled}
          placeholder={labelBase}
          aria-label={labelBase}
          aria-invalid={itemUi.showError ? true : undefined}
          aria-describedby={itemUi.showError ? errorId : undefined}
          aria-errormessage={itemUi.showError ? errorId : undefined}
          onFocus={() => {
            if (currentForm && name) {
              currentForm.visitField(name);
              currentForm.visitField(itemPath);
            }
          }}
          onChange={(event) => {
            if (readOnly) {
              return;
            }

            const nextItems = items.map((candidate, candidateIndex) =>
              candidateIndex === index ? { ...candidate, value: event.target.value } : candidate,
            );
            onChange(nextItems);

            if (currentForm) {
              currentForm.touchField(itemPath);
              currentForm.setValue(itemPath, event.target.value);

              writeFieldValue(currentForm, name, itemPath, 'change');
            }
          }}
          onBlur={() => {
            if (currentForm) {
              currentForm.touchField(itemPath);

              writeFieldValue(currentForm, name, itemPath, 'blur');
            }
          }}
        />
        <FieldHint errorMessage={itemUi.error?.message} showError={itemUi.showError} id={errorId} />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-slot="array-editor-move-up"
        disabled={disabled || !canMoveUp}
        aria-label={`${t('flux.form.moveUp')} ${labelBase}`}
        onClick={() => {
          if (readOnly || !canMoveUp) {
            return;
          }
          onMoveUp(index);
        }}
      >
        <ChevronUpIcon className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-slot="array-editor-move-down"
        disabled={disabled || !canMoveDown}
        aria-label={`${t('flux.form.moveDown')} ${labelBase}`}
        onClick={() => {
          if (readOnly || !canMoveDown) {
            return;
          }
          onMoveDown(index);
        }}
      >
        <ChevronDownIcon className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-slot="array-editor-remove"
        disabled={disabled || !canRemove}
        className="hover:text-destructive"
        aria-label={`${t('flux.form.remove')} ${labelBase}`}
        onClick={() => {
          if (readOnly || !canRemove) {
            return;
          }

          onRemove(index);
        }}
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
}

type RawArrayEditorItem = { id?: string; value: string };

function toRawArrayEditorItems(value: unknown): RawArrayEditorItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const candidate = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    return {
      id: typeof candidate.id === 'string' ? candidate.id : undefined,
      value:
        typeof candidate.value === 'string'
          ? candidate.value
          : typeof item === 'string'
            ? item
            : '',
    };
  });
}

function rawArrayItemsEqual(
  a: RawArrayEditorItem[] | undefined,
  b: RawArrayEditorItem[] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((item, index) => item.id === b[index]?.id && item.value === b[index]?.value);
}

function deriveArrayEditorItems(
  raw: RawArrayEditorItem[],
  compatKeyAt: (index: number) => string,
): ArrayEditorItem[] {
  return raw.map((item, index) => ({
    id: item.id ?? compatKeyAt(index),
    value: item.value,
  }));
}

function arrayEditorUiNewEntry(items: ArrayEditorItem[]): ArrayEditorItem {
  return { id: createNextCompositeItemId(items, 'item-'), value: '' };
}

function arrayEditorNewEntry(value: unknown, items: ArrayEditorItem[]): ArrayEditorItem {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? {
        id:
          typeof (value as Record<string, unknown>).id === 'string'
            ? ((value as Record<string, unknown>).id as string)
            : createNextCompositeItemId(items, 'item-'),
        value:
          typeof (value as Record<string, unknown>).value === 'string'
            ? ((value as Record<string, unknown>).value as string)
            : '',
      }
    : { id: createNextCompositeItemId(items, 'item-'), value: '' };
}

export function ArrayEditorRenderer(props: RendererComponentProps<ArrayEditorSchema>) {
  const name = String(props.props.name ?? '');
  const { currentForm, scope, presentation } = useFormFieldFromProps(props);
  const childBehavior = getFieldValidationBehavior(name, currentForm);
  const registrationRef = React.useRef<{ registrationId: string } | undefined>(undefined);
  const modelGeneration = useCurrentFormModelGeneration();

  const controllerParams: UseArrayContainerControllerParams<RawArrayEditorItem, ArrayEditorItem> = {
    id: props.id,
    cid: props.meta.cid,
    type: 'array-editor',
    name,
    parentForm: currentForm,
    parentScope: scope,
    isInteractive: () => !presentation.effectiveDisabled && !presentation.readOnly,
    readRawValue: toRawArrayEditorItems,
    rawValuesEqual: rawArrayItemsEqual,
    deriveItems: deriveArrayEditorItems,
    identity: {
      mode: 'entry-id',
      compatPrefix: 'item-',
      buildItemInstancePath: false,
      uiNewEntryFactory: arrayEditorUiNewEntry,
      newEntryFactory: arrayEditorNewEntry,
    },
    minItemsDefault: 1,
    minItems: props.props.minItems,
    maxItems: props.props.maxItems,
    minItemsGuard: 'button-only',
    validate: {
      uiAddDepth: 'field',
      capabilityAddDepth: 'field',
      removeDepth: 'subtree',
      removeValidateGate: 'shouldValidateOn',
    },
    uiAddMechanics: 'live-append',
    handlerReads: 'snapshot',
    syncRefOnMutate: true,
    uiMoveBounds: 'to-bounds',
    removeGate: 'none',
    focusRestore: { timing: 'rAF', on: ['add', 'remove'] },
    events: {},
  };
  const controller = useArrayContainerController(controllerParams);

  const {
    items,
    itemsRef,
    atMaxItems,
    maxItems,
    minItems,
    handleAdd,
    handleRemove,
    handleMoveUp,
    handleMoveDown,
    syncAll,
    registerItemInput,
    addButtonRef,
  } = controller;
  const childPaths = React.useMemo(
    () => Array.from({ length: items.length }, (_, index) => `${name}.${index}.value`),
    [items.length, name],
  );

  React.useEffect(() => {
    if (registrationRef.current) {
      currentForm?.updateFieldRegistration(registrationRef.current.registrationId, { childPaths });
    }
  }, [childPaths, currentForm]);

  React.useEffect(() => {
    if (!currentForm || !name) {
      return;
    }

    const registration: RuntimeFieldRegistration = {
      path: name,
      childPaths,
      getValue() {
        return itemsRef.current;
      },
      syncValue() {
        return itemsRef.current;
      },
      validateChild(path) {
        const relativePath = path.startsWith(`${name}.`) ? path.slice(name.length + 1) : path;
        const match = relativePath.match(/^(\d+)\.value$/);

        if (!match) {
          return [];
        }

        const item = itemsRef.current[Number(match[1])];

        if (!item || item.value.trim() !== '') {
          return [];
        }

        return [
          {
            path,
            rule: 'required',
            message: t('validation.required', {
              label: `${props.props.itemLabel ?? 'Item'} ${Number(match[1]) + 1}`,
            }),
          },
        ];
      },
    };

    const handle = currentForm.registerField(registration);
    registrationRef.current = handle.accepted ? { registrationId: handle.registrationId } : undefined;
    return handle.unregister;
  }, [childPaths, currentForm, modelGeneration, name, itemsRef, props.props.itemLabel]);

  return (
    <div
      className={cn('nop-array-editor', 'grid gap-3', props.meta.className)}
      data-slot="array-editor-control"
    >
      {items.map((item, index) => {
        return (
          <ArrayEditorRow
            key={item.id}
            item={item}
            index={index}
            totalCount={items.length}
            minItems={minItems}
            name={name}
            currentForm={currentForm}
            childBehavior={childBehavior}
            onChange={syncAll}
            onRemove={handleRemove}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            items={items}
            itemLabel={props.props.itemLabel ? String(props.props.itemLabel) : undefined}
            disabled={presentation.effectiveDisabled || presentation.readOnly}
            readOnly={presentation.readOnly}
            inputRef={(el) => {
              registerItemInput(item.id, el);
            }}
          />
        );
      })}
      <Button
        ref={addButtonRef}
        type="button"
        variant="outline"
        size="sm"
        disabled={presentation.effectiveDisabled || presentation.readOnly || atMaxItems}
        onClick={() => {
          if (presentation.readOnly || atMaxItems) {
            return;
          }

          handleAdd();
        }}
      >
        <PlusIcon className="size-4" />
        {t('flux.form.addItem')}
      </Button>
      {atMaxItems && maxItems !== undefined ? (
        // [G2-R2-视角4-02] the cap disabled Add silently; announce count/cap.
        <span role="status" data-slot="array-editor-max-items" className="text-xs text-muted-foreground">
          {t('flux.form.maxItemsReached', { count: items.length, max: maxItems })}
        </span>
      ) : null}
    </div>
  );
}

export const arrayEditorRendererDefinition: RendererDefinition = {
  type: 'array-editor',
  displayName: 'Array Editor',
  category: 'Form Advanced',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: ArrayEditorRenderer,
  wrap: true,
  fields: [
    ...formFieldRules,
    { key: 'itemLabel', kind: 'prop' },
    { key: 'minItems', kind: 'prop', valueType: 'number' },
    { key: 'maxItems', kind: 'prop', valueType: 'number' },
  ],
  componentCapabilityContracts: COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      const arraySchema = schema as ArrayEditorSchema;
      const configuredMinItems =
        typeof arraySchema.minItems === 'number' ? Math.max(0, Math.floor(arraySchema.minItems)) : 1;
      const rules: ValidationRule[] = [
        {
          kind: 'minItems',
          value: configuredMinItems,
        },
      ];

      if (typeof arraySchema.maxItems === 'number') {
        const configuredMaxItems = Math.max(0, Math.floor(arraySchema.maxItems));
        rules.push({
          kind: 'maxItems',
          value: configuredMaxItems,
        });
      }

      return rules;
    },
  },
  frameRootTag: 'div',
};
