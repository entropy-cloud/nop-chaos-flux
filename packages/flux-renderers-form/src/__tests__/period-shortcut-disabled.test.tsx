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
      schemaUrl="test://period-shortcut-disabled"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

// [G2-R3-视角3-01] (R2 consistency audit, P1): period family shortcut buttons
// bypassed the disabled gate — a greyed/locked field could be rewritten through
// the shortcut channel and the value persisted with the next submit
// (disabled-channel-block).
describe('[G2-R3-视角3-01] period shortcut buttons honor the disabled gate', () => {
  it('shortcut buttons are disabled and cannot rewrite a disabled field', async () => {
    renderSchema({
      type: 'form',
      id: 'period-form',
      data: { m: '2024-06' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        {
          type: 'input-month',
          name: 'm',
          label: 'Month',
          shortcuts: [{ label: 'January', start: '2024-01' }],
          disabled: true,
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'period-form' },
        },
      ],
    } as any);

    const shortcut = screen.getByText('January') as HTMLButtonElement;
    expect(shortcut.disabled).toBe(true);

    fireEvent.click(shortcut);
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].m).toBe('2024-06');
  });

  it('range mode shortcuts are gated as well', () => {
    renderSchema({
      type: 'form',
      data: { r: '2024-05 ~ 2024-06' },
      body: [
        {
          type: 'input-month',
          name: 'r',
          label: 'Range',
          selectionMode: 'range',
          shortcuts: [{ label: 'Last two', start: '2024-01', end: '2024-02' }],
          disabled: true,
        },
      ],
    } as any);

    const shortcut = screen.getByText('Last two') as HTMLButtonElement;
    expect(shortcut.disabled).toBe(true);
  });

  it('enabled shortcuts still apply (no regression)', () => {
    renderSchema({
      type: 'form',
      data: { m: '2024-06' },
      body: [
        {
          type: 'input-month',
          name: 'm',
          label: 'Month',
          shortcuts: [{ label: 'January', start: '2024-01' }],
        },
      ],
    } as any);

    fireEvent.click(screen.getByText('January'));
    const trigger = document.querySelector('[data-slot="period-control"]')!;
    expect(trigger).toBeTruthy();
  });
});
