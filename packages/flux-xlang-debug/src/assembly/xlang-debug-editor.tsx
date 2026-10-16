import { useEffect, useMemo, useRef } from 'react';
import type { WebSocketConnection, WebSocketOpener } from '@nop-chaos/flux-core';
import { createLanguageExtension, useCodeMirror } from '@nop-chaos/flux-code-editor';
import {
  createXlangLinter,
  registerXlangLanguage,
  type XlangCompileService,
  type XlangDiagnostic,
} from '@nop-chaos/flux-xlang-lang';
import { createDebugStore } from '../state/debug-store.js';
import { createDebugClient } from '../client/debug-client.js';
import { syncStoreToExtensions } from '../extension/sync.js';
import { createBreakpointGutter } from '../extension/breakpoint-gutter.js';
import { exceptionLinesField, suspendedLinesField } from '../extension/decorations.js';
import { sourcePathFacet } from '../extension/source-path.js';
import { DebugPanel } from '../panel/debug-panel.js';

// 装配层首次渲染即注册（幂等——616 registerLanguage 重复注册仅覆盖告警）
let languageRegistered = false;

function ensureXlangLanguage(): void {
  if (!languageRegistered) {
    registerXlangLanguage();
    languageRegistered = true;
  }
}

export interface XlangDebugEditorProps {
  /** 调试文档锚点（gutter/sync/诊断编译共用）。单实例单 sourcePath 假设（plan 621 m8）。 */
  sourcePath: string;
  serverUrl: string;
  /** 宿主 env.openSocket（D5 §3.1 XD→FC 边兑现；capability check 在 connect 内）。 */
  openSocket: WebSocketOpener;
  /** 诊断编译服务（620 M3：sourcePath 参数化；宿主包装 /r/nop-xlang-debug/compile）。 */
  compile: XlangCompileService;
  /** per-attempt access token（618 M3）。 */
  getToken: () => string | undefined;
  initialSource?: string;
  onSessionClosed?: (payload: { reason: string; detail?: string }) => void;
  className?: string;
}

/**
 * XLang 在线调试编辑器装配（plan 621 Phase 1，D5 §3.5）：flux-code-editor
 * （createBaseExtensions language='xlang'——mount 前已 registerXlangLanguage）
 * ∪ 调试扩展（gutter/suspended/exception）∪ sourcePathFacet ∪ 诊断 linter
 * + DebugPanel 并列 + createDebugClient 连接管理。
 *
 * extensions 数组 memoized（617 结论：compartment 身份变化全量替换；
 * key 含 sourcePath——单实例单 sourcePath 假设，m8）。sync 桥不是 Extension：
 * view 就绪后 effect 接线，cleanup dispose（617 B2 泄漏边界：dispose 必须被调）。
 */
