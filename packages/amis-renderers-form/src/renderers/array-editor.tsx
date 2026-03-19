import React from 'react';
import type { BaseSchema, CompiledValidationBehavior, RendererComponentProps, RendererDefinition, RuntimeFieldRegistration } from '@nop-chaos/amis-schema';
import { useCurrentForm, useRenderScope } from '@nop-chaos/amis-react';
import {
  formLabelFieldRule,
  getChildFieldUiState,
  getFieldValidationBehavior,
  readFieldValue,
  resolveFieldLabelContent,
  resolveFieldLabelText,
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
  itemsRef: React.MutableRefObject<ArrayEditorItem[]>;
  itemLabel?: string;
}) {
  const { item, index, name, currentForm, childBehavior, onSync, items, itemsRef, itemLabel } = props;
  const itemPath = `${name}.${index}.value`;
  const itemFieldState = useCompositeChildFieldState(itemPath);
  const itemUi = getChildFieldUiState({
    behavior: childBehavior,
    fieldState: itemFieldState
  });

  return (
    <div className="na-array-editor__row">
      <div className={itemUi.className}>
        <input
          className="na-input"
          type="text"
          value={item.value}
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
      <button
        type="button"
        className="na-kv-remove"
        onClick={() => {
          const nextItems = items.filter((candidate) => candidate.id !== item.id);
          itemsRef.current = nextItems;

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
      </button>
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
  const presentation = useFieldPresentation(name, currentForm);
  const labelContent = resolveFieldLabelContent(props);
  const labelText = resolveFieldLabelText(props, name);
  const childBehavior = getFieldValidationBehavior(name, currentForm);
  const [items, setItems] = React.useState<ArrayEditorItem[]>(() => toArrayEditorItems(readFieldValue(scope, name)));
  const itemsRef = React.useRef(items);
  const registrationRef = React.useRef<RuntimeFieldRegistration | undefined>(undefined);
  const childPaths = React.useMemo(() => items.map((_, index) => `${name}.${index}.value`), [items, name]);

  if (registrationRef.current) {
    registrationRef.current.childPaths = childPaths;
  }

  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const syncItems = React.useCallback(
    (nextItems: ArrayEditorItem[]) => {
      itemsRef.current = nextItems;
      setItems(nextItems);

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
      validate() {
        if (itemsRef.current.length === 0) {
          return [
            {
              path: name,
              rule: 'required',
              message: `${labelText} requires at least one item`
            }
          ];
        }

        return [];
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
    return currentForm.registerField(registration);
  }, [childPaths, currentForm, labelText, name, props.props.itemLabel]);

  return (
    <label className={presentation.className}>
      <FieldLabel content={labelContent} />
      <div className="na-array-editor">
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
              itemsRef={itemsRef}
              itemLabel={props.props.itemLabel ? String(props.props.itemLabel) : undefined}
            />
          );
        })}
        <button
          type="button"
          className="na-kv-add"
          onClick={() => {
            const nextItem = { id: `item-${items.length + 1}`, value: '' };
            const nextItems = [...items, nextItem];
            itemsRef.current = nextItems;

            if (currentForm && name) {
              setItems(nextItems);
              currentForm.appendValue(name, nextItem);
              void currentForm.validateField(name);
              return;
            }

            syncItems(nextItems);
          }}
        >
          Add item
        </button>
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
    collectRules() {
      return [];
    }
  }
};
