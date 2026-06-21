import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import {
  buttonRenderer,
  env,
  formStateProbeRenderer,
  formTestHarness,
  sharedFormulaCompiler,
} from './form-test-support.js';

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
      schemaUrl="test://component-handles-input"
      schema={schema}
      env={env}
      formulaCompiler={sharedFormulaCompiler}
    />,
  );
}

function clickButton(label: string) {
  fireEvent.click(screen.getByText(label));
}

function formStateText(path: string): string {
  return screen.getByTestId(`form-state:${path}`).textContent ?? '';
}

describe('input component handles: clear/reset/focus', () => {
  it('component:clear empties input-text value', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { name: 'hello' },
      body: [
        { type: 'input-text', id: 'inp', name: 'name', label: 'Name' },
        {
          type: 'button',
          label: 'Clear',
          onClick: { action: 'component:clear', componentId: 'inp' },
        },
        { type: 'form-state-probe', name: 'name' },
      ],
    } as any);

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('hello');
    clickButton('Clear');
    await waitFor(() => expect(formStateText('name')).toBe('""'));
  });

  it('component:reset restores input-text to initial value', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { name: 'initial' },
      body: [
        { type: 'input-text', id: 'inp', name: 'name', label: 'Name' },
        {
          type: 'button',
          label: 'Reset',
          onClick: { action: 'component:reset', componentId: 'inp' },
        },
        { type: 'form-state-probe', name: 'name' },
      ],
    } as any);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'changed' } });
    await waitFor(() => expect(formStateText('name')).toBe('"changed"'));
    clickButton('Reset');
    await waitFor(() => expect(formStateText('name')).toBe('"initial"'));
  });

  it('component:focus focuses input-text element', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { name: 'x' },
      body: [
        { type: 'input-text', id: 'inp', name: 'name', label: 'Name' },
        {
          type: 'button',
          label: 'Focus',
          onClick: { action: 'component:focus', componentId: 'inp' },
        },
      ],
    } as any);

    const input = screen.getByLabelText('Name');
    expect(document.activeElement).not.toBe(input);
    clickButton('Focus');
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('component:clear empties textarea value', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { bio: 'some bio' },
      body: [
        { type: 'textarea', id: 'ta', name: 'bio', label: 'Bio' },
        {
          type: 'button',
          label: 'Clear',
          onClick: { action: 'component:clear', componentId: 'ta' },
        },
        { type: 'form-state-probe', name: 'bio' },
      ],
    } as any);

    clickButton('Clear');
    await waitFor(() => expect(formStateText('bio')).toBe('""'));
  });

  it('component:reset restores textarea to initial value', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { bio: 'original' },
      body: [
        { type: 'textarea', id: 'ta', name: 'bio', label: 'Bio' },
        {
          type: 'button',
          label: 'Reset',
          onClick: { action: 'component:reset', componentId: 'ta' },
        },
        { type: 'form-state-probe', name: 'bio' },
      ],
    } as any);

    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'edited' } });
    await waitFor(() => expect(formStateText('bio')).toBe('"edited"'));
    clickButton('Reset');
    await waitFor(() => expect(formStateText('bio')).toBe('"original"'));
  });

  it('component:focus focuses textarea element', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { bio: 'x' },
      body: [
        { type: 'textarea', id: 'ta', name: 'bio', label: 'Bio' },
        {
          type: 'button',
          label: 'Focus',
          onClick: { action: 'component:focus', componentId: 'ta' },
        },
      ],
    } as any);

    const ta = screen.getByLabelText('Bio');
    clickButton('Focus');
    await waitFor(() => expect(document.activeElement).toBe(ta));
  });

  it('component:clear empties input-number to undefined', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { count: 42 },
      body: [
        { type: 'input-number', id: 'num', name: 'count', label: 'Count' },
        {
          type: 'button',
          label: 'Clear',
          onClick: { action: 'component:clear', componentId: 'num' },
        },
        { type: 'form-state-probe', name: 'count' },
      ],
    } as any);

    clickButton('Clear');
    await waitFor(() => expect(formStateText('count')).toBe('null'));
  });

  it('component:reset restores input-number to initial value', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { count: 7 },
      body: [
        { type: 'input-number', id: 'num', name: 'count', label: 'Count' },
        {
          type: 'button',
          label: 'Reset',
          onClick: { action: 'component:reset', componentId: 'num' },
        },
        { type: 'form-state-probe', name: 'count' },
      ],
    } as any);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '99' } });
    fireEvent.blur(screen.getByRole('spinbutton'));
    await waitFor(() => expect(formStateText('count')).toBe('99'));
    clickButton('Reset');
    await waitFor(() => expect(formStateText('count')).toBe('7'));
  });

  it('component:focus focuses input-number element', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { count: 1 },
      body: [
        { type: 'input-number', id: 'num', name: 'count', label: 'Count' },
        {
          type: 'button',
          label: 'Focus',
          onClick: { action: 'component:focus', componentId: 'num' },
        },
      ],
    } as any);

    const input = screen.getByRole('spinbutton');
    clickButton('Focus');
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('component:focus focuses switch element', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { agreed: false },
      body: [
        { type: 'switch', id: 'sw', name: 'agreed', label: 'Agree' },
        {
          type: 'button',
          label: 'Focus',
          onClick: { action: 'component:focus', componentId: 'sw' },
        },
      ],
    } as any);

    clickButton('Focus');
    const switchBtn = screen.getByRole('switch');
    await waitFor(() => expect(document.activeElement).toBe(switchBtn));
  });

  it('component:focus focuses radio-group element', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { color: '' },
      body: [
        {
          type: 'radio-group',
          id: 'rg',
          name: 'color',
          label: 'Color',
          options: [
            { label: 'Red', value: 'red' },
            { label: 'Blue', value: 'blue' },
          ],
        },
        {
          type: 'button',
          label: 'Focus',
          onClick: { action: 'component:focus', componentId: 'rg' },
        },
      ],
    } as any);

    clickButton('Focus');
    await waitFor(() => {
      const group = screen.getByRole('radiogroup');
      expect(group.contains(document.activeElement)).toBe(true);
    });
  });

  it('component:focus focuses checkbox-group element', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { tags: [] },
      body: [
        {
          type: 'checkbox-group',
          id: 'cg',
          name: 'tags',
          label: 'Tags',
          options: [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
          ],
        },
        {
          type: 'button',
          label: 'Focus',
          onClick: { action: 'component:focus', componentId: 'cg' },
        },
      ],
    } as any);

    clickButton('Focus');
    await waitFor(() => {
      const group = screen.getByRole('group', { name: 'Tags' });
      expect(group.contains(document.activeElement)).toBe(true);
    });
  });

  it('component:clear on select empties single-select value', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { lang: 'ts' },
      body: [
        {
          type: 'select',
          id: 'sel',
          name: 'lang',
          label: 'Language',
          options: [
            { label: 'TypeScript', value: 'ts' },
            { label: 'JavaScript', value: 'js' },
          ],
        },
        {
          type: 'button',
          label: 'Clear',
          onClick: { action: 'component:clear', componentId: 'sel' },
        },
        { type: 'form-state-probe', name: 'lang' },
      ],
    } as any);

    clickButton('Clear');
    await waitFor(() => expect(formStateText('lang')).toBe('null'));
  });

  it('x1-clear-disabled: clear on disabled field is a no-op (skipped)', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { name: 'keep' },
      body: [
        { type: 'input-text', id: 'inp', name: 'name', label: 'Name', disabled: true },
        {
          type: 'button',
          label: 'Clear',
          onClick: { action: 'component:clear', componentId: 'inp' },
        },
        { type: 'form-state-probe', name: 'name' },
      ],
    } as any);

    clickButton('Clear');
    // value unchanged
    await waitFor(() => expect(formStateText('name')).toBe('"keep"'));
  });

  it('x1-reset-no-initial: reset with no initial value falls back to clear', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {},
      body: [
        { type: 'input-text', id: 'inp', name: 'name', label: 'Name' },
        {
          type: 'button',
          label: 'Reset',
          onClick: { action: 'component:reset', componentId: 'inp' },
        },
        { type: 'form-state-probe', name: 'name' },
      ],
    } as any);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'typed' } });
    await waitFor(() => expect(formStateText('name')).toBe('"typed"'));
    clickButton('Reset');
    await waitFor(() => expect(formStateText('name')).toBe('""'));
  });

  it('component:submit still works after handle registration (no regression)', async () => {
    renderSchema({
      type: 'form',
      id: 'submit-form',
      data: { name: 'x' },
      submitAction: { action: 'ajax', args: { url: '/api', method: 'post' } },
      body: [
        { type: 'input-text', id: 'inp', name: 'name', label: 'Name' },
        {
          type: 'button',
          label: 'Submit',
          onClick: { action: 'component:submit', componentId: 'submit-form' },
        },
      ],
    } as any);

    clickButton('Submit');
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].name).toBe('x');
  });
});
