import { linter, type Diagnostic } from '@codemirror/lint';
import { Text } from '@codemirror/state';
import type { Extension } from '@codemirror/state';

/** 诊断桥的编译服务注入契约（宿主经 env.fetcher 实现，plan 616 / D5 §3.3）。 */
export type XlangCompileService = (
  sourcePath: string,
  source: string,
) => Promise<XlangDiagnostic[]>;

export interface XlangDiagnostic {
  line: number;
  column?: number;
  severity: 'error' | 'warning';
  message: string;
  errorCode?: string;
}

export interface CreateXlangLinterOptions {
  compile: XlangCompileService;
  /** 诊断请求去抖毫秒数（默认 500）。 */
  debounceMs?: number;
  /** 编译文档锚点（plan 621 M3：缺省 'repl.xpl'——REPL 场景；装配层传编辑器 sourcePath）。 */
  sourcePath?: string;
}

/** 诊断映射（导出供单测）：行号 clamp 到文档范围，severity 归一。 */
export function mapXlangDiagnostics(diagnostics: XlangDiagnostic[], doc: Text): Diagnostic[] {
  const result: Diagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const lineNo = Number.isFinite(diagnostic.line) && diagnostic.line > 0 ? diagnostic.line : 1;
    const clamped = Math.min(lineNo, Math.max(doc.lines, 1));
    const line = doc.line(clamped);
    result.push({
      from: line.from,
      to: line.to,
      severity: diagnostic.severity === 'warning' ? 'warning' : 'error',
      message: diagnostic.errorCode
        ? `${diagnostic.message} (${diagnostic.errorCode})`
        : diagnostic.message,
    });
  }
  return result;
}

/**
 * 注入式诊断桥（D6 compile 端点对接面）：compile 由宿主注入，返回 CodeMirror
 * linter 扩展。compile 抛错/超时 → 空诊断集（不打扰编辑），console.warn 记录。
 */
export function createXlangLinter(options: CreateXlangLinterOptions): Extension {
  const debounceMs = options.debounceMs ?? 500;
  const sourcePath = options.sourcePath ?? 'repl.xpl';
  return linter(async (view) => {
    const source = view.state.doc.toString();
    if (!source.trim()) {
      return [];
    }
    try {
      const diagnostics = await withTimeout(
        options.compile(sourcePath, source),
        Math.max(debounceMs * 4, 2000),
      );
      return mapXlangDiagnostics(diagnostics ?? [], view.state.doc);
    } catch (error) {
      console.warn('[flux-xlang-lang] compile diagnostics failed', error);
      return [];
    }
  }, { delay: debounceMs });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('compile diagnostics timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
