import { useEffect, useState, useSyncExternalStore } from 'react';
import type { NopDebuggerController, NopSchemaPatch } from '@nop-chaos/nop-debugger';
import { t } from '@nop-chaos/flux-i18n';
import {
  adoptCandidate,
  discardCandidate,
  revalidateCandidate,
  rollbackCandidate,
  type PatchCandidate,
  type PatchCandidateDeps,
  type PatchCandidateStore,
} from './patch-candidates.js';

interface PatchQueueProps {
  controller: NopDebuggerController;
  store: PatchCandidateStore;
  preview?: PatchCandidateDeps['preview'];
}

function newValueText(op: NopSchemaPatch['ops'][number]): string {
  if (op.type === 'set-prop') {
    const valueText = typeof op.value === 'string' ? op.value : JSON.stringify(op.value);
    return valueText;
  }
  return op.expression;
}

/** Original value from the target's live inspect projection, when resolvable. */
function originalValue(deps: PatchCandidateDeps, candidate: PatchCandidate, field: string): string | undefined {
  const cid = candidate.validation.resolvedTarget?.cid;
  if (cid === undefined) {
    return undefined;
  }
  const inspect = deps.controller.automation.inspectByCid(cid);
  const summaries = [inspect?.propsSummary, inspect?.metaSummary];
  for (const summary of summaries) {
    const value = (summary as Record<string, unknown> | undefined)?.[field];
    if (value !== undefined) {
      return typeof value === 'string' ? value : JSON.stringify(value);
    }
  }
  return undefined;
}

