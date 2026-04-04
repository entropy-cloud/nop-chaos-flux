import { useEffect } from 'react';

export const DEBUGGER_STYLE_ID = 'nop-debugger-styles';

export const DEBUGGER_STYLES = `
.nop-theme-root {
  --nop-debugger-bg:
    linear-gradient(180deg, rgba(16, 24, 34, 0.96), rgba(10, 18, 27, 0.98)),
    radial-gradient(circle at top right, rgba(240, 183, 79, 0.16), transparent 42%);
  --nop-debugger-border: rgba(255, 255, 255, 0.08);
  --nop-debugger-shadow: 0 24px 72px rgba(7, 12, 18, 0.32);
  --nop-debugger-text: #eef4fb;
  --nop-debugger-eyebrow: #ffcf8b;
  --nop-debugger-chip-bg: rgba(255, 255, 255, 0.05);
  --nop-debugger-chip-border: rgba(255, 255, 255, 0.12);
  --nop-debugger-chip-active-bg: rgba(255, 207, 139, 0.18);
  --nop-debugger-chip-active-border: rgba(255, 207, 139, 0.34);
  --nop-debugger-chip-active-text: #ffcf8b;
  --nop-debugger-card-bg: rgba(255, 255, 255, 0.05);
  --nop-debugger-card-border: rgba(255, 255, 255, 0.08);
  --nop-debugger-muted-text: rgba(238, 244, 251, 0.7);
  --nop-debugger-detail-bg: rgba(0, 0, 0, 0.26);
  --nop-debugger-detail-text: #bce6ff;
  --nop-debugger-launcher-bg: rgba(16, 24, 34, 0.94);
  --nop-debugger-launcher-shadow: 0 8px 24px rgba(7, 12, 18, 0.32);
  --nop-debugger-badge-render-bg: rgba(120, 198, 255, 0.16);
  --nop-debugger-badge-render-text: #9bd9ff;
  --nop-debugger-badge-action-bg: rgba(255, 205, 128, 0.16);
  --nop-debugger-badge-action-text: #ffd18a;
  --nop-debugger-badge-api-bg: rgba(125, 235, 182, 0.16);
  --nop-debugger-badge-api-text: #9df3ca;
  --nop-debugger-badge-compile-bg: rgba(210, 183, 255, 0.16);
  --nop-debugger-badge-compile-text: #dcc0ff;
  --nop-debugger-badge-notify-bg: rgba(255, 158, 177, 0.16);
  --nop-debugger-badge-notify-text: #ffbac8;
  --nop-debugger-badge-error-bg: rgba(255, 128, 128, 0.18);
  --nop-debugger-badge-error-text: #ffadad;
}

.nop-debugger {
  position: fixed;
  z-index: 9999;
  width: min(420px, calc(100vw - 32px));
  max-height: min(78vh, 760px);
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: var(--nop-debugger-bg);
  border: 1px solid var(--nop-debugger-border);
  box-shadow: var(--nop-debugger-shadow);
  color: var(--nop-debugger-text);
  backdrop-filter: blur(16px);
  overflow: auto;
}

.ndbg-header {
  position: sticky;
  top: -14px;
  z-index: 1;
  background: var(--nop-debugger-bg);
  padding-bottom: 2px;
}

.ndbg-header {
  display: flex;

.ndbg-drag-handle {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.ndbg-header h2 {
  margin: 4px 0 0;
  font-size: 20px;
}

.ndbg-eyebrow {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--nop-debugger-eyebrow);
}

.ndbg-header-actions,
.ndbg-tabs,
.ndbg-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ndbg-icon-button,
.ndbg-tab,
.ndbg-filter,
.nop-debugger-launcher {
  appearance: none;
  border: 1px solid var(--nop-debugger-chip-border);
  color: var(--nop-debugger-text);
  cursor: pointer;
}

.ndbg-icon-button,
.ndbg-tab,
.ndbg-filter {
  background: var(--nop-debugger-chip-bg);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
}

.ndbg-tab[data-active],
.ndbg-filter[data-active] {
  background: var(--nop-debugger-chip-active-bg);
  border-color: var(--nop-debugger-chip-active-border);
  color: var(--nop-debugger-chip-active-text);
}

.ndbg-overview,
.ndbg-list {
  display: grid;
  gap: 10px;
  overflow: auto;
}

.ndbg-overview {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ndbg-metric-card,
.ndbg-entry {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: var(--nop-debugger-card-bg);
  border: 1px solid var(--nop-debugger-card-border);
}

.ndbg-metric-card strong {
  font-size: 20px;
}

.ndbg-metric-card[data-error] strong {
  color: var(--nop-debugger-badge-error-text);
}

.ndbg-metric-label,
.ndbg-entry-meta,
.ndbg-entry time,
.ndbg-launcher-meta {
  font-size: 12px;
  color: var(--nop-debugger-muted-text);
}

.ndbg-entry-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ndbg-entry-summary {
  font-size: 14px;
  line-height: 1.45;
}

.ndbg-entry-detail {
  display: block;
  overflow-x: auto;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--nop-debugger-detail-bg);
  color: var(--nop-debugger-detail-text);
  white-space: nowrap;
}

.ndbg-badge {
  width: fit-content;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.ndbg-badge[data-group="render"] { background: var(--nop-debugger-badge-render-bg); color: var(--nop-debugger-badge-render-text); }
.ndbg-badge[data-group="action"] { background: var(--nop-debugger-badge-action-bg); color: var(--nop-debugger-badge-action-text); }
.ndbg-badge[data-group="api"] { background: var(--nop-debugger-badge-api-bg); color: var(--nop-debugger-badge-api-text); }
.ndbg-badge[data-group="compile"] { background: var(--nop-debugger-badge-compile-bg); color: var(--nop-debugger-badge-compile-text); }
.ndbg-badge[data-group="notify"] { background: var(--nop-debugger-badge-notify-bg); color: var(--nop-debugger-badge-notify-text); }
.ndbg-badge[data-group="error"] { background: var(--nop-debugger-badge-error-bg); color: var(--nop-debugger-badge-error-text); }
.ndbg-badge[data-group="node"] { background: var(--nop-debugger-badge-compile-bg); color: var(--nop-debugger-badge-compile-text); }

.ndbg-badge[data-slow="true"] { background: rgba(255, 183, 77, 0.2); color: #ffcf8b; }

.ndbg-empty { margin: 0; color: var(--nop-debugger-muted-text); }

.ndbg-launcher-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ndbg-launcher-label { font-size: 12px; font-weight: 600; }

.ndbg-search {
  width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--nop-debugger-chip-border);
  background: var(--nop-debugger-chip-bg);
  color: var(--nop-debugger-text);
  font-size: 12px;
  outline: none;
}
.ndbg-search:focus {
  border-color: var(--nop-debugger-chip-active-border);
}
.ndbg-search::placeholder {
  color: var(--nop-debugger-muted-text);
}

.ndbg-search-history {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ndbg-highlight {
  border-radius: 4px;
  background: rgba(255, 207, 139, 0.22);
  color: #fff3d6;
  padding: 0 2px;
}

.ndbg-entry { cursor: pointer; }
.ndbg-entry-expanded {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--nop-debugger-detail-bg);
  max-height: 320px;
  overflow: auto;
}
.ndbg-json-key { color: #9bd9ff; }
.ndbg-json-string { color: #9df3ca; }
.ndbg-json-number { color: #ffd18a; }
.ndbg-json-boolean { color: #dcc0ff; }
.ndbg-json-null { color: var(--nop-debugger-muted-text); font-style: italic; }
.ndbg-json-toggle {
  cursor: pointer;
  user-select: none;
  color: var(--nop-debugger-muted-text);
  font-size: 11px;
}
.ndbg-json-toggle:hover { color: var(--nop-debugger-text); }

.nop-debugger-launcher {
  position: fixed;
  z-index: 9998;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 20px;
  background: var(--nop-debugger-launcher-bg);
  box-shadow: var(--nop-debugger-launcher-shadow);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.ndbg-launcher-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ff6b6b;
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: nop-debugger-pulse 2s ease-in-out infinite;
}
@keyframes nop-debugger-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.ndbg-status-pending { color: #ffd18a; }
.ndbg-status-completed { color: #9df3ca; }
.ndbg-status-failed { color: #ffadad; }
.ndbg-status-aborted { color: var(--nop-debugger-muted-text); }

.ndbg-node-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--nop-debugger-chip-border);
  background: var(--nop-debugger-chip-bg);
  color: var(--nop-debugger-text);
  font-size: 12px;
  outline: none;
}
.ndbg-node-input:focus {
  border-color: var(--nop-debugger-chip-active-border);
}
.ndbg-node-input::placeholder {
  color: var(--nop-debugger-muted-text);
}

.ndbg-errors-only-toggle {
  background: var(--nop-debugger-badge-error-bg);
  color: var(--nop-debugger-badge-error-text);
}

@media (max-width: 760px) {
  .nop-debugger {
    width: calc(100vw - 24px);
    max-height: 72vh;
  }

  .ndbg-overview {
    grid-template-columns: 1fr;
  }
}

.nop-debugger-overlay {
  position: fixed;
  pointer-events: none;
  z-index: 10000;
  border-radius: 2px;
  transition: all 0.05s ease;
}
.nop-debugger-overlay--hover {
  outline: 1px dashed #1c76c4;
  background: rgba(28, 118, 196, 0.06);
}
.nop-debugger-overlay--active {
  outline: 2px solid #1c76c4;
  background: rgba(28, 118, 196, 0.1);
}
.ndbg-component-tree {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--nop-debugger-chip-border);
  border-radius: 8px;
  padding: 4px;
}
.ndbg-tree-item {
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.ndbg-tree-item:hover {
  background: var(--nop-debugger-chip-active-bg);
}
.ndbg-tree-item.selected {
  background: rgba(28, 118, 196, 0.15);
  outline: 1px solid rgba(28, 118, 196, 0.3);
}
.ndbg-tree-section {
  display: grid;
  gap: 8px;
}
.ndbg-resize-handle {
  position: absolute;
  left: 0;
  top: 22px;
  bottom: 22px;
  width: 6px;
  cursor: ew-resize;
  border-radius: 3px 0 0 3px;
  z-index: 2;
}
.ndbg-resize-handle:hover,
.ndbg-resize-handle:active {
  background: rgba(255, 207, 139, 0.25);
}

.ndbg-errors-only-toggle {
  background: var(--nop-debugger-badge-error-bg);
  color: var(--nop-debugger-badge-error-text);
}

.nop-debugger--minimized {
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

.nop-debugger--minimized .ndbg-resize-handle {
  display: none;
}

.ndbg-minimized-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ndbg-minimized-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.ndbg-minimized-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--nop-debugger-text);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ndbg-minimized-error-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 128, 128, 0.2);
  color: var(--nop-debugger-badge-error-text);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ndbg-icon-button {
  position: relative;
}

.ndbg-icon-button::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.ndbg-icon-button:hover::after {
  opacity: 1;
}

.ndbg-icon-button::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.85);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.ndbg-icon-button:hover::before {
  opacity: 1;
}

.ndbg-inspect-hint {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(28, 118, 196, 0.12);
  border: 1px solid rgba(28, 118, 196, 0.25);
  color: #9bd9ff;
  font-size: 12px;
  text-align: center;
}
.ndbg-inspect-panel {
  display: grid;
  gap: 8px;
}
.ndbg-inspect-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ndbg-inspect-section {
  display: grid;
  gap: 6px;
}
.ndbg-inspect-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--nop-debugger-muted-text);
  cursor: pointer;
  user-select: none;
}
.ndbg-inspect-section-title:hover {
  color: var(--nop-debugger-text);
}
.ndbg-inspect-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(28, 118, 196, 0.15);
  color: #9bd9ff;
  font-size: 11px;
  font-family: monospace;
}
.ndbg-inspect-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11px;
  color: var(--nop-debugger-muted-text);
}
.ndbg-form-tab {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--nop-debugger-chip-border);
  background: transparent;
  color: var(--nop-debugger-muted-text);
  font-size: 11px;
  cursor: pointer;
}
.ndbg-form-tab[data-active] {
  background: var(--nop-debugger-chip-active-bg);
  border-color: var(--nop-debugger-chip-active-border);
  color: var(--nop-debugger-chip-active-text);
}
.ndbg-eval-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--nop-debugger-chip-border);
  background: var(--nop-debugger-chip-bg);
  color: var(--nop-debugger-text);
  font-size: 12px;
  font-family: monospace;
  outline: none;
}
.ndbg-eval-input:focus {
  border-color: var(--nop-debugger-chip-active-border);
}
.ndbg-eval-input::placeholder {
  color: var(--nop-debugger-muted-text);
}
.ndbg-eval-result {
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--nop-debugger-detail-bg);
  font-size: 12px;
  color: var(--nop-debugger-detail-text);
  white-space: pre-wrap;
  word-break: break-all;
}
`;

export function useInjectDebuggerStyles(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return;
    }

    let style = document.getElementById(DEBUGGER_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = DEBUGGER_STYLE_ID;
      style.textContent = DEBUGGER_STYLES;
      document.head.appendChild(style);
    }
  }, [enabled]);
}
