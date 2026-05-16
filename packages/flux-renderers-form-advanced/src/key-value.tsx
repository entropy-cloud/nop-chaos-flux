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
  useCurrentFormState,
  useCurrentFormModelGeneration,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input, cn } from '@nop-chaos/ui';
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

const EMPTY_KEY_VALUE_PAIRS: KeyValuePair[] = [];

function KeyValueRow(props: {
  pair: KeyValuePair;
  index: number;
  name: string;
  currentForm: FormRuntime | undefined;
  childBehavior: CompiledValidationBehavior;
  onSync(nextPairs: KeyValuePair[]): void;
  onRemove: (index: number) => void;
  pairs: KeyValuePair[];
  disabled?: boolean;
  readOnly?: boolean;
  removeButtonRef?: (button: HTMLButtonElement | null) => void;
}) {
  const {
    pair,
    index,
    name,
    currentForm,
    childBehavior,
    onSync,
    onRemove,
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

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-2.5 items-start">
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
                void currentForm.validateField(keyPath);
              }
            }
          }}
          onBlur={() => {
            if (currentForm) {
              currentForm.touchField(keyPath);

              if (shouldValidateOn(name, currentForm, 'blur')) {
                void currentForm.validateField(keyPath);
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
                void currentForm.validateField(valuePath);
              }
            }
          }}
          onBlur={() => {
            if (currentForm) {
              currentForm.touchField(valuePath);

              if (shouldValidateOn(name, currentForm, 'blur')) {
                void currentForm.validateField(valuePath);
              }
            }
          }}
        />
        <FieldHint errorMessage={valueUi.error?.message} showError={valueUi.showError} id={valueErrorId} />
      </div>
      <Button
        ref={removeButtonRef}
        type="button"
        variant="destructive"
        size="sm"
        disabled={disabled}
        aria-label={`${t('flux.form.remove')} entry ${index + 1}`}
        onClick={() => onRemove(index)}
      >
        {t('flux.form.remove')}
      </Button>
    </div>
  );
}

function toKeyValuePairs(value: unknown): KeyValuePair[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const candidate = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    return {
      id: typeof candidate.id === 'string' ? candidate.id : `pair-${index}`,
      key: typeof candidate.key === 'string' ? candidate.key : '',
      value: typeof candidate.value === 'string' ? candidate.value : '',
    };
  });
}

function keyValuePairsEqual(a: KeyValuePair[], b: KeyValuePair[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every(
    (pair, index) =>
      pair.id === b[index].id && pair.key === b[index].key && pair.value === b[index].value,
  );
}

export function KeyValueRenderer(props: RendererComponentProps<KeyValueSchema>) {
  const name = String(props.props.name ?? '');
  const hasName = name.length > 0;
  const { currentForm, scope, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const childBehavior = getFieldValidationBehavior(name, currentForm);
  const pairsRef = React.useRef<KeyValuePair[]>([]);
  const registrationRef = React.useRef<RuntimeFieldRegistration | undefined>(undefined);
  const removeButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const modelGeneration = useCurrentFormModelGeneration();

  const formExternalValue = useCurrentFormState(
    (state) => (currentForm && hasName ? toKeyValuePairs(getIn(state.values, name)) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every(
        (pair, index) =>
          pair.id === b[index].id && pair.key === b[index].key && pair.value === b[index].value,
      );
    },
    { enabled: Boolean(currentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeExternalValue = useScopeSelector(
    (scopeData) => (currentForm || !hasName ? undefined : toKeyValuePairs(getIn(scopeData, name))),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every(
        (pair, index) =>
          pair.id === b[index].id && pair.key === b[index].key && pair.value === b[index].value,
      );
    },
    { enabled: Boolean(!currentForm && hasName), fallback: undefined, paths: hasName ? [name] : undefined },
  );
  const externalValue = currentForm ? formExternalValue : scopeExternalValue;
  const pairs = externalValue ?? EMPTY_KEY_VALUE_PAIRS;
  const childPaths = React.useMemo(
    () => pairs.flatMap((_, index) => [`${name}.${index}.key`, `${name}.${index}.value`]),
    [name, pairs],
  );

  React.useEffect(() => {
    if (!keyValuePairsEqual(pairsRef.current, pairs)) {
      pairsRef.current = pairs;
    }
  }, [pairs]);

  React.useEffect(() => {
    if (registrationRef.current) {
      registrationRef.current.childPaths = childPaths;
    }
  }, [childPaths]);

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
      void currentForm.validateField(name);
    },
    [currentForm, name, scope],
  );

  const handleRemove = React.useCallback(
    (index: number) => {
      const nextPairs = pairs.filter((_, candidateIndex) => candidateIndex !== index);
      const nextFocusIndex = Math.min(index, nextPairs.length - 1);

      pairsRef.current = nextPairs;

      if (currentForm && name) {
        currentForm.removeValue(name, index);
        void currentForm.validateSubtree(name);
      } else {
        syncField(nextPairs);
      }

      queueMicrotask(() => {
        if (nextFocusIndex >= 0) {
          removeButtonRefs.current[nextFocusIndex]?.focus();
        }
      });
    },
    [currentForm, name, pairs, syncField],
  );

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

    registrationRef.current = registration;
    return currentForm.registerField(registration).unregister;
  }, [childPaths, currentForm, modelGeneration, name]);

  return (
    <div
      className={cn('nop-key-value', 'grid gap-3', props.meta.className)}
      data-slot="field-control"
      data-testid={props.meta.testid}
      data-cid={props.meta.cid}
    >
      {pairs.map((pair, index) => {
        return (
          <KeyValueRow
            key={pair.id}
            pair={pair}
            index={index}
            name={name}
            currentForm={currentForm}
            childBehavior={childBehavior}
            onSync={syncField}
            onRemove={handleRemove}
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
        disabled={presentation.effectiveDisabled || presentation.readOnly}
        onClick={() => {
          if (presentation.readOnly) {
            return;
          }

          const nextEntry = { id: createNextCompositeItemId(pairs, 'pair-'), key: '', value: '' };
          const nextPairs = [...pairs, nextEntry];
          pairsRef.current = nextPairs;

          if (currentForm && name) {
            currentForm.appendValue(name, nextEntry);
            void currentForm.validateField(name);
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
  component: KeyValueRenderer,
  wrap: true,
  fields: formFieldRules,
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      const keyValueSchema = schema as KeyValueSchema;
      const rules: ValidationRule[] = [
        {
          kind: 'minItems',
          value: 1,
          message: `${schema.label ?? schema.name ?? 'Field'} requires at least one entry`,
        },
      ];

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
