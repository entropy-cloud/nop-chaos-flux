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
import { PlusIcon } from 'lucide-react';
import {
  formFieldRules,
  getFieldValidationBehavior,
  shouldValidateOn,
  useFormFieldFromProps,
} from '@nop-chaos/flux-renderers-form';
import type { KeyValuePair, KeyValueSchema } from '@nop-chaos/flux-renderers-form';
import { KeyValueRow } from './key-value-row.js';
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
  const { currentForm, scope, presentation } = useFormFieldFromProps(props);
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
  // toRawKeyValuePairs clones every entry, so untouched rows would get fresh
  // pair objects on each keystroke and row memoization would never hit. The
  // cache re-issues the previous object for unchanged (id, key, value) and
  // reuses the previous array identity once every element is cache-stable.
  const [pairIdentityCache, setPairIdentityCache] = React.useState<KeyValuePair[]>([]);
  const pairs = React.useMemo<KeyValuePair[]>(() => {
    const next = rawPairs.map((pair, index) => {
      const id = pair.id ?? compatKeyAt(index);
      const cached = pairIdentityCache[index];
      if (cached && cached.id === id && cached.key === pair.key && cached.value === pair.value) {
        return cached;
      }
      return { id, key: pair.key, value: pair.value };
    });
    if (
      pairIdentityCache.length === next.length &&
      pairIdentityCache.every((pair, index) => pair === next[index])
    ) {
      return pairIdentityCache;
    }
    return next;
  }, [rawPairs, compatKeyAt, pairIdentityCache]);
  React.useEffect(() => {
    setPairIdentityCache(pairs);
  }, [pairs]);
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

  // Row-level patch sync: rows own only their index + patch, so a keystroke in
  // one row produces stable row props for every other row (memo comparator).
  const syncPairAt = React.useCallback(
    (index: number, patch: Partial<KeyValuePair>) => {
      syncField(
        pairsRef.current.map((candidate, candidateIndex) =>
          candidateIndex === index ? { ...candidate, ...patch } : candidate,
        ),
      );
    },
    [syncField],
  );

  const registerRemoveButton = React.useCallback((index: number, button: HTMLButtonElement | null) => {
    removeButtonRefs.current[index] = button;
  }, []);

  const handleRemove = React.useCallback(
    (index: number) => {
      const currentPairs = pairsRef.current;
      const nextPairs = currentPairs.filter((_, candidateIndex) => candidateIndex !== index);
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
    [currentForm, name, syncField, compatRemoveAt],
  );

  const handleMove = React.useCallback(
    (index: number, to: number) => {
      const currentPairs = pairsRef.current;
      if (index === to || to < 0 || to >= currentPairs.length) {
        return;
      }

      const nextPairs = currentPairs.slice();
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
    [currentForm, name, syncField, compatMove],
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
              message: t('validation.required', {
                label: t('flux.form.entryKeyLabel', { index: Number(match[1]) + 1 }),
              }),
            },
          ];
        }

        if (match[2] === 'value' && valueEmpty) {
          return [
            {
              path,
              rule: 'required',
              message: t('validation.required', {
                label: t('flux.form.entryValueLabel', { index: Number(match[1]) + 1 }),
              }),
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
            onChange={syncPairAt}
            onRemove={handleRemove}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            disabled={presentation.effectiveDisabled || presentation.readOnly}
            readOnly={presentation.readOnly}
            registerRemoveButton={registerRemoveButton}
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
        <PlusIcon className="size-4" />
        {props.props.addLabel ? String(props.props.addLabel) : t('flux.form.addEntry')}
      </Button>
    </div>
  );
}

export const keyValueRendererDefinition: RendererDefinition = {
  type: 'key-value',
  displayName: 'Key Value',
  category: 'Form Advanced',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: KeyValueRenderer,
  wrap: true,
  frameRootTag: 'div',
  fields: [
    ...formFieldRules,
    { key: 'addLabel', kind: 'prop' },
    { key: 'uniqueKeys', kind: 'prop' },
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
      const keyValueSchema = schema as KeyValueSchema;
      const configuredMinItems =
        typeof keyValueSchema.minItems === 'number'
          ? Math.max(0, Math.floor(keyValueSchema.minItems))
          : 1;
      const rules: ValidationRule[] = [
        {
          kind: 'minItems',
          value: configuredMinItems,
        },
      ];

      if (typeof keyValueSchema.maxItems === 'number') {
        const configuredMaxItems = Math.max(0, Math.floor(keyValueSchema.maxItems));
        rules.push({
          kind: 'maxItems',
          value: configuredMaxItems,
        });
      }

      if (keyValueSchema.uniqueKeys) {
        const customMessage =
          typeof keyValueSchema.uniqueKeys === 'object'
            ? keyValueSchema.uniqueKeys.message
            : undefined;
        rules.push({
          kind: 'uniqueBy',
          itemPath: 'key',
          ...(customMessage ? { message: customMessage } : {}),
        });
      }

      return rules;
    },
  },
};
