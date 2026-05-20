import type { DesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerCommand, DesignerCommandResult } from './designer-command-types.js';
import {
  createFailure,
  createSuccess,
  getNode,
  hasEdge,
  inferAddNodeFailure,
  relayoutAfterTreeMutation,
  validateEdgeMutation,
  viewportsEqual,
} from './designer-command-adapter-helpers.js';

function captureLifecycleHookFailure<T>(
  core: DesignerCore,
  run: () => T,
): { result: T; error: unknown } {
  let capturedError: unknown;
  const unsubscribe = core.subscribe((event) => {
    if (event.type === 'lifecycleHookError') {
      capturedError = event.error;
    }
  });

  try {
    return {
      result: run(),
      error: capturedError,
    };
  } finally {
    unsubscribe();
  }
}

export function executeGraphOnlyCommand(
  core: DesignerCore,
  command: DesignerCommand,
): DesignerCommandResult | undefined {
  switch (command.type) {
    case 'addEdge': {
      const validation = validateEdgeMutation(
        core,
        command.source,
        command.target,
        command.sourcePort,
        command.targetPort,
      );
      if (validation.error) {
        return createFailure(core, validation.error, validation.reason);
      }

      const { result: edge, error } = captureLifecycleHookFailure(core, () =>
        core.addEdge(
          command.source,
          command.target,
          command.data,
          command.sourcePort,
          command.targetPort,
        ),
      );
      if (!edge) {
        return createFailure(core, error ?? 'Unable to add edge.');
      }

      return createSuccess(core, { data: edge });
    }
    case 'addNode': {
      const { result: node, error } = captureLifecycleHookFailure(core, () =>
        core.addNode(command.nodeType, command.position ?? { x: 200, y: 120 }, command.data),
      );
      if (!node) {
        if (error) {
          return createFailure(core, error);
        }
        const failure = inferAddNodeFailure(core, command.nodeType);
        return createFailure(core, failure.error, failure.reason);
      }

      return createSuccess(core, { data: node });
    }
    case 'deleteEdge':
      {
        const { error } = captureLifecycleHookFailure(core, () => core.deleteEdge(command.edgeId));
        if (error) {
          return createFailure(core, error);
        }
      }
      relayoutAfterTreeMutation(core);
      return createSuccess(core);
    case 'deleteNode':
      {
        const { error } = captureLifecycleHookFailure(core, () => core.deleteNode(command.nodeId));
        if (error) {
          return createFailure(core, error);
        }
      }
      relayoutAfterTreeMutation(core);
      return createSuccess(core);
    case 'duplicateNode': {
      const node = core.duplicateNode(command.nodeId);
      if (!node) {
        return createFailure(core, `Unknown node: ${command.nodeId}`, 'missing-node');
      }

      return createSuccess(core, { data: node });
    }
    case 'moveNode': {
      const node = getNode(core.getDocument(), command.nodeId);
      if (!node) {
        return createFailure(core, `Unknown node: ${command.nodeId}`, 'missing-node');
      }

      if (node.position.x === command.position.x && node.position.y === command.position.y) {
        return createSuccess(core, { data: node, reason: 'unchanged' });
      }

      core.moveNode(command.nodeId, command.position);
      return createSuccess(core, {
        data: core.getDocument().nodes.find((nextNode) => nextNode.id === command.nodeId),
      });
    }
    case 'reconnectEdge': {
      if (!hasEdge(core.getDocument(), command.edgeId)) {
        return createFailure(core, `Unknown edge: ${command.edgeId}`, 'missing-edge');
      }

      const validation = validateEdgeMutation(
        core,
        command.source,
        command.target,
        command.sourcePort,
        command.targetPort,
        command.edgeId,
      );
      if (validation.error) {
        return createFailure(core, validation.error, validation.reason);
      }

      const result = core.reconnectEdge(
        command.edgeId,
        command.source,
        command.target,
        command.sourcePort,
        command.targetPort,
      );
      if (!result.ok) {
        return createFailure(
          core,
          result.error ?? 'Unable to reconnect edge.',
          (result.reason as import('./designer-command-types.js').DesignerCommandReason | undefined) ??
            'missing-edge',
        );
      }

      return createSuccess(core, {
        data: result.edge,
        reason: result.reason as
          | import('./designer-command-types.js').DesignerCommandReason
          | undefined,
      });
    }
    case 'setViewport': {
      const previousViewport = core.getSnapshot().viewport;
      core.setViewport(command.viewport);
      const nextSnapshot = core.getSnapshot();
      if (viewportsEqual(previousViewport, nextSnapshot.viewport)) {
        return {
          ok: true,
          snapshot: nextSnapshot,
          reason: 'unchanged',
        };
      }

      return {
        ok: true,
        snapshot: nextSnapshot,
        data: nextSnapshot.viewport,
      };
    }
    case 'updateEdgeData':
      if (!hasEdge(core.getDocument(), command.edgeId)) {
        return createFailure(core, `Unknown edge: ${command.edgeId}`, 'missing-edge');
      }
      core.updateEdge(command.edgeId, command.data);
      return createSuccess(core);
    default:
      return undefined;
  }
}
