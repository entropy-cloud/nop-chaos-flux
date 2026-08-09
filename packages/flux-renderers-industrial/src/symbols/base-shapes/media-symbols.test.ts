import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import { registerBuiltinScadaSymbols } from '../register-builtin.js';
import { clearScadaSymbolRegistry, hasScadaSymbol, getScadaSymbolDefinition } from '../symbol-registry.js';
import { instantiateSymbol } from '../symbol-factory.js';
import { validateScadaConfig } from '../../serialization/validate.js';
import { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import type { ScadaSymbolProps } from '../symbol-types.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

const makeContainer = () => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true });
  return el;
};

const instantiate = (type: string, props: Partial<ScadaSymbolProps> = {}, engine: unknown = {}) =>
  instantiateSymbol(type, {
    id: 's',
    props: { x: 0, y: 0, ...props } as ScadaSymbolProps,
    engine,
    config: { world: { x: 0, y: 0, scale: 1 } },
  }) as unknown as Record<string, unknown>;

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
});

describe('media placeholder symbols (I8.1: scada-image/scada-video)', () => {
  it('should register scada-image and scada-video as builtin shape-family symbols', () => {
    expect(hasScadaSymbol('scada-image')).toBe(true);
    expect(hasScadaSymbol('scada-video')).toBe(true);
    expect(getScadaSymbolDefinition('scada-image')?.category).toBe('shape');
  });

  it('scada-image should create an Image node with the URL and a placeholder background', () => {
    const node = instantiate('scada-image', { custom: { url: 'https://cdn.example.com/pump.png' } });
    expect(node.tag).toBe('Image');
    expect(node.url).toBe('https://cdn.example.com/pump.png');
    expect(node.background).toBeDefined();
  });

  it('scada-image without a URL should keep the placeholder style only', () => {
    const node = instantiate('scada-image', { width: 120, height: 80 });
    expect(node.tag).toBe('Image');
    expect(node.url).toBeUndefined();
    expect(node.background).toBeDefined();
  });

  it('scada-image should fall back to default width/height and skip empty urls', () => {
    const node = instantiate('scada-image', { custom: { url: '   ' } });
    expect(node.tag).toBe('Image');
    expect(node.width).toBe(120);
    expect(node.height).toBe(80);
    expect(node.url).toBeUndefined();
  });

  it('scada-image should resolve the URL through the engine image cache bridge when available', () => {
    const engine = { resolveImageUrl: (url: string) => `cached:${url}` };
    const node = instantiate('scada-image', { custom: { url: 'https://x/y.png' } }, engine);
    expect(node.url).toBe('cached:https://x/y.png');
  });

  it('scada-image load failure should keep the placeholder and signal the error (image-load-error)', () => {
    const node = instantiate('scada-image', { custom: { url: 'https://x/broken.png' } });
    const backgroundBefore = node.background;
    (node as unknown as { emit: (event: string, ...args: unknown[]) => void }).emit('error', {
      message: 'load failed',
    });
    expect(node.background).toBe(backgroundBefore);
    expect(node.loadFailed).toBe(true);
  });

  it('scada-video should create a static placeholder frame and preserve the URL for later wiring', () => {
    const node = instantiate('scada-video', { custom: { url: 'https://cdn.example.com/cam.m3u8' } });
    expect(node.tag).toBe('Rect');
    expect(node.fill).toBeDefined();
    expect(node.url).toBe('https://cdn.example.com/cam.m3u8');
  });

  it('scada-video without a URL should keep the default placeholder frame styling', () => {
    const node = instantiate('scada-video');
    expect(node.tag).toBe('Rect');
    expect(node.fill).toBe('#2b2f36');
    expect(node.stroke).toBe('#4b5563');
    expect(node.url).toBeUndefined();
  });

  // plan 2026-08-06-0900-2 Phase 2（open P2-7 video stroke guard proof）：
  // video.ts:35-36 create 无条件覆盖 stroke/strokeWidth，author 声明被丢弃。修复后 guarded（与 fill 行对称）。
  it('scada-video should preserve author-declared stroke/strokeWidth (plan 2026-08-06-0900-2 Phase 2 open P2-7)', () => {
    const node = instantiate('scada-video', { stroke: '#ffffff', strokeWidth: 3 });
    expect(node.stroke).toBe('#ffffff');
    expect(node.strokeWidth).toBe(3);
  });

  it('scada-video should still apply default stroke/strokeWidth when author omits them', () => {
    const node = instantiate('scada-video');
    expect(node.stroke).toBe('#4b5563');
    expect(node.strokeWidth).toBe(1);
  });

  it('validate should accept string custom.url on media symbols and reject non-string urls', () => {
    const ok = validateScadaConfig({
      version: 1,
      symbols: [
        { id: 'img', type: 'scada-image', x: 0, y: 0, custom: { url: 'https://x/y.png' } },
        { id: 'vid', type: 'scada-video', x: 0, y: 0, custom: { url: 'https://x/z.mp4' } },
      ],
    });
    expect(ok).toEqual({ ok: true });
    const bad = validateScadaConfig({
      version: 1,
      symbols: [{ id: 'img', type: 'scada-image', x: 0, y: 0, custom: { url: 42 } }],
    });
    expect(bad.ok).toBe(false);
  });

  it('should instantiate image/video through the config-adapter scene tree build path', () => {
    const engine = ScadaCanvasEngine.create({ container: makeContainer() });
    engine.reset({
      version: 1,
      symbols: [
        { id: 'img', type: 'scada-image', x: 10, y: 20, width: 120, height: 80, custom: { url: 'https://x/a.png' } },
        { id: 'vid', type: 'scada-video', x: 30, y: 40, width: 160, height: 90, custom: { url: 'https://x/b.mp4' } },
      ],
    });
    expect(engine.registry.size()).toBe(2);
    const img = engine.getSymbol('img')?.node as unknown as Record<string, unknown>;
    expect(img.tag).toBe('Image');
    expect(img.x).toBe(10);
    expect(img.url).toBe('https://x/a.png');
    expect(img.background).toBeDefined();
    const vid = engine.getSymbol('vid')?.node as unknown as Record<string, unknown>;
    expect(vid.tag).toBe('Rect');
    expect(vid.width).toBe(160);
    engine.destroy();
  });
});
