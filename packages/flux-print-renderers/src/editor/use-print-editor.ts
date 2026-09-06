import { useSyncExternalStore } from 'react';
import { createEditorCore, type EditorCore, type EditorSessionState } from '@nop-chaos/editor-core';
import {
  validatePrintTemplate,
  type PrintDiagnostic,
  type PrintElementSchema,
  type PrintElementType,
  type PrintPageSchema,
  type PrintTemplateSchema,
} from '@nop-chaos/flux-print-core';
import { createPrintDomainAdapter, type PrintDocument, type PrintTemplateDiff } from './print-domain-adapter.js';
import { createDefaultElement, nextPrintElementId, seedPrintElementIdSeq, type CreateDefaultElementOverrides } from '../schemas.js';

export interface PrintEditorOptions {
  template: PrintDocument;
  /** 初始选区（可选）。 */
  selection?: readonly string[];
  onTemplateChange?: (template: PrintTemplateSchema, serialized: string) => void;
}

export const PASTE_OFFSET_MM = 10;

/**
 * 框架无关的打印设计器会话控制器：包装 editor-core（policy=auto，每次变更即提交），
 * 提供元素增删改/复制粘贴/微移/拖拽事务/缩放等命令面。纯逻辑，Vitest 直测。
 */
export interface PrintEditorController {
  getState(): EditorSessionState<PrintDocument>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): PrintEditorSnapshot;

  getTemplate(): PrintDocument;
  getSelection(): readonly string[];
  setSelection(ids: readonly string[]): void;
  getZoom(): number;
  setZoom(zoom: number): void;

  addElement(type: PrintElementType, overrides?: CreateDefaultElementOverrides): PrintElementSchema | null;
  updateElement(id: string, patch: Partial<PrintElementSchema>): void;
  /** 拖拽/缩放事务：begin → 多次 moveFrame → end（一拖拽 = 一 undo 步）。 */
  beginDrag(): void;
  moveFrame(id: string, frame: { left: number; top: number; width: number; height: number }): void;
  endDrag(): void;
  abortDrag(): void;
  deleteSelected(): void;
  copy(): void;
  paste(): void;
  nudge(dx: number, dy: number): void;
  undo(): void;
  redo(): void;

  updatePage(patch: Partial<PrintPageSchema>): void;
  renameTemplate(name: string): void;
  setTestData(data: Record<string, unknown>): void;
  validate(): PrintDiagnostic[];

  dispose(): void;
}

export interface PrintEditorSnapshot {
  state: EditorSessionState<PrintDocument>;
  zoom: number;
}

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;

export function createPrintEditorController(options: PrintEditorOptions): PrintEditorController {
  let cachedSnapshot: PrintEditorSnapshot | null = null;
  seedPrintElementIdSeq(options.template);
  const core: EditorCore<PrintDocument, PrintTemplateDiff> = createEditorCore<PrintDocument, PrintTemplateDiff>(
    createPrintDomainAdapter(),
    {
      policy: 'auto',
      initialDocument: options.template,
      selection: options.selection,
      onCommitted: (result) => {
        if (result.ok && result.serialized) {
          options.onTemplateChange?.(core.getState().working, result.serialized);
        }
      },
    },
  );

  const listeners = new Set<() => void>();
  let zoom = 1;
  let clipboard: PrintElementSchema[] = [];
  let disposed = false;

  const notify = () => {
    cachedSnapshot = null;
    for (const listener of listeners) listener();
  };
  const unsubscribeCore = core.subscribe(notify);

  const updateElements = (mutate: (elements: PrintElementSchema[]) => PrintElementSchema[]): void => {
    core.update((working) => ({ ...working, elements: mutate([...working.elements]) }));
  };

  const controller: PrintEditorController = {
    getState: () => core.getState(),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      if (!cachedSnapshot) {
        cachedSnapshot = { state: core.getState(), zoom };
      }
      return cachedSnapshot;
    },

    getTemplate: () => core.getState().working,
    getSelection: () => core.getState().selection,
    setSelection: (ids) => core.setSelection(ids),
    getZoom: () => zoom,
    setZoom(next) {
      const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
      if (clamped === zoom) return;
      zoom = clamped;
      notify();
    },

    addElement(type, overrides) {
      const element = createDefaultElement(type, overrides);
      updateElements((elements) => [...elements, element]);
      core.setSelection([element.id]);
      return element;
    },
    updateElement(id, patch) {
      updateElements((elements) =>
        elements.map((element) => (element.id === id ? ({ ...element, ...patch } as PrintElementSchema) : element)),
      );
    },
    beginDrag() {
      core.beginTransaction();
    },
    moveFrame(id, frame) {
      core.update((working) => ({
        ...working,
        elements: working.elements.map((element) => (element.id === id ? { ...element, ...frame } : element)),
      }));
    },
    endDrag() {
      core.endTransaction();
    },
    abortDrag() {
      core.abortTransaction();
    },
    deleteSelected() {
      const selected = new Set(core.getState().selection);
      if (selected.size === 0) return;
      updateElements((elements) => elements.filter((element) => !selected.has(element.id)));
      core.setSelection([]);
    },
    copy() {
      const selected = new Set(core.getState().selection);
      clipboard = core
        .getState()
        .working.elements.filter((element) => selected.has(element.id))
        .map((element) => structuredClone(element));
    },
    paste() {
      if (clipboard.length === 0) return;
      const ids: string[] = [];
      updateElements((elements) => {
        for (const clone of clipboard) {
          const element = { ...structuredClone(clone), id: nextPrintElementId(clone.type) } as PrintElementSchema;
          element.left += PASTE_OFFSET_MM;
          element.top += PASTE_OFFSET_MM;
          ids.push(element.id);
          elements.push(element);
        }
        return elements;
      });
      core.setSelection(ids);
    },
    nudge(dx, dy) {
      const selected = new Set(core.getState().selection);
      if (selected.size === 0) return;
      updateElements((elements) =>
        elements.map((element) =>
          selected.has(element.id) ? { ...element, left: element.left + dx, top: element.top + dy } : element,
        ),
      );
    },
    undo: () => core.undo(),
    redo: () => core.redo(),

    updatePage(patch) {
      core.update((working) => ({ ...working, page: { ...working.page, ...patch } }));
    },
    renameTemplate(name) {
      core.update((working) => ({ ...working, name }));
    },
    setTestData(data) {
      core.update((working) => ({ ...working, testData: data }));
    },
    validate: () => validatePrintTemplate(core.getState().working),

    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribeCore();
      listeners.clear();
      core.dispose();
    },
  };

  return controller;
}

const EMPTY_SNAPSHOT: PrintEditorSnapshot = {
  state: {
    working: createEmptyTemplate(),
    committed: createEmptyTemplate(),
    selection: [],
    mode: 'edit',
    canUndo: false,
    canRedo: false,
    undoDepth: 0,
    redoDepth: 0,
    dirty: false,
  },
  zoom: 1,
};

function createEmptyTemplate(): PrintDocument {
  return {
    kind: 'print-template',
    schemaVersion: 1,
    name: '',
    page: {
      paper: { width: 210, height: 297, direction: 'vertical', margins: [15, 15, 15, 15] },
      unit: 'mm',
    },
    elements: [],
  };
}

/** React 适配：useSyncExternalStore 订阅会话（core 变更与 zoom 变更统一投影）。 */
export function usePrintEditorSnapshot(controller: PrintEditorController | null): PrintEditorSnapshot {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!controller) return () => undefined;
      return controller.subscribe(onStoreChange);
    },
    () => (controller ? controller.getSnapshot() : EMPTY_SNAPSHOT),
  );
}
