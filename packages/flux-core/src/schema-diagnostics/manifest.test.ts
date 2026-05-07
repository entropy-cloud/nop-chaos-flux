import { describe, expect, it } from 'vitest';
import type {
  CapabilityMethodContract,
  HostCapabilityProjectionManifest,
  HostManifestResolver,
} from './manifest.js';

describe('host manifest contracts', () => {
  it('supports resolved and unsupported-version resolver results', () => {
    const manifest: HostCapabilityProjectionManifest = {
      family: 'designer',
      version: '1.0',
      projection: {
        fields: {
          userId: { schema: { kind: 'string' } },
        },
      },
      capabilities: {
        namespace: 'designer',
        methods: {
          export: {
            args: { kind: 'object', fields: {}, optional: [] },
            result: { kind: 'boolean' },
          },
        },
      },
    };

    const resolver: HostManifestResolver = {
      resolve(input) {
        if (input.versionSelector === '1.0') {
          return { kind: 'resolved', manifest };
        }
        return { kind: 'unsupported-version', availableVersions: ['1.0'] };
      },
    };

    expect(resolver.resolve({ family: 'designer', versionSelector: '1.0' })).toEqual({
      kind: 'resolved',
      manifest,
    });
    expect(resolver.resolve({ family: 'designer', versionSelector: '2.0' })).toEqual({
      kind: 'unsupported-version',
      availableVersions: ['1.0'],
    });
  });

  it('allows region-scoped capability attribution declarations', () => {
    const manifest: HostCapabilityProjectionManifest = {
      family: 'designer',
      version: '1.0',
      projection: { fields: {} },
      capabilities: { namespace: 'designer', methods: {} },
      compatibility: {
        deprecatedMethods: ['designer:legacyExport'],
        replacedBy: { 'designer:legacyExport': 'designer:export' },
      },
    };

    expect(manifest.compatibility?.replacedBy?.['designer:legacyExport']).toBe('designer:export');
  });

  it('shares one method contract shape across host and renderer metadata', () => {
    const method: CapabilityMethodContract = {
      args: {
        kind: 'object',
        fields: {
          value: { kind: 'string' },
        },
      },
      result: { kind: 'boolean' },
      description: 'Shared method shape',
    };

    expect(method.args?.kind).toBe('object');
    expect(method.result?.kind).toBe('boolean');
  });
});
