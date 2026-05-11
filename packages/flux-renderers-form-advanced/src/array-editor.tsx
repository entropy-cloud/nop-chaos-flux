import React from 'react';
import type {
  BaseSchema,
  CompiledValidationBehavior,
  FormRuntime,
  RendererComponentProps,
  RendererDefinition,
  RuntimeFieldRegistration,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  useCurrentFormState,
  useCurrentFormModelGeneration,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input, cn } from '@nop-chaos/ui';
import {
  formLabelFieldRule,
  getChildFieldUiState,
  getFieldValidationBehavior,
  shouldValidateOn,
  useCompositeChildFieldState,
  useFormFieldController,
} from '@nop-chaos/flux-renderers-form';
import type { ArrayEditorItem, ArrayEditorSchema } from '@nop-chaos/flux-renderers-form';
import { FieldHint } from '@nop-chaos/flux-renderers-form';
import { createNextCompositeItemId } from './composite-field/composite-item-id.js';

const EMPTY_ARRAY_EDITOR_ITEMS: ArrayEditorItem[] = [];

function ArrayEditorRow(props: {
  item: ArrayEditorItem;
  index: number;
  name: string;
  currentForm: FormRuntime | undefined;
  childBehavior: CompiledValidationBehavior;
  onSync(nextItems: ArrayEditorItem[]): void;
  onRemove(index: number): void;
  items: ArrayEditorItem[];
  itemLabel?: string;
  disabled?: boolean;
  readOnly?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const {
    item,
    index,
    name,
    currentForm,
    childBehavior,
    onSync,
    onRemove,
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

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2.5 items-start">
      <div
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
          placeholder={itemLabel ? `${itemLabel} ${index + 1}` : `Item ${index + 1}`}
          aria-label={itemLabel ? `${itemLabel} ${index + 1}` : `Item ${index + 1}`}
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
            onSync(nextItems);

            if (currentForm) {
              currentForm.touchField(itemPath);
              currentForm.setValue(itemPath, event.target.value);

              if (shouldValidateOn(name, currentForm, 'change')) {
                void currentForm.validateField(itemPath);
              }
            }
          }}
          onBlur={() => {
            if (currentForm) {
              currentForm.touchField(itemPath);

              if (shouldValidateOn(name, currentForm, 'blur')) {
                void currentForm.validateField(itemPath);
              }
            }
          }}
        />
        <FieldHint errorMessage={itemUi.error?.message} showError={itemUi.showError} id={errorId} />
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={disabled}
        aria-label={`${t('flux.form.remove')} ${itemLabel ? `${itemLabel} ${index + 1}` : `Item ${index + 1}`}`}
        onClick={() => {
          if (readOnly) {
            return;
          }

          onRemove(index);
        }}
      >
        {t('flux.form.remove')}
      </Button>
    </div>
  );
}

function toArrayEditorItems(value: unknown): ArrayEditorItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const candidate = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    return {
      id: typeof candidate.id === 'string' ? candidate.id : `item-${index}`,
      value:
        typeof candidate.value === 'string'
          ? candidate.value
          : typeof item === 'string'
            ? item
            : '',
    };
  });
}

function arrayItemsEqual(a: ArrayEditorItem[], b: ArrayEditorItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
}

