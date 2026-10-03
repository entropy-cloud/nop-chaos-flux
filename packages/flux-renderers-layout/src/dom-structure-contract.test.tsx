import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { assertRendererRootAnchors } from '@nop-chaos/flux-react';
import { resizableRendererDefinition } from './resizable-renderer-definition.js';
import { createLayoutSchemaRenderer, env } from './test-support.js';

afterEach(cleanup);

const formulaCompiler = createFormulaCompiler();

function renderPage(body: Record<string, unknown>[], extra: Parameters<typeof createLayoutSchemaRenderer>[0] = []) {
  const SchemaRenderer = createLayoutSchemaRenderer(extra);
  return render(
    <SchemaRenderer
      schemaUrl="test://dom-structure-contract-layout"
      schema={{ type: 'page', body } as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('layout dom-structure contract (root anchors, plan 532)', () => {
  it('steps root carries anchors; ol root owns steps-root slot', () => {
    const { container } = renderPage([
      {
        type: 'steps',
        testid: 'demo-steps',
        value: 'review',
        items: [
          { value: 'draft', title: 'Draft' },
          { value: 'review', title: 'Review' },
        ],
      },
    ]);
    const root = container.querySelector('.nop-steps')!;
    expect(root).toBeTruthy();
    expect(root.tagName).toBe('OL');
    assertRendererRootAnchors(root, { type: 'steps' });
    expect(container.querySelector('[data-slot="steps-root"]')).toBeTruthy();
  });

  it('timeline root carries anchors (ol root owns timeline-root slot)', () => {
    const { container } = renderPage([
      {
        type: 'timeline',
        testid: 'demo-timeline',
        items: [{ title: 'T1', content: [{ type: 'text', text: 'c' }] }],
      },
    ]);
    const root = container.querySelector('.nop-timeline')!;
    expect(root).toBeTruthy();
    assertRendererRootAnchors(root, { type: 'timeline' });
    expect(container.querySelector('[data-slot="timeline-root"]')).toBeTruthy();
  });

  it('wizard root carries anchors (wizard-root slot)', () => {
    const { container } = renderPage([
      {
        type: 'wizard',
        testid: 'demo-wizard',
        steps: [{ title: 'S1', body: [{ type: 'text', text: 'b' }] }],
      },
    ]);
    const root = container.querySelector('.nop-wizard')!;
    expect(root).toBeTruthy();
    assertRendererRootAnchors(root, { type: 'wizard' });
    expect(container.querySelector('[data-slot="wizard-root"]')).toBeTruthy();
  });

  it('responsive root carries anchors with its root slot (W5 fix landed)', () => {
    const { container } = renderPage([
      {
        type: 'responsive',
        testid: 'demo-responsive',
        variants: [{ key: 'desktop', body: [{ type: 'text', text: 'd' }] }],
      },
    ]);
    const root = container.querySelector('.nop-responsive')!;
    expect(root).toBeTruthy();
    assertRendererRootAnchors(root, { type: 'responsive' });
    expect(container.querySelector('[data-slot="responsive-root"]')).toBeTruthy();
  });

  it('resizable: forced outer wrapper carries anchors (nop-resizable stays on ui PanelGroup)', () => {
    const { container } = renderPage(
      [
        {
          type: 'resizable',
          testid: 'demo-resizable',
          direction: 'horizontal',
          panels: [
            { key: 'left', defaultSize: 30, body: [{ type: 'text', text: 'LEFT' }] },
            { key: 'right', body: [{ type: 'text', text: 'RIGHT' }] },
          ],
        },
      ],
      [resizableRendererDefinition],
    );
    const outer = container.querySelector('[data-slot="resizable-root"]')!;
    expect(outer).toBeTruthy();
    // 根 class 为 forced wrapper 的 h-full（nop-resizable 由 ui PanelGroup 携带，
    // 见 resizable.tsx:12）——marker 断言按卡面口径 skip，另行断言 ui 层携带。
    assertRendererRootAnchors(outer, { type: 'resizable', skip: ['marker'] });
    // nop-resizable 由 ui 包装层（PanelGroup）携带，renderer 不重复添加
    expect(container.querySelector('.nop-resizable')).toBeTruthy();
    expect(outer.classList.contains('nop-resizable')).toBe(false);
  });
});
