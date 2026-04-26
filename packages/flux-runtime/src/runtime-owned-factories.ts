import type {
  ActionContext,
  ActionResult,
  CompiledFormValidationModel,
  FormLifecycleHandlers,
  FormRuntime,
  PageRuntime,
  PageStoreApi,
  ScopeRef,
  SurfaceRuntime,
  ValidationScopeRuntime
} from '@nop-chaos/flux-core';
import type { ValidationRegistry } from './validation';
import { createManagedFormRuntime } from './form-runtime';
import { createFormStore } from './form-store';
import { createManagedPageRuntime } from './page-runtime';
import { createManagedSurfaceRuntime } from './surface-runtime';
import { executeRuntimeValidationRule } from './runtime-action-helpers';
import { validateRule } from './validation-runtime';

export function createRuntimeOwnedFactories(input: {
  pageStore?: PageStoreApi;
  ownedPages: Set<PageRuntime>;
  ownedSurfaceRuntimes: Set<SurfaceRuntime>;
  createValidationScopeRuntime: (inputValue: {
    id?: string;
    parentScope?: ScopeRef;
    scopePath?: string;
    validation?: CompiledFormValidationModel;
    initialValues?: Record<string, any>;
  }) => ValidationScopeRuntime;
  dispatchAction: (action: import('@nop-chaos/flux-core').ActionSchema, ctx?: Partial<ActionContext>) => Promise<ActionResult>;
  validationRegistry: ValidationRegistry;
  disposeScopeTree: (scopeId: string) => void;
}) {
  function createPageRuntime(data: Record<string, any> = {}): PageRuntime {
    const externalPageStore = input.pageStore;
    const initialData = externalPageStore?.getState().data ?? data;
    const pageValidation = input.createValidationScopeRuntime({
      id: 'page-root-validation',
      scopePath: '$page',
      initialValues: initialData
    });
    const validationStore = pageValidation.store as import('@nop-chaos/flux-core').FormStoreApi;
    let refreshTick = 0;
    const refreshListeners = new Set<() => void>();
    const pageStore: PageStoreApi = {
      getState() {
        return {
          data: validationStore.getState().values,
          refreshTick
        };
      },
      subscribe(listener) {
        const unsubscribeValidation = validationStore.subscribe(listener);
        refreshListeners.add(listener);
        return () => {
          unsubscribeValidation();
          refreshListeners.delete(listener);
        };
      },
      setData(nextData) {
        validationStore.setValues(nextData);
      },
      updateData(path, value) {
        validationStore.setValue(path, value);
      },
      refresh() {
        refreshTick += 1;
        for (const listener of refreshListeners) {
          listener();
        }
      }
    };

    let syncingFromValidation = false;
    let syncingFromExternalPageStore = false;

    if (externalPageStore) {
      const externalData = externalPageStore.getState().data;
      if (externalData !== validationStore.getState().values) {
        validationStore.setValues(externalData);
      }

      const syncExternalPageStoreToValidation = () => {
        if (syncingFromValidation) {
          return;
        }

        const pageData = externalPageStore.getState().data;
        if (pageData === validationStore.getState().values) {
          return;
        }

        syncingFromExternalPageStore = true;
        try {
          validationStore.setValues(pageData);
        } finally {
          syncingFromExternalPageStore = false;
        }
      };

      const syncValidationToExternalPageStore = () => {
        if (syncingFromExternalPageStore) {
          return;
        }

        const validationData = validationStore.getState().values;
        if (validationData === externalPageStore.getState().data) {
          return;
        }

        syncingFromValidation = true;
        try {
          externalPageStore.setData(validationData);
        } finally {
          syncingFromValidation = false;
        }
      };

      externalPageStore.subscribe(syncExternalPageStoreToValidation);
      validationStore.subscribe(syncValidationToExternalPageStore);
    }

    const page = createManagedPageRuntime({
      data: initialData,
      pageStore,
      validationOwner: pageValidation,
      scope: pageValidation.scope
    });

    input.ownedPages.add(page);
    return page;
  }

  function createValidationScopeRuntime(inputValue: {
    id?: string;
    parentScope?: ScopeRef;
    scopePath?: string;
    validation?: CompiledFormValidationModel;
    initialValues?: Record<string, any>;
  }): ValidationScopeRuntime {
    const store = createFormStore(inputValue.initialValues ?? {});

    return createManagedFormRuntime({
      id: inputValue.id,
      parentScope: inputValue.parentScope,
      validation: inputValue.validation,
      initialValues: inputValue.initialValues,
      existingStore: store,
      scopePath: inputValue.scopePath,
      scopeBinding: 'none',
      executeValidationRule: (compiledRule, rule, field, validationScope, signal) =>
        executeRuntimeValidationRule(compiledRule, rule, field, validationScope, signal, {
          dispatch: (action, ctx) => input.dispatchAction(action, ctx)
        }),
      validateRule: (compiledRule, value, field, validationScope) =>
        validateRule(compiledRule, value, field, validationScope, input.validationRegistry)
    });
  }

  function createSurfaceRuntime(inputValue: { disposeScope?: (scopeId: string) => void } = {}): SurfaceRuntime {
    const surfaceRuntime = createManagedSurfaceRuntime({
      disposeScope: inputValue.disposeScope ?? input.disposeScopeTree
    });

    input.ownedSurfaceRuntimes.add(surfaceRuntime);
    return surfaceRuntime;
  }

  function createFormRuntime(inputValue: {
    id?: string;
    name?: string;
    initialValues?: Record<string, any>;
    parentScope: ScopeRef;
    page?: PageRuntime;
    validation?: CompiledFormValidationModel;
    lifecycle?: FormLifecycleHandlers;
  }): FormRuntime {
    return createManagedFormRuntime({
      ...inputValue,
      executeValidationRule: (compiledRule, rule, field, scope, signal) =>
        executeRuntimeValidationRule(compiledRule, rule, field, scope, signal, {
          dispatch: (action, ctx) => input.dispatchAction(action, ctx)
        }),
      validateRule: (compiledRule, value, field, scope) => validateRule(compiledRule, value, field, scope, input.validationRegistry)
    });
  }

  return {
    createPageRuntime,
    createValidationScopeRuntime,
    createSurfaceRuntime,
    createFormRuntime
  };
}
