import type {
  ReportDesignerAdapterContext,
  ReportDesignerProfile,
} from '../adapters.js';
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
  return {
    config: input.config,
    document: cloneDocument(input.document),
    designer: {
      ...input.designer,
      document: cloneDocument(input.designer.document),
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
            payload: { ...input.designer.fieldDrag.payload, data: { ...input.designer.fieldDrag.payload.data } },
          }
        : { ...input.designer.fieldDrag },
    },
    profile: input.profile,
  };
}
