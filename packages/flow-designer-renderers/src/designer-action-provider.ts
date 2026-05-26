import { validateHostMethodPayload } from '@nop-chaos/flux-core';
import type { ActionNamespaceProvider, HostCapabilityContract } from '@nop-chaos/flux-core';
import type { DesignerCore } from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter.js';
import type { DesignerCommandAdapter } from './designer-command-adapter.js';
import { notifyCommandFailure, toActionResult } from './designer-context.js';
import { FLOW_DESIGNER_HOST_METHOD_CONTRACTS } from './designer-manifest.js';

type CommandRecord = Record<string, unknown>;

function isCommandRecord(value: unknown): value is CommandRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateMethodPayload(
  method: string,
  payload: unknown,
): { ok: true; args: CommandRecord } | { ok: false; error: Error } {
  const contract = (FLOW_DESIGNER_HOST_METHOD_CONTRACTS as HostCapabilityContract['methods'])[method];
  const validation = validateHostMethodPayload('designer', method, payload, contract);
  return validation.ok
    ? { ok: true, args: validation.args as CommandRecord }
    : validation;
}

function mapPublishedResult(method: string, actionResult: ReturnType<typeof toActionResult>) {
  if (!actionResult.ok) {
    return actionResult;
  }

  if (method === 'addNode' || method === 'duplicateNode') {
    const data = actionResult.data;
    const nodeId = isCommandRecord(data) && typeof data.id === 'string' ? data.id : undefined;
    return { ...actionResult, data: nodeId ? { nodeId } : undefined };
  }

  if (method === 'addEdge') {
    const data = actionResult.data;
    const edgeId = isCommandRecord(data) && typeof data.id === 'string' ? data.id : undefined;
    return { ...actionResult, data: edgeId ? { edgeId } : undefined };
  }

  return actionResult;
}

function mapCoreResult(
  result:
    | { ok: true; transactionId?: string }
    | { ok: false; reason: 'missing-node' | 'missing-edge' | 'missing-selection-target' | 'missing-transaction' | 'unavailable' },
  data?: unknown,
) {
  if (result.ok) {
    return data === undefined ? { ok: true } : { ok: true, data };
  }

  return {
    ok: false,
    error: undefined,
    cause: { reason: result.reason, result: { ...result, data } },
    reason: result.reason,
  };
}

function mapTransactionResult(result: {
  ok: boolean;
  transactionId?: string;
  reason?: 'missing-transaction' | 'unavailable';
}) {
  return result.ok
    ? { ok: true, transactionId: result.transactionId }
    : mapCoreResult({ ok: false, reason: result.reason ?? 'unavailable' });
}

