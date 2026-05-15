import type { ActionNamespaceProvider } from '@nop-chaos/flux-core';
import type { DesignerCore } from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter.js';
import type { DesignerCommandAdapter } from './designer-command-adapter.js';
import { notifyCommandFailure, toActionResult } from './designer-context.js';

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
      switch (method) {
        case 'addNode': {
          const result = adapter.execute({
            type: 'addNode',
            nodeType: String(payload?.nodeType ?? ''),
            position: (payload?.position as { x: number; y: number } | undefined) ?? {
              x: 200,
              y: 120,
            },
            data: payload?.data as Record<string, unknown> | undefined,
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'addBranch': {
          const result = adapter.execute({
            type: 'addBranch',
            nodeId: String(payload?.nodeId ?? ''),
            branchData: payload?.branchData as Record<string, unknown> | undefined,
            childType: typeof payload?.childType === 'string' ? payload.childType : undefined,
            childData: payload?.childData as Record<string, unknown> | undefined,
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'addEdge': {
          const result = adapter.execute({
            type: 'addEdge',
            source: String(payload?.source ?? ''),
            target: String(payload?.target ?? ''),
            sourcePort: typeof payload?.sourcePort === 'string' ? payload.sourcePort : undefined,
            targetPort: typeof payload?.targetPort === 'string' ? payload.targetPort : undefined,
            data: payload?.data as Record<string, unknown> | undefined,
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'clearSelection': {
          const result = adapter.execute({ type: 'clearSelection' });
          return toActionResult(result);
        }
        case 'selectNode': {
          const result = adapter.execute({
            type: 'selectNode',
            nodeId: typeof payload?.nodeId === 'string' ? payload.nodeId : null,
          });
          return toActionResult(result);
        }
        case 'selectBranch': {
          const result = adapter.execute({
            type: 'selectBranch',
            nodeId: String(payload?.nodeId ?? ''),
            branchId: typeof payload?.branchId === 'string' ? payload.branchId : null,
          });
          return toActionResult(result);
        }
        case 'selectEdge': {
          const result = adapter.execute({
            type: 'selectEdge',
            edgeId: typeof payload?.edgeId === 'string' ? payload.edgeId : null,
          });
          return toActionResult(result);
        }
        case 'deleteNode': {
          const result = adapter.execute({
            type: 'deleteNode',
            nodeId: String(payload?.nodeId ?? ''),
          });
          return toActionResult(result);
        }
        case 'deleteBranch': {
          const result = adapter.execute({
            type: 'deleteBranch',
            nodeId: String(payload?.nodeId ?? ''),
            branchId: String(payload?.branchId ?? ''),
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
            edgeId: String(payload?.edgeId ?? ''),
          });
          return toActionResult(result);
        }
        case 'deleteSelection': {
          const result = adapter.execute({ type: 'deleteSelection' });
          return toActionResult(result);
        }
        case 'duplicateNode': {
          const result = adapter.execute({
            type: 'duplicateNode',
            nodeId: String(payload?.nodeId ?? ''),
          });
          notifyCommandFailure({
            notify: ctx?.runtime?.env?.notify,
            error: result.error,
            reason: result.reason,
          });
          return toActionResult(result);
        }
        case 'moveNode': {
          const result = adapter.execute({
            type: 'moveNode',
            nodeId: String(payload?.nodeId ?? ''),
            position: (payload?.position as { x: number; y: number } | undefined) ?? { x: 0, y: 0 },
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
            nodeId: String(payload?.nodeId ?? ''),
            branchId: String(payload?.branchId ?? ''),
            direction: payload?.direction === 'left' ? 'left' : 'right',
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
            nodeId: String(payload?.nodeId ?? ''),
            branchId: String(payload?.branchId ?? ''),
            data: (payload?.data as Record<string, unknown>) ?? {},
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
            edgeId: String(payload?.edgeId ?? ''),
            source: String(payload?.source ?? ''),
            target: String(payload?.target ?? ''),
            sourcePort: typeof payload?.sourcePort === 'string' ? payload.sourcePort : undefined,
            targetPort: typeof payload?.targetPort === 'string' ? payload.targetPort : undefined,
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
            nodeId: String(payload?.nodeId ?? ''),
            data: (payload?.data as Record<string, unknown>) ?? {},
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
            edgeId: String(payload?.edgeId ?? ''),
            data: (payload?.data as Record<string, unknown>) ?? {},
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
        case 'setViewport': {
          const result = adapter.execute({
            type: 'setViewport',
            viewport: (payload?.viewport as { x: number; y: number; zoom: number } | undefined) ?? {
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
            typeof payload?.label === 'string' ? payload.label : undefined,
            typeof payload?.transactionId === 'string' ? payload.transactionId : undefined,
          );
          return { ok: true, data: txId };
        }
        case 'commitTransaction': {
          core.commitTransaction(
            typeof payload?.transactionId === 'string' ? payload.transactionId : undefined,
          );
          return { ok: true };
        }
        case 'rollbackTransaction': {
          core.rollbackTransaction(
            typeof payload?.transactionId === 'string' ? payload.transactionId : undefined,
          );
          return { ok: true };
        }
        case 'toggleNodeSelection': {
          if (typeof payload?.nodeId !== 'string') {
            return { ok: false, error: new Error('toggleNodeSelection requires nodeId') };
          }
          core.toggleNodeSelection(payload.nodeId);
          return { ok: true };
        }
        case 'toggleEdgeSelection': {
          if (typeof payload?.edgeId !== 'string') {
            return { ok: false, error: new Error('toggleEdgeSelection requires edgeId') };
          }
          core.toggleEdgeSelection(payload.edgeId);
          return { ok: true };
        }
        case 'selectAllNodes': {
          core.selectAllNodes();
          return { ok: true };
        }
        case 'setSelection': {
          const nodeIds = Array.isArray(payload?.nodeIds) ? payload.nodeIds.map(String) : [];
          const edgeIds = Array.isArray(payload?.edgeIds) ? payload.edgeIds.map(String) : [];
          core.setSelection(nodeIds, edgeIds);
          return { ok: true };
        }
        case 'moveNodes': {
          if (!payload?.deltas || typeof payload.deltas !== 'object') {
            return { ok: false, error: new Error('moveNodes requires deltas') };
          }
          core.moveNodes(payload.deltas as Record<string, { dx: number; dy: number }>);
          return { ok: true };
        }
        case 'updateMultipleNodes': {
          if (!Array.isArray(payload?.updates)) {
            return { ok: false, error: new Error('updateMultipleNodes requires updates array') };
          }
          core.updateMultipleNodes(
            payload.updates as Array<{ nodeId: string; data: Record<string, unknown> }>,
          );
          return { ok: true };
        }
        default:
          return { ok: false, error: new Error(`Unknown designer method: ${method}`) };
      }
    },
  };
}
