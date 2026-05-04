import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { describe, expect, it } from 'vitest';
import { formAdvancedRendererDefinitions } from './index';
import { baseEnv, formulaCompiler } from './test-support';

describe('tag-list renderer', () => {
  it('toggles page-scope values when used outside a form', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/tag-list.test.tsx#1"
        schema={{
          type: 'page',
          data: {},
          body: [
            {
              type: 'tag-list',
              name: 'tags',
              tags: ['red', 'blue'],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const redTag = await screen.findByText('red');
    const blueTag = screen.getByText('blue');

    const initialRedClass = redTag.closest('[role="button"]')?.className;
    const initialBlueClass = blueTag.closest('[role="button"]')?.className;

    fireEvent.click(redTag);
    await waitFor(() =>
      expect(redTag.closest('[role="button"]')?.className).not.toBe(initialRedClass),
    );

    fireEvent.click(blueTag);
    await waitFor(() =>
      expect(blueTag.closest('[role="button"]')?.className).not.toBe(initialBlueClass),
    );

    fireEvent.click(redTag);
    await waitFor(() => expect(redTag.closest('[role="button"]')?.className).toBe(initialRedClass));
  });

  it('validates required selections after the field has been touched in a form', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/tag-list.test.tsx#2"
        schema={{
          type: 'form',
          data: {
            tags: [],
          },
          body: [
            {
              type: 'tag-list',
              name: 'tags',
              label: 'Tags',
              required: true,
              tags: ['red'],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const redTag = await screen.findByText('red');
    fireEvent.focus(redTag);
    fireEvent.click(redTag);
    fireEvent.click(redTag);

    await waitFor(() => expect(screen.getByText('Tags requires at least one tag')).toBeTruthy());
  });

  it('does not toggle an internal tag action when the wrapped field shell is clicked', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/tag-list.test.tsx#3"
        schema={{
          type: 'page',
          data: {},
          body: [
            {
              type: 'tag-list',
              name: 'tags',
              label: 'Tags',
              tags: ['red'],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const redTag = await screen.findByText('red');
    const field = redTag.closest('.nop-field');

    expect(field).toBeTruthy();
    expect(redTag.closest('[role="button"]')?.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(field!);

    expect(redTag.closest('[role="button"]')?.getAttribute('aria-pressed')).toBe('false');
  });
});
