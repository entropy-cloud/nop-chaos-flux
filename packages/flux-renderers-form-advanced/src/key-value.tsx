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
import { getIn } from '@nop-chaos/flux-core';
import {
  useCompositeFieldHandle,
  useCurrentFormState,
  useCurrentFormModelGeneration,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input, cn } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon } from 'lucide-react';
import {
  formFieldRules,
  getChildFieldUiState,
  getFieldValidationBehavior,
  shouldValidateOn,
  useCompositeChildFieldState,
  useFormFieldController,
} from '@nop-chaos/flux-renderers-form';
import type { KeyValuePair, KeyValueSchema } from '@nop-chaos/flux-renderers-form';
import { FieldHint } from '@nop-chaos/flux-renderers-form';
import { createNextCompositeItemId } from './composite-field/composite-item-id.js';
import { useCompatibilityItemKeys } from './composite-field/composite-item-keys.js';
import {
  EMPTY_RAW_KEY_VALUE_PAIRS,
  rawKeyValuePairsEqual,
  toRawKeyValuePairs,
} from './key-value-normalizer.js';
import {
  COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
  COMPOSITE_EDITOR_METHODS,
} from './composite-field/composite-editor-capability-contracts.js';

function KeyValueRow(props: {
  pair: KeyValuePair;
  index: number;
  totalCount: number;
  minItems: number;
  name: string;
  currentForm: FormRuntime | undefined;
  childBehavior: CompiledValidationBehavior;
  onSync(nextPairs: KeyValuePair[]): void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  pairs: KeyValuePair[];
  disabled?: boolean;
  readOnly?: boolean;
  removeButtonRef?: (button: HTMLButtonElement | null) => void;
}) {
  const {
    pair,
    index,
    totalCount,
    minItems,
    name,
    currentForm,
    childBehavior,
    onSync,
    onRemove,
    onMoveUp,
    onMoveDown,
    pairs,
    disabled,
    readOnly,
    removeButtonRef,
  } = props;
  const keyPath = `${name}.${index}.key`;
  const valuePath = `${name}.${index}.value`;
  const keyInputId = `${name || 'key-value'}-${pair.id}-key`;
  const valueInputId = `${name || 'key-value'}-${pair.id}-value`;
  const keyErrorId = `${keyInputId}-error`;
  const valueErrorId = `${valueInputId}-error`;
  const keyFieldState = useCompositeChildFieldState(keyPath);
  const valueFieldState = useCompositeChildFieldState(valuePath);
  const keyUi = getChildFieldUiState({
    behavior: childBehavior,
    fieldState: keyFieldState,
  });
  const valueUi = getChildFieldUiState({
    behavior: childBehavior,
    fieldState: valueFieldState,
  });
  const canRemove = totalCount > minItems;
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

  return (
    <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2.5 items-start">
      <div
        className={keyUi.className}
        data-child-field-visited={keyUi['data-child-field-visited']}
        data-child-field-touched={keyUi['data-child-field-touched']}
        data-child-field-dirty={keyUi['data-child-field-dirty']}
        data-child-field-invalid={keyUi['data-child-field-invalid']}
      >
        <Input
          id={keyInputId}
          type="text"
          value={pair.key}
          disabled={disabled}
          placeholder="Key"
          aria-label={`Key ${index + 1}`}
          aria-invalid={keyUi.showError ? true : undefined}
          aria-describedby={keyUi.showError ? keyErrorId : undefined}
          aria-errormessage={keyUi.showError ? keyErrorId : undefined}
          onFocus={() => {
            if (currentForm && name) {
              currentForm.visitField(name);
              currentForm.visitField(keyPath);
            }
          }}
          onChange={(event) => {
            if (readOnly) {
              return;
            }

            const nextPairs = pairs.map((candidate, candidateIndex) =>
              candidateIndex === index ? { ...candidate, key: event.target.value } : candidate,
            );
            onSync(nextPairs);

            if (currentForm) {
              currentForm.touchField(keyPath);
              currentForm.setValue(keyPath, event.target.value);

              if (shouldValidateOn(name, currentForm, 'change')) {
                void currentForm.validateField(keyPath, 'change');
              }
            }
          }}
          onBlur={() => {
            if (currentForm) {
              currentForm.touchField(keyPath);

              if (shouldValidateOn(name, currentForm, 'blur')) {
                void currentForm.validateField(keyPath, 'blur');
              }
            }
          }}
        />
        <FieldHint errorMessage={keyUi.error?.message} showError={keyUi.showError} id={keyErrorId} />
      </div>
      <div
        className={valueUi.className}
        data-child-field-visited={valueUi['data-child-field-visited']}
        data-child-field-touched={valueUi['data-child-field-touched']}
        data-child-field-dirty={valueUi['data-child-field-dirty']}
        data-child-field-invalid={valueUi['data-child-field-invalid']}
      >
        <Input
          id={valueInputId}
          type="text"
          value={pair.value}
          disabled={disabled}
          placeholder="Value"
          aria-label={`Value ${index + 1}`}
          aria-invalid={valueUi.showError ? true : undefined}
          aria-describedby={valueUi.showError ? valueErrorId : undefined}
          aria-errormessage={valueUi.showError ? valueErrorId : undefined}
          onFocus={() => {
            if (currentForm && name) {
              currentForm.visitField(name);
              currentForm.visitField(valuePath);
            }
          }}
          onChange={(event) => {
            if (readOnly) {
              return;
            }

            const nextPairs = pairs.map((candidate, candidateIndex) =>
              candidateIndex === index ? { ...candidate, value: event.target.value } : candidate,
            );
            onSync(nextPairs);

            if (currentForm) {
              currentForm.touchField(valuePath);
              currentForm.setValue(valuePath, event.target.value);

              if (shouldValidateOn(name, currentForm, 'change')) {
                void currentForm.validateField(valuePath, 'change');
              }
            }
          }}
          onBlur={() => {
            if (currentForm) {
              currentForm.touchField(valuePath);

              if (shouldValidateOn(name, currentForm, 'blur')) {
                void currentForm.validateField(valuePath, 'blur');
              }
            }
          }}
        />
        <FieldHint errorMessage={valueUi.error?.message} showError={valueUi.showError} id={valueErrorId} />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-slot="key-value-move-up"
        disabled={disabled || !canMoveUp}
        aria-label={`Move up entry ${index + 1}`}
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
        size="sm"
        data-slot="key-value-move-down"
        disabled={disabled || !canMoveDown}
        aria-label={`Move down entry ${index + 1}`}
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
        ref={removeButtonRef}
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || !canRemove}
        className="hover:text-destructive"
        aria-label={`${t('flux.form.remove')} entry ${index + 1}`}
        onClick={() => {
          if (!canRemove) {
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

export function KeyValueRenderer(props: RendererComponentProps<KeyValueSchema>) {
  const name = String(props.props.name ?? '');
  const hasName = name.length > 0;
  const minItems =
    typeof props.props.minItems === 'number' && Number.isFinite(props.props.minItems)
      ? Math.max(0, Math.floor(props.props.minItems))
      : 1;
  const maxItems =
    typeof props.props.maxItems === 'number' && Number.isFinite(props.props.maxItems)
      ? Math.max(0, Math.floor(props.props.maxItems))
      : undefined;
  const { currentForm, scope, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const childBehavior = getFieldValidationBehavior(name, currentForm);
  const pairsRef = React.useRef<KeyValuePair[]>([]);
  const registrationRef = React.useRef<{ registrationId: string } | undefined>(undefined);
  const removeButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const modelGeneration = useCurrentFormModelGeneration();

  const formRawValue = useCurrentFormState(
    (state) => (currentForm && hasName ? toRawKeyValuePairs(getIn(state.values, name)) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return rawKeyValuePairsEqual(a, b);
    },
    { enabled: Boolean(currentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeRawValue = useScopeSelector(
    (scopeData) => (currentForm || !hasName ? undefined : toRawKeyValuePairs(getIn(scopeData, name))),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return rawKeyValuePairsEqual(a, b);
    },
    { enabled: Boolean(!currentForm && hasName), fallback: undefined, paths: hasName ? [name] : undefined },
  );
  const rawValue = currentForm ? formRawValue : scopeRawValue;
  const rawPairs = rawValue ?? EMPTY_RAW_KEY_VALUE_PAIRS;
  const {
    keyAt: compatKeyAt,
    removeAt: compatRemoveAt,
    append: compatAppend,
    move: compatMove,
  } = useCompatibilityItemKeys(rawPairs.length, 'pair-');
  const pairs = React.useMemo<KeyValuePair[]>(
    () =>
      rawPairs.map((pair, index) => ({
        id: pair.id ?? compatKeyAt(index),
        key: pair.key,
        value: pair.value,
      })),
    [rawPairs, compatKeyAt],
  );
  const childPaths = React.useMemo(
    () =>
      Array.from({ length: pairs.length }, (_, index) => [
        `${name}.${index}.key`,
        `${name}.${index}.value`,
      ]).flat(),
    [name, pairs.length],
  );

  React.useEffect(() => {
    pairsRef.current = pairs;
  }, [pairs]);

  React.useEffect(() => {
    if (registrationRef.current) {
      currentForm?.updateFieldRegistration(registrationRef.current.registrationId, { childPaths });
    }
  }, [childPaths, currentForm]);

  const syncField = React.useCallback(
    (nextPairs: KeyValuePair[]) => {
      pairsRef.current = nextPairs;

      if (!currentForm || !name) {
        scope.update(name, nextPairs);
        return;
      }

      if (!currentForm.isTouched(name)) {
        currentForm.touchField(name);
      }

      currentForm.setValue(name, nextPairs);

      if (shouldValidateOn(name, currentForm, 'change')) {
        void currentForm.validateField(name, 'change');
      }
    },
    [currentForm, name, scope],
  );

  const handleRemove = React.useCallback(
    (index: number) => {
      const nextPairs = pairs.filter((_, candidateIndex) => candidateIndex !== index);
      const nextFocusIndex = Math.min(index, nextPairs.length - 1);

      pairsRef.current = nextPairs;
      compatRemoveAt(index);

      if (currentForm && name) {
        currentForm.removeValue(name, index);
        void currentForm.validateSubtree(name, 'change');
      } else {
        syncField(nextPairs);
      }

      queueMicrotask(() => {
        if (nextFocusIndex >= 0) {
          removeButtonRefs.current[nextFocusIndex]?.focus();
        }
      });
    },
    [currentForm, name, pairs, syncField, compatRemoveAt],
  );

  const handleMove = React.useCallback(
    (index: number, to: number) => {
      if (index === to || to < 0 || to >= pairs.length) {
        return;
      }

      const nextPairs = pairs.slice();
      const [moved] = nextPairs.splice(index, 1);
      if (!moved) {
        return;
      }
      nextPairs.splice(to, 0, moved);
      pairsRef.current = nextPairs;
      compatMove(index, to);

      if (currentForm && name) {
        currentForm.moveValue(name, index, to);
        if (shouldValidateOn(name, currentForm, 'change')) {
          void currentForm.validateField(name, 'change');
        }
        return;
      }

      syncField(nextPairs);
    },
    [currentForm, name, pairs, syncField, compatMove],
  );

  const handleMoveUp = React.useCallback((index: number) => handleMove(index, index - 1), [handleMove]);
  const handleMoveDown = React.useCallback(
    (index: number) => handleMove(index, index + 1),
    [handleMove],
  );

  const atMaxItems = maxItems !== undefined && pairs.length >= maxItems;

  useCompositeFieldHandle({
    id: props.id,
    name: name || undefined,
    type: 'key-value',
    cid: props.meta.cid,
    methods: COMPOSITE_EDITOR_METHODS,
    isInteractive: () => !presentation.effectiveDisabled && !presentation.readOnly,
    addItem: (value) => {
      if (atMaxItems) {
        return { skipped: true };
      }
      const nextEntry =
        value && typeof value === 'object' && !Array.isArray(value)
          ? {
              id:
                typeof (value as Record<string, unknown>).id === 'string'
                  ? ((value as Record<string, unknown>).id as string)
                  : createNextCompositeItemId(pairs, 'pair-'),
              key:
                typeof (value as Record<string, unknown>).key === 'string'
                  ? ((value as Record<string, unknown>).key as string)
                  : '',
              value:
                typeof (value as Record<string, unknown>).value === 'string'
                  ? ((value as Record<string, unknown>).value as string)
                  : '',
            }
          : { id: createNextCompositeItemId(pairs, 'pair-'), key: '', value: '' };
      const nextPairs = [...pairs, nextEntry];
      pairsRef.current = nextPairs;
      compatAppend();
      if (currentForm && name) {
        currentForm.appendValue(name, nextEntry);
        if (shouldValidateOn(name, currentForm, 'change')) {
          void currentForm.validateField(name, 'change');
        }
      } else {
        syncField(nextPairs);
      }
      return { index: pairs.length };
    },
    removeItem: (index) => {
      if (index < 0 || index >= pairs.length) {
        return { outOfBounds: true };
      }
      if (pairs.length <= minItems) {
        return { skipped: true };
      }
      const nextPairs = pairs.filter((_, candidateIndex) => candidateIndex !== index);
      const nextFocusIndex = Math.min(index, nextPairs.length - 1);
      pairsRef.current = nextPairs;
      compatRemoveAt(index);
      if (currentForm && name) {
        currentForm.removeValue(name, index);
        void currentForm.validateSubtree(name, 'change');
      } else {
        syncField(nextPairs);
      }
      queueMicrotask(() => {
        if (nextFocusIndex >= 0) {
          removeButtonRefs.current[nextFocusIndex]?.focus();
        }
      });
      return {};
    },
    moveItem: (from, to) => {
      if (from < 0 || from >= pairs.length || to < 0 || to >= pairs.length) {
        return { outOfBounds: true };
      }
      const nextPairs = pairs.slice();
      const [moved] = nextPairs.splice(from, 1);
      if (!moved) {
        return { outOfBounds: true };
      }
      nextPairs.splice(to, 0, moved);
      pairsRef.current = nextPairs;
      compatMove(from, to);
      if (currentForm && name) {
        currentForm.moveValue(name, from, to);
        if (shouldValidateOn(name, currentForm, 'change')) {
          void currentForm.validateField(name, 'change');
        }
      } else {
        syncField(nextPairs);
      }
      return {};
    },
  });

  React.useEffect(() => {
    if (!currentForm || !name) {
      return;
    }

    const registration: RuntimeFieldRegistration = {
      path: name,
      childPaths,
      getValue() {
        return pairsRef.current;
      },
      syncValue() {
        return pairsRef.current;
      },
      validateChild(path) {
        const relativePath = path.startsWith(`${name}.`) ? path.slice(name.length + 1) : path;
        const match = relativePath.match(/^(\d+)\.(key|value)$/);

        if (!match) {
          return [];
        }

        const pair = pairsRef.current[Number(match[1])];

        if (!pair) {
          return [];
        }

        const keyEmpty = pair.key.trim() === '';
        const valueEmpty = pair.value.trim() === '';
        const bothEmpty = keyEmpty && valueEmpty;

        if (bothEmpty) {
          return [];
        }

        if (match[2] === 'key' && keyEmpty) {
          return [
            {
              path,
              rule: 'required',
              message: `Entry ${Number(match[1]) + 1} key is required`,
            },
          ];
        }

        if (match[2] === 'value' && valueEmpty) {
          return [
            {
              path,
              rule: 'required',
              message: `Entry ${Number(match[1]) + 1} value is required`,
            },
          ];
        }

        return [];
      },
    };

    const handle = currentForm.registerField(registration);
    registrationRef.current = handle.accepted ? { registrationId: handle.registrationId } : undefined;
    return handle.unregister;
  }, [childPaths, currentForm, modelGeneration, name]);

  return (
    <div
      className={cn('nop-key-value', 'grid gap-3', props.meta.className)}
      data-slot="field-control"
    >
      {pairs.map((pair, index) => {
        return (
          <KeyValueRow
            key={pair.id}
            pair={pair}
            index={index}
            totalCount={pairs.length}
            minItems={minItems}
            name={name}
            currentForm={currentForm}
            childBehavior={childBehavior}
            onSync={syncField}
            onRemove={handleRemove}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            pairs={pairs}
            disabled={presentation.effectiveDisabled || presentation.readOnly}
            readOnly={presentation.readOnly}
            removeButtonRef={(button) => {
              removeButtonRefs.current[index] = button;
            }}
          />
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={presentation.effectiveDisabled || presentation.readOnly || atMaxItems}
        onClick={() => {
          if (presentation.readOnly || atMaxItems) {
            return;
          }

          const nextEntry = { id: createNextCompositeItemId(pairs, 'pair-'), key: '', value: '' };
          const nextPairs = [...pairs, nextEntry];
          pairsRef.current = nextPairs;
          compatAppend();

          if (currentForm && name) {
            currentForm.appendValue(name, nextEntry);
            if (shouldValidateOn(name, currentForm, 'change')) {
              void currentForm.validateField(name, 'change');
            }
            return;
          }

          syncField(nextPairs);
        }}
      >
        {props.props.addLabel ? String(props.props.addLabel) : t('flux.form.addEntry')}
      </Button>
    </div>
  );
}

export const keyValueRendererDefinition: RendererDefinition = {
  type: 'key-value',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: KeyValueRenderer,
  wrap: true,
  frameRootTag: 'div',
  fields: formFieldRules,
  componentCapabilityContracts: COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      const keyValueSchema = schema as KeyValueSchema;
      const configuredMinItems =
        typeof keyValueSchema.minItems === 'number'
          ? Math.max(0, Math.floor(keyValueSchema.minItems))
          : 1;
      const rules: ValidationRule[] = [
        {
          kind: 'minItems',
          value: configuredMinItems,
          message:
            configuredMinItems <= 1
              ? `${schema.label ?? schema.name ?? 'Field'} requires at least one entry`
              : `${schema.label ?? schema.name ?? 'Field'} requires at least ${configuredMinItems} entries`,
        },
      ];

      if (typeof keyValueSchema.maxItems === 'number') {
        const configuredMaxItems = Math.max(0, Math.floor(keyValueSchema.maxItems));
        rules.push({
          kind: 'maxItems',
          value: configuredMaxItems,
          message:
            configuredMaxItems <= 1
              ? `${schema.label ?? schema.name ?? 'Field'} must contain at most one entry`
              : `${schema.label ?? schema.name ?? 'Field'} must contain at most ${configuredMaxItems} entries`,
        });
      }

      if (keyValueSchema.uniqueKeys) {
        rules.push({
          kind: 'uniqueBy',
          itemPath: 'key',
          message:
            typeof keyValueSchema.uniqueKeys === 'object'
              ? (keyValueSchema.uniqueKeys.message ??
                `${schema.label ?? schema.name ?? 'Field'} keys must be unique`)
              : `${schema.label ?? schema.name ?? 'Field'} keys must be unique`,
        });
      }

      return rules;
    },
  },
};
