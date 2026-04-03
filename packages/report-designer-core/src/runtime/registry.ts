import { createEmptyAdapterRegistry, type ReportDesignerAdapterRegistry, type ReportDesignerProfile } from '../adapters.js';
import type { ReportDesignerConfig } from '../types.js';

export function createAdapterRegistrySnapshot(input?: Partial<ReportDesignerAdapterRegistry>): ReportDesignerAdapterRegistry {
  return {
    fieldSources: new Map(input?.fieldSources ?? []),
    inspectors: new Map(input?.inspectors ?? []),
    fieldDrops: new Map(input?.fieldDrops ?? []),
    previews: new Map(input?.previews ?? []),
    codecs: new Map(input?.codecs ?? []),
    expressions: new Map(input?.expressions ?? []),
    references: new Map(input?.references ?? []),
    inspectorValues: new Map(input?.inspectorValues ?? []),
  };
}

export function resolveRegistry(input?: Partial<ReportDesignerAdapterRegistry>) {
  return input ? createAdapterRegistrySnapshot(input) : createEmptyAdapterRegistry();
}

export function getProfileFieldDropIds(profile?: ReportDesignerProfile): Set<string> | undefined {
  if (!profile?.fieldDropIds?.length) {
    return undefined;
  }
  return new Set(profile.fieldDropIds);
}

export function getPreviewProviderId(config: ReportDesignerConfig, profile?: ReportDesignerProfile): string | undefined {
  return profile?.previewId ?? config.preview?.provider;
}

export function getCodecId(profile?: ReportDesignerProfile): string | undefined {
  return profile?.codecId;
}
