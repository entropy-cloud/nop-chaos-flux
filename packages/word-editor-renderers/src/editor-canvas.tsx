import { useRef, useEffect, useId } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import type { WordEditorData } from '@nop-chaos/word-editor-core';
import type { EditorStoreApi } from '@nop-chaos/word-editor-core';
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core';
import { captureDocumentSnapshot, createSavedDocumentData, DEFAULT_PAPER_SETTINGS } from '@nop-chaos/word-editor-core';
import type { PaperSettings, SavedDocumentData, WordDocument } from '@nop-chaos/word-editor-core';
import type { DocChart, DocCode } from '@nop-chaos/word-editor-core';

export interface EditorCanvasProps {
  editorStore: EditorStoreApi;
  bridge: CanvasEditorBridge;
  initialDocument?: WordDocument;
  recoveredDocument?: SavedDocumentData | null;
  charts?: DocChart[];
  codes?: DocCode[];
  onAutosave?: (saved: SavedDocumentData) => void;
}

export function EditorCanvas({
  editorStore,
  bridge,
  initialDocument,
  recoveredDocument,
  charts,
  codes,
  onAutosave,
}: EditorCanvasProps) {
  const descriptionId = useId();
  const regionLabel = t('flux.wordEditor.canvasRegionLabel');
  const containerRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<DocChart[] | undefined>(charts);
  const codesRef = useRef<DocCode[] | undefined>(codes);
  const onAutosaveRef = useRef(onAutosave);

  useEffect(() => {
    chartsRef.current = charts;
  }, [charts]);

  useEffect(() => {
    codesRef.current = codes;
  }, [codes]);

  useEffect(() => {
    onAutosaveRef.current = onAutosave;
  }, [onAutosave]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();

    const debouncedSave = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          const saved = captureDocumentSnapshot(bridge, {
            paperSettings: editorStore.getState().paperSettings,
          });
          onAutosaveRef.current?.(saved);
        } catch {
          // Ignore autosave snapshot failures and keep editing interactive.
        }
      }, 500);
    };

    const documentSource =
      recoveredDocument ??
      (initialDocument
        ? createSavedDocumentData({
            data: initialDocument,
            paperSettings: null,
          })
        : null);
    let editorData: WordEditorData;
    let paperSettings: PaperSettings;

    if (documentSource) {
      const header = documentSource.data.header || [];
      const footer = documentSource.data.footer || [];
      editorData = {
        header,
        main: documentSource.data.main,
        footer,
      };
      paperSettings = documentSource.paperSettings;
    } else {
      editorData = {
        header: [],
        main: [{ value: 'Hello World' }],
        footer: [],
      };
      paperSettings = { ...DEFAULT_PAPER_SETTINGS };
    }

    bridge.mount(
      container,
      editorData,
      {
        onContentChange: () => {
          debouncedSave();
          editorStore.setDirty(true);
        },
        onRangeStyleChange: (payload) => {
          if (!payload) {
            return;
          }
          editorStore.setSelection({
            bold: payload.bold,
            italic: payload.italic,
            underline: payload.underline,
            strikeout: payload.strikeout,
            superscript: payload.superscript ?? false,
            subscript: payload.subscript ?? false,
            font: payload.font,
            size: payload.size,
            color: payload.color,
            highlight: payload.highlight,
            rowFlex: payload.rowFlex ?? null,
            level: payload.level ?? null,
            listType: payload.listType ?? null,
            listStyle: payload.listStyle ?? null,
            rowMargin: payload.rowMargin ?? 0,
            undo: payload.undo ?? false,
            redo: payload.redo ?? false,
          });
        },
        onPageSizeChange: (payload) => {
          editorStore.setTotalPages(payload);
        },
        onPageScaleChange: (payload) => {
          editorStore.setScale(payload);
        },
      },
      paperSettings,
    );

    editorStore.setBridge(bridge);

    if (documentSource) {
      editorStore.setPaperSettings(paperSettings);
      editorStore.setDirty(false);
    }

    const wordCountPromise = bridge.getWordCount();
    wordCountPromise
      .then((count) => {
        if (!controller.signal.aborted) editorStore.setWordCount(count);
      })
      .catch((err) => {
        console.debug('[word-editor] word count failed', err);
      });

    return () => {
      controller.abort();
      if (saveTimer) clearTimeout(saveTimer);
      bridge.unmount();
      editorStore.setBridge(null);
      editorStore.setReady(false);
    };
  }, [bridge, editorStore, initialDocument, recoveredDocument]);

  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={regionLabel}
      aria-describedby={descriptionId}
      data-slot="word-editor-canvas-region"
      style={{ width: '100%', height: '100%' }}
    >
      <p id={descriptionId} className="sr-only">
        {t('flux.wordEditor.canvasRegionDescription')}
      </p>
      <div ref={containerRef} data-slot="word-editor-canvas-surface" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
