import type {
  ReportDesignerConfig,
  ReportTemplateDocument,
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
  FieldSourceSnapshot,
  FieldDragState,
  InspectorRuntimeState,
} from './types.js';
import { getTargetMeta } from './types.js';
import type { ReportDesignerCommand, ReportDesignerCommandResult } from './commands.js';
import type { ReportDesignerAdapterRegistry, ReportDesignerProfile } from './adapters.js';
import { applyFieldDrop, cloneDocument, mergeMetadata, updateMetadata } from './runtime/metadata.js';
import { createAdapterContext } from './runtime/adapter-context.js';
import { resolvePreviewAdapter, runPreviewCommand } from './runtime/preview-commands.js';
import {
  exportTemplateWithCodec,
  importTemplateWithCodec,
  resolveCodecAdapter,
} from './runtime/codec-commands.js';

export interface ReportDesignerInternalState {
  document: ReportTemplateDocument;
  savedDocument: ReportTemplateDocument;
  spreadsheetSyncSource?: ReportTemplateDocument['spreadsheet'];
  selectionTarget: ReportSelectionTarget | undefined;
  inspector: InspectorRuntimeState;
  fieldSources: FieldSourceSnapshot[];
  fieldDrag: FieldDragState;
  preview: {
    running: boolean;
    mode?: string;
    lastResult?: unknown;
  };
  undoStack: ReportTemplateDocument[];
  redoStack: ReportTemplateDocument[];
}

export interface DispatchContext {
  store: {
    getState: () => ReportDesignerInternalState;
    setState: (
      updater:
        | Partial<ReportDesignerInternalState>
        | ((s: ReportDesignerInternalState) => ReportDesignerInternalState),
    ) => void;
  };
  registry: ReportDesignerAdapterRegistry;
  config: ReportDesignerConfig;
  profile: ReportDesignerProfile | undefined;
  allowedFieldDropIds: Set<string> | undefined;
  buildSnapshot: (state: ReportDesignerInternalState) => ReportDesignerRuntimeSnapshot;
  refreshDerivedState: () => Promise<unknown>;
  setSelectionTarget: (target?: ReportSelectionTarget) => Promise<void>;
  pushUndoEntry: (current: ReportDesignerInternalState) => Partial<ReportDesignerInternalState>;
  startPreviewRun: () => { requestId: number; signal: AbortSignal };
  cancelPreviewRun: () => void;
  isCurrentPreviewRun: (requestId: number) => boolean;
}

import { isAbortError } from '@nop-chaos/flux-core';

