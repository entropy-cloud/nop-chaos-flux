import type {
  CapabilityPublicationAttribution,
  HostCapabilityContract,
  HostCapabilityProjectionManifest,
  RendererHostContract,
} from '@nop-chaos/flux-core';
import { SPREADSHEET_HOST_METHOD_CONTRACTS_CORE } from './spreadsheet-host-method-contracts-core.js';
import { SPREADSHEET_HOST_METHOD_CONTRACTS_FORMATTING } from './spreadsheet-host-method-contracts-formatting.js';
import { spreadsheetProjection } from './spreadsheet-manifest-shapes.js';

export const SPREADSHEET_HOST_METHOD_CONTRACTS: HostCapabilityContract['methods'] = {
  ...SPREADSHEET_HOST_METHOD_CONTRACTS_CORE,
  ...SPREADSHEET_HOST_METHOD_CONTRACTS_FORMATTING,
};

export const SPREADSHEET_HOST_METHODS = Object.freeze(
  Object.keys(SPREADSHEET_HOST_METHOD_CONTRACTS),
) as readonly string[];

const spreadsheetCapabilities: HostCapabilityContract = {
  namespace: 'spreadsheet',
  methods: SPREADSHEET_HOST_METHOD_CONTRACTS,
};

export const SPREADSHEET_MANIFEST_V1: HostCapabilityProjectionManifest = {
  family: 'spreadsheet',
  version: '1.0',
  projection: spreadsheetProjection,
  capabilities: spreadsheetCapabilities,
  metadata: {
    title: 'Spreadsheet Host',
    description: 'Spreadsheet editor host capability contract.',
    docsPath: 'docs/components/spreadsheet-page/design.md',
  },
};

const manifestVersions = new Map<string, HostCapabilityProjectionManifest>([
  ['1.0', SPREADSHEET_MANIFEST_V1],
  ['1', SPREADSHEET_MANIFEST_V1],
  ['latest', SPREADSHEET_MANIFEST_V1],
]);

export function resolveSpreadsheetManifest(
  versionSelector: string,
): HostCapabilityProjectionManifest | undefined {
  return manifestVersions.get(versionSelector);
}

export const SPREADSHEET_CAPABILITY_PUBLICATION: CapabilityPublicationAttribution = {
  mode: 'region-scoped',
  capableRegions: ['toolbar', 'body', 'dialogs'],
  transitiveInheritance: true,
};

export const spreadsheetHostContract: RendererHostContract = {
  family: 'spreadsheet',
  defaultVersion: '1.0',
  resolveManifest: resolveSpreadsheetManifest,
  capabilityPublication: SPREADSHEET_CAPABILITY_PUBLICATION,
};
