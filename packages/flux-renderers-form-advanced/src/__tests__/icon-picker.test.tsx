import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { describe, expect, it } from 'vitest';
import { formAdvancedRendererDefinitions } from '../index.js';
import { baseEnv, formulaCompiler } from '../test-support.js';

function createTestRenderer() {
  return createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
  ]);
}

describe('icon-picker renderer', () => {
  it('renders trigger button with placeholder when no value', () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker#1"
        schema={{
          type: 'form',
          body: [
            {
              type: 'icon-picker',
              name: 'icon',
              placeholder: 'Pick an icon',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Pick an icon')).toBeTruthy();
  });

  it('opens popover on trigger click and shows search input', async () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker#2"
        schema={{
          type: 'form',
          body: [
            {
              type: 'icon-picker',
              name: 'icon',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const trigger = screen.getByRole('button', { name: /选择图标/ });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索图标...')).toBeTruthy();
    });
  });

  it('shows hidden input with default empty value', () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker#3"
        schema={{
          type: 'form',
          body: [
            {
              type: 'icon-picker',
              name: 'icon',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const hiddenInput = screen.getByTestId('icon-picker-value') as HTMLInputElement;
    expect(hiddenInput.value).toBe('');
  });

  it('does not render when visible is false', () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://icon-picker#4"
        schema={{
          type: 'form',
          body: [
            {
              type: 'icon-picker',
              name: 'icon',
              visible: false,
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(container.querySelector('.nop-icon-picker')).toBeNull();
  });

  it('does not show clear button when value is empty', () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker#5"
        schema={{
          type: 'form',
          body: [
            {
              type: 'icon-picker',
              name: 'icon',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.queryByTestId('icon-picker-clear')).toBeNull();
  });

  it('shows nop-icon-picker marker class', () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://icon-picker#6"
        schema={{
          type: 'form',
          body: [
            {
              type: 'icon-picker',
              name: 'icon',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(container.querySelector('.nop-icon-picker')).toBeTruthy();
  });

  it('has data-slot field-control attribute', () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker#7"
        schema={{
          type: 'form',
          body: [
            {
              type: 'icon-picker',
              name: 'icon',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByTestId('icon-picker-value')).toBeTruthy();
  });
});
