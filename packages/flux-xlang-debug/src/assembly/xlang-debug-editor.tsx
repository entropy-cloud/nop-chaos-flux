import { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererComponentProps, WebSocketOpener } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import { createBaseExtensions, useCodeMirror } from '@nop-chaos/flux-code-editor';
import {
  createXlangLinter,
  registerXlangLanguage,
  type XlangCompileService,
} from '@nop-chaos/flux-xlang-lang';
import { createCompileService } from './compile-service.js';
import type { XlangDebugEditorSchema } from './renderer.js';
import { createDebugStore } from '../state/debug-store.js';
import { createDebugClient } from '../client/debug-client.js';
import { syncStoreToExtensions } from '../extension/sync.js';
import { createBreakpointGutter } from '../extension/breakpoint-gutter.js';
import { breakpointsField } from '../extension/fields.js';
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
  /** 宿主 env.openSocket（D5 §3.1 XD→FC 边兑现；capability check 在 effect 内）。 */
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
        onSessionClosed: (p) => {
          // M3：会话关闭/连接失败 → 错误条呈现 + 装配层回调
          setConnectError(`${p.reason}${p.detail ? `: ${p.detail}` : ''}`);
          latestRef.current.onSessionClosed?.(p);
        },
      }),
    [store, openSocket, serverUrl],
  );

  const extensions = useMemo(
    () => [
      // 完整基础能力（行号/折叠/history/search/主题）+ registry 的 xlang 语言分支
      // （m1 勘正：原 createLanguageExtension 仅语言扩展，缺行号/折叠等基础能力）
      ...createBaseExtensions({ language: 'xlang', lineNumbers: true, folding: true }),
      createBreakpointGutter(store),
      // plan 621 审计 B1：断点集合 StateField 必须在装配 state 里——gutter 的
      // lineMarker 读 field(breakpointsField, false)，缺位则标记永不渲染
      // （sync 桥的 setBreakpointsEffect 无消费者，静默丢弃）
      breakpointsField,
      suspendedLinesField,
      exceptionLinesField,
      sourcePathFacet.of(sourcePath),
      // eslint-disable-next-line react-hooks/refs -- 同上：延迟绑定，调用期读取
      createXlangLinter({
        // plan 621 审计 B2：sourcePath 参数化（M3）——诊断按文档锚点编译
        compile: (sp, source) => compileRef.current(sp, source),
        sourcePath,
        debounceMs: 800,
      }),
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

  // 连接失败呈现（plan 621 M3：Failure Path openSocket-missing/connect-fail）
  const [connectError, setConnectError] = useState<string | null>(null);

  // client 生命周期：mount connect / unmount dispose（StrictMode 双挂载安全——cleanup 完整）
  useEffect(() => {
    if (!openSocket) {
      setConnectError('env.openSocket 不可用（宿主未提供 WebSocket 能力）');
      return;
    }
    void client.connect();
    return () => {
      client.dispose();
    };
  }, [client, openSocket]);

  return (
    <div className={className} data-testid="xlang-debug-editor">
      {connectError && (
        <div className="xlang-debug-connect-error" data-testid="xlang-debug-connect-error">
          {connectError}
        </div>
      )}
      <div className="xlang-debug-editor-main">
        <div ref={editorRef} />
      </div>
      {/* P1-MA5.1-006 (plan 740): connection state bar — server disconnect is
          now visible via polling client.connectionState(). */}
      <div className="xlang-debug-status-bar" data-testid="xlang-debug-connection-state">
        <span
          className={`xlang-debug-state xlang-debug-state-${client.connectionState()}`}
        >
          {client.connectionState()}
        </span>
      </div>
      {/* plan 621 审计 B8：getSourcePath 面板零消费——620 残留 prop 摘除 */}
      <DebugPanel store={store} client={client} />
    </div>
  );
}

/**
 * renderer 适配组件（plan 2474 Phase 1 自 renderer.tsx 迁入重模块）：env 具象化
 * （fetcher→compile 服务、openSocket 能力提取）后委托装配组件本体。轻注册面
 * （../renderer.ts）经 createLazyRendererComponent 动态装载本模块。
 */
export function XlangDebugEditorRenderer(props: RendererComponentProps<XlangDebugEditorSchema>) {
  const runtime = useRendererRuntime();
  const env = runtime.env;
  const scope = useRenderScope();
  const sourcePath = String(props.props.sourcePath ?? '');
  const serverUrl = String(props.props.serverUrl ?? '');
  const initialSource = props.props.initialSource == null ? undefined : String(props.props.initialSource);

  const compile: XlangCompileService = createCompileService({
    // env.fetcher（ApiFetcher<T> 泛型）以 compile 端点形状具象化
    fetcher: async (api) => {
      const response = await env.fetcher(
        {
          url: api.url,
          method: api.method,
          headers: api.headers,
          data: api.data,
        },
        { scope, env }
      );
      return {
        status: response.status,
        data: response.data as {
          diagnostics?: Array<{ line: number; severity: string; message: string; errorCode?: string }>;
        } | null,
      };
    },
  });

  // openSocket capability check（flux-core 契约）；缺省时装配组件内连接失败呈现
  const openSocket = env.openSocket;

  return (
    <XlangDebugEditor
      sourcePath={sourcePath}
      serverUrl={serverUrl}
      openSocket={openSocket ?? (undefined as unknown as WebSocketOpener)}
      compile={compile}
      getToken={() => undefined}
      initialSource={initialSource}
    />
  );
}
