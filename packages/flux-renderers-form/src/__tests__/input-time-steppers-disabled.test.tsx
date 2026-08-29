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

const allDefinitions = [...formRendererDefinitions, buttonRenderer];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-time-steppers-disabled"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

// [G2-R2-视角3-01] (R2 consistency audit, P1): the steppers form of input-time
// rendered four fully functional stepper buttons regardless of the
// disabled/readOnly gate — a locked field could still be rewritten and the
// value persisted with the next submit (disabled-channel-block).
describe('[G2-R2-视角3-01] input-time steppers honor the disabled gate', () => {
  it('stepper buttons are disabled and cannot rewrite a disabled field', async () => {
    renderSchema({
      type: 'form',
      id: 'time-form',
      data: { at: '14:00' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        {
          type: 'input-time',
          name: 'at',
          label: 'At',
          steppers: true,
          testid: 'at',
          disabled: true,
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'time-form' },
        },
      ],
    } as any);

    for (const channel of ['at-hour-up', 'at-hour-down', 'at-minute-up', 'at-minute-down']) {
      expect(
        (screen.getByTestId(channel) as HTMLButtonElement).disabled,
        `channel ${channel} must be disabled`,
      ).toBe(true);
    }

    fireEvent.click(screen.getByTestId('at-minute-up'));
    fireEvent.click(screen.getByTestId('at-hour-up'));
    expect(screen.getByTestId('at-display').textContent).toMatch(/14 : 00/);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('14:00');
  });

  it('stepper buttons stay disabled under readOnly (defense in depth)', () => {
    renderSchema({
      type: 'form',
      data: { at: '09:30' },
      body: [{ type: 'input-time', name: 'at', steppers: true, testid: 'at', readOnly: true }],
    } as any);

    expect((screen.getByTestId('at-minute-up') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('at-minute-up'));
    expect(screen.getByTestId('at-display').textContent).toMatch(/09 : 30/);
  });

  it('enabled steppers still work (no regression)', () => {
    renderSchema({
      type: 'form',
      data: { at: '14:00' },
      body: [{ type: 'input-time', name: 'at', steppers: true, testid: 'at' }],
    } as any);

    fireEvent.click(screen.getByTestId('at-minute-up'));
    expect(screen.getByTestId('at-display').textContent).toMatch(/14 : 05/);
  });
});
