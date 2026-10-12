import { useEffect, useRef, useState } from 'react';

/**
 * Clipboard write indirection. Tests can stub this; production uses
 * `navigator.clipboard`. Allowed under INV-1 because clipboard is a
 * user-gesture browser API, not a network/storage primitive.
 *
 * R2-F2 (2026-08-11 open-audit): a MISSING clipboard API (non-https /
 * sandboxed / no `writeText`) must be an explicit failure signal, not a
 * silent success — a resolved `undefined` would flip buttons to a false
 * "Copied". The rejection flows into the caller's `.catch`, keeping the
 * control in its pre-copy state (same behavior as a rejected write).
 *
 * WA-ai-002 (plan 571): moved here from ai-bubble/renderers/markdown.tsx so
 * the whole copy micro-pattern (adapter + copied flag) has one home — the
 * bubble action bar used to import the adapter across sibling modules.
 */
export const clipboardAdapter: { writeText(text: string): void | Promise<void> } = {
  writeText(text: string): void | Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('navigator.clipboard is not available'));
  },
};

/**
 * "copy → flip to Copied → auto-reset" UI micro-pattern (WA-ai-002): the
 * reset timer is cleared before re-arm and on unmount (2-20 discipline: no
 * setState on an unmounted component). Callers only flip AFTER the clipboard
 * write resolves (R2-F2: a rejected write keeps the pre-copy state).
 */
export function useCopiedFlag(resetAfterMs = 1_500): { copied: boolean; markCopied(): void } {
  const [copied, setCopied] = useState(false);
  const copiedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedResetTimerRef.current) {
        clearTimeout(copiedResetTimerRef.current);
        copiedResetTimerRef.current = null;
      }
    };
  }, []);

  function markCopied(): void {
    setCopied(true);
    if (copiedResetTimerRef.current) {
      clearTimeout(copiedResetTimerRef.current);
    }
    copiedResetTimerRef.current = setTimeout(() => setCopied(false), resetAfterMs);
  }

  return { copied, markCopied };
}
