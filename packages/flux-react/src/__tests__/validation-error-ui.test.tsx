import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useCurrentFormErrors } from '../hooks.js';
import { FormContext } from '../contexts.js';

const EMPTY_STATE = Object.freeze({ fieldStates: {} });
const SUBSCRIBE_RETURN = () => undefined;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function ErrorListProbe(props: { path?: string; ownerPath?: string }) {
  const errors = useCurrentFormErrors(
    props.path ? { path: props.path } : props.ownerPath ? { ownerPath: props.ownerPath } : undefined,
  );
  return (
    <ul data-testid="error-list">
      {errors?.map((e, i) => (
        <li key={`${e.path}-${e.rule}`} data-testid={`error-${i}`}>
          {e.message}
        </li>
      ))}
    </ul>
  );
}

describe('validation error UI rendering', () => {
  it('renders error messages from form store through standard error path', () => {
    const state = {
      fieldStates: {
        email: {
          errors: [
            { path: 'email', rule: 'required', message: 'Email is required' },
          ],
        },
      },
    };
    const form = {
      store: {
        subscribe: vi.fn(() => SUBSCRIBE_RETURN),
        subscribeToPath: vi.fn(() => SUBSCRIBE_RETURN),
        getState: () => state,
      },
    } as any;

    render(
      <FormContext.Provider value={form}>
        <ErrorListProbe path="email" />
      </FormContext.Provider>,
    );

    expect(screen.getByTestId('error-list').children).toHaveLength(1);
    expect(screen.getByTestId('error-0').textContent).toBe('Email is required');
  });

  it('renders multiple error messages for the same field', () => {
    const state = {
      fieldStates: {
        password: {
          errors: [
            { path: 'password', rule: 'required', message: 'Password is required' },
            { path: 'password', rule: 'minLength', message: 'Password must be at least 8 chars' },
          ],
        },
      },
    };
    const form = {
      store: {
        subscribe: vi.fn(() => SUBSCRIBE_RETURN),
        subscribeToPath: vi.fn(() => SUBSCRIBE_RETURN),
        getState: () => state,
      },
    } as any;

    render(
      <FormContext.Provider value={form}>
        <ErrorListProbe path="password" />
      </FormContext.Provider>,
    );

    expect(screen.getByTestId('error-list').children).toHaveLength(2);
    expect(screen.getByTestId('error-0').textContent).toBe('Password is required');
    expect(screen.getByTestId('error-1').textContent).toBe('Password must be at least 8 chars');
  });

  it('shows no errors when field state is empty', () => {
    const form = {
      store: {
        subscribe: vi.fn(() => SUBSCRIBE_RETURN),
        subscribeToPath: vi.fn(() => SUBSCRIBE_RETURN),
        getState: () => EMPTY_STATE,
      },
    } as any;

    render(
      <FormContext.Provider value={form}>
        <ErrorListProbe path="name" />
      </FormContext.Provider>,
    );

    expect(screen.getByTestId('error-list').children).toHaveLength(0);
  });

  it('subscribes to owner-path errors correctly', () => {
    const state = {
      fieldStates: {
        'profile.email': {
          errors: [
            { path: 'profile.email', ownerPath: 'profile', rule: 'required', message: 'Required' },
          ],
        },
      },
    };
    const subscribe = vi.fn(() => SUBSCRIBE_RETURN);
    const form = {
      store: {
        subscribe,
        subscribeToPath: vi.fn(() => SUBSCRIBE_RETURN),
        getState: () => state,
      },
    } as any;

    render(
      <FormContext.Provider value={form}>
        <ErrorListProbe ownerPath="profile" />
      </FormContext.Provider>,
    );

    expect(screen.getByTestId('error-list').children).toHaveLength(1);
    expect(screen.getByTestId('error-0').textContent).toBe('Required');
  });
});
