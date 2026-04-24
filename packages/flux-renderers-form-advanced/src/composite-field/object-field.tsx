import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef
} from '@nop-chaos/flux-core';
import { actionAdapter, getIn, setIn } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { FormContext, ScopeContext } from '@nop-chaos/flux-react';
import { useCurrentForm, useCurrentFormState, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { ObjectFieldSchema } from './composite-schemas';
import { formLabelFieldRule, useFieldPresentation } from '@nop-chaos/flux-renderers-form';
import { createProjectedScopeHelpers } from '../detail-view/projected-scope';
import { createProjectedFormRuntime, createProjectedFormStore } from '../detail-view/projected-form-runtime';

type BaseNodeInstance = RendererComponentProps['node'];

const transformOutSequences = new WeakMap<object, number>();

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

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

function createObjectFieldChildScope(
  parentScope: ScopeRef,
  name: string,
  readOnly: boolean,
  resolvedValue: unknown,
  writeValue: (path: string, value: unknown) => void,
): ScopeRef {
  const buildPayload = () => ({
    value: resolvedValue,
    readOnly
  });
  const { readSnapshot, store } = createProjectedScopeHelpers(parentScope, buildPayload);

  return {
    id: `${parentScope.id}:obj:${name}`,
    path: `${parentScope.path}.${name}`,
    parent: parentScope.parent,
    store,
    get value() {
      return readSnapshot();
    },
    get(path) {
      if (!path) return buildPayload();
      if (path === 'value') return resolvedValue;
      if (path === 'readOnly') return readOnly;
      if (path.startsWith('value.')) return getIn(resolvedValue, path.slice('value.'.length));
      return getIn(resolvedValue, path);
    },
    has(path) {
      if (!path) return true;
      if (path === 'value' || path === 'readOnly') return true;
      if (path.startsWith('value.')) return getIn(resolvedValue, path.slice('value.'.length)) !== undefined;
      return getIn(resolvedValue, path) !== undefined;
    },
    readOwn() {
      return readSnapshot();
    },
    readVisible() {
      return readSnapshot();
    },
    materializeVisible() {
      return readSnapshot();
    },
    update(path, value) {
      if (!path || path === 'value') {
        writeValue('', value);
        return;
      }

      if (path.startsWith('value.')) {
        writeValue(path.slice('value.'.length), value);
        return;
      }

      writeValue(path, value);
    },
    merge(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        writeValue('', (data as { value: unknown }).value);
        return;
      }

      writeValue('', {
        ...(resolvedValue && typeof resolvedValue === 'object' ? resolvedValue as Record<string, unknown> : {}),
        ...(data as Record<string, unknown>)
      });
    },
    replace(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        writeValue('', (data as { value: unknown }).value);
        return;
      }

      writeValue('', data);
    }
  };
}

