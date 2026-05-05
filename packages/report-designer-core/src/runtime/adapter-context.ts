import type { ReportDesignerAdapterContext, ReportDesignerProfile } from '../adapters.js';
import type {
  MetadataBag,
  ReportDesignerConfig,
  ReportDesignerRuntimeSnapshot,
  ReportTemplateDocument,
} from '../types.js';
import { cloneDocument, cloneMetadataBag } from './metadata.js';

export function createAdapterContext(input: {
  config: ReportDesignerConfig;
  document: ReportTemplateDocument;
  designer: ReportDesignerRuntimeSnapshot;
  profile?: ReportDesignerProfile;
}): ReportDesignerAdapterContext {
  const document = cloneDocument(input.document);
  return {
    config: input.config,
    document,
    designer: {
      ...input.designer,
      document,
      activeMeta: cloneMetadataBag(input.designer.activeMeta as MetadataBag | undefined),
      fieldSources: input.designer.fieldSources.map((source) => ({
        ...source,
        groups: source.groups.map((group) => ({
          ...group,
          fields: group.fields.map((field) => ({ ...field })),
        })),
      })),
      fieldDrag: input.designer.fieldDrag.payload
        ? {
            ...input.designer.fieldDrag,
            payload: {
              ...input.designer.fieldDrag.payload,
              data: { ...input.designer.fieldDrag.payload.data },
            },
          }
        : { ...input.designer.fieldDrag },
    },
    profile: input.profile,
  };
}
