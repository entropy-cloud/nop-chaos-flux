import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { ArrowLeft, Save, FileText, Database, Columns, Type } from 'lucide-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { shallowEqual } from '@nop-chaos/flux-core';
import type { WordEditorHostStatusSummary } from '@nop-chaos/word-editor-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentActionScope,
  useHostScope,
  useNamespaceRegistration,
  WorkbenchShell,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { publishOwnerStatus } from '@nop-chaos/flux-react';
import {
  CanvasEditorBridge,
  createDatasetStore,
  createEditorStore,
  createSavedDocumentData,
  loadDatasets,
} from '@nop-chaos/word-editor-core';
import type {
  DatasetSourceType,
  DataColumnInput,
  Dataset,
  DocChart,
  DocCode,
  SavedDocumentData,
  WordDocument,
} from '@nop-chaos/word-editor-core';
import { Button, cn, Tabs, TabsList, TabsTrigger, TabsContent } from '@nop-chaos/ui';
import { EditorCanvas } from './editor-canvas.js';
import { createWordEditorActionProvider } from './word-editor-action-provider.js';
import { RibbonToolbar } from './toolbar/ribbon-toolbar.js';
import { OutlinePanel } from './panels/outline-panel.js';
import { DatasetPanel } from './panels/dataset-panel.js';
import { FieldList } from './panels/field-list.js';
import { DatasetDialog } from './dialogs/dataset-dialog.js';
import { useWordEditorShortcuts } from './hooks/use-word-editor-shortcuts.js';
import type { WordEditorPageSchema } from './types.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

