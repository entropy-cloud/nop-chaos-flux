/**
 * Palette 面板测试（S1 §9）：registry 驱动分组渲染、MVP 白名单补脚手架、
 * 六域 / domain-host 排除、过滤、拖拽源载荷。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PalettePanel } from './palette-panel.js';
import {
  buildMvpPaletteItems,
  createPageDesignerRegistry,
  resolvePaletteScaffold,
} from './designer-registry.js';

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

afterEach(cleanup);

describe('designer-registry', () => {
  it('real registry MVP palette contains layout containers, form atoms, text/button', () => {
    const registry = createPageDesignerRegistry();
    const items = buildMvpPaletteItems(registry);
    const types = new Set(items.map((item) => item.type));
    for (const expected of [
      'page',
      'container',
      'flex',
      'grid',
      'collapse',
      'tabs',
      'input-text',
      'input-number',
      'select',
      'checkbox',
      'radio-group',
      'textarea',
      'switch',
      'slider',
      'rating',
      'input-color',
      'verification-code',
      'text',
      'button',
    ]) {
      expect(types.has(expected), `palette should contain ${expected}`).toBe(true);
    }
    // stage 白名单外家族不出现（registry 未注册六域，且 data/content/scheduling 排除）。
    expect(types.has('crud')).toBe(false);
    expect(types.has('carousel')).toBe(false);
  });

  it('excludes domain-host and no-scaffold types from a custom registry', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({
        type: 'domain-widget',
        rendererClass: 'domain-host-renderer',
        defaultSchema: { type: 'domain-widget' },
        category: 'layout',
      }),
    );
    registry.register(def({ type: 'no-scaffold', category: 'layout' }));
    const items = buildMvpPaletteItems(registry);
    expect(items).toEqual([]);
  });

  it('resolvePaletteScaffold prefers definition.defaultSchema and rejects opaque-leaf', () => {
    const registry = createRendererRegistry();
    registry.register(
      def({ type: 'mine', defaultSchema: { type: 'mine', a: 1 }, category: 'layout' }),
    );
    registry.register(
      def({
        type: 'host-leaf',
        rendererClass: 'domain-host-renderer',
        defaultSchema: { type: 'host-leaf' },
      }),
    );
    expect(resolvePaletteScaffold('mine', registry)).toEqual({ type: 'mine', a: 1 });
    expect(resolvePaletteScaffold('input-text', createPageDesignerRegistry())).toEqual({
      type: 'input-text',
      name: 'field1',
      label: 'Input',
    });
    expect(resolvePaletteScaffold('host-leaf', registry)).toBeNull();
    expect(resolvePaletteScaffold('missing', registry)).toBeNull();
  });
});

describe('PalettePanel', () => {
  it('renders registry-driven groups with container badge and click handler', () => {
    const registry = createPageDesignerRegistry();
    const items = buildMvpPaletteItems(registry);
    const onItemClick = vi.fn();
    render(<PalettePanel items={items} onItemClick={onItemClick} />);

    const root = screen.getByTestId('page-designer-palette');
    expect(root.querySelector('[data-palette-group="layout"]')).not.toBeNull();
    const pageItem = root.querySelector('[data-palette-item="page"]');
    expect(pageItem?.getAttribute('data-palette-container')).toBe('true');
    const textItem = root.querySelector('[data-palette-item="text"]');
    expect(textItem?.getAttribute('data-palette-container')).toBeNull();

    fireEvent.click(root.querySelector('[data-palette-item="text"]')!);
    expect(onItemClick).toHaveBeenCalledWith('text');
  });

  it('items are draggable with palette payload on dragstart', () => {
    const registry = createPageDesignerRegistry();
    const items = buildMvpPaletteItems(registry);
    render(<PalettePanel items={items} onItemClick={vi.fn()} />);
    const item = document.querySelector('[data-palette-item="button"]') as HTMLElement;
    expect(item.getAttribute('draggable')).toBe('true');
    const setData = vi.fn();
    const fired = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(fired, 'dataTransfer', {
      value: { setData, effectAllowed: '' },
    });
    item.dispatchEvent(fired);
    expect(setData).toHaveBeenCalledTimes(1);
    const [mime, payload] = setData.mock.calls[0] as string[];
    expect(mime).toBe('application/x-nop-page-designer');
    expect(JSON.parse(payload)).toEqual({ source: 'palette', type: 'button' });
  });

  it('filters items by keyword', () => {
    const registry = createPageDesignerRegistry();
    const items = buildMvpPaletteItems(registry);
    render(<PalettePanel items={items} onItemClick={vi.fn()} />);
    const filter = screen.getByTestId('page-designer-palette-filter') as HTMLInputElement;
    fireEvent.change(filter, { target: { value: 'verification' } });
    const visible = document.querySelectorAll('[data-palette-item]');
    expect(visible).toHaveLength(1);
    expect(visible[0].getAttribute('data-palette-item')).toBe('verification-code');
  });

  it('renders empty-state message when nothing matches', () => {
    render(<PalettePanel items={[]} onItemClick={vi.fn()} />);
    expect(screen.getByText(/没有匹配|No matching/i)).toBeTruthy();
  });
});
