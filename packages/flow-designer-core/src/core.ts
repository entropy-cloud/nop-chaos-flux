import type {
  GraphDocument,
  DesignerConfig,
  NormalizedDesignerConfig,
  DesignerSnapshot,
  DesignerEvent,
  TreeDocument,
  TreeCoreCreationResult,
} from './types.js';
import type { DesignerCore } from './designer-core-types.js';
import { cloneDocument } from './core/clone.js';
import { normalizeConfig } from './core/config.js';
import {
  canRedoHistory,
  canUndoHistory,
  createHistoryState,
  getCurrentRevision,
  pushHistoryEntry,
  redoHistory,
  undoHistory,
  type DesignerHistoryState,
} from './core/history.js';
import { createSelectionState, type DesignerSelectionState } from './core/selection.js';
import { createSelectionController } from './core/selection-controller.js';
import {
  beginTransactionState,
  commitTransactionState,
  rollbackTransactionState,
  type DesignerTransaction,
} from './core/transactions.js';
import { createDesignerShellState, resetShellViewportFromDocument } from './core/shell-state.js';
import { createShellControls } from './core/shell-controls.js';
import { createDesignerSnapshotCache, getDesignerSnapshot } from './core/snapshot.js';
import { layoutNodesInDocument } from './core/node-operations.js';
import { buildTreeSessionContext, createTreeSessionSurface, createTreeDesignerCore as createTreeDesignerCoreImpl } from './tree-session-impl.js';
import { createGraphCommandGate } from './core/graph-command-gate.js';

export interface CreateDesignerCoreOptions {
  readonly?: boolean;
}

interface TreeCoreSessionInput {
  initialTree: TreeDocument;
  lastAcceptedHostEpoch: number;
}

interface CreateCoreInternalOptions extends CreateDesignerCoreOptions {
  treeSession?: TreeCoreSessionInput;
}

export type TreeChangeReason = 'command' | 'undo' | 'redo' | 'restore';

function emitTreeChanged(emit: (event: DesignerEvent) => void, tree: TreeDocument, reason: TreeChangeReason) {
  emit({ type: 'treeChanged', tree, reason } as DesignerEvent);
}

function cloneTreeDocumentValue(tree: TreeDocument | undefined): TreeDocument | undefined {
  return tree ? (JSON.parse(JSON.stringify(tree)) as TreeDocument) : undefined;
}

export function createDesignerCore(
  initialDoc: GraphDocument,
  config: DesignerConfig,
  options?: CreateDesignerCoreOptions,
): DesignerCore {
  if (config.documentMode === 'tree') {
    throw new Error(
      'tree-core-factory-required: tree mode must use createTreeDesignerCore(initialTreeDocument, config)',
    );
  }
  return createDesignerCoreInternal(initialDoc, config, options);
}

export function createTreeDesignerCore(
  initialTreeDocument: TreeDocument,
  config: DesignerConfig,
  options?: CreateDesignerCoreOptions,
): TreeCoreCreationResult {
  return createTreeDesignerCoreImpl(
    { createInternal: createDesignerCoreInternal as never },
    initialTreeDocument,
    config,
    options,
  );
}

