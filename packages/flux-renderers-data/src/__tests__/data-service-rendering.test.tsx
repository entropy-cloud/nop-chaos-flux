// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('ServiceRenderer (W2a — request-sink contract)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the body region when items resolves to N entries', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/service-body"
        schema={{
          type: 'page',
          body: [
            {
              type: 'service',
              testid: 'demo-service',
              items: '${rows}',
              body: [
                { type: 'text', text: 'count=${rows.length}' },
              ],
            },
          ],
        }}
        data={{
          rows: [
            { id: 1, name: 'Alpha' },
            { id: 2, name: 'Beta' },
            { id: 3, name: 'Gamma' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-service') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-status')).toBe('ready');
    expect(root.getAttribute('data-item-count')).toBe('3');
    expect(root.querySelector('[data-slot="service-body"]')).toBeTruthy();
    // No empty/error/loading region when items resolve.
    expect(root.querySelector('[data-slot="service-empty"]')).toBeNull();
    expect(root.querySelector('[data-slot="service-error"]')).toBeNull();
    expect(root.querySelector('[data-slot="service-loading"]')).toBeNull();
  });

  it('renders the empty region/value when items resolves to empty array', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/service-empty"
        schema={{
          type: 'page',
          body: [
            {
              type: 'service',
              items: '${rows}',
              empty: { type: 'text', text: 'No rows loaded' },
            },
          ],
        }}
        data={{ rows: [] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-service') as HTMLElement;
    expect(root.getAttribute('data-status')).toBe('idle');
    expect(root.getAttribute('data-item-count')).toBe('0');
    expect(screen.getByText('No rows loaded')).toBeTruthy();
    expect(root.querySelector('[data-slot="service-empty"]')).toBeTruthy();
    expect(root.querySelector('[data-slot="service-body"]')).toBeNull();
  });

  it('renders the empty region/value when items resolves to null/undefined', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/service-null"
        schema={{
          type: 'page',
          body: [
            {
              type: 'service',
              empty: { type: 'text', text: 'Nothing loaded yet' },
              body: [{ type: 'text', text: 'should not render' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-service') as HTMLElement;
    expect(root.getAttribute('data-status')).toBe('idle');
    expect(screen.getByText('Nothing loaded yet')).toBeTruthy();
    expect(screen.queryByText('should not render')).toBeNull();
  });

  it('renders the loading region only when items is empty AND author set a loading slot (status derived from items, not a request mirror)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/service-loading"
        schema={{
          type: 'page',
          body: [
            {
              type: 'service',
              items: '${rows}',
              loading: { type: 'text', text: 'Loading data…' },
              body: [{ type: 'text', text: 'body-content' }],
              empty: { type: 'text', text: 'should not show empty over loading' },
            },
          ],
        }}
        data={{ rows: [] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-service') as HTMLElement;
    expect(root.querySelector('[data-slot="service-loading"]')).toBeTruthy();
    expect(screen.getByText('Loading data…')).toBeTruthy();
    // Loading takes precedence over empty when both regions are authored and items is empty.
    expect(root.querySelector('[data-slot="service-empty"]')).toBeNull();
    // Body must not render during loading.
    expect(screen.queryByText('body-content')).toBeNull();
  });

  it('renders the error region when items resolves to an Error', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/service-error"
        schema={{
          type: 'page',
          body: [
            {
              type: 'service',
              items: '${badData}',
              error: { type: 'text', text: 'Custom error region' },
              body: [{ type: 'text', text: 'should not render' }],
            },
          ],
        }}
        data={{ badData: new Error('upstream failed') }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-service') as HTMLElement;
    expect(root.getAttribute('data-status')).toBe('error');
    expect(screen.getByText('Custom error region')).toBeTruthy();
    expect(root.querySelector('[data-slot="service-error"]')).toBeTruthy();
    expect(screen.queryByText('should not render')).toBeNull();
  });

  it('does NOT declare any component-level request fields (request-sink gate: api/initFetch/interval/sendOn/source)', () => {
    // Closure gate: the service renderer must own NO request protocol — all of
    // api/initFetch/interval/sendOn/source belong to <data-source>.
    // Tests run with cwd = package dir; relative path matches form-renderers-css.test.ts pattern.
    const source = readFileSync('src/service-renderer.tsx', 'utf8');

    // The renderer source must not declare these request-layer fields.
    expect(source).not.toMatch(/\bapi\s*[?:]/);
    expect(source).not.toMatch(/\binitFetch\s*[?:]/);
    expect(source).not.toMatch(/\binterval\s*[?:]/);
    expect(source).not.toMatch(/\bsendOn\s*[?:]/);
    // `source` is only allowed in identifiers like "sourcePackage" or "dataSource" — but
    // NOT a top-level `source?:` field declaration.
    expect(source).not.toMatch(/^\s*source\s*[?:]/m);

    const schemasSource = readFileSync('src/schemas.ts', 'utf8');
    const serviceSchemaBlock = schemasSource.slice(
      schemasSource.indexOf('export interface ServiceSchema'),
      schemasSource.indexOf('export type PaginationMode'),
    );
    expect(serviceSchemaBlock).not.toMatch(/\bapi\s*[?:]/);
    expect(serviceSchemaBlock).not.toMatch(/\binitFetch\s*[?:]/);
    expect(serviceSchemaBlock).not.toMatch(/\binterval\s*[?:]/);
    expect(serviceSchemaBlock).not.toMatch(/\bsendOn\s*[?:]/);
    expect(serviceSchemaBlock).not.toMatch(/^\s*source\s*[?:]/m);
  });

  it('combines with a nested <data-source> to demonstrate request-sink (service reads scope via items, does not trigger HTTP)', () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/service-composed"
        schema={{
          type: 'page',
          body: [
            // data-source is the request owner; service only reads scope via items expression.
            {
              type: 'service',
              items: '${dsData}',
              testid: 'composed-service',
              body: [{ type: 'text', text: 'composed:${rowsCount}' }],
              empty: { type: 'text', text: 'No data yet (request-sink)' },
            },
          ],
        }}
        // data-source not actually wired here — service reads scope; empty when dsData absent.
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = document.querySelector('.nop-service') as HTMLElement;
    expect(root.getAttribute('data-status')).toBe('idle');
    expect(screen.getByText('No data yet (request-sink)')).toBeTruthy();
  });
});
