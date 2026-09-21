import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// P2-25 (08-11 audit, plan 483 A5): page footer geometry was driven by
// `footerClassName.includes('fixed')` substring sniffing — an author-facing
// presentation prop steering behavior. Geometry is now owned by the explicit
// `footerFixed` schema prop and surfaced as a data attribute.
function renderPage(schema: Record<string, unknown>) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://basic/page-footer-fixed"
      schema={{ type: 'page', body: [{ type: 'text', text: 'Body' }], ...schema } as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function footer() {
  return document.querySelector('[data-slot="page-footer"]') as HTMLElement | null;
}

afterEach(() => cleanup());

describe('P2-25: page footer fixed geometry is prop-driven, not class-sniffed', () => {
  it('footerFixed: true publishes data-footer-fixed', () => {
    renderPage({ footerFixed: true, footer: [{ type: 'text', text: 'Footer actions' }] });
    expect(footer()?.getAttribute('data-footer-fixed')).toBe('true');
  });

  it('a literal "fixed" class alone no longer triggers the fixed geometry signal', () => {
    renderPage({
      footerClassName: 'fixed bottom-0 inset-x-0',
      footer: [{ type: 'text', text: 'Footer actions' }],
    });
    expect(footer()?.getAttribute('data-footer-fixed')).toBeNull();
  });

  it('footer without footerFixed renders plain', () => {
    renderPage({ footer: [{ type: 'text', text: 'Footer actions' }] });
    expect(footer()?.getAttribute('data-footer-fixed')).toBeNull();
  });
});
