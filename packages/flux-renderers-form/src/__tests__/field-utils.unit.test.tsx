import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  FormFieldStateSnapshot,
  ScopeRef,
  ValidationError,
} from '@nop-chaos/flux-core';
import { FormContext, ScopeContext, ValidationContext } from '@nop-chaos/flux-react';
import {
  createFieldHandlers,
  defaultValidationBehavior,
  getChildFieldUiState,
  getFieldValidationBehavior,
  getValidationBehaviorForOwner,
  readCheckboxGroupValue,
  readFieldValue,
  resolveFieldLabelText,
  shouldValidateOn,
  shouldValidateOnOwner,
  useFormFieldController,
  useHiddenFieldPolicy,
} from '../field-utils';

function makeScope(overrides: Partial<ScopeRef> = {}): ScopeRef {
  const data: Record<string, unknown> = { value: 'scope-value', checks: ['a', 2] };
  return {
    id: 'scope-1',
    path: '$',
    value: data,
    get(path: string) {
      return data[path];
    },
    has(path: string) {
      return Object.prototype.hasOwnProperty.call(data, path);
    },
    readOwn() {
      return data;
    },
    readVisible() {
      return data;
    },
    materializeVisible() {
      return { ...data };
    },
    update: vi.fn(),
    merge: vi.fn(),
    ...overrides,
  };
}

describe('field-utils unit helpers', () => {
  it('returns default validation behavior without form or owner field', () => {
    expect(getFieldValidationBehavior('name', undefined)).toBe(defaultValidationBehavior);
    expect(getValidationBehaviorForOwner('name', undefined)).toBe(defaultValidationBehavior);
  });

  it('resolves field behavior before form-level behavior', () => {
    const currentForm = {
      validation: {
        behavior: { triggers: ['change'], showErrorOn: ['dirty'] },
        nodes: {
          name: {
            kind: 'field',
            path: 'name',
            controlType: 'input-text',
            behavior: { triggers: ['blur'], showErrorOn: ['touched'] },
            rules: [],
            children: [],
          },
        },
      },
    } as any;

    expect(getFieldValidationBehavior('name', currentForm)).toEqual({
      triggers: ['blur'],
      showErrorOn: ['touched'],
    });
    expect(getFieldValidationBehavior('other', currentForm)).toEqual({
      triggers: ['change'],
      showErrorOn: ['dirty'],
    });
  });

  it('checks validation triggers for forms and owners', () => {
    const owner = {
      validation: {
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        nodes: {
          age: {
            kind: 'field',
            path: 'age',
            controlType: 'input-number',
            behavior: { triggers: ['change'], showErrorOn: ['dirty'] },
            rules: [],
            children: [],
          },
        },
      },
    } as any;

    expect(shouldValidateOnOwner('age', owner, 'change')).toBe(true);
    expect(shouldValidateOnOwner('age', owner, 'blur')).toBe(false);
    expect(shouldValidateOn('missing', owner as any, 'submit')).toBe(true);
  });

  it('reads scalar and object field values from scope', () => {
    const scope = makeScope();
    expect(readFieldValue(scope, 'value')).toBe('scope-value');
    expect(readFieldValue(scope, '')).toEqual(scope.readOwn());
    expect(readCheckboxGroupValue(scope, 'checks')).toEqual(['a', '2']);
    expect(readCheckboxGroupValue(scope, 'missing')).toEqual([]);
  });

  it('builds child field ui state with error markers', () => {
    const error: ValidationError = { path: 'name', rule: 'required', message: 'required' };
    const fieldState: FormFieldStateSnapshot = {
      error,
      touched: true,
      dirty: false,
      visited: true,
      validating: false,
      submitting: false,
      submitAttempted: false,
    };
    const uiState = getChildFieldUiState({
      behavior: { triggers: ['blur'], showErrorOn: ['touched'] },
      fieldState,
    });

    expect(uiState.error).toBe(error);
    expect(uiState.showError).toBe(true);
    expect(uiState['data-child-field-invalid']).toBe('');
    expect(uiState['data-child-field-touched']).toBe('');
    expect(uiState['data-child-field-dirty']).toBeUndefined();
  });

  it('resolves label text from props or fallback', () => {
    expect(resolveFieldLabelText({ props: { label: 'Username' }, meta: {} } as any)).toBe(
      'Username',
    );
    expect(resolveFieldLabelText({ props: { label: '' }, meta: {} } as any, 'Fallback')).toBe(
      'Fallback',
    );
  });
});

