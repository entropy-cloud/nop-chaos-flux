import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useCurrentActionScope: vi.fn(),
  useCurrentComponentRegistry: vi.fn(),
  useCurrentPage: vi.fn(),
  useRenderScope: vi.fn(),
  useRendererRuntime: vi.fn(),
  createFormComponentHandle: vi.fn((form: unknown) => ({ form })),
  usePublishedFormStatus: vi.fn(),
  usePublishedFormValues: vi.fn(),
  resolveGap: vi.fn(() => ({ className: 'gap-class', style: { '--gap': '1rem' } })),
}));

vi.mock('@nop-chaos/flux-react', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');

  return {
    FormContext: ReactModule.createContext(undefined),
    FormLayoutContext: ReactModule.createContext(undefined),
    ScopeContext: ReactModule.createContext(null),
    hasRendererSlotContent: (content: unknown) => content !== null && content !== undefined && content !== false,
    resolveRendererSlotContent: (props: { regions?: Record<string, unknown> }, slot: string) => props.regions?.[slot],
    useCurrentActionScope: mocks.useCurrentActionScope,
    useCurrentComponentRegistry: mocks.useCurrentComponentRegistry,
    useCurrentPage: mocks.useCurrentPage,
    useRenderScope: mocks.useRenderScope,
    useRendererRuntime: mocks.useRendererRuntime,
    createFormComponentHandle: mocks.createFormComponentHandle,
  };
});

vi.mock('../renderers/form-status-publication', () => ({
  usePublishedFormStatus: mocks.usePublishedFormStatus,
  usePublishedFormValues: mocks.usePublishedFormValues,
}));

vi.mock('@nop-chaos/flux-renderers-basic', () => ({
  resolveGap: mocks.resolveGap,
}));

vi.mock('@nop-chaos/ui', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}));

import { FormRenderer } from '../renderers/form';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function makeScope(options: {
  id: string;
  visible?: Record<string, unknown>;
  own?: Record<string, unknown>;
  parent?: any;
}) {
  const visible = options.visible ?? {};
  const own = options.own ?? visible;

  return {
    id: options.id,
    path: `$${options.id}`,
    parent: options.parent,
    store: {
      subscribe: () => () => undefined,
      getSnapshot: () => visible,
    },
    get(path: string) {
      return visible[path];
    },
    has(path: string) {
      return Object.prototype.hasOwnProperty.call(visible, path);
    },
    readOwn() {
      return own;
    },
    readVisible() {
      return visible;
    },
    materializeVisible() {
      return { ...visible };
    },
    update: vi.fn(),
    merge: vi.fn(),
    replace: vi.fn(),
  } as any;
}

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rendered-form',
    path: '$.body[0]',
    props: {
      name: 'profile',
      data: { username: 'Alice' },
      statusPath: 'ui.status',
      valuesPath: 'ui.values',
      mode: 'horizontal',
      labelAlign: 'left',
      labelWidth: 120,
      bodyClassName: 'body-extra',
      actionsClassName: 'actions-extra',
    },
    schema: { type: 'form' },
    meta: { className: 'form-extra', testid: 'form-test', cid: 'cid-1' },
    events: {},
    helpers: {},
    regions: {
      body: <div>Body content</div>,
      actions: <div>Action content</div>,
    },
    templateNode: {
      schemaUrl: 'schema://profile',
      validationPlan: { kind: 'validation-plan' },
      importsPlan: { preparedImports: ['profileImport'] },
    },
    node: {
      instancePath: [{ repeatedTemplateId: 'repeat', instanceKey: 'first' }],
    },
    ...overrides,
  } as any;
}

function getCallOptions(call: unknown, label: string): Record<string, any> {
  if (!Array.isArray(call) || call.length < 2) {
    throw new Error(`Expected ${label} call options`);
  }

  return call[1] as Record<string, any>;
}

describe('FormRenderer lifecycle wiring', () => {
  it('wraps lifecycle scopes with imported bindings, writes through the business parent, and re-inits only on activation changes', async () => {
    const businessScope = makeScope({ id: 'business', visible: { businessValue: 'root' } });
    const shellScope = makeScope({ id: 'shell', visible: { dialogId: 'dialog-1' }, parent: businessScope });
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
      store: { getState: () => ({ values: { username: 'Alice' } }) },
      setLifecycleHandlers: vi.fn((handlers: unknown) => {
        lifecycleHandlers.push(handlers);
      }),
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
      page: { id: 'page-1' },
      validation: { kind: 'validation-plan' },
    });
    expect(mocks.usePublishedFormStatus).toHaveBeenCalledWith({ statusPath: 'ui.status', parentScope: shellScope, ownedForm });
    expect(mocks.usePublishedFormValues).toHaveBeenCalledWith({ valuesPath: 'ui.values', parentScope: shellScope, ownedForm });
    expect(register).toHaveBeenCalledWith({ form: ownedForm }, { cid: 'cid-1' });
    expect(screen.getByTestId('form-test').className).toContain('nop-form');
    expect(screen.getByTestId('form-test').className).toContain('form-extra');
    expect(screen.getByText('Body content').closest('[data-slot="form-body"]')?.className).toContain('gap-class');
    expect(screen.getByText('Body content').closest('[data-slot="form-body"]')?.className).toContain('body-extra');
    expect(screen.getByText('Action content').closest('[data-slot="form-actions"]')?.className).toContain('actions-extra');

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
    expect(submitOptions).toMatchObject({ form: ownedForm, interactionId: 'submit-1', signal: 'signal-1' });

    const successResult = { ok: true, data: { username: 'Alice' } };
    await handlers.onSubmitSuccess(successResult, { interactionId: 'submit-2', signal: 'signal-2' });
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
    await handlers.onValidateError(validateResult, { interactionId: 'submit-4', signal: 'signal-4' });
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
      />
    );

    await waitFor(() => {
      expect(initAction).toHaveBeenCalledTimes(2);
    });

    unmount();
    expect(ownedForm.setLifecycleHandlers).toHaveBeenLastCalledWith(undefined);
    expect(registerCleanup).toHaveBeenCalledTimes(1);
  });

  it('reuses raw scopes when there are no imports and skips optional registration paths', async () => {
    const parentScope = makeScope({ id: 'parent', visible: { parentValue: 'plain' } });
    const ownedScope = makeScope({ id: 'owned-plain', visible: { localValue: 'plain-owned' } });
    const lifecycleHandlers: Array<any> = [];
    const submitAction = vi.fn(async () => undefined);
    const onSubmitSuccess = vi.fn(async () => undefined);
    const ownedForm = {
      scope: ownedScope,
      store: { getState: () => ({ values: {} }) },
      setLifecycleHandlers: vi.fn((handlers: unknown) => {
        lifecycleHandlers.push(handlers);
      }),
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
      />
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
});
