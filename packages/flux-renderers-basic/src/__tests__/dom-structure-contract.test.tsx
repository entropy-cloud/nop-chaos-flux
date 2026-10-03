/**
 * DOM 结构契约冻结测试（docs/audits/dom-structure-checklist.md；plan 528 / W1）。
 * 默认配置渲染包内全部有 DOM 的 type，断言根三件套（nop-<type> + data-renderer
 * + data-cid）；结构性渲染器按审计卡登记的豁免口径断言，portal 通道按 host 根断言。
 */

import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import { assertRendererRootAnchors } from '@nop-chaos/flux-react';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

function renderInPage(body: BaseSchema) {
  const SchemaRenderer = createBasicSchemaRenderer();
  const { container } = render(
    <SchemaRenderer
      schemaUrl="test://dom-structure-contract"
      schema={{ type: 'page', body: [body] } as BaseSchema}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
  return container;
}

function bodyChildRoot(container: HTMLElement): HTMLElement {
  const body = container.querySelector('[data-slot="page-body"]');
  expect(body).toBeTruthy();
  return body!.firstElementChild as HTMLElement;
}

const inlineCases: Array<[string, BaseSchema]> = [
  ['container', { type: 'container', body: [{ type: 'text', text: 'A' }] } as BaseSchema],
  ['flex', { type: 'flex', body: [{ type: 'text', text: 'A' }] } as BaseSchema],
  ['text', { type: 'text', text: 'A' } as BaseSchema],
  ['button', { type: 'button', label: 'A' } as BaseSchema],
  ['icon', { type: 'icon', icon: 'gear' } as BaseSchema],
  ['badge', { type: 'badge', text: 'Info' } as BaseSchema],
  [
    'tabs',
    { type: 'tabs', items: [{ key: 'a', title: 'A', body: [{ type: 'text', text: 'A' }] }] } as BaseSchema,
  ],
  ['scope-debug', { type: 'scope-debug' } as BaseSchema],
  ['dynamic-renderer', { type: 'dynamic-renderer' } as BaseSchema],
];

describe('basic dom-structure contract (root anchors, plan 528)', () => {
  it('page root carries the anchor triple on the schema root', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://dom-structure-contract-page"
        schema={{ type: 'page' } as BaseSchema}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    assertRendererRootAnchors(container.querySelector('.nop-page'), { type: 'page' });
  });

  for (const [type, schema] of inlineCases) {
    it(`${type} root carries the anchor triple`, () => {
      const container = renderInPage(schema);
      assertRendererRootAnchors(bodyChildRoot(container), { type });
    });
  }

  it('button anchor branch keeps the identity contract (nop-button + data-slot)', () => {
    const container = renderInPage({ type: 'button', label: 'Open', href: 'https://example.com' } as BaseSchema);
    const anchor = bodyChildRoot(container);
    expect(anchor.tagName).toBe('A');
    expect(anchor.classList.contains('nop-button')).toBe(true);
    expect(anchor.getAttribute('data-slot')).toBe('button');
    assertRendererRootAnchors(anchor, { type: 'button' });
  });

  it('structural renderers render no wrapper root (exemption per audit cards)', () => {
    const container = renderInPage({
      type: 'fragment',
      body: [{ type: 'text', text: 'inside-fragment' }],
    } as BaseSchema);
    expect(screen.getByText('inside-fragment')).toBeTruthy();
    const body = container.querySelector('[data-slot="page-body"]')!;
    const root = body!.firstElementChild as HTMLElement;
    expect(root.classList.contains('nop-text')).toBe(true);
  });

  it('reaction/keyboard render no identity-stamped root (null-render exemption per audit cards)', () => {
    const reactionContainer = renderInPage({ type: 'reaction' } as BaseSchema);
    expect(reactionContainer.querySelector('[data-renderer="reaction"]')).toBeNull();

    const keyboardContainer = renderInPage({ type: 'keyboard' } as BaseSchema);
    expect(keyboardContainer.querySelector('[data-renderer="keyboard"]')).toBeNull();
  });

  it('dialog portal root carries the anchor triple (host-stamped)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dom-structure-contract-dialog"
        schema={{
          type: 'page',
          body: [
            { type: 'dialog', title: 'D', defaultOpen: true, body: [{ type: 'text', text: 'B' }] },
          ],
        } as BaseSchema}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    const surface = document.querySelector('[data-slot="dialog-surface"]')!;
    expect(surface).toBeTruthy();
    assertRendererRootAnchors(surface as HTMLElement, { type: 'dialog' });
  });

  it('drawer portal root carries the anchor triple (host-stamped)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dom-structure-contract-drawer"
        schema={{
          type: 'page',
          body: [
            { type: 'drawer', title: 'D', defaultOpen: true, body: [{ type: 'text', text: 'B' }] },
          ],
        } as BaseSchema}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    const surface = document.querySelector('[data-slot="drawer-surface"]')!;
    expect(surface).toBeTruthy();
    assertRendererRootAnchors(surface as HTMLElement, { type: 'drawer' });
  });

  it('command-palette visible panel carries the anchor triple (self-drawn root)', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://dom-structure-contract-palette"
        schema={{
          type: 'page',
          body: [{ type: 'command-palette', defaultOpen: true, items: [] }],
        } as BaseSchema}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    const panel = document.querySelector('.nop-command-palette')!;
    expect(panel).toBeTruthy();
    assertRendererRootAnchors(panel as HTMLElement, { type: 'command-palette' });
  });
});
