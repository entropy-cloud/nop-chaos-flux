import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from './types';
import { resolveRendererAuthoringContract } from './types';

describe('resolveRendererAuthoringContract', () => {
  it('assembles ordinary renderer metadata without host-only fields', () => {
    const buttonRenderer: RendererDefinition = {
      type: 'button',
      component: () => null,
      rendererClass: 'instance-renderer',
      propContracts: {
        label: {
          shape: { kind: 'string' },
          displayName: 'Label'
        }
      },
      eventContracts: {
        onClick: {
          displayName: 'Click'
        }
      }
    };

    const contract = resolveRendererAuthoringContract(buttonRenderer);

    expect(contract.rendererType).toBe('button');
    expect(contract.rendererClass).toBe('instance-renderer');
    expect(contract.editableProps.label?.shape.kind).toBe('string');
    expect(contract.events.onClick?.displayName).toBe('Click');
    expect(contract.hostProjection).toBeUndefined();
    expect(contract.hostActions).toBeUndefined();
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
                  schema: { kind: 'union', anyOf: [{ kind: 'null' }, { kind: 'object', fields: {} }] }
                }
              }
            },
            capabilities: {
              namespace: 'designer',
              methods: {
                addNode: {
                  args: {
                    kind: 'object',
                    fields: {
                      nodeType: { kind: 'string' }
                    }
                  },
                  result: {
                    kind: 'object',
                    fields: {
                      nodeId: { kind: 'string' }
                    }
                  },
                  description: 'Add a node'
                }
              }
            }
          };
        }
      }
    };

    const contract = resolveRendererAuthoringContract(designerRenderer);

    expect(contract.hostProjection?.fields.activeNode?.schema.kind).toBe('union');
    expect(contract.hostActions?.addNode?.args?.kind).toBe('object');
    expect(contract.hostActions?.addNode?.result?.kind).toBe('object');
  });
});
