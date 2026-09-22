// Vite-alias stub for leafer-ui + @leafer-in/* in the inventory generator
// (plan 491): the generator only needs renderer definition METADATA, but
// definition files import canvas shape classes at module scope. vi.mock does
// not intercept these external deps under this config, so the alias layer
// swaps in inert classes with the same names. No rendering ever happens here.
class StubLeaf {}

export const App = StubLeaf;
export const Ellipse = StubLeaf;
export const Group = StubLeaf;
export const Image = StubLeaf;
export const Line = StubLeaf;
export const Path = StubLeaf;
export const Polygon = StubLeaf;
export const Rect = StubLeaf;
export const Text = StubLeaf;
export const Leafer = StubLeaf;
export const Editor = StubLeaf;
export const Canvas = StubLeaf;

export default { App, Ellipse, Group, Image, Line, Path, Polygon, Rect, Text, Leafer, Editor, Canvas };
