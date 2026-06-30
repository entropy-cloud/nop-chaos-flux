import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const { env, formStateProbeRenderer } = await import('./form-test-support.js');

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderForm(body: Record<string, unknown>[], data?: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/select-controlled-value-echo"
      schema={{
        type: 'form',
        ...(data ? { data } : {}),
        body,
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function desktopTriggerText(): string {
  const trigger = document.querySelector('[data-slot="combobox-trigger"]') as HTMLElement | null;
  return trigger?.textContent ?? '';
}

function mobileTriggerText(): string {
  const trigger = document.querySelector('[data-slot="select-mobile-trigger"]') as HTMLElement | null;
  return trigger?.textContent ?? '';
}

describe('S3 echo-fallback: value with no matching option is still visible (not blank)', () => {
  it('desktop single (non-searchable): raw value renders in the trigger, not the placeholder', () => {
    renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          placeholder: 'Pick one',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
        { type: 'form-state-probe', name: 'role' },
      ],
      { role: 'ghost' },
    );

    expect(screen.getByTestId('form-state:role').textContent).toBe('"ghost"');
    const text = desktopTriggerText();
    expect(text).toContain('ghost');
    expect(text).not.toContain('Pick one');
  });

  it('desktop single (searchable): raw value renders in the input, not empty', () => {
    renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          searchable: true,
          placeholder: 'Pick one',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
        { type: 'form-state-probe', name: 'role' },
      ],
      { role: 'ghost' },
    );

    const input = screen.getByRole('combobox', { name: 'Role' }) as HTMLInputElement;
    expect(input.value).toBe('ghost');
    expect(screen.getByTestId('form-state:role').textContent).toBe('"ghost"');
  });

  it('desktop multi: primitives without a matching option still render as chips', () => {
    renderForm(
      [
        {
          type: 'select',
          name: 'tags',
          label: 'Tags',
          multiple: true,
          options: [{ label: 'Stable', value: 'stable' }],
        },
        { type: 'form-state-probe', name: 'tags' },
      ],
      { tags: ['stable', 'ghost'] },
    );

    const chips = document.querySelectorAll('[data-slot="combobox-chip"]');
    expect(chips.length).toBe(2);
    expect(Array.from(chips).some((c) => c.textContent?.includes('Stable'))).toBe(true);
    expect(Array.from(chips).some((c) => c.textContent?.includes('ghost'))).toBe(true);
    expect(screen.getByTestId('form-state:tags').textContent).toBe('["stable","ghost"]');
  });

  it('desktop multi: clearing an echoed primitive removes it from the form value', async () => {
    renderForm(
      [
        {
          type: 'select',
          name: 'tags',
          label: 'Tags',
          multiple: true,
          options: [{ label: 'Stable', value: 'stable' }],
        },
        { type: 'form-state-probe', name: 'tags' },
      ],
      { tags: ['ghost'] },
    );

    expect(screen.getByTestId('form-state:tags').textContent).toBe('["ghost"]');
    const removeButtons = document.querySelectorAll('[data-slot="combobox-chip-remove"]');
    expect(removeButtons.length).toBe(1);
    fireEvent.click(removeButtons[0] as HTMLElement);

    await waitFor(() => {
      expect(screen.getByTestId('form-state:tags').textContent).toBe('[]');
    });
  });

  it('mobile single: raw value renders in the mobile trigger, not the placeholder', () => {
    mobileState.isMobile = true;
    renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          placeholder: 'Pick one',
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
        { type: 'form-state-probe', name: 'role' },
      ],
      { role: 'ghost' },
    );

    expect(screen.getByTestId('form-state:role').textContent).toBe('"ghost"');
    expect(mobileTriggerText()).toContain('ghost');
    expect(mobileTriggerText()).not.toContain('Pick one');
  });

  it('mobile multi: primitives without a matching option appear in the trigger text', () => {
    mobileState.isMobile = true;
    renderForm(
      [
        {
          type: 'select',
          name: 'tags',
          label: 'Tags',
          multiple: true,
          options: [{ label: 'Stable', value: 'stable' }],
        },
        { type: 'form-state-probe', name: 'tags' },
      ],
      { tags: ['stable', 'ghost'] },
    );

    expect(screen.getByTestId('form-state:tags').textContent).toBe('["stable","ghost"]');
    expect(mobileTriggerText()).toContain('ghost');
  });

  it('desktop single: numeric value with no matching option renders its string form', () => {
    renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          placeholder: 'Pick one',
          options: [{ label: 'Admin', value: 'admin' }],
        },
        { type: 'form-state-probe', name: 'role' },
      ],
      { role: 42 },
    );

    expect(screen.getByTestId('form-state:role').textContent).toBe('42');
    expect(desktopTriggerText()).toContain('42');
  });

  it('desktop multi: option backfill restores matched label without losing the value', async () => {
    const { rerender } = renderForm(
      [
        {
          type: 'select',
          name: 'tags',
          label: 'Tags',
          multiple: true,
          options: [{ label: 'Stable', value: 'stable' }],
        },
        { type: 'form-state-probe', name: 'tags' },
      ],
      { tags: ['stable', 'ghost'] },
    );

    let chips = document.querySelectorAll('[data-slot="combobox-chip"]');
    expect(Array.from(chips).some((c) => c.textContent?.includes('ghost'))).toBe(true);

    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
    rerender(
      <SchemaRenderer
        schemaUrl="test://form/select-controlled-value-echo"
        schema={{
          type: 'form',
          data: { tags: ['stable', 'ghost'] },
          body: [
            {
              type: 'select',
              name: 'tags',
              label: 'Tags',
              multiple: true,
              options: [
                { label: 'Stable', value: 'stable' },
                { label: 'Ghost Label', value: 'ghost' },
              ],
            },
            { type: 'form-state-probe', name: 'tags' },
          ],
        } as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    chips = document.querySelectorAll('[data-slot="combobox-chip"]');
    expect(Array.from(chips).some((c) => c.textContent?.includes('Ghost Label'))).toBe(true);
    expect(screen.getByTestId('form-state:tags').textContent).toBe('["stable","ghost"]');
  });

  it('desktop single: disabled field still echoes the raw value (degradation does not blank the trigger)', () => {
    renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          placeholder: 'Pick one',
          disabled: true,
          options: [{ label: 'Admin', value: 'admin' }],
        },
        { type: 'form-state-probe', name: 'role' },
      ],
      { role: 'ghost' },
    );

    expect(screen.getByTestId('form-state:role').textContent).toBe('"ghost"');
    expect(desktopTriggerText()).toContain('ghost');
  });

  it('desktop single: readOnly field still echoes the raw value', () => {
    renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          placeholder: 'Pick one',
          readOnly: true,
          options: [{ label: 'Admin', value: 'admin' }],
        },
        { type: 'form-state-probe', name: 'role' },
      ],
      { role: 'ghost' },
    );

    expect(screen.getByTestId('form-state:role').textContent).toBe('"ghost"');
    expect(desktopTriggerText()).toContain('ghost');
  });

  it('desktop single: noMatchText overrides the raw value string for the echoed label', () => {
    renderForm(
      [
        {
          type: 'select',
          name: 'role',
          label: 'Role',
          placeholder: 'Pick one',
          noMatchText: '(unknown)',
          options: [{ label: 'Admin', value: 'admin' }],
        },
        { type: 'form-state-probe', name: 'role' },
      ],
      { role: 'ghost' },
    );

    expect(screen.getByTestId('form-state:role').textContent).toBe('"ghost"');
    expect(desktopTriggerText()).toContain('(unknown)');
    expect(desktopTriggerText()).not.toContain('ghost');
  });
});

