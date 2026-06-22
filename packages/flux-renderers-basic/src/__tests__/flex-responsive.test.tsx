import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

function renderInPage(body: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://flex-responsive"
      schema={{ type: 'page', body: [body] }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('flex renderer — responsive direction (M3b)', () => {
  it('emits sm:flex-row md:flex-col when responsiveDirection is set', () => {
    const { container } = renderInPage({
      type: 'flex',
      direction: 'column',
      responsiveDirection: { sm: 'row', md: 'column' },
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const root = container.querySelector('.nop-flex');
    expect(root).toBeTruthy();
    const cls = root?.className ?? '';
    expect(cls).toContain('flex-col');
    expect(cls).toContain('sm:flex-row');
    expect(cls).toContain('md:flex-col');
  });

  it('emits md:flex-row-reverse lg:flex-col-reverse for reverse breakpoints', () => {
    const { container } = renderInPage({
      type: 'flex',
      responsiveDirection: { md: 'row-reverse', lg: 'column-reverse' },
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const cls = container.querySelector('.nop-flex')?.className ?? '';
    expect(cls).toContain('md:flex-row-reverse');
    expect(cls).toContain('lg:flex-col-reverse');
    expect(cls).not.toMatch(/(^|\s)flex-(row|col)(-reverse)?(\s|$)/);
  });

  it('ignores unknown breakpoint keys (no class emitted)', () => {
    const { container } = renderInPage({
      type: 'flex',
      responsiveDirection: { xs: 'row' } as unknown as Record<string, string>,
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const cls = container.querySelector('.nop-flex')?.className ?? '';
    expect(cls).not.toContain('xs:');
  });

  it('emits nothing when responsiveDirection is absent (no regression vs base direction)', () => {
    const { container } = renderInPage({
      type: 'flex',
      direction: 'row',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const cls = container.querySelector('.nop-flex')?.className ?? '';
    expect(cls).toContain('flex-row');
    expect(cls).not.toMatch(/(sm|md|lg|xl|2xl):flex-/);
  });
});

describe('flex renderer — responsive wrap (M3b)', () => {
  it('emits sm:flex-wrap md:flex-nowrap for responsive wrap overrides', () => {
    const { container } = renderInPage({
      type: 'flex',
      wrap: true,
      responsiveWrap: { md: false },
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const cls = container.querySelector('.nop-flex')?.className ?? '';
    expect(cls).toContain('flex-wrap');
    expect(cls).toContain('md:flex-nowrap');
  });

  it('emits sm:flex-wrap when base wrap is false but sm breakpoint sets wrap', () => {
    const { container } = renderInPage({
      type: 'flex',
      responsiveWrap: { sm: true },
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const cls = container.querySelector('.nop-flex')?.className ?? '';
    expect(cls).toContain('sm:flex-wrap');
    expect(cls).not.toMatch(/(^|\s)flex-wrap(\s|$)/);
  });

  it('emits no wrap-related breakpoint classes when responsiveWrap is absent (no regression)', () => {
    const { container } = renderInPage({
      type: 'flex',
      wrap: true,
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const cls = container.querySelector('.nop-flex')?.className ?? '';
    expect(cls).toContain('flex-wrap');
    expect(cls).not.toMatch(/(sm|md|lg|xl|2xl):flex-(wrap|nowrap)/);
  });
});

describe('container renderer — responsive direction/wrap (M3b)', () => {
  it('emits sm:flex-row md:flex-col for container responsiveDirection', () => {
    const { container } = renderInPage({
      type: 'container',
      direction: 'column',
      responsiveDirection: { sm: 'row', md: 'column' },
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body).toBeTruthy();
    const cls = body?.className ?? '';
    expect(cls).toContain('flex');
    expect(cls).toContain('flex-col');
    expect(cls).toContain('sm:flex-row');
    expect(cls).toContain('md:flex-col');
    expect(body?.getAttribute('data-flex')).toBe('');
  });

  it('enables flex body when only responsive fields are set (no base direction/wrap)', () => {
    const { container } = renderInPage({
      type: 'container',
      responsiveDirection: { md: 'row' },
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body).toBeTruthy();
    const cls = body?.className ?? '';
    expect(cls).toContain('flex');
    expect(cls).toContain('md:flex-row');
    expect(body?.getAttribute('data-flex')).toBe('');
  });

  it('emits sm:flex-wrap md:flex-nowrap for container responsiveWrap', () => {
    const { container } = renderInPage({
      type: 'container',
      wrap: true,
      responsiveWrap: { sm: false, md: true },
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body).toBeTruthy();
    const cls = body?.className ?? '';
    expect(cls).toContain('flex-wrap');
    expect(cls).toContain('sm:flex-nowrap');
    expect(cls).toContain('md:flex-wrap');
  });

  it('keeps body as non-flex when no layout fields (no regression)', () => {
    const { container } = renderInPage({
      type: 'container',
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body).toBeTruthy();
    expect(body?.getAttribute('data-flex')).toBeNull();
    expect(body?.className ?? '').not.toMatch(/(sm|md|lg|xl|2xl):flex-/);
  });
});

describe('flex/container responsive — shared breakpoint field convention (Decision)', () => {
  it('flex and container both honor the same sm/md/lg/xl/2xl breakpoint keys', () => {
    const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
    const directionMap = Object.fromEntries(
      breakpoints.map((bp) => [bp, bp === 'sm' || bp === 'lg' || bp === '2xl' ? 'row' : 'column']),
    ) as Record<string, string>;

    const { container: flexContainer } = renderInPage({
      type: 'flex',
      responsiveDirection: directionMap,
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const flexCls = flexContainer.querySelector('.nop-flex')?.className ?? '';
    for (const bp of breakpoints) {
      expect(flexCls).toContain(`${bp}:flex-`);
    }

    cleanup();

    const { container: contContainer } = renderInPage({
      type: 'container',
      responsiveDirection: directionMap,
      body: [{ type: 'text', text: 'A' }],
    } as BaseSchema);
    const contCls = contContainer.querySelector('[data-slot="container-body"]')?.className ?? '';
    for (const bp of breakpoints) {
      expect(contCls).toContain(`${bp}:flex-`);
    }
  });
});
