import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import type { FormStoreState, ScopeRef } from '@nop-chaos/flux-core';
import {
  usePublishedFormStatus,
  usePublishedFormValues,
} from '../renderers/form-status-publication';

function createFormStore(initial: FormStoreState) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState() {
      return state;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState(next: FormStoreState) {
      state = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

function makeScope(): ScopeRef {
  return {
    id: 'scope-1',
    path: '$',
    value: {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    update: vi.fn(),
    merge: vi.fn(),
  } as ScopeRef;
}

describe('form-status-publication hooks', () => {
  it('publishes status summary and dedupes unchanged summaries', async () => {
    const parentScope = makeScope();
    const store = createFormStore({
      values: {},
      fieldStates: {
        name: {
          touched: true,
          errors: [{ path: 'name', rule: 'required', message: 'Required' } as any],
        },
      },
      submitting: false,
      submitAttempted: false,
    });
    const ownedForm = { id: 'form-1', name: 'demo', store } as any;

    function Probe() {
      usePublishedFormStatus({ statusPath: 'ui.status', parentScope, ownedForm });
      return null;
    }

    render(<Probe />);

    await waitFor(() => {
      expect(parentScope.update).toHaveBeenCalledWith(
        'ui.status',
        expect.objectContaining({
          id: 'form-1',
          name: 'demo',
          touched: true,
          hasErrors: true,
          errorCount: 1,
          valid: false,
          invalid: true,
        }),
      );
    });

    const before = (parentScope.update as any).mock.calls.length;
    store.setState({
      values: {},
      fieldStates: {
        name: {
          touched: true,
          errors: [{ path: 'name', rule: 'required', message: 'Required' } as any],
        },
      },
      submitting: false,
      submitAttempted: false,
    });
    expect((parentScope.update as any).mock.calls.length).toBe(before);

    store.setState({
      values: {},
      fieldStates: {
        name: { touched: true, dirty: true, validating: true },
      },
      submitting: true,
      submitAttempted: true,
    });

    await waitFor(() => {
      expect(parentScope.update).toHaveBeenLastCalledWith(
        'ui.status',
        expect.objectContaining({
          submitting: true,
          validating: true,
          dirty: true,
          touched: true,
          hasErrors: false,
          errorCount: 0,
          valid: true,
          invalid: false,
        }),
      );
    });
  });

  it('publishes values only when the values object reference changes', async () => {
    const parentScope = makeScope();
    const initialValues = { username: 'Alice' };
    const store = createFormStore({
      values: initialValues,
      fieldStates: {},
      submitting: false,
      submitAttempted: false,
    });
    const ownedForm = { id: 'form-1', name: 'demo', store } as any;

    function Probe() {
      usePublishedFormValues({ valuesPath: 'ui.values', parentScope, ownedForm });
      return null;
    }

    render(<Probe />);

    await waitFor(() => {
      expect(parentScope.update).toHaveBeenCalledWith('ui.values', initialValues);
    });

    const before = (parentScope.update as any).mock.calls.length;
    store.setState({
      values: initialValues,
      fieldStates: { name: { touched: true } },
      submitting: false,
      submitAttempted: false,
    });
    expect((parentScope.update as any).mock.calls.length).toBe(before);

    const nextValues = { username: 'Bob' };
    store.setState({
      values: nextValues,
      fieldStates: {},
      submitting: false,
      submitAttempted: false,
    });

    await waitFor(() => {
      expect(parentScope.update).toHaveBeenLastCalledWith('ui.values', nextValues);
    });
  });

  it('does nothing when publication paths are absent', () => {
    const parentScope = makeScope();
    const store = createFormStore({
      values: {},
      fieldStates: {},
      submitting: false,
      submitAttempted: false,
    });
    const ownedForm = { id: 'form-1', name: 'demo', store } as any;

    function Probe() {
      usePublishedFormStatus({ parentScope, ownedForm });
      usePublishedFormValues({ parentScope, ownedForm });
      return null;
    }

    render(<Probe />);
    expect(parentScope.update).not.toHaveBeenCalled();
  });
});
