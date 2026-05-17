import type {
  ComponentHandle,
  ComponentHandleRegistry,
  RendererRuntime,
} from '@nop-chaos/flux-core';
import { parsePath, resolveRendererAuthoringContract } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { buildScopeChain } from '@nop-chaos/flux-core';
import type {
  NopComponentInspectResult,
  NopComponentTreeItem,
  NopExpressionEvaluationResult,
} from './types.js';

function reportInspectorDiagnostic(error: unknown) {
  try {
    console.warn('[nop-debugger] inspector enrichment failed', error);
  } catch {
    void 0;
  }
}

function pickRecord(source: Record<string, unknown> | undefined, keys: readonly string[]) {
  if (!source) {
    return undefined;
  }

  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}

function getAvailableMethods(handle: ComponentHandle | undefined) {
  return handle?.capabilities?.listMethods?.();
}

function applyResolvedInspectFallbacks(
  result: NopComponentInspectResult,
  payload: {
    scopeChain?: readonly { data: Record<string, unknown> }[];
    state?: {
      resolvedMeta?: unknown;
      resolvedProps?: unknown;
    };
  },
) {
  if (!result.scopeData && payload.scopeChain?.[0]?.data) {
    result.scopeData = payload.scopeChain[0].data;
  }

  if (!result.metaSummary) {
    result.metaSummary = pickRecord(
      payload.state?.resolvedMeta as Record<string, unknown> | undefined,
      [
        'id',
        'name',
        'label',
        'title',
        'className',
        'visible',
        'hidden',
        'disabled',
        'testid',
        'cid',
      ],
    );
  }

  if (!result.propsSummary) {
    result.propsSummary = pickRecord(
      payload.state?.resolvedProps as Record<string, unknown> | undefined,
      ['id', 'name', 'label', 'title', 'type', 'value', 'placeholder', 'options'],
    );
  }
}

export function buildInspectResult(
  cid: number,
  handle: ReturnType<NonNullable<ComponentHandleRegistry['getHandleByCid']>> | undefined,
  mounted: boolean,
  element?: HTMLElement,
  registry?: ComponentHandleRegistry,
  runtime?: RendererRuntime,
): NopComponentInspectResult {
  const debugData = registry?.getHandleDebugData?.(cid);
  const result: NopComponentInspectResult = {
    cid,
    mounted,
  };
  if (handle) {
    result.handleId = handle.id;
    result.handleName = handle.name;
    result.handleType = handle.type;
  }

  result.nodeId = debugData?.nodeId;
  result.path = debugData?.path;
  result.rendererType = debugData?.rendererType;
  if (result.rendererType) {
    const definition = runtime?.registry.get(result.rendererType);
    if (definition) {
      result.authoringContract = resolveRendererAuthoringContract(definition);
    }
  }
  result.availableMethods = getAvailableMethods(handle);
  result.registryEntry = handle
    ? {
        id: handle.id,
        name: handle.name,
        type: handle.type,
        mounted: handle._mounted !== false,
      }
    : undefined;
  result.debugData = handle?.capabilities?.getDebugData?.();

  if (debugData?.scope) {
    result.scopeChain = buildScopeChain(debugData.scope);
    result.scopeData = debugData.scope.materializeVisible();
  }

  result.metaSummary = pickRecord(debugData?.resolvedMeta as Record<string, unknown> | undefined, [
    'id',
    'name',
    'label',
    'title',
    'className',
    'visible',
    'hidden',
    'disabled',
    'testid',
    'cid',
  ]);
  result.propsSummary = pickRecord(
    debugData?.resolvedProps as Record<string, unknown> | undefined,
    ['id', 'name', 'label', 'title', 'type', 'value', 'placeholder', 'options'],
  );
  if (debugData?.nodeInstance?.state || debugData?.sourceHints) {
    result.debugData = {
      ...(result.debugData ?? {}),
      ...(debugData?.sourceHints ? { sourceHints: debugData.sourceHints } : {}),
      ...(debugData?.nodeInstance?.state
        ? {
            nodeState: {
              mounted: debugData.nodeInstance.state.mounted,
              hasMetaDependencies: Boolean(debugData.nodeInstance.state.metaDependencies),
              hasPropsDependencies: Boolean(debugData.nodeInstance.state.propsDependencies),
              metaDependencyPaths: debugData.nodeInstance.state.metaDependencies?.paths ?? [],
              metaDependencyWildcard:
                debugData.nodeInstance.state.metaDependencies?.wildcard ?? false,
              metaDependencyBroadAccess:
                debugData.nodeInstance.state.metaDependencies?.broadAccess ?? false,
              propsDependencyPaths: debugData.nodeInstance.state.propsDependencies?.paths ?? [],
              propsDependencyWildcard:
                debugData.nodeInstance.state.propsDependencies?.wildcard ?? false,
              propsDependencyBroadAccess:
                debugData.nodeInstance.state.propsDependencies?.broadAccess ?? false,
            },
          }
        : {}),
    };
  }

  const capabilityStore = handle?.capabilities?.store as
    | {
        getState(): {
          values?: Record<string, unknown>;
          errors?: Record<string, unknown>;
          touched?: Record<string, boolean>;
          dirty?: Record<string, boolean>;
          visited?: Record<string, boolean>;
          submitting?: boolean;
        };
      }
    | undefined;

  if (capabilityStore) {
    try {
      const state = capabilityStore.getState();
      result.formState = {
        values: state.values ?? {},
        errors: state.errors ?? {},
        touched: state.touched ?? {},
        dirty: state.dirty ?? {},
        visited: state.visited ?? {},
        submitting: state.submitting ?? false,
      };
      result.scopeData = state.values ?? {};
    } catch (error) {
      reportInspectorDiagnostic(error);
    }
  }

  if (element) {
    result.tagName = element.tagName.toLowerCase();
    result.className = element.className || undefined;
  }

  return result;
}

