import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { DataSourceLabPage } from './data-source-lab-page';

afterEach(() => {
  cleanup();
});

describe('DataSourceLabPage', () => {
  it('renders preloaded users with loop slot bindings', async () => {
    render(<DataSourceLabPage />);

    expect(
      await screen.findByText('Users loaded via page data: 3', {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.getByText('bob')).toBeTruthy();
    expect(screen.getByText('carol')).toBeTruthy();
    expect(screen.getByText('admin')).toBeTruthy();
    expect(screen.getByText('editor')).toBeTruthy();
    expect(screen.getByText('viewer')).toBeTruthy();
  });

  it('renders empty state safely when the sandbox data-source resolves to null', async () => {
    render(<DataSourceLabPage />);

    const sandboxScenario = screen.getAllByTestId('scenario-real-data-source-schema-empty-in-sandbox')[0];
    expect(within(sandboxScenario).getByText('Users loaded: 0')).toBeTruthy();
  });
});
