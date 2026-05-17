import { describe, expect, it, vi } from 'vitest';
import { extractNestedSchemaRegions, validateRegionParams } from './schema-compiler/regions.js';

describe('schema-compiler regions', () => {
  it('rejects any $-prefixed region param name', () => {
    expect(() => validateRegionParams(['$record'], '$.body')).toThrow(
      'Names starting with "$" are reserved for slot-frame metadata.',
    );
  });

  it('rejects any $-prefixed nested extracted region param name', () => {
    expect(() =>
      extractNestedSchemaRegions({
        candidate: {
          title: { type: 'text', text: 'Hello' },
        },
        itemRegionPath: '$.items[0]',
        itemRegionKeyPrefix: 'items.0',
        rules: [
          {
            key: 'title',
            regionKeySuffix: 'title',
            compiledKey: 'titleRegionKey',
            params: ['$item'],
          },
        ],
        regions: {},
        compileSchema: vi.fn() as never,
      }),
    ).toThrow('Names starting with "$" are reserved for slot-frame metadata.');
  });
});
