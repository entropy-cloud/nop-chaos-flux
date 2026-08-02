import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import type { ApiFetcher } from '@nop-chaos/flux-core';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

/**
 * C2.3 P2-2/P2-3 回归：选择控件默认文案必须走 i18n（t()），不得硬编码英文。
 *  - switch 缺省状态文案（On/Off）→ flux.form.switchOn/switchOff
 *  - select 远程搜索失败缺省文案 → flux.form.searchFailed
 * 测试将 t() 桩为 `i18n:<key>`，断言 DOM 文本来自 key 而非字面量。
 */
vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => `i18n:${key}`,
  initFluxI18n: () => {},
  resetFluxI18n: () => {},
}));

const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  formStateProbeRenderer,
]);
const formulaCompiler = createFormulaCompiler();

afterEach(() => cleanup());

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>, envOverride?: Record<string, unknown>) {
  return render(
    <SchemaRenderer
      schemaUrl="test://choice-error-i18n"
      schema={
        {
          type: 'form',
          ...(data ? { data } : {}),
          body,
        } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={{ ...env, ...envOverride }}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('choice default copy goes through t() (P2-2/P2-3)', () => {
  it('switch unchecked shows i18n:flux.form.switchOff by default', () => {
    const { container } = renderForm([{ type: 'switch', name: 'active', label: 'Active' }]);
    const label = container.querySelector('[data-slot="switch-label"]');
    expect(label?.textContent).toBe('i18n:flux.form.switchOff');
  });

  it('switch checked shows i18n:flux.form.switchOn by default', async () => {
    const { container } = renderForm([{ type: 'switch', name: 'active', label: 'Active' }], { active: true });
    await waitFor(() => {
      const label = container.querySelector('[data-slot="switch-label"]');
      expect(label?.textContent).toBe('i18n:flux.form.switchOn');
    });
  });

  it('custom option.onLabel/offLabel wins over the i18n default', () => {
    const { container } = renderForm([
      {
        type: 'switch',
        name: 'active',
        label: 'Active',
        option: { onLabel: 'YES', offLabel: 'NO' },
      },
    ]);
    const label = container.querySelector('[data-slot="switch-label"]');
    expect(label?.textContent).toBe('NO');
  });

  it('select remote search failure with an opaque error shows i18n:flux.form.searchFailed', async () => {
    // Reject with a non-string, non-Error value so the runtime has no usable
    // message and must fall back to the localized default.
    const mockFetcher = vi.fn(async () => {
      throw { code: 'E_NET' };
    });
    const fetcher = mockFetcher as unknown as ApiFetcher;
    renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          searchable: true,
          searchSource: { action: 'ajax', args: { url: '/api/search' } },
          options: [],
        },
      ],
      undefined,
      { fetcher },
    );

    const input = screen.getByRole('combobox', { name: 'Role' }) as HTMLInputElement;
    fireEvent.mouseDown(input);
    fireEvent.click(input);
    fireEvent.input(input, { target: { value: 'x' } });

    await waitFor(
      () => {
        const errorSlot = document.querySelector('[data-slot="select-error"]');
        expect(errorSlot?.textContent).toContain('i18n:flux.form.searchFailed');
      },
      { timeout: 4000 },
    );
  });
});
