// Host renderer package coverage proof (2026-08-09, plan
// `2026-08-09-0444-1-round2-tool-governance-scanner-and-test-infra.md` Phase 5):
// find-test-global-leaks must scan test files under the four host renderer
// packages (flow-designer / spreadsheet / report-designer / word-editor
// renderers). Module-top `let` here must be detected.
let hostModuleCounter = 0;

export function hostBump() {
  return (hostModuleCounter += 1);
}