function PatchCard(props: {
  candidate: PatchCandidate;
  deps: PatchCandidateDeps;
}) {
  const { candidate, deps } = props;
  // Render-time revalidation: staged↔conflicted flips without touching the applier.
  const liveStatus = revalidateCandidate(deps, candidate.id) ?? candidate.status;
  const busy = liveStatus === 'staged' || liveStatus === 'conflicted';
  // Host sandbox preview: invoked once per staged card; text summary or fallback.
  const [previewSummary, setPreviewSummary] = useState<string | null>(null);
  useEffect(() => {
    const hook = deps.preview;
    if (!hook || liveStatus !== 'staged') {
      return;
    }
    let cancelled = false;
    const runPreview = async () => {
      try {
        const result = await hook(candidate.patch);
        if (!cancelled && result.kind === 'rendered') {
          setPreviewSummary(result.summary);
        }
      } catch {
        // Preview failure → the diff card fallback (summary stays null).
        setPreviewSummary(null);
      }
    };
    void runPreview();
    return () => {
      cancelled = true;
    };
  }, [candidate.patch, deps, liveStatus]);

  return (
    <div
      className="ndbg-patch-card rounded-md border p-2 text-xs"
      data-slot="nop-patch-card"
      data-status={liveStatus}
      data-testid={`ndbg-patch-card-${candidate.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="ndbg-patch-card-title font-medium" data-testid="ndbg-patch-title">
          {t('flux.debugger.ai.patchCardTitle')}
          {candidate.patch.scope.target.path ?? candidate.patch.scope.target.nodeId ?? candidate.patch.scope.target.cid}
        </span>
        <span className="ndbg-patch-status" data-status={liveStatus}>
          {liveStatus}
        </span>
      </div>
      {candidate.patch.reason ? (
        <div className="ndbg-patch-reason text-muted-foreground" data-testid="ndbg-patch-reason">
          {/* Model-authored strings render as text nodes only (injection assertions pin this). */}
          {candidate.patch.reason}
        </div>
      ) : null}
      <ul className="ndbg-patch-ops ml-4 list-disc">
        {candidate.patch.ops.map((op) => (
          <li key={`${op.type}:${op.field}:${newValueText(op)}`} className="ndbg-patch-op" data-testid="ndbg-patch-op">
            {/* Model-authored strings render as text nodes only (injection assertions pin this). */}
            {op.type === 'set-prop'
              ? `${op.field}: ${originalValue(deps, candidate, op.field) ?? t('flux.debugger.ai.patchOriginalUnknown')} → ${newValueText(op)}`
              : `${op.field}: ${t('flux.debugger.ai.patchOriginalUnknown')} → ${newValueText(op)}`}
          </li>
        ))}
      </ul>
      {previewSummary ? (
        <div className="ndbg-patch-preview text-muted-foreground" data-testid="ndbg-patch-preview">
          {previewSummary}
        </div>
      ) : null}
      {!candidate.validation.ok ? (
        <div className="ndbg-patch-errors text-destructive">{candidate.validation.errors.join('; ')}</div>
      ) : null}
      {busy ? (
        <div className="ndbg-patch-actions mt-2 flex gap-2">
          <button
            type="button"
            className="underline underline-offset-2"
            data-testid={`ndbg-patch-adopt-${candidate.id}`}
            disabled={liveStatus === 'conflicted'}
            aria-label={t('flux.debugger.ai.patchAdopt')}
            onClick={() => {
              void adoptCandidate(deps, candidate.id).catch(() => undefined);
            }}
          >
            {t('flux.debugger.ai.patchAdopt')}
          </button>
          <button
            type="button"
            className="underline underline-offset-2"
            data-testid={`ndbg-patch-discard-${candidate.id}`}
            aria-label={t('flux.debugger.ai.patchDiscard')}
            onClick={() => {
              void discardCandidate(deps, candidate.id).catch(() => undefined);
            }}
          >
            {t('flux.debugger.ai.patchDiscard')}
          </button>
        </div>
      ) : null}
      {liveStatus === 'applied' ? (
        <div className="ndbg-patch-actions mt-2 flex gap-2">
          <button
            type="button"
            className="underline underline-offset-2"
            data-testid={`ndbg-patch-rollback-${candidate.id}`}
            aria-label={t('flux.debugger.ai.patchRollback')}
            onClick={() => {
              void rollbackCandidate(deps, candidate.id).catch(() => undefined);
            }}
          >
            {t('flux.debugger.ai.patchRollback')}
          </button>
          <button
            type="button"
            className="underline underline-offset-2"
            data-testid={`ndbg-patch-dismiss-${candidate.id}`}
            aria-label={t('flux.debugger.ai.patchDismiss')}
            onClick={() => deps.store.dismiss(candidate.id)}
          >
            ✕
          </button>
        </div>
      ) : null}
      {liveStatus === 'reverted' || liveStatus === 'discarded' ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="underline underline-offset-2"
            data-testid={`ndbg-patch-dismiss-${candidate.id}`}
            aria-label={t('flux.debugger.ai.patchDismiss')}
            onClick={() => deps.store.dismiss(candidate.id)}
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Candidate preview queue: staged proposals wait here for the human adopt
 * decision (the ONLY path to the host applier). Reactive via the store's
 * cached-identity snapshot contract.
 */
export function PatchQueue(props: PatchQueueProps) {
  const deps: PatchCandidateDeps = {
    controller: props.controller,
    store: props.store,
    ...(props.preview ? { preview: props.preview } : {}),
  };
  const candidates = useSyncExternalStore(
    (listener) => props.store.subscribe(listener),
    () => props.store.getSnapshot(),
    () => props.store.getSnapshot(),
  );
  // Light poll: external scope changes (live tree) don't touch the store, so a
  // touch-driven re-render keeps the render-time conflict revalidation fresh.
  useEffect(() => {
    const timer = window.setInterval(() => props.store.touch(), 1_000);
    return () => window.clearInterval(timer);
  }, [props.store]);
  // Active candidates first (never scroll out), then latest terminal history.
  const active = candidates.filter((c) => c.status === 'staged' || c.status === 'conflicted');
  const terminal = candidates.filter((c) => c.status !== 'staged' && c.status !== 'conflicted').slice(-10);
  const visible = [...active, ...terminal].slice(0, Math.max(10, active.length));

  return (
    <div className="ndbg-patch-queue flex flex-col gap-2" data-slot="nop-patch-queue" data-testid="ndbg-patch-queue">
      {visible.map((candidate) => (
        <PatchCard key={candidate.id} candidate={candidate} deps={deps} />
      ))}
    </div>
  );
}
