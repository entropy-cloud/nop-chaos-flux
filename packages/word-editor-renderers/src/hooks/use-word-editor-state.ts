import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';
import type { WordEditorHostStatusSummary } from '@nop-chaos/word-editor-core';
import {
  resolveRendererSlotContent,
  useCurrentActionScope,
  useHostScope,
  useNamespaceRegistration,
  useRendererEnv,
  useStatusPathPublication,
} from '@nop-chaos/flux-react';
import {
  CanvasEditorBridge,
  createDatasetStore,
  createEditorStore,
  createSavedDocumentData,
  loadRecoveredState,
  normalizeDatasets,
  normalizeDocCharts,
  normalizeDocCodes,
  normalizeWordDocument,
} from '@nop-chaos/word-editor-core';
import type {
  Dataset,
  DocChart,
  DocCode,
  SavedDocumentData,
  WordDocument,
} from '@nop-chaos/word-editor-core';
import { createWordEditorActionProvider } from '../word-editor-action-provider.js';
import type { WordEditorPageSchema } from '../types.js';

declare global {
  interface Window {
    __NOP_WORD_EDITOR_PROBE__?: {
      getState(): {
        document: WordDocument | null;
        datasets: Dataset[];
      runtime: {
        ready: boolean;
        dirty: boolean;
        wordCount: number;
        canUndo: boolean;
        canRedo: boolean;
        totalPages: number;
        scale: number;
      };
      };
    };
  }
}

