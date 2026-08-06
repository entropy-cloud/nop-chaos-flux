import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalendarOwnership } from './use-calendar-ownership.js';

const { scopeSelectorSpy } = vi.hoisted(() => ({
  scopeSelectorSpy: vi.fn((..._args: unknown[]) => undefined),
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useScopeSelector: scopeSelectorSpy,
}));

beforeEach(() => {
  scopeSelectorSpy.mockClear();
});

function getCallOptions(call: unknown[]) {
  return call[2] as { enabled?: boolean; paths?: readonly string[] } | undefined;
}

describe('useCalendarOwnership useScopeSelector gating (05-02)', () => {
  it('default local ownership: both view and date subscriptions are disabled', () => {
    renderHook(() => useCalendarOwnership({}));
    expect(scopeSelectorSpy).toHaveBeenCalledTimes(2);
    const [viewCall, dateCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(viewCall)?.enabled).toBe(false);
    expect(getCallOptions(dateCall)?.enabled).toBe(false);
  });

  it('local ownership with state paths still subscribes nothing', () => {
    renderHook(() =>
      useCalendarOwnership({ viewStatePath: 'state.view', dateStatePath: 'state.date' }),
    );
    const [viewCall, dateCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(viewCall)?.enabled).toBe(false);
    expect(getCallOptions(dateCall)?.enabled).toBe(false);
  });

  it('scope view ownership: view subscribes with its path; date stays local', () => {
    renderHook(() =>
      useCalendarOwnership({ viewOwnership: 'scope', viewStatePath: 'state.view' }),
    );
    const [viewCall, dateCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(viewCall)?.enabled).not.toBe(false);
    expect(getCallOptions(viewCall)?.paths).toEqual(['state.view']);
    expect(getCallOptions(dateCall)?.enabled).toBe(false);
  });

  it('scope date ownership: date subscribes with its path; view stays local', () => {
    renderHook(() =>
      useCalendarOwnership({ dateOwnership: 'scope', dateStatePath: 'state.date' }),
    );
    const [viewCall, dateCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(viewCall)?.enabled).toBe(false);
    expect(getCallOptions(dateCall)?.enabled).not.toBe(false);
    expect(getCallOptions(dateCall)?.paths).toEqual(['state.date']);
  });

  it('scope ownership without a state path subscribes nothing', () => {
    renderHook(() =>
      useCalendarOwnership({ viewOwnership: 'scope', dateOwnership: 'scope' }),
    );
    const [viewCall, dateCall] = scopeSelectorSpy.mock.calls;
    expect(getCallOptions(viewCall)?.enabled).toBe(false);
    expect(getCallOptions(dateCall)?.enabled).toBe(false);
  });

  it('controlled mode still resolves view/date from props (behavior unchanged)', () => {
    const { result } = renderHook(() =>
      useCalendarOwnership({ viewOwnership: 'controlled', view: 'week', dateOwnership: 'controlled', date: '2026-07-21' }),
    );
    expect(result.current.controlledView).toBe('week');
    expect(result.current.controlledDate?.toISOString().slice(0, 10)).toBe('2026-07-21');
  });
});
