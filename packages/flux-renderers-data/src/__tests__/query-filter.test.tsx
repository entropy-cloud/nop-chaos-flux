import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { queryFilterRendererDefinition } from '../query-filter-definition.js';
import { transformQueryFilterAuthoringSchema } from '../query-filter-definition.js';
import { transformCrudAuthoringSchema } from '../data-schema-validation.js';
import { dataRendererDefinitions } from '../data-renderer-definitions.js';

afterEach(() => cleanup());

const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

function renderSchema(schema: unknown, fetcher?: RendererEnv['fetcher']) {
  return render(
    <SchemaRenderer
      schemaUrl="test://query-filter"
      schema={schema as any}
      env={fetcher ? { ...env, fetcher } : env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function makeFetchSpy() {
  return vi.fn(async () => ({ status: 0, data: null })) as unknown as RendererEnv['fetcher'];
}

function queryFilterRoot() {
  return document.querySelector('[data-slot="query-filter"]');
}

describe('query-filter definition contracts', () => {
  it('registers with data category, the dual-track field set, and the authoring transform', () => {
    const definition = dataRendererDefinitions.find((d) => d.type === 'query-filter');
    expect(definition).toBeTruthy();
    expect(definition).toBe(queryFilterRendererDefinition);
    expect(definition?.category).toBe('data');
    expect(definition?.sourcePackage).toBe('@nop-chaos/flux-renderers-data');
    expect(typeof definition?.authoringTransform).toBe('function');
    const fieldKeys = definition?.fields?.map((f) => f.key);
    for (const key of [
      'body',
      'actions',
      'filterForm',
      'mode',
      'layout',
      'columnCount',
      'gap',
      'submitLabel',
      'resetLabel',
      'togglable',
      'onSubmit',
      'onReset',
    ]) {
      expect(fieldKeys).toContain(key);
    }
    // The embedded form region is a region-carrier field (crud queryFormRegion precedent).
    expect(fieldKeys?.filter((k) => k === 'filterForm')).toHaveLength(1);
    // onSubmit/onReset are transform-consumed props, NOT event contracts (the
    // renderer never reads props.events — lying-contract guard).
    expect(definition?.eventContracts).toBeUndefined();
    expect(definition?.fields?.find((f) => f.key === 'onSubmit')?.kind).toBe('prop');
    expect(definition?.fields?.find((f) => f.key === 'onReset')?.kind).toBe('prop');
  });
});

describe('query-filter authoring transform (filterForm region lowering)', () => {
  function transform(schema: unknown) {
    return transformQueryFilterAuthoringSchema({
      schema: schema as any,
      path: '$.body[0]',
      emit: () => undefined,
    } as any) as any;
  }

  it('lowers body into an embedded form with mode resolution and grid forwarding', () => {
    const transformed = transform({
      type: 'query-filter',
      id: 'qf',
      body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
      layout: 'inline',
      columnCount: 3,
      gap: 'sm',
    });
    expect(transformed.filterForm).toMatchObject({
      type: 'form',
      id: 'qf-filter-form',
      mode: 'inline',
      columnCount: 3,
      gap: 'sm',
    });
  });

  it('mode wins over layout (resolveFormMode integration)', () => {
    const transformed = transform({
      type: 'query-filter',
      body: [{ type: 'input-text', name: 'keyword' }],
      layout: 'vertical',
      mode: 'horizontal',
    });
    expect(transformed.filterForm.mode).toBe('horizontal');
  });

  it('lowers onSubmit onto the embedded form submitAction and wires default Search/Reset buttons', () => {
    const onSubmit = { action: 'ajax', args: { url: '/query' } };
    const onReset = { action: 'ajax', args: { url: '/reset-hook' } };
    const transformed = transform({
      type: 'query-filter',
      id: 'qf2',
      body: [{ type: 'input-text', name: 'keyword' }],
      onSubmit,
      onReset,
    });
    expect(transformed.filterForm.submitAction).toEqual(onSubmit);
    const actions = transformed.filterForm.actions as any[];
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({
      type: 'button',
      label: t('flux.common.search'),
      variant: 'primary',
      onClick: [{ action: 'component:submit', componentId: 'qf2-filter-form' }],
    });
    expect(actions[1]).toMatchObject({
      type: 'button',
      label: t('flux.common.reset'),
      variant: 'outline',
      onClick: [
        { action: 'component:reset', componentId: 'qf2-filter-form' },
        onReset,
      ],
    });
  });

  it('submitLabel/resetLabel override the default button labels', () => {
    const transformed = transform({
      type: 'query-filter',
      body: [{ type: 'input-text', name: 'keyword' }],
      submitLabel: '筛选',
      resetLabel: '清空',
    });
    const actions = transformed.filterForm.actions as any[];
    expect(actions[0].label).toBe('筛选');
    expect(actions[1].label).toBe('清空');
  });

  it('custom actions replace the default button pair', () => {
    const custom = [{ type: 'button', label: 'Go', testid: 'custom-go' }];
    const transformed = transform({
      type: 'query-filter',
      body: [{ type: 'input-text', name: 'keyword' }],
      actions: custom,
    });
    expect(transformed.filterForm.actions).toEqual(custom);
  });

  it('produces no filterForm when body is absent', () => {
    const transformed = transform({ type: 'query-filter' });
    expect(transformed.filterForm).toBeUndefined();
  });
});

describe('query-filter render behavior', () => {
  it('renders the embedded filterForm region with the default Search/Reset buttons', () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'query-filter',
          testid: 'qf',
          body: [
            { type: 'input-text', name: 'keyword', label: 'Keyword', testid: 'qf-keyword' },
          ],
        },
      ],
    });
    expect(queryFilterRoot()).not.toBeNull();
    // the embedded form (filterForm region carrier) rendered inside the envelope
    expect(queryFilterRoot()?.querySelector('[data-slot="form-actions"]')).not.toBeNull();
    expect(screen.getByTestId('qf-keyword')).toBeTruthy();
    expect(screen.getByRole('button', { name: t('flux.common.search') })).toBeTruthy();
    expect(screen.getByRole('button', { name: t('flux.common.reset') })).toBeTruthy();
  });

  it('Search click dispatches the onSubmit chain through the form submit pipeline', async () => {
    const fetcher = makeFetchSpy();
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'query-filter',
            body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
            onSubmit: { action: 'ajax', args: { url: '/query-submit-hook' } },
          },
        ],
      },
      fetcher,
    );
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.search') }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const url = (vi.mocked(fetcher).mock.calls[0]?.[0] as { url?: string } | undefined)?.url ?? '';
    expect(url).toBe('/query-submit-hook');
  });

  it('Reset click resets field values and dispatches the onReset chain', async () => {
    const fetcher = makeFetchSpy();
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'query-filter',
            body: [
              { type: 'input-text', name: 'keyword', label: 'Keyword', testid: 'qf-kw' },
            ],
            onReset: { action: 'ajax', args: { url: '/query-reset-hook' } },
          },
        ],
      },
      fetcher,
    );
    const input = (screen.getByTestId('qf-kw') as HTMLElement).querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'drift' } });
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.reset') }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const url = (vi.mocked(fetcher).mock.calls[0]?.[0] as { url?: string } | undefined)?.url ?? '';
    expect(url).toBe('/query-reset-hook');
    await waitFor(() => expect(((screen.getByTestId('qf-kw') as HTMLElement).querySelector('input') as HTMLInputElement).value).toBe(''));
  });

  it('queryfilter-no-form-ctx: without declared chains the buttons dispatch nothing and never throw', async () => {
    const fetcher = makeFetchSpy();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'query-filter',
            body: [
              { type: 'input-text', name: 'keyword', label: 'Keyword', testid: 'qf-kw' },
            ],
          },
        ],
      },
      fetcher,
    );
    fireEvent.change((screen.getByTestId('qf-kw') as HTMLElement).querySelector('input') as HTMLInputElement, { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.search') }));
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.reset') }));
    await waitFor(() =>
      expect(((screen.getByTestId('qf-kw') as HTMLElement).querySelector('input') as HTMLInputElement).value).toBe(''),
    );
    expect(fetcher).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('togglable renders the collapse envelope; defaultCollapsed hides the form and shows collapsedLabel', () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'query-filter',
          testid: 'qf-toggle',
          togglable: {
            defaultCollapsed: true,
            collapsedLabel: 'Custom collapsed summary',
            expandedLabel: 'Custom collapse control',
          },
          body: [
            { type: 'input-text', name: 'keyword', label: 'Keyword', testid: 'qf-kw' },
          ],
        },
      ],
    });
    const root = queryFilterRoot() as HTMLElement;
    expect(root?.getAttribute('data-collapsed')).toBe('true');
    expect(screen.queryByTestId('qf-kw')).toBeNull();
    const summary = root?.querySelector('[data-slot="query-filter-summary"]');
    expect(summary?.textContent).toBe('Custom collapsed summary');
    const toggleBtn = root?.querySelector('[data-slot="query-filter-collapse"] button');
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
  });

  it('expanding reveals the form; the collapse control consumes expandedLabel', () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'query-filter',
          togglable: {
            collapsedLabel: 'Summary label',
            expandedLabel: 'Collapse now',
          },
          body: [
            { type: 'input-text', name: 'keyword', label: 'Keyword', testid: 'qf-kw' },
          ],
        },
      ],
    });
    const root = queryFilterRoot() as HTMLElement;
    expect(root?.getAttribute('data-collapsed')).toBeNull();
    expect(screen.getByTestId('qf-kw')).toBeTruthy();
    const toggleBtn = root?.querySelector(
      '[data-slot="query-filter-collapse"] button',
    ) as HTMLButtonElement;
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Collapse now');

    fireEvent.click(toggleBtn);
    expect((queryFilterRoot() as HTMLElement).getAttribute('data-collapsed')).toBe('true');
    expect(screen.queryByTestId('qf-kw')).toBeNull();
    expect(
      (queryFilterRoot() as HTMLElement).querySelector(
        '[data-slot="query-filter-summary"]',
      )?.textContent,
    ).toBe('Summary label');
  });

  it('togglable: true enables the envelope with i18n default labels', () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'query-filter',
          togglable: true,
          body: [{ type: 'input-text', name: 'keyword' }],
        },
      ],
    });
    const root = queryFilterRoot() as HTMLElement;
    expect(root?.querySelector('[data-slot="query-filter-collapse"]')).not.toBeNull();
    expect(root?.getAttribute('data-collapsed')).toBeNull();
  });

  it('queryfilter-clash: standalone query-filter renders and works with zero host-detection warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'query-filter',
          body: [{ type: 'input-text', name: 'keyword' }],
        },
      ],
    });
    expect(queryFilterRoot()).not.toBeNull();
    expect(
      warnSpy.mock.calls.some((call) => String(call[0]).includes('crud')),
    ).toBe(false);
    warnSpy.mockRestore();
  });
});

