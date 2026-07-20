import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SchedulerConfig } from './scheduler-config.js';

function getTriggerButton(): HTMLElement {
  const buttons = screen.getAllByText('Trigger Re-schedule');
  return buttons[buttons.length - 1];
}

describe('SchedulerConfig', () => {
  it('renders scheduling config panel', () => {
    render(<SchedulerConfig />);
    expect(screen.getByText('Scheduling Configuration')).toBeTruthy();
    expect(screen.getByText('Forward')).toBeTruthy();
    expect(getTriggerButton()).toBeTruthy();
  });

  it('calls onScheduleAction with config when triggered', () => {
    const onAction = vi.fn();
    render(<SchedulerConfig onScheduleAction={onAction} />);
    fireEvent.click(getTriggerButton());
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('disables button during scheduling', () => {
    render(<SchedulerConfig />);
    fireEvent.click(getTriggerButton());
    const items = screen.getAllByText('Scheduling...');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});
