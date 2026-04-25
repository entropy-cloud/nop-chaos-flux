import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index';
import { env } from './form-test-support';

const formSchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);
const formulaCompiler = createFormulaCompiler();

describe('per-slot className props for form renderers', () => {
  afterEach(() => cleanup());

  it('applies bodyClassName to form-body', () => {
    const { container } = render(
      <formSchemaRenderer
        schemaUrl="test://slot-className/form"
        schema={{
          type: 'form',
          bodyClassName: 'grid grid-cols-2',
          body: [{ type: 'input', name: 'a' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const body = container.querySelector('[data-slot="form-body"]');
    expect(body?.className).toContain('grid');
    expect(body?.className).toContain('grid-cols-2');
  });

  it('applies actionsClassName to form-actions', () => {
    const { container } = render(
      <formSchemaRenderer
        schemaUrl="test://slot-className/form"
        schema={{
          type: 'form',
          actionsClassName: 'flex justify-end',
          body: [{ type: 'input', name: 'a' }],
          actions: [{ type: 'button', label: 'Submit' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const actions = container.querySelector('[data-slot="form-actions"]');
    expect(actions?.className).toContain('flex');
    expect(actions?.className).toContain('justify-end');
  });

  it('applies bodyClassName to fieldset-body', () => {
    const { container } = render(
      <formSchemaRenderer
        schemaUrl="test://slot-className/fieldset"
        schema={{
          type: 'fieldset',
          bodyClassName: 'space-y-2',
          body: [{ type: 'input', name: 'a' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const body = container.querySelector('[data-slot="fieldset-body"]');
    expect(body?.className).toContain('space-y-2');
  });

  it('applies titleClassName to fieldset-title', () => {
    const { container } = render(
      <formSchemaRenderer
        schemaUrl="test://slot-className/fieldset"
        schema={{
          type: 'fieldset',
          title: 'Personal Info',
          titleClassName: 'text-lg font-bold',
          body: [{ type: 'input', name: 'a' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const title = container.querySelector('[data-slot="fieldset-title"]');
    expect(title?.className).toContain('text-lg');
    expect(title?.className).toContain('font-bold');
  });

  it('emits no extra class when form slot props are omitted', () => {
    const { container } = render(
      <formSchemaRenderer
        schemaUrl="test://slot-className/form"
        schema={{
          type: 'form',
          body: [{ type: 'input', name: 'a' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const body = container.querySelector('[data-slot="form-body"]');
    expect(body?.getAttribute('class')).toBe('');
  });
});
