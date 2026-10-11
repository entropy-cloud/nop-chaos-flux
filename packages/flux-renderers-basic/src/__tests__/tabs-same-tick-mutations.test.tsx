import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// WA-basic-002: the 13-03 same-tick snapshot-commit defect was fixed only for
// addTab; removeTab/renameTab/moveTab still committed render-closure snapshots
// as absolute values, so a same-tick sibling mutation was silently dropped
// (last-writer-wins). Every collection mutation must resolve against the live
// collection at commit time.

afterEach(() => {
  cleanup();
});

const itemsABC = [
  { key: 'a', title: 'A' },
  { key: 'b', title: 'B' },
  { key: 'c', title: 'C' },
];

function tabValues(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="tabs-trigger"]')).map(
    (el) => el.getAttribute('data-tab-value') ?? '',
  );
}

function tabTitles(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="tabs-trigger"]')).map(
    (el) => el.textContent ?? '',
  );
}

function renderSchema(schema: unknown, data: Record<string, unknown> = { ui: {} }) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://tabs/same-tick-mutations"
      schema={schema as never}
      data={data}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function buildSchema(toolbar: unknown[]): any {
  return {
    type: 'page',
    body: [
      { type: 'tabs', id: 'view-tabs', items: itemsABC },
      { type: 'button', label: 'Same Tick Ops', onClick: toolbar },
    ],
  };
}

describe('WA-basic-002 — same-tick collection mutations must not drop siblings', () => {
  it('same-tick renameTab + removeTab both land (rename must not be dropped by the remove commit)', async () => {
    renderSchema(
      buildSchema([
        { action: 'component:renameTab', componentId: 'view-tabs', args: { value: 'a', title: 'A2' } },
        { action: 'component:removeTab', componentId: 'view-tabs', args: { value: 'b' } },
      ]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Same Tick Ops'));

    await waitFor(() => expect(tabValues()).toEqual(['a', 'c']));
    expect(tabTitles()).toEqual(['A2', 'C']);
  });

  it('same-tick removeTab + moveTab both land (removal must not be dropped by the move commit)', async () => {
    renderSchema(
      buildSchema([
        { action: 'component:removeTab', componentId: 'view-tabs', args: { value: 'a' } },
        { action: 'component:moveTab', componentId: 'view-tabs', args: { value: 'c', toIndex: 0 } },
      ]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Same Tick Ops'));

    await waitFor(() => expect(tabValues()).toEqual(['c', 'b']));
  });

  it('same-tick moveTab + renameTab both land (rename must not be dropped by the move commit)', async () => {
    renderSchema(
      buildSchema([
        { action: 'component:moveTab', componentId: 'view-tabs', args: { value: 'c', toIndex: 0 } },
        { action: 'component:renameTab', componentId: 'view-tabs', args: { value: 'a', title: 'A2' } },
      ]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Same Tick Ops'));

    await waitFor(() => expect(tabValues()).toEqual(['c', 'a', 'b']));
    expect(tabTitles()).toEqual(['C', 'A2', 'B']);
  });
});
