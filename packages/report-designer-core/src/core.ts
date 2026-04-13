import { createStore } from 'zustand/vanilla';
import type {
  ReportDesignerConfig,
  ReportTemplateDocument,
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
  MetadataBag,
  FieldSourceSnapshot,
} from './types.js';
import {
  getTargetMeta,
  getDefaultSelectionTarget,
} from './types.js';
import type {
  ReportDesignerCommand,
  ReportDesignerCommandResult,
} from './commands.js';
import type {
  ReportDesignerAdapterRegistry,
  InspectorProvider,
  InspectorPanelDescriptor,
  FieldDropAdapter,
  ReportDesignerProfile,
} from './adapters.js';
import {
  getProfileFieldDropIds,
  resolveRegistry,
} from './runtime/registry.js';
import {
  cloneDocument,
  cloneMetadataBag,
  writeMetadata,
} from './runtime/metadata.js';
import {
  buildInspectorProvidersByKind,
  getProfileInspectorIds,
  resolveInspectorPanelsForTarget,
} from './runtime/inspector-panels.js';
import {
  getProfileFieldSourceIds,
  loadFieldSources,
} from './runtime/field-sources.js';
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
  setSelectionTarget(target?: ReportSelectionTarget): Promise<void>;
  getInspectorPanels(): InspectorPanelDescriptor[];
  refreshFieldSources(): Promise<FieldSourceSnapshot[]>;
  exportDocument(): ReportTemplateDocument;
  getAdapterRegistry(): ReportDesignerAdapterRegistry;
  registerFieldSource(provider: import('./adapters.js').FieldSourceProvider): void;
  registerInspector(provider: InspectorProvider): void;
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
  const selectedInspectorIds = new Set(getProfileInspectorIds(config, profile));
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
  const configuredInspectorProviders = (config.inspector?.providers ?? []).filter((provider) => selectedInspectorIds.has(provider.id));
  const inspectorProvidersByKind = buildInspectorProvidersByKind(configuredInspectorProviders);
  const initialSelectionTarget = getDefaultSelectionTarget(initialDocument);
  let inspectorPanelsCache: InspectorPanelDescriptor[] = [];

  const store = createStore<ReportDesignerInternalState>(() => ({
    document: initialDocument,
    selectionTarget: initialSelectionTarget,
    inspector: {
      open: false,
      providerIds: [],
      panelIds: [],
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

    const fieldSources = await loadFieldSources({
      config,
      document: snapshot.document,
      adapters: registry,
      profile,
      selectedFieldSourceIds,
      staticFieldSourceTemplates,
      getSnapshot: () => buildSnapshot(store.getState()),
    });

    const panels = await resolveInspectorPanelsForTarget({
      config,
      document: snapshot.document,
      adapters: registry,
      target: snapshot.selectionTarget,
      profile,
      providersByKind: inspectorProvidersByKind,
      designer: buildSnapshot(store.getState()),
    });

    const providerIds = panels.map((panel) => panel.id);
    inspectorPanelsCache = panels.map((panel) => ({ ...panel }));

    store.setState((current) => ({
      ...current,
      fieldSources,
      inspector: {
        ...current.inspector,
        providerIds,
        panelIds: panels.map((panel) => panel.id),
        activePanelId: current.inspector.activePanelId && panels.some((panel) => panel.id === current.inspector.activePanelId)
          ? current.inspector.activePanelId
          : panels[0]?.id,
        loading: false,
        error: undefined,
      },
    }));

    return panels;
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

  function pushUndoEntry(current: ReportDesignerInternalState): Partial<ReportDesignerInternalState> {
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
      const current = store.getState();
      writeMetadata(current.document, target, nextMeta);
    },

    setSelectionTarget,

    getInspectorPanels() {
      return inspectorPanelsCache.map((panel) => ({ ...panel }));
    },

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

    registerInspector(provider) {
      registry.inspectors.set(provider.id, provider);
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
