import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderInPage(body: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://layout-family-enhancements"
      schema={{ type: 'page', body: [body] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('flex renderer - enum extensions (direction/justify/align/alignContent)', () => {
  afterEach(cleanup);

  it('applies flex-row-reverse when direction="row-reverse"', () => {
    const { container } = renderInPage({
      type: 'flex',
      direction: 'row-reverse',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const root = container.querySelector('.nop-flex');
    expect(root).toBeTruthy();
    expect(root?.className).toContain('flex-row-reverse');
  });

  it('applies flex-col-reverse when direction="column-reverse"', () => {
    const { container } = renderInPage({
      type: 'flex',
      direction: 'column-reverse',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const root = container.querySelector('.nop-flex');
    expect(root?.className).toContain('flex-col-reverse');
  });

  it('applies justify-evenly when justify="evenly"', () => {
    const { container } = renderInPage({
      type: 'flex',
      justify: 'evenly',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    expect(container.querySelector('.nop-flex')?.className).toContain('justify-evenly');
  });

  it('applies items-baseline when align="baseline"', () => {
    const { container } = renderInPage({
      type: 'flex',
      align: 'baseline',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    expect(container.querySelector('.nop-flex')?.className).toContain('items-baseline');
  });

  it('applies content-center when alignContent="center"', () => {
    const { container } = renderInPage({
      type: 'flex',
      wrap: true,
      alignContent: 'center',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    expect(container.querySelector('.nop-flex')?.className).toContain('content-center');
  });

  it('applies content-between when alignContent="between"', () => {
    const { container } = renderInPage({
      type: 'flex',
      wrap: true,
      alignContent: 'between',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    expect(container.querySelector('.nop-flex')?.className).toContain('content-between');
  });

  it('does not apply reverse/evenly/baseline/content classes by default (no regression)', () => {
    const { container } = renderInPage({
      type: 'flex',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const cls = container.querySelector('.nop-flex')?.className ?? '';
    expect(cls).not.toMatch(/flex-(row|col)-reverse/);
    expect(cls).not.toContain('justify-evenly');
    expect(cls).not.toContain('items-baseline');
    expect(cls).not.toMatch(/content-/);
  });
});

describe('page renderer - aside region + subTitle + remark', () => {
  afterEach(cleanup);

  it('renders data-slot="page-aside" when aside region has content', () => {
    const { container } = render(
      <>{createAsideSchemaPage([{ type: 'text', text: 'Aside content' }])}</>,
    );
    const aside = container.querySelector('[data-slot="page-aside"]');
    expect(aside).toBeTruthy();
    expect(aside?.textContent).toContain('Aside content');
  });

  it('renders aside before body when asidePosition is left (default)', () => {
    const { container } = render(
      <>{createAsideSchemaPage([{ type: 'text', text: 'ASIDE' }])}</>,
    );
    const aside = container.querySelector('[data-slot="page-aside"]');
    const body = container.querySelector('[data-slot="page-body"]');
    expect(aside).toBeTruthy();
    expect(body).toBeTruthy();
    expect(
      Boolean(aside && body && aside.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });

  it('renders aside after body when asidePosition is right', () => {
    const { container } = render(
      <>{createAsideSchemaPage([{ type: 'text', text: 'ASIDE' }], 'right')}</>,
    );
    const aside = container.querySelector('[data-slot="page-aside"]');
    const body = container.querySelector('[data-slot="page-body"]');
    expect(aside).toBeTruthy();
    expect(body).toBeTruthy();
    expect(
      Boolean(aside && body && aside.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_PRECEDING),
    ).toBe(true);
  });

  it('collapses aside column when aside region renders empty (Decision)', () => {
    const { container } = render(<>{createAsideSchemaPage([])}</>);
    expect(container.querySelector('[data-slot="page-aside"]')).toBeNull();
  });

  it('does not render page-aside when no aside region is configured (no regression)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-family-page-no-aside"
        schema={{ type: 'page', title: 'T', body: [{ type: 'text', text: 'B' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="page-aside"]')).toBeNull();
  });

  it('renders data-slot="page-subtitle" when subTitle is set', () => {
    const { container } = render(<>{createSubTitleSchemaPage('Helper subtitle')}</>);
    const sub = container.querySelector('[data-slot="page-subtitle"]');
    expect(sub).toBeTruthy();
    expect(sub?.textContent).toContain('Helper subtitle');
  });

  it('renders data-slot="page-remark" Tooltip trigger when remark is set', () => {
    const { container } = render(<>{createRemarkSchemaPage('Some hint')}</>);
    const remark = container.querySelector('[data-slot="page-remark"]');
    expect(remark).toBeTruthy();
  });

  it('does not render subTitle/remark markers when not set (no regression)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-family-page-plain"
        schema={{ type: 'page', title: 'T', body: [{ type: 'text', text: 'B' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="page-subtitle"]')).toBeNull();
    expect(container.querySelector('[data-slot="page-remark"]')).toBeNull();
  });
});

function createAsideSchemaPage(asideBody: BaseSchema[], asidePosition?: 'left' | 'right') {
  const SchemaRenderer = createBasicSchemaRenderer();
  return (
    <SchemaRenderer
      schemaUrl="test://layout-family-page-aside"
      schema={{
        type: 'page',
        title: 'T',
        body: [{ type: 'text', text: 'MAIN BODY' }],
        aside: asideBody,
        ...(asidePosition ? { asidePosition } : {}),
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />
  );
}

function createSubTitleSchemaPage(subTitle: string) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return (
    <SchemaRenderer
      schemaUrl="test://layout-family-page-subtitle"
      schema={{ type: 'page', title: 'T', subTitle, body: [{ type: 'text', text: 'B' }] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />
  );
}

function createRemarkSchemaPage(remark: string) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return (
    <SchemaRenderer
      schemaUrl="test://layout-family-page-remark"
      schema={{ type: 'page', title: 'T', remark, body: [{ type: 'text', text: 'B' }] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />
  );
}

describe('tabs renderer - per-tab badge / icon', () => {
  afterEach(cleanup);

  it('renders data-slot="tab-badge" inside the trigger when item badge=5', async () => {
    renderInPage({
      type: 'tabs',
      items: [
        { key: 'a', title: 'A', badge: 5, body: [{ type: 'text', text: 'A body' }] },
      ],
    } as BaseSchema);
    await waitFor(() => {
      const badge = document.querySelector('[data-slot="tab-badge"]');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('5');
    });
  });

  it('renders data-slot="tab-icon" inside the trigger when item icon="user"', async () => {
    renderInPage({
      type: 'tabs',
      items: [
        { key: 'a', title: 'A', icon: 'user', body: [{ type: 'text', text: 'A body' }] },
      ],
    } as BaseSchema);
    await waitFor(() => {
      const icon = document.querySelector('[data-slot="tab-icon"]');
      expect(icon).toBeTruthy();
    });
  });

  it('falls back to String(badge) when badge is a non-number/string (Failure Path tabs-badge-invalid)', async () => {
    renderInPage({
      type: 'tabs',
      items: [
        {
          key: 'a',
          title: 'A',
          badge: { count: 7 } as unknown as string,
          body: [{ type: 'text', text: 'A body' }],
        },
      ],
    } as BaseSchema);
    await waitFor(() => {
      const badge = document.querySelector('[data-slot="tab-badge"]');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('[object Object]');
    });
  });

  it('does not render badge/icon markers when not configured (no regression)', async () => {
    renderInPage({
      type: 'tabs',
      items: [{ key: 'a', title: 'A', body: [{ type: 'text', text: 'A body' }] }],
    } as BaseSchema);
    await waitFor(() => {
      expect(screen.getByText('A body')).toBeTruthy();
    });
    expect(document.querySelector('[data-slot="tab-badge"]')).toBeNull();
    expect(document.querySelector('[data-slot="tab-icon"]')).toBeNull();
  });
});

describe('tabs renderer - per-tab mountOnEnter / unmountOnExit', () => {
  afterEach(cleanup);

  it('mountOnEnter=true keeps inactive tab content out of DOM until first activation', async () => {
    renderInPage({
      type: 'tabs',
      value: 'first',
      items: [
        { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
        {
          key: 'second',
          title: 'Second',
          mountOnEnter: true,
          body: [{ type: 'text', text: 'Second body' }],
        },
      ],
    } as BaseSchema);

    await waitFor(() => expect(screen.getByText('First body')).toBeTruthy());
    expect(screen.queryByText('Second body')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));
    await waitFor(() => expect(screen.getByText('Second body')).toBeTruthy());
  });

  it('unmountOnExit=true unmounts content when switched away', async () => {
    renderInPage({
      type: 'tabs',
      value: 'first',
      items: [
        {
          key: 'first',
          title: 'First',
          unmountOnExit: true,
          body: [{ type: 'text', text: 'First body' }],
        },
        { key: 'second', title: 'Second', body: [{ type: 'text', text: 'Second body' }] },
      ],
    } as BaseSchema);

    await waitFor(() => expect(screen.getByText('First body')).toBeTruthy());
    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));
    await waitFor(() => expect(screen.getByText('Second body')).toBeTruthy());
    expect(screen.queryByText('First body')).toBeNull();
  });

  it('keeps inactive panels mounted by default (keepMounted=true regression)', async () => {
    renderInPage({
      type: 'tabs',
      value: 'first',
      items: [
        { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
        { key: 'second', title: 'Second', body: [{ type: 'text', text: 'Second body' }] },
      ],
    } as BaseSchema);

    await waitFor(() => {
      expect(screen.getByText('First body')).toBeTruthy();
      expect(screen.getByText('Second body')).toBeTruthy();
    });
  });
});
