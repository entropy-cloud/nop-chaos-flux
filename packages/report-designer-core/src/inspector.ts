import type {
  ReportSelectionTarget,
  MetadataBag,
  ReportDesignerRuntimeSnapshot,
} from './types.js';
import type {
  ReportDesignerAdapterContext,
  ReportDesignerAdapterRegistry,
  InspectorPanelDescriptor,
  InspectorPanelContext,
  InspectorProvider,
} from './adapters.js';

export interface InspectorMatchResult {
  providers: InspectorProvider[];
  panels: InspectorPanelDescriptor[];
}

export function matchInspectorProviders(
  target: ReportSelectionTarget,
  registry: ReportDesignerAdapterRegistry,
  context: ReportDesignerAdapterContext,
): InspectorProvider[] {
  const matched: InspectorProvider[] = [];

  for (const provider of registry.inspectors.values()) {
    if (provider.match(target, context)) {
      matched.push(provider);
    }
  }

  matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return matched;
}

export async function resolveInspectorPanels(
  target: ReportSelectionTarget,
  registry: ReportDesignerAdapterRegistry,
  metadata: MetadataBag | undefined,
  designer: ReportDesignerRuntimeSnapshot,
  adapterContext: ReportDesignerAdapterContext,
): Promise<InspectorMatchResult> {
  const providers = matchInspectorProviders(target, registry, adapterContext);

  const panelContext: InspectorPanelContext = {
    target,
    metadata,
    designer,
    adapterContext,
  };

  const panels: InspectorPanelDescriptor[] = [];

  for (const provider of providers) {
    const providerPanels = await provider.getPanels(panelContext);
    panels.push(...providerPanels);
  }

  panels.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return { providers, panels };
}

export function groupPanelsByMode(
  panels: InspectorPanelDescriptor[],
): {
  tabs: InspectorPanelDescriptor[];
  sections: InspectorPanelDescriptor[];
  inline: InspectorPanelDescriptor[];
} {
  const tabs: InspectorPanelDescriptor[] = [];
  const sections: InspectorPanelDescriptor[] = [];
  const inline: InspectorPanelDescriptor[] = [];

  for (const panel of panels) {
    switch (panel.mode) {
      case 'tab':
        tabs.push(panel);
        break;
      case 'section':
        sections.push(panel);
        break;
      case 'inline':
        inline.push(panel);
        break;
      default:
        tabs.push(panel);
        break;
    }
  }

  return { tabs, sections, inline };
}

export function findDefaultActivePanel(
  panels: InspectorPanelDescriptor[],
): string | undefined {
  if (panels.length === 0) return undefined;
  const nonReadonly = panels.find((p) => !p.readonly);
  return (nonReadonly ?? panels[0]).id;
}
