import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RegisteredRendererDefinition,
  RuntimeFieldRegistration,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { useCurrentFormModelGeneration } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import { PlusIcon } from 'lucide-react';
import {
  formFieldRules,
  getFieldValidationBehavior,
  useFormFieldFromProps,
} from '@nop-chaos/flux-renderers-form';
import type { KeyValuePair, KeyValueSchema } from '@nop-chaos/flux-renderers-form';
import { KeyValueRow } from './key-value-row.js';
import { createNextCompositeItemId } from './composite-field/composite-item-id.js';
import {
  rawKeyValuePairsEqual,
  toRawKeyValuePairs,
  type RawKeyValuePair,
} from './key-value-normalizer.js';
import {
  COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
} from './composite-field/composite-editor-capability-contracts.js';
import {
  useArrayContainerController,
  type UseArrayContainerControllerParams,
} from './composite-field/array-container-controller.js';

function deriveKeyValuePairs(
  raw: RawKeyValuePair[],
  compatKeyAt: (index: number) => string,
): KeyValuePair[] {
  return raw.map((pair, index) => ({
    id: pair.id ?? compatKeyAt(index),
    key: pair.key,
    value: pair.value,
  }));
}

function keyValueUiNewEntry(items: KeyValuePair[]): KeyValuePair {
  return { id: createNextCompositeItemId(items, 'pair-'), key: '', value: '' };
}

function keyValueNewEntry(value: unknown, items: KeyValuePair[]): KeyValuePair {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? {
        id:
          typeof (value as Record<string, unknown>).id === 'string'
            ? ((value as Record<string, unknown>).id as string)
            : createNextCompositeItemId(items, 'pair-'),
        key:
          typeof (value as Record<string, unknown>).key === 'string'
            ? ((value as Record<string, unknown>).key as string)
            : '',
        value:
          typeof (value as Record<string, unknown>).value === 'string'
            ? ((value as Record<string, unknown>).value as string)
            : '',
      }
    : { id: createNextCompositeItemId(items, 'pair-'), key: '', value: '' };
}

export function KeyValueRenderer(props: RendererComponentProps<KeyValueSchema>) {
  const name = String(props.props.name ?? '');
  const { currentForm, scope, presentation } = useFormFieldFromProps(props);
  const childBehavior = getFieldValidationBehavior(name, currentForm);
  const registrationRef = React.useRef<{ registrationId: string } | undefined>(undefined);
  const modelGeneration = useCurrentFormModelGeneration();

  const controllerParams: UseArrayContainerControllerParams<RawKeyValuePair, KeyValuePair> = {
    id: props.id,
    cid: props.meta.cid,
    type: 'key-value',
    name,
    parentForm: currentForm,
    parentScope: scope,
    isInteractive: () => !presentation.effectiveDisabled && !presentation.readOnly,
    readRawValue: toRawKeyValuePairs,
    rawValuesEqual: (a, b) => rawKeyValuePairsEqual(a ?? [], b ?? []),
    deriveItems: deriveKeyValuePairs,
    identity: {
      mode: 'entry-id',
      compatPrefix: 'pair-',
      buildItemInstancePath: false,
      uiNewEntryFactory: keyValueUiNewEntry,
      newEntryFactory: keyValueNewEntry,
    },
    minItemsDefault: 1,
    minItems: props.props.minItems,
    maxItems: props.props.maxItems,
    minItemsGuard: 'button-only',
    validate: {
      uiAddDepth: 'field',
      capabilityAddDepth: 'field',
      removeDepth: 'subtree',
      removeValidateGate: 'always',
    },
    uiAddMechanics: 'live-append',
    handlerReads: 'itemsRef',
    syncRefOnMutate: true,
    uiMoveBounds: 'to-bounds',
    removeGate: 'none',
    focusRestore: { timing: 'microtask', on: ['remove'] },
    events: {},
  };
  const controller = useArrayContainerController(controllerParams);

  const {
    items,
    itemsRef,
    syncAll,
    atMaxItems,
    minItems,
    handleAdd,
    handleRemove,
    handleMoveUp,
    handleMoveDown,
    registerRemoveButton,
  } = controller;
  // The controller derives fresh pair objects on every raw change; untouched
  // rows must keep their previous object identities so the row memoization
  // (KeyValueRow comparator) keeps hitting. The cache re-issues the previous
  // object for unchanged (id, key, value) and reuses the previous array
  // identity once every element is cache-stable.
  const [pairIdentityCache, setPairIdentityCache] = React.useState<KeyValuePair[]>([]);
  const pairs = React.useMemo<KeyValuePair[]>(() => {
    const next = items.map((pair, index) => {
      const cached = pairIdentityCache[index];
      if (cached && cached.id === pair.id && cached.key === pair.key && cached.value === pair.value) {
        return cached;
      }
      return { id: pair.id, key: pair.key, value: pair.value };
    });
    if (
      pairIdentityCache.length === next.length &&
      pairIdentityCache.every((pair, index) => pair === next[index])
    ) {
      return pairIdentityCache;
    }
    return next;
  }, [items, pairIdentityCache]);
  React.useEffect(() => {
    setPairIdentityCache(pairs);
  }, [pairs]);

  // Row-level patch sync: rows own only their index + patch, so a keystroke in
  // one row produces stable row props for every other row (memo comparator).
  const syncPairAt = React.useCallback(
    (index: number, patch: Partial<KeyValuePair>) => {
      syncAll(
        itemsRef.current.map((candidate, candidateIndex) =>
          candidateIndex === index ? { ...candidate, ...patch } : candidate,
        ),
      );
    },
    [syncAll, itemsRef],
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
        const match = relativePath.match(/^(\d+)\.(key|value)$/);

        if (!match) {
          return [];
        }

        const pair = itemsRef.current[Number(match[1])];

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
  }, [childPaths, currentForm, modelGeneration, name, itemsRef]);

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

          handleAdd();
        }}
      >
        <PlusIcon className="size-4" />
        {props.props.addLabel ? String(props.props.addLabel) : t('flux.form.addEntry')}
      </Button>
    </div>
  );
}

export const keyValueRendererDefinition: RegisteredRendererDefinition = {
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
