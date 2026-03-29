import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { NopDebuggerController, NopDebuggerOverview, NopDebuggerSnapshot } from '@nop-chaos/nop-debugger';
import { DebuggerLabPage } from './DebuggerLabPage';

function createMockSnapshot(overrides?: Partial<NopDebuggerSnapshot>): NopDebuggerSnapshot {
  return {
    enabled: true,
    panelOpen: false,
    paused: false,
    activeTab: 'overview',
    position: { x: 24, y: 24 },
    events: [],
    filters: ['render', 'action', 'api', 'compile', 'notify', 'error'],
    pinnedErrors: { earliest: [], latest: [] },
    ...overrides
  };
}

const emptyOverview: NopDebuggerOverview = {
  errorCount: 0,
  totalEvents: 0,
  countsByGroup: { render: 0, action: 0, api: 0, compile: 0, notify: 0, error: 0, node: 0 }
};

function createMockController(snapshot?: NopDebuggerSnapshot): NopDebuggerController {
  const snap = snapshot ?? createMockSnapshot();
  const show = vi.fn();
  const hide = vi.fn();
  const clear = vi.fn();
  const pause = vi.fn();
  const resume = vi.fn();
  const setActiveTab = vi.fn();
  const setPanelPosition = vi.fn();
  const toggleFilter = vi.fn();
  const onActionError = vi.fn();
  const setComponentRegistry = vi.fn();
  const inspectByCid = vi.fn(() => undefined);
  const inspectByElement = vi.fn(() => undefined);

  const monitor = {
    onRenderStart: vi.fn(),
    onRenderEnd: vi.fn(),
    onActionStart: vi.fn(),
    onActionEnd: vi.fn(),
    onApiRequest: vi.fn(),
    onNotify: vi.fn()
  };

  return {
    id: 'lab-test',
    enabled: true,
    plugin: { name: 'test-plugin' },
    sessionId: 'session-lab-test',
    automation: {
      controllerId: 'lab-test',
      sessionId: 'session-lab-test',
      version: '1',
      getSnapshot: () => snap,
      getOverview: () => emptyOverview,
      queryEvents: () => [],
      getLatestEvent: () => undefined,
      getLatestError: () => undefined,
      getEarliestErrors: () => [],
      getLatestErrors: () => [],
      getPinnedErrors: () => ({ earliest: [], latest: [] }),
      getNodeDiagnostics: () => ({ rendererTypes: [], totalEvents: 0, countsByGroup: {}, countsByKind: {}, recentEvents: [] }),
      getInteractionTrace: () => ({ query: {}, totalEvents: 0, matchedEvents: [], relatedErrors: [], requestKeys: [], actionTypes: [], nodeIds: [], paths: [] }),
      createDiagnosticReport: () => ({ controllerId: 'lab-test', sessionId: 'session-lab-test', generatedAt: 1, snapshot: { enabled: true, panelOpen: false, paused: false, activeTab: 'overview', filters: snap.filters }, overview: emptyOverview, recentEvents: [], pinnedErrors: { earliest: [], latest: [] } }),
      exportSession: () => ({ controllerId: 'lab-test', sessionId: 'session-lab-test', generatedAt: 1, snapshot: snap, overview: emptyOverview, events: [], pinnedErrors: { earliest: [], latest: [] } }),
      waitForEvent: async () => snap.events[0]!,
      clear: clear,
      pause: pause,
      resume: resume,
      show: show,
      hide: hide,
      toggle() {},
      setActiveTab,
      setPanelPosition,
      inspectByCid,
      inspectByElement
    } as any,
    decorateEnv: (env: any) => ({ ...env, monitor }),
    onActionError,
    show,
    hide,
    toggle: vi.fn(),
    clear,
    pause,
    resume,
    setActiveTab,
    setPanelPosition,
    toggleFilter,
    queryEvents: () => [],
    getLatestEvent: () => undefined,
    getLatestError: () => undefined,
    getEarliestErrors: () => [],
    getLatestErrors: () => [],
    getPinnedErrors: () => ({ earliest: [], latest: [] }),
    getNodeDiagnostics: () => ({ rendererTypes: [], totalEvents: 0, countsByGroup: {}, countsByKind: {}, recentEvents: [] }),
    getInteractionTrace: () => ({ query: {}, totalEvents: 0, matchedEvents: [], relatedErrors: [], requestKeys: [], actionTypes: [], nodeIds: [], paths: [] }),
    getOverview: () => emptyOverview,
    getSnapshot: () => snap,
    createDiagnosticReport: vi.fn(() => ({ controllerId: 'lab-test', sessionId: 'session-lab-test', generatedAt: 1, snapshot: { enabled: true, panelOpen: false, paused: false, activeTab: 'overview', filters: snap.filters }, overview: emptyOverview, recentEvents: [], pinnedErrors: { earliest: [], latest: [] } })),
    exportSession: () => ({ controllerId: 'lab-test', sessionId: 'session-lab-test', generatedAt: 1, snapshot: snap, overview: emptyOverview, events: [], pinnedErrors: { earliest: [], latest: [] } }),
    waitForEvent: async () => snap.events[0]!,
    setComponentRegistry,
    inspectByCid,
    inspectByElement,
    subscribe: () => () => {}
  } as any;
}

