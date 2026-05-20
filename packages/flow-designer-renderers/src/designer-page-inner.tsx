import React, { useCallback, useEffect, useMemo } from 'react';
import { reportRuntimeHostIssue, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererEnv } from '@nop-chaos/flux-react';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument, TreeDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter.js';
import type { DesignerPageSchema } from './schemas.js';
import { notifyCommandFailure } from './designer-context.js';
import { DesignerPageBody } from './designer-page-body.js';

interface DesignerPageInnerProps {
  rendererProps: RendererComponentProps<DesignerPageSchema>;
  document?: GraphDocument;
  config: DesignerConfig;
  core?: ReturnType<typeof createDesignerCore>;
  treeDocument?: TreeDocument;
  setTreeDocument?: React.Dispatch<React.SetStateAction<TreeDocument | undefined>>;
}

export function DesignerPageInner({
  rendererProps: props,
  document,
  config,
  core: providedCore,
  treeDocument,
  setTreeDocument,
}: DesignerPageInnerProps) {
  const env = useRendererEnv();
  const core = useMemo(() => {
    if (providedCore) {
      return providedCore;
    }
    if (!document) {
      throw new Error('DesignerPageInner requires document when core is not provided.');
    }
    return createDesignerCore(document, config);
  }, [config, document, providedCore]);
  const commandAdapter = useMemo(
    () =>
      createDesignerCommandAdapter(
        core,
        config.documentMode === 'tree' && treeDocument && setTreeDocument
          ? {
              getTreeDocument: () => treeDocument,
              setTreeDocument: (next) => setTreeDocument(next),
              config,
            }
          : undefined,
      ),
    [core, config, treeDocument, setTreeDocument],
  );
  const dispatch = useCallback(
    (command: import('./designer-command-adapter.js').DesignerCommand) => {
      const result = commandAdapter.execute(command);
      notifyCommandFailure({ notify: env.notify, error: result.error, reason: result.reason });
      return result;
    },
    [commandAdapter, env],
  );

  useEffect(
    () =>
      core.subscribe((event) => {
        if (event.type !== 'lifecycleHookError') {
          return;
        }

        const message =
          event.error instanceof Error
            ? event.error.message
            : typeof event.error === 'string'
              ? event.error
              : String(event.error);

        reportRuntimeHostIssue({
          env,
          level: 'warning',
          message,
          error: event.error,
          phase: 'render',
          details: {
            reason: 'designer-lifecycle-hook-failed',
            hook: event.hook,
            documentMode: config.documentMode,
          },
        });
      }),
    [config.documentMode, core, env],
  );

  return (
    <DesignerPageBody
      rendererProps={props}
      core={core}
      commandAdapter={commandAdapter}
      dispatch={dispatch}
      config={config}
    />
  );
}
