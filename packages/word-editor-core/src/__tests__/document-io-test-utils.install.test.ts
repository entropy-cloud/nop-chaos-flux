import { describe, expect, it } from 'vitest';
import { DATASET_STORAGE_KEY, STORAGE_KEY } from './document-io-test-utils.js';

describe('document-io-test-utils explicit install contract (14-2)', () => {
  it('importing constants only does not register the localStorage stub', () => {
    expect(STORAGE_KEY).toBe('nop-word-editor-document');
    expect(DATASET_STORAGE_KEY).toBe('nop-word-editor-datasets');
    expect((globalThis.localStorage as { _store?: unknown })._store).toBeUndefined();
  });
});
