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
- `xlang-debug-editor-*.js` — XLang online debug editor (CodeMirror + lezer grammar
  bundled into this chunk; loaded on first `xlang-debug-editor` schema node)

`scripts/check-flux-bundle-pack.mjs` enforces the contract: the async chunks
must exist in the packed tarball, and `index.js` must not statically import
`echarts` / `recharts` / `three` — nor statically reference the
`xlang-debug-editor-*` implementation chunk (the xlang lazy boundary is
guarded by that relative-edge assertion, since CodeMirror/lezer are bundled
into the async chunk and never appear as main-chunk header specifiers).

## XLang online debug editor (plan 2474, entropy roadmap item 20)

The default stack registers the `xlang-debug-editor` renderer type (definition and
field rules sync; CodeMirror/lezer implementation lazy). Host usage:

- Schema: `{ type: 'xlang-debug-editor', sourcePath: '<debug doc anchor>', serverUrl: '/ws/xlang-debugger', initialSource?: '...' }`
  (`sourcePath`/`serverUrl` required — field-rule contracts).
- Backend prerequisites (nop-entropy `nop-dev-tools`): WebSocket debug gateway at
  `serverUrl` (handshake auth via `nopDebugToken` query param — hosts without a login
  flow wrap `env.openSocket` and append the token themselves; the client omits the param
  when its token getter returns nothing, so there is exactly one injection point), and
  the REPL/compile endpoints `POST /r/nop-xlang-debug/compile` (+ `/execute`) gated by
  `nop.xlang.debugger.enabled` and the platform auth chain.
- The compile-diagnostics bridge is host-injected via `env.fetcher` (envelope:
  `status === 0` → `data.diagnostics`).
- Demo host ruling (entropy plan 2474 Decision 1): the online-debug demo page lives in
  the flux playground (`#/xlang-debug`, workspace imports, item 19); production admin
  pages are out of scope until a host-side requirement exists — the registry capability
  and the delivery chain are in place for self-service adoption.
