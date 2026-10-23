import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Unit-level harness for the inline commit failure path (mirrors
// detail-revalidation.test.tsx): parentForm.validateField is mocked to fail so
// rollback + stay-editing + touchField (error visibility via FieldFrame) can be
// asserted deterministically.
const state = vi.hoisted(() => ({
  parentForm: undefined as any,
  runtime: undefined as any,
  renderScope: undefined as any,
  scopeValue: undefined as unknown,
  validationOwner: undefined as any,
}));

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return {
    ...actual,
    useCurrentForm: () => state.parentForm,
    useRendererRuntime: () => state.runtime,
    useRenderScope: () => state.renderScope,
    useScopeSelector: () => state.scopeValue,
    useCurrentValidationScope: () => state.validationOwner,
    useCurrentFormState: () => 'Pilot',
  };
});

const { DetailFieldRenderer } = await import('./detail-field.js');

function baseProps() {
  return {
    id: 'detail',
    path: '$.body[0]',
    schema: { type: 'detail-field' },
    templateNode: { validationOwnerPlan: undefined, validationPlan: undefined },
    node: {},
    meta: {},
    regions: {},
    events: {},
    helpers: {},
    props: {
      name: 'nickname',
      label: 'Nickname',
      editable: true,
    },
  } as any;
}

describe('detail-field inline commit failure (G2I)', () => {
  it('rolls back the writeback, keeps editing, and touches the field when parent validation fails', async () => {
    state.parentForm = {
      setValue: vi.fn(),
      validateField: vi.fn(async () => ({
        ok: false,
        errors: [{ path: 'nickname', message: 'Nickname is required', rule: 'required' }],
        fieldErrors: { nickname: [{ path: 'nickname', message: 'Nickname is required', rule: 'required' }] },
      })),
      touchField: vi.fn(),
    };
    state.runtime = { env: { notify: vi.fn() } };
    state.renderScope = { update: vi.fn() };

    const props = baseProps();
    const { container } = render(<DetailFieldRenderer {...props} />);

    const viewer = container.querySelector('[data-slot="detail-field-viewer"]');
    expect(viewer).toBeTruthy();
    fireEvent.click(viewer!);

    const input = container.querySelector('[data-slot="detail-field-inline-editor"] input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('Pilot');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(state.parentForm.setValue).toHaveBeenNthCalledWith(1, 'nickname', '');
      expect(state.parentForm.setValue).toHaveBeenNthCalledWith(2, 'nickname', 'Pilot');
      expect(state.parentForm.touchField).toHaveBeenCalledWith('nickname');
      // stays in editing mode after the failed commit, error text visible
      expect(container.querySelector('[data-slot="detail-field-inline-editor"]')).toBeTruthy();
      const errorNode = container.querySelector('[data-slot="detail-field-inline-error"]');
      expect(errorNode?.textContent).toBe('Nickname is required');
      expect((container.querySelector('[data-slot="detail-field-inline-editor"] input') as HTMLInputElement)
        .getAttribute('aria-describedby')).toBe('nickname-inline-error');
    });

    cleanup();
    state.parentForm = undefined;
    state.runtime = undefined;
    state.renderScope = undefined;
  });
});
