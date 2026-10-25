import {
  createEmptyAdapterRegistry,
  type ExpressionEditorAdapter,
  type ReferencePickerAdapter,
  type ReportDesignerAdapterRegistry,
  type ReportDesignerProfile,
} from '../adapters.js';
import type { ReportDesignerConfig } from '../types.js';

export function createAdapterRegistrySnapshot(
  input?: Partial<ReportDesignerAdapterRegistry>,
): ReportDesignerAdapterRegistry {
  return {
    fieldSources: new Map(input?.fieldSources ?? []),
    fieldDrops: new Map(input?.fieldDrops ?? []),
    previews: new Map(input?.previews ?? []),
    codecs: new Map(input?.codecs ?? []),
    expressions: new Map(input?.expressions ?? []),
    references: new Map(input?.references ?? []),
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

export function getPreviewProviderId(
  config: ReportDesignerConfig,
  profile?: ReportDesignerProfile,
): string | undefined {
  return profile?.previewId ?? config.preview?.provider;
}

export function getCodecId(profile?: ReportDesignerProfile): string | undefined {
  return profile?.codecId;
}

export function getExpressionEditorId(profile?: ReportDesignerProfile): string | undefined {
  return profile?.expressionEditorId;
}

export function getReferencePickerId(profile?: ReportDesignerProfile): string | undefined {
  return profile?.referencePickerId;
}

export function resolveExpressionEditor(args: {
  adapters: ReportDesignerAdapterRegistry;
  profile?: ReportDesignerProfile;
}): ExpressionEditorAdapter | undefined {
  const id = getExpressionEditorId(args.profile);
  return id ? args.adapters.expressions.get(id) : undefined;
}

export function resolveReferencePicker(args: {
  adapters: ReportDesignerAdapterRegistry;
  profile?: ReportDesignerProfile;
}): ReferencePickerAdapter | undefined {
  const id = getReferencePickerId(args.profile);
  return id ? args.adapters.references.get(id) : undefined;
}

