import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import {
  buttonRenderer,
  env,
  formStateProbeRenderer,
  formTestHarness,
  submitCalls,
} from './form-test-support.js';

/**
 * CX-11 (plan 589) Phase 1 characterization pins — form package consumer-side
 * contract faces that the consolidation batch must preserve byte-identically:
 *   1. injected-aria matrix B-tier (textarea / plain input) + A-tier
 *      (InputGroupFieldControl path);
 *   2. choice-family source-error chain (four form-package instances);
 *   3. component-handle focus (ref-direct and querySelector compensation);
 *   4. resetValue ref-restore variants (input-number / textarea);
 *   5. date clamp family gap pins (basic number clamp boundaries +
 *      clampIntoWindow via the steppers path).
 *
 * Zero declared behavior change: these pins must stay green across every
 * phase of the consolidation.
 *
 * Empirical face (probe-verified 2026-10-14): FieldFrame's cloneElement injects
 * the aria chain into the renderer COMPONENT props (top level), so the B/C-tier
 * sites resolve the frame's instance id (`${name}-${cid}-error`) and the DOM
 * carries that single token — the local `${name}-error` fallback is not part of
 * the FieldFrame-harness face.
 */

const SchemaRenderer = createSchemaRenderer([
  ...formRendererDefinitions,
  buttonRenderer,
  formStateProbeRenderer,
]);
const formulaCompiler = createFormulaCompiler();

afterEach(() => {
  cleanup();
  formTestHarness.reset();
});

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  return render(
    <SchemaRenderer
      schemaUrl="test://cx11-consumer-contract-pins"
      schema={
        {
          type: 'form',
          ...(data ? { data } : {}),
          body,
        } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

// ── 1. injected-aria matrix ────────────────────────────────────────────────

describe('CX-11 matrix pins — B-tier injected error chain (textarea)', () => {
  it('error state: textarea aria-describedby/errormessage == the live frame error element id', async () => {
    const { container } = renderForm([
      { type: 'textarea', name: 'remark', label: 'Remark', required: true },
    ]);
    fireEvent.focus(screen.getByLabelText('Remark'));
    fireEvent.blur(screen.getByLabelText('Remark'));

    const errorSpan = await waitFor(() => {
      const span = container.querySelector('[data-slot="field-error"]');
      expect(span).toBeTruthy();
      return span as HTMLElement;
    });
    // FieldFrame error element id is instance-qualified: `${name}-${cid}-error`.
    expect(errorSpan.id).toMatch(/^remark-\d+-error$/);
    const textarea = container.querySelector('textarea#remark-control') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.getAttribute('aria-describedby')).toBe(errorSpan.id);
    expect(textarea.getAttribute('aria-errormessage')).toBe(errorSpan.id);
    expect(document.getElementById(errorSpan.id)).toBe(errorSpan);
    expect(errorSpan.textContent).toContain('Remark');
  });

  it('no error state: textarea carries no aria-describedby/errormessage', () => {
    const { container } = renderForm([{ type: 'textarea', name: 'remark', label: 'Remark' }]);
    const textarea = container.querySelector('textarea#remark-control') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.getAttribute('aria-describedby')).toBeNull();
    expect(textarea.getAttribute('aria-errormessage')).toBeNull();
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
  });
});

describe('CX-11 matrix pins — B-tier injected error chain (plain input, multi-line cast site)', () => {
  it('error state: input aria-describedby/errormessage == the live frame error element id', async () => {
    const { container } = renderForm([
      { type: 'input-text', name: 'who', label: 'Who', required: true },
    ]);
    fireEvent.focus(screen.getByLabelText('Who'));
    fireEvent.blur(screen.getByLabelText('Who'));

    const errorSpan = await waitFor(() => {
      const span = container.querySelector('[data-slot="field-error"]');
      expect(span).toBeTruthy();
      return span as HTMLElement;
    });
    const input = container.querySelector('input#who-control') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toBe(errorSpan.id);
    expect(input.getAttribute('aria-errormessage')).toBe(errorSpan.id);
  });
});

describe('CX-11 matrix pins — A-tier InputGroupFieldControl path', () => {
  it('error state: group control keeps id=`${name}-control` and carries the single frame error token', async () => {
    const { container } = renderForm([
      { type: 'input-text', name: 'amt', label: 'Amt', required: true, prefix: '$' },
    ]);
    fireEvent.focus(screen.getByLabelText('Amt'));
    fireEvent.blur(screen.getByLabelText('Amt'));

    const errorSpan = await waitFor(() => {
      const span = container.querySelector('[data-slot="field-error"]');
      expect(span).toBeTruthy();
      return span as HTMLElement;
    });
    const input = container.querySelector('input#amt-control') as HTMLInputElement;
    expect(input).toBeTruthy();
    // own-vs-injected merge output: the frame chain token, exactly once
    // (no duplicated token from the own+injected concat).
    expect(input.getAttribute('aria-describedby')).toBe(errorSpan.id);
    expect(input.getAttribute('aria-errormessage')).toBe(errorSpan.id);
    expect(input.id).toBe('amt-control');
  });
});

