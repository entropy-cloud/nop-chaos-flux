import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderInPage(body: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://flex-disabled-gate"
      schema={{ type: 'page', body: [body] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

/**
 * V12e 族1 (G7-R5-视角11-06, plan 487): a clickable flex row with
 * `meta.disabled` must be a disabled control — click/keyboard channels stop
 * dispatching and the state is emitted as data-disabled + aria-disabled
 * markers (layout renderers emit markers, styling is consumed downstream).
 * Without `disabled` the clickable path is unchanged.
 */
describe('flex renderer — meta.disabled gates the clickable surface', () => {
  afterEach(cleanup);

  it('disabled=true emits disabled markers, drops from tab order, blocks dispatch', () => {
    const { container } = renderInPage({
      type: 'flex',
      testid: 'row',
      disabled: true,
      onClick: { action: 'component:noop' },
      body: [{ type: 'text', text: 'A' }],
    } as unknown as BaseSchema);
    const root = container.querySelector('[data-testid="row"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('role')).toBe('button');
    expect(root.getAttribute('aria-disabled')).toBe('true');
    expect(root.getAttribute('data-disabled')).toBe('true');
    expect(root.getAttribute('tabindex')).toBe('-1');

    // No dispatch on any channel — the gated handlers return early instead of
    // firing the (unregistered) component:noop action.
    expect(() => {
      fireEvent.click(root);
      fireEvent.keyDown(root, { key: 'Enter' });
      fireEvent.keyDown(root, { key: ' ' });
    }).not.toThrow();
  });

  it('without disabled a clickable flex stays interactive (contract preserved)', () => {
    const { container } = renderInPage({
      type: 'flex',
      testid: 'row',
      onClick: { action: 'component:noop' },
      body: [{ type: 'text', text: 'A' }],
    } as unknown as BaseSchema);
    const root = container.querySelector('[data-testid="row"]') as HTMLElement;
    expect(root.getAttribute('aria-disabled')).toBeNull();
    expect(root.getAttribute('data-disabled')).toBeNull();
    expect(root.getAttribute('tabindex')).toBe('0');
  });
});
