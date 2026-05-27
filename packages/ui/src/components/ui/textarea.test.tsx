import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Textarea } from './textarea.js';

afterEach(() => {
  cleanup();
});

describe('Textarea', () => {
  it('renders as a textbox with slot marker and passes through disabled state', () => {
    render(<Textarea aria-label="Notes" disabled className="custom-textarea" />);

    const textarea = screen.getByRole('textbox', { name: 'Notes' });
    expect(textarea.getAttribute('data-slot')).toBe('textarea');
    expect(textarea).toHaveProperty('disabled', true);
    expect(textarea.className).toContain('custom-textarea');
  });

  it('accepts the React 19 ref prop contract', () => {
    const ref = React.createRef<HTMLTextAreaElement>();

    render(<Textarea ref={ref} aria-label="Notes with ref" />);

    expect(ref.current).toBe(screen.getByRole('textbox', { name: 'Notes with ref' }));
  });
});
