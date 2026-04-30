import { createStore } from 'zustand/vanilla';
import type {
  ReportDesignerConfig,
  ReportTemplateDocument,
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
  MetadataBag,
  FieldSourceSnapshot,
} from './types.js';
import { getTargetMeta, getDefaultSelectionTarget } from './types.js';
import type { ReportDesignerCommand, ReportDesignerCommandResult } from './commands.js';
import type {
  ReportDesignerAdapterRegistry,
  FieldDropAdapter,
  ReportDesignerProfile,
} from './adapters.js';
import { getProfileFieldDropIds, resolveRegistry } from './runtime/registry.js';
import { cloneDocument, cloneMetadataBag, updateMetadata } from './runtime/metadata.js';
import { resolveInspectorSchemaForTarget } from './runtime/inspector-panels.js';
import { getProfileFieldSourceIds, loadFieldSources } from './runtime/field-sources.js';
import {
  type ReportDesignerInternalState,
  type DispatchContext,
  dispatchReportDesignerCommand,
} from './core-dispatch.js';

export type { ReportDesignerInternalState };

export interface ReportDesignerCore {
  getSnapshot(): ReportDesignerRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult>;
  getMetadata(target: ReportSelectionTarget): MetadataBag | undefined;
  setMetadata(target: ReportSelectionTarget, nextMeta: MetadataBag): void;
  syncSpreadsheetDocument(nextDocument: ReportTemplateDocument['spreadsheet']): void;
  setSelectionTarget(target?: ReportSelectionTarget): Promise<void>;
  refreshFieldSources(): Promise<FieldSourceSnapshot[]>;
  exportDocument(): ReportTemplateDocument;
  getAdapterRegistry(): ReportDesignerAdapterRegistry;
  registerFieldSource(provider: import('./adapters.js').FieldSourceProvider): void;
  registerFieldDrop(adapter: FieldDropAdapter): void;
  registerPreview(adapter: import('./adapters.js').PreviewAdapter): void;
  registerCodec(adapter: import('./adapters.js').TemplateCodecAdapter): void;
}

export interface CreateReportDesignerCoreOptions {
  document: ReportTemplateDocument;
  config: ReportDesignerConfig;
  adapters?: Partial<ReportDesignerAdapterRegistry>;
  profile?: ReportDesignerProfile;
}

function buildSnapshot(state: ReportDesignerInternalState): ReportDesignerRuntimeSnapshot {
  const meta = state.selectionTarget
    ? getTargetMeta(state.document.semantic, state.selectionTarget)
    : undefined;

  return {
    document: state.document,
    dirty: state.undoStack.length > 0,
    selectionTarget: state.selectionTarget,
    activeMeta: meta,
    inspector: state.inspector,
    fieldSources: state.fieldSources,
    fieldDrag: state.fieldDrag,
    preview: state.preview,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
  };
}

