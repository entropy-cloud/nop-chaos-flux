import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalendarOwnership } from './use-calendar-ownership.js';

const { scopeSelectorSpy, ownershipScopeValueSpy } = vi.hoisted(() => ({
  scopeSelectorSpy: vi.fn((..._args: unknown[]) => undefined),
  ownershipScopeValueSpy: vi.fn((..._args: unknown[]) => undefined),
}));

vi.mock('@nop-chaos/flux-react', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
  useScopeSelector: scopeSelectorSpy,
  useOwnershipScopeValue: ownershipScopeValueSpy,
}));

beforeEach(() => {
  scopeSelectorSpy.mockClear();
  ownershipScopeValueSpy.mockClear();
});

describe('useCalendarOwnership useScopeSelector gating (05-02)', () => {
  it('default local ownership: both view and date subscriptions are disabled', () => {
    renderHook(() => useCalendarOwnership({}));
    expect(ownershipScopeValueSpy).toHaveBeenCalledTimes(2);
    const [viewCall, dateCall] = ownershipScopeValueSpy.mock.calls;
    expect(viewCall![0]).not.toBe('scope');
    expect(dateCall![0]).not.toBe('scope');
  });

  it('local ownership with state paths still subscribes nothing', () => {
    renderHook(() =>
      useCalendarOwnership({ viewStatePath: 'state.view', dateStatePath: 'state.date' }),
    );
    const [viewCall, dateCall] = ownershipScopeValueSpy.mock.calls;
    expect(viewCall![0]).not.toBe('scope');
    expect(dateCall![0]).not.toBe('scope');
  });

  it('scope view ownership: view subscribes with its path; date stays local', () => {
    renderHook(() =>
      useCalendarOwnership({ viewOwnership: 'scope', viewStatePath: 'state.view' }),
    );
    const [viewCall, dateCall] = ownershipScopeValueSpy.mock.calls;
    expect(viewCall![0]).toBe('scope');
    expect(viewCall![1]).toBe('state.view');
    expect(dateCall![0]).not.toBe('scope');
  });

  it('scope date ownership: date subscribes with its path; view stays local', () => {
    renderHook(() =>
      useCalendarOwnership({ dateOwnership: 'scope', dateStatePath: 'state.date' }),
    );
    const [viewCall, dateCall] = ownershipScopeValueSpy.mock.calls;
    expect(viewCall![0]).not.toBe('scope');
    expect(dateCall![0]).toBe('scope');
    expect(dateCall![1]).toBe('state.date');
  });

  it('scope ownership without a state path subscribes nothing', () => {
    renderHook(() =>
      useCalendarOwnership({ viewOwnership: 'scope', dateOwnership: 'scope' }),
    );
    const [viewCall, dateCall] = ownershipScopeValueSpy.mock.calls;
    expect(viewCall![0]).not.toBe('scope');
    expect(dateCall![0]).not.toBe('scope');
  });

  it('controlled mode still resolves view/date from props (behavior unchanged)', () => {
    const { result } = renderHook(() =>
      useCalendarOwnership({ viewOwnership: 'controlled', view: 'week', dateOwnership: 'controlled', date: '2026-07-21' }),
    );
    expect(result.current.controlledView).toBe('week');
    expect(result.current.controlledDate?.toISOString().slice(0, 10)).toBe('2026-07-21');
  });
});
