import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useCurrentForm } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { env } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';

const allDefs = [
  ...basicRendererDefinitions,
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
];

afterEach(() => {
  cleanup();
});

function FormCommitProbeRenderer(props: RendererComponentProps) {
  const form = useCurrentForm();
  const path = String(props.props.name ?? props.schema.name ?? '');

  React.useEffect(() => {
    if (!form || !path) {
      return;
    }

    const commitLog = (window as typeof window & {
      __NOP_CONDITION_BUILDER_COMMIT_LOG__?: Array<{ timestamp: number; conjunction: unknown }>;
    }).__NOP_CONDITION_BUILDER_COMMIT_LOG__;

    return form.store.subscribe(() => {
      const values = form.store.getState().values as Record<string, unknown>;
      const value = values[path] as { conjunction?: unknown } | undefined;
      commitLog?.push({
        timestamp: performance.now(),
        conjunction: value?.conjunction,
      });
    });
  }, [form, path]);

  return null;
}

const formCommitProbeRenderer: RendererDefinition = {
  type: 'form-commit-probe',
  component: FormCommitProbeRenderer,
};

function renderConditionBuilder() {
  const SchemaRenderer = createSchemaRenderer([...allDefs, formCommitProbeRenderer]);
  const hostWindow = window as typeof window & {
    __NOP_CONDITION_BUILDER_COMMIT_LOG__?: Array<{ timestamp: number; conjunction: unknown }>;
  };

  hostWindow.__NOP_CONDITION_BUILDER_COMMIT_LOG__ = [];

  render(
    <SchemaRenderer
      schemaUrl="test://flux-renderers-form-advanced/condition-builder/latency"
      schema={
        {
          type: 'form',
          data: {
            filters: {
              id: 'root',
              conjunction: 'and',
              children: [
                {
                  id: 'item-1',
                  left: { type: 'field', field: 'status' },
                  op: 'equal',
                  right: 'active',
                },
              ],
            },
          },
          body: [
            {
              type: 'condition-builder',
              name: 'filters',
              label: 'Filters',
              fields: [{ name: 'status', label: 'Status', type: 'text' }],
            },
            {
              type: 'form-commit-probe',
              name: 'filters',
            },
          ],
        } as any
      }
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );

  return hostWindow.__NOP_CONDITION_BUILDER_COMMIT_LOG__;
}

describe('condition-builder conjunction toggle diagnostics', () => {
  it('switches pressed state immediately after click', async () => {
    renderConditionBuilder();

    await screen.findByRole('button', { name: 'AND' });

    const andButton = screen.getByRole('button', { name: 'AND' });
    const orButton = screen.getByRole('button', { name: 'OR' });

    expect(andButton.getAttribute('aria-pressed')).toBe('true');
    expect(orButton.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(orButton);

    await waitFor(() => {
      expect(andButton.getAttribute('aria-pressed')).toBe('false');
      expect(orButton.getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('publishes a bounded number of form store commits for one conjunction change', async () => {
    const commitLog = renderConditionBuilder();

    await screen.findByRole('button', { name: 'AND' });

    const orButton = screen.getByRole('button', { name: 'OR' });
    fireEvent.click(orButton);

    await waitFor(() => {
      expect(orButton.getAttribute('aria-pressed')).toBe('true');
    });

    expect(commitLog.length).toBeLessThanOrEqual(2);
    expect(commitLog.at(-1)?.conjunction).toBe('or');
  });

  it('does not animate conjunction pill state changes', async () => {
    renderConditionBuilder();

    const andButton = await screen.findByRole('button', { name: 'AND' });
    const orButton = screen.getByRole('button', { name: 'OR' });

    expect(andButton.className).toContain('transition-none');
    expect(orButton.className).toContain('transition-none');
    expect(andButton.className).not.toContain('transition-colors');
    expect(orButton.className).not.toContain('transition-colors');
  });

  it('keeps selected conjunction hover styles aligned with the selected state', async () => {
    renderConditionBuilder();

    const andButton = await screen.findByRole('button', { name: 'AND' });
    const orButton = screen.getByRole('button', { name: 'OR' });

    expect(andButton.className).toContain('hover:bg-primary');
    expect(andButton.className).toContain('hover:text-primary-foreground');
    expect(orButton.className).not.toContain('hover:bg-primary');

    fireEvent.click(orButton);

    await waitFor(() => {
      expect(orButton.getAttribute('aria-pressed')).toBe('true');
    });

    expect(orButton.className).toContain('hover:bg-primary');
    expect(orButton.className).toContain('hover:text-primary-foreground');
  });
});
