import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { buttonRenderer, env, formStateProbeRenderer, formTestHarness } from './form-test-support.js';

const { submitCalls } = formTestHarness;

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  resetFluxI18n();
  cleanup();
});

function renderSchema(schema: BaseSchema) {
  const SchemaRenderer = createSchemaRenderer([
    ...formRendererDefinitions,
    buttonRenderer,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-controlled-value"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function formStateText(path: string): string {
  return screen.getByTestId(`form-state:${path}`).textContent ?? '';
}

describe('I1: null value renders as empty string and round-trips through the adapter', () => {
  it('data:{title:null} renders an empty input and editing produces a string value', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { title: null },
      body: [
        { type: 'input-text', name: 'title', label: 'Title' },
        { type: 'form-state-probe', name: 'title' },
      ],
    } as any);

    const input = screen.getByLabelText('Title') as HTMLInputElement;
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: 'hello' } });
    await waitFor(() => expect(formStateText('title')).toBe('"hello"'));
  });
});

describe('I3: cleared number serializes to undefined on submit', () => {
  it('set 111 -> clear -> submit serializes without a numeric count', async () => {
    renderSchema({
      type: 'form',
      id: 'num-form',
      data: { count: 111 },
      submitAction: { action: 'ajax', args: { url: '/api', method: 'post' } },
      body: [
        { type: 'input-number', id: 'num', name: 'count', label: 'Count' },
        {
          type: 'button',
          label: 'Clear',
          onClick: { action: 'component:clear', componentId: 'num' },
        },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'num-form' },
        },
        { type: 'form-state-probe', name: 'count' },
      ],
    } as any);

    fireEvent.click(screen.getByText('Clear'));
    await waitFor(() => expect(formStateText('count')).toBe('null'));

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].count).toBeUndefined();
  });
});

describe('I4: a programmatically set value remains user-editable (fully controlled)', () => {
  it('after component:setValue the user can type, backspace and paste over it', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { name: '' },
      body: [
        { type: 'input-text', name: 'name', label: 'Name' },
        {
          type: 'button',
          label: 'Set Programmatic',
          onClick: {
            action: 'component:setValue',
            componentId: 'f',
            args: { name: 'name', value: 'prog' },
          },
        },
        { type: 'form-state-probe', name: 'name' },
      ],
    } as any);

    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.value).toBe('');

    fireEvent.click(screen.getByText('Set Programmatic'));
    await waitFor(() => {
      expect(input.value).toBe('prog');
    });
    await waitFor(() => expect(formStateText('name')).toBe('"prog"'));

    // type appends
    fireEvent.change(input, { target: { value: 'prog-typed' } });
    await waitFor(() => expect(formStateText('name')).toBe('"prog-typed"'));

    // backspace clears
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(formStateText('name')).toBe('""'));

    // paste replaces
    fireEvent.change(input, { target: { value: 'pasted' } });
    await waitFor(() => expect(formStateText('name')).toBe('"pasted"'));
  });
});

describe('I6: every change path funnels through the same canonical form change observable', () => {
  it('native typing, handle-clear, handle-reset and action setValue all update the form-state probe', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { name: 'initial' },
      body: [
        { type: 'input-text', id: 'inp', name: 'name', label: 'Name' },
        {
          type: 'button',
          label: 'Clear',
          onClick: { action: 'component:clear', componentId: 'inp' },
        },
        {
          type: 'button',
          label: 'Reset',
          onClick: { action: 'component:reset', componentId: 'inp' },
        },
        {
          type: 'button',
          label: 'SetValue',
          onClick: {
            action: 'component:setValue',
            componentId: 'f',
            args: { name: 'name', value: 'from-action' },
          },
        },
        { type: 'form-state-probe', name: 'name' },
      ],
    } as any);

    const input = screen.getByLabelText('Name') as HTMLInputElement;

    // 1. native typing
    fireEvent.change(input, { target: { value: 'typed' } });
    await waitFor(() => expect(formStateText('name')).toBe('"typed"'));

    // 2. handle-clear
    fireEvent.click(screen.getByText('Clear'));
    await waitFor(() => expect(formStateText('name')).toBe('""'));

    // 3. handle-reset restores initial
    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => expect(formStateText('name')).toBe('"initial"'));

    // 4. action setValue
    fireEvent.click(screen.getByText('SetValue'));
    await waitFor(() => expect(formStateText('name')).toBe('"from-action"'));
  });
});

describe('I8: bare $ is a literal; only ${...} is treated as an expression', () => {
  it('a field name with a bare $ binds to the literal property (not evaluated)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { '$catId': 'literal-bound' },
      body: [
        { type: 'input-text', name: '$catId', label: 'Cat Id' },
        { type: 'form-state-probe', name: '$catId' },
      ],
    } as any);

    const input = screen.getByLabelText('Cat Id') as HTMLInputElement;
    expect(input.value).toBe('literal-bound');
    expect(formStateText('$catId')).toBe('"literal-bound"');
  });

  it('a ${expr} placeholder is evaluated against the scope', () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { x: 'dynamic' },
      body: [
        { type: 'input-text', name: 'name', label: 'Name', placeholder: 'val:${x}' },
      ],
    } as any);

    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.placeholder).toBe('val:dynamic');
  });
});
