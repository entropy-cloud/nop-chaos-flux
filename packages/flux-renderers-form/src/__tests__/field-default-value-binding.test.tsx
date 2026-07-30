import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env as baseEnv } from '../test-support.js';
import type { BaseSchema } from '@nop-chaos/flux-core';

type SchemaInput = BaseSchema | BaseSchema[];

function renderSchema(schema: SchemaInput) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://default-value"
      schema={schema}
      env={baseEnv}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('field defaultValue binding', () => {
  it('initializes form state from schema value when form data does not have the field', async () => {
    cleanup();

    renderSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'test-form',
          name: 'test-form',
          body: [
            {
              type: 'switch',
              name: 'enabled',
              label: 'Enabled',
              trueValue: 1,
              falseValue: 0,
              value: 0,
            },
            {
              type: 'input-text',
              name: 'priority',
              label: 'Priority',
              value: 'high',
            },
          ],
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 500));

    // switch value=0 → unchecked
    const switchEl = document.querySelector('[role="switch"]');
    expect(switchEl?.getAttribute('aria-checked')).toBe('false');

    // input-text value="high" → input shows "high"
    const input = screen.getByLabelText('Priority') as HTMLInputElement;
    expect(input.value).toBe('high');
  });

  it('does NOT override existing form data with schema value', async () => {
    cleanup();

    renderSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'test-form',
          name: 'test-form',
          data: { enabled: 1 },
          body: [
            {
              type: 'switch',
              name: 'enabled',
              label: 'Enabled',
              trueValue: 1,
              falseValue: 0,
              value: 0,
            },
          ],
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 500));

    // form data has enabled=1, schema value=0 should NOT override
    const switchEl = document.querySelector('[role="switch"]');
    expect(switchEl?.getAttribute('aria-checked')).toBe('true');
  });

  it('does not re-apply defaultValue after user changes the value within the same form', async () => {
    cleanup();

    renderSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'test-form',
          name: 'test-form',
          body: [
            {
              type: 'input-text',
              name: 'name',
              label: 'Name',
              value: 'default-foo',
            },
          ],
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 500));

    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.value).toBe('default-foo');

    // User changes the value
    fireEvent.change(input, { target: { value: 'user-typed' } });
    await new Promise((r) => setTimeout(r, 300));

    // Value should be user-typed, not reverted to default-foo
    expect(input.value).toBe('user-typed');

    // Wait longer and verify it stays
    await new Promise((r) => setTimeout(r, 500));
    expect(input.value).toBe('user-typed');
  });

  it('initializes multiple fields with defaults simultaneously', async () => {
    cleanup();

    renderSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'test-form',
          name: 'test-form',
          body: [
            { type: 'input-text', name: 'a', label: 'A', value: 'AAA' },
            { type: 'input-text', name: 'b', label: 'B', value: 'BBB' },
            { type: 'input-text', name: 'c', label: 'C', value: 'CCC' },
          ],
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 500));

    expect((screen.getByLabelText('A') as HTMLInputElement).value).toBe('AAA');
    expect((screen.getByLabelText('B') as HTMLInputElement).value).toBe('BBB');
    expect((screen.getByLabelText('C') as HTMLInputElement).value).toBe('CCC');
  });

  it('resolves expression in value via flux runtime before reaching the control', async () => {
    cleanup();

    renderSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'test-form',
          name: 'test-form',
          data: { _defaultName: 'from-expr' },
          body: [
            {
              type: 'input-text',
              name: 'name',
              label: 'Name',
              value: '${_defaultName}',
            },
          ],
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 500));

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    expect(nameInput.value).toBe('from-expr');
  });

  it('expression value is reactive: when referenced variable changes, control value updates', async () => {
    cleanup();

    renderSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'test-form',
          name: 'test-form',
          data: { base: 10 },
          body: [
            {
              type: 'input-number',
              name: 'base',
              label: 'Base',
            },
            {
              type: 'input-number',
              name: 'derived',
              label: 'Derived',
              value: '${base + 1}',
            },
          ],
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 500));

    const baseInput = document.querySelector('input[name="base"]') as HTMLInputElement;
    const derivedInput = document.querySelector('input[name="derived"]') as HTMLInputElement;

    // Initial: base=10 → derived should be 11
    expect(baseInput.value).toBe('10');
    expect(derivedInput.value).toBe('11');

    // Change base to 20
    fireEvent.change(baseInput, { target: { value: '20' } });
    await new Promise((r) => setTimeout(r, 500));

    // Derived should update to 21 (expression is reactive)
    expect(derivedInput.value).toBe('21');
  });

  it('expression value does NOT overwrite user edits when referenced variable changes', async () => {
    cleanup();

    renderSchema({
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'test-form',
          name: 'test-form',
          data: { base: 10 },
          body: [
            {
              type: 'input-number',
              name: 'base',
              label: 'Base',
            },
            {
              type: 'input-number',
              name: 'derived',
              label: 'Derived',
              value: '${base + 1}',
            },
          ],
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 500));

    const baseInput = document.querySelector('input[name="base"]') as HTMLInputElement;
    const derivedInput = document.querySelector('input[name="derived"]') as HTMLInputElement;

    expect(derivedInput.value).toBe('11');

    // User manually edits derived to 99
    fireEvent.change(derivedInput, { target: { value: '99' } });
    await new Promise((r) => setTimeout(r, 300));
    expect(derivedInput.value).toBe('99');

    // Change base — derived should NOT be overwritten by expression after user edit
    fireEvent.change(baseInput, { target: { value: '50' } });
    await new Promise((r) => setTimeout(r, 500));

    // User edit (99) should be preserved, not overwritten to 51
    expect(derivedInput.value).toBe('99');
  });
});