export function createReportDesignerCore(
  options: CreateReportDesignerCoreOptions,
): ReportDesignerCore {
  const { document, config, adapters: providedAdapters, profile } = options;
  const registry = resolveRegistry(providedAdapters);

  const initialDocument = cloneDocument(document);
  const selectedFieldSourceIds = new Set(getProfileFieldSourceIds(config, profile));
  const allowedFieldDropIds = getProfileFieldDropIds(profile);
  const staticFieldSourceTemplates: FieldSourceSnapshot[] = (config.fieldSources ?? [])
    .filter((fieldSource) => !fieldSource.provider && selectedFieldSourceIds.has(fieldSource.id))
    .map((fieldSource) => ({
      id: fieldSource.id,
      label: fieldSource.label,
      groups: (fieldSource.groups ?? []).map((group) => ({
        id: group.id,
        label: group.label,
        expanded: group.expanded ?? true,
        fields: group.fields.map((field) => ({ ...field })),
      })),
    }));
  const initialSelectionTarget = getDefaultSelectionTarget(initialDocument);

  const store = createStore<ReportDesignerInternalState>(() => ({
    document: initialDocument,
    selectionTarget: initialSelectionTarget,
    inspector: {
      open: false,
      mode: config.inspector?.mode,
      resolvedSchema: resolveInspectorSchemaForTarget({
        config,
        target: initialSelectionTarget,
        profile,
      }),
      loading: false,
    },
    fieldSources: [],
    fieldDrag: { active: false },
    preview: { running: false },
    undoStack: [],
    redoStack: [],
  }));
  let cachedState = store.getState();
  let cachedSnapshot = buildSnapshot(cachedState);

  async function refreshDerivedState() {
    const snapshot = store.getState();
    try {
      const fieldSources = await loadFieldSources({
        config,
        document: snapshot.document,
        adapters: registry,
        profile,
        selectedFieldSourceIds,
        staticFieldSourceTemplates,
        getSnapshot: () => buildSnapshot(store.getState()),
      });

      const resolvedSchema = resolveInspectorSchemaForTarget({
        config,
        target: snapshot.selectionTarget,
        profile,
      });

      store.setState((current) => ({
        ...current,
        fieldSources,
        inspector: {
          ...current.inspector,
          mode: config.inspector?.mode,
          resolvedSchema,
          loading: false,
          error: undefined,
        },
      }));

      return resolvedSchema;
    } catch (error) {
      store.setState((current) => ({
        ...current,
        inspector: {
          ...current.inspector,
          resolvedSchema: undefined,
          loading: false,
          error,
        },
      }));
      return [];
    }
  }

  async function setSelectionTarget(target?: ReportSelectionTarget) {
    store.setState((current) => ({
      ...current,
      selectionTarget: target,
      inspector: {
        ...current.inspector,
        loading: true,
        error: undefined,
      },
    }));
    await refreshDerivedState();
  }

  function pushUndoEntry(
    current: ReportDesignerInternalState,
  ): Partial<ReportDesignerInternalState> {
    const maxDepth = config.maxUndoDepth ?? 50;
    const undoStack = [...current.undoStack, cloneDocument(current.document)];
    if (undoStack.length > maxDepth) undoStack.shift();
    return { undoStack, redoStack: [] };
  }

  const dispatchCtx: DispatchContext = {
    store,
    registry,
    config,
    profile,
    allowedFieldDropIds,
    buildSnapshot,
    refreshDerivedState,
    setSelectionTarget,
    pushUndoEntry,
  };

  async function dispatch(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult> {
    return dispatchReportDesignerCommand(dispatchCtx, command);
  }

  async function refreshFieldSources(): Promise<FieldSourceSnapshot[]> {
    const fieldSources = await loadFieldSources({
      config,
      document: store.getState().document,
      adapters: registry,
      profile,
      selectedFieldSourceIds,
      staticFieldSourceTemplates,
      getSnapshot: () => buildSnapshot(store.getState()),
    });

    store.setState((current) => ({ ...current, fieldSources }));
    return fieldSources;
  }

  void refreshDerivedState();

  return {
    getSnapshot() {
      const state = store.getState();
      if (state !== cachedState) {
        cachedState = state;
        cachedSnapshot = buildSnapshot(state);
      }
      return cachedSnapshot;
    },

    subscribe(listener: () => void) {
      return store.subscribe(listener);
    },

    dispatch,

    getMetadata(target: ReportSelectionTarget): MetadataBag | undefined {
      return cloneMetadataBag(getTargetMeta(store.getState().document.semantic, target));
    },

    setMetadata(target: ReportSelectionTarget, nextMeta: MetadataBag): void {
      store.setState((current) => {
        const result = updateMetadata(current.document, target, nextMeta);
        return result.changed ? { ...current, document: result.document } : current;
      });
    },

    syncSpreadsheetDocument(nextDocument) {
      let changed = false;
      store.setState((current) => {
        if (current.document.spreadsheet === nextDocument) {
          return current;
        }

        changed = true;

        return {
          ...current,
          document: {
            ...current.document,
            spreadsheet: cloneDocument({ ...current.document, spreadsheet: nextDocument })
              .spreadsheet,
          },
        };
      });

      if (changed) {
        void refreshDerivedState();
      }
    },

    setSelectionTarget,

    refreshFieldSources,

    exportDocument() {
      return cloneDocument(store.getState().document);
    },

    getAdapterRegistry() {
      return registry;
    },

    registerFieldSource(provider) {
      registry.fieldSources.set(provider.id, provider);
    },

    registerFieldDrop(adapter) {
      registry.fieldDrops.set(adapter.id, adapter);
    },

    registerPreview(adapter) {
      registry.previews.set(adapter.id, adapter);
    },

    registerCodec(adapter) {
      registry.codecs.set(adapter.id, adapter);
    },
  };
}
