import { useMemo, useEffect, useState, useCallback } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import { ArrowLeft, Save, FileText, Database, Columns, Type } from 'lucide-react'
import { CanvasEditorBridge, createDatasetStore, createEditorStore, saveDocument, loadDocument, saveDatasets, loadDatasets } from '@nop-chaos/word-editor-core'
import type { DataSetSourceType, DataColumnInput, DataSet, DocChart, DocCode } from '@nop-chaos/word-editor-core'
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@nop-chaos/ui'
import { WorkbenchShell } from '@nop-chaos/flux-react'
import { EditorCanvas } from './EditorCanvas.js'
import { RibbonToolbar } from './toolbar/RibbonToolbar.js'
import { OutlinePanel } from './panels/OutlinePanel.js'
import { DatasetPanel } from './panels/DatasetPanel.js'
import { FieldList } from './panels/FieldList.js'
import { DatasetDialog } from './dialogs/DatasetDialog.js'
import { useWordEditorShortcuts } from './hooks/useWordEditorShortcuts.js'

interface WordEditorPageProps {
  onBack: () => void
}

export function WordEditorPage({ onBack }: WordEditorPageProps) {
  const bridge = useMemo(() => new CanvasEditorBridge(), [])
  const editorStore = useMemo(() => createEditorStore(), [])
  const datasetStore = useMemo(() => createDatasetStore(), [])
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'datasets' | 'fields'>('datasets')
  const [datasetDialogOpen, setDatasetDialogOpen] = useState(false)
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  const isDirty = useSyncExternalStoreWithSelector(
    editorStore.subscribe,
    editorStore.getState,
    editorStore.getState,
    (state) => state.isDirty
  )

  const wordCount = useSyncExternalStoreWithSelector(
    editorStore.subscribe,
    editorStore.getState,
    editorStore.getState,
    (state) => state.wordCount
  )

  useEffect(() => {
    const savedDocument = loadDocument()
    if (savedDocument) {
      console.log('Loaded saved document:', savedDocument.savedAt)
    }
    const savedDatasets = loadDatasets()
    if (savedDatasets.length > 0) {
      datasetStore.load(savedDatasets)
    }
  }, [datasetStore])

  const handleSave = useCallback(() => {
    const success = saveDocument(bridge)
    if (success) {
      saveDatasets(datasetStore.getAll())
      editorStore.setDirty(false)
      setSaveMessage('Saved')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }, [bridge, datasetStore, editorStore])

  useWordEditorShortcuts({ bridge, onSave: handleSave })

  const handleBack = useCallback(() => {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
    onBack()
  }, [isDirty, onBack])

  const handleAddDataset = () => {
    setEditingDatasetId(null)
    setDatasetDialogOpen(true)
  }

  const handleEditDataset = (datasetId: string) => {
    setEditingDatasetId(datasetId)
    setDatasetDialogOpen(true)
  }

  const handleSaveDataset = useCallback((data: { name: string; description: string; type: DataSetSourceType; columns: DataColumnInput[] }) => {
    const datasetData: Omit<DataSet, 'id'> = {
      name: data.name,
      description: data.description,
      type: data.type,
      columns: data.columns.map(col => ({
        name: col.name ?? '',
        label: col.label ?? '',
        description: col.description,
        type: (col.type as DataSetSourceType) ?? 'static'
      }))
    }
    if (editingDatasetId) {
      datasetStore.update(editingDatasetId, datasetData)
    } else {
      datasetStore.add(datasetData)
    }
    setDatasetDialogOpen(false)
    setEditingDatasetId(null)
  }, [editingDatasetId, datasetStore])

  const handleFieldClick = useCallback((datasetName: string, columnName: string) => {
    bridge.insertFieldExpression(datasetName, columnName)
  }, [bridge])

  const handleInsertExpr = useCallback((expr: string) => {
    bridge.insertTemplateExpression({
      kind: 'el',
      expr: expr.replace(/^\$\{/, '').replace(/\}$/, '')
    })
  }, [bridge])

  const handleInsertTag = useCallback((tagName: string) => {
    bridge.insertTemplateExpression({
      kind: 'tag-open',
      expr: '',
      tagName
    })
  }, [bridge])

  const handleChartSave = useCallback((chart: DocChart) => {
    console.log('Chart saved:', chart)
  }, [])

  const handleCodeSave = useCallback((code: DocCode) => {
    console.log('Code saved:', code)
  }, [])

  const editingDataset = editingDatasetId
    ? datasetStore.getState().datasets.find(ds => ds.id === editingDatasetId)
    : null

  const headerSlot = (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-[var(--nop-nav-surface)]">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={handleBack}
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--nop-accent)]" />
            <h1 className="text-lg font-semibold text-[var(--nop-text-strong)]">Word Editor</h1>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--nop-body-copy)]">
            <Type className="w-3.5 h-3.5 opacity-70" />
            <span className="tabular-nums">{wordCount.toLocaleString()} words</span>
          </div>
        </div>
        <Button
          type="button"
          variant={isDirty ? 'default' : 'outline'}
          size="sm"
          onClick={handleSave}
          className="rounded-full"
        >
          <Save className="w-4 h-4" />
          {saveMessage || 'Save'}
        </Button>
      </div>
      <RibbonToolbar bridge={bridge} store={editorStore} onInsertExpr={handleInsertExpr} onInsertTag={handleInsertTag} onChartSave={handleChartSave} onCodeSave={handleCodeSave} />
    </div>
  )

  const leftPanelSlot = (
    <Tabs data-orientation="horizontal" className="flex-col gap-0 h-full">
      <TabsList variant="line" className="w-full rounded-none border-b border-border px-0 shrink-0">
        <TabsTrigger
          value="datasets"
          data-state={activePanel === 'datasets' ? 'active' : 'inactive'}
          onClick={() => setActivePanel('datasets')}
          className="flex-1 py-2.5"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Datasets</span>
        </TabsTrigger>
        <TabsTrigger
          value="fields"
          data-state={activePanel === 'fields' ? 'active' : 'inactive'}
          onClick={() => setActivePanel('fields')}
          className="flex-1 py-2.5"
        >
          <Columns className="w-3.5 h-3.5" />
          <span>Fields</span>
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
          <FieldList
            store={datasetStore}
            onFieldClick={handleFieldClick}
          />
        )}
      </TabsContent>
    </Tabs>
  )

  const canvasSlot = (
    <div className="flex flex-col h-full min-h-0 overflow-auto bg-[var(--nop-playground-stage-bg)]">
      <EditorCanvas editorStore={editorStore} bridge={bridge} />
    </div>
  )

  return (
    <div className="nop-word-editor h-screen overflow-hidden bg-[var(--nop-app-bg)]">
      <WorkbenchShell
        style={{ padding: 0 }}
        header={headerSlot}
        leftPanel={leftPanelSlot}
        leftCollapsed={leftCollapsed}
        onLeftToggle={() => setLeftCollapsed(v => !v)}
        leftLabel="Expand field panel"
        canvas={canvasSlot}
        rightPanel={<OutlinePanel bridge={bridge} />}
        rightCollapsed={rightCollapsed}
        onRightToggle={() => setRightCollapsed(v => !v)}
        rightLabel="Expand outline"
        dialogs={
          <DatasetDialog
            key={`${editingDatasetId ?? 'new'}:${datasetDialogOpen ? 'open' : 'closed'}`}
            open={datasetDialogOpen}
            onClose={() => { setDatasetDialogOpen(false); setEditingDatasetId(null) }}
            onSave={handleSaveDataset}
            initialData={editingDataset ? {
              name: editingDataset.name,
              description: editingDataset.description,
              type: editingDataset.type,
              columns: editingDataset.columns.map(col => ({
                name: col.name,
                label: col.label,
                description: col.description,
                type: col.type
              }))
            } : null}
          />
        }
      />
    </div>
  )
}
