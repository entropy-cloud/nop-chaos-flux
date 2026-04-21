import { describe, expect, it } from 'vitest';
import type {
  HostCapabilityProjectionManifest,
  RendererDefinition,
  RendererHostContract,
} from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { validateSchema } from './index';

const automaticHostManifest: HostCapabilityProjectionManifest = {
  family: 'designer',
  version: '1.0',
  projection: { fields: {} },
  capabilities: {
    namespace: 'designer',
    methods: {
      selectNode: {
        args: {
          kind: 'object',
          fields: {
            nodeId: { kind: 'string' },
          },
        },
      },
    },
  },
};

const automaticHostContract: RendererHostContract = {
  family: 'designer',
  defaultVersion: '1.0',
  resolveManifest(versionSelector) {
    if (versionSelector === '1.0' || versionSelector === 'latest') {
      return automaticHostManifest;
    }

    return undefined;
  },
  capabilityPublication: {
    mode: 'region-scoped',
    capableRegions: ['toolbar'],
    transitiveInheritance: true,
  },
};

const automaticHostOwnerRenderer: RendererDefinition = {
  type: 'designer-page',
  component: () => null,
  regions: ['toolbar', 'body'],
  hostContract: automaticHostContract,
};

const automaticHostButtonRenderer: RendererDefinition = {
  type: 'toolbar-button',
  component: () => null,
  fields: [{ key: 'onClick', kind: 'event' }],
};

describe('automatic host contract validation from renderer definitions', () => {
  it('validates host actions inside a capable region without explicit hostContractContext', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        toolbar: {
          type: 'toolbar-button',
          onClick: { action: 'designer:unknownMethod' },
        },
      },
      registry: createRendererRegistry([automaticHostOwnerRenderer, automaticHostButtonRenderer]),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-host-capability-method',
        path: '/toolbar/onClick/action',
        source: 'host-contract',
      }),
    ]);
  });

  it('skips host action diagnostics outside capable regions', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        body: {
          type: 'toolbar-button',
          onClick: { action: 'designer:unknownMethod' },
        },
      },
      registry: createRendererRegistry([automaticHostOwnerRenderer, automaticHostButtonRenderer]),
    });

    expect(diagnostics.filter((issue) => issue.source === 'host-contract')).toEqual([]);
  });

  it('reports unsupported xui:version selectors on host owners', () => {
    const diagnostics = validateSchema({
      schema: {
        type: 'designer-page',
        'xui:version': '2.x',
        toolbar: {
          type: 'toolbar-button',
          onClick: { action: 'designer:selectNode', args: { nodeId: 'node-1' } },
        },
      },
      registry: createRendererRegistry([automaticHostOwnerRenderer, automaticHostButtonRenderer]),
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'unsupported-host-contract-version',
        path: '',
        source: 'host-contract',
      }),
    ]);
  });
});
