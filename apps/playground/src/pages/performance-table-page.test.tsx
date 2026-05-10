// @vitest-environment happy-dom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
