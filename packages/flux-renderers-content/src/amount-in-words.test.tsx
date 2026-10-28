import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RegisteredRendererDefinition, RendererEnv, SchemaValue } from '@nop-chaos/flux-core';
import React from 'react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { status: 0, data: null as T };
  },
  notify: () => undefined,
};

const pageRenderer: RegisteredRendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

function createContentSchemaRenderer() {
  return createSchemaRenderer([pageRenderer, ...contentRendererDefinitions]);
}

const formulaCompiler = createFormulaCompiler();

function renderAmountInWords(body: SchemaValue, data?: Record<string, unknown>) {
  const SchemaRenderer = createContentSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://amount-in-words"
      schema={{ type: 'page', body }}
      data={data ?? {}}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('AmountInWordsRenderer (plan 785 — zh-CN financial uppercase display)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the uppercase words for a numeric value with the resolved marker', () => {
    const { container } = renderAmountInWords([{ type: 'amount-in-words', testid: 'a1', value: 1234.56 }]);
    const root = container.querySelector('[data-testid="a1"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('amount-in-words-root');
    expect(root.getAttribute('data-state')).toBe('resolved');
    expect(root.textContent).toBe('壹仟贰佰叁拾肆元伍角陆分');
  });

  it('supports expression-bound values from page data', () => {
    const { container } = renderAmountInWords(
      [{ type: 'amount-in-words', testid: 'a2', value: '${total}' }],
      { total: 0.05 },
    );
    const root = container.querySelector('[data-testid="a2"]') as HTMLElement;
    expect(root.textContent).toBe('伍分');
  });

  it('renders placeholder and the empty marker for non-numeric input', () => {
    const { container } = renderAmountInWords([
      { type: 'amount-in-words', testid: 'a3', value: 'abc', placeholder: 'N/A' },
    ]);
    const root = container.querySelector('[data-testid="a3"]') as HTMLElement;
    expect(root.getAttribute('data-state')).toBe('empty');
    expect(root.textContent).toBe('N/A');
  });
});
