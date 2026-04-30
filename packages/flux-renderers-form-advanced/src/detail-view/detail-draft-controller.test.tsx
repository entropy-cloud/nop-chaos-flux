import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDetailDraftInitialValues,
  readDetailDraftValues,
  useDetailDraftControllerState
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
        }
      }
    } as any;

    expect(readDetailDraftValues(draftForm)).toEqual({
      draftValues: { __value: 'Ada' },
      workingValue: 'Ada'
    });
  });
});

function DraftControllerHarness() {
  const controller = useDetailDraftControllerState();

  return (
    <div>
      <span data-testid="open">{String(controller.open)}</span>
      <span data-testid="error">{controller.draftError ?? ''}</span>
      <button
        type="button"
        onClick={() => controller.openDraft({ dispose: vi.fn() } as any)}
      >
        open
      </button>
      <button type="button" onClick={() => controller.setDraftErrorSafe('boom')}>set-error</button>
      <button type="button" onClick={controller.closeDraft}>close</button>
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
});
