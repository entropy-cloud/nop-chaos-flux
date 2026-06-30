import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { createCrudOwnerPaths } from '../crud-renderer-ownership.js';
import type { CrudSchema } from '../crud-schema.js';

afterEach(cleanup);

describe('createCrudOwnerPaths — ID namespace isolation by construction', () => {
  it('produces distinct, non-overlapping owner paths for distinct ids', () => {
    const a = createCrudOwnerPaths({ id: 'crudA', cid: 'c1', schema: {} as CrudSchema });
    const b = createCrudOwnerPaths({ id: 'crudB', cid: 'c2', schema: {} as CrudSchema });

    expect(a.ownerStatePath).toBe('$_crud.crudA');
    expect(b.ownerStatePath).toBe('$_crud.crudB');
    expect(a.selectionStatePath).not.toBe(b.selectionStatePath);
    expect(a.paginationStatePath).not.toBe(b.paginationStatePath);
    expect(a.queryStatePath).not.toBe(b.queryStatePath);
  });

  it('falls back to cid when id is absent, and to "crud" when both are absent', () => {
    const byCid = createCrudOwnerPaths({ id: undefined, cid: 99, schema: {} as CrudSchema });
    const byNeither = createCrudOwnerPaths({ id: undefined, cid: undefined, schema: {} as CrudSchema });
    expect(byCid.ownerStatePath).toBe('$_crud.99');
    expect(byNeither.ownerStatePath).toBe('$_crud.crud');
  });

  it('collides when two cruds share the same id (basis for the id-uniqueness contract)', () => {
    const first = createCrudOwnerPaths({ id: 'same', cid: 'c1', schema: {} as CrudSchema });
    const second = createCrudOwnerPaths({ id: 'same', cid: 'c2', schema: {} as CrudSchema });
    // Identical id -> identical owner namespace -> state would alias (authoring mistake).
    // This is why the design doc records an explicit id-uniqueness contract.
    expect(first.ownerStatePath).toBe(second.ownerStatePath);
    expect(first.selectionStatePath).toBe(second.selectionStatePath);
  });
});

describe('B3.3 T24 — sibling cruds with distinct ids keep independent state (refresh A does not touch B)', () => {
  // Isolation is by construction: createCrudOwnerPaths namespaces every CRUD's
  // query/pagination/sort/filter/selection state under `$_crud.<id ?? cid ?? 'crud'>`
  // (see the unit tests above). These integration proofs render two sibling cruds
  // with distinct ids and use each CRUD's own per-instance `$crud` summary to verify
  // that interacting with A never disturbs B. Nested crud-in-expandable-row reuses
  // the same owner-path mechanism.

  it('selecting a row in crud A leaves crud B selection untouched', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    const schema = {
      type: 'page',
      body: [
        {
          type: 'crud',
          id: 'crudA',
          rowKey: 'id',
          selection: { type: 'checkbox' },
          footerToolbar: [{ type: 'text', text: 'A selected: ${$crud.selectionCount}' }],
          columns: [{ name: 'name', label: 'A-Name' }],
          source: [
            { id: 'a1', name: 'Alice' },
            { id: 'a2', name: 'Arnold' },
          ],
        },
        {
          type: 'crud',
          id: 'crudB',
          rowKey: 'id',
          selection: { type: 'checkbox' },
          footerToolbar: [{ type: 'text', text: 'B selected: ${$crud.selectionCount}' }],
          columns: [{ name: 'name', label: 'B-Name' }],
          source: [
            { id: 'b1', name: 'Bella' },
            { id: 'b2', name: 'Boris' },
          ],
        },
      ],
    } as const;

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-isolation"
        schema={schema}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    expect(screen.getByText('Bella')).toBeTruthy();
    expect(screen.getByText('A selected: 0')).toBeTruthy();
    expect(screen.getByText('B selected: 0')).toBeTruthy();

    const crudARoot = document.querySelectorAll('.nop-crud')[0]!;
    // Header checkbox is index 0; the first data row checkbox is index 1 in crud A.
    const aCheckboxes = crudARoot.querySelectorAll('[data-slot="checkbox"]');
    fireEvent.click(aCheckboxes[1]!);

    await waitFor(() => {
      expect(screen.getByText('A selected: 1')).toBeTruthy();
      // Crud B's own $crud summary MUST still report 0 selection.
      expect(screen.getByText('B selected: 0')).toBeTruthy();
    });
    // Crud B rows remain present (interaction in A did not overwrite B).
    expect(screen.getByText('Bella')).toBeTruthy();
    expect(screen.getByText('Boris')).toBeTruthy();
  });

  it('paginating crud A leaves crud B on its own page independently', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    const schema = {
      type: 'page',
      body: [
        {
          type: 'crud',
          id: 'crudA',
          rowKey: 'id',
          paginationOwnership: 'scope',
          paginationStatePath: 'pgA',
          footerToolbar: [{ type: 'text', text: 'A page: ${$crud.pagination.currentPage}' }],
          columns: [{ name: 'name', label: 'A-Name' }],
          source: [
            { id: 'a1', name: 'Alpha1' },
            { id: 'a2', name: 'Alpha2' },
            { id: 'a3', name: 'Alpha3' },
          ],
          pagination: { currentPage: 1, pageSize: 1, pageSizeOptions: [1] },
        },
        {
          type: 'crud',
          id: 'crudB',
          rowKey: 'id',
          paginationOwnership: 'scope',
          paginationStatePath: 'pgB',
          footerToolbar: [{ type: 'text', text: 'B page: ${$crud.pagination.currentPage}' }],
          columns: [{ name: 'name', label: 'B-Name' }],
          source: [
            { id: 'b1', name: 'Beta1' },
            { id: 'b2', name: 'Beta2' },
            { id: 'b3', name: 'Beta3' },
          ],
          pagination: { currentPage: 1, pageSize: 1, pageSizeOptions: [1] },
        },
      ],
    } as const;

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-pagination-isolation"
        schema={schema}
        data={{
          pgA: { currentPage: 1, pageSize: 1 },
          pgB: { currentPage: 1, pageSize: 1 },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha1')).toBeTruthy();
      expect(screen.getByText('A page: 1')).toBeTruthy();
      expect(screen.getByText('B page: 1')).toBeTruthy();
    });

    const crudARoot = document.querySelectorAll('.nop-crud')[0]!;
    fireEvent.click(
      crudARoot.querySelector('[data-slot="table-pagination"] [aria-label="Go to next page"]')!,
    );

    // Crud A advances to page 2 (Alpha2 + its own $crud summary reports page 2).
    await waitFor(() => {
      expect(screen.getByText('Alpha2')).toBeTruthy();
      expect(screen.getByText('A page: 2')).toBeTruthy();
    });
    // Crud B MUST stay on its own page 1 (per-instance $crud summary unchanged).
    expect(screen.getByText('B page: 1')).toBeTruthy();
    expect(screen.getByText('Beta1')).toBeTruthy();
  });
});
