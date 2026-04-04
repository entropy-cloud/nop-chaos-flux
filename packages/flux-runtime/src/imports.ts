import type {
  ActionContext,
  ActionScope,
  ActionNamespaceProvider,
  ComponentHandleRegistry,
  ImportedLibraryLoader,
  ImportedNamespaceContext,
  RendererEnv,
  RendererRuntime,
  ScopeRef,
  XuiImportSpec,
  CompiledSchemaNode
} from '@nop-chaos/flux-core';

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
}) {
  const moduleLoads = new Map<string, Promise<Awaited<ReturnType<ImportedLibraryLoader['load']>>>>();
  type ImportState = 'loading' | 'ready' | 'error';
  type ScopeRegistrationEntry = {
    pending: Promise<void>;
    release?: () => void;
    refCount: number;
    provider?: ActionNamespaceProvider;
    state: ImportState;
    error?: Error;
  };
  const scopeRegistrations = new WeakMap<ActionScope, Map<string, ScopeRegistrationEntry>>();

  function reportImportError(error: Error, node?: CompiledSchemaNode, spec?: XuiImportSpec) {
    const env = input.getEnv();
    (error as ReportedImportError).__fluxImportReported = true;
    env.notify('error', error.message);
    env.monitor?.onError?.({
      phase: 'render',
      error,
      nodeId: node?.id,
      path: node?.path,
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

  async function loadModule(spec: XuiImportSpec) {
    const loader = input.getLoader();

    if (!loader) {
      throw new Error(`No import loader configured for namespace ${spec.as}`);
    }

    const key = createModuleKey(spec);
    const existing = moduleLoads.get(key);

    if (existing) {
      try {
        return await existing;
      } catch {
        moduleLoads.delete(key);
      }
    }

    const pending = loader.load(spec);
    moduleLoads.set(key, pending);

    try {
      return await pending;
    } catch (error) {
      moduleLoads.delete(key);
      throw error;
    }
  }

  function createReadyPromise(args: {
    spec: XuiImportSpec;
    entry: ScopeRegistrationEntry;
    actionScope: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    node?: CompiledSchemaNode;
  }) {
    return (async () => {
      try {
        const module = await loadModule(args.spec);
        const context: ImportedNamespaceContext = {
          runtime: input.getRuntime(),
          env: input.getEnv(),
          actionScope: args.actionScope,
          componentRegistry: args.componentRegistry,
          scope: args.scope,
          spec: args.spec,
          node: args.node
        };
        const provider = await module.createNamespace(context);
        args.entry.provider = {
          ...provider,
          kind: provider.kind ?? 'import'
        };
        args.entry.state = 'ready';
      } catch (error) {
        args.entry.state = 'error';
        args.entry.error = createImportError(
          `Imported namespace ${args.spec.as} failed to load: ${toErrorMessage(error)}`,
          error
        );
          reportImportError(args.entry.error, args.node, args.spec);
          throw args.entry.error;
        }
      })();
  }

  async function ensureImportedNamespaces(args: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    node?: CompiledSchemaNode;
  }) {
    const imports = args.imports?.map(normalizeImportSpec).filter((spec) => spec.from && spec.as) ?? [];

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

          const retryPromise = createReadyPromise({
            spec,
            entry: existing,
            actionScope: args.actionScope,
            componentRegistry: args.componentRegistry,
            scope: args.scope,
            node: args.node
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
        state: 'loading' as ImportState,
        error: undefined
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
          reportImportError(entry.error, args.node, spec);
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
        node: args.node
      });

      entry.pending = readyPromise.catch(() => undefined);

      registrations.set(key, entry);
      await readyPromise;
    }
  }

  function releaseImportedNamespaces(args: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
  }) {
    const imports = args.imports?.map(normalizeImportSpec).filter((spec) => spec.from && spec.as) ?? [];

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

      entry.refCount -= 1;

      if (entry.refCount > 0) {
        continue;
      }

      registrations.delete(key);
      void entry.pending.finally(() => {
        entry.release?.();
      });
    }
  }

  return {
    ensureImportedNamespaces,
    releaseImportedNamespaces
  };
}
