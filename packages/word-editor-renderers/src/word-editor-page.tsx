import { useCallback } from 'react';
import { ArrowLeft, Save, FileText, Database, Columns, Type, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  WorkbenchShell,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn, Tabs, TabsList, TabsTrigger, TabsContent } from '@nop-chaos/ui';
import type { SavedDocumentData } from '@nop-chaos/word-editor-core';
import { persistSavedDocument } from '@nop-chaos/word-editor-core';
import { EditorCanvas } from './editor-canvas.js';
import { RibbonToolbar } from './toolbar/ribbon-toolbar.js';
import { OutlinePanel } from './panels/outline-panel.js';
import { DatasetPanel } from './panels/dataset-panel.js';
import { FieldList } from './panels/field-list.js';
import { DatasetDialog } from './dialogs/dataset-dialog.js';
import { useWordEditorShortcuts } from './hooks/use-word-editor-shortcuts.js';
import { useWordEditorState } from './hooks/use-word-editor-state.js';
import { useWordEditorSave } from './hooks/use-word-editor-save.js';
import { useWordEditorActions } from './hooks/use-word-editor-actions.js';
import type { WordEditorPageSchema } from './types.js';

function collectDocumentText(value: unknown): string {
  if (!Array.isArray(value)) {
    return '';
  }

  const parts = value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return '';
      }

      const text = 'value' in item ? item.value : undefined;
      return typeof text === 'string' ? text.trim() : '';
    })
    .filter((part) => part.length > 0);

  return parts.join(' ').trim();
}

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

