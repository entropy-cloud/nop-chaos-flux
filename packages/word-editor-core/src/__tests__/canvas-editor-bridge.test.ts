import { beforeEach, describe, expect, it, vi } from 'vitest';

const canvasEditorMock = vi.hoisted(() => ({
  constructorCalls: [] as Array<{
    container: unknown;
    data: unknown;
    options: unknown;
  }>,
}));

vi.mock('@hufe921/canvas-editor', () => {
  class FakeCommand {}
  class FakeListener {}
  class FakeEditor {
    command = new FakeCommand();
    listener = new FakeListener();
    constructor(container: unknown, data: unknown, options: unknown) {
      canvasEditorMock.constructorCalls.push({ container, data, options });
    }
    destroy() {}
  }
  return {
    default: FakeEditor,
    PaperDirection: { VERTICAL: 'vertical', HORIZONTAL: 'horizontal' },
  };
});

import { CanvasEditorBridge } from '../canvas-editor-bridge.js';

const EDITOR_DATA = { header: [], main: [{ value: 'doc' }], footer: [] };

function lastConstructorCall() {
  return canvasEditorMock.constructorCalls.at(-1);
}

describe('CanvasEditorBridge mount options', () => {
  beforeEach(() => {
    canvasEditorMock.constructorCalls.length = 0;
  });

  it('passes the locale option to the canvas-editor constructor for built-in tip language', () => {
    const bridge = new CanvasEditorBridge();
    const container = { nodeType: 1 } as unknown as HTMLDivElement;

    bridge.mount(container, EDITOR_DATA as any, { locale: 'zhCN' });

    expect(lastConstructorCall()?.options).toEqual({ locale: 'zhCN' });
  });

  it('constructs canvas-editor without an options object when no locale is provided', () => {
    const bridge = new CanvasEditorBridge();
    const container = { nodeType: 1 } as unknown as HTMLDivElement;

    bridge.mount(container, EDITOR_DATA as any);

    expect(lastConstructorCall()?.options).toBeUndefined();
  });

  it('subscribes listener.zoneChange so canvas-driven zone switches reach the host', () => {
    const bridge = new CanvasEditorBridge();
    const container = { nodeType: 1 } as unknown as HTMLDivElement;
    const onZoneChange = vi.fn();

    bridge.mount(container, EDITOR_DATA as any, { onZoneChange });

    const listener = bridge.listener as { zoneChange: ((zone: string) => void) | null };
    expect(listener.zoneChange).toBe(onZoneChange);

    listener.zoneChange?.('footer');
    expect(onZoneChange).toHaveBeenCalledWith('footer');
  });

  it('leaves listener.zoneChange unwired when no onZoneChange option is provided', () => {
    const bridge = new CanvasEditorBridge();
    const container = { nodeType: 1 } as unknown as HTMLDivElement;

    bridge.mount(container, EDITOR_DATA as any, {});

    const listener = bridge.listener as { zoneChange: unknown };
    expect(listener.zoneChange).toBeUndefined();
  });
});
