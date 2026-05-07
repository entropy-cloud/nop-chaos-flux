import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from './types.js';
import { resolveRendererAuthoringContract, resolveHostContractManifest } from './types.js';

describe('resolveRendererAuthoringContract', () => {
  it('assembles ordinary renderer metadata without host-only fields', () => {
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      rendererClass: 'instance-renderer',
      propContracts: {
        label: {
          shape: { kind: 'string' },
          displayName: 'Label',
        },
      },
      eventContracts: {
        onClick: {
          displayName: 'Click',
        },
      },
    };

    const contract = resolveRendererAuthoringContract(buttonRenderer);

    expect(contract.rendererType).toBe('button');
    expect(contract.rendererClass).toBe('instance-renderer');
    expect(contract.editableProps.label?.shape.kind).toBe('string');
    expect(contract.events.onClick?.displayName).toBe('Click');
    expect(contract.hostProjection).toBeUndefined();
    expect(contract.hostActions).toBeUndefined();
    expect(contract.hostManifest).toBeUndefined();
  });

  it('adapts domain-host renderer manifests into tooling-facing host fields', () => {
    const designerRenderer: RendererDefinition = {
      type: 'designer-page',
      component: () => null,
      rendererClass: 'domain-host-renderer',
      hostContract: {
        family: 'designer',
        defaultVersion: '1.0',
        resolveManifest(versionSelector) {
          if (versionSelector !== '1.0') {
            return undefined;
          }

          return {
            family: 'designer',
            version: '1.0',
            projection: {
              fields: {
                activeNode: {
                  schema: {
                    kind: 'union',
                    anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }],
                  },
                },
              },
            },
            capabilities: {
              namespace: 'designer',
              methods: {
                addNode: {
                  args: {
                    kind: 'object',
                    fields: {
                      nodeType: { kind: 'string' },
                    },
                  },
                  result: {
                    kind: 'object',
                    fields: {
                      nodeId: { kind: 'string' },
                    },
                  },
                  description: 'Add a node',
                },
              },
            },
          };
        },
      },
    };

    const contract = resolveRendererAuthoringContract(designerRenderer);

    expect(contract.hostProjection?.fields.activeNode?.schema.kind).toBe('union');
    expect(contract.hostActions?.addNode?.args?.kind).toBe('object');
    expect(contract.hostActions?.addNode?.result?.kind).toBe('object');
    expect(contract.hostManifest?.family).toBe('designer');
    expect(contract.hostManifest?.version).toBe('1.0');
  });

  it('resolves host manifest with explicit version selector', () => {
    const designerRenderer: RendererDefinition = {
      type: 'designer-page',
      component: () => null,
      rendererClass: 'domain-host-renderer',
      hostContract: {
        family: 'designer',
        defaultVersion: '1.0',
        resolveManifest(versionSelector) {
          if (versionSelector === '2.0') {
            return {
              family: 'designer',
              version: '2.0',
              projection: { fields: {} },
              capabilities: { namespace: 'designer', methods: {} },
            };
          }
          return undefined;
        },
      },
    };

    const contract = resolveRendererAuthoringContract(designerRenderer, '2.0');

    expect(contract.hostManifest?.version).toBe('2.0');
  });
});

describe('resolveHostContractManifest', () => {
  it('returns undefined when renderer has no hostContract', () => {
    const renderer: RendererDefinition = {
      type: 'button',
      component: () => null,
    };

    expect(resolveHostContractManifest(renderer)).toBeUndefined();
  });

  it('resolves default version when no selector is provided', () => {
    const renderer: RendererDefinition = {
      type: 'designer-page',
      component: () => null,
      hostContract: {
        family: 'designer',
        defaultVersion: '1.0',
        resolveManifest(versionSelector) {
          if (versionSelector === '1.0') {
            return {
              family: 'designer',
              version: '1.0',
              projection: { fields: {} },
              capabilities: { namespace: 'designer', methods: {} },
            };
          }
          return undefined;
        },
      },
    };

    const manifest = resolveHostContractManifest(renderer);
    expect(manifest?.version).toBe('1.0');
  });

  it('resolves explicit version selector', () => {
    const renderer: RendererDefinition = {
      type: 'designer-page',
      component: () => null,
      hostContract: {
        family: 'designer',
        defaultVersion: '1.0',
        resolveManifest(versionSelector) {
          return versionSelector === '2.0'
            ? {
                family: 'designer',
                version: '2.0',
                projection: { fields: {} },
                capabilities: { namespace: 'designer', methods: {} },
              }
            : undefined;
        },
      },
    };

    const manifest = resolveHostContractManifest(renderer, '2.0');
    expect(manifest?.version).toBe('2.0');
  });

  it('returns undefined when version is not supported', () => {
    const renderer: RendererDefinition = {
      type: 'designer-page',
      component: () => null,
      hostContract: {
        family: 'designer',
        defaultVersion: '1.0',
        resolveManifest() {
          return undefined;
        },
      },
    };

    expect(resolveHostContractManifest(renderer, '9.0')).toBeUndefined();
  });
});