export function WordEditorPage(props: RendererComponentProps<WordEditorPageSchema>) {
  const {
    actionProvider,
    actionScope,
    activePanel,
    bridge,
    datasetDialogOpen,
    datasetStore,
    editingDataset,
    editingDatasetId,
    editorStore,
    env,
    hostScope,
    initialDocument,
    isDirty,
    isSaving,
    leftCollapsed,
    mountedRef,
    recoveredState,
    rightCollapsed,
    rootRef,
    setActivePanel,
    setDatasetDialogOpen,
    setEditingDatasetId,
    setLeftCollapsed,
    setRightCollapsed,
    setSavedDocument,
    savedDocument,
    titleContent,
    wordCount,
    setIsSaving,
  } = useWordEditorState(props);

  const { handleSave, saveMessage } = useWordEditorSave({
    actionProvider,
    env,
    mountedRef,
    setSaving: setIsSaving,
  });
  const savedPreviewText = collectDocumentText(savedDocument?.data.main);
  const initialPreviewText = collectDocumentText(recoveredState.document?.data.main ?? initialDocument?.main);
  const visiblePreviewText = savedPreviewText || initialPreviewText;

  const handleAutosave = useCallback((saved: SavedDocumentData) => {
    setSavedDocument(saved);
    try {
      persistSavedDocument(saved);
    } catch {
      // Autosave persistence is best-effort; non-critical if localStorage is unavailable.
    }
  }, [setSavedDocument]);

  const actions = useWordEditorActions({
    bridge,
    datasetStore,
    editorStore,
    editingDatasetId,
    setDatasetDialogOpen,
    setEditingDatasetId,
    onBack: props.events.onBack as
      | ((event: React.MouseEvent<HTMLButtonElement>) => unknown)
      | undefined,
  });

  useWordEditorShortcuts({ bridge, onSave: handleSave, scopeRef: rootRef });

  const headerSlot = (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-[var(--nop-nav-surface)]">
        <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={actions.handleBack}
              title={t('flux.wordEditor.back')}
              aria-label={t('flux.wordEditor.back')}
            >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--nop-accent)]" />
            <h1 className="text-lg font-semibold text-[var(--nop-text-strong)]">
              {hasRendererSlotContent(titleContent)
                ? asReactNode(titleContent)
                : t('flux.wordEditor.title')}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--nop-body-copy)]">
            <Type className="w-3.5 h-3.5 opacity-70" />
            <span className="tabular-nums">
              {t('flux.wordEditor.words', { count: wordCount.toLocaleString() })}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant={isDirty || isSaving ? 'default' : 'outline'}
          size="sm"
          onClick={() => void handleSave()}
          className="rounded-full"
          disabled={isSaving}
        >
          <Save className="w-4 h-4" />
          {saveMessage || t('flux.wordEditor.save')}
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-[var(--nop-nav-surface)] px-4 py-2 text-xs text-muted-foreground">
        <div className="min-w-0 flex-1">
          <span className="font-medium text-foreground">{t('flux.wordEditor.documentPreview')}</span>
          <span className="ml-2 truncate" data-testid="word-editor-saved-preview">
            {visiblePreviewText || t('flux.wordEditor.noDocumentData')}
          </span>
        </div>
        <span className="shrink-0" data-testid="word-editor-save-status">
          {saveMessage || (isSaving ? t('flux.common.saving') : isDirty ? t('flux.common.unsaved') : t('flux.wordEditor.saved'))}
        </span>
      </div>
      {props.regions.toolbar ? (
        asReactNode(
          props.regions.toolbar.render({
            scope: hostScope,
            actionScope,
          }),
        )
      ) : (
          <RibbonToolbar
            bridge={bridge}
            store={editorStore}
            onInsertExpr={actions.handleInsertExpr}
            onInsertTag={actions.handleInsertTag}
            onInsertTemplateTag={(expr) => bridge.insertTemplateExpression(expr)}
            onChartSave={actions.handleChartSave}
            onCodeSave={actions.handleCodeSave}
          />
      )}
    </div>
  );

  const defaultLeftPanelSlot = (
    <div className="flex h-full min-h-0 flex-col text-foreground">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{t('flux.wordEditor.datasets')}</div>
          <div className="text-sm text-muted-foreground">{t('flux.wordEditor.selectDatasetHint')}</div>
        </div>
        <div className="shrink-0 self-start">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setLeftCollapsed(true)}
            aria-label={t('flux.wordEditor.collapseFieldPanel')}
            data-testid="collapse-field-panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Tabs
        value={activePanel}
        onValueChange={(value) => setActivePanel(value as 'datasets' | 'fields')}
        data-orientation="horizontal"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList variant="line" className="w-full rounded-none border-b border-border px-0 shrink-0">
          <TabsTrigger
            value="datasets"
            className="flex-1 py-2.5"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t('flux.wordEditor.datasets')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="fields"
            className="flex-1 py-2.5"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{t('flux.wordEditor.fields')}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="datasets" className="flex-1 min-h-0 overflow-y-auto">
          <DatasetPanel
            store={datasetStore}
            onAddDataset={actions.handleAddDataset}
            onEditDataset={actions.handleEditDataset}
            showHeader={false}
          />
        </TabsContent>
        <TabsContent value="fields" className="flex-1 min-h-0 overflow-y-auto">
          <FieldList store={datasetStore} onFieldClick={actions.handleFieldClick} showHeader={false} />
        </TabsContent>
      </Tabs>
    </div>
  );

  const canvasSlot = (
    <div className="flex flex-col h-full min-h-0 overflow-auto bg-[var(--nop-playground-stage-bg)]">
        <EditorCanvas
          editorStore={editorStore}
          bridge={bridge}
          initialDocument={initialDocument}
          recoveredDocument={recoveredState.document}
          onAutosave={handleAutosave}
        />
      </div>
  );

  const panelConfig = props.props.config;
  const showLeftPanel = panelConfig?.leftPanel !== undefined;
  const showRightPanel = panelConfig?.rightPanel !== undefined;
  const renderedLeftPanel = props.regions.leftPanel
    ? asReactNode(
        props.regions.leftPanel.render({
          scope: hostScope,
          actionScope,
        }),
      )
    : undefined;
  const renderedRightPanel = props.regions.rightPanel
    ? asReactNode(
        props.regions.rightPanel.render({
          scope: hostScope,
          actionScope,
        }),
      )
    : undefined;

  const leftPanelSlot = showLeftPanel
    ? hasRendererSlotContent(renderedLeftPanel)
      ? renderedLeftPanel
      : defaultLeftPanelSlot
    : undefined;

    const rightPanelSlot = showRightPanel
      ? hasRendererSlotContent(renderedRightPanel)
      ? renderedRightPanel
      : (
          <div className="flex h-full min-h-0 flex-col text-foreground">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="shrink-0 self-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRightCollapsed(true)}
                  aria-label={t('flux.wordEditor.collapseOutline')}
                  data-testid="collapse-outline-panel"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{t('flux.wordEditor.outline')}</div>
                <div className="text-sm text-muted-foreground">{t('flux.wordEditor.addHeadingsHint')}</div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <OutlinePanel bridge={bridge} showHeader={false} />
            </div>
          </div>
        )
    : undefined;

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
        density="flush"
        header={headerSlot}
        leftPanel={leftPanelSlot}
        leftCollapsed={leftCollapsed}
        onLeftToggle={() => setLeftCollapsed((v) => !v)}
        leftLabel={t('flux.wordEditor.expandFieldPanel')}
        canvas={canvasSlot}
        rightPanel={rightPanelSlot}
        rightCollapsed={rightCollapsed}
        onRightToggle={() => setRightCollapsed((v) => !v)}
        rightLabel={t('flux.wordEditor.expandOutline')}
        dialogs={
          <DatasetDialog
            key={`${editingDatasetId ?? 'new'}:${datasetDialogOpen ? 'open' : 'closed'}`}
            open={datasetDialogOpen}
            onClose={() => {
              setDatasetDialogOpen(false);
              setEditingDatasetId(null);
            }}
            onSave={actions.handleSaveDataset}
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
