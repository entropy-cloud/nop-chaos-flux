import React from 'react';
import type {
  BaseSchema,
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
import { Button, cn } from '@nop-chaos/ui';
import {
  formFieldRules,
  getFieldValidationBehavior,
  shouldValidateOn,
  useFormFieldController,
} from '@nop-chaos/flux-renderers-form';
import type { KeyValuePair, KeyValueSchema } from '@nop-chaos/flux-renderers-form';
import { createNextCompositeItemId } from './composite-field/composite-item-id.js';
import { KeyValueRow } from './key-value-row.js';
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
  const uniqueKeysEnabled = Boolean(props.props.uniqueKeys);
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

      if (currentForm && name) {
        currentForm.removeValue(name, index);
        // Gate removal validation on `validateOn` for parity with add/move and
        // with the sibling composite editors (combo/input-table/array-editor),
        // which all respect shouldValidateOn before revalidating.
        if (shouldValidateOn(name, currentForm, 'change')) {
          void currentForm.validateSubtree(name, 'change');
        }
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

      if (currentForm && name) {
        currentForm.moveValue(name, index, to);
        if (shouldValidateOn(name, currentForm, 'change')) {
          void currentForm.validateField(name, 'change');
        }
        return;
      }

      syncField(nextPairs);
    },
    [currentForm, name, pairs, syncField],
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
      if (currentForm && name) {
        currentForm.removeValue(name, index);
        if (shouldValidateOn(name, currentForm, 'change')) {
          void currentForm.validateSubtree(name, 'change');
        }
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

        // Inline duplicate-key feedback (H25): when uniqueKeys is configured,
        // flag the offending row's key inline (not only as an aggregate field
        // error) so the user sees WHICH entries collide.
        if (match[2] === 'key' && uniqueKeysEnabled && !keyEmpty) {
          const key = pair.key.trim();
          const hasDuplicate = pairsRef.current.some(
            (other, otherIndex) =>
              otherIndex !== Number(match[1]) && other && other.key.trim() === key,
          );
          if (hasDuplicate) {
            return [
              {
                path,
                rule: 'uniqueBy',
                message: `Entry ${Number(match[1]) + 1} key must be unique`,
              },
            ];
          }
        }

        return [];
      },
    };

    const handle = currentForm.registerField(registration);
    registrationRef.current = handle.accepted ? { registrationId: handle.registrationId } : undefined;
    return handle.unregister;
  }, [childPaths, currentForm, modelGeneration, name, uniqueKeysEnabled]);

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
