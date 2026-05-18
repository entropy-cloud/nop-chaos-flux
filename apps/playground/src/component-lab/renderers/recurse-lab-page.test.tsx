import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecurseLabPage } from './recurse-lab-page';

describe('RecurseLabPage', () => {
  it('renders recurse scenarios without expression errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <React.StrictMode>
        <RecurseLabPage />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByText('Root A')).toBeTruthy();
      expect(screen.getByText('Child A1')).toBeTruthy();
      expect(screen.getByText('Child A2')).toBeTruthy();
      expect(screen.getByText('Child B1')).toBeTruthy();
      expect(screen.getByText('Acme Corp')).toBeTruthy();
      expect(screen.getByText('Engineering')).toBeTruthy();
      expect(screen.getByText('Frontend')).toBeTruthy();
    });

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
    cleanup();
  });
});
