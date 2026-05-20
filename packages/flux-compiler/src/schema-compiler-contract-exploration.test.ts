import { describe, expect, it } from 'vitest';
import type {
  HostCapabilityProjectionManifest,
  RendererDefinition,
  RendererHostContract,
} from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createSchemaCompiler,
  parseNamespacedAction,
  validateHostAction,
  createHostActionValidationContext,
  createSchemaCompilerDiagnosticsContext,
} from './index.js';

function makeCompiler(renderers: RendererDefinition[] = []) {
  return createSchemaCompiler({
    registry: createRendererRegistry(renderers),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null,
  propSchema: { text: { type: 'string' } },
  propContracts: { text: { shape: { kind: 'string' }, required: true, displayName: 'Text' } },
  fields: [{ key: 'text', kind: 'prop' }],
};

const containerRenderer: RendererDefinition = {
  type: 'container',
  component: () => null,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: () => null,
  fields: [
    { key: 'label', kind: 'prop' },
    { key: 'onClick', kind: 'event' },
  ],
};

const openRenderer: RendererDefinition = {
  type: 'open',
  component: () => null,
  fields: [{ key: 'label', kind: 'prop' }],
};

const _formRenderer: RendererDefinition = {
  type: 'form',
  component: () => null,
  scopePolicy: 'form',
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const valueOrRegionRenderer: RendererDefinition = {
  type: 'card',
  component: () => null,
  fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
};

const testManifest: HostCapabilityProjectionManifest = {
  family: 'test',
  version: '1.0',
  projection: { fields: {} },
  capabilities: {
    namespace: 'test',
    methods: {
      doSomething: {
        args: {
          kind: 'object',
          fields: {
            name: { kind: 'string' },
          },
        },
      },
      deprecatedMethod: {
        args: { kind: 'unknown' },
        deprecated: true,
      },
    },
  },
};

const hostContractRenderer: RendererDefinition = {
  type: 'host-owner',
  component: () => null,
  fields: [
    { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
    { key: 'body', kind: 'region', regionKey: 'body' },
  ],
  hostContract: {
    family: 'test',
    defaultVersion: '1.0',
    resolveManifest(selector) {
      if (selector === '1.0') return testManifest;
      return undefined;
    },
    capabilityPublication: {
      mode: 'region-scoped',
      capableRegions: ['toolbar'],
      transitiveInheritance: true,
    },
  } satisfies RendererHostContract,
};

const actionRenderer: RendererDefinition = {
  type: 'action-child',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

describe('contract exploration: prop coverage completeness', () => {
  it('H1: validates missing required props on closed model in strict validate mode', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.(
      { type: 'text' },
      { validation: { unknownBarePropertyPolicy: 'error' } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-property-shape', path: '/text' }),
      ]),
    );
  });

  it('H2: detects extra unknown props on closed model with error policy', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.(
      { type: 'text', text: 'hi', extraProp: 'value' },
      { validation: { unknownBarePropertyPolicy: 'error' } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/extraProp',
          severity: 'error',
        }),
      ]),
    );
  });

  it('H3: unknown props with wrong type are detected as unknown-property not type-mismatch', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.(
      { type: 'text', text: 'ok', numProp: 42 },
      { validation: { unknownBarePropertyPolicy: 'error' } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/numProp',
        }),
      ]),
    );
  });

  it('H4: multiple unknown props each get their own diagnostic', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.(
      { type: 'text', text: 'ok', a: 1, b: 2, c: 3 },
      { validation: { unknownBarePropertyPolicy: 'warn' } },
    );
    const unknowns = diagnostics?.filter((d) => d.code === 'unknown-property') ?? [];
    expect(unknowns).toHaveLength(3);
  });

  it('H5: open renderer does not report unknown props without strict mode', () => {
    const compiler = makeCompiler([openRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'open',
      label: 'hi',
      custom: 'value',
    });
    expect(diagnostics).toEqual([]);
  });
});

