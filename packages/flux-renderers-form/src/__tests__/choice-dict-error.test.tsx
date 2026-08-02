import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

/**
 * C2.3 P2-4 回归：dict 加载失败必须在控件层展示错误（select/button-group-select
 * 的 error 槽），而不是静默空选项。缺省文案走 t('flux.form.failedToLoadOptions')
 * （en-US 测试环境 = 'Failed to load options.'）。
 */
const SchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  formStateProbeRenderer,
]);
const formulaCompiler = createFormulaCompiler();

afterEach(() => cleanup());

function renderForm(
  body: Record<string, unknown>[],
  envOverride?: Record<string, unknown>,
) {
  return render(
    <SchemaRenderer
      schemaUrl="test://choice-dict-error"
      schema={
        { type: 'form', body } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={{ ...env, ...envOverride }}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('dict load failure surfaces an error (P2-4)', () => {
  it('select renders [data-slot="select-error"] when its dict fails to load', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const loadDict = vi.fn(async () => {
      throw new Error('network down');
    });
    const { container } = renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          dict: 'role',
        },
      ],
      { loadDict },
    );

    await waitFor(() => {
      const errorSlot = container.querySelector('[data-slot="select-error"]');
      expect(errorSlot).toBeTruthy();
      expect(errorSlot?.getAttribute('role')).toBe('alert');
      expect(errorSlot?.textContent).toContain('Failed to load options.');
    });
    warnSpy.mockRestore();
  });

  it('button-group-select renders its error slot when the dict fails to load', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const loadDict = vi.fn(async () => {
      throw new Error('network down');
    });
    const { container } = renderForm(
      [
        {
          type: 'button-group-select',
          name: 'site',
          label: 'Site',
          dict: 'siteDict',
        },
      ],
      { loadDict },
    );

    await waitFor(() => {
      const errorSlot = container.querySelector('[data-slot="button-group-select-error"]');
      expect(errorSlot).toBeTruthy();
      expect(errorSlot?.getAttribute('role')).toBe('alert');
      expect(errorSlot?.textContent).toContain('Failed to load options.');
    });
    warnSpy.mockRestore();
  });
});
