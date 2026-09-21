import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { afterEach, describe, expect, it } from 'vitest';
import { formAdvancedRendererDefinitions } from '../index.js';
import { baseEnv, formulaCompiler, installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

function createTestRenderer() {
  return createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
  ]);
}

async function openIconListbox() {
  const SchemaRenderer = createTestRenderer();
  render(
    <SchemaRenderer
      schemaUrl="test://icon-picker-v12f-roving"
      schema={
        {
          type: 'form',
          data: {},
          body: [{ type: 'icon-picker', name: 'icon', label: 'Icon' }],
        } as never
      }
      env={baseEnv}
      formulaCompiler={formulaCompiler}
    />,
  );
  fireEvent.click(document.querySelector('[data-slot="icon-picker-trigger"]')!);
  const listbox = await screen.findByRole('listbox');
  return listbox;
}

/**
 * V12f Phase 1 — [G2-R7-视角9-01] icon-picker 方向键 roving tabindex。
 * listbox 选项原先全是默认可 Tab 的按钮：列表内出现上百个 tab stop，
 * 且没有方向键移动。契约：roving tabindex（恰好一个 option tabIndex=0，
 * 其余 -1）+ 方向键在选项间移动焦点。
 */
describe('V12f [G2-R7-视角9-01] icon-picker roving tabindex + arrow keys', () => {
  afterEach(() => cleanup());

  it('exposes a single roving tab stop among the options', async () => {
    const listbox = await openIconListbox();
    const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
    expect(options.length).toBeGreaterThan(1);

    const tabStops = options.filter((option) => option.getAttribute('tabindex') === '0');
    expect(tabStops.length).toBe(1);
    options
      .filter((option) => option !== tabStops[0])
      .forEach((option) => expect(option.getAttribute('tabindex')).toBe('-1'));
  });

  it('ArrowDown moves focus to the next option', async () => {
    const listbox = await openIconListbox();
    const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
    const first = options[0]!;
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options[1]!);

    fireEvent.keyDown(options[1]!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(first);
  });

  it('activating an option selects the icon', async () => {
    const listbox = await openIconListbox();
    const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
    fireEvent.click(options[2]!);
    const hidden = document.querySelector<HTMLInputElement>('input[data-testid="icon-picker-value"]');
    expect(hidden?.value.length).toBeGreaterThan(0);
  });
});
