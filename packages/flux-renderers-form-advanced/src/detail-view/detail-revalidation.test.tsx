import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  parentForm: undefined as any,
  parentValidationOwner: undefined as any,
  runtime: undefined as any,
  draftState: undefined as any,
  runTransformOutResult: undefined as unknown,
  renderScope: undefined as any,
}));

vi.mock('@nop-chaos/flux-react', () => ({
  resolveRendererSlotContent: () => undefined,
  useCurrentForm: () => state.parentForm,
  useRendererRuntime: () => state.runtime,
  useRenderScope: () => state.renderScope,
  useScopeSelector: () => undefined,
  useCurrentValidationScope: () => state.parentValidationOwner,
  useCurrentFormState: () => 'initial',
}));

vi.mock('@nop-chaos/ui', () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props} />,
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}));

vi.mock('@nop-chaos/flux-renderers-form', () => ({
  formLabelFieldRule: undefined,
  resolveFieldLabelContent: () => undefined,
  FieldLabel: () => null,
  useFieldPresentation: () => ({ effectiveDisabled: false }),
}));

vi.mock('./detail-surface', () => ({
  DetailSurface: (props: { open: boolean; footer?: React.ReactNode; children?: React.ReactNode }) =>
    props.open ? (
      <div>
        {props.children}
        {props.footer}
      </div>
    ) : null,
  DetailDraftBody: (props: { children?: React.ReactNode }) => <div>{props.children}</div>,
  DetailDraftFooter: (props: {
    error?: string | null;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => (
    <div>
      {props.error ? <span>{props.error}</span> : null}
      <button type="button" onClick={props.onConfirm}>
        Confirm
      </button>
      <button type="button" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock('./detail-draft-controller', () => ({
  buildDetailDraftInitialValues: vi.fn(),
  readDetailDraftValues: () => ({ workingValue: { title: 'Changed' } }),
  useDetailAdaptationAction: () => vi.fn(),
  useDetailChildValidationContract: vi.fn(),
  useDetailDraftControllerState: () => state.draftState,
}));

vi.mock('./value-adaptation-helper', () => ({
  publishValidateResultErrors: vi.fn(),
  runTransformIn: vi.fn(),
  runTransformOut: () => Promise.resolve(state.runTransformOutResult),
  runValidate: () => Promise.resolve({ valid: true }),
}));

import { DetailFieldRenderer } from './detail-field.js';
import { DetailViewRenderer } from './detail-view.js';

afterEach(() => {
  cleanup();
  state.parentForm = undefined;
  state.parentValidationOwner = undefined;
  state.renderScope = undefined;
  vi.clearAllMocks();
});

function createDraftState() {
  return {
    open: true,
    draftForm: { validateAll: vi.fn(async () => ({ ok: true, errors: [], fieldErrors: {} })) },
    confirming: false,
    draftError: null,
    mountedRef: { current: true },
    openDraft: vi.fn(),
    closeDraft: vi.fn(),
    beginConfirm: vi.fn(() => 1),
    finishConfirm: vi.fn(),
    setDraftErrorSafe: vi.fn(),
    openSequencer: { nextToken: vi.fn(() => 1), isCurrent: vi.fn(() => true) },
    confirmSequencer: { isCurrent: vi.fn(() => true) },
  };
}

function createBaseProps() {
  return {
    id: 'detail',
    path: '$.body[0]',
    schema: { type: 'detail' },
    templateNode: { validationOwnerPlan: undefined, validationPlan: undefined },
    node: {},
    meta: {},
    regions: {},
    events: {},
    helpers: {},
  } as any;
}

describe('detail renderer revalidation handling', () => {
  it('keeps detail-field open when parent validateField fails after writeback', async () => {
    state.draftState = createDraftState();
    state.runtime = { createFormRuntime: vi.fn() };
    state.parentForm = {
      setValue: vi.fn(),
      touchField: vi.fn(),
      validateField: vi.fn(async () => ({
        ok: false,
        errors: [{ path: 'address', message: 'Address is required', rule: 'required' }],
        fieldErrors: { address: [{ path: 'address', message: 'Address is required', rule: 'required' }] },
      })),
    };
    state.runTransformOutResult = '';

    render(
      <DetailFieldRenderer
        {...createBaseProps()}
        props={{ name: 'address', triggerLabel: 'Edit Address', surface: { mode: 'dialog' } }}
      />,
    );

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(state.draftState.setDraftErrorSafe).toHaveBeenCalledWith('Address is required');
      expect(state.draftState.closeDraft).not.toHaveBeenCalled();
    });
  });

  it('keeps detail-view open when parent validateSubtree fails after writeback', async () => {
    state.draftState = createDraftState();
    state.runtime = { createFormRuntime: vi.fn() };
    state.renderScope = { update: vi.fn(), merge: vi.fn() };
    state.parentForm = {
      setValue: vi.fn(),
      validateSubtree: vi.fn(async () => ({
        ok: false,
        errors: [{ path: 'summary.title', message: 'Title is required', rule: 'required' }],
        fieldErrors: {
          'summary.title': [{ path: 'summary.title', message: 'Title is required', rule: 'required' }],
        },
      })),
      validateAll: vi.fn(async () => ({ ok: true, errors: [], fieldErrors: {} })),
    };
    state.runTransformOutResult = { title: '' };

    render(
      <DetailViewRenderer
        {...createBaseProps()}
        props={{ scopePath: 'summary', triggerLabel: 'Edit Summary', surface: { mode: 'dialog' } }}
      />,
    );

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(state.draftState.setDraftErrorSafe).toHaveBeenCalledWith('Title is required');
      expect(state.draftState.closeDraft).not.toHaveBeenCalled();
    });
  });

  it('keeps detail-view open when non-form owner validateSubtree fails after scope writeback', async () => {
    state.draftState = createDraftState();
    state.runtime = { createFormRuntime: vi.fn() };
    state.parentForm = undefined;
    state.renderScope = { update: vi.fn(), merge: vi.fn() };
    state.parentValidationOwner = {
      validateSubtree: vi.fn(async () => ({
        ok: false,
        errors: [{ path: 'summary.title', message: 'Title is required', rule: 'required' }],
        fieldErrors: {
          'summary.title': [{ path: 'summary.title', message: 'Title is required', rule: 'required' }],
        },
      })),
      validateAll: vi.fn(async () => ({ ok: true, errors: [], fieldErrors: {} })),
    };
    state.runTransformOutResult = { title: '' };

    render(
      <DetailViewRenderer
        {...createBaseProps()}
        props={{ scopePath: 'summary', triggerLabel: 'Edit Summary', surface: { mode: 'dialog' } }}
      />,
    );

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(state.renderScope.update).toHaveBeenCalledWith('summary', { title: '' });
      expect(state.parentValidationOwner.validateSubtree).toHaveBeenCalledWith('summary', 'commit');
      expect(state.draftState.setDraftErrorSafe).toHaveBeenCalledWith('Title is required');
      expect(state.draftState.closeDraft).not.toHaveBeenCalled();
    });
  });

  it('keeps detail-field open when non-form owner validateSubtree fails after scope writeback', async () => {
    state.draftState = createDraftState();
    state.runtime = { createFormRuntime: vi.fn() };
    state.parentForm = undefined;
    state.renderScope = { update: vi.fn(), merge: vi.fn() };
    state.parentValidationOwner = {
      validateSubtree: vi.fn(async () => ({
        ok: false,
        errors: [{ path: 'address.street', message: 'Street is required', rule: 'required' }],
        fieldErrors: {
          'address.street': [{ path: 'address.street', message: 'Street is required', rule: 'required' }],
        },
      })),
      applyExternalErrors: vi.fn(),
    };
    state.runTransformOutResult = '';

    render(
      <DetailFieldRenderer
        {...createBaseProps()}
        props={{ name: 'address', triggerLabel: 'Edit Address', surface: { mode: 'dialog' } }}
      />,
    );

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(state.renderScope.update).toHaveBeenCalledWith('address', '');
      expect(state.parentValidationOwner.validateSubtree).toHaveBeenCalledWith('address', 'commit');
      expect(state.draftState.setDraftErrorSafe).toHaveBeenCalledWith('Street is required');
      expect(state.draftState.closeDraft).not.toHaveBeenCalled();
    });
  });
});
