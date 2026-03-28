import React from 'react';
import type {
  BaseSchema,
  CompiledValidationBehavior,
  RendererComponentProps,
  RendererDefinition,
  RuntimeFieldRegistration,
  ValidationRule
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { useCurrentForm, useCurrentFormState, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
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
import type { KeyValuePair, KeyValueSchema } from '../schemas';
import { FieldHint, FieldLabel } from './shared';

function KeyValueRow(props: {
  pair: KeyValuePair;
  index: number;
  name: string;
  currentForm: ReturnType<typeof useCurrentForm>;
  childBehavior: CompiledValidationBehavior;
  onSync(nextPairs: KeyValuePair[]): void;
  pairs: KeyValuePair[];
  pairsRef: React.MutableRefObject<KeyValuePair[]>;
}) {
  const { pair, index, name, currentForm, childBehavior, onSync, pairs, pairsRef } = props;
  const keyPath = `${name}.${index}.key`;
  const valuePath = `${name}.${index}.value`;
  const keyFieldState = useCompositeChildFieldState(keyPath);
  const valueFieldState = useCompositeChildFieldState(valuePath);
  const keyUi = getChildFieldUiState({
    behavior: childBehavior,
    fieldState: keyFieldState
  });
  const valueUi = getChildFieldUiState({
    behavior: childBehavior,
    fieldState: valueFieldState
  });

  return (
    <div className="nop-kv-row">
      <div className={keyUi.className}>
        <Input
          className="nop-input"
          type="text"
          value={pair.key}
          placeholder="Key"
          aria-invalid={keyUi.showError ? true : undefined}
          onFocus={() => {
            if (currentForm && name) {
              currentForm.visitField(name);
              currentForm.visitField(keyPath);
            }
          }}
          onChange={(event) => {
            const nextPairs = pairs.map((candidate, candidateIndex) =>
              candidateIndex === index ? { ...candidate, key: event.target.value } : candidate
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
        <FieldHint
          errorMessage={keyUi.error?.message}
          showError={keyUi.showError}
        />
      </div>
      <div className={valueUi.className}>
        <Input
          className="nop-input"
          type="text"
          value={pair.value}
          placeholder="Value"
          aria-invalid={valueUi.showError ? true : undefined}
          onFocus={() => {
            if (currentForm && name) {
              currentForm.visitField(name);
              currentForm.visitField(valuePath);
            }
          }}
          onChange={(event) => {
            const nextPairs = pairs.map((candidate, candidateIndex) =>
              candidateIndex === index ? { ...candidate, value: event.target.value } : candidate
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
        <FieldHint
          errorMessage={valueUi.error?.message}
          showError={valueUi.showError}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="nop-kv-remove"
        onClick={() => {
          const nextPairs = pairs.filter((candidate) => candidate.id !== pair.id);
          pairsRef.current = nextPairs;

          if (currentForm && name) {
            onSync(nextPairs);
            currentForm.removeValue(name, index);
            void currentForm.validateSubtree(name);
            return;
          }

          onSync(nextPairs);
        }}
      >
        Remove
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
      value: typeof candidate.value === 'string' ? candidate.value : ''
    };
  });
}

function keyValuePairsEqual(a: KeyValuePair[], b: KeyValuePair[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((pair, index) =>
    pair.id === b[index].id && pair.key === b[index].key && pair.value === b[index].value
  );
}

export function KeyValueRenderer(props: RendererComponentProps<KeyValueSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const presentation = useFieldPresentation(name, currentForm);
  const labelContent = resolveFieldLabelContent(props);
  const childBehavior = getFieldValidationBehavior(name, currentForm);
  const [pairs, setPairs] = React.useState<KeyValuePair[]>(() => toKeyValuePairs(readFieldValue(scope, name)));
  const pairsRef = React.useRef(pairs);
  const registrationRef = React.useRef<RuntimeFieldRegistration | undefined>(undefined);
  const childPaths = React.useMemo(
    () => pairs.flatMap((_, index) => [`${name}.${index}.key`, `${name}.${index}.value`]),
    [name, pairs]
  );

  if (registrationRef.current) {
    registrationRef.current.childPaths = childPaths;
  }

  React.useEffect(() => {
    pairsRef.current = pairs;
  }, [pairs]);

  const formExternalValue = useCurrentFormState(
    (state) => (currentForm && name ? toKeyValuePairs(getIn(state.values, name)) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((pair, index) =>
        pair.id === b[index].id && pair.key === b[index].key && pair.value === b[index].value
      );
    }
  );
  const scopeExternalValue = useScopeSelector(
    (scopeData) => (currentForm || !name ? undefined : toKeyValuePairs(getIn(scopeData, name))),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((pair, index) =>
        pair.id === b[index].id && pair.key === b[index].key && pair.value === b[index].value
      );
    }
  );
  const externalValue = currentForm ? formExternalValue : scopeExternalValue;

  React.useEffect(() => {
    if (externalValue !== undefined && !keyValuePairsEqual(externalValue, pairsRef.current)) {
      pairsRef.current = externalValue;
      setPairs(externalValue);
    }
  }, [externalValue]);

  const syncField = React.useCallback(
    (nextPairs: KeyValuePair[]) => {
      pairsRef.current = nextPairs;
      setPairs(nextPairs);

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
              message: `Entry ${Number(match[1]) + 1} key is required`
            }
          ];
        }

        if (match[2] === 'value' && valueEmpty) {
          return [
            {
              path,
              rule: 'required',
              message: `Entry ${Number(match[1]) + 1} value is required`
            }
          ];
        }

        return [];
      }
    };

    registrationRef.current = registration;
    return currentForm.registerField(registration);
    }, [childPaths, currentForm, name]);

  return (
    <label className={presentation.className}>
      <FieldLabel content={labelContent} />
      <div className="nop-kv-list">
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
              pairs={pairs}
              pairsRef={pairsRef}
            />
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="nop-kv-add"
          onClick={() => {
            const nextEntry = { id: `pair-${pairs.length + 1}`, key: '', value: '' };
            const nextPairs = [...pairs, nextEntry];
            pairsRef.current = nextPairs;

            if (currentForm && name) {
              setPairs(nextPairs);
              currentForm.appendValue(name, nextEntry);
              void currentForm.validateField(name);
              return;
            }

            syncField(nextPairs);
          }}
        >
          {props.props.addLabel ? String(props.props.addLabel) : 'Add entry'}
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

export const keyValueRendererDefinition: RendererDefinition = {
  type: 'key-value',
  component: KeyValueRenderer,
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      const keyValueSchema = schema as KeyValueSchema;
      const rules: ValidationRule[] = [
        { kind: 'minItems', value: 1, message: `${schema.label ?? schema.name ?? 'Field'} requires at least one entry` }
      ];

      if (keyValueSchema.uniqueKeys) {
        rules.push({
          kind: 'uniqueBy',
          itemPath: 'key',
          message:
            typeof keyValueSchema.uniqueKeys === 'object'
              ? keyValueSchema.uniqueKeys.message ?? `${schema.label ?? schema.name ?? 'Field'} keys must be unique`
              : `${schema.label ?? schema.name ?? 'Field'} keys must be unique`
        });
      }

      return rules;
    }
  }
};
