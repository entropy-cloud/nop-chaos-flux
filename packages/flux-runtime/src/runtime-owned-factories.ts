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
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import type { ValidationRegistry } from './validation/index.js';
import { createManagedFormRuntime } from './form-runtime.js';
import { createFormStore } from './form-store.js';
import { createManagedPageRuntime } from './page-runtime.js';
import { createManagedSurfaceRuntime } from './surface-runtime.js';
import { executeRuntimeValidationRule } from './runtime-action-helpers.js';
import { validateRule } from './validation-runtime.js';

function createValidationStoreView(
  store: import('@nop-chaos/flux-core').FormStoreApi,
): import('@nop-chaos/flux-core').ValidationStoreApi {
  return {
    getState: () => store.getState(),
    subscribe: (listener) => store.subscribe(listener),
    subscribeToPath: (path, listener) => store.subscribeToPath(path, listener),
    subscribeToPaths: (paths, listener) => store.subscribeToPaths(paths, listener),
    subscribeToSubmitting: (listener) => store.subscribeToSubmitting(listener),
    subscribeToModelGeneration: (listener) => store.subscribeToModelGeneration?.(listener) ?? (() => undefined),
    getPathState: (path) => store.getPathState(path),
    getFieldState: (path) => store.getFieldState(path),
  };
}

function createManagedValidationScopeRuntime(formRuntime: FormRuntime): ValidationScopeRuntime {
  const storeView = createValidationStoreView(formRuntime.store);

  return {
    get scopeId() {
      return formRuntime.scopeId;
    },
    get rootPath() {
      return formRuntime.rootPath;
    },
    get lifecycleState() {
      return formRuntime.lifecycleState;
    },
    get modelGeneration() {
      return formRuntime.modelGeneration;
    },
    subscribeToModelGeneration: (listener) =>
      formRuntime.subscribeToModelGeneration?.(listener) ?? (() => undefined),
    get store() {
      return storeView;
    },
    get scope() {
      return formRuntime.scope;
    },
    get validation() {
      return formRuntime.validation;
    },
    validateAt: (path, reason) => formRuntime.validateAt(path, reason),
    validateSubtree: (path, reason) => formRuntime.validateSubtree(path, reason),
    validateAll: (reason) => formRuntime.validateAll(reason),
    applyChangesAndRevalidate: (input) => formRuntime.applyChangesAndRevalidate(input),
    applyExternalErrors: (input) => formRuntime.applyExternalErrors(input),
    getFieldState: (path) => formRuntime.getFieldState(path),
    getScopeState: () => formRuntime.getScopeState(),
    getAsyncOwnerDebugSnapshot: () => formRuntime.getAsyncOwnerDebugSnapshot?.() ?? { owners: [] },
    getScopeRootErrors: () => formRuntime.getScopeRootErrors(),
    isPathOwned: (path) => formRuntime.isPathOwned(path),
    registerField: (registration) => formRuntime.registerField(registration),
    updateFieldRegistration: (registrationId, patch) =>
      formRuntime.updateFieldRegistration(registrationId, patch),
    notifyFieldHidden: (path, hidden) => formRuntime.notifyFieldHidden(path, hidden),
    touchField: (path) => formRuntime.touchField(path),
    visitField: (path) => formRuntime.visitField(path),
    refreshCompiledModel: (newModel) => formRuntime.refreshCompiledModel(newModel),
    dispose: () => formRuntime.dispose(),
    registerChildContract: (contract) => formRuntime.registerChildContract(contract),
    unregisterChildContract: (childOwnerId) => formRuntime.unregisterChildContract(childOwnerId),
  };
}

