import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { ToolbarButton } from './toolbar-button.js';

// P1-MA4.4-008 regression guard: the bug-19 family contract — inside a
// wrapping <label>, toolbar buttons must NOT render as <button> elements
// (a nested button steals the label click). The single defense is
// toolbar-button.tsx `render={<span/>}` + `nativeButton={false}`; the
// d5ae387 migration regressed this once and only manual verification caught
// it. These tests turn that regression into a red light.

afterEach(cleanup);

describe('ToolbarButton label-safe rendering (P1-MA4.4-008)', () => {
  it('renders no <button> descendant inside a wrapping label', () => {
    const { container } = render(
      <label>
        <span data-testid="label-text">Code</span>
        <ToolbarButton aria-label="Format code" onPress={() => undefined}>
          fmt
        </ToolbarButton>
      </label>,
    );

    const label = container.querySelector('label');
    expect(label).toBeTruthy();
    expect(label?.querySelectorAll('button')).toHaveLength(0);
  });

  it('forwards aria-label and click handling through the span rendering', () => {
    const onPress = vi.fn();
    const onClick = vi.fn();
    const { getByLabelText } = render(
      <ToolbarButton aria-label="Format code" onPress={onPress} onClick={onClick}>
        fmt
      </ToolbarButton>,
    );

    const control = getByLabelText('Format code');
    expect(control.tagName).toBe('SPAN');
    fireEvent.click(control);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('integration: the code-editor toolbar keeps the label button-free', async () => {
    // heavier harness — verify lazily so the unit legs stay fast
    const { createSchemaRenderer, createDefaultRegistry } = await import('@nop-chaos/flux-react');
    const { createFormulaCompiler } = await import('@nop-chaos/flux-formula');
    const { codeEditorRendererDefinition } = await import('../index.js');
    const { registerBasicRenderers } = await import('@nop-chaos/flux-renderers-basic');
    const { registerFormRenderers } = await import('@nop-chaos/flux-renderers-form');
    const { registerDataRenderers } = await import('@nop-chaos/flux-renderers-data');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const registry = createDefaultRegistry();
    registerBasicRenderers(registry);
    registerFormRenderers(registry);
    registerDataRenderers(registry);
    registry.register(codeEditorRendererDefinition);

    const SchemaRenderer = createSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://flux-code-editor/label-contract"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'code-editor',
                name: 'snippet',
                language: 'javascript',
                label: {
                  type: 'text',
                  text: 'Snippet',
                },
              },
            ],
          } as never
        }
        env={{ fetcher: async <T,>() => ({ status: 0, data: null as T }), notify: () => undefined }}
        registry={registry}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(container.querySelector('.cm-editor')).toBeTruthy(), { timeout: 5000 });

    const label = container.querySelector('label');
    expect(label).toBeTruthy();
    // bug-19: no <button> may live inside the wrapping label
    expect(label?.querySelectorAll('button')).toHaveLength(0);
    consoleError.mockRestore();
  });
});
