import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataViewer } from './json-viewer.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// WA-ui-005: YAML serialization failure used to swallow into an empty string —
// a blank pane indistinguishable from empty data, with zero observability.

describe('WA-ui-005 — DataViewer YAML serialization failure observability', () => {
  it('renders an error placeholder (not a blank pane) when the data cannot be serialized', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<DataViewer data={{ bad: Symbol('broken') }} />);
    fireEvent.click(screen.getByText('YAML'));

    expect(screen.getByText('Failed to serialize the data as YAML.')).toBeTruthy();
    expect(warn).toHaveBeenCalled();
  });

  it('still renders YAML for serializable data', () => {
    render(<DataViewer data={{ ok: true }} />);
    fireEvent.click(screen.getByText('YAML'));

    expect(screen.getByText(/ok: true/)).toBeTruthy();
  });
});
