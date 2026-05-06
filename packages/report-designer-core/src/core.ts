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
  dispose(): void;
}

export interface CreateReportDesignerCoreOptions {
  document: ReportTemplateDocument;
  config: ReportDesignerConfig;
  adapters?: Partial<ReportDesignerAdapterRegistry>;
  profile?: ReportDesignerProfile;
  onError?: (error: unknown, context: { phase: 'refresh-derived-state'; selectionTarget?: ReportSelectionTarget }) => void;
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
  const { document, config, adapters: providedAdapters, profile, onError } = options;
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
  let disposed = false;
  let refreshDerivedStateController: AbortController | undefined;
  let refreshFieldSourcesController: AbortController | undefined;
  let refreshFieldSourcesPromise: Promise<FieldSourceSnapshot[]> | undefined;
  let refreshFieldSourcesInput:
    | {
        document: ReportTemplateDocument;
      }
    | undefined;
  let previewController: AbortController | undefined;
  let previewRequestId = 0;

  function getFieldSourceRefreshInput() {
    const state = store.getState();
    return {
      document: state.document,
    };
  }

  function matchesFieldSourceRefreshInput(
    left: NonNullable<typeof refreshFieldSourcesInput>,
    right: ReturnType<typeof getFieldSourceRefreshInput>,
  ) {
    return left.document === right.document;
  }

  function createOperationSignal(kind: 'refresh-derived-state' | 'refresh-field-sources') {
    if (disposed) {
      const controller = new AbortController();
      controller.abort();
      return controller.signal;
    }

    const controller = new AbortController();
    if (kind === 'refresh-derived-state') {
      refreshDerivedStateController?.abort();
      refreshDerivedStateController = controller;
    } else {
      refreshFieldSourcesController?.abort();
      refreshFieldSourcesController = controller;
    }

    return controller.signal;
  }

  function clearOperationSignal(
    kind: 'refresh-derived-state' | 'refresh-field-sources',
    signal: AbortSignal,
  ) {
    const current =
      kind === 'refresh-derived-state'
        ? refreshDerivedStateController
        : refreshFieldSourcesController;
    if (current?.signal !== signal) {
      return;
    }

    if (kind === 'refresh-derived-state') {
      refreshDerivedStateController = undefined;
    } else {
      refreshFieldSourcesController = undefined;
    }
  }

  function startPreviewRun() {
    previewController?.abort();
    const controller = new AbortController();
    previewController = controller;
    previewRequestId += 1;
    return { requestId: previewRequestId, signal: controller.signal };
  }

  function cancelPreviewRun() {
    previewController?.abort();
    previewController = undefined;
    previewRequestId += 1;
  }

  function isCurrentPreviewRun(requestId: number) {
    return previewRequestId === requestId;
  }

  async function refreshDerivedState() {
    const signal = createOperationSignal('refresh-derived-state');
    if (signal.aborted) {
      return [];
    }

    const snapshot = store.getState();
    try {
      const fieldSources = await refreshFieldSources();

      if (signal.aborted || disposed) {
        return [];
      }

      const resolvedSchema = resolveInspectorSchemaForTarget({
        config,
        target: snapshot.selectionTarget,
        profile,
      });

      if (!signal.aborted && !disposed) {
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
      }

      return resolvedSchema;
    } catch (error) {
      if (!signal.aborted && !disposed) {
        store.setState((current) => ({
          ...current,
          inspector: {
            ...current.inspector,
            resolvedSchema: undefined,
            loading: false,
            error,
          },
        }));
        onError?.(error, {
          phase: 'refresh-derived-state',
          selectionTarget: snapshot.selectionTarget,
        });
      }
      return [];
    } finally {
      clearOperationSignal('refresh-derived-state', signal);
    }
  }

  async function setSelectionTarget(target?: ReportSelectionTarget) {
    if (disposed) {
      return;
    }

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
    const undoStack = [...current.undoStack, current.document];
    if (undoStack.length > maxDepth) undoStack.shift();
    return { undoStack, redoStack: [] };
  }

  function applyDocumentChange(nextDocument: ReportTemplateDocument): boolean {
    let changed = false;
    store.setState((current) => {
      if (current.document === nextDocument) {
        return current;
      }

      changed = true;
      return {
        ...current,
        ...pushUndoEntry(current),
        document: nextDocument,
      };
    });
    return changed;
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
    startPreviewRun,
    cancelPreviewRun,
    isCurrentPreviewRun,
  };

  async function dispatch(command: ReportDesignerCommand): Promise<ReportDesignerCommandResult> {
    return dispatchReportDesignerCommand(dispatchCtx, command);
  }

  async function refreshFieldSources(): Promise<FieldSourceSnapshot[]> {
    const refreshInput = getFieldSourceRefreshInput();
    if (
      refreshFieldSourcesPromise &&
      refreshFieldSourcesInput &&
      matchesFieldSourceRefreshInput(refreshFieldSourcesInput, refreshInput)
    ) {
      return refreshFieldSourcesPromise;
    }

    const signal = createOperationSignal('refresh-field-sources');
    if (signal.aborted) {
      return [];
    }

    const promise = loadFieldSources({
      config,
      document: refreshInput.document,
      adapters: registry,
      profile,
      selectedFieldSourceIds,
      staticFieldSourceTemplates,
      getSnapshot: () => buildSnapshot(store.getState()),
    })
      .then((fieldSources) => {
        if (signal.aborted || disposed) {
          return [];
        }

        store.setState((current) => ({ ...current, fieldSources }));
        return fieldSources;
      })
      .catch((error) => {
        if (signal.aborted || disposed) {
          return [];
        }

        throw error;
      })
      .finally(() => {
        clearOperationSignal('refresh-field-sources', signal);
        if (refreshFieldSourcesPromise === promise) {
          refreshFieldSourcesPromise = undefined;
          refreshFieldSourcesInput = undefined;
        }
      });

    refreshFieldSourcesPromise = promise;
    refreshFieldSourcesInput = refreshInput;
    return promise;
  }

  void refreshDerivedState().catch((error) => {
    onError?.(error, { phase: 'refresh-derived-state', selectionTarget: store.getState().selectionTarget });
  });

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
      const result = updateMetadata(store.getState().document, target, nextMeta);
      if (!result.changed) {
        return;
      }

      applyDocumentChange(result.document);
    },

    syncSpreadsheetDocument(nextDocument) {
      const currentDocument = store.getState().document;
      const changed = applyDocumentChange({
        ...currentDocument,
        spreadsheet: nextDocument,
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

    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      refreshDerivedStateController?.abort();
      refreshFieldSourcesController?.abort();
      previewController?.abort();
      refreshDerivedStateController = undefined;
      refreshFieldSourcesController = undefined;
      previewController = undefined;
    },
  };
}
