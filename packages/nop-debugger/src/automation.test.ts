import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutomationApi, getNopDebuggerAutomationApi, installNopDebuggerWindowFlag, registerAutomationApi } from './automation';
import type {
  NopDebugEvent,
  NopDebuggerFilterKind,
  NopDebuggerOverview,
  NopDebuggerSnapshot,
  NopDiagnosticReport,
  NopDebuggerSessionExport,
  NopInteractionTrace,
  NopNodeDiagnostics
} from './types';

const windowStub = {} as Window & typeof globalThis;

Object.defineProperty(globalThis, 'window', {
  value: windowStub,
  configurable: true
});

describe('debugger automation helpers', () => {
  beforeEach(() => {
    delete window.__NOP_DEBUGGER__;
    delete window.__NOP_DEBUGGER_API__;
    delete window.__NOP_DEBUGGER_HUB__;
  });

  it('creates an automation api that delegates controller actions', async () => {
    const filters: NopDebuggerFilterKind[] = ['render'];
    const snapshot: NopDebuggerSnapshot = {
      enabled: true,
      panelOpen: true,
      paused: false,
      activeTab: 'timeline',
      position: { x: 1, y: 2 },
      events: [],
      filters,
      pinnedErrors: { earliest: [], latest: [] }
    };
    const overview: NopDebuggerOverview = {
      errorCount: 0,
      totalEvents: 0,
      countsByGroup: {
        render: 0,
        action: 0,
        api: 0,
        compile: 0,
        notify: 0,
        error: 0
      }
    };
    const diagnostics: NopNodeDiagnostics = {
      rendererTypes: [],
      totalEvents: 0,
      countsByGroup: {},
      countsByKind: {},
      recentEvents: []
    };
    const trace: NopInteractionTrace = {
      query: {},
      resolvedQuery: {
        mode: 'exact'
      },
      totalEvents: 0,
      matchedEvents: [],
      relatedErrors: [],
      requestKeys: [],
      actionTypes: [],
      nodeIds: [],
      paths: []
    };
    const report: NopDiagnosticReport = {
      controllerId: 'controller-a',
      sessionId: 'session-a',
      generatedAt: 1,
      snapshot: {
        enabled: true,
        panelOpen: true,
        paused: false,
        activeTab: 'timeline',
        filters
      },
      overview,
      recentEvents: [],
      pinnedErrors: { earliest: [], latest: [] }
    };
    const exportPayload: NopDebuggerSessionExport = {
      controllerId: 'controller-a',
      sessionId: 'session-a',
      generatedAt: 1,
      snapshot,
      overview,
      events: [],
      pinnedErrors: { earliest: [], latest: [] }
    };
    const waitedEvent: NopDebugEvent = {
      id: 1,
      sessionId: 'session-a',
      timestamp: 1,
      kind: 'notify',
      group: 'notify',
      level: 'info',
      source: 'test',
      summary: 'done'
    };

    const getSnapshot = vi.fn(() => snapshot);
    const getOverview = vi.fn(() => overview);
    const queryEvents = vi.fn(() => []);
    const getLatestEvent = vi.fn(() => undefined);
    const getLatestError = vi.fn(() => undefined);
    const getEarliestErrors = vi.fn(() => []);
    const getLatestErrors = vi.fn(() => []);
    const getPinnedErrors = vi.fn(() => ({ earliest: [], latest: [] }));
    const getNodeDiagnostics = vi.fn(() => diagnostics);
    const getInteractionTrace = vi.fn(() => trace);
    const createDiagnosticReport = vi.fn(() => report);
    const exportSession = vi.fn(() => exportPayload);
    const waitForEvent = vi.fn(async () => waitedEvent);
    const clear = vi.fn();
    const pause = vi.fn();
    const resume = vi.fn();
    const show = vi.fn();
    const hide = vi.fn();
    const toggle = vi.fn();
    const setActiveTab = vi.fn();
    const setPanelPosition = vi.fn();

    const automation = createAutomationApi({
      controllerId: 'controller-a',
      sessionId: 'session-a',
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
      createDiagnosticReport,
      exportSession,
      waitForEvent,
      clear,
      pause,
      resume,
      show,
      hide,
      toggle,
      setActiveTab,
      setPanelPosition
    });

    expect(automation.controllerId).toBe('controller-a');
    expect(automation.version).toBe('1');
    expect(automation.getSnapshot()).toMatchObject({ enabled: true });
    automation.clear();
    automation.pause();
    automation.resume();
    automation.show();
    automation.hide();
    automation.toggle();
    automation.setActiveTab('network');
    automation.setPanelPosition({ x: 9, y: 8 });
    await expect(automation.waitForEvent()).resolves.toMatchObject({ kind: 'notify' });

    expect(clear).toHaveBeenCalled();
    expect(pause).toHaveBeenCalled();
    expect(resume).toHaveBeenCalled();
    expect(show).toHaveBeenCalled();
    expect(hide).toHaveBeenCalled();
    expect(toggle).toHaveBeenCalled();
    expect(setActiveTab).toHaveBeenCalledWith('network');
    expect(setPanelPosition).toHaveBeenCalledWith({ x: 9, y: 8 });
  });

  it('registers automation apis in the global hub and installs window flags', () => {
    const filters: NopDebuggerFilterKind[] = ['render'];
    const snapshot: NopDebuggerSnapshot = {
      enabled: true,
      panelOpen: false,
      paused: false,
      activeTab: 'timeline',
      position: { x: 0, y: 0 },
      events: [],
      filters,
      pinnedErrors: { earliest: [], latest: [] }
    };
    const overview: NopDebuggerOverview = {
      errorCount: 0,
      totalEvents: 0,
      countsByGroup: { render: 0, action: 0, api: 0, compile: 0, notify: 0, error: 0 }
    };
    const diagnostics: NopNodeDiagnostics = {
      rendererTypes: [],
      totalEvents: 0,
      countsByGroup: {},
      countsByKind: {},
      recentEvents: []
    };
    const trace: NopInteractionTrace = {
      query: {},
      resolvedQuery: {
        mode: 'exact'
      },
      totalEvents: 0,
      matchedEvents: [],
      relatedErrors: [],
      requestKeys: [],
      actionTypes: [],
      nodeIds: [],
      paths: []
    };
    const report: NopDiagnosticReport = {
      controllerId: 'a',
      sessionId: 's-a',
      generatedAt: 1,
      snapshot: { enabled: true, panelOpen: false, paused: false, activeTab: 'timeline', filters },
      overview,
      recentEvents: [],
      pinnedErrors: { earliest: [], latest: [] }
    };
    const exportPayload: NopDebuggerSessionExport = {
      controllerId: 'a',
      sessionId: 's-a',
      generatedAt: 1,
      snapshot,
      overview,
      events: [],
      pinnedErrors: { earliest: [], latest: [] }
    };
    const waitedEvent: NopDebugEvent = {
      id: 1,
      sessionId: 's-a',
      timestamp: 1,
      kind: 'notify',
      group: 'notify',
      level: 'info',
      source: 'test',
      summary: 'x'
    };

    const automationA = createAutomationApi({
      controllerId: 'a',
      sessionId: 's-a',
      getSnapshot: () => snapshot,
      getOverview: () => overview,
      queryEvents: () => [],
      getLatestEvent: () => undefined,
      getLatestError: () => undefined,
      getEarliestErrors: () => [],
      getLatestErrors: () => [],
      getPinnedErrors: () => ({ earliest: [], latest: [] }),
      getNodeDiagnostics: () => diagnostics,
      getInteractionTrace: () => trace,
      createDiagnosticReport: () => report,
      exportSession: () => exportPayload,
      waitForEvent: async () => waitedEvent,
      clear() {},
      pause() {},
      resume() {},
      show() {},
      hide() {},
      toggle() {},
      setActiveTab() {},
      setPanelPosition() {}
    });
    const automationB = { ...automationA, controllerId: 'b', sessionId: 's-b' };

    registerAutomationApi('a', automationA);
    registerAutomationApi('b', automationB);
    installNopDebuggerWindowFlag({ config: { enabled: true, defaultOpen: true, defaultTab: 'network' } });

    expect(window.__NOP_DEBUGGER__).toMatchObject({ enabled: true, defaultOpen: true, defaultTab: 'network' });
    expect(getNopDebuggerAutomationApi()).toBe(automationB);
    expect(getNopDebuggerAutomationApi('a')).toBe(automationA);
    expect(window.__NOP_DEBUGGER_HUB__?.listControllers()).toEqual(expect.arrayContaining(['a', 'b']));
    expect(window.__NOP_DEBUGGER_HUB__?.activeControllerId).toBe('b');
  });
});
