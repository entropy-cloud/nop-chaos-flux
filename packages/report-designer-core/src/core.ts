import { createStore } from 'zustand/vanilla';
import type {
  ReportDesignerConfig,
  ReportTemplateDocument,
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
  MetadataBag,
  FieldDragState,
  FieldSourceSnapshot,
  InspectorRuntimeState,
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
  applyFieldDrop,
  cloneDocument,
  cloneMetadataBag,
  mergeMetadata,
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
import { createAdapterContext } from './runtime/adapter-context.js';
import {
  resolvePreviewAdapter,
  runPreviewCommand,
} from './runtime/preview-commands.js';
import {
  exportTemplateWithCodec,
  importTemplateWithCodec,
  resolveCodecAdapter,
} from './runtime/codec-commands.js';

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

interface ReportDesignerInternalState {
  document: ReportTemplateDocument;
  selectionTarget: ReportSelectionTarget | undefined;
  inspector: InspectorRuntimeState;
  fieldSources: FieldSourceSnapshot[];
  fieldDrag: FieldDragState;
  preview: {
    running: boolean;
    mode?: string;
    lastResult?: unknown;
  };
  undoStack: ReportTemplateDocument[];
  redoStack: ReportTemplateDocument[];
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

  async function withDerivedRefresh<T>(fn: () => Promise<T> | T): Promise<T> {
    const result = await fn();
    await refreshDerivedState();
    return result;
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

  async function dispatch(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult> {
    try {
      switch (command.type) {
        case 'report-designer:dropFieldToTarget': {
          return withDerivedRefresh(async () => {
            const current = store.getState();
            const adapter = Array.from(registry.fieldDrops.values()).find((candidate) =>
              (!allowedFieldDropIds || allowedFieldDropIds.has(candidate.id)) && candidate.canHandle(command.field, command.target),
            );

            if (!adapter) {
              store.setState((s) => ({ ...s, ...pushUndoEntry(s) }));
              applyFieldDrop(current.document, command.field, command.target);
              store.setState({ fieldDrag: { active: false } });
              return { ok: true, changed: true };
            }

            const adapterContext = createAdapterContext({
              config,
              document: current.document,
              designer: buildSnapshot(current),
              profile,
            });
            const currentMeta = getTargetMeta(current.document.semantic, command.target);
            const patch = adapter.mapDropToMetaPatch({
              field: command.field,
              target: command.target,
              currentMeta,
              context: adapterContext,
            });
            const nextMeta = mergeMetadata(currentMeta, patch);
            store.setState((s) => ({ ...s, ...pushUndoEntry(s) }));
            writeMetadata(current.document, command.target, nextMeta);

            store.setState({
              selectionTarget: command.target,
              fieldDrag: {
                active: false,
                sourceId: command.field.sourceId,
                fieldId: command.field.fieldId,
                payload: { ...command.field, data: { ...command.field.data } },
                hoverTarget: command.target,
              },
            });

            return { ok: true, changed: true };
          });
        }

        case 'report-designer:updateMeta': {
          return withDerivedRefresh(async () => {
            const current = store.getState();
            const currentMeta = getTargetMeta(current.document.semantic, command.target);
            const nextMeta = mergeMetadata(currentMeta, command.patch);
            store.setState((s) => ({ ...s, ...pushUndoEntry(s) }));
            const changed = writeMetadata(current.document, command.target, nextMeta);

            return { ok: true, changed };
          });
        }

        case 'report-designer:replaceMeta': {
          return withDerivedRefresh(async () => {
            const current = store.getState();
            store.setState((s) => ({ ...s, ...pushUndoEntry(s) }));
            const changed = writeMetadata(current.document, command.target, command.nextMeta);

            return { ok: true, changed };
          });
        }

        case 'report-designer:openInspector': {
          await setSelectionTarget(command.target ?? store.getState().selectionTarget);
          store.setState((current) => ({
            ...current,
            inspector: { ...current.inspector, open: true },
          }));
          return { ok: true, changed: true };
        }

        case 'report-designer:closeInspector': {
          const wasOpen = store.getState().inspector.open;
          store.setState((current) => ({
            ...current,
            inspector: { ...current.inspector, open: false },
          }));
          return { ok: true, changed: wasOpen };
        }

        case 'report-designer:preview': {
          store.setState((current) => ({
            ...current,
            preview: { ...current.preview, running: true, mode: command.mode },
          }));

          const previewResolution = resolvePreviewAdapter({
            config,
            adapters: registry,
            profile,
          });
          if ('error' in previewResolution) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode },
            }));
            return { ok: false, changed: false, error: previewResolution.error };
          }

          try {
            const result = await runPreviewCommand({
              adapter: previewResolution.adapter,
              config,
              document: store.getState().document,
              designer: buildSnapshot(store.getState()),
              profile,
              mode: command.mode,
              commandArgs: command.args,
            });

            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode, lastResult: result },
            }));

            return { ok: result.ok, changed: false, data: result.data, error: result.error };
          } catch (err) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode },
            }));
            return { ok: false, changed: false, error: err };
          }
        }

        case 'report-designer:importTemplate': {
          const codecResolution = resolveCodecAdapter({ adapters: registry, profile });
          if ('error' in codecResolution) {
            return { ok: false, changed: false, error: codecResolution.error };
          }
          const imported = await importTemplateWithCodec({
            adapter: codecResolution.adapter,
            payload: command.payload,
            config,
            document: store.getState().document,
            designer: buildSnapshot(store.getState()),
            profile,
          });
          store.setState((current) => ({
            ...current,
            document: imported,
            selectionTarget: undefined,
          }));
          return { ok: true, changed: true };
        }

        case 'report-designer:exportTemplate': {
          const codecResolution = resolveCodecAdapter({ adapters: registry, profile });
          if ('error' in codecResolution) {
            return { ok: false, changed: false, error: codecResolution.error };
          }
          const exported = await exportTemplateWithCodec({
            adapter: codecResolution.adapter,
            document: store.getState().document,
            format: command.format,
            config,
            designer: buildSnapshot(store.getState()),
            profile,
          });
          return { ok: true, changed: false, data: exported };
        }

        case 'report-designer:stopPreview': {
          store.setState((current) => ({
            ...current,
            preview: { ...current.preview, running: false },
          }));
          return { ok: true, changed: true };
        }

        case 'report-designer:undo': {
          const current = store.getState();
          if (current.undoStack.length === 0) {
            return { ok: false, changed: false, error: 'Nothing to undo' };
          }
          const undoStack = [...current.undoStack];
          const prevDocument = undoStack.pop()!;
          const redoStack = [...current.redoStack, cloneDocument(current.document)];
          store.setState((s) => ({
            ...s,
            document: prevDocument,
            undoStack,
            redoStack,
          }));
          await refreshDerivedState();
          return { ok: true, changed: true };
        }

        case 'report-designer:redo': {
          const current = store.getState();
          if (current.redoStack.length === 0) {
            return { ok: false, changed: false, error: 'Nothing to redo' };
          }
          const redoStack = [...current.redoStack];
          const nextDocument = redoStack.pop()!;
          const undoStack = [...current.undoStack, cloneDocument(current.document)];
          store.setState((s) => ({
            ...s,
            document: nextDocument,
            undoStack,
            redoStack,
          }));
          await refreshDerivedState();
          return { ok: true, changed: true };
        }

        case 'report-designer:save': {
          const exported = cloneDocument(store.getState().document);
          return { ok: true, changed: false, data: exported };
        }

        default:
          return { ok: false, changed: false, error: `Unknown command: ${(command as any).type}` };
      }
    } catch (err) {
      return { ok: false, changed: false, error: err };
    }
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
