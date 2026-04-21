import { describe, expect, it } from 'vitest';
import { createRendererRegistry, type RendererDefinition } from '@nop-chaos/flux-core';
import { validateSchema } from '@nop-chaos/flux-compiler';

const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: () => null,
  propSchema: { label: { type: 'string' } },
  fields: [{ key: 'onClick', kind: 'event' }]
};

describe('validateSchema host contract adapter', () => {
  const testManifest: import('@nop-chaos/flux-core').HostCapabilityProjectionManifest = {
    family: 'designer',
    version: '1.0',
    projection: { fields: {} },
    capabilities: {
      namespace: 'designer',
      methods: {
        selectNode: {
          args: { kind: 'object', fields: { nodeId: { kind: 'string' } } }
        },
        undo: {}
      }
    }
  };

  it('validates host actions in event handlers when hostContractContext is provided', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'button',
        label: 'Test',
        onClick: { action: 'designer:unknownMethod' }
      },
      registry: createRendererRegistry([buttonRenderer]),
      options: {
        validation: {
          hostContractContext: {
            family: 'designer',
            version: '1.0',
            manifest: testManifest
          }
        }
      }
    });

    const hostDiagnostics = diagnostics.filter(d => d.source === 'host-contract');
    expect(hostDiagnostics).toHaveLength(1);
    expect(hostDiagnostics[0].code).toBe('unknown-host-capability-method');
    expect(hostDiagnostics[0].message).toContain('unknownMethod');
  });

  it('validates host action args shape when hostContractContext is provided', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'button',
        label: 'Test',
        onClick: { action: 'designer:selectNode', args: { nodeId: 123 } }
      },
      registry: createRendererRegistry([buttonRenderer]),
      options: {
        validation: {
          hostContractContext: {
            family: 'designer',
            version: '1.0',
            manifest: testManifest
          }
        }
      }
    });

    const hostDiagnostics = diagnostics.filter(d => d.source === 'host-contract');
    expect(hostDiagnostics).toHaveLength(1);
    expect(hostDiagnostics[0].code).toBe('invalid-host-capability-args');
  });

  it('passes validation for valid host actions when hostContractContext is provided', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'button',
        label: 'Test',
        onClick: { action: 'designer:selectNode', args: { nodeId: 'node-1' } }
      },
      registry: createRendererRegistry([buttonRenderer]),
      options: {
        validation: {
          hostContractContext: {
            family: 'designer',
            version: '1.0',
            manifest: testManifest
          }
        }
      }
    });

    const hostDiagnostics = diagnostics.filter(d => d.source === 'host-contract');
    expect(hostDiagnostics).toHaveLength(0);
  });

  it('skips host action validation when hostContractContext is not provided', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'button',
        label: 'Test',
        onClick: { action: 'designer:unknownMethod' }
      },
      registry: createRendererRegistry([buttonRenderer])
    });

    const hostDiagnostics = diagnostics.filter(d => d.source === 'host-contract');
    expect(hostDiagnostics).toHaveLength(0);
  });
});
