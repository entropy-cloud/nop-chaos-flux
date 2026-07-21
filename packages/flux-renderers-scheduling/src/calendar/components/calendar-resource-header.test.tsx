import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CalendarResourceHeader } from './calendar-resource-header.js';

describe('CalendarResourceHeader', () => {
  it('should render resource title', () => {
    const resource = { id: 'r1', title: 'Resource A', text: '' };
    render(React.createElement(CalendarResourceHeader, { resource }));
    expect(screen.getByText('Resource A')).toBeTruthy();
  });

  it('should fall back to text when title is empty', () => {
    const resource = { id: 'r1', title: '', text: 'Fallback Text' };
    render(React.createElement(CalendarResourceHeader, { resource }));
    expect(screen.getByText('Fallback Text')).toBeTruthy();
  });

  it('should render with data-slot marker', () => {
    const resource = { id: 'r1', title: 'Test', text: '' };
    const { container } = render(React.createElement(CalendarResourceHeader, { resource }));
    expect(container.querySelector('[data-slot="calendar-resource-header"]')).toBeTruthy();
  });

  it('should render avatar when available', () => {
    const resource = { id: 'r1', title: 'User', text: '', avatar: 'https://example.com/avatar.png' };
    const { container } = render(React.createElement(CalendarResourceHeader, { resource }));
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/avatar.png');
  });

  it('should render type badge when available', () => {
    const resource = { id: 'r1', title: 'User', text: '', type: 'manager' };
    const { container } = render(React.createElement(CalendarResourceHeader, { resource }));
    expect(container.textContent).toContain('manager');
  });
});
