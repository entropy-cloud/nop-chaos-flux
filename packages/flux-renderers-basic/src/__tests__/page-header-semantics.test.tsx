import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

function renderSchema(schema: unknown) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://page-header-semantics"
      schema={schema as any}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function queryHeader() {
  return document.querySelector('[data-slot="page-header"]');
}

function queryBreadcrumb() {
  return document.querySelector('[data-slot="page-breadcrumb"]');
}

function queryBreadcrumbEntries() {
  return document.querySelectorAll(
    '[data-slot="page-breadcrumb"] [data-slot="breadcrumb-item"]',
  );
}

function queryBreadcrumbLinks() {
  return document.querySelectorAll(
    '[data-slot="page-breadcrumb"] a[data-slot="breadcrumb-link"]',
  );
}

describe('page-header semantics compat matrix', () => {
  it('pageheader-compat: a page without the semantic fields keeps the legacy header output (no breadcrumb nav, no extra slot)', () => {
    renderSchema({
      type: 'page',
      title: 'Legacy Page',
      subTitle: 'Sub',
      body: [{ type: 'text', text: 'content', testid: 'body-text' }],
    });
    const header = queryHeader();
    expect(header).not.toBeNull();
    expect(queryBreadcrumb()).toBeNull();
    expect(document.querySelector('[data-slot="page-extra"]')).toBeNull();
    expect(header?.querySelector('h2')?.textContent).toBe('Legacy Page');
    expect(document.querySelector('[data-slot="page-subtitle"]')?.textContent).toBe('Sub');
    expect(screen.getByTestId('body-text')).toBeTruthy();
  });

  it('renders only the heading row wrapper when the semantic fields are declared (structure swap is opt-in)', () => {
    renderSchema({
      type: 'page',
      title: 'New Page',
      breadcrumb: [{ label: 'Home', href: '/home' }],
    });
    expect(document.querySelector('[data-slot="page-heading"]')).not.toBeNull();
  });
});

describe('page-header breadcrumb output matrix', () => {
  it('renders static breadcrumb entries: nav + ordered list, anchors for href entries, text for the rest', () => {
    renderSchema({
      type: 'page',
      title: 'List Page',
      breadcrumb: [
        { label: 'Home', href: '/home' },
        { label: 'Workspace', href: '/ws' },
        { label: 'Issues' },
      ],
    });
    const nav = queryBreadcrumb();
    expect(nav).not.toBeNull();
    expect(nav?.tagName).toBe('NAV');
    expect(nav?.getAttribute('aria-label')).toBe('breadcrumb');
    expect(nav?.querySelector('ol')).not.toBeNull();
    expect(queryBreadcrumbEntries()).toHaveLength(3);
    expect(queryBreadcrumbLinks()).toHaveLength(2);
    const links = Array.from(queryBreadcrumbLinks());
    expect(links[0]?.getAttribute('href')).toBe('/home');
    expect(links[1]?.getAttribute('href')).toBe('/ws');
    expect(nav?.textContent).toContain('Issues');
    // chevron separators sit between entries
    expect(
      document.querySelectorAll('[data-slot="page-breadcrumb"] [data-slot="breadcrumb-separator"]'),
    ).toHaveLength(2);
  });

  it('resolves breadcrumb from a scope expression', () => {
    renderSchema({
      type: 'page',
      data: { crumbs: [{ label: 'Alpha', href: '/a' }, { label: 'Beta' }] },
      title: 'Expr Page',
      breadcrumb: '${crumbs}',
    });
    expect(queryBreadcrumbEntries()).toHaveLength(2);
    expect(queryBreadcrumbLinks()).toHaveLength(1);
  });

  it('degrades malformed entries (non-object, missing label) without breaking the trail', () => {
    renderSchema({
      type: 'page',
      title: 'Degrade Page',
      breadcrumb: [{ label: 'Keep' }, null, { href: '/no-label' }, 'str', 42],
    });
    expect(queryBreadcrumbEntries()).toHaveLength(1);
    expect(queryBreadcrumb()?.textContent).toContain('Keep');
  });

  it('pageheader-overflow: entries truncate with ellipsis and carry a native title hint', () => {
    renderSchema({
      type: 'page',
      title: 'Overflow Page',
      breadcrumb: [{ label: 'A very long breadcrumb level label', href: '/long' }],
    });
    const link = queryBreadcrumbLinks()[0] as HTMLElement;
    expect(link).toBeTruthy();
    expect(link.className).toContain('truncate');
    expect(link.getAttribute('title')).toBe('A very long breadcrumb level label');
  });
});

describe('page-header extra region', () => {
  it('renders the extra region content at the right end of the title row', () => {
    renderSchema({
      type: 'page',
      title: 'Extra Page',
      extra: [{ type: 'button', label: 'New', testid: 'extra-btn' }],
    });
    const extra = document.querySelector('[data-slot="page-extra"]');
    expect(extra).not.toBeNull();
    expect(extra?.contains(screen.getByTestId('extra-btn'))).toBe(true);
  });

  it('keeps breadcrumb above the title row and extra inside the heading row (structure order)', () => {
    renderSchema({
      type: 'page',
      title: 'Combo Page',
      subTitle: 'Sub',
      breadcrumb: [{ label: 'Home', href: '/home' }],
      extra: [{ type: 'button', label: 'Action', testid: 'combo-btn' }],
    });
    const header = queryHeader() as HTMLElement;
    const nav = queryBreadcrumb() as HTMLElement;
    const heading = document.querySelector('[data-slot="page-heading"]') as HTMLElement;
    expect(nav.parentElement).toBe(header);
    // breadcrumb nav precedes the heading row
    expect(nav.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const extra = document.querySelector('[data-slot="page-extra"]') as HTMLElement;
    expect(heading.contains(extra)).toBe(true);
    expect(heading.contains(screen.getByTestId('combo-btn'))).toBe(true);
  });

  it('renders the header when only breadcrumb is declared (no title)', () => {
    renderSchema({
      type: 'page',
      breadcrumb: [{ label: 'Only' }],
    });
    expect(queryHeader()).not.toBeNull();
    expect(queryBreadcrumbEntries()).toHaveLength(1);
    expect(queryHeader()?.querySelector('h2')).toBeNull();
  });
});
