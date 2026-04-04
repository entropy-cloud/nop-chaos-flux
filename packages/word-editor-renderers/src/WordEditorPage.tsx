import { useMemo, useEffect, useState, useCallback } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import { ArrowLeft, Save, FileText, Database, Columns, Type } from 'lucide-react'
import { CanvasEditorBridge, createDatasetStore, createEditorStore, saveDocument, loadDocument } from '@nop-chaos/word-editor-core'
import type { DataSetSourceType, DataColumnInput, DataSet, DocChart, DocCode } from '@nop-chaos/word-editor-core'
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  cn
} from '@nop-chaos/ui'
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
  }, [])

  const handleSave = () => {
    const success = saveDocument(bridge)
    if (success) {
      editorStore.setDirty(false)
      setSaveMessage('Document saved')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  useWordEditorShortcuts({ bridge, onSave: handleSave })

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

  return (
    <main className="flex flex-col h-screen bg-[var(--nop-app-bg)] overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--nop-border)] bg-[var(--nop-nav-surface)] shrink-0">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onBack}
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
      </header>

      <div className="shrink-0">
        <RibbonToolbar bridge={bridge} store={editorStore} onInsertExpr={handleInsertExpr} onInsertTag={handleInsertTag} onChartSave={handleChartSave} onCodeSave={handleCodeSave} />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-[280px] border-r border-[var(--nop-border)] bg-[var(--nop-surface)] flex flex-col overflow-hidden">
          <Tabs data-orientation="horizontal" className="flex-col gap-0 h-full">
            <TabsList variant="line" className="w-full rounded-none border-b border-[var(--nop-border)] px-0 shrink-0">
              <TabsTrigger
                value="datasets"
                data-state={activePanel === 'datasets' ? 'active' : 'inactive'}
                onClick={() => setActivePanel('datasets')}
                className={cn('flex-1 py-2.5')}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Datasets</span>
              </TabsTrigger>
              <TabsTrigger
                value="fields"
                data-state={activePanel === 'fields' ? 'active' : 'inactive'}
                onClick={() => setActivePanel('fields')}
                className={cn('flex-1 py-2.5')}
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
        </aside>

        <section className="flex-1 min-w-0 bg-[var(--nop-playground-stage-bg)] overflow-auto">
          <EditorCanvas editorStore={editorStore} bridge={bridge} />
        </section>

        <aside className="w-[280px] border-l border-[var(--nop-border)] bg-[var(--nop-surface)] overflow-y-auto">
          <OutlinePanel bridge={bridge} />
        </aside>
      </div>

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
    </main>
  )
}
