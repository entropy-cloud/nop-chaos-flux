import { useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { reportRuntimeHostIssue, type RendererComponentProps, type ScopeRef } from '@nop-chaos/flux-core';
import {
  FormContext,
  FormLayoutContext,
  ScopeContext,
  createFormComponentHandle,
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentActionScope,
  useCurrentComponentRegistry,
  useCurrentPage,
  useRenderScope,
  useRendererRuntime,
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { FormLayoutContextValue } from '@nop-chaos/flux-react';
import { resolveGap } from '@nop-chaos/flux-react';
import type { FormSchema } from '../schemas.js';
import { compileFormLevelValidationModel } from './form-rules.js';

function createFormLifecycleScope(
  scope: ScopeRef,
  importBindings: Readonly<Record<string, unknown>>,
  _formName: string | undefined,
  _getFormValues: () => Record<string, unknown>,
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
      visibleView = Object.assign(
        Object.create(scope.readVisible()) as Record<string, unknown>,
        bindings,
      );

      return visibleView as Record<string, any>;
    },
    materializeVisible() {
      const bindings = getDynamicBindings();
      materialized = {
        ...scope.materializeVisible(),
        ...bindings,
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
    },
  };
}

function resolveLifecycleWriteScope(parentScope: ScopeRef): ScopeRef {
  const visible = parentScope.readVisible();
  const parentVisible = parentScope.parent?.readVisible();
  const looksLikeSurfaceShell =
    typeof visible.dialogId === 'string' || typeof visible.drawerId === 'string';
  const parentLooksLikeSurfaceShell =
    typeof parentVisible?.dialogId === 'string' || typeof parentVisible?.drawerId === 'string';

  return looksLikeSurfaceShell && parentScope.parent && !parentLooksLikeSurfaceShell
    ? parentScope.parent
    : parentScope;
}

function reportFormInitActionError(
  runtime: ReturnType<typeof useRendererRuntime>,
  path: string,
  error: unknown,
) {
  reportRuntimeHostIssue({
    env: runtime.env,
    level: 'error',
    message: 'Form initAction failed',
    error,
    phase: 'action',
    path,
  });
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
    () =>
      runtime.getImportedExpressionBindings({
        imports: nodeImports,
        actionScope: currentActionScope,
        schemaUrl: props.templateNode.schemaUrl ?? props.path,
      }),
    [runtime, nodeImports, currentActionScope, props.templateNode.schemaUrl, props.path],
  );
  const importsReady = true;

  const formId = typeof props.props.id === 'string' ? props.props.id : props.id;
  const formName = typeof props.props.name === 'string' ? props.props.name : undefined;
  const statusPath = typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;
  const valuesPath = typeof props.props.valuesPath === 'string' ? props.props.valuesPath : undefined;
  const initialValues =
    props.props.data && typeof props.props.data === 'object'
      ? (props.props.data as Record<string, unknown>)
      : undefined;
  const initialValuesRef = useRef(initialValues);
  const mountedFormRef = useRef(false);
  const activeOwnedFormRef = useRef<ReturnType<typeof runtime.createFormRuntime> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const formRulesRef = useRef<FormSchema['rules']>((props.props as FormSchema).rules);

  const ownedForm = useMemo(
    () =>
      runtime.createFormRuntime({
        id: formId,
        name: formName,
        initialValues: initialValuesRef.current, // eslint-disable-line react-hooks/refs -- intentional: initial values must not retrigger useMemo
        parentScope,
        statusPath,
        valuesPath,
        page: currentPage,
        validation: compileFormLevelValidationModel(
          props.templateNode.validationPlan,
          formRulesRef.current, // eslint-disable-line react-hooks/refs -- intentional: form rules are captured at mount to avoid recreating the form runtime
        ),
      }),
    [
      runtime,
      formId,
      formName,
      parentScope,
      statusPath,
      valuesPath,
      currentPage,
      props.templateNode.validationPlan,
    ],
  );

  useEffect(() => {
    mountedFormRef.current = true;
    activeOwnedFormRef.current = ownedForm;

    return () => {
      mountedFormRef.current = false;
      const disposedForm = ownedForm;

      queueMicrotask(() => {
        if (!mountedFormRef.current || activeOwnedFormRef.current !== disposedForm) {
          disposedForm.dispose();
        }
      });
    };
  }, [ownedForm]);

  const baseLifecycleScope = ownedForm.scope;
  const lifecycleScope = useMemo(
    () =>
      createFormLifecycleScope(
        baseLifecycleScope,
        importBindings,
        formName,
        () => ownedForm.store.getState().values,
      ),
    [baseLifecycleScope, formName, importBindings, ownedForm.store],
  );
  const lifecycleWriteScope = useMemo(
    () =>
      createFormLifecycleScope(
        resolveLifecycleWriteScope(parentScope),
        importBindings,
        formName,
        () => ownedForm.store.getState().values,
      ),
    [parentScope, formName, importBindings, ownedForm.store],
  );
  const initAction = props.events['initAction'];
  const autoInit = props.props.autoInit !== false;
  const submitAction = props.events['submitAction'];
  const submitSuccessAction = props.events['onSubmitSuccess'];
  const submitErrorAction = props.events['onSubmitError'];
  const validateErrorAction = props.events['onValidateError'];
  const activationKey = props.node.instancePath?.length
    ? props.node.instancePath.map((f) => `${f.repeatedTemplateId}:${f.instanceKey}`).join('/')
    : `${props.id}:${props.path}`;
  const lastInitKeyRef = useRef<string | undefined>(undefined);
  const inFlightInitKeyRef = useRef<string | undefined>(undefined);
  const initActionAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    ownedForm.setLifecycleHandlers({
      submitAction: submitAction
        ? (options) =>
            submitAction(undefined, {
              scope: lifecycleScope,
              form: ownedForm,
              interactionId: options?.interactionId,
              signal: options?.signal,
            })
        : undefined,
      onSubmitSuccess: submitSuccessAction
        ? (result, options) =>
            submitSuccessAction(undefined, {
              scope: lifecycleWriteScope,
              form: ownedForm,
              interactionId: options?.interactionId,
              signal: options?.signal,
              prevResult: result,
              evaluationBindings: {
                result,
                error: undefined,
                prevResult: undefined,
              },
            })
        : undefined,
      onSubmitError: submitErrorAction
        ? (result, options) =>
            submitErrorAction(undefined, {
              scope: lifecycleWriteScope,
              form: ownedForm,
              interactionId: options?.interactionId,
              signal: options?.signal,
              prevResult: result,
              evaluationBindings: {
                result,
                error: result.error,
                prevResult: undefined,
              },
            })
        : undefined,
      onValidateError: validateErrorAction
        ? (result, options) =>
            validateErrorAction(undefined, {
              scope: lifecycleWriteScope,
              form: ownedForm,
              interactionId: options?.interactionId,
              signal: options?.signal,
              prevResult: result,
              evaluationBindings: {
                result,
                error: result.error,
                prevResult: undefined,
              },
            })
        : undefined,
    });

    return () => {
      ownedForm.setLifecycleHandlers(undefined);
    };
  }, [
    ownedForm,
    lifecycleScope,
    lifecycleWriteScope,
    submitAction,
    submitErrorAction,
    submitSuccessAction,
    validateErrorAction,
  ]);

  useEffect(() => {
    if (!initAction || !importsReady || !autoInit) {
      return;
    }

    if (lastInitKeyRef.current === activationKey) {
      return;
    }

    if (inFlightInitKeyRef.current === activationKey) {
      return;
    }

    initActionAbortRef.current?.abort();
    const controller = new AbortController();
    initActionAbortRef.current = controller;
    inFlightInitKeyRef.current = activationKey;

    void initAction(undefined, { scope: lifecycleScope, form: ownedForm, signal: controller.signal })
      .then(() => {
        if (initActionAbortRef.current === controller) {
          lastInitKeyRef.current = activationKey;
        }
      })
      .catch((error) => {
        if (
          controller.signal.aborted ||
          (error instanceof Error && error.name === 'AbortError') ||
          ((error as { name?: string } | null | undefined)?.name === 'AbortError')
        ) {
          return;
        }

        reportFormInitActionError(runtime, props.path, error);

        if (inFlightInitKeyRef.current === activationKey) {
          inFlightInitKeyRef.current = undefined;
        }
      })
      .finally(() => {
        if (inFlightInitKeyRef.current === activationKey && initActionAbortRef.current === controller) {
          inFlightInitKeyRef.current = undefined;
        }
        if (initActionAbortRef.current === controller) {
          initActionAbortRef.current = null;
        }
      });

    return () => {
      if (initActionAbortRef.current === controller) {
        controller.abort();
        initActionAbortRef.current = null;
        // Refs outlive the effect body, so an abort strands the in-flight marker;
        // clear it or the next effect body bails for the same activationKey and
        // init is silently dropped. `.finally` is controller-identity-guarded so a
        // stale aborted promise cannot clear a fresh re-run's marker.
        if (inFlightInitKeyRef.current === activationKey) {
          inFlightInitKeyRef.current = undefined;
        }
      }
    };
  }, [activationKey, autoInit, importsReady, initAction, lifecycleScope, ownedForm, props.path, runtime]);

  const loadAction = props.events['loadAction'];
  const autoLoad = (props.props as FormSchema).autoLoad !== false;
  const loadActionKeyRef = useRef<string | undefined>(undefined);
  // latest instances via refs so the load action effect does not re-run (and
  // abort the in-flight request) on every render — only on activation/action
  // change. `lifecycleScope`/`ownedForm` identities are volatile across renders.
  const loadLifecycleScopeRef = useRef(lifecycleScope);
  const loadOwnedFormRef = useRef(ownedForm);
  useEffect(() => {
    loadLifecycleScopeRef.current = lifecycleScope;
    loadOwnedFormRef.current = ownedForm;
  });

  useEffect(() => {
    if (!loadAction || !autoLoad || !importsReady) {
      return;
    }

    if (loadActionKeyRef.current === activationKey) {
      return;
    }

    loadActionKeyRef.current = activationKey;

    void loadAction(undefined, {
      scope: loadLifecycleScopeRef.current,
      form: loadOwnedFormRef.current,
    })
      .then((result) => {
        if (result.ok && !result.cancelled && result.data != null) {
          loadOwnedFormRef.current.setValues(result.data as Record<string, unknown>);
        }
      })
      .catch(() => {
        // best-effort; load failures surface through the runtime toast channel
      });
  }, [activationKey, autoLoad, importsReady, loadAction]);

  const formMode = (props.props as FormSchema).mode;
  const formLabelAlign = (props.props as FormSchema).labelAlign;
  const formLabelWidth = (props.props as FormSchema).labelWidth;
  const formColumnCount = (props.props as FormSchema).columnCount;
  const formStatic = Boolean((props.props as FormSchema).static);
  const autoFocus = (props.props as FormSchema).autoFocus === true;
  const preventEnterSubmit = (props.props as FormSchema).preventEnterSubmit === true;
  const scrollToFirstError = (props.props as FormSchema).scrollToFirstError === true;
  const submitOnChange = (props.props as FormSchema).submitOnChange === true;

  useEffect(() => {
    let prevSubmitting = ownedForm.store.getState().submitting;

    const unsubscribe = ownedForm.store.subscribe(() => {
      const state = ownedForm.store.getState();
      const justStoppedSubmitting = prevSubmitting && !state.submitting;
      prevSubmitting = state.submitting;

      if (justStoppedSubmitting && state.submitAttempted) {
        const hasFieldErrors = Object.values(state.fieldStates).some(
          (fs) => fs.errors && fs.errors.length > 0,
        );
        if (hasFieldErrors) {
          requestAnimationFrame(() => {
            const firstInvalid = sectionRef.current?.querySelector('[aria-invalid="true"]');
            if (firstInvalid instanceof HTMLElement) {
              firstInvalid.focus();
              if (scrollToFirstError) {
                firstInvalid.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                });
              }
            }
          });
        }
      }
    });

    return unsubscribe;
  }, [ownedForm.store, scrollToFirstError]);

  const formLayoutValue = useMemo(() => {
    const value: FormLayoutContextValue = {};
    if (formMode) value.mode = formMode;
    if (formLabelAlign) value.labelAlign = formLabelAlign;
    if (formLabelWidth !== undefined) value.labelWidth = formLabelWidth;
    if (formColumnCount !== undefined && Number.isFinite(formColumnCount)) {
      value.columnCount = Math.max(1, Math.floor(formColumnCount));
    }
    if (formStatic) value.staticReadOnly = true;
    return Object.keys(value).length > 0 ? value : undefined;
  }, [formLabelAlign, formLabelWidth, formMode, formColumnCount, formStatic]);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }
    const target = sectionRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [data-slot="combobox"]',
    );
    target?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!submitOnChange || !submitAction) {
      return;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastValues: unknown = ownedForm.store.getState().values;

    const unsubscribe = ownedForm.store.subscribe(() => {
      const state = ownedForm.store.getState();
      if (Object.is(state.values, lastValues)) {
        return;
      }
      lastValues = state.values;
      if (state.submitting) {
        return;
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void ownedForm.submit();
      }, 300);
    });

    return () => {
      unsubscribe();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    };
  }, [submitOnChange, submitAction, ownedForm.store, ownedForm]);

  const handleSectionKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    if (preventEnterSubmit) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') {
        return;
      }
      const isContentEditable =
        target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true' ||
        target.getAttribute('contenteditable') === '';
      if (isContentEditable) {
        return;
      }
    }
    if (!submitAction) {
      return;
    }
    event.preventDefault();
    void ownedForm.submit();
  };

  useEffect(() => {
    if (!currentComponentRegistry) {
      return;
    }

    return currentComponentRegistry.register(createFormComponentHandle(ownedForm), {
      cid: props.meta.cid,
    });
  }, [currentComponentRegistry, ownedForm, props.meta.cid]);

  const isInline = formMode === 'inline';
  const resolvedColumnCount =
    formColumnCount !== undefined && Number.isFinite(formColumnCount)
      ? Math.max(1, Math.floor(formColumnCount))
      : undefined;
  const showGrid = !isInline && resolvedColumnCount !== undefined && resolvedColumnCount > 1;

  const bodyStyle = useMemo(() => {
    const style: React.CSSProperties = { ...formGap.style };
    if (showGrid) {
      style.display = 'grid';
      style.gridTemplateColumns = `repeat(${resolvedColumnCount}, minmax(0, 1fr))`;
    }
    return style;
  }, [formGap.style, showGrid, resolvedColumnCount]);

  return (
    <FormContext.Provider value={ownedForm}>
      <ScopeContext.Provider value={ownedForm.scope}>
        <FormLayoutContext.Provider value={formLayoutValue}>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Enter-to-submit form convention; section is a structural form shell, not a generic interactive widget */}
          <section
            ref={sectionRef}
            className={cn('nop-form', props.meta.className)}
            data-testid={props.meta.testid || undefined}
            data-cid={props.meta.cid || undefined}
            data-form-mode={formMode ?? undefined}
            data-form-static={formStatic ? '' : undefined}
            data-form-columns={resolvedColumnCount ?? undefined}
            onKeyDown={handleSectionKeyDown}
          >
            {hasRendererSlotContent(bodyContent) ? (
              <div
                data-slot="form-body"
                className={cn(
                  formGap.className,
                  slotProps.bodyClassName,
                )}
                data-form-mode={formMode ?? undefined}
                style={bodyStyle}
              >
                {bodyContent}
              </div>
            ) : null}
            {hasRendererSlotContent(actionsContent) ? (
              <div data-slot="form-actions" className={cn('flex justify-end gap-2', slotProps.actionsClassName)}>
                {actionsContent}
              </div>
            ) : null}
          </section>
        </FormLayoutContext.Provider>
      </ScopeContext.Provider>
    </FormContext.Provider>
  );
}
