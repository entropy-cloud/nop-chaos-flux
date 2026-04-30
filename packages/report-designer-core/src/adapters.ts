import type {
  ReportSelectionTarget,
  ReportSelectionTargetKind,
  MetadataBag,
  FieldSourceSnapshot,
  FieldDragPayload,
  ReportDesignerRuntimeSnapshot,
  ReportTemplateDocument,
  ReportDesignerConfig,
} from './types.js';

export interface ReportDesignerAdapterContext {
  config: ReportDesignerConfig;
  document: ReportTemplateDocument;
  designer: ReportDesignerRuntimeSnapshot;
  profile?: ReportDesignerProfile;
}

export interface FieldSourceProvider {
  id: string;
  load(
    context: ReportDesignerAdapterContext,
  ): Promise<FieldSourceSnapshot[]> | FieldSourceSnapshot[];
}

export interface FieldDropAdapter {
  id: string;
  canHandle(
    field: FieldDragPayload,
    target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>,
  ): boolean;
  mapDropToMetaPatch(args: {
    field: FieldDragPayload;
    target: Extract<ReportSelectionTarget, { kind: 'cell' | 'range' }>;
    currentMeta?: MetadataBag;
    context: ReportDesignerAdapterContext;
  }): MetadataBag;
}

export interface PreviewAdapter {
  id: string;
  preview(args: {
    document: ReportTemplateDocument;
    mode?: string;
    params?: Record<string, unknown>;
    context: ReportDesignerAdapterContext;
  }): Promise<PreviewResult>;
}

export interface PreviewResult {
  ok: boolean;
  mode?: string;
  data?: unknown;
  error?: unknown;
}

export interface TemplateCodecAdapter {
  id: string;
  importDocument(
    payload: unknown,
    context: ReportDesignerAdapterContext,
  ): Promise<ReportTemplateDocument> | ReportTemplateDocument;
  exportDocument(
    document: ReportTemplateDocument,
    format: string | undefined,
    context: ReportDesignerAdapterContext,
  ): Promise<unknown> | unknown;
}

export interface ExpressionEditorProps {
  value: string;
  readonly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  context?: ExpressionEditorContext;
  onChange(nextValue: string): void;
  onBlur?(): void;
}

export interface ExpressionEditorContext {
  targetKind: ReportSelectionTargetKind;
  scopeData?: Record<string, unknown>;
  metadata?: MetadataBag;
}

export interface ExpressionEditorAdapter {
  id: string;
  render(props: ExpressionEditorProps): unknown;
}

export interface ReferencePickerContext {
  targetKind: ReportSelectionTargetKind;
  allowedKinds?: Array<'cell' | 'range' | 'row' | 'column'>;
}

export interface ReferencePickerAdapter {
  id: string;
  pick(context: ReferencePickerContext): Promise<string | undefined>;
}

export interface ReportDesignerAdapterRegistry {
  fieldSources: Map<string, FieldSourceProvider>;
  fieldDrops: Map<string, FieldDropAdapter>;
  previews: Map<string, PreviewAdapter>;
  codecs: Map<string, TemplateCodecAdapter>;
  expressions: Map<string, ExpressionEditorAdapter>;
  references: Map<string, ReferencePickerAdapter>;
}

export function createEmptyAdapterRegistry(): ReportDesignerAdapterRegistry {
  return {
    fieldSources: new Map(),
    fieldDrops: new Map(),
    previews: new Map(),
    codecs: new Map(),
    expressions: new Map(),
    references: new Map(),
  };
}

export function createStaticFieldSourceProvider(
  id: string,
  fieldSources: FieldSourceSnapshot[],
): FieldSourceProvider {
  return {
    id,
    load() {
      return fieldSources.map((source) => ({
        ...source,
        groups: source.groups.map((group) => ({
          ...group,
          fields: group.fields.map((field) => ({ ...field })),
        })),
      }));
    },
  };
}

export function createMetaPatchDropAdapter(input: {
  id: string;
  fieldType?: string;
  createPatch(field: FieldDragPayload): MetadataBag;
}): FieldDropAdapter {
  return {
    id: input.id,
    canHandle(field) {
      return !input.fieldType || field.type === input.fieldType;
    },
    mapDropToMetaPatch(args) {
      return input.createPatch(args.field);
    },
  };
}

export function createUnsupportedTemplateCodecAdapter(id: string): TemplateCodecAdapter {
  return {
    id,
    importDocument() {
      throw new Error(`Template codec ${id} does not support import`);
    },
    exportDocument() {
      throw new Error(`Template codec ${id} does not support export`);
    },
  };
}

export interface ReportDesignerProfile {
  id: string;
  kind: string;
  fieldSourceIds: string[];
  fieldDropIds: string[];
  inspectorSchemaId?: string;
  previewId?: string;
  codecId?: string;
  expressionEditorId?: string;
}
