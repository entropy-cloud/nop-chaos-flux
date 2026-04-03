import type {
  PreviewAdapter,
  ReportDesignerAdapterRegistry,
  ReportDesignerProfile,
} from '../adapters.js';
import type {
  ReportDesignerConfig,
  ReportDesignerRuntimeSnapshot,
  ReportTemplateDocument,
} from '../types.js';
import { getPreviewProviderId } from './registry.js';
import { createAdapterContext } from './adapter-context.js';
import { cloneDocument } from './metadata.js';

export function resolvePreviewAdapter(args: {
  config: ReportDesignerConfig;
  adapters: ReportDesignerAdapterRegistry;
  profile?: ReportDesignerProfile;
}): { adapter: PreviewAdapter; providerId: string } | { error: Error } {
  const providerId = getPreviewProviderId(args.config, args.profile);
  if (!providerId) {
    return { error: new Error('No preview provider configured') };
  }

  const adapter = args.adapters.previews.get(providerId);
  if (!adapter) {
    return { error: new Error(`Preview adapter not found: ${providerId}`) };
  }

  return { adapter, providerId };
}

export async function runPreviewCommand(args: {
  adapter: PreviewAdapter;
  config: ReportDesignerConfig;
  document: ReportTemplateDocument;
  designer: ReportDesignerRuntimeSnapshot;
  profile?: ReportDesignerProfile;
  mode?: 'inline' | 'dialog' | 'replace-page' | 'download';
  commandArgs?: Record<string, unknown>;
}) {
  return args.adapter.preview({
    document: cloneDocument(args.document),
    mode: args.mode,
    params: args.commandArgs,
    context: createAdapterContext({
      config: args.config,
      document: args.document,
      designer: args.designer,
      profile: args.profile,
    }),
  });
}
