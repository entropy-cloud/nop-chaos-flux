import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

const { formRendererDefinitions } = await import('../index.js');
const { env } = await import('./form-test-support.js');

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderSelectForm(body: Record<string, unknown>[]) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/select-readonly-combobox"
      schema={{
        type: 'form',
        body,
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('select combobox readOnly visual freeze (CR condition-builder P2-4 shared, input-choice-renderers)', () => {
  it('readOnly searchable single select: input is disabled (visually non-interactive)', () => {
    renderSelectForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: true,
        readOnly: true,
        options: [{ label: 'Admin', value: 'admin' }],
      },
    ]);
    const input = screen.getByRole('combobox', { name: 'Role' }) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input!.disabled).toBe(true);
    expect(input!.getAttribute('aria-readonly')).toBe('true');
  });

  it('readOnly non-searchable single select: trigger is disabled (menu cannot open visually)', () => {
    renderSelectForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        readOnly: true,
        options: [{ label: 'Admin', value: 'admin' }],
      },
    ]);
    const trigger = document.querySelector('[data-slot="combobox-trigger"]') as HTMLElement | null;
    expect(trigger).not.toBeNull();
    expect(trigger!.hasAttribute('disabled')).toBe(true);
    expect(trigger!.getAttribute('aria-readonly')).toBe('true');
  });

  it('readOnly multi select: chips input is read-only and root disabled', () => {
    renderSelectForm([
      {
        type: 'select',
        name: 'tags',
        label: 'Tags',
        multiple: true,
        readOnly: true,
        options: [{ label: 'Alpha', value: 'a' }],
      },
    ]);
    const chipsInput = document.querySelector(
      '[data-slot="combobox-chip-input"]',
    ) as HTMLInputElement | null;
    expect(chipsInput).not.toBeNull();
    expect(chipsInput!.readOnly).toBe(true);
    expect(chipsInput!.disabled).toBe(true);
  });

  it('interactive (non-readOnly) select input stays enabled', () => {
    renderSelectForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: true,
        options: [{ label: 'Admin', value: 'admin' }],
      },
    ]);
    const input = screen.getByRole('combobox', { name: 'Role' }) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input!.disabled).toBe(false);
    expect(input!.getAttribute('aria-readonly')).toBeNull();
  });

  it('readOnly select still echoes the raw value in the trigger', () => {
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);
    render(
      <SchemaRenderer
        schemaUrl="test://form/select-readonly-echo"
        schema={
          {
            type: 'form',
            data: { role: 'ghost' },
            body: [
              {
                type: 'select',
                name: 'role',
                label: 'Role',
                readOnly: true,
                options: [{ label: 'Admin', value: 'admin' }],
              },
            ],
          } as React.ComponentProps<typeof SchemaRenderer>['schema']
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const trigger = document.querySelector('[data-slot="combobox-trigger"]') as HTMLElement | null;
    expect(trigger?.textContent ?? '').toContain('ghost');
  });

  it('renders without crashing when nothing else is selected (smoke)', () => {
    renderSelectForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: true,
        readOnly: true,
        options: [{ label: 'Admin', value: 'admin' }],
      },
    ]);
    expect(screen.getByRole('combobox', { name: 'Role' })).not.toBeNull();
  });
});
