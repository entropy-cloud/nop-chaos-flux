import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import type { BaseSchema } from '@nop-chaos/flux-core';

function renderInPage(body: BaseSchema, pageData?: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://text-name-binding"
      schema={{ type: 'page', body: [body] }}
      data={pageData}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('text renderer name binding', () => {
  it('renders text prop when name is not set', () => {
    cleanup();
    renderInPage({ type: 'text', text: 'Hello' });
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('renders text fallback when name has no bound value', () => {
    cleanup();
    renderInPage({ type: 'text', name: 'userName', text: 'Fallback' });
    expect(screen.getByText('Fallback')).toBeTruthy();
  });

  it('renders page data value when name matches a data field', () => {
    cleanup();
    renderInPage(
      { type: 'text', name: 'userName', text: 'Fallback' },
      { userName: 'Alice' },
    );
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('gives bound value priority over text prop', () => {
    cleanup();
    renderInPage(
      { type: 'text', name: 'title', text: 'Static' },
      { title: 'Bound' },
    );
    expect(screen.getByText('Bound')).toBeTruthy();
    expect(screen.queryByText('Static')).toBeNull();
  });
});
