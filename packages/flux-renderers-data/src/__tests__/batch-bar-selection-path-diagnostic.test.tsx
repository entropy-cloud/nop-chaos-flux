import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

// 22-02 (ui-review audit group B): the table default is selectionOwnership:'local'
// and all three selection write branches skip the scope path under local, so a
// batch-bar bound to the documented selectionStatePath renders nothing —
// indistinguishable from "nothing selected", zero diagnostics. The bar now emits
// a one-shot dev warn that distinguishes "path never written" from the normal
// "written empty array" hidden state (indirect inference: scope-snapshot key
// presence — the bar has no channel to read the table's ownership directly).

function renderTableHostWithBar(overrides: {
  table?: Record<string, unknown>;
  bar?: Record<string, unknown>;
  page?: Record<string, unknown>;
} = {}) {
  const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://data/batch-bar-selection-diagnostic"
      schema={{
        type: 'page',
        ...(overrides.page ?? {}),
        body: [
          {
            type: 'table',
            id: 'diag-table',
            rowKey: 'id',
            source: [
              { id: 'a', name: 'Issue A' },
              { id: 'b', name: 'Issue B' },
            ],
            rowSelection: { type: 'checkbox' },
            selectionStatePath: 'issueSelection',
            columns: [{ name: 'name', label: 'Name' }],
            ...(overrides.table ?? {}),
          },
          {
            type: 'batch-bar',
            testid: 'diag-bar',
            selectionPath: 'issueSelection',
            clearTarget: 'diag-table',
            ...(overrides.bar ?? {}),
          },
        ],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function unwrittenWarns(warnSpy: ReturnType<typeof vi.spyOn>) {
  return warnSpy.mock.calls.filter((call: unknown[]) =>
    String(call[0]).includes('batch-bar-selection-path-unwritten'),
  );
}

describe('batch-bar selection-path dev diagnostic (22-02)', () => {
  it('warns once in dev when the bound path was never written (table default local ownership)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderTableHostWithBar();

    await waitFor(() => expect(unwrittenWarns(warnSpy)).toHaveLength(1));

    const message = String(unwrittenWarns(warnSpy)[0]?.[0]);
    expect(message).toContain('issueSelection');
    // the warn names the wiring prerequisite and the default that silently
    // breaks it, so an author following the docs can self-diagnose. One-shot
    // repeat-suppression is exercised by the scope-owned case below.
    expect(message).toContain("selectionOwnership:'scope'");
    expect(message).toContain("'local'");

    warnSpy.mockRestore();
  });

  it('stops warning (one-shot) and the bar appears once a scope-owned table writes the path', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderTableHostWithBar({
      table: { selectionOwnership: 'scope' },
    });

    // correct wiring still hits the never-written window before the first
    // selection gesture: exactly one hint, then silence
    await waitFor(() => expect(unwrittenWarns(warnSpy)).toHaveLength(1));

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLElement);

    await waitFor(() => expect(screen.getByTestId('diag-bar')).toBeTruthy());

    // one-shot: repeated scope writes + bar renders never warn again
    fireEvent.click(checkboxes[2] as HTMLElement);
    await waitFor(() => expect(screen.getByText('2 selected')));
    expect(unwrittenWarns(warnSpy)).toHaveLength(1);
    warnSpy.mockRestore();
  });

  it('does not warn when the path exists as a written empty array (normal hidden state)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderTableHostWithBar({
      page: { data: { issueSelection: [] } },
    });

    expect(screen.queryByTestId('diag-bar')).toBeNull();
    expect(unwrittenWarns(warnSpy)).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it('does not warn on the crud host ($crud.selectedRowKeys is always projected)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/batch-bar-selection-diagnostic-crud"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'diag-crud',
              selection: {},
              source: [{ id: '1', name: 'Alice' }],
              toolbar: [
                {
                  type: 'batch-bar',
                  testid: 'diag-bar',
                  selectionPath: '$crud.selectedRowKeys',
                  clearTarget: 'diag-crud',
                },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.queryByTestId('diag-bar')).toBeNull();
    expect(unwrittenWarns(warnSpy)).toHaveLength(0);

    const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(checkboxes[1] as HTMLElement);
    await waitFor(() => expect(screen.getByTestId('diag-bar')).toBeTruthy());
    expect(unwrittenWarns(warnSpy)).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it('stays silent in non-dev builds even when the path was never written (production zero noise)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('DEV', false);
    try {
      renderTableHostWithBar();
      // give any (wrongly) scheduled warn a few microtask turns to surface
      const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
      fireEvent.click(checkboxes[1] as HTMLElement);
      await waitFor(() => {
        expect(document.querySelectorAll('[data-slot="checkbox"]').length).toBeGreaterThan(0);
      });
      expect(screen.queryByTestId('diag-bar')).toBeNull();
      expect(unwrittenWarns(warnSpy)).toHaveLength(0);
    } finally {
      vi.unstubAllEnvs();
      warnSpy.mockRestore();
    }
  });
});
