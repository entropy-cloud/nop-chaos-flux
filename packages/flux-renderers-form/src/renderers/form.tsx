import { useEffect, useMemo, useRef } from 'react';
import {
  FormContext,
  ScopeContext,
} from '@nop-chaos/flux-react';
import {
  parsePath,
  type BaseSchema,
  type FormStatusSummary,
  type RendererComponentProps,
  type RendererDefinition,
  type RendererSchemaValidationContext,
  type ScopeRef
} from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentPage,
  useRenderScope,
  useRendererRuntime
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { createFormComponentHandle } from '@nop-chaos/flux-runtime';
import type { FormSchema } from '../schemas';

function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toJsonPointer(path: string, ...segments: Array<string | number>) {
  const parts = parsePath(path).filter((segment) => segment !== '$').concat(segments.map((segment) => String(segment)));

  if (parts.length === 0) {
    return '';
  }

  return `/${parts.map(escapeJsonPointerSegment).join('/')}`;
}

function validateFormSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  if (context.schema.type !== 'form') {
    return;
  }

  const schema = context.schema as FormSchema;
  const { path, emit } = context;

  if (schema.body !== undefined && !Array.isArray(schema.body)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'body'),
      message: 'form.body must be an array of schema nodes.'
    });
  }

  if (schema.actions !== undefined && !Array.isArray(schema.actions)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'actions'),
      message: 'form.actions must be an array of schema nodes.'
    });
  }

  if (schema.data !== undefined && (!schema.data || typeof schema.data !== 'object' || Array.isArray(schema.data))) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'data'),
      message: 'form.data must be an object when provided.'
    });
  }
}

function createFormLifecycleScope(scope: ScopeRef, importBindings: Readonly<Record<string, unknown>>): ScopeRef {
  if (Object.keys(importBindings).length === 0) {
    return scope;
  }

  let visibleView: Record<string, unknown> | undefined;
  let materialized: Record<string, unknown> | undefined;

  return {
    id: scope.id,
    path: scope.path,
    parent: scope.parent,
    store: scope.store,
    get value() {
      return this.readVisible();
    },
    get(path) {
      if (Object.prototype.hasOwnProperty.call(importBindings, path)) {
        return importBindings[path];
      }

      return scope.get(path);
    },
    has(path) {
      if (Object.prototype.hasOwnProperty.call(importBindings, path)) {
        return true;
      }

      return scope.has(path);
    },
    readOwn() {
      return scope.readOwn();
    },
    readVisible() {
      if (!visibleView) {
        visibleView = Object.assign(Object.create(scope.readVisible()) as Record<string, unknown>, importBindings);
      }

      return visibleView as Record<string, any>;
    },
    materializeVisible() {
      if (!materialized) {
        materialized = {
          ...scope.materializeVisible(),
          ...importBindings
        };
      }

      return materialized as Record<string, any>;
    },
    update(path, value) {
      scope.update(path, value);
    },
    merge(data) {
      scope.merge(data);
    },
    replace(data) {
      scope.replace?.(data);
    }
  };
}

