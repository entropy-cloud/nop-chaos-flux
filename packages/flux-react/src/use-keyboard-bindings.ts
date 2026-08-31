import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { useCurrentSurfaceRuntime } from './context-hooks.js';
import {
  createChordMatcher,
  isEditableKeyboardTarget,
  keySequenceSignature,
  type ChordMatcher,
  type KeyCombo,
} from './keyboard.js';

export interface KeyboardBindingSpec {
  id: number;
  tokens: KeyCombo[];
  allowInInput: boolean;
  preventDefault: boolean;
  /** Per-keypress gate (schema `when`); false excludes the binding from a feed. */
  isAllowed?: () => boolean;
}

export interface UseKeyboardBindingsOptions {
  scope: ScopeRef | undefined;
  bindings: readonly KeyboardBindingSpec[];
  chordTimeout?: number;
  enabled?: boolean;
  /** `event` is null for the longest-match timeout fallback (kb-prefix-conflict). */
  onMatch: (id: number, event: KeyboardEvent | null) => void;
}

const DEFAULT_CHORD_TIMEOUT = 1000;

function scopeIsWithin(scope: ScopeRef | undefined, ancestorId: string): boolean {
  let current: ScopeRef | undefined = scope;
  while (current) {
    if (current.id === ancestorId) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Window-level keyboard binding listener (D1 G-B2). Owns the chord buffer +
 * timeout, input-focus gating, defaultPrevented (built-in priority) skip, and
 * surface-stack routing; match dispatch is delegated to `onMatch`.
 */
export function useKeyboardBindings(options: UseKeyboardBindingsOptions): void {
  const { scope, chordTimeout, enabled = true, onMatch } = options;
  const surfaceRuntime = useCurrentSurfaceRuntime();

  const plainSpecs = useMemo(() => options.bindings.filter((spec) => !spec.allowInInput), [options.bindings]);
  const inputSpecs = useMemo(() => options.bindings.filter((spec) => spec.allowInInput), [options.bindings]);
  const signature = useMemo(
    () =>
      options.bindings
        .map((spec) => `${spec.id}:${keySequenceSignature(spec.tokens)}:${spec.allowInInput ? 'in' : 'out'}`)
        .join('|'),
    [options.bindings],
  );

  const subscribe = useMemo(
    () =>
      surfaceRuntime
        ? (listener: () => void) => surfaceRuntime.store.subscribe(listener)
        : () => () => undefined,
    [surfaceRuntime],
  );
  const surfaceSnapshot = useMemo(
    () =>
      surfaceRuntime
        ? () => {
            const state = surfaceRuntime.store.getState();
            return `${state.entries.length}:${state.entries[state.entries.length - 1]?.id ?? ''}`;
          }
        : () => 'none:',
    [surfaceRuntime],
  );
  const surfaceState = useSyncExternalStore(subscribe, surfaceSnapshot);

  const surfaceActive = useMemo(() => {
    if (surfaceState === 'none:') {
      return true;
    }
    const state = surfaceRuntime?.store.getState();
    const top = state?.entries[state.entries.length - 1];
    // Surface-open routing: bindings declared inside the top surface's scope
    // stay live; page-level bindings pause (kb-surface-stack).
    return !top || scopeIsWithin(scope, top.scope.id);
  }, [surfaceState, surfaceRuntime, scope]);

  const optionsRef = useRef({ scope, enabled, onMatch, plainSpecs, inputSpecs, chordTimeout, surfaceActive });
  useEffect(() => {
    optionsRef.current = { scope, enabled, onMatch, plainSpecs, inputSpecs, chordTimeout, surfaceActive };
  });

  useEffect(() => {
    const initial = optionsRef.current;
    if (!initial.enabled) {
      return;
    }
    const plain = initial.plainSpecs.length > 0
      ? createChordMatcher(initial.plainSpecs.map((spec) => ({ id: spec.id, tokens: spec.tokens })))
      : null;
    const input = initial.inputSpecs.length > 0
      ? createChordMatcher(initial.inputSpecs.map((spec) => ({ id: spec.id, tokens: spec.tokens })))
      : null;

    const timeoutMs =
      typeof initial.chordTimeout === 'number' &&
      Number.isFinite(initial.chordTimeout) &&
      initial.chordTimeout > 0
        ? initial.chordTimeout
        : DEFAULT_CHORD_TIMEOUT;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const disarm = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const feedGroup = (
      matcher: ChordMatcher | null,
      specs: typeof initial.plainSpecs,
      event: KeyboardEvent,
    ): boolean => {
      if (!matcher) {
        return false;
      }
      const result = matcher.feed(event, (entry) => {
        const spec = specs.find((candidate) => candidate.id === entry.id);
        return spec ? spec.isAllowed?.() ?? true : true;
      });
      if (result.status === 'match') {
        const spec = specs.find((candidate) => candidate.id === result.id);
        if (spec && spec.preventDefault !== false) {
          event.preventDefault();
        }
        disarm();
        optionsRef.current.onMatch(result.id, event);
        return true;
      }
      return false;
    };

    const handler = (event: KeyboardEvent) => {
      const state = optionsRef.current;
      if (!state.enabled || event.defaultPrevented || !state.surfaceActive) {
        return;
      }
      const editable = isEditableKeyboardTarget(event.target);
      const groups: { matcher: ChordMatcher | null; specs: typeof state.plainSpecs }[] = editable
        ? [{ matcher: input, specs: state.inputSpecs }]
        : [
            { matcher: plain, specs: state.plainSpecs },
            { matcher: input, specs: state.inputSpecs },
          ];
      for (const group of groups) {
        if (feedGroup(group.matcher, group.specs, event)) {
          return;
        }
      }
      if (groups.some((group) => group.matcher?.isWaiting())) {
        disarm();
        timer = setTimeout(() => {
          timer = null;
          const fallback = plain?.pendingFallback() ?? input?.pendingFallback();
          plain?.reset();
          input?.reset();
          if (fallback !== undefined) {
            const current = optionsRef.current;
            const spec =
              current.plainSpecs.find((candidate) => candidate.id === fallback) ??
              current.inputSpecs.find((candidate) => candidate.id === fallback);
            if (spec) {
              current.onMatch(fallback, null);
            }
          }
        }, timeoutMs);
      } else {
        disarm();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      disarm();
    };
    // 06-02: `enabled` must (re)run the attach effect — the attach-time gate
    // reads the frozen optionsRef snapshot, so a binding mounted with
    // enabled:false never attached when enabled later flipped true. Keeping
    // `enabled` out of `signature` avoids a redundant remount on unrelated
    // binding reshuffles. true→false detach stays handled by both the effect
    // cleanup and the per-event optionsRef gate.
  }, [signature, surfaceState, enabled]);
}
