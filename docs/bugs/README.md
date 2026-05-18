# Bug Notes

Use `docs/bugs/` for numbered bug histories that should still be understandable after the codebase changes.

## Rules

- use numbered filenames such as `01-...`, `02-...`, `03-...`
- when number prefixes repeat across domains, treat the full filename as the canonical bug id in links and discussions
- keep notes short and focused on memory, not full implementation history
- use `docs/bugs/00-bug-fix-note-writing-guide.md` as the writing template
- keep current design truth in `docs/architecture/`; use bug notes only for historical problem and fix context

## Current Entries

- `docs/bugs/00-bug-fix-note-writing-guide.md`
- `docs/bugs/01-playground-email-input-state-reset-fix.md`
- `docs/bugs/02-playground-env-identity-runtime-reset-fix.md`
- `docs/bugs/03-fragment-scope-identity-form-reset-fix.md`
- `docs/bugs/04-dialog-scope-stale-render-fix.md`
- `docs/bugs/05-checkbox-group-value-type-drift-fix.md`
- `docs/bugs/06-array-editor-key-value-dual-state-fix.md`
- `docs/bugs/07-submit-concurrent-guard-fix.md`
- `docs/bugs/08-validate-form-destructive-error-merge-fix.md`
- `docs/bugs/09-container-flex-grid-layout-conflict-fix.md`
- `docs/bugs/10-flow-designer-expression-selection-fix.md`
- `docs/bugs/11-xyflow-node-drag-not-initialized-fix.md`
- `docs/bugs/12-flow-designer-visual-parity-canvas-node-style-fix.md`
- `docs/bugs/13-flow-designer-minimap-centered-square-mask-fix.md`
- `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md`
- `docs/bugs/15-render-nodes-setstate-during-render-fix.md`
- `docs/bugs/15-report-designer-fill-series-trailing-digit-fix.md`
- `docs/bugs/15-flux-runtime-source-reaction-recursion-and-dependency-guard-regression.md`
- `docs/bugs/16-dialog-drag-pointer-capture-boundary-clamp-fix.md`
- `docs/bugs/16-report-designer-fill-handle-drag-single-cell-fix.md`
- `docs/bugs/17-json-viewer-class-override-breaks-highlighting-fix.md`
- `docs/bugs/17-report-designer-field-drop-edit-exit-cursor-stuck-fix.md`
- `docs/bugs/18-tailwind-source-wrong-relative-path-flux-lib-unscanned.md`
- `docs/bugs/19-code-editor-label-click-forwarding-triggers-fullscreen-fix.md`
- `docs/bugs/22-spreadsheet-integration-test-scope-reactive-read-fix.md`
- `docs/bugs/23-stale-js-artifacts-shadow-source-in-vitest-fix.md`
- `docs/bugs/24-word-editor-e2e-tabs-role-mismatch-and-state-divergence-fix.md`
- `docs/bugs/25-word-editor-paper-size-selection-not-persisting-fix.md`
- `docs/bugs/26-word-editor-layout-scroll-architecture-fix.md`
- `docs/bugs/27-reaction-registration-churn-and-initial-page-sync-test-hang-fix.md`
- `docs/bugs/28-reaction-debounce-timer-leak-on-dispose.md`
- `docs/bugs/29-detail-view-confirm-viewer-not-updated-fix.md`
- `docs/bugs/30-form-runtime-setvalue-setlastchange-missing-rerender-fix.md`
- `docs/bugs/31-flow-designer-crash-formula-eval-throw-no-error-boundary-fix.md`
- `docs/bugs/32-react19-external-store-derived-snapshot-loop-fix.md`
- `docs/bugs/33-flux-basic-lazy-route-suspense-hang-fix.md`
- `docs/bugs/34-flow-designer-minimap-click-pan-controlled-viewport-fix.md`
- `docs/bugs/35-performance-table-form-control-isolated-cell-scope-binding-fix.md`
- `docs/bugs/36-detail-field-strict-mode-mounted-guard-dialog-open-fix.md`
- `docs/bugs/37-report-designer-demo-selection-bridge-inspector-stuck-on-sheet-fix.md`
- `docs/bugs/38-report-designer-preview-cancellation-and-stale-result-fix.md`
- `docs/bugs/39-schema-renderer-strictmode-runtime-dispose-form-reset-fix.md`
- `docs/bugs/40-performance-table-profiler-loop-and-mode-remount-fix.md`
- `docs/bugs/41-variant-field-strictmode-mounted-guard-tab-switch-fix.md`
- `docs/bugs/42-crud-selection-always-on-table-body-empty-fix.md`
- `docs/bugs/43-flow-designer-node-edge-text-empty-expression-pre-evaluation-fix.md`
- `docs/bugs/44-performance-table-full-stress-root-array-form-hang-fix.md`
- `docs/bugs/44-flow-designer-tree-merge-layering-layout-fix.md`
- `docs/bugs/45-tag-list-non-required-runtime-validation-fix.md`
- `docs/bugs/46-debugger-strictmode-owned-component-registry-dispose-fix.md`
- `docs/bugs/47-performance-table-row-action-page-scope-writeback-fix.md`
- `docs/bugs/49-flux-basic-inspect-dialog-and-array-editor-remove-fix.md`
- `docs/bugs/50-use-source-value-strictmode-unmount-stale-drop-fix.md`
- `docs/bugs/51-structuralwhen-runtime-react-handoff-contract-fix.md`
- `docs/bugs/52-variant-field-canonical-owner-selection-fix.md`
- `docs/bugs/53-imported-region-composite-scope-shared-dedupe-fix.md`
- `docs/bugs/56-dynamic-renderer-ad-hoc-fragment-identity-fix.md`
- `docs/bugs/57-performance-table-row-scope-cache-snapshot-fix.md`
- `docs/bugs/58-custom-field-compile-failure-surface-fix.md`
- `docs/bugs/59-api-cache-bounded-key-digest-fix.md`
- `docs/bugs/60-table-operation-slot-scope-isolation-fix.md`
- `docs/bugs/61-performance-table-strictmode-row-scope-runtime-key-fix.md`
