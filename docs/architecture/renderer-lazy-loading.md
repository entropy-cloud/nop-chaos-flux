# Renderer Heavy-Lib Lazy Loading (Unified Mechanism)

## Purpose

Controls that embed external heavy libraries (three.js, leafer-ui, OpenLayers, ECharts, recharts, CodeMirror, @xyflow/react, dagre, @visactor/vtable, @zxing/library, …) MUST delay-load them, and the delay-loading MUST go through the two unified mechanisms below — packages must not hand-roll their own promise caches or ad-hoc lazy wrappers (各器件不再各自为战).

Established 2026-10-10 (dev log `docs/logs/2026/10-10.md`): before this convention, `flux-renderers-3d` (three), `flux-renderers-industrial` (leafer-ui), `flux-renderers-graph` (@xyflow/react + dagre) and `flux-renderers-pivot` (@visactor/vtable) statically imported their heavy lib on the host registration path, while `flux-renderers-map` / `flux-renderers-data` / `flux-code-editor` had each invented their own module-cache helper.

## The Two Unified Mechanisms

### 1. Component level — `createLazyRendererComponent` (`@nop-chaos/flux-react`)

React.lazy + Suspense wrapper for renderer components. The dynamic `import()` puts the component subtree — and every heavy lib it statically reaches — into a separate async chunk. Suspense fallback is a centered `Spinner` (overridable).

```ts
import { createLazyRendererComponent } from '@nop-chaos/flux-react';
import type { ThreeCanvasSchema } from './schemas.js';

const LazyThreeCanvasRenderer = createLazyRendererComponent<ThreeCanvasSchema>(() =>
  import('./renderer/three-canvas.js').then((m) => m.ThreeCanvasRenderer),
);

export const threeCanvasRendererDefinition: RendererDefinition = {
  type: 'three-canvas',
  component: LazyThreeCanvasRenderer,
  // …static metadata (fields with inline contracts) stays synchronous…
};
```

Rules:

- `renderer-definitions.ts` (the host registration path) must NOT statically import the renderer implementation module or the heavy lib. The only allowed edge to the implementation is the dynamic `import()` inside the lazy loader.
- Static metadata (`schemaValidator`, `fields` with inline contracts, `componentCapabilityContracts`, `defaultSchema`) stays synchronous on the definition — only the component is lazy.
- Package entries (`src/index.ts`) must not statically re-export heavy implementation modules (`ThreeCanvasRenderer`, `SceneManager`, …). Consumers register via `registerXxxRenderers`; anything else needs the heavy lib should dynamic-import it itself.

### 2. Module level — `createLazyLibLoader` (`@nop-chaos/flux-core`)

Promise memoization for dynamically imported heavy modules inside an (already lazy) chunk. Replaces all hand-rolled `let promise: Promise<T> | null` caches.

```ts
import { createLazyLibLoader } from '@nop-chaos/flux-core';

const loadEChartsSetup = createLazyLibLoader(
  (): Promise<EChartsSetupModule> => import('./echarts-setup.js'),
);
```

Semantics (fixed by the shared implementation, tested in `flux-core/src/utils/lazy-lib.test.ts`):

- first call starts the load; concurrent and later calls share the same in-flight/resolved promise (in-flight dedupe);
- a failed load clears the cache, so the next call retries (failures never lock the loader permanently);
- errors propagate to the caller — rendering an error placeholder / dev-warn degrade is the caller's job.

Current users: `flux-renderers-data` (`echarts-renderer.tsx` → `echarts-setup.js`), `flux-renderers-map` (`map-ol-loader.ts` → 17 `ol/*` modules), `flux-renderers-scheduling` (`barcode-detector-utils.ts` → `@zxing/library`).

## Package Inventory (2026-10-10 state)

| Package                     | Heavy lib             | Component lazy                                             | Module loader                                        |
| --------------------------- | --------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `flux-renderers-3d`         | three                 | `createLazyRendererComponent` → `renderer/three-canvas.js` | — (three fully inside the async chunk)               |
| `flux-renderers-industrial` | leafer-ui             | `createLazyRendererComponent` via `scada-canvas-lazy.ts`   | —                                                    |
| `flux-renderers-graph`      | @xyflow/react + dagre | `createLazyRendererComponent` → `graph-renderer.js`        | —                                                    |
| `flux-renderers-pivot`      | @visactor/vtable      | `createLazyRendererComponent` → `pivot-renderer.js`        | —                                                    |
| `flux-renderers-map`        | ol                    | `createLazyRendererComponent` → `map-renderer.js`          | `createLazyLibLoader(loadOlApi)`                     |
| `flux-renderers-data`       | echarts / recharts    | `createLazyRendererComponent` (chart + echarts)            | `createLazyLibLoader(echarts-setup)`                 |
| `flux-code-editor`          | codemirror family     | `createLazyRendererComponent` → `code-editor-renderer.js`  | —                                                    |
| `flux-renderers-scheduling` | @zxing/library        | — (runtime renderer is light)                              | `createLazyLibLoader` in `barcode-detector-utils.ts` |

Editor-side entries that were already isolated stay as-is: `@leafer-in/editor` behind the `/editor` subpath export, tiptap inside the lazily loaded word-editor chunk.

## Industrial-specific: symbol registration rides the chunk

`registerScadaRenderers(registry)` is synchronous and registers only the definition. The 24 builtin symbols register when the scada-canvas chunk loads (`scada-canvas-lazy.ts` composes `import('./renderer/scada-canvas.js')` with `import('./symbols/register-builtin.js')` → `registerScadaSymbols()`, idempotent). Because React.lazy resolves before the component mounts, the symbol registry is always populated before engine build.

Hosts that consume the symbol registry before the first canvas mount (editor symbol palette) call `registerScadaSymbols()` explicitly — public API unchanged (`SCADA_EDITOR_DEMO_RECIPE` precedent in `apps/playground/src/designer-hosts/registry-factory.ts`).

## Regression Guards

Each converted package carries `src/lazy-loading-guard.test.ts` — a source-level scan asserting the registration path has no static import of the heavy lib or implementation modules (type-only imports are compile-erased and allowed), and that the lazy loader is present. Industrial additionally behavior-tests that `registerScadaRenderers` leaves the symbol registry empty until the chunk load. When adding a heavy-lib renderer, add the same guard file; when adding a heavy-lib import to an existing lazy chunk, no new guard is needed (the chunk is already async).

## Checklist For New Heavy-Lib Renderers

1. Import the heavy lib only inside the renderer implementation module.
2. Register the definition with `createLazyRendererComponent(() => import('./renderer/xxx.js').then(m => m.XxxRenderer))`.
3. If the chunk itself needs a second dynamic import (large optional module inside the lib), use `createLazyLibLoader` — never a local `let cached: Promise | null`.
4. Keep package `sideEffects: ['*.css']` (or `false`) so app builds tree-shake unused entry re-exports.
5. Add a `lazy-loading-guard.test.ts` scanning your definitions/entry files.
