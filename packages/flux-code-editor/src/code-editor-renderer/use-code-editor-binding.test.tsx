import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ScopeContext, ValidationContext } from '@nop-chaos/flux-react/unstable';
import { useCodeEditorBinding } from './use-code-editor-binding.js';

function createScope() {
  return {
    id: 'page',
    path: '$page',
    get: vi.fn(() => ''),
    has: vi.fn(() => true),
    readOwn: vi.fn(() => ({ script: '' })),
    readVisible: vi.fn(() => ({ script: '' })),
    materializeVisible: vi.fn(() => ({ script: '' })),
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
  });
});
