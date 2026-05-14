import React from 'react';
import type {
  ActionSchema,
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { actionAdapter, getIn, setIn } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { FormContext, ScopeContext, ValidationContext } from '@nop-chaos/flux-react/unstable';
import {
  useCurrentForm,
  useCurrentValidationScope,
  useCurrentFormState,
  useRenderScope,
  useRendererEnv,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import type { ObjectFieldSchema } from './composite-schemas.js';
import { formLabelFieldRule, useFieldPresentation } from '@nop-chaos/flux-renderers-form';
import { cn } from '@nop-chaos/ui';
import { createProjectedInlineForm } from './projected-inline-form.js';
import { createProjectedOwnerScope } from '../projected-owner-scope.js';
import { createProjectedValidationRuntime } from '../detail-view/projected-validation-runtime.js';

type BaseNodeInstance = RendererComponentProps['node'];

const transformOutSequences = new WeakMap<object, number>();
const pendingTransformOutByOwner = new WeakMap<object, Promise<unknown> | null>();

function nextTransformOutSequence(owner: object): number {
  const next = (transformOutSequences.get(owner) ?? 0) + 1;
  transformOutSequences.set(owner, next);
  return next;
}

function invalidateTransformOutSequence(owner: object): void {
  transformOutSequences.set(owner, (transformOutSequences.get(owner) ?? 0) + 1);
}

function isTransformOutSequenceCurrent(owner: object, sequence: number): boolean {
  return transformOutSequences.get(owner) === sequence;
}

function getPendingTransformOut(owner: object): Promise<unknown> | null {
  return pendingTransformOutByOwner.get(owner) ?? null;
}

function setPendingTransformOut(owner: object, value: Promise<unknown> | null): void {
  pendingTransformOutByOwner.set(owner, value);
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

async function revalidateProjectedOwner(
  owner:
    | Pick<NonNullable<ReturnType<typeof useCurrentValidationScope>>, 'validateSubtree'>
    | undefined,
  path: string,
): Promise<void> {
  if (!owner || !path) {
    return;
  }

  await owner.validateSubtree(path, 'commit');
}

export async function applyNonFormObjectFieldCommit(input: {
  name: string;
  committedValue: unknown;
  parentScope: Pick<ScopeRef, 'update'>;
  parentValidationOwner?: Pick<NonNullable<ReturnType<typeof useCurrentValidationScope>>, 'validateSubtree'>;
}): Promise<void> {
  input.parentScope.update(input.name, input.committedValue);
  await revalidateProjectedOwner(input.parentValidationOwner, input.name);
}

function createObjectFieldChildScope(
  parentScope: ScopeRef,
  name: string,
  readOnly: boolean,
  resolvedValue: unknown,
  writeValue: (path: string, value: unknown) => void,
): ScopeRef {
  return createProjectedOwnerScope({
    parentScope,
    scopeId: `${parentScope.id}:obj:${name}`,
    scopePath: `${parentScope.path}.${name}`,
    readOnly,
    getValue: () => resolvedValue,
    setValue: (value) => writeValue('', value),
    setNestedValue: writeValue,
    getAdditionalPath: (path) => getIn(resolvedValue, path),
    hasAdditionalPath: (path) => getIn(resolvedValue, path) !== undefined,
    setAdditionalPath: writeValue,
    merge(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        writeValue('', (data as { value: unknown }).value);
        return;
      }

      writeValue('', {
        ...(resolvedValue && typeof resolvedValue === 'object'
          ? (resolvedValue as Record<string, unknown>)
          : {}),
        ...(data as Record<string, unknown>),
      });
    },
    replace(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        writeValue('', (data as { value: unknown }).value);
        return;
      }

      writeValue('', data);
    },
  });
}

export function ObjectFieldRenderer(props: RendererComponentProps<ObjectFieldSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const parentValidationOwner = useCurrentValidationScope();
  const env = useRendererEnv();
  const name = String(props.props.name ?? '');
  const readOnly = Boolean(props.props.readOnly);
  const schemaProps = props.props as ObjectFieldSchema;

  const formValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is,
    { path: name || undefined },
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  const rawValue = parentForm ? formValue : scopeValue;
  const usesWorkingValue = Boolean(schemaProps.transformInAction || schemaProps.transformOutAction);

  const runAdaptationAction = React.useCallback(
    (actionSchema: ActionSchema | ActionSchema[]) =>
      props.helpers.dispatch(actionSchema, {
        scope: parentScope,
        form: parentForm ?? undefined,
        page: undefined,
        nodeInstance: props.node as BaseNodeInstance,
      }),
    [parentForm, parentScope, props.helpers, props.node],
  );

  const valueAdapter = React.useMemo(
    () =>
      actionAdapter(
        schemaProps.transformInAction,
        schemaProps.transformOutAction,
        undefined,
        runAdaptationAction,
      ),
    [runAdaptationAction, schemaProps.transformInAction, schemaProps.transformOutAction],
  );

  const [resolvedValue, setResolvedValue] = React.useState(rawValue);
  const projectedValue = usesWorkingValue ? resolvedValue : rawValue;
  const transformOutOwner = parentForm ?? parentScope;
  const pendingTransformOutOwner = React.useMemo(() => ({}), []);

  React.useEffect(() => {
    return () => {
      invalidateTransformOutSequence(transformOutOwner);
      setPendingTransformOut(pendingTransformOutOwner, null);
    };
  }, [pendingTransformOutOwner, transformOutOwner]);

  React.useEffect(() => {
    if (!usesWorkingValue || !schemaProps.transformInAction) {
      setResolvedValue(rawValue);
      return;
    }

    const ac = new AbortController();
    const nextValue = valueAdapter.in(rawValue, {
      name,
      readOnly: readOnly || Boolean(props.meta.disabled),
      scope: parentScope,
      form: parentForm ?? null,
    });

    if (isPromiseLike(nextValue)) {
      void nextValue
        .then((resolvedNextValue: unknown) => {
          if (!ac.signal.aborted) {
            setResolvedValue(resolvedNextValue);
          }
        })
        .catch((error: unknown) => {
          if (!ac.signal.aborted) {
            setResolvedValue(rawValue);
            console.warn('[object-field] transformIn failed', error);
          }
        });
      return () => {
        ac.abort();
      };
    }

    setResolvedValue(nextValue);

    return () => {
      ac.abort();
    };
  }, [
    name,
    parentForm,
    parentScope,
    props.meta.disabled,
    rawValue,
    readOnly,
    schemaProps.transformInAction,
    usesWorkingValue,
    valueAdapter,
  ]);

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly,
  });

  const bodyContent = resolveRendererSlotContent(props, 'body');
  const childValidationOwner = React.useMemo(() => {
    if (parentForm || !parentValidationOwner || !name) {
      return parentValidationOwner;
    }

    return createProjectedValidationRuntime(parentValidationOwner, {
      ownerRootPath: name,
      prefixPath(path) {
        if (!path) {
          return name;
        }

        return `${name}.${path}`;
      },
    });
  }, [name, parentForm, parentValidationOwner]);

  const writeProjectedValue = React.useCallback(
    (path: string, nextLeafValue: unknown) => {
      const nextWorkingValue = !path
        ? nextLeafValue
        : setIn(
            projectedValue && typeof projectedValue === 'object'
              ? (projectedValue as Record<string, unknown>)
              : {},
            path,
            nextLeafValue,
          );

      if (usesWorkingValue) {
        setResolvedValue(nextWorkingValue);
      }

      if (schemaProps.transformOutAction) {
        const committedValue = valueAdapter.out(nextWorkingValue, {
          name,
          readOnly: readOnly || Boolean(props.meta.disabled),
          originalValue: rawValue,
          scope: parentScope,
          form: parentForm ?? null,
        });

        if (isPromiseLike(committedValue)) {
          const sequence = nextTransformOutSequence(transformOutOwner);
          setPendingTransformOut(pendingTransformOutOwner, committedValue);
          void committedValue
            .then((resolvedCommittedValue: unknown) => {
              if (!isTransformOutSequenceCurrent(transformOutOwner, sequence)) {
                return;
              }

              if (parentForm && name) {
                parentForm.setValue(name, resolvedCommittedValue);
                return;
              }

              void applyNonFormObjectFieldCommit({
                name,
                committedValue: resolvedCommittedValue,
                parentScope,
                parentValidationOwner,
              }).catch((error: unknown) => {
                if (!isTransformOutSequenceCurrent(transformOutOwner, sequence)) {
                  return;
                }

                env.notify?.(
                  'warning',
                  error instanceof Error && error.message ? error.message : t('flux.common.saveFailed'),
                );
              });
            })
            .catch((error: unknown) => {
              if (!isTransformOutSequenceCurrent(transformOutOwner, sequence)) {
                return;
              }

              console.warn('[object-field] transformOut failed', error);
            })
            .finally(() => {
              if (getPendingTransformOut(pendingTransformOutOwner) === committedValue) {
                setPendingTransformOut(pendingTransformOutOwner, null);
              }
            });
          return;
        }

        invalidateTransformOutSequence(transformOutOwner);
        setPendingTransformOut(pendingTransformOutOwner, null);
        if (parentForm && name) {
          parentForm.setValue(name, committedValue);
          return;
        }

        void applyNonFormObjectFieldCommit({
          name,
          committedValue,
          parentScope,
          parentValidationOwner,
        }).catch((error: unknown) => {
          env.notify?.(
            'warning',
            error instanceof Error && error.message ? error.message : t('flux.common.saveFailed'),
          );
        });
        return;
      }

      if (!path) {
        if (parentForm && name) {
          parentForm.setValue(name, nextWorkingValue);
          return;
        }

        parentScope.update(name, nextWorkingValue);
        return;
      }

      if (parentForm && name) {
        parentForm.setValue(`${name}.${path}`, nextLeafValue);
        return;
      }

      parentScope.update(`${name}.${path}`, nextLeafValue);
    },
    [
      name,
      env,
      parentForm,
      parentScope,
      parentValidationOwner,
      pendingTransformOutOwner,
      projectedValue,
      props.meta.disabled,
      rawValue,
      readOnly,
      schemaProps.transformOutAction,
      transformOutOwner,
      usesWorkingValue,
      valueAdapter,
    ],
  );

  const childScope = React.useMemo(
    () =>
      name
        ? createObjectFieldChildScope(
            parentScope,
            name,
            readOnly || presentation.effectiveDisabled,
            projectedValue,
            writeProjectedValue,
          )
        : parentScope,
    [
      name,
      parentScope,
      presentation.effectiveDisabled,
      projectedValue,
      readOnly,
      writeProjectedValue,
    ],
  );

  const childForm = React.useMemo(() => {
    if (!name || !parentForm) {
      return parentForm;
    }

    return createProjectedInlineForm({
      parentForm,
      ownerRootPath: name,
      prefixPath(path) {
        if (!path || !name) {
          return path;
        }

        return `${name}.${path}`;
      },
      projectValues() {
        return (projectedValue ?? {}) as Record<string, unknown>;
      },
      setValue(path, value) {
        writeProjectedValue(path, value);
      },
      setValues(values) {
        for (const [path, value] of Object.entries(values)) {
          writeProjectedValue(path, value);
        }
      },
    });
  }, [parentForm, name, projectedValue, writeProjectedValue]);

  React.useEffect(() => {
    if (!parentForm || !name || !schemaProps.transformOutAction) {
      return;
    }

    const childOwnerId = `${parentForm.id}:${name}:object-field`;
    parentForm.registerChildContract({
      childOwnerId,
      mode: 'recurse-submit',
      active: true,
      unregister() {
        parentForm.unregisterChildContract(childOwnerId);
      },
      getState() {
        return {
          ready: getPendingTransformOut(pendingTransformOutOwner) === null,
          validating: getPendingTransformOut(pendingTransformOutOwner) !== null,
          valid: true,
          hasErrors: false,
        };
      },
      async triggerValidation() {
        await getPendingTransformOut(pendingTransformOutOwner);
        return parentForm.validateField(name, 'commit');
      },
    });

    return () => {
      parentForm.unregisterChildContract(childOwnerId);
    };
  }, [name, parentForm, pendingTransformOutOwner, schemaProps.transformOutAction]);

  return (
    <div
      className={cn('nop-object-field', props.meta.className)}
      data-slot="field-control"
      data-testid={props.meta.testid}
      data-cid={props.meta.cid}
    >
      <FormContext.Provider value={childForm ?? undefined}>
        <ScopeContext.Provider value={childScope}>
          <ValidationContext.Provider value={childValidationOwner}>
            <div data-slot="object-field-body">{bodyContent}</div>
          </ValidationContext.Provider>
        </ScopeContext.Provider>
      </FormContext.Provider>
    </div>
  );
}

export const objectFieldRendererDefinition: RendererDefinition = {
  type: 'object-field',
  component: ObjectFieldRenderer,
  wrap: true,
  fields: [
    formLabelFieldRule,
    { key: 'body', kind: 'region', regionKey: 'body' },
    { key: 'transformInAction', kind: 'prop' },
    { key: 'transformOutAction', kind: 'prop' },
  ],
  validation: {
    kind: 'field',
    valueKind: 'object',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
    getChildFieldPathPrefix(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
  },
};
