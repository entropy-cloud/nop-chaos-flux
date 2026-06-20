import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env } from './form-test-support.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

describe('input-text / input-email / input-password - minLength/maxLength/pattern drift', () => {
  it('collects minLength as a runtime validation rule (input "ab" with minLength 5 -> error + aria-invalid)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-drift#minLength"
        schema={{
          type: 'form',
          validateOn: ['blur', 'change', 'submit'],
          showErrorOn: ['touched', 'submit'],
          data: { code: '' },
          body: [
            {
              type: 'input-text',
              name: 'code',
              label: 'Code',
              minLength: 5,
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = screen.getByLabelText('Code') as HTMLInputElement;

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.blur(input);

    const error = await screen.findByText('Code must be at least 5 characters');
    expect(error).toBeTruthy();
    expect(screen.getAllByText('Code must be at least 5 characters')).toHaveLength(1);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('collects maxLength as a runtime validation rule and renders maxlength native attr', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-drift#maxLength"
        schema={{
          type: 'form',
          validateOn: ['blur', 'change', 'submit'],
          showErrorOn: ['touched', 'submit'],
          data: { notes: '' },
          body: [
            {
              type: 'input-text',
              name: 'notes',
              label: 'Notes',
              maxLength: 3,
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = screen.getByLabelText('Notes') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('3');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'abcd' } });
    fireEvent.blur(input);

    expect(await screen.findByText('Notes must be at most 3 characters')).toBeTruthy();
    expect(screen.getAllByText('Notes must be at most 3 characters')).toHaveLength(1);
  });

  it('collects pattern as a runtime validation rule and renders pattern native attr', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-drift#pattern"
        schema={{
          type: 'form',
          validateOn: ['blur', 'change', 'submit'],
          showErrorOn: ['touched', 'submit'],
          data: { code: '' },
          body: [
            {
              type: 'input-text',
              name: 'code',
              label: 'Code',
              pattern: '^\\d+$',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = screen.getByLabelText('Code') as HTMLInputElement;
    expect(input.getAttribute('pattern')).toBe('^\\d+$');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);

    expect(await screen.findByText('Code format is invalid')).toBeTruthy();
    expect(screen.getAllByText('Code format is invalid')).toHaveLength(1);
  });

  it('input-email keeps email default rule alongside schema maxLength (both rules active)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-drift#email+maxLength"
        schema={{
          type: 'form',
          validateOn: ['blur', 'change', 'submit'],
          showErrorOn: ['touched', 'submit'],
          data: { email: '' },
          body: [
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
              maxLength: 5,
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = screen.getByLabelText('Email') as HTMLInputElement;
    expect(input.getAttribute('maxlength')).toBe('5');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);

    expect(await screen.findByText('Email must be a valid email address')).toBeTruthy();

    fireEvent.change(input, { target: { value: 'abcdef' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('Email must be at most 5 characters')).toBeTruthy();
    });
  });

  it('renders minlength/maxlength/pattern native attrs and omits them when schema does not declare them', () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-drift#native-attrs"
        schema={{
          type: 'form',
          body: [
            {
              type: 'input-password',
              name: 'secret',
              label: 'Secret',
              minLength: 4,
              maxLength: 8,
              pattern: '[A-Za-z]+',
            },
            {
              type: 'input-text',
              name: 'plain',
              label: 'Plain',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const secret = screen.getByLabelText('Secret') as HTMLInputElement;
    expect(secret.getAttribute('minlength')).toBe('4');
    expect(secret.getAttribute('maxlength')).toBe('8');
    expect(secret.getAttribute('pattern')).toBe('[A-Za-z]+');

    const plain = screen.getByLabelText('Plain') as HTMLInputElement;
    expect(plain.getAttribute('minlength')).toBeNull();
    expect(plain.getAttribute('maxlength')).toBeNull();
    expect(plain.getAttribute('pattern')).toBeNull();
  });
});
