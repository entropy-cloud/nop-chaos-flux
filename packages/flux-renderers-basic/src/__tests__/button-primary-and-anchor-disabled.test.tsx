import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { buttonVariants } from '@nop-chaos/ui';
import { basicRendererDefinitions } from '../index.js';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// [G1-视角2-01] + [G7-视角2-01] (R2 consistency audit, P1): `variant: "primary"`
// is the documented main-action convention (styling-system.md) but the ui cva
// table has no `primary` key, and the renderer/schema unions reject the value —
// schemas got stripped at compile time and the renderer contract had no primary
// branch at all.

function renderButton(schema: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-primary-variant"
      schema={{ type: 'page', body: [schema] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

afterEach(() => cleanup());

describe('[G1-视角2-01][G7-视角2-01] variant:"primary" renders with primary weight', () => {
  it('ui buttonVariants resolves the primary key to primary visual weight', () => {
    const cls = buttonVariants({ variant: 'primary' as never });
    expect(cls).toContain('bg-primary');
    expect(cls).toContain('text-primary-foreground');
  });

  it('primary is a legal button variant in the renderer prop contract', () => {
    const def = basicRendererDefinitions.find((d) => d.type === 'button');
    expect(def).toBeTruthy();
    const shape = def!.propContracts?.variant?.shape as unknown as {
      anyOf: Array<{ kind: string; value: string }>;
    };
    expect(shape.anyOf).toContainEqual({ kind: 'literal', value: 'primary' });
  });

  it('a primary schema button renders with primary weight (no compile-time strip)', () => {
    renderButton({ type: 'button', label: 'Save', variant: 'primary', testid: 'save-btn' });
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('text-primary-foreground');
  });

  it('default variant is unchanged (no regression)', () => {
    renderButton({ type: 'button', label: 'Plain', testid: 'plain-btn' });
    expect(screen.getByRole('button', { name: 'Plain' }).className).toContain('bg-primary');
  });
});

// [G1-视角3-02] (R2 consistency audit, P1): the href anchor branch skipped the
// action but still navigated, with no disabled visuals — "disabled" was a no-op.
describe("[G1-视角3-02] href anchor branch honors disabled/loading", () => {
  it('disabled anchor: drops href, sets aria-disabled and disabled visuals', () => {
    const onClick = vi.fn();
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://button-primary-variant#anchor-disabled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Docs',
              href: 'https://example.com',
              disabled: true,
              onClick: { action: 'probe:hit' },
            } as unknown as BaseSchema,
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(scope: any) => {
          scope?.registerNamespace('probe', {
            kind: 'host',
            invoke: () => ({ ok: true, data: null }),
          });
        }}
      />,
    );
    const anchor = screen.getByText('Docs').closest('a')!;
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBeNull();
    expect(anchor.getAttribute('aria-disabled')).toBe('true');
    expect(anchor.className).toContain('pointer-events-none');
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.click(anchor);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('clean anchor keeps href and navigation semantics (no regression)', () => {
    renderButton({
      type: 'button',
      label: 'Docs',
      href: 'https://example.com',
    } as BaseSchema);
    const anchor = screen.getByText('Docs').closest('a')!;
    expect(anchor.getAttribute('href')).toBe('https://example.com');
    expect(anchor.getAttribute('aria-disabled')).toBeNull();
  });
});
