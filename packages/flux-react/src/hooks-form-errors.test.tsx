import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FormContext } from './test-support';
import { EMPTY_FORM_STORE_STATE } from './form-state';
import { useCurrentFormError, useCurrentFormErrors } from './hooks';

function ErrorsProbe(props: { query?: import('@nop-chaos/flux-core').FormErrorQuery }) {
  useCurrentFormErrors(props.query);
  return null;
}

function ErrorProbe(props: { query: import('@nop-chaos/flux-core').FormErrorQuery }) {
  useCurrentFormError(props.query);
  return null;
}

describe('form error hooks subscriptions', () => {
  it('uses per-path subscriptions for path-scoped error lists', () => {
    const subscribe = vi.fn(() => () => undefined);
    const subscribeToPath = vi.fn(() => () => undefined);
    const form = {
      store: {
        subscribe,
        subscribeToPath,
        getState: () => EMPTY_FORM_STORE_STATE,
      },
    } as any;

    render(
      <FormContext.Provider value={form}>
        <ErrorsProbe query={{ path: 'profile.email' }} />
      </FormContext.Provider>,
    );

    expect(subscribeToPath).toHaveBeenCalledWith('profile.email', expect.any(Function));
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('keeps broadcast subscriptions for owner-only error queries', () => {
    const subscribe = vi.fn(() => () => undefined);
    const subscribeToPath = vi.fn(() => () => undefined);
    const form = {
      store: {
        subscribe,
        subscribeToPath,
        getState: () => ({
          ...EMPTY_FORM_STORE_STATE,
          fieldStates: {
            'profile.email': {
              errors: [{ path: 'profile.email', ownerPath: 'profile', rule: 'required', message: 'Required' }],
            },
          },
        }),
      },
    } as any;

    render(
      <FormContext.Provider value={form}>
        <ErrorsProbe query={{ ownerPath: 'profile' }} />
      </FormContext.Provider>,
    );

    expect(subscribe).toHaveBeenCalledWith(expect.any(Function));
    expect(subscribeToPath).not.toHaveBeenCalled();
  });

  it('uses per-path subscriptions for single field errors', () => {
    const subscribe = vi.fn(() => () => undefined);
    const subscribeToPath = vi.fn(() => () => undefined);
    const form = {
      store: {
        subscribe,
        subscribeToPath,
        getState: () => EMPTY_FORM_STORE_STATE,
      },
    } as any;

    render(
      <FormContext.Provider value={form}>
        <ErrorProbe query={{ path: 'profile.email', ownerPath: 'profile.email' }} />
      </FormContext.Provider>,
    );

    expect(subscribeToPath).toHaveBeenCalledWith('profile.email', expect.any(Function));
    expect(subscribe).not.toHaveBeenCalled();
  });
});
