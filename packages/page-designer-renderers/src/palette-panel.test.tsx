/**
 * Palette 面板测试（S1 §9）：registry 驱动分组渲染、MVP 白名单补脚手架、
 * 六域 / domain-host 排除、过滤、拖拽源载荷。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PalettePanel } from './palette-panel.js';
import { PD_ACCENT_BORDER, PD_ACCENT_SOFT_BG } from './page-designer-tokens.js';
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

  it('UR-18 #7: template-slot leaves (input-text/select) do not carry the container badge, structural containers do', () => {
    const registry = createPageDesignerRegistry();
    const items = buildMvpPaletteItems(registry);
    const containerOf = (type: string) =>
      items.find((item) => item.type === type)?.isContainer;
    // suggestTemplate/optionTemplate 模板槽 region 不再被计为容器。
    expect(containerOf('input-text')).toBe(false);
    expect(containerOf('select')).toBe(false);
    // 结构容器（region 规则带 regionKey）不受影响。
    expect(containerOf('container')).toBe(true);
    expect(containerOf('flex')).toBe(true);
    expect(containerOf('tabs')).toBe(true);
    // grid/collapse 顶层无 region 规则（region 嵌在 items prop contract 内），维持非容器判定。
    expect(containerOf('grid')).toBe(false);
    expect(containerOf('collapse')).toBe(false);
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
    const setDragImage = vi.fn();
    const fired = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(fired, 'dataTransfer', {
      value: { setData, effectAllowed: '', setDragImage },
    });
    item.dispatchEvent(fired);
    expect(setData).toHaveBeenCalledTimes(1);
    const [mime, payload] = setData.mock.calls[0] as string[];
    expect(mime).toBe('application/x-nop-page-designer');
    expect(JSON.parse(payload)).toEqual({ source: 'palette', type: 'button' });
  });

  // plan 527 Phase 1：dragstart 构造自定义 ghost（setDragImage 守卫下）并在微任务后清理
  it('creates and cleans up a drag ghost when dataTransfer supports setDragImage', async () => {
    const registry = createPageDesignerRegistry();
    const items = buildMvpPaletteItems(registry);
    render(<PalettePanel items={items} onItemClick={vi.fn()} />);
    const item = document.querySelector('[data-palette-item="button"]') as HTMLElement;
    const setDragImage = vi.fn((ghost: Element) => {
      expect(ghost.getAttribute('data-testid')).toBe('page-designer-drag-ghost');
      expect(document.body.contains(ghost)).toBe(true);
    });
    const fired = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(fired, 'dataTransfer', {
      value: { setData: vi.fn(), effectAllowed: '', setDragImage },
    });
    item.dispatchEvent(fired);
    expect(setDragImage).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('[data-testid="page-designer-drag-ghost"]')).toBeNull();
  });

  // plan 527 Phase 1：dataTransfer mock 无 setDragImage（既有宿主形态）时不炸、不产 ghost
  it('degrades gracefully when dataTransfer lacks setDragImage', () => {
    const registry = createPageDesignerRegistry();
    const items = buildMvpPaletteItems(registry);
    render(<PalettePanel items={items} onItemClick={vi.fn()} />);
    const item = document.querySelector('[data-palette-item="button"]') as HTMLElement;
    const fired = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(fired, 'dataTransfer', {
      value: { setData: vi.fn(), effectAllowed: '' },
    });
    expect(() => item.dispatchEvent(fired)).not.toThrow();
    expect(document.querySelector('[data-testid="page-designer-drag-ghost"]')).toBeNull();
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

// plan 597 CX-17：palette 拖拽 ghost 钉（原 setPaletteDragGhost 已收敛为 ui
// setDragGhost 共享原语，消费位映射=A：testid/label=i18n badge 组合终串（消费侧组参）/
// PD-token cssText 含 gap:6px/offsets 缺省 12,12）。cssText 经 createElement 拦截捕获
// 赋值原串做逐字节保形核对（happy-dom 解析器会丢弃 color-mix/hsl(var()) 声明，
// live style 对象只钉幸存属性）；统一防御（throw 环境=无 uncaught+ghost 同步移除，
// B 派 catch 语义）。
describe('PalettePanel drag ghost (plan 597 CX-17)', () => {
  afterEach(() => {
    document
      .querySelectorAll('[data-testid="page-designer-drag-ghost"]')
      .forEach((el) => el.remove());
  });

  const GHOST_INVARIANT_CSS_TEXT =
    'position:fixed;top:-200px;left:-200px;z-index:-1;pointer-events:none;display:inline-flex;align-items:center;white-space:nowrap';
  const GHOST_CONSUMER_CSS_TEXT = [
    'gap:6px',
    'padding:6px 12px',
    'border-radius:8px',
    `border:1px solid ${PD_ACCENT_BORDER}`,
    `background:${PD_ACCENT_SOFT_BG}`,
    'box-shadow:0 4px 12px rgba(15,23,42,0.16)',
    'font-size:13px',
    'font-weight:500',
  ].join(';');

  function fireDragStart(item: HTMLElement, dataTransfer: unknown): DragEvent {
    const fired = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(fired, 'dataTransfer', { value: dataTransfer });
    item.dispatchEvent(fired);
    return fired;
  }

  function captureGhostCssText(): string[] {
    const assigned: string[] = [];
    const createElement = document.createElement.bind(document);
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window.CSSStyleDeclaration.prototype,
      'cssText',
    );
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const el = createElement(tagName) as HTMLElement;
      if (originalDescriptor?.get && originalDescriptor.set) {
        Object.defineProperty(el.style, 'cssText', {
          get() {
            return originalDescriptor.get!.call(el.style);
          },
          set(value: string) {
            assigned.push(value);
            originalDescriptor.set!.call(el.style, value);
          },
          configurable: true,
        });
      }
      return el;
    }) as typeof document.createElement);
    return assigned;
  }

  function renderPaletteItem(type: string): HTMLElement {
    const registry = createPageDesignerRegistry();
    const items = buildMvpPaletteItems(registry);
    render(<PalettePanel items={items} onItemClick={vi.fn()} />);
    return document.querySelector(`[data-palette-item="${type}"]`) as HTMLElement;
  }

  it('appends the offscreen ghost with testid, plain label, byte-shape PD-token cssText (gap:6px) and hands it to setDragImage at (12,12) with setTimeout(0) cleanup', () => {
    vi.useFakeTimers();
    try {
      const registry = createPageDesignerRegistry();
      const items = buildMvpPaletteItems(registry);
      const expectedLabel = items.find((item) => item.type === 'button')!.displayName;
      const item = renderPaletteItem('button');
      const assignedCssTexts = captureGhostCssText();
      const setDragImage = vi.fn();
      fireDragStart(item, { setData: vi.fn(), effectAllowed: '', setDragImage });
      expect(setDragImage).toHaveBeenCalledTimes(1);
      const [ghostArg, offsetX, offsetY] = setDragImage.mock.calls[0] as unknown as [
        Element,
        number,
        number,
      ];
      expect(offsetX).toBe(12);
      expect(offsetY).toBe(12);
      const ghost = document.querySelector('[data-testid="page-designer-drag-ghost"]');
      expect(ghost).not.toBeNull();
      expect(ghost).toBe(ghostArg);
      expect(ghost?.textContent).toBe(expectedLabel);
      // 逐字节保形：共享不变式 + 消费方 PD-token cssText（含 gap:6px）
      expect(assignedCssTexts).toContain(`${GHOST_INVARIANT_CSS_TEXT};${GHOST_CONSUMER_CSS_TEXT}`);
      const style = (ghost as HTMLElement).style;
      expect(style.position).toBe('fixed');
      expect(Number.parseInt(style.top, 10)).toBeLessThan(0);
      expect(style.pointerEvents).toBe('none');
      expect(style.getPropertyValue('gap')).toBe('6px');
      expect(style.whiteSpace).toBe('nowrap');
      vi.runAllTimers();
      expect(document.querySelector('[data-testid="page-designer-drag-ghost"]')).toBeNull();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it('composes the i18n container badge into the ghost label for container items', () => {
    const registry = createPageDesignerRegistry();
    const items = buildMvpPaletteItems(registry);
    const container = items.find((item) => item.type === 'container' && item.isContainer === true)!;
    const item = renderPaletteItem('container');
    fireDragStart(item, { setData: vi.fn(), effectAllowed: '', setDragImage: vi.fn() });
    const ghost = document.querySelector('[data-testid="page-designer-drag-ghost"]');
    expect(ghost?.textContent).toBe(`${container.displayName} · ${t('flux.pageDesigner.containerBadge')}`);
  });

  // 防御增强判别绿腿（plan 597 CX-17 统一防御，OLD=裸调用 uncaught[window error
  // 事件恰 1+ghost 残留，Phase 1 钉承载红腿记录]）：setDragImage 抛错环境（happy-dom
  // Not implemented 形态）→ 无 uncaught、setDragImage 恰一次、ghost 同步移除。
  it('degrades without uncaught throw and removes the ghost synchronously when setDragImage throws (defense enhancement, B-derived catch semantics)', () => {
    const item = renderPaletteItem('button');
    const errors: ErrorEvent[] = [];
    const onError = (event: Event): void => {
      errors.push(event as ErrorEvent);
    };
    window.addEventListener('error', onError);
    try {
      const setDragImage = vi.fn(() => {
        throw new Error('Not implemented');
      });
      expect(() =>
        fireDragStart(item, { setData: vi.fn(), effectAllowed: '', setDragImage }),
      ).not.toThrow();
      expect(setDragImage).toHaveBeenCalledTimes(1);
      expect(errors).toHaveLength(0);
      expect(document.querySelector('[data-testid="page-designer-drag-ghost"]')).toBeNull();
    } finally {
      window.removeEventListener('error', onError);
    }
  });
});
