import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import type { RendererComponentProps, SchemaValue } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, useCurrentActionScope, useRendererEnv } from '@nop-chaos/flux-react';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCommandAdapter } from './designer-command-adapter';
import type { DesignerPageSchema } from './schemas';
import {
  DesignerContext,
  type DesignerContextValue,
  useDesignerSnapshot,
  useDesignerHostScope,
  notifyCommandFailure
} from './designer-context';
import { createDesignerActionProvider } from './designer-action-provider';
import { DesignerPaletteContent } from './designer-palette';
import { DesignerCanvasContent } from './designer-canvas';
import { DefaultInspector } from './designer-inspector';

export function DesignerPageRenderer(props: RendererComponentProps<DesignerPageSchema>) {
  const schemaProps = props.props as Record<string, SchemaValue>;
  const document = schemaProps.document as unknown as GraphDocument;
  const config = schemaProps.config as unknown as DesignerConfig;

  const core = useMemo(() => {
    if (!document || !config) return null;
    return createDesignerCore(document, config);
  }, [document, config]);

  const snapshot = useDesignerSnapshot(core!);
  const env = useRendererEnv();
  const commandAdapter = useMemo(() => (core ? createDesignerCommandAdapter(core) : null), [core]);
  const dispatch = useCallback(
    (command: import('./designer-command-adapter').DesignerCommand) => {
      const result = commandAdapter!.execute(command);
      notifyCommandFailure(env.notify, result.error, result.reason);
      return result;
    },
    [commandAdapter, env]
  );

  const ctxValue = useMemo<DesignerContextValue>(
    () => ({ core: core!, commandAdapter: commandAdapter!, dispatch, snapshot, config }),
    [commandAdapter, core, dispatch, snapshot, config]
  );
  const actionScope = useCurrentActionScope();
  const designerProvider = useMemo(() => (core ? createDesignerActionProvider(core) : undefined), [core]);
  const designerScope = useDesignerHostScope({ snapshot, config, core: core!, path: props.path });

  useLayoutEffect(() => {
    if (!actionScope || !designerProvider) {
      return;
    }

    return actionScope.registerNamespace('designer', designerProvider);
  }, [actionScope, designerProvider]);

  const toolbarSlot = props.regions.toolbar?.render({ scope: designerScope, actionScope }) ?? ((props.props as Record<string, unknown>).toolbar as React.ReactNode);
  const inspectorSlot = props.regions.inspector?.render({ scope: designerScope, actionScope }) ?? ((props.props as Record<string, unknown>).inspector as React.ReactNode);
  const dialogsSlot = props.regions.dialogs?.render({ scope: designerScope, actionScope }) ?? ((props.props as Record<string, unknown>).dialogs as React.ReactNode);

  if (!core) {
    return <div>Designer requires document and config props</div>;
  }

  return (
    <DesignerContext.Provider value={ctxValue}>
      <div className="fd-page nop-theme-root fd-theme-root">
        <div className="fd-page__header">
          {hasRendererSlotContent(toolbarSlot) ? toolbarSlot : null}
        </div>
        <div className="fd-page__content">
          <div className="fd-page__palette">
            <DesignerPaletteContent />
          </div>
      <div className="fd-page__canvas">
        <DesignerCanvasContent />
      </div>
          <div className="fd-page__inspector">
            {hasRendererSlotContent(inspectorSlot) ? inspectorSlot : <DefaultInspector />}
          </div>
        </div>
        {hasRendererSlotContent(dialogsSlot) ? <div className="fd-page__dialogs">{dialogsSlot}</div> : null}
      </div>
    </DesignerContext.Provider>
  );
}

export function DesignerCanvasRenderer() {
  return <DesignerCanvasContent />;
}

export function DesignerPaletteRenderer() {
  return <DesignerPaletteContent />;
}
