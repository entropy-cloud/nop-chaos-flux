import type {
  ActionContext,
  ActionScope,
  ActionNamespaceProvider,
  ComponentHandleRegistry,
  ImportedLibraryLoader,
  ImportedLibraryModule,
  ImportedNamespaceContext,
  ModuleCache,
  RendererEnv,
  RendererRuntime,
  ScopeRef,
  XuiImportSpec,
  NodeInstance
} from '@nop-chaos/flux-core';

export interface ImportManager {
  ensureImportedNamespaces(args: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    schemaUrl: string;
    nodeInstance?: NodeInstance;
  }): Promise<void>;
  getImportedExpressionBindings(args: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
  }): Readonly<Record<string, unknown>>;
  releaseImportedNamespaces(args: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
  }): void;
  dispose(args?: { actionScopes?: readonly ActionScope[] }): void;
}

function normalizeImportSpec(spec: XuiImportSpec): XuiImportSpec {
  return {
    ...spec,
    from: spec.from.trim(),
    as: spec.as.trim()
  };
}

function createImportKey(spec: XuiImportSpec): string {
  return JSON.stringify({
    from: spec.from,
    as: spec.as,
    options: spec.options ?? null
  });
}

function createModuleKey(spec: XuiImportSpec): string {
  return JSON.stringify({
    from: spec.from,
    options: spec.options ?? null
  });
}

function resolveImportSpec(env: RendererEnv, schemaUrl: string, spec: XuiImportSpec): XuiImportSpec {
  return {
    ...spec,
    from: env.resolveImportUrl?.(schemaUrl, spec.from, spec.options) ?? spec.from
  };
}

function createImportError(message: string, cause?: unknown): Error {
  const error = new Error(message);

  if (cause !== undefined) {
    (error as Error & { cause?: unknown }).cause = cause;
  }

  return error;
}