describe('contract exploration: shape validation', () => {
  it('H6: empty schema object produces invalid-root (not missing-required-field)', () => {
    const compiler = makeCompiler();
    const diagnostics = compiler.validate?.({} as any);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-root' }),
      ]),
    );
  });

  it('H7: schema with only type field is valid for known renderer', () => {
    const compiler = makeCompiler([containerRenderer]);
    const diagnostics = compiler.validate?.({ type: 'container' });
    expect(diagnostics).toEqual([]);
  });

  it('H8: deeply nested regions are validated', () => {
    const compiler = makeCompiler([containerRenderer, buttonRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'container',
      body: {
        type: 'container',
        body: {
          type: 'button',
          onClick: 'not-an-object',
        },
      },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/body/body/onClick',
        }),
      ]),
    );
  });

  it('H9: null region value IS flagged as invalid-region-node', () => {
    const compiler = makeCompiler([containerRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'container',
      body: null,
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-region-node' }),
      ]),
    );
  });

  it('H10: undefined region value is skipped without error', () => {
    const compiler = makeCompiler([containerRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'container',
    });
    expect(diagnostics).toEqual([]);
  });

  it('H11: array schema root is validated', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.([
      { type: 'text', text: 'a' },
      { type: 'unknown-type' },
    ]);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-renderer-type',
          path: '/1/type',
        }),
      ]),
    );
  });

  it('H12: primitive value in region is flagged as invalid-region-node', () => {
    const compiler = makeCompiler([containerRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'container',
      body: 42,
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-region-node' }),
      ]),
    );
  });

  it('H13: value-or-region accepts plain value without traversing', () => {
    const compiler = makeCompiler([valueOrRegionRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'card',
      title: 'plain string title',
    });
    expect(diagnostics).toEqual([]);
  });

  it('H14: value-or-region traverses when value is schema input', () => {
    const compiler = makeCompiler([valueOrRegionRenderer, textRenderer]);
    const diagnostics = compiler.validate?.(
      {
        type: 'card',
        title: { type: 'text', extraProp: 'val' },
      } as any,
      { validation: { unknownBarePropertyPolicy: 'warn' } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/title/extraProp',
        }),
      ]),
    );
  });
});

describe('contract exploration: diagnostics accuracy', () => {
  it('H15: diagnostic path for top-level unknown prop uses JSON pointer format', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.(
      { type: 'text', text: 'ok', bad: 1 },
      { validation: { unknownBarePropertyPolicy: 'error' } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/bad',
        }),
      ]),
    );
  });

  it('H16: diagnostic path for nested region unknown prop', () => {
    const compiler = makeCompiler([containerRenderer, textRenderer]);
    const diagnostics = compiler.validate?.(
      {
        type: 'container',
        body: { type: 'text', text: 'ok', extraProp: 1 },
      },
      { validation: { unknownBarePropertyPolicy: 'error' } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/body/extraProp',
        }),
      ]),
    );
  });

  it('H17: schemaUrl propagates as sourceLocation.file', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.(
      { type: 'text', text: 'ok', bad: 1 },
      {
        schemaUrl: 'my-schema.xview',
        validation: { unknownBarePropertyPolicy: 'warn' },
      },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceLocation: { file: 'my-schema.xview' },
        }),
      ]),
    );
  });

  it('H18: duplicate diagnostics are deduplicated', () => {
    const compiler = makeCompiler([containerRenderer, textRenderer]);
    const diagnostics = compiler.validate?.(
      {
        type: 'container',
        body: { type: 'text', text: 'ok', bad: 1 },
      },
      { validation: { unknownBarePropertyPolicy: 'error' } },
    );
    const unknowns = diagnostics?.filter((d) => d.code === 'unknown-property') ?? [];
    expect(unknowns).toHaveLength(1);
  });

  it('H19: action with empty action string is flagged', () => {
    const compiler = makeCompiler([buttonRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: { action: '' },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          message: 'Action objects require a non-empty action field.',
        }),
      ]),
    );
  });

  it('H20: action with array value is properly validated', () => {
    const compiler = makeCompiler([buttonRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: [
        { action: 'step1' },
        'not-an-object',
      ],
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          message: 'Action entries must be objects.',
        }),
      ]),
    );
  });

  it('H21: action then chain is recursively validated', () => {
    const compiler = makeCompiler([buttonRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: { action: 'step1', then: 'not-an-object' },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          message: 'Action entries must be objects.',
        }),
      ]),
    );
  });

  it('H22: action onError chain is recursively validated', () => {
    const compiler = makeCompiler([buttonRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'button',
      onClick: { action: 'step1', onError: { action: '' } },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          message: 'Action objects require a non-empty action field.',
        }),
      ]),
    );
  });
});

