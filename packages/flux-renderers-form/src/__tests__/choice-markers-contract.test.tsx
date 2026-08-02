import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);
const formulaCompiler = createFormulaCompiler();

afterEach(() => cleanup());

function renderForm(body: Record<string, unknown>[]) {
  return render(
    <SchemaRenderer
      schemaUrl="test://choice-markers-contract"
      schema={
        { type: 'form', body } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

/**
 * CX-5 回归：选择控件根节点必须输出 design.md §10 承诺的 type marker
 * （renderer-markers-and-selectors.md §Root Marker Rules：根 marker 只标识
 * renderer type）。`-wrapper` 后缀类保留（历史/样式基线），type marker 共存。
 */
describe('choice root type marker contract (CX-5)', () => {
  it('checkbox root emits nop-checkbox marker', () => {
    const { container } = renderForm([
      { type: 'checkbox', name: 'agree', label: 'Agree', option: { label: 'I agree' } },
    ]);
    const root = container.querySelector('[data-slot="checkbox-wrapper"]');
    expect(root).toBeTruthy();
    expect(root?.className).toMatch(/\bnop-checkbox(?!-)\b/);
  });

  it('switch root emits nop-switch marker', () => {
    const { container } = renderForm([{ type: 'switch', name: 'active', label: 'Active' }]);
    const root = container.querySelector('[data-slot="switch-wrapper"]');
    expect(root).toBeTruthy();
    expect(root?.className).toMatch(/\bnop-switch(?!-)\b/);
  });

  it('radio-group root emits nop-radio-group marker', () => {
    const { container } = renderForm([
      {
        type: 'radio-group',
        name: 'size',
        label: 'Size',
        options: [{ label: 'Small', value: 'sm' }],
      },
    ]);
    const root = container.querySelector('[data-slot="radio-group-wrapper"]');
    expect(root).toBeTruthy();
    expect(root?.className).toMatch(/\bnop-radio-group(?!-)\b/);
  });

  it('checkbox-group root emits nop-checkbox-group marker', () => {
    const { container } = renderForm([
      {
        type: 'checkbox-group',
        name: 'tags',
        label: 'Tags',
        options: [{ label: 'Stable', value: 'stable' }],
      },
    ]);
    const root = container.querySelector('[data-slot="checkbox-group-wrapper"]');
    expect(root).toBeTruthy();
    expect(root?.className).toMatch(/\bnop-checkbox-group(?!-)\b/);
  });

  it('existing -wrapper markers are preserved alongside the type marker', () => {
    const { container } = renderForm([
      { type: 'checkbox', name: 'agree', label: 'Agree', option: { label: 'I agree' } },
    ]);
    const root = container.querySelector('[data-slot="checkbox-wrapper"]');
    expect(root?.className).toContain('nop-checkbox-wrapper');
    expect(root?.className).toContain('nop-checkbox');
  });
});
