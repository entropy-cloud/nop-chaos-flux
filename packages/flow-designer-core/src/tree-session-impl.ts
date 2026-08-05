import type {
  TreeDocument,
  TreeHostReplacementResult,
  TreeCommandResult,
  DesignerEvent,
  NormalizedDesignerConfig,
  GraphDocument,
  DesignerConfig,
  TreeCoreCreationResult,
} from './types.js';
import type { DesignerCore } from './designer-core-types.js';
import { migrateTreeConfig, normalizeTreeDocumentVersion } from './core/config-migration.js';
import { normalizeConfig } from './core/config.js';
import type { TreeChangeReason } from './types.js';
import type { DesignerShellState } from './core/shell-state.js';
import { cloneDocument } from './core/clone.js';

import { projectAndLayoutTree } from './tree-projection.js';
import {
  addBranchInTree,
  deleteBranchInTree,
  deleteNodeInTree,
  insertBranchChildInTree,
  insertBranchPairInTree,
  insertChainNodeAtMergeInTree,
  insertChainNodeInTree,
  moveBranchInTree,
  updateBranchDataInTree,
  updateNodeDataInTree,
} from './tree-structure.js';

function cloneTreeDocumentValue(tree: TreeDocument | undefined): TreeDocument | undefined {
  return tree ? (JSON.parse(JSON.stringify(tree)) as TreeDocument) : undefined;
}

function makeTreeCommandResult(
  ok: boolean,
  reason?: TreeCommandResult['reason'],
  error?: unknown,
): TreeCommandResult {
  return ok ? { ok: true } : { ok: false, reason, error };
}