export async function dispatchReportDesignerCommand(
  ctx: DispatchContext,
  command: ReportDesignerCommand,
): Promise<ReportDesignerCommandResult> {
  const { store, registry, config, profile, allowedFieldDropIds } = ctx;

  async function withDerivedRefresh<T>(fn: () => Promise<T> | T): Promise<T> {
    const result = await fn();
    await ctx.refreshDerivedState();
    return result;
  }

  try {
    switch (command.type) {
      case 'report-designer:dropFieldToTarget': {
        return withDerivedRefresh(async () => {
          const current = store.getState();
          const adapter = Array.from(registry.fieldDrops.values()).find(
            (candidate) =>
              (!allowedFieldDropIds || allowedFieldDropIds.has(candidate.id)) &&
              candidate.canHandle(command.field, command.target),
          );

          if (!adapter) {
            const result = applyFieldDrop(current.document, command.field, command.target);
            store.setState((s) => ({
              ...s,
              ...ctx.pushUndoEntry(s),
              document: result.document,
              fieldDrag: { active: false },
            }));
            return { ok: true, changed: result.changed };
          }

          const adapterContext = createAdapterContext({
            config,
            document: current.document,
            designer: ctx.buildSnapshot(current),
            profile,
          });
          const currentMeta = getTargetMeta(current.document.semantic, command.target);
          const patch = adapter.mapDropToMetaPatch({
            field: command.field,
            target: command.target,
            currentMeta,
            context: adapterContext,
          });
          const nextMeta = mergeMetadata(currentMeta, patch);
          const result = updateMetadata(current.document, command.target, nextMeta);

          store.setState((s) => ({
            ...s,
            ...ctx.pushUndoEntry(s),
            document: result.document,
            selectionTarget: command.target,
            fieldDrag: {
              active: false,
              sourceId: command.field.sourceId,
              fieldId: command.field.fieldId,
              payload: { ...command.field, data: { ...command.field.data } },
              hoverTarget: command.target,
            },
          }));

          return { ok: true, changed: result.changed };
        });
      }

      case 'report-designer:updateMeta': {
        return withDerivedRefresh(async () => {
          const current = store.getState();
          const currentMeta = getTargetMeta(current.document.semantic, command.target);
          const nextMeta = mergeMetadata(currentMeta, command.patch);
          const result = updateMetadata(current.document, command.target, nextMeta);
          store.setState((s) => ({ ...s, ...ctx.pushUndoEntry(s), document: result.document }));

          return { ok: true, changed: result.changed };
        });
      }

      case 'report-designer:replaceMeta': {
        return withDerivedRefresh(async () => {
          const current = store.getState();
          const result = updateMetadata(current.document, command.target, command.nextMeta);
          store.setState((s) => ({ ...s, ...ctx.pushUndoEntry(s), document: result.document }));

          return { ok: true, changed: result.changed };
        });
      }

      case 'report-designer:openInspector': {
        await ctx.setSelectionTarget(command.target ?? store.getState().selectionTarget);
        store.setState((current) => ({
          ...current,
          inspector: { ...current.inspector, open: true },
        }));
        return { ok: true, changed: true };
      }

      case 'report-designer:closeInspector': {
        const wasOpen = store.getState().inspector.open;
        store.setState((current) => ({
          ...current,
          inspector: { ...current.inspector, open: false },
        }));
        return { ok: true, changed: wasOpen };
      }

      case 'report-designer:preview': {
        const { requestId, signal } = ctx.startPreviewRun();
        store.setState((current) => ({
          ...current,
          preview: { ...current.preview, running: true, mode: command.mode },
        }));

        const previewResolution = resolvePreviewAdapter({
          config,
          adapters: registry,
          profile,
        });
        if ('error' in previewResolution) {
          if (ctx.isCurrentPreviewRun(requestId)) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode },
            }));
            ctx.cancelPreviewRun();
          }
          return { ok: false, changed: false, error: previewResolution.error };
        }

        try {
          const result = await runPreviewCommand({
            adapter: previewResolution.adapter,
            config,
            document: store.getState().document,
            designer: ctx.buildSnapshot(store.getState()),
            profile,
            mode: command.mode,
            commandArgs: command.args,
            signal,
          });

          if (ctx.isCurrentPreviewRun(requestId)) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode, lastResult: result },
            }));
            ctx.cancelPreviewRun();
          }

          return { ok: result.ok, changed: false, data: result.data, error: result.error };
        } catch (err) {
          if (ctx.isCurrentPreviewRun(requestId)) {
            store.setState((current) => ({
              ...current,
              preview: { running: false, mode: command.mode },
            }));
            ctx.cancelPreviewRun();
          }
          if (isAbortError(err)) {
            return { ok: false, changed: false, cancelled: true, error: err };
          }
          return { ok: false, changed: false, error: err };
        }
      }

      case 'report-designer:importTemplate': {
        return withDerivedRefresh(async () => {
          const codecResolution = resolveCodecAdapter({ adapters: registry, profile });
          if ('error' in codecResolution) {
            return { ok: false, changed: false, error: codecResolution.error };
          }
          const imported = await importTemplateWithCodec({
            adapter: codecResolution.adapter,
            payload: command.payload,
            config,
            document: store.getState().document,
            designer: ctx.buildSnapshot(store.getState()),
            profile,
          });
          store.setState((current) => ({
            ...current,
            ...ctx.pushUndoEntry(current),
            document: imported,
            savedDocument: imported,
            selectionTarget: undefined,
            inspector: {
              ...current.inspector,
              loading: true,
              error: undefined,
            },
          }));
          return { ok: true, changed: true };
        });
      }

      case 'report-designer:exportTemplate': {
        const codecResolution = resolveCodecAdapter({ adapters: registry, profile });
        if ('error' in codecResolution) {
          return { ok: false, changed: false, error: codecResolution.error };
        }
        const exported = await exportTemplateWithCodec({
          adapter: codecResolution.adapter,
          document: store.getState().document,
          format: command.format,
          config,
          designer: ctx.buildSnapshot(store.getState()),
          profile,
        });
        return { ok: true, changed: false, data: exported };
      }

      case 'report-designer:stopPreview': {
        ctx.cancelPreviewRun();
        store.setState((current) => ({
          ...current,
          preview: { ...current.preview, running: false, mode: undefined },
        }));
        return { ok: true, changed: true };
      }

      case 'report-designer:undo': {
        const current = store.getState();
        if (current.undoStack.length === 0) {
          return { ok: false, changed: false, error: 'Nothing to undo' };
        }
        const undoStack = [...current.undoStack];
        const prevDocument = undoStack.pop()!;
        const redoStack = [...current.redoStack, current.document];
        store.setState((s) => ({
          ...s,
          document: prevDocument,
          undoStack,
          redoStack,
        }));
        await ctx.refreshDerivedState();
        return { ok: true, changed: true };
      }

      case 'report-designer:redo': {
        const current = store.getState();
        if (current.redoStack.length === 0) {
          return { ok: false, changed: false, error: 'Nothing to redo' };
        }
        const redoStack = [...current.redoStack];
        const nextDocument = redoStack.pop()!;
        const undoStack = [...current.undoStack, current.document];
        store.setState((s) => ({
          ...s,
          document: nextDocument,
          undoStack,
          redoStack,
        }));
        await ctx.refreshDerivedState();
        return { ok: true, changed: true };
      }

      case 'report-designer:save': {
        const current = store.getState();
        const exported = cloneDocument(current.document);
        store.setState((state) => ({
          ...state,
          savedDocument: current.document,
        }));
        return { ok: true, changed: false, data: exported };
      }

      default:
        return {
          ok: false,
          changed: false,
          error: `Unknown command: ${
            typeof (command as { type?: unknown }).type === 'string'
              ? (command as { type: string }).type
              : 'unknown'
          }`,
        };
    }
  } catch (err) {
    return { ok: false, changed: false, error: err };
  }
}
