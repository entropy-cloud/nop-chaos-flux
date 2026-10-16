import { useState } from 'react';
import { XlangDebugEditor } from '@nop-chaos/flux-xlang-debug';
import { createDefaultOpenSocket } from '../env/socket-impl';

/** xlang 在线调试演示页（plan 621 Phase 2）：token/后端地址为演示态手工注入
 * （playground 无登录流与 dev proxy——真实后端联调归 item 21/22）。 */
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

  return (
    <div style={{ padding: 24, height: '100%' }}>
      <XlangDebugEditor
        sourcePath="demo.xpl"
        serverUrl="/ws/xlang-debugger"
        openSocket={openSocket}
        compile={async (sourcePath: string, source: string) => {
          const response = await fetch('/r/nop-xlang-debug/compile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ sourcePath, source }),
          });
          if (!response.ok) {
            return [{ line: 1, severity: 'error' as const, message: `compile failed: ${response.status}` }];
          }
          const data = (await response.json()) as {
            diagnostics?: Array<{ line: number; severity: 'error' | 'warning'; message: string; errorCode?: string }>;
          };
          return data.diagnostics ?? [];
        }}
        getToken={() => token}
        initialSource={'function greet(name) {\n  return "hello, " + name;\n}\n\nreturn greet("xlang");\n'}
      />
    </div>
  );
}
