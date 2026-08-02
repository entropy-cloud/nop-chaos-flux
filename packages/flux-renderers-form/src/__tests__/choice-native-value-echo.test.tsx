import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  formStateProbeRenderer,
]);
const formulaCompiler = createFormulaCompiler();

afterEach(() => cleanup());

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  return render(
    <SchemaRenderer
      schemaUrl="test://choice-native-value-echo"
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

/**
 * CX-6 回归：选择控件 single 模式必须保留 option.value 的原生类型
 * （string | number | boolean，SelectOptionSchema 契约），选中态 echo 用
 * Object.is 匹配。stringAdapter 字符串化会把 0/true 这类 falsy/非字符串值
 * 变成 '0'/'true'，导致 `Object.is(option.value, value)` 恒 false。
 */
describe('choice single native option value echo (CX-6)', () => {
  it('select single with numeric form value shows the matching option label', async () => {
    const { container } = renderForm(
      [
        {
          type: 'select',
          name: 'level',
          label: 'Level',
          options: [
            { label: 'L0', value: 0 },
            { label: 'L1', value: 1 },
          ],
        },
        { type: 'form-state-probe', name: 'level' },
      ],
      { level: 0 },
    );
    await waitFor(() => {
      expect(screen.getByTestId('form-state:level').textContent).toBe('0');
    });
    const trigger = container.querySelector('[data-slot="combobox-trigger"]');
    expect(trigger).toBeTruthy();
    await waitFor(() => {
      expect(trigger?.textContent).toContain('L0');
    });
  });

  it('select single with boolean form value shows the matching option label', async () => {
    const { container } = renderForm(
      [
        {
          type: 'select',
          name: 'flag',
          label: 'Flag',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
      ],
      { flag: true },
    );
    const trigger = container.querySelector('[data-slot="combobox-trigger"]');
    expect(trigger).toBeTruthy();
    await waitFor(() => {
      expect(trigger?.textContent).toContain('Yes');
    });
  });

  it('radio-group with numeric form value checks the matching radio', async () => {
    const { container } = renderForm(
      [
        {
          type: 'radio-group',
          name: 'num',
          label: 'Num',
          options: [
            { label: 'Zero', value: 0 },
            { label: 'One', value: 1 },
          ],
        },
      ],
      { num: 0 },
    );
    await waitFor(() => {
      const checked = container.querySelector('[role="radio"][aria-checked="true"]');
      expect(checked).toBeTruthy();
      expect(checked?.closest('label')?.textContent).toContain('Zero');
    });
  });

  it('button-group-select single with numeric form value marks the matching button selected', async () => {
    const { container } = renderForm(
      [
        {
          type: 'button-group-select',
          name: 'size',
          label: 'Size',
          options: [
            { label: 'S', value: 0 },
            { label: 'M', value: 1 },
          ],
        },
      ],
      { size: 1 },
    );
    await waitFor(() => {
      const selected = container.querySelector(
        '[data-slot="button-group-select-item"][data-selected]',
      );
      expect(selected).toBeTruthy();
      expect(selected?.textContent).toContain('M');
    });
  });

  it('select single clicking a numeric option stores the native number in the form', async () => {
    const { container } = renderForm([
      {
        type: 'select',
        name: 'level',
        label: 'Level',
        options: [
          { label: 'L0', value: 0 },
          { label: 'L1', value: 1 },
        ],
      },
      { type: 'form-state-probe', name: 'level' },
    ]);
    const trigger = container.querySelector('[data-slot="combobox-trigger"]') as HTMLElement;
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'L1' });
    fireEvent.click(option);
    await waitFor(() => {
      expect(screen.getByTestId('form-state:level').textContent).toBe('1');
    });
  });

  it('radio-group selecting a numeric option stores the native number in the form', async () => {
    const { container } = renderForm([
      {
        type: 'radio-group',
        name: 'num',
        label: 'Num',
        options: [
          { label: 'Zero', value: 0 },
          { label: 'One', value: 1 },
        ],
      },
      { type: 'form-state-probe', name: 'num' },
    ]);
    const radios = container.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(2);
    const one = Array.from(radios).find((el) => el.getAttribute('aria-label') === 'One') as HTMLElement;
    expect(one).toBeTruthy();
    fireEvent.click(one);
    await waitFor(() => {
      expect(screen.getByTestId('form-state:num').textContent).toBe('1');
    });
  });

  it('radio-group with no initial value stays Base UI-controlled (no uncontrolled->controlled flip)', async () => {
    // CX-6 regression: the value-preserving adapter must not turn an empty
    // radio-group uncontrolled (React warning "changing the uncontrolled value
    // state of RadioGroup to be controlled").
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      renderForm([
        {
          type: 'radio-group',
          name: 'size',
          label: 'Size',
          options: [
            { label: 'Small', value: 'sm' },
            { label: 'Large', value: 'lg' },
          ],
        },
      ]);
      const radios = document.querySelectorAll('[role="radio"]');
      const large = Array.from(radios).find((el) => el.getAttribute('aria-label') === 'Large') as HTMLElement;
      fireEvent.click(large);
      await waitFor(() => {
        const checked = document.querySelector('[role="radio"][aria-checked="true"]');
        expect(checked?.getAttribute('aria-label')).toBe('Large');
      });
      expect(
        errorSpy.mock.calls.some((call) =>
          call.some((arg) => typeof arg === 'string' && arg.includes('uncontrolled value state')),
        ),
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
