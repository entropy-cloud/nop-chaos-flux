import { useRef, useEffect } from 'react';
import type { WordEditorData } from '@nop-chaos/word-editor-core';
import type { EditorStoreApi } from '@nop-chaos/word-editor-core';
import type { CanvasEditorBridge } from '@nop-chaos/word-editor-core';
import { createSavedDocumentData, DEFAULT_PAPER_SETTINGS } from '@nop-chaos/word-editor-core';
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
        const value = bridge.getValue();
        if (value) {
          const editorValue = value.data;
          const paperSettings = bridge.getPaperSettings();
          const saved = createSavedDocumentData({
              data: {
                header: editorValue.header ?? [],
                main: editorValue.main,
                footer: editorValue.footer ?? [],
                charts: chartsRef.current ?? [],
                codes: codesRef.current ?? [],
              },
            paperSettings: paperSettings ?? { ...DEFAULT_PAPER_SETTINGS },
          });
          localStorage.setItem('nop-word-editor-document', JSON.stringify(saved));
          onAutosaveRef.current?.(saved);
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
          editorStore.setSelection({
            bold: payload.bold,
            italic: payload.italic,
            underline: payload.underline,
            strikeout: payload.strikeout,
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

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