export function ArrayEditorRenderer(props: RendererComponentProps<ArrayEditorSchema>) {
  const name = String(props.props.name ?? '');
  const hasName = name.length > 0;
  const { currentForm, scope, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });
  const childBehavior = getFieldValidationBehavior(name, currentForm);
  const itemsRef = React.useRef<ArrayEditorItem[]>([]);
  const registrationRef = React.useRef<RuntimeFieldRegistration | undefined>(undefined);
  const modelGeneration = useCurrentFormModelGeneration();
  const inputRefs = React.useRef<Map<string, HTMLInputElement | null>>(new Map());
  const addButtonRef = React.useRef<HTMLButtonElement>(null);
  const pendingFocusRef = React.useRef<{ kind: 'add' } | { kind: 'remove'; index: number } | null>(null);

  const formExternalValue = useCurrentFormState(
    (state) => (currentForm && hasName ? toArrayEditorItems(getIn(state.values, name)) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
    },
    { enabled: Boolean(currentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeExternalValue = useScopeSelector(
    (scopeData) =>
      currentForm || !hasName ? undefined : toArrayEditorItems(getIn(scopeData, name)),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
    },
    { enabled: Boolean(!currentForm && hasName), fallback: undefined },
  );
  const externalValue = currentForm ? formExternalValue : scopeExternalValue;
  const items = externalValue ?? EMPTY_ARRAY_EDITOR_ITEMS;
  const childPaths = React.useMemo(
    () => items.map((_, index) => `${name}.${index}.value`),
    [items, name],
  );

  React.useEffect(() => {
    if (!arrayItemsEqual(itemsRef.current, items)) {
      itemsRef.current = items;
    }
  }, [items]);

  React.useEffect(() => {
    if (registrationRef.current) {
      registrationRef.current.childPaths = childPaths;
    }
  }, [childPaths]);

  React.useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;

    requestAnimationFrame(() => {
      if (pending.kind === 'add') {
        const lastItem = items[items.length - 1];
        if (lastItem) {
          inputRefs.current.get(lastItem.id)?.focus();
        }
      } else {
        const targetIndex = Math.min(pending.index, items.length - 1);
        const targetItem = items[targetIndex];
        if (targetItem) {
          inputRefs.current.get(targetItem.id)?.focus();
        } else {
          addButtonRef.current?.focus();
        }
      }
    });
  }, [items]);

  const syncItems = React.useCallback(
    (nextItems: ArrayEditorItem[]) => {
      itemsRef.current = nextItems;

      if (!currentForm || !name) {
        scope.update(name, nextItems);
        return;
      }

      if (!currentForm.isTouched(name)) {
        currentForm.touchField(name);
      }

      currentForm.setValue(name, nextItems);
      void currentForm.validateField(name);
    },
    [currentForm, name, scope],
  );

  const handleRemove = React.useCallback(
    (index: number) => {
      pendingFocusRef.current = { kind: 'remove', index };
      const nextItems = items.filter((_, candidateIndex) => candidateIndex !== index);

      itemsRef.current = nextItems;

      if (currentForm && name) {
        currentForm.removeValue(name, index);
        void currentForm.validateSubtree(name);
        return;
      }

      syncItems(nextItems);
    },
    [currentForm, items, name, syncItems],
  );

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
            message: `${props.props.itemLabel ?? 'Item'} ${Number(match[1]) + 1} is required`,
          },
        ];
      },
    };

    registrationRef.current = registration;
    return currentForm.registerField(registration).unregister;
  }, [childPaths, currentForm, modelGeneration, name, props.props.itemLabel]);

  return (
    <div
      className={cn('nop-array-editor', 'grid gap-3', props.meta.className)}
      data-slot="field-control"
      data-testid={props.meta.testid}
      data-cid={props.meta.cid}
    >
      {items.map((item, index) => {
        return (
          <ArrayEditorRow
            key={item.id}
            item={item}
            index={index}
            name={name}
            currentForm={currentForm}
            childBehavior={childBehavior}
            onSync={syncItems}
            onRemove={handleRemove}
            items={items}
            itemLabel={props.props.itemLabel ? String(props.props.itemLabel) : undefined}
            disabled={presentation.effectiveDisabled || presentation.readOnly}
            readOnly={presentation.readOnly}
            inputRef={(el) => {
              if (el) {
                inputRefs.current.set(item.id, el);
              } else {
                inputRefs.current.delete(item.id);
              }
            }}
          />
        );
      })}
      <Button
        ref={addButtonRef}
        type="button"
        variant="outline"
        size="sm"
        disabled={presentation.effectiveDisabled || presentation.readOnly}
        onClick={() => {
          if (presentation.readOnly) {
            return;
          }

          const nextItem = { id: createNextCompositeItemId(items, 'item-'), value: '' };
          const nextItems = [...items, nextItem];
          itemsRef.current = nextItems;
          pendingFocusRef.current = { kind: 'add' };

          if (currentForm && name) {
            currentForm.appendValue(name, nextItem);
            void currentForm.validateField(name);
            return;
          }

          syncItems(nextItems);
        }}
      >
        {t('flux.form.addItem')}
      </Button>
    </div>
  );
}

export const arrayEditorRendererDefinition: RendererDefinition = {
  type: 'array-editor',
  component: ArrayEditorRenderer,
  wrap: true,
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      return [
        {
          kind: 'minItems',
          value: 1,
          message: `${schema.label ?? schema.name ?? 'Field'} requires at least one item`,
        },
      ];
    },
  },
};
