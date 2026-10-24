import type { SchemaDiagnostic } from '@nop-chaos/flux-core';

export type SchemaDiagnosticReporter = (diagnostic: SchemaDiagnostic) => void;

/**
 * Fallback sink for strict-render schema diagnostics (plan 595): the compiler
 * must never be the component that owns `console`, so the render path supplies
 * this when the host env carries no `reportSchemaDiagnostics`.
 *
 * P1-MA4.5-002 severity routing (plan 734): console methods are routed by
 * severity — `error` -> console.error, `warning`/`info` -> console.warn (the
 * repo no-console policy only permits warn/error channels). Routing every
 * severity to console.error made the e2e zero-console.error gate blind
 * (238/263 reds shared this root): the gate signal now means error-severity
 * diagnostics only.
 */
export function createDefaultSchemaDiagnosticReporter(): SchemaDiagnosticReporter {
  return (diagnostic) => {
    const location = diagnostic.sourceLocation?.file ? `${diagnostic.sourceLocation.file} ` : '';
    const message = `[flux] schema ${diagnostic.severity} ${diagnostic.code} ${location}${diagnostic.path} ${diagnostic.message}`.trim();
    if (diagnostic.severity !== 'error') {
      // warning/info: visible on the warn channel — never trips the e2e
      // zero-console.error gate (P1-MA4.5-002)
      console.warn(message);
      return;
    }
    console.error(message);
  };
}
