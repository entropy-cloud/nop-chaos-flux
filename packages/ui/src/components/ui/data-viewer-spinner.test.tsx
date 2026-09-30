import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stringifySpy = vi.hoisted(() => vi.fn(() => 'key: value\n'));

vi.mock('yaml', () => ({
  stringify: stringifySpy,
}));

import { DataViewer } from './json-viewer.js';
import { Spinner } from './spinner.js';

afterEach(() => {
  cleanup();
  stringifySpy.mockClear();
});

describe('DataViewer yaml laziness (R3-U24)', () => {
  it('does not stringify yaml while the JSON tab is active', () => {
    const { container } = render(<DataViewer data={{ alpha: 1 }} />);

    expect(container.querySelector('.json-viewer')).toBeTruthy();
    expect(container.querySelector('pre')).toBeNull();
    expect(stringifySpy).not.toHaveBeenCalled();
  });

  it('stringifies yaml exactly when the YAML tab is shown', () => {
    const { container } = render(<DataViewer data={{ alpha: 1 }} />);

    fireEvent.click(screen.getByText('YAML'));

    expect(stringifySpy).toHaveBeenCalledTimes(1);
    expect(container.querySelector('pre')?.textContent).toBe('key: value\n');
  });
});

describe('Spinner aria label (R3-U23)', () => {
  it('resolves the default aria-label through the ui i18n fallback table', () => {
    const { container } = render(<Spinner />);

    const spinner = container.querySelector('[role="status"]');
    expect(spinner?.getAttribute('aria-label')).toBe('Loading...');
  });

  it('lets a caller override the aria-label', () => {
    const { container } = render(<Spinner aria-label="Loading dashboard" />);

    const spinner = container.querySelector('[role="status"]');
    expect(spinner?.getAttribute('aria-label')).toBe('Loading dashboard');
  });
});
