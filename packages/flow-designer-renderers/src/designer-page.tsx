import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ActionNamespaceProvider, RendererComponentProps, SchemaValue } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, useCurrentActionScope, useRendererEnv } from '@nop-chaos/flux-react';
import { createDesignerCore, layoutWithElk } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig, GraphDocument } from '@nop-chaos/flow-designer-core';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@nop-chaos/ui';
import { DataViewer } from '@nop-chaos/ui';
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
import { DesignerToolbarContent } from './designer-toolbar';

function normalizeShortcut(input: string): string[] {
  return input.toLowerCase().split('+').map((part) => part.trim()).filter(Boolean);
}

function matchesShortcut(event: KeyboardEvent, shortcuts: string[] | undefined): boolean {
  if (!shortcuts || shortcuts.length === 0) {
    return false;
  }

  const eventKey = event.key.toLowerCase();
  return shortcuts.some((shortcut) => {
    const keys = normalizeShortcut(shortcut);
    const wantsCtrl = keys.includes('ctrl');
    const wantsMeta = keys.includes('cmd') || keys.includes('meta');
    const wantsShift = keys.includes('shift');
    const wantsAlt = keys.includes('alt') || keys.includes('option');
    const key = keys.find((part) => !['ctrl', 'cmd', 'meta', 'shift', 'alt', 'option'].includes(part));
    if (!key) {
      return false;
    }

    if (wantsCtrl !== event.ctrlKey) return false;
    if (wantsMeta !== event.metaKey) return false;
    if (wantsShift !== event.shiftKey) return false;
    if (wantsAlt !== event.altKey) return false;
    return key === eventKey.toLowerCase();
  });
}

export function DesignerPageRenderer(props: RendererComponentProps<DesignerPageSchema>) {
  const rawSchemaProps = props.schema as Record<string, SchemaValue>;
  const document = rawSchemaProps.document as GraphDocument | undefined;
  const config = rawSchemaProps.config as DesignerConfig | undefined;

  if (!document || !config) {
    return <div>Designer requires document and config props</div>;
  }

  return DesignerPageRendererInner(props, document, config);
}

