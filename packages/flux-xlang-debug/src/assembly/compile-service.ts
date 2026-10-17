import type { XlangCompileService, XlangDiagnostic } from '@nop-chaos/flux-xlang-lang';

/**
 * 诊断编译服务适配（plan 621 M6 / plan 2474 Phase 1 拆分）：宿主 env.fetcher →
 * XlangCompileService。ApiResponse envelope：status===0 取 data.diagnostics；
 * 401/403 等以 error severity 诊断呈现（不抛——linter 兜底空集）。
 *
 * 本模块属 **轻路径**（@nop-chaos/flux-xlang-debug/definitions 注册面）：
 * 禁止静态 import 重模块（@codemirror/*、@lezer/*、xlang-debug-editor.js、
 * flux-code-editor、flux-xlang-lang 值形式）——lazy-loading-guard.test.ts 守卫；
 * flux-xlang-lang 仅允许 import type（编译期擦除）。
 */

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
    return (response.data?.diagnostics ?? []) as XlangDiagnostic[];
  };
}
