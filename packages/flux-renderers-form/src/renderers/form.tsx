import { useEffect, useMemo, useRef } from 'react';
import {
  FormContext,
  FormLayoutContext,
  ScopeContext,
} from '@nop-chaos/flux-react';
import {
  type RendererComponentProps,
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
import { createFormComponentHandle } from '@nop-chaos/flux-react';
import { resolveGap } from '@nop-chaos/flux-renderers-basic';
import type { FormSchema } from '../schemas';
import { usePublishedFormStatus, usePublishedFormValues } from './form-status-publication';

function createFormLifecycleScope(
  scope: ScopeRef,
  importBindings: Readonly<Record<string, unknown>>,
  _formName: string | undefined,
  _getFormValues: () => Record<string, unknown>
): ScopeRef {
  const hasImports = Object.keys(importBindings).length > 0;

  if (!hasImports) {
    return scope;
  }

  let visibleView: Record<string, unknown> | undefined;
  let materialized: Record<string, unknown> | undefined;

  function getDynamicBindings(): Record<string, unknown> {
    return { ...importBindings };
  }

  return {
    id: scope.id,
    path: scope.path,
    parent: scope.parent,
    store: scope.store,
    get value() {
      return this.readVisible();
    },
    get(path) {
      const bindings = getDynamicBindings();
      if (Object.prototype.hasOwnProperty.call(bindings, path)) {
        return bindings[path];
      }

      return scope.get(path);
    },
    has(path) {
      const bindings = getDynamicBindings();
      if (Object.prototype.hasOwnProperty.call(bindings, path)) {
        return true;
      }

      return scope.has(path);
    },
    readOwn() {
      return scope.readOwn();
    },
    readVisible() {
      const bindings = getDynamicBindings();
      visibleView = Object.assign(Object.create(scope.readVisible()) as Record<string, unknown>, bindings);

      return visibleView as Record<string, any>;
    },
    materializeVisible() {
      const bindings = getDynamicBindings();
      materialized = {
        ...scope.materializeVisible(),
        ...bindings
      };

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

function resolveLifecycleWriteScope(parentScope: ScopeRef): ScopeRef {
  const visible = parentScope.readVisible();
  const parentVisible = parentScope.parent?.readVisible();
  const looksLikeSurfaceShell = typeof visible.dialogId === 'string' || typeof visible.drawerId === 'string';
  const parentLooksLikeSurfaceShell = typeof parentVisible?.dialogId === 'string' || typeof parentVisible?.drawerId === 'string';

  return looksLikeSurfaceShell && parentScope.parent && !parentLooksLikeSurfaceShell
    ? parentScope.parent
    : parentScope;
}

export function FormRenderer(props: RendererComponentProps<FormSchema>) {
  const runtime = useRendererRuntime();
  const currentActionScope = useCurrentActionScope();
  const currentComponentRegistry = useCurrentComponentRegistry();
  const currentPage = useCurrentPage();
  const parentScope = useRenderScope();
  const nodeImports = props.templateNode.importsPlan?.preparedImports;
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const actionsContent = resolveRendererSlotContent(props, 'actions');
  const slotProps = props.props as FormSchema;
  const formGap = resolveGap(slotProps.gap as number | string | undefined);
  const importBindings = useMemo(
    () => runtime.getImportedExpressionBindings({
      imports: nodeImports,
      actionScope: currentActionScope,
      schemaUrl: props.templateNode.schemaUrl ?? props.path
    }),
    [runtime, nodeImports, currentActionScope, props.templateNode.schemaUrl, props.path]
  );
  const importsReady = true;

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
    () => createFormLifecycleScope(baseLifecycleScope, importBindings, formName, () => ownedForm.store.getState().values),
    [baseLifecycleScope, formName, importBindings, ownedForm.store]
  );
  const lifecycleWriteScope = useMemo(
    () => createFormLifecycleScope(resolveLifecycleWriteScope(parentScope), importBindings, formName, () => ownedForm.store.getState().values),
    [parentScope, formName, importBindings, ownedForm.store]
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
            scope: lifecycleWriteScope,
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
            scope: lifecycleWriteScope,
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
            scope: lifecycleWriteScope,
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
  }, [ownedForm, lifecycleScope, lifecycleWriteScope, submitAction, submitErrorAction, submitSuccessAction, validateErrorAction]);

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

  const statusPath = typeof (props.props as FormSchema).statusPath === 'string' ? (props.props as FormSchema).statusPath : undefined;
  const valuesPath = typeof (props.props as FormSchema).valuesPath === 'string' ? (props.props as FormSchema).valuesPath : undefined;
  const formMode = (props.props as FormSchema).mode;
  const formLabelAlign = (props.props as FormSchema).labelAlign;
  const formLabelWidth = (props.props as FormSchema).labelWidth;

  const formLayoutValue = useMemo(() => {
    const value: import('@nop-chaos/flux-react').FormLayoutContextValue = {};
    if (formMode) value.mode = formMode;
    if (formLabelAlign) value.labelAlign = formLabelAlign;
    if (formLabelWidth !== undefined) value.labelWidth = formLabelWidth;
    return Object.keys(value).length > 0 ? value : undefined;
  }, [formLabelAlign, formLabelWidth, formMode]);

  usePublishedFormStatus({ statusPath, parentScope, ownedForm });
  usePublishedFormValues({ valuesPath, parentScope, ownedForm });

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
      <FormLayoutContext.Provider value={formLayoutValue}>
        <section className={cn('nop-form', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
          {hasRendererSlotContent(bodyContent) ? <div data-slot="form-body" className={cn(formGap.className, slotProps.bodyClassName)} style={formGap.style}>{bodyContent}</div> : null}
          {hasRendererSlotContent(actionsContent) ? <div data-slot="form-actions" className={cn(slotProps.actionsClassName)}>{actionsContent}</div> : null}
        </section>
      </FormLayoutContext.Provider>
      </ScopeContext.Provider>
    </FormContext.Provider>
  );
}

export { formRendererDefinition } from './form-definition';
