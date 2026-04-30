import type {
  ActionScope,
  ComponentHandleRegistry,
  ImportStack,
  ImportedLibraryLoader,
  ModuleCache,
  NodeInstance,
  PreparedImportSpec,
  RendererEnv,
  RendererRuntime,
  ScopeRef,
} from '@nop-chaos/flux-core';

export interface ImportManager {
  ensureImportedNamespaces(args: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    schemaUrl: string;
    nodeInstance?: NodeInstance;
  }): Promise<void>;
  getImportedExpressionBindings(args: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    schemaUrl: string;
  }): Readonly<Record<string, unknown>>;
  releaseImportedNamespaces(args: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    schemaUrl: string;
  }): void;
  dispose(args?: { actionScopes?: readonly ActionScope[] }): void;
}

function normalizeImports(imports: readonly PreparedImportSpec[] | undefined) {
  return imports?.filter((spec) => spec.resolvedSpec.from && spec.resolvedSpec.as) ?? [];
}

function createFrameKey(imports: readonly PreparedImportSpec[]): string {
  return JSON.stringify(
    imports.map((entry) => ({
      from: entry.resolvedSpec.from,
      as: entry.resolvedSpec.as,
      options: entry.resolvedSpec.options ?? null,
    })),
  );
}

export function createImportManager(input: {
  getLoader: () => ImportedLibraryLoader | undefined;
  getRuntime: () => RendererRuntime;
  getEnv: () => RendererEnv;
  moduleCache: ModuleCache;
  importStack: ImportStack;
}): ImportManager {
  void input.getLoader;
  void input.getRuntime;
  void input.moduleCache;

  const framesByActionScope = new WeakMap<
    ActionScope,
    Map<string, { frameId: string; refCount: number }>
  >();

  function getScopeFrames(actionScope: ActionScope) {
    let frames = framesByActionScope.get(actionScope);

    if (!frames) {
      frames = new Map<string, { frameId: string; refCount: number }>();
      framesByActionScope.set(actionScope, frames);
    }

    return frames;
  }

  async function ensureImportedNamespaces(args: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    scope: ScopeRef;
    schemaUrl: string;
    nodeInstance?: NodeInstance;
  }) {
    const imports = normalizeImports(args.imports);

    if (!args.actionScope || imports.length === 0) {
      return;
    }

    const scopeFrames = getScopeFrames(args.actionScope);
    const frameKey = createFrameKey(imports);
    const existing = scopeFrames.get(frameKey);

    if (existing) {
      existing.refCount += 1;
      return;
    }

    const frame = input.importStack.installPrepared({
      ownerNodeId: args.nodeInstance?.templateNode.id ?? `${args.actionScope.id}:imports`,
      imports,
      parentFrame: undefined,
      actionScope: args.actionScope,
      componentRegistry: args.componentRegistry,
      scope: args.scope,
      nodeInstance: args.nodeInstance,
    });

    if (frame) {
      scopeFrames.set(frameKey, { frameId: frame.id, refCount: 1 });
    }
  }

  function getImportedExpressionBindings(args: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    schemaUrl: string;
  }): Readonly<Record<string, unknown>> {
    const imports = normalizeImports(args.imports);

    if (!args.actionScope || imports.length === 0) {
      return {};
    }

    const frameRef = framesByActionScope.get(args.actionScope)?.get(createFrameKey(imports));
    return frameRef ? input.importStack.currentBindings(frameRef.frameId) : {};
  }

  function releaseImportedNamespaces(args: {
    imports?: readonly PreparedImportSpec[];
    actionScope?: ActionScope;
    schemaUrl: string;
  }) {
    const imports = normalizeImports(args.imports);

    if (!args.actionScope || imports.length === 0) {
      return;
    }

    const scopeFrames = framesByActionScope.get(args.actionScope);
    const frameKey = createFrameKey(imports);
    const frameRef = scopeFrames?.get(frameKey);

    if (!frameRef) {
      return;
    }

    frameRef.refCount = Math.max(0, frameRef.refCount - 1);

    if (frameRef.refCount === 0) {
      input.importStack.pop(frameRef.frameId);
      scopeFrames?.delete(frameKey);
    }

    if (scopeFrames && scopeFrames.size === 0) {
      framesByActionScope.delete(args.actionScope);
    }
  }

  function dispose(args?: { actionScopes?: readonly ActionScope[] }) {
    if (args?.actionScopes) {
      for (const actionScope of args.actionScopes) {
        framesByActionScope.delete(actionScope);
      }
    }

    input.importStack.dispose();
  }

  return {
    ensureImportedNamespaces,
    getImportedExpressionBindings,
    releaseImportedNamespaces,
    dispose,
  };
}
