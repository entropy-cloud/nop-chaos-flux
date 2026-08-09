import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScadaCanvasEngine } from '../engine/scada-engine.js';
import { mountScadaTestHandle, removeScadaTestHandle } from '../engine/test-handle.js';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { resetLeaferMock } from './leafer-ui-mock.js';
import {
  configProp,
  makeScadaCanvasProps,
  renderScadaCanvas,
  scadaTestHandle,
  validCanvasConfig,
  createScadaTestEnvironment,
  type ScadaCanvasConfigProp,
} from './renderer-test-support.js';

vi.mock('leafer-ui', () => import('./leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

beforeEach(() => {
  resetLeaferMock();
  registerBuiltinScadaSymbols();
});

afterEach(() => {
  cleanup();
});

describe('makeScadaCanvasProps factory', () => {
  it('defaults meta.cid to the sentinel 1 when unspecified', () => {
    const props = makeScadaCanvasProps();
    expect(props.meta.cid).toBe(1);
    expect(props.id).toBe('scada-1');
    expect(props.path).toBe('test.scada-1');
    expect(props.props).toEqual({});
    expect(props.schema).toEqual({ type: 'scada-canvas' });
  });

  it('honors an explicit overrides.cid by placing it into meta.cid', () => {
    const props = makeScadaCanvasProps({ cid: 42 });
    expect(props.meta.cid).toBe(42);
  });

  it('merges overrides.props as the top-level props field', () => {
    const props = makeScadaCanvasProps({ cid: 7, props: { width: 800, height: 600 } });
    expect(props.props).toEqual({ width: 800, height: 600 });
    expect(props.meta.cid).toBe(7);
  });

  it('installs a default dispatch helper that resolves to { ok: true }', async () => {
    const props = makeScadaCanvasProps();
    const dispatch = (props.helpers as unknown as { dispatch: (a: unknown) => Promise<{ ok: boolean }> }).dispatch;
    await expect(dispatch({ action: 'noop' })).resolves.toEqual({ ok: true });
  });

  it('lets overrides.meta replace the default meta entirely (cid drops out)', () => {
    const props = makeScadaCanvasProps({ meta: { visible: true, hidden: false, disabled: false, changed: false } });
    expect((props.meta as { cid?: number }).cid).toBeUndefined();
  });
});

describe('configProp factory', () => {
  it('round-trips a ScadaConfig object unchanged (as-cast only)', () => {
    const config = validCanvasConfig();
    const prop = configProp(config) as ScadaCanvasConfigProp;
    expect(prop).toBe(config);
  });

  it('accepts the widest input union (object / version-only / string)', () => {
    expect(configProp({ version: 2 })).toBeDefined();
    expect(configProp('raw-string-config')).toBe('raw-string-config');
  });
});

describe('validCanvasConfig factory', () => {
  it('defaults to a single scada-rect symbol named rect-1', () => {
    const config = validCanvasConfig();
    expect(config.version).toBe(1);
    expect(config.symbols).toHaveLength(1);
    expect(config.symbols[0]).toMatchObject({ id: 'rect-1', type: 'scada-rect' });
  });

  it('shallow-merges overrides at the top level, replacing symbols wholesale', () => {
    const twoSymbols = [
      { id: 'rect-1', type: 'scada-rect', x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
      { id: 'rect-2', type: 'scada-rect', x: 200, y: 20, width: 100, height: 50, fill: '#00ff00' },
    ];
    const config = validCanvasConfig({ symbols: twoSymbols, background: { color: '#abc' } });
    expect(config.symbols).toHaveLength(2);
    expect(config.symbols.map((s) => s.id)).toEqual(['rect-1', 'rect-2']);
    expect(config.background).toEqual({ color: '#abc' });
  });
});

describe('scadaTestHandle reader', () => {
  it('returns the handle mounted under the cid key and undefined after removal', () => {
    const cid = 7777;
    const engine = ScadaCanvasEngine.create({
      container: document.createElement('div'),
      width: 100,
      height: 100,
    });
    mountScadaTestHandle(cid, {
      engine,
      tree: engine.tree,
      app: engine.app,
      getSymbol: (id: string) => engine.getSymbol(id),
      getPointValue: () => undefined,
      getViewport: () => engine.getViewport(),
      forceRender: () => engine.forceRender(),
    });
    try {
      expect(scadaTestHandle(cid)).toBeDefined();
      expect(scadaTestHandle(cid)?.engine).toBe(engine);
    } finally {
      removeScadaTestHandle(cid);
    }
    expect(scadaTestHandle(cid)).toBeUndefined();
    engine.destroy();
  });

  it('reads the live window handle after mounting a scada-canvas (mount/remove round-trip)', async () => {
    const cid = 8888;
    const environment = createScadaTestEnvironment([]);
    const view = renderScadaCanvas(
      makeScadaCanvasProps({
        cid,
        props: { config: configProp(validCanvasConfig()) },
      }),
      environment,
    );
    await waitFor(() => expect(scadaTestHandle(cid)).toBeDefined());
    expect(scadaTestHandle(cid)?.engine).toBeInstanceOf(ScadaCanvasEngine);
    view.unmount();
    await waitFor(() => expect(scadaTestHandle(cid)).toBeUndefined());
  });
});
