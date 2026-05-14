import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  parentForm: undefined as any,
  parentValidationOwner: undefined as any,
  parentScope: undefined as any,
  projectedOwner: undefined as any,
  validationContextValue: undefined as any,
}));

vi.mock('@nop-chaos/flux-react', () => ({
  FieldFrame: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useCurrentForm: () => state.parentForm,
  useCurrentValidationScope: () => state.parentValidationOwner,
  useRenderScope: () => state.parentScope,
  useScopeSelector: () => ({ kind: 'text', value: 'alpha' }),
  useCurrentFormState: () => undefined,
  toFieldRemarkProps: () => undefined,
}));

vi.mock('@nop-chaos/flux-react/unstable', () => ({
  FormContext: { Provider: ({ children }: { children?: React.ReactNode }) => <>{children}</> },
  ScopeContext: { Provider: ({ children }: { children?: React.ReactNode }) => <>{children}</> },
  ValidationContext: {
    Provider: ({ value, children }: { value: unknown; children?: React.ReactNode }) => {
      state.validationContextValue = value;
      return <>{children}</>;
    },
  },
}));

vi.mock('@nop-chaos/ui', () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  Tabs: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TabsContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@nop-chaos/flux-renderers-form', () => ({
  formFieldRules: [],
  resolveFieldLabelContent: () => undefined,
}));

vi.mock('./variant-field-runtime.js', () => ({
  createVariantFormProxy: vi.fn(() => undefined),
  createVariantScope: vi.fn(() => ({ id: 'variant-scope', path: '$page.kind', get: vi.fn(), has: vi.fn(), readOwn: vi.fn(), readVisible: vi.fn(), materializeVisible: vi.fn(), update: vi.fn(), merge: vi.fn() })),
}));

vi.mock('../detail-view/projected-validation-runtime.js', () => ({
  createProjectedValidationRuntime: vi.fn((owner: unknown) => {
    state.projectedOwner = {
      ...(owner as object),
      scopeId: 'projected-owner',
      getScopeState: vi.fn(() => ({ ready: true, validating: false, valid: true, hasErrors: false })),
      validateAll: vi.fn(async () => ({ ok: true, errors: [], fieldErrors: {} })),
    };
    return state.projectedOwner;
  }),
}));

import { VariantFieldRenderer } from './variant-field.js';

afterEach(() => {
  cleanup();
  state.parentForm = undefined;
  state.parentValidationOwner = undefined;
  state.parentScope = undefined;
  state.projectedOwner = undefined;
  state.validationContextValue = undefined;
  vi.clearAllMocks();
});

