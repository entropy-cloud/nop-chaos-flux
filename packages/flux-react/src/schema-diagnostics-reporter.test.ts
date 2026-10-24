import { describe, expect, it, vi } from 'vitest';
import type { SchemaDiagnostic } from '@nop-chaos/flux-core';
import { createDefaultSchemaDiagnosticReporter } from './schema-diagnostics-reporter.js';

// P1-MA4.5-002 regression guard: severity-routed console methods. Plan 595
// routed every severity to console.error, which made the e2e zero-console.error
// gate blind (238/263 reds shared this root — the gate now means error-severity
// diagnostics only). The message format (including the sourceLocation file
// prefix and the trailing trim) is pinned so gate-side parsing survives.

function diagnostic(severity: SchemaDiagnostic['severity']): SchemaDiagnostic {
  return {
    code: 'unknown-property',
    path: '/body/0',
    message: 'Unknown property "setSenderDraft"',
    severity,
    source: 'shape-validation',
    sourceLocation: { file: 'demo.tsx', line: 9, column: 3 },
  } as unknown as SchemaDiagnostic;
}

describe('schema diagnostics reporter severity routing (P1-MA4.5-002)', () => {
  it('error severity routes to console.error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    createDefaultSchemaDiagnosticReporter()(diagnostic('error'));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toBe(
      '[flux] schema error unknown-property demo.tsx /body/0 Unknown property "setSenderDraft"',
    );
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('warning severity routes to console.warn (never trips the e2e zero-error gate)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    createDefaultSchemaDiagnosticReporter()(diagnostic('warning'));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toBe(
      '[flux] schema warning unknown-property demo.tsx /body/0 Unknown property "setSenderDraft"',
    );
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('info severity routes to console.warn (repo no-console policy: only warn/error channels)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    createDefaultSchemaDiagnosticReporter()(diagnostic('info'));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toBe(
      '[flux] schema info unknown-property demo.tsx /body/0 Unknown property "setSenderDraft"',
    );
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it('location is omitted (no double space) when sourceLocation carries no file', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const diag = { ...diagnostic('error'), sourceLocation: { line: 1, column: 1 } } as unknown as SchemaDiagnostic;

    createDefaultSchemaDiagnosticReporter()(diag);

    expect(errorSpy.mock.calls[0][0]).toBe(
      '[flux] schema error unknown-property /body/0 Unknown property "setSenderDraft"',
    );
    errorSpy.mockRestore();
  });
});
