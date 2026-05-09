import type {
  ActionNamespaceProvider,
  ActionScope,
  ComponentHandleRegistry,
  ImportedLibraryModule,
  PreparedImportSpec,
  ImportedNamespaceContext,
  ImportFrame,
  ImportStack,
  ImportStackEntry,
  ModuleCache,
  NodeInstance,
  RendererEnv,
  RendererRuntime,
  ScopeRef,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import { reportImportFailure } from '@nop-chaos/flux-core';

function normalizeImportSpec(spec: XuiImportSpec): XuiImportSpec {
  return {
    ...spec,
    from: spec.from.trim(),
    as: spec.as.trim(),
  };
}

function resolveImportSpec(
  env: RendererEnv,
  schemaUrl: string,
  spec: XuiImportSpec,
): XuiImportSpec {
  return {
    ...spec,
    from: env.resolveImportUrl?.(schemaUrl, spec.from, spec.options) ?? spec.from,
  };
}

function createModuleKey(spec: XuiImportSpec): string {
  return JSON.stringify({
    from: spec.from,
    options: spec.options ?? null,
  });
}

function createFrameEntryKey(spec: XuiImportSpec): string {
  return JSON.stringify({
    from: spec.from,
    as: spec.as,
    options: spec.options ?? null,
  });
}

function createImportError(message: string, cause?: unknown): Error {
  const error = new Error(message);

  if (cause !== undefined) {
    (error as Error & { cause?: unknown }).cause = cause;
  }

  return error;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function loadModule(input: {
  moduleCache: ModuleCache;
  getLoader: () => import('@nop-chaos/flux-core').ImportedLibraryLoader | undefined;
  spec: XuiImportSpec;
  signal?: AbortSignal;
}): Promise<ImportedLibraryModule> {
  const loader = input.getLoader();

  if (!loader) {
    throw new Error(`No import loader configured for namespace ${input.spec.as}`);
  }

  const key = createModuleKey(input.spec);
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

  const pending = loader.load(input.spec, input.signal);
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

function buildFrameBindings(
  frame: ImportFrame | undefined,
  framesById: Map<string, InternalImportFrame>,
): Readonly<Record<string, unknown>> {
  if (!frame) {
    return {};
  }

  const chain: ImportFrame[] = [];
  let current: ImportFrame | undefined = frame;

  while (current) {
    chain.unshift(current);
    current = current.parentFrameId ? framesById.get(current.parentFrameId) : undefined;
  }

  const bindings: Record<string, unknown> = {};

  for (const chainFrame of chain) {
    for (const entry of Object.values(chainFrame.entries)) {
      bindings[`$${entry.alias}`] = entry.expressionHelpers ?? entry.actionProvider;
    }
  }

  return bindings;
}

function buildPreparedFrameEntryKey(spec: PreparedImportSpec): string {
  return createFrameEntryKey(spec.resolvedSpec);
}

type InternalImportFrame = ImportFrame & {
  releaseMap: Map<string, () => void>;
  controllerMap: Map<string, AbortController>;
};

function rollbackPartialFrameInstall(frame: Pick<InternalImportFrame, 'releaseMap' | 'controllerMap'>) {
  for (const [key, release] of frame.releaseMap.entries()) {
    frame.controllerMap.get(key)?.abort();
    release();
  }

  frame.releaseMap.clear();
  frame.controllerMap.clear();
}

export function createImportStack(input: {
  moduleCache: ModuleCache;
  getLoader: () => import('@nop-chaos/flux-core').ImportedLibraryLoader | undefined;
  getRuntime: () => RendererRuntime;
  getEnv: () => RendererEnv;
}): ImportStack {
  const framesById = new Map<string, InternalImportFrame>();
  const orderedFrames: InternalImportFrame[] = [];
  let nextFrameId = 0;

  function createFrameId(ownerNodeId: string) {
    nextFrameId += 1;
    return `${ownerNodeId}:import-frame-${nextFrameId}`;
  }

  function notifyImportFailure(error: Error, spec?: XuiImportSpec) {
    reportImportFailure({
      env: input.getEnv(),
      error,
      imports: spec ? [spec] : [],
    });
  }

  async function preload(args: { imports?: readonly XuiImportSpec[]; schemaUrl: string }) {
    const imports =
      args.imports
        ?.map(normalizeImportSpec)
        .map((spec) => resolveImportSpec(input.getEnv(), args.schemaUrl, spec))
        .filter((spec) => spec.from && spec.as) ?? [];

    for (const spec of imports) {
      await loadModule({
        moduleCache: input.moduleCache,
        getLoader: input.getLoader,
        spec,
      });
    }
  }

  async function push(args: {
    ownerNodeId: string;
    parentFrameId?: string;
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    schemaUrl: string;
    nodeInstance?: NodeInstance;
  }): Promise<ImportFrame | undefined> {
    const imports =
      args.imports
        ?.map(normalizeImportSpec)
        .map((spec) => resolveImportSpec(input.getEnv(), args.schemaUrl, spec))
        .filter((spec) => spec.from && spec.as) ?? [];

    if (imports.length === 0) {
      return undefined;
    }

    const frameId = createFrameId(args.ownerNodeId);
    const entries: Record<string, ImportStackEntry> = {};
    const releaseMap = new Map<string, () => void>();
    const controllerMap = new Map<string, AbortController>();

    try {
      for (const spec of imports) {
        if (Object.prototype.hasOwnProperty.call(entries, spec.as)) {
          const error = createImportError(
            `Duplicate import alias in the same node boundary: ${spec.as}`,
          );
          notifyImportFailure(error, spec);
          throw error;
        }

        if (args.actionScope?.listNamespaces().includes(spec.as)) {
          const parentFrame = args.parentFrameId ? framesById.get(args.parentFrameId) : undefined;
          const inherited = parentFrame
            ? buildFrameBindings(parentFrame, framesById)[`$${spec.as}`]
            : undefined;
          const inheritedProvider = args.parentFrameId
            ? resolveAlias(spec.as, args.parentFrameId)?.actionProvider
            : undefined;

          if (!inherited && !inheritedProvider) {
            const error = createImportError(`Namespace collision for import alias: ${spec.as}`);
            notifyImportFailure(error, spec);
            throw error;
          }
        }

        const controller = new AbortController();
        controllerMap.set(createFrameEntryKey(spec), controller);
        let wrappedProvider: ActionNamespaceProvider;
        let expressionHelpers: Readonly<Record<string, unknown>> | undefined;

        try {
          const module = await loadModule({
            moduleCache: input.moduleCache,
            getLoader: input.getLoader,
            spec,
            signal: controller.signal,
          });
          const context: ImportedNamespaceContext = {
            runtime: input.getRuntime(),
            env: input.getEnv(),
            actionScope:
              args.actionScope ??
              input.getRuntime().createActionScope({ id: `${frameId}:${spec.as}:action-scope` }),
            componentRegistry: args.componentRegistry,
            scope: args.scope,
            spec,
            nodeInstance: args.nodeInstance,
          };
          const provider = await module.createNamespace(context);
          expressionHelpers = module.createExpressionHelpers
            ? await module.createExpressionHelpers(context)
            : undefined;
          wrappedProvider = {
            ...provider,
            kind: provider.kind ?? 'import',
          };
        } catch (error) {
          const wrappedError = createImportError(
            `Imported namespace ${spec.as} failed to load: ${toErrorMessage(error)}`,
            error,
          );
          notifyImportFailure(wrappedError, spec);
          throw wrappedError;
        }

        if (args.actionScope) {
          releaseMap.set(
            createFrameEntryKey(spec),
            args.actionScope.registerNamespace(spec.as, wrappedProvider),
          );
        }

        entries[spec.as] = {
          alias: spec.as,
          spec,
          actionProvider: wrappedProvider,
          expressionHelpers: expressionHelpers ?? undefined,
        };
      }
    } catch (error) {
      rollbackPartialFrameInstall({ releaseMap, controllerMap });
      throw error;
    }

    const frame: InternalImportFrame = {
      id: frameId,
      ownerNodeId: args.ownerNodeId,
      parentFrameId: args.parentFrameId,
      actionScope: args.actionScope,
      entries,
      releaseMap,
      controllerMap,
    };

    framesById.set(frameId, frame);
    orderedFrames.push(frame);
    return frame;
  }

  function installPrepared(args: {
    ownerNodeId: string;
    parentFrame?: ImportFrame;
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    nodeInstance?: NodeInstance;
  }): ImportFrame | undefined {
    const imports = args.imports ?? [];

    if (imports.length === 0) {
      return undefined;
    }

    const frameId = createFrameId(args.ownerNodeId);
    const entries: Record<string, ImportStackEntry> = {};
    const releaseMap = new Map<string, () => void>();
    const controllerMap = new Map<string, AbortController>();

    try {
      for (const prepared of imports) {
        if (Object.prototype.hasOwnProperty.call(entries, prepared.spec.as)) {
          const error = createImportError(
            `Duplicate import alias in the same node boundary: ${prepared.spec.as}`,
          );
          notifyImportFailure(error, prepared.spec);
          throw error;
        }

        if (args.actionScope?.listNamespaces().includes(prepared.spec.as)) {
          const inherited = args.parentFrame
            ? buildFrameBindings(args.parentFrame, framesById)[`$${prepared.spec.as}`]
            : undefined;
          const inheritedProvider = args.parentFrame
            ? resolveAlias(prepared.spec.as, args.parentFrame.id)?.actionProvider
            : undefined;

          if (!inherited && !inheritedProvider) {
            const error = createImportError(
              `Namespace collision for import alias: ${prepared.spec.as}`,
            );
            notifyImportFailure(error, prepared.spec);
            throw error;
          }
        }

        const module = input.moduleCache.get(createModuleKey(prepared.resolvedSpec));
        if (!module) {
          const error = createImportError(
            `Prepared import missing cached module for ${prepared.spec.as}`,
          );
          notifyImportFailure(error, prepared.spec);
          throw error;
        }

        const context: ImportedNamespaceContext = {
          runtime: input.getRuntime(),
          env: input.getEnv(),
          actionScope:
            args.actionScope ??
            input
              .getRuntime()
              .createActionScope({ id: `${frameId}:${prepared.spec.as}:action-scope` }),
          componentRegistry: args.componentRegistry,
          scope: args.scope,
          spec: prepared.resolvedSpec,
          nodeInstance: args.nodeInstance,
        };

        const providerResult = module.createNamespace(context);
        const helpersResult = module.createExpressionHelpers?.(context);

        if (providerResult instanceof Promise || helpersResult instanceof Promise) {
          const error = createImportError(
            `Prepared import ${prepared.spec.as} must install synchronously at render time.`,
          );
          notifyImportFailure(error, prepared.spec);
          throw error;
        }

        const wrappedProvider: ActionNamespaceProvider = {
          ...providerResult,
          kind: providerResult.kind ?? 'import',
        };

        if (args.actionScope) {
          releaseMap.set(
            buildPreparedFrameEntryKey(prepared),
            args.actionScope.registerNamespace(prepared.spec.as, wrappedProvider),
          );
        }

        entries[prepared.spec.as] = {
          alias: prepared.spec.as,
          spec: prepared.resolvedSpec,
          actionProvider: wrappedProvider,
          expressionHelpers: helpersResult ?? undefined,
          staticMeta: prepared.staticMeta,
        };
      }
    } catch (error) {
      rollbackPartialFrameInstall({ releaseMap, controllerMap });
      throw error;
    }

    const frame: InternalImportFrame = {
      id: frameId,
      ownerNodeId: args.ownerNodeId,
      parentFrameId: args.parentFrame?.id,
      parentFrame: args.parentFrame,
      actionScope: args.actionScope,
      entries,
      releaseMap,
      controllerMap,
    };

    framesById.set(frameId, frame);
    orderedFrames.push(frame);
    return frame;
  }

  function pop(frameId: string) {
    const frame = framesById.get(frameId);

    if (!frame) {
      return;
    }

    rollbackPartialFrameInstall(frame);
    framesById.delete(frameId);
    const index = orderedFrames.findIndex((candidate) => candidate.id === frameId);
    if (index >= 0) {
      orderedFrames.splice(index, 1);
    }
  }

  function resolveAlias(alias: string, frameId?: string): ImportStackEntry | undefined {
    if (frameId) {
      let current = framesById.get(frameId);

      while (current) {
        const direct = current.entries[alias];
        if (direct) {
          return direct;
        }
        current = current.parentFrameId ? framesById.get(current.parentFrameId) : undefined;
      }

      return undefined;
    }

    for (let index = orderedFrames.length - 1; index >= 0; index -= 1) {
      const entry = orderedFrames[index].entries[alias];
      if (entry) {
        return entry;
      }
    }

    return undefined;
  }

  function currentBindings(frameId?: string): Readonly<Record<string, unknown>> {
    const frame = frameId ? framesById.get(frameId) : orderedFrames[orderedFrames.length - 1];
    return buildFrameBindings(frame, framesById);
  }

  function dispose() {
    for (const frame of [...orderedFrames]) {
      pop(frame.id);
    }
  }

  return {
    get frames() {
      return orderedFrames;
    },
    preload,
    push,
    installPrepared,
    pop,
    resolveAlias,
    currentBindings,
    dispose,
  };
}
