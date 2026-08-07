import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useCurrentActionScope: vi.fn(),
  useCurrentComponentRegistry: vi.fn(),
  useCurrentPage: vi.fn(),
  useCurrentSurfaceRuntime: vi.fn(() => undefined),
  useRenderScope: vi.fn(),
  useRendererRuntime: vi.fn(),
  createFormComponentHandle: vi.fn((form: unknown) => ({ form })),
  resolveGap: vi.fn(() => ({ className: 'gap-class', style: { '--gap': '1rem' } })),
}));

vi.mock('@nop-chaos/flux-react', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');

  return {
    FormContext: ReactModule.createContext(undefined),
    FormLayoutContext: ReactModule.createContext(undefined),
    ScopeContext: ReactModule.createContext(null),
    hasRendererSlotContent: (content: unknown) =>
      content !== null && content !== undefined && content !== false,
    resolveRendererSlotContent: (props: { regions?: Record<string, unknown> }, slot: string) =>
      props.regions?.[slot],
    useCurrentActionScope: mocks.useCurrentActionScope,
    useCurrentComponentRegistry: mocks.useCurrentComponentRegistry,
    useCurrentPage: mocks.useCurrentPage,
    useCurrentSurfaceRuntime: mocks.useCurrentSurfaceRuntime,
    useRenderScope: mocks.useRenderScope,
    useRendererRuntime: mocks.useRendererRuntime,
    createFormComponentHandle: mocks.createFormComponentHandle,
    resolveGap: mocks.resolveGap,
  };
});

vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}));

