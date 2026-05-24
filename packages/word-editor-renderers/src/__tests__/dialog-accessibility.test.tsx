import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { ChartDialog } from '../dialogs/chart-dialog.js';
import { DatasetDialog } from '../dialogs/dataset-dialog.js';
import { CodeDialog } from '../dialogs/code-dialog.js';

describe('word editor dialog accessibility', () => {
  it('associates labels with chart dialog controls', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    render(<ChartDialog open={true} onClose={() => undefined} onSave={() => undefined} />);

    expect(screen.getByLabelText('Chart Name *')).toBeTruthy();
    expect(screen.getByLabelText('Chart Type')).toBeTruthy();
  });

  it('associates labels with dataset and code dialog controls', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const { rerender } = render(
      <DatasetDialog open={true} onClose={() => undefined} onSave={() => undefined} />,
    );

    expect(screen.getByLabelText('Name *')).toBeTruthy();
    expect(screen.getByLabelText('Type')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add Column' }));
    expect(screen.getByPlaceholderText('Column description')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove column 1' })).toBeTruthy();

    rerender(<CodeDialog open={true} onClose={() => undefined} onSave={() => undefined} />);

    expect(screen.getByLabelText('Code Name *')).toBeTruthy();
    expect(screen.getByLabelText('Value Field *')).toBeTruthy();

    resetFluxI18n();
  });

  it('keeps chart/code save disabled until core-required fields are present', async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');

    const { rerender } = render(
      <ChartDialog open={true} onClose={() => undefined} onSave={() => undefined} />,
    );

    const chartSave = screen.getByRole('button', { name: 'Save' });
    expect(chartSave).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Chart Name *'), { target: { value: 'Revenue' } });
    fireEvent.change(screen.getByLabelText('Dataset ID'), { target: { value: 'orders' } });
    fireEvent.change(screen.getByLabelText('Category Field'), { target: { value: 'month' } });
    fireEvent.change(screen.getByLabelText('Value Fields'), { target: { value: 'amount' } });
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();

    rerender(<CodeDialog open={true} onClose={() => undefined} onSave={() => undefined} />);
    const codeSave = screen.getByRole('button', { name: 'Save' });
    expect(codeSave).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Code Name *'), { target: { value: 'QR' } });
    fireEvent.change(screen.getByLabelText('Dataset ID'), { target: { value: 'orders' } });
    fireEvent.change(screen.getByLabelText('Value Field *'), { target: { value: 'id' } });
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });
});
