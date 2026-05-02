import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  useAsyncSequencer,
  buildDetailDraftInitialValues,
  readDetailDraftValues,
  useDetailChildValidationContract,
  useDetailDraftControllerState,
} from './detail-draft-controller';

describe('detail draft controller helpers', () => {
  it('builds initial values from object, scalar, and fallback inputs', () => {
    expect(buildDetailDraftInitialValues({ street: 'Main' })).toEqual({ street: 'Main' });
    expect(buildDetailDraftInitialValues('Ada')).toEqual({ __value: 'Ada' });
    expect(buildDetailDraftInitialValues(undefined, { city: 'Paris' })).toEqual({ city: 'Paris' });
  });

  it('reads draft values without reserved $form binding', () => {
    const draftForm = {
      scope: {
        readOwn() {
          return { $form: { id: 'x' }, __value: 'Ada' };
        },
      },
    } as any;

    expect(readDetailDraftValues(draftForm)).toEqual({
      draftValues: { __value: 'Ada' },
      workingValue: 'Ada',
    });
  });
});

function DraftControllerHarness() {
  const controller = useDetailDraftControllerState();

  return (
    <div>
      <span data-testid="open">{String(controller.open)}</span>
      <span data-testid="error">{controller.draftError ?? ''}</span>
      <span data-testid="confirming">{String(controller.confirming)}</span>
      <button type="button" onClick={() => controller.openDraft({ dispose: vi.fn() } as any)}>
        open
      </button>
      <button type="button" onClick={() => controller.setDraftErrorSafe('boom')}>
        set-error
      </button>
      <button type="button" onClick={() => controller.beginConfirm()}>
        begin-confirm
      </button>
      <button type="button" onClick={controller.finishConfirm}>
        finish-confirm
      </button>
      <button type="button" onClick={controller.closeDraft}>
        close
      </button>
    </div>
  );
}

describe('useDetailDraftControllerState', () => {
  it('opens and closes draft state while clearing draft errors', () => {
    cleanup();
    render(<DraftControllerHarness />);

    expect(screen.getByTestId('open').textContent).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('open').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'set-error' }));
    expect(screen.getByTestId('error').textContent).toBe('boom');

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.getByTestId('open').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('clears confirming state when closeDraft invalidates an active confirm session', () => {
    cleanup();
    render(<DraftControllerHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(screen.getByRole('button', { name: 'begin-confirm' }));

    expect(screen.getByTestId('confirming').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'close' }));

    expect(screen.getByTestId('open').textContent).toBe('false');
    expect(screen.getByTestId('confirming').textContent).toBe('false');
  });

  it('disposes the previous draft form when a new draft replaces it', () => {
    cleanup();
    const firstDispose = vi.fn();
    const secondDispose = vi.fn();

    function ReplaceDraftHarness() {
      const controller = useDetailDraftControllerState();

      return (
        <div>
          <button
            type="button"
            onClick={() => controller.openDraft({ dispose: firstDispose } as any)}
          >
            open-first
          </button>
          <button
            type="button"
            onClick={() => controller.openDraft({ dispose: secondDispose } as any)}
          >
            open-second
          </button>
          <button type="button" onClick={controller.closeDraft}>
            close
          </button>
        </div>
      );
    }

    render(<ReplaceDraftHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'open-first' }));
    fireEvent.click(screen.getByRole('button', { name: 'open-second' }));

    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(secondDispose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'close' }));

    expect(secondDispose).toHaveBeenCalledTimes(1);
  });

  it('opening a newer draft clears confirming state from an older session', () => {
    cleanup();

    function ReplaceWhileConfirmingHarness() {
      const controller = useDetailDraftControllerState();

      return (
        <div>
          <span data-testid="confirming">{String(controller.confirming)}</span>
          <button type="button" onClick={() => controller.openDraft({ dispose: vi.fn() } as any)}>
            open-first
          </button>
          <button type="button" onClick={() => controller.beginConfirm()}>
            begin-confirm
          </button>
          <button type="button" onClick={() => controller.openDraft({ dispose: vi.fn() } as any)}>
            open-second
          </button>
        </div>
      );
    }

    render(<ReplaceWhileConfirmingHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'open-first' }));
    fireEvent.click(screen.getByRole('button', { name: 'begin-confirm' }));
    expect(screen.getByTestId('confirming').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'open-second' }));

    expect(screen.getByTestId('confirming').textContent).toBe('false');
  });
});

describe('useAsyncSequencer', () => {
  it('invalidates older tokens after advancing or explicit invalidation', () => {
    function SequencerHarness() {
      const sequencer = useAsyncSequencer();
      const first = sequencer.nextToken();
      const second = sequencer.nextToken();
      const beforeInvalidate = sequencer.isCurrent(second);
      sequencer.invalidate();
      const afterInvalidate = sequencer.isCurrent(second);

      return (
        <div>
          <span data-testid="first-current">{String(sequencer.isCurrent(first))}</span>
          <span data-testid="second-before">{String(beforeInvalidate)}</span>
          <span data-testid="second-after">{String(afterInvalidate)}</span>
        </div>
      );
    }

    render(<SequencerHarness />);

    expect(screen.getByTestId('first-current').textContent).toBe('false');
    expect(screen.getByTestId('second-before').textContent).toBe('true');
    expect(screen.getByTestId('second-after').textContent).toBe('false');
  });
});

function ChildContractHarness(props: {
  parentValidationOwner: {
    registerChildContract: ReturnType<typeof vi.fn>;
    unregisterChildContract: ReturnType<typeof vi.fn>;
  };
  draftForm: any;
  active: boolean;
}) {
  useDetailChildValidationContract({
    parentValidationOwner: props.parentValidationOwner as any,
    draftForm: props.draftForm,
    childOwnerId: 'detail-child',
    mode: 'summary-gate',
    active: props.active,
  });

  return null;
}

describe('useDetailChildValidationContract', () => {
  it('registers and unregisters an active child contract', () => {
    const parentValidationOwner = {
      registerChildContract: vi.fn(),
      unregisterChildContract: vi.fn(),
    };
    const draftForm = {
      getScopeState: vi.fn(() => ({
        ready: true,
        validating: false,
        valid: true,
        hasErrors: false,
      })),
      validateAll: vi.fn(async () => ({ ok: true, errors: [], fieldErrors: {} })),
    };

    const { unmount } = render(
      <ChildContractHarness
        parentValidationOwner={parentValidationOwner}
        draftForm={draftForm}
        active={true}
      />,
    );

    expect(parentValidationOwner.registerChildContract).toHaveBeenCalledTimes(1);
    const registration = parentValidationOwner.registerChildContract.mock.calls[0]?.[0];
    expect(registration).toMatchObject({
      childOwnerId: 'detail-child',
      mode: 'summary-gate',
      active: true,
    });

    unmount();

    expect(parentValidationOwner.unregisterChildContract).toHaveBeenCalledWith('detail-child');
  });
});
