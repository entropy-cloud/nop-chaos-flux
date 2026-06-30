import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// L7 regression matrix: locks the tabs controlled/default-value semantics that
// useOwnedAxisValue (interaction-owner.ts) exposes. Covers the three ownership
// states plus numeric-index vs string-key authoring equivalence. The
// valueStatePath writeback path (scope ownership) is already pinned in
// basic-page-and-tabs-status.test.tsx and is not duplicated here.
describe('TabsRenderer — controlled/default-value ownership regression matrix (L7)', () => {
  afterEach(() => {
    cleanup();
  });

  it('local: defaultValue seeds the initial active tab and clicks flip it', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/local-default"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              defaultValue: 'second',
              statusPath: 'ui.tabsStatus',
              items: [
                { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
                { key: 'second', title: 'Second', body: [{ type: 'text', text: 'Second body' }] },
              ],
            },
            {
              type: 'text',
              text: 'active=${ui.tabsStatus?.activeValue}:${ui.tabsStatus?.activeIndex}',
            },
          ],
        }}
        data={{ ui: {} }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // defaultValue seeds "second" (index 1) without any user interaction
    await waitFor(() => expect(screen.getByText('active=second:1')).toBeTruthy());

    // local click flips activation and is held internally
    fireEvent.click(screen.getByText('First'));
    await waitFor(() => expect(screen.getByText('active=first:0')).toBeTruthy());
  });

  it('numeric-index authoring: items without key/value activate by position', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/numeric-index"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              statusPath: 'ui.tabsStatus',
              items: [
                { title: 'First', body: [{ type: 'text', text: 'Body zero' }] },
                { title: 'Second', body: [{ type: 'text', text: 'Body one' }] },
              ],
            },
            {
              type: 'text',
              text: 'active=${ui.tabsStatus?.activeValue}:${ui.tabsStatus?.activeIndex}',
            },
          ],
        }}
        data={{ ui: {} }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // initially the first item is active; value falls back to its index "0"
    await waitFor(() => expect(screen.getByText('active=0:0')).toBeTruthy());

    fireEvent.click(screen.getByText('Second'));
    // clicking the second trigger activates index 1 (value "1")
    await waitFor(() => expect(screen.getByText('active=1:1')).toBeTruthy());
  });

  it('string-key authoring: equivalent activation position as numeric-index', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/string-key"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              statusPath: 'ui.tabsStatus',
              items: [
                { key: 'a', title: 'First', body: [{ type: 'text', text: 'Body a' }] },
                { key: 'b', title: 'Second', body: [{ type: 'text', text: 'Body b' }] },
              ],
            },
            {
              type: 'text',
              text: 'active=${ui.tabsStatus?.activeValue}:${ui.tabsStatus?.activeIndex}',
            },
          ],
        }}
        data={{ ui: {} }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('active=a:0')).toBeTruthy());

    fireEvent.click(screen.getByText('Second'));
    // same POSITION (index 1) as the numeric-index case — authoring style is
    // equivalent, only the value string ("b" vs "1") differs
    await waitFor(() => expect(screen.getByText('active=b:1')).toBeTruthy());
  });

  it('controlled: a mutating bound expression is the single source of truth', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/controlled-expr"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              valueOwnership: 'controlled',
              value: '${ui.active}',
              statusPath: 'ui.tabsStatus',
              items: [
                { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
                { key: 'second', title: 'Second', body: [{ type: 'text', text: 'Second body' }] },
              ],
            },
            {
              type: 'button',
              label: 'Go second',
              onClick: { action: 'setValue', args: { path: 'ui.active', value: 'second' } },
            },
            {
              type: 'text',
              text: 'active=${ui.tabsStatus?.activeValue}:${ui.tabsStatus?.activeIndex}',
            },
          ],
        }}
        data={{ ui: { active: 'first' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // bound expression seeds activation
    await waitFor(() => expect(screen.getByText('active=first:0')).toBeTruthy());

    // mutating the bound scope value drives activation — the binding is the
    // single source of truth
    fireEvent.click(screen.getByText('Go second'));
    await waitFor(() => expect(screen.getByText('active=second:1')).toBeTruthy());

    // controlled ownership does NOT persist a click internally: clicking the
    // "First" trigger emits onChange but cannot override the bound source, so
    // activation stays on "second" until the binding changes again
    fireEvent.click(screen.getByText('First'));
    await waitFor(() => expect(screen.getByText('active=second:1')).toBeTruthy());
  });
});
