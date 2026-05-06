import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataSourceLabPage } from './data-source-lab-page';

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

    expect(await screen.findByText('Users loaded: 0', {}, { timeout: 10000 })).toBeTruthy();
  });
});