export function ObjectFieldRenderer(props: RendererComponentProps<ObjectFieldSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const name = String(props.props.name ?? '');
  const readOnly = Boolean(props.props.readOnly);
  const schema = props.schema as ObjectFieldSchema;

  const formValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  const rawValue = parentForm ? formValue : scopeValue;

  const runAdaptationAction = React.useCallback(
    (actionSchema: ObjectFieldSchema['transformInAction']) =>
      props.helpers.dispatch(actionSchema as any, {
        scope: parentScope,
        form: parentForm ?? undefined,
        page: undefined,
        nodeInstance: props.node as BaseNodeInstance
      }),
    [parentForm, parentScope, props.helpers, props.node]
  );

  const valueAdapter = React.useMemo(
    () => actionAdapter(schema.transformInAction, schema.transformOutAction, undefined, runAdaptationAction),
    [runAdaptationAction, schema.transformInAction, schema.transformOutAction]
  );

  const [resolvedValue, setResolvedValue] = React.useState(rawValue);
  const transformOutOwner = parentForm ?? parentScope;

  React.useEffect(() => {
    let active = true;

    if (!schema.transformInAction) {
      setResolvedValue(rawValue);
      return;
    }

    const nextValue = valueAdapter.in(rawValue, {
      name,
      readOnly: readOnly || Boolean(props.meta.disabled),
      scope: parentScope,
      form: parentForm ?? null
    });

    if (isPromiseLike(nextValue)) {
      void nextValue.then((resolvedNextValue: unknown) => {
        if (active) {
          setResolvedValue(resolvedNextValue);
        }
      });
      return () => {
        active = false;
      };
    }

    setResolvedValue(nextValue);

    return () => {
      active = false;
    };
  }, [name, parentForm, parentScope, props.meta.disabled, rawValue, readOnly, schema.transformInAction, valueAdapter]);

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly
  });

  const bodyContent = resolveRendererSlotContent(props, 'body');

  const writeProjectedValue = React.useCallback((path: string, nextLeafValue: unknown) => {
    const nextWorkingValue = !path
      ? nextLeafValue
      : setIn(
          resolvedValue && typeof resolvedValue === 'object'
            ? resolvedValue as Record<string, unknown>
            : {},
          path,
          nextLeafValue
        );

    setResolvedValue(nextWorkingValue);

    if (schema.transformOutAction) {
      const committedValue = valueAdapter.out(nextWorkingValue, {
        name,
        readOnly: readOnly || Boolean(props.meta.disabled),
        originalValue: rawValue,
        scope: parentScope,
        form: parentForm ?? null
      });

      if (isPromiseLike(committedValue)) {
        const sequence = nextTransformOutSequence(transformOutOwner);
        void committedValue.then((resolvedCommittedValue: unknown) => {
          if (!isTransformOutSequenceCurrent(transformOutOwner, sequence)) {
            return;
          }

          if (parentForm && name) {
            parentForm.setValue(name, resolvedCommittedValue);
            return;
          }

          parentScope.update(name, resolvedCommittedValue);
        });
        return;
      }

      invalidateTransformOutSequence(transformOutOwner);
      if (parentForm && name) {
        parentForm.setValue(name, committedValue);
        return;
      }

      parentScope.update(name, committedValue);
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
  }, [name, parentForm, parentScope, props.meta.disabled, rawValue, readOnly, resolvedValue, schema.transformOutAction, transformOutOwner, valueAdapter]);

  const childScope = React.useMemo(
    () => (name
      ? createObjectFieldChildScope(parentScope, name, readOnly || presentation.effectiveDisabled, resolvedValue, writeProjectedValue)
      : parentScope),
    [name, parentScope, presentation.effectiveDisabled, readOnly, resolvedValue, writeProjectedValue]
  );

  const childForm = React.useMemo(
    () => {
      if (!name || !parentForm) {
        return parentForm;
      }

        return createProjectedFormRuntime(parentForm, {
        prefixPath(path) {
          if (!path || !name) {
            return path;
          }

          return `${name}.${path}`;
        },
        store: createProjectedFormStore(parentForm.store, {
          ownerRootPath: name,
          projectValues(state) {
            void state;
            return ((resolvedValue ?? {}) as Record<string, unknown>);
          }
        }),
        setValue(path, value) {
          writeProjectedValue(path, value);
        },
        setValues(values) {
          for (const [path, value] of Object.entries(values)) {
            writeProjectedValue(path, value);
          }
        }
      });
    },
    [parentForm, name, resolvedValue, writeProjectedValue]
  );

  return (
    <div data-slot="field-control">
      <FormContext.Provider value={childForm ?? undefined}>
        <ScopeContext.Provider value={childScope}>
          <div data-slot="object-field-body">{bodyContent}</div>
        </ScopeContext.Provider>
      </FormContext.Provider>
    </div>
  );
}

export const objectFieldRendererDefinition: RendererDefinition = {
  type: 'object-field',
  component: ObjectFieldRenderer,
  wrap: true,
  regions: ['body'],
  fields: [
    formLabelFieldRule,
    { key: 'transformInAction', kind: 'ignored' },
    { key: 'transformOutAction', kind: 'ignored' }
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
    }
  }
};
