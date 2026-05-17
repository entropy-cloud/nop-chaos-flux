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
import { createDependentRevalidationFailureHandler } from './form-runtime-values.js';

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
  getEnv?: () => import('@nop-chaos/flux-core').RendererEnv;
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
    existingScope?: ScopeRef;
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

  function attachPageRuntime(page: PageRuntime) {
    if (pageStoreSyncCleanups.has(page)) {
      return () => undefined;
    }

    const externalPageStore = input.pageStore;
    const syncCleanups: Array<() => void> = [];

    if (externalPageStore) {
      const pageStore = page.store;
      const externalData = externalPageStore.getState().data;
      if (externalData !== pageStore.getState().data) {
        pageStore.setData(externalData);
      }

      let syncingFromPage = false;
      let syncingFromExternalPageStore = false;

      const syncExternalPageStoreToPage = () => {
        if (syncingFromPage) {
          return;
        }

        const nextExternalData = externalPageStore.getState().data;
        if (nextExternalData === pageStore.getState().data) {
          return;
        }

        syncingFromExternalPageStore = true;
        try {
          pageStore.setData(nextExternalData);
        } finally {
          syncingFromExternalPageStore = false;
        }
      };

      const syncPageToExternalPageStore = () => {
        if (syncingFromExternalPageStore) {
          return;
        }

        const pageData = pageStore.getState().data;
        if (pageData === externalPageStore.getState().data) {
          return;
        }

        syncingFromPage = true;
        try {
          externalPageStore.setData(pageData);
        } finally {
          syncingFromPage = false;
        }
      };

      syncCleanups.push(externalPageStore.subscribe(syncExternalPageStoreToPage));
      syncCleanups.push(pageStore.subscribe(syncPageToExternalPageStore));
    }

    pageStoreSyncCleanups.set(page, syncCleanups);
    return () => {
      for (const cleanup of pageStoreSyncCleanups.get(page) ?? []) {
        cleanup();
      }
      pageStoreSyncCleanups.delete(page);
    };
  }

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

    const page = createManagedPageRuntime({
      data: initialData,
      pageStore,
      validationOwner: pageValidation,
      scope: pageValidation.scope,
    });
    (page as PageRuntime & { __attachExternalPageStoreSync?: () => () => void }).__attachExternalPageStoreSync =
      () => attachPageRuntime(page);

    input.ownedPages.add(page);
    return page;
  }

  function createValidationScopeRuntime(inputValue: {
    id?: string;
    parentScope?: ScopeRef;
    scopePath?: string;
    validation?: CompiledFormValidationModel;
    initialValues?: Record<string, any>;
    existingStore?: import('@nop-chaos/flux-core').FormStoreApi;
    existingScope?: ScopeRef;
    initialLifecycleState?: import('@nop-chaos/flux-core').ValidationOwnerLifecycleState;
  }): ValidationScopeRuntime {
    const reportDependentRevalidationFailure = createDependentRevalidationFailureHandler({
      notify: input.getEnv?.().notify,
      onError: input.getEnv?.().monitor?.onError,
      source: 'validation-scope-runtime',
    });

    const formRuntime = createManagedFormRuntime({
      id: inputValue.id,
      parentScope: inputValue.parentScope,
      validation: inputValue.validation,
      initialValues: inputValue.initialValues,
      existingStore: inputValue.existingStore,
      existingScope: inputValue.existingScope,
      scopePath: inputValue.scopePath,
      scopeBinding: 'none',
      initialLifecycleState: inputValue.initialLifecycleState,
      reportDependentRevalidationFailure,
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
    statusPath?: string;
    valuesPath?: string;
  }): FormRuntime {
    const reportDependentRevalidationFailure = createDependentRevalidationFailureHandler({
      notify: input.getEnv?.().notify,
      onError: input.getEnv?.().monitor?.onError,
      source: 'form-runtime',
    });

    const formRuntime = createManagedFormRuntime({
      ...inputValue,
      reportDependentRevalidationFailure,
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