export function FormRenderer(props: RendererComponentProps<FormSchema>) {
  const runtime = useRendererRuntime();
  const currentActionScope = useCurrentActionScope();
  const currentComponentRegistry = useCurrentComponentRegistry();
  const currentPage = useCurrentPage();
  const parentScope = useRenderScope();
  const nodeImports = Array.isArray(props.schema['xui:imports']) ? props.schema['xui:imports'] : undefined;
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const actionsContent = resolveRendererSlotContent(props, 'actions');
  const importBindings = useMemo(
    () => runtime.getImportedExpressionBindings({
      imports: nodeImports,
      actionScope: currentActionScope,
      schemaUrl: props.templateNode.schemaUrl ?? props.path
    }),
    [runtime, nodeImports, currentActionScope, props.templateNode.schemaUrl, props.path]
  );
  const importsReady = !nodeImports?.length || Object.keys(importBindings).length === nodeImports.length;

  const formId = typeof props.props.id === 'string' ? props.props.id : props.id;
  const formName = typeof props.props.name === 'string' ? props.props.name : undefined;
  const initialValues =
    props.props.data && typeof props.props.data === 'object'
      ? (props.props.data as Record<string, unknown>)
      : undefined;

  const ownedForm = useMemo(
    () => runtime.createFormRuntime({
      id: formId,
      name: formName,
      initialValues,
      parentScope,
      page: currentPage,
      validation: props.templateNode.validationPlan
    }),
    [runtime, formId, formName, initialValues, parentScope, currentPage, props.templateNode.validationPlan]
  );

  const baseLifecycleScope = ownedForm.scope;
  const lifecycleScope = useMemo(
    () => createFormLifecycleScope(baseLifecycleScope, importBindings),
    [baseLifecycleScope, importBindings]
  );
  const initAction = props.events['initAction'];
  const submitAction = props.events['submitAction'];
  const submitSuccessAction = props.events['onSubmitSuccess'];
  const submitErrorAction = props.events['onSubmitError'];
  const validateErrorAction = props.events['onValidateError'];
  const activationKey = props.node.instancePath?.length
    ? props.node.instancePath.map((f) => `${f.repeatedTemplateId}:${f.instanceKey}`).join('/')
    : `${props.id}:${props.path}`;
  const lastInitKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    ownedForm.setLifecycleHandlers({
      submitAction: submitAction
        ? (options) => submitAction(undefined, {
            scope: lifecycleScope,
            form: ownedForm,
            interactionId: options?.interactionId,
            signal: options?.signal
          })
        : undefined,
      onSubmitSuccess: submitSuccessAction
        ? (result, options) => submitSuccessAction(undefined, {
            scope: lifecycleScope,
            form: ownedForm,
            interactionId: options?.interactionId,
            signal: options?.signal,
            prevResult: result,
            evaluationBindings: {
              result,
              error: undefined,
              prevResult: undefined
            }
          })
        : undefined,
      onSubmitError: submitErrorAction
        ? (result, options) => submitErrorAction(undefined, {
            scope: lifecycleScope,
            form: ownedForm,
            interactionId: options?.interactionId,
            signal: options?.signal,
            prevResult: result,
            evaluationBindings: {
              result,
              error: result.error,
              prevResult: undefined
            }
          })
        : undefined,
      onValidateError: validateErrorAction
        ? (result, options) => validateErrorAction(undefined, {
            scope: lifecycleScope,
            form: ownedForm,
            interactionId: options?.interactionId,
            signal: options?.signal,
            prevResult: result,
            evaluationBindings: {
              result,
              error: result.error,
              prevResult: undefined
            }
          })
        : undefined
    });

    return () => {
      ownedForm.setLifecycleHandlers(undefined);
    };
  }, [ownedForm, lifecycleScope, submitAction, submitErrorAction, submitSuccessAction, validateErrorAction]);

  useEffect(() => {
    if (!initAction || !importsReady) {
      return;
    }

    if (lastInitKeyRef.current === activationKey) {
      return;
    }

    lastInitKeyRef.current = activationKey;
    void initAction(undefined, { scope: lifecycleScope, form: ownedForm });
  }, [activationKey, importsReady, initAction, lifecycleScope, ownedForm]);

  const statusPath = typeof props.schema.statusPath === 'string' ? props.schema.statusPath : undefined;

  useEffect(() => {
    if (!statusPath || !parentScope) {
      return;
    }

    const resolvedStatusPath = statusPath;
    const resolvedParentScope = parentScope;
    let lastSummary: FormStatusSummary | undefined;

    function publishStatus() {
      const state = ownedForm.store.getState();
      let errorCount = 0;
      let validating = false;
      let dirty = false;
      let touched = false;
      let visited = false;

      for (const fieldState of Object.values(state.fieldStates)) {
        if (fieldState.errors) {
          errorCount += fieldState.errors.length;
        }
        if (fieldState.validating) validating = true;
        if (fieldState.dirty) dirty = true;
        if (fieldState.touched) touched = true;
        if (fieldState.visited) visited = true;
      }

      const hasErrors = errorCount > 0;

      if (
        lastSummary &&
        lastSummary.submitting === state.submitting &&
        lastSummary.validating === validating &&
        lastSummary.dirty === dirty &&
        lastSummary.touched === touched &&
        lastSummary.visited === visited &&
        lastSummary.errorCount === errorCount
      ) {
        return;
      }

      const summary: FormStatusSummary = {
        id: ownedForm.id,
        name: ownedForm.name,
        submitting: state.submitting,
        validating,
        dirty,
        touched,
        visited,
        hasErrors,
        errorCount,
        valid: !hasErrors,
        invalid: hasErrors
      };

      lastSummary = summary;
      resolvedParentScope.update(resolvedStatusPath, summary);
    }

    publishStatus();

    return ownedForm.store.subscribe(publishStatus);
  }, [statusPath, ownedForm, parentScope]);

  useEffect(() => {
    if (!currentComponentRegistry) {
      return;
    }

    return currentComponentRegistry.register(createFormComponentHandle(ownedForm), {
      cid: props.meta.cid
    });
  }, [currentComponentRegistry, ownedForm, props.meta.cid]);

  return (
      <FormContext.Provider value={ownedForm}>
      <ScopeContext.Provider value={ownedForm.scope}>
        <section className={cn('nop-form', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
          {hasRendererSlotContent(bodyContent) ? <div data-slot="form-body">{bodyContent}</div> : null}
          {hasRendererSlotContent(actionsContent) ? <div data-slot="form-actions">{actionsContent}</div> : null}
        </section>
      </ScopeContext.Provider>
    </FormContext.Provider>
  );
}

export const formRendererDefinition: RendererDefinition = {
  type: 'form',
  displayName: 'Form',
  category: 'form',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  defaultSchema: { type: 'form', body: [], actions: [] },
  rendererClass: 'flux-owner-renderer',
  rendererTraits: ['semantic-owner', 'interaction-owner'],
  propContracts: {
    data: {
      shape: { kind: 'object', fields: {} },
      displayName: 'Initial Data',
      description: 'Initial form values at mount time.',
      editorType: 'object'
    },
    statusPath: {
      shape: { kind: 'string' },
      displayName: 'Status Path',
      description: 'Publishes the readonly form status summary to parent scope.',
      editorType: 'path'
    },
    hiddenFieldPolicy: {
      shape: {
        kind: 'union',
        anyOf: [
          { kind: 'literal', value: 'validate' },
          { kind: 'literal', value: 'ignore' },
          {
            kind: 'object',
            fields: {
              validateWhenHidden: { kind: 'boolean' },
              clearValueWhenHidden: { kind: 'boolean' },
              submitWhenHidden: { kind: 'boolean' }
            },
            optional: ['validateWhenHidden', 'clearValueWhenHidden', 'submitWhenHidden']
          }
        ]
      },
      displayName: 'Hidden Field Policy',
      description: 'Controls how hidden fields participate in validation, submit, and clearing.',
      editorType: 'hidden-field-policy'
    }
  },
  eventContracts: {
    initAction: {
      displayName: 'Init',
      description: 'Runs after the form runtime is created.'
    },
    submitAction: {
      displayName: 'Submit',
      description: 'Primary submit pipeline for the form.'
    },
    onSubmitSuccess: {
      displayName: 'Submit Success',
      description: 'Runs after submit resolves successfully.'
    },
    onSubmitError: {
      displayName: 'Submit Error',
      description: 'Runs after submit fails.'
    },
    onValidateError: {
      displayName: 'Validate Error',
      description: 'Runs when validation blocks submission.'
    }
  },
  componentCapabilityContracts: [
    {
      handle: 'submit',
      displayName: 'Submit',
      description: 'Submit the current form instance.'
    },
    {
      handle: 'validate',
      displayName: 'Validate',
      description: 'Validate the current form and return a validation result.',
      result: {
        kind: 'object',
        fields: {
          ok: { kind: 'boolean' },
          errors: { kind: 'array', item: { kind: 'unknown' } }
        },
        optional: ['errors']
      }
    },
    {
      handle: 'reset',
      displayName: 'Reset',
      description: 'Reset the current form values.',
      args: {
        kind: 'object',
        fields: {
          values: { kind: 'object', fields: {} }
        },
        optional: ['values']
      }
    },
    {
      handle: 'setValue',
      displayName: 'Set Value',
      description: 'Set one field value on the current form.',
      args: {
        kind: 'object',
        fields: {
          name: { kind: 'string' },
          value: { kind: 'unknown' }
        }
      }
    },
    {
      handle: 'setValues',
      displayName: 'Set Values',
      description: 'Merge multiple field values into the current form.',
      args: {
        kind: 'object',
        fields: {
          values: { kind: 'object', fields: {} }
        }
      }
    }
  ],
  scopeExportContracts: {
    '$form': {
      kind: 'object',
      fields: {
        id: { kind: 'string' },
        name: { kind: 'string' },
        submitting: { kind: 'boolean' },
        validating: { kind: 'boolean' },
        dirty: { kind: 'boolean' },
        touched: { kind: 'boolean' },
        visited: { kind: 'boolean' },
        valid: { kind: 'boolean' },
        invalid: { kind: 'boolean' },
        hasErrors: { kind: 'boolean' },
        errorCount: { kind: 'number' }
      },
      optional: ['id', 'name']
    }
  },
  component: FormRenderer,
  regions: ['body', 'actions'],
  fields: [
    { key: 'initAction', kind: 'event' },
    { key: 'submitAction', kind: 'event' },
    { key: 'onSubmitSuccess', kind: 'event' },
    { key: 'onSubmitError', kind: 'event' },
    { key: 'onValidateError', kind: 'event' }
  ],
  scopePolicy: 'form',
  componentRegistryPolicy: 'new',
  schemaValidator: validateFormSchema
};
