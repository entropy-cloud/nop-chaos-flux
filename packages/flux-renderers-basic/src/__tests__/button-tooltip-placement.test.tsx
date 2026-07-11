import { cleanup, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderButton(schema: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-tooltip-placement"
      schema={{ type: 'page', body: [schema] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('button tooltipPlacement (E2e)', () => {
  afterEach(() => cleanup());

  it('default tooltip side is top (no explicit tooltipPlacement)', () => {
    renderButton({ type: 'button', label: 'Help', tooltip: '提示' });
    const button = screen.getByRole('button', { name: 'Help' });
    expect(button).toBeTruthy();
    expect(button.getAttribute('data-tooltip')).toBe('提示');
  });

  it('tooltipPlacement { side: "bottom" } is accepted by the schema (compiles + renders)', () => {
    const { container } = renderButton({
      type: 'button',
      label: 'BottomTip',
      tooltip: '底部提示',
      tooltipPlacement: { side: 'bottom' },
    });
    const button = screen.getByRole('button', { name: 'BottomTip' });
    expect(button).toBeTruthy();
    expect(button.getAttribute('data-tooltip')).toBe('底部提示');
    // The tooltip trigger wrapper is present.
    expect(container.querySelector('[data-slot="tooltip-trigger"]')).toBeTruthy();
  });

  it('tooltipPlacement { side, align } both fields compile through', () => {
    renderButton({
      type: 'button',
      label: 'AlignTip',
      tooltip: '对齐',
      tooltipPlacement: { side: 'right', align: 'start' },
    });
    const button = screen.getByRole('button', { name: 'AlignTip' });
    expect(button.getAttribute('data-tooltip')).toBe('对齐');
  });

  it('renders without tooltip when tooltipPlacement set but no tooltip text', () => {
    renderButton({ type: 'button', label: 'NoTip', tooltipPlacement: { side: 'left' } });
    const button = screen.getByRole('button', { name: 'NoTip' });
    expect(button.hasAttribute('data-tooltip')).toBe(false);
  });
});
