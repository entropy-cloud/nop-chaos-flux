import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { FieldHint, FieldLabel } from './index';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

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

    expect(screen.getByText('Username is required').getAttribute('data-slot')).toBe('field-error');

    rerender(<FieldHint validating />);

    expect(screen.getByText('Validating...').getAttribute('data-slot')).toBe('field-hint');
  });
});
