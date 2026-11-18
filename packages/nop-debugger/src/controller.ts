import type {
  ActionContext,
  ActionScope,
  ComponentHandleRegistry,
  RendererEnv,
  RendererPlugin,
  RendererRuntime,
} from '@nop-chaos/flux-core';
import { setStrictValidationGlobal } from '@nop-chaos/flux-core';
import { appendActionErrorEvent, createDebuggerPlugin, decorateDebuggerEnv } from './adapters.js';
import {
  createSchemaPatchAuditRecorder,
  validateSchemaPatchShape,
  type PatchTargetResolvers,
} from './schema-patch.js';
import {
  createAutomationApi,
  getNopDebuggerAutomationApi as getAutomationApi,
  installNopDebuggerWindowFlag,
  registerAutomationApi,
} from './automation.js';
import {
  buildGetComponentTree,
  buildInspectByCid,
  buildInspectByElement,
  buildEvaluateNodeExpression,
} from './controller-component-inspector.js';
import {
  createRequestInstanceIdFactory,
  createSessionId,
  loadPersistedMinimized,
  loadPersistedPanelOpen,
  loadPersistedPosition,
  persistMinimized,
  persistPanelOpen,
  persistPosition,
  readWindowConfig, DEFAULT_POSITION,
} from './controller-helpers.js';
import {
  applyEventQuery,
  buildInteractionTrace,
  buildNodeDiagnostics,
  buildOverview,
  buildSessionExport,
  createDiagnosticReport,
  getLatestFailedAction,
  getLatestFailedRequest,
  getNodeAnomalies,
  getRecentFailures,
} from './diagnostics.js';
import {
  explainNodeAsync,
  explainNodeFailure,
  explainNodeMeta,
  explainNodeValue,
} from './explanations.js';
import { normalizeRedactionOptions, redactData } from './redaction.js';
import { createForestSnapshotCollector } from './snapshot-repository.js';
import { createAssertionBridge } from './assertion-bridge.js';
import { createWhyBridge } from './why-bridge.js';
import { createDependencyGraph } from './dependency-graph.js';
import { suggestSelector } from './selector-suggest.js';
import { createPreviewController, type PreviewController } from './preview-controller.js';
import { createIncrementalCapturer } from './capture/screenshot.js';
import { createDebuggerStore } from './store.js';
import type {
  NopComponentInspectResult,
  NopDebugEvent,
  NopDebugEventQuery,
  NopDebuggerAnyTab,
  NopDebuggerAutomationApi,
  NopDebuggerController,
  NopDebuggerOptions,
  NopDebuggerPanelTabDescriptor,
  NopDebuggerSessionExportOptions,
  NopSchemaPatch,
  NopSchemaPatchApplier,
  NopSchemaPatchAuditEntry,
  NopDiagnosticReport,
  NopDiagnosticReportOptions,
  NopInteractionTraceQuery,
  NopNodeDiagnosticsOptions,
  NopWaitForEventOptions,
} from './types.js';

function appendActionScopeSnapshotEvent(args: {
  store: ReturnType<typeof createDebuggerStore>;
  actionScope: ActionScope;
}) {
  const debugSnapshot = args.actionScope.getDebugSnapshot?.();
  if (!debugSnapshot) {
    return;
  }

  args.store.append({
    kind: 'state:snapshot',
    group: 'node',
    level: 'info',
    source: 'controller.setActionScope',
    summary: `action scope snapshot (${debugSnapshot.namespaces.length} namespace${debugSnapshot.namespaces.length === 1 ? '' : 's'})`,
    detail: `scopeId=${debugSnapshot.id} | parentId=${debugSnapshot.parentId ?? 'none'}`,
    exportedData: debugSnapshot,
  });
}

