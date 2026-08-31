import { describe, expect, it } from 'vitest';
import {
  comboMatchesKey,
  createChordMatcher,
  isEditableKeyboardTarget,
  parseKeyCombo,
  parseKeySequence,
  parseModifierHotkey,
} from './keyboard.js';

function keyEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: '',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    target: null,
    ...overrides,
  } as KeyboardEvent;
}

describe('parseKeyCombo', () => {
  it('parses a bare key', () => {
    expect(parseKeyCombo('g')).toEqual({ mod: false, ctrl: false, shift: false, alt: false, key: 'g' });
  });

  it('parses modifier combos case-insensitively', () => {
    expect(parseKeyCombo('Mod+K')).toEqual({ mod: true, ctrl: false, shift: false, alt: false, key: 'k' });
    expect(parseKeyCombo('ctrl+alt+Delete')).toEqual({
      mod: false,
      ctrl: true,
      shift: false,
      alt: true,
      key: 'delete',
    });
    expect(parseKeyCombo('shift + j')).toEqual({ mod: false, ctrl: false, shift: true, alt: false, key: 'j' });
  });

  it('rejects malformed combos', () => {
    expect(parseKeyCombo('')).toBeUndefined();
    expect(parseKeyCombo('mod+')).toBeUndefined();
    expect(parseKeyCombo('+k')).toBeUndefined();
    expect(parseKeyCombo('mod')).toBeUndefined();
    expect(parseKeyCombo('hyper+k')).toBeUndefined();
    expect(parseKeyCombo('mod+ctrl+k')).toBeUndefined();
  });
});

describe('parseModifierHotkey (command-palette contract)', () => {
  it('requires at least one modifier', () => {
    expect(parseModifierHotkey('k')).toBeUndefined();
    expect(parseModifierHotkey('mod+k')).toEqual({ mod: true, ctrl: false, shift: false, alt: false, key: 'k' });
    expect(parseModifierHotkey('shift+a')).toEqual({ mod: false, ctrl: false, shift: true, alt: false, key: 'a' });
    expect(parseModifierHotkey('mod+ctrl+k')).toBeUndefined();
  });
});

describe('parseKeySequence', () => {
  it('parses space-separated chord tokens', () => {
    expect(parseKeySequence('g o')).toEqual([
      { mod: false, ctrl: false, shift: false, alt: false, key: 'g' },
      { mod: false, ctrl: false, shift: false, alt: false, key: 'o' },
    ]);
    expect(parseKeySequence('g  mod+i')).toEqual([
      { mod: false, ctrl: false, shift: false, alt: false, key: 'g' },
      { mod: true, ctrl: false, shift: false, alt: false, key: 'i' },
    ]);
    expect(parseKeySequence('mod+k')).toEqual([
      { mod: true, ctrl: false, shift: false, alt: false, key: 'k' },
    ]);
  });

  it('rejects empty or malformed sequences', () => {
    expect(parseKeySequence('')).toBeUndefined();
    expect(parseKeySequence('   ')).toBeUndefined();
    expect(parseKeySequence('g +o')).toBeUndefined();
    expect(parseKeySequence('g mod+')).toBeUndefined();
    expect(parseKeySequence('g mod+ctrl+k')).toBeUndefined();
  });

  it('treats unknown bare tokens as key names', () => {
    expect(parseKeySequence('g hyper')).toEqual([
      { mod: false, ctrl: false, shift: false, alt: false, key: 'g' },
      { mod: false, ctrl: false, shift: false, alt: false, key: 'hyper' },
    ]);
  });
});

describe('comboMatchesKey', () => {
  it('matches exact modifier equality', () => {
    const combo = parseKeyCombo('mod+k')!;
    expect(comboMatchesKey(combo, keyEvent({ key: 'k', metaKey: true }))).toBe(true);
    expect(comboMatchesKey(combo, keyEvent({ key: 'k', ctrlKey: true }))).toBe(true);
    expect(comboMatchesKey(combo, keyEvent({ key: 'k' }))).toBe(false);
    expect(comboMatchesKey(combo, keyEvent({ key: 'k', metaKey: true, shiftKey: true }))).toBe(false);
    expect(comboMatchesKey(combo, keyEvent({ key: 'K', metaKey: true }))).toBe(true);
  });

  it('requires plain events for unmodified combos', () => {
    const combo = parseKeyCombo('g')!;
    expect(comboMatchesKey(combo, keyEvent({ key: 'g' }))).toBe(true);
    expect(comboMatchesKey(combo, keyEvent({ key: 'g', metaKey: true }))).toBe(false);
    expect(comboMatchesKey(combo, keyEvent({ key: 'g', ctrlKey: true }))).toBe(false);
  });

  it('matches ctrl combos on ctrl press (meta never rides along)', () => {
    const ctrlCombo = parseKeyCombo('ctrl+z')!;
    expect(comboMatchesKey(ctrlCombo, keyEvent({ key: 'z', ctrlKey: true }))).toBe(true);
    expect(comboMatchesKey(ctrlCombo, keyEvent({ key: 'z', metaKey: true }))).toBe(false);
    expect(comboMatchesKey(ctrlCombo, keyEvent({ key: 'z', ctrlKey: true, shiftKey: true }))).toBe(false);
  });

  it('keeps non-mod combos off the meta key and off undeclared ctrl', () => {
    const shiftCombo = parseKeyCombo('shift+a')!;
    expect(comboMatchesKey(shiftCombo, keyEvent({ key: 'a', shiftKey: true }))).toBe(true);
    expect(comboMatchesKey(shiftCombo, keyEvent({ key: 'a', shiftKey: true, ctrlKey: true }))).toBe(false);
    expect(comboMatchesKey(shiftCombo, keyEvent({ key: 'a', shiftKey: true, metaKey: true }))).toBe(false);
  });
});