describe('createFieldHandlers', () => {
  it('visits and validates form fields for focus, change, and blur', async () => {
    const setValue = vi.fn(async () => undefined);
    const currentForm = {
      visitField: vi.fn(),
      touchField: vi.fn(),
      isTouched: vi.fn(() => true),
      validateField: vi.fn(async () => undefined),
      validation: {
        behavior: { triggers: ['change', 'blur'], showErrorOn: ['touched'] },
        nodes: {},
      },
    } as any;

    const handlers = createFieldHandlers({
      name: 'name',
      currentForm,
      currentValidationScope: undefined,
      setValue,
    });

    handlers.onFocus();
    handlers.onChange('Alice');
    handlers.onBlur();

    await waitFor(() => {
      expect(setValue).toHaveBeenCalledWith('Alice');
      expect(currentForm.validateField).toHaveBeenCalledTimes(2);
    });
    expect(currentForm.visitField).toHaveBeenCalledWith('name');
    expect(currentForm.touchField).toHaveBeenCalledWith('name');
  });

  it('validates on change regardless of touched state when validateOn includes change', async () => {
    const setValue = vi.fn(async () => undefined);
    const currentForm = {
      visitField: vi.fn(),
      touchField: vi.fn(),
      isTouched: vi.fn(() => false),
      validateField: vi.fn(async () => undefined),
      validation: {
        behavior: { triggers: ['change'], showErrorOn: ['touched'] },
        nodes: {},
      },
    } as any;

    const handlers = createFieldHandlers({
      name: 'name',
      currentForm,
      currentValidationScope: undefined,
      setValue,
    });

    handlers.onChange('Alice');

    await waitFor(() => {
      expect(currentForm.validateField).toHaveBeenCalledWith('name');
    });
  });

  it('delegates to validation scope when no form exists', async () => {
    const setValue = vi.fn(async () => undefined);
    const currentValidationScope = {
      validateAt: vi.fn(async () => undefined),
      visitField: vi.fn(),
      touchField: vi.fn(),
      validation: {
        behavior: { triggers: ['change', 'blur'], showErrorOn: ['touched'] },
        nodes: {},
      },
    } as any;

    const handlers = createFieldHandlers({
      name: 'status',
      currentForm: undefined,
      currentValidationScope,
      setValue,
    });

    handlers.onFocus();
    handlers.onChange('ready');
    handlers.onBlur();

    await waitFor(() => {
      expect(setValue).toHaveBeenCalledWith('ready');
      expect(currentValidationScope.validateAt).toHaveBeenCalledWith('status', 'change');
      expect(currentValidationScope.validateAt).toHaveBeenCalledWith('status', 'blur');
    });
    expect(currentValidationScope.visitField).toHaveBeenCalledWith('status');
    expect(currentValidationScope.touchField).toHaveBeenCalledWith('status');
  });

  it('falls back to direct setValue when no form or owner exists', async () => {
    const setValue = vi.fn(async () => undefined);
    const handlers = createFieldHandlers({
      name: 'value',
      currentForm: undefined,
      currentValidationScope: undefined,
      setValue,
    });

    handlers.onChange(123);

    await waitFor(() => {
      expect(setValue).toHaveBeenCalledWith(123);
    });
  });
});

describe('useHiddenFieldPolicy', () => {
  it('notifies hidden owner on mount/update and resets on unmount', () => {
    const notifyFieldHidden = vi.fn();
    const form = { notifyFieldHidden } as any;

    function Probe({ hidden }: { hidden: boolean }) {
      useHiddenFieldPolicy('name', hidden);
      return <span>probe</span>;
    }

    const { rerender, unmount } = render(
      <FormContext.Provider value={form}>
        <ValidationContext.Provider value={undefined}>
          <ScopeContext.Provider value={makeScope()}>
            <Probe hidden={true} />
          </ScopeContext.Provider>
        </ValidationContext.Provider>
      </FormContext.Provider>,
    );

    expect(notifyFieldHidden).toHaveBeenCalledWith('name', true);

    rerender(
      <FormContext.Provider value={form}>
        <ValidationContext.Provider value={undefined}>
          <ScopeContext.Provider value={makeScope()}>
            <Probe hidden={false} />
          </ScopeContext.Provider>
        </ValidationContext.Provider>
      </FormContext.Provider>,
    );

    expect(notifyFieldHidden).toHaveBeenCalledWith('name', false);

    unmount();
    expect(notifyFieldHidden).toHaveBeenLastCalledWith('name', false);
  });
});

