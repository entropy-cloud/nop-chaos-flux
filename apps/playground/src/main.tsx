import React from 'react';
import ReactDOM from 'react-dom/client';
import { initFluxI18n } from '@nop-chaos/flux-i18n';
import { App } from './App';
import { applyTheme, readStoredTheme } from './theme';
import '@nop-chaos/ui/styles.css';
import './styles.css';

// Initialize i18n before rendering
initFluxI18n();

// Mount theme attributes before render so theme-tokens data-theme/data-mode
// selectors resolve. The persisted (or default classic/light) state comes from
// the runtime theme switcher in App (G-I, plan 471 V1-F3).
applyTheme(readStoredTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
