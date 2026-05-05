import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { CompiledFormValidationModel } from '@nop-chaos/flux-core';
import { FormContext, FormLayoutContext, ValidationContext } from './contexts';
import { FieldFrame } from './field-frame';
import { EMPTY_FORM_STORE_STATE } from './form-state';

function createMockForm(overrides?: Record<string, unknown>) {
  return {
    store: {
      subscribe: () => () => undefined,
      getState: () => EMPTY_FORM_STORE_STATE,
    },
    validation: undefined,
    ...overrides,
  } as any;
}

const dynamicRequiredValidation = {
  order: ['email'],
  behavior: { triggers: ['blur'], showErrorOn: ['touched'] },
  dependents: { 'contact.method': ['email'], 'contact.enabled': ['email'] },
  nodes: {
    email: {
      path: 'email',
      kind: 'field',
      controlType: 'input-text',
      rules: [
        {
          id: 'required-when-email',
          rule: {
            kind: 'requiredWhen',
            path: 'contact.method',
            equals: 'email',
            message: 'Required',
          },
          dependencyPaths: ['contact.method'],
        },
        {
          id: 'required-unless-disabled',
          rule: {
            kind: 'requiredUnless',
            path: 'contact.enabled',
            equals: false,
            message: 'Required',
          },
          dependencyPaths: ['contact.enabled'],
        },
      ],
      behavior: { triggers: ['blur'], showErrorOn: ['touched'] },
      children: [],
    },
  },
} as const satisfies CompiledFormValidationModel;

describe('FieldFrame — form layout context', () => {
  it('uses data-label-align="top" by default (normal mode, no context)', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FieldFrame name="f1" label="Name">
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    const field = container.querySelector('.nop-field');
    expect(field?.getAttribute('data-label-align')).toBe('top');
    expect(field?.getAttribute('data-field-mode')).toBe('normal');
  });

  it('uses data-label-align="left" when form context sets horizontal mode', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FormLayoutContext.Provider value={{ mode: 'horizontal' }}>
          <FieldFrame name="f1" label="Name">
            input
          </FieldFrame>
        </FormLayoutContext.Provider>
      </FormContext.Provider>,
    );
    const field = container.querySelector('.nop-field');
    expect(field?.getAttribute('data-label-align')).toBe('left');
    expect(field?.getAttribute('data-field-mode')).toBe('horizontal');
  });

  it('allows per-field labelAlign to override form context', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FormLayoutContext.Provider value={{ mode: 'horizontal' }}>
          <FieldFrame name="f1" label="Name" labelAlign="top">
            input
          </FieldFrame>
        </FormLayoutContext.Provider>
      </FormContext.Provider>,
    );
    const field = container.querySelector('.nop-field');
    expect(field?.getAttribute('data-label-align')).toBe('top');
  });

  it('applies labelWidth as inline style on the label element', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FormLayoutContext.Provider value={{ labelWidth: '120px' }}>
          <FieldFrame name="f1" label="Name">
            input
          </FieldFrame>
        </FormLayoutContext.Provider>
      </FormContext.Provider>,
    );
    const label = container.querySelector('[data-slot="field-label"]');
    expect(label?.getAttribute('style')).toContain('width: 120px');
  });

  it('per-field labelWidth overrides form context labelWidth', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FormLayoutContext.Provider value={{ labelWidth: '120px' }}>
          <FieldFrame name="f1" label="Name" labelWidth="200px">
            input
          </FieldFrame>
        </FormLayoutContext.Provider>
      </FormContext.Provider>,
    );
    const label = container.querySelector('[data-slot="field-label"]');
    expect(label?.getAttribute('style')).toContain('width: 200px');
  });
});

