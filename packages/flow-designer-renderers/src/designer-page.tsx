import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import type { ActionNamespaceProvider, RendererComponentProps, SchemaValue } from '@nop-chaos/flux-core';
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
  const document = rawSchemaProps.document as unknown as GraphDocument;
  const config = rawSchemaProps.config as unknown as DesignerConfig;

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
  const designerScope = useDesignerHostScope({ snapshot, config, core: core!, path: props.path });
  const [jsonOpen, setJsonOpen] = React.useState(false);

  useLayoutEffect(() => {
    if (!actionScope || !mergedDesignerProvider) {
      return;
    }

    return actionScope.registerNamespace('designer', mergedDesignerProvider);
  }, [actionScope, mergedDesignerProvider]);

  useEffect(() => {
    if (!core) {
      return;
    }
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

  if (!core) {
    return <div>Designer requires document and config props</div>;
  }

  return (
    <DesignerContext.Provider value={ctxValue}>
      {config.themeStyles && <style>{config.themeStyles}</style>}
      <div className="nop-designer grid grid-rows-[auto_minmax(0,1fr)] h-full min-h-0 gap-3 p-6 text-foreground" style={{ background: 'linear-gradient(135deg, rgba(167, 243, 208, 0.15) 0%, rgba(196, 181, 253, 0.12) 50%, rgba(153, 246, 228, 0.1) 100%)' }}>
        <div className="nop-designer__header min-h-0">
          {hasRendererSlotContent(toolbarSlot) ? toolbarSlot : <DesignerToolbarContent exportActive={jsonOpen} onExportToggle={() => setJsonOpen((value) => !value)} />}
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
      {jsonOpen ? (
        <div role="dialog" aria-label="Flow JSON preview">
          <div className="fixed right-4 top-[72px] w-[min(560px,calc(100vw-32px))] max-h-[calc(100vh-96px)] border border-border rounded-[14px] bg-card shadow-[0_16px_40px_rgba(15,23,42,0.18)] overflow-hidden z-60">
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
              <h3 className="m-0 text-[13px] font-bold text-foreground">Flow JSON</h3>
              <button type="button" className="border border-border rounded-lg bg-secondary text-secondary-foreground w-7 h-7 cursor-pointer hover:bg-secondary/80" aria-label="Close JSON preview" onClick={() => setJsonOpen(false)}>
                ✕
              </button>
            </div>
            <pre className="m-0 p-3 overflow-auto max-h-[calc(100vh-156px)] font-mono text-xs leading-relaxed bg-[#0b1220] text-[#dbe9ff]">{core.exportDocument()}</pre>
          </div>
        </div>
      ) : null}
    </DesignerContext.Provider>
  );
}

export function DesignerCanvasRenderer() {
  return <DesignerCanvasContent />;
}

export function DesignerPaletteRenderer() {
  return <DesignerPaletteContent />;
}