// ── 2. choice-family source-error chain ───────────────────────────────────

const SOURCE_ERROR_STATE = {
  loading: false,
  status: 'error',
  error: 'Options failed',
};

describe('CX-11 source-error chain pins — form package instances', () => {
  it('select: trigger describedby/errormessage == `${instanceKey}-source-error`, paired span resolves and carries the message', () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        options: [],
        optionsSourceState: SOURCE_ERROR_STATE,
      },
    ]);
    const alert = document.querySelector('[data-slot="select-error"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.id).toMatch(/^role-\d+-source-error$/);
    expect(alert.textContent).toBe('Options failed');
    expect(document.getElementById(alert.id)).toBe(alert);
    const trigger = screen.getByRole('combobox', { name: 'Role' });
    expect(trigger.getAttribute('aria-describedby')).toBe(alert.id);
    expect(trigger.getAttribute('aria-errormessage')).toBe(alert.id);
  });

  it('radio-group: group describedby/errormessage == source-error id, paired span resolves', () => {
    renderForm([
      {
        type: 'radio-group',
        name: 'size',
        label: 'Size',
        options: [],
        optionsSourceState: SOURCE_ERROR_STATE,
      },
    ]);
    const alert = document.querySelector('[data-slot="radio-group-error"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.id).toMatch(/^size-\d+-source-error$/);
    expect(alert.textContent).toBe('Options failed');
    expect(document.getElementById(alert.id)).toBe(alert);
    const group = document.querySelector('[data-slot="radio-group-options"]') as HTMLElement;
    expect(group.getAttribute('aria-describedby')).toBe(alert.id);
    expect(group.getAttribute('aria-errormessage')).toBe(alert.id);
  });

  it('checkbox-group: wrapper describedby + option describedby/errormessage == source-error id', () => {
    renderForm([
      {
        type: 'checkbox-group',
        name: 'tags',
        label: 'Tags',
        options: [{ label: 'A', value: 'a' }],
        optionsSourceState: SOURCE_ERROR_STATE,
      },
    ]);
    const alert = document.querySelector('[data-slot="checkbox-group-error"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.id).toMatch(/^tags-\d+-source-error$/);
    expect(alert.textContent).toBe('Options failed');
    expect(document.getElementById(alert.id)).toBe(alert);
    const wrapper = document.querySelector('[data-slot="checkbox-group-wrapper"]') as HTMLElement;
    expect(wrapper.getAttribute('aria-describedby')).toBe(alert.id);
    const option = document.querySelector('[role="checkbox"]') as HTMLElement;
    expect(option).toBeTruthy();
    expect(option.getAttribute('aria-describedby')).toBe(alert.id);
    expect(option.getAttribute('aria-errormessage')).toBe(alert.id);
  });

  it('button-group-select: paired span resolves and carries the message (group emits no aria reference today)', () => {
    renderForm([
      {
        type: 'button-group-select',
        name: 'site',
        label: 'Site',
        options: [],
        optionsSourceState: SOURCE_ERROR_STATE,
      },
    ]);
    const alert = document.querySelector('[data-slot="button-group-select-error"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.id).toMatch(/^site-\d+-source-error$/);
    expect(alert.textContent).toBe('Options failed');
    expect(document.getElementById(alert.id)).toBe(alert);
    const group = document.querySelector('[data-slot="button-group-select-options"]') as HTMLElement;
    // recorded as-is: this instance registers no aria reference on the group.
    expect(group.getAttribute('aria-describedby')).toBeNull();
    expect(group.getAttribute('aria-errormessage')).toBeNull();
  });

  it('select without a source error emits no source-error aria and no paired span', () => {
    renderForm([
      { type: 'select', name: 'role', label: 'Role', options: [{ label: 'Admin', value: 'a' }] },
    ]);
    expect(document.querySelector('[data-slot="select-error"]')).toBeNull();
    const trigger = screen.getByRole('combobox', { name: 'Role' });
    expect(trigger.getAttribute('aria-describedby')).toBeNull();
    expect(trigger.getAttribute('aria-errormessage')).toBeNull();
  });
});

// ── 3. component-handle focus ─────────────────────────────────────────────

describe('CX-11 handle focus pins', () => {
  it('ref-direct getFocusTarget: component:focus focuses the input element', async () => {
    renderForm([
      { type: 'input-text', id: 'inp', name: 'name', label: 'Name' },
      { type: 'button', label: 'Focus', onClick: { action: 'component:focus', componentId: 'inp' } },
    ]);
    const input = screen.getByLabelText('Name');
    expect(document.activeElement).not.toBe(input);
    fireEvent.click(screen.getByText('Focus'));
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('querySelector compensation getFocusTarget: component:focus focuses the slider thumb', async () => {
    renderForm([
      { type: 'slider', id: 'sld', name: 'score', label: 'Score' },
      { type: 'button', label: 'Focus', onClick: { action: 'component:focus', componentId: 'sld' } },
    ]);
    const thumb = document.querySelector('[data-slot="slider-thumb"]') as HTMLElement;
    expect(thumb).toBeTruthy();
    expect(document.activeElement).not.toBe(thumb);
    fireEvent.click(screen.getByText('Focus'));
    await waitFor(() => expect(document.activeElement).toBe(thumb));
  });
});

// ── 4. resetValue ref-restore variants (Phase 4 gate) ─────────────────────

describe('CX-11 resetValue variant pins', () => {
  it('input-number reset restores the mount-time initial value', async () => {
    const { container } = renderForm(
      [
        { type: 'input-number', id: 'age', name: 'age', label: 'Age' },
        { type: 'button', label: 'Reset', onClick: { action: 'component:reset', componentId: 'age' } },
        { type: 'form-state-probe', name: 'age' },
      ],
      { age: 5 },
    );
    fireEvent.change(container.querySelector('input#age-control') as HTMLInputElement, {
      target: { value: '9' },
    });
    await waitFor(() => expect(screen.getByTestId('form-state:age').textContent).toBe('9'));
    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => expect(screen.getByTestId('form-state:age').textContent).toBe('5'));
  });

  it('textarea reset restores the mount-time initial value', async () => {
    const { container } = renderForm(
      [
        { type: 'textarea', id: 'remark', name: 'remark', label: 'Remark' },
        { type: 'button', label: 'Reset', onClick: { action: 'component:reset', componentId: 'remark' } },
        { type: 'form-state-probe', name: 'remark' },
      ],
      { remark: 'init' },
    );
    fireEvent.change(container.querySelector('textarea#remark-control') as HTMLTextAreaElement, {
      target: { value: 'changed' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('form-state:remark').textContent).toBe('"changed"'),
    );
    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => expect(screen.getByTestId('form-state:remark').textContent).toBe('"init"'));
  });
});

// ── 5. date clamp family gap pins ─────────────────────────────────────────

describe('CX-11 date clamp gap pins', () => {
  function renderDatetimeField(extra: Record<string, unknown>) {
    render(
      <SchemaRenderer
        schemaUrl="test://cx11-consumer-contract-pins-datetime"
        schema={
          {
            type: 'form',
            id: 'dt-form',
            data: { at: '2024-06-10 14:30' },
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            body: [
              { type: 'input-datetime', name: 'at', label: 'At', ...extra },
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'dt-form' },
              },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
  }

  async function openPickerAndType(label: string, value: string) {
    fireEvent.click(screen.getByLabelText('At'));
    const popover = await waitFor(() => {
      const el = document.querySelector('[data-testid="date-popover"]');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    const input = Array.from(popover.querySelectorAll('input')).find(
      (candidate) => candidate.getAttribute('aria-label') === label,
    );
    expect(input).toBeTruthy();
    fireEvent.change(input as HTMLInputElement, { target: { value } });
  }

  it('basic number clamp: typed hour 25 clamps to the 23 boundary (no min/max declared)', async () => {
    renderDatetimeField({});
    await openPickerAndType('Hour', '25');
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('2024-06-10 23:30');
  });

  it('basic number clamp: typed minute 70 clamps to the 59 boundary', async () => {
    renderDatetimeField({});
    await openPickerAndType('Minute', '70');
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitCalls.length).toBe(1));
    expect(submitCalls[0].at).toBe('2024-06-10 14:59');
  });

  it('clampIntoWindow via steppers: stepping above maxTime clamps to the max boundary', async () => {
    renderForm(
      [
        {
          type: 'input-time',
          name: 'at',
          label: 'At',
          steppers: true,
          testid: 'at',
          minTime: '09:00',
          maxTime: '17:00',
        },
        { type: 'form-state-probe', name: 'at' },
      ],
      { at: '16:00' },
    );
    fireEvent.click(screen.getByTestId('at-hour-up'));
    fireEvent.click(screen.getByTestId('at-hour-up'));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('form-state:at').textContent ?? 'null')).toBe('17:00'),
    );
  });

  it('clampIntoWindow via steppers: stepping below minTime clamps to the min boundary', async () => {
    renderForm(
      [
        {
          type: 'input-time',
          name: 'at',
          label: 'At',
          steppers: true,
          testid: 'at',
          minTime: '09:00',
          maxTime: '17:00',
        },
        { type: 'form-state-probe', name: 'at' },
      ],
      { at: '10:00' },
    );
    fireEvent.click(screen.getByTestId('at-hour-down'));
    fireEvent.click(screen.getByTestId('at-hour-down'));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('form-state:at').textContent ?? 'null')).toBe('09:00'),
    );
  });
});
