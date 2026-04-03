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
  getCodecId,
  getPreviewProviderId,
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
      getSnapshot: () => store.getState(),
    });

    const panels = await resolveInspectorPanelsForTarget({
      config,
      document: snapshot.document,
      adapters: registry,
      target: snapshot.selectionTarget,
      profile,
      providersByKind: inspectorProvidersByKind,
      designer: store.getState(),
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
              applyFieldDrop(current.document, command.field, command.target);
              store.setState({ fieldDrag: { active: false } });
              return { ok: true, changed: true };
            }

            const adapterContext = createAdapterContext({
              config,
              document: current.document,
              designer: current,
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
            const changed = writeMetadata(current.document, command.target, nextMeta);

            return { ok: true, changed };
          });
        }

        case 'report-designer:replaceMeta': {
          return withDerivedRefresh(async () => {
            const current = store.getState();
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

          const previewProviderId = getPreviewProviderId(config, profile);
          if (!previewProviderId) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode },
            }));
            return { ok: false, changed: false, error: new Error('No preview provider configured') };
          }

          const previewAdapter = registry.previews.get(previewProviderId);
          if (!previewAdapter) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode },
            }));
            return { ok: false, changed: false, error: new Error(`Preview adapter not found: ${previewProviderId}`) };
          }

          try {
            const result = await previewAdapter.preview({
              document: cloneDocument(store.getState().document),
              mode: command.mode,
              params: command.args,
              context: createAdapterContext({
                config,
                document: store.getState().document,
                designer: store.getState(),
                profile,
              }),
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
          const codecId = getCodecId(profile);
          if (!codecId) {
            return { ok: false, changed: false, error: new Error('No codec configured in profile') };
          }
          const codec = registry.codecs.get(codecId);
          if (!codec) {
            return { ok: false, changed: false, error: new Error(`Codec not found: ${codecId}`) };
          }
          const imported = await codec.importDocument(
            command.payload,
            createAdapterContext({ config, document: store.getState().document, designer: store.getState(), profile }),
          );
          store.setState((current) => ({
            ...current,
            document: imported,
            selectionTarget: undefined,
          }));
          return { ok: true, changed: true };
        }

        case 'report-designer:exportTemplate': {
          const codecId = getCodecId(profile);
          if (!codecId) {
            return { ok: false, changed: false, error: new Error('No codec configured in profile') };
          }
          const codec = registry.codecs.get(codecId);
          if (!codec) {
            return { ok: false, changed: false, error: new Error(`Codec not found: ${codecId}`) };
          }
          const exported = await codec.exportDocument(
            store.getState().document,
            command.format,
            createAdapterContext({ config, document: store.getState().document, designer: store.getState(), profile }),
          );
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
      getSnapshot: () => store.getState(),
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
