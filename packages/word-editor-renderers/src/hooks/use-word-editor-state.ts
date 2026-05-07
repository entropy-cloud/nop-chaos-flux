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

export function useWordEditorState(props: RendererComponentProps<WordEditorPageSchema>) {
  const initialDocument = props.props.initialDocument as WordDocument | undefined;
  const initialDatasets = props.props.datasets as Dataset[] | undefined;
  const recoveredState = useMemo(
    () => loadRecoveredState(initialDatasets),
    [initialDatasets],
  );
  const bridge = useMemo(() => new CanvasEditorBridge(), []);
  const editorStore = useMemo(() => createEditorStore(), []);
  const datasetStore = useMemo(() => createDatasetStore(), []);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const [charts, setCharts] = useState<DocChart[]>(
    () => (props.props.initialCharts as DocChart[] | undefined) ?? [],
  );
  const [codes, setCodes] = useState<DocCode[]>(
    () => (props.props.initialCodes as DocCode[] | undefined) ?? [],
  );
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

  const updateSavedDocumentExtras = useCallback(
    (extras: { charts: DocChart[]; codes: DocCode[] }) => {
      setSavedDocument((current) => {
        if (!current) return current;
        return {
          ...current,
          data: {
            ...current.data,
            charts: extras.charts,
            codes: extras.codes,
          },
        };
      });
    },
    [],
  );

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
      currentPage: state.currentPage,
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
      currentPage: editorRuntime.currentPage,
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
      document: savedDocument?.data ?? {
        header: [],
        main: [],
        footer: [],
        charts,
        codes,
      },
      datasets,
      runtime: runtimeHostSummary,
      selection,
    }),
    [charts, codes, datasets, runtimeHostSummary, savedDocument?.data, selection],
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
        saveEvent: props.events.onSave,
        onDocumentSaved: updateSavedDocumentExtras,
      }),
    [
      bridge,
      charts,
      codes,
      datasetStore,
      editorStore,
      props.events.onSave,
      updateSavedDocumentExtras,
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
      busy: false,
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
  };
}
