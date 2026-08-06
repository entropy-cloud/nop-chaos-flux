import { describe, it, expect } from 'vitest';
import {
  SCADA_EDITOR_ERROR_CODES,
  SCADA_EDITOR_ERROR_CODES_M1,
  scadaEditorErrorI18nKey,
  isRuntimeErrorCode,
} from './editor-errors.js';

describe('scadaEditorErrorI18nKey (design-renderer.md §8.5.2 独立映射)', () => {
  it('prefixes editor-specific codes with industrial.scada.editor.error', () => {
    expect(scadaEditorErrorI18nKey('invalid-node')).toBe('industrial.scada.editor.error.invalid-node');
    expect(scadaEditorErrorI18nKey('duplicate-id')).toBe('industrial.scada.editor.error.duplicate-id');
    expect(scadaEditorErrorI18nKey('invalid-patch')).toBe('industrial.scada.editor.error.invalid-patch');
  });

  it('includes M1 subset codes (addSymbol/removeSymbol/updateSymbol/save/load failure paths)', () => {
    for (const code of SCADA_EDITOR_ERROR_CODES_M1) {
      const key = scadaEditorErrorI18nKey(code);
      expect(key).toBe(`industrial.scada.editor.error.${code}`);
    }
  });

  it('falls back to .unknown for codes outside the editor registry', () => {
    expect(scadaEditorErrorI18nKey('not-a-real-code')).toBe('industrial.scada.editor.error.unknown');
  });

  it('M1 subset excludes M2-only codes (empty-selection/not-a-group/no-undo/no-redo)', () => {
    expect(SCADA_EDITOR_ERROR_CODES_M1).not.toContain('empty-selection');
    expect(SCADA_EDITOR_ERROR_CODES_M1).not.toContain('not-a-group');
    expect(SCADA_EDITOR_ERROR_CODES_M1).not.toContain('no-undo');
    expect(SCADA_EDITOR_ERROR_CODES_M1).not.toContain('no-redo');
  });

  it('full registry includes M2 codes (for E7/E7.2 landing)', () => {
    expect(SCADA_EDITOR_ERROR_CODES).toContain('empty-selection');
    expect(SCADA_EDITOR_ERROR_CODES).toContain('no-undo');
  });
});

describe('isRuntimeErrorCode', () => {
  it('recognizes runtime-inherited codes (not-mounted/symbol-not-found/invalid-config)', () => {
    expect(isRuntimeErrorCode('not-mounted')).toBe(true);
    expect(isRuntimeErrorCode('symbol-not-found')).toBe(true);
    expect(isRuntimeErrorCode('invalid-config')).toBe(true);
  });

  it('rejects editor-specific codes', () => {
    expect(isRuntimeErrorCode('invalid-node')).toBe(false);
    expect(isRuntimeErrorCode('duplicate-id')).toBe(false);
  });
});