export function findInspectableOwner(element: HTMLElement): HTMLElement | null {
  return element.closest('[data-cid]');
}

function compareOptionalText(left: string | undefined, right: string | undefined) {
  return (left ?? '').localeCompare(right ?? '');
}

function getRuntimeRoot(runtime: RendererRuntime | undefined): ParentNode | undefined {
  if (typeof document === 'undefined' || !runtime) {
    return undefined;
  }

  return document.querySelector(`[data-runtime-id="${runtime.runtimeId}"]`) ?? undefined;
}

function queryRuntimeScopedElement(
  runtime: RendererRuntime | undefined,
  cid: number,
): HTMLElement | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const selector = `[data-cid="${cid}"]`;
  const runtimeRoot = getRuntimeRoot(runtime);
  if (runtimeRoot instanceof Element) {
    return (runtimeRoot.querySelector(selector) as HTMLElement | null) ?? undefined;
  }

   if (runtime) {
    return undefined;
  }

  return (document.querySelector(selector) as HTMLElement | null) ?? undefined;
}

function getComponentTreeDepth(
  path: string | undefined,
  instancePath: NopComponentTreeItem['instancePath'],
) {
  const pathDepth = path
    ? Math.max(parsePath(path).filter((segment) => segment !== '$').length - 1, 0)
    : 0;

  return pathDepth + (instancePath?.length ?? 0);
}

export function compareComponentTreeItems(left: NopComponentTreeItem, right: NopComponentTreeItem) {
  const pathCompare = compareOptionalText(left.path, right.path);

  if (pathCompare !== 0) {
    return pathCompare;
  }

  const instanceCompare = compareOptionalText(
    JSON.stringify(left.instancePath ?? null),
    JSON.stringify(right.instancePath ?? null),
  );

  if (instanceCompare !== 0) {
    return instanceCompare;
  }

  return left.cid - right.cid;
}

export function buildInspectByCid(
  componentRegistry: ComponentHandleRegistry | undefined,
  getRuntime?: () => RendererRuntime | undefined,
) {
  return (cid: number): NopComponentInspectResult | undefined => {
    const runtime = getRuntime?.();
    if (!componentRegistry) return undefined;
    const element = queryRuntimeScopedElement(runtime, cid);
    const inspected = componentRegistry.inspectCid?.(cid);
    const handle = componentRegistry.getHandleByCid?.(cid);

    if (inspected?.kind === 'resolved') {
      const result = buildInspectResult(
        cid,
        handle,
        inspected.payload.state?.mounted ?? handle?._mounted !== false,
        (element as HTMLElement) ?? undefined,
        componentRegistry,
        runtime,
      );
      result.instancePath = inspected.payload.instancePath;
      result.scopeChain = inspected.payload.scopeChain as typeof result.scopeChain;
      applyResolvedInspectFallbacks(result, inspected.payload);
      return result;
    }

    if (inspected?.kind === 'notMaterialized') {
      const result = buildInspectResult(
        cid,
        handle,
        false,
        (element as HTMLElement) ?? undefined,
        componentRegistry,
        runtime,
      );
      result.instancePath = inspected.instancePath;
      return result;
    }

    if (!handle && !element) return undefined;
    return buildInspectResult(
      cid,
      handle,
      !!element || handle?._mounted !== false,
      (element as HTMLElement) ?? undefined,
      componentRegistry,
      runtime,
    );
  };
}

