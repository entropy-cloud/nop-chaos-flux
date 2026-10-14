import type { SchemaDiagnostic } from '@nop-chaos/flux-core';

export type SchemaDiagnosticReporter = (diagnostic: SchemaDiagnostic) => void;

/**
 * Fallback sink for strict-render schema diagnostics (plan 595): the compiler
 * must never be the component that owns `console`, so the render path supplies
 * this when the host env carries no `reportSchemaDiagnostics`.
 */
export function createDefaultSchemaDiagnosticReporter(): SchemaDiagnosticReporter {
  return (diagnostic) => {
    const location = diagnostic.sourceLocation?.file ? `${diagnostic.sourceLocation.file} ` : '';
    console.error(
      `[flux] schema ${diagnostic.severity} ${diagnostic.code} ${location}${diagnostic.path} ${diagnostic.message}`.trim(),
    );
  };
}
