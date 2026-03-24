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
  load(context: ReportDesignerAdapterContext): Promise<FieldSourceSnapshot[]> | FieldSourceSnapshot[];
}

export interface InspectorPanelDescriptor {
  id: string;
  title: string;
  targetKind: ReportSelectionTargetKind;
  group?: string;
  order?: number;
  mode?: 'tab' | 'section' | 'inline';
  body: Record<string, unknown>;
  submitAction?: Record<string, unknown>;
  readonly?: boolean;
  badge?: string;
}

export interface InspectorPanelContext {
  target: ReportSelectionTarget;
  metadata?: MetadataBag;
  designer: ReportDesignerRuntimeSnapshot;
  adapterContext: ReportDesignerAdapterContext;
}

export interface InspectorProvider {
  id: string;
  match(target: ReportSelectionTarget, context: ReportDesignerAdapterContext): boolean;
  getPanels(context: InspectorPanelContext): InspectorPanelDescriptor[] | Promise<InspectorPanelDescriptor[]>;
  priority?: number;
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

export interface InspectorValueAdapter {
  id: string;
  read(
    target: ReportSelectionTarget,
    context: InspectorPanelContext,
  ): Record<string, unknown>;
  write(
    values: Record<string, unknown>,
    target: ReportSelectionTarget,
    context: InspectorPanelContext,
  ): InspectorWritePlan;
}

export interface InspectorWritePlan {
  actions: Array<Record<string, unknown>>;
}

export interface ReportDesignerAdapterRegistry {
  fieldSources: Map<string, FieldSourceProvider>;
  inspectors: Map<string, InspectorProvider>;
  fieldDrops: Map<string, FieldDropAdapter>;
  previews: Map<string, PreviewAdapter>;
  codecs: Map<string, TemplateCodecAdapter>;
  expressions: Map<string, ExpressionEditorAdapter>;
  references: Map<string, ReferencePickerAdapter>;
  inspectorValues: Map<string, InspectorValueAdapter>;
}

export function createEmptyAdapterRegistry(): ReportDesignerAdapterRegistry {
  return {
    fieldSources: new Map(),
    inspectors: new Map(),
    fieldDrops: new Map(),
    previews: new Map(),
    codecs: new Map(),
    expressions: new Map(),
    references: new Map(),
    inspectorValues: new Map(),
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

export function createStaticInspectorProvider(
  id: string,
  targetKind: InspectorPanelDescriptor['targetKind'],
  panels: InspectorPanelDescriptor[],
): InspectorProvider {
  return {
    id,
    match(target) {
      return target.kind === targetKind;
    },
    getPanels() {
      return panels.map((panel) => ({ ...panel }));
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
  inspectorIds: string[];
  fieldDropIds: string[];
  previewId?: string;
  codecId?: string;
  expressionEditorId?: string;
}