function DesignerPageRendererInnerBody(props: RendererComponentProps<DesignerPageSchema>, core: ReturnType<typeof createDesignerCore>, snapshot: ReturnType<typeof useDesignerSnapshot>, commandAdapter: ReturnType<typeof createDesignerCommandAdapter>, dispatch: (command: import('./designer-command-adapter').DesignerCommand) => ReturnType<typeof commandAdapter.execute>, config: DesignerConfig) {
  const handleAutoLayout = useCallback(async () => {
    const doc = core.getDocument();
    if (doc.nodes.length === 0) return;

    const positions = await layoutWithElk(doc.nodes, doc.edges, core.getConfig().nodeTypes);
    core.layoutNodes(positions);
  }, [core]);

  const ctxValue = useMemo<DesignerContextValue>(
    () => ({ core, commandAdapter, dispatch, snapshot, config }),
    [commandAdapter, core, dispatch, snapshot, config]
  );
  const actionScope = useCurrentActionScope();
  const designerProvider = useMemo(() => createDesignerActionProvider(core), [core]);
  const upstreamBackHandler = useMemo(() => actionScope?.resolve('designer:navigate-back'), [actionScope]);
  const mergedDesignerProvider = useMemo<ActionNamespaceProvider | undefined>(() => {
    if (!designerProvider) {
      return undefined;
    }
    if (!upstreamBackHandler) {
      return designerProvider;
    }

    return {
      kind: designerProvider.kind ?? 'host',
      listMethods() {
        const methods = designerProvider.listMethods?.() ?? [];
        if (methods.includes('navigate-back')) {
          return methods;
        }
        return [...methods, 'navigate-back'];
      },
      invoke(method, payload, ctx) {
        if (method === 'navigate-back') {
          return upstreamBackHandler.provider.invoke(upstreamBackHandler.method, payload, ctx);
        }
        return designerProvider.invoke(method, payload, ctx);
      },
      dispose() {
        designerProvider.dispose?.();
      }
    };
  }, [designerProvider, upstreamBackHandler]);
  const designerScope = useDesignerHostScope({ snapshot, config, core, path: props.path });
  const [jsonOpen, setJsonOpen] = React.useState(false);
  const jsonOffsetRef = useRef({ x: 0, y: 0 });
  const jsonDocument = useMemo(() => {
    if (!jsonOpen) return null;
    try { return JSON.parse(core.exportDocument()); }
    catch { return null; }
  }, [core, jsonOpen, snapshot.doc]);

  useLayoutEffect(() => {
    if (!actionScope || !mergedDesignerProvider) {
      return;
    }

    return actionScope.registerNamespace('designer', mergedDesignerProvider);
  }, [actionScope, mergedDesignerProvider]);

  useEffect(() => {
    if (!core.getConfig().features.shortcuts) {
      return;
    }

    const shortcuts = core.getConfig().shortcuts;
    const features = core.getConfig().features;
    const canUseClipboard = features.clipboard !== false;
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (matchesShortcut(event, shortcuts.undo) && features.undo !== false) {
        event.preventDefault();
        dispatch({ type: 'undo' });
        return;
      }
      if (matchesShortcut(event, shortcuts.redo) && features.redo !== false) {
        event.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      if (canUseClipboard && matchesShortcut(event, shortcuts.copy)) {
        event.preventDefault();
        dispatch({ type: 'copySelection' });
        return;
      }
      if (canUseClipboard && matchesShortcut(event, shortcuts.paste)) {
        event.preventDefault();
        dispatch({ type: 'pasteClipboard' });
        return;
      }
      if (matchesShortcut(event, shortcuts.delete)) {
        event.preventDefault();
        dispatch({ type: 'deleteSelection' });
        return;
      }
      if (matchesShortcut(event, shortcuts.save)) {
        event.preventDefault();
        dispatch({ type: 'save' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [core, dispatch]);

  const toolbarSlot = props.regions.toolbar?.render({ scope: designerScope, actionScope });
  const inspectorSlot = props.regions.inspector?.render({ scope: designerScope, actionScope }) ?? ((props.props as Record<string, unknown>).inspector as React.ReactNode);
  const dialogsSlot = props.regions.dialogs?.render({ scope: designerScope, actionScope }) ?? ((props.props as Record<string, unknown>).dialogs as React.ReactNode);

  return (
    <DesignerContext.Provider value={ctxValue}>
      {config.themeStyles && <style>{config.themeStyles}</style>}
      <div className="nop-designer grid grid-rows-[auto_minmax(0,1fr)] h-full min-h-0 gap-3 p-6 text-foreground" style={{ background: 'linear-gradient(135deg, rgba(167, 243, 208, 0.15) 0%, rgba(196, 181, 253, 0.12) 50%, rgba(153, 246, 228, 0.1) 100%)' }}>
        <div className="nop-designer__header min-h-0">
          {hasRendererSlotContent(toolbarSlot) ? toolbarSlot : <DesignerToolbarContent exportActive={jsonOpen} onExportToggle={() => setJsonOpen((value) => !value)} onAutoLayout={handleAutoLayout} />}
        </div>
        <div className="grid grid-cols-[15rem_minmax(0,1fr)_22rem] grid-rows-1 gap-3 min-h-0 h-full max-[1023px]:grid-cols-[15rem_minmax(0,1fr)] max-[1023px]:[&>*:nth-child(3)]:hidden max-[767px]:grid-cols-1 max-[767px]:[&>*:first-child]:hidden">
          <div className="nop-designer__palette min-h-0 overflow-hidden rounded-xl border border-border shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.78)', backdropFilter: 'blur(20px)' }}>
            <DesignerPaletteContent />
          </div>
          <div className="nop-designer__canvas relative min-h-0 overflow-hidden rounded-xl border border-border shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.78)', backdropFilter: 'blur(20px)' }}>
            <DesignerCanvasContent />
          </div>
          <div className="nop-designer__inspector min-h-0 overflow-hidden rounded-xl border border-border shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.78)', backdropFilter: 'blur(20px)' }}>
            {hasRendererSlotContent(inspectorSlot) ? inspectorSlot : <DefaultInspector />}
          </div>
        </div>
        {hasRendererSlotContent(dialogsSlot) ? <div className="relative">{dialogsSlot}</div> : null}
      </div>
      <Dialog open={jsonOpen} onOpenChange={setJsonOpen} draggable noOverlay noCenter closeOnOutsideClick={false}>
        <DialogContent
          offsetRef={jsonOffsetRef}
          aria-describedby={undefined}
          className="right-4 top-[72px] w-[min(560px,calc(100vw-32px))] max-h-[calc(100vh-96px)] p-0 overflow-hidden z-60 flex flex-col sm:max-w-2xl"
        >
          <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
            <DialogTitle className="text-sm">Flow JSON</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            {jsonDocument && (
              <DataViewer data={jsonDocument} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DesignerContext.Provider>
  );
}

function DesignerPageRendererInner(props: RendererComponentProps<DesignerPageSchema>, document: GraphDocument, config: DesignerConfig) {
  const env = useRendererEnv();
  const core = useMemo(() => createDesignerCore(document, config), [document, config]);
  const snapshot = useDesignerSnapshot(core);
  const commandAdapter = useMemo(() => createDesignerCommandAdapter(core), [core]);
  const dispatch = useCallback(
    (command: import('./designer-command-adapter').DesignerCommand) => {
      const result = commandAdapter.execute(command);
      notifyCommandFailure(env.notify, result.error, result.reason);
      return result;
    },
    [commandAdapter, env]
  );

  return DesignerPageRendererInnerBody(props, core, snapshot, commandAdapter, dispatch, config);
}

export function DesignerCanvasRenderer() {
  return <DesignerCanvasContent />;
}

export function DesignerPaletteRenderer() {
  return <DesignerPaletteContent />;
}