export function createRuntimeOwnedFactories(input: {
  pageStore?: PageStoreApi;
  ownedPages: Set<PageRuntime>;
  ownedSurfaceRuntimes: Set<SurfaceRuntime>;
  ownedValidationScopes?: Set<ValidationScopeRuntime>;
  ownedFormRuntimes?: Set<FormRuntime>;
  createValidationScopeRuntime: (inputValue: {
    id?: string;
    parentScope?: ScopeRef;
    scopePath?: string;
    validation?: CompiledFormValidationModel;
    initialValues?: Record<string, any>;
    existingStore?: import('@nop-chaos/flux-core').FormStoreApi;
    initialLifecycleState?: import('@nop-chaos/flux-core').ValidationOwnerLifecycleState;
  }) => ValidationScopeRuntime;
  dispatchAction: (
    action: import('@nop-chaos/flux-core').ActionSchema,
    ctx?: Partial<ActionContext>,
  ) => Promise<ActionResult>;
  validationRegistry: ValidationRegistry;
  disposeScopeTree: (scopeId: string) => void;
}) {
  const ownedValidationScopes = input.ownedValidationScopes ?? new Set<ValidationScopeRuntime>();
  const ownedFormRuntimes = input.ownedFormRuntimes ?? new Set<FormRuntime>();
  const pageStoreSyncCleanups = new Map<PageRuntime, Array<() => void>>();

  function createPageRuntime(data: Record<string, any> = {}): PageRuntime {
    const externalPageStore = input.pageStore;
    const initialData = externalPageStore?.getState().data ?? data;
    const validationStore = createFormStore(initialData);
    const pageValidation = input.createValidationScopeRuntime({
      id: 'page-root-validation',
      scopePath: '$page',
      initialValues: initialData,
      existingStore: validationStore,
      initialLifecycleState: 'bootstrapping',
    });
    let refreshTick = 0;
    const refreshListeners = new Set<() => void>();
    const syncCleanups: Array<() => void> = [];
    const pageStore: PageStoreApi = {
      getState() {
        return {
          data: validationStore.getState().values,
          refreshTick,
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
      },
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

      syncCleanups.push(externalPageStore.subscribe(syncExternalPageStoreToValidation));
      syncCleanups.push(validationStore.subscribe(syncValidationToExternalPageStore));
    }

    const page = createManagedPageRuntime({
      data: initialData,
      pageStore,
      validationOwner: pageValidation,
      scope: pageValidation.scope,
    });

    input.ownedPages.add(page);
    pageStoreSyncCleanups.set(page, syncCleanups);
    return page;
  }

  function createValidationScopeRuntime(inputValue: {
    id?: string;
    parentScope?: ScopeRef;
    scopePath?: string;
    validation?: CompiledFormValidationModel;
    initialValues?: Record<string, any>;
    existingStore?: import('@nop-chaos/flux-core').FormStoreApi;
    initialLifecycleState?: import('@nop-chaos/flux-core').ValidationOwnerLifecycleState;
  }): ValidationScopeRuntime {
    const formRuntime = createManagedFormRuntime({
      id: inputValue.id,
      parentScope: inputValue.parentScope,
      validation: inputValue.validation,
      initialValues: inputValue.initialValues,
      existingStore: inputValue.existingStore,
      scopePath: inputValue.scopePath,
      scopeBinding: 'none',
      initialLifecycleState: inputValue.initialLifecycleState,
      executeValidationRule: (compiledRule, rule, field, validationScope, signal) =>
        executeRuntimeValidationRule(compiledRule, rule, field, validationScope, signal, {
          dispatch: (action, ctx) => input.dispatchAction(action, ctx),
        }),
      validateRule: (compiledRule, value, field, validationScope) =>
        validateRule(compiledRule, value, field, validationScope, input.validationRegistry),
    });
    const validationScopeRuntime = createManagedValidationScopeRuntime(formRuntime);

    ownedValidationScopes.add(validationScopeRuntime);
    return validationScopeRuntime;
  }

  function createSurfaceRuntime(
    inputValue: { disposeScope?: (scopeId: string) => void } = {},
  ): SurfaceRuntime {
    const surfaceRuntime = createManagedSurfaceRuntime({
      disposeScope: inputValue.disposeScope ?? input.disposeScopeTree,
      createValidationOwner: (ownerInput) => input.createValidationScopeRuntime(ownerInput),
      releaseValidationOwner: (owner) => {
        ownedValidationScopes.delete(owner);
      },
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
    const formRuntime = createManagedFormRuntime({
      ...inputValue,
      executeValidationRule: (compiledRule, rule, field, scope, signal) =>
        executeRuntimeValidationRule(compiledRule, rule, field, scope, signal, {
          dispatch: (action, ctx) => input.dispatchAction(action, ctx),
        }),
      validateRule: (compiledRule, value, field, scope) =>
        validateRule(compiledRule, value, field, scope, input.validationRegistry),
    });

    ownedFormRuntimes.add(formRuntime);
    return formRuntime;
  }

  return {
    createPageRuntime,
    createValidationScopeRuntime,
    createSurfaceRuntime,
    createFormRuntime,
    disposeOwnedPage(page: PageRuntime) {
      for (const cleanup of pageStoreSyncCleanups.get(page) ?? []) {
        cleanup();
      }
      pageStoreSyncCleanups.delete(page);
      if (page.validationOwner) {
        ownedValidationScopes.delete(page.validationOwner);
      }
      page.validationOwner?.dispose();
    },
  };
}
