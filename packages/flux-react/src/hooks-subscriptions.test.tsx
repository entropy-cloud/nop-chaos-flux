// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FormContext } from './test-support';
import { EMPTY_FORM_STORE_STATE } from './form-state';
import { useCurrentFormFieldState, useCurrentFormState, useFieldError } from './hooks';

function FormStateProbe() {
  useCurrentFormState((state) => state.values, Object.is, { path: 'profile.email' });
  return null;
}

function FieldStateProbe() {
  useCurrentFormFieldState('profile.email', { path: 'profile.email' });
  return null;
}

function FieldErrorProbe() {
  useFieldError('profile.email');
  return null;
}

describe('hook subscription helpers', () => {
  it('uses per-path subscriptions for useCurrentFormState path mode', () => {
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
        <FormStateProbe />
      </FormContext.Provider>,
    );

    expect(subscribeToPath).toHaveBeenCalledWith('profile.email', expect.any(Function));
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('uses shared field-state subscriptions for useCurrentFormFieldState', () => {
    const subscribe = vi.fn(() => () => undefined);
    const subscribeToPath = vi.fn(() => () => undefined);
    const subscribeToSubmitting = vi.fn(() => () => undefined);
    const form = {
      store: {
        subscribe,
        subscribeToPath,
        subscribeToSubmitting,
        getState: () => EMPTY_FORM_STORE_STATE,
      },
    } as any;

    render(
      <FormContext.Provider value={form}>
        <FieldStateProbe />
      </FormContext.Provider>,
    );

    expect(subscribeToPath).toHaveBeenCalledWith('profile.email', expect.any(Function));
    expect(subscribeToSubmitting).toHaveBeenCalledWith(expect.any(Function));
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('uses shared field-state subscriptions for useFieldError', () => {
    const subscribe = vi.fn(() => () => undefined);
    const subscribeToPath = vi.fn(() => () => undefined);
    const subscribeToSubmitting = vi.fn(() => () => undefined);
    const form = {
      store: {
        subscribe,
        subscribeToPath,
        subscribeToSubmitting,
        getState: () => EMPTY_FORM_STORE_STATE,
      },
    } as any;

    render(
      <FormContext.Provider value={form}>
        <FieldErrorProbe />
      </FormContext.Provider>,
    );

    expect(subscribeToPath).toHaveBeenCalledWith('profile.email', expect.any(Function));
    expect(subscribeToSubmitting).toHaveBeenCalledWith(expect.any(Function));
    expect(subscribe).not.toHaveBeenCalled();
  });
});
