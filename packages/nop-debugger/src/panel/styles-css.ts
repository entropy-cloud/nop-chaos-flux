export const DEBUGGER_STYLE_ID = 'nop-debugger-styles';

export const DEBUGGER_STYLES = `
.nop-debugger {
  position: fixed;
  z-index: 9999;
  width: min(420px, calc(100vw - 32px));
  max-height: min(78vh, 760px);
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: var(
    --nop-debugger-bg,
    linear-gradient(180deg, rgba(16, 24, 34, 0.96), rgba(10, 18, 27, 0.98)),
    radial-gradient(circle at top right, rgba(240, 183, 79, 0.16), transparent 42%)
  );
  border: 1px solid var(--nop-debugger-border, rgba(255, 255, 255, 0.08));
  box-shadow: var(--nop-debugger-shadow, 0 24px 72px rgba(7, 12, 18, 0.32));
  color: var(--nop-debugger-text, #eef4fb);
  backdrop-filter: blur(16px);
  overflow: auto;
}

.nop-debugger .ndbg-header {
  position: sticky;
  top: -14px;
  z-index: 1;
  background: var(--nop-debugger-bg);
  padding-bottom: 2px;
  display: flex;
}

.nop-debugger .ndbg-drag-handle {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.nop-debugger .ndbg-header h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.nop-debugger .ndbg-eyebrow {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--nop-debugger-eyebrow, #ffcf8b);
}

.nop-debugger .ndbg-header-actions,
.nop-debugger .ndbg-tabs,
.nop-debugger .ndbg-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nop-debugger .ndbg-icon-button,
.nop-debugger .ndbg-tab,
.nop-debugger .ndbg-filter,
.nop-debugger-launcher {
  color: var(--nop-debugger-text, #eef4fb);
  cursor: pointer;
}

.nop-debugger .ndbg-icon-button,
.nop-debugger .ndbg-tab,
.nop-debugger .ndbg-filter {
  font-size: 12px;
  font-weight: 600;
}

.nop-debugger .ndbg-tab[data-active],
.nop-debugger .ndbg-filter[data-active] {
  background: var(--nop-debugger-chip-active-bg, rgba(255, 207, 139, 0.18));
  border-color: var(--nop-debugger-chip-active-border, rgba(255, 207, 139, 0.34));
  color: var(--nop-debugger-chip-active-text, #ffcf8b);
}

.nop-debugger .ndbg-overview,
.nop-debugger .ndbg-list {
  display: grid;
  gap: 10px;
  overflow: auto;
}

.nop-debugger .ndbg-row {
  display: flex;
  gap: 8px;
}

.nop-debugger .ndbg-row--tight {
  gap: 4px;
}

.nop-debugger .ndbg-row--between {
  justify-content: space-between;
}

.nop-debugger .ndbg-row--center {
  align-items: center;
}

.nop-debugger .ndbg-list--virtual {
  position: relative;
  max-height: 420px;
  min-height: 240px;
  align-content: start;
}

.nop-debugger .ndbg-virtual-spacer {
  position: relative;
  width: 100%;
  min-height: 100%;
}

.nop-debugger .ndbg-virtual-window {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: grid;
  gap: 10px;
}

.nop-debugger .ndbg-overview {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.nop-debugger .ndbg-metric-card,
.nop-debugger .ndbg-entry {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: var(--nop-debugger-card-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--nop-debugger-card-border, rgba(255, 255, 255, 0.08));
}

.nop-debugger .ndbg-metric-card strong {
  font-size: 20px;
}

.nop-debugger .ndbg-metric-card--spaced {
  margin-bottom: 8px;
}

.nop-debugger .ndbg-metric-card[data-error] strong {
  color: var(--nop-debugger-badge-error-text, #ffadad);
}

.nop-debugger .ndbg-metric-label,
.nop-debugger .ndbg-entry-meta,
.nop-debugger .ndbg-entry time,
.nop-debugger .ndbg-launcher-meta {
  font-size: 12px;
  color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7));
}

.nop-debugger .ndbg-entry-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.nop-debugger .ndbg-entry-summary {
  font-size: 14px;
  line-height: 1.45;
}

.nop-debugger .ndbg-entry-detail,
.nop-debugger .ndbg-entry-expanded,
.nop-debugger .ndbg-eval-result {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--nop-debugger-detail-bg, rgba(0, 0, 0, 0.26));
}
.nop-debugger .ndbg-entry-detail {
  display: block;
  overflow-x: auto;
  color: var(--nop-debugger-detail-text, #bce6ff);
  white-space: nowrap;
}
.nop-debugger .ndbg-entry-expanded {
  display: grid;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
}
.nop-debugger .ndbg-eval-result {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--nop-debugger-detail-text, #bce6ff);
  white-space: pre-wrap;
  word-break: break-all;
}

.nop-debugger .ndbg-badge {
  width: fit-content;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.nop-debugger .ndbg-badge[data-group="render"] { background: var(--nop-debugger-badge-render-bg, rgba(120, 198, 255, 0.16)); color: var(--nop-debugger-badge-render-text, #9bd9ff); }
.nop-debugger .ndbg-badge[data-group="action"] { background: var(--nop-debugger-badge-action-bg, rgba(255, 205, 128, 0.16)); color: var(--nop-debugger-badge-action-text, #ffd18a); }
.nop-debugger .ndbg-badge[data-group="api"] { background: var(--nop-debugger-badge-api-bg, rgba(125, 235, 182, 0.16)); color: var(--nop-debugger-badge-api-text, #9df3ca); }
.nop-debugger .ndbg-badge[data-group="compile"] { background: var(--nop-debugger-badge-compile-bg, rgba(210, 183, 255, 0.16)); color: var(--nop-debugger-badge-compile-text, #dcc0ff); }
.nop-debugger .ndbg-badge[data-group="notify"] { background: var(--nop-debugger-badge-notify-bg, rgba(255, 158, 177, 0.16)); color: var(--nop-debugger-badge-notify-text, #ffbac8); }
.nop-debugger .ndbg-badge[data-group="error"] { background: var(--nop-debugger-badge-error-bg, rgba(255, 128, 128, 0.18)); color: var(--nop-debugger-badge-error-text, #ffadad); }
.nop-debugger .ndbg-badge[data-group="node"] { background: var(--nop-debugger-badge-compile-bg, rgba(210, 183, 255, 0.16)); color: var(--nop-debugger-badge-compile-text, #dcc0ff); }

.nop-debugger .ndbg-badge[data-slow="true"] { background: rgba(255, 183, 77, 0.2); color: #ffcf8b; }

.nop-debugger .ndbg-empty { margin: 0; color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7)); }

.nop-debugger .ndbg-launcher-icon,
.nop-debugger-launcher .ndbg-launcher-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nop-debugger .ndbg-launcher-label,
.nop-debugger-launcher .ndbg-launcher-label { font-size: 12px; font-weight: 600; }

.nop-debugger .ndbg-search,
.nop-debugger .ndbg-node-input,
.nop-debugger .ndbg-eval-input {
  width: 100%;
  font-size: 12px;
  color: var(--nop-debugger-text, #eef4fb);
  outline: none;
}
.nop-debugger .ndbg-search::placeholder,
.nop-debugger .ndbg-node-input::placeholder,
.nop-debugger .ndbg-eval-input::placeholder {
  color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7));
}
.nop-debugger .ndbg-search:focus,
.nop-debugger .ndbg-eval-input:focus {
  border-color: var(--nop-debugger-chip-active-border, rgba(255, 207, 139, 0.34));
}
.nop-debugger .ndbg-search {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--nop-debugger-chip-border, rgba(255, 255, 255, 0.12));
  background: var(--nop-debugger-chip-bg, rgba(255, 255, 255, 0.05));
}
.nop-debugger .ndbg-eval-input {
  font-family: monospace;
}

.nop-debugger .ndbg-search-history {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nop-debugger .ndbg-highlight { border-radius: 4px; background: var(--nop-debugger-highlight-bg, rgba(255, 207, 139, 0.22)); color: var(--nop-debugger-highlight-text, #fff3d6); padding: 0 2px; }

.nop-debugger .ndbg-entry-trigger {
  width: 100%;
  height: auto;
  display: grid;
  justify-content: stretch;
  justify-items: stretch;
  gap: 8px;
  padding: 0;
  border-radius: inherit;
  white-space: normal;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.nop-debugger .ndbg-entry-trigger:hover {
  background: transparent;
  color: inherit;
}

.nop-debugger .ndbg-json-key { color: var(--nop-debugger-json-key, #9bd9ff); }
.nop-debugger .ndbg-json-string { color: var(--nop-debugger-json-string, #9df3ca); }
.nop-debugger .ndbg-json-number { color: var(--nop-debugger-json-number, #ffd18a); }
.nop-debugger .ndbg-json-boolean { color: var(--nop-debugger-json-boolean, #dcc0ff); }
.nop-debugger .ndbg-json-null { color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7)); font-style: italic; }
.nop-debugger .ndbg-json-toggle { cursor: pointer; user-select: none; color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7)); font-size: 11px; }
.nop-debugger .ndbg-json-toggle:hover { color: var(--nop-debugger-text, #eef4fb); }

.nop-debugger-launcher {
  position: fixed; z-index: 9998; display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; border-radius: 20px; background: var(--nop-debugger-launcher-bg, rgba(16, 24, 34, 0.94));
  box-shadow: var(--nop-debugger-launcher-shadow, 0 8px 24px rgba(7, 12, 18, 0.32)); cursor: grab; user-select: none; touch-action: none;
}

.nop-debugger-launcher .ndbg-launcher-badge {
  position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px;
  padding: 0 4px; border-radius: 999px; background: var(--nop-debugger-launcher-badge-bg, #ff6b6b); color: var(--nop-debugger-launcher-badge-text, #ffffff);
  font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center;
  animation: nop-debugger-pulse 2s ease-in-out infinite;
}
@keyframes nop-debugger-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }

.nop-debugger .ndbg-status-pending { color: #ffd18a; }
.nop-debugger .ndbg-status-completed { color: #9df3ca; }
.nop-debugger .ndbg-status-failed { color: #ffadad; }
.nop-debugger .ndbg-status-aborted { color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7)); }

.nop-debugger .ndbg-errors-only-toggle { background: var(--nop-debugger-badge-error-bg, rgba(255, 128, 128, 0.18)); color: var(--nop-debugger-badge-error-text, #ffadad); }

@media (max-width: 760px) {
  .nop-debugger { width: calc(100vw - 24px); max-height: 72vh; }
  .nop-debugger .ndbg-overview { grid-template-columns: 1fr; }
}

.nop-debugger-overlay {
  position: fixed; pointer-events: none; z-index: 10000; border-radius: 2px; transition: all 0.05s ease;
}
.nop-debugger-overlay[data-overlay-state="hover"] { outline: 1px dashed var(--nop-debugger-overlay-accent, #1c76c4); background: var(--nop-debugger-overlay-hover-bg, rgba(28, 118, 196, 0.06)); }
.nop-debugger-overlay[data-overlay-state="active"] { outline: 2px solid var(--nop-debugger-overlay-accent, #1c76c4); background: var(--nop-debugger-overlay-active-bg, rgba(28, 118, 196, 0.1)); }
.nop-debugger .ndbg-component-tree { max-height: 180px; overflow-y: auto; border: 1px solid var(--nop-debugger-chip-border, rgba(255, 255, 255, 0.12)); border-radius: 8px; padding: 4px; }
.nop-debugger .ndbg-tree-item { padding: 4px 8px; border-radius: 4px; cursor: pointer; }
.nop-debugger .ndbg-tree-item:hover { background: var(--nop-debugger-chip-active-bg, rgba(255, 207, 139, 0.18)); }
.nop-debugger .ndbg-tree-item.selected { background: var(--nop-debugger-overlay-selected-bg, rgba(28, 118, 196, 0.15)); outline: 1px solid var(--nop-debugger-overlay-selected-outline, rgba(28, 118, 196, 0.3)); }
.nop-debugger .ndbg-tree-item-id { font-size: 11px; color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7)); }
.nop-debugger .ndbg-tree-item-label { font-size: 12px; }
.nop-debugger .ndbg-resize-handle {
  position: absolute; left: 0; top: 22px; bottom: 22px; width: 6px;
  cursor: ew-resize; border-radius: 3px 0 0 3px; z-index: 2;
}
.nop-debugger .ndbg-resize-handle:hover, .nop-debugger .ndbg-resize-handle:active { background: rgba(255, 207, 139, 0.25); }

.nop-debugger.ndbg-minimized,
.nop-debugger[data-panel-state="minimized"] {
  display: flex;
  align-items: center;
  gap: 8px;
  width: auto;
  max-height: none;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: grab;
  user-select: none;
  touch-action: none;
  overflow: visible;
}

.nop-debugger[data-panel-state="minimized"] .ndbg-resize-handle {
  display: none;
}

.nop-debugger .ndbg-minimized-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nop-debugger .ndbg-minimized-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.nop-debugger .ndbg-minimized-badge,
.nop-debugger .ndbg-minimized-error-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nop-debugger .ndbg-minimized-badge {
  background: rgba(255, 255, 255, 0.1);
  color: var(--nop-debugger-text, #eef4fb);
}
.nop-debugger .ndbg-minimized-error-badge {
  background: rgba(255, 128, 128, 0.2);
  color: var(--nop-debugger-badge-error-text, #ffadad);
}

.nop-debugger .ndbg-icon-button {
  position: relative;
}

.nop-debugger .ndbg-icon-button[data-active] {
  background: rgba(28, 118, 196, 0.3);
  color: #9bd9ff;
}

.nop-debugger .ndbg-icon-button::after,
.nop-debugger .ndbg-icon-button::before {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}
.nop-debugger .ndbg-icon-button::after {
  content: attr(data-tooltip);
  bottom: calc(100% + 6px);
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}
.nop-debugger .ndbg-icon-button::before {
  content: '';
  bottom: calc(100% + 2px);
  border: 4px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.85);
}
.nop-debugger .ndbg-icon-button:hover::after,
.nop-debugger .ndbg-icon-button:hover::before {
  opacity: 1;
}

.nop-debugger .ndbg-inspect-hint {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(28, 118, 196, 0.12);
  border: 1px solid rgba(28, 118, 196, 0.25);
  color: #9bd9ff;
  font-size: 12px;
  text-align: center;
}
.nop-debugger .ndbg-inspect-panel,
.nop-debugger .ndbg-inspect-section,
.nop-debugger .ndbg-tree-section {
  display: grid;
  gap: 8px;
}
.nop-debugger .ndbg-inspect-section { gap: 6px; }
.nop-debugger .ndbg-inspect-header { display: flex; justify-content: space-between; align-items: center; }
.nop-debugger .ndbg-inspect-section {
  display: grid;
  gap: 6px;
}
.nop-debugger .ndbg-inspect-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7));
  cursor: pointer;
  user-select: none;
}
.nop-debugger .ndbg-inspect-section-title:hover {
  color: var(--nop-debugger-text, #eef4fb);
}
.nop-debugger .ndbg-inspect-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(28, 118, 196, 0.15);
  color: #9bd9ff;
  font-size: 11px;
  font-family: monospace;
}
.nop-debugger .ndbg-inspect-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11px;
  color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7));
}
.nop-debugger .ndbg-form-tab {
  color: var(--nop-debugger-muted-text, rgba(238, 244, 251, 0.7));
  font-size: 11px;
}
.nop-debugger .ndbg-form-tab[data-active] {
  background: var(--nop-debugger-chip-active-bg, rgba(255, 207, 139, 0.18));
  border-color: var(--nop-debugger-chip-active-border, rgba(255, 207, 139, 0.34));
  color: var(--nop-debugger-chip-active-text, #ffcf8b);
}

.nop-debugger .ndbg-inline-button {
  font-size: 11px;
}

.nop-debugger .ndbg-close-button {
  color: var(--nop-debugger-text, #eef4fb);
}
`;
