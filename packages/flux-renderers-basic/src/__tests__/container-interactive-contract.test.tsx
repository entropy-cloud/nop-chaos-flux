import React from 'react';
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// plan 588 CX-10 WA-basic-003 characterization (draft review m3): the container
// renderer's clickable / non-clickable branches are about to be collapsed into
// a single tree with an `interactiveProps` spread. These pins lock the exact
// observable output of BOTH branches before the extraction — role/tabIndex
// presence, Enter/Space activation, Space preventDefault, the data-flex body
// attribute group, and header/footer slot output.

afterEach(cleanup);

function renderInPage(body: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://container-interactive-contract"
      schema={{
        type: 'page',
        body: [body, { type: 'text', text: 'Result: ${clicked}' }],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

const FLEX_ATTRS = {
  direction: 'row',
  wrap: true,
  align: 'center',
  gap: 16,
} as const;

function expectFlexBodyGroup(testid: string) {
  const body = document.querySelector(`[data-testid="${testid}"] > [data-slot="container-body"]`);
  expect(body).toBeTruthy();
  expect(body?.getAttribute('data-flex')).toBe('');
  expect(body?.getAttribute('data-direction')).toBe('row');
  expect(body?.getAttribute('data-wrap')).toBe('true');
  expect(body?.getAttribute('data-align')).toBe('center');
  expect(body?.getAttribute('data-gap')).toBe('16');
}

describe('container renderer — clickable branch interactive surface (plan 588 characterization)', () => {
  it('exposes role=button and tabIndex=0 on the root when onClick is declared', () => {
    renderInPage({
      type: 'container',
      testid: 'container-clickable-attrs',
      onClick: { action: 'setValue', args: { path: 'clicked', value: 'attrs' } },
      body: [{ type: 'text', text: 'Clickable' }],
    } as BaseSchema);

    const root = document.querySelector('[data-testid="container-clickable-attrs"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('role')).toBe('button');
    expect(root?.getAttribute('tabindex')).toBe('0');
  });

  it('activates the onClick action via Enter and via Space key down', async () => {
    renderInPage({
      type: 'container',
      testid: 'container-key-enter',
      onClick: { action: 'setValue', args: { path: 'clicked', value: 'key-enter' } },
      body: [{ type: 'text', text: 'Enter me' }],
    } as BaseSchema);

    const root = document.querySelector('[data-testid="container-key-enter"]');
    expect(root).toBeTruthy();
    fireEvent.keyDown(root as Element, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('Result: key-enter')).toBeTruthy();
    });
  });

  it('activates the onClick action via Space and preventDefaults the keydown', async () => {
    renderInPage({
      type: 'container',
      testid: 'container-key-space',
      onClick: { action: 'setValue', args: { path: 'clicked', value: 'key-space' } },
      body: [{ type: 'text', text: 'Space me' }],
    } as BaseSchema);

    const root = document.querySelector('[data-testid="container-key-space"]');
    expect(root).toBeTruthy();
    const spaceEvent = createEvent.keyDown(root as Element, { key: ' ' });
    fireEvent(root as Element, spaceEvent);
    expect(spaceEvent.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(screen.getByText('Result: key-space')).toBeTruthy();
    });
  });

  it('renders the identical data-flex body attribute group in the clickable branch', () => {
    renderInPage({
      type: 'container',
      testid: 'container-clickable-flex',
      ...FLEX_ATTRS,
      onClick: { action: 'setValue', args: { path: 'clicked', value: 'flex' } },
      body: [{ type: 'text', text: 'Flex body' }],
    } as BaseSchema);

    expectFlexBodyGroup('container-clickable-flex');
  });

  it('renders header and footer slots in the clickable branch', () => {
    renderInPage({
      type: 'container',
      testid: 'container-clickable-slots',
      header: [{ type: 'text', text: 'Head' }],
      footer: [{ type: 'text', text: 'Foot' }],
      headerClassName: 'hdr-cls',
      footerClassName: 'ftr-cls',
      onClick: { action: 'setValue', args: { path: 'clicked', value: 'slots' } },
      body: [{ type: 'text', text: 'Body' }],
    } as BaseSchema);

    const header = document.querySelector('[data-slot="container-header"]');
    const footer = document.querySelector('[data-slot="container-footer"]');
    expect(header?.textContent).toBe('Head');
    expect(header?.className).toContain('hdr-cls');
    expect(footer?.textContent).toBe('Foot');
    expect(footer?.className).toContain('ftr-cls');
  });
});

describe('container renderer — non-clickable branch output (plan 588 characterization)', () => {
  it('omits role and tabIndex when onClick is not declared', () => {
    renderInPage({
      type: 'container',
      testid: 'container-plain-attrs',
      body: [{ type: 'text', text: 'Plain' }],
    } as BaseSchema);

    const root = document.querySelector('[data-testid="container-plain-attrs"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('role')).toBeNull();
    expect(root?.getAttribute('tabindex')).toBeNull();
  });

  it('does not preventDefault keydown when onClick is not declared (no handler attached)', () => {
    renderInPage({
      type: 'container',
      testid: 'container-plain-key',
      body: [{ type: 'text', text: 'Plain keys' }],
    } as BaseSchema);

    const root = document.querySelector('[data-testid="container-plain-key"]');
    expect(root).toBeTruthy();
    const enterEvent = createEvent.keyDown(root as Element, { key: 'Enter' });
    fireEvent(root as Element, enterEvent);
    expect(enterEvent.defaultPrevented).toBe(false);
    const spaceEvent = createEvent.keyDown(root as Element, { key: ' ' });
    fireEvent(root as Element, spaceEvent);
    expect(spaceEvent.defaultPrevented).toBe(false);
  });

  it('renders the identical data-flex body attribute group in the non-clickable branch', () => {
    renderInPage({
      type: 'container',
      testid: 'container-plain-flex',
      ...FLEX_ATTRS,
      body: [{ type: 'text', text: 'Flex body' }],
    } as BaseSchema);

    expectFlexBodyGroup('container-plain-flex');
  });

  it('renders header and footer slots in the non-clickable branch', () => {
    renderInPage({
      type: 'container',
      testid: 'container-plain-slots',
      header: [{ type: 'text', text: 'Head' }],
      footer: [{ type: 'text', text: 'Foot' }],
      body: [{ type: 'text', text: 'Body' }],
    } as BaseSchema);

    expect(document.querySelector('[data-slot="container-header"]')?.textContent).toBe('Head');
    expect(document.querySelector('[data-slot="container-footer"]')?.textContent).toBe('Foot');
  });
});