export function useWordEditorState(props: RendererComponentProps<WordEditorPageSchema>) {
  const emptyDocument = useMemo<WordDocument>(
    () => ({
      header: [],
      main: [],
      footer: [],
      charts: [],
      codes: [],
    }),
    [],
  );
  const initialDocument = useMemo(() => {
    const normalized = normalizeWordDocument(props.props.initialDocument);
    return normalized ?? undefined;
  }, [props.props.initialDocument]);
  const initialDatasets = useMemo(() => {
    const normalized = normalizeDatasets(props.props.datasets);
    return normalized.length > 0 ? normalized : undefined;
  }, [props.props.datasets]);
  const recoveredState = useMemo(
    () => loadRecoveredState(initialDatasets),
    [initialDatasets],
  );
  const bridge = useMemo(() => new CanvasEditorBridge(), []);
  const editorStore = useMemo(() => createEditorStore(), []);
  const datasetStore = useMemo(() => createDatasetStore(), []);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const [charts, setCharts] = useState<DocChart[]>(() => normalizeDocCharts(props.props.initialCharts));
  const [codes, setCodes] = useState<DocCode[]>(() => normalizeDocCodes(props.props.initialCodes));
  const [savedDocument, setSavedDocument] = useState<SavedDocumentData | null>(() => {
    return recoveredState.document ??
      (initialDocument
        ? createSavedDocumentData({ data: initialDocument, paperSettings: null })
        : null);
  });
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [activePanel, setActivePanel] = useState<'datasets' | 'fields'>('datasets');
  const [datasetDialogOpen, setDatasetDialogOpen] = useState(false);
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDocumentSaved = useCallback((saved: SavedDocumentData) => {
    setSavedDocument(saved);
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const titleContent = resolveRendererSlotContent(props, 'title');
  const actionScope = useCurrentActionScope();

  const isDirty = useSyncExternalStoreWithSelector(
    editorStore.subscribe,
    editorStore.getState,
    editorStore.getState,
    (state) => state.isDirty,
  );

  const wordCount = useSyncExternalStoreWithSelector(
    editorStore.subscribe,
    editorStore.getState,
    editorStore.getState,
    (state) => state.wordCount,
  );

  const selection = useSyncExternalStoreWithSelector(
    editorStore.subscribe,
    editorStore.getState,
    editorStore.getState,
    (state) => state.selection,
  );

  const editorRuntime = useSyncExternalStoreWithSelector(
    editorStore.subscribe,
    editorStore.getState,
    editorStore.getState,
    (state) => ({
      ready: state.isReady,
      dirty: state.isDirty,
      wordCount: state.wordCount,
      canUndo: state.selection.undo,
      canRedo: state.selection.redo,
      totalPages: state.totalPages,
      scale: state.scale,
    }),
    shallowEqual,
  );

  const datasets = useSyncExternalStoreWithSelector(
    datasetStore.subscribe,
    datasetStore.getState,
    datasetStore.getState,
    (state) => state.datasets,
  );

  const runtimeHostSummary = useMemo(
    () => ({
      ready: editorRuntime.ready,
      dirty: editorRuntime.dirty,
      wordCount: editorRuntime.wordCount,
      canUndo: editorRuntime.canUndo,
      canRedo: editorRuntime.canRedo,
      totalPages: editorRuntime.totalPages,
      scale: editorRuntime.scale,
      datasetCount: datasets.length,
      chartCount: charts.length,
      codeCount: codes.length,
    }),
    [charts.length, codes.length, datasets.length, editorRuntime],
  );

  const hostScopeData = useMemo(
    () => ({
      document: savedDocument?.data ?? emptyDocument,
      datasets,
      runtime: runtimeHostSummary,
      selection,
    }),
    [datasets, emptyDocument, runtimeHostSummary, savedDocument?.data, selection],
  );

  const hostScope = useHostScope(hostScopeData, props.path, 'word-editor');
  const env = useRendererEnv();

  const actionProvider = useMemo(
    () =>
      createWordEditorActionProvider({
        bridge,
        editorStore,
        datasetStore,
        getCharts: () => charts,
        setCharts,
        getCodes: () => codes,
        setCodes,
        getPaperSettings: () => editorStore.getState().paperSettings,
        saveEvent: props.events.onSave,
        onDocumentSaved: handleDocumentSaved,
      }),
    [
      bridge,
      charts,
      codes,
      datasetStore,
      editorStore,
      props.events.onSave,
      handleDocumentSaved,
    ],
  );

  useNamespaceRegistration(actionScope, 'word-editor', actionProvider);

  useEffect(() => {
    if (recoveredState.datasets.length > 0) {
      datasetStore.load(recoveredState.datasets);
    }
  }, [datasetStore, recoveredState.datasets]);

  const statusPath =
    typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;

  useStatusPathPublication<WordEditorHostStatusSummary>(
    props.node.scope.parent ?? props.node.scope,
    statusPath,
      {
        kind: 'word-editor',
        dirty: editorRuntime.dirty,
        busy: isSaving,
        canUndo: editorRuntime.canUndo,
        canRedo: editorRuntime.canRedo,
        wordCount: editorRuntime.wordCount,
      datasetCount: datasets.length,
        chartCount: charts.length,
        codeCount: codes.length,
      },
  );

  const editingDataset = editingDatasetId
    ? datasets.find((ds) => ds.id === editingDatasetId)
    : null;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.__NOP_WORD_EDITOR_PROBE__ = {
      getState() {
        return {
          document: savedDocument?.data ?? null,
          datasets: datasetStore.getAll(),
          runtime: editorRuntime,
        };
      },
    };

    return () => {
      delete window.__NOP_WORD_EDITOR_PROBE__;
    };
  }, [datasetStore, editorRuntime, savedDocument]);

  return {
    bridge,
    editorStore,
    datasetStore,
    initialDocument,
    recoveredState,
    rootRef,
    mountedRef,
    charts,
    setCharts,
    codes,
    setCodes,
    savedDocument,
    setSavedDocument,
    isDirty,
    wordCount,
    selection,
    editorRuntime,
    datasets,
    hostScope,
    env,
    actionScope,
    titleContent,
    actionProvider,
    statusPath,
    leftCollapsed,
    setLeftCollapsed,
    rightCollapsed,
    setRightCollapsed,
    activePanel,
    setActivePanel,
    datasetDialogOpen,
    setDatasetDialogOpen,
    editingDatasetId,
    setEditingDatasetId,
    editingDataset,
    isSaving,
    setIsSaving,
  };
}
