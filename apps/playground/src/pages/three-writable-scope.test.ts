import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createWritableScopeRef } from './three-writable-scope.js';

const GALLERY_SOURCE = readFileSync(resolve(process.cwd(), 'src/pages/three-gallery-demo.tsx'), 'utf8');
const INDUSTRIAL_SOURCE = readFileSync(resolve(process.cwd(), 'src/pages/three-industrial-demo.tsx'), 'utf8');

const TWIN_BODY_MARKER = 'const data: Record<string, unknown> = { dataSources: {} }';

describe('three-writable-scope single source (WA-pages-005)', () => {
  it('exposes one factory; both three demos reference it and keep no local twin', () => {
    expect(GALLERY_SOURCE).toContain("from './three-writable-scope.js'");
    expect(INDUSTRIAL_SOURCE).toContain("from './three-writable-scope.js'");
    expect(GALLERY_SOURCE).not.toContain('function createWritableScope(');
    expect(GALLERY_SOURCE).not.toContain(TWIN_BODY_MARKER);
    expect(INDUSTRIAL_SOURCE).not.toContain(TWIN_BODY_MARKER);
  });

  it('factory produces the minimal writable ScopeRef contract both demos rely on', () => {
    const galleryScope = createWritableScopeRef('three-gallery-twin-scope');
    const industrialScope = createWritableScopeRef('three-industrial-demo-scope');

    for (const scope of [galleryScope, industrialScope] as const) {
      expect(scope.id).toBeTypeOf('string');
      expect(scope.path).toBe('$');
      expect(scope.isolate).toBe(true);
      expect(scope.get('dataSources.temp')).toBeUndefined();
      expect(scope.has('dataSources.temp')).toBe(false);

      scope.update('dataSources.temp', 42);
      expect(scope.get('dataSources.temp')).toBe(42);
      expect(scope.has('dataSources.temp')).toBe(true);
      expect((scope.value as Record<string, unknown>).dataSources).toEqual({ temp: 42 });

      scope.update('dataSources.nested.deeper', 'v');
      expect(scope.get('dataSources.nested.deeper')).toBe('v');

      expect(scope.readOwn()).toBe(scope.value);
      expect(scope.readVisible()).toBe(scope.value);
      expect(scope.materializeVisible()).toBe(scope.value);
      expect(scope.merge({})).toBeUndefined();
    }

    expect(galleryScope).not.toBe(industrialScope);
  });
});
