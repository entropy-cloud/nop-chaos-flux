import type {
  ReportDesignerAdapterRegistry,
  ReportDesignerProfile,
  TemplateCodecAdapter,
} from '../adapters.js';
import type {
  ReportDesignerConfig,
  ReportDesignerRuntimeSnapshot,
  ReportTemplateDocument,
} from '../types.js';
import { t } from '@nop-chaos/flux-i18n';
import { getCodecId } from './registry.js';
import { createAdapterContext } from './adapter-context.js';

export function resolveCodecAdapter(args: {
  adapters: ReportDesignerAdapterRegistry;
  profile?: ReportDesignerProfile;
}): { adapter: TemplateCodecAdapter; codecId: string } | { error: Error } {
  const codecId = getCodecId(args.profile);
  if (!codecId) {
    return { error: new Error(t('flux.reportDesigner.noCodecConfigured')) };
  }

  const adapter = args.adapters.codecs.get(codecId);
  if (!adapter) {
    return { error: new Error(t('flux.reportDesigner.codecNotFound', { codecId })) };
  }

  return { adapter, codecId };
}

export async function importTemplateWithCodec(args: {
  adapter: TemplateCodecAdapter;
  payload: unknown;
  config: ReportDesignerConfig;
  document: ReportTemplateDocument;
  designer: ReportDesignerRuntimeSnapshot;
  profile?: ReportDesignerProfile;
}) {
  return args.adapter.importDocument(
    args.payload,
    createAdapterContext({
      config: args.config,
      document: args.document,
      designer: args.designer,
      profile: args.profile,
    }),
  );
}

export async function exportTemplateWithCodec(args: {
  adapter: TemplateCodecAdapter;
  document: ReportTemplateDocument;
  format: string | undefined;
  config: ReportDesignerConfig;
  designer: ReportDesignerRuntimeSnapshot;
  profile?: ReportDesignerProfile;
}) {
  return args.adapter.exportDocument(
    args.document,
    args.format,
    createAdapterContext({
      config: args.config,
      document: args.document,
      designer: args.designer,
      profile: args.profile,
    }),
  );
}
