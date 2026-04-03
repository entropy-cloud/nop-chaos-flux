import type {
  InspectorPanelDescriptor,
  ReportDesignerAdapterRegistry,
  ReportDesignerProfile,
} from '../adapters.js';
import type {
  MetadataBag,
  ReportDesignerConfig,
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
  ReportTemplateDocument,
} from '../types.js';
import { getTargetMeta } from '../types.js';
import { createAdapterContext } from './adapter-context.js';
import { cloneMetadataBag } from './metadata.js';

export type ConfiguredInspectorProvider = NonNullable<ReportDesignerConfig['inspector']>['providers'][number];

export function dedupePanels(panels: InspectorPanelDescriptor[]): InspectorPanelDescriptor[] {
  const seen = new Set<string>();
  const deduped: InspectorPanelDescriptor[] = [];
  for (const panel of panels) {
    if (!seen.has(panel.id)) {
      seen.add(panel.id);
      deduped.push(panel);
    }
  }
  return deduped;
}

export function sortPanels(left: InspectorPanelDescriptor, right: InspectorPanelDescriptor): number {
  const orderDelta = (left.order ?? 0) - (right.order ?? 0);
  if (orderDelta !== 0) {
    return orderDelta;
  }
  return left.title.localeCompare(right.title);
}

export function getProfileInspectorIds(config: ReportDesignerConfig, profile?: ReportDesignerProfile): string[] {
  if (profile?.inspectorIds?.length) {
    return profile.inspectorIds;
  }
  return config.inspector?.providers.map((provider) => provider.id) ?? [];
}

export function buildInspectorProvidersByKind(
  providers: ConfiguredInspectorProvider[],
): Map<ReportSelectionTarget['kind'], ConfiguredInspectorProvider[]> {
  const providersByKind = new Map<ReportSelectionTarget['kind'], ConfiguredInspectorProvider[]>();
  for (const provider of providers) {
    for (const kind of provider.match.kinds) {
      const existing = providersByKind.get(kind);
      if (existing) {
        existing.push(provider);
      } else {
        providersByKind.set(kind, [provider]);
      }
    }
  }
  return providersByKind;
}

export async function resolveInspectorPanelsForTarget(args: {
  config: ReportDesignerConfig;
  document: ReportTemplateDocument;
  adapters: ReportDesignerAdapterRegistry;
  target: ReportSelectionTarget | undefined;
  profile?: ReportDesignerProfile;
  providersByKind: Map<ReportSelectionTarget['kind'], ConfiguredInspectorProvider[]>;
  designer: ReportDesignerRuntimeSnapshot;
}): Promise<InspectorPanelDescriptor[]> {
  if (!args.target) {
    return [];
  }
  const target = args.target;

  const metadata = getTargetMeta(args.document.semantic, target);
  const adapterContext = createAdapterContext({
    config: args.config,
    document: args.document,
    designer: args.designer,
    profile: args.profile,
  });
  const panelContext = {
    target,
    metadata: cloneMetadataBag(metadata as MetadataBag | undefined),
    designer: adapterContext.designer,
    adapterContext,
  };

  const configuredProviders = args.providersByKind.get(target.kind) ?? [];
  const matchedPanels: InspectorPanelDescriptor[] = [];

  for (const providerConfig of configuredProviders) {
    if (providerConfig.body) {
      matchedPanels.push({
        id: providerConfig.id,
        title: providerConfig.label ?? providerConfig.id,
        targetKind: target.kind,
        group: providerConfig.group,
        order: providerConfig.order,
        mode: providerConfig.mode,
        body: providerConfig.body,
        submitAction: providerConfig.submitAction,
        readonly: providerConfig.readonly,
        badge: providerConfig.badge,
      });
    }

    if (!providerConfig.provider) {
      continue;
    }
    const provider = args.adapters.inspectors.get(providerConfig.provider);
    if (!provider || !provider.match(target, adapterContext)) {
      continue;
    }
    const panels = await provider.getPanels(panelContext);
    matchedPanels.push(...panels.map((panel) => ({ ...panel, targetKind: panel.targetKind ?? target.kind })));
  }

  return dedupePanels(matchedPanels).sort(sortPanels);
}
