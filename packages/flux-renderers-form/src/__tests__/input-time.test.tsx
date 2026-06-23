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
      schemaUrl="test://input-time"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function getTimeInput(): HTMLInputElement {
  return document.querySelector('.nop-input-time input[type="time"]') as HTMLInputElement;
}

describe('input-time renderer', () => {
  it('emits the nop-input-time marker and renders a time input', () => {
    renderSchema({
      type: 'form',
      data: { at: '08:30' },
      body: [{ type: 'input-time', name: 'at', label: 'At' }],
    });
    expect(document.querySelector('.nop-input-time')).toBeTruthy();
    const input = getTimeInput();
    expect(input).toBeTruthy();
    expect(input.type).toBe('time');
    // Stored HH:mm value flows straight into the native control.
    expect(input.value).toBe('08:30');
  });

  it('writes the selected time back to scope in valueFormat', async () => {
    renderSchema({
      type: 'form',
      id: 'time-form',
      data: { at: '08:30' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        { type: 'input-time', name: 'at', label: 'At' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'time-form' },
        },
      ],
    } as any);

    const input = getTimeInput();
    fireEvent.change(input, { target: { value: '14:45' } });

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('14:45');
  });

  it('clamps the time to minTime/maxTime window', async () => {
    renderSchema({
      type: 'form',
      id: 'time-form',
      data: { at: '10:00' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        {
          type: 'input-time',
          name: 'at',
          label: 'At',
          minTime: '09:00',
          maxTime: '17:00',
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'time-form' },
        },
      ],
    } as any);

    const input = getTimeInput();
    // Below min → clamped to 09:00
    fireEvent.change(input, { target: { value: '06:30' } });
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('09:00');
  });

  it('converts between a custom valueFormat and the native HH:mm control', async () => {
    renderSchema({
      type: 'form',
      id: 'time-form',
      data: { at: '0830' },
      submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
      body: [
        {
          type: 'input-time',
          name: 'at',
          label: 'At',
          valueFormat: 'HHmm',
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'time-form' },
        },
      ],
    } as any);

    // valueFormat HHmm → native HH:mm control renders 08:30
    const input = getTimeInput();
    expect(input.value).toBe('08:30');

    // Selecting 12:00 round-trips back into HHmm storage
    fireEvent.change(input, { target: { value: '12:00' } });
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('1200');
  });
});
