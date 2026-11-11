import type { RendererCapabilityContract } from '@nop-chaos/flux-core';

// Capability contracts with identical semantics in both scada-canvas (runtime)
// and scada-editor-canvas (editor) modes. Mode-specific entries (setPointValue,
// getPointTable, editor-only handles) stay in each definition file. Keep in
// sync with the invoke switches in scada-engine / use-editor-handles.
export const SHARED_SCADA_CONTRACTS: readonly RendererCapabilityContract[] = [
  {
    handle: 'fit',
    displayName: 'Fit',
    description: 'Fit the viewport to the scene bounds.',
  },
  {
    handle: 'center',
    displayName: 'Center',
    description: 'Center the scene at the current scale.',
  },
  {
    handle: 'getSymbols',
    displayName: 'Get Symbols',
    description: 'Read-only scene tree snapshot (id + type per symbol).',
    result: {
      kind: 'array',
      item: {
        kind: 'object',
        fields: { id: { kind: 'string' }, type: { kind: 'string' } },
      },
    },
  },
  {
    handle: 'getSymbol',
    displayName: 'Get Symbol',
    description: 'Read a single symbol resolved props by id.',
    args: { kind: 'object', fields: { id: { kind: 'string' } } },
  },
  {
    handle: 'exportConfig',
    displayName: 'Export Config',
    description: 'Serialize the current scene config.',
  },
  {
    handle: 'importConfig',
    displayName: 'Import Config',
    description: 'Parse + validate + apply a new config (full rebuild).',
    args: { kind: 'object', fields: { config: { kind: 'unknown' } } },
  },
] as const;
