import { useEffect, useMemo, useRef } from 'react';
import {
  parsePath,
  serializeNodeLocator,
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
  useCurrentForm,
  useRendererRuntime
} from '@nop-chaos/flux-react';
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

  return {
    id: scope.id,
    path: scope.path,
    parent: scope.parent,
    store: scope.store,
    get value() {
      return this.read();
    },
    get(path) {
      if (path === '__imports') {
        return importBindings;
      }

      return scope.get(path);
    },
    has(path) {
      if (path === '__imports') {
        return true;
      }

      return scope.has(path);
    },
    readOwn() {
      return scope.readOwn();
    },
    read() {
      return {
        ...scope.read(),
        __imports: importBindings
      };
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
  const currentForm = useCurrentForm();
  const currentActionScope = useCurrentActionScope();
  const nodeImports = Array.isArray(props.schema['xui:imports']) ? props.schema['xui:imports'] : undefined;
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const actionsContent = resolveRendererSlotContent(props, 'actions');
  const importBindings = useMemo(
    () => runtime.getImportedExpressionBindings({
      imports: nodeImports,
      actionScope: currentActionScope
    }),
    [runtime, nodeImports, currentActionScope]
  );
  const importsReady = !nodeImports?.length || Object.keys(importBindings).length === nodeImports.length;
  const baseLifecycleScope = currentForm?.scope ?? props.nodeInstance.scope;
  const lifecycleScope = useMemo(
    () => createFormLifecycleScope(baseLifecycleScope, importBindings),
    [baseLifecycleScope, importBindings]
  );
  const initAction = props.events['initAction'];
  const submitAction = props.events['submitAction'];
  const submitSuccessAction = props.events['onSubmitSuccess'];
  const submitErrorAction = props.events['onSubmitError'];
  const validateErrorAction = props.events['onValidateError'];
  const activationKey = props.nodeInstance.locator
    ? serializeNodeLocator(props.nodeInstance.locator)
    : props.locator
      ? serializeNodeLocator(props.locator)
      : `${props.id}:${props.path}`;
  const lastInitKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!currentForm) {
      return;
    }

    currentForm.setLifecycleHandlers({
      submitAction: submitAction
        ? (options) => submitAction(undefined, {
            scope: lifecycleScope,
            interactionId: options?.interactionId
          })
        : undefined,
      onSubmitSuccess: submitSuccessAction
        ? (result, options) => submitSuccessAction(undefined, {
            scope: lifecycleScope,
            interactionId: options?.interactionId,
            prevResult: result,
            event: {
              result,
              error: undefined,
              prevResult: undefined
            },
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
            interactionId: options?.interactionId,
            prevResult: result,
            event: {
              result,
              error: result.error,
              prevResult: undefined
            },
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
            interactionId: options?.interactionId,
            prevResult: result,
            event: {
              result,
              error: result.error,
              prevResult: undefined
            },
            evaluationBindings: {
              result,
              error: result.error,
              prevResult: undefined
            }
          })
        : undefined
    });

    return () => {
      currentForm.setLifecycleHandlers(undefined);
    };
  }, [currentForm, lifecycleScope, submitAction, submitErrorAction, submitSuccessAction, validateErrorAction]);

  useEffect(() => {
    if (!initAction || !importsReady) {
      return;
    }

    if (lastInitKeyRef.current === activationKey) {
      return;
    }

    lastInitKeyRef.current = activationKey;
    void initAction(undefined, { scope: lifecycleScope });
  }, [activationKey, importsReady, initAction, lifecycleScope]);

  const statusPath = typeof props.schema.statusPath === 'string' ? props.schema.statusPath : undefined;
  const parentScope = currentForm?.scope.parent;

  useEffect(() => {
    if (!statusPath || !currentForm || !parentScope) {
      return;
    }

    const resolvedStatusPath = statusPath;
    const resolvedParentScope = parentScope;

    function publishStatus() {
      const state = currentForm!.store.getState();
      const errorEntries = Object.values(state.errors);
      const errorCount = errorEntries.reduce((acc: number, errs) => acc + errs.length, 0);
      const hasErrors = errorCount > 0;
      const summary: FormStatusSummary = {
        id: currentForm!.id,
        name: currentForm!.name,
        submitting: state.submitting,
        validating: Object.values(state.validating).some(Boolean),
        dirty: Object.values(state.dirty).some(Boolean),
        touched: Object.values(state.touched).some(Boolean),
        visited: Object.values(state.visited).some(Boolean),
        hasErrors,
        errorCount,
        valid: !hasErrors,
        invalid: hasErrors
      };

      resolvedParentScope.update(resolvedStatusPath, summary);
    }

    publishStatus();

    return currentForm.store.subscribe(publishStatus);
  }, [statusPath, currentForm, parentScope]);

  return (
    <section className="nop-form flex flex-col gap-4" data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {hasRendererSlotContent(bodyContent) ? <div data-slot="form-body" className="grid gap-4">{bodyContent}</div> : null}
      {hasRendererSlotContent(actionsContent) ? <div data-slot="form-actions" className="flex flex-wrap gap-3">{actionsContent}</div> : null}
    </section>
  );
}

export const formRendererDefinition: RendererDefinition = {
  type: 'form',
  displayName: 'Form',
  category: 'form',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  defaultSchema: { type: 'form', body: [], actions: [] },
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
