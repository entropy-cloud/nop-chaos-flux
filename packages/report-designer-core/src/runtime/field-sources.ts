import type { ReportDesignerAdapterRegistry, ReportDesignerProfile } from '../adapters.js';
import type {
  FieldSourceSnapshot,
  ReportDesignerConfig,
  ReportDesignerRuntimeSnapshot,
  ReportTemplateDocument,
} from '../types.js';
import { createAdapterContext } from './adapter-context.js';

export function cloneFieldSourceSnapshot(source: FieldSourceSnapshot): FieldSourceSnapshot {
  return {
    id: source.id,
    label: source.label,
    groups: source.groups.map((group) => ({
      id: group.id,
      label: group.label,
      expanded: group.expanded ?? true,
      fields: group.fields.map((field) => ({ ...field })),
    })),
  };
}

export function getProfileFieldSourceIds(
  config: ReportDesignerConfig,
  profile?: ReportDesignerProfile,
): string[] {
  if (profile?.fieldSourceIds?.length) {
    return profile.fieldSourceIds;
  }
  return config.fieldSources?.map((fieldSource) => fieldSource.id) ?? [];
}

export async function loadFieldSources(args: {
  config: ReportDesignerConfig;
  document: ReportTemplateDocument;
  adapters: ReportDesignerAdapterRegistry;
  profile?: ReportDesignerProfile;
  selectedFieldSourceIds: Set<string>;
  staticFieldSourceTemplates: FieldSourceSnapshot[];
  getSnapshot(): ReportDesignerRuntimeSnapshot;
  signal?: AbortSignal;
}): Promise<FieldSourceSnapshot[]> {
  const staticSources = args.staticFieldSourceTemplates.map(cloneFieldSourceSnapshot);
  const dynamicSources: FieldSourceSnapshot[] = [];
  let adapterContext: ReturnType<typeof createAdapterContext> | undefined;

  for (const fieldSource of args.config.fieldSources ?? []) {
    if (args.signal?.aborted) {
      return [];
    }

    if (!fieldSource.provider || !args.selectedFieldSourceIds.has(fieldSource.id)) {
      continue;
    }
    const provider = args.adapters.fieldSources.get(fieldSource.provider);
    if (!provider) {
      continue;
    }
    adapterContext ??= createAdapterContext({
      config: args.config,
      document: args.document,
      designer: args.getSnapshot(),
      profile: args.profile,
    });
    const loaded = await provider.load(adapterContext, { signal: args.signal });

    if (args.signal?.aborted) {
      return [];
    }

    dynamicSources.push(...loaded);
  }

  return [...staticSources, ...dynamicSources];
}