afterEach(() => {
  cleanup();
});

describe('DebuggerLabPage', () => {
  describe('rendering', () => {
    it('renders the page title and description', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      expect(screen.getByText('Debugger Lab')).toBeTruthy();
      expect(screen.getByText(/Interactive testing page for the nop-debugger API/)).toBeTruthy();
    });

    it('renders the Back to Home button', () => {
      const controller = createMockController();
      const onBack = vi.fn();
      render(<DebuggerLabPage debuggerController={controller} onBack={onBack} />);

      const backButton = screen.getByText('Back to Home');
      expect(backButton).toBeTruthy();
      fireEvent.click(backButton);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renders all section cards', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      expect(screen.getByText('Panel Controls')).toBeTruthy();
      expect(screen.getByText('Event Injection')).toBeTruthy();
      expect(screen.getByText('Snapshot & Diagnostics')).toBeTruthy();
      expect(screen.getByText(/Automation API/)).toBeTruthy();
      expect(screen.getByText('Inspect by CID')).toBeTruthy();
      expect(screen.getByText('Output')).toBeTruthy();
    });
  });

  describe('Panel Controls', () => {
    it('calls controller.show when Show is clicked', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Show'));
      expect(controller.show).toHaveBeenCalledTimes(1);
    });

    it('calls controller.hide when Hide is clicked', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Hide'));
      expect(controller.hide).toHaveBeenCalledTimes(1);
    });

    it('calls controller.toggle when Toggle is clicked', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Toggle'));
      expect(controller.toggle).toHaveBeenCalledTimes(1);
    });

    it('calls controller.clear when Clear is clicked', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Clear'));
      expect(controller.clear).toHaveBeenCalledTimes(1);
    });

    it('calls controller.pause then controller.resume on successive clicks', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const pauseButton = screen.getByText('Pause');
      fireEvent.click(pauseButton);
      expect(controller.pause).toHaveBeenCalledTimes(1);
      expect(controller.resume).not.toHaveBeenCalled();

      const resumeButton = screen.getByText('Resume');
      fireEvent.click(resumeButton);
      expect(controller.resume).toHaveBeenCalledTimes(1);
    });

    it('calls setActiveTab for each tab button', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      for (const tab of ['overview', 'timeline', 'network', 'node']) {
        fireEvent.click(screen.getByText(tab));
      }

      expect(controller.setActiveTab).toHaveBeenCalledTimes(4);
      expect(controller.setActiveTab).toHaveBeenCalledWith('overview');
      expect(controller.setActiveTab).toHaveBeenCalledWith('timeline');
      expect(controller.setActiveTab).toHaveBeenCalledWith('network');
      expect(controller.setActiveTab).toHaveBeenCalledWith('node');
    });
  });

  describe('Event Injection', () => {
    it('fires render events when Fire Render is clicked', () => {
      const controller = createMockController();
      const env = controller.decorateEnv({ fetcher: async () => ({ ok: true }), notify: () => {} });
      const monitor = (env as any).monitor;
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Fire Render'));

      expect(monitor.onRenderStart).toHaveBeenCalledTimes(1);
      expect(monitor.onRenderStart).toHaveBeenCalledWith(
        expect.objectContaining({ nodeId: 'lab-node', path: 'lab.path', type: 'lab-render' })
      );
    });

    it('fires action events when Fire Action is clicked', () => {
      const controller = createMockController();
      const env = controller.decorateEnv({ fetcher: async () => ({ ok: true }), notify: () => {} });
      const monitor = (env as any).monitor;
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Fire Action'));

      expect(monitor.onActionStart).toHaveBeenCalledTimes(1);
      expect(monitor.onActionStart).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'lab:testAction', nodeId: 'lab-node' })
      );
    });

    it('fires API event when Fire API is clicked', () => {
      const controller = createMockController();
      const env = controller.decorateEnv({ fetcher: async () => ({ ok: true }), notify: () => {} });
      const monitor = (env as any).monitor;
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Fire API'));

      expect(monitor.onApiRequest).toHaveBeenCalledTimes(1);
      expect(monitor.onApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({ api: { url: '/api/lab-test', method: 'GET' }, nodeId: 'lab-node' })
      );
    });

    it('fires error via onActionError when Fire Error is clicked', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Fire Error'));
      expect(controller.onActionError).toHaveBeenCalledTimes(1);
      expect(controller.onActionError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.anything()
      );
    });
    });

    it('displays action event output when Fire Action is clicked', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Fire Action'));

      await waitFor(() => {
        expect(screen.getByText(/Action Event/)).toBeTruthy();
      });
    });

    it('displays API event output when Fire API is clicked', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Fire API'));

      await waitFor(() => {
        expect(screen.getByText(/API Event/)).toBeTruthy();
      });
    });

    it('calls onActionError when Fire Error is clicked', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Fire Error'));

      expect(controller.onActionError).toHaveBeenCalledTimes(1);
      expect(controller.onActionError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.anything()
      );
    });
  });

  describe('Snapshot & Diagnostics', () => {
    it('displays snapshot output when Get Snapshot is clicked', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Get Snapshot'));

      await waitFor(() => {
        expect(screen.getByText(/\[Snapshot\]/)).toBeTruthy();
      });
    });

    it('displays overview output when Get Overview is clicked', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const overviewButtons = screen.getAllByText('Get Overview');
      fireEvent.click(overviewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/\[Overview\]/)).toBeTruthy();
      });
    });

    it('displays export output when Export Session is clicked', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Export Session'));

      await waitFor(() => {
        expect(screen.getByText(/\[Export\]/)).toBeTruthy();
      });
    });

    it('displays diagnostic report when Diagnostic Report is clicked', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Diagnostic Report'));

      await waitFor(() => {
        expect(screen.getByText(/\[Report\]/)).toBeTruthy();
      });
    });

    it('displays latest error output when Latest Error is clicked', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Latest Error'));

      await waitFor(() => {
        expect(screen.getByText(/\[LatestError\]/)).toBeTruthy();
      });
    });

    it('displays pinned errors output when Pinned Errors is clicked', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Pinned Errors'));

      await waitFor(() => {
        expect(screen.getByText(/\[PinnedErrors\]/)).toBeTruthy();
      });
    });

    it('clears output when Clear output is clicked', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      fireEvent.click(screen.getByText('Get Snapshot'));
      await waitFor(() => {
        expect(screen.getByText(/\[Snapshot\]/)).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Clear output'));
      expect(screen.queryByText(/\[Snapshot\]/)).toBeNull();
    });
  });

  describe('Automation API status', () => {
    it('displays controller id and session id', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      expect(screen.getByText('lab-test')).toBeTruthy();
      expect(screen.getByText('session-lab-test')).toBeTruthy();
    });

    it('shows automation API availability status', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      expect(screen.getByText('__NOP_DEBUGGER_API__:')).toBeTruthy();
      expect(screen.getByText('__NOP_DEBUGGER_HUB__:')).toBeTruthy();
    });

    it('shows "not found" when window globals are absent', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const notFoundElements = screen.getAllByText('not found');
      expect(notFoundElements.length).toBeGreaterThanOrEqual(2);
    });

    it('shows "available" when window globals are present', () => {
      const prev = (window as any).__NOP_DEBUGGER_API__;
      const prevHub = (window as any).__NOP_DEBUGGER_HUB__;
      (window as any).__NOP_DEBUGGER_API__ = { controllerId: 'lab-test' };
      (window as any).__NOP_DEBUGGER_HUB__ = { controllers: new Map() };

      try {
        const controller = createMockController();
        render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

        const availableElements = screen.getAllByText('available');
        expect(availableElements.length).toBe(2);
      } finally {
        if (prev === undefined) delete (window as any).__NOP_DEBUGGER_API__;
        else (window as any).__NOP_DEBUGGER_API__ = prev;
        if (prevHub === undefined) delete (window as any).__NOP_DEBUGGER_HUB__;
        else (window as any).__NOP_DEBUGGER_HUB__ = prevHub;
      }
    });
  });

  describe('Automation API buttons', () => {
    it('displays output when Get Latest Error is clicked in API section', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const buttons = screen.getAllByText('Get Latest Error');
      fireEvent.click(buttons[1]);

      await waitFor(() => {
        expect(screen.getByText(/\[LatestError \(API\)\]/)).toBeTruthy();
      });
    });

    it('displays output when Get Pinned Errors is clicked in API section', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const buttons = screen.getAllByText('Get Pinned Errors');
      fireEvent.click(buttons[1]);

      await waitFor(() => {
        expect(screen.getByText(/\[PinnedErrors \(API\)\]/)).toBeTruthy();
      });
    });

    it('displays output when Get Overview is clicked in API section', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const buttons = screen.getAllByText('Get Overview');
      fireEvent.click(buttons[1]);

      await waitFor(() => {
        expect(screen.getByText(/\[Overview \(API\)\]/)).toBeTruthy();
      });
    });
  });

  describe('Inspect by CID', () => {
    it('renders the CID input field', () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const input = screen.getByPlaceholderText('CID number');
      expect(input).toBeTruthy();
    });

    it('calls inspectByCid with entered CID when Inspect is clicked', async () => {
      const controller = createMockController();
      controller.inspectByCid = vi.fn(() => ({ cid: 42, mounted: false }));
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const input = screen.getByPlaceholderText('CID number');
      fireEvent.change(input, { target: { value: '42' } });
      fireEvent.click(screen.getByText('Inspect'));

      expect(controller.inspectByCid).toHaveBeenCalledWith(42);
      await waitFor(() => {
        expect(screen.getByText(/\[Inspect CID=42\]/)).toBeTruthy();
      });
    });

    it('shows invalid CID message for non-numeric input', async () => {
      const controller = createMockController();
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const input = screen.getByPlaceholderText('CID number');
      fireEvent.change(input, { target: { value: '' } });

      const inspectSpy = vi.spyOn(controller, 'inspectByCid');
      fireEvent.click(screen.getByText('Inspect'));

      expect(inspectSpy).not.toHaveBeenCalled();
    });

    it('shows undefined result when inspectByCid returns nothing', async () => {
      const controller = createMockController();
      controller.inspectByCid = vi.fn(() => undefined);
      render(<DebuggerLabPage debuggerController={controller} onBack={() => {}} />);

      const input = screen.getByPlaceholderText('CID number');
      fireEvent.change(input, { target: { value: '99' } });
      fireEvent.click(screen.getByText('Inspect'));

      await waitFor(() => {
        const output = screen.getByText(/\[Inspect CID=99\]/);
        expect(output).toBeTruthy();
      });
    });
  });
});