export function buildInspectByElement(
  componentRegistry: ComponentHandleRegistry | undefined,
  getRuntime?: () => RendererRuntime | undefined,
) {
  return (element: HTMLElement): NopComponentInspectResult | undefined => {
    const runtime = getRuntime?.();
    const owner = findInspectableOwner(element);
    const cidAttr = owner?.getAttribute('data-cid');
    if (!cidAttr) return undefined;
    const cid = Number(cidAttr);
    if (!Number.isFinite(cid)) return undefined;
    const inspected = componentRegistry?.inspectCid?.(cid);
    const handle = componentRegistry?.getHandleByCid?.(cid);

    if (inspected?.kind === 'resolved') {
      const result = buildInspectResult(
        cid,
        handle,
        inspected.payload.state?.mounted ?? handle?._mounted !== false,
        owner ?? undefined,
        componentRegistry,
        runtime,
      );
      result.instancePath = inspected.payload.instancePath;
      result.scopeChain = inspected.payload.scopeChain as typeof result.scopeChain;
      applyResolvedInspectFallbacks(result, inspected.payload);
      return result;
    }

    if (inspected?.kind === 'notMaterialized') {
      const result = buildInspectResult(
        cid,
        handle,
        false,
        owner ?? undefined,
        componentRegistry,
        runtime,
      );
      result.instancePath = inspected.instancePath;
      return result;
    }

    return buildInspectResult(cid, handle, true, owner ?? undefined, componentRegistry, runtime);
  };
}

export function buildGetComponentTree(
  componentRegistry: ComponentHandleRegistry | undefined,
  getRuntime?: () => RendererRuntime | undefined,
) {
  return (): NopComponentTreeItem[] => {
    const handles = componentRegistry?.getDebugSnapshot?.().handles;
    const runtime = getRuntime?.();

    if (!handles) {
      return [];
    }

    return handles
      .filter(
        (entry): entry is typeof entry & { cid: number } =>
          entry.mounted && typeof entry.cid === 'number',
      )
      .map((entry) => {
        const debugData = componentRegistry?.getHandleDebugData?.(entry.cid);
        const instancePath = debugData?.nodeInstance?.instancePath;
        const element = queryRuntimeScopedElement(runtime, entry.cid) ?? null;
        const className =
          typeof element?.className === 'string' && element.className.length > 0
            ? element.className
            : undefined;

        return {
          cid: entry.cid,
          type: debugData?.rendererType ?? entry.type,
          label:
            debugData?.nodeId ??
            entry.name ??
            entry.id ??
            debugData?.path ??
            debugData?.rendererType ??
            entry.type,
          depth: getComponentTreeDepth(debugData?.path, instancePath),
          mounted: entry.mounted,
          instancePath,
          nodeId: debugData?.nodeId,
          path: debugData?.path,
          rendererType: debugData?.rendererType,
          tagName: element?.tagName?.toLowerCase(),
          className,
        } satisfies NopComponentTreeItem;
      })
      .sort(compareComponentTreeItems);
  };
}

export function buildEvaluateNodeExpression(
  inspectByCid: (cid: number) => NopComponentInspectResult | undefined,
) {
  return (args: { cid: number; expression: string }): NopExpressionEvaluationResult => {
    const inspectResult = inspectByCid(args.cid);

    if (!inspectResult?.scopeChain?.[0]) {
      return {
        expression: args.expression,
        ok: false,
        error: 'Node scope is unavailable for expression evaluation.',
      };
    }

    try {
      const compiler = createFormulaCompiler();
      const compiled = compiler.compileExpression(args.expression);

      return {
        expression: args.expression,
        ok: true,
        value: compiled.exec(inspectResult.scopeChain[0].data, {
          fetcher: async () => {
            throw new Error('API calls are not available during expression evaluation.');
          },
          notify() {
            return undefined;
          },
        }),
        usedScopeLabel: inspectResult.scopeChain[0].label,
      };
    } catch (error) {
      return {
        expression: args.expression,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        usedScopeLabel: inspectResult.scopeChain[0].label,
      };
    }
  };
}
