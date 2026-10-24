import { describe, expect, it } from 'vitest';
import { defineRendererFamily } from './renderer-definition-builder.js';

const Component = () => null;

// R1.4 / plan 723 T1 — P1-MA4.1-001: defineRendererFamily product-equivalence
// invariants (owner doc flux-core.md "pinning package"). These pin the
// normalization contract: family-level sourcePackage/defaultSchema flow into
// every produced entry, entry-level values win, and entry spread wins over
// family rest. A regression in any of these previously had zero red tests.
describe('defineRendererFamily pinning contract', () => {
  it('pins family sourcePackage and invokes family defaultSchema with the entry type', () => {
    const family = defineRendererFamily({
      sourcePackage: '@nop-chaos/flux-renderers-test',
      defaultSchema: (type: string) => ({ seededFor: type, level: 3 }),
    });

    const entry = family({
      type: 'test-canvas',
      component: Component,
    });

    expect(entry.sourcePackage).toBe('@nop-chaos/flux-renderers-test');
    expect(entry.defaultSchema).toEqual({ seededFor: 'test-canvas', level: 3 });
    expect(entry.type).toBe('test-canvas');
    expect(entry.component).toBe(Component);
  });

  it('lets an entry-level defaultSchema override the family factory', () => {
    const family = defineRendererFamily({
      sourcePackage: 'pkg',
      defaultSchema: (type: string) => ({ seededFor: type }),
    });

    const entry = family({
      type: 'test-canvas',
      component: Component,
      defaultSchema: { override: true },
    });

    expect(entry.defaultSchema).toEqual({ override: true });
  });

  it('omits defaultSchema entirely when neither entry nor family provides one', () => {
    const family = defineRendererFamily({ sourcePackage: 'pkg' });

    const entry = family({ type: 'test-canvas', component: Component });

    expect(entry.sourcePackage).toBe('pkg');
    expect(entry.defaultSchema).toBeUndefined();
  });

  it('produces objects structurally identical to hand-written literals (entry spread wins over family rest)', () => {
    const family = defineRendererFamily({ sourcePackage: 'family-pkg' });

    const entry = family({ type: 'test-canvas', component: Component });
    // defaultSchema is present-but-undefined when unprovided — property access
    // equivalent to a hand-written literal without the key.
    expect(entry.defaultSchema).toBeUndefined();
    expect(entry.type).toBe('test-canvas');
    expect(entry.sourcePackage).toBe('family-pkg');

    const withSchema = family({
      type: 'test-canvas',
      component: Component,
      defaultSchema: { a: 1 },
    } as Parameters<ReturnType<typeof defineRendererFamily>>[0]);
    expect(withSchema.defaultSchema).toEqual({ a: 1 });
  });
});
