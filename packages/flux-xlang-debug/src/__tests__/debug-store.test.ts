import { describe, expect, it, vi } from 'vitest';
import { createDebugStore, type DebugTransport } from '../state/debug-store.js';

describe('debug store actions', () => {
  it('toggleBreakpoint is idempotent (add then remove)', () => {
    const store = createDebugStore();
    store.getState().toggleBreakpoint('a.xpl', 5);
    expect(store.getState().breakpoints).toEqual([{ sourcePath: 'a.xpl', line: 5 }]);
    store.getState().toggleBreakpoint('a.xpl', 5);
    expect(store.getState().breakpoints).toEqual([]);
  });

  it('transport receives toggle as add/remove pair', () => {
    const transport = {
      toggleBreakpoint: vi.fn(),
      addBreakpoint: vi.fn(),
      removeBreakpoint: vi.fn(),
      step: vi.fn(),
      resume: vi.fn(),
      suspend: vi.fn(),
      runToPosition: vi.fn(),
      muteBreakpoints: vi.fn(),
      evalExpr: vi.fn(),
    } satisfies DebugTransport;
    const store = createDebugStore();
    store.getState().setTransport(transport);

    store.getState().toggleBreakpoint('a.xpl', 5);
    expect(transport.addBreakpoint).toHaveBeenCalledWith('a.xpl', 5);
    store.getState().toggleBreakpoint('a.xpl', 5);
    expect(transport.removeBreakpoint).toHaveBeenCalledWith('a.xpl', 5);

    store.getState().step('over');
    store.getState().resume();
    store.getState().suspend();
    store.getState().muteBreakpoints(true);
    store.getState().runToPosition({ sourcePath: 'a.xpl', line: 9 });
    store.getState().evalExpr({ threadId: 1, frameIndex: 0, expr: 'x' });
    expect(transport.step).toHaveBeenCalledWith('over');
    expect(transport.resume).toHaveBeenCalled();
    expect(transport.suspend).toHaveBeenCalled();
    expect(transport.muteBreakpoints).toHaveBeenCalledWith(true);
    expect(transport.runToPosition).toHaveBeenCalledWith({ sourcePath: 'a.xpl', line: 9 });
    expect(transport.evalExpr).toHaveBeenCalledWith({ threadId: 1, frameIndex: 0, expr: 'x' });
  });

  it('works without transport (local state only, no throw)', () => {
    const store = createDebugStore();
    expect(() => store.getState().toggleBreakpoint('a.xpl', 1)).not.toThrow();
    expect(() => store.getState().resume()).not.toThrow();
    expect(store.getState().breakpoints).toHaveLength(1);
  });

  it('downstream appliers update state per D1 event shapes', () => {
    const store = createDebugStore();
    // rebind 全量镜像
    store.getState().setBreakpoints([
      { sourcePath: 'a.xpl', line: 1 },
      { sourcePath: 'a.xpl', line: 2, condition: 'x > 1' },
    ]);
    // evt.suspended
    store.getState().addSuspended({ threadId: 17, sourcePath: 'a.xpl', line: 1 });
    store.getState().setLease(123456);
    expect(store.getState().suspended).toEqual([{ threadId: 17, sourcePath: 'a.xpl', line: 1 }]);
    expect(store.getState().lease).toEqual({ expiresAtMs: 123456 });
    // evt.exception
    store.getState().addException({ message: 'boom', errorCode: 'nop.err.t' });
    expect(store.getState().exceptions).toHaveLength(1);
    // evt.resumed / evt.leaseExpired
    store.getState().removeSuspended([17]);
    expect(store.getState().suspended).toEqual([]);
    // setSuspended 重建 / clearExceptions / lease 清空
    store.getState().setSuspended([{ threadId: 2, sourcePath: 'b.xpl', line: 3 }]);
    store.getState().clearExceptions();
    store.getState().setLease(null);
    expect(store.getState().suspended).toEqual([{ threadId: 2, sourcePath: 'b.xpl', line: 3 }]);
    expect(store.getState().exceptions).toEqual([]);
    expect(store.getState().lease).toBeNull();
  });

  it('addSuspended dedupes by threadId', () => {
    const store = createDebugStore();
    store.getState().addSuspended({ threadId: 1, sourcePath: 'a.xpl', line: 1 });
    store.getState().addSuspended({ threadId: 1, sourcePath: 'a.xpl', line: 7 });
    expect(store.getState().suspended).toEqual([{ threadId: 1, sourcePath: 'a.xpl', line: 7 }]);
  });
});