function makeAdapterScope(data: Record<string, unknown>): ScopeRef {
  return {
    id: 'scope-adapter',
    path: '$',
    value: data,
    get(path: string) {
      return data[path];
    },
    has(path: string) {
      return Object.prototype.hasOwnProperty.call(data, path);
    },
    readOwn() {
      return data;
    },
    readVisible() {
      return data;
    },
    materializeVisible() {
      return { ...data };
    },
    update: vi.fn(),
    merge: vi.fn(),
  };
}

function wrapInContexts(scope: ScopeRef, children: React.ReactNode) {
  return (
    <FormContext.Provider value={undefined}>
      <ValidationContext.Provider value={undefined}>
        <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
      </ValidationContext.Provider>
    </FormContext.Provider>
  );
}

describe('useFormFieldController adapter behavior', () => {
  it('returns raw value when no adapter is provided', () => {
    cleanup();
    const scope = makeAdapterScope({ status: 'active' });

    function Probe() {
      const ctrl = useFormFieldController('status');
      return <span data-testid="value">{String(ctrl.value)}</span>;
    }

    render(wrapInContexts(scope, <Probe />));
    expect(screen.getByTestId('value').textContent).toBe('active');
  });

  it('resolves synchronous adapter.in immediately with __syncIn', () => {
    cleanup();
    const adapter = {
      __syncIn: true as const,
      in: vi.fn((value: unknown) => String(value).toUpperCase()),
      out: vi.fn((value: unknown) => value),
    };
    const scope = makeAdapterScope({ status: 'active' });

    function Probe() {
      const ctrl = useFormFieldController('status', { adapter });
      return <span data-testid="value">{String(ctrl.value)}</span>;
    }

    render(wrapInContexts(scope, <Probe />));
    expect(screen.getByTestId('value').textContent).toBe('ACTIVE');
    expect(adapter.in).toHaveBeenCalledWith('active', expect.objectContaining({ name: 'status' }));
  });

  it('resolves synchronous adapter.in via microtask when __syncIn is absent', async () => {
    cleanup();
    const adapter = {
      in: vi.fn((value: unknown) => String(value).toUpperCase()),
      out: vi.fn((value: unknown) => value),
    };
    const scope = makeAdapterScope({ status: 'active' });

    function Probe() {
      const ctrl = useFormFieldController('status', { adapter });
      return <span data-testid="value">{String(ctrl.value)}</span>;
    }

    render(wrapInContexts(scope, <Probe />));
    expect(screen.getByTestId('value').textContent).toBe('active');

    await waitFor(() => {
      expect(screen.getByTestId('value').textContent).toBe('ACTIVE');
    });
  });

  it('resolves async adapter.in and updates value', async () => {
    cleanup();
    let resolveAdapter!: (value: unknown) => void;
    const adapter = {
      in: vi.fn(
        (_value: unknown) =>
          new Promise((resolve) => {
            resolveAdapter = resolve;
          }),
      ),
      out: vi.fn((_value: unknown) => _value),
    };
    const scope = makeAdapterScope({ status: 'active' });

    function Probe() {
      const ctrl = useFormFieldController('status', { adapter });
      return <span data-testid="value">{String(ctrl.value)}</span>;
    }

    render(wrapInContexts(scope, <Probe />));
    expect(screen.getByTestId('value').textContent).toBe('active');

    resolveAdapter('ACTIVE');
    await waitFor(() => {
      expect(screen.getByTestId('value').textContent).toBe('ACTIVE');
    });
  });

  it('cancels stale async adapter.in on rapid value change', async () => {
    cleanup();
    const _callLog: Array<{ input: string; output: string }> = [];
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    let callIndex = 0;

    const adapter = {
      in: vi.fn((_value: unknown) => {
        const idx = callIndex++;
        return new Promise((resolve) => {
          if (idx === 0) resolveFirst = resolve;
          else resolveSecond = resolve;
        });
      }),
      out: vi.fn((value: unknown) => value),
    };

    const scopeData = { status: 'active' };
    const scope = makeAdapterScope(scopeData);

    function Probe() {
      const ctrl = useFormFieldController('status', { adapter });
      return <span data-testid="value">{String(ctrl.value)}</span>;
    }

    const { rerender } = render(wrapInContexts(scope, <Probe />));
    expect(adapter.in).toHaveBeenCalledTimes(1);

    scopeData.status = 'pending';
    rerender(wrapInContexts(makeAdapterScope(scopeData), <Probe />));
    expect(adapter.in).toHaveBeenCalledTimes(2);

    resolveFirst('STALE');
    resolveSecond('PENDING');
    await waitFor(() => {
      expect(screen.getByTestId('value').textContent).toBe('PENDING');
    });
  });

  it('logs warning when async adapter.in rejects', async () => {
    cleanup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = {
      in: vi.fn(() => Promise.reject(new Error('adapter boom'))),
      out: vi.fn((value: unknown) => value),
    };
    const scope = makeAdapterScope({ status: 'active' });

    function Probe() {
      const ctrl = useFormFieldController('status', { adapter });
      return <span data-testid="value">{String(ctrl.value)}</span>;
    }

    render(wrapInContexts(scope, <Probe />));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('[field-utils] adapter.in failed', expect.any(Error));
    });

    warnSpy.mockRestore();
  });
});