export function createDesignerActionProvider(
  core: DesignerCore,
  adapterInput?: DesignerCommandAdapter,
): ActionNamespaceProvider {
  const adapter = adapterInput ?? createDesignerCommandAdapter(core);

  return {
    kind: 'host',
    listMethods() {
      return [
        'addNode',
        'addBranch',
        'addEdge',
        'clearSelection',
        'selectBranch',
        'selectNode',
        'selectEdge',
        'deleteNode',
        'deleteBranch',
        'deleteEdge',
        'deleteSelection',
        'duplicateNode',
        'moveNode',
        'moveBranch',
        'reconnectEdge',
        'updateBranchData',
        'updateNodeData',
        'updateEdgeData',
        'export',
        'undo',
        'redo',
        'toggleGrid',
        'togglePalette',
        'toggleInspector',
        'setViewport',
        'save',
        'restore',
        'copySelection',
        'pasteClipboard',
        'beginTransaction',
        'commitTransaction',
        'rollbackTransaction',
        'toggleNodeSelection',
        'toggleEdgeSelection',
        'selectAllNodes',
        'setSelection',
        'moveNodes',
        'updateMultipleNodes',
      ];
    },
    invoke(method, payload, ctx) {
      const validation = validateMethodPayload(method, payload);
      if (!validation.ok) {
        return { ok: false, error: validation.error };
      }
      const args = validation.args;

      switch (method) {
        case 'addNode': {
          const actionResult = toActionResult(
            adapter.execute({
            type: 'addNode',
            nodeType: args.nodeType as string,
            position: (args.position as { x: number; y: number } | undefined) ?? {
              x: 200,
              y: 120,
            },
            data: args.data as Record<string, unknown> | undefined,
            }),
          );
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: actionResult.error,
            reason: (actionResult.cause as { reason?: string } | undefined)?.reason,
          });
          return mapPublishedResult(method, actionResult);
        }
        case 'addBranch': {
          const result = adapter.execute({
            type: 'addBranch',
            nodeId: args.nodeId as string,
            branchData: args.branchData as Record<string, unknown> | undefined,
            childType: typeof args.childType === 'string' ? args.childType : undefined,
            childData: args.childData as Record<string, unknown> | undefined,
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'addEdge': {
          const actionResult = toActionResult(
            adapter.execute({
            type: 'addEdge',
            source: args.source as string,
            target: args.target as string,
            sourcePort: typeof args.sourcePort === 'string' ? args.sourcePort : undefined,
            targetPort: typeof args.targetPort === 'string' ? args.targetPort : undefined,
            data: args.data as Record<string, unknown> | undefined,
            }),
          );
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: actionResult.error,
            reason: (actionResult.cause as { reason?: string } | undefined)?.reason,
          });
          return mapPublishedResult(method, actionResult);
        }
        case 'clearSelection': {
          const result = adapter.execute({ type: 'clearSelection' });
          return toActionResult(result);
        }
        case 'selectNode': {
          const result = adapter.execute({
            type: 'selectNode',
            nodeId: (args.nodeId as string | null | undefined) ?? null,
          });
          return toActionResult(result);
        }
        case 'selectBranch': {
          const result = adapter.execute({
            type: 'selectBranch',
            nodeId: args.nodeId as string,
            branchId: (args.branchId as string | null | undefined) ?? null,
          });
          return toActionResult(result);
        }
        case 'selectEdge': {
          const result = adapter.execute({
            type: 'selectEdge',
            edgeId: (args.edgeId as string | null | undefined) ?? null,
          });
          return toActionResult(result);
        }
        case 'deleteNode': {
          const result = adapter.execute({
            type: 'deleteNode',
            nodeId: args.nodeId as string,
          });
          return toActionResult(result);
        }
        case 'deleteBranch': {
          const result = adapter.execute({
            type: 'deleteBranch',
            nodeId: args.nodeId as string,
            branchId: args.branchId as string,
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'deleteEdge': {
          const result = adapter.execute({
            type: 'deleteEdge',
            edgeId: args.edgeId as string,
          });
          return toActionResult(result);
        }
        case 'deleteSelection': {
          const result = adapter.execute({ type: 'deleteSelection' });
          return toActionResult(result);
        }
        case 'duplicateNode': {
          const actionResult = toActionResult(
            adapter.execute({
            type: 'duplicateNode',
            nodeId: args.nodeId as string,
            }),
          );
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: actionResult.error,
            reason: (actionResult.cause as { reason?: string } | undefined)?.reason,
          });
          return mapPublishedResult(method, actionResult);
        }
        case 'moveNode': {
          const result = adapter.execute({
            type: 'moveNode',
            nodeId: args.nodeId as string,
            position: (args.position as { x: number; y: number } | undefined) ?? { x: 0, y: 0 },
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'moveBranch': {
          const result = adapter.execute({
            type: 'moveBranch',
            nodeId: args.nodeId as string,
            branchId: args.branchId as string,
            direction: args.direction === 'left' ? 'left' : 'right',
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'updateBranchData': {
          const result = adapter.execute({
            type: 'updateBranchData',
            nodeId: args.nodeId as string,
            branchId: args.branchId as string,
            data: (args.data as Record<string, unknown>) ?? {},
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'reconnectEdge': {
          const result = adapter.execute({
            type: 'reconnectEdge',
            edgeId: args.edgeId as string,
            source: args.source as string,
            target: args.target as string,
            sourcePort: typeof args.sourcePort === 'string' ? args.sourcePort : undefined,
            targetPort: typeof args.targetPort === 'string' ? args.targetPort : undefined,
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'updateNodeData': {
          const result = adapter.execute({
            type: 'updateNodeData',
            nodeId: args.nodeId as string,
            data: (args.data as Record<string, unknown>) ?? {},
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'updateEdgeData': {
          const result = adapter.execute({
            type: 'updateEdgeData',
            edgeId: args.edgeId as string,
            data: (args.data as Record<string, unknown>) ?? {},
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'export': {
          const result = adapter.execute({ type: 'export' });
          return toActionResult(result);
        }
        case 'undo': {
          const result = adapter.execute({ type: 'undo' });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'redo': {
          const result = adapter.execute({ type: 'redo' });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'toggleGrid': {
          const result = adapter.execute({ type: 'toggleGrid' });
          return toActionResult(result);
        }
        case 'togglePalette': {
          const result = adapter.execute({ type: 'togglePalette' });
          return toActionResult(result);
        }
        case 'toggleInspector': {
          const result = adapter.execute({ type: 'toggleInspector' });
          return toActionResult(result);
        }
        case 'copySelection': {
          const result = adapter.execute({ type: 'copySelection' });
          return toActionResult(result);
        }
        case 'pasteClipboard': {
          const result = adapter.execute({ type: 'pasteClipboard' });
          return toActionResult(result);
        }
        case 'setViewport': {
          const result = adapter.execute({
            type: 'setViewport',
            viewport: (args.viewport as { x: number; y: number; zoom: number } | undefined) ?? {
              x: 0,
              y: 0,
              zoom: 1,
            },
          });
          return toActionResult(result);
        }
        case 'save': {
          const result = adapter.execute({ type: 'save' });
          return toActionResult(result);
        }
        case 'restore': {
          const result = adapter.execute({ type: 'restore' });
          return toActionResult(result);
        }
        case 'beginTransaction': {
          const txId = core.beginTransaction(
            typeof args.label === 'string' ? args.label : undefined,
            typeof args.transactionId === 'string' ? args.transactionId : undefined,
          );
          return { ok: true, data: txId };
        }
        case 'commitTransaction': {
          const result = core.commitTransaction(
            typeof args.transactionId === 'string' ? args.transactionId : undefined,
          );
          return mapTransactionResult(result);
        }
        case 'rollbackTransaction': {
          const result = core.rollbackTransaction(
            typeof args.transactionId === 'string' ? args.transactionId : undefined,
          );
          return mapTransactionResult(result);
        }
        case 'toggleNodeSelection': {
          const result = core.toggleNodeSelection(args.nodeId as string);
          return mapCoreResult(result);
        }
        case 'toggleEdgeSelection': {
          const result = core.toggleEdgeSelection(args.edgeId as string);
          return mapCoreResult(result);
        }
        case 'selectAllNodes': {
          core.selectAllNodes();
          return { ok: true };
        }
        case 'setSelection': {
          const nodeIds = Array.isArray(args.nodeIds) ? args.nodeIds.map(String) : [];
          const edgeIds = Array.isArray(args.edgeIds) ? args.edgeIds.map(String) : [];
          const snapshot = core.getSnapshot();
          const nodeSet = new Set(snapshot.doc.nodes.map((node) => node.id));
          const edgeSet = new Set(snapshot.doc.edges.map((edge) => edge.id));
          if (nodeIds.some((nodeId) => !nodeSet.has(nodeId)) || edgeIds.some((edgeId) => !edgeSet.has(edgeId))) {
            return mapCoreResult({ ok: false, reason: 'missing-selection-target' });
          }
          core.setSelection(nodeIds, edgeIds);
          return { ok: true };
        }
        case 'moveNodes': {
          const deltas = args.deltas as Record<string, { dx: number; dy: number }>;
          const nodeSet = new Set(core.getSnapshot().doc.nodes.map((node) => node.id));
          if (Object.keys(deltas).some((nodeId) => !nodeSet.has(nodeId))) {
            return mapCoreResult({ ok: false, reason: 'missing-node' });
          }
          core.moveNodes(deltas);
          return { ok: true };
        }
        case 'updateMultipleNodes': {
          const updates = args.updates as Array<{ nodeId: string; data: Record<string, unknown> }>;
          const nodeSet = new Set(core.getSnapshot().doc.nodes.map((node) => node.id));
          if (updates.some((update) => !nodeSet.has(update.nodeId))) {
            return mapCoreResult({ ok: false, reason: 'missing-node' });
          }
          core.updateMultipleNodes(updates);
          return { ok: true };
        }
        default:
          return { ok: false, error: new Error(`Unknown designer method: ${method}`) };
      }
    },
  };
}
