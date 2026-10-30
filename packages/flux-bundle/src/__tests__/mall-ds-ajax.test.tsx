/// <reference types="node" />
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createDefaultFluxEnv,
  createFluxRendererRegistry,
  createFluxSchemaRenderer,
  registerDefaultFluxRenderers,
} from '../index.js';

// 复现壳内 data-source(action=ajax, args.data) 请求体丢失问题：
// 后端收到的 body 为空（参数[page]不允许为空）。
const captured: unknown[] = [];

describe('data-source ajax args.data 契约', () => {
  it('passes args.data as the request body', async () => {
    const schema = {
      type: 'page',
      title: 't',
      body: [
        {
          type: 'data-source',
          name: 'ds',
          action: 'ajax',
          args: {
            url: '/r/X__op',
            method: 'post',
            data: { page: 1, pageSize: 10 },
          },
          initialData: [],
        },
        { type: 'text', text: 'ok' },
      ],
    };
    const registry = createFluxRendererRegistry();
    registerDefaultFluxRenderers(registry);
    const SchemaRenderer = createFluxSchemaRenderer();
    const env = createDefaultFluxEnv({
      fetcher: (async (api: { url: string; data?: unknown }) => {
        captured.push({ url: api.url, data: api.data });
        return { status: 0, data: { items: [] }, msg: '' };
      }) as never,
    } as never);
    const view = render(
      React.createElement(SchemaRenderer, {
        schemaUrl: 'test://ds-ajax.json',
        schema: schema as never,
        env,
      } as never),
    );
    await waitFor(() => expect(captured.length).toBeGreaterThan(0), { timeout: 5000 });
    console.log('CAPTURED', JSON.stringify(captured));
    expect(captured[0]).toMatchObject({ url: '/r/X__op', data: { page: 1, pageSize: 10 } });
    view.unmount();
  });
});
