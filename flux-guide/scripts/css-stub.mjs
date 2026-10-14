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
 * 3. `@hufe921/canvas-editor` imports from the word-editor packages `dist/` —
 *    the dependency declares `type: module` but its `main` points at the UMD
 *    bundle (no ESM `export` statement), so Node ESM named imports
 *    (`EditorZone`, ...) fail at link time. Redirect to the sibling ESM bundle
 *    (the `module` field target, already what browser builds consume); the
 *    real enums are needed because word-editor-core re-exports them.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const STUB_URL = new URL('./stub-module.mjs', import.meta.url).href;

/**
 * `@hufe921/canvas-editor` declares `type: module` but points `main` at the
 * UMD bundle (no ESM `export` statement), so Node ESM named imports
 * (`EditorZone`, ...) fail at link time. Redirect to the sibling ESM bundle
 * (the `module` field target, already what browser builds consume); the real
 * enums are needed because word-editor-core re-exports them. Resolved from the
 * importing package's own node_modules via createRequire (Node >=25
 * nextResolve returns an empty object in this chain).
 */
function resolveCanvasEditorEsm(context) {
  const parentPath = context.parentURL ? new URL(context.parentURL).pathname : undefined;
  if (!parentPath) return undefined;
  try {
    const mainPath = createRequire(parentPath).resolve('@hufe921/canvas-editor');
    if (mainPath.endsWith('/canvas-editor.umd.js')) {
      return pathToFileURL(
        mainPath.slice(0, -'/canvas-editor.umd.js'.length) + '/canvas-editor.es.js',
      ).href;
    }
    return pathToFileURL(mainPath).href;
  } catch {
    return undefined;
  }
}

export function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.css')) {
    return { shortCircuit: true, url: new URL(specifier, context.parentURL).href };
  }
  if (specifier === '@atlaskit/pragmatic-drag-and-drop' || specifier.startsWith('@atlaskit/pragmatic-drag-and-drop/')) {
    return { shortCircuit: true, url: STUB_URL };
  }
  if (specifier === '@hufe921/canvas-editor') {
    const esmUrl = resolveCanvasEditorEsm(context);
    if (esmUrl) return { shortCircuit: true, url: esmUrl };
  }
  return nextResolve(specifier, context);
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
