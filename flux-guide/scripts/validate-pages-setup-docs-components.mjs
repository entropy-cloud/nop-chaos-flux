/**
 * Registry-coverage setup for `pnpm flux:validate-pages --setup` over the
 * docs-components example corpus (`docs/components` / example.json, plan 595
 * Phase 3). The canonical
 * `REGISTER_PACKAGES` registry (flux-guide/scripts/shared.mjs) covers the
 * playground/app-rendering surface; the docs corpus additionally documents
 * designer/editor-family renderers that live in standalone packages and are
 * normally registered by their host application. This module registers those
 * packages onto the validation registry so `unknown-renderer-type` /
 * `invalid-root` stops emitting false positives for documented types:
 *
 *   graph, map, pivot-table               (flux-renderers-graph/map/pivot)
 *   dashboard, dashboard-editor           (flux-renderers-dashboard)
 *   report-designer-page, report-field-panel, report-inspector,
 *   report-inspector-shell, report-toolbar (report-designer-renderers)
 *   spreadsheet-page                      (spreadsheet-renderers)
 *   word-editor-page                      (word-editor-renderers)
 *
 * Same import discipline as shared.mjs: dist-only, requires `pnpm build`;
 * run under the css-stub loader (see `flux:validate-pages` script).
 */
export default async function registerDocsComponentRenderers({ registry }) {
  const packages = [
    { pkg: 'flux-renderers-graph', fn: 'registerGraphRenderers' },
    { pkg: 'flux-renderers-map', fn: 'registerMapRenderers' },
    { pkg: 'flux-renderers-pivot', fn: 'registerPivotRenderers' },
    { pkg: 'flux-renderers-dashboard', fn: 'registerDashboardRenderers' },
    { pkg: 'report-designer-renderers', fn: 'registerReportDesignerRenderers' },
    { pkg: 'spreadsheet-renderers', fn: 'registerSpreadsheetRenderers' },
    { pkg: 'word-editor-renderers', fn: 'registerWordEditorRenderers' },
  ];
  for (const { pkg, fn } of packages) {
    // Registration must complete before validation starts; a missing/broken
    // dist surfaces as the CLI's registry-assembly failure (exit 2).
    const mod = await import(`../../packages/${pkg}/dist/index.js`);
    if (typeof mod[fn] !== 'function') {
      throw new Error(`${pkg} does not export ${fn}`);
    }
    mod[fn](registry);
  }
}
