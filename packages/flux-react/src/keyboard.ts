/**
 * Shared keyboard parsing + chord matching helpers (D1 G-B2).
 *
 * Pure logic: no React, no DOM side effects, no scope access. The schema-facing
 * contract lives on the `keyboard` renderer type (`flux-renderers-basic`) — see
 * `docs/references/renderer-interfaces.md` §Keyboard Binding Contract.
 */

export interface KeyCombo {
  mod: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

const MODIFIER_NAMES = new Set(['mod', 'ctrl', 'shift', 'alt']);

/** Single key combo `[(mod|ctrl|shift|alt)+]key`; bare keys are allowed. */
export function parseKeyCombo(raw: string): KeyCombo | undefined {
  const tokens = raw
    .split('+')
    .map((token) => token.trim().toLowerCase());
  if (tokens.length === 0 || tokens.some((token) => token.length === 0)) {
    return undefined;
  }
  const key = tokens[tokens.length - 1];
  if (MODIFIER_NAMES.has(key)) {
    return undefined;
  }
  const combo: KeyCombo = { mod: false, ctrl: false, shift: false, alt: false, key };
  for (const modifier of tokens.slice(0, -1)) {
    if (modifier === 'mod') combo.mod = true;
    else if (modifier === 'ctrl') combo.ctrl = true;
    else if (modifier === 'shift') combo.shift = true;
    else if (modifier === 'alt') combo.alt = true;
    else return undefined;
  }
  if (combo.mod && combo.ctrl) {
    return undefined;
  }
  return combo;
}

/**
 * Single combo that requires at least one modifier — the command-palette
 * `hotkey` contract (bare keys are rejected there).
 */
export function parseModifierHotkey(raw: string): KeyCombo | undefined {
  const combo = parseKeyCombo(raw);
  if (!combo) {
    return undefined;
  }
  if (!combo.mod && !combo.ctrl && !combo.shift && !combo.alt) {
    return undefined;
  }
  return combo;
}

/** Space-separated chord sequence; every token is a `parseKeyCombo` combo. */
export function parseKeySequence(raw: string): KeyCombo[] | undefined {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return undefined;
  }
  const combos: KeyCombo[] = [];
  for (const token of tokens) {
    const combo = parseKeyCombo(token);
    if (!combo) {
      return undefined;
    }
    combos.push(combo);
  }
  return combos;
}

export interface KeyEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function comboMatchesKey(combo: KeyCombo, event: KeyEventLike): boolean {
  const meta = event.metaKey;
  const ctrl = event.ctrlKey;
  const metaSatisfied = combo.mod ? meta || ctrl : !meta;
  const ctrlSatisfied = combo.mod ? true : combo.ctrl ? ctrl : !ctrl;
  return (
    metaSatisfied &&
    ctrlSatisfied &&
    event.shiftKey === combo.shift &&
    event.altKey === combo.alt &&
    event.key.toLowerCase() === combo.key
  );
}

export function isEditableKeyboardTarget(target: EventTarget | null | undefined): boolean {
  const element = target as HTMLElement | null | undefined;
  if (!element || typeof element.tagName !== 'string') {
    return false;
  }
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element.isContentEditable === true
  );
}

/** Normalized signature used for conflict detection and memo keys. */
export function keySequenceSignature(tokens: KeyCombo[]): string {
  return tokens
    .map((token) => {
      let signature = '';
      if (token.mod) signature += 'mod+';
      if (token.ctrl) signature += 'ctrl+';
      if (token.shift) signature += 'shift+';
      if (token.alt) signature += 'alt+';
      return signature + token.key;
    })
    .join(' ');
}

export interface ChordSequenceEntry {
  id: number;
  tokens: KeyCombo[];
}

export type ChordFeedResult =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'match'; id: number };

export interface ChordMatcher {
  feed(event: KeyEventLike, filter?: (entry: ChordSequenceEntry) => boolean): ChordFeedResult;
  /** Complete binding reachable at the current buffer depth (longest-match fallback). */
  pendingFallback(): number | undefined;
  /** Whether the buffer currently holds chord progress. */
  isWaiting(): boolean;
  reset(): void;
}

/**
 * Chord buffer state machine (pure — the caller owns timers).
 *
 * Longest-match semantics: when a pressed token is both a complete binding and
 * a prefix of a longer sequence, the matcher waits (no side effect) and exposes
 * the complete binding via `pendingFallback()` so the caller can dispatch it on
 * timeout. A mismatching key resets the buffer and is re-evaluated from idle,
 * so overlapping sequence starts work.
 */
export function createChordMatcher(entries: ChordSequenceEntry[]): ChordMatcher {
  let alive: ChordSequenceEntry[] | null = null;
  let depth = 0;
  let fallbackId: number | undefined;

  const reset = () => {
    alive = null;
    depth = 0;
    fallbackId = undefined;
  };

  const completeEntry = (list: ChordSequenceEntry[]) =>
    list.find((entry) => entry.tokens.length === depth);

  const advance = (
    continued: ChordSequenceEntry[],
  ): ChordFeedResult => {
    depth += 1;
    const complete = completeEntry(continued);
    const canContinue = continued.some((entry) => entry.tokens.length > depth);
    if (complete && !canContinue) {
      const id = complete.id;
      reset();
      return { status: 'match', id };
    }
    alive = continued;
    fallbackId = complete?.id;
    return { status: 'pending' };
  };

  return {
    feed(event, filter) {
      const allowed = (entry: ChordSequenceEntry) => filter?.(entry) ?? true;
      if (!alive) {
        const starts = entries.filter(
          (entry) => entry.tokens.length > 0 && comboMatchesKey(entry.tokens[0], event) && allowed(entry),
        );
        if (starts.length === 0) {
          return { status: 'idle' };
        }
        depth = 1;
        const complete = completeEntry(starts);
        const canContinue = starts.some((entry) => entry.tokens.length > 1);
        if (complete && !canContinue) {
          reset();
          return { status: 'match', id: complete.id };
        }
        alive = starts;
        fallbackId = complete?.id;
        return { status: 'pending' };
      }
      const continued = alive.filter((entry) => {
        const token = entry.tokens[depth];
        return token !== undefined && comboMatchesKey(token, event) && allowed(entry);
      });
      if (continued.length > 0) {
        return advance(continued);
      }
      reset();
      return this.feed(event, filter);
    },
    pendingFallback() {
      return alive ? fallbackId : undefined;
    },
    isWaiting() {
      return alive !== null;
    },
    reset,
  };
}
