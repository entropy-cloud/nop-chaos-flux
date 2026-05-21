import { describe, expect, it } from 'vitest';
import {
  createSchemaDiagnosticCollector,
  SchemaDiagnostic,
  SchemaDiagnosticCode,
  SchemaDiagnosticSeverity,
  SchemaDiagnosticSource,
} from './index.js';

describe('createSchemaDiagnosticCollector', () => {
  it('creates an empty collector', () => {
    const { collector, diagnostics } = createSchemaDiagnosticCollector();
    expect(diagnostics).toEqual([]);
    expect(typeof collector.add).toBe('function');
  });

  it('collects a diagnostic', () => {
    const { collector, diagnostics } = createSchemaDiagnosticCollector();
    const diagnostic: SchemaDiagnostic = {
      code: 'unknown-renderer-type',
      path: '/type',
      message: 'Unknown renderer type "foo"',
      severity: 'error',
      source: 'core',
    };

    collector.add(diagnostic);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toBe(diagnostic);
  });

  it('collects multiple diagnostics in order', () => {
    const { collector, diagnostics } = createSchemaDiagnosticCollector();

    collector.add({
      code: 'invalid-root',
      path: '/',
      message: 'Root must be an object',
      severity: 'error',
      source: 'core',
    });

    collector.add({
      code: 'missing-required-field',
      path: '/type',
      message: 'Missing required field "type"',
      severity: 'error',
      source: 'core',
    });

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0].code).toBe('invalid-root');
    expect(diagnostics[1].code).toBe('missing-required-field');
  });

  it('collects diagnostics with all severity levels', () => {
    const { collector, diagnostics } = createSchemaDiagnosticCollector();
    const severities: SchemaDiagnosticSeverity[] = ['error', 'warning', 'info'];

    for (const severity of severities) {
      collector.add({
        code: 'unknown-property',
        path: '/foo',
        message: `Test ${severity}`,
        severity,
        source: 'renderer',
      });
    }

    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.map((d) => d.severity)).toEqual(['error', 'warning', 'info']);
  });

  it('collects diagnostics with all source types', () => {
    const { collector, diagnostics } = createSchemaDiagnosticCollector();
    const sources: SchemaDiagnosticSource[] = ['core', 'renderer', 'namespace', 'host-contract'];

    for (const source of sources) {
      collector.add({
        code: 'invalid-property-shape',
        path: '/test',
        message: `Source ${source}`,
        severity: 'warning',
        source,
      });
    }

    expect(diagnostics).toHaveLength(4);
    expect(diagnostics.map((d) => d.source)).toEqual(sources);
  });

  it('collects diagnostics with all known diagnostic codes', () => {
    const { collector, diagnostics } = createSchemaDiagnosticCollector();
    const codes: SchemaDiagnosticCode[] = [
      'invalid-root',
      'expected-object',
      'missing-required-field',
      'unknown-renderer-type',
      'unknown-property',
      'invalid-property-value',
      'invalid-property-shape',
      'invalid-region-node',
      'invalid-action-shape',
      'builtin-action-alias',
      'unresolved-action-selector',
      'unvalidated-component-target',
      'invalid-source-shape',
      'invalid-namespace-property',
      'unknown-host-contract-family',
      'unsupported-host-contract-version',
      'unresolved-host-contract-context',
      'unknown-host-projection-field',
      'invalid-host-projection-path',
      'unknown-host-capability-method',
      'invalid-host-capability-args',
      'host-contract-version-mismatch',
      'unknown-import-alias',
      'import-preload-failed',
      'missing-import-static-meta',
      'unknown-import-member',
      'invalid-import-function-args',
      'unknown-slot-param',
      'slot-used-outside-region',
      'unknown-builtin-member',
      'ambient-dollar-reference',
      'unhandled-compilation-error',
    ];

    for (const code of codes) {
      collector.add({
        code,
        path: '/test',
        message: `Code ${code}`,
        severity: 'error',
        source: 'core',
      });
    }

    expect(diagnostics).toHaveLength(codes.length);
  });

  it('collects diagnostic with sourceLocation', () => {
    const { collector, diagnostics } = createSchemaDiagnosticCollector();

    collector.add({
      code: 'invalid-root',
      path: '/',
      message: 'Error with location',
      severity: 'error',
      source: 'core',
      sourceLocation: {
        file: 'test.json',
        line: 10,
        column: 5,
      },
    });

    expect(diagnostics[0].sourceLocation).toEqual({
      file: 'test.json',
      line: 10,
      column: 5,
    });
  });
});

describe('SchemaDiagnostic types are structural', () => {
  it('satisfies the SchemaDiagnostic interface', () => {
    const diagnostic: SchemaDiagnostic = {
      code: 'invalid-root',
      path: '/',
      message: 'test',
      severity: 'error',
      source: 'core',
    };

    expect(diagnostic.code).toBe('invalid-root');
    expect(diagnostic.path).toBe('/');
    expect(diagnostic.message).toBe('test');
    expect(diagnostic.severity).toBe('error');
    expect(diagnostic.source).toBe('core');
  });
});
