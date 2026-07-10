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
      schemaUrl="test://input-period"
      schema={schema}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function buildForm(
  type: 'input-month' | 'input-quarter' | 'input-year',
  name: string,
  initialValue: string | undefined,
  extra: Record<string, unknown> = {},
) {
  return {
    type: 'form',
    id: 'period-form',
    data: initialValue === undefined ? {} : { [name]: initialValue },
    submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
    body: [
      { type, name, label: name, ...extra },
      {
        type: 'button',
        label: 'Submit',
        onClick: { action: 'component:submit', componentId: 'period-form' },
      },
    ],
  } as any;
}

async function submit() {
  fireEvent.click(screen.getByText('Submit'));
  await waitFor(() => expect(submitCalls.length).toBe(1));
}

describe('period family — markers and registration', () => {
  it('input-month emits the nop-input-month marker and is wrapped by the field frame', () => {
    renderSchema(buildForm('input-month', 'm', '2024-06'));
    expect(document.querySelector('.nop-input-month')).toBeTruthy();
    expect(document.querySelector('.nop-field')).toBeTruthy();
    expect(document.querySelector('[data-period-kind="month"]')).toBeTruthy();
  });

  it('input-quarter emits the nop-input-quarter marker', () => {
    renderSchema(buildForm('input-quarter', 'q', '2024-Q3'));
    expect(document.querySelector('.nop-input-quarter')).toBeTruthy();
    expect(document.querySelector('[data-period-kind="quarter"]')).toBeTruthy();
  });

  it('input-year emits the nop-input-year marker', () => {
    renderSchema(buildForm('input-year', 'y', '2024'));
    expect(document.querySelector('.nop-input-year')).toBeTruthy();
    expect(document.querySelector('[data-period-kind="year"]')).toBeTruthy();
  });
});

describe('input-month', () => {
  it('renders the initial value in the native month input', () => {
    renderSchema(buildForm('input-month', 'm', '2024-06'));
    const input = screen.getByTestId('period-input-month') as HTMLInputElement;
    expect(input.value).toBe('2024-06');
  });

  it('writes the selected month back to scope in valueFormat', async () => {
    renderSchema(buildForm('input-month', 'm', '2024-06'));
    const input = screen.getByTestId('period-input-month') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2025-01' } });
    await submit();
    expect(submitCalls[0].m).toBe('2025-01');
  });

  it('clears the value via the clearable button', async () => {
    renderSchema(buildForm('input-month', 'm', '2024-06', { clearable: true }));
    fireEvent.click(screen.getByTestId('period-clear-month'));
    await submit();
    expect(submitCalls[0].m).toBeUndefined();
  });
});

describe('input-year', () => {
  it('writes the selected year back to scope as YYYY', async () => {
    renderSchema(buildForm('input-year', 'y', '2024'));
    const input = screen.getByTestId('period-input-year') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2031' } });
    await submit();
    expect(submitCalls[0].y).toBe('2031');
  });

  it('writes undefined for an empty year', async () => {
    renderSchema(buildForm('input-year', 'y', '2024'));
    const input = screen.getByTestId('period-input-year') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    await submit();
    expect(submitCalls[0].y).toBeUndefined();
  });
});

describe('input-quarter', () => {
  it('renders the initial quarter via year input + quarter select', () => {
    renderSchema(buildForm('input-quarter', 'q', '2024-Q3'));
    const host = screen.getByTestId('period-input-quarter');
    const yearInput = host.querySelector('input[type="text"]') as HTMLInputElement;
    const select = host.querySelector('select') as HTMLSelectElement;
    expect(yearInput.value).toBe('2024');
    expect(select.value).toBe('3');
  });

  it('writes a quarter selection back to scope as YYYY-Qq', async () => {
    renderSchema(buildForm('input-quarter', 'q', '2024-Q1'));
    const host = screen.getByTestId('period-input-quarter');
    const select = host.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '4' } });
    await submit();
    expect(submitCalls[0].q).toBe('2024-Q4');
  });
});

describe('period family — range selectionMode', () => {
  it('input-month range emits a delimiter-joined value and normalizes reversed ends', async () => {
    renderSchema(
      buildForm('input-month', 'm', '2024-06', { selectionMode: 'range' }),
    );
    // Range renders two month inputs (the testid sits directly on each input).
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[data-testid="period-input-month"]',
    );
    expect(inputs.length).toBe(2);
    // Set the end input to 2025-01 while start stays 2024-06.
    fireEvent.change(inputs[1]!, { target: { value: '2025-01' } });
    await submit();
    // normalizePeriodRange swaps so stored start <= end.
    const stored: string = submitCalls[0].m;
    const [a, b] = stored.split(',');
    expect(a).toBe('2024-06');
    expect(b).toBe('2025-01');
    expect(document.querySelector('[data-selection-mode="range"]')).toBeTruthy();
  });
});