function createDesignerCoreInternal(
  initialDoc: GraphDocument,
  config: DesignerConfig,
  options?: CreateCoreInternalOptions,
): DesignerCore {
  const isReadonly = options?.readonly ?? false;
  const isTreeMode = config.documentMode === 'tree';
  const treeSession = options?.treeSession;

  let doc = cloneDocument(initialDoc);
  const normalizedConfig = normalizeConfig(config);
  let currentTreeDocument: TreeDocument | undefined = treeSession?.initialTree;
  const lastAcceptedHostEpoch = treeSession?.lastAcceptedHostEpoch ?? 0;
  const listeners = new Set<(event: DesignerEvent) => void>();

  let historyState: DesignerHistoryState = createHistoryState(doc, 0, currentTreeDocument);
  let savedDoc: GraphDocument | null = cloneDocument(doc);
  let savedTreeDocument: TreeDocument | undefined = cloneTreeDocumentValue(currentTreeDocument);
  let docRevision = 0;
  let savedRevision = 0;

  let selectionState: DesignerSelectionState = createSelectionState();
  const shellState = createDesignerShellState(doc, config.shell);
  const snapshotCache = createDesignerSnapshotCache({
    doc,
    selectionState,
    shell: shellState,
    canUndo: canUndo(),
    canRedo: canRedo(),
    isDirty: isDirty(),
    readonly: isReadonly,
  });

  let transactionStack: DesignerTransaction[] = [];
  const selectionController = createSelectionController({
    getSelectionState: () => selectionState,
    setSelectionState: (next) => {
      selectionState = next;
    },
    getAllNodeIds: () => doc.nodes.map((node) => node.id),
    emit,
  });

  const maxHistorySize = 50;

  function assertReadonly(methodName: string): boolean {
    if (isReadonly) {
      emit({ type: 'lifecycleHookError', hook: methodName, error: new Error('Document is readonly') });
      return true;
    }
    return false;
  }

  function rejectTreeMutation(method: string): void {
    emit({ type: 'mutationRejected', method, reason: 'tree-owned' });
  }

  function emit(event: DesignerEvent) {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function emitMutation(event: DesignerEvent) {
    emit(event);
    normalizedConfig.hooks?.afterCommand?.(event);
  }
  function updateDirtyState() {
    emit({ type: 'dirtyChanged', isDirty: isDirty() });
  }

  function setDocument(nextDoc: GraphDocument) {
    if (nextDoc === doc) {
      return false;
    }

    doc = nextDoc;
    docRevision += 1;
    return true;
  }
  function replaceDocument(nextDoc: GraphDocument, revision: number) {
    doc = nextDoc;
    docRevision = revision;
  }

  function replaceHistoryBaseline(nextDoc: GraphDocument) {
    historyState = createHistoryState(nextDoc, docRevision, currentTreeDocument);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
  }

  function markHostDocumentSaved(nextDoc: GraphDocument) {
    savedDoc = cloneDocument(nextDoc);
    savedTreeDocument = cloneTreeDocumentValue(currentTreeDocument);
    savedRevision = docRevision;
  }

  function pushHistory() {
    historyState = pushHistoryEntry(
      historyState,
      doc,
      docRevision,
      maxHistorySize,
      currentTreeDocument,
    );
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
  }

  function canUndo(): boolean {
    return canUndoHistory(historyState);
  }

  function canRedo(): boolean {
    return canRedoHistory(historyState);
  }
  function getSnapshot(): DesignerSnapshot {
    return getDesignerSnapshot({
      cache: snapshotCache,
      doc,
      selectionState,
      shell: shellState,
      canUndo: canUndo(),
      canRedo: canRedo(),
      isDirty: isDirty(),
      readonly: isReadonly,
    });
  }

  function getDocument(): GraphDocument {
    return doc;
  }

  function getConfig(): NormalizedDesignerConfig {
    return normalizedConfig;
  }

  function subscribe(listener: (event: DesignerEvent) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function selectBranch(ownerNodeId: string, branchId: string | null): void {
    selectionController.selectBranch(ownerNodeId, branchId);
  }

  function toggleNodeSelection(nodeId: string): { ok: true } | { ok: false; reason: 'missing-node' } {
    const exists = doc.nodes.some((node) => node.id === nodeId);
    if (!exists) {
      return { ok: false, reason: 'missing-node' };
    }
    selectionController.toggleNodeSelection(nodeId);
    return { ok: true };
  }

  function toggleEdgeSelection(edgeId: string): { ok: true } | { ok: false; reason: 'missing-edge' } {
    const exists = doc.edges.some((edge) => edge.id === edgeId);
    if (!exists) {
      return { ok: false, reason: 'missing-edge' };
    }
    selectionController.toggleEdgeSelection(edgeId);
    return { ok: true };
  }

  function buildNodeCtx(): import('./core-node-commands.js').NodeCommandContext {
    return {
      get doc() {
        return doc;
      },
      normalizedConfig,
      get selectionState() {
        return selectionState;
      },
      get transactionStack() {
        return transactionStack;
      },
      setDocument,
      pushHistory,
      emitMutation,
      emit,
      updateDirtyState,
      setSelectionState: (s) => {
        selectionState = s;
      },
      addNodeFn: (type, position, data) => addNode(type, position, data),
    };
  }

  function buildEdgeCtx(): import('./core-edge-commands.js').EdgeCommandContext {
    return {
      get doc() {
        return doc;
      },
      normalizedConfig,
      get selectionState() {
        return selectionState;
      },
      get transactionStack() {
        return transactionStack;
      },
      setDocument,
      pushHistory,
      emitMutation,
      emit,
      updateDirtyState,
      setSelectionState: (s) => {
        selectionState = s;
      },
    };
  }

  const shellControls = createShellControls({
    getDocument,
    setDocument,
    pushHistory,
    replaceHistory: replaceHistoryBaseline,
    markHostDocumentSaved,
    emit,
    updateDirtyState,
    shellState,
    shellConfig: config.shell,
    getTransactionDepth: () => transactionStack.length,
  });

  function undo(): void {
    if (assertReadonly('undo')) return;
    const result = undoHistory(historyState);
    if (!result) {
      return;
    }

    historyState = result.state;
    replaceDocument(cloneDocument(result.entry.doc), result.entry.revision);
    const restoredTree = result.entry.treeDocument ? cloneTreeDocumentValue(result.entry.treeDocument) : undefined;
    if (isTreeMode && restoredTree) {
      currentTreeDocument = restoredTree;
    }
    resetShellViewportFromDocument(shellState, doc);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport: shellState.viewport });
    updateDirtyState();
    if (isTreeMode && currentTreeDocument) {
      emitTreeChanged(emit, currentTreeDocument, 'undo');
    }
  }

  function redo(): void {
    if (assertReadonly('redo')) return;
    const result = redoHistory(historyState);
    if (!result) {
      return;
    }

    historyState = result.state;
    replaceDocument(cloneDocument(result.entry.doc), result.entry.revision);
    const restoredTree = result.entry.treeDocument ? cloneTreeDocumentValue(result.entry.treeDocument) : undefined;
    if (isTreeMode && restoredTree) {
      currentTreeDocument = restoredTree;
    }
    resetShellViewportFromDocument(shellState, doc);
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport: shellState.viewport });
    updateDirtyState();
    if (isTreeMode && currentTreeDocument) {
      emitTreeChanged(emit, currentTreeDocument, 'redo');
    }
  }

  function copySelection(): void {
    if (assertReadonly('copySelection')) return;
    shellControls.copySelection(selectionState.selectedNodeIds[0] ?? null);
  }

  function pasteClipboard(): void {
    if (isTreeMode) {
      rejectTreeMutation('pasteClipboard');
      return;
    }
    if (assertReadonly('pasteClipboard')) return;
    shellControls.pasteClipboard(addNode);
  }

  function toggleGrid(): void {
    shellControls.toggleGrid();
  }

  function setGrid(enabled: boolean): void {
    shellControls.setGrid(enabled);
  }

  function togglePalette(): void {
    shellControls.togglePalette();
  }

  function setPaletteCollapsed(collapsed: boolean): void {
    shellControls.setPaletteCollapsed(collapsed);
  }

  function toggleInspector(): void {
    shellControls.toggleInspector();
  }

  function setInspectorCollapsed(collapsed: boolean): void {
    shellControls.setInspectorCollapsed(collapsed);
  }

  function setPaletteWidth(width: number): void {
    shellControls.setPaletteWidth(width);
  }

  function setInspectorWidth(width: number): void {
    shellControls.setInspectorWidth(width);
  }

  function setViewport(newViewport: { x: number; y: number; zoom: number }): void {
    shellControls.setViewport(newViewport);
  }

  function replaceDocumentFromHost(nextDoc: GraphDocument, treeDocument?: TreeDocument): void {
    if (isTreeMode) {
      rejectTreeMutation('replaceDocumentFromHost');
      return;
    }
    if (assertReadonly('replaceDocumentFromHost')) return;
    if (treeDocument) {
      currentTreeDocument = cloneTreeDocumentValue(treeDocument);
    }
    shellControls.replaceDocumentFromHost(nextDoc);
  }

  function replaceDocumentWithHistory(nextDoc: GraphDocument, treeDocument?: TreeDocument): void {
    if (isTreeMode) {
      rejectTreeMutation('replaceDocument');
      return;
    }
    if (assertReadonly('replaceDocument')) return;
    if (!setDocument(cloneDocument(nextDoc))) {
      return;
    }

    if (treeDocument) {
      currentTreeDocument = cloneTreeDocumentValue(treeDocument);
    }

    if (transactionStack.length === 0) {
      pushHistory();
    }
    resetShellViewportFromDocument(shellState, doc);
    emit({ type: 'documentChanged', doc });
    emit({ type: 'viewportChanged', viewport: shellState.viewport });
    updateDirtyState();
  }

  function save(): void {
    if (assertReadonly('save')) return;
    savedDoc = cloneDocument(doc);
    savedTreeDocument = cloneTreeDocumentValue(currentTreeDocument);
    savedRevision = docRevision;
    emit({ type: 'dirtyChanged', isDirty: false });
  }

  function restore(): void {
    if (assertReadonly('restore')) return;
    if (!savedDoc) {
      return;
    }

    replaceDocument(cloneDocument(savedDoc), savedRevision);
    if (savedTreeDocument) {
      currentTreeDocument = cloneTreeDocumentValue(savedTreeDocument);
    }
    resetShellViewportFromDocument(shellState, doc);
    if (transactionStack.length === 0) pushHistory();
    emit({ type: 'documentChanged', doc });
    emit({ type: 'dirtyChanged', isDirty: false });
    emit({ type: 'viewportChanged', viewport: shellState.viewport });
    if (isTreeMode && currentTreeDocument) {
      emitTreeChanged(emit, currentTreeDocument, 'restore');
    }
  }

  function exportDocument(): string {
    if (isTreeMode && currentTreeDocument) {
      return JSON.stringify(currentTreeDocument, null, 2);
    }
    return JSON.stringify(doc, null, 2);
  }

  function isDirty(): boolean {
    return savedDoc !== null && docRevision !== savedRevision;
  }

  function layoutNodes(positions: Map<string, { x: number; y: number }>): void {
    if (isTreeMode) {
      rejectTreeMutation('layoutNodes');
      return;
    }
    const nextDoc = layoutNodesInDocument(doc, positions);
    if (!nextDoc) {
      return;
    }

    if (isReadonly) {
      doc = nextDoc;
      emit({ type: 'viewportChanged', viewport: shellState.viewport });
      return;
    }

    setDocument(nextDoc);
    if (transactionStack.length === 0) {
      pushHistory();
    }
    emit({ type: 'documentChanged', doc });
    updateDirtyState();
  }

  function isInTransaction(): boolean {
    return transactionStack.length > 0;
  }

  function beginTransaction(label?: string, transactionId?: string): string {
    if (assertReadonly('beginTransaction')) return '';
    const nextState = beginTransactionState(
      transactionStack,
      doc,
      currentTreeDocument,
      label,
      transactionId,
    );
    transactionStack = nextState.stack;
    const { id } = nextState;
    emit({ type: 'transactionStarted', transactionId: id, label });
    return id;
  }

  function commitTransaction(transactionId?: string): {
    ok: boolean;
    transactionId?: string;
    reason?: 'unavailable' | 'missing-transaction';
  } {
    if (assertReadonly('commitTransaction')) return { ok: false, reason: 'unavailable' };
    const result = commitTransactionState(transactionStack, transactionId);
    if (!result?.committedId) {
      return {
        ok: false,
        reason: transactionStack.length === 0 ? 'unavailable' : 'missing-transaction',
      };
    }

    transactionStack = result.stack;
    if (result.shouldPushHistory) {
      pushHistory();
    }
    emit({ type: 'transactionCommitted', transactionId: result.committedId });
    if (isTreeMode && result.shouldPushHistory && currentTreeDocument) {
      emit({
        type: 'treeChanged',
        tree: currentTreeDocument,
        reason: 'command',
        commandType: 'transaction',
      } as DesignerEvent);
    }
    return { ok: true, transactionId: result.committedId };
  }

  function rollbackTransaction(transactionId?: string): {
    ok: boolean;
    transactionId?: string;
    reason?: 'unavailable' | 'missing-transaction';
  } {
    if (assertReadonly('rollbackTransaction')) return { ok: false, reason: 'unavailable' };
    const result = rollbackTransactionState(transactionStack, transactionId);
    if (!result) {
      return {
        ok: false,
        reason: transactionStack.length === 0 ? 'unavailable' : 'missing-transaction',
      };
    }

    transactionStack = result.stack;
    replaceDocument(result.snapshotBefore, getCurrentRevision(historyState) ?? docRevision);
    if (result.treeSnapshotBefore) {
      currentTreeDocument = cloneTreeDocumentValue(result.treeSnapshotBefore);
    }
    resetShellViewportFromDocument(shellState, doc);
    for (const rolledBackId of result.rolledBackIds) {
      emit({ type: 'transactionRolledBack', transactionId: rolledBackId });
    }

    emit({ type: 'documentChanged', doc });
    emit({ type: 'historyChanged', canUndo: canUndo(), canRedo: canRedo() });
    updateDirtyState();
    return { ok: true, transactionId: result.rolledBackIds[0] };
  }

  const graphGate = createGraphCommandGate({
    isTreeMode,
    rejectTreeMutation,
    assertReadonly,
    buildNodeCtx,
    buildEdgeCtx,
    getDoc: () => doc,
    normalizedConfig,
    getSelectionState: () => selectionState,
    addNodeFn: (type, position, data) => addNode(type, position, data),
  });
  const { addNode } = graphGate;

  return {
    getSnapshot,
    getDocument,
    getConfig,
    subscribe,
    ...graphGate,
    selectNode: selectionController.selectNode,
    selectEdge: selectionController.selectEdge,
    selectBranch,
    clearSelection: selectionController.clearSelection,
    toggleNodeSelection,
    toggleEdgeSelection,
    selectAllNodes: selectionController.selectAllNodes,
    setSelection: selectionController.setSelection,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelection,
    pasteClipboard,
    toggleGrid,
    setGrid,
    togglePalette,
    setPaletteCollapsed,
    toggleInspector,
    setInspectorCollapsed,
    setPaletteWidth,
    setInspectorWidth,
    setViewport,
    replaceDocument: replaceDocumentWithHistory,
    replaceDocumentFromHost,
    save,
    restore,
    exportDocument,
    isDirty,
    layoutNodes,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    isInTransaction,
    ...createTreeSessionSurface(buildTreeSessionContext({
      isTreeMode,
      getCurrentTreeDocument: () => currentTreeDocument,
      setCurrentTreeDocument: (value: TreeDocument | undefined) => {
        currentTreeDocument = value;
      },
      lastAcceptedHostEpoch,
      normalizedConfig,
      getDoc: () => doc,
      setDoc: (value: GraphDocument) => {
        doc = value;
      },
      getDocRevision: () => docRevision,
      setDocRevision: (value: number) => {
        docRevision = value;
      },
      historyState,
      savedTreeDocument,
      savedRevision,
      transactionStack,
      shellState,
      isReadonly,
      assertReadonly,
      emit,
      emitTreeChanged: (tree: TreeDocument, reason: import('./types.js').TreeChangeReason) =>
        emitTreeChanged(emit, tree, reason),
      replaceDocument,
      replaceHistoryBaseline,
      markHostDocumentSaved,
      pushHistory,
      canUndo,
      canRedo,
      isDirty,
      updateDirtyState,
      resetViewport: () => resetShellViewportFromDocument(shellState, doc),
    })),
  };
}
