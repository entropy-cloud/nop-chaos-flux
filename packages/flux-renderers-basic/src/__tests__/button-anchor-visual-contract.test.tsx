import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// [G1-R2-视角2-01] (R2 consistency audit, P2): the `href` anchor branch used to
// render a bare <a> with only schema meta classes — variant/size fell out of the
// visual contract and the control degraded to a UA-default hyperlink.

function renderButton(schema: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-anchor-visual-contract"
      schema={{ type: 'page', body: [schema] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

afterEach(() => cleanup());

describe('[G1-R2-视角2-01] href anchor branch keeps the button visual contract', () => {
  it('anchor carries the variant visual weight (danger)', () => {
    renderButton({
      type: 'button',
      label: 'Docs',
      href: 'https://example.com',
      variant: 'danger',
      testid: 'anchor-btn',
    } as BaseSchema);
    const anchor = screen.getByText('Docs').closest('a')!;
    expect(anchor.getAttribute('href')).toBe('https://example.com');
    expect(anchor.className).toContain('bg-danger');
    // plan 2026-09-29-5: solid variants use the theme foreground token
    // (text-white fails WCAG on the dark accents)
    expect(anchor.className).toContain('text-danger-foreground');
  });

  it('anchor carries the size geometry (lg => h-9)', () => {
    renderButton({
      type: 'button',
      label: 'Docs',
      href: 'https://example.com',
      size: 'lg',
      testid: 'anchor-btn',
    } as BaseSchema);
    const anchor = screen.getByText('Docs').closest('a')!;
    expect(anchor.className).toContain('h-9');
  });

  it('anchor keeps the shared button baseline (shape/focus/haptic tokens)', () => {
    renderButton({
      type: 'button',
      label: 'Docs',
      href: 'https://example.com',
      variant: 'outline',
      testid: 'anchor-btn',
    } as BaseSchema);
    const anchor = screen.getByText('Docs').closest('a')!;
    expect(anchor.className).toContain('rounded-lg');
    expect(anchor.className).toContain('focus-visible:ring-ring/50');
    expect(anchor.className).toContain('nop-haptic');
    // outline weight lands too (border stays visible, not transparent-only)
    expect(anchor.className).toContain('border-border');
  });

  it('regular button branch is unchanged (no regression)', () => {
    renderButton({ type: 'button', label: 'Plain', testid: 'plain-btn' });
    const button = screen.getByRole('button', { name: 'Plain' });
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('h-8');
  });
});