export interface TreeSessionContext {
  isTreeMode: boolean;
  get currentTreeDocument(): TreeDocument | undefined;
  set currentTreeDocument(value: TreeDocument | undefined);
  lastAcceptedHostEpoch: number;
  normalizedConfig: NormalizedDesignerConfig;
  get doc(): GraphDocument;
  set doc(value: GraphDocument);
  get docRevision(): number;
  set docRevision(value: number);
  historyState: import('./core/history.js').DesignerHistoryState;
  savedTreeDocument: TreeDocument | undefined;
  savedRevision: number;
  transactionStack: unknown[];
  shellState: DesignerShellState;
  isReadonly: boolean;
  assertReadonly(methodName: string): boolean;
  emit(event: DesignerEvent): void;
  emitTreeChanged(tree: TreeDocument, reason: TreeChangeReason): void;
  replaceDocument(nextDoc: GraphDocument, revision: number): void;
  replaceHistoryBaseline(nextDoc: GraphDocument): void;
  markHostDocumentSaved(nextDoc: GraphDocument): void;
  pushHistory(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  isDirty(): boolean;
  updateDirtyState(): void;
  resetViewport(): void;
}

export interface TreeSessionSurface {
  getTreeDocument(): TreeDocument | undefined;
  getAcceptedHostEpoch(): number;
  replaceTreeFromHost(tree: TreeDocument, epoch?: number): TreeHostReplacementResult;
  relayoutTree(): TreeCommandResult;
  insertChainNode(sourceId: string, nodeType: string, data?: Record<string, unknown>): TreeCommandResult;
  insertChainNodeAtMerge(targetId: string, nodeType: string, data?: Record<string, unknown>): TreeCommandResult;
  insertBranchPair(sourceId: string, condNodeType: string, condData?: Record<string, unknown>): TreeCommandResult;
  addBranch(nodeId: string, branchData?: Record<string, unknown>, childType?: string, childData?: Record<string, unknown>): TreeCommandResult;
  deleteBranch(nodeId: string, branchId: string): TreeCommandResult;
  moveBranch(nodeId: string, branchId: string, direction: 'left' | 'right'): TreeCommandResult;
  deleteTreeNode(nodeId: string): TreeCommandResult;
  updateTreeNodeData(nodeId: string, data: Record<string, unknown>): TreeCommandResult;
  updateBranchData(nodeId: string, branchId: string, data: Record<string, unknown>): TreeCommandResult;
  insertBranchChild(ownerId: string, branchId: string, nodeType: string, data?: Record<string, unknown>): TreeCommandResult;
}

type TreeComputeResult = {
  ok: boolean;
  tree?: TreeDocument;
  reason?: TreeCommandResult['reason'];
  error?: unknown;
};


export interface TreeSessionContextInput {
  isTreeMode: boolean;
  getCurrentTreeDocument(): TreeDocument | undefined;
  setCurrentTreeDocument(value: TreeDocument | undefined): void;
  lastAcceptedHostEpoch: number;
  normalizedConfig: NormalizedDesignerConfig;
  getDoc(): GraphDocument;
  setDoc(value: GraphDocument): void;
  getDocRevision(): number;
  setDocRevision(value: number): void;
  historyState: import('./core/history.js').DesignerHistoryState;
  savedTreeDocument: TreeDocument | undefined;
  savedRevision: number;
  transactionStack: unknown[];
  shellState: DesignerShellState;
  isReadonly: boolean;
  assertReadonly(methodName: string): boolean;
  emit(event: DesignerEvent): void;
  emitTreeChanged(tree: TreeDocument, reason: TreeChangeReason): void;
  replaceDocument(nextDoc: GraphDocument, revision: number): void;
  replaceHistoryBaseline(nextDoc: GraphDocument): void;
  markHostDocumentSaved(nextDoc: GraphDocument): void;
  pushHistory(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  isDirty(): boolean;
  updateDirtyState(): void;
  resetViewport(): void;
}

export function buildTreeSessionContext(input: TreeSessionContextInput): TreeSessionContext {
  return {
    isTreeMode: input.isTreeMode,
    get currentTreeDocument() {
      return input.getCurrentTreeDocument();
    },
    set currentTreeDocument(value: TreeDocument | undefined) {
      input.setCurrentTreeDocument(value);
    },
    lastAcceptedHostEpoch: input.lastAcceptedHostEpoch,
    normalizedConfig: input.normalizedConfig,
    get doc() {
      return input.getDoc();
    },
    set doc(value: GraphDocument) {
      input.setDoc(value);
    },
    get docRevision() {
      return input.getDocRevision();
    },
    set docRevision(value: number) {
      input.setDocRevision(value);
    },
    historyState: input.historyState,
    savedTreeDocument: input.savedTreeDocument,
    savedRevision: input.savedRevision,
    transactionStack: input.transactionStack,
    shellState: input.shellState,
    isReadonly: input.isReadonly,
    assertReadonly: input.assertReadonly,
    emit: input.emit,
    emitTreeChanged: input.emitTreeChanged,
    replaceDocument: input.replaceDocument,
    replaceHistoryBaseline: input.replaceHistoryBaseline,
    markHostDocumentSaved: input.markHostDocumentSaved,
    pushHistory: input.pushHistory,
    canUndo: input.canUndo,
    canRedo: input.canRedo,
    isDirty: input.isDirty,
    updateDirtyState: input.updateDirtyState,
    resetViewport: input.resetViewport,
  };
}

export function createTreeSessionSurface(ctx: TreeSessionContext): TreeSessionSurface {
  function toComputeResult(
    result: ReturnType<typeof insertChainNodeInTree>,
  ): TreeComputeResult {
    if (result.ok) {
      return { ok: true, tree: result.tree };
    }
    return { ok: false, reason: result.reason };
  }

  function runTreeCommand(
    method: string,
    compute: () => TreeComputeResult,
    notifyReason: TreeChangeReason = 'command',
    commandType?: 'transaction',
  ): TreeCommandResult {
    void commandType;
    if (ctx.isTreeMode) {
      if (ctx.assertReadonly(method)) {
        return makeTreeCommandResult(false, 'unavailable', 'Document is readonly');
      }
    }
    if (!ctx.isTreeMode || !ctx.currentTreeDocument) {
      return makeTreeCommandResult(false, 'unavailable', 'Tree command is only available in tree mode');
    }

    const result = compute();
    if (!result.ok || !result.tree) {
      return makeTreeCommandResult(false, result.reason, result.error);
    }

    const projection = projectAndLayoutTree(result.tree, ctx.normalizedConfig);
    if (!projection.ok) {
      return makeTreeCommandResult(false, 'constraint', projection.error);
    }

    ctx.currentTreeDocument = projection.view.tree;
    if (!setDocument(projection.view.document)) {
      return makeTreeCommandResult(false, 'unchanged');
    }
    if (ctx.transactionStack.length === 0) {
      ctx.pushHistory();
    }
    ctx.resetViewport();
    ctx.emit({ type: 'documentChanged', doc: ctx.doc });
    ctx.emit({ type: 'viewportChanged', viewport: ctx.shellState.viewport });
    ctx.updateDirtyState();
    if (ctx.transactionStack.length === 0) {
      ctx.emitTreeChanged(projection.view.tree, notifyReason);
    }
    return makeTreeCommandResult(true);
  }

  function setDocument(nextDoc: GraphDocument): boolean {
    if (nextDoc === ctx.doc) {
      return false;
    }
    ctx.doc = nextDoc;
    ctx.docRevision += 1;
    return true;
  }

  function getTreeDocument(): TreeDocument | undefined {
    return ctx.currentTreeDocument ? cloneTreeDocumentValue(ctx.currentTreeDocument) : undefined;
  }

  function getAcceptedHostEpoch(): number {
    return ctx.lastAcceptedHostEpoch;
  }

  function replaceTreeFromHost(tree: TreeDocument, epoch?: number): TreeHostReplacementResult {
    if (!ctx.isTreeMode) {
      return {
        ok: false,
        error: { code: 'invalid-tree-config', message: 'replaceTreeFromHost is only available in tree mode' },
      };
    }
    if (ctx.assertReadonly('replaceTreeFromHost')) {
      return {
        ok: false,
        error: { code: 'invalid-tree-config', message: 'Document is readonly' },
      };
    }

    const treeVersion = normalizeTreeDocumentVersion(tree.version);
    if (!treeVersion.ok) {
      return { ok: false, error: treeVersion.error };
    }

    if (epoch !== undefined) {
      if (
        typeof epoch !== 'number' ||
        !Number.isFinite(epoch) ||
        epoch < 0 ||
        !Number.isInteger(epoch)
      ) {
        return {
          ok: false,
          error: { code: 'invalid-tree-document-epoch', message: `Invalid host epoch: ${String(epoch)}` },
        };
      }
    }

    const canonicalTree: TreeDocument = JSON.parse(
      JSON.stringify({ ...tree, version: treeVersion.version }),
    ) as TreeDocument;
    const projection = projectAndLayoutTree(canonicalTree, ctx.normalizedConfig);
    if (!projection.ok) {
      return { ok: false, error: projection.error };
    }

    ctx.currentTreeDocument = projection.view.tree;
    if (epoch !== undefined) {
      ctx.lastAcceptedHostEpoch = epoch;
    }
    ctx.replaceDocument(cloneDocument(projection.view.document), ctx.docRevision);
    ctx.replaceHistoryBaseline(projection.view.document);
    ctx.markHostDocumentSaved(projection.view.document);
    ctx.resetViewport();
    ctx.emit({ type: 'documentChanged', doc: ctx.doc });
    ctx.emit({ type: 'viewportChanged', viewport: ctx.shellState.viewport });
    ctx.emit({ type: 'historyChanged', canUndo: ctx.canUndo(), canRedo: ctx.canRedo() });
    ctx.emit({ type: 'dirtyChanged', isDirty: ctx.isDirty() });
    return { ok: true };
  }

  function relayoutTree(): TreeCommandResult {
    if (!ctx.isTreeMode || !ctx.currentTreeDocument) {
      return makeTreeCommandResult(false, 'unavailable', 'relayoutTree is only available in tree mode');
    }

    const projection = projectAndLayoutTree(ctx.currentTreeDocument, ctx.normalizedConfig);
    if (!projection.ok) {
      return makeTreeCommandResult(false, 'constraint', projection.error);
    }

    const nextDoc = cloneDocument(projection.view.document);
    const previousSnapshot = JSON.stringify({ nodes: ctx.doc.nodes, edges: ctx.doc.edges });
    const nextSnapshot = JSON.stringify({ nodes: nextDoc.nodes, edges: nextDoc.edges });
    if (previousSnapshot === nextSnapshot) {
      return makeTreeCommandResult(true);
    }

    ctx.doc = nextDoc;
    ctx.currentTreeDocument = projection.view.tree;
    ctx.resetViewport();
    ctx.emit({ type: 'presentationChanged', doc: ctx.doc });
    return makeTreeCommandResult(true);
  }

  function insertChainNode(
    sourceId: string,
    nodeType: string,
    data?: Record<string, unknown>,
  ): TreeCommandResult {
    return runTreeCommand('insertChainNode', () => {
      const result = insertChainNodeInTree(ctx.currentTreeDocument!, sourceId, nodeType, data);
      return toComputeResult(result);
    });
  }

  function insertChainNodeAtMerge(
    targetId: string,
    nodeType: string,
    data?: Record<string, unknown>,
  ): TreeCommandResult {
    return runTreeCommand('insertChainNodeAtMerge', () => {
      const result = insertChainNodeAtMergeInTree(ctx.currentTreeDocument!, targetId, nodeType, data);
      return toComputeResult(result);
    });
  }

  function insertBranchPair(
    sourceId: string,
    condNodeType: string,
    condData?: Record<string, unknown>,
  ): TreeCommandResult {
    return runTreeCommand('insertBranchPair', () => {
      const result = insertBranchPairInTree(ctx.currentTreeDocument!, sourceId, condNodeType, condData);
      return toComputeResult(result);
    });
  }

  function addBranch(
    nodeId: string,
    branchData?: Record<string, unknown>,
    childType?: string,
    childData?: Record<string, unknown>,
  ): TreeCommandResult {
    return runTreeCommand('addBranch', () => {
      const result = addBranchInTree(ctx.currentTreeDocument!, nodeId, branchData, childType, childData);
      return toComputeResult(result);
    });
  }

  function deleteBranch(nodeId: string, branchId: string): TreeCommandResult {
    return runTreeCommand('deleteBranch', () => {
      const result = deleteBranchInTree(ctx.currentTreeDocument!, nodeId, branchId);
      return toComputeResult(result);
    });
  }

  function moveBranch(
    nodeId: string,
    branchId: string,
    direction: 'left' | 'right',
  ): TreeCommandResult {
    return runTreeCommand('moveBranch', () => {
      const result = moveBranchInTree(ctx.currentTreeDocument!, nodeId, branchId, direction);
      return toComputeResult(result);
    });
  }

  function deleteTreeNode(nodeId: string): TreeCommandResult {
    return runTreeCommand('deleteTreeNode', () => {
      const result = deleteNodeInTree(ctx.currentTreeDocument!, nodeId);
      return toComputeResult(result);
    });
  }

  function updateTreeNodeData(nodeId: string, data: Record<string, unknown>): TreeCommandResult {
    return runTreeCommand('updateTreeNodeData', () => {
      const result = updateNodeDataInTree(ctx.currentTreeDocument!, nodeId, data);
      return toComputeResult(result);
    });
  }

  function updateBranchData(nodeId: string, branchId: string, data: Record<string, unknown>): TreeCommandResult {
    return runTreeCommand('updateBranchData', () => {
      const result = updateBranchDataInTree(ctx.currentTreeDocument!, nodeId, branchId, data);
      return toComputeResult(result);
    });
  }

  function insertBranchChild(
    ownerId: string,
    branchId: string,
    nodeType: string,
    data?: Record<string, unknown>,
  ): TreeCommandResult {
    return runTreeCommand('insertBranchChild', () => {
      const result = insertBranchChildInTree(ctx.currentTreeDocument!, ownerId, branchId, nodeType, data);
      return toComputeResult(result);
    });
  }

  return {
    getTreeDocument,
    getAcceptedHostEpoch,
    replaceTreeFromHost,
    relayoutTree,
    insertChainNode,
    insertChainNodeAtMerge,
    insertBranchPair,
    addBranch,
    deleteBranch,
    moveBranch,
    deleteTreeNode,
    updateTreeNodeData,
    updateBranchData,
    insertBranchChild,
  };
}

export interface CreateTreeCoreInternalHost {
  createInternal(
    initialDoc: GraphDocument,
    config: DesignerConfig,
    options: {
      readonly?: boolean;
      treeSession?: { initialTree: TreeDocument; lastAcceptedHostEpoch: number };
    },
  ): DesignerCore;
}

export function createTreeDesignerCore(
  host: CreateTreeCoreInternalHost,
  initialTreeDocument: TreeDocument,
  config: DesignerConfig,
  options?: { readonly?: boolean },
): TreeCoreCreationResult {
  const migration = migrateTreeConfig(config);
  if (!migration.ok) {
    return { ok: false, error: migration.error };
  }

  const treeVersion = normalizeTreeDocumentVersion(initialTreeDocument.version);
  if (!treeVersion.ok) {
    return { ok: false, error: treeVersion.error };
  }

  const canonicalTree: TreeDocument = JSON.parse(
    JSON.stringify({ ...initialTreeDocument, version: treeVersion.version }),
  ) as TreeDocument;
  const normalizedConfig = normalizeConfig(migration.config);
  const projection = projectAndLayoutTree(canonicalTree, normalizedConfig);
  if (!projection.ok) {
    return { ok: false, error: projection.error };
  }

  const core = host.createInternal(projection.view.document, migration.config, {
    ...options,
    treeSession: {
      initialTree: projection.view.tree,
      lastAcceptedHostEpoch: 0,
    },
  });

  return { ok: true, core };
}

