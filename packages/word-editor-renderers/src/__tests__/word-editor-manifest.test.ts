import { describe, it, expect } from 'vitest';
import {
  resolveWordEditorManifest,
  wordEditorHostContract,
  WORD_EDITOR_MANIFEST_V1,
} from '../word-editor-manifest.js';

describe('resolveWordEditorManifest', () => {
  it('resolves version "1.0"', () => {
    const result = resolveWordEditorManifest('1.0');
    expect(result).toBe(WORD_EDITOR_MANIFEST_V1);
  });

  it('resolves version "1"', () => {
    const result = resolveWordEditorManifest('1');
    expect(result).toBe(WORD_EDITOR_MANIFEST_V1);
  });

  it('resolves version "latest"', () => {
    const result = resolveWordEditorManifest('latest');
    expect(result).toBe(WORD_EDITOR_MANIFEST_V1);
  });

  it('returns undefined for unknown version', () => {
    expect(resolveWordEditorManifest('2.0')).toBeUndefined();
    expect(resolveWordEditorManifest('0.9')).toBeUndefined();
    expect(resolveWordEditorManifest('')).toBeUndefined();
    expect(resolveWordEditorManifest('bad')).toBeUndefined();
    expect(resolveWordEditorManifest('v1')).toBeUndefined();
  });
});

describe('wordEditorHostContract', () => {
  it('has family "word-editor"', () => {
    expect(wordEditorHostContract.family).toBe('word-editor');
  });

  it('has defaultVersion "1.0"', () => {
    expect(wordEditorHostContract.defaultVersion).toBe('1.0');
  });

  it('uses resolveWordEditorManifest as resolveManifest', () => {
    expect(wordEditorHostContract.resolveManifest).toBe(resolveWordEditorManifest);
    const result = wordEditorHostContract.resolveManifest('1.0');
    expect(result).toBe(WORD_EDITOR_MANIFEST_V1);
  });

  it('has capabilityPublication with region-scoped mode', () => {
    expect(wordEditorHostContract.capabilityPublication).toEqual({
      mode: 'region-scoped',
      capableRegions: ['toolbar', 'leftPanel', 'rightPanel'],
      transitiveInheritance: true,
    });
  });
});
