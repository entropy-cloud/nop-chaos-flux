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

  it('emits the type root marker for every text-input family control (design.md §10 contract)', () => {
    cleanup();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form/input-marker-contract"
        schema={{
          type: 'form',
          data: { title: 'Hello', email: 'a@b.c', password: 'secret', notes: 'World' },
          body: [
            { type: 'input-text', name: 'title' },
            { type: 'input-email', name: 'email' },
            { type: 'input-password', name: 'password' },
            { type: 'textarea', name: 'notes' },
          ],
        } as any}
        env={env as any}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(container.querySelector('input.nop-input-text[name="title"]')).toBeTruthy();
    expect(container.querySelector('input.nop-input-email[name="email"]')).toBeTruthy();
    expect(container.querySelector('input.nop-input-password[name="password"]')).toBeTruthy();
    expect(container.querySelector('textarea.nop-textarea[name="notes"]')).toBeTruthy();
  });

  it('keeps the type root marker when the enhanced InputGroup path is active', () => {
    cleanup();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form/input-marker-enhanced"
        schema={{
          type: 'form',
          data: { title: 'Hello' },
          body: [{ type: 'input-text', name: 'title', prefix: '$', clearable: true }],
        } as any}
        env={env as any}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const group = container.querySelector('.nop-input-group');
    expect(group).toBeTruthy();
    expect(group?.classList.contains('nop-input-text')).toBe(true);
    expect(group?.querySelector('input[name="title"]')).toBeTruthy();
  });
});