import { FormRenderer } from '../renderers/form.js';
import { buildProps, getCallOptions, makeScope } from './form-renderer-lifecycle-test-support.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FormRenderer lifecycle wiring — scope publication and runtime reuse', () => {
  it('wraps lifecycle scopes with imported bindings, writes through the business parent, and re-inits only on activation changes', async () => {
    const businessScope = makeScope({ id: 'business', visible: { businessValue: 'root' } });
    const shellScope = makeScope({
      id: 'shell',
      visible: { dialogId: 'dialog-1' },
      parent: businessScope,
    });
    const ownedScope = makeScope({ id: 'owned', visible: { localValue: 'owned' } });
    const lifecycleHandlers: Array<any> = [];
    const initAction = vi.fn(async () => undefined);
    const submitAction = vi.fn(async () => undefined);
    const onSubmitSuccess = vi.fn(async () => undefined);
    const onSubmitError = vi.fn(async () => undefined);
    const onValidateError = vi.fn(async () => undefined);
    const registerCleanup = vi.fn();
    const register = vi.fn(() => registerCleanup);
    const ownedForm = {
      scope: ownedScope,
      store: { getState: () => ({ values: { username: 'Alice' }, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn((handlers: unknown) => {
        lifecycleHandlers.push(handlers);
      }),
      setRefreshHandler: vi.fn(),
    } as any;
    const runtime = {
      getImportedExpressionBindings: vi.fn(() => ({ importedFlag: 'yes' })),
      createFormRuntime: vi.fn(() => ownedForm),
    } as any;

    mocks.useRendererRuntime.mockReturnValue(runtime);
    mocks.useCurrentActionScope.mockReturnValue({ id: 'action-scope' });
    mocks.useCurrentComponentRegistry.mockReturnValue({ register });
    mocks.useCurrentPage.mockReturnValue({ id: 'page-1' });
    mocks.useRenderScope.mockReturnValue(shellScope);

    const props = buildProps({
      events: { initAction, submitAction, onSubmitSuccess, onSubmitError, onValidateError },
    });

    const { rerender, unmount } = render(<FormRenderer {...props} />);

    await waitFor(() => {
      expect(initAction).toHaveBeenCalledTimes(1);
    });

    expect(runtime.createFormRuntime).toHaveBeenCalledWith({
      id: 'rendered-form',
      name: 'profile',
      initialValues: { username: 'Alice' },
      parentScope: shellScope,
      statusPath: 'ui.status',
      valuesPath: 'ui.values',
      page: { id: 'page-1' },
      validation: { kind: 'validation-plan' },
    });
    expect(register).toHaveBeenCalledWith({ form: ownedForm }, { cid: 'cid-1' });
    expect(screen.getByTestId('form-test').className).toContain('nop-form');
    expect(screen.getByTestId('form-test').className).toContain('form-extra');
    expect(
      screen.getByText('Body content').closest('[data-slot="form-body"]')?.className,
    ).toContain('gap-class');
    expect(
      screen.getByText('Body content').closest('[data-slot="form-body"]')?.className,
    ).toContain('body-extra');
    expect(
      screen.getByText('Action content').closest('[data-slot="form-actions"]')?.className,
    ).toContain('actions-extra');

    const handlers = lifecycleHandlers.at(-1);
    expect(handlers).toBeTruthy();
    if (!handlers) {
      throw new Error('Expected lifecycle handlers to be registered');
    }

    await handlers.submitAction({ interactionId: 'submit-1', signal: 'signal-1' });
    const submitCall = submitAction.mock.calls[0];
    expect(submitCall).toBeTruthy();
    if (!submitCall) {
      throw new Error('Expected submit action call');
    }
    const submitOptions = getCallOptions(submitCall, 'submit action');
    const submitScope = submitOptions.scope;
    expect(submitScope).not.toBe(ownedScope);
    expect(submitScope.get('importedFlag')).toBe('yes');
    expect(submitScope.has('importedFlag')).toBe(true);
    expect(submitScope.get('localValue')).toBe('owned');
    expect(submitScope.readVisible().importedFlag).toBe('yes');
    expect(submitScope.materializeVisible()).toEqual({ localValue: 'owned', importedFlag: 'yes' });
    expect(submitOptions).toMatchObject({
      form: ownedForm,
      interactionId: 'submit-1',
      signal: 'signal-1',
    });

    const successResult = { ok: true, data: { username: 'Alice' } };
    await handlers.onSubmitSuccess(successResult, {
      interactionId: 'submit-2',
      signal: 'signal-2',
    });
    const successCall = onSubmitSuccess.mock.calls[0];
    expect(successCall).toBeTruthy();
    if (!successCall) {
      throw new Error('Expected submit success action call');
    }
    const successOptions = getCallOptions(successCall, 'submit success action');
    const successScope = successOptions.scope;
    expect(successScope.get('importedFlag')).toBe('yes');
    expect(successScope.get('businessValue')).toBe('root');
    expect(successScope.get('dialogId')).toBeUndefined();
    expect(successOptions.evaluationBindings).toEqual({
      result: successResult,
      error: undefined,
      prevResult: undefined,
    });

    const errorResult = { ok: false, error: new Error('submit failed') };
    await handlers.onSubmitError(errorResult, { interactionId: 'submit-3', signal: 'signal-3' });
    const errorCall = onSubmitError.mock.calls[0];
    expect(errorCall).toBeTruthy();
    if (!errorCall) {
      throw new Error('Expected submit error action call');
    }
    const errorOptions = getCallOptions(errorCall, 'submit error action');
    expect(errorOptions.scope.get('businessValue')).toBe('root');
    expect(errorOptions.evaluationBindings.error).toBe(errorResult.error);

    const validateResult = { ok: false, error: [{ message: 'invalid' }] };
    await handlers.onValidateError(validateResult, {
      interactionId: 'submit-4',
      signal: 'signal-4',
    });
    const validateCall = onValidateError.mock.calls[0];
    expect(validateCall).toBeTruthy();
    if (!validateCall) {
      throw new Error('Expected validate error action call');
    }
    const validateOptions = getCallOptions(validateCall, 'validate error action');
    expect(validateOptions.scope.get('businessValue')).toBe('root');
    expect(validateOptions.evaluationBindings.error).toBe(validateResult.error);

    rerender(<FormRenderer {...props} />);
    await waitFor(() => {
      expect(initAction).toHaveBeenCalledTimes(1);
    });

    rerender(
      <FormRenderer
        {...buildProps({
          events: { initAction, submitAction, onSubmitSuccess, onSubmitError, onValidateError },
          node: { instancePath: [{ repeatedTemplateId: 'repeat', instanceKey: 'second' }] },
        })}
      />,
    );

    await waitFor(() => {
      expect(initAction).toHaveBeenCalledTimes(2);
    });

    unmount();
    expect(ownedForm.setLifecycleHandlers).toHaveBeenLastCalledWith(undefined);
    await waitFor(() => {
      expect(ownedForm.dispose).toHaveBeenCalledTimes(1);
      expect(registerCleanup).toHaveBeenCalledTimes(1);
    });
  });

  it('reuses raw scopes when there are no imports and skips optional registration paths', async () => {
    const parentScope = makeScope({ id: 'parent', visible: { parentValue: 'plain' } });
    const ownedScope = makeScope({ id: 'owned-plain', visible: { localValue: 'plain-owned' } });
    const lifecycleHandlers: Array<any> = [];
    const submitAction = vi.fn(async () => undefined);
    const onSubmitSuccess = vi.fn(async () => undefined);
    const ownedForm = {
      scope: ownedScope,
      store: { getState: () => ({ values: {}, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn((handlers: unknown) => {
        lifecycleHandlers.push(handlers);
      }),
      setRefreshHandler: vi.fn(),
    } as any;
    const runtime = {
      getImportedExpressionBindings: vi.fn(() => ({})),
      createFormRuntime: vi.fn(() => ownedForm),
    } as any;

    mocks.useRendererRuntime.mockReturnValue(runtime);
    mocks.useCurrentActionScope.mockReturnValue(undefined);
    mocks.useCurrentComponentRegistry.mockReturnValue(undefined);
    mocks.useCurrentPage.mockReturnValue(undefined);
    mocks.useRenderScope.mockReturnValue(parentScope);

    render(
      <FormRenderer
        {...buildProps({
          props: { data: null },
          meta: { className: 'plain-form', testid: 'plain-form', cid: undefined },
          events: { submitAction, onSubmitSuccess },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    const handlers = lifecycleHandlers.at(-1);
    expect(handlers).toBeTruthy();
    if (!handlers) {
      throw new Error('Expected lifecycle handlers to be registered');
    }
    await handlers.submitAction({});
    await handlers.onSubmitSuccess({ ok: true, data: {} }, {});

    const plainSubmitCall = submitAction.mock.calls[0];
    const plainSuccessCall = onSubmitSuccess.mock.calls[0];
    expect(plainSubmitCall).toBeTruthy();
    expect(plainSuccessCall).toBeTruthy();
    if (!plainSubmitCall || !plainSuccessCall) {
      throw new Error('Expected lifecycle action calls');
    }
    expect(getCallOptions(plainSubmitCall, 'plain submit action').scope).toBe(ownedScope);
    expect(getCallOptions(plainSuccessCall, 'plain submit success action').scope).toBe(parentScope);
    expect(screen.getByTestId('plain-form').textContent).toBe('');
  });

  it('does not recreate the form runtime when rerender receives a fresh data object with the same values', () => {
    const parentScope = makeScope({ id: 'parent', visible: { parentValue: 'plain' } });
    const ownedScope = makeScope({ id: 'owned-stable', visible: { username: 'Alice' } });
    const ownedForm = {
      scope: ownedScope,
      store: { getState: () => ({ values: { username: 'Alice' }, submitting: false, submitAttempted: false, fieldStates: {} }), subscribe: () => () => undefined, subscribeToSubmitting: () => () => undefined },
      dispose: vi.fn(),
      setLifecycleHandlers: vi.fn(),
      setRefreshHandler: vi.fn(),
    } as any;
    const runtime = {
      getImportedExpressionBindings: vi.fn(() => ({})),
      createFormRuntime: vi.fn(() => ownedForm),
    } as any;

    mocks.useRendererRuntime.mockReturnValue(runtime);
    mocks.useCurrentActionScope.mockReturnValue(undefined);
    mocks.useCurrentComponentRegistry.mockReturnValue(undefined);
    mocks.useCurrentPage.mockReturnValue(undefined);
    mocks.useRenderScope.mockReturnValue(parentScope);

    const { rerender } = render(
      <FormRenderer
        {...buildProps({
          props: {
            name: 'profile',
            data: { username: 'Alice' },
          },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    expect(runtime.createFormRuntime).toHaveBeenCalledTimes(1);

    rerender(
      <FormRenderer
        {...buildProps({
          props: {
            name: 'profile',
            data: { username: 'Alice' },
          },
          regions: {},
          templateNode: { validationPlan: undefined, importsPlan: undefined, schemaUrl: undefined },
          node: { instancePath: [] },
        })}
      />,
    );

    expect(runtime.createFormRuntime).toHaveBeenCalledTimes(1);
  });
});