export function XlangDebugEditor(props: XlangDebugEditorProps) {
  const { sourcePath, serverUrl, openSocket, compile, getToken, initialSource, onSessionClosed, className } = props;
  ensureXlangLanguage();

  const store = useMemo(() => createDebugStore(), []);

  // 回调经 ref 间接（react-hooks/refs：render 期不得解引用 .current——
  // 闭包内延迟读取合规）； getToken/onSessionClosed 随 effect 更新
  const latestRef = useRef({ getToken, onSessionClosed });
  useEffect(() => {
    latestRef.current = { getToken, onSessionClosed };
  });

  const compileRef = useRef(compile);
  useEffect(() => {
    compileRef.current = compile;
  });

  const client = useMemo(
    () =>
      // react-hooks/refs 豁免：getToken/onSessionClosed 为延迟绑定回调——
      // .current 读取发生在 WS 调用期（非 render 期），属刻意的延迟绑定模式
      // eslint-disable-next-line react-hooks/refs
      createDebugClient({
        store,
        openSocket,
        serverUrl,
        getToken: () => latestRef.current.getToken(),
        onSessionClosed: (p) => latestRef.current.onSessionClosed?.(p),
      }),
    [store, openSocket, serverUrl],
  );

  const extensions = useMemo(
    () => [
      // registry 查找（xlang 已注册）——与 CE createBaseExtensions 的 language 分支同源
      createLanguageExtension('xlang'),
      createBreakpointGutter(store),
      suspendedLinesField,
      exceptionLinesField,
      sourcePathFacet.of(sourcePath),
      // eslint-disable-next-line react-hooks/refs -- 同上：延迟绑定，调用期读取
      createXlangLinter({ compile: (sp, source) => compileRef.current(sp, source), debounceMs: 800 }),
    ],
    [store, sourcePath],
  );

  const { editorRef, view } = useCodeMirror({
    initialValue: initialSource,
    extensions,
  });

  // sync 桥：view 就绪后接线（不是 Extension——617 B2 泄漏边界：dispose 必须被调）
  useEffect(() => {
    if (!view) {
      return undefined;
    }
    return syncStoreToExtensions({ store, view, getSourcePath: () => sourcePath });
  }, [store, view, sourcePath]);

  // client 生命周期：mount connect / unmount dispose（StrictMode 双挂载安全——cleanup 完整）
  useEffect(() => {
    void client.connect();
    return () => {
      client.dispose();
    };
  }, [client]);

  return (
    <div className={className} data-testid="xlang-debug-editor">
      <div className="xlang-debug-editor-main">
        <div ref={editorRef} />
      </div>
      <DebugPanel store={store} client={client} getSourcePath={() => sourcePath} />
    </div>
  );
}

/** WebSocketConnection 便捷适配：浏览器原生 WebSocket → flux-core 契约（宿主无 openSocket 实现时用）。 */
export function browserOpenSocket(url: string): WebSocketConnection {
  const ws = new WebSocket(url);
  const connection: WebSocketConnection = {
    get readyState() {
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          return 'connecting' as const;
        case WebSocket.OPEN:
          return 'open' as const;
        case WebSocket.CLOSING:
          return 'closing' as const;
        default:
          return 'closed' as const;
      }
    },
    send: (data) => ws.send(data as string),
    close: (code, reason) => ws.close(code, reason),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  };
  // 转发底层事件到结构化回调（宿主在 connection 上挂 handler）
  ws.onopen = () => connection.onopen?.({ type: 'open' });
  ws.onmessage = (event) => connection.onmessage?.({ type: 'message', data: typeof event.data === 'string' ? event.data : String(event.data) });
  ws.onclose = (event) => connection.onclose?.({ type: 'close', code: event.code, reason: event.reason });
  ws.onerror = () => connection.onerror?.({ type: 'error', error: undefined });
  return connection;
}

export interface CompileFetcherAdapterOptions {
  /** flux-core ApiFetcher（宿主 env.fetcher——鉴权随宿主链）。 */
  fetcher: (api: {
    url: string;
    method: string;
    headers: Record<string, string>;
    data: { sourcePath: string; source: string };
  }) => Promise<{ status: number; data?: { diagnostics?: Array<{ line: number; severity: string; message: string; errorCode?: string }> } | null }>;
  endpoint?: string;
  headers?: Record<string, string>;
}

/**
 * 诊断编译服务适配（plan 621 M6）：宿主 env.fetcher → XlangCompileService。
 * ApiResponse envelope：status===0 取 data.diagnostics；401/403 等以 error
 * severity 诊断呈现（不抛——linter 兜底空集）。
 */
export function createCompileService(adapter: CompileFetcherAdapterOptions): XlangCompileService {
  const endpoint = adapter.endpoint ?? '/r/nop-xlang-debug/compile';
  const headers = adapter.headers ?? {};
  return async (sourcePath, source): Promise<XlangDiagnostic[]> => {
    const response = await adapter.fetcher({
      url: endpoint,
      method: 'POST',
      headers,
      data: { sourcePath, source },
    });
    if (response.status !== 0) {
      return [
        {
          line: 1,
          severity: 'error' as const,
          message: `compile request failed (status ${response.status})`,
        },
      ];
    }
    const diagnostics = (response.data?.diagnostics ?? []) as XlangDiagnostic[];
    return diagnostics;
  };
}
