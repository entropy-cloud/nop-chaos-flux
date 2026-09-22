// leafer-ui and other canvas-backed symbol libs reference 2D context globals
// at module load; the inventory generator imports definition arrays in a DOM
// environment without a real canvas. Bare class stubs satisfy import-time
// references — no rendering ever happens in this suite.
class CanvasRenderingContext2DStub {}
class OffscreenCanvasStub {}
class Path2DStub {}

globalThis.CanvasRenderingContext2D ??= CanvasRenderingContext2DStub as never;
globalThis.OffscreenCanvas ??= OffscreenCanvasStub as never;
globalThis.Path2D ??= Path2DStub as never;