describe('variant-field generic owner contracts', () => {
  it('does not register child contracts for default projected form ownership', () => {
    state.parentScope = {
      id: 'form-scope',
      path: '$form',
      get: vi.fn(() => ({ kind: 'text', value: 'alpha' })),
      has: vi.fn(() => true),
      readOwn: vi.fn(() => ({ kind: 'text', value: 'alpha' })),
      readVisible: vi.fn(() => ({ kind: 'text', value: 'alpha' })),
      materializeVisible: vi.fn(() => ({ kind: 'text', value: 'alpha' })),
      update: vi.fn(),
      merge: vi.fn(),
    };
    state.parentForm = {
      scopeId: 'form-owner',
      id: 'form-1',
      name: 'demo',
      store: { getState: vi.fn(() => ({ values: { kind: { value: 'alpha' } } })) },
      getScopeState: vi.fn(() => ({ ready: true, validating: false, valid: true, hasErrors: false })),
      validateAll: vi.fn(async () => ({ ok: true, errors: [], fieldErrors: {} })),
      notifyFieldHidden: vi.fn(),
      registerChildContract: vi.fn(),
      unregisterChildContract: vi.fn(),
      setValue: vi.fn(),
      setValues: vi.fn(),
      getFieldState: vi.fn(),
      validateAt: vi.fn(),
      validateField: vi.fn(),
      validateForm: vi.fn(),
      getField: vi.fn(),
      getDependents: vi.fn(() => []),
      findByPrefix: vi.fn(() => []),
      getChildren: vi.fn(() => []),
      getError: vi.fn(),
      isValidating: vi.fn(() => false),
      isTouched: vi.fn(() => false),
      isDirty: vi.fn(() => false),
      isVisited: vi.fn(() => false),
      touchField: vi.fn(),
      visitField: vi.fn(),
      clearErrors: vi.fn(),
      submit: vi.fn(),
      reset: vi.fn(),
      appendValue: vi.fn(),
      prependValue: vi.fn(),
      insertValue: vi.fn(),
      removeValue: vi.fn(),
      moveValue: vi.fn(),
      swapValue: vi.fn(),
      replaceValue: vi.fn(),
      registerField: vi.fn(),
      updateFieldRegistration: vi.fn(),
      validateSubtree: vi.fn(async () => ({ ok: true, errors: [], fieldErrors: {} })),
    };

    render(
      <VariantFieldRenderer
        id="variant"
        path="$.body[0]"
        schema={{ type: 'variant-field', name: 'kind', variants: [] } as any}
        templateNode={{ validationOwnerPlan: { boundary: 'inherit-owner' } } as any}
        node={{} as any}
        meta={{} as any}
        props={{
          name: 'kind',
          selectorMode: 'tabs',
          variants: [{ key: 'text', label: 'Text', content: [{ type: 'input-text', name: 'value' }] }],
        }}
        regions={{}}
        events={{}}
        helpers={{
          evaluate: vi.fn(),
          createScope: vi.fn(() => state.parentScope),
          dispatch: vi.fn(),
          render: vi.fn(),
          evaluateCompiled: vi.fn(),
          executeSource: vi.fn(),
        } as any}
      />,
    );

    expect(state.parentForm.registerChildContract).not.toHaveBeenCalled();
  });

  it('routes hidden paths and validation context through non-form owners without child contracts', () => {
    state.parentScope = {
      id: 'page-scope',
      path: '$page',
      get: vi.fn(() => ({ kind: 'text', value: 'alpha' })),
      has: vi.fn(() => true),
      readOwn: vi.fn(() => ({ kind: 'text', value: 'alpha' })),
      readVisible: vi.fn(() => ({ kind: 'text', value: 'alpha' })),
      materializeVisible: vi.fn(() => ({ kind: 'text', value: 'alpha' })),
      update: vi.fn(),
      merge: vi.fn(),
    };
    state.parentValidationOwner = {
      scopeId: 'page-owner',
      notifyFieldHidden: vi.fn(),
      registerChildContract: vi.fn(),
      unregisterChildContract: vi.fn(),
      getScopeState: vi.fn(() => ({ ready: true, validating: false, valid: true, hasErrors: false })),
      validateAll: vi.fn(async () => ({ ok: true, errors: [], fieldErrors: {} })),
    };

    render(
      <VariantFieldRenderer
        id="variant"
        path="$.body[0]"
        schema={{ type: 'variant-field', name: 'kind', variants: [] } as any}
        templateNode={{ validationOwnerPlan: { boundary: 'inherit-owner' } } as any}
        node={{} as any}
        meta={{} as any}
        props={{
          name: 'kind',
          selectorMode: 'tabs',
          variants: [
            { key: 'text', label: 'Text', content: [{ type: 'input-text', name: 'value' }] },
            { key: 'number', label: 'Number', content: [{ type: 'input-text', name: 'amount' }] },
          ],
        }}
        regions={{}}
        events={{}}
        helpers={{
          evaluate: vi.fn(),
          createScope: vi.fn(),
          dispatch: vi.fn(),
          render: vi.fn(),
          evaluateCompiled: vi.fn(),
          executeSource: vi.fn(),
        } as any}
      />,
    );

    expect(state.parentValidationOwner.notifyFieldHidden).toHaveBeenCalledWith('kind.amount', true);
    expect(state.parentValidationOwner.registerChildContract).not.toHaveBeenCalled();
    expect(state.validationContextValue).toBe(state.projectedOwner);
  });
});
