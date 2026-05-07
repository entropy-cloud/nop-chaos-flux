import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import type { FormRuntime, FormStoreState, ScopeRef, ValidationError } from '@nop-chaos/flux-core';
import {
  usePublishedFormStatus,
  usePublishedFormValues,
} from '../renderers/form-status-publication.js';

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
  };
}

function makeOwnedForm(store: ReturnType<typeof createFormStore>): FormRuntime {
  return {
    id: 'form-1',
    name: 'demo',
    store,
    getScopeState: () => ({ valid: true, hasErrors: false, validating: false, ready: true }),
  } as unknown as FormRuntime;
}

describe('form-status-publication hooks', () => {
  it('publishes status summary and dedupes unchanged summaries', async () => {
    const parentScope = makeScope();
    const store = createFormStore({
      values: {},
      fieldStates: {
        name: {
          touched: true,
          errors: [{ path: 'name', rule: 'required', message: 'Required' }] as ValidationError[],
        },
      },
      submitting: false,
      submitAttempted: false,
    });
    const ownedForm = makeOwnedForm(store);

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

    const updateMock = parentScope.update as ReturnType<typeof vi.fn>;
    const before = updateMock.mock.calls.length;
    store.setState({
      values: {},
      fieldStates: {
        name: {
          touched: true,
          errors: [{ path: 'name', rule: 'required', message: 'Required' }] as ValidationError[],
        },
      },
      submitting: false,
      submitAttempted: false,
    });
    expect(updateMock.mock.calls.length).toBe(before);

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
    const ownedForm = makeOwnedForm(store);

    function Probe() {
      usePublishedFormValues({ valuesPath: 'ui.values', parentScope, ownedForm });
      return null;
    }

    render(<Probe />);

    await waitFor(() => {
      expect(parentScope.update).toHaveBeenCalledWith('ui.values', initialValues);
    });

    const updateMock = parentScope.update as ReturnType<typeof vi.fn>;
    const before = updateMock.mock.calls.length;
    store.setState({
      values: initialValues,
      fieldStates: { name: { touched: true } },
      submitting: false,
      submitAttempted: false,
    });
    expect(updateMock.mock.calls.length).toBe(before);

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
    const ownedForm = makeOwnedForm(store);

    function Probe() {
      usePublishedFormStatus({ parentScope, ownedForm });
      usePublishedFormValues({ parentScope, ownedForm });
      return null;
    }

    render(<Probe />);
    expect(parentScope.update).not.toHaveBeenCalled();
  });

  it('clears published status and values on unmount', async () => {
    const parentScope = makeScope();
    const store = createFormStore({
      values: { username: 'Alice' },
      fieldStates: {},
      submitting: false,
      submitAttempted: false,
    });
    const ownedForm = {
      ...makeOwnedForm(store),
      getScopeState: () => ({ valid: true, hasErrors: false, validating: false, ready: true }),
    } as unknown as FormRuntime;

    function Probe() {
      usePublishedFormStatus({ statusPath: 'ui.status', parentScope, ownedForm });
      usePublishedFormValues({ valuesPath: 'ui.values', parentScope, ownedForm });
      return null;
    }

    const rendered = render(<Probe />);

    await waitFor(() => {
      expect(parentScope.update).toHaveBeenCalledWith('ui.status', expect.any(Object));
      expect(parentScope.update).toHaveBeenCalledWith('ui.values', { username: 'Alice' });
    });

    rendered.unmount();

    expect(parentScope.update).toHaveBeenCalledWith('ui.status', undefined);
    expect(parentScope.update).toHaveBeenCalledWith('ui.values', undefined);
  });
});