describe('S1 LOCK: multi value keeps special-character primitives whole (delimiter-immune)', () => {
  it('preserves primitives containing , @ and unicode as whole array entries', () => {
    renderForm(
      [
        {
          type: 'select',
          name: 'tags',
          label: 'Tags',
          multiple: true,
          options: [
            { label: 'Comma,Val', value: 'a,b' },
            { label: 'At@Sym', value: 'x@y' },
            { label: 'Unicode 你好', value: '你好' },
          ],
        },
        { type: 'form-state-probe', name: 'tags' },
      ],
      { tags: ['a,b', 'x@y', '你好'] },
    );

    const chips = document.querySelectorAll('[data-slot="combobox-chip"]');
    expect(chips.length).toBe(3);
    expect(Array.from(chips).some((c) => c.textContent?.includes('Comma,Val'))).toBe(true);
    expect(Array.from(chips).some((c) => c.textContent?.includes('At@Sym'))).toBe(true);
    expect(Array.from(chips).some((c) => c.textContent?.includes('Unicode 你好'))).toBe(true);

    expect(screen.getByTestId('form-state:tags').textContent).toBe('["a,b","x@y","你好"]');
  });

  it('selecting an option with a comma in its value writes a single whole primitive', async () => {
    renderForm([
      {
        type: 'select',
        name: 'tags',
        label: 'Tags',
        multiple: true,
        options: [{ label: 'Comma,Val', value: 'a,b' }],
      },
      { type: 'form-state-probe', name: 'tags' },
    ]);

    const trigger = screen.getByRole('combobox', { name: 'Tags' });
    fireEvent.mouseDown(trigger);
    fireEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'Comma,Val' });
    fireEvent.mouseEnter(option);
    fireEvent.mouseMove(option);
    await new Promise((r) => setTimeout(r, 0));
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByTestId('form-state:tags').textContent).toBe('["a,b"]');
    });
  });
});
