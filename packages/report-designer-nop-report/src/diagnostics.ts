import type { ReportTemplateDocument } from '@nop-chaos/report-designer-core';

/** `docs/architecture/report-designer/codec-design.md` §11 的结果模型。 */
export interface CodecDiagnostic {
  level: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  path?: string;
}

export interface CodecImportResult {
  ok: boolean;
  document?: ReportTemplateDocument;
  diagnostics: CodecDiagnostic[];
}

/**
 * adapter 层错误边界：`TemplateCodecAdapter.importDocument` 只能返回 document
 * 或抛出；codec 内部以携带 diagnostics 的结构化错误抛出，命令层捕获后不再有
 * 裸异常语义（roadmap NRP-2：错误走 CodecDiagnostic 分级）。
 */
export class CodecError extends Error {
  readonly diagnostics: CodecDiagnostic[];

  constructor(diagnostics: CodecDiagnostic[]) {
    super(
      diagnostics
        .filter((d) => d.level === 'error')
        .map((d) => `${d.code}: ${d.message}`)
        .join('; ') || 'codec import failed',
    );
    this.name = 'CodecError';
    this.diagnostics = diagnostics;
  }
}