export function createNopDebugger(options: NopDebuggerOptions = {}): NopDebuggerController {
  const windowConfig = readWindowConfig();
  const enabled = options.enabled ?? windowConfig.enabled;
  const capturePerformance = options.capturePerformance ?? enabled;
  const debuggerId = options.id ?? 'default';
  const sessionId = createSessionId(debuggerId);
  const maxEvents = options.maxEvents ?? 400;
  const exposeAutomationApi = options.exposeAutomationApi ?? false;
  const redaction = normalizeRedactionOptions(options.redaction);
  const persistedPosition = loadPersistedPosition(debuggerId);
  const persistedPanelOpen = loadPersistedPanelOpen(debuggerId);
  const persistedMinimized = loadPersistedMinimized(debuggerId);
  const initialPosition = persistedPosition ?? windowConfig.position;
  const initialPanelOpen = persistedPanelOpen ?? windowConfig.defaultOpen;
  // ux-r6 G-1：持久化位置或显式 position 配置存在即 floating；否则按 windowConfig 停靠（默认 bottom-left）
  const initialDock =
    persistedPosition ?? windowConfig.position ? ('floating' as const) : windowConfig.dock;
  const storePosition = initialPosition ?? DEFAULT_POSITION;

  // Host-registered panel tabs (AI-agnostic seam). Registry + listeners live
  // outside the event snapshot store: tab registration is chrome state, not
  // diagnostics state.
  const panelTabs = new Map<string, NopDebuggerPanelTabDescriptor>();
  const panelTabListeners = new Set<() => void>();
  // Cached list identity for useSyncExternalStore getSnapshot stability.
  let panelTabList: NopDebuggerPanelTabDescriptor[] = [];
  const notifyPanelTabListeners = () => {
    panelTabList = [...panelTabs.values()];
    for (const listener of panelTabListeners) listener();
  };

  // Schema patch state (AD-3): fail-closed bookkeeping. The host applier owns
  // schema-state atomicity; the debugger owns validation, audit, and the
  // active-patch table.
  const patchAudit = createSchemaPatchAuditRecorder();
  const activePatches = new Map<string, { revertToken: string }>();
  let schemaPatchApplier: NopSchemaPatchApplier | null = null;
  const patchTargetResolvers: PatchTargetResolvers = {
    inspectByCid: (cid) => {
      const hit = currentInspectByCid(cid);
      return hit ? { cid: hit.cid } : undefined;
    },
    getComponentTree: () => currentGetComponentTree(),
  };

  const store = createDebuggerStore({
    enabled,
    sessionId,
    maxEvents,
    defaultOpen: initialPanelOpen,
    defaultTab: windowConfig.defaultTab,
    position: storePosition,
    dock: initialDock,
    errorBufferKeepEarliest: options.errorBuffer?.keepEarliest ?? 3,
    errorBufferKeepLatest: options.errorBuffer?.keepLatest ?? 5,
  });
  store.subscribe(() => {
    if (autoScreenshotMode !== 'on-step' || typeof document === 'undefined') return;
    const latest = store.getSnapshot().events[0];
    if (!latest || latest.kind !== 'action:end' || latest.screenshotId) return;
    void (async () => {
      try {
        const rect = document.body.getBoundingClientRect();
        const { result } = await incrementalCapturer.capture({ root: document.body, width: rect.width, height: rect.height });
        store.updateEvent(latest.id, { screenshotId: result.id });
      } catch (error) {
        // auto screenshots are best-effort; record the failure cause on the event
        store.updateEvent(latest.id, {
          detail: `auto screenshot failed cause: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    })();
  });

  if (persistedMinimized) {
    store.minimize();
  }

  const requestState = new Map<
    string,
    {
      startedAt: number;
      requestInstanceId: string;
      interactionId?: string;
      nodeId?: string;
      path?: string;
    }
  >();
  const nextRequestInstanceId = createRequestInstanceIdFactory();
  let componentRegistry: ComponentHandleRegistry | undefined;
  let runtime: RendererRuntime | undefined;
  let snapshotCollector: ReturnType<typeof createForestSnapshotCollector> | undefined;
  let snapshotObserverDisposer: (() => void) | undefined;
  let previewController: PreviewController | undefined;
  let latestDomShadow: ReturnType<typeof import('./dom-shadow.js').captureDomShadow> | undefined;
  const incrementalCapturer = createIncrementalCapturer();
  let autoScreenshotMode: 'on-step' | 'on-change' | 'off' = 'off';
  const getRuntime = () => runtime;
  let currentInspectByCid = buildInspectByCid(componentRegistry, getRuntime);

  const dependencyGraph = createDependencyGraph();
  const whyBridge = createWhyBridge({
    getRuntime,
    explainValue: (cid: number, expression: string) => explainValue({ cid, field: expression }) as never,
    store,
    inspectByCid: (cid: number) => currentInspectByCid(cid),
    explainMeta: (cid: number, field) => explainMeta({ cid, field }) as never,
    getSnapshotCollector: () => snapshotCollector ?? null,
    dependencyGraph,
    captureEvidence: (options) => assertionBridge.captureScreenshot({ tag: options.tag, fresh: options.fresh }),
  });
  const assertionBridge = createAssertionBridge({
    getRuntime,
    store,
    inspectByCid: (cid: number) => currentInspectByCid(cid),
    getLatestSnapshotScopes: () => snapshotCollector?.getLatest()?.scopes ?? null,
    incrementalCapturer,
  });
  let currentInspectByElement = buildInspectByElement(componentRegistry, getRuntime);
  let currentGetComponentTree = buildGetComponentTree(componentRegistry, getRuntime);
  let currentEvaluateNodeExpression = buildEvaluateNodeExpression(currentInspectByCid);

  const getSnapshot = () => store.getSnapshot();
  const getOverview = () => buildOverview(getSnapshot().events);
  const queryEvents = (query?: NopDebugEventQuery) => applyEventQuery(getSnapshot().events, query);
  const getLatestEvent = (query?: NopDebugEventQuery) => queryEvents({ ...query, limit: 1 })[0];
  const getLatestError = () => getLatestEvent({ group: 'error' });
  const getEarliestErrors = () => getSnapshot().pinnedErrors.earliest;
  const getLatestErrors = () => getSnapshot().pinnedErrors.latest;
  const getPinnedErrors = () => getSnapshot().pinnedErrors;
  const getNodeDiagnostics = (nodeOptions: NopNodeDiagnosticsOptions) =>
    buildNodeDiagnostics(getSnapshot().events, nodeOptions);
  const getInteractionTrace = (traceQuery: NopInteractionTraceQuery) =>
    buildInteractionTrace(getSnapshot().events, traceQuery);
  const getLatestFailedRequestSummary = () => getLatestFailedRequest(getSnapshot().events);
  const getLatestFailedActionSummary = () => getLatestFailedAction(getSnapshot().events);
  const getNodeAnomaliesSummary = (nodeOptions: NopNodeDiagnosticsOptions) =>
    getNodeAnomalies(getSnapshot().events, nodeOptions);
  const getRecentFailuresSummary = (options?: { sinceTimestamp?: number; limit?: number }) =>
    getRecentFailures(getSnapshot().events, options);
  const getAsyncOwnerDebugSnapshot = () =>
    runtime?.getAsyncOwnerDebugSnapshot?.() ?? { owners: [] };
  const listFormStoreDiagnosticsOwners = () =>
    runtime?.getFormStoreDiagnosticsBridge?.().listOwners() ?? [];
  const startFormStoreDiagnosticsSession = (
    query: Parameters<NopDebuggerController['startFormStoreDiagnosticsSession']>[0],
    options?: Parameters<NopDebuggerController['startFormStoreDiagnosticsSession']>[1],
  ): boolean => runtime?.getFormStoreDiagnosticsBridge?.().startSession(query, options) ?? false;
  const stopFormStoreDiagnosticsSession = (
    query: Parameters<NopDebuggerController['stopFormStoreDiagnosticsSession']>[0],
  ): boolean => runtime?.getFormStoreDiagnosticsBridge?.().stopSession(query) ?? false;
  const clearFormStoreDiagnosticsSession = (
    query: Parameters<NopDebuggerController['clearFormStoreDiagnosticsSession']>[0],
  ): boolean => runtime?.getFormStoreDiagnosticsBridge?.().clearSession(query) ?? false;
  const getFormStoreDiagnosticsSnapshot = (
    query: Parameters<NopDebuggerController['getFormStoreDiagnosticsSnapshot']>[0],
  ) => runtime?.getFormStoreDiagnosticsBridge?.().getSnapshot(query);
  const explainValue = (query: Parameters<NopDebuggerController['explainNodeValue']>[0]) =>
    explainNodeValue({
      query,
      inspect: currentInspectByCid(query.cid),
      redaction,
    });
  const explainMeta = (query: Parameters<NopDebuggerController['explainNodeMeta']>[0]) =>
    explainNodeMeta({
      query,
      inspect: currentInspectByCid(query.cid),
      redaction,
    });
  const explainFailure = (query?: Parameters<NopDebuggerController['explainNodeFailure']>[0]) =>
    explainNodeFailure({
      query,
      inspectByCid: currentInspectByCid,
      events: getSnapshot().events,
    });
  const explainAsyncSummary = (query?: Parameters<NopDebuggerController['explainNodeAsync']>[0]) =>
    explainNodeAsync({
      query,
      inspectByCid: currentInspectByCid,
      asyncSnapshot: getAsyncOwnerDebugSnapshot(),
    });
  const createReport = (reportOptions?: NopDiagnosticReportOptions) =>
    createDiagnosticReport(debuggerId, getSnapshot(), reportOptions);
  const exportSession = (sessionOptions?: NopDebuggerSessionExportOptions) =>
    buildSessionExport(debuggerId, sessionId, getSnapshot(), redaction, sessionOptions);
  const waitForEvent = (waitOptions?: NopWaitForEventOptions) => {
    const timeoutMs = waitOptions?.timeoutMs ?? 5000;
    const immediate = getLatestEvent(waitOptions);

    if (immediate) {
      return Promise.resolve(immediate);
    }

    return new Promise<NopDebugEvent>((resolve, reject) => {
      const startedAt = Date.now();
      const unsubscribe = store.subscribe(() => {
        const next = getLatestEvent({
          ...waitOptions,
          sinceTimestamp: waitOptions?.sinceTimestamp ?? startedAt,
        });

        if (next) {
          clearTimeout(timer);
          unsubscribe();
          resolve(next);
        }
      });

      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timed out waiting for debugger event after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  };

  const automation: NopDebuggerAutomationApi = createAutomationApi({
    controllerId: debuggerId,
    sessionId,
    getSnapshot,
    getOverview,
    queryEvents,
    getLatestEvent,
    getLatestError,
    getEarliestErrors,
    getLatestErrors,
    getPinnedErrors,
    getNodeDiagnostics,
    getInteractionTrace,
    getLatestFailedRequest: getLatestFailedRequestSummary,
    getLatestFailedAction: getLatestFailedActionSummary,
    getNodeAnomalies: getNodeAnomaliesSummary,
    getRecentFailures: getRecentFailuresSummary,
    getAsyncOwnerDebugSnapshot,
    listFormStoreDiagnosticsOwners,
    startFormStoreDiagnosticsSession,
    stopFormStoreDiagnosticsSession,
    clearFormStoreDiagnosticsSession,
    getFormStoreDiagnosticsSnapshot,
    createDiagnosticReport: createReport,
    exportSession,
    waitForEvent,
    getStability: () => {
      const tracker = runtime?.getStabilityTracker?.();
      if (!tracker) return { stable: true, counters: {} };
      const snapshot = tracker.getSnapshot();
      return { stable: snapshot.stable, degraded: snapshot.degraded, counters: { ...snapshot.counters } };
    },
    getSnapshotAt: (epoch: number) => snapshotCollector?.getSnapshotAt(epoch) ?? null,
    getSnapshotEpochs: () => snapshotCollector?.getEpochs() ?? [],
    enterPreview: (epoch: number) => previewController?.enterPreview(epoch) ?? false,
    leavePreview: () => previewController?.leavePreview(),
    setPreviewPinned: (pin: boolean) => previewController?.setPinned(pin),
    isPreviewActive: () => previewController?.isActive() ?? false,
    screenshot: (options?: { cid?: string; selector?: string; format?: 'png' | 'webp'; scale?: number; tag?: string; fresh?: boolean }) => assertionBridge.captureScreenshot(options),
    setAutoScreenshotMode: (mode: 'on-step' | 'on-change' | 'off') => {
      autoScreenshotMode = mode;
    },
    waitFor: (predicate: never, options?: { timeoutMs?: number; intervalMs?: number; stableGate?: boolean }) =>
      assertionBridge.waitFor(predicate, options),
    waitForScopePath: (predicate: { scopeId?: string; path: string; op: 'eq' | 'ne' | 'truthy' | 'defined'; value?: unknown }, options?: { timeoutMs?: number; intervalMs?: number; stableGate?: boolean }) =>
      assertionBridge.waitForScopePath(predicate, options),
    dispatch: (action: unknown, ctx?: Record<string, unknown>) => assertionBridge.dispatch(action, ctx),
    compareScreenshot: (baselineKey: string, options?: { maxDiffRatio?: number }) => assertionBridge.compareScreenshot(baselineKey, options),
    putBaseline: (options?: { ignoreRegions?: Array<{ x: number; y: number; width: number; height: number; reason?: string }> }) => assertionBridge.putBaseline(options),
    why: (cid: number) => whyBridge.why(cid),
    queryDependencyImpact: async (path: string) => dependencyGraph.queryImpact(path),
    suggestSelector: async (cid: string) => suggestSelector(cid),
    // [WA-debugger-002] mutation 面单源：引用 controller 同名成员，避免
    // 「store 调用 + persist 调用」方法体在 automation/controller 双面逐字双写；
    // controller 于下方构建，此处闭包仅在构造完成后被调用。
    clear: () => controller.clear(),
    pause: () => controller.pause(),
    resume: () => controller.resume(),
    show: () => controller.show(),
    hide: () => controller.hide(),
    minimize: () => controller.minimize(),
    unminimize: () => controller.unminimize(),
    toggle: () => controller.toggle(),
    setActiveTab: (tab) => controller.setActiveTab(tab),
    setPanelPosition: (position) => controller.setPanelPosition(position),
    // inspect/evaluate 三方法保留 redaction 包裹：window 暴露面消毒（刻意差异）
    inspectByCid(cid: number) {
      const raw = currentInspectByCid(cid);
      return raw ? (redactData(raw, redaction) as NopComponentInspectResult) : undefined;
    },
    inspectByElement(element: HTMLElement) {
      const raw = currentInspectByElement(element);
      return raw ? (redactData(raw, redaction) as NopComponentInspectResult) : undefined;
    },
    evaluateNodeExpression(args: { cid: number; expression: string }) {
      const raw = currentEvaluateNodeExpression(args);
      if (!raw.ok || raw.value === undefined) {
        return raw;
      }
      return {
        ...raw,
        value: redactData(raw.value, redaction),
      };
    },
    explainNodeValue: explainValue,
    explainNodeMeta: explainMeta,
    explainNodeFailure: explainFailure,
    explainNodeAsync: explainAsyncSummary,
  });

  const plugin: RendererPlugin = createDebuggerPlugin(store, enabled);

  const controller = {
    id: debuggerId,
    enabled,
    plugin,
    sessionId,
    automation,
    decorateEnv(env: RendererEnv) {
        return decorateDebuggerEnv({
          enabled,
          capturePerformance,
          env,
          store,
          redaction,
        requestState,
        nextRequestInstanceId,
        getStabilityTracker: () => runtime?.getStabilityTracker?.(),
      });
    },
    onActionError(error: unknown, ctx: ActionContext) {
      appendActionErrorEvent(store, error, ctx, enabled);
    },
    show() {
      store.show();
      persistPanelOpen(debuggerId, true);
    },
    hide() {
      store.hide();
      persistPanelOpen(debuggerId, false);
    },
    minimize() {
      store.minimize();
      persistMinimized(debuggerId, true);
    },
    unminimize() {
      store.unminimize();
      persistMinimized(debuggerId, false);
    },
    toggle() {
      store.toggle();
      const snap = store.getSnapshot();
      persistPanelOpen(debuggerId, snap.panelOpen);
    },
    clear() {
      store.clear();
    },
    pause() {
      store.pause();
    },
    resume() {
      store.resume();
    },
    setActiveTab(tab: NopDebuggerAnyTab) {
      store.setActiveTab(tab);
    },
    registerPanelTab(descriptor: NopDebuggerPanelTabDescriptor) {
      if (!descriptor.id.startsWith('x-')) {
        throw new Error(`[nop-debugger] panel tab id must use the "x-" prefix: ${descriptor.id}`);
      }
      if (panelTabs.has(descriptor.id)) {
        throw new Error(`[nop-debugger] panel tab id already registered: ${descriptor.id}`);
      }
      panelTabs.set(descriptor.id, descriptor);
      notifyPanelTabListeners();
      return () => {
        if (panelTabs.get(descriptor.id) === descriptor) {
          panelTabs.delete(descriptor.id);
          notifyPanelTabListeners();
        }
      };
    },
    getPanelTabs: () => panelTabList,
    subscribePanelTabs(listener: () => void) {
      panelTabListeners.add(listener);
      return () => {
        panelTabListeners.delete(listener);
      };
    },
    validateSchemaPatch(patch: NopSchemaPatch) {
      const result = validateSchemaPatchShape(patch, { controllerId: debuggerId }, patchTargetResolvers);
      patchAudit.append(
        'validate',
        result.ok,
        typeof patch?.id === 'string' && patch.id ? patch.id : '(none)',
        result.ok ? undefined : result.errors.join('; '),
      );
      return result;
    },
    registerSchemaPatchApplier(applier: NopSchemaPatchApplier) {
      if (schemaPatchApplier) {
        throw new Error('[nop-debugger] schema patch applier already registered');
      }
      schemaPatchApplier = applier;
      return () => {
        if (schemaPatchApplier === applier) {
          schemaPatchApplier = null;
        }
      };
    },
    async applySchemaPatch(patch: NopSchemaPatch) {
      const patchId = typeof patch?.id === 'string' && patch.id ? patch.id : '(none)';
      const validation = validateSchemaPatchShape(patch, { controllerId: debuggerId }, patchTargetResolvers);
      patchAudit.append(
        'validate',
        validation.ok,
        patchId,
        validation.ok ? undefined : validation.errors.join('; '),
      );
      if (!validation.ok) {
        patchAudit.append('reject', false, patchId, 'validation failed');
        throw new Error(`schema patch rejected: ${validation.errors.join('; ')}`);
      }
      if (!schemaPatchApplier) {
        patchAudit.append('reject', false, patchId, 'no applier');
        throw new Error('schema patch rejected: no applier registered');
      }
      try {
        const { revertToken } = await schemaPatchApplier.apply(patch);
        activePatches.set(patch.id, { revertToken });
        patchAudit.append('apply', true, patchId);
      } catch (error) {
        patchAudit.append('apply', false, patchId, error instanceof Error ? error.message : String(error));
        throw error;
      }
    },
    async revertSchemaPatch(patchId: string) {
      const active = activePatches.get(patchId);
      if (!active) {
        patchAudit.append('revert', false, patchId, 'no active patch');
        throw new Error(`schema patch revert rejected: no active patch ${patchId}`);
      }
      if (!schemaPatchApplier) {
        patchAudit.append('revert', false, patchId, 'no applier');
        throw new Error('schema patch revert rejected: no applier registered');
      }
      try {
        await schemaPatchApplier.revert(active.revertToken);
        activePatches.delete(patchId);
        patchAudit.append('revert', true, patchId);
      } catch (error) {
        patchAudit.append('revert', false, patchId, error instanceof Error ? error.message : String(error));
        throw error;
      }
    },
    getSchemaPatchAudit: (): NopSchemaPatchAuditEntry[] => patchAudit.list(),
    setPanelPosition(position: { x: number; y: number }) {
      store.setPosition(position);
      persistPosition(debuggerId, position);
    },
    toggleFilter(filter) {
      store.toggleFilter(filter);
    },
    queryEvents,
    getLatestEvent,
    getLatestError,
    getEarliestErrors,
    getLatestErrors,
    getPinnedErrors,
    getNodeDiagnostics,
    getInteractionTrace,
    getLatestFailedRequest: getLatestFailedRequestSummary,
    getLatestFailedAction: getLatestFailedActionSummary,
    getNodeAnomalies: getNodeAnomaliesSummary,
    getRecentFailures: getRecentFailuresSummary,
    getAsyncOwnerDebugSnapshot,
    listFormStoreDiagnosticsOwners,
    startFormStoreDiagnosticsSession,
    stopFormStoreDiagnosticsSession,
    clearFormStoreDiagnosticsSession,
    getFormStoreDiagnosticsSnapshot,
    getOverview,
    createDiagnosticReport: createReport,
    exportSession,
    waitForEvent,
    explainNodeValue: explainValue,
    explainNodeMeta: explainMeta,
    explainNodeFailure: explainFailure,
    explainNodeAsync: explainAsyncSummary,
    setRuntime(nextRuntime: RendererRuntime | null) {
      runtime = nextRuntime ?? undefined;
      snapshotObserverDisposer?.();
      snapshotObserverDisposer = undefined;
      if (runtime?.registerStoreWriteObserver && runtime.getLiveScopeIds) {
        snapshotCollector ??= createForestSnapshotCollector({
          pruneScopeIds: () => runtime?.getLiveScopeIds?.() ?? [],
        });
        snapshotObserverDisposer = runtime.registerStoreWriteObserver({
          onWrite: (event) => {
            snapshotCollector!.observe(event);
            for (const path of event.change.paths) {
              dependencyGraph.recordWriteEdge(event.scopeId ?? '__anonymous__', path);
            }

          },
        });
        previewController ??= createPreviewController({
          getSnapshotAt: (epoch) => snapshotCollector?.getSnapshotAt(epoch) ?? null,
          getLatestShadow: () => latestDomShadow ?? null,
        });
      }
      currentInspectByCid = buildInspectByCid(componentRegistry, getRuntime);
      currentInspectByElement = buildInspectByElement(componentRegistry, getRuntime);
      currentEvaluateNodeExpression = buildEvaluateNodeExpression(currentInspectByCid);
      store.setStrictMode(runtime?.strictMode ?? false);
    },
    subscribe(listener: () => void) {
      return store.subscribe(listener);
    },
    getSnapshot,
    setComponentRegistry(registry: ComponentHandleRegistry | null) {
      if (componentRegistry) {
        componentRegistry.setDebugEnabled?.(false);
      }
      componentRegistry = registry ?? undefined;
      if (componentRegistry) {
        componentRegistry.setDebugEnabled?.(enabled);
      }
      currentInspectByCid = buildInspectByCid(componentRegistry, getRuntime);
      currentInspectByElement = buildInspectByElement(componentRegistry, getRuntime);
      currentGetComponentTree = buildGetComponentTree(componentRegistry, getRuntime);
      currentEvaluateNodeExpression = buildEvaluateNodeExpression(currentInspectByCid);
    },
    setActionScope(nextActionScope: ActionScope | null) {
      const actionScope = nextActionScope ?? undefined;
      if (enabled && actionScope) {
        appendActionScopeSnapshotEvent({
          store,
          actionScope,
        });
      }
    },
    setStrictMode(enabled: boolean) {
      setStrictValidationGlobal(enabled);
      store.setStrictMode(enabled);
    },
    getComponentTree() {
      return currentGetComponentTree();
    },
    inspectByCid(cid: number) {
      return currentInspectByCid(cid);
    },
    inspectByElement(element: HTMLElement) {
      return currentInspectByElement(element);
    },
    evaluateNodeExpression(args: { cid: number; expression: string }) {
      return currentEvaluateNodeExpression(args);
    },
  } satisfies NopDebuggerController;

  if (exposeAutomationApi) {
    registerAutomationApi(debuggerId, automation);
  }

  return controller;
}

export function getNopDebuggerAutomationApi(
  controllerId?: string,
): NopDebuggerAutomationApi | undefined {
  return getAutomationApi(controllerId);
}

export { installNopDebuggerWindowFlag };

export function createNopDiagnosticReport(
  controller: NopDebuggerController,
  options?: NopDiagnosticReportOptions,
): NopDiagnosticReport {
  return controller.createDiagnosticReport(options);
}