describe('FieldFrame — hint, description, remark, labelRemark', () => {
  it('renders description when no error and no hint', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FieldFrame name="f1" label="Name" description="Helper text">
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    expect(container.querySelector('[data-slot="field-description"]')?.textContent).toBe(
      'Helper text',
    );
  });

  it('renders hint when no error (even if description is present)', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FieldFrame name="f1" label="Name" hint="Focus hint" description="Always text">
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    expect(container.querySelector('[data-slot="field-hint"]')?.textContent).toBe('Focus hint');
    expect(container.querySelector('[data-slot="field-description"]')).toBeNull();
  });

  it('renders error instead of hint and description when validation fails', () => {
    const state = {
      ...EMPTY_FORM_STORE_STATE,
      fieldStates: {
        f1: {
          touched: true,
          errors: [{ path: 'f1', rule: 'required', message: 'Required', sourceKind: 'field' }],
        },
      },
    };
    const form = createMockForm({
      store: { subscribe: () => () => undefined, getState: () => state },
      validation: { behavior: { triggers: ['blur'], showErrorOn: ['touched'] } },
    });

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame name="f1" label="Name" hint="Focus hint" description="Always text">
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    expect(container.querySelector('[data-slot="field-error"]')?.textContent).toBe('Required');
    expect(container.querySelector('[data-slot="field-hint"]')).toBeNull();
    expect(container.querySelector('[data-slot="field-description"]')).toBeNull();
  });

  it('renders remark icon next to the control', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FieldFrame name="f1" label="Name" remark={{ content: 'Tooltip text', icon: '?' }}>
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    const remark = container.querySelector('[data-slot="field-remark"]');
    expect(remark).toBeTruthy();
    expect(remark?.textContent).toBe('?');
    expect(remark?.getAttribute('title')).toBe('Tooltip text');
  });

  it('renders labelRemark icon inside the label', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FieldFrame name="f1" label="Name" labelRemark={{ content: 'Label tip', icon: '!' }}>
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    const labelRemark = container.querySelector('[data-slot="field-label-remark"]');
    expect(labelRemark).toBeTruthy();
    expect(labelRemark?.textContent).toBe('!');
    expect(labelRemark?.getAttribute('title')).toBe('Label tip');
  });

  it('remark and labelRemark are independent of error/hint/description priority', () => {
    const state = {
      ...EMPTY_FORM_STORE_STATE,
      fieldStates: {
        f1: {
          touched: true,
          errors: [{ path: 'f1', rule: 'required', message: 'Required', sourceKind: 'field' }],
        },
      },
    };
    const form = createMockForm({
      store: { subscribe: () => () => undefined, getState: () => state },
      validation: { behavior: { triggers: ['blur'], showErrorOn: ['touched'] } },
    });

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame
          name="f1"
          label="Name"
          remark={{ content: 'Tip' }}
          labelRemark={{ content: 'LabelTip' }}
        >
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    expect(container.querySelector('[data-slot="field-remark"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="field-label-remark"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="field-error"]')).toBeTruthy();
  });
});

describe('FieldFrame — dynamic required subscriptions', () => {
  it('subscribes to dynamic required dependency paths instead of the whole form store', () => {
    const subscribe = () => () => undefined;
    const subscribeToPath = () => () => undefined;
    let capturedPaths: readonly string[] | undefined;

    const form = createMockForm({
      store: {
        subscribe,
        subscribeToPath,
        subscribeToPaths: (paths: readonly string[]) => {
          capturedPaths = paths;
          return () => undefined;
        },
        getState: () => ({
          ...EMPTY_FORM_STORE_STATE,
          values: {
            contact: {
              method: 'email',
              enabled: true,
            },
          },
        }),
      },
      validation: dynamicRequiredValidation,
    });

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame name="email" label="Email">
          input
        </FieldFrame>
      </FormContext.Provider>,
    );

    expect(capturedPaths).toEqual(['contact.method', 'contact.enabled']);
    expect(container.querySelector('[data-slot="field-required"]')?.textContent).toBe('*');
  });

  it('derives dynamic required from validation-owner values outside forms', () => {
    const validationOwner = {
      store: {
        subscribe: () => () => undefined,
        subscribeToPaths: () => () => undefined,
        getState: () => ({
          ...EMPTY_FORM_STORE_STATE,
          values: {
            contact: {
              method: 'email',
              enabled: true,
            },
          },
        }),
      },
      validation: dynamicRequiredValidation,
      getFieldState: () => ({ ownerId: 'owner', path: 'email', errors: [], validating: false }),
      getScopeState: () => ({ ready: true, valid: true, validating: false, hasErrors: false }),
      getScopeRootErrors: () => [],
      isPathOwned: () => true,
      validateAt: async () => ({ ok: true, errors: [] }),
      validateSubtree: async () => ({ ok: true, errors: [] }),
      validateAll: async () => ({ ok: true, errors: [] }),
      applyChangesAndRevalidate: async () => ({ ok: true, errors: [] }),
      applyExternalErrors: () => ({ ready: true, valid: true, validating: false, hasErrors: false }),
      registerField: () => ({ registrationId: 'reg', unregister() {} }),
      updateFieldRegistration: () => undefined,
      notifyFieldHidden: () => undefined,
      refreshCompiledModel: () => undefined,
      dispose: () => undefined,
      registerChildContract: () => undefined,
      unregisterChildContract: () => undefined,
    } as any;

    const { container } = render(
      <ValidationContext.Provider value={validationOwner}>
        <FieldFrame name="email" label="Email">
          input
        </FieldFrame>
      </ValidationContext.Provider>,
    );

    expect(container.querySelector('[data-slot="field-required"]')?.textContent).toBe('*');
  });
});