describe('useFieldPresentation subscription precision', () => {
  it('uses path-scoped subscription rather than whole-store broadcast', () => {
    cleanup();
    const subscribe = vi.fn(() => () => undefined);
    const subscribeToPath = vi.fn(() => () => undefined);
    const subscribeToSubmitting = vi.fn(() => () => undefined);
    const form = {
      store: {
        subscribe,
        subscribeToPath,
        subscribeToSubmitting,
        getState: () => ({
          values: { email: 'a@b.com' },
          fieldStates: {
            email: {
              touched: false,
              dirty: false,
              visited: false,
              errors: [],
              validating: false,
            },
          },
          submitting: false,
          submitAttempted: false,
        }),
      },
      validation: undefined,
    } as any;

    const scope = makeScope();

    function PresentationProbe() {
      useFormFieldController('email');
      return <span data-testid="probe">ok</span>;
    }

    render(
      <FormContext.Provider value={form}>
        <ValidationContext.Provider value={undefined}>
          <ScopeContext.Provider value={scope}>
            <PresentationProbe />
          </ScopeContext.Provider>
        </ValidationContext.Provider>
      </FormContext.Provider>,
    );

    expect(subscribeToPath).toHaveBeenCalledWith('email', expect.any(Function));
    expect(subscribe).not.toHaveBeenCalled();
  });
});

describe('async adapter.out stale-result guard', () => {
  it('ignores stale adapter.out result when a newer change resolves first via useFormFieldController', async () => {
    cleanup();
    let resolveFirst!: (v: unknown) => void;
    let resolveSecond!: (v: unknown) => void;
    let callIdx = 0;

    const adapter = {
      in: vi.fn((v: unknown) => v),
      out: vi.fn((_v: unknown) => {
        const idx = callIdx++;
        return new Promise((resolve) => {
          if (idx === 0) resolveFirst = resolve;
          else resolveSecond = resolve;
        });
      }),
    };

    const scopeData: Record<string, unknown> = { status: 'init' };
    const updateFn = vi.fn((path: string, value: unknown) => {
      scopeData[path] = value;
    });
    const scope: ScopeRef = {
      id: 'scope-stale',
      path: '$',
      value: scopeData,
      get(path: string) {
        return scopeData[path];
      },
      has(path: string) {
        return Object.prototype.hasOwnProperty.call(scopeData, path);
      },
      readOwn() {
        return scopeData;
      },
      readVisible() {
        return scopeData;
      },
      materializeVisible() {
        return { ...scopeData };
      },
      update: updateFn,
      merge: vi.fn(),
    };

    function Probe() {
      const ctrl = useFormFieldController('status', { adapter });
      return (
        <span
          data-testid="probe"
          data-value={String(ctrl.value)}
          onClick={() => {
            ctrl.handlers.onChange('fast');
            ctrl.handlers.onChange('slow');
          }}
        >
          probe
        </span>
      );
    }

    render(wrapInContexts(scope, <Probe />));

    const probe = screen.getByTestId('probe');
    fireEvent.click(probe);

    resolveSecond('SLOW_RESOLVED');
    await new Promise((r) => setTimeout(r, 0));
    resolveFirst('FAST_STALE');
    await new Promise((r) => setTimeout(r, 0));

    expect(updateFn).toHaveBeenCalledWith('status', 'SLOW_RESOLVED');
    expect(updateFn).not.toHaveBeenCalledWith('status', 'FAST_STALE');
  });
});
