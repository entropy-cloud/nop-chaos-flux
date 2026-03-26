import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldHint, FieldLabel } from './index';

describe('shared form renderer primitives', () => {
  it('renders labels with the expected chrome element', () => {
    render(
      <>
        <FieldLabel content="Profile" />
        <FieldLabel content="Settings" as="legend" />
      </>
    );

    expect(screen.getByText('Profile').tagName).toBe('SPAN');
    expect(screen.getByText('Settings').tagName).toBe('LEGEND');
  });

  it('renders validation errors before validating hints', () => {
    const { rerender } = render(<FieldHint errorMessage="Username is required" showError />);

    expect(screen.getByText('Username is required').className).toContain('nop-field__error');

    rerender(<FieldHint validating />);

    expect(screen.getByText('Validating...').className).toContain('nop-field__hint');
  });
});
