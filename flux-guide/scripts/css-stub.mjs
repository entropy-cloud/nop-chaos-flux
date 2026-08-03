/**
 * Node ESM loader stub for the flux-guide type generation.
 *
 * 1. `.css` imports (renderer packages import styles at module scope) → empty
 *    module.
 * 2. `@atlaskit/pragmatic-drag-and-drop/<subpath>` imports from the scheduling
 *    package `dist/` — the atlaskit package ships CJS without an `exports`
 *    map, so Node ESM cannot resolve subpath directory imports (`/element/adapter`).
 *    The typegen only needs the renderer *definitions*, so stub the whole
 *    package with an empty module (the DnD hooks never run during generation).
 */
import { pathToFileURL } from 'node:url';

const STUB_URL = new URL('./stub-module.mjs', import.meta.url).href;

export function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.css')) {
    return { shortCircuit: true, url: new URL(specifier, context.parentURL).href };
  }
  if (specifier === '@atlaskit/pragmatic-drag-and-drop' || specifier.startsWith('@atlaskit/pragmatic-drag-and-drop/')) {
    return { shortCircuit: true, url: STUB_URL };
  }
  return nextResolve(specifier);
}

export function load(url, context, nextLoad) {
  if (url.endsWith('.css')) {
    return { format: 'module', source: 'export default {};', shortCircuit: true };
  }
  if (url === STUB_URL) {
    return { format: 'module', source: 'export const draggable = () => undefined; export const dropTargetForElements = () => undefined; export const monitorForElements = () => undefined; export const combine = () => undefined;', shortCircuit: true };
  }
  return nextLoad(url);
}
