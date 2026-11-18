import { getRealInput } from './real-input.js';

export interface KeyboardApi {
  /** Press a key chord, e.g. 'Enter', 'ControlOrMeta+a', 'Shift+ArrowDown'. */
  press(chord: string): Promise<void>;
  type(text: string): Promise<void>;
  down(key: string): Promise<void>;
  up(key: string): Promise<void>;
  /** True when the last press/type fell back to synthetic KeyboardEvents. */
  readonly lastSynthetic: boolean;
}

export interface MouseApi {
  move(x: number, y: number): Promise<void>;
  down(): Promise<void>;
  up(): Promise<void>;
  click(x: number, y: number): Promise<void>;
  wheel(deltaX: number, deltaY: number): Promise<void>;
}

const MODIFIERS: Record<string, number> = { Control: 2, Alt: 1, Meta: 4, Shift: 8 };

type KeyTarget = Element | null;

function activeElement(): KeyTarget {
  return typeof document !== 'undefined' ? document.activeElement : null;
}

function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
}

function resolveChord(chord: string): { modifiers: number; key: string } {
  const parts = chord.split('+');
  const key = parts[parts.length - 1] ?? chord;
  let modifiers = 0;
  for (const part of parts.slice(0, -1)) {
    const resolved = part === 'ControlOrMeta' ? (isMac() ? 'Meta' : 'Control') : part;
    modifiers |= MODIFIERS[resolved] ?? 0;
  }
  return { modifiers, key };
}

function dispatchKey(target: KeyTarget, type: 'keydown' | 'keypress' | 'keyup', key: string): void {
  target?.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
}

export function createKeyboard(): KeyboardApi {
  let lastSynthetic = false;
  const api: KeyboardApi = {
    async press(chord) {
      const { modifiers, key } = resolveChord(chord);
      const real = getRealInput();
      if (real) {
        await real('input.key', { key, modifiers });
        return;
      }
      lastSynthetic = true;
      const target = activeElement();
      dispatchKey(target, 'keydown', key);
      dispatchKey(target, 'keypress', key);
      dispatchKey(target, 'keyup', key);
    },
    async type(text) {
      const target = activeElement();
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.value += text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        for (const char of text) dispatchKey(target, 'keypress', char);
      }
    },
    async down(key) {
      const real = getRealInput();
      if (real) {
        const { modifiers, key: resolved } = resolveChord(key);
        await real('input.key', { key: resolved, modifiers, type: 'down' });
        return;
      }
      lastSynthetic = true;
      dispatchKey(activeElement(), 'keydown', key);
    },
    async up(key) {
      const real = getRealInput();
      if (real) {
        const { modifiers, key: resolved } = resolveChord(key);
        await real('input.key', { key: resolved, modifiers, type: 'up' });
        return;
      }
      lastSynthetic = true;
      dispatchKey(activeElement(), 'keyup', key);
    },
    get lastSynthetic() {
      return lastSynthetic;
    },
  };
  return api;
}

export function createMouse(): MouseApi {
  const real = () => getRealInput();
  return {
    async move(x, y) {
      const r = real();
      if (r) return r('input.move', { x, y });
      if (typeof document !== 'undefined') {
        const target = document.elementFromPoint(x, y);
        target?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
      }
    },
    async down() {
      const r = real();
      if (r) return r('input.mousedown', {});
      if (typeof document !== 'undefined') {
        const target = document.activeElement ?? document.body;
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      }
    },
    async up() {
      const r = real();
      if (r) return r('input.mouseup', {});
      if (typeof document !== 'undefined') {
        const target = document.activeElement ?? document.body;
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      }
    },
    async click(x, y) {
      const r = real();
      if (r) return r('input.click', { x, y });
      const target = typeof document !== 'undefined' ? document.elementFromPoint(x, y) : null;
      if (target instanceof HTMLElement) target.click();
    },
    async wheel(deltaX, deltaY) {
      const r = real();
      if (r) return r('input.wheel', { deltaX, deltaY });
      window.scrollBy(deltaX, deltaY);
    },
  };
}
