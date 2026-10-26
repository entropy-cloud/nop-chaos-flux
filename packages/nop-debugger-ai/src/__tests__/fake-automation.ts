import { vi } from 'vitest';
import type { NopDebuggerAutomationApi } from '@nop-chaos/nop-debugger';

type FakeAutomation = NopDebuggerAutomationApi & {
  __invoked: string[];
  __set(name: string, impl: (...args: unknown[]) => unknown): void;
};

/**
 * Full-shape fake: every automation method is tracked (invocation name order
 * is recorded) and defaults to returning undefined unless a test installs an
 * impl via `__set`. Lets tests assert the exact call surface each tool uses.
 */
export function createFakeAutomation(): FakeAutomation {
  const invoked: string[] = [];
  const impls = new Map<string, (...args: unknown[]) => unknown>();

  const methodNames = [
    'getSnapshot',
    'getOverview',
    'queryEvents',
    'getLatestEvent',
    'getLatestError',
    'getEarliestErrors',
    'getLatestErrors',
    'getPinnedErrors',
    'getNodeDiagnostics',
    'getInteractionTrace',
    'getLatestFailedRequest',
    'getLatestFailedAction',
    'getNodeAnomalies',
    'getRecentFailures',
    'getAsyncOwnerDebugSnapshot',
    'listFormStoreDiagnosticsOwners',
    'startFormStoreDiagnosticsSession',
    'stopFormStoreDiagnosticsSession',
    'clearFormStoreDiagnosticsSession',
    'getFormStoreDiagnosticsSnapshot',
    'createDiagnosticReport',
    'exportSession',
    'waitForEvent',
    'inspectByCid',
    'inspectByElement',
    'evaluateNodeExpression',
    'explainNodeValue',
    'explainNodeMeta',
    'explainNodeFailure',
    'explainNodeAsync',
    'clear',
    'pause',
    'resume',
    'show',
    'hide',
    'toggle',
    'minimize',
    'unminimize',
    'setActiveTab',
    'setPanelPosition',
  ] as const;

  const automation: Record<string, unknown> = {
    controllerId: 'ctrl-fake',
    sessionId: 'sess-fake',
    version: '1' as const,
  };
  for (const name of methodNames) {
    automation[name] = vi.fn((...args: unknown[]) => {
      invoked.push(name);
      return impls.get(name)?.(...args);
    });
  }

  return {
    ...(automation as unknown as NopDebuggerAutomationApi),
    __invoked: invoked,
    __set(name, impl) {
      impls.set(name, impl);
    },
  };
}

export function makeToolCall(name: string, argsJson: string) {
  return {
    index: 0,
    id: `call-${name}`,
    type: 'function' as const,
    function: { name, arguments: argsJson },
  };
}
