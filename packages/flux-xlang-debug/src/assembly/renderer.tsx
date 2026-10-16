import type {
  RegisteredRendererDefinition,
  SchemaFieldRule,
  BaseSchema,
  RendererComponentProps,
  RendererRegistry,
  WebSocketOpener,
} from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import { XlangDebugEditor, createCompileService } from './xlang-debug-editor.js';
import type { XlangCompileService } from '@nop-chaos/flux-xlang-lang';

/** xlang-debug-editor schema（plan 621 M4：被消费 prop 均需 field rule）。 */
export interface XlangDebugEditorSchema extends BaseSchema {
  type: 'xlang-debug-editor';
  /** 调试文档锚点（gutter/sync/诊断编译共用）。 */
  sourcePath: string;
  /** WS 网关地址（/ws/xlang-debugger）。 */
  serverUrl?: string;
  /** 初始源码。 */
  initialSource?: string;
}

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

export const xlangDebugEditorFieldRules: SchemaFieldRule[] = [
  {
    key: 'sourcePath',
    kind: 'prop',
    contract: {
      shape: { kind: 'string' },
      displayName: 'Source Path',
      description: 'Debug document anchor shared by gutter/sync/diagnostics.',
    },
  },
  {
    key: 'serverUrl',
    kind: 'prop',
    contract: {
      shape: { kind: 'string' },
      displayName: 'Server URL',
      description: 'WS gateway address (/ws/xlang-debugger).',
    },
  },
  {
    key: 'initialSource',
    kind: 'prop',
    contract: {
      shape: { kind: 'string' },
      displayName: 'Initial Source',
      description: 'Initial xlang source text.',
      editorType: 'textarea',
    },
  },
];

export const xlangDebugEditorRendererDefinition: RegisteredRendererDefinition = {
  type: 'xlang-debug-editor',
  component: XlangDebugEditorRenderer,
  sourcePackage: '@nop-chaos/flux-xlang-debug',
  fields: xlangDebugEditorFieldRules,
};


/** 注册进 flux renderer registry（照 registerCodeEditorRenderers 先例）。 */
export function registerXlangDebugEditorRenderers(registry: RendererRegistry): void {
  registry.register(xlangDebugEditorRendererDefinition);
}
