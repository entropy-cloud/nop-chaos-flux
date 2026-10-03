import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { CarouselRenderer } from './carousel.js';
import { QrCodeRenderer } from './qrcode.js';
import { StatusRenderer } from './status.js';
import { DiffViewRenderer } from './diff-view/diff-view-renderer.js';
import { createMockRendererProps } from './test-support.js';
import { createTestRuntime, TestRuntimeProvider } from './test-support-runtime.js';
import type { BaseSchema } from '@nop-chaos/flux-core';

afterEach(cleanup);

function mount(
  component: React.ComponentType<never>,
  schema: BaseSchema,
  props: Record<string, unknown> = {},
) {
  const mockProps = createMockRendererProps({
    schema: schema as BaseSchema,
    props,
    meta: { testid: 'demo-node', cid: 1 },
  });
  return render(
    <TestRuntimeProvider runtime={createTestRuntime()}>
      {React.createElement(component, mockProps as never)}
    </TestRuntimeProvider>,
  );
}

describe('content dom-structure contract (root anchors, plan 533)', () => {
  it('qrcode root carries hand-written anchors on the natural figure element', async () => {
    const { container } = mount(QrCodeRenderer, { type: 'qrcode' } as BaseSchema, {
      value: 'https://example.com',
    });
    // canvas 绘制在 happy-dom 下异步失败走 fallback，但根 figure 始终同步渲染
    await waitFor(() => {
      expect(container.querySelector('.nop-qrcode')).toBeTruthy();
    });
    const root = container.querySelector('.nop-qrcode')!;
    expect(root.getAttribute('data-testid')).toBeTruthy();
    expect(root.getAttribute('data-cid')).toBeTruthy();
    // happy-dom 下 canvas 绘制失败走 fallback（qrcode-fallback slot）；
    // role=img + aria-label 在成功路径的 qrcode-canvas 上，由既有 qrcode 测试以 mock 覆盖
    expect(
      container.querySelector('[data-slot="qrcode-canvas"]') ??
        container.querySelector('[data-slot="qrcode-fallback"]'),
    ).toBeTruthy();
  });

  it('carousel root keeps its slot; per-slide frame layer declares its slot (W6 fix)', () => {
    const { container } = mount(CarouselRenderer, { type: 'carousel' } as BaseSchema, {
      items: [
        { src: 'https://example.com/a.png', alt: 'A' },
        { src: 'https://example.com/b.png', alt: 'B' },
      ],
    });
    const root = container.querySelector('[data-slot="carousel"]')!;
    expect(root).toBeTruthy();
    expect(root.classList.contains('nop-carousel')).toBe(true);
    expect(root.getAttribute('data-testid')).toBeTruthy();
    expect(root.getAttribute('data-cid')).toBeTruthy();
    // 每帧媒体框层（caption 定位上下文 + 裁剪圆角 + 占位底色三合一）补章
    expect(container.querySelectorAll('[data-slot="carousel-item-frame"]').length).toBe(2);
  });

  it('status span root carries anchors (status-root slot)', () => {
    const { container } = mount(StatusRenderer, { type: 'status' } as BaseSchema, {
      value: 'ok',
    });
    const root = container.querySelector('[data-slot="status-root"]')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-testid')).toBeTruthy();
    expect(root.getAttribute('data-cid')).toBeTruthy();
  });

  it('diff-view three-column branch root carries its slot (W6 fix, no guard)', () => {
    // three-column 分支触发条件：viewType='split' 且 middleContent 非空
    const { container } = mount(
      DiffViewRenderer,
      { type: 'diff-view', viewType: 'split' } as unknown as BaseSchema,
      { oldContent: 'a', newContent: 'b', middleContent: 'm' },
    );
    const root = container.querySelector('.nop-diff-view-three-column')!;
    // 无守卫：分支未渲染即失败（此前 props 误用导致空过，审计 F1 修正）
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('diff-view');
  });
});
