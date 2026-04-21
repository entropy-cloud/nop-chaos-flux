import type {
  ActionScope,
  ComponentHandleRegistry,
  ImportStack,
  ImportedLibraryLoader,
  ModuleCache,
  NodeInstance,
  RendererEnv,
  RendererRuntime,
  ScopeRef,
  XuiImportSpec
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
    schemaUrl: string;
  }): Readonly<Record<string, unknown>>;
  releaseImportedNamespaces(args: {
    imports?: readonly XuiImportSpec[];
    actionScope?: ActionScope;
    schemaUrl: string;
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

function normalizeImports(imports?: readonly XuiImportSpec[]) {
  return imports
    ?.map(normalizeImportSpec)
    .filter((spec) => spec.from && spec.as) ?? [];
}

function createFrameKey(imports: readonly XuiImportSpec[]): string {
  return JSON.stringify(imports.map((spec) => ({ from: spec.from, as: spec.as, options: spec.options ?? null })));
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

  const framesByActionScope = new WeakMap<ActionScope, Map<string, { frameId: string; refCount: number }>>();

  function getScopeFrames(actionScope: ActionScope) {
    let frames = framesByActionScope.get(actionScope);

    if (!frames) {
      frames = new Map<string, { frameId: string; refCount: number }>();
      framesByActionScope.set(actionScope, frames);
    }

    return frames;
  }

  async function ensureImportedNamespaces(args: {
    imports?: readonly XuiImportSpec[];
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

    const frame = await input.importStack.push({
      ownerNodeId: args.nodeInstance?.templateNode.id ?? `${args.actionScope.id}:imports`,
      imports,
      actionScope: args.actionScope,
      componentRegistry: args.componentRegistry,
      scope: args.scope,
      schemaUrl: args.schemaUrl,
      nodeInstance: args.nodeInstance
    });

    if (frame) {
      scopeFrames.set(frameKey, { frameId: frame.id, refCount: 1 });
    }
  }

  function getImportedExpressionBindings(args: {
    imports?: readonly XuiImportSpec[];
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
    imports?: readonly XuiImportSpec[];
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
    dispose
  };
}
