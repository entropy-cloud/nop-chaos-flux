import type { ReportDesignerProfile } from '../adapters.js';
import type { ReportDesignerConfig, ReportSelectionTarget } from '../types.js';
import type { SchemaInput } from '@nop-chaos/flux-core';

export function resolveInspectorSchemaForTarget(args: {
  config: ReportDesignerConfig;
  target: ReportSelectionTarget | undefined;
  profile?: ReportDesignerProfile;
}): SchemaInput | undefined {
  const targetKind = args.target?.kind;
  if (!targetKind) {
    return undefined;
  }

  const inspector = args.config.inspector;
  const profileSchemaId = args.profile?.inspectorSchemaId;
  if (profileSchemaId) {
    const byProfileSchema = inspector?.byProfile?.[profileSchemaId]?.[targetKind];
    if (byProfileSchema) {
      return byProfileSchema;
    }
  }

  const byTargetSchema = inspector?.byTarget?.[targetKind];
  if (byTargetSchema) {
    return byTargetSchema;
  }

  return inspector?.body;
}
