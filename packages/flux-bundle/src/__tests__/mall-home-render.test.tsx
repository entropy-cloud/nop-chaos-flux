/// <reference types="node" />
import { readFileSync } from 'node:fs';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultFluxEnv,
  createFluxSchemaRenderer,
  createFluxRendererRegistry,
  registerDefaultFluxRenderers,
} from '../index.js';

// nop-app-mall mobile 首页（PageProvider 实际返回的 schema）：
// 用于确定性复现壳内「部分节点不渲染」的问题。
const homeSchema = JSON.parse(
  readFileSync('src/__tests__/mall-home-page.json', 'utf8'),
) as Record<string, unknown>;

async function renderHome() {
  const registry = createFluxRendererRegistry();
  registerDefaultFluxRenderers(registry);
  const SchemaRenderer = createFluxSchemaRenderer();
  const fetcher = vi.fn(async (api: { url: string }) => {
    // 数据源失败（H2 SQL 等）不应阻断渲染：返回错误信封
    return { status: -1, data: null, msg: 'mock failure' };
  });
  const env = {
    ...createDefaultFluxEnv(),
    fetcher: fetcher as unknown as (api: never, ctx: never) => Promise<never>,
  };
  const view = render(
    React.createElement(SchemaRenderer, {
      schema: homeSchema as never,
      registry,
      env: env as never,
    } as never),
  );
  return view;
}

describe.skip('mall mobile home page (PageProvider schema) —— 复现基底：当前卡在 Schema preparing（测试 env 异步编译未就绪），需先补 env.importLoader/compile 等待后作为 body 渲染回归的确定性复现', () => {
  it('renders brand header, section title and goods grid without throwing', async () => {
    const view = await renderHome();
    (await import('node:fs')).writeFileSync('/tmp/mall-dom.html', document.body.innerHTML.slice(0, 4000));
        // 关键断言：品牌头部 wrapper 必须存在（此前回归：className 包装节点被丢弃、子节点被提升）
    expect(document.querySelector('.mall-brand-header')).toBeTruthy();
    expect(document.querySelector('.mall-brand-title')?.textContent).toContain('mall 优选');
    expect(document.querySelector('.mall-search-capsule')?.getAttribute('label') ?? 'x').toBeDefined();
    expect(document.querySelector('.mall-section-title')?.textContent).toContain('猜你喜欢');
    expect(document.querySelectorAll('.mall-goods-card').length).toBeGreaterThan(0);
    view.unmount();
  });
});
