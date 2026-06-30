import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from './field.js';

afterEach(() => {
  cleanup();
});

describe('Field', () => {
  it('renders the group role and orientation contract', () => {
    render(
      <Field orientation="horizontal">
        <FieldLabel htmlFor="username">Username</FieldLabel>
        <FieldContent>
          <input id="username" />
        </FieldContent>
      </Field>,
    );

    const field = screen.getByRole('group');
    expect(field.getAttribute('data-slot')).toBe('field');
    expect(field.getAttribute('data-orientation')).toBe('horizontal');
    expect(screen.getByText('Username').getAttribute('data-slot')).toBe('field-label');
  });

  it('renders description and de-duplicated errors through stable slots', () => {
    render(
      <Field>
        <FieldTitle>Profile</FieldTitle>
        <FieldDescription>Public profile settings</FieldDescription>
        <FieldError
          errors={[
            { message: 'Required field' },
            { message: 'Required field' },
            { message: 'Needs approval' },
          ]}
        />
      </Field>,
    );

    expect(screen.getByText('Public profile settings').getAttribute('data-slot')).toBe(
      'field-description',
    );
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('data-slot')).toBe('field-error');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('uses distinct data-slots for FieldTitle and FieldLabel (S-5)', () => {
    render(
      <Field>
        <FieldLabel htmlFor="username">Username</FieldLabel>
        <FieldTitle>Profile</FieldTitle>
      </Field>,
    );

    expect(screen.getByText('Username').getAttribute('data-slot')).toBe('field-label');
    expect(screen.getByText('Profile').getAttribute('data-slot')).toBe('field-title');
  });
});
