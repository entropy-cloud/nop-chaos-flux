import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

afterEach(() => {
  cleanup();
});

function readState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null');
}

interface FieldRenderOptions {
  data?: Record<string, unknown>;
  type: 'checkbox' | 'switch';
  name: string;
  label: string;
  fieldProps?: Record<string, unknown>;
}

function renderBooleanField(options: FieldRenderOptions) {
  const { data, type, name, label, fieldProps = {} } = options;
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  const mergedFieldProps: Record<string, unknown> = { ...fieldProps };
  if (type === 'checkbox' && !mergedFieldProps.option) {
    mergedFieldProps.option = { label };
  }
  return render(
    <SchemaRenderer
      schemaUrl={`test://form/boolean-contract/${type}-${name}`}
      schema={{
        type: 'form',
        ...(data ? { data } : {}),
        body: [
          {
            type,
            name,
            label,
            ...mergedFieldProps,
          },
          {
            type: 'form-state-probe',
            name,
          },
        ],
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function checkboxControl(label: string): HTMLElement {
  return screen.getByRole('checkbox', { name: new RegExp(label) });
}

function switchControl(label: string): HTMLElement {
  return screen.getByRole('switch', { name: new RegExp(label) });
}

function isChecked(el: HTMLElement): boolean {
  return el.hasAttribute('data-checked');
}

describe('E3 checkbox trueValue/falseValue value contract', () => {
  it('stores trueValue when checked and falseValue when unchecked (custom 1/0)', async () => {
    renderBooleanField({
      type: 'checkbox',
      name: 'enabled',
      label: 'Enabled',
      fieldProps: { trueValue: 1, falseValue: 0 },
    });

    const control = checkboxControl('Enabled');
    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:enabled')).toBe(1);
    });

    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:enabled')).toBe(0);
    });
  });

  it('falls back to true/false when trueValue/falseValue are absent (no regression)', async () => {
    renderBooleanField({
      type: 'checkbox',
      name: 'agree',
      label: 'Agree',
    });

    const control = checkboxControl('Agree');
    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:agree')).toBe(true);
    });

    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:agree')).toBe(false);
    });
  });

  it('recognises a custom trueValue form initial value as checked (initial-value-custom)', () => {
    renderBooleanField({
      type: 'checkbox',
      name: 'flag',
      label: 'Flag',
      data: { flag: 'Y' },
      fieldProps: { trueValue: 'Y', falseValue: 'N' },
    });

    expect(isChecked(checkboxControl('Flag'))).toBe(true);
  });

  it('recognises a custom falseValue form initial value as unchecked', () => {
    renderBooleanField({
      type: 'checkbox',
      name: 'flag',
      label: 'Flag',
      data: { flag: 'N' },
      fieldProps: { trueValue: 'Y', falseValue: 'N' },
    });

    expect(isChecked(checkboxControl('Flag'))).toBe(false);
  });

  it('treats a value that is neither trueValue nor falseValue as unchecked and preserves it until onChange (value-neither)', () => {
    renderBooleanField({
      type: 'checkbox',
      name: 'mixed',
      label: 'Mixed',
      data: { mixed: 'unknown' },
      fieldProps: { trueValue: 'Y', falseValue: 'N' },
    });

    expect(isChecked(checkboxControl('Mixed'))).toBe(false);
    expect(readState('form-state:mixed')).toBe('unknown');
  });

  it('falls back falseValue to false when only trueValue is configured (only-trueValue-set)', async () => {
    renderBooleanField({
      type: 'checkbox',
      name: 'opt',
      label: 'Opt',
      fieldProps: { trueValue: 'yes' },
    });

    const control = checkboxControl('Opt');
    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:opt')).toBe('yes');
    });

    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:opt')).toBe(false);
    });
  });
});

describe('E3 switch trueValue/falseValue value contract', () => {
  it('stores trueValue when toggled on and falseValue when toggled off (custom yes/no)', async () => {
    renderBooleanField({
      type: 'switch',
      name: 'notify',
      label: 'Notify',
      fieldProps: { trueValue: 'yes', falseValue: 'no' },
    });

    const control = switchControl('Notify');
    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:notify')).toBe('yes');
    });

    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:notify')).toBe('no');
    });
  });

  it('keeps onLabel/offLabel display orthogonal to value mapping', async () => {
    renderBooleanField({
      type: 'switch',
      name: 'notify',
      label: 'Notify',
      fieldProps: {
        trueValue: 'yes',
        falseValue: 'no',
        option: { onLabel: 'Subscribe', offLabel: 'Unsubscribed' },
      },
    });

    expect(screen.getByText('Unsubscribed')).toBeTruthy();

    const control = switchControl('Notify');
    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:notify')).toBe('yes');
    });
    expect(screen.getByText('Subscribe')).toBeTruthy();
  });

  it('falls back to true/false when trueValue/falseValue are absent (no regression)', async () => {
    renderBooleanField({
      type: 'switch',
      name: 'featured',
      label: 'Featured',
    });

    const control = switchControl('Featured');
    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:featured')).toBe(true);
    });

    fireEvent.click(control);
    await waitFor(() => {
      expect(readState('form-state:featured')).toBe(false);
    });
  });

  it('recognises a custom trueValue form initial value as checked', () => {
    renderBooleanField({
      type: 'switch',
      name: 'notify',
      label: 'Notify',
      data: { notify: 'yes' },
      fieldProps: { trueValue: 'yes', falseValue: 'no' },
    });

    expect(isChecked(switchControl('Notify'))).toBe(true);
  });

  it('treats a value that is neither trueValue nor falseValue as unchecked (value-neither)', () => {
    renderBooleanField({
      type: 'switch',
      name: 'notify',
      label: 'Notify',
      data: { notify: 'maybe' },
      fieldProps: { trueValue: 'yes', falseValue: 'no' },
    });

    expect(isChecked(switchControl('Notify'))).toBe(false);
  });
});
