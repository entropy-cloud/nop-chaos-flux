// @vitest-environment happy-dom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { DatasetDialog } from '../dialogs/dataset-dialog.js';

describe('DatasetDialog column validation', () => {
  beforeEach(async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
  });

  it('blocks saving while a column has an empty label', () => {
    const onSave = vi.fn();

    render(<DatasetDialog open={true} onClose={() => undefined} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText('Enter dataset name'), {
      target: { value: 'orders' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Column' }));
    fireEvent.change(screen.getByPlaceholderText('Column name'), {
      target: { value: 'amount' },
    });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Column label'), {
      target: { value: 'Amount' },
    });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'orders',
        columns: [expect.objectContaining({ name: 'amount', label: 'Amount' })],
      }),
    );
  });

  it('blocks saving while a column has an empty name', () => {
    const onSave = vi.fn();

    render(<DatasetDialog open={true} onClose={() => undefined} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText('Enter dataset name'), {
      target: { value: 'orders' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Column' }));
    fireEvent.change(screen.getByPlaceholderText('Column label'), {
      target: { value: 'Amount' },
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
