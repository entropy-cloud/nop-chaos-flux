import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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

    rerender(<CodeDialog open={true} onClose={() => undefined} onSave={() => undefined} />);

    expect(screen.getByLabelText('Code Name *')).toBeTruthy();
    expect(screen.getByLabelText('Value Field *')).toBeTruthy();

    resetFluxI18n();
  });
});
