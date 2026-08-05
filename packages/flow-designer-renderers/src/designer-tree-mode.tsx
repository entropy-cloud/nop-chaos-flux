import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { reportRuntimeHostIssue } from '@nop-chaos/flux-core';
import type { DesignerConfig, TreeDocument, TreeProjectionError } from '@nop-chaos/flow-designer-core';
import { createTreeDesignerCore } from '@nop-chaos/flow-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { useCurrentActionScope, useRendererEnv } from '@nop-chaos/flux-react';
import type { DesignerPageSchema } from './schemas.js';
import { DesignerPageInner } from './designer-page-inner.js';
import { TreeDocumentSession, createTreeSessionId } from './tree-session.js';

function readDesignerResolvedProp<T>(
  props: RendererComponentProps<DesignerPageSchema>,
  key: string,
): T | undefined {
  return props.props[key] as T | undefined;
}

function isActionSchemaInput(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { action?: unknown }).action === 'string'
  );
}

function formatTreeProjectionError(error: TreeProjectionError | undefined): string {
  if (!error) {
    return t('flux.flowDesigner.treeDocumentInvalid');
  }
  return `${error.code}${error.path ? ` @ ${error.path}` : ''}: ${error.message}`;
}

interface TreeModeLayoutWrapperProps extends RendererComponentProps<DesignerPageSchema> {
  config: DesignerConfig;
}

export function TreeModeLayoutWrapper(props: TreeModeLayoutWrapperProps) {
  const { config } = props;
  const env = useRendererEnv();
  const actionScope = useCurrentActionScope();
  const inputTreeDocument = readDesignerResolvedProp<TreeDocument>(props, 'treeDocument');
  const inputEpoch = readDesignerResolvedProp<number | undefined>(props, 'treeDocumentEpoch');
  const ackSessionId = readDesignerResolvedProp<string | undefined>(props, 'treeDocumentAckSessionId');
  const ackDispatchId = readDesignerResolvedProp<number | undefined>(props, 'treeDocumentAckDispatchId');
  const changeAction = readDesignerResolvedProp<unknown>(props, 'treeDocumentChangeAction');

  const [creationResult] = useState(() =>
    inputTreeDocument ? createTreeDesignerCore(inputTreeDocument, config) : null,
  );
  const core = creationResult?.ok ? creationResult.core : null;
  const sessionRef = useRef<TreeDocumentSession | null>(null);
  const [, setSessionVersion] = useState(0);
  const reportHostIssue = useCallback(
    (input: { message: string; error?: unknown; details?: Record<string, unknown> }) => {
      reportRuntimeHostIssue({
        env,
        level: 'error',
        message: input.message,
        error: input.error,
        phase: 'render',
        details: input.details,
      });
    },
    [env],
  );

  const sessionId = useMemo(() => createTreeSessionId(), []);
  const normalizedChangeAction = useMemo(() => {
    if (!isActionSchemaInput(changeAction)) {
      return undefined;
    }
    return changeAction as import('@nop-chaos/flux-core').ActionSchema;
  }, [changeAction]);

  useEffect(() => {
    if (!core) {
      return;
    }
    const session = new TreeDocumentSession(
      {
        core,
        sessionId,
        changeAction: normalizedChangeAction,
        helpers: props.helpers,
        designerScope: props.node.scope,
        actionScope,
        reportHostIssue,
      },
      {
        onStateChange: () => setSessionVersion((value) => value + 1),
      },
    );
    sessionRef.current = session;

    const unsubscribe = core.subscribe((event) => {
      if (event.type !== 'treeChanged') {
        return;
      }
      session.enqueueTreeChange(event.tree, event.reason, event.commandType);
    });

    void session.dispatchNext();

    return () => {
      session.dispose();
      sessionRef.current = null;
      unsubscribe();
    };
  }, [core, sessionId, normalizedChangeAction, props.helpers, props.node.scope, actionScope, reportHostIssue]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session || !inputTreeDocument) {
      return;
    }
    const outcome = session.applyHostInput({
      treeDocument: inputTreeDocument,
      epoch: inputEpoch,
      ackSessionId,
      ackDispatchId,
    });
    if (outcome.error) {
      reportHostIssue({
        message: `Tree host input rejected: ${outcome.error}`,
        details: { reason: outcome.error, sessionId },
      });
    }
    if (outcome.outcome === 'epoch-replaced') {
      queueMicrotask(() => setSessionVersion((value) => value + 1));
    }
  }, [inputTreeDocument, inputEpoch, ackSessionId, ackDispatchId, sessionId, reportHostIssue]);

  if (!inputTreeDocument) {
    return <div>{t('flux.flowDesigner.treeDocumentRequired')}</div>;
  }

  if (!creationResult) {
    return <div>{t('flux.flowDesigner.treeDocumentRequired')}</div>;
  }

  if (!creationResult.ok) {
    return (
      <div role="alert" data-testid="designer-tree-error-surface">
        {formatTreeProjectionError(creationResult.error)}
      </div>
    );
  }

  return (
    <DesignerPageInner
      rendererProps={props}
      config={config}
      core={core ?? undefined}
      treeDocument={inputTreeDocument}
    />
  );
}
