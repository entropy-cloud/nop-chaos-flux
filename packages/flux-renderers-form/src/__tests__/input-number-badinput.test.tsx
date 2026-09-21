import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formTestHarness } from './form-test-support.js';

const { submitCalls } = formTestHarness;

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderNumberField(schema: BaseSchema) {
  cleanup();
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-number-badinput"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function getNumberInput(): HTMLInputElement {
  return screen.getByRole('spinbutton');
}

/**
 * P2-15 (V12a carry-over, plan 485 Phase 2, proof-first): a badInput
 * intermediate keystroke must not destroy the in-progress display nor clobber
 * the stored value. Display and commit are decoupled: the input shows the
 * user's draft while focused; the stored number only changes on a valid parse
 * (or an explicit clear).
 *
 * Environment note: happy-dom sanitizes a lone '-' to '' on the number input
 * (indistinguishable from an explicit clear), so the testable badInput
 * intermediate here is '12e' — validity.badInput material, non-NaN-parseable,
 * non-empty. Browsers with true badInput ('-') are covered by the same
 * validity.badInput guard in the renderer.
 */
describe('input-number badInput intermediate state (P2-15)', () => {
  it('keeps the typed badInput draft visible and the stored value intact', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: { count: 5 },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-number', name: 'count', label: 'Count' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'num-form' },
        },
      ],
    } as any);

    const input = getNumberInput();
    expect(input.value).toBe('5');

    // User focuses and types a badInput intermediate ('12e').
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '12e' } });

    // The draft stays visible (previously snapped back to the stored value).
    expect(input.value).toBe('12e');

    // The stored value must NOT be clobbered by the intermediate keystroke.
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].count).toBe(5);
  });

  it('commits a completed valid entry typed after the intermediate state', async () => {
    renderNumberField({
      type: 'form',
      id: 'num-form',
      data: { count: 5 },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-number', name: 'count', label: 'Count' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'num-form' },
        },
      ],
    } as any);

    const input = getNumberInput();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '12e' } });
    fireEvent.change(input, { target: { value: '12e5' } });
    fireEvent.blur(input);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].count).toBe(1200000);
  });
});
