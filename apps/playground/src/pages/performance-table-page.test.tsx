// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
import { PerformanceTablePage } from './performance-table-page';

describe('PerformanceTablePage', () => {
  it('writes ping actions back to page scope from row actions', async () => {
    render(<PerformanceTablePage onBack={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Full Stress' }));

    const pingButton = await screen.findAllByRole('button', { name: 'Ping' });
    fireEvent.click(pingButton[0]);

    await waitFor(() => {
      const text = screen.getByText(/^Last action:/).textContent ?? '';
      expect(text).not.toBe('Last action: none');
      expect(text.startsWith('Last action: ping:')).toBe(true);
    }, { timeout: 30000 });
  }, 35000);

  it('keeps full stress nested loops free of render errors after host mutations', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      render(
        <React.StrictMode>
          <PerformanceTablePage onBack={() => undefined} />
        </React.StrictMode>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Full Stress' }));

      await waitFor(() => {
        expect(screen.getByText('Scenario B: Nested loop card list')).toBeTruthy();
        expect(screen.getAllByText('Primary: editor-offline').length).toBeGreaterThan(0);
      }, { timeout: 30000 });

      fireEvent.click(screen.getByRole('button', { name: 'Run 20 Host Mutations' }));

      await waitFor(() => {
        expect(screen.getByText('Last Measurement')).toBeTruthy();
      }, { timeout: 90000 });

      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  }, 95000);
});
