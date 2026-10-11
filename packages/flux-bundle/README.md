# @nop-chaos/flux

Host-facing Flux facade package for schema rendering.

`registerDefaultFluxRenderers` registers the default 8 renderer families: basic, form, form-advanced, data, content, layout, scheduling, three-canvas. The mobile, ai, and graph families are registered on demand by hosts via their own `register*Renderers` entry points.

## Bundle shape and lazy loading contract

`dist/index.js` is the only entry chunk. Heavy renderer implementations ship as
separate async chunks loaded on first render of their component type
(`createLazyRendererComponent` / `createLazyLibLoader`):

- `echarts-setup-*.js` — echarts registration surface (echarts itself stays an
  external peer resolved by the host bundler)
- `chart-renderer-*.js` — recharts-backed chart renderer
- `three-canvas-*.js` — three.js 3D renderer (three is bundled into this chunk)

`scripts/check-flux-bundle-pack.mjs` enforces the contract: the async chunks
must exist in the packed tarball, and `index.js` must not statically import
`echarts` / `recharts` / `three` (a violation means code splitting was turned
off and lazy chunks were inlined back into the main chunk).
