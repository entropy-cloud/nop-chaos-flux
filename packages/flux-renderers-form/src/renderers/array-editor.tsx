import React from 'react';
import type { BaseSchema, CompiledValidationBehavior, RendererComponentProps, RendererDefinition, RuntimeFieldRegistration } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { useCurrentForm, useCurrentFormState, useCurrentFormModelGeneration, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { Button, Input } from '@nop-chaos/ui';
import {
  formLabelFieldRule,
  getChildFieldUiState,
  getFieldValidationBehavior,
  readFieldValue,
  resolveFieldLabelContent,
  shouldValidateOn,
  useCompositeChildFieldState,
  useFieldPresentation
} from '../field-utils';
import type { ArrayEditorItem, ArrayEditorSchema } from '../schemas';
import { FieldHint, FieldLabel } from './shared';

function ArrayEditorRow(props: {
  item: ArrayEditorItem;
  index: number;
  name: string;
  currentForm: ReturnType<typeof useCurrentForm>;
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
          const nextItems = items.filter((candidate) => candidate.id !== item.id);

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

export function ArrayEditorRenderer(props: RendererComponentProps<ArrayEditorSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required ?? props.schema.required)
  });
  const labelContent = resolveFieldLabelContent(props);
  const childBehavior = getFieldValidationBehavior(name, currentForm);
  const modelGeneration = useCurrentFormModelGeneration();

  const formItems = useCurrentFormState(
    (state) => (currentForm && name ? toArrayEditorItems(getIn(state.values, name)) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
    }
  );
  const scopeItems = useScopeSelector(
    (scopeData) => (currentForm || !name ? undefined : toArrayEditorItems(getIn(scopeData, name))),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, index) => item.id === b[index].id && item.value === b[index].value);
    }
  );

  const canonicalItems = currentForm ? formItems : scopeItems;
  const [fallbackItems, setFallbackItems] = React.useState<ArrayEditorItem[]>(
    () => toArrayEditorItems(readFieldValue(scope, name))
  );
  const items = canonicalItems ?? fallbackItems;
  const itemsRef = React.useRef(items);
  itemsRef.current = items;

  const childPaths = React.useMemo(() => items.map((_, index) => `${name}.${index}.value`), [items, name]);

  const syncItems = React.useCallback(
    (nextItems: ArrayEditorItem[]) => {
      if (!currentForm || !name) {
        setFallbackItems(nextItems);
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

    return currentForm.registerField(registration).unregister;
    }, [childPaths, currentForm, modelGeneration, name, props.props.itemLabel]);

  return (
    <label
      className={presentation.className}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <div className="grid gap-3">
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
            const nextItem = { id: `item-${items.length + 1}`, value: '' };

            if (currentForm && name) {
              currentForm.appendValue(name, nextItem);
              void currentForm.validateField(name);
              return;
            }

            syncItems([...items, nextItem]);
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
    </label>
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
