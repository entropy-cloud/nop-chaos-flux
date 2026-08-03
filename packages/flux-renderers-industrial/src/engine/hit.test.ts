import { describe, it, expect, vi } from 'vitest';
import { HitResolver } from './hit.js';
import { MockLeafer, MockRect } from '../test-support/leafer-ui-mock.js';

describe('HitResolver 命中解析 (I6.4)', () => {
  it('should resolve the hit node to its symbolId via getByPoint', () => {
    const tree = new MockLeafer();
    const leaf = new MockRect({ id: 'pump-1' });
    tree.selector.getByPoint = () => leaf;
    const resolver = new HitResolver({
      getByPoint: (point) => tree.selector.getByPoint(point),
      idOf: (hit) => (hit as { id?: string })?.id,
      getSize: () => ({ width: 800, height: 600 }),
    });
    expect(resolver.resolveSymbolId(100, 200)).toBe('pump-1');
  });

  it('should reject off-screen points immediately without calling getByPoint (屏外点预检)', () => {
    const tree = new MockLeafer();
    const getByPoint = vi.fn(() => new MockRect({ id: 'x' }));
    tree.selector.getByPoint = getByPoint;
    const resolver = new HitResolver({
      getByPoint: (point) => tree.selector.getByPoint(point),
      idOf: (hit) => (hit as { id?: string })?.id,
      getSize: () => ({ width: 800, height: 600 }),
    });
    expect(resolver.resolveSymbolId(-1, 10)).toBeUndefined();
    expect(resolver.resolveSymbolId(10, -1)).toBeUndefined();
    expect(resolver.resolveSymbolId(801, 10)).toBeUndefined();
    expect(resolver.resolveSymbolId(10, 601)).toBeUndefined();
    expect(getByPoint).not.toHaveBeenCalled();
  });

  it('should return the deepest hit node id for group children (最深命中节点)', () => {
    const tree = new MockLeafer();
    const child = new MockRect({ id: 'valve-inner' });
    tree.selector.getByPoint = () => child;
    const resolver = new HitResolver({
      getByPoint: (point) => tree.selector.getByPoint(point),
      idOf: (hit) => (hit as { id?: string })?.id,
      getSize: () => ({ width: 800, height: 600 }),
    });
    expect(resolver.resolveSymbolId(50, 50)).toBe('valve-inner');
  });

  it('should return undefined when nothing is hit', () => {
    const tree = new MockLeafer();
    tree.selector.getByPoint = () => null;
    const resolver = new HitResolver({
      getByPoint: (point) => tree.selector.getByPoint(point),
      idOf: (hit) => (hit as { id?: string })?.id,
      getSize: () => ({ width: 800, height: 600 }),
    });
    expect(resolver.resolveSymbolId(50, 50)).toBeUndefined();
  });

  it('should work without a size precheck (no getSize)', () => {
    const tree = new MockLeafer();
    const leaf = new MockRect({ id: 'plain' });
    tree.selector.getByPoint = () => leaf;
    const resolver = new HitResolver({
      getByPoint: (point) => tree.selector.getByPoint(point),
      idOf: (hit) => (hit as { id?: string })?.id,
    });
    expect(resolver.resolveSymbolId(-10, -20)).toBe('plain');
  });

  it('should return undefined when idOf cannot resolve the hit', () => {
    const tree = new MockLeafer();
    tree.selector.getByPoint = () => new MockRect({ id: 'unregistered' });
    const resolver = new HitResolver({
      getByPoint: (point) => tree.selector.getByPoint(point),
      idOf: () => undefined,
    });
    expect(resolver.resolveSymbolId(10, 10)).toBeUndefined();
  });
});
