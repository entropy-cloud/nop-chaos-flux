import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { makeCompiler } from './schema-compiler-shape-validation-test-utils.js';

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

const dataSourceRenderer: RendererDefinition = {
  type: 'data-source',
  component: () => null,
  compilation: {
    artifacts: ['data-source'],
  },
  propSchema: { action: { type: 'string' }, args: { type: 'object' } },
  fields: [
    { key: 'action', kind: 'prop' },
    { key: 'args', kind: 'prop' },
  ],
};

const sourceCarrierRenderer: RendererDefinition = {
  type: 'page',
  component: () => null,
  propSchema: { data: { type: 'object' } },
  fields: [{ key: 'data', kind: 'prop' }],
};

function validateAjaxClick(onClick: unknown, renderer: RendererDefinition = buttonRenderer) {
  const compiler = makeCompiler([renderer]);
  return compiler.validate?.({ type: renderer.type, onClick } as never) ?? [];
}

/**
 * Plan 3 (`docs/plans/2026-08-02-3-ajax-validation-migration.md`) contract
 * tests: the ajax hardcoded args branch in `validateActionShape` was removed
 * and the action definition (`BUILT_IN_ACTION_DEFINITIONS.ajax`) took over.
 * These tests lock the migrated behavior — parity with the pre-migration
 * diagnostic set (args missing / url missing / url non-string / url empty /
 * non-object args), the expression-string exemption, and the fieldRules
 * enhancements (method string, data/params object).
 */
describe('ajax validation migration (definition-driven)', () => {
  it('reports missing ajax args payload (argsRequired semantic preserved)', () => {
    const diagnostics = validateAjaxClick({ action: 'ajax' });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/args',
          message: 'ajax actions require args payload.',
        }),
      ]),
    );
  });

  it('reports missing ajax url', () => {
    const diagnostics = validateAjaxClick({ action: 'ajax', args: { method: 'post', data: { a: 1 } } });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/args/url',
        }),
      ]),
    );
  });

  it('reports non-string ajax url', () => {
    const diagnostics = validateAjaxClick({ action: 'ajax', args: { url: 42 } });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/args/url',
        }),
      ]),
    );
  });

  it('reports empty-string ajax url', () => {
    const diagnostics = validateAjaxClick({ action: 'ajax', args: { url: '' } });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/args/url',
        }),
      ]),
    );
  });

  it('converges non-object ajax args to a single generic diagnostic', () => {
    const diagnostics = validateAjaxClick({ action: 'ajax', args: 'not-an-object' });
    const actionIssues = diagnostics.filter((d) => d.code === 'invalid-action-shape');

    expect(actionIssues).toEqual([
      expect.objectContaining({
        code: 'invalid-action-shape',
        path: '/onClick/args',
        message: 'Action args must be an object when provided.',
      }),
    ]);
  });

  it('exempts expression strings from url/data constraints', () => {
    const diagnostics = validateAjaxClick({
      action: 'ajax',
      args: { url: '${apiUrl}', data: '${formData}' },
    });

    expect(diagnostics).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ code: 'invalid-action-shape' }),
      ]),
    );
  });

  it('accepts fully valid ajax args', () => {
    const diagnostics = validateAjaxClick({
      action: 'ajax',
      args: { url: '/r/save', method: 'post', data: { a: 1 }, params: { b: 2 } },
    });

    expect(diagnostics).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ code: 'invalid-action-shape' }),
      ]),
    );
  });

  it('reports non-string ajax method (fieldRules enhancement)', () => {
    const diagnostics = validateAjaxClick({ action: 'ajax', args: { url: '/r', method: 42 } });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/args/method',
        }),
      ]),
    );
  });

  it('reports non-object ajax data (fieldRules enhancement)', () => {
    const diagnostics = validateAjaxClick({ action: 'ajax', args: { url: '/r', data: 'payload' } });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/args/data',
        }),
      ]),
    );
  });

  it('reports non-object ajax params (fieldRules enhancement)', () => {
    const diagnostics = validateAjaxClick({ action: 'ajax', args: { url: '/r', params: ['a'] } });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/onClick/args/params',
        }),
      ]),
    );
  });

  it('keeps the source scenario url check untouched', () => {
    const compiler = makeCompiler([sourceCarrierRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'page',
      data: { type: 'source', args: { url: '' } },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          path: '/data/args/url',
          message: 'api.url must be a non-empty string.',
        }),
      ]),
    );
  });

  it('keeps the data-source scenario url check untouched', () => {
    const compiler = makeCompiler([dataSourceRenderer]);

    const diagnostics = compiler.validate?.({
      type: 'data-source',
      action: 'ajax',
      args: { url: '' },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-source-shape',
          path: '/args/url',
          message: 'api.url must be a non-empty string.',
        }),
      ]),
    );
  });
});
