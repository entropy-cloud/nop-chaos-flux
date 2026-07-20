import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CalendarResourceGroup } from './calendar-resource-group.js';

describe('CalendarResourceGroup', () => {
  it('should render group header with toggle button', () => {
    const onToggle = vi.fn();
    const group = { id: 'g1', text: 'Group A', title: 'Group A' };

    const { getByText, getByTestId } = render(
      <CalendarResourceGroup group={group} level={0} open={true} onToggle={onToggle}>
        <div data-testid="child-content">Child</div>
      </CalendarResourceGroup>,
    );

    expect(getByText('Group A')).toBeTruthy();
    expect(getByTestId('child-content')).toBeTruthy();
  });

  it('should show children when open', () => {
    const onToggle = vi.fn();
    const group = { id: 'g1', text: 'Group A' };

    const { container } = render(
      <CalendarResourceGroup group={group} level={0} open={true} onToggle={onToggle}>
        <div data-testid="child-content">Child</div>
      </CalendarResourceGroup>,
    );

    expect(container.querySelector('[data-open="true"]')).toBeTruthy();
    expect(container.querySelector('[data-open="false"]')).toBeFalsy();
  });

  it('should hide children when closed', () => {
    const onToggle = vi.fn();
    const group = { id: 'g1', text: 'Group A' };

    const { container } = render(
      <CalendarResourceGroup group={group} level={0} open={false} onToggle={onToggle}>
        <div data-testid="child-content">Child</div>
      </CalendarResourceGroup>,
    );

    expect(container.querySelector('[data-open="false"]')).toBeTruthy();
  });

  it('should call onToggle when chevron clicked', () => {
    const onToggle = vi.fn();
    const group = { id: 'g1', text: 'Group A' };

    const { container } = render(
      <CalendarResourceGroup group={group} level={0} open={true} onToggle={onToggle} />,
    );

    const toggleBtn = container.querySelector('[data-slot="calendar-group-toggle"]');
    expect(toggleBtn).toBeTruthy();
    fireEvent.click(toggleBtn!);
    expect(onToggle).toHaveBeenCalledWith('g1');
  });

  it('should show sub-resource count when resources present', () => {
    const onToggle = vi.fn();
    const group = { id: 'g1', text: 'Group A', resources: [{ id: 'c1', text: 'Child 1' }, { id: 'c2', text: 'Child 2' }] };

    const { getByText } = render(
      <CalendarResourceGroup group={group} level={0} open={true} onToggle={onToggle} />,
    );

    expect(getByText('(2 个子组)')).toBeTruthy();
  });
});
