import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

function renderInPage(body: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://flex-click"
      schema={{
        type: 'page',
        body: [
          body,
          { type: 'text', text: 'Result: ${clicked}' },
        ],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('flex renderer — onClick event (plan 457)', () => {
  it('dispatches the schema action when a flex with onClick is clicked', async () => {
    renderInPage({
      type: 'flex',
      testid: 'flex-clickable',
      onClick: { action: 'setValue', args: { path: 'clicked', value: 'yes' } },
      body: [{ type: 'text', text: 'Click me' }],
    } as BaseSchema);

    const row = document.querySelector('[data-testid="flex-clickable"]');
    expect(row).toBeTruthy();
    fireEvent.click(row as Element);

    await waitFor(() => {
      expect(screen.getByText('Result: yes')).toBeTruthy();
    });
  });

  it('does not attach a handler when onClick is not declared (no regression)', () => {
    renderInPage({
      type: 'flex',
      testid: 'flex-plain',
      body: [{ type: 'text', text: 'Plain' }],
    } as BaseSchema);

    const row = document.querySelector('[data-testid="flex-plain"]');
    expect(row).toBeTruthy();
    fireEvent.click(row as Element);
    expect(screen.getByText('Plain')).toBeTruthy();
  });

  it('is keyboard-activatable (Enter/Space) and exposes button semantics when clickable', async () => {
    renderInPage({
      type: 'flex',
      testid: 'flex-keyboard',
      onClick: { action: 'setValue', args: { path: 'clicked', value: 'key' } },
      body: [{ type: 'text', text: 'Keyboard row' }],
    } as BaseSchema);

    const row = document.querySelector('[data-testid="flex-keyboard"]');
    expect(row?.getAttribute('role')).toBe('button');
    expect(row?.getAttribute('tabindex')).toBe('0');

    fireEvent.keyDown(row as Element, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('Result: key')).toBeTruthy();
    });
  });
});

describe('container renderer — onClick event (plan 457)', () => {
  it('dispatches the schema action when a container with onClick is clicked', async () => {
    renderInPage({
      type: 'container',
      testid: 'container-clickable',
      onClick: { action: 'setValue', args: { path: 'clicked', value: 'container' } },
      body: [{ type: 'text', text: 'Click container' }],
    } as BaseSchema);

    const root = document.querySelector('[data-testid="container-clickable"]');
    expect(root).toBeTruthy();
    fireEvent.click(root as Element);

    await waitFor(() => {
      expect(screen.getByText('Result: container')).toBeTruthy();
    });
  });

  it('does not attach a handler when onClick is not declared (no regression)', () => {
    renderInPage({
      type: 'container',
      testid: 'container-plain',
      body: [{ type: 'text', text: 'Plain container' }],
    } as BaseSchema);

    const root = document.querySelector('[data-testid="container-plain"]');
    expect(root).toBeTruthy();
    fireEvent.click(root as Element);
    expect(screen.getByText('Plain container')).toBeTruthy();
  });
});