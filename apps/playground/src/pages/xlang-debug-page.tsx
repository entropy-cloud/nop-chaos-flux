import { useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerXlangDebugEditorRenderers } from '@nop-chaos/flux-xlang-debug';
import { createDefaultOpenSocket } from '../env/socket-impl';

/** xlang 在线调试演示页（plan 621 Phase 2，M4：经 schema+registry+SchemaRenderer
 * 路径渲染——renderer definition 获得 live 消费方）。token/后端地址为演示态手工
 * 注入（playground 无登录流与 dev proxy——真实后端联调归 item 21/22）。 */
const registry = createDefaultRegistry();
registerXlangDebugEditorRenderers(registry);
const formulaCompiler = createFormulaCompiler();
const SchemaRenderer = createSchemaRenderer();

const schema = {
  type: 'page',
  body: [
    {
      type: 'xlang-debug-editor',
      name: 'xlangDebugEditor',
      sourcePath: 'demo.xpl',
      serverUrl: '/ws/xlang-debugger',
      initialSource:
        'function greet(name) {\n  return "hello, " + name;\n}\n\nreturn greet("xlang");\n',
    },
  ],
};

export default function XlangDebugPage() {
  const [token, setToken] = useState('');
  const [connected, setConnected] = useState(false);
  const openSocket = createDefaultOpenSocket();

  if (!connected || !token) {
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <h2>XLang 在线调试（演示）</h2>
        <p>输入平台 access token 并连接 WS 调试网关（/ws/xlang-debugger）。</p>
        <input
          type="text"
          placeholder="access token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <button type="button" disabled={!token} onClick={() => setConnected(true)}>
          连接调试会话
        </button>
      </div>
    );
  }

  // token 注入 WS URL（playground 无登录流——演示态手工 token）
  const env = {
    fetcher: async (
      api: { url: string; method?: string; headers?: Record<string, string>; data?: unknown },
      _ctx?: unknown,
    ) => {
      const response = await fetch(api.url, {
        method: api.method ?? 'POST',
        headers: { ...api.headers, Authorization: `Bearer ${token}` },
        body: api.data == null ? undefined : JSON.stringify(api.data),
      });
      const data = (await response.json().catch(() => null)) as unknown;
      return { status: response.ok ? 0 : response.status, data };
    },
    notify: () => undefined,
    openSocket: (url: string) => {
      const separator = url.includes('?') ? '&' : '?';
      return openSocket(`${url}${separator}nopDebugToken=${encodeURIComponent(token)}`);
    },
  } as RendererEnv;

  return (
    <div style={{ padding: 24, height: '100%' }}>
      <SchemaRenderer
        schemaUrl="playground://pages/xlang-debug"
        schema={schema}
        env={env}
        registry={registry}
        formulaCompiler={formulaCompiler}
      />
    </div>
  );
}
