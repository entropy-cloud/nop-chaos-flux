import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import React from 'react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { status: 0, data: null as T };
  },
  notify: () => undefined,
};

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: (props) => (
    <button type="button" data-testid={props.meta.testid ?? undefined} onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

function createContentSchemaRenderer() {
  return createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer, ...contentRendererDefinitions]);
}

const formulaCompiler = createFormulaCompiler();

afterEach(() => {
  cleanup();
});

function renderSchema(schema: unknown) {
  const SchemaRenderer = createContentSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://content/result"
      schema={schema as any}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function queryResult() {
  return document.querySelector('[data-slot="result"]');
}

describe('result definition contracts', () => {
  it('registers with the content category and the status/icon/title/description/actions field set', async () => {
    const definition = contentRendererDefinitions.find((d) => d.type === 'result');
    expect(definition).toBeTruthy();
    expect(definition?.category).toBe('content');
    expect(definition?.sourcePackage).toBe('@nop-chaos/flux-renderers-content');
    const fieldKeys = definition?.fields?.map((f) => f.key);
    for (const key of ['status', 'icon', 'title', 'description', 'actions']) {
      expect(fieldKeys).toContain(key);
    }
    expect(definition?.eventContracts).toBeUndefined();
  });
});

describe('result status mapping matrix', () => {
  it('maps the four statuses to icons and semantic colors with a data-status marker', () => {
    const cases: Array<[string, RegExp, string]> = [
      ['success', /circle-check|check-circle/i, 'text-success'],
      ['error', /circle-x|x-circle/i, 'text-destructive'],
      ['warning', /triangle-alert|alert-triangle/i, 'text-warning'],
      ['info', /info/, 'text-info'],
    ];
    for (const [status, iconMatcher, colorClass] of cases) {
      renderSchema({
        type: 'page',
        body: [{ type: 'result', testid: `result-${status}`, status }],
      });
      const root = document.querySelector(`[data-testid="result-${status}"]`) as HTMLElement;
      expect(root?.getAttribute('data-status')).toBe(status);
      const icon = root?.querySelector('[data-slot="result-icon"] svg');
      expect(icon).not.toBeNull();
      // lucide icons render with data-lucide-free class names? assert via class list instead
      const iconWrapper = root?.querySelector('[data-slot="result-icon"]') as HTMLElement;
      expect(iconWrapper.className).toContain(colorClass);
      expect(iconWrapper.querySelector('svg')?.getAttribute('class') ?? '').toMatch(iconMatcher);
      cleanup();
    }
  });

  it('defaults to info when status is omitted', () => {
    renderSchema({ type: 'page', body: [{ type: 'result' }] });
    expect(queryResult()?.getAttribute('data-status')).toBe('info');
  });

  it('result-status-invalid: an unknown status degrades to info with a dev warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderSchema({
      type: 'page',
      body: [{ type: 'result', status: 'catastrophic' }],
    });
    expect(queryResult()?.getAttribute('data-status')).toBe('info');
    expect(
      warnSpy.mock.calls.some((call) => String(call[0]).includes('status')),
    ).toBe(true);
    warnSpy.mockRestore();
  });
});

describe('result content regions', () => {
  it('skips the title/description elements when absent', () => {
    renderSchema({ type: 'page', body: [{ type: 'result', status: 'success' }] });
    const root = queryResult() as HTMLElement;
    expect(root.querySelector('[data-slot="result-title"]')).toBeNull();
    expect(root.querySelector('[data-slot="result-description"]')).toBeNull();
  });

  it('renders title/description slots when present', () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'result',
          status: 'success',
          title: 'Operation complete',
          description: 'The record has been archived.',
        },
      ],
    });
    const root = queryResult() as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.querySelector('[data-slot="result-title"]')?.textContent).toBe('Operation complete');
    expect(root.querySelector('[data-slot="result-description"]')?.textContent).toBe(
      'The record has been archived.',
    );
  });

  it('title/description accept value-or-region (expression) forms', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'result',
          title: "${'Deployment' + ' finished'}",
        },
      ],
    });
    expect(document.querySelector('[data-slot="result-title"]')?.textContent).toBe(
      'Deployment finished',
    );
  });

  it('renders the actions region content (buttons included)', () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'result',
          status: 'warning',
          title: 'Unsaved changes',
          actions: [{ type: 'button', label: 'Keep editing', testid: 'result-action-btn' }],
        },
      ],
    });
    const actions = document.querySelector('[data-slot="result-actions"]') as HTMLElement;
    expect(actions).not.toBeNull();
    expect(actions.contains(screen.getByTestId('result-action-btn'))).toBe(true);
  });

  it('icon overrides the status default icon', () => {
    renderSchema({
      type: 'page',
      body: [{ type: 'result', status: 'success', icon: 'star' }],
    });
    const iconEl = document.querySelector('[data-slot="result-icon"] svg');
    expect(iconEl?.getAttribute('class') ?? '').toMatch(/star/i);
  });

  it('emits the standard markers (nop-result root, data-testid, data-cid)', () => {
    renderSchema({
      type: 'page',
      body: [{ type: 'result', testid: 'result-markers', className: 'my-result' }],
    });
    const root = document.querySelector('[data-testid="result-markers"]') as HTMLElement;
    expect(root?.className).toContain('nop-result');
    expect(root?.className).toContain('my-result');
    expect(root?.getAttribute('data-cid')).not.toBeNull();
  });
});
