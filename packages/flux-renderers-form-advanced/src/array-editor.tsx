import React from 'react';
import type { BaseSchema, CompiledValidationBehavior, FormRuntime, RendererComponentProps, RendererDefinition, RuntimeFieldRegistration } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { useCurrentFormState, useCurrentFormModelGeneration, useScopeSelector } from '@nop-chaos/flux-react';
import { Button, Input } from '@nop-chaos/ui';
import {
  formLabelFieldRule,
  getChildFieldUiState,
  getFieldValidationBehavior,
  resolveFieldLabelContent,
  shouldValidateOn,
  useCompositeChildFieldState,
  useFormFieldController
} from '@nop-chaos/flux-renderers-form';
import type { ArrayEditorItem, ArrayEditorSchema } from '@nop-chaos/flux-renderers-form';
import { FieldHint, FieldLabel } from '@nop-chaos/flux-renderers-form';
import { createNextCompositeItemId } from './composite-field/composite-item-id';

const EMPTY_ARRAY_EDITOR_ITEMS: ArrayEditorItem[] = [];

function ArrayEditorRow(props: {
  item: ArrayEditorItem;
  index: number;
  name: string;
  currentForm: FormRuntime | undefined;
  childBehavior: CompiledValidationBehavior;
  onSync(nextItems: ArrayEditorItem[]): void;
  items: ArrayEditorItem[];
  itemLabel?: string;
  disabled?: boolean;
}) {
  const { item, index, name, currentForm, childBehavior, onSync, items, itemLabel, disabled } = props;
  const itemPath = `${name}.${index}.value`;
  const itemFieldState = useCompositeChildFieldState(itemPath);
  const itemUi = getChildFieldUiState({
    behavior: childBehavior,
    fieldState: itemFieldState
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
          type="text"
          value={item.value}
          disabled={disabled}
          placeholder={itemLabel ? `${itemLabel} ${index + 1}` : `Item ${index + 1}`}
          aria-invalid={itemUi.showError ? true : undefined}
          onFocus={() => {
            if (currentForm && name) {
              currentForm.visitField(name);
              currentForm.visitField(itemPath);
            }
          }}
          onChange={(event) => {
            const nextItems = items.map((candidate, candidateIndex) =>
              candidateIndex === index ? { ...candidate, value: event.target.value } : candidate
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
        <FieldHint
          errorMessage={itemUi.error?.message}
          showError={itemUi.showError}
        />
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={disabled}
        onClick={() => {
          const nextItems = items.filter((_, candidateIndex) => candidateIndex !== index);

          if (currentForm && name) {
            onSync(nextItems);
            currentForm.removeValue(name, index);
            void currentForm.validateSubtree(name);
            return;
          }

          onSync(nextItems);
        }}
      >
        Remove
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
      value: typeof candidate.value === 'string' ? candidate.value : typeof item === 'string' ? item : ''
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
  const { currentForm, scope, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });
  const labelContent = resolveFieldLabelContent(props);
  const childBehavior = getFieldValidationBehavior(name, currentForm);
  const itemsRef = React.useRef<ArrayEditorItem[]>([]);
  const registrationRef = React.useRef<RuntimeFieldRegistration | undefined>(undefined);
  const modelGeneration = useCurrentFormModelGeneration();

  const formExternalValue = useCurrentFormState(
    (state) => (currentForm && name ? toArrayEditorItems(getIn(state.values, name)) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
    }
  );
  const scopeExternalValue = useScopeSelector(
    (scopeData) => (currentForm || !name ? undefined : toArrayEditorItems(getIn(scopeData, name))),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
    }
  );
  const externalValue = currentForm ? formExternalValue : scopeExternalValue;
  const items = externalValue ?? EMPTY_ARRAY_EDITOR_ITEMS;
  const childPaths = React.useMemo(() => items.map((_, index) => `${name}.${index}.value`), [items, name]);

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
    [currentForm, name, scope]
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
            message: `${props.props.itemLabel ?? 'Item'} ${Number(match[1]) + 1} is required`
          }
        ];
      }
    };

    registrationRef.current = registration;
    return currentForm.registerField(registration).unregister;
    }, [childPaths, currentForm, modelGeneration, name, props.props.itemLabel]);

  return (
    <div
      className={presentation.className}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <div className="grid gap-3" data-slot="field-control">
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
              items={items}
              itemLabel={props.props.itemLabel ? String(props.props.itemLabel) : undefined}
              disabled={presentation.effectiveDisabled}
            />
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={presentation.effectiveDisabled}
          onClick={() => {
            const nextItem = { id: createNextCompositeItemId(items, 'item-'), value: '' };
            const nextItems = [...items, nextItem];
            itemsRef.current = nextItems;

            if (currentForm && name) {
              currentForm.appendValue(name, nextItem);
              void currentForm.validateField(name);
              return;
            }

            syncItems(nextItems);
          }}
        >
          Add item
        </Button>
      </div>
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        validating={presentation.fieldState.validating}
        showError={presentation.showError}
      />
    </div>
  );
}

export const arrayEditorRendererDefinition: RendererDefinition = {
  type: 'array-editor',
  component: ArrayEditorRenderer,
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      return [{ kind: 'minItems', value: 1, message: `${schema.label ?? schema.name ?? 'Field'} requires at least one item` }];
    }
  }
};
