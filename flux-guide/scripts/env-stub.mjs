/**
 * Node ESM preload for flux-guide type generation / validation scripts.
 *
 * Stubs the browser globals that `leafer-ui` touches at *module scope* (the
 * industrial renderer package imports leafer-ui when registering
 * `scada-canvas`). leafer-ui's web platform bundle calls
 * `canvasPatch(CanvasRenderingContext2D.prototype)` at import time
 * (`web.module.js`), so the constructor must exist before the module graph
 * loads. Document/window/canvas usage inside leafer methods never runs during
 * type generation or schema validation — only the module-scope reference is
 * stubbed here.
 */
if (typeof globalThis.CanvasRenderingContext2D === 'undefined') {
  class CanvasRenderingContext2D {}
  globalThis.CanvasRenderingContext2D = CanvasRenderingContext2D;
}
if (typeof globalThis.Path2D === 'undefined') {
  class Path2D {}
  globalThis.Path2D = Path2D;
}
// `Platform.isMobile = "ontouchstart" in window` runs at leafer-ui module scope.
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.location === 'undefined') {
  globalThis.location = { href: 'about:blank', protocol: 'about:', hostname: '', port: '' };
}

// Universal canvas-2d-context stub: leafer creates a canvas and calls 2d-context
// methods at module scope (font-family detection). Any property access or call
// resolves to the same callable, so both `ctx.setTransform(...)` and
// `ctx.measureText('x').width` are safe during type generation.
const universalCtx = new Proxy(function universalContextStub() {}, {
  get(_target, prop) {
    if (prop === Symbol.toPrimitive) return () => 0;
    return universalCtx;
  },
  apply() {
    return universalCtx;
  },
  construct() {
    return universalCtx;
  },
});

if (typeof globalThis.document === 'undefined') {
  const dummyElement = {
    style: {},
    appendChild: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getContext: () => universalCtx,
  };
  globalThis.document = {
    body: dummyElement,
    head: dummyElement,
    documentElement: dummyElement,
    createElement: () => dummyElement,
    createTextNode: () => dummyElement,
    getElementsByTagName: () => [dummyElement],
    getElementById: () => null,
  };
}
if (typeof globalThis.Image === 'undefined') {
  class Image {
    set src(_value) {}
    get src() {
      return '';
    }
  }
  globalThis.Image = Image;
}
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEvent {}
  globalThis.PointerEvent = PointerEvent;
}
if (typeof globalThis.DragEvent === 'undefined') {
  class DragEvent {}
  globalThis.DragEvent = DragEvent;
}
