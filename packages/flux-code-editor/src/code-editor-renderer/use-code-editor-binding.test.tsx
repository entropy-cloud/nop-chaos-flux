import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FormContext, ScopeContext, ValidationContext } from '@nop-chaos/flux-react/unstable';
import { useCodeEditorBinding } from './use-code-editor-binding.js';

function createScope() {
  const subscribe = vi.fn(() => () => undefined);
  return {
    id: 'page',
    path: '$page',
    get: vi.fn(() => ''),
    has: vi.fn(() => true),
    readOwn: vi.fn(() => ({ script: '' })),
    readVisible: vi.fn(() => ({ script: '' })),
    materializeVisible: vi.fn(() => ({ script: '' })),
    store: {
      subscribe,
      getSnapshot: () => ({ script: '' }),
    },
    update: vi.fn(),
  } as any;
}

function createValidationOwner() {
  return {
    store: {
      subscribe: () => () => undefined,
      subscribeToPath: () => () => undefined,
      getState: () => ({ values: { script: '' }, fieldStates: {}, submitting: false, submitAttempted: false }),
    },
    visitField: vi.fn(),
    touchField: vi.fn(),
    validateAt: vi.fn(async () => ({ ok: false, errors: [{ message: 'required' }] })),
  } as any;
}

function Probe(props: { onReady: (binding: ReturnType<typeof useCodeEditorBinding>) => void }) {
  const binding = useCodeEditorBinding(
    {
      props: { value: '', language: 'javascript' },
      events: {},
    } as any,
    'script',
  );

  React.useEffect(() => {
    props.onReady(binding);
  }, [binding, props]);

  return null;
}

describe('useCodeEditorBinding', () => {
  it('falls back to validation-owner participation outside forms', async () => {
    const scope = createScope();
    const validationOwner = createValidationOwner();
    let binding: ReturnType<typeof useCodeEditorBinding> | undefined;

    render(
      <ScopeContext.Provider value={scope}>
        <ValidationContext.Provider value={validationOwner}>
          <Probe onReady={(value) => (binding = value)} />
        </ValidationContext.Provider>
      </ScopeContext.Provider>,
    );

    expect(binding).toBeTruthy();
    binding?.handleFocus();
    await binding?.handleChange('next');
    binding?.handleBlur();

    expect(validationOwner.visitField).toHaveBeenCalledWith('script');
    expect(scope.update).toHaveBeenCalledWith('script', 'next');
    expect(validationOwner.touchField).toHaveBeenCalledWith('script');
    expect(validationOwner.validateAt).toHaveBeenCalledWith('script', 'change');
    expect(validationOwner.validateAt).toHaveBeenCalledWith('script', 'blur');
    expect(scope.store.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it('does not keep scope fallback subscribed when a form owner exists', () => {
    const scope = createScope();
    const formSubscribeToPath = vi.fn(() => () => undefined);
    const formSubscribeToSubmitting = vi.fn(() => () => undefined);
    const form = {
      store: {
        subscribeToPath: formSubscribeToPath,
        subscribeToSubmitting: formSubscribeToSubmitting,
        getState: () => ({
          values: { script: 'from-form' },
          fieldStates: {},
          submitting: false,
          submitAttempted: false,
        }),
      },
      visitField: vi.fn(),
      touchField: vi.fn(),
      validateField: vi.fn(async () => ({ ok: true, errors: [] })),
      setValue: vi.fn(),
    } as any;

    render(
      <ScopeContext.Provider value={scope}>
        <FormContext.Provider value={form}>
          <ValidationContext.Provider value={createValidationOwner()}>
            <Probe onReady={() => undefined} />
          </ValidationContext.Provider>
        </FormContext.Provider>
      </ScopeContext.Provider>,
    );

    expect(formSubscribeToPath).toHaveBeenCalledWith('script', expect.any(Function));
    expect(formSubscribeToSubmitting).toHaveBeenCalledWith(expect.any(Function));
    expect(scope.store.subscribe).not.toHaveBeenCalled();
  });
});
