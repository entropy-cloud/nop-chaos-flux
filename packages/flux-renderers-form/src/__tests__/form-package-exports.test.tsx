import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { FieldError, FieldHelpText, FieldLabel } from '../renderers/shared/index.js';
import { FieldsetRenderer } from '../renderers/fieldset.js';
import type { FieldsetSchema } from '../renderers/fieldset.js';
import { formRendererDefinition, formRendererDefinitions, registerFormRenderers } from '../index.js';

describe('form package exports', () => {
  it('re-exports form definitions and registers them', () => {
    const registry = createRendererRegistry();
    registerFormRenderers(registry);

    expect(formRendererDefinitions.map((item) => item.type)).toContain('form');
    expect(formRendererDefinition.type).toBe('form');
    expect(registry.get('form')?.type).toBe('form');
    expect(registry.get('fieldset')?.type).toBe('fieldset');
  });

});

describe('shared renderer primitives direct branches', () => {
  it('renders null when shared helpers have no content', () => {
    const { container, rerender } = render(<FieldError />);
    expect(container.innerHTML).toBe('');

    rerender(<FieldHelpText />);
    expect(container.innerHTML).toBe('');

    rerender(<FieldLabel />);
    expect(container.innerHTML).toBe('');
  });
});

describe('FieldsetRenderer', () => {
  it('renders collapsed and toggles when collapsible', () => {
    render(
      <FieldsetRenderer
        id="fieldset-1"
        path="$.body[0]"
        props={{ title: 'Advanced', collapsible: true, collapsed: true, bodyClassName: 'body-x' }}
        schema={{ type: 'fieldset' } as FieldsetSchema}
        meta={{ className: 'outer-x', cid: '1' } as any}
        events={{}}
        helpers={{} as any}
        regions={{}}
        templateNode={{} as any}
        node={{} as any}
      />,
    );

    const fieldset = document.querySelector('.nop-fieldset') as HTMLElement;
    const body = document.querySelector('[data-slot="fieldset-body"]') as HTMLElement;
    const legend = screen.getByText('Advanced');

    expect(fieldset.dataset.collapsible).toBe('true');
    expect(fieldset.dataset.collapsed).toBe('true');
    expect(body.style.display).toBe('none');

    fireEvent.click(legend);
    expect(fieldset.dataset.collapsed).toBeUndefined();
    expect(body.style.display).toBe('');
  });

  it('does not toggle when not collapsible and hides missing title/body content', () => {
    render(
      <FieldsetRenderer
        id="fieldset-2"
        path="$.body[1]"
        props={{ title: 'Static', collapsible: false }}
        schema={{ type: 'fieldset' } as FieldsetSchema}
        meta={{} as any}
        events={{}}
        helpers={{} as any}
        regions={{ body: null as any }}
        templateNode={{} as any}
        node={{} as any}
      />,
    );

    const fieldset = document.querySelector('fieldset') as HTMLElement;
    const body = document.querySelector('[data-slot="fieldset-body"]') as HTMLElement;

    const beforeCollapsed = fieldset.dataset.collapsed;
    fireEvent.click(screen.getByText('Static'));
    expect(fieldset.dataset.collapsible).toBe('true');
    expect(fieldset.dataset.collapsed).toBe(beforeCollapsed);
    expect(body.textContent).toBe('');
  });
});
