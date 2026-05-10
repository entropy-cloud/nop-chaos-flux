import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

const FormSchemaRenderer = createSchemaRenderer([
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
]);
const formulaCompiler = createFormulaCompiler();

describe('form renderer DOM marker contract', () => {
  afterEach(() => cleanup());

  it('form emits nop-form marker on root element', () => {
    const { container } = render(
      <FormSchemaRenderer
        schemaUrl="test://form-markers"
        schema={{
          type: 'form',
          body: [{ type: 'input-text', name: 'a' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const form = container.querySelector('.nop-form');
    expect(form).toBeTruthy();
    expect(form?.tagName).toBe('SECTION');
  });

  it('form uses data-slot for body and actions', () => {
    const { container } = render(
      <FormSchemaRenderer
        schemaUrl="test://form-markers"
        schema={{
          type: 'form',
          body: [{ type: 'input-text', name: 'a' }],
          actions: [{ type: 'button', label: 'Submit' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="form-body"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="form-actions"]')).toBeTruthy();
  });

  it('form does not use BEM-style region classes', () => {
    const { container } = render(
      <FormSchemaRenderer
        schemaUrl="test://form-markers"
        schema={{
          type: 'form',
          body: [{ type: 'input-text', name: 'a' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('.nop-form__body')).toBeNull();
    expect(container.querySelector('.nop-form__actions')).toBeNull();
  });

  it('form applies className to root', () => {
    const { container } = render(
      <FormSchemaRenderer
        schemaUrl="test://form-markers"
        schema={{
          type: 'form',
          className: 'max-w-lg',
          body: [{ type: 'input-text', name: 'a' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const form = container.querySelector('.nop-form');
    expect(form?.className).toContain('max-w-lg');
  });

  it('fieldset emits nop-fieldset marker', () => {
    const { container } = render(
      <FormSchemaRenderer
        schemaUrl="test://form-markers"
        schema={{
          type: 'form',
          body: [
            {
              type: 'fieldset',
              title: 'Info',
              body: [{ type: 'input-text', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const fieldset = container.querySelector('.nop-fieldset');
    expect(fieldset).toBeTruthy();
    expect(fieldset?.tagName).toBe('FIELDSET');
  });

  it('fieldset uses data-slot for title and body', () => {
    const { container } = render(
      <FormSchemaRenderer
        schemaUrl="test://form-markers"
        schema={{
          type: 'form',
          body: [
            {
              type: 'fieldset',
              title: 'Personal',
              body: [{ type: 'input-text', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="fieldset-title"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="fieldset-body"]')).toBeTruthy();
  });

  it('fieldset uses data-* attributes for collapsible state, not BEM modifiers', () => {
    const { container } = render(
      <FormSchemaRenderer
        schemaUrl="test://form-markers"
        schema={{
          type: 'form',
          body: [
            {
              type: 'fieldset',
              title: 'Collapsible',
              collapsible: true,
              collapsed: true,
              body: [{ type: 'input-text', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const fieldset = container.querySelector('.nop-fieldset');
    expect(fieldset?.hasAttribute('data-collapsible')).toBe(true);
    expect(fieldset?.hasAttribute('data-collapsed')).toBe(true);
    expect(container.querySelector('.nop-fieldset--collapsed')).toBeNull();
    expect(container.querySelector('.nop-fieldset--collapsible')).toBeNull();
  });

  it('input-text renders within a field frame with nop-field marker', () => {
    const { container } = render(
      <FormSchemaRenderer
        schemaUrl="test://form-markers"
        schema={{
          type: 'form',
          body: [{ type: 'input-text', name: 'email', label: 'Email' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const field = container.querySelector('.nop-field');
    expect(field).toBeTruthy();
    expect(container.querySelector('[data-slot="field-label"]')?.textContent).toContain('Email');
  });
});
