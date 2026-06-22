import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const MOBILE_WIDTH = 500;
const DESKTOP_WIDTH = 1280;

function setViewportWidth(width: number) {
  (window as { innerWidth: number }).innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

beforeEach(() => {
  setViewportWidth(DESKTOP_WIDTH);
});

afterEach(() => {
  setViewportWidth(DESKTOP_WIDTH);
  cleanup();
});

describe('table renderer — responsive expand (M1b)', () => {
  it('activates responsive expand mode on mobile and marks the table root', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-responsive-mobile"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              responsive: { mode: 'expand', breakpoint: 'md' },
              columns: [
                { label: 'Name', name: 'name' },
                { label: 'Email', name: 'email' },
                { label: 'Phone', name: 'phone' },
              ],
              source: [{ id: 1, name: 'Alice', email: 'alice@example.com', phone: '555-0100' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const tableRoot = await screen.findByText('Alice').then((cell) =>
      cell.closest('.nop-table'),
    );
    expect(tableRoot?.getAttribute('data-responsive-expand')).toBe('true');
  });

  it('does not activate responsive expand on desktop', async () => {
    setViewportWidth(DESKTOP_WIDTH);
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-responsive-desktop"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              responsive: { mode: 'expand', breakpoint: 'md' },
              columns: [
                { label: 'Name', name: 'name' },
                { label: 'Email', name: 'email' },
              ],
              source: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const tableRoot = await screen.findByText('Alice').then((cell) =>
      cell.closest('.nop-table'),
    );
    expect(tableRoot?.getAttribute('data-responsive-expand')).toBeNull();
  });

  it('renders hidden columns as mobile card-style expanded items when expand is toggled', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-responsive-expand"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              responsive: { mode: 'expand', breakpoint: 'md' },
              columns: [
                { label: 'Name', name: 'name' },
                { label: 'Email', name: 'email' },
                { label: 'Phone', name: 'phone' },
              ],
              source: [
                { id: 1, name: 'Alice', email: 'alice@example.com', phone: '555-0100' },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await screen.findByText('Alice');

    const expandButton = document.querySelector(
      '[data-slot="table-expand-cell"] button',
    ) as HTMLElement;
    expect(expandButton).toBeTruthy();
    fireEvent.click(expandButton);

    await waitFor(() => {
      const expanded = document.querySelector('[data-slot="table-responsive-expanded"]');
      expect(expanded).toBeTruthy();
    });

    const items = document.querySelectorAll('[data-slot="table-responsive-expanded-item"]');
    expect(items.length).toBe(2);
    expect(items[0]!.className).toContain('nop-hairline');

    const labels = Array.from(
      document.querySelectorAll('[data-slot="table-responsive-expanded-label"]'),
    ).map((el) => el.textContent);
    expect(labels).toEqual(['Email', 'Phone']);
  });
});