export function WordEditorPage(props: RendererComponentProps<WordEditorPageSchema>) {
  const bridge = useMemo(() => new CanvasEditorBridge(), []);
  const editorStore = useMemo(() => createEditorStore(), []);
  const datasetStore = useMemo(() => createDatasetStore(), []);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const [activePanel, setActivePanel] = useState<'datasets' | 'fields'>('datasets');
  const [datasetDialogOpen, setDatasetDialogOpen] = useState(false);
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [charts, setCharts] = useState<DocChart[]>(
    () => (props.props.initialCharts as DocChart[] | undefined) ?? [],
  );
  const [codes, setCodes] = useState<DocCode[]>(
    () => (props.props.initialCodes as DocCode[] | undefined) ?? [],
  );
  const [savedDocument, setSavedDocument] = useState<SavedDocumentData | null>(() => {
    const initialDocument = props.props.initialDocument as WordDocument | undefined;
    return initialDocument
      ? createSavedDocumentData({ data: initialDocument, paperSettings: null })
      : null;
  });
  const updateSavedDocumentExtras = useCallback((extras: { charts: DocChart[]; codes: DocCode[] }) => {
    setSavedDocument((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        data: {
          ...current.data,
          charts: extras.charts,
          codes: extras.codes,
        },
      };
    });
  }, []);
  useEffect(() => {
    return () => {
      if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
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

  const hostScope = useHostScope(
    hostScopeData,
    props.path,
    'word-editor',
  );

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
    [bridge, charts, codes, datasetStore, editorStore, props.events.onSave, updateSavedDocumentExtras],
  );

  useNamespaceRegistration(actionScope, 'word-editor', actionProvider);

  useEffect(() => {
    const savedDatasets = loadDatasets();
    if (savedDatasets.length > 0) {
      datasetStore.load(savedDatasets);
    }
    const initialDatasets = props.props.datasets as Dataset[] | undefined;
    if (initialDatasets && initialDatasets.length > 0) {
      datasetStore.load(initialDatasets);
    }
  }, [datasetStore, props.props.datasets]);

  const handleSave = useCallback(async () => {
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    try {
      const result = await actionProvider.invoke('save', undefined, {} as any);
      if (result.ok) {
        setSaveMessage(t('wordEditor.saved'));
        if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
        saveMessageTimerRef.current = setTimeout(() => setSaveMessage(null), 2000);
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [actionProvider]);

  useWordEditorShortcuts({ bridge, onSave: handleSave, scopeRef: rootRef });

  const handleBack = useCallback(() => {
    void props.events.onBack?.();
  }, [props.events]);

  const handleAddDataset = () => {
    setEditingDatasetId(null);
    setDatasetDialogOpen(true);
  };

  const handleEditDataset = (datasetId: string) => {
    setEditingDatasetId(datasetId);
    setDatasetDialogOpen(true);
  };

  const handleSaveDataset = useCallback(
    (data: {
      name: string;
      description: string;
      type: DatasetSourceType;
      columns: DataColumnInput[];
    }) => {
      const datasetData: Omit<Dataset, 'id'> = {
        name: data.name,
        description: data.description,
        type: data.type,
        columns: data.columns.map((col) => ({
          name: col.name ?? '',
          label: col.label ?? '',
          description: col.description,
          type: (col.type as DatasetSourceType) ?? 'static',
        })),
      };
      if (editingDatasetId) {
        datasetStore.update(editingDatasetId, datasetData);
      } else {
        datasetStore.add(datasetData);
      }
      setDatasetDialogOpen(false);
      setEditingDatasetId(null);
    },
    [editingDatasetId, datasetStore],
  );

  const handleFieldClick = useCallback(
    (datasetName: string, columnName: string) => {
      bridge.insertFieldExpression(datasetName, columnName);
    },
    [bridge],
  );

  const handleInsertExpr = useCallback(
    (expr: string) => {
      bridge.insertTemplateExpression({
        kind: 'el',
        expr: expr.replace(/^\$\{/, '').replace(/\}$/, ''),
      });
    },
    [bridge],
  );

  const handleInsertTag = useCallback(
    (tagName: string) => {
      bridge.insertTemplateExpression({
        kind: 'tag-open',
        expr: '',
        tagName,
      });
    },
    [bridge],
  );

  const handleChartSave = useCallback(
    (_chart: DocChart) => {
      bridge.insertChart(_chart);
      setCharts((current) => [...current, _chart]);
    },
    [bridge],
  );

  const handleCodeSave = useCallback(
    (_code: DocCode) => {
      bridge.insertCode(_code);
      setCodes((current) => [...current, _code]);
    },
    [bridge],
  );

  const statusPath =
    typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;

  useEffect(() => {
    if (!statusPath) {
      return;
    }

    const summary: WordEditorHostStatusSummary = {
      kind: 'word-editor',
      dirty: editorRuntime.dirty,
      busy: false,
      canUndo: editorRuntime.canUndo,
      canRedo: editorRuntime.canRedo,
      wordCount: editorRuntime.wordCount,
      datasetCount: datasets.length,
      chartCount: charts.length,
      codeCount: codes.length,
    };
    publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, summary);
  }, [charts.length, codes.length, datasets.length, editorRuntime, props.node.scope, statusPath]);

  const editingDataset = editingDatasetId
    ? datasets.find((ds) => ds.id === editingDatasetId)
    : null;

  const headerSlot = (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-[var(--nop-nav-surface)]">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleBack}
            title={t('wordEditor.back')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--nop-accent)]" />
            <h1 className="text-lg font-semibold text-[var(--nop-text-strong)]">
              {hasRendererSlotContent(titleContent)
                ? asReactNode(titleContent)
                : t('wordEditor.title')}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--nop-body-copy)]">
            <Type className="w-3.5 h-3.5 opacity-70" />
            <span className="tabular-nums">
              {t('wordEditor.words', { count: wordCount.toLocaleString() })}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant={isDirty ? 'default' : 'outline'}
          size="sm"
          onClick={() => void handleSave()}
          className="rounded-full"
        >
          <Save className="w-4 h-4" />
          {saveMessage || t('wordEditor.save')}
        </Button>
      </div>
      {props.regions.toolbar ? (
        asReactNode(
          props.helpers.render(props.regions.toolbar.templateNode, {
            scope: hostScope,
            actionScope,
          }),
        )
      ) : (
        <RibbonToolbar
          bridge={bridge}
          store={editorStore}
          onInsertExpr={handleInsertExpr}
          onInsertTag={handleInsertTag}
          onChartSave={handleChartSave}
          onCodeSave={handleCodeSave}
        />
      )}
    </div>
  );

  const defaultLeftPanelSlot = (
    <Tabs data-orientation="horizontal" className="flex-col gap-0 h-full">
      <TabsList variant="line" className="w-full rounded-none border-b border-border px-0 shrink-0">
        <TabsTrigger
          value="datasets"
          data-state={activePanel === 'datasets' ? 'active' : 'inactive'}
          onClick={() => setActivePanel('datasets')}
          className="flex-1 py-2.5"
        >
          <Database className="w-3.5 h-3.5" />
          <span>{t('wordEditor.datasets')}</span>
        </TabsTrigger>
        <TabsTrigger
          value="fields"
          data-state={activePanel === 'fields' ? 'active' : 'inactive'}
          onClick={() => setActivePanel('fields')}
          className="flex-1 py-2.5"
        >
          <Columns className="w-3.5 h-3.5" />
          <span>{t('wordEditor.fields')}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value={activePanel} className="flex-1 min-h-0 overflow-hidden">
        {activePanel === 'datasets' ? (
          <DatasetPanel
            store={datasetStore}
            onAddDataset={handleAddDataset}
            onEditDataset={handleEditDataset}
          />
        ) : (
          <FieldList store={datasetStore} onFieldClick={handleFieldClick} />
        )}
      </TabsContent>
    </Tabs>
  );

  const canvasSlot = (
    <div className="flex flex-col h-full min-h-0 overflow-auto bg-[var(--nop-playground-stage-bg)]">
      <EditorCanvas
        editorStore={editorStore}
        bridge={bridge}
        initialDocument={props.props.initialDocument as WordDocument | undefined}
        charts={charts}
        codes={codes}
        onAutosave={setSavedDocument}
      />
    </div>
  );

  const leftPanelSlot = props.regions.leftPanel
    ? asReactNode(
        props.helpers.render(props.regions.leftPanel.templateNode, {
          scope: hostScope,
          actionScope,
        }),
      )
    : defaultLeftPanelSlot;

  const rightPanelSlot = props.regions.rightPanel ? (
    asReactNode(
      props.helpers.render(props.regions.rightPanel.templateNode, {
        scope: hostScope,
        actionScope,
      }),
    )
  ) : (
    <OutlinePanel bridge={bridge} />
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        'nop-word-editor-page h-screen overflow-hidden bg-[var(--nop-app-bg)]',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
    >
      <WorkbenchShell
        style={{ padding: 0 }}
        header={headerSlot}
        leftPanel={leftPanelSlot}
        leftCollapsed={leftCollapsed}
        onLeftToggle={() => setLeftCollapsed((v) => !v)}
        leftLabel={t('wordEditor.expandFieldPanel')}
        canvas={canvasSlot}
        rightPanel={rightPanelSlot}
        rightCollapsed={rightCollapsed}
        onRightToggle={() => setRightCollapsed((v) => !v)}
        rightLabel={t('wordEditor.expandOutline')}
        dialogs={
          <DatasetDialog
            key={`${editingDatasetId ?? 'new'}:${datasetDialogOpen ? 'open' : 'closed'}`}
            open={datasetDialogOpen}
            onClose={() => {
              setDatasetDialogOpen(false);
              setEditingDatasetId(null);
            }}
            onSave={handleSaveDataset}
            initialData={
              editingDataset
                ? {
                    name: editingDataset.name,
                    description: editingDataset.description,
                    type: editingDataset.type,
                    columns: editingDataset.columns.map((col) => ({
                      name: col.name,
                      label: col.label,
                      description: col.description,
                      type: col.type,
                    })),
                  }
                : null
            }
          />
        }
      />
    </div>
  );
}