type ReportedImportError = Error & {
  __fluxImportReported?: boolean;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function createImportManager(input: {
  getLoader: () => ImportedLibraryLoader | undefined;
  getRuntime: () => RendererRuntime;
  getEnv: () => RendererEnv;
  moduleCache: ModuleCache;
}): ImportManager {
  type ImportState = 'loading' | 'ready' | 'error';
  type ScopeRegistrationEntry = {
    pending: Promise<void>;
    release?: () => void;
    refCount: number;
    provider?: ActionNamespaceProvider;
    expressionHelpers?: Readonly<Record<string, unknown>>;
    state: ImportState;
    error?: Error;
    abortController?: AbortController;
  };
  const scopeRegistrations = new WeakMap<ActionScope, Map<string, ScopeRegistrationEntry>>();

  function reportImportError(error: Error, spec?: XuiImportSpec) {
    const env = input.getEnv();
    (error as ReportedImportError).__fluxImportReported = true;
    env.notify('error', error.message);
    env.monitor?.onError?.({
      phase: 'render',
      error,
      details: {
        reason: 'import-namespace-setup-failed',
        imports: spec ? [spec] : []
      }
    });
  }

  function createPlaceholderProvider(spec: XuiImportSpec, entry: ScopeRegistrationEntry): ActionNamespaceProvider {
    return {
      kind: 'import',
      invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ActionContext) {
        if (entry.state === 'ready' && entry.provider) {
          return entry.provider.invoke(method, payload, ctx);
        }

        if (entry.state === 'loading') {
          return {
            ok: false,
            error: createImportError(`Imported namespace ${spec.as} is still loading`)
          };
        }

        return {
          ok: false,
          error: entry.error ?? createImportError(`Imported namespace ${spec.as} failed to load`)
        };
      },
      listMethods() {
        return entry.state === 'ready' ? entry.provider?.listMethods?.() ?? [] : [];
      },
      dispose() {
        entry.provider?.dispose?.();
      }
    };
  }

  async function loadModule(spec: XuiImportSpec, signal?: AbortSignal): Promise<ImportedLibraryModule> {
    const loader = input.getLoader();

    if (!loader) {
      throw new Error(`No import loader configured for namespace ${spec.as}`);
    }

    const key = createModuleKey(spec);
    const cached = input.moduleCache.get(key);

    if (cached) {
      return cached;
    }

    const existing = input.moduleCache.getPending(key);

    if (existing) {
      try {
        return await existing;
      } catch {
        input.moduleCache.removePending(key);
      }
    }

    const pending = loader.load(spec, signal);
    input.moduleCache.setPending(key, pending);

    try {
      const module = await pending;
      input.moduleCache.set(key, module);
      input.moduleCache.removePending(key);
      return module;
    } catch (error) {
      input.moduleCache.removePending(key);
      throw error;
    }
  }

  function createReadyPromise(args: {
    spec: XuiImportSpec;
    entry: ScopeRegistrationEntry;
    actionScope: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    schemaUrl: string;
    nodeInstance?: NodeInstance;
  }) {
    return (async () => {
      try {
        if (args.entry.abortController?.signal.aborted) {
          return;
        }

        const module = await loadModule(args.spec);
        if (args.entry.abortController?.signal.aborted) {
          return;
        }
        const context: ImportedNamespaceContext = {
          runtime: input.getRuntime(),
          env: input.getEnv(),
          actionScope: args.actionScope,
          componentRegistry: args.componentRegistry,
          scope: args.scope,
          spec: args.spec,
          nodeInstance: args.nodeInstance
        };
        const provider = await module.createNamespace(context);
        if (args.entry.abortController?.signal.aborted) {
          provider.dispose?.();
          return;
        }
        const expressionHelpers = module.createExpressionHelpers
          ? await module.createExpressionHelpers(context)
          : undefined;
        if (args.entry.abortController?.signal.aborted) {
          provider.dispose?.();
          return;
        }
        args.entry.provider = {
          ...provider,
          kind: provider.kind ?? 'import'
        };
        args.entry.expressionHelpers = expressionHelpers ?? undefined;
        args.entry.state = 'ready';
      } catch (error) {
        if (args.entry.abortController?.signal.aborted) {
          args.entry.state = 'error';
          args.entry.error = createImportError(`Imported namespace ${args.spec.as} load was aborted`, error);
          return;
        }

        args.entry.state = 'error';
        args.entry.error = createImportError(
          `Imported namespace ${args.spec.as} failed to load: ${toErrorMessage(error)}`,
          error
        );
          reportImportError(args.entry.error, args.spec);
          throw args.entry.error;
        }
      })();
  }

  async function ensureImportedNamespaces(args: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    schemaUrl: string;
    nodeInstance?: NodeInstance;
  }) {
    const imports = args.imports
      ?.map(normalizeImportSpec)
      .map((spec) => resolveImportSpec(input.getEnv(), args.schemaUrl, spec))
      .filter((spec) => spec.from && spec.as) ?? [];

    if (!args.actionScope || imports.length === 0) {
      return;
    }

    let registrations = scopeRegistrations.get(args.actionScope);

    if (!registrations) {
      registrations = new Map<string, ScopeRegistrationEntry>();
      scopeRegistrations.set(args.actionScope, registrations);
    }

    for (const spec of imports) {
      const key = createImportKey(spec);
      const existing = registrations.get(key);

      if (existing) {
        const currentState = existing.state;

        if (currentState === 'error') {
          existing.refCount = Math.max(existing.refCount, 1);
          existing.state = 'loading';
          existing.error = undefined;
          existing.provider = undefined;
          existing.expressionHelpers = undefined;

          const retryPromise = createReadyPromise({
            spec,
            entry: existing,
            actionScope: args.actionScope,
            componentRegistry: args.componentRegistry,
            scope: args.scope,
            schemaUrl: args.schemaUrl,
            nodeInstance: args.nodeInstance
          });

          existing.pending = retryPromise.catch(() => undefined);
          await retryPromise;
          continue;
        }

        existing.refCount += 1;
        await existing.pending;

        if (existing.state === 'error' && existing.error) {
          throw existing.error;
        }

        continue;
      }

      const entry: ScopeRegistrationEntry = {
        pending: Promise.resolve(),
        release: undefined,
        refCount: 1,
        provider: undefined,
        expressionHelpers: undefined,
        state: 'loading' as ImportState,
        error: undefined,
        abortController: new AbortController()
      };

      if (args.actionScope.listNamespaces().includes(spec.as)) {
        const sameAliasRegistration = Array.from(registrations.entries()).find(([existingKey, candidate]) => {
          if (existingKey === key) {
            return false;
          }

          const candidateSpec = JSON.parse(existingKey) as XuiImportSpec;
          return candidateSpec.as === spec.as && candidate.refCount > 0;
        });

        if (sameAliasRegistration) {
          entry.state = 'error';
          entry.error = createImportError(`Namespace collision for import alias: ${spec.as}`);
          reportImportError(entry.error, spec);
          throw entry.error;
        }

        registrations.delete(key);
      }

      entry.release = args.actionScope.registerNamespace(spec.as, createPlaceholderProvider(spec, entry));

      const readyPromise = createReadyPromise({
        spec,
        entry,
        actionScope: args.actionScope,
        componentRegistry: args.componentRegistry,
        scope: args.scope,
        schemaUrl: args.schemaUrl,
        nodeInstance: args.nodeInstance
      });

      entry.pending = readyPromise.catch(() => undefined);

      registrations.set(key, entry);
      await readyPromise;
    }
  }

  function releaseImportedNamespaces(args: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
    schemaUrl: string;
  }) {
    const imports = args.imports
      ?.map(normalizeImportSpec)
      .map((spec) => resolveImportSpec(input.getEnv(), args.schemaUrl, spec))
      .filter((spec) => spec.from && spec.as) ?? [];

    if (!args.actionScope || imports.length === 0) {
      return;
    }

    const registrations = scopeRegistrations.get(args.actionScope);

    if (!registrations) {
      return;
    }

    for (const spec of imports) {
      const key = createImportKey(spec);
      const entry = registrations.get(key);

      if (!entry) {
        continue;
      }

      entry.refCount = Math.max(0, entry.refCount - 1);

      if (entry.refCount > 0) {
        continue;
      }

      entry.abortController?.abort();
      registrations.delete(key);
      void entry.pending.finally(() => {
        entry.release?.();
      });
    }

    if (registrations.size === 0) {
      scopeRegistrations.delete(args.actionScope);
    }
  }

  function getImportedExpressionBindings(args: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
    schemaUrl: string;
  }): Readonly<Record<string, unknown>> {
    const imports = args.imports
      ?.map(normalizeImportSpec)
      .map((spec) => resolveImportSpec(input.getEnv(), args.schemaUrl, spec))
      .filter((spec) => spec.from && spec.as) ?? [];

    if (!args.actionScope || imports.length === 0) {
      return {};
    }

    const registrations = scopeRegistrations.get(args.actionScope);

    if (!registrations) {
      return {};
    }

    return Object.fromEntries(
      imports.flatMap((spec) => {
        const entry = registrations.get(createImportKey(spec));

        if (!entry || entry.state !== 'ready' || !entry.provider) {
          return [];
        }

        return [[`$${spec.as}`, entry.expressionHelpers ?? entry.provider] as const];
      })
    );
  }

  function dispose(args?: { actionScopes?: readonly ActionScope[] }) {
    for (const actionScope of args?.actionScopes ?? []) {
      const registrations = scopeRegistrations.get(actionScope);

      if (!registrations) {
        continue;
      }

      for (const [key, entry] of Array.from(registrations.entries())) {
        entry.refCount = 0;
        entry.abortController?.abort();
        registrations.delete(key);
        void entry.pending.finally(() => {
          entry.release?.();
        });
      }
    }
  }

  return {
    ensureImportedNamespaces,
    getImportedExpressionBindings,
    releaseImportedNamespaces,
    dispose
  };
}
