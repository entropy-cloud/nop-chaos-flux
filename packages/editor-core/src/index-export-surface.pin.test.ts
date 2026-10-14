import { describe, expect, it } from 'vitest';
import * as surface from './index.js';

/**
 * plan 598 (CX-18) Phase 2 G3 export-surface pin: editor-core index runtime
 * surface = Phase 1 baseline (9 runtime exports) + exactly the G3 addition
 * popAndRebuildOppositeEntry. Diff vs Phase 1 baseline: exactly +1, zero
 * removals.
 */
const PINNED_RUNTIME_EXPORTS = [
  'DEFAULT_COALESCE_WINDOW_MS',
  'MAX_UNDO_STACK_DEPTH',
  'UndoCommandStack',
  'clearEditorDomains',
  'cloneDocument',
  'createEditorCore',
  'getEditorDomain',
  'listEditorDomains',
  'popAndRebuildOppositeEntry',
  'registerEditorDomain',
] as const;

describe('editor-core index export surface (plan 598 pin)', () => {
  it('exposes exactly the pinned runtime surface', () => {
    expect(Object.keys(surface).sort()).toEqual([...PINNED_RUNTIME_EXPORTS]);
  });

  it('publishes the shared history rebuild helper from core (G3 single source)', () => {
    expect(typeof surface.popAndRebuildOppositeEntry).toBe('function');
  });
});
