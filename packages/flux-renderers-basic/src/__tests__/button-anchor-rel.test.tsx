import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// P2-14 (08-11 audit, plan 483 A5): an anchor button with target="_blank" must
// carry rel="noopener noreferrer" — same contract as the content link renderer
// (link.tsx resolveRel precedent).
function renderButton(schema: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://button-anchor-rel"
      schema={{ type: 'page', body: [schema] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

afterEach(() => cleanup());

describe('P2-14: button anchor target=_blank carries rel noopener noreferrer', () => {
  it('tops up rel on a _blank anchor with no author rel', () => {
    renderButton({
      type: 'button',
      label: 'Docs',
      href: 'https://example.com',
      target: '_blank',
      testid: 'docs-btn',
    });
    const anchor = screen.getByRole('link', { name: 'Docs' });
    expect(anchor.getAttribute('target')).toBe('_blank');
    const rel = anchor.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  it('keeps an author-provided rel as-is', () => {
    renderButton({
      type: 'button',
      label: 'External',
      href: 'https://example.com',
      target: '_blank',
      rel: 'external',
      testid: 'ext-btn',
    } as BaseSchema);
    expect(screen.getByRole('link', { name: 'External' }).getAttribute('rel')).toBe('external');
  });

  it('same-target anchors carry no rel', () => {
    renderButton({
      type: 'button',
      label: 'Home',
      href: 'https://example.com',
      testid: 'home-btn',
    });
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('rel')).toBeNull();
  });
});