describe('crud dead config disposition (queryForm.defaultCollapsed family)', () => {
  it('dead-config-adopt: authoring emits an unknown-property warning naming filterTogglable, zero behavior change', () => {
    const emit = vi.fn();
    const transformed = transformCrudAuthoringSchema({
      schema: {
        type: 'crud',
        queryForm: {
          body: [{ type: 'input-text', name: 'keyword' }],
          defaultCollapsed: true,
          collapsedLabel: 'legacy collapsed',
          expandedLabel: 'legacy expanded',
        },
      } as any,
      path: '$.body[0]',
      emit,
    } as any) as any;

    const warnings = emit.mock.calls.map((call) => call[0]);
    expect(warnings).toHaveLength(3);
    for (const warning of warnings) {
      expect(warning.code).toBe('unknown-property');
      expect(warning.severity).toBe('warning');
      expect(warning.message).toContain('filterTogglable');
    }
    expect(warnings.map((w) => w.path)).toEqual([
      '/body/0/queryForm/defaultCollapsed',
      '/body/0/queryForm/collapsedLabel',
      '/body/0/queryForm/expandedLabel',
    ]);
    // zero behavior change: the query form region still builds exactly as before
    expect(transformed.queryFormRegion).toMatchObject({ type: 'form' });
  });

  it('clean schemas emit nothing', () => {
    const emit = vi.fn();
    transformCrudAuthoringSchema({
      schema: {
        type: 'crud',
        queryForm: { body: [{ type: 'input-text', name: 'keyword' }] },
      } as any,
      path: '$.body[0]',
      emit,
    } as any);
    expect(emit).not.toHaveBeenCalled();
  });

  it('filterTogglable.collapsedLabel/expandedLabel are consumed by the crud toggle envelope', () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'crud',
          id: 'dead-config-crud',
          source: [{ id: 1, name: 'row' }],
          columns: [{ name: 'name', label: 'Name' }],
          queryForm: { body: [{ type: 'input-text', name: 'keyword', label: 'K' }] },
          filterTogglable: {
            defaultCollapsed: true,
            collapsedLabel: 'Collapsed custom label',
            expandedLabel: 'Expanded custom label',
          },
        },
      ],
    });
    const queryRegion = document.querySelector('[data-slot="crud-query"]') as HTMLElement;
    expect(queryRegion).not.toBeNull();
    expect(queryRegion.textContent).toContain('Collapsed custom label');
    const toggleBtn = queryRegion.querySelector(
      '[data-slot="crud-query-collapse"] button',
    ) as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();
    fireEvent.click(toggleBtn);
    const toggleBtnAfter = (document.querySelector('[data-slot="crud-query"]') as HTMLElement)
      ?.querySelector('[data-slot="crud-query-collapse"] button') as HTMLButtonElement;
    expect(toggleBtnAfter.getAttribute('aria-label')).toBe('Expanded custom label');
  });

  it('crud zero-regression: filterTogglable: true (boolean form) renders the collapse envelope', () => {
    // Regression: the filterTogglable propContract previously declared an
    // object-only shape, so the literal `true` form was silently dropped by the
    // shape gate and the toggle envelope never rendered.
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'crud',
          id: 'toggle-bool-crud',
          source: [{ id: 1, name: 'row' }],
          columns: [{ name: 'name', label: 'Name' }],
          queryForm: { body: [{ type: 'input-text', name: 'keyword', label: 'K' }] },
          filterTogglable: true,
        },
      ],
    });
    const queryRegion = document.querySelector('[data-slot="crud-query"]') as HTMLElement;
    expect(queryRegion).not.toBeNull();
    expect(
      queryRegion.querySelector('[data-slot="crud-query-collapse"]'),
    ).not.toBeNull();
    expect(queryRegion.getAttribute('data-collapsed')).toBeNull();
  });
});
