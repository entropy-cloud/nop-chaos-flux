/// <reference types="node" />
import { readFileSync } from 'node:fs';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createDefaultFluxEnv,
  createFluxRendererRegistry,
  createFluxSchemaRenderer,
  registerDefaultFluxRenderers,
} from '../index.js';

// nop-app-mall mobile 首页「brand-header」片段的最小确定性复现：
// 壳内回归现象为该 wrapper 节点不渲染（子节点被丢弃/提升）。
const brandHeaderFragment = {
  type: 'flex',
  direction: 'column',
  className: 'mall-brand-header',
  body: [
    {
      type: 'flex',
      align: 'center',
      gap: 8,
      body: [
        { type: 'text', text: 'mall 优选', className: 'mall-brand-title' },
        { type: 'text', text: '新人专享 · 天天领券 · 品牌特卖', className: 'mall-brand-notice' },
      ],
    },
    { type: 'button', className: 'mall-search-capsule', label: '搜索商品 / 品牌 / 专题' },
  ],
} as const;

function renderSchema(schema: unknown) {
  const registry = createFluxRendererRegistry();
  registerDefaultFluxRenderers(registry);
  const SchemaRenderer = createFluxSchemaRenderer();
  return render(
    React.createElement(SchemaRenderer, {
      schemaUrl: 'test://mall-brand-header.json',
      schema: schema as never,
      env: createDefaultFluxEnv(),
    } as never),
  );
}

describe('mall mobile goods grid fragment (loop + $slot.item)', () => {
  it('renders goods cards from loop scope', async () => {
    const goodsGrid = {
      type: 'flex',
      wrap: true,
      gap: 8,
      body: {
        type: 'loop',
        items: [
          { name: '商品A', picUrl: 'a.png', retailPrice: 9.9 },
          { name: '商品B', picUrl: 'b.png', retailPrice: 19.9 },
        ],
        body: {
          type: 'flex',
          direction: 'column',
          gap: 6,
          className: 'mall-goods-card mall-goods-item',
          body: [
            { type: 'image', src: 'x', alt: 'y', className: 'mall-goods-img' },
            { type: 'text', text: 'x', className: 'mall-goods-name' },
          ],
        },
      },
    };
    const view = renderSchema(goodsGrid);
    await waitFor(
      () => {
        expect(document.querySelectorAll('.mall-goods-card').length).toBe(2);
      },
      { timeout: 5000 },
    );
    view.unmount();
  });
});

describe('mall mobile home page (PageProvider envelope, data-source 失败不阻断渲染)', () => {
  it('renders brand header, section title and goods grid', async () => {
    const envelope = JSON.parse(
      readFileSync('src/__tests__/page.json', 'utf8'),
    ) as { data: unknown };
    const registry = createFluxRendererRegistry();
    registerDefaultFluxRenderers(registry);
    const SchemaRenderer = createFluxSchemaRenderer();
    const env = createDefaultFluxEnv({
      fetcher: (async () => ({ status: -1, data: null, msg: 'mock failure' })) as never,
    } as never);
    const view = render(
      React.createElement(SchemaRenderer, {
        schemaUrl: 'test://mall-home-page.json',
        schema: envelope.data as never,
        env,
      } as never),
    );
    await waitFor(
      () => {
        expect(document.querySelector('.mall-brand-header')).toBeTruthy();
      },
      { timeout: 8000 },
    );
    expect(screen.getByText('猜你喜欢')).toBeTruthy();
    view.unmount();
  });
});

describe('mall mobile brand-header fragment (壳内回归最小复现)', () => {
  it('renders the wrapper className, nested texts and button label', async () => {
    const view = renderSchema(brandHeaderFragment);
    await waitFor(
      () => {
        expect(document.querySelector('.mall-brand-header')).toBeTruthy();
      },
      { timeout: 5000 },
    );
    expect(screen.getByText('mall 优选')).toBeTruthy();
    expect(screen.getByText('新人专享 · 天天领券 · 品牌特卖')).toBeTruthy();
    expect(screen.getByText('搜索商品 / 品牌 / 专题')).toBeTruthy();
    view.unmount();
  });
});
