import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { basicRendererDefinitions } from '../index.js';

afterEach(cleanup);

function renderInPage(body: BaseSchema, data?: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://audit-family-regressions"
      schema={{ type: 'page', body: [body] } as BaseSchema}
      data={data}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('container semantic layout props emit real layout classes (C1.1 P1-1)', () => {
  it('direction row emits flex-row on the body slot', () => {
    const { container } = renderInPage({
      type: 'container',
      direction: 'row',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.getAttribute('data-flex')).toBe('');
    expect(body?.getAttribute('data-direction')).toBe('row');
    expect(body?.className).toContain('flex-row');
  });

  it('direction column emits flex-col and keeps data-direction', () => {
    const { container } = renderInPage({
      type: 'container',
      direction: 'column',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).toContain('flex-col');
    expect(body?.getAttribute('data-direction')).toBe('column');
  });

  it('wrap true emits flex-wrap', () => {
    const { container } = renderInPage({
      type: 'container',
      wrap: true,
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).toContain('flex-wrap');
    expect(body?.getAttribute('data-wrap')).toBe('true');
  });

  it('gap token emits the resolved gap class (md -> gap-4)', () => {
    const { container } = renderInPage({
      type: 'container',
      gap: 'md',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).toContain('gap-4');
    expect(body?.getAttribute('data-gap')).toBe('md');
  });

  it('numeric gap emits inline style in px', () => {
    const { container } = renderInPage({
      type: 'container',
      gap: 12,
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect((body as HTMLElement | null)?.style.gap).toBe('12px');
    expect(body?.getAttribute('data-gap')).toBe('12');
  });

  it('align center emits items-center justify-center', () => {
    const { container } = renderInPage({
      type: 'container',
      align: 'center',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).toContain('items-center');
    expect(body?.className).toContain('justify-center');
  });

  it('responsiveDirection emits breakpoint classes', () => {
    const { container } = renderInPage({
      type: 'container',
      direction: 'column',
      responsiveDirection: { sm: 'row', md: 'column' },
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).toContain('sm:flex-row');
    expect(body?.className).toContain('md:flex-col');
  });

  it('responsiveWrap emits breakpoint wrap classes', () => {
    const { container } = renderInPage({
      type: 'container',
      responsiveWrap: { sm: false, md: true },
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).toContain('sm:flex-nowrap');
    expect(body?.className).toContain('md:flex-wrap');
  });

  it('bare path still emits no classes and no data-flex', () => {
    const { container } = renderInPage({
      type: 'container',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.hasAttribute('data-flex')).toBe(false);
    expect(body?.className).toBe('');
  });

  it('root marker stays nop-container only (no layout classes leak to root)', () => {
    const { container } = renderInPage({
      type: 'container',
      direction: 'row',
      gap: 'md',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const root = container.querySelector('.nop-container');
    expect(Array.from(root?.classList ?? [])).toEqual(['nop-container']);
  });
});

describe('page schema data initializes the root scope (C1.1 P1-1)', () => {
  it('applies page data as init patch visible to body bindings', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://audit-page-data"
        schema={{
          type: 'page',
          data: { x: 'hello-page-data' },
          body: [{ type: 'text', text: '${x}' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('hello-page-data')).toBeTruthy());
  });

  it('page data expressions resolve against the root scope', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://audit-page-data-expr"
        schema={{
          type: 'page',
          data: { greeting: '${userName}' },
          body: [{ type: 'text', text: '${greeting}' }],
        }}
        data={{ userName: 'Alice' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
  });

  it('applies page data under StrictMode remount (StrictMode-safe)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://audit-page-data-strict"
          schema={{
            type: 'page',
            data: { x: 'strict-mode-patch' },
            body: [{ type: 'text', text: '${x}' }],
          }}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </React.StrictMode>,
    );
    await waitFor(() => expect(screen.getByText('strict-mode-patch')).toBeTruthy());
  });
});

describe('tabs item disabled supports expressions (C1.1 P1-1)', () => {
  it('expression-authored disabled item is disabled', async () => {
    const { container } = renderInPage(
      {
        type: 'tabs',
        items: [
          { title: 'Blocked', key: 'blocked', disabled: '${blocked}' },
          { title: 'Open', key: 'open' },
        ],
      } as BaseSchema,
      { blocked: true },
    );
    const triggers = container.querySelectorAll('[data-slot="tabs-trigger"]');
    expect(triggers).toHaveLength(2);
    const blockedTrigger = triggers[0];
    expect(blockedTrigger?.getAttribute('aria-disabled')).toBe('true');
  });

  it('expression-authored disabled item stays enabled when the expression is false', () => {
    const { container } = renderInPage(
      {
        type: 'tabs',
        items: [
          { title: 'Free', key: 'free', disabled: '${blocked}' },
          { title: 'Open', key: 'open' },
        ],
      } as BaseSchema,
      { blocked: false },
    );
    const triggers = container.querySelectorAll('[data-slot="tabs-trigger"]');
    expect(triggers[0]?.getAttribute('aria-disabled')).not.toBe('true');
    const freeTrigger = triggers[0] as HTMLElement;
    freeTrigger.click();
    expect(freeTrigger.getAttribute('aria-selected')).toBe('true');
  });
});

describe('definition fields completeness (C1.1 P2-1)', () => {
  const byType = (type: string) => basicRendererDefinitions.find((d) => d.type === type)!;
  it('page fields declare all schema props read by the renderer', () => {
    const keys = new Set((byType('page').fields ?? []).map((f) => f.key));
    for (const key of [
      'data',
      'subTitle',
      'remark',
      'asidePosition',
      'asideResizable',
      'asideMinWidth',
      'asideMaxWidth',
      'asideSticky',
      'modalContainer',
      'statusPath',
      'asideClassName',
      'bodyClassName',
      'headerClassName',
      'footerClassName',
      'toolbarClassName',
    ]) {
      expect(keys.has(key), `page field ${key}`).toBe(true);
    }
  });

  it('container fields declare all semantic layout props', () => {
    const keys = new Set((byType('container').fields ?? []).map((f) => f.key));
    for (const key of [
      'direction',
      'wrap',
      'align',
      'gap',
      'responsiveDirection',
      'responsiveWrap',
      'bodyClassName',
      'headerClassName',
      'footerClassName',
    ]) {
      expect(keys.has(key), `container field ${key}`).toBe(true);
    }
  });

  it('flex fields declare all semantic layout props', () => {
    const keys = new Set((byType('flex').fields ?? []).map((f) => f.key));
    for (const key of [
      'direction',
      'wrap',
      'align',
      'justify',
      'alignContent',
      'gap',
      'responsiveDirection',
      'responsiveWrap',
    ]) {
      expect(keys.has(key), `flex field ${key}`).toBe(true);
    }
  });

  it('dialog fields declare draggable and allowFullscreen (schema-exposed props)', () => {
    const keys = new Set((byType('dialog').fields ?? []).map((f) => f.key));
    expect(keys.has('draggable')).toBe(true);
    expect(keys.has('allowFullscreen')).toBe(true);
  });
});