describe('contract exploration: host contract validation', () => {
  it('H23: host action in capable region is validated against manifest', () => {
    const compiler = makeCompiler([hostContractRenderer, actionRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'host-owner',
      toolbar: {
        type: 'action-child',
        onClick: { action: 'test:unknownMethod' },
      },
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-host-capability-method',
          source: 'host-contract',
        }),
      ]),
    );
  });

  it('H24: host action with valid method and args is not flagged', () => {
    const compiler = makeCompiler([hostContractRenderer, actionRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'host-owner',
      toolbar: {
        type: 'action-child',
        onClick: { action: 'test:doSomething', args: { name: 'hello' } },
      },
    });
    const hostIssues = diagnostics?.filter((d) => d.source === 'host-contract') ?? [];
    expect(hostIssues).toHaveLength(0);
  });

  it('H25: host action outside capable region is not validated', () => {
    const compiler = makeCompiler([hostContractRenderer, actionRenderer]);
    const diagnostics = compiler.validate?.({
      type: 'host-owner',
      body: {
        type: 'action-child',
        onClick: { action: 'test:unknownMethod' },
      },
    });
    const hostIssues = diagnostics?.filter((d) => d.source === 'host-contract') ?? [];
    expect(hostIssues).toHaveLength(0);
  });

  it('H26: deprecated host capability method produces warning', () => {
    const ctx = createHostActionValidationContext({
      family: 'test',
      version: '1.0',
      manifest: testManifest,
      capabilityPublication: { mode: 'whole-owner' },
    });
    const diag = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
    );

    validateHostAction('test:deprecatedMethod', undefined, '/action', diag, ctx);

    expect(diag.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-host-capability-method',
          severity: 'warning',
          message: expect.stringContaining('deprecated'),
        }),
      ]),
    );
  });

  it('H27: host action with wrong args type is flagged', () => {
    const ctx = createHostActionValidationContext({
      family: 'test',
      version: '1.0',
      manifest: testManifest,
      capabilityPublication: { mode: 'whole-owner' },
    });
    const diag = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
    );

    validateHostAction('test:doSomething', 'not-an-object', '/action', diag, ctx);

    expect(diag.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-host-capability-args',
        }),
      ]),
    );
  });

  it('H28: host action with missing required arg field is flagged', () => {
    const ctx = createHostActionValidationContext({
      family: 'test',
      version: '1.0',
      manifest: testManifest,
      capabilityPublication: { mode: 'whole-owner' },
    });
    const diag = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
    );

    validateHostAction('test:doSomething', {}, '/action', diag, ctx);

    expect(diag.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-host-capability-args',
          message: expect.stringContaining('Required field'),
        }),
      ]),
    );
  });

  it('H29: parseNamespacedAction rejects edge cases', () => {
    expect(parseNamespacedAction('')).toBeUndefined();
    expect(parseNamespacedAction(':noNamespace')).toBeUndefined();
    expect(parseNamespacedAction('noMethod:')).toBeUndefined();
    expect(parseNamespacedAction('ns:method')).toEqual({ namespace: 'ns', method: 'method' });
  });

  it('H30: host action without hostContext returns true', () => {
    const diag = createSchemaCompilerDiagnosticsContext(
      { diagnostics: { enabled: true } },
      'validate',
    );
    expect(validateHostAction('test:doSomething', undefined, '/', diag, undefined)).toBe(true);
    expect(diag.diagnostics).toHaveLength(0);
  });
});

describe('contract exploration: strict mode', () => {
  it('H31: strict mode warns on unknown props for open renderer', () => {
    const compiler = makeCompiler([openRenderer]);
    const diagnostics = compiler.validate?.(
      { type: 'open', label: 'hi', extraProp: 'val' },
      { validation: { strictMode: true } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('H32: strict mode errors on unknown props for closed renderer', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.(
      { type: 'text', text: 'hi', extraProp: 'val' },
      { validation: { strictMode: true } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          severity: 'error',
        }),
      ]),
    );
  });

  it('H33: strict mode combined with warn policy on closed renderer gives error (strict wins)', () => {
    const compiler = makeCompiler([textRenderer]);
    const diagnostics = compiler.validate?.(
      { type: 'text', text: 'hi', extraProp: 'val' },
      { validation: { strictMode: true, unknownBarePropertyPolicy: 'warn' } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          severity: 'error',
        }),
      ]),
    );
  });

  it('H34: strict mode on nested region propagates validation', () => {
    const compiler = makeCompiler([containerRenderer, openRenderer]);
    const diagnostics = compiler.validate?.(
      {
        type: 'container',
        body: { type: 'open', label: 'hi', unknownField: 'x' },
      },
      { validation: { strictMode: true } },
    );
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          severity: 'warning',
          path: '/body/unknownField',
        }),
      ]),
    );
  });
});
