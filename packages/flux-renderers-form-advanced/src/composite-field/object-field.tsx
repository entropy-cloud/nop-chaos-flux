import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { FormContext, ScopeContext } from '@nop-chaos/flux-react';
import { useCurrentForm, useCurrentFormState, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { ObjectFieldSchema } from './composite-schemas';
import { formLabelFieldRule, resolveFieldLabelContent, useFieldPresentation } from '@nop-chaos/flux-renderers-form';
import { FieldHint, FieldLabel } from '@nop-chaos/flux-renderers-form';
import { createProjectedScopeHelpers } from '../detail-view/projected-scope';
import { createProjectedFormRuntime, createProjectedFormStore } from '../detail-view/projected-form-runtime';

function createObjectFieldChildScope(parentScope: ScopeRef, name: string, readOnly: boolean): ScopeRef {
  const prefix = name ? `${name}.` : '';
  const buildPayload = () => ({
    value: parentScope.get(name),
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
      if (path === 'value') return parentScope.get(name);
      if (path === 'readOnly') return readOnly;
      if (path.startsWith('value.')) return parentScope.get(`${prefix}${path.slice('value.'.length)}`);
      return parentScope.get(`${prefix}${path}`);
    },
    has(path) {
      if (!path) return true;
      if (path === 'value' || path === 'readOnly') return true;
      if (path.startsWith('value.')) return parentScope.has(`${prefix}${path.slice('value.'.length)}`);
      return parentScope.has(`${prefix}${path}`);
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
        parentScope.update(name, value);
        return;
      }

      if (path.startsWith('value.')) {
        parentScope.update(`${prefix}${path.slice('value.'.length)}`, value);
        return;
      }

      parentScope.update(`${prefix}${path}`, value);
    },
    merge(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        parentScope.update(name, (data as { value: unknown }).value);
        return;
      }

      parentScope.merge(data);
    },
    replace(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        parentScope.update(name, (data as { value: unknown }).value);
        return;
      }

      parentScope.replace?.(data);
    }
  };
}

export function ObjectFieldRenderer(props: RendererComponentProps<ObjectFieldSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const name = String(props.props.name ?? '');
  const readOnly = Boolean(props.props.readOnly);

  const formValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  void (parentForm ? formValue : scopeValue);

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly
  });

  const labelContent = resolveFieldLabelContent(props);
  const bodyContent = resolveRendererSlotContent(props, 'body');

  const childScope = React.useMemo(
    () => (name ? createObjectFieldChildScope(parentScope, name, readOnly || presentation.effectiveDisabled) : parentScope),
    [name, parentScope, presentation.effectiveDisabled, readOnly]
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
            return ((getIn(state.values, name) ?? {}) as Record<string, unknown>);
          }
        })
      });
    },
    [parentForm, name]
  );

  return (
    <div
      className={cn('nop-field', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <div data-slot="field-control">
        <FormContext.Provider value={childForm ?? undefined}>
          <ScopeContext.Provider value={childScope}>
            <div data-slot="object-field-body">{bodyContent}</div>
          </ScopeContext.Provider>
        </FormContext.Provider>
      </div>
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        showError={presentation.showError}
      />
    </div>
  );
}

export const objectFieldRendererDefinition: RendererDefinition = {
  type: 'object-field',
  component: ObjectFieldRenderer,
  regions: ['body'],
  fields: [formLabelFieldRule],
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