describe('FieldFrame — ARIA attributes', () => {
  it('error container has role="alert"', () => {
    const state = {
      ...EMPTY_FORM_STORE_STATE,
      fieldStates: {
        f1: {
          touched: true,
          errors: [{ path: 'f1', rule: 'required', message: 'Required', sourceKind: 'field' }],
        },
      },
    };
    const form = createMockForm({
      store: { subscribe: () => () => undefined, getState: () => state },
      validation: { behavior: { triggers: ['blur'], showErrorOn: ['touched'] } },
    });

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame name="f1" label="Name">
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    const errorEl = container.querySelector('[data-slot="field-error"]');
    expect(errorEl?.getAttribute('role')).toBe('alert');
  });

  it('field has aria-required when required', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FieldFrame name="f1" label="Name" required>
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    const field = container.querySelector('.nop-field');
    expect(field?.getAttribute('aria-required')).toBe('true');
  });

  it('field does not have aria-required when not required', () => {
    const { container } = render(
      <FormContext.Provider value={createMockForm()}>
        <FieldFrame name="f1" label="Name">
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    const field = container.querySelector('.nop-field');
    expect(field?.hasAttribute('aria-required')).toBe(false);
  });

  it('control has aria-invalid when error is shown', () => {
    const state = {
      ...EMPTY_FORM_STORE_STATE,
      fieldStates: {
        f1: {
          touched: true,
          errors: [{ path: 'f1', rule: 'required', message: 'Required', sourceKind: 'field' }],
        },
      },
    };
    const form = createMockForm({
      store: { subscribe: () => () => undefined, getState: () => state },
      validation: { behavior: { triggers: ['blur'], showErrorOn: ['touched'] } },
    });

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame name="f1" label="Name">
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    const control = container.querySelector('[data-slot="field-control"]');
    expect(control?.getAttribute('aria-invalid')).toBe('true');
  });

  it('control has aria-describedby pointing to error id when error is shown', () => {
    const state = {
      ...EMPTY_FORM_STORE_STATE,
      fieldStates: {
        f1: {
          touched: true,
          errors: [{ path: 'f1', rule: 'required', message: 'Required', sourceKind: 'field' }],
        },
      },
    };
    const form = createMockForm({
      store: { subscribe: () => () => undefined, getState: () => state },
      validation: { behavior: { triggers: ['blur'], showErrorOn: ['touched'] } },
    });

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame name="f1" label="Name">
          input
        </FieldFrame>
      </FormContext.Provider>,
    );
    const control = container.querySelector('[data-slot="field-control"]');
    const errorEl = container.querySelector('[data-slot="field-error"]');
    expect(control?.getAttribute('aria-describedby')).toBe('f1-error');
    expect(errorEl?.id).toBe('f1-error');
  });

  it('forwards aria chain to the real control element', () => {
    const state = {
      ...EMPTY_FORM_STORE_STATE,
      fieldStates: {
        f1: {
          touched: true,
          errors: [{ path: 'f1', rule: 'required', message: 'Required', sourceKind: 'field' }],
        },
      },
    };
    const form = createMockForm({
      store: { subscribe: () => () => undefined, getState: () => state },
      validation: { behavior: { triggers: ['blur'], showErrorOn: ['touched'] } },
    });

    render(
      <FormContext.Provider value={form}>
        <FieldFrame name="f1" label="Name">
          <input aria-label="Name input" />
        </FieldFrame>
      </FormContext.Provider>,
    );

    const input = document.querySelector('input[aria-label="Name input"]');
    expect(input?.getAttribute('id')).toBe('f1-control');
    expect(input?.getAttribute('aria-describedby')).toBe('f1-error');
    expect(input?.getAttribute('aria-errormessage')).toBe('f1-error');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    const wrapper = document.querySelector('[data-slot="field-control"]');
    expect(wrapper?.getAttribute('id')).toBeNull();
  });
});
