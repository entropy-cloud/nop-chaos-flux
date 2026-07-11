import { cleanup, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderButton(schema: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-href"
      schema={{ type: 'page', body: [schema] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('button href / target (E2e)', () => {
  afterEach(() => cleanup());

  it('renders an anchor instead of a button when href is set', () => {
    renderButton({ type: 'button', label: 'Docs', href: 'https://example.com/docs', target: '_blank' });
    const anchor = screen.queryByRole('link', { name: 'Docs' });
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('https://example.com/docs');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    // No button element for this schema.
    expect(screen.queryByRole('button', { name: 'Docs' })).toBeNull();
  });

  it('renders a button when href is absent', () => {
    renderButton({ type: 'button', label: 'Save' });
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeTruthy();
  });
});