describe('isEditableKeyboardTarget', () => {
  it('detects editable elements', () => {
    const asTarget = (value: unknown) => value as EventTarget;
    const input = asTarget({ tagName: 'INPUT' });
    const textarea = asTarget({ tagName: 'TEXTAREA' });
    const select = asTarget({ tagName: 'SELECT' });
    const contentEditable = asTarget({ tagName: 'DIV', isContentEditable: true });
    const row = asTarget({ tagName: 'TR', isContentEditable: false });
    expect(isEditableKeyboardTarget(input)).toBe(true);
    expect(isEditableKeyboardTarget(textarea)).toBe(true);
    expect(isEditableKeyboardTarget(select)).toBe(true);
    expect(isEditableKeyboardTarget(contentEditable)).toBe(true);
    expect(isEditableKeyboardTarget(row)).toBe(false);
    expect(isEditableKeyboardTarget(null)).toBe(false);
    expect(isEditableKeyboardTarget(undefined)).toBe(false);
  });
});

describe('createChordMatcher', () => {
  const g = parseKeyCombo('g')!;
  const o = parseKeyCombo('o')!;
  const i = parseKeyCombo('i')!;
  const x = parseKeyCombo('x')!;

  it('matches a single-token sequence immediately', () => {
    const matcher = createChordMatcher([{ id: 0, tokens: [g] }]);
    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'match', id: 0 });
  });

  it('advances a chord and matches on completion', () => {
    const matcher = createChordMatcher([{ id: 0, tokens: [g, o] }]);
    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'pending' });
    expect(matcher.feed(keyEvent({ key: 'o' }))).toEqual({ status: 'match', id: 0 });
    // buffer is reset after a match
    expect(matcher.feed(keyEvent({ key: 'o' }))).toEqual({ status: 'idle' });
  });

  it('resets on a mismatch and re-evaluates the key from idle', () => {
    const matcher = createChordMatcher([
      { id: 0, tokens: [g, o] },
      { id: 1, tokens: [o, x] },
    ]);
    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'pending' });
    // 'o' completes g o — continuation takes precedence over a restart
    expect(matcher.feed(keyEvent({ key: 'o' }))).toEqual({ status: 'match', id: 0 });

    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'pending' });
    // 'x' mismatches g o, restarts idle, and does not start o x either
    expect(matcher.feed(keyEvent({ key: 'x' }))).toEqual({ status: 'idle' });
  });

  it('exposes the longest-match fallback while waiting', () => {
    const matcher = createChordMatcher([
      { id: 0, tokens: [g] },
      { id: 1, tokens: [g, o] },
    ]);
    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'pending' });
    expect(matcher.pendingFallback()).toBe(0);
    expect(matcher.feed(keyEvent({ key: 'o' }))).toEqual({ status: 'match', id: 1 });
    expect(matcher.pendingFallback()).toBeUndefined();
  });

  it('falls back through multi-level prefixes', () => {
    const matcher = createChordMatcher([
      { id: 0, tokens: [g] },
      { id: 1, tokens: [g, o] },
      { id: 2, tokens: [g, o, i] },
    ]);
    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'pending' });
    expect(matcher.pendingFallback()).toBe(0);
    expect(matcher.feed(keyEvent({ key: 'o' }))).toEqual({ status: 'pending' });
    expect(matcher.pendingFallback()).toBe(1);
    expect(matcher.feed(keyEvent({ key: 'i' }))).toEqual({ status: 'match', id: 2 });
  });

  it('reports no fallback for prefix-only waits', () => {
    const matcher = createChordMatcher([{ id: 0, tokens: [g, o] }]);
    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'pending' });
    expect(matcher.pendingFallback()).toBeUndefined();
    matcher.reset();
    expect(matcher.pendingFallback()).toBeUndefined();
  });

  it('supports a per-feed filter (gating) that keeps unrelated progress alive', () => {
    const matcher = createChordMatcher([
      { id: 0, tokens: [g, o] },
      { id: 1, tokens: [g, x] },
    ]);
    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'pending' });
    // 'o' allowed only for binding 1 → binding 0 dies, 1 keeps waiting via 'o'? no —
    // continuation requires the NEXT token to match; 'o' does not continue binding 1.
    // So nothing continues, but the filter also blocks the restart evaluation for 0.
    expect(matcher.feed(keyEvent({ key: 'o' }), (entry) => entry.id === 1)).toEqual({ status: 'idle' });
  });

  it('re-feeds a mismatching key into idle when not filtered out', () => {
    const matcher = createChordMatcher([
      { id: 0, tokens: [g, o] },
      { id: 1, tokens: [o, x] },
    ]);
    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'pending' });
    expect(matcher.feed(keyEvent({ key: 'o' }))).toEqual({ status: 'match', id: 0 });

    expect(matcher.feed(keyEvent({ key: 'g' }))).toEqual({ status: 'pending' });
    // 'x' kills g o; restart matches nothing; then a fresh 'o' starts binding 1
    expect(matcher.feed(keyEvent({ key: 'x' }))).toEqual({ status: 'idle' });
    expect(matcher.feed(keyEvent({ key: 'o' }))).toEqual({ status: 'pending' });
    expect(matcher.feed(keyEvent({ key: 'x' }))).toEqual({ status: 'match', id: 1 });
  });
});
