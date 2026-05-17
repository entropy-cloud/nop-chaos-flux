import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { FragmentLabPage } from './fragment-lab-page';
import { TabsLabPage } from './tabs-lab-page';
import { LoopLabPage } from './loop-lab-page';

afterEach(() => {
  cleanup();
});

describe('layout content lab pages', () => {
  it('renders fragment scenario body content', async () => {
    render(<FragmentLabPage />);

    expect(await screen.findByText('Parent scope: topLevel = "parent-value"')).toBeTruthy();
    expect(screen.getByText('Fragment greeting: Hello from fragment scope')).toBeTruthy();
    expect(screen.getByText('Fragment count: 5')).toBeTruthy();
  });

  it('renders tabs scenario active panel body content', async () => {
    render(<TabsLabPage />);

    expect(await screen.findByText('Project status: In Progress')).toBeTruthy();
    expect(screen.getAllByRole('tab', { name: 'Overview' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tab', { name: 'Team' }).length).toBeGreaterThan(0);
  });

  it('renders loop scenario repeated rows', async () => {
    render(<LoopLabPage />);

    const scenario = await screen.findByTestId('scenario-loop-over-a-user-list');
    expect(within(scenario).getByText('1. Alice — Admin')).toBeTruthy();
    expect(within(scenario).getByText('2. Bob — Editor')).toBeTruthy();
    expect(within(scenario).getByText('3. Carol — Viewer')).toBeTruthy();
  });
});
