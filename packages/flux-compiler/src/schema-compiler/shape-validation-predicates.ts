import type { SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import type { HostActionValidationContext } from './host-action-validation.js';

export interface ActionValidationContext {
  hostContext?: HostActionValidationContext;
  symbolTable?: import('@nop-chaos/flux-core').CompileSymbolTable;
  visibleImports?: ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec | undefined>;
  componentTargets?: ReadonlyMap<
    string,
    import('./shape-validation-traversal.js').ComponentTargetContractResolution
  >;
  strictMode?: boolean;
}

export function isDynamicStructuralPath(value: string): boolean {
  return value.includes('${') || value.includes('$@{');
}

export function emitSchemaDiagnostic(
  diagnostics: SchemaCompilerDiagnosticsContext,
  issue: {
    code: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['code'];
    message: string;
    path: string;
    severity?: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['severity'];
    source?: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['source'];
  },
  enabled: boolean,
) {
  if (!enabled) {
    return;
  }

  diagnostics.emit(issue);
}
