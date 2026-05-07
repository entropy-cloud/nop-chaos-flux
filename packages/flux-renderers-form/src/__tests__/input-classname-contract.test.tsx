import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';

const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

const env = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: {} as T }),
  notify: () => undefined,
};

describe('input renderer root className contract', () => {
  it('merges schema className into input-text, textarea, and input-number control roots', () => {
    cleanup();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form/input-classname-contract"
        schema={{
          type: 'form',
          data: { title: 'Hello', notes: 'World', count: 1 },
          body: [
            { type: 'input-text', name: 'title', className: 'custom-input-text' },
            { type: 'textarea', name: 'notes', className: 'custom-textarea' },
            { type: 'input-number', name: 'count', className: 'custom-input-number' },
          ],
        } as any}
        env={env as any}
        formulaCompiler={createFormulaCompiler()}
      />, 
    );

    expect(container.querySelector('input.custom-input-text')).toBeTruthy();
    expect(container.querySelector('textarea.custom-textarea')).toBeTruthy();
    expect(container.querySelector('.nop-input-number.custom-input-number')).toBeTruthy();
  });
});
