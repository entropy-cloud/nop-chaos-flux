import { describe, expect, it, vi } from 'vitest';
import {
  editorStore,
  datasetStore,
} from './word-editor-page-host-scope.test-support.js';
import {
  editorStore as editorStoreActions,
  datasetStore as datasetStoreActions,
} from './word-editor-page-actions.test-support.js';

// The test-support files vi.mock('@nop-chaos/word-editor-core'), so a plain
// import here would return the doubles themselves. importActual reaches the
// real store factories for the parity comparison.
const actualCore = (await vi.importActual(
  '@nop-chaos/word-editor-core',
)) as typeof import('@nop-chaos/word-editor-core');

function assertSubset(mockKeys: string[], realKeys: string[], label: string) {
  const missing = mockKeys.filter((key) => !realKeys.includes(key));
  expect(missing, `${label} exposes methods that no longer exist on the real store: ${missing.join(', ')}`).toEqual([]);
}

describe('word-editor store test doubles parity', () => {
  it('host-scope editorStore double methods ⊆ real editor store API', () => {
    const real = actualCore.createEditorStore();
    assertSubset(
      Object.keys(editorStore).sort(),
      Object.keys(real).sort(),
      'editorStore (host-scope)',
    );
  });

  it('actions editorStore double methods ⊆ real editor store API', () => {
    const real = actualCore.createEditorStore();
    assertSubset(
      Object.keys(editorStoreActions).sort(),
      Object.keys(real).sort(),
      'editorStore (actions)',
    );
  });

  it('host-scope datasetStore double methods ⊆ real dataset store API', () => {
    const real = actualCore.createDatasetStore();
    assertSubset(
      Object.keys(datasetStore).sort(),
      Object.keys(real).sort(),
      'datasetStore (host-scope)',
    );
  });

  it('actions datasetStore double methods ⊆ real dataset store API', () => {
    const real = actualCore.createDatasetStore();
    assertSubset(
      Object.keys(datasetStoreActions).sort(),
      Object.keys(real).sort(),
      'datasetStore (actions)',
    );
  });
});
