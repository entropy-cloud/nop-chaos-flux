// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function collapseRoot() {
  return document.querySelector('.nop-collapse') as HTMLElement;
}

function triggers() {
  return document.querySelectorAll('[data-slot="collapse-trigger"]');
}

describe('CollapseRenderer (W3a — collapsible content group)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nop-collapse marker with title/body regions for each item', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/collapse-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'collapse',
              testid: 'demo-collapse',
              items: [
                { title: 'Panel A', body: [{ type: 'text', text: 'body-A' }] },
                { title: 'Panel B', body: [{ type: 'text', text: 'body-B' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = collapseRoot();
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('collapse-root');
    expect(triggers().length).toBe(2);
    expect(screen.getByText('Panel A')).toBeTruthy();
    expect(screen.getByText('Panel B')).toBeTruthy();
  });

  it('expands an item on click and dispatches onChange (multiple=true default)', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/collapse-expand"
        schema={{
          type: 'page',
          body: [
            {
              type: 'collapse',
              items: [
                { key: 'a', title: 'Panel A', body: [{ type: 'text', text: 'body-A' }] },
                { key: 'b', title: 'Panel B', body: [{ type: 'text', text: 'body-B' }] },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'collapseChanged', value: true },
              },
            },
            { type: 'text', text: 'changed:${collapseChanged ? "yes" : "no"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const firstItem = document.querySelector('[data-item-key="a"]');
    expect(firstItem?.getAttribute('data-open')).toBeNull();

    fireEvent.click(triggers()[0]);

    await waitFor(() => {
      expect(
        document.querySelector('[data-item-key="a"]')?.getAttribute('data-open'),
      ).not.toBeNull();
    });
    expect(screen.getByText('changed:yes')).toBeTruthy();
  });

  it('enforces single-select mutual exclusion when multiple=false', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/collapse-single"
        schema={{
          type: 'page',
          body: [
            {
              type: 'collapse',
              multiple: false,
              items: [
                { key: 'a', title: 'A', body: [{ type: 'text', text: 'body-A' }] },
                { key: 'b', title: 'B', body: [{ type: 'text', text: 'body-B' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(collapseRoot().getAttribute('data-multiple')).toBe('false');

    fireEvent.click(triggers()[0]);
    await waitFor(() =>
      expect(
        document.querySelector('[data-item-key="a"]')?.getAttribute('data-open'),
      ).not.toBeNull(),
    );

    fireEvent.click(triggers()[1]);
    await waitFor(() =>
      expect(
        document.querySelector('[data-item-key="b"]')?.getAttribute('data-open'),
      ).not.toBeNull(),
    );
    expect(
      document.querySelector('[data-item-key="a"]')?.getAttribute('data-open'),
    ).toBeNull();
  });

  it('respects controlled ownership (value drives expand state, clicks do not mutate)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/collapse-controlled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'collapse',
              valueOwnership: 'controlled',
              value: 'a',
              items: [
                { key: 'a', title: 'A', body: [{ type: 'text', text: 'body-A' }] },
                { key: 'b', title: 'B', body: [{ type: 'text', text: 'body-B' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(
      document.querySelector('[data-item-key="a"]')?.getAttribute('data-open'),
    ).not.toBeNull();

    fireEvent.click(triggers()[1]);
    // Controlled: value 'a' still drives state; clicking 'b' dispatches onChange
    // but does NOT locally flip state (parent must update value).
    expect(
      document.querySelector('[data-item-key="a"]')?.getAttribute('data-open'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-item-key="b"]')?.getAttribute('data-open'),
    ).toBeNull();
  });

  it('writes back to scope when valueOwnership=scope and valueStatePath is set', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/collapse-scope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'collapse',
              valueOwnership: 'scope',
              valueStatePath: 'expandedKey',
              multiple: false,
              items: [
                { key: 'a', title: 'A', body: [{ type: 'text', text: 'body-A' }] },
                { key: 'b', title: 'B', body: [{ type: 'text', text: 'body-B' }] },
              ],
            },
            { type: 'text', text: 'scope:${expandedKey ?? "none"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(triggers()[1]);
    await waitFor(() => expect(screen.getByText('scope:b')).toBeTruthy());
    expect(
      document.querySelector('[data-item-key="b"]')?.getAttribute('data-open'),
    ).not.toBeNull();
  });

  it('renders title region when title is provided as schema content', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/collapse-title-region"
        schema={{
          type: 'page',
          body: [
            {
              type: 'collapse',
              items: [
                {
                  title: 'Custom Title',
                  body: [{ type: 'text', text: 'content' }],
                },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('Custom Title')).toBeTruthy();
    fireEvent.click(triggers()[0]);
    await waitFor(() => expect(screen.getByText('content')).toBeTruthy());
  });
});
